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

		username := s[len(s)-1]
		url := line

		p := Profile{
			Username:   username,
			ProfileURL: url,
		}

		profiles = append(profiles, p)
	}

	out, err := os.Create(outputPath)
	if err != nil {
		log.Fatalf("input file not found at %s: %v", inputPath, err)
		return
	}
	defer out.Close()

	if err := json.NewEncoder(out).Encode(&profiles); err != nil {
		log.Fatalf("failed to decode json: %v", err)
		return
	}
}
