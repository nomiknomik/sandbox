"""App-Icon erzeugen: farbiges Quadrat mit Verlauf + kurzem Text (1–2 Zeichen oder Emoji-frei).

Aufruf:  python3 tools/icon.py apps/<name> "MB" "#2E6FD8"
Braucht Pillow (pip install pillow).
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

S = 1024
FONTS = ['/System/Library/Fonts/Supplemental/Arial Bold.ttf',          # macOS
         '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',        # Linux
         'C:/Windows/Fonts/arialbd.ttf']                                # Windows


def hex2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def schrift(groesse):
    for f in FONTS:
        if Path(f).exists():
            return ImageFont.truetype(f, groesse)
    return ImageFont.load_default(size=groesse)


def icon(text, farbe):
    oben = hex2rgb(farbe)
    unten = tuple(int(c * 0.65) for c in oben)
    img = Image.new('RGB', (S, S))
    d = ImageDraw.Draw(img)
    for y in range(S):                                   # senkrechter Verlauf
        t = y / S
        d.line([(0, y), (S, y)], fill=tuple(int(oben[i] + (unten[i] - oben[i]) * t) for i in range(3)))
    f = schrift(int(S * (0.5 if len(text) <= 2 else 0.34)))
    d.text((S / 2, S / 2), text, font=f, fill=(255, 255, 255), anchor='mm')
    return img


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    ordner, text, farbe = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
    im = icon(text, farbe)
    for n in (512, 192):
        im.resize((n, n), Image.LANCZOS).save(ordner / f'icon-{n}.png', optimize=True)
    print(f'Icons in {ordner} erzeugt.')


if __name__ == '__main__':
    main()
