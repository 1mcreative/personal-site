# personal-site

Bhavesh Nakum's personal website, at bhaveshnakum.com — [1mcreative](https://github.com/1mcreative).

Built as a plain Jekyll site so GitHub Pages builds it natively (no CI step required). See [DESIGN.md](DESIGN.md) for the visual system, [VERSIONING.md](VERSIONING.md) for how versions/branches work, and [CLAUDE.md](CLAUDE.md) for AI-assistant working notes on this repo (including a log of which skills/plugins touched it).

## Tech stack

- **Static site generator:** [Jekyll](https://jekyllrb.com/) — content is Markdown with YAML front matter, rendered through Liquid layouts/includes
- **Markup:** semantic HTML embedded in Markdown pages (`_layouts/`, `_includes/`)
- **Styling:** plain CSS with custom properties for theming (`assets/css/`) — no framework, no preprocessor
- **Fonts:** [Google Fonts](https://fonts.google.com/) (Inter + Fraunces), loaded via `<link>`, no local hosting
- **SEO:** [jekyll-seo-tag](https://github.com/jekyll/jekyll-seo-tag) and [jekyll-sitemap](https://github.com/jekyll/jekyll-sitemap) plugins, plus a hand-written `robots.txt`
- **Hosting:** GitHub Pages, custom domain via `CNAME` (bhaveshnakum.com)
- **JavaScript:** none yet — the planned light/dark transition effect (see DESIGN.md) will be the first bit added

## Structure

The site is split into two themed halves off a neutral homepage:

| Path | Purpose | Theme |
| --- | --- | --- |
| `/` | Homepage — links to both sides | neutral |
| `/resume/` | Resume, work history, contact | bright/professional |
| `/life/` | Instagram and hobbies | dark/personal |
| `/interviews/`, `/questions/` | Interview experience & question sets (placeholder, not yet in nav) | legacy plain HTML |
| `/coming-soon/` | Old holding page (currently unused by the homepage) | — |

Shared layout pieces live in `_layouts/` and `_includes/`; theme colors and shared tokens live in `assets/css/`.

## Local preview

```bash
bundle install
bundle exec jekyll serve
```

(Needs Ruby + Bundler locally — see the `Gemfile`. Without that set up, `python3 -m http.server` will serve the raw files but won't process the `.md` pages or Liquid includes — use the real Jekyll build to preview accurately.)
