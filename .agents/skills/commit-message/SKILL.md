---
name: commit-message
description: Write git commit messages for the fe-traceiron repo. Use this whenever you are about to run `git commit` in this repository, whenever the user asks you to "make a commit", "commit this", "write a commit message", or similar — even if they don't mention the format explicitly. This repo follows Conventional Commits and every existing commit uses it, so any commit written without consulting this skill will be inconsistent with the project's history.
---

# Commit messages for fe-traceiron

This repo's history is 100% [Conventional Commits](https://www.conventionalcommits.org/), even though there is no
`commitlint` enforcing it — it's a hand-kept convention, which is exactly why it's easy to break by accident. Match it.

## Format

```
<type>(<scope>): <subject>
```

- **Subject line only** for small, single-purpose changes (the common case in this repo — every commit so far has been a
  one-liner).
- **English**, **imperative mood** ("add", not "added" or "adds"), **lowercase** subject, **no trailing period**.
- Add a body only when the _why_ isn't obvious from the diff — short bullet points, blank line after the subject.

## Types

Pick the one that matches the actual intent of the change (see the repo-wide guidance on `fix` vs `feat` vs
`refactor` — don't call a bug fix a `feat`, and don't call a new capability a `fix`):

| type       | when                                                           |
| ---------- | -------------------------------------------------------------- |
| `fix`      | bug fix, correcting broken or wrong behavior                   |
| `feat`     | new capability or user-facing addition                         |
| `refactor` | internal restructuring with no behavior change                 |
| `test`     | adding or fixing tests only                                    |
| `docs`     | documentation only (README, AGENTS.md, skills, comments)       |
| `chore`    | tooling, dependency bumps, config with no source impact        |
| `style`    | formatting-only changes (rare here — Prettier/ESLint own this) |

## Scopes

Scope = the area the change actually touches. Real examples from this repo's history:

```
fix(security): allow Cloudflare Web Analytics in CSP headers
fix(build): bump Node.js requirement to 22.14.0 for pnpm 11 compatibility
fix(ci): install webkit browser for Playwright mobile-safari tests
```

Other scopes that fit this codebase's structure — use the FSD layer or concern the change lives in (see the
`fsd-architecture` skill for what these mean): `app`, `views`, `widgets`, `features`, `entities`, `shared`, `pages`, a
specific slice name (`hero`, `pricing`, `button`), `i18n`, `a11y`, `arch` (architecture-check changes), `deps`. Omit the
scope only if the change is genuinely repo-wide and no single scope fits.

## Examples

Input: fixed a CSP header that was blocking Cloudflare's analytics script Output:
`fix(security): allow Cloudflare Web Analytics in CSP headers`

Input: added a new pricing section widget to the landing page Output:
`feat(widgets): add pricing section to landing page`

Input: the es.json translation file was missing two keys that en.json has Output:
`fix(i18n): add missing es.json keys for parity with en.json`

Input: moved shared button styles into design tokens instead of hardcoded values Output:
`refactor(design-system): use --ti-* tokens in Button component`

## Before committing

Stage only the files relevant to the change (avoid `git add -A`), and only commit when the user has actually asked for a
commit — this skill governs message wording, not whether to commit in the first place.
