---
name: design-system
description: Visual design tokens and UI component conventions for the fe-traceiron marketing site (a black/gold premium theme). Use this whenever creating or editing anything in src/shared/ui, src/widgets, or any Astro component/section — choosing colors, type sizes, spacing, radii, or writing component markup and props. Always consult this before hardcoding a color, font-size, or spacing value, since this project has a token system in src/shared/styles/tokens.css that every existing component uses instead.
---

# Design system for fe-traceiron

The site is a server-rendered Astro app with **zero client JavaScript by default** — build UI as plain Astro components
and CSS; don't reach for a client framework or `client:*` directive unless the task genuinely requires interactivity
that can't be done with HTML/CSS alone. The one deliberate exception is `/support` ([src/features/support-form](../../../src/features/support-form)):
Cloudflare Turnstile requires a real client-side challenge widget, so its form ships a plain `<script>` (no framework,
no `client:*`) that does fetch-based submission and state handling. Don't treat this as precedent for adding JS
elsewhere — it's scoped to that one page because the anti-bot requirement can't be met with HTML/CSS alone. Every
screen must pass WCAG 2.1 AA (zero _serious_/ _critical_ axe-core violations) — respect semantic HTML, focus states,
and contrast when using the tokens below.

All values below live in [src/shared/styles/tokens.css](../../../src/shared/styles/tokens.css). Never hardcode a color,
font-size, spacing, or radius value that already has a token — use the token so the site stays visually consistent and
themeable from one file.

## Brand philosophy

The design must read as **Luxury, Strength, and Exclusivity** — never as a generic SaaS template. Concretely, avoid:

- Any blue, indigo, violet, or cyan gradient.
- Background "blobs", gradient meshes, or aurora effects.
- Generic glassmorphism (colored translucent cards with `backdrop-filter: blur`).
- Isometric illustration, "Corporate Memphis" vector art, or generic stock photography — only real product
  screenshots/assets.
- Emoji used as UI icons.
- Exit-intent popups, sticky floating banners, or artificial countdowns.

The site is **strictly dark** (`body` background is `--ti-bg`, `#000`). There is no theme switcher, no light mode, and
no `@media (prefers-color-scheme: light)` support — don't add one.

The `TRACEIRON` wordmark is always uppercase (`text-transform: uppercase`) in Cinzel with wide letter-spacing. Never
deform, rotate, recolor, or drop-shadow it.

## Color (`--ti-*`)

A black/gold premium palette:

- Surfaces: `--ti-bg`, `--ti-elev-1`, `--ti-elev-2`, `--ti-surface` (increasing elevation, all near-black).
- Gold scale: `--ti-gold-deep` → `--ti-gold` → `--ti-gold-bright` → `--ti-gold-hi` → `--ti-gold-spec`, plus
  `--ti-gold-core` for a saturated reference gold.
- Text: `--ti-text` (primary), `--ti-text-muted`, `--ti-ghost` (lowest-emphasis).
- Borders: `--ti-border`, `--ti-border-strong`, `--ti-border-hair` (increasing opacity of the same gold border).
- Status: `--ti-success`, `--ti-error`.
- Gradients: `--ti-grad-metal` (multi-stop gold sheen, for headline/hero treatments), `--ti-grad-primary`
  (2-stop gold, for buttons/CTAs).

**How to apply gold**: it's an accent and edge color, never a full block/surface background — the total gold surface
visible on screen should stay under ~10% of the viewport. Reserve `--ti-grad-metal` specifically for the wordmark, the
primary CTA's fill, and 1px divider lines — don't reuse it as a generic decorative background. `--ti-gold-deep`
on text only satisfies WCAG contrast at `>= 24px`, or `>= 18.66px` bold — don't use it for small text.

## Typography

Two self-hosted variable font families ([public/fonts](../../../public/fonts), `latin` subset, `.woff2`) — don't add a
third:

- **Cinzel** (`font-family: 'Cinzel', serif`) — exclusively for the wordmark, `h1`/`h2`, standout metric/stat numbers,
  and pricing labels. Never use it for paragraphs, list items, form labels, or secondary buttons. Always compose it in
  small caps/uppercase (`text-transform: uppercase`) with positive letter-spacing.
- **Inter** (`font-family: 'Inter', sans-serif`) — everything else: paragraphs, leads, buttons, form fields, tables.

Fluid sizes via `clamp()` so type scales with viewport without breakpoints: `--fs-display`, `--fs-h1`, `--fs-h2`,
`--fs-h3`, `--fs-lead`, `--fs-body`, `--fs-small`, `--fs-caption` (largest to smallest). Pair with
`--tracking-display` / `--tracking-label` for letter-spacing and `--lh-display` / `--lh-heading` / `--lh-body` for
line-height — display/heading text is intentionally tight (`--lh-display: 0.95`), body text is loose (`--lh-body:
1.65`) for long-form readability.

Metric/statistic figures must always use `font-variant-numeric: tabular-nums` (or
`font-feature-settings: "tnum" 1`) so digits don't shift width as they change. Cap paragraph width at `max-width:
68ch`. Use `text-wrap: balance` on headings and `text-wrap: pretty` on paragraphs.

## Spacing, radii, layout

- Spacing scale: `--sp-2xs` (0.25rem) through `--sp-4xl` (9rem). Use these instead of arbitrary rem/px values for
  margin, padding, and gap.
- Radii: `--radius-control` (inputs/buttons), `--radius-card`, `--radius-panel` (large surfaces), `--radius-pill`
  (fully rounded).
- Layout: `--container-max` (1200px), `--gutter` (fluid side padding), `--section-gap` (vertical rhythm between page
  sections — widens automatically at `≥48rem` via a media query already defined in `tokens.css`, don't redefine it
  per-component).

**Elevation**: never fake depth with a diffuse `box-shadow`, and never use neon halos or diffuse gold glows. Build
elevation from surface luminance (`--ti-elev-1` → `--ti-elev-2` → `--ti-surface`, each step brighter) plus crisp 1px
borders (`--ti-border-hair`, `--ti-border`).

## Iconography

All icons render as **inline `<svg>`** in the HTML — never import a client-side icon library or load an icon font.

- **Utility icons** (the `Icon` component, Lucide-based): `stroke-width="1.25"` (not Lucide's default `2`),
  `stroke="currentColor"`, no fill, 24×24 viewBox.
- **Custom product icons** (`Pillar*` components): `viewBox="0 0 32 32"`, 32×32, `stroke-width="1.25"`,
  `stroke-linecap="square"`. Avoid generic fitness clichés (classic dumbbells, biceps, flames, rockets) — these
  represent specific product pillars, not generic "gym" iconography.
- **Don't unify `Icon` and `Pillar*`** into one component — different viewBox, different stroke caps, different semantic
  role (generic utility vs. product-specific), by design.

## Component conventions

Follow the shape of existing components in [src/shared/ui](../../../src/shared/ui) — `button/`, `icon/`, `wordmark/`,
`app-store-badge/` are the reference examples. Each component:

1. Lives in its own kebab-case folder with a local `index.ts` barrel (this is a _component-level_ barrel, which is
   fine — only full- _layer_ barrels are banned; see the `fsd-architecture` skill).
2. Declares a typed `Props` interface in the component's frontmatter, using string-union types for variants:

    ```ts
    export interface Props {
        variant?: 'primary' | 'secondary';
        class?: string;
        // ...
    }
    ```

3. Uses **BEM** class naming with a `ti-` namespace: `ti-block__element--modifier`. `block` is the component name,
   `element` (optional) is a sub-part of it, `modifier` (optional) is a variant or state. Example:
   `ti-card__title--highlighted` for the title element inside a `card` block with a `highlighted` modifier. When a
   component has no sub-parts to target, omit the element and use `ti-block--modifier` directly, e.g.
   `ti-btn--primary`. Merge a caller-supplied `class` prop via Astro's `class:list={[btnClass, className]}`.
4. Has a co-located `*.test.ts` next to the `.astro` file.

When building a new widget or landing section, compose these `shared/ui` primitives and the tokens above rather than
introducing new one-off colors, spacing, or button styles.

## Reference specs for key components

- **Primary button**: filled with `--ti-grad-metal`, black text (Inter 600, uppercase), `border-radius:
var(--radius-pill)`, min height 48px. `:hover` only shifts the gradient's `background-position` — never change color
  or scale. `:focus-visible` is `outline: 2px solid var(--ti-gold-hi); outline-offset: 3px`.
- **Secondary button**: transparent background, `1px solid var(--ti-border-strong)`, `--ti-gold-bright` text.
  `:hover` swaps the border to `--ti-gold` and adds a faint `rgb(212 175 55 / 6%)` fill.
- **App Store badge**: use the official localized SVG badge; its link must come from the `PUBLIC_APPSTORE_URL` env var,
  not a hardcoded URL.
- **Device mockups** (app screenshots in frames): strict `1179 / 2556` (19.5:9) aspect ratio, framed with `1px solid
var(--ti-border)` and `border-radius: 52px`. Never deform or apply 3D rotation to a mockup.

## Global vs. scoped CSS

- Design primitives meant to be reused across components — `.ti-container`, `.ti-section`, `.ti-card`, `.ti-btn`,
  `.ti-icon`, `.ti-pill`, and utility type classes like `.ti-display`/`.ti-lead` — are the project's public CSS
  vocabulary. Declare each one exactly once, either in `shared/styles/` or alongside its owning atom.
- Everything else belongs in an Astro component's scoped `<style>` and must never be referenced from another component.
  A `:global(.ti-icon)` selector inside a component is legitimate only to style an already-exposed primitive SVG, not as
  a general escape hatch.

## Performance & accessibility

- Serve images as **AVIF** with a WebP fallback; always set `width`/`height` or `aspect-ratio` to prevent layout shift.
- WCAG 2.1 AA: verified contrast for primary/secondary text, visible `:focus-visible` on every interactive element,
  minimum 44×44px touch targets.
