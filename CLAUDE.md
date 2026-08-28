# CLAUDE.md

Project guidance for Claude Code sessions working on bhaveshnakum.com. See also [README.md](README.md) (tech stack, structure), [DESIGN.md](DESIGN.md) (theme tokens), and [VERSIONING.md](VERSIONING.md) (branch workflow).

## What this project is

A dual-theme personal site: a bright/white professional side (`/resume/`, called **The Grind** everywhere it's named in UI) and a dark personal side (`/life/`, called **The Chaos**), joined by a button-free interactive homepage. Built as a plain Jekyll site so GitHub Pages builds it natively, no CI required. Work happens on versioned branches (`v1-structure`, `v2-theming`, `v3-transition`, ...) and only merges to `main` — what Pages actually serves — once the user approves it. Never push to `main` without asking first.

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
| 2026-08-27 | `ui-ux-pro-max` skill (again) | Nav-bar CTA touch-target sizing before moving both buttons into the header nav |
| 2026-08-27 | local Jekyll preview + Browser pane | Verified the reworked two-color offset button, the flattened keycap button's glow visibility, and both nav placements across desktop and mobile before pushing |
| 2026-08-27 | `ponytail` skill | Reviewed the button CSS for bloat before this round's edits — found none worth trimming; used the "reuse existing tokens" reflex when redesigning `.offset-btn` to reference `var(--bg)`/`var(--text)` instead of inventing new per-theme color variables |
| 2026-08-27 | local Jekyll preview + Browser pane | Verified offset-btn's ghost-style theme-matching (white/black-dashed on light pages, dark/white-dashed on personal) and confirmed keycap-btn's glow renders correctly at every viewport tested — the user reported it showing as bare text with no effect, which did not reproduce locally; likely a raw-file or unrendered view rather than a real CSS bug (see fallback fix below either way) |
| 2026-08-27 | `/ponytail:ponytail` command | Rebuilt keycap-btn as a rectangular pressable key (solid offset "lip" for 3D depth, hover = glow only, `:active` = press down) instead of the floating glow pill, per explicit user critique of the previous shape/motion/sizing |
| 2026-08-28 | (no skill — direct implementation, verified via JS/computed-style checks since the Browser tool's `hover` action was unreliable this session) | Rebuilt the homepage with zero visible buttons per user direction ("center of attraction," not a CTA funnel): mouse-reactive blobs, a small always-focusable "portal orb" into `/life/` (label revealed on hover/focus, 44px hit target via an invisible `::before`, not a hidden easter egg), a scroll-progress-driven color veil, and a `clip-path` wipe view-transition (CSS-only stand-in for the originally-envisioned particle "Thanos snap," which would need canvas/WebGL). Renamed "Resume"/"See the Résumé"/"Off the Clock" to **The Grind** / **The Chaos** everywhere, added a real Download-Résumé button (PDF copied into `assets/files/`), and caught + fixed a real accessibility gap of my own making: removing the homepage CTA button left reduced-motion/no-JS/keyboard users with zero path to `/resume/`, since `hero.js` skips its whole scroll mechanic under `prefers-reduced-motion` — fixed by making the "keep going" scroll-cue a real link instead of decorative text |

**Reverted:** a separate "See the Résumé" button in the `/life/` page body and a separate "Off the Clock" button in the `/resume/` header — the user asked for exactly one cross-side link per page (the nav one), not a body button duplicating it. If you're tempted to add a body CTA "for visibility," check with the user first — this was already tried and explicitly undone.

## Known environment quirk (resolved)

Xcode Command Line Tools broke mid-session (a `sudo rm -rf` + reinstall attempt stalled on reported low disk space) and `git` was fixed via `brew install git` in the meantime. CLT later finished installing on its own and local Jekyll preview now works normally (`bundle install && bundle exec jekyll serve`, using Homebrew's Ruby at `/opt/homebrew/opt/ruby/bin`, not the system Ruby). If a future session hits the same native-extension build failure, check `xcode-select -p` and disk space first before assuming the Gemfile is at fault.
