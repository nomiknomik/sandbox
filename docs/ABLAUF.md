# So bauen wir eine App

Der Weg ist das Ziel – jede Runde ist kurz (20–40 min) und endet mit etwas,
das man auf dem iPad **anfassen** kann.

## 1. Idee & Regeln (Papier!)
Spielidee mit `docs/spielidee-vorlage.md` ausfüllen: Wie gewinnt man? Was sieht
man auf dem Bildschirm? Am besten erst mit Stift auf Karopapier skizzieren.

## 2. Anlegen (1 Befehl)
```
python3 tools/neue_app.py <ordner> "<Titel>" <Icon-Text> "<Farbe>"
```
Dann zeigt die Startseite die neue App mit Icon an.

## 3. In kleinen Schritten bauen
Jeder Schritt = eine sichtbare Veränderung, z. B.
1. Ein Feld zeichnen → 2. Antippen färbt ein Kästchen → 3. Schiffe setzen → …
Das Kind entscheidet Farben, Texte, Töne, Regeln. Erwachsener/Claude erklärt
das *Warum* in einem Satz.

## 4. Ausprobieren
- Am Rechner: `python3 -m http.server 8000` → `http://localhost:8000`
- Auf iPad/iPhone im selben WLAN: `http://<IP-des-Rechners>:8000`
  (offline/Homescreen geht erst über https, also GitHub Pages)

## 5. Veröffentlichen
Commit mit Satz, *was* neu ist („Schiffe kann man jetzt drehen“), Push.
Nach ~1 min auf GitHub Pages; in Safari → Teilen → „Zum Home-Bildschirm“.
Version unten rechts zeigt, ob das Gerät schon die neue Version hat.

## Merksätze fürs Kind
- Computer machen genau, was man sagt – nicht, was man meint.
- Fehler sind normal; man findet sie, indem man eins nach dem anderen prüft.
- Kleine Schritte, oft ausprobieren.
