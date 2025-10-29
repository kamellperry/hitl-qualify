package partition

import "sort"

// ProfileInput represents incoming data before normalization/deduplication.
type ProfileInput struct {
	URL            string
	Username       string
	Classification string
}

// AggregateStats captures ingest results for a single source.
type AggregateStats struct {
	Source        string
	Parsed        int
	Added         int
	Duplicates    int
	Invalid       int
	MissingURL    int
	NormalizeFail int
}

// DuplicateRecord retains conflicts found during aggregation.
type DuplicateRecord struct {
	URL            string
	Existing       Profile
	Conflicting    []Profile
	AllSources     []string
	Classification []string
}

// Aggregator coordinates ingestion, deduplication, and duplicate reporting.
type Aggregator struct {
	store      *Store
	duplicates map[string]*DuplicateRecord
}

// NewAggregator constructs an Aggregator with an empty Store.
func NewAggregator() *Aggregator {
	return &Aggregator{
		store:      NewStore(),
		duplicates: make(map[string]*DuplicateRecord),
	}
}

// Store returns the underlying profile store.
func (a *Aggregator) Store() *Store {
	return a.store
}

// Duplicates returns a deterministic slice of duplicate records.
func (a *Aggregator) Duplicates() []DuplicateRecord {
	out := make([]DuplicateRecord, 0, len(a.duplicates))
	for _, rec := range a.duplicates {
		copyRec := DuplicateRecord{
			URL:            rec.URL,
			Existing:       rec.Existing.Clone(),
			Conflicting:    cloneProfiles(rec.Conflicting),
			AllSources:     append([]string{}, rec.AllSources...),
			Classification: append([]string{}, rec.Classification...),
		}
		out = append(out, copyRec)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].URL < out[j].URL
	})
	return out
}

// FlattenDuplicates exposes all conflicting profiles, useful when the policy keeps them.
func (a *Aggregator) FlattenDuplicates() []Profile {
	var result []Profile
	for _, rec := range a.duplicates {
		result = append(result, cloneProfiles(rec.Conflicting)...)
	}
	return result
}

// AddProfiles ingests a slice of profile inputs and updates stats & duplicates.
func (a *Aggregator) AddProfiles(inputs []ProfileInput, source string) AggregateStats {
	stats := AggregateStats{Source: source}
	for _, raw := range inputs {
		stats.Parsed++
		url := NormalizeURL(raw.URL)
		if url == "" {
			stats.MissingURL++
			continue
		}

		profile := Profile{
			URL:            url,
			Username:       raw.Username,
			Classification: raw.Classification,
			Sources:        []string{source},
		}

		if a.store.Has(url) {
			stats.Duplicates++
			a.store.AppendSource(url, source)
			a.appendDuplicate(url, profile)
			continue
		}

		if err := a.store.Add(profile); err != nil {
			stats.Invalid++
			continue
		}
		stats.Added++
	}
	return stats
}

func (a *Aggregator) appendDuplicate(url string, incoming Profile) {
	rec, exists := a.duplicates[url]
	if !exists {
		existing, _ := a.store.Get(url)
		rec = &DuplicateRecord{
			URL:         url,
			Existing:    existing,
			Conflicting: make([]Profile, 0, 1),
			AllSources:  append([]string{}, existing.Sources...),
		}
		a.duplicates[url] = rec
	}
	rec.Conflicting = append(rec.Conflicting, incoming)
	rec.AllSources = append(rec.AllSources, incoming.Sources...)
	if incoming.Classification != "" {
		rec.Classification = append(rec.Classification, incoming.Classification)
	}
	// De-duplicate source names for readability.
	rec.AllSources = unique(rec.AllSources)
}

func cloneProfiles(src []Profile) []Profile {
	out := make([]Profile, len(src))
	for i, p := range src {
		out[i] = p.Clone()
	}
	return out
}

func unique(values []string) []string {
	m := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, v := range values {
		if v == "" {
			continue
		}
		if _, ok := m[v]; ok {
			continue
		}
		m[v] = struct{}{}
		out = append(out, v)
	}
	sort.Strings(out)
	return out
}
