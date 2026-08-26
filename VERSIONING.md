# Versioning workflow

`main` is what GitHub Pages actually serves at bhaveshnakum.com. It should always be in a state worth showing someone.

## Branches, not tags

Each version of the site lives on its own branch, named after the phase it represents (`v1-structure`, `v2-theming`, `v3-transition`, `v4-expansion`, ...), until it's reviewed and ready:

- Build and iterate on `origin/vN-<phase>`. Local work may happen on a differently-named working branch (e.g. a Claude Code session branch) — what matters is that the *published* branch on GitHub carries the version name, so anyone looking at the repo can tell what state it's in.
- Preview locally (`bundle exec jekyll serve`) or push the branch and check the Pages build logs before merging.
- Merge into `main` only once it's approved — that merge is the release.
- To roll back, check out the previous version's branch rather than reverting individual commits on `main`. Keeping each version's branch around after merge (don't delete it) is what makes that possible.

## What counts as "a version"

A version is a coherent, reviewable chunk of work — not every commit. Rough phases for this rebuild:

1. **Structure** — Jekyll skeleton, layouts, resume + life pages, no motion or polish (this phase).
2. **Theming** — refine the professional/personal visual styles once content is final.
3. **Transition** — the light/dark particle-dissolve effect between the two sides.
4. **Expansion** — interview experience, interview questions, photo gallery, YouTube — brought in one at a time, each its own version.

## Never without a check-in

Don't push to `main` or merge a version branch without the user confirming it's ready — `main` being live is the whole point of treating it carefully.
