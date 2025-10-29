package partition

import (
	"net/url"
	"strings"
)

// NormalizeURL standardizes profile URLs for duplication checks.
func NormalizeURL(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}

	// Ensure scheme exists to help url.Parse produce a host.
	if !strings.Contains(trimmed, "://") {
		trimmed = "https://" + trimmed
	}

	parsed, err := url.Parse(trimmed)
	if err != nil {
		return strings.TrimSpace(raw)
	}

	if parsed.Host == "" {
		return strings.TrimSpace(raw)
	}

	parsed.Scheme = strings.ToLower(parsed.Scheme)
	parsed.Host = strings.ToLower(parsed.Host)
	if parsed.Path != "" && parsed.Path != "/" {
		parsed.Path = strings.TrimSuffix(parsed.Path, "/")
	}
	parsed.RawQuery = ""
	parsed.Fragment = ""

	return parsed.String()
}
