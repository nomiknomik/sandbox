# Katz und Maus (Ordner `koshki-myshki`) – Spielkonzept (gemeinsam beschlossen)

**Sprache im Spiel: Deutsch** (alle Texte, Räume, Gegenstände, Sprüche).

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
- Möbel sind vorerst aus Grundformen gebaut. Später austauschbar gegen CC0-Modelle.
  **Woher die Modelle kommen (Stand v0.3):** kenney.nl blockt Programme (403), Quaternius liegt
  auf Google Drive (dort oft „Quota exceeded“). Funktioniert: Spiegel auf GitHub-Releases
  `github.com/Noisemaker111/jgengine/releases/download/packs/quaternius-<pack-id>.zip`
  (Pack-IDs aus dem npm-Paket `@jgengine/assets`, `dist/generated/pack/`). Dort u. a.
  Möbel (`quaternius-furniture-low-poly`, `quaternius-lowpoly-house-interior-pack`), Tiere,
  Hunde (Husky, Shiba) für die spätere Собака. **Keine Maus** in den Paketen → Maus ist Code.
  Umwandeln: OBJ+MTL → kleines JSON (Farben je Material, Dreiecke), lädt ohne Extra-Bibliothek.
- Qualität: ✨ Красиво / Средне / ⚡ Быстро (Schatten, Auflösung).
- Zu zweit: später zwei Geräte übers Netz (wie Морской бой/Танчики: WebRTC im WLAN).

## Stufen
1. ✅ v0.1 – Haus (4 Ebenen) + Laufen/Springen + Vasen zerbrechen + Licht/Schatten
2. ✅ v0.2 – Бабуля: Runde durchs Haus, Wut-Leiste (Balken über dem Kopf), Jagd über alle
   Treppen, Pfanne = −❤️ + Sterne, Game over → Geheimkammer; Napf und Schlafen (Sofa,
   Bett, Kissen) = +❤️. Wegfindung: Raster 25 cm + A* (`js/wege.js`), Katzenklappen sind
   für Menschen automatisch zu.
3. 🔶 v0.3 – **Maus** (Mauseloch im Wohnzimmer, schnuppert herum, flieht ab 1,7 m zum Loch,
   Pfote = gefangen +20, zappelt 2,5 s im Maul, entwischt, 20 s Pause; `haus.json → maeuse`),
   **Aquarium-Angeln** (Pfote am Aquarium → Balken mit Fisch, Pfote im grünen Feld = +15, Fisch
   zappelt im Maul und springt zurück; daneben = PLATSCH, 10 s nass + halb so schnell, Oma hört es;
   Feld wird bei jedem Fang kleiner), **echte 3D-Fische** (Quaternius „Animated Fish Pack“, CC0,
   als `modelle/fische.json`), Titelbild + Icon aus ChatGPT, alles auf Deutsch.
4. ✅ v0.4 – **Aufgabenliste** (📋 oben / Taste T, 10 Aufgaben, Stand bleibt auf dem Gerät,
   je Aufgabe ein Pokal in der Geheimkammer, alle → Krone; `js/aufgaben.js`),
   **Aquarium umwerfen** (3× Pfote oben auf dem Becken → Becken kippt vom Schrank, Pfütze,
   zappelnde Fische, alle kommen; nach 25 s hat Oma aufgeräumt),
   **im Maul tragen** (👄 / Taste R, kleine Sachen; in der Geheimkammer abgelegt = Trophäe),
   **Hund** (Shiba Inu, Quaternius CC0, animiert, `js/hund.js`: Runde im Erdgeschoss, sieht die
   Katze → bellt (weckt Oma/Opa) und rennt hinterher, tut nichts, kann nicht springen),
   **Opa** mit Zeitung (schnell, nach 4,5 s Jagd außer Puste; KLATSCH = −❤️),
   **echte 3D-Möbel** (Quaternius „Ultimate House Interior“, in die alten Kollisions-Kisten
   eingepasst, in den alten bunten Farben). three.js neu gebündelt mit GLTFLoader.
5. ✅ v0.5–0.7 – **Versteck hinter dem Sofa** (Sofa 45 cm von der Wand, Kuscheldecke, zu eng für
   Menschen; im Versteck sieht dich keiner, Oma/Opa bleiben stehen und beruhigen sich schnell;
   `haus.json → verstecke`), **Roboter-Staubsauger** (`js/sauger.js`: fährt im Erdgeschoss, dreht an
   Hindernissen, saugt Scherben, erschreckt die Katze, Katze kann oben mitfahren), **Kind** als Freund
   (`js/kind.js`: Kinderzimmer; Miau in der Nähe = Leckerli +❤️; gejagt beim Kind = es lenkt ab).
   Aufgaben jetzt 14.
6. ✅ v0.8 – **Draußen** (`js/draussen.js`, Plan oben in der Datei): Katzenklappe neben der Haustür,
   Terrassentür hinten. Straße mit 2 Spuren, **Autos** (`js/verkehr.js`): halten an der roten Ampel und am
   Zebrastreifen, sonst nur hupen + zu spät bremsen → „PLATT“ = −2 ❤️. **Fußgänger** (`js/leute.js`):
   Miau bei netten → streicheln (+5) / füttern (+❤️); Grummel-Leute (dunkle Kleidung, böse Augenbrauen)
   hauen mit der Tasche (−❤️). **Nachbarhaus** und **Restaurant** gegenüber (Tür offen): Reste vom Teller
   futtern (+10, +❤️), Kellner jagt mit dem Tablett. **Terrasse, Pool, Rutsche**; schwimmen/tauchen mit
   Luft-Leiste; Unterwasser-Tunnel → **geheimes Spielzimmer** (Gartenhaus ohne Tür) mit Konsole und
   **Klötzchen** (`js/kloetzchen.js`, eigenes Fallende-Klötzchen-Spiel, Rekord bleibt auf dem Gerät).
   7 neue Aufgaben (jetzt 21).
7. ✅ v0.9 – **Verstecke & Geheimgänge** (Wunsch: ganz viele Verstecke). Verstecke: hinter dem Vorhang
   (Küche, „dein Schwanz guckt raus“), unter dem Bett und unter dem Kinderbett (Betten jetzt auf hohen Beinen,
   Modell-Beine per `knick` gestreckt), im Kleiderschrank (Tür offen, Kleider hängen, Menschen passen nicht rein),
   im Wäschekorb (Bad), in der **Baumhöhle** (Kletterbaum im Garten, Baumpilze als Stufen bis zum Ast oben),
   im Gebüsch. Geheimgänge (`haus.json → geheimgaenge`, draußen in `draussen.js`): Loch im Kleiderschrank-Boden
   ↔ Wohnzimmer (Katzenbretter an der Wand), Kellerschacht (Katzenklappe im Keller ↔ Garten), Loch hinter den
   Büschen ins geheime Spielzimmer. 2 neue Aufgaben (jetzt 23), zählen nur *verschiedene* Verstecke/Gänge.
8. ✅ v0.10 – **Mehr Häuser** (`level/siedlung.json` + `js/siedlung.js`, Häuser sind Daten: Etagen, Räume,
   Wände mit Türen/Klappen, Fenster automatisch, Treppen, Balkone, Pools; `kopie` = gleiche Etagen, andere Möbel).
   **Villa** (rechts neben dem Garten): Keller + 4 Stockwerke + Dachterrasse, Balkone, **3 Pools** (Hallenbad im Keller,
   Gartenpool, Dachpool), 6 Geheimräume. **Blaues Haus** und **Gelbes Haus** gegenüber, je 5 Geheimräume.
   Omas Haus hat jetzt auch 5 (Geheimkammer, Spielzimmer im Garten, Schatzkeller, Maulwurfbau, Kuschelhöhle).
   **Maulwurfgang**: Katzenklappe im Maulwurfbau (Keller) → langer Erdtunnel mit Leuchtpilzen und Maulwurf → Villa-Keller.
   **Glücksrad** (`js/gluecksrad.js`) in der geheimen Spielhalle der Villa: 🐾 = drehen, Preise Punkte/Herz/Stern/Jackpot.
   **Souvenirs** (9 Stück, in fremden Geheimräumen) → im Maul heimtragen und in einem eigenen Geheimraum ablegen.
   **Garderobe** 🎨 (`js/garderobe.js`): 6 Fellfarben, 5 Sachen (Schleife, Sonnenbrille, Halstuch, Zauberhut, Umhang),
   freigeschaltet über geschaffte Aufgaben. 6 neue Aufgaben (jetzt 28).
   Noch offen: Geheimräume im Nachbarhaus und Restaurant (sind noch einfache Kästen).
9. ⏳ Dach begehbar (Versteck am Schornstein), Katzen-Aufzug (braucht neue Löcher in den Decken), Sounds aus CC0
10. ⏳ Echte Sounds, Editor, zu zweit spielen

## Steuerung
- Computer: WASD laufen, Maus schauen (Klick = Zeiger fangen), Leertaste springen,
  E/Klick Pfote, Q miauen, R tragen, T Aufgaben, C Kamera, Shift rennen.
- iPad: linker Daumen Joystick, rechter Daumen schauen, Knöpfe rechts.
