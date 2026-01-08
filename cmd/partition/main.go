package main

import (
	"encoding/json"
	"log"
	"os"
	"strings"
)

const (
	inputPath  = "dist/profiles.txt"
	outputPath = "dist/scrape_data.json"
)

type Profile struct {
	Username   string `json:"username"`
	ProfileURL string `json:"profileURL"`
}

func main() {
	var (
		profiles []Profile
	)
	data, err := os.ReadFile(inputPath)
	if err != nil {
		log.Fatalf("input file not found at %s: %v", inputPath, err)
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

	outInfo, err := os.Stat(outputPath)
	if err != nil {
		log.Fatalf("input file not found at %s: %v", inputPath, err)
		return
	}

	if outInfo.Size() < 1 {
		// File doesn't contain any data, just write to it
		out, err := os.Create(outputPath)
		if err != nil {
			log.Fatalf("failed to create file %s: %v", inputPath, err)
			return
		}
		defer out.Close()

		writeJSON(out, &profiles)
	}

	// Append data
	p, err := os.ReadFile(outputPath)
	if err != nil {
		log.Fatalf("failed to read file: %v", err)
	}

	var currentData []Profile
	if err := json.Unmarshal(p, &currentData); err != nil {
		log.Fatalf("failed to unmarshal data: %v", err)
	}

	currentData = append(currentData, profiles...)

	f, err := os.Create(outputPath)
	if err != nil {
		log.Fatalf("failed to create file %s: %v", inputPath, err)
		return
	}
	defer f.Close()
	writeJSON(f, &currentData)
}

func writeJSON(file *os.File, data *[]Profile) {
	if err := json.NewEncoder(file).Encode(data); err != nil {
		log.Fatalf("failed to decode json: %v", err)
		return
	}
}
