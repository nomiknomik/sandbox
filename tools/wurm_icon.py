"""App-Symbol für die Würmer: grinsender Wurmkopf mit Helm (selbst gezeichnet).

Aufruf:  python3 tools/wurm_icon.py apps/wuermer
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

S = 2048                      # groß zeichnen, dann verkleinern = schöne Kanten
HAUT, RAND = (244, 165, 154), (74, 30, 30)
HELM, HELM_D = (92, 122, 58), (52, 72, 30)


def k(v):                     # Zahlen von 1024er-Raster auf S umrechnen
    return int(v * S / 1024)


def ell(d, cx, cy, rx, ry, **kw):
    d.ellipse([k(cx - rx), k(cy - ry), k(cx + rx), k(cy + ry)], **kw)


def icon():
    img = Image.new('RGB', (S, S))
    d = ImageDraw.Draw(img)
    for y in range(S):                                         # Himmel mit Verlauf
        t = y / S
        d.line([(0, y), (S, y)], fill=(int(110 - 70 * t), int(200 - 80 * t), int(245 - 40 * t)))
    ell(d, 150, 900, 260, 140, fill=(80, 170, 70))           # grüne Hügel
    ell(d, 900, 950, 300, 160, fill=(70, 155, 60))
    # Hals/Körper
    d.rounded_rectangle([k(330), k(640), k(700), k(1100)], radius=k(150), fill=HAUT, outline=RAND, width=k(14))
    # Kopf
    ell(d, 512, 560, 300, 290, fill=HAUT, outline=RAND, width=k(14))
    ell(d, 760, 620, 45, 35, fill=(250, 130, 135))           # Bäckchen
    # Grinsen mit Zähnen und Goldzahn
    mund = Image.new('L', (S, S), 0)
    m = ImageDraw.Draw(mund)
    m.chord([k(320), k(570), k(740), k(830)], 0, 180, fill=255)
    zaehne = Image.new('RGB', (S, S), (107, 31, 31))
    z = ImageDraw.Draw(zaehne)
    z.rectangle([0, k(700), S, k(745)], fill=(255, 255, 255))
    for x in (380, 450, 520, 590, 660):
        z.line([k(x), k(700), k(x), k(745)], fill=(200, 190, 190), width=k(5))
    z.rectangle([k(522), k(703), k(588), k(743)], fill=(242, 194, 48))
    img.paste(zaehne, (0, 0), mund)
    d.chord([k(320), k(570), k(740), k(830)], 0, 180, outline=RAND, width=k(12))
    # Glupschaugen mit halb geschlossenen Lidern
    for cx in (410, 620):
        ell(d, cx, 455, 100, 120, fill=(255, 255, 255), outline=RAND, width=k(10))
        ell(d, cx + 25, 480, 34, 34, fill=(27, 27, 43))
        ell(d, cx + 35, 468, 10, 10, fill=(255, 255, 255))
        d.chord([k(cx - 104), k(331), k(cx + 104), k(579)], 180, 360, fill=HAUT)
        d.line([k(cx - 100), k(455), k(cx + 100), k(455)], fill=RAND, width=k(10))
    # Helm
    d.chord([k(170), k(90), k(860), k(620)], 180, 360, fill=HELM, outline=RAND, width=k(14))
    ell(d, 515, 355, 380, 50, fill=HELM_D, outline=RAND, width=k(12))
    ell(d, 360, 210, 80, 40, fill=(140, 170, 100))           # Glanz
    ell(d, 630, 250, 50, 50, fill=(255, 255, 255))           # Abzeichen
    ell(d, 630, 250, 28, 28, fill=(220, 60, 60))
    return img


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    ordner = Path(sys.argv[1])
    im = icon()
    for n in (512, 192):
        im.resize((n, n), Image.LANCZOS).save(ordner / f'icon-{n}.png', optimize=True)
    print(f'Icons in {ordner} erzeugt.')


if __name__ == '__main__':
    main()
