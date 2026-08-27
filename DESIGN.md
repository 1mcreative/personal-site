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

## Shared cross-side buttons

Two button components live in `tokens.css` (not a theme file) because they appear on every page, always with the same fixed colors regardless of which page's background they sit on — the button's own identity signals which side it leads to, the way a "professional" and "personal" doorway might look different from either side of the wall.

- **`.offset-btn`** — "the professional button." Ghost-style pill: `background: var(--bg)` and `border`/`text: var(--text)`, so it's white/black-dashed on light pages and dark/white-dashed on the personal page, matching whatever theme it's placed on. Blue (`#1d4ed8`) is the one constant — it only shows up in the hover shadow, same color on every page. Shape never changes, only position/shadow animate on hover. Padding/font-size use `clamp()` so it scales smoothly rather than jumping between fixed sizes; `.site-header .offset-btn` still sets a smaller ceiling for the nav context. Used for: the homepage's primary CTA, the résumé's Email/LinkedIn actions, and the header nav link into `/resume/` (on the personal page).
- **`.keycap-btn`** — "the personal button." A rectangular key (8px radius, not a pill) with a solid offset "lip" standing in for its side wall — the classic flat-3D keycap trick, no perspective/rotation (an earlier tilted isometric version was hard to read). Hover only adds a glow, never moves; `:active` collapses the lip and drops the key down 4px, like an actual keypress. Sized to match plain nav-link text (0.95rem) rather than standing out next to "Resume"/"Life & Instagram". `#12181f` fill, `#6ec1ff` glow, from the personal theme's palette. Used for: the homepage's secondary CTA and the header nav link into `/life/` (on the professional page).
- **One button per cross-side link, no duplicates:** each page has exactly one path to the other side — the header nav link, styled as the button matching the *destination's* theme. Don't also add a same-purpose button in the page body; that was tried and reverted (see CLAUDE.md tooling log) because two ways to do the same thing on one page reads as redundant, not extra-helpful.
- **Watch for this bug:** both themes set a blanket `a { color: var(--accent) }` for prose links, which has higher specificity (class+type) than a bare `.offset-btn`/`.keycap-btn` class rule — without `!important` on the button's own `color`, its label renders in accent-on-accent (or theme-on-theme) and disappears. Already fixed in `tokens.css`; keep it in mind if either theme's link-color rule changes.
- **Naming:** avoid both the literal "Professional"/"Personal" wording and pure-engineer jargon (an earlier pass used "Enter Production" / "peek at Localhost," which only landed for other engineers). Current labels — "See the Résumé" and "Off the Clock" — read as an idiom anyone recognizes, no explanation required. Same label everywhere the same destination appears.

## Planned: the personal-side transition

Not built yet. The original idea — a "Thanos snap" particle-dissolve when switching from the personal (dark) side to the professional (bright) side or back — is a separate, bigger effect than the cross-side buttons above. Revisit once the personal side has real content beyond the two Instagram cards.

## Scroll-to-enter and page transitions (`v3-transition`)

- White homepage background with three soft, blurred, slowly drifting color blobs (`assets/css/home.css` `.blob*`) — decorative, `aria-hidden`, disabled entirely under `prefers-reduced-motion`.
- **Scroll-to-enter, not scroll-jacking:** an `IntersectionObserver` on a sentinel just past the hero (`assets/js/hero.js`) navigates to `/resume/` once the user has actually scrolled and reached the bottom of the page. Native scroll is never intercepted or altered mid-scroll — this only reacts at the natural end of the page, and only after real user-initiated scrolling (guards against firing on page load). Skipped entirely under `prefers-reduced-motion`, where the CTA button is the only path — this was a deliberate choice per `ui-ux-pro-max`'s accessibility guidance against forcing scroll effects or unexpected navigation on motion-sensitive users.
- **Seamless page transition:** `@view-transition { navigation: auto; }` in `tokens.css` opts every page into the browser's native Cross-Document View Transitions API. This is pure CSS — no JS — and animates same-origin navigations (including the scroll-triggered one above) with a cross-fade; unsupported browsers just navigate normally. `::view-transition-group(root)` tunes the default duration/easing to match the rest of the site's `--speed`/`--ease` feel.
