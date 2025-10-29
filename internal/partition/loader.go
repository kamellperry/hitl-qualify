package partition

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

var supportedExtensions = map[string]struct{}{
	".json": {},
	".txt":  {},
	".md":   {},
}

// DiscoverFiles expands the provided paths, including directories, into a flat list of files.
func DiscoverFiles(paths []string) ([]string, error) {
	seen := make(map[string]struct{})
	files := make([]string, 0)

	for _, input := range paths {
		input = strings.TrimSpace(input)
		if input == "" {
			continue
		}
		info, err := os.Stat(input)
		if err != nil {
			return nil, err
		}
		if info.IsDir() {
			err = filepath.WalkDir(input, func(path string, d os.DirEntry, walkErr error) error {
				if walkErr != nil {
					return walkErr
				}
				if d.IsDir() {
					return nil
				}
				if !isSupported(path) {
					return nil
				}
				abs, err := filepath.Abs(path)
				if err != nil {
					return err
				}
				if _, ok := seen[abs]; !ok {
					seen[abs] = struct{}{}
					files = append(files, abs)
				}
				return nil
			})
			if err != nil {
				return nil, err
			}
			continue
		}

		if !isSupported(input) {
			continue
		}
		abs, err := filepath.Abs(input)
		if err != nil {
			return nil, err
		}
		if _, ok := seen[abs]; !ok {
			seen[abs] = struct{}{}
			files = append(files, abs)
		}
	}
	return files, nil
}

func isSupported(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	_, ok := supportedExtensions[ext]
	return ok
}

// LoadProfilesFromFile reads the provided file and decodes profiles based on the extension.
func LoadProfilesFromFile(path string) ([]ProfileInput, error) {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".json":
		return loadJSONProfiles(path)
	case ".txt", ".md":
		return loadLineProfiles(path)
	default:
		return nil, fmt.Errorf("unsupported file extension for %s", path)
	}
}

func loadJSONProfiles(path string) ([]ProfileInput, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var raw []map[string]any
	if err := json.NewDecoder(f).Decode(&raw); err != nil {
		if errors.Is(err, io.EOF) {
			return []ProfileInput{}, nil
		}
		return nil, err
	}

	profiles := make([]ProfileInput, 0, len(raw))
	for _, entry := range raw {
		profiles = append(profiles, mapToProfile(entry))
	}

	return profiles, nil
}

func mapToProfile(entry map[string]any) ProfileInput {
	getString := func(key string) string {
		if val, ok := entry[key]; ok {
			switch v := val.(type) {
			case string:
				return v
			}
		}
		return ""
	}

	url := getString("profileURL")
	if url == "" {
		url = getString("url")
	}
	return ProfileInput{
		URL:            url,
		Username:       getString("username"),
		Classification: getString("classification"),
	}
}

func loadLineProfiles(path string) ([]ProfileInput, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var profiles []ProfileInput
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "#") {
			continue
		}
		profiles = append(profiles, ProfileInput{URL: line})
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return profiles, nil
}
