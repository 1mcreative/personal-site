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

## Known environment quirk

This Mac's Xcode Command Line Tools are broken/uninstalled (a CLT reinstall was attempted and didn't complete — disk space reported as insufficient despite `df` showing room, possibly a sandboxing quirk). `git` was fixed via `brew install git` (precompiled, no CLT needed). Local Jekyll preview (`bundle exec jekyll serve`) still needs a working C toolchain to compile native gem extensions (nokogiri, etc.) and has not been gotten working locally — treat GitHub's own Pages build as the real verification until this is resolved.
