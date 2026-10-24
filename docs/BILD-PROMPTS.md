# Bild-Prompts für ChatGPT

Wichtige Bilder (Icons, Logos, Titelbilder) entstehen mit ChatGPT – Claude schreibt
den Prompt, baut das Ergebnis ein. Regeln: siehe `CLAUDE.md` → „Design-Bilder“.

## So geht's
1. Prompt unten kopieren → in ChatGPT einfügen → Bild erzeugen lassen.
2. Gefällt es nicht: nachbessern lassen („Stern größer“, „weniger Details“ …).
3. Bild als **PNG** herunterladen und hier im Chat hochladen.
4. Claude schneidet zu, verkleinert, optimiert und baut es ein.

## Gemeinsamer Stil (in jeden Prompt)
- Look: **Voxel / 3D-Pixel-Art**, kantig, spielzeughaft, wie Minecraft, aber hochwertig
  ausgeleuchtet (Licht von oben links, weiche Schatten, leichter Glanz).
- Farben (Design-Konzept): Midnight `#151923`, Battle Orange `#FF7A24`, Energy Cyan
  `#47D7E8`, Armor Green `#527A45`, Steel Gray `#89939B`, Sandstone `#D8C49A`.
- Kindgerecht, freundlich, kein Blut, keine echten Waffen-Marken, keine echten Personen.
- Eigenes Design – keine Figuren/Logos aus fremden Spielen nachmachen.

## Icon-Regeln (für jedes App-Icon)
- Quadratisch **1024 × 1024**, **ohne** abgerundete Ecken (iOS rundet selbst), Motiv
  füllt die Fläche, wichtiger Inhalt im inneren 80 %-Bereich.
- **Kein Text** im Icon. Ein großes, klares Hauptmotiv – muss auch mit 60 px erkennbar sein.
- Hintergrund vollflächig (nicht transparent).

## Logo-Regeln (Schriftzüge)
- Breit, z. B. **1536 × 512**, **transparenter Hintergrund**.
- Buchstaben genau wie angegeben (vor allem kyrillisch) – nach dem Erzeugen prüfen!
- In den Prompt schreiben: „leave a generous transparent margin around everything, nothing cut off“
  (beim Танчики-Logo waren die Buchstaben oben angeschnitten).

---

## Spieleportal – App-Icon  ✅ eingebaut (Portal v1.1)
```
Create a square 1024x1024 app icon, full-bleed background, no rounded corners, no text.
Style: high-quality voxel / 3D pixel-art (Minecraft-like cubes), toy-like and chunky,
soft studio lighting from the top left, subtle glossy highlights, gentle ambient occlusion.
Subject: one big, friendly retro arcade game controller made of voxel cubes in Battle Orange
(#FF7A24) with a dark d-pad and four round buttons in cyan (#47D7E8), green (#527A45),
yellow and red, floating slightly tilted above a glowing hexagon/grid platform.
Small voxel icons orbit around it very subtly: a tiny tank, a tiny worm, a tiny ship anchor.
Background: deep midnight blue (#151923) to dark navy gradient with a faint cyan grid and
a warm orange glow behind the controller. Strong silhouette, high contrast, readable at 60 px,
no fine clutter, no letters, no logos of real brands.
```

## Spieleportal – Logo (Schriftzug über den Kacheln)
```
Create a wide game logo, 1536x512, transparent background.
Text exactly: "SPIELEPORTAL" (German, all caps, spelled S-P-I-E-L-E-P-O-R-T-A-L).
Style: massive chunky block letters with 3D extrusion, brushed steel / metallic surface with
slight scratches, dark outline, warm orange rim light and a subtle orange glow (#FF7A24),
small voxel pixel accents. Below it a smaller orange banner with the text exactly: "UNSERE SPIELE".
Arcade, kid-friendly, clean edges, no other text, no background scenery.
```

## Танчики – App-Icon  ✅ eingebaut (Танчики v3.3)
```
Create a square 1024x1024 app icon, full-bleed background, no rounded corners, no text.
Style: high-quality voxel / 3D pixel-art (Minecraft-like), toy-like, chunky, dramatic but friendly,
same look as a voxel arcade game controller icon with soft studio lighting from the top left.
Subject: one big olive-green (#527A45) voxel tank with orange (#FF7A24) accent stripes, seen from
a 3/4 top-down angle, cannon pointing up-right, a bright muzzle flash and a small glowing shell.
Around it: a few red voxel brick blocks and one steel block, dark grass voxel ground.
Background: midnight blue (#151923) with a warm orange explosion glow in the corner.
One clear silhouette, readable at 60 px, no letters, no real military insignia.
```

## Танчики – Logo (Titel im Menü)  ✅ eingebaut (Танчики v3.3, `logo.webp`)
```
Create a wide game logo, 1536x512, transparent background.
Text exactly in Cyrillic: "ТАНЧИКИ" (letters Т-А-Н-Ч-И-К-И), all caps.
Style: massive chunky block letters with 3D extrusion, metallic steel with scratches,
dark outline, fiery orange glow (#FF7A24) and small spark particles, a tiny voxel tank on top
of the letters. Below, a smaller orange ribbon with the text exactly: "PIXEL WARFARE".
Arcade, kid-friendly, clean edges, no other text, no background.
```

## Vorlage für neue Spiele
```
Create a square 1024x1024 app icon, full-bleed background, no rounded corners, no text.
Style: high-quality voxel / 3D pixel-art (Minecraft-like), toy-like, chunky, soft lighting from
the top left, subtle gloss. Palette: midnight #151923, orange #FF7A24, cyan #47D7E8,
green #527A45, sandstone #D8C49A.
Subject: <EIN großes Hauptmotiv des Spiels, kurz beschreiben>.
Background: <einfacher Hintergrund, der zum Spiel passt>.
One clear silhouette, readable at 60 px, no letters, kid-friendly.
```
