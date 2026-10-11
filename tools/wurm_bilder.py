"""Wurm-Bilder aus einer Bildtafel (4 × 3 Figuren auf weißem Grund) ausschneiden.

Aufruf:  python3 tools/wurm_bilder.py <bild> <variante>
  variante = normal | blinzeln | aua | angst | jubel | fliegen
Ergebnis: apps/wuermer/wurm/01-soldat[-variante].webp … 12-polar[-variante].webp
Weißer Hintergrund wird durchsichtig. Braucht Pillow und numpy.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

NAMEN = ['soldat', 'rambo', 'hippie', 'nachtsicht', 'cowboy', 'sanitaeter',
         'wikinger', 'kapitaen', 'kommando', 'gasmaske', 'hai', 'polar']
ZIEL = Path(__file__).resolve().parent.parent / 'apps' / 'wuermer' / 'wurm'
GROESSE = 0.7                  # verkleinern (alle Varianten gleich, damit sie zusammenpassen)


def trennen(tinte, teile):
    """Teilt an den leersten Stellen zwischen den Figuren (nahe 1/teile, 2/teile …)."""
    n, punkte = len(tinte), [0]
    for k in range(1, teile):
        a, b = int(n * (k / teile - .1)), int(n * (k / teile + .1))
        punkte.append(a + int(np.argmin(tinte[a:b])))
    return list(zip(punkte, punkte[1:] + [n]))


def zellen(bild):
    a = np.asarray(bild).astype(int)
    farbig = a.min(axis=2) < 225
    for r0, r1 in trennen(farbig.sum(1), 3):
        for s0, s1 in trennen(farbig[r0:r1].sum(0), 4):
            yield s0, r0, s1, r1


def freistellen(t):
    """Weißen Hintergrund durchsichtig machen und Krümel der Nachbarfiguren entfernen."""
    R = 4                                                   # weißer Rand rundherum: so erreicht die Füllung alle Ecken
    w = Image.new('RGB', (t.width + 2 * R, t.height + 2 * R), (255, 255, 255))
    w.paste(t, (R, R))
    t = w.copy()
    MARKE = (1, 254, 3)
    ImageDraw.floodfill(w, (0, 0), MARKE, thresh=60)
    hg = (np.asarray(w) == MARKE).all(axis=2)
    hg = Image.fromarray((hg * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))   # weißen Saum weg
    deck = 255 - np.asarray(hg)
    # Nur behalten, was zur Figur in der Mitte gehört (Tropfen und Sterne nah dran zählen mit)
    voll = deck > 128
    ys, xs = np.nonzero(voll)
    i = np.argmin((ys - ys.mean()) ** 2 + (xs - xs.mean()) ** 2)
    nah = Image.fromarray((voll * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(31))
    ImageDraw.floodfill(nah, (int(xs[i]), int(ys[i])), 128)
    deck = np.where(np.asarray(nah) == 128, deck, 0).astype(np.uint8)
    t.putalpha(Image.fromarray(deck).filter(ImageFilter.GaussianBlur(.7)))
    return t.crop(t.getbbox())


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    bild = Image.open(sys.argv[1]).convert('RGB')
    variante = sys.argv[2]
    zusatz = '' if variante == 'normal' else '-' + variante
    ZIEL.mkdir(exist_ok=True)
    for i, (x0, y0, x1, y1) in enumerate(zellen(bild)):
        t = freistellen(bild.crop((x0, y0, x1, y1)))
        t = t.resize((round(t.width * GROESSE), round(t.height * GROESSE)), Image.LANCZOS)
        t.save(ZIEL / f'{i + 1:02d}-{NAMEN[i]}{zusatz}.webp', quality=90, method=6)
    print(f'12 Bilder „{variante}“ in {ZIEL}')


if __name__ == '__main__':
    main()
