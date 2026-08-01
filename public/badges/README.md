# Badges oficiales de App Store — activo pendiente

Para cumplir las guías de identidad de Apple:

> **DEBE** usarse el **badge oficial en SVG** descargado de Apple Marketing Resources, en su versión
> localizada (`es` y `en`). **NO DEBE** recrearse, recolorearse, reescribirse el texto ni alterarse
> sus proporciones.

Por eso este directorio **no** contiene un SVG dibujado manualmente. Hay que descargar los dos archivos oficiales de
Apple y colocarlos aquí con estos nombres exactos, que son los que espera `src/components/AppStoreBadge.astro`:

| Archivo requerido                | Idioma del badge                       |
| -------------------------------- | -------------------------------------- |
| `public/badges/app-store-en.svg` | Inglés — "Download on the App Store"   |
| `public/badges/app-store-es.svg` | Español — "Consíguelo en el App Store" |

## De dónde se descargan

Apple Marketing Resources → _App Store Badges_:
<https://developer.apple.com/app-store/marketing/guidelines/#section-badges>

Elegir la variante **negra** (`Black`), que es la que corresponde a un fondo `#000000`, y descargar el SVG en cada
idioma.

## Restricciones que ya cubre el componente

- Espacio libre alrededor equivalente a ¼ de la altura del badge, y altura mínima de 40px. El componente lo renderiza a
  **48px** de alto con **12px** de resguardo.
- El destino de navegación se lee dinámicamente de `PUBLIC_APPSTORE_URL`; no está codificado en el componente.

## Comportamiento mientras falten los archivos

`AppStoreBadge.astro` comprueba `PUBLIC_APPSTORE_URL`. Si está vacía —el caso normal mientras la app no esté publicada—
**no** renderiza ninguna imagen: muestra un aviso sobrio de "próximamente" con tratamiento de botón secundario. No se
genera un enlace roto ni un badge falso.

En cuanto se defina `PUBLIC_APPSTORE_URL`, estos dos SVG deben existir o las imágenes darán 404.
