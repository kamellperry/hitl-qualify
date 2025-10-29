package partition

import "sort"

// Profile represents a deduplicated profile with optional metadata.
type Profile struct {
	URL            string
	Username       string
	Classification string
	Sources        []string
}

// Clone returns a copy of the Profile to avoid mutating shared state.
func (p *Profile) Clone() Profile {
	cp := Profile{
		URL:            p.URL,
		Username:       p.Username,
		Classification: p.Classification,
		Sources:        append([]string(nil), p.Sources...),
	}
	return cp
}

// MergeSource appends a new origin to the profile if it is not already present.
func (p *Profile) MergeSource(source string) {
	for _, existing := range p.Sources {
		if existing == source {
			return
		}
	}
	p.Sources = append(p.Sources, source)
	sort.Strings(p.Sources)
}
