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
- Schiffe bleiben auf dem eigenen Gerät; über GitHub laufen nur Schüsse und Antworten.
- Geräte fragen alle 2 s nach (ETag → kaum Last). Spiel überlebt Neustart der App.

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
