<div align="center">

# TraceIron — Marketing Site

**Strength training for iPhone, measured in iron.**
Sitio web oficial de [TraceIron](https://traceiron.com): landing page, páginas legales y rutas de contenido compartido
de la app iOS.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.12.0-339933?logo=node.js&logoColor=white)](.nvmrc)

![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?logo=cloudflare&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-1.62-2EAD33?logo=playwright&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-10-4B32C3?logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-3-F7B93E?logo=prettier&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white)

</div>

---

## Descripción

`fe-traceiron` es el frontend público de **TraceIron**, una aplicación de entrenamiento de fuerza para iPhone, Apple
Watch y Dynamic Island. El repositorio contiene la landing comercial, las páginas legales (privacidad y términos) y las
rutas de contenido compartido (rutinas y ejercicios exportados desde la app), renderizadas en servidor sobre Cloudflare
Workers.

El sitio está construido íntegramente con **Astro** en modo `server`, sin JavaScript de cliente por defecto, y sigue una
arquitectura **Feature-Sliced Design (FSD)**.

## Características principales

- **Renderizado en servidor (SSR)** sobre el runtime de Cloudflare Workers, con cero JavaScript por defecto.
- **Internacionalización** con paridad de claves verificada por script: inglés (`/`) y español (`/es/`).
- **Contenido compartido**: rutas públicas de solo lectura para rutinas y ejercicios (`/r/[id]`, `/e/[id]`,
  `/s/[id]`), respaldadas por CloudKit a través de un puerto/adaptador con inversión de dependencias.
- **Accesibilidad WCAG 2.1 AA** verificada automáticamente con `@axe-core/playwright`.
- **Presupuesto de rendimiento y conformidad de build** validados en CI mediante scripts propios.
- **Arquitectura verificada**: un script de CI comprueba el cumplimiento de las reglas de capas FSD, aislamiento de
  módulos de Cloudflare y ausencia de barrels de capa completa.

## Stack tecnológico

| Categoría          | Tecnología                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Framework          | [Astro](https://astro.build) (modo `server`)                                              |
| Lenguaje           | [TypeScript](https://www.typescriptlang.org/)                                             |
| Hosting / Runtime  | [Cloudflare Workers](https://workers.cloudflare.com/) vía `@astrojs/cloudflare`           |
| Backend de datos   | [Apple CloudKit](https://developer.apple.com/icloud/cloudkit/) (contenido compartido)     |
| Testing unitario   | [Vitest](https://vitest.dev/)                                                             |
| Testing E2E / a11y | [Playwright](https://playwright.dev/) + [axe-core](https://github.com/dequelabs/axe-core) |
| Linting            | [ESLint](https://eslint.org/) + [Stylelint](https://stylelint.io/)                        |
| Formato de código  | [Prettier](https://prettier.io/)                                                          |
| Gestor de paquetes | [pnpm](https://pnpm.io/)                                                                  |
| Git hooks          | [Husky](https://typicode.github.io/husky/) + lint-staged                                  |

## Requisitos previos

- Node.js `>= 22.12.0` (ver [.nvmrc](.nvmrc))
- pnpm `11.9.0`
- Una cuenta de Cloudflare con Wrangler configurado (solo necesario para desplegar o previsualizar sobre el runtime de
  Workers)

## Puesta en marcha

Clona el repositorio e instala las dependencias:

```bash
pnpm install
```

Copia las variables de entorno de ejemplo y complétalas según corresponda:

```bash
cp .env.example .env
```

Consulta [.env.example](.env.example) para el detalle de cada variable. En producción, `CLOUDKIT_API_TOKEN` debe
cargarse siempre como _secret_ de Wrangler, nunca como variable de texto plano:

```bash
wrangler secret put CLOUDKIT_API_TOKEN
```

Inicia el servidor de desarrollo:

```bash
pnpm dev
```

## Scripts disponibles

| Script                           | Descripción                                                      |
| -------------------------------- | ---------------------------------------------------------------- |
| `pnpm dev`                       | Arranca el servidor de desarrollo de Astro                       |
| `pnpm build`                     | Genera el build de producción                                    |
| `pnpm preview`                   | Sirve el build sobre el runtime de Cloudflare Workers (Wrangler) |
| `pnpm deploy`                    | Compila y despliega en Cloudflare Workers                        |
| `pnpm test`                      | Ejecuta la suite de tests unitarios y de componentes (Vitest)    |
| `pnpm test:e2e`                  | Ejecuta la suite E2E y de accesibilidad (Playwright + axe-core)  |
| `pnpm check`                     | Ejecuta `astro check` y valida la paridad de claves i18n         |
| `pnpm check:i18n`                | Valida la paridad de claves entre `en.json` y `es.json`          |
| `pnpm check:budget`              | Verifica el presupuesto de rendimiento del build                 |
| `pnpm check:conformance`         | Verifica la conformidad de la salida del build                   |
| `pnpm check:all`                 | Ejecuta todas las verificaciones anteriores en secuencia         |
| `pnpm lint` / `lint:fix`         | Analiza y corrige JavaScript/TypeScript/Astro con ESLint         |
| `pnpm lint:css` / `lint:css:fix` | Analiza y corrige estilos con Stylelint                          |
| `pnpm format` / `format:check`   | Aplica o verifica el formato de código con Prettier              |

## Arquitectura del proyecto

El código de aplicación vive en `src/` y sigue capas FSD de mayor a menor especificidad:

```
src/
├── app/        # Bootstrap global: layouts base, middleware, SEO de sitio
├── views/      # Composiciones de ruta completas (equivalente a "pages")
├── widgets/    # Bloques compuestos: header, footer, secciones del landing
├── features/   # Interacción de usuario: cambio de idioma, apertura en la app
├── entities/   # Objetos de negocio: content-pack (modelo, repositorio, API)
├── shared/     # Genérico y agnóstico de negocio: tokens, i18n, UI base, config
└── pages/      # Rutas reservadas por Astro; wrappers ultra-finos hacia views/
```

Las reglas de importación entre capas, el aislamiento del acceso a `cloudflare:workers` y la prohibición de carpetas
legacy se verifican automáticamente mediante [scripts/check-architecture.mjs](scripts/check-architecture.mjs).

## Testing y calidad

El proyecto sigue una pirámide de testing de cuatro niveles, todos ellos ejecutados en CI:

1. **Unitarios** (`*.test.ts`), co-localizados junto al código que prueban.
2. **Componentes**, usando la Astro Container API sobre Vitest.
3. **End-to-end**, con Playwright sobre el build de producción.
4. **Accesibilidad**, con `@axe-core/playwright`, exigiendo cero violaciones _serious_ o _critical_ de WCAG 2.1 AA.

El pipeline de integración continua (ver [.github/workflows/ci.yml](.github/workflows/ci.yml)) ejecuta, en orden:
lint y formato, verificación de arquitectura, tests unitarios, build, presupuesto de rendimiento, conformidad de salida
y la suite E2E completa.

## Despliegue

El sitio se despliega en Cloudflare Workers mediante Wrangler:

```bash
pnpm deploy
```

La configuración del Worker se define en [wrangler.jsonc](wrangler.jsonc).

## Licencia

Distribuido bajo la licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.
