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
- `_layouts/home.html` is intentionally neutral: dark background, light text, and the two `.side-card` links carry the actual theme colors as a preview of what's behind each door.
- Content pages are Markdown with front matter (`layout: professional` / `layout: personal`), not raw HTML, so adding a new page never means re-writing `<head>` or nav.

## Planned: the side-switch transition

Not built yet (structure comes first per the phased rollout — see `VERSIONING.md`). The plan: clicking "Personal side" / "Professional side" in the nav (or a side-card on the homepage) triggers a brief particle-dissolve of the current page's colors before the new theme resolves in — a "snap" between light and dark rather than a hard cut or a plain fade. This will live in its own `assets/js/transition.js`, added once both themed pages are content-complete.
