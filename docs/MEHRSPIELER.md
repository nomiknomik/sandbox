# Zu zweit auf iPhone + iPad spielen

Für rundenbasierte Spiele (z. B. Морской бой) reichen ein paar Sekunden
Verzögerung. Optionen, von einfach nach aufwendig:

| Stufe | Wie | Datenschutz | Aufwand |
|---|---|---|---|
| A | **Ein Gerät, abwechselnd** („Gerät weitergeben“, Bildschirm wird zwischen den Zügen verdeckt) | nichts verlässt das Gerät | klein – ideal für den Anfang |
| B | **Privates GitHub-Repo als Spielbrett**: jedes Gerät schreibt seinen Zug als verschlüsselte Datei, das andere fragt alle 2–3 s nach | wie Zeitabrechnung/Tagesdoku: privat + AES-GCM, nur eigene Token | mittel – Sync-Code aus Zeitabrechnung übernehmbar |
| C | **WebRTC direkt Gerät↔Gerät**, Verbindung per QR-Code-Tausch | Daten gehen direkt zwischen den Geräten | höher, im Heim-WLAN meist ok, unterwegs unsicher |

**Empfehlung:** erst A bauen (Spiellogik lernen), dann B als „Level 2“ – dabei
lernt man, wie zwei Geräte miteinander reden.

## Regeln für Stufe B
- Eigenes privates Repo nur für Spielstände (z. B. `sandbox-spielstand`).
- Fine-grained Token: nur dieses Repo, „Contents: Read and write“.
  Token nur im localStorage des Geräts, nie im Code; Einrichtung per QR-Code
  vom Eltern-Gerät.
- Spielstand verschlüsselt; Spielernamen sind Spitznamen/„Spieler 1/2“.
- Bei Морской бой: Schiffspositionen des Gegners **nicht** im Klartext auf das
  andere Gerät schicken (sonst kann man „schummeln“) – nur „Treffer/Wasser“
  zurückmelden. Schönes Lernthema: *Vertrauen & Geheimnisse*.

## Umgesetzt in Морской бой (v1.1)
- Spielstand: eine Datei `morskoj-boj/aktuell.json` im privaten Repo, AES-GCM-verschlüsselt.
- Einladung fürs zweite Gerät: QR-Code (im Spiel erzeugt) oder Code kopieren/einfügen.
- Ab v2.2 (schneller): Beide Flotten liegen verschlüsselt im Spielstand; der Schütze
  rechnet Treffer/Wasser sofort selbst aus, das andere Gerät wird nur informiert
  (1 Schreibzugriff pro Schuss). Bewusste Abwägung: Tempo vor Schummel-Schutz –
  die App zeigt fremde Schiffe nie an.
- Geräte fragen alle 1,5 s nach (ETag → kaum Last). Spiel überlebt Neustart der App.
- v2.3 „⚡ WLAN-Direkt“ (immer an, wie in Würmer): WebRTC-Datenkanal Gerät ↔ Gerät,
  Handschlag über `morskoj-boj/signal.json` (verschlüsselt). Kein STUN/TURN → nur im
  selben WLAN. Jeder Stand trägt eine Zugnummer `rev`, damit ein älterer GitHub-Stand
  nie einen neueren Direkt-Stand überschreibt. GitHub bleibt Reserve (jeder Zug wird
  trotzdem gespeichert). Gemessen: Gegner sieht den Einschlag nach ~0,8 s statt ~2,3 s.
  Anzeige oben „⚡ WLAN-Direkt / ☁ über GitHub“; bei Safari-Problem antippen (Kamera-Erlaubnis).

## Umgesetzt in Würmer (v0.2)
- 2–3 Spieler: auf einem Gerät abwechselnd **oder** online, ein Gerät pro Team.
- Gleiches privates Repo und gleiche Einladung (QR/Code `MB1~…`) wie Морской бой,
  eigene Datei `wuermer/aktuell.json`, AES-GCM-verschlüsselt.
- Physik in Echtzeit lässt sich nicht alle 2 s übertragen. Deshalb schickt das Gerät,
  das dran ist, am Zugende nur seine **Eingaben** (laufen, springen, schießen mit
  Bild-Nummer) plus einen Kontroll-Stand. Die anderen Geräte spielen den Zug nach –
  gleiche Startzahl + gleiche Eingaben = gleiches Ergebnis. Danach wird der
  Kontroll-Stand übernommen, falls doch etwas abweicht.
  Lernthema: *Zufall mit Startzahl* und *Determinismus*.
- v0.3: Jedes Team kann Mensch 👤 oder Computer 🤖 sein. Online rechnet das Gerät,
  das das Spiel erstellt hat („Gastgeber“), die Computer-Züge und schickt sie wie
  einen normalen Zug. Der Computer probiert „im Kopf“ viele Schüsse mit derselben
  Physik aus und nimmt einen der besten – je nach Stufe mit zittriger Hand.
- v0.5: Der laufende Zug wird alle 2 s als Stück hochgeladen – Zuschauer sind nur
  noch ca. 3 s hinterher (vorher: ganzer Zug + Wiederholung).
- v0.6 „⚡ WLAN-Direkt“ (Option beim Einrichten, Standard: an): WebRTC-Datenkanal
  Gerät ↔ Gerät, Handschlag über `wuermer/signal.json` (verschlüsselt wie der
  Spielstand). Kein STUN/TURN, also keine fremden Server → nur im selben WLAN.
  Zuschauer sind ca. 0,1 s hinterher; GitHub bekommt nur noch alle 10 s ein Stück
  und den Endstand (Reserve + Neustart). Bei 3 Geräten reicht der Gastgeber weiter.
  Safari zeigt die eigene WLAN-Adresse evtl. erst nach Kamera-Erlaubnis → Knopf ⚡.

## Umgesetzt in Танчики (v1.0) – Echtzeit, ganz ohne Internet
- Echtzeit-Actionspiel (60 Bilder/s) → GitHub als Zwischenstation viel zu langsam.
  Darum nur **WebRTC direkt** Gerät ↔ Gerät, Handschlag per **QR-Code-Tausch**:
  A zeigt Angebot → B scannt (in der App, jsQR) → B zeigt Antwort → A scannt.
- Der QR-Code enthält nur das Nötigste aus der SDP (ufrag, pwd, Fingerabdruck,
  Adressen) – ca. 100 Zeichen statt ~600. Die SDP wird auf der anderen Seite
  wieder zusammengebaut. Kein STUN/TURN, keine fremden Server.
- Gastgeber (A) rechnet das Spiel und schickt 30×/s, was zu sehen ist; B schickt
  nur seine Knöpfe. B glättet die Bewegungen zwischen zwei Nachrichten.
  Lernthema: *Wer hat recht? – ein Gerät ist der Schiedsrichter.*
- Bluetooth geht nicht: Safari auf iPhone/iPad hat kein Web-Bluetooth. Beide Geräte
  brauchen ein gemeinsames WLAN (Bord-WLAN, Hotel, Hotspot). Im Flugzeug
  zuverlässig: **2 Spieler auf einem iPad** (geteilte Touch-Steuerung) oder
  Bluetooth-Gamecontroller (Gamepad-API).
- v3.2 „🔎 Automatisch finden“ (wie Würmer): Handschlag über `tanchiki/signal.json` im
  privaten Repo (AES-GCM). Zugang/Schlüssel werden aus `tk-sync`, `wu-sync` oder `mb-sync`
  gelesen – alle Spiele liegen unter derselben Adresse und teilen sich den Gerätespeicher,
  darum ist ein in Würmer eingerichtetes Gerät sofort bereit. Wer zuerst sucht, legt ein
  Angebot hin (Spieler 1), das zweite Gerät antwortet. Gleichzeitiges Tippen klärt die
  `sha`-Prüfung von GitHub (der Langsamere wird Spieler 2). Braucht kurz Internet;
  ohne Internet bleibt der QR-Tausch.
- v5.3 gegen Ruckeln beim Gast: **zwei Datenkanäle** – Bewegung über einen
  unzuverlässigen, ungeordneten Kanal (`maxRetransmits: 0`, verlorene Bilder werden
  übersprungen statt nachgeschickt → kein Stau), Karte/Töne/Befehle über den
  zuverlässigen. Der Gast **puffert** ~50–170 ms (je nach Schwankung) und blendet
  zwischen zwei Bildern über; der eigene Panzer läuft ohne Pufferzeit. Lernthema:
  *Lieber ein Bild weglassen als auf ein verlorenes warten.*
  (Würmer-Prinzip „gleiche Eingaben = gleiches Ergebnis“ passt für Runden, nicht für Echtzeit.)

## Ohne Internet in Würmer (v1.59) und Морской бой (v2.5)
- Menü **📶 Ohne Internet**: ein Gerät zeigt einen QR-Code (Gastgeber), das andere
  scannt ihn und zeigt seinen Antwort-Code, den der Gastgeber scannt. Selbes WLAN
  oder persönlicher Hotspot, kein Internet, keine fremden Server.
- Gemeinsames Modul `lokal.js` (in beiden Apps gleich): ersetzt GitHub als
  „Ablage“. Der Gastgeber hält den Spielstand; Mitspieler schicken Änderungen
  mit der Nummer des Stands, auf dem sie aufbauen (`_lr`) – passt sie nicht,
  kommt „nein“ + aktueller Stand und es wird neu probiert (wie `sha` bei GitHub).
  Dadurch läuft die ganze bisherige Online-Logik unverändert weiter.
- Stand wird auf jedem Gerät gespeichert (`wu-lokal` / `mb-lokal`): Nach einem
  Neustart der App einfach QR-Codes neu tauschen – das Spiel geht weiter.
- Verbindung weg (Bildschirm aus, WLAN weg): Würmer ⚡ oben links, Морской бой
  „📶 Nicht verbunden – hier tippen“ → QR-Codes neu tauschen.
- Würmer mit 3 Geräten: der Gastgeber tippt in der Lobby „📶 Verbindung“ →
  „Ich zeige den QR-Code“ für das dritte Gerät.

## Танчики v5.4 – Gegeneinander (Duell)
- Menü „Zu zweit: Miteinander / Gegeneinander“. Gilt für ein Gerät und zwei Geräte.
- Jeder hat eine Basis (Spieler 1 unten, Spieler 2 oben), keine Computer-Panzer.
  Basis des anderen treffen oder seine 3 Panzer abschießen = Runde gewonnen;
  wer zuerst 3 Runden gewinnt, ist Sieger.
- Karten: 4 Duell-Karten + Zufallskarten, alle um 180° gedreht gleich (fair).
- Extras im Duell: Uhr friert den Gegner ein, Granate trifft ihn, Schaufel schützt die eigene Basis.

## Танчики v5.6 – Angriff
- Spielart „Angriff 🎯“ (allein oder zu zweit zusammen, auch über zwei Geräte):
  oben steht die rote Computer-Basis, die zerstört werden muss; die eigene unten schützen.
- Computer-Panzer kommen ohne Ende; etwa ein Drittel bewacht die eigene Basis.

## Umgesetzt in Stadtbaron (v1.0) – Brettspiel mit Straßen und Häusern
- 2–6 Spieler, jeder Mensch 👤 oder Computer 🤖. Ein Gerät (abwechselnd) **oder** mehrere Geräte.
- Gleiche Technik wie Морской бой: verschlüsselte Datei `stadtbaron/aktuell.json` im privaten
  Repo (AES-GCM), gleiche Einladung `MB1~…`. Ein schon eingerichtetes Gerät (mb/wu/tk) ist sofort bereit.
  „📶 Ohne Internet“ über `lokal.js` (QR-Tausch), wie in Würmer/Морской бой.
- Die Spielregeln stecken in **einer** Funktion `anwenden(stand, aktion)`. Das Gerät, dessen Spieler
  dran ist, rechnet die Aktion aus und schreibt den neuen Stand; die anderen fragen alle 2 s nach
  und spielen Würfel/Laufen/Karten aus der Liste `ablauf` nach. Computer-Spieler rechnet der Gastgeber.
  Lernthema: *Ein Zug = eine Nachricht.* Ob ein Knopf erlaubt ist, prüft die App, indem sie die
  Aktion „zur Probe“ auf einer Kopie ausführt.
- Lobby: Gastgeber legt Spieler an, jedes Gerät tippt „Ich spiele …“ (ein Gerät darf mehrere übernehmen).
- Vereinfachungen: kein 10 %-Aufschlag, wenn eine belastete Straße per Handel/Pleite den Besitzer
  wechselt; bei „Geburtstag“ zahlt jeder höchstens, was er hat; gebaut und gehandelt wird nur im eigenen Zug.
- v1.2: Drei Spielstufen (im Spielstand `opt.stufe`): 🐣 Einfach (kein Versteigern/keine Hypothek/kein Tauschen,
  Gefängnis = einmal aussetzen, kein Geld mehr = Spielende mit Wertung), 🦊 Mittel (gleichmäßig bauen, Pasch-Gefängnis,
  Tauschen), 🦁 Profi (alle Regeln). Spiellänge 10 / 20 Runden oder ohne Ende. Jede Straße hat ein Bild (Emoji),
  große Meldungen („GEKAUFT!“, Miete) und Konfetti für den Sieger.
- v1.3: Karten liegen als zwei Stapel (❓ Überraschung, 💰 Stadtkasse) auf dem Brett. Landet man dort, wackelt der
  Stapel – antippen zieht die Karte (eigene Phase `karte`, Aktion `ziehen`). Sie fliegt in die Mitte, dreht sich in 3D um,
  danach zurück unter den Stapel (Raus-Karte fliegt zum Spieler). Rückseite noch selbst gebaut, später ChatGPT-Bild.
