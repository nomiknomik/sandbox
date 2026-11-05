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

## Stadtbaron – App-Icon  ✅ eingebaut (Stadtbaron v1.1)
```
Create a square 1024x1024 app icon, full-bleed background, no rounded corners, no text.
Style: high-quality voxel / 3D pixel-art (Minecraft-like), toy-like, chunky, soft lighting from
the top left, subtle gloss. Palette: midnight #151923, orange #FF7A24, cyan #47D7E8,
green #2E9D5B, sandstone #D8C49A.
Subject: a small voxel city block on a square board tile: one green voxel house and one red
voxel hotel next to each other, a big golden voxel coin standing in front, and two white voxel
dice with dark pips tumbling in the air above (one showing 5, one showing 3).
Background: warm green (#2E9D5B) to dark midnight gradient with a soft golden glow behind the coin.
One clear silhouette, readable at 60 px, no letters, no logos, kid-friendly, own original design
(not based on any existing board game).
```

## Stadtbaron – Logo (Titel im Menü)  ✅ eingebaut (Stadtbaron v1.1, `logo.webp`)
```
Create a wide game logo, 1536x512, transparent background.
Text exactly: "STADTBARON" (German, all caps, spelled S-T-A-D-T-B-A-R-O-N).
Style: chunky 3D voxel block letters in green (#2E9D5B) with golden edges, a tiny voxel house
on the letter "A" and a gold coin as the "O". Kid-friendly, clean edges, no other text,
no background. Leave a generous transparent margin around everything, nothing cut off.
```

---

## Stadtbaron – Bilderbögen fürs Spielbrett (4 Bögen)  ⏳ offen
Ersetzen die Emojis auf dem Brett. **Jeden Bogen einzeln** in ChatGPT erzeugen
(ein Prompt pro Nachricht), dann alle 4 PNGs hier hochladen. Claude schneidet jedes Feld
aus dem Raster aus, speichert es als kleines WebP und baut es ein.
Prüfen vor dem Hochladen: richtige Anzahl, richtige Reihenfolge, kein Text, nichts angeschnitten.

### Bogen 1 – Straßen 1–12
```
Create a 1536x1024 sprite sheet with a TRANSPARENT background: exactly 12 game-board icons
arranged in a perfect grid of 4 columns x 3 rows. Every icon sits centered in its own equal
cell (384x341 px) with generous empty space around it, so it can be cut out cleanly.
No grid lines, no frames, no labels, no text, no numbers, no letters anywhere.
Style for every icon: high-quality voxel / 3D pixel-art diorama (Minecraft-like but polished),
toy-like and chunky, soft lighting from the top left, gentle shadows, subtle gloss, rich warm
colors, kid-friendly, all icons in exactly the same style, same size and same camera angle
(slightly from above, 3/4 view). Each icon is a tiny floating voxel island showing one place:
Row 1: 1 a gravel path with grey pebbles, 2 a sandy lane with a beach umbrella,
3 a voxel windmill with wheat, 4 a garden with big sunflowers.
Row 2: 5 a town square with a splashing fountain, 6 an avenue with red rose bushes,
7 a path between colorful tulips, 8 a lilac square with a butterfly.
Row 3: 9 a fish market stall with a fish, 10 a shell-covered beach path,
11 a lighthouse path with a red-white lighthouse, 12 a little castle street with a castle tower.
Own original design, not based on any existing board game.
```

### Bogen 2 – Straßen 13–22 + Kartenrücken
```
Create a 1536x1024 sprite sheet with a TRANSPARENT background: exactly 12 game-board icons
arranged in a perfect grid of 4 columns x 3 rows. Every icon sits centered in its own equal
cell (384x341 px) with generous empty space around it, so it can be cut out cleanly.
No grid lines, no frames, no labels, no text, no numbers, no letters anywhere.
Style for every icon: high-quality voxel / 3D pixel-art diorama (Minecraft-like but polished),
toy-like and chunky, soft lighting from the top left, gentle shadows, subtle gloss, rich warm
colors, kid-friendly, all icons in exactly the same style, same size and same camera angle
(slightly from above, 3/4 view). Each icon is a tiny floating voxel island showing one place:
Row 1: 1 a knight's street with a shield and banner, 2 a square with a friendly green dragon,
3 a sunny avenue with a smiling golden sun above, 4 a golden lane with a royal crown.
Row 2: 5 a starry path with a big glowing star, 6 a park ring with a Ferris wheel,
7 a forest avenue with pine trees, 8 a lakeshore with a duck on blue water.
Row 3: 9 a sparkling crystal tower, 10 a grand royal palace square (the most precious place),
11 a big orange glowing question mark made of voxels (surprise card emblem),
12 a golden voxel treasure chest overflowing with coins (city treasury card emblem).
Own original design, not based on any existing board game.
```

### Bogen 3 – Sonderfelder, Haus und Hotel
```
Create a 1024x1024 sprite sheet with a TRANSPARENT background: exactly 16 game-board icons
arranged in a perfect grid of 4 columns x 4 rows. Every icon sits centered in its own equal
cell (256x256 px) with generous empty space around it, so it can be cut out cleanly.
No grid lines, no frames, no labels, no text, no numbers, no letters anywhere.
Style for every icon: high-quality voxel / 3D pixel-art (Minecraft-like but polished),
toy-like and chunky, soft lighting from the top left, gentle shadows, subtle gloss, rich warm
colors, kid-friendly, all icons in exactly the same style, size and 3/4 camera angle.
Row 1: 1 a start line with a checkered flag and a green arrow, 2 a golden treasure chest with coins,
3 a paper tax receipt with a coin stack, 4 a big diamond ring on a cushion (luxury tax).
Row 2: 5 a yellow city bus, 6 a harbor with an anchor and a small ship,
7 a white passenger airplane, 8 a red cable car gondola on a rope.
Row 3: 9 a power plant with a glowing lightning bolt, 10 a water tower with a big blue drop,
11 a glowing orange question mark, 12 a small jail building with bars and a police car.
Row 4: 13 a picnic basket on a blanket (rest stop), 14 a friendly police officer pointing the way
(cartoon, no real person), 15 a small green house, 16 a bigger red hotel.
Own original design, not based on any existing board game.
```

### Bogen 4 – Spielfiguren
```
Create a 1536x1024 sprite sheet with a TRANSPARENT background: exactly 10 game pieces
arranged in a perfect grid of 5 columns x 2 rows. Every piece sits centered in its own equal
cell (307x512 px) with generous empty space around it, so it can be cut out cleanly.
No grid lines, no frames, no labels, no text, no numbers, no letters anywhere.
Style: shiny collectible board-game pieces made of high-quality voxels (Minecraft-like but
polished), each standing on a small round voxel base, toy-like and chunky, soft lighting from
the top left, subtle gloss, bright cheerful colors, kid-friendly, all in the same style and size,
front 3/4 view, clear silhouette that still reads at 40 px.
Row 1: 1 a red race car, 2 a happy brown dog, 3 a black top hat with a golden band,
4 a white-orange rocket, 5 a green dinosaur.
Row 2: 6 a sailboat with white sails, 7 an orange cat, 8 a red electric guitar,
9 a white unicorn with a rainbow mane, 10 a green turtle.
Own original designs, not based on any existing board game pieces.
```
