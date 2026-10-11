"""App-Symbol für die Würmer: grinsender Wurmkopf mit Helm (selbst gezeichnet).

Mit Licht und Schatten (Verläufe, weiche Schatten, Glanzpunkte), damit es
mehr nach echtem Spiel aussieht.

Aufruf:  python3 tools/wurm_icon.py apps/wuermer
Braucht Pillow und numpy.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

S = 2048                       # groß zeichnen, dann verkleinern = schöne Kanten
Y, X = np.mgrid[0:S, 0:S].astype(np.float32)


def k(v):                      # Zahlen von 1024er-Raster auf S umrechnen
    return v * S / 1024


def box(cx, cy, rx, ry):
    return [k(cx - rx), k(cy - ry), k(cx + rx), k(cy + ry)]


# ---------- Bausteine ----------
def maske(form):
    """Leere Maske, in die 'form(draw)' weiß zeichnet."""
    m = Image.new('L', (S, S), 0)
    form(ImageDraw.Draw(m))
    return m


def rund(cx, cy, rx, ry):
    return lambda d: d.ellipse(box(cx, cy, rx, ry), fill=255)


def radial(cx, cy, r, innen, aussen, kurve=1.0):
    """Kreisförmiger Verlauf von 'innen' (Mitte) nach 'aussen'."""
    t = np.clip(np.hypot(X - k(cx), Y - k(cy)) / k(r), 0, 1) ** kurve
    a, b = np.array(innen, np.float32), np.array(aussen, np.float32)
    return Image.fromarray((a + (b - a) * t[..., None]).astype(np.uint8))


def linear(y0, y1, oben, unten):
    t = np.clip((Y - k(y0)) / (k(y1) - k(y0)), 0, 1)
    a, b = np.array(oben, np.float32), np.array(unten, np.float32)
    return Image.fromarray((a + (b - a) * t[..., None]).astype(np.uint8))


def malen(bild, m, farbe_oder_bild, deckkraft=1.0):
    quelle = farbe_oder_bild if isinstance(farbe_oder_bild, Image.Image) else Image.new('RGB', (S, S), farbe_oder_bild)
    if deckkraft < 1:
        m = m.point(lambda v: int(v * deckkraft))
    bild.paste(quelle, (0, 0), m)


def weich(m, radius):
    return m.filter(ImageFilter.GaussianBlur(k(radius)))


def nur_in(m, grenze):
    return ImageChops.multiply(m, grenze)


def rand(bild, form, farbe, breite):
    form(ImageDraw.Draw(bild), farbe, k(breite))


# ---------- Farben ----------
HAUT_HELL, HAUT, HAUT_DUNKEL = (255, 205, 190), (243, 160, 145), (196, 98, 92)
LINIE = (96, 38, 34)
HELM_HELL, HELM, HELM_DUNKEL = (150, 176, 96), (92, 120, 52), (40, 56, 22)


def icon():
    img = linear(0, 1024, (120, 205, 250), (35, 110, 200))
    malen(img, weich(maske(rund(860, 150, 150, 150)), 120), (255, 245, 200), .55)          # Sonnenschein
    for cx, cy, rx, ry in ((140, 120, 120, 45), (230, 95, 90, 50), (900, 300, 110, 35)):    # Wolken
        malen(img, weich(maske(rund(cx, cy, rx, ry)), 12), (255, 255, 255), .85)
    # Hügel mit Licht von oben
    for cx, cy, rx, ry in ((120, 980, 330, 190), (930, 1010, 380, 210)):
        m = maske(rund(cx, cy, rx, ry))
        malen(img, m, linear(cy - ry, cy + ry * .4, (120, 200, 80), (40, 110, 40)))

    # ---- Körper (Hals) ----
    hals = maske(lambda d: d.rounded_rectangle([k(330), k(620), k(700), k(1150)], radius=k(170), fill=255))
    malen(img, weich(hals, 18), (0, 0, 0), .35)                                              # Schlagschatten
    malen(img, hals, radial(430, 760, 420, HAUT_HELL, HAUT_DUNKEL, 1.3))
    for y in (900, 990):                                                                     # Ringe
        ring = maske(lambda d, y=y: d.arc([k(330), k(y - 60), k(700), k(y + 40)], 20, 160, fill=255, width=int(k(12))))
        malen(img, nur_in(weich(ring, 5), hals), HAUT_DUNKEL, .7)
    kopf_box = box(512, 540, 305, 295)
    kopf = maske(lambda d: d.ellipse(kopf_box, fill=255))
    malen(img, nur_in(weich(maske(rund(512, 800, 260, 110)), 30), hals), (120, 40, 40), .55)  # Schatten unter dem Kopf

    # ---- Kopf ----
    malen(img, weich(kopf, 14), (0, 0, 0), .25)
    malen(img, kopf, radial(400, 430, 470, HAUT_HELL, HAUT_DUNKEL, 1.4))
    malen(img, nur_in(weich(maske(rund(750, 630, 55, 38)), 22), kopf), (255, 110, 120), .55)               # Bäckchen
    malen(img, nur_in(weich(maske(rund(300, 640, 40, 28)), 22), kopf), (255, 110, 120), .35)
    rand(img, lambda d, f, b: d.ellipse(kopf_box, outline=f, width=int(b)), LINIE, 7)

    # ---- Mund: Grinsen mit Zähnen ----
    mb = [k(310), k(560), k(745), k(840)]
    mund = maske(lambda d: d.chord(mb, 0, 180, fill=255))
    malen(img, mund, linear(700, 840, (90, 15, 20), (150, 40, 45)))
    malen(img, nur_in(maske(rund(560, 830, 150, 70)), mund), radial(560, 800, 150, (235, 110, 120), (170, 55, 70)))  # Zunge
    zahn_y0, zahn_y1 = 700, 752
    for i, x in enumerate(range(335, 735, 66)):
        gold = i == 3
        z = maske(lambda d, x=x: d.rounded_rectangle([k(x), k(zahn_y0 - 10), k(x + 62), k(zahn_y1)], radius=k(12), fill=255))
        z = nur_in(z, mund)
        farbe = linear(zahn_y0, zahn_y1, (255, 230, 120), (190, 130, 20)) if gold else linear(zahn_y0, zahn_y1, (255, 255, 255), (205, 200, 200))
        malen(img, z, farbe)
        if gold:
            malen(img, nur_in(weich(maske(rund(x + 20, 715, 10, 14)), 3), z), (255, 255, 230), .9)
    malen(img, nur_in(weich(maske(lambda d: d.rectangle([k(300), k(690), k(760), k(712)], fill=255)), 8), mund), (60, 0, 0), .45)  # Schatten unter der Oberlippe
    rand(img, lambda d, f, b: d.chord(mb, 0, 180, outline=f, width=int(b)), LINIE, 7)

    # ---- Glupschaugen ----
    for cx in (405, 625):
        auge = maske(rund(cx, 450, 102, 122))
        malen(img, weich(auge, 10), (60, 20, 20), .35)
        malen(img, auge, radial(cx - 20, 440, 125, (255, 255, 255), (200, 195, 205), 1.6))
        iris = nur_in(maske(rund(cx + 28, 488, 46, 46)), auge)
        malen(img, iris, radial(cx + 28, 500, 46, (150, 100, 50), (60, 35, 15)))
        malen(img, nur_in(maske(rund(cx + 28, 488, 22, 22)), auge), (15, 10, 10))
        malen(img, weich(maske(rund(cx + 42, 470, 11, 11)), 1), (255, 255, 255))
        malen(img, weich(maske(rund(cx + 15, 510, 5, 5)), 1), (255, 255, 255), .8)
        # Lid (halb geschlossen) mit weichem Schatten auf dem Auge
        lid = maske(lambda d, cx=cx: d.chord([k(cx - 106), k(324), k(cx + 106), k(576)], 180, 360, fill=255))
        malen(img, nur_in(weich(maske(lambda d, cx=cx: d.rectangle([k(cx - 110), k(440), k(cx + 110), k(470)], fill=255)), 10), auge), (90, 40, 40), .5)
        malen(img, lid, radial(cx - 30, 360, 180, HAUT_HELL, HAUT_DUNKEL, 1.2))
        rand(img, lambda d, f, b, cx=cx: d.ellipse(box(cx, 450, 102, 122), outline=f, width=int(b)), LINIE, 6)
        rand(img, lambda d, f, b, cx=cx: d.line([k(cx - 102), k(450), k(cx + 102), k(450)], fill=f, width=int(b)), LINIE, 8)

    # ---- Helm ----
    malen(img, nur_in(weich(maske(rund(512, 375, 360, 70)), 26), kopf), (40, 20, 10), .6)   # Schatten vom Helm aufs Gesicht
    dom_box = [k(165), k(80), k(865), k(640)]
    dom = maske(lambda d: d.chord(dom_box, 180, 360, fill=255))
    malen(img, weich(dom, 16), (0, 0, 0), .3)
    malen(img, dom, radial(380, 160, 520, HELM_HELL, HELM_DUNKEL, 1.15))
    for x0, y0, x1, y1 in ((560, 150, 610, 185), (700, 230, 735, 280), (300, 270, 340, 255)):   # Kratzer
        malen(img, nur_in(maske(lambda d, a=(x0, y0, x1, y1): d.line([k(a[0]), k(a[1]), k(a[2]), k(a[3])], fill=255, width=int(k(5)))), dom), (190, 205, 150), .6)
    malen(img, nur_in(weich(maske(rund(360, 170, 120, 55)), 25), dom), (255, 255, 230), .55)  # Glanz
    malen(img, nur_in(weich(maske(rund(330, 150, 45, 18)), 6), dom), (255, 255, 255), .7)
    # Abzeichen (Kreis)
    malen(img, maske(rund(640, 250, 54, 54)), radial(630, 240, 60, (255, 255, 255), (205, 205, 200)))
    malen(img, maske(rund(640, 250, 34, 34)), radial(630, 240, 36, (240, 80, 80), (160, 25, 30)))
    malen(img, maske(rund(640, 250, 12, 12)), radial(636, 246, 14, (90, 140, 240), (30, 60, 150)))
    rand(img, lambda d, f, b: d.chord(dom_box, 180, 360, outline=f, width=int(b)), (30, 40, 15), 7)
    # Rand vom Helm
    krempe = box(515, 358, 385, 52)
    km = maske(lambda d: d.ellipse(krempe, fill=255))
    malen(img, km, linear(306, 410, (110, 140, 65), (35, 50, 20)))
    malen(img, nur_in(weich(maske(rund(420, 330, 200, 12)), 6), km), (210, 230, 170), .5)
    rand(img, lambda d, f, b: d.ellipse(krempe, outline=f, width=int(b)), (30, 40, 15), 7)
    # Kinnriemen
    riemen = maske(lambda d: d.line([(k(245), k(400)), (k(262), k(560)), (k(335), k(690))], fill=255, width=int(k(20)), joint='curve'))
    malen(img, weich(riemen, 6), (0, 0, 0), .3)
    malen(img, riemen, (110, 75, 40))
    malen(img, maske(lambda d: d.line([(k(242), k(402)), (k(258), k(556))], fill=255, width=int(k(5)))), (170, 125, 80))

    # leichte Vignette
    v = Image.fromarray((np.clip((np.hypot(X - S / 2, Y - S / 2) / (S * .72)) ** 3, 0, 1) * 160).astype(np.uint8))
    malen(img, v, (10, 20, 50))
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
