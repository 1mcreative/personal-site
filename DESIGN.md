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
- `_layouts/home.html` is now a bright, playful, button-free hero — not the neutral dark split it started as, and not a landing page with CTAs either. See "The homepage has no buttons" below.
- Content pages are Markdown with front matter (`layout: professional` / `layout: personal` / `layout: home`), not raw HTML, so adding a new page never means re-writing `<head>` or nav.

## Shared cross-side buttons

Two button components live in `tokens.css` (not a theme file) because they appear on every page, always with the same fixed colors regardless of which page's background they sit on — the button's own identity signals which side it leads to, the way a "professional" and "personal" doorway might look different from either side of the wall.

- **`.offset-btn`** — "the professional button." Ghost-style pill: `background: var(--bg)` and `border`/`text: var(--text)`, so it's white/black-dashed on light pages and dark/white-dashed on the personal page, matching whatever theme it's placed on. Blue (`#1d4ed8`) is the one constant — it only shows up in the hover shadow, same color on every page. Shape never changes, only position/shadow animate on hover. Padding/font-size use `clamp()` so it scales smoothly rather than jumping between fixed sizes; `.site-header .offset-btn` still sets a smaller ceiling for the nav context. Used for: the homepage's primary CTA, the résumé's Email/LinkedIn actions, and the header nav link into `/resume/` (on the personal page).
- **`.keycap-btn`** — "the personal button." A rectangular key (8px radius, not a pill) with a solid offset "lip" standing in for its side wall — the classic flat-3D keycap trick, no perspective/rotation (an earlier tilted isometric version was hard to read). Hover only adds a glow, never moves; `:active` collapses the lip and drops the key down 4px, like an actual keypress. Sized to match plain nav-link text (0.95rem) rather than standing out next to "Resume"/"Life & Instagram". `#12181f` fill, `#6ec1ff` glow, from the personal theme's palette. Used for: the homepage's secondary CTA and the header nav link into `/life/` (on the professional page).
- **One button per cross-side link, no duplicates:** each page has exactly one path to the other side — the header nav link, styled as the button matching the *destination's* theme. Don't also add a same-purpose button in the page body; that was tried and reverted (see CLAUDE.md tooling log) because two ways to do the same thing on one page reads as redundant, not extra-helpful.
- **Watch for this bug:** both themes set a blanket `a { color: var(--accent) }` for prose links, which has higher specificity (class+type) than a bare `.offset-btn`/`.keycap-btn` class rule — without `!important` on the button's own `color`, its label renders in accent-on-accent (or theme-on-theme) and disappears. Already fixed in `tokens.css`; keep it in mind if either theme's link-color rule changes.
- **Naming:** avoid both the literal "Professional"/"Personal" wording and pure-engineer jargon (two earlier passes tried "Enter Production"/"peek at Localhost" and then "See the Résumé"/"Off the Clock" — the first was engineer-only jargon, the second still said "résumé" out loud, which the user explicitly didn't want). Current names — **The Grind** (professional) and **The Chaos** (personal) — echo the homepage's own established voice ("skip straight to the chaos") instead of describing the destination literally. Same name everywhere that destination appears: the page's own nav self-link, and the cross-link button on the other side.

## The homepage has no buttons

The hero deliberately has zero visible CTAs — no `.offset-btn`, no `.keycap-btn`. The idea is a homepage people poke around in rather than one that funnels them through a button, per explicit direction: "home page should be interactive and center of attraction... people should spend more time on home page to explore."

- **Blobs react to the cursor:** `hero.js` shifts `.hero-blobs` by a few px toward the mouse position (`--mx`/`--my` custom properties), on top of their existing ambient drift animation. Skipped under `prefers-reduced-motion`.
- **The Chaos is a portal orb, not a button:** a small glowing dot (`.portal-orb`) floating among the blobs, real `<a href="/life/">`, whose label ("The Chaos") only appears on hover/focus. It is NOT a hidden easter egg — the visible dot + glow is a genuine, if subtle, affordance, and it's keyboard-focusable with the label text always present in the DOM (screen readers announce it regardless of the opacity trick). Its visual dot is 16px but the real hit target is 44px via an invisible `::before` overlay, per touch-target guidelines.
- **The Grind still starts with a scroll**, but the "keep going" scroll-cue is now a real `<a href="/resume/">`, not just a hint — this had to change from the original plain-div version, because `prefers-reduced-motion` skips the entire scroll-driven mechanic below, and with no CTA button left on the page, reduced-motion/no-JS/keyboard users would otherwise have had zero path to `/resume/` from the homepage. Never rely on a single JS-only mechanic being the sole path to a page.
- **Spotlight text — a second, quieter hint at `/life/`:** `.spotlight-text` ("Not all of me fits in a résumé.") sits top-right (bottom-right on narrow screens), a recreation of the Cred "flashlight" effect — a dim base layer and a pixel-aligned bright duplicate on top, the bright one masked by a `radial-gradient` that follows the cursor (`--spot-x`/`--spot-y`, `mask-image`), so hovering sweeps a small circle of full brightness across the text. Same accessibility principle as the portal orb, taken further: the **enhancement itself is feature-detected**, not just reduced-motion-gated — `hero.js` only dims the text and wires up the cursor tracking (adding `.spotlight-ready`) when `matchMedia('(hover: hover)')` actually matches, i.e. a real mouse. Touch devices, reduced-motion, and no-JS all just get the plain `var(--muted)`-colored link, fully readable, never truly hidden. `--spot-size` (the reveal radius) is a `@property`-registered custom property so it can transition smoothly on hover/focus-visible; `--spot-x`/`--spot-y` update instantly via `pointermove`, no transition, so the spotlight tracks the cursor without lag. Two separate hints at `/life/` (this + the portal orb) is intentional, not redundant — an exploratory homepage rewards finding more than one thing.

## Scroll-to-enter and page transitions (`v3-transition`, complete)

- White homepage background with three soft, blurred, slowly drifting color blobs (`assets/css/home.css` `.blob*`) — decorative, `aria-hidden`, disabled entirely under `prefers-reduced-motion`.
- **Scroll-to-enter, not scroll-jacking:** an `IntersectionObserver` on a sentinel past a `.scroll-runway` spacer (`assets/js/hero.js`) navigates to `/resume/` once the user has actually scrolled and reached the bottom. Native scroll is never intercepted or altered mid-scroll. Skipped entirely under `prefers-reduced-motion` — the "keep going" link (see above) is the fallback path.
- **The scroll-veil builds the anticipation:** as the user scrolls through `.scroll-runway` toward the sentinel, `hero.js` computes progress (0–1) and writes it to `--scroll-progress` on `<html>`; a `position: fixed` radial blue glow (`.scroll-veil`) uses that as its `opacity`, intensifying well before the actual navigation fires. This is what makes the transition feel like it "starts" on scroll rather than snapping only at the very end.
- **The page transition itself is a wipe, not a cross-fade:** `@view-transition { navigation: auto; }` in `tokens.css` opts every page into the browser's native Cross-Document View Transitions API (pure CSS, no JS). `::view-transition-new(root)` animates in via `clip-path: inset()` (bottom-to-top reveal, echoing the scroll-down gesture) while `::view-transition-old(root)` just dims. A literal particle "Thanos snap" would need canvas/WebGL — this is the CSS-only approximation, and what "stops and reveals" the destination once it's loaded. Disabled under `prefers-reduced-motion`.
- **Personal-side transition is the same mechanism, direction-agnostic:** since `@view-transition` is a sitewide opt-in, clicking the portal orb into `/life/` gets the identical wipe. There's no separate "Thanos snap" dark-mode-specific effect built — the original idea was a distinct particle-dissolve just for the light→dark switch, which remains unbuilt (would need canvas). What exists now is one shared wipe transition used everywhere.
