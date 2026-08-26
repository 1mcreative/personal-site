# Design notes

Two themes live side by side, joined by a neutral homepage.

## Professional (`/resume/`) — bright

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#ffffff` | page background |
| `--surface` | `#f5f6f8` | cards, subtle panels |
| `--text` | `#1b1f24` | body text |
| `--muted` | `#5b6572` | secondary text, nav |
| `--accent` | `#1d4ed8` | links, highlights |
| `--border` | `#e3e6ea` | hairlines |

## Personal (`/life/`) — dark

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0f1419` | page background |
| `--surface` | `#1a2332` | cards |
| `--text` | `#e8eef7` | body text |
| `--muted` | `#9aa8b8` | secondary text, nav |
| `--accent` | `#6ec1ff` | links, highlights |
| `--border` | `#263041` | hairlines |

## Typography

- Body: Inter
- Headings: Fraunces (a serif with some personality, used sparingly for `h1`–`h3`)

Both fonts are loaded once, from Google Fonts, and shared across themes — only the color tokens change between professional and personal.

## Layout system

- `_layouts/professional.html` and `_layouts/personal.html` share `_includes/head.html` and `_includes/footer.html`, and only differ in body class and nav include. This is the only place theme markup should be duplicated — everything else should be a shared include.
- `_layouts/home.html` is now a bright, playful hero — not the neutral dark split it started as. It leads with the professional side (a scroll- or click-triggered path into `/resume/`) and gives the personal side a smaller, secondary link for now.
- Content pages are Markdown with front matter (`layout: professional` / `layout: personal` / `layout: home`), not raw HTML, so adding a new page never means re-writing `<head>` or nav.

## Home hero (`v3-transition`)

- White background with three soft, blurred, slowly drifting color blobs (`assets/css/home.css` `.blob*`) — decorative, `aria-hidden`, disabled entirely under `prefers-reduced-motion`.
- Primary CTA ("Enter Production") is a dashed-border pill button that lifts up-left on hover/focus with a hard offset shadow, adapted in plain CSS (transform + box-shadow transitions, no JS/animation library) from a React/Framer-Motion reference component the user provided. Colors: `--hero-accent` (`#1d4ed8`) fill, `--hero-shadow` (`#ff6b4a`) for the offset shadow — a deliberate playful contrast pair, not the professional page's own palette.
- Secondary link ("or peek at Localhost") to `/life/` — intentionally lower-key; the personal side isn't getting the full treatment yet.
- Naming: buttons/labels avoid the literal words "Professional"/"Personal" in favor of an engineer-voice metaphor — Production (the resume/work side) vs. Localhost (the personal side). Easy to swap if it stops feeling right.
- **Scroll-to-enter, not scroll-jacking:** an `IntersectionObserver` on a sentinel just past the hero (`assets/js/hero.js`) navigates to `/resume/` once the user has actually scrolled and reached the bottom of the page. Native scroll is never intercepted or altered mid-scroll — this only reacts at the natural end of the page, and only after real user-initiated scrolling (guards against firing on page load). Skipped entirely under `prefers-reduced-motion`, where the CTA button is the only path — this was a deliberate choice per `ui-ux-pro-max`'s accessibility guidance against forcing scroll effects or unexpected navigation on motion-sensitive users.
- **Seamless page transition:** `@view-transition { navigation: auto; }` in `tokens.css` opts every page into the browser's native Cross-Document View Transitions API. This is pure CSS — no JS — and animates same-origin navigations (including the scroll-triggered one above) with a cross-fade; unsupported browsers just navigate normally. `::view-transition-group(root)` tunes the default duration/easing to match the rest of the site's `--speed`/`--ease` feel.

## Planned: the personal-side transition

Not built yet. The original idea — a "Thanos snap" particle-dissolve when switching from the personal (dark) side to the professional (bright) side or back — still applies to `/life/` and the personal-side entry point, which for now is just a plain link. Revisit once the personal side has real content beyond the two Instagram cards.
