package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
)

const (
	ProfilesTextPath     = "dist/profiles.txt"
	ScrapeDataPath       = "dist/scrape_data.json"
	ClassifiedOutputPath = "dist/classified_data.json"
	ProspectsPath        = "dist/prospects.json"
)

type Profile struct {
	Username   string `json:"username"`
	ProfileURL string `json:"profileURL"`
}

type ClassifiedProfile struct {
	Username       string `json:"username"`
	ProfileURL     string `json:"profileURL"`
	Classification string `json:"classification"`
	OtherCandidate bool   `json:"other_candidate,omitempty"`
}

func main() {
	partitionClassifiedData()
}

func partitionClassifiedData() {
	var (
		classified []ClassifiedProfile
		prospects  []string
	)

	f, err := os.Open(ClassifiedOutputPath)
	if err != nil {
		log.Fatalf("failed to read data: %v", err)
	}

	if err := json.NewDecoder(f).Decode(&classified); err != nil {
		log.Fatalf("failed to decode json: %v", err)
	}

	for _, v := range classified {
		if v.Classification == "no" {
			continue
		}
		prospects = append(prospects, v.ProfileURL)
	}

	p := map[string][]string{
		"prospects": prospects,
	}

	out, err := os.Create(ProspectsPath)
	if err != nil {
		log.Fatalf("failed to create prospects file: %v", err)
	}

	if err := writeJSON(out, p); err != nil {
		log.Fatalf("failed to save data to file %s: %v", f.Name(), err)
	}
}

func createScrapeData() {
	var profiles []Profile
	data, err := os.ReadFile(ProfilesTextPath)
	if err != nil {
		log.Fatalf("input file not found at %s: %v", ProfilesTextPath, err)
		return
	}

	for line := range strings.Lines(string(data)) {
		s := strings.SplitAfter(line, "/")

		username := strings.TrimSpace(s[len(s)-1])
		url := strings.TrimSpace(line)

		p := Profile{
			Username:   username,
			ProfileURL: url,
		}

		profiles = append(profiles, p)
	}

	outInfo, err := os.Stat(ClassifiedOutputPath)
	if err != nil {
		log.Fatalf("input file not found at %s: %v", ProfilesTextPath, err)
		return
	}

	if outInfo.Size() < 1 {
		// File doesn't contain any data, just write to it
		out, err := os.Create(ClassifiedOutputPath)
		if err != nil {
			log.Fatalf("failed to create file %s: %v", ProfilesTextPath, err)
			return
		}
		defer out.Close()

		writeJSON(out, &profiles)
	}

	// Append data
	p, err := os.ReadFile(ClassifiedOutputPath)
	if err != nil {
		log.Fatalf("failed to read file: %v", err)
	}

	var currentData []Profile
	if err := json.Unmarshal(p, &currentData); err != nil {
		log.Fatalf("failed to unmarshal data: %v", err)
	}

	currentData = append(currentData, profiles...)

	f, err := os.Create(ClassifiedOutputPath)
	if err != nil {
		log.Fatalf("failed to create file %s: %v", ProfilesTextPath, err)
		return
	}
	defer f.Close()

	if err := writeJSON(f, &currentData); err != nil {
		log.Fatalf("failed to save data to file %s: %v", f.Name(), err)
	}
}

func writeJSON(file *os.File, data any) error {
	if err := json.NewEncoder(file).Encode(data); err != nil {
		return fmt.Errorf("failed to decode json: %w", err)
	}
	return nil
}
