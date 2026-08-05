---
name: fsd-architecture
description: Rules for where code lives and how layers may import from each other in the fe-traceiron Feature-Sliced Design (FSD) codebase. Use this whenever creating a new file under src/ (page, view, widget, feature, entity, or shared module), moving code between layers, adding an import across layers, or whenever you're unsure which layer something belongs in. These rules are enforced by CI (scripts/check-architecture.mjs) — code that violates them will fail the build even if it works locally.
---

# FSD architecture for fe-traceiron

`src/` follows Feature-Sliced Design. All rules below are mechanically checked by
[scripts/check-architecture.mjs](../../../scripts/check-architecture.mjs) — run `node scripts/check-architecture.mjs`
after adding or moving files to verify before it hits CI.

## Layers, most to least specific

```
app > views > widgets > features > entities > shared
```

Plus two special, non-layered folders: `pages/` (Astro's reserved route folder) and `assets/`.

| layer      | purpose                                                          |
| ---------- | ---------------------------------------------------------------- |
| `app`      | global bootstrap: layouts, middleware, site-wide SEO             |
| `views`    | full route compositions (the "page" in the product sense)        |
| `widgets`  | composite blocks: header, footer, landing sections               |
| `features` | user interaction: language switch, "open in app"                 |
| `entities` | business objects: e.g. `content-pack` (model, repository, API)   |
| `shared`   | generic, business-agnostic: design tokens, i18n, base UI, config |
| `pages`    | Astro-reserved routes — ultra-thin wrappers into `views/`        |

Path aliases (from [tsconfig.json](../../../tsconfig.json)): `@app/*`, `@views/*`, `@widgets/*`, `@features/*`,
`@entities/*`, `@shared/*`.

### Astro-reserved paths vs. FSD convention

Astro mechanically reserves some paths under `src/`; everything else follows FSD convention:

| path                                                                                      | nature                                                                                |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/pages/**`                                                                            | Astro-reserved — thin route wrappers, see rule 5 below                                |
| `src/middleware.ts`                                                                       | Astro-reserved — keep it a thin re-export of the real middleware in `@app/middleware` |
| `src/env.d.ts`                                                                            | Astro-reserved — global type declarations                                             |
| `astro.config.mjs`                                                                        | Astro-reserved — framework config                                                     |
| `public/**`                                                                               | Astro-reserved — static assets served as-is                                           |
| `src/app/`, `src/views/`, `src/widgets/`, `src/features/`, `src/entities/`, `src/shared/` | FSD layers                                                                            |

**Banned legacy folders**: `src/layouts/`, `src/components/`, `src/lib/`, `src/styles/`, `src/i18n/` must never exist —
their content lives in `app/`, the relevant FSD layer, or `shared/` instead.

## Import direction

A layer may only import from itself or from a layer **less specific than itself** (further down the table above).
`shared` can't import from `entities`; `entities` can't import from `widgets`; and so on. The one exception:
**`views` may import from `app`** (layouts/bootstrap primitives), even though `app` is more specific.

Concretely: if you're writing code in `src/widgets/pricing/`, you may import `@features/*`, `@entities/*`, and
`@shared/*`, but never `@views/*` or `@app/*`.

## The five checks CI runs

1. **No full-layer barrels.** Never create `src/<layer>/index.ts` (e.g. `src/widgets/index.ts`). Barrels _inside_ a
   single component/module (`src/shared/ui/button/index.ts`) are fine and expected — it's only a barrel for an entire
   layer that's banned. Why: with `build.inlineStylesheets: 'auto'` (see [astro.config.mjs](../../../astro.config.mjs)),
   importing through a wide barrel drags in the scoped CSS of every component it re-exports, even unused ones — silently
   blowing the bundle past `pnpm check:budget`.
2. **No legacy folders.** Every directory directly under `src/` must be one of the FSD layers, `pages`, or `assets`.
   Don't invent a new top-level folder without updating the architecture check.
3. **`cloudflare:workers` isolation.** Only one file in the entire `src/` tree may import from `'cloudflare:workers'`:
   [src/shared/lib/runtime-env.ts](../../../src/shared/lib/runtime-env.ts), which exposes `getRuntimeEnv()`. If you
   need a runtime secret or binding anywhere new, call `getRuntimeEnv()` from that file rather than importing
   `cloudflare:workers` directly — adding a second direct import fails this check.
4. **Layer import hierarchy** — see above.
5. **Thin route wrappers.** Every `src/pages/**/*.astro` file must be ≤15 lines and import only from `@views/*` (plus
   the `astro` package itself). All real page logic belongs in `views/`; `pages/` files just wire a route to a view.

## Where to put new code

- New route → thin wrapper in `pages/`, real content in a new or existing `views/` module.
- New page-section or composite UI block used by one or more views → `widgets/`.
- New user-triggered interaction (not a full section) → `features/`.
- New business object with its own data/model, independent of any specific page → `entities/`. Look at
  [src/entities/content-pack](../../../src/entities/content-pack) as the reference shape: `model/` (types + parsing),
  `api/` (repository interface + concrete adapter, e.g. `cloudkit-repository.ts` behind a port/adapter interface),
  `testing/` (fake repository for tests). [src/entities/support-request](../../../src/entities/support-request) is a
  second example of the same shape with two external I/O boundaries (Turnstile verification, Resend email) instead of
  one.
- Generic, reusable, business-agnostic primitive (design tokens, base UI atoms, i18n, config) → `shared/`.

## Lexicon: don't confuse these three

- **"shared"** — reserved strictly for the FSD `src/shared/` layer.
- **"share link"** — the product concept for the public shared URL.
- **"content pack"** — the product concept for the shared entity/payload.

Always name things `ContentPack`, `parseContentPack`, `entities/content-pack/`. Never name an entity folder
`entities/shared-content/` or introduce a `SharedPack` type — it collides with the "shared" layer name and misleads
anyone reading imports.

## Dependency inversion (narrow scope on purpose)

Only apply dependency inversion at a genuine external I/O boundary. Today there are three: CloudKit (content-pack
lookups), Cloudflare Turnstile (bot-challenge verification), and Resend (transactional email) — the latter two back
the `/support` contact form. Don't add DI for i18n or static config; there's no real external dependency to invert
there.

Each boundary gets its own port interface next to its entity, e.g. `entities/content-pack/api/content-pack-repository.ts`:

```ts
export type ContentPackLookup =
    | {kind: 'found'; payload: unknown}
    | {kind: 'not-found'}
    | {kind: 'malformed'}
    | {kind: 'service-down'};

export interface ContentPackRepository {
    findByShortId(shortId: string): Promise<ContentPackLookup>;
}
```

`entities/support-request/api/turnstile-gateway.ts` and `entities/support-request/api/mail-gateway.ts` follow the same
pattern for the other two boundaries, each with a concrete adapter (`cloudflare-turnstile-gateway.ts`,
`resend-mail-gateway.ts`) and a fake under `entities/support-request/testing/`.

None of these adapters import `cloudflare:workers` directly — they read secrets and bindings through
`getRuntimeEnv()` from [src/shared/lib/runtime-env.ts](../../../src/shared/lib/runtime-env.ts), the single file
allowed to import it (see check 3 above). Depend on the port interface (or the matching fake in the entity's
`testing/` folder) in tests and calling code, never on the concrete adapter class directly.

There's no global DI container and no injection framework. In a per-request SSR environment (Cloudflare Workers), the
composition root is just the **default parameter** of the route's factory function
(`repository = createCloudKitRepository()`, or `turnstileGateway = createCloudflareTurnstileGateway()` /
`mailGateway = createResendMailGateway()` for the support form), invoked by the thin route wrapper.

## Other conventions worth knowing

- **i18n is deliberately custom**, not `astro:i18n`. The shared routes (`/r/[id]`, `/e/[id]`, `/s/[id]`) resolve
  language at runtime from the `ti_lang` cookie or the `Accept-Language` header, without a URL prefix — something
  Astro's native routing doesn't support. Don't migrate to `astro:i18n`, and don't add an unused `i18n` block to
  `astro.config.mjs`.
- **i18n parity**: `src/shared/i18n/en.json` and `es.json` must have identical key sets — `pnpm check:i18n` enforces
  this. Adding a translation key to one without the other breaks CI. No hardcoded UI strings in components.
- **Short-ID validation**: every `[id]` route param on a share route must be validated against
  `SHORT_ID_PATTERN` / `isShortId()` from [src/shared/lib/short-id.ts](../../../src/shared/lib/short-id.ts)
  (`^[A-Za-z0-9]{6}$`) _before_ any API/network call — don't hand an unvalidated param to the repository.
- **CloudKit access**: `CLOUDKIT_API_TOKEN` is server-only — never expose it to the client (in production it must be
  loaded as a Wrangler _secret_, not a plaintext var). Calls have a 4s timeout; on failure, degrade gracefully without
  leaking technical error details to the user. Never render an exercise's `notes` field — it's the user's personal note,
  not shareable content.
- **Support form secrets**: `TURNSTILE_SECRET_KEY` and `RESEND_API_KEY` are server-only secrets (Wrangler secrets in
  production, see `.env.example`); `PUBLIC_TURNSTILE_SITE_KEY` is the public counterpart the client widget needs.
  `handleSupportRequest` ([src/views/support/api/handle-support-request.ts](../../../src/views/support/api/handle-support-request.ts))
  never returns localized error text from the API — only machine-readable codes (`bad_request`, `captcha_failed`,
  `validation_error` + per-field codes, `mail_failed`) — so the client script can map them through the current
  locale's i18n dictionary instead of the server picking a language.
- **Shared-route indexing**: shared content pages use `<meta name="robots" content="noindex, nofollow">` and are omitted
  from `sitemap.xml`, but must stay _allowed_ in `robots.txt` so social platforms can still crawl them for Open Graph
  card previews.
- **Testing pyramid**: unit tests co-located as `*.test.ts` next to the code they test; component tests use the Astro
  Container API over Vitest; E2E via Playwright; accessibility via `@axe-core/playwright` (zero _serious_/ _critical_
  WCAG 2.1 AA violations allowed).
