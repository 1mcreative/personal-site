# CLAUDE.md

Project guidance for Claude Code sessions working on bhaveshnakum.com. See also [README.md](README.md) (tech stack, structure), [DESIGN.md](DESIGN.md) (theme tokens), and [VERSIONING.md](VERSIONING.md) (branch workflow).

## What this project is

A dual-theme personal site: a bright/white professional side (`/resume/`) and a dark personal side (`/life/`), joined by a neutral homepage. Built as a plain Jekyll site so GitHub Pages builds it natively, no CI required. Work happens on versioned branches (`v1-structure`, `v2-theming`, ...) and only merges to `main` — what Pages actually serves — once the user approves it. Never push to `main` without asking first.

## Required for any written copy

Before treating any prose on this site as final — homepage intro, bio blurbs, Instagram captions, anything that isn't a near-verbatim transcription of the user's own resume — run it through the `humanize-ai-writing` skill. The user asked for this explicitly and it applies to every future content pass, not just the first one.

## Tooling log

Whenever a skill, MCP server, or Claude Code plugin gets used on this repo, log it here with the date, so the next session (or the next person) knows what produced what.

| Date | Tool | Used for |
| --- | --- | --- |
| 2026-08-26 | Read / Write / Edit / Bash (no skill or plugin) | Initial Jekyll scaffold: layouts, includes, CSS themes, resume and life pages transcribed from the user's resume PDF |
| 2026-08-26 | Homebrew (`brew install git`) | Replaced the system `git`/Xcode Command Line Tools toolchain after it broke mid-session; bottled binary needed no compilation |
| 2026-08-26 | `ui-ux-pro-max` skill | Design-system and landing-pattern guidance for the homepage hero (v3-transition phase) — used its Minimal Single Column landing pattern and its explicit warning against scroll-jacking/forced parallax; deliberately overrode its Brutalism/handwritten-font suggestion as a mismatch for a recruiter-facing resume site |
| 2026-08-26 | `humanize-ai-writing` skill | Rewrote the hero headline/subhead/button copy before finalizing (see project memory) |
| 2026-08-26 | `ui-ux-pro-max` skill (again) | Sanity-checked secondary-CTA sizing/hierarchy before adding the isometric "keycap" button for the personal-side link |
| 2026-08-26 | local Jekyll preview (`bundle exec jekyll serve`) + Browser pane | Visually verified the hero, both CTA buttons' hover states, and the scroll-to-resume behavior before pushing |
| 2026-08-27 | local Jekyll preview + Browser pane | Caught a real bug pre-push: `.offset-btn`'s white text was invisible on `/resume/` and `/life/` (ambient theme `a{color}` rule outranked it on specificity) — fixed with a documented `!important` in `tokens.css`. Would not have been visible from code review alone |
| 2026-08-27 | (no skill — direct edit) | Reworked hero/résumé copy off jargon ("Enter Production"/"Localhost") to plain idiom ("See the Résumé"/"Off the Clock") per user feedback that non-engineers didn't get the original names |

## Known environment quirk (resolved)

Xcode Command Line Tools broke mid-session (a `sudo rm -rf` + reinstall attempt stalled on reported low disk space) and `git` was fixed via `brew install git` in the meantime. CLT later finished installing on its own and local Jekyll preview now works normally (`bundle install && bundle exec jekyll serve`, using Homebrew's Ruby at `/opt/homebrew/opt/ruby/bin`, not the system Ruby). If a future session hits the same native-extension build failure, check `xcode-select -p` and disk space first before assuming the Gemfile is at fault.
