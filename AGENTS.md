# AGENTS.md

This file provides guidance to AI coding agents (Claude Code and others) when working with code in this repository.
`CLAUDE.md` in this repo is a symlink to this file — there is only one copy to keep in sync.

## Commands

- `pnpm dev` — start the Astro dev server.
- `pnpm build` — production build.
- `pnpm preview` — serve the build on the Cloudflare Workers runtime via Wrangler.
- `pnpm deploy` — build and deploy to Cloudflare Workers.
- `pnpm test` — run the full unit/component suite (Vitest).
    - Single file: `pnpm exec vitest run <path/to/file.test.ts>`
    - Single test by name: `pnpm exec vitest run -t "<test name>"`
- `pnpm test:e2e` — run the E2E + accessibility suite (Playwright + axe-core).
    - Single spec: `pnpm exec playwright test <path/to/file.spec.ts>`
- `pnpm check` — `astro check` + i18n key-parity check.
- `pnpm check:i18n` — verify `src/shared/i18n/en.json` and `es.json` have identical keys.
- `pnpm check:budget` — verify the build's performance budget.
- `pnpm check:conformance` — verify build output conformance.
- `pnpm check:all` — runs all of the above checks plus a build, in sequence.
- `node scripts/check-architecture.mjs` — verify FSD layering rules (see below).
- `pnpm lint` / `pnpm lint:fix` — ESLint for JS/TS/Astro.
- `pnpm lint:css` / `pnpm lint:css:fix` — Stylelint.
- `pnpm format` / `pnpm format:check` — Prettier.

For long-lived sessions, run the dev server in the background instead of a blocking foreground process:
`astro dev --background`, then `astro dev status` / `astro dev logs [--follow]` / `astro dev stop`.

## Architecture

Astro 7 in `server` mode on Cloudflare Workers (`@astrojs/cloudflare`), zero client JavaScript by default. `src/`
follows Feature-Sliced Design (FSD), layers most to least specific:

```
app > views > widgets > features > entities > shared
```

plus `pages/` (Astro-reserved routes, must stay ultra-thin wrappers into `views/`) and `assets/`. A layer may only
import itself or a less-specific layer (the one exception: `views` may import `app`). Only one file in `src/` may import
`cloudflare:workers`. No full-layer barrel files. All of this is enforced by
[scripts/check-architecture.mjs](scripts/check-architecture.mjs) in CI.

Path aliases (`tsconfig.json`): `@app/*`, `@views/*`, `@widgets/*`, `@features/*`, `@entities/*`, `@shared/*`.

Shared content-sharing routes (`/r/[id]`, `/e/[id]`, `/s/[id]`) read from Apple CloudKit through a port/adapter in
`src/entities/content-pack` (`model/` + `api/`, with a fake repository under `testing/` for tests).

`src/shared/i18n/en.json` and `es.json` must keep identical key sets — `pnpm check:i18n` enforces this.

Testing is a four-level pyramid, all run in CI: unit tests co-located as `*.test.ts`, component tests via the Astro
Container API on Vitest, E2E via Playwright, and accessibility via `@axe-core/playwright` (zero _serious_/ _critical_
WCAG 2.1 AA violations). `cloudflare:workers` is stubbed in tests via an alias in `vitest.config.ts`.

For the full normative detail on any of this, see the skills below rather than re-deriving it from scratch.

## Skills

`.agents/skills/` holds task-specific guides that go deeper than this file. Consult them for the matching task:

- **commit-message** — this repo's Conventional Commits format, with real examples from `git log`.
- **fsd-architecture** — the full FSD layering rules, what CI's architecture check enforces, and where new code should
  live.
- **design-system** — design tokens (`src/shared/styles/tokens.css`) and UI component conventions (`src/shared/ui`).

`.claude/skills` is a symlink to `.agents/skills` so Claude Code discovers the same guides without a second copy; any
other tool-specific config directory added later should link here the same way instead of duplicating content.

## References

- [Astro routing & middleware](https://docs.astro.build/en/guides/routing/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Astro framework components](https://docs.astro.build/en/guides/framework-components/)
- [Astro content collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro styling](https://docs.astro.build/en/guides/styling/)
- [Astro i18n](https://docs.astro.build/en/guides/internationalization/) — this project does **not** use it; see the
  `fsd-architecture` skill for why.
