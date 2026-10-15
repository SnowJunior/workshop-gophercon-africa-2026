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
- Easing `--ease: cubic-bezier(0.22, 1, 0.36, 1)`; slide changes take `--slide-time: 900ms`.

## Components

- **Showcase** (`components/showcase.templ`): the first six sightings with a photo. The banner
  photo fades and settles, the name slides up from behind a mask, the text follows. The
  numbered cards on the left move up one place each change. Left-hand numbers jump to a slide, and
  a gold line under the active one fills as autoplay counts down (6s, pauses on hover/focus, a
  pause button, off when reduced motion is on). A–B are previous/next; arrow keys and swipes work too.
- **Pattern**: an SVG grid of quarter circles, half circles, circles and leaves, laid out by a
  fixed sequence in `showcase.go`. A few squares rotate on every slide change.
- **Header** (layout): logo top-left, two-line menu button in the middle (opens a full-screen
  menu), gold search icon top-right that opens a search box filtering the tiles.
- **Tiles** (`components/sighting_card.templ`): every sighting, rising into place as they scroll
  in; tiles without a photo show a small blue/white/red geometric placeholder.
- **Stats**: sightings, species, countries and photos, counting up when seen.
- **Map**: Leaflet with clusters, dark tiles, red markers.
- **Lightbox**: banner photo and tile photos open full size.

## Avoid

- Inline styles built from GBIF data; `innerHTML` with GBIF text.
- Animating anything when the reader asks for reduced motion.
