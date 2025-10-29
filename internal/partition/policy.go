package partition

import (
	"fmt"
	"strings"
)

// Policy defines how duplicates should be handled.
type Policy string

const (
	PolicyPrompt Policy = "prompt"
	PolicySkip   Policy = "skip"
	PolicyKeep   Policy = "keep"
)

// ParsePolicy converts string to Policy with validation.
func ParsePolicy(value string) (Policy, error) {
	if value == "" {
		return PolicyPrompt, nil
	}
	switch strings.ToLower(value) {
	case string(PolicyPrompt):
		return PolicyPrompt, nil
	case string(PolicySkip):
		return PolicySkip, nil
	case string(PolicyKeep):
		return PolicyKeep, nil
	default:
		return "", fmt.Errorf("unknown duplicate policy %q", value)
	}
}
