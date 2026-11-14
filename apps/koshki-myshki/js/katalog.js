// Каталог всех предметов, которые можно поставить в дом.
// Здесь только «паспорт» предмета: название, размер, свойства.
// Как предмет выглядит в 3D – в modelle.js.  Где он стоит – в level/haus.json.
//
// groesse: [ширина (x), высота (y), глубина (z)] в метрах
// beweglich: кошка может столкнуть (падает по-настоящему)
// zerbrechlich: разбивается, если упадёт
// kratzbar: можно поцарапать (diwan = «шалость», kratzbaum = можно)
// masse: вес в кг (для физики)

export const KATALOG = {
  // --- Мебель (стоит на месте) ---
  sofa:          { name: 'Sofa',            emoji: '🛋️', groesse: [2.2, 0.85, 0.9], kratzbar: 'schaden' },
  sessel:        { name: 'Sessel',           emoji: '💺', groesse: [0.9, 0.85, 0.85], kratzbar: 'schaden' },
  couchtisch:    { name: 'Couchtisch', emoji: '🟫', groesse: [1.2, 0.45, 0.65] },
  esstisch:      { name: 'Esstisch',   emoji: '🍽️', groesse: [1.5, 0.75, 0.9] },
  stuhl:         { name: 'Stuhl',             emoji: '🪑', groesse: [0.45, 0.9, 0.45] },
  tvschrank:     { name: 'Fernsehschrank', emoji: '📺', groesse: [1.6, 0.5, 0.45] },
  aquarium:      { name: 'Aquarium',         emoji: '🐠', groesse: [1.0, 1.25, 0.45] },
  kratzbaum:     { name: 'Kratzbaum',       emoji: '🐾', groesse: [0.6, 1.5, 0.6], kratzbar: 'gut' },
  regal:         { name: 'Regal',            emoji: '📚', groesse: [1.0, 1.8, 0.35] },
  pflanze:       { name: 'Blume',           emoji: '🪴', groesse: [0.5, 1.2, 0.5] },
  kuechenzeile:  { name: 'Küche',            emoji: '🍳', groesse: [5.0, 0.9, 0.62] },
  kuehlschrank:  { name: 'Kühlschrank',      emoji: '🧊', groesse: [0.7, 1.9, 0.7] },
  schuhschrank:  { name: 'Schuhschrank',         emoji: '👟', groesse: [1.0, 0.9, 0.35] },
  kommode:       { name: 'Kommode',            emoji: '🗄️', groesse: [1.0, 0.85, 0.45] },
  bett:          { name: 'Bett von Oma und Opa', emoji: '🛏️', groesse: [1.6, 0.55, 2.0] },
  kinderbett:    { name: 'Kinderbett',  emoji: '🛏️', groesse: [0.9, 0.5, 1.9] },
  nachttisch:    { name: 'Nachttisch',         emoji: '🟫', groesse: [0.45, 0.5, 0.4] },
  kleiderschrank:{ name: 'Kleiderschrank',             emoji: '🚪', groesse: [1.8, 2.1, 0.6] },
  schreibtisch:  { name: 'Schreibtisch',  emoji: '✏️', groesse: [1.2, 0.75, 0.6] },
  spielzeugkiste:{ name: 'Spielzeugkiste', emoji: '🧸', groesse: [0.8, 0.5, 0.5] },
  badewanne:     { name: 'Badewanne',            emoji: '🛁', groesse: [1.7, 0.6, 0.75] },
  waschbecken:   { name: 'Waschbecken',         emoji: '🚰', groesse: [0.6, 0.85, 0.45] },
  toilette:      { name: 'Klo',           emoji: '🚽', groesse: [0.4, 0.75, 0.65] },
  waschmaschine: { name: 'Waschmaschine', emoji: '🫧', groesse: [0.6, 0.85, 0.6] },
  heizung:       { name: 'Heizkessel',            emoji: '🔥', groesse: [0.8, 1.4, 0.4] },
  werkbank:      { name: 'Werkbank',          emoji: '🔧', groesse: [2.0, 0.9, 0.7] },
  kiste:         { name: 'Karton',          emoji: '📦', groesse: [0.5, 0.5, 0.5] },
  truhe:         { name: 'Truhe',           emoji: '🧰', groesse: [1.0, 0.6, 0.55] },
  gelaender:     { name: 'Geländer',           emoji: '➖', groesse: [4.0, 0.9, 0.06] },
  teppich:       { name: 'Teppich',            emoji: '🟥', groesse: [2.0, 0.02, 1.5], flach: true },
  napf:          { name: 'Katzennapf',      emoji: '🥣', groesse: [0.3, 0.08, 0.3], flach: true },
  katzenkissen:  { name: 'Katzenkissen',    emoji: '💤', groesse: [0.7, 0.15, 0.7] },
  katzenbrett:   { name: 'Katzenbrett', emoji: '🪜', groesse: [0.45, 0.05, 0.45] },
  treppe:        { name: 'Treppe',         emoji: '🪜' },

  // --- Вещи, которые кошка может уронить ---   (tragbar: passt ins Maul)
  vase:          { name: 'Vase',      emoji: '🏺', groesse: [0.18, 0.34, 0.18], beweglich: true, zerbrechlich: true, masse: 1.0, punkte: 10 },
  tasse:         { name: 'Tasse',     emoji: '☕', groesse: [0.1, 0.1, 0.1],   beweglich: true, zerbrechlich: true, masse: 0.3, punkte: 5 , tragbar: true },
  teller:        { name: 'Teller',   emoji: '🍽️', groesse: [0.24, 0.03, 0.24], beweglich: true, zerbrechlich: true, masse: 0.4, punkte: 5 },
  glas:          { name: 'Marmeladenglas', emoji: '🫙', groesse: [0.12, 0.16, 0.12], beweglich: true, zerbrechlich: true, masse: 0.6, punkte: 8 },
  topf:          { name: 'Kochtopf',  emoji: '🍲', groesse: [0.28, 0.18, 0.28], beweglich: true, masse: 1.2, punkte: 3 },
  buch:          { name: 'Buch',     emoji: '📕', groesse: [0.16, 0.24, 0.05], beweglich: true, masse: 0.5, punkte: 2 , tragbar: true },
  wecker:        { name: 'Wecker', emoji: '⏰', groesse: [0.12, 0.12, 0.07], beweglich: true, zerbrechlich: true, masse: 0.3, punkte: 6 , tragbar: true },
  ball:          { name: 'Ball',       emoji: '⚽', groesse: [0.22, 0.22, 0.22], beweglich: true, masse: 0.3, rund: true , tragbar: true },
  wollknaeuel:   { name: 'Wollknäuel',    emoji: '🧶', groesse: [0.14, 0.14, 0.14], beweglich: true, masse: 0.1, rund: true , tragbar: true },
  bauklotz:      { name: 'Bauklotz',     emoji: '🧱', groesse: [0.18, 0.18, 0.18], beweglich: true, masse: 0.2 , tragbar: true },
  spielzeugmaus: { name: 'Spielzeugmaus', emoji: '🐭', groesse: [0.12, 0.06, 0.06], beweglich: true, masse: 0.05 , tragbar: true },
};

// Размер с учётом поворота (90/270 – ширина и глубина меняются местами)
export function grundflaeche(o) {
  const k = KATALOG[o.typ] || {};
  let [w, , d] = k.groesse || [0.5, 0.5, 0.5];
  if (o.breite) w = o.breite;
  if (o.tiefe) d = o.tiefe;
  if (o.laenge) w = o.laenge;
  const r = ((o.rot || 0) % 360 + 360) % 360;
  return (r === 90 || r === 270) ? [d, w] : [w, d];
}

// Стандартные размеры проёмов в стенах
export const OEFFNUNG = {
  tuer:     { breite: 0.9,  hoehe: 2.1, unten: 0 },
  haustuer: { breite: 1.0,  hoehe: 2.1, unten: 0, zu: true },
  fenster:  { breite: 1.2,  hoehe: 1.2, unten: 0.9 },
  klappe:   { breite: 0.38, hoehe: 0.42, unten: 0 },   // кошачий ход: люди не пролезут
};
