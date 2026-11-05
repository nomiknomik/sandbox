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
- `docs/` – Ablauf, Ideen, Mehrspieler-Optionen, Bild-Prompts für ChatGPT (`BILD-PROMPTS.md`).

## Design-Bilder kommen aus ChatGPT (gilt für das ganze Projekt)
- **Wichtige Bild-Elemente mit hohem Design-Anspruch** malt Claude **nicht** selbst
  (keine selbstgebauten Vektor-/Canvas-Logos): App-Icons, Logos/Schriftzüge,
  Titelbilder, Spielfiguren-Porträts, Startbildschirm-Kunst.
- Stattdessen schreibt **Claude den Prompt** (Vorlage + Stilregeln: `docs/BILD-PROMPTS.md`),
  der Erwachsene erzeugt das Bild mit ChatGPT und lädt es hoch, Claude baut es ein
  (zuschneiden, verkleinern, optimieren, in den Service-Worker-Cache).
- Nur wenn es die Ressourcen nicht verschlechtert: Bilder klein halten (Icon-PNG
  ≤ 60 KB bei 192 px, Bilder im Spiel als WebP, ≤ 150 KB pro Bild, ≤ 2 MB pro App),
  keine Bilder für Dinge, die 60× pro Sekunde neu gemalt werden müssen.
- Spielgrafik, die sich bewegt oder zerstört wird (Kacheln, Panzer, Effekte), bleibt Code.
- Datenschutz gilt auch hier: keine echten Personen/Gesichter, kein Foto des Kindes als Vorlage.
- Bei neuen Spielen von Anfang an: Icon-Prompt (+ ggf. Logo-Prompt) mitliefern.

### Regeln für ChatGPT-Prompts (gelernt bei Stadtbaron)
- **ChatGPT-Kontingent ist knapp:** möglichst viele Bilder in **einem** Prompt als
  Bilderbogen (Sprite-Sheet). Bewährt: 1536×1024, **8 Spalten × 4 Reihen = 32 Bilder**
  (oder 1024×1024, 4×4 = 16). Einen Prompt pro Nachricht, nur bei groben Fehlern nachbessern.
- Prompt immer auf **Englisch**, als kopierbarer Codeblock, mit:
  „**REAL transparent background (alpha channel, NOT a checkerboard pattern)**“,
  „exactly N icons in a perfect grid of C columns x R rows, each centered in its own
  equal cell with empty space around it“, „No grid lines, no frames, no text, no letters,
  no numbers“, gleicher Stil/Größe/Blickwinkel (3/4), „clear and simple so they read at 30 px“,
  „Own original designs, not from any existing board game“.
- Inhalt **Reihe für Reihe** aufzählen (Row 1: …), kurze englische Begriffe.
- Projekt-Stil: polished voxel / 3D pixel-art (Minecraft-like), toy-like, chunky,
  soft light from top left, subtle gloss, bright cheerful colors, kid-friendly.
- Keine echten Marken/Spielnamen im Prompt oder im Spiel (z. B. nicht „Monopoly“).
- Einbauen: Raster ausschneiden, Alpha säubern (Schleier < ~60–90 weg), auf Inhalt
  zuschneiden, 128–160 px **WebP** in `bilder/`, alle in den SW-Cache.
  Malt ChatGPT doch ein **Karomuster**: von außen per Flood-Fill nur hellgraue,
  *unruhige* Pixel entfernen; weiße Motive (Flugzeug, Zettel) und Löcher (Ring) einzeln prüfen.
- Im Code: Emoji → Bild über eine Tabelle (`BILDER` + `bild(emoji)`), Emoji bleibt Ersatz,
  im Fließtext (Verlauf, Meldungstext) bleiben Emojis.
- Nach dem Einbauen Screenshot prüfen (Playwright) und Ergebnis in `docs/BILD-PROMPTS.md` abhaken.

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
