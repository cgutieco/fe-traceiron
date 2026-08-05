#!/usr/bin/env python3
"""
TRACEIRON — Generador de métricas de fuente de respaldo.

Calcula los valores precisos de `size-adjust` / `ascent-override` /
`descent-override` / `line-gap-override` analizando las tablas internas
de la fuente web (.woff2 / .ttf) contra la fuente de respaldo del sistema.

Este script reproduce el algoritmo de fontaine / @capsizecss/unpack:

    xWidthAvg   = Σ (frecuencia_carácter × advanceWidth) / unitsPerEm
    sizeAdjust  = xWidthAvg(webfont) / xWidthAvg(fallback)
    ascent-override    = (hhea.ascent  / upem) / sizeAdjust
    descent-override   = (|hhea.descent| / upem) / sizeAdjust
    line-gap-override  = (hhea.lineGap / upem) / sizeAdjust

Uso:
    pip3 install fonttools brotli
    python3 scripts/font-fallback-metrics.py

Emite el bloque @font-face listo para pegar en src/styles/fonts.css.
"""

from fontTools.ttLib import TTFont

# Frecuencias de caracteres del inglés usadas por fontaine (suman ≈ 1.0).
# El espacio pesa tanto como para dominar la media: es el carácter más frecuente
# de cualquier texto corrido.
WEIGHTS = {
    "a": 0.0668, "b": 0.0122, "c": 0.0228, "d": 0.0348, "e": 0.1039,
    "f": 0.0182, "g": 0.0165, "h": 0.0499, "i": 0.0570, "j": 0.0010,
    "k": 0.0063, "l": 0.0329, "m": 0.0197, "n": 0.0552, "o": 0.0614,
    "p": 0.0158, "q": 0.0008, "r": 0.0490, "s": 0.0518, "t": 0.0741,
    "u": 0.0226, "v": 0.0079, "w": 0.0193, "x": 0.0015, "y": 0.0161,
    "z": 0.0006, " ": 0.1818,
}

def x_width_avg(path: str, uppercase: bool = False) -> tuple[float, dict]:
    """Anchura media ponderada, normalizada a em, más las métricas verticales.

    `uppercase=True` transforma el set de muestreo a versalitas. Cinzel se
    compone SIEMPRE en versalitas en el sitio, de modo que medir su anchura
    sobre minúsculas daría un size-adjust que no corresponde a nada que se
    llegue a renderizar.
    """
    font = TTFont(path, fontNumber=0)
    upem = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    glyph_order = set(font.getGlyphOrder())

    total = 0.0
    covered = 0.0
    for char, weight in WEIGHTS.items():
        sample = char.upper() if uppercase and char != " " else char
        glyph = cmap.get(ord(sample))
        if glyph is None or glyph not in glyph_order:
            continue
        total += hmtx[glyph][0] * weight
        covered += weight

    if covered == 0:
        raise SystemExit(f"Sin cobertura de glifos en {path}")

    # Renormaliza si algún glifo faltó, para no sesgar la media hacia abajo.
    avg = (total / covered) / upem

    hhea = font["hhea"]
    vertical = {
        "upem": upem,
        "ascent": hhea.ascent / upem,
        "descent": abs(hhea.descent) / upem,
        "line_gap": hhea.lineGap / upem,
    }
    font.close()
    return avg, vertical

def emit(name: str, web: str, fallback_path: str, fallback_local: str,
         uppercase: bool = False) -> str:
    web_avg, web_v = x_width_avg(web, uppercase)
    fb_avg, _ = x_width_avg(fallback_path, uppercase)

    size_adjust = web_avg / fb_avg

    ascent = web_v["ascent"] / size_adjust
    descent = web_v["descent"] / size_adjust
    line_gap = web_v["line_gap"] / size_adjust

    print(f"  · {name}: upem={web_v['upem']} xWidthAvg={web_avg:.5f} "
          f"fallback({fallback_local})={fb_avg:.5f}")

    return (
        f'@font-face {{\n'
        f'  font-family: "{name} Fallback";\n'
        f'  src: local("{fallback_local}");\n'
        f'  size-adjust: {size_adjust * 100:.2f}%;\n'
        f'  ascent-override: {ascent * 100:.2f}%;\n'
        f'  descent-override: {descent * 100:.2f}%;\n'
        f'  line-gap-override: {line_gap * 100:.2f}%;\n'
        f'}}\n'
    )

if __name__ == "__main__":
    print("Midiendo fuentes reales…")
    blocks = [
        emit(
            "Inter",
            "public/fonts/inter/variable/inter-latin-wght-normal.woff2",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "Arial",
        ),
        emit(
            "Cinzel",
            "public/fonts/cinzel/variable/cinzel-latin-wght-normal.woff2",
            "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
            "Times New Roman",
            uppercase=True,
        ),
    ]
    print("\n--- Pegar en src/styles/fonts.css ---\n")
    print("\n".join(blocks))
