package partition

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// WriteLines writes profile URLs from the provided slice to a newline-separated file.
// Each profile's URL is written on a separate line. The function creates the necessary
// directory structure if it doesn't exist.
//
// Parameters:
//   - profiles: slice of Profile structs containing URLs to write
//   - path: file path where the URLs should be written
//
// Returns an error if directory creation, file creation, or writing fails.
func WriteLines(profiles []Profile, path string) error {
	if err := ensureDir(path); err != nil {
		return err
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	for _, profile := range profiles {
		if _, err := fmt.Fprintln(f, profile.URL); err != nil {
			return err
		}
	}

	return nil
}

// WriteJSON writes arbitrary data to a JSON file with pretty-printing indentation.
// The JSON output is formatted with 2-space indentation for readability.
// The function creates the necessary directory structure if it doesn't exist.
//
// Parameters:
//   - path: file path where the JSON should be written
//   - payload: any data structure that can be marshaled to JSON
//
// Returns an error if directory creation, file creation, JSON encoding, or writing fails.
func WriteJSON(path string, payload any) error {
	if err := ensureDir(path); err != nil {
		return err
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	encoder := json.NewEncoder(f)
	encoder.SetIndent("", "  ")
	return encoder.Encode(payload)
}

// ensureDir creates the directory structure for the given file path if it doesn't exist.
// It extracts the directory from the file path and creates all necessary parent directories
// with 0755 permissions. If the directory is empty or ".", no action is taken.
//
// Parameters:
//   - path: file path from which to extract and create the directory structure
//
// Returns an error if directory creation fails.
func ensureDir(path string) error {
	dir := filepath.Dir(path)
	if dir == "" || dir == "." {
		return nil
	}
	return os.MkdirAll(dir, 0o755)
}
