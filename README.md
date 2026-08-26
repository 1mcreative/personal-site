# personal-site

Bhavesh Nakum's personal website, at bhaveshnakum.com — [1mcreative](https://github.com/1mcreative).

Built as a plain Jekyll site so GitHub Pages builds it natively (no CI step required). See [DESIGN.md](DESIGN.md) for the visual system and [VERSIONING.md](VERSIONING.md) for how versions/branches work.

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
bundle exec jekyll serve
```

(Needs Ruby + Bundler + the `github-pages` gem locally. Without that set up, `python3 -m http.server` will serve the raw files but won't process the `.md` pages or Liquid includes — use the real Jekyll build to preview accurately.)
