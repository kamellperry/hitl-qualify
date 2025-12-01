package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const (
	inputPath  = "dist/scrape_data.json"
	outputPath = "dist/classified_data.json"
)

type profile = map[string]interface{}

type counters struct {
	Yes   int
	No    int
	Maybe int
	Other int
}

func (c counters) Qualified() int {
	return c.Yes + c.Maybe
}

type historyEntry struct {
	index          int
	classification string
	other          bool
}

func main() {
	profiles, err := loadProfiles(inputPath)
	if err != nil {
		fatal(err)
	}

	classified, processed, counts := loadExistingClassifications(outputPath)
	profilesToClassify := filterUnprocessed(profiles, processed)

	if len(profilesToClassify) == 0 {
		fmt.Println("All profiles from the input file have already been classified.")
		return
	}

	fmt.Printf("\nStarting classification. Total to classify: %d\n", len(profilesToClassify))
	fmt.Println("--> Right Arrow (Yes), <-- Left Arrow (No), ^ Up Arrow (Maybe), 'o' (other), 'u' (undo), '?' (help), 's' (Save & Stop)")

	restoreTerm, rawMode := enableRawInput()
	defer restoreTerm()

	reader := bufio.NewReader(os.Stdin)
	interrupted := false
	sessionHistory := make([]historyEntry, 0, len(profilesToClassify))
	statusMsg := ""
	lastOpenedIdx := -1

	defer func() {
		fmt.Println("\nSaving final classifications...")
		if err := saveProfiles(outputPath, classified); err != nil {
			fmt.Fprintf(os.Stderr, "error saving data: %v\n", err)
			return
		}
		if interrupted {
			fmt.Printf("Progress saved to %s after interrupt.\n", outputPath)
		} else {
			fmt.Printf("Classification complete. All data saved to %s\n", outputPath)
		}
	}()

	for idx := 0; idx < len(profilesToClassify); {
		p := profilesToClassify[idx]
		displayStatus(len(classified)+1, len(profiles), counts, statusMsg)
		statusMsg = ""

		url := stringValue(p, "profileURL")
		if url == "" {
			fmt.Printf("Skipping profile %d due to missing URL.\n", idx+1)
			idx++
			continue
		}

		text := profileText(p)
		fmt.Printf("\n--- Profile %d / %d ---\n", len(classified)+1, len(profiles))
		fmt.Printf("Text: %s\n", text)
		fmt.Printf("URL: %s\n", url)

		if idx != lastOpenedIdx {
			openURL(url)
			time.Sleep(500 * time.Millisecond)
			activateTerminal()
			lastOpenedIdx = idx
		}

		if !rawMode {
			fmt.Print("Your choice? (y/n/m/s + Enter, o toggle other, u undo, ? help) ")
		} else {
			fmt.Print("Your choice? (arrows y/n/m, o toggle, u undo, ? help) ")
		}
		decision, readErr := readDecision(reader, rawMode)
		if readErr != nil {
			if errors.Is(readErr, io.EOF) {
				interrupted = true
				return
			}
			fmt.Fprintf(os.Stderr, "input error: %v\n", readErr)
			interrupted = true
			return
		}

		switch decision {
		case "help":
			showHelp(reader)
			statusMsg = "Closed help."
			continue
		case "other":
			p["classification"] = "no"
			p["other_candidate"] = true
			counts.No++
			counts.Other++
			classified = append(classified, p)
			sessionHistory = append(sessionHistory, historyEntry{index: idx, classification: "no", other: true})
			statusMsg = fmt.Sprintf("Saved as no + other (%s)", url)
			idx++
			lastOpenedIdx = -1
			if (idx)%5 == 0 {
				fmt.Println("Saving intermediate progress...")
				if err := saveProfiles(outputPath, classified); err != nil {
					fmt.Fprintf(os.Stderr, "warning: failed to save progress: %v\n", err)
				}
			}
			continue
		case "save":
			fmt.Println("Save & Stop")
			if err := saveProfiles(outputPath, classified); err != nil {
				fmt.Fprintf(os.Stderr, "error saving data: %v\n", err)
			}
			return
		case "interrupt":
			fmt.Println("\nKeyboard interrupt detected. Saving progress...")
			interrupted = true
			return
		case "undo":
			if ok, msg := undoLastDecision(&classified, profilesToClassify, &counts, &sessionHistory, &idx); ok {
				statusMsg = msg
				lastOpenedIdx = -1
				continue
			}
			statusMsg = "Nothing to undo this session."
			continue
		case "yes":
			p["classification"] = "yes"
			counts.Yes++
		case "no":
			p["classification"] = "no"
			counts.No++
		case "maybe":
			p["classification"] = "maybe"
			counts.Maybe++
		default:
			continue
		}

		classified = append(classified, p)
		sessionHistory = append(sessionHistory, historyEntry{index: idx, classification: decision, other: false})
		statusMsg = fmt.Sprintf("Saved %s for %s", decision, url)

		idx++

		if (idx)%5 == 0 {
			fmt.Println("Saving intermediate progress...")
			if err := saveProfiles(outputPath, classified); err != nil {
				fmt.Fprintf(os.Stderr, "warning: failed to save progress: %v\n", err)
			}
		}
	}
}

func loadProfiles(path string) ([]profile, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("input file not found at %s: %w", path, err)
	}
	defer f.Close()

	var profiles []profile
	if err := json.NewDecoder(f).Decode(&profiles); err != nil {
		return nil, fmt.Errorf("could not decode JSON from %s: %w", path, err)
	}
	return profiles, nil
}

func saveProfiles(path string, data []profile) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	enc := json.NewEncoder(f)
	enc.SetIndent("", "    ")
	return enc.Encode(data)
}

func loadExistingClassifications(path string) ([]profile, map[string]struct{}, counters) {
	classified := make([]profile, 0)
	processed := make(map[string]struct{})
	counts := counters{}

	if _, err := os.Stat(path); err != nil {
		return classified, processed, counts
	}

	fmt.Printf("Resuming from existing output file: %s\n", path)
	data, err := loadProfiles(path)
	if err != nil {
		fatal(err)
	}

	for _, p := range data {
		if url := stringValue(p, "profileURL"); url != "" {
			processed[url] = struct{}{}
		}
		switch strings.ToLower(stringValue(p, "classification")) {
		case "yes":
			counts.Yes++
		case "no":
			counts.No++
		case "maybe":
			counts.Maybe++
		}
		if boolValue(p, "other_candidate") {
			counts.Other++
		}
	}

	fmt.Printf("Loaded %d previously classified profiles.\n", len(data))
	return data, processed, counts
}

func filterUnprocessed(all []profile, processed map[string]struct{}) []profile {
	result := make([]profile, 0, len(all))
	for _, p := range all {
		url := stringValue(p, "profileURL")
		if url == "" {
			continue
		}
		if _, ok := processed[url]; ok {
			continue
		}
		result = append(result, p)
	}
	return result
}

func displayStatus(current, total int, counts counters, status string) {
	fmt.Print("\033[2J\033[H")
	fmt.Printf("Classification Progress: %d/%d\n", current, total)
	fmt.Printf("Yes: %d, No: %d, Maybe: %d, Qualified: %d, Other: %d\n",
		counts.Yes, counts.No, counts.Maybe, counts.Qualified(), counts.Other)
	fmt.Println(strings.Repeat("-", 40))
	fmt.Println("type ? for help | u undo | o mark other")
	if status != "" {
		fmt.Println(status)
	}
}

func readDecision(r *bufio.Reader, raw bool) (string, error) {
	for {
		b, err := r.ReadByte()
		if err != nil {
			return "", err
		}

		if b == 3 { // Ctrl+C
			return "interrupt", nil
		}

		if b == '?' {
			return "help", nil
		}

		if b == 'u' || b == 'U' {
			return "undo", nil
		}

		if b == 'o' || b == 'O' {
			return "other", nil
		}

		if b == 's' || b == 'S' {
			return "save", nil
		}

		if raw {
			if b == '\x1b' {
				next, err := r.ReadByte()
				if err != nil {
					return "", err
				}
				if next != '[' {
					continue
				}
				arrow, err := r.ReadByte()
				if err != nil {
					return "", err
				}
				switch arrow {
				case 'C':
					fmt.Println("Yes")
					return "yes", nil
				case 'D':
					fmt.Println("No")
					return "no", nil
				case 'A':
					fmt.Println("Maybe")
					return "maybe", nil
				}
			}

			lower := strings.ToLower(string([]byte{b}))
			switch lower {
			case "y":
				fmt.Println("Yes")
				return "yes", nil
			case "n":
				fmt.Println("No")
				return "no", nil
			case "m":
				fmt.Println("Maybe")
				return "maybe", nil
			}
		} else {
			// Cooked mode fallback requires Enter.
			if b == '\n' || b == '\r' {
				continue
			}
			lower := strings.ToLower(string([]byte{b}))
			switch lower {
			case "y":
				return "yes", nil
			case "n":
				return "no", nil
			case "m":
				return "maybe", nil
			}
		}
	}
}

func profileText(p profile) string {
	text := stringValue(p, "profileText")
	if text == "" {
		text = stringValue(p, "username")
	}
	text = strings.ReplaceAll(text, "\n", " | ")
	return text
}

func stringValue(p profile, key string) string {
	val, ok := p[key]
	if !ok || val == nil {
		return ""
	}
	switch v := val.(type) {
	case string:
		return v
	default:
		return fmt.Sprint(v)
	}
}

func boolValue(p profile, key string) bool {
	val, ok := p[key]
	if !ok || val == nil {
		return false
	}
	switch v := val.(type) {
	case bool:
		return v
	case string:
		lower := strings.ToLower(v)
		return lower == "true" || lower == "1" || lower == "yes"
	case float64:
		return v != 0
	default:
		return false
	}
}

func openURL(url string) {
	if url == "" {
		return
	}

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	_ = cmd.Start()
}

func activateTerminal() {
	if runtime.GOOS != "darwin" {
		return
	}

	cmd := exec.Command("osascript", "-e", "tell application \"Ghostty\" to activate")
	cmd.Stdout = io.Discard
	cmd.Stderr = io.Discard
	_ = cmd.Run()
}

func enableRawInput() (restore func(), raw bool) {
	if runtime.GOOS == "windows" {
		return func() {}, false
	}

	cmd := exec.Command("stty", "-echo", "-icanon", "-isig", "min", "1", "time", "0")
	cmd.Stdin = os.Stdin
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "warning: unable to set raw terminal mode: %v\n", err)
		return func() {}, false
	}

	return func() {
		restoreCmd := exec.Command("stty", "sane")
		restoreCmd.Stdin = os.Stdin
		_ = restoreCmd.Run()
	}, true
}

func fatal(err error) {
	fmt.Fprintf(os.Stderr, "Error: %v\n", err)
	os.Exit(1)
}

func undoLastDecision(classified *[]profile, profiles []profile, counts *counters, history *[]historyEntry, idx *int) (bool, string) {
	if len(*history) == 0 {
		return false, ""
	}

	last := (*history)[len(*history)-1]
	*history = (*history)[:len(*history)-1]

	if len(*classified) > 0 {
		*classified = (*classified)[:len(*classified)-1]
	}

	switch last.classification {
	case "yes":
		if counts.Yes > 0 {
			counts.Yes--
		}
	case "no":
		if counts.No > 0 {
			counts.No--
		}
	case "maybe":
		if counts.Maybe > 0 {
			counts.Maybe--
		}
	}
	if last.other && counts.Other > 0 {
		counts.Other--
	}

	prof := profiles[last.index]
	delete(prof, "classification")
	if last.other {
		delete(prof, "other_candidate")
	}

	if *idx > last.index {
		*idx = last.index
	}

	url := stringValue(prof, "profileURL")
	user := stringValue(prof, "username")
	msg := "Undo: cleared last decision"
	if last.classification != "" {
		msg = fmt.Sprintf("Undo: cleared %s", last.classification)
	}
	if url != "" {
		msg = fmt.Sprintf("%s for %s (%s)", msg, user, url)
	}

	return true, msg
}

func showHelp(r *bufio.Reader) {
	fmt.Print("\033[2J\033[H")
	fmt.Println("Classification CLI Help")
	fmt.Println(strings.Repeat("-", 28))
	fmt.Println("Use arrow keys or y/n/m to classify the current profile:")
	fmt.Println("  → or y : Yes")
	fmt.Println("  ← or n : No")
	fmt.Println("  ↑ or m : Maybe")
	fmt.Println("Other controls:")
	fmt.Println("  o : Save as 'no' for this campaign and mark for other campaigns")
	fmt.Println("  u : Undo last decision in this session")
	fmt.Println("  s : Save & stop")
	fmt.Println("  ? : Show this help")
	fmt.Println("Ctrl+C : Save progress and exit")
	fmt.Println()
	fmt.Println("Data files:")
	fmt.Println("  Input : dist/scrape_data.json")
	fmt.Println("  Output: dist/classified_data.json (auto-resume)")
	fmt.Println()
	fmt.Println("Press any key to return to classification...")

	_, _ = r.ReadByte()
}
