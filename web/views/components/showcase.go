package components

import (
	"cmp"
	"fmt"
	"strings"
	"unicode/utf8"

	"workshop/internal/domain/sighting"
)

// Slide is one sighting in the showcase, with the photo it leads with.
type Slide struct {
	Sighting sighting.Sighting
	Photo    sighting.Media
}

// Slides picks up to max sightings that have a photo, in list order.
func Slides(sightings []sighting.Sighting, max int) []Slide {
	slides := make([]Slide, 0, max)
	for _, s := range sightings {
		if len(slides) == max {
			break
		}
		if m, ok := photo(s); ok {
			slides = append(slides, Slide{Sighting: s, Photo: m})
		}
	}
	return slides
}

// photo returns a sighting's first still image.
func photo(s sighting.Sighting) (sighting.Media, bool) {
	for _, m := range s.Media {
		if m.Type == "StillImage" && m.URL != "" {
			return m, true
		}
	}
	return sighting.Media{}, false
}

// number pads a position to two digits, as in 01.
func number(i int) string {
	return fmt.Sprintf("%02d", i+1)
}

// titleSize picks a size class so long names still fit the banner.
func titleSize(name string) string {
	switch n := utf8.RuneCountInString(name); {
	case n <= 7:
		return "slide__title--xl"
	case n <= 12:
		return "slide__title--l"
	default:
		return "slide__title--m"
	}
}

// remarks shortens a recorder's notes to a sentence or two.
func remarks(s string) string {
	s = strings.Join(strings.Fields(s), " ")
	if utf8.RuneCountInString(s) <= 180 {
		return s
	}
	r := []rune(s)[:180]
	return strings.TrimRight(string(r), " ,.;:") + "…"
}

// seenLine is the sentence that says where and when an animal was seen.
func seenLine(s sighting.Sighting) string {
	line := "Seen in " + place(s.Location) + " on " + s.HappenedAt.Format("2 January 2006") + "."
	if s.IndividualCount != nil {
		line += " " + individuals(*s.IndividualCount) + " counted."
	}
	return line
}

// searchText is what the search box matches a tile against.
func searchText(s sighting.Sighting) string {
	return strings.ToLower(strings.Join([]string{
		displayName(s.Species), s.Species.ScientificName, place(s.Location), s.RecordedBy,
	}, " "))
}

func altText(m sighting.Media) string {
	return cmp.Or(m.Title, m.Description, "Sighting photo")
}

// PatternTile is one square of the geometric pattern beside the banner.
type PatternTile struct {
	X, Y   int
	Shape  string
	Turn   int
	Back   string
	Front  string
}

var patternColours = []string{"#FF2A1F", "#1789F0", "#FFFFFF", "#0D0A26"}

var patternMask = []string{
	"XXXX....",
	"XXXX....",
	"XXXXX...",
	"XXXXXXXX",
	"XXXXXXXX",
	"...XXXXX",
	"....XXXX",
	"....XXXX",
}

// Pattern lays out the tiles, picked by a fixed sequence so every visit looks the same.
func Pattern() []PatternTile {
	shapes := []string{"quarter", "quarter", "half", "circle", "quarter", "leaf"}
	seed := uint32(20260)
	next := func(n int) int {
		seed = seed*1664525 + 1013904223
		return int(seed>>16) % n
	}
	var tiles []PatternTile
	for y, row := range patternMask {
		for x, c := range row {
			if c != 'X' {
				continue
			}
			back := next(len(patternColours))
			front := (back + 1 + next(len(patternColours)-1)) % len(patternColours)
			tiles = append(tiles, PatternTile{
				X: x * 50, Y: y * 50,
				Shape: shapes[next(len(shapes))],
				Turn:  next(4) * 90,
				Back:  patternColours[back],
				Front: patternColours[front],
			})
		}
	}
	return tiles
}

func rotate(t PatternTile) string {
	return fmt.Sprintf("rotate(%d 25 25)", t.Turn)
}

func translate(t PatternTile) string {
	return fmt.Sprintf("translate(%d %d)", t.X, t.Y)
}

// nameHead is every word of a name but the last, with its trailing space.
func nameHead(name string) string {
	if i := strings.LastIndex(name, " "); i >= 0 {
		return name[:i+1]
	}
	return ""
}

// nameTail is the last word of a name, kept on one line with the dot after it.
func nameTail(name string) string {
	return name[strings.LastIndex(name, " ")+1:]
}
