package handlers_test

import (
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"workshop/internal/domain/sighting"
	"workshop/internal/domain/species"
	"workshop/web/handlers"

	"github.com/stretchr/testify/assert"
)

func TestGlobe(t *testing.T) {
	t.Parallel()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	items := []sighting.Sighting{{
		Species:  species.Species{VernacularName: "lion"},
		Location: sighting.Location{Coordinates: sighting.Coordinates{Latitude: -1.3, Longitude: 36.8}},
	}}
	t.Run("dedicated explorer", func(t *testing.T) {
		rec := httptest.NewRecorder()
		handlers.Globe(logger, fakeLister{items: items})(rec, httptest.NewRequest(http.MethodGet, "/globe", nil))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "text/html; charset=utf-8", rec.Header().Get("Content-Type"))
		assert.Contains(t, rec.Body.String(), `data-scene="globe"`)
		assert.Contains(t, rec.Body.String(), `data-scene="weather"`)
		assert.Contains(t, rec.Body.String(), `aria-current="page"`)
		assert.NotContains(t, rec.Body.String(), `data-showcase`)

		home := serveHome(t, fakeLister{items: items})
		assert.Contains(t, home.Body.String(), `href="/globe"`)
		assert.NotContains(t, home.Body.String(), `data-scene="globe"`)
		assert.NotContains(t, home.Body.String(), `/assets/js/scenes/weather.js`)
	})
	t.Run("no located sightings", func(t *testing.T) {
		rec := httptest.NewRecorder()
		handlers.Globe(logger, fakeLister{items: []sighting.Sighting{{}}})(rec, httptest.NewRequest(http.MethodGet, "/globe", nil))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Contains(t, rec.Body.String(), "No sightings with locations yet")
		assert.NotContains(t, rec.Body.String(), `data-scene="globe"`)
	})
	t.Run("store error", func(t *testing.T) {
		rec := httptest.NewRecorder()
		handlers.Globe(logger, fakeLister{err: errors.New("unavailable")})(rec, httptest.NewRequest(http.MethodGet, "/globe", nil))
		assert.Equal(t, http.StatusInternalServerError, rec.Code)
		assert.NotContains(t, rec.Body.String(), `data-scene="globe"`)
	})
}
