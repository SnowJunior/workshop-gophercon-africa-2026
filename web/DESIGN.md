# Design

Based on the attendee's reference: a dark navy panel floating on a bright blue backdrop, a big
animal photo in the middle, a giant bold name with a blue dot, rounded photo cards spilling over
the panel's edges, and a red/blue/white geometric pattern in the top-right corner.

## Colours (`:root` in `assets/css/app.css`)

| Token | Hex | Use |
|-------|-----|-----|
| `--sky` / `--sky-deep` | `#1591F0` / `#0B5F9C` | page backdrop, a top-to-bottom gradient |
| `--night` | `#0D0A26` | the panels |
| `--night-soft` | `#17133A` | photo placeholders, map background |
| `--poppy` | `#FF2A1F` | red circles, map markers |
| `--cobalt` | `#1789F0` | the dot after every title |
| `--gold` | `#F5B82E` | active number, search icon, focus ring, scientific names |
| `--chalk` | `#FFFFFF` | text |
| `--mist` | `#B9B6D6` | quieter text on navy |

## Lettering

Montserrat (Google Fonts) throughout: 800 for titles, 500–600 for body and labels. Titles are
tight (`letter-spacing: -0.02em`) and end in a cobalt dot. Small labels such as card numbers are
widely spaced.

## Shapes and spacing

- Photo corners `--radius: 22px`; panels are square-cornered.
- Photos sit in fixed `aspect-ratio` boxes with `object-fit: cover` (cards and tiles 3:4).
- Easing `--ease: cubic-bezier(0.22, 1, 0.36, 1)`; slide changes take `--slide-time: 550ms`.

## Components

- **Showcase** (`components/showcase.templ`): the first six sightings with a photo. The banner
  photo fades and settles, the name slides up from behind a mask, the text follows. The
  numbered cards on the left move up one place each change. Left-hand numbers jump to a slide, and
  a gold line under the active one fills as autoplay counts down (3s, pauses on hover/focus, a
  pause button, off when reduced motion is on). A–B are previous/next; arrow keys and swipes work too.
- **Vertical motion**: on a change the outgoing photo slides up and fades, the next rises from
  below (reversed when going back). The showing photo drifts slowly up and down; the waiting
  cards float out of step and their photos pan top to bottom.
- **Pattern**: an SVG grid of quarter circles, half circles, circles and leaves, laid out by a
  fixed sequence in `showcase.go`. A few squares rotate on every slide change.
- **Header** (layout): padded top bar in normal flow, with the logo, visible Featured / Every
  sighting / Globe links on every page, and the search toggle on the home page. Links animate on hover.
- **Tiles** (`components/sighting_card.templ`): every sighting, rising into place as they scroll
  in; tiles without a photo show a small blue/white/red geometric placeholder.
- **Stats**: sightings, species, countries and photos, counting up when seen.
- **Map**: Leaflet with clusters, dark tiles, red markers.
- **Lightbox**: the banner photo and a sighting page's photo open full size. Tiles open the
  sighting's page instead.

## Avoid

- Inline styles built from GBIF data; `innerHTML` with GBIF text.
- Animating anything when the reader asks for reduced motion.

## A sighting's page (`/sightings/{id}`)

Layout from the attendee's second reference (text left, photo right over a coloured block, an
outlined word along the bottom), in the same colours as the home page: one theme across pages.

- Bright blue backdrop and navy panel as on the home page; the panel's background is the photo,
  blurred and darkened. The block behind the photo is `--cobalt`; the button, arrows, outlined
  word and scientific name are `--gold`; the button's text is `--night`. No page-specific colours.
- The photo sits over the block, rising above the panel's top edge; the block shows to its right
  and below it.
- Headline in three lines: "Explore the" / the name in heavy uppercase with a stacked grey shadow /
  "of {country}" ending in the cobalt dot. Then the scientific name, where and when, who recorded it, their notes.
- A rounded "Back to all sightings" button above the headline (top-right on a phone). It steps
  back in history when you came from the home page, so you land where you were; otherwise it
  links to that sighting's tile. Esc does the same.
- "Explore more" opens the GBIF record (or the next sighting).
- Parts sit in a grid and stack in order (back, headline, text, button, thumbnails, outlined
  name), never pinned to fixed positions, so long text pushes the rest down instead of overlapping.
- The left rail is vertical text: date, country, count. Shared navigation remains in the top bar.
- Bottom: previous arrow, the next three sightings with photos as thumbnails, next arrow.
- The last word of the name huge in amber outline along the panel's bottom edge.
- The panel's background is the same photo, blurred and drifting slowly.
- Entrance: text rises in a stagger, the amber block grows upward, the photo slides in from the
  right, the outline word glides in. Clicking a tile, a thumbnail or the banner's "Explore" link
  morphs that photo into this page's photo (view transitions, Chrome/Edge/Safari 18.2+).

## Globe page (`/globe`)

- The globe has its own page and gently rotates, with pause/resume and drag controls. Places
  below the globe provide the same selection interaction without needing to use the canvas.
- Picking a hotspot reveals the first card; the globe fades and recedes behind it. Choose another
  place (or Escape) brings the globe forward, preserving the selection for a second card.
- Weather is rendered in separate Three.js scenes around each card: lit cloud volumes, sunlight,
  depth-distributed rain and snow, fog, dust, and a slow lightning glow. It has dedicated space
  above and beside the card instead of being clipped inside it. CSS scenes remain as fallback.
- Two selected sightings retain the comparison metrics, swap and reset controls. On phones,
  weather scenes and cards stack vertically. Reduced motion disables automatic movement;
  explicit selection and globe dragging still redraw the scene.
- `explore.css` holds the shared navigation and globe page styles; `scenes/weather.js` owns
  the weather scenes, and `faceoff.js` coordinates selection and foreground/background states.
