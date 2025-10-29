package partition

import (
	"errors"
	"fmt"
)

// Store keeps profiles in insertion order while allowing fast lookups.
type Store struct {
	order []string
	items map[string]*Profile
}

// NewStore creates an empty Store.
func NewStore() *Store {
	return &Store{
		order: make([]string, 0, 1024),
		items: make(map[string]*Profile),
	}
}

// Has returns true if the profile URL already exists.
func (s *Store) Has(url string) bool {
	_, ok := s.items[url]
	return ok
}

// Get returns a copy of the stored profile for the given URL.
func (s *Store) Get(url string) (Profile, bool) {
	p, ok := s.items[url]
	if !ok {
		return Profile{}, false
	}
	return p.Clone(), true
}

// Add stores a profile. Returns error if URL already exists.
func (s *Store) Add(p Profile) error {
	if p.URL == "" {
		return errors.New("profile URL required")
	}
	if s.Has(p.URL) {
		return fmt.Errorf("profile already exists for URL %s", p.URL)
	}
	s.order = append(s.order, p.URL)
	cp := p.Clone()
	s.items[p.URL] = &cp
	return nil
}

// AppendSource merges a source into an existing profile. No-op if not present.
func (s *Store) AppendSource(url, source string) {
	if existing, ok := s.items[url]; ok {
		existing.MergeSource(source)
	}
}

// List returns the stored profiles in insertion order.
func (s *Store) List() []Profile {
	result := make([]Profile, 0, len(s.order))
	for _, url := range s.order {
		if p, ok := s.items[url]; ok {
			result = append(result, p.Clone())
		}
	}
	return result
}
