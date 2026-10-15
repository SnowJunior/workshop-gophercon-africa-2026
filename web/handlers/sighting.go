package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"uuid"
	"workshop/internal/domain/sighting"
	"workshop/web/views/pages"
)

type SightingFinder interface {
	Find(ctx context.Context, id uuid.UUID) (sighting.Sighting, error)
	List(ctx context.Context, filter sighting.ListFilter) ([]sighting.Sighting, error)
}

func Sighting(logger *slog.Logger, sightings SightingFinder) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		id, err := uuid.Parse(r.PathValue("id"))
		if err != nil {
			renderError(ctx, w, logger, http.StatusNotFound, "That sighting doesn't exist.")
			return
		}

		item, err := sightings.Find(ctx, id)
		if errors.Is(err, sighting.ErrNotFound) {
			renderError(ctx, w, logger, http.StatusNotFound, "That sighting doesn't exist.")
			return
		}
		if err != nil {
			logger.ErrorContext(ctx, "handlers: finding sighting: "+err.Error())
			renderError(ctx, w, logger, http.StatusInternalServerError, "Unable to load the sighting.")
			return
		}

		all, err := sightings.List(ctx, homeFilter)
		if err != nil {
			logger.ErrorContext(ctx, "handlers: listing sightings: "+err.Error())
			renderError(ctx, w, logger, http.StatusInternalServerError, "Unable to load the sighting.")
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		if err = pages.Sighting(item, all).Render(ctx, w); err != nil {
			logger.ErrorContext(ctx, "handlers: rendering sighting: "+err.Error())
			renderError(ctx, w, logger, http.StatusInternalServerError, "Unable to render page.")
		}
	}
}
