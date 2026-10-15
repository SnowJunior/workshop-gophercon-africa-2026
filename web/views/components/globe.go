package components

import (
	"cmp"
	"math"
	"slices"
	"strings"

	"workshop/internal/domain/sighting"
)

// Anchor is a stable element id for a sighting, so other parts of the page can link to its tile.
func Anchor(s sighting.Sighting) string {
	return "sighting-" + s.ID.String()
}

// GlobeData is what the globe and the face-off read, handed over as JSON.
type GlobeData struct {
	Sightings []GlobeSighting `json:"sightings"`
	Spots     []GlobeSpot     `json:"spots"`
}

// GlobeSighting is one sighting, cut down to what a face-off card shows.
type GlobeSighting struct {
	Name     string   `json:"name"`
	Sci      string   `json:"sci,omitzero"`
	Place    string   `json:"place"`
	Date     string   `json:"date"`
	Day      string   `json:"day"`
	By       string   `json:"by,omitzero"`
	Photo    string   `json:"photo,omitzero"`
	URL      string   `json:"url"`
	Lat      float64  `json:"lat"`
	Lng      float64  `json:"lng"`
	Count    *int     `json:"count,omitzero"`
	Elev     *float64 `json:"elev,omitzero"`
	Sky      string   `json:"sky"`
	Weather  string   `json:"wx,omitzero"`
	Temp     *float64 `json:"temp,omitzero"`
	Feels    *float64 `json:"feels,omitzero"`
	Wind     *float64 `json:"wind,omitzero"`
	Humidity *int     `json:"humidity,omitzero"`
}

// GlobeSpot is a hotspot: the sightings within a few degrees of each other.
type GlobeSpot struct {
	Lat   float64 `json:"lat"`
	Lng   float64 `json:"lng"`
	Label string  `json:"label"`
	Items []int   `json:"items"`
}

const spotDegrees = 5.0

// NewGlobeData turns sightings into points and groups them into hotspots, skipping any with no position.
func NewGlobeData(sightings []sighting.Sighting) GlobeData {
	var data GlobeData
	cells := map[[2]int]int{}
	for _, s := range sightings {
		l := s.Location
		if l.Latitude == 0 && l.Longitude == 0 {
			continue
		}
		data.Sightings = append(data.Sightings, globeSighting(s))
		i := len(data.Sightings) - 1

		key := [2]int{int(math.Floor(l.Latitude / spotDegrees)), int(math.Floor(l.Longitude / spotDegrees))}
		at, ok := cells[key]
		if !ok {
			at = len(data.Spots)
			cells[key] = at
			data.Spots = append(data.Spots, GlobeSpot{})
		}
		data.Spots[at].Items = append(data.Spots[at].Items, i)
	}
	for i := range data.Spots {
		data.Spots[i] = settle(data.Spots[i], data.Sightings)
	}
	slices.SortFunc(data.Spots, func(a, b GlobeSpot) int {
		return cmp.Or(cmp.Compare(len(b.Items), len(a.Items)), strings.Compare(a.Label, b.Label))
	})
	return data
}

// settle places a hotspot at the middle of its sightings and names it after its commonest country.
func settle(spot GlobeSpot, points []GlobeSighting) GlobeSpot {
	countries := map[string]int{}
	var lat, x, y float64
	for _, i := range spot.Items {
		p := points[i]
		lat += p.Lat
		x += math.Cos(p.Lng * math.Pi / 180)
		y += math.Sin(p.Lng * math.Pi / 180)
		countries[cmp.Or(countryOf(p.Place), p.Place)]++
	}
	n := float64(len(spot.Items))
	spot.Lat = lat / n
	spot.Lng = math.Atan2(y, x) * 180 / math.Pi
	best := 0
	for name, c := range countries {
		if c > best || (c == best && name < spot.Label) {
			spot.Label, best = name, c
		}
	}
	return spot
}

// countryOf is the last part of a place, which is the country when GBIF gave one.
func countryOf(place string) string {
	parts := strings.Split(place, ", ")
	return parts[len(parts)-1]
}

func globeSighting(s sighting.Sighting) GlobeSighting {
	g := GlobeSighting{
		Name:  displayName(s.Species),
		Sci:   s.Species.ScientificName,
		Place: place(s.Location),
		Date:  s.HappenedAt.Format("2 Jan 2006"),
		Day:   s.HappenedAt.Format("2006-01-02"),
		By:    s.RecordedBy,
		URL:   SightingURL(s),
		Lat:   s.Location.Latitude,
		Lng:   s.Location.Longitude,
		Count: s.IndividualCount,
		Elev:  s.Location.ElevationInMetres,
		Sky:   skyOf(s.Weather),
	}
	if m, ok := photo(s); ok {
		g.Photo = m.URL
	}
	if w := s.Weather; !w.ObservedAt.IsZero() {
		g.Weather = w.Condition.Description
		g.Temp = &w.Temperature.Actual
		g.Feels = &w.Temperature.Apparent
		g.Wind = &w.Wind.Speed
		g.Humidity = &w.Humidity
	}
	return g
}
