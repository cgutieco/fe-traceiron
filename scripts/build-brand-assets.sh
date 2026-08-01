#!/usr/bin/env bash

set -euo pipefail

SRC="src/assets/traceiron-logo.png"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

[ -f "$SRC" ] || { echo "No se encuentra $SRC" >&2; exit 1; }

mkdir -p public/og

sips -c 1075 2048 "$SRC" --out "$TMP/crop.png" >/dev/null

sips -s format jpeg -s formatOptions 82 "$TMP/crop.png" --out "$TMP/og.jpg" >/dev/null
sips -z 630 1200 "$TMP/og.jpg" --out public/og/traceiron-og.jpg >/dev/null

sips -z 512 512 "$SRC" --out "$TMP/logo.png" >/dev/null
sips -s format jpeg -s formatOptions 85 "$TMP/logo.png" --out public/logo.jpg >/dev/null

sips -z 180 180 "$SRC" --out public/apple-touch-icon.png >/dev/null
sips -z 32 32 "$SRC" --out public/favicon-32.png >/dev/null

OG="public/og/traceiron-og.jpg"
W=$(sips -g pixelWidth "$OG" | tail -1 | tr -dc 0-9)
H=$(sips -g pixelHeight "$OG" | tail -1 | tr -dc 0-9)
S=$(wc -c < "$OG" | tr -d ' ')

printf 'OG: %s×%s, %s bytes\n' "$W" "$H" "$S"

if [ "$W" != "1200" ] || [ "$H" != "630" ]; then
  echo "✗ La imagen OG debe medir exactamente 1200 × 630." >&2
  exit 1
fi

if [ "$S" -ge 300000 ]; then
  echo "✗ La imagen OG supera los 300 KB." >&2
  exit 1
fi

echo "✓ Activos de marca regenerados y dentro de presupuesto."

