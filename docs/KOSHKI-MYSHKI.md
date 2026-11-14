# Кошки-мышки – Spielkonzept (gemeinsam beschlossen)

3D-Spiel: Man ist eine Katze, rennt durch ein Haus, wirft Sachen um und ärgert die Bewohner.
Läuft im Browser (iPad + Computer), später zu zweit über das Netz.

## Regeln (beschlossen)
- **Ziel:** freies Herumtoben + Aufgabenliste („Разбей 3 вазы“, „Достань рыбку“ …).
  Belohnung für Aufgaben: neue Sachen freischalten (z. B. Katzen-Aufzug).
- **Kamera:** Augen der Katze (1. Person), Knopf 👁 wechselt auf „von hinten“.
- **Katze kann:** rennen, springen, schubsen (Pfote), kratzen, miauen/schnurren, im Maul tragen.
- **Ärger:** jede Person hat eine **Wut-Leiste**. Kleinigkeit → schimpft, Vase kaputt/gekratzt
  → Verfolgung. Versteckt sich die Katze (unter Sofa, Katzenklappe), beruhigt sie sich.
- **Treffer:** Zeichentrick-Stil („БОНГ!“, Sternchen), kein Blut. **5 Herzen**,
  Napf/Schlafen auf dem Sofa = +1. Game over → Katze wacht in der Geheimkammer auf,
  erledigte Aufgaben bleiben.
- **Maus:** wird manchmal gefangen (Bonus), entwischt dann und kommt wieder. Kein „Fressen“.
- **Aquarium:** Mini-Spiel mit Pfote im richtigen Moment. Daneben → Katze fällt ins Wasser
  (nass, 10 s langsamer). Aquarium umgeworfen → großer Ärger, alle kommen.
- **Geheimkammer** (Dachboden): Versteck + Startpunkt + Trophäen-Lager.

## Figuren (eine nach der anderen)
1. Бабуля mit Bratpfanne (langsam, aber hartnäckig)
2. Дедушка mit Zeitung/Hausschuh (schnell, wird schnell müde)
3. Собака (bellt, weckt die anderen)
4. Робот-пылесос (fährt seine Runde, Katze erschrickt)
5. Ребёнок – **Freund** der Katze (füttert, lenkt die Großen ab)
+ Maus, Fische im Aquarium

## Haus
4 Ebenen: Keller, 1. Etage, 2. Etage, Dachboden mit Geheimkammer.
Wege: Treppe, Katzentreppe an der Wand, Katzenklappen in Wänden, später Aufzug.
Tag, Sonne durch die Fenster. Plan zum Anschauen: `apps/koshki-myshki/plan.html`.

**Skalierbar:** Das Haus ist *Daten* (`level/haus.json`), kein Code. Draußen, weitere
Häuser, Pool und ein Editor („selbst Räume bauen“) werden später einfach weitere Dateien
bzw. ein Werkzeug, das diese Datei schreibt.

## Technik
- JavaScript, **Three.js** (3D) + **Rapier** (Physik), beide im Repo unter `vendor/`
  (mit esbuild gebündelt und verkleinert, keine CDNs).
- Ausnahme von „eine Datei pro App“: 3D-Spiel ist zu groß, darum Module in `js/`:
  `katalog.js` (Pass jedes Gegenstands), `modelle.js` (Aussehen), `haus.js` (baut das Haus
  aus den Daten), `katze.js`, `steuerung.js`, `ton.js` (Klänge per Synthesizer), `main.js`.
- Möbel sind vorerst aus Grundformen gebaut. Später austauschbar gegen CC0-Modelle
  (Kenney, Quaternius, Poly Pizza) – dafür müssen diese Seiten in der Umgebung freigegeben
  oder die Dateien hochgeladen werden.
- Qualität: ✨ Красиво / Средне / ⚡ Быстро (Schatten, Auflösung).
- Zu zweit: später zwei Geräte übers Netz (wie Морской бой/Танчики: WebRTC im WLAN).

## Stufen
1. ✅ v0.1 – Haus (4 Ebenen) + Laufen/Springen + Vasen zerbrechen + Licht/Schatten
2. ✅ v0.2 – Бабуля: Runde durchs Haus, Wut-Leiste (Balken über dem Kopf), Jagd über alle
   Treppen, Pfanne = −❤️ + Sterne, Game over → Geheimkammer; Napf und Schlafen (Sofa,
   Bett, Kissen) = +❤️. Wegfindung: Raster 25 cm + A* (`js/wege.js`), Katzenklappen sind
   für Menschen automatisch zu.
3. ⏳ Maus, Aquarium-Minispiel, Aufgabenliste, im Maul tragen
4. ⏳ weitere Figuren, Aufzug, Sounds aus CC0, echte 3D-Modelle
5. ⏳ Editor, Garten/Pool, zu zweit spielen

## Steuerung
- Computer: WASD laufen, Maus schauen (Klick = Zeiger fangen), Leertaste springen,
  E/Klick Pfote, Q miauen, C Kamera, Shift rennen.
- iPad: linker Daumen Joystick, rechter Daumen schauen, Knöpfe rechts.
