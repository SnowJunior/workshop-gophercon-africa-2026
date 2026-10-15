package components

import (
	"strings"

	"workshop/internal/domain/sighting"
)

// Spotlight is one sighting's page: the sighting and its neighbours in the list.
type Spotlight struct {
	Sighting sighting.Sighting
	Photo    sighting.Media
	HasPhoto bool
	Prev     sighting.Sighting
	Next     sighting.Sighting
	Upcoming []Slide
}

// NewSpotlight finds s in all and gathers the sightings either side of it.
func NewSpotlight(s sighting.Sighting, all []sighting.Sighting) Spotlight {
	sp := Spotlight{Sighting: s, Prev: s, Next: s}
	sp.Photo, sp.HasPhoto = photo(s)

	at := -1
	for i, o := range all {
		if o.ID == s.ID {
			at = i
			break
		}
	}
	n := len(all)
	if at < 0 || n < 2 {
		return sp
	}
	sp.Prev = all[(at-1+n)%n]
	sp.Next = all[(at+1)%n]
	for k := 1; k < n && len(sp.Upcoming) < 3; k++ {
		o := all[(at+k)%n]
		if m, ok := photo(o); ok {
			sp.Upcoming = append(sp.Upcoming, Slide{Sighting: o, Photo: m})
		}
	}
	return sp
}

// SightingURL is the address of a sighting's own page.
func SightingURL(s sighting.Sighting) string {
	return "/sightings/" + s.ID.String()
}

// DisplayName is the name the page title uses.
func DisplayName(s sighting.Sighting) string {
	return displayName(s.Species)
}

// outlineWord is the last word of the name, set huge behind the photo.
func outlineWord(s sighting.Sighting) string {
	words := strings.Fields(displayName(s.Species))
	if len(words) == 0 {
		return "Wildlife"
	}
	return words[len(words)-1]
}

// whereLine closes the headline, as in "of Kenya".
func whereLine(l sighting.Location) string {
	if l.Country != "" {
		return "of " + l.Country
	}
	return "of the wild"
}

// nameSize keeps long names inside the left column.
func nameSize(name string) string {
	switch n := len([]rune(name)); {
	case n <= 8:
		return "spot__name--xl"
	case n <= 14:
		return "spot__name--l"
	default:
		return "spot__name--m"
	}
}
