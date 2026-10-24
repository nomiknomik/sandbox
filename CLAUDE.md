# Arbeitsnotizen

Öffentliches Repo (nur wegen GitHub Pages). Hier entstehen kleine Spiele und
Apps zusammen mit einem Kind – **der Weg ist das Ziel**: erklären, ausprobieren,
das Kind entscheiden lassen. Nicht vorauseilend fertig bauen.

## Datenschutz (immer)
- **Keine Namen, Fotos, Stimmen, Orte, Schule, Alter** des Kindes oder anderer
  Personen – weder in Code, Texten, Commits, Dateinamen noch Icons.
  Im Code neutral: „Spieler 1/2“, „Kapitän“, „Gerät A/B“.
- Keine Tokens/Passwörter committen. Zugangsdaten nur gerätelokal (localStorage).
- Spielstände, die zwischen Geräten laufen, nur in einem **privaten** Repo und
  verschlüsselt (Muster: Zeitabrechnung, AES-GCM).
- Keine externen Skripte, Fonts, CDNs, Analytics oder Werbung. Alles liegt im Repo.
- `<meta name="robots" content="noindex, nofollow">` auf jeder Seite.

## Aufbau
- `index.html` – **Spieleportal** (eigene Home-Bildschirm-App „Spiele“, `manifest.webmanifest`,
  `sw.js`, `icon-*.png` im Wurzelordner) mit Liste der Apps (Marker `<!-- APPS -->`).
  Kurztext/Farbe pro Spiel im `INFO`-Objekt. Bei Änderung `PORTAL_VERSION` + `CACHE` hochzählen.
  Jedes Spiel hat einen Knopf **🕹 Alle Spiele** (`../../`) zurück ins Portal.
- `apps/<name>/` – je App ein eigenständiger PWA-Ordner (index.html, sw.js,
  manifest.webmanifest, icon-*.png). Ordnernamen: Kleinbuchstaben, Bindestrich,
  lateinisch (z. B. `morskoj-boj`).
- `apps/_vorlage/` – Startpunkt für neue Apps, nicht direkt verändern.
- `tools/neue_app.py` – legt eine App aus der Vorlage an (inkl. Icon, Eintrag
  auf der Startseite). `tools/icon.py` – Icon neu erzeugen (Pillow).
- `docs/` – Ablauf, Ideen, Mehrspieler-Optionen.

## Arbeitsweise
- Pro App: bei jeder Änderung `APP_VERSION` in `index.html` **und** `CACHE` in
  `sw.js` hochzählen (sonst sieht das iPad die alte Version).
- Jede App hat unten rechts die Version; **Antippen = nach Update suchen**
  (lädt frisch vom Server, umgeht Cache). Steckt in `apps/_vorlage` – bei
  bestehenden Apps beibehalten.
- Service Worker: alle Apps teilen sich eine Adresse → beim Aufräumen **nur eigene**
  Caches löschen (`k.startsWith(CACHE.replace(/\d+$/, ''))`), nie fremde.
- Eine Datei pro App (`index.html` mit CSS+JS), solange es übersichtlich bleibt.
- Kindgerechte Kommentare im Code sind erwünscht (kurz, deutsch).
- Lokal testen: `python3 -m http.server 8000` im Repo-Wurzelordner.
- **Veröffentlichen (dauerhaft erlaubt):** Nach jedem Commit auch auf den
  Standard-Branch `claude/clever-fermi-123ssk` pushen (GitHub Pages, ein `main`
  gibt es nicht) – nur als Fast-Forward, nie mit Force:
  `git push origin HEAD:claude/clever-fermi-123ssk`.
- Playwright: Chromium unter `/opt/pw-browsers`, `serviceWorkers:'block'`.
