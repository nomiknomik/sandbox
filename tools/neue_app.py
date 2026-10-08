"""Neue App aus apps/_vorlage anlegen.

Aufruf:  python3 tools/neue_app.py <ordnername> "<Titel>" [Icon-Text] [Farbe]
Beispiel: python3 tools/neue_app.py morskoj-boj "Морской бой" MB "#2E6FD8"
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VORLAGE = ROOT / 'apps' / '_vorlage'


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    name, titel = sys.argv[1], sys.argv[2]
    kurz = sys.argv[3] if len(sys.argv) > 3 else titel[:2]
    farbe = sys.argv[4] if len(sys.argv) > 4 else '#2E6FD8'
    if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', name):
        sys.exit('Ordnername bitte nur a-z, 0-9 und Bindestrich, z. B. morskoj-boj')
    ziel = ROOT / 'apps' / name
    if ziel.exists():
        sys.exit(f'{ziel} gibt es schon.')

    shutil.copytree(VORLAGE, ziel)
    for datei in ziel.iterdir():
        if datei.suffix in ('.html', '.js', '.webmanifest'):
            t = datei.read_text(encoding='utf-8')
            t = t.replace('__TITEL__', titel).replace('__NAME__', name).replace('__FARBE__', farbe)
            datei.write_text(t, encoding='utf-8')

    subprocess.run([sys.executable, str(ROOT / 'tools' / 'icon.py'), str(ziel), kurz, farbe], check=True)

    start = ROOT / 'index.html'
    eintrag = f'    <li><a href="apps/{name}/"><img src="apps/{name}/icon-192.png" alt="">{titel}</a></li>\n'
    t = start.read_text(encoding='utf-8')
    start.write_text(t.replace('<!-- APPS -->\n', '<!-- APPS -->\n' + eintrag), encoding='utf-8')

    print(f'Fertig: apps/{name}/  (auf der Startseite eingetragen)')


if __name__ == '__main__':
    main()
