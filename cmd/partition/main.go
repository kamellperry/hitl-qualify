package main

import (
	"bufio"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"omni-data-processor/internal/partition"
)

func main() {
	var (
		inputPath      = flag.String("input", "", "Optional additional candidate file to include in the output.")
		classifiedPath = flag.String("classified", "dist/classified_data.json", "Existing classified profiles JSON used for duplicate checks.")
		extraInputs    = flag.String("extra", "data", "Comma-separated list of directories or files used as historical references.")
		outputPath     = flag.String("output", "dist/combined_profiles.txt", "Path to write the combined profile list.")
		stdoutFlag     = flag.Bool("stdout", false, "Also stream the combined profile list to stdout.")
		policyValue    = flag.String("policy", string(partition.PolicyPrompt), "Duplicate policy: prompt, skip, or keep.")
		reportPath     = flag.String("report", "", "Optional path to write duplicate details as JSON.")
		strictFlag     = flag.Bool("strict", false, "If true, missing files cause the command to exit with an error.")
	)

	flag.Parse()

	policy, err := partition.ParsePolicy(*policyValue)
	if err != nil {
		fatal(err)
	}

	allInputs, primarySources, err := gatherInputs(*classifiedPath, *inputPath, *extraInputs, *strictFlag)
	if err != nil {
		fatal(err)
	}
	if len(allInputs) == 0 {
		fatal(errors.New("no input files detected; provide --input or --extra paths"))
	}

	agg := partition.NewAggregator()
	stats := make([]partition.AggregateStats, 0, len(allInputs))

	for _, path := range allInputs {
		profiles, loadErr := partition.LoadProfilesFromFile(path)
		if loadErr != nil {
			if *strictFlag {
				fatal(loadErr)
			}
			fmt.Fprintf(os.Stderr, "warning: skipping %s: %v\n", path, loadErr)
			continue
		}
		sourceLabel := sourceName(path)
		stat := agg.AddProfiles(profiles, sourceLabel)
		stats = append(stats, stat)
		fmt.Printf("ingested %-40s parsed=%d added=%d duplicates=%d missing_url=%d\n",
			sourceLabel, stat.Parsed, stat.Added, stat.Duplicates, stat.MissingURL)
	}

	uniqueProfiles := agg.Store().List()
	duplicates := agg.Duplicates()
	if len(duplicates) > 0 {
		policy = resolvePolicy(policy, duplicates)
	}

	duplicateURLs := make(map[string]struct{}, len(duplicates))
	for _, rec := range duplicates {
		duplicateURLs[rec.URL] = struct{}{}
	}

	finalProfiles := make([]partition.Profile, 0, len(uniqueProfiles))
	for _, profile := range uniqueProfiles {
		if !shouldInclude(profile, primarySources) {
			continue
		}
		if _, dup := duplicateURLs[profile.URL]; dup && policy == partition.PolicySkip {
			continue
		}
		finalProfiles = append(finalProfiles, profile)
	}

	if policy == partition.PolicyKeep {
		for _, rec := range duplicates {
			for _, conflict := range rec.Conflicting {
				if shouldInclude(conflict, primarySources) {
					finalProfiles = append(finalProfiles, conflict)
				}
			}
		}
	}

	if err := partition.WriteLines(finalProfiles, *outputPath); err != nil {
		fatal(err)
	}

	if *stdoutFlag {
		for _, profile := range finalProfiles {
			fmt.Println(profile.URL)
		}
	}

	if len(duplicates) > 0 {
		path := *reportPath
		if path == "" {
			path = filepath.Join("dist", "duplicates_report.json")
		}
		if err := partition.WriteJSON(path, duplicates); err != nil {
			fmt.Fprintf(os.Stderr, "warning: failed writing duplicate report: %v\n", err)
		} else {
			fmt.Printf("duplicate report written to %s\n", path)
		}
	}

	fmt.Printf("\nsummary: sources=%d total_unique=%d duplicates=%d kept=%d\n",
		len(stats), len(uniqueProfiles), len(duplicates), len(finalProfiles))
}

func resolvePolicy(policy partition.Policy, duplicates []partition.DuplicateRecord) partition.Policy {
	if policy != partition.PolicyPrompt {
		return policy
	}
	reader := bufio.NewReader(os.Stdin)

	fmt.Printf("\ndetected %d duplicate URLs.\n", len(duplicates))
	for i, rec := range duplicates {
		if i >= 3 {
			break
		}
		fmt.Printf(" - %s (%s)\n", rec.URL, strings.Join(rec.AllSources, ", "))
	}
	fmt.Println("choose duplicate policy: [s]kip duplicates, [k]eep duplicates, [p]rompt per entry (skip default)")

	for {
		fmt.Print("> ")
		input, _ := reader.ReadString('\n')
		input = strings.TrimSpace(strings.ToLower(input))
		switch input {
		case "s", "":
			return partition.PolicySkip
		case "k":
			return partition.PolicyKeep
		case "p":
			return partition.PolicyPrompt
		default:
			fmt.Println("enter s, k, or p:")
		}
	}
}

func gatherInputs(classified, primary, extras string, strict bool) ([]string, map[string]struct{}, error) {
	paths := make([]string, 0, 8)
	primarySet := make(map[string]struct{})

	order := []string{classified, primary}
	for _, p := range order {
		if p == "" {
			continue
		}
		if include, err := includePath(p, strict); err != nil {
			return nil, nil, err
		} else if include != "" {
			paths = append(paths, include)
			primarySet[filepath.ToSlash(include)] = struct{}{}
		}
	}

	for _, extra := range splitComma(extras) {
		if include, err := includePath(extra, strict); err != nil {
			return nil, nil, err
		} else if include != "" {
			paths = append(paths, include)
		}
	}

	expanded, err := partition.DiscoverFiles(paths)
	if err != nil {
		return nil, nil, err
	}

	// Normalise primary entries to the discovered paths (absolute with slashes).
	normalisedPrimary := make(map[string]struct{}, len(primarySet))
	for _, file := range expanded {
		if _, ok := primarySet[filepath.ToSlash(file)]; ok {
			normalisedPrimary[filepath.ToSlash(file)] = struct{}{}
		}
	}

	return expanded, normalisedPrimary, nil
}

func includePath(path string, strict bool) (string, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return "", nil
	}
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) && !strict {
			fmt.Fprintf(os.Stderr, "warning: %s not found, skipping (use --strict to fail)\n", path)
			return "", nil
		}
		return "", err
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	return abs, nil
}

func splitComma(val string) []string {
	if val == "" {
		return nil
	}
	parts := strings.Split(val, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts
}

func sourceName(path string) string {
	if path == "" {
		return ""
	}
	return filepath.ToSlash(path)
}

func fatal(err error) {
	fmt.Fprintf(os.Stderr, "error: %v\n", err)
	os.Exit(1)
}

func shouldInclude(profile partition.Profile, primary map[string]struct{}) bool {
	class := strings.ToLower(strings.TrimSpace(profile.Classification))
	allow := class == "yes" || class == "maybe" || class == ""
	for _, src := range profile.Sources {
		if _, ok := primary[src]; ok {
			return allow
		}
	}
	return false
}
