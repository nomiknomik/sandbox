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
