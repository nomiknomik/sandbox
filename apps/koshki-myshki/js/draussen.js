// Draußen: Garten mit Terrasse, Pool und Rutsche, Straße mit Zebrastreifen und Ampel,
// Nachbarhaus und Restaurant gegenüber – und ein geheimes Spielzimmer, in das man nur
// durch einen Unterwasser-Tunnel im Pool kommt.
// Einheiten: Meter. x → Osten, z → Süden. Das Haus steht bei x 0..14, z 0..10.
import * as THREE from '../vendor/three.js';
import { mat } from './modelle.js';
import { textur } from './texturen.js';
import { verkleben } from './haus.js';

const T = THREE;

// ---------- Der Plan (hier kann man Dinge verschieben) ----------
export const PLAN = {
  welt:      { x0: -40, x1: 60, z0: -36, z1: 32 },
  strasse:   { x0: -40, x1: 60, z0: -16, z1: -9 },          // 2 Fahrspuren
  gehwegN:   { z0: -9, z1: -6 },                             // Gehweg auf unserer Seite
  gehwegS:   { z0: -19, z1: -16 },                           // Gehweg gegenüber
  zebra:     { x0: 5.75, x1: 8.25 },                         // Zebrastreifen vor unserem Gartentor
  ampel:     { x0: 22, x1: 24 },                             // Fußgängerampel vor dem Restaurant
  tor:       { x0: 6.2, x1: 7.8 },
  garten:    { x0: -8, x1: 22, z0: -5.9, z1: 30 },
  terrasse:  { x0: 0, x1: 10, z0: 10, z1: 13, h: 0.1 },
  pool:      { x0: 1, x1: 9, z0: 14, z1: 19, wand: 0.25, boden: -2.0, wasser: -0.12 },
  tunnel:    { x0: 4.4, x1: 5.6, z0: 18.75, z1: 23, y0: -2.0, y1: -1.4 },
  schacht:   { x0: 4, x1: 6, z0: 23, z1: 24.6 },             // dort taucht man im Spielzimmer auf
  spielzimmer: { x0: 1, x1: 9, z0: 21.5, z1: 27, h: 2.5 },
  turm:      { x0: 10, x1: 11.2, z0: 14, z1: 15.2, h: 2.4 },  // Rutschen-Turm
  restaurant: { x0: 16, x1: 30, z0: -31, z1: -20, h: 3.2, tuer: 23 },
  nachbar:   { x0: -2, x1: 10, z0: -31, z1: -21, h: 3.0, tuer: 4 },
  kletterbaum: { x: -4.5, z: 19.5 },                         // dicker Baum mit Höhle (Versteck)
  kellerschacht: { x0: 12, x1: 13, z0: 10.125, z1: 11.1, tief: -2.8 },   // Geheimgang: Keller ↔ Garten
  buschloch: { z0: 25.3, z1: 25.7 },                         // Loch in der Wand vom Spielzimmer, hinter Büschen
};
// Kurve der Rutsche: oben am Turm → im Bogen in den Pool
const RUTSCHE = [[10.0, 2.45, 14.6], [9.2, 2.05, 14.75], [8.5, 1.5, 15.5], [8.1, 0.95, 16.5], [7.4, 0.5, 17.2], [6.4, 0.2, 17.1]];

// Ein Rechteck minus ein Loch → bis zu 4 Rechtecke
function minus(rects, l) {
  const out = [];
  for (const r of rects) {
    if (l.x1 <= r.x0 || l.x0 >= r.x1 || l.z1 <= r.z0 || l.z0 >= r.z1) { out.push(r); continue; }
    if (l.z0 > r.z0) out.push({ ...r, z1: l.z0 });
    if (l.z1 < r.z1) out.push({ ...r, z0: l.z1 });
    const z0 = Math.max(r.z0, l.z0), z1 = Math.min(r.z1, l.z1);
    if (l.x0 > r.x0) out.push({ ...r, x1: l.x0, z0, z1 });
    if (l.x1 < r.x1) out.push({ ...r, x0: l.x1, z0, z1 });
  }
  return out;
}

// Pflastersteine für den Gehweg (selbst gemalt)
let pflasterTex = null;
function pflaster() {
  if (pflasterTex) return pflasterTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#9C9890'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 4; y++) for (let x = -1; x < 4; x++) {
    g.fillStyle = `hsl(35,6%,${66 + Math.random() * 8}%)`;
    g.fillRect(x * 32 + (y % 2) * 16 + 1.5, y * 32 + 1.5, 29, 29);
  }
  pflasterTex = new T.CanvasTexture(c); pflasterTex.wrapS = pflasterTex.wrapT = T.RepeatWrapping; pflasterTex.colorSpace = T.SRGBColorSpace;
  return pflasterTex;
}
// Schild mit Schrift (Restaurant)
function schild(text, breite, hoehe, farbe, schrift) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * hoehe / breite);
  const g = c.getContext('2d');
  g.fillStyle = farbe; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(8, 8, c.width - 16, c.height - 16);
  g.fillStyle = schrift; g.font = `bold ${Math.round(c.height * 0.5)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 4);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
  return new T.Mesh(new T.PlaneGeometry(breite, hoehe), new T.MeshStandardMaterial({ map: t, roughness: 0.7 }));
}

export function baueDraussen(scene, world, R, bau, extra = {}) {
  const fremd = extra.loecher || [];          // weitere Häuser (siedlung.js): dort kein Gras und keine Bäume
  const g = new T.Group(); scene.add(g);                    // alles Feste – wird am Ende zusammengeklebt
  const lose = new T.Group(); scene.add(lose);              // Durchsichtiges / Bewegtes
  const P = PLAN, anim = [];
  // Kiste: sichtbar (+ fest)
  const kiste = (x0, x1, y0, y1, z0, z1, m, fest = true, ziel = g) => bau.block(x0, x1, y0, y1, z0, z1, typeof m === 'string' ? mat(m) : m, { fest, ziel });
  // Fläche mit Muster, das überall gleich läuft (UV = Weltkoordinate)
  function flaeche(x0, x1, z0, z1, y, material, meter, dicke = 0) {
    const geo = dicke ? new T.BoxGeometry(x1 - x0, dicke, z1 - z0) : new T.PlaneGeometry(x1 - x0, z1 - z0);
    if (!dicke) geo.rotateX(-Math.PI / 2);
    geo.translate((x0 + x1) / 2, y - dicke / 2, (z0 + z1) / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + pos.getY(i) * 0.3) / meter, -pos.getZ(i) / meter);
    const m = new T.Mesh(geo, material); m.receiveShadow = true; g.add(m); return m;
  }
  const texMat = (name, r = 0.9) => { const t = textur(name, 1, 1); t.repeat.set(1, 1); return new T.MeshStandardMaterial({ map: t, roughness: r }); };

  // ---------- Boden: Wiese mit Löchern (Haus, Pool, Schacht) ----------
  const W = P.welt, pool = P.pool, sch = P.schacht;
  let rects = [{ x0: W.x0, x1: W.x1, z0: W.z0, z1: W.z1 }];
  const KS = P.kellerschacht, ksW = 0.2;
  for (const l of [{ x0: 0, x1: 14, z0: 0, z1: 10 }, pool, { x0: sch.x0 - 0.2, x1: sch.x1 + 0.2, z0: sch.z0 - 0.2, z1: sch.z1 + 0.2 },
    { x0: KS.x0 - ksW, x1: KS.x1 + ksW, z0: 10, z1: KS.z1 + ksW }, ...fremd]) rects = minus(rects, l);
  const gras = texMat('gras', 1);
  for (const r of rects) {
    flaeche(r.x0, r.x1, r.z0, r.z1, -0.005, gras, 4);
    bau.kollider((r.x0 + r.x1) / 2, -0.25, (r.z0 + r.z1) / 2, r.x1 - r.x0, 0.5, r.z1 - r.z0);
  }
  // Ränder der Welt: unsichtbare Wände (die Autos fahren trotzdem durch – die sind ja keine Physik)
  for (const [x0, x1, z0, z1] of [[W.x0 - 1, W.x0, W.z0, W.z1], [W.x1, W.x1 + 1, W.z0, W.z1], [W.x0, W.x1, W.z0 - 1, W.z0], [W.x0, W.x1, W.z1, W.z1 + 1]])
    bau.kollider((x0 + x1) / 2, 3, (z0 + z1) / 2, x1 - x0, 8, z1 - z0);

  // ---------- Straße ----------
  const S = P.strasse;
  const asphalt = mat('#4A4D52', { r: 0.95 }), weiss = mat('#F4F4F0', { r: 0.6 });
  flaeche(S.x0, S.x1, S.z0, S.z1, 0.004, asphalt, 3);
  const mitteZ = (S.z0 + S.z1) / 2;
  for (let x = S.x0; x < S.x1; x += 3) {              // gestrichelte Mittellinie (nicht auf den Übergängen)
    if ((x + 1.6 > P.zebra.x0 - 0.5 && x < P.zebra.x1 + 0.5) || (x + 1.6 > P.ampel.x0 - 1.5 && x < P.ampel.x1 + 1.5)) continue;
    kiste(x, x + 1.6, 0.004, 0.012, mitteZ - 0.07, mitteZ + 0.07, weiss, false);
  }
  for (const z of [S.z0 + 0.25, S.z1 - 0.25]) kiste(S.x0, S.x1, 0.004, 0.011, z - 0.06, z + 0.06, weiss, false);
  // Zebrastreifen: weiße Balken quer über die Straße
  for (let z = S.z0 + 0.3; z < S.z1 - 0.3; z += 1.0) kiste(P.zebra.x0, P.zebra.x1, 0.004, 0.014, z, z + 0.5, weiss, false);
  // Ampel-Übergang: zwei gestrichelte Linien + Haltelinien
  for (const x of [P.ampel.x0, P.ampel.x1]) for (let z = S.z0; z < S.z1; z += 0.6) kiste(x - 0.06, x + 0.06, 0.004, 0.013, z, z + 0.35, weiss, false);
  kiste(P.ampel.x0 - 0.9, P.ampel.x0 - 0.6, 0.004, 0.013, mitteZ, S.z1 - 0.3, weiss, false);
  kiste(P.ampel.x1 + 0.6, P.ampel.x1 + 0.9, 0.004, 0.013, S.z0 + 0.3, mitteZ, weiss, false);
  // Gehwege (10 cm hoch, mit Bordstein)
  const pfl = new T.MeshStandardMaterial({ map: pflaster(), roughness: 0.9 }), bord = mat('#B8B4AC', { r: 0.8 });
  for (const gw of [P.gehwegN, P.gehwegS]) {
    flaeche(S.x0, S.x1, gw.z0, gw.z1, 0.1, pfl, 1);
    bau.kollider((S.x0 + S.x1) / 2, 0.05, (gw.z0 + gw.z1) / 2, S.x1 - S.x0, 0.1, gw.z1 - gw.z0);
    const zb = gw === P.gehwegN ? gw.z0 : gw.z1 - 0.15;
    kiste(S.x0, S.x1, 0, 0.1, zb, zb + 0.15, bord, false);
  }
  // abgesenkte Bordsteine am Zebrastreifen/Ampel (kleine Rampen) – nur Deko, die Katze hüpft eh
  // Straßenlaternen
  const grau = mat('#5E646B', { r: 0.5, m: 0.4 }), birne = mat('#FFF3C4', { e: 0xFFE7A0, ei: 0.6 });
  for (let x = -34; x < 58; x += 16) for (const z of [-8.6, -16.4]) {
    const st = new T.Mesh(new T.CylinderGeometry(0.06, 0.08, 4.2, 8), grau); st.position.set(x, 2.1, z); st.castShadow = true; g.add(st);
    const arm = new T.Mesh(new T.BoxGeometry(0.08, 0.08, 0.9), grau); arm.position.set(x, 4.15, z + (z > -12 ? -0.4 : 0.4)); g.add(arm);
    const lampe = new T.Mesh(new T.BoxGeometry(0.3, 0.12, 0.45), birne); lampe.position.set(x, 4.08, z + (z > -12 ? -0.8 : 0.8)); g.add(lampe);
    bau.kollider(x, 2.1, z, 0.16, 4.2, 0.16);
  }

  // ---------- Bäume, Büsche, Zaun ----------
  const baum = (x, z, s = 1) => {
    const st = new T.Mesh(new T.CylinderGeometry(0.15 * s, 0.22 * s, 2 * s, 8), mat('#7A5230')); st.position.set(x, s, z); st.castShadow = true; g.add(st);
    bau.kollider(x, s, z, 0.35 * s, 2 * s, 0.35 * s);
    for (let i = 0; i < 4; i++) {
      const k = new T.Mesh(new T.SphereGeometry((1.1 - i * 0.12) * s, 12, 10), mat(i % 2 ? '#4FA34A' : '#3E8E3E'));
      k.position.set(x + Math.cos(i * 1.7) * 0.5 * s, (2.2 + i * 0.35) * s, z + Math.sin(i * 1.7) * 0.5 * s); k.castShadow = true; g.add(k);
    }
  };
  for (const [x, z, s] of [[-4, 13, 1.3], [19, 12, 1.1], [-5, -3, 1.0], [18, -3.5, 1.4], [16, 25, 1.2], [-5, 26, 1.1], [-12, -12.5 + 20, 1.2],
    [-20, 5, 1.4], [35, 4, 1.2], [44, -2, 1.0], [-28, -2, 1.3], [32, -26, 1.2], [-8, -27, 1.1], [13, -27, 1.0], [-30, -27, 1.3], [45, -27, 1.4], [30, 18, 1.3], [-20, 22, 1.2]])
    if (!fremd.some(l => x > l.x0 - 2 && x < l.x1 + 2 && z > l.z0 - 2 && z < l.z1 + 2)) baum(x, z, s);
  const busch = mat('#5DB04F');
  for (const [x, z] of [[1.5, -5.2], [3.5, -5.2], [10.5, -5.2], [12.5, -5.3], [-1.2, 6], [15.5, 6], [20.5, 20], [-6.5, 18]]) {
    const b = new T.Mesh(new T.SphereGeometry(0.5, 12, 10), busch); b.scale.y = 0.7; b.position.set(x, 0.3, z); b.castShadow = true; g.add(b);
  }
  // Büsche vor dem geheimen Loch ins Spielzimmer (man kann durchlaufen)
  for (const [x, z, s] of [[0.45, 25.05, 0.9], [0.4, 25.95, 0.95], [-0.1, 25.5, 0.8]]) {
    const b = new T.Mesh(new T.SphereGeometry(0.55 * s, 12, 10), busch); b.scale.y = 0.75; b.position.set(x, 0.32 * s, z); b.castShadow = true; g.add(b);
  }

  // ---------- Kellerschacht: Geheimgang vom Keller in den Garten ----------
  // Ein tiefes Loch neben dem Haus. Unten die Katzenklappe in den Keller, an den Wänden Bretter zum Hochhüpfen.
  const beton = mat('#A8A39A', { r: 0.95 }), brett = mat('#E8A85C');
  kiste(KS.x0 - ksW, KS.x0, KS.tief, 0, 10.125, KS.z1 + ksW, beton);
  kiste(KS.x1, KS.x1 + ksW, KS.tief, 0, 10.125, KS.z1 + ksW, beton);
  kiste(KS.x0, KS.x1, KS.tief, 0, KS.z1, KS.z1 + ksW, beton);
  kiste(KS.x0, KS.x1, KS.tief - 0.1, KS.tief, 10.125, KS.z1, beton);
  for (const [x0, x1, y] of [[KS.x0, KS.x0 + 0.45, -2.2], [KS.x1 - 0.45, KS.x1, -1.55], [KS.x0, KS.x0 + 0.45, -0.9]])
    kiste(x0, x1, y - 0.05, y, KS.z1 - 0.5, KS.z1, brett);

  // ---------- Kletterbaum mit Höhle ----------
  // Dicker Stamm, Höhle nach Osten (dort ist ein Versteck), Baumpilze als Stufen bis hoch in die Krone.
  const KB = P.kletterbaum, bx = KB.x, bz = KB.z, rr = 0.45, hoehleU = 1.3, hoehleO = 1.85;
  {
    const rinde = mat('#7A5230', { r: 0.95 }), dunkel = mat('#2E1E10', { r: 1 });
    const zylT = (r1, r2, y0, y1, m, opts) => { const me = new T.Mesh(new T.CylinderGeometry(r1, r2, y1 - y0, 16, 1, ...(opts || [])), m); me.position.set(bx, (y0 + y1) / 2, bz); me.castShadow = me.receiveShadow = true; g.add(me); return me; };
    zylT(rr, rr * 1.3, 0, hoehleU, rinde);
    zylT(rr * 0.8, rr, hoehleO, 3.6, rinde);
    // Ring um die Höhle – vorne (Osten = +x) offen. In three.js zeigt Winkel π/2 nach +x.
    const auf = 1.0, rest = [true, Math.PI / 2 + auf, Math.PI * 2 - 2 * auf];
    zylT(rr, rr, hoehleU, hoehleO, rinde, rest);
    const innen = new T.MeshStandardMaterial({ color: '#2E1E10', roughness: 1, side: T.BackSide });
    zylT(rr * 0.92, rr * 0.92, hoehleU, hoehleO, innen, rest);
    const moos = new T.Mesh(new T.CylinderGeometry(rr * 0.9, rr * 0.9, 0.03, 16), mat('#6B8E3A', { r: 1 })); moos.position.set(bx, hoehleU + 0.015, bz); g.add(moos);
    const deckel = new T.Mesh(new T.CylinderGeometry(rr * 0.9, rr * 0.9, 0.02, 16), dunkel); deckel.position.set(bx, hoehleO - 0.01, bz); g.add(deckel);
    // Krone
    for (let i = 0; i < 5; i++) {
      const k = new T.Mesh(new T.SphereGeometry(1.5 - i * 0.12, 14, 10), mat(i % 2 ? '#4FA34A' : '#3E8E3E'));
      k.position.set(bx + Math.cos(i * 1.3) * 0.7, 4.1 + i * 0.3, bz + Math.sin(i * 1.3) * 0.7); k.castShadow = true; g.add(k);
    }
    // Ast nach Osten (Ausguck)
    const ast = new T.Mesh(new T.CylinderGeometry(0.09, 0.13, 1.6, 8), rinde); ast.rotation.z = Math.PI / 2; ast.position.set(bx + 1.1, 3.35, bz); ast.castShadow = true; g.add(ast);
  }
  // Physik: Stamm unten, Stamm oben, drei Wände der Höhle
  bau.kollider(bx, hoehleU / 2, bz, rr * 2, hoehleU, rr * 2);
  bau.kollider(bx, (hoehleO + 3.6) / 2, bz, rr * 1.7, 3.6 - hoehleO, rr * 1.7);
  const hm = (hoehleU + hoehleO) / 2, hh = hoehleO - hoehleU;
  bau.kollider(bx - 0.29, hm, bz, 0.3, hh, rr * 2);
  bau.kollider(bx + 0.14, hm, bz - 0.34, 0.56, hh, 0.16);
  bau.kollider(bx + 0.14, hm, bz + 0.34, 0.56, hh, 0.16);
  bau.kollider(bx + 1.1, 3.35, bz, 1.6, 0.18, 0.2);
  // Baumpilze als Treppe: Osten (unter der Höhle), Süden, Westen, Norden
  const pilz = mat('#E8C07A', { r: 0.7 });
  for (const [dx, dz, y] of [[0.62, 0, 0.7], [0, 0.62, 1.45], [-0.62, 0, 2.15], [0, -0.62, 2.8]]) {
    const p = new T.Mesh(new T.CylinderGeometry(0.24, 0.2, 0.08, 14, 1, false, 0, Math.PI * 2), pilz);
    p.position.set(bx + dx, y - 0.04, bz + dz); p.scale.set(dx ? 0.8 : 1, 1, dz ? 0.8 : 1); p.castShadow = true; g.add(p);
    bau.kollider(bx + dx, y - 0.04, bz + dz, dx ? 0.38 : 0.44, 0.08, dz ? 0.38 : 0.44);
  }

  const zaun = mat('#F4F1EA'), Gt = P.garten;
  const zaunStueck = (ax, az, bx, bz) => {          // Latten + Querbalken + unsichtbare Wand (die Katze kann drüberspringen)
    const l = Math.hypot(bx - ax, bz - az), n = Math.round(l / 0.5);
    for (let i = 0; i <= n; i++) { const t = i / n, p = new T.Mesh(new T.BoxGeometry(0.08, 0.8, 0.08), zaun); p.position.set(ax + (bx - ax) * t, 0.4, az + (bz - az) * t); p.castShadow = true; g.add(p); }
    for (const y of [0.25, 0.6]) { const q = new T.Mesh(new T.BoxGeometry(Math.abs(bx - ax) + 0.04, 0.06, Math.abs(bz - az) + 0.04), zaun); q.position.set((ax + bx) / 2, y, (az + bz) / 2); g.add(q); }
    bau.kollider((ax + bx) / 2, 0.4, (az + bz) / 2, Math.abs(bx - ax) + 0.08, 0.8, Math.abs(bz - az) + 0.08);
  };
  zaunStueck(Gt.x0, Gt.z0, P.tor.x0, Gt.z0); zaunStueck(P.tor.x1, Gt.z0, Gt.x1, Gt.z0);
  zaunStueck(Gt.x0, Gt.z0, Gt.x0, Gt.z1); zaunStueck(Gt.x1, Gt.z0, Gt.x1, Gt.z1); zaunStueck(Gt.x0, Gt.z1, Gt.x1, Gt.z1);
  // Gartenweg zur Haustür
  flaeche(P.tor.x0 + 0.1, P.tor.x1 - 0.1, Gt.z0, 0, 0.006, pfl, 1);

  // ---------- Gebäude gegenüber ----------
  const lampen = [];
  function gebaeude(d, wand, dach, boden) {
    const t = 0.2, front = d.z1;                      // Vorderseite mit Tür zeigt zur Straße (+z)
    const wm = mat(wand, { r: 0.9 }), innen = mat('#F7F0E3', { r: 0.9 });
    // Boden innen
    flaeche(d.x0 + t, d.x1 - t, d.z0 + t, d.z1 - t, 0.012, texMat(boden, 0.5), boden === 'holz' ? 1.6 : 1.2);
    const hoch = d.h, tb = 1.4, th = 2.2;
    // Wände: hinten, links, rechts, vorne (mit Tür)
    kiste(d.x0, d.x1, 0, hoch, d.z0, d.z0 + t, wm);
    kiste(d.x0, d.x0 + t, 0, hoch, d.z0, d.z1, wm);
    kiste(d.x1 - t, d.x1, 0, hoch, d.z0, d.z1, wm);
    kiste(d.x0, d.tuer - tb / 2, 0, hoch, front - t, front, wm);
    kiste(d.tuer + tb / 2, d.x1, 0, hoch, front - t, front, wm);
    kiste(d.tuer - tb / 2, d.tuer + tb / 2, th, hoch, front - t, front, wm);
    // Innenseiten heller anmalen (dünne Haut, nicht fest)
    kiste(d.x0 + t, d.x1 - t, 0, hoch, d.z0 + t, d.z0 + t + 0.01, innen, false);
    kiste(d.x0 + t, d.x0 + t + 0.01, 0, hoch, d.z0 + t, d.z1 - t, innen, false);
    kiste(d.x1 - t - 0.01, d.x1 - t, 0, hoch, d.z0 + t, d.z1 - t, innen, false);
    // Türrahmen
    const rahmen = mat('#FBFAF6', { r: 0.5 });
    kiste(d.tuer - tb / 2 - 0.08, d.tuer - tb / 2, 0, th + 0.08, front - 0.02, front + 0.03, rahmen, false);
    kiste(d.tuer + tb / 2, d.tuer + tb / 2 + 0.08, 0, th + 0.08, front - 0.02, front + 0.03, rahmen, false);
    kiste(d.tuer - tb / 2, d.tuer + tb / 2, th, th + 0.08, front - 0.02, front + 0.03, rahmen, false);
    // Fenster (Deko auf beiden Seiten der Wand)
    const glas = mat('#9FD4F2', { r: 0.15, m: 0.2 });
    for (let x = d.x0 + 1.5; x < d.x1 - 1; x += 2.6) {
      if (Math.abs(x - d.tuer) < 1.6) continue;
      kiste(x - 0.65, x + 0.65, 0.9, 2.1, front - 0.01, front + 0.03, rahmen, false);
      kiste(x - 0.55, x + 0.55, 1.0, 2.0, front - 0.01, front + 0.045, glas, false);
      kiste(x - 0.55, x + 0.55, 1.0, 2.0, front - t - 0.03, front - t + 0.01, glas, false);
    }
    // Decke + Dach
    kiste(d.x0, d.x1, hoch, hoch + 0.2, d.z0, d.z1, mat('#F6F3EE', { r: 0.95 }));
    const dm = mat(dach, { r: 0.8 }), dh = 1.6, ueber = 0.4, tiefe = d.z1 - d.z0;
    const schraeg = Math.hypot(tiefe / 2 + ueber, dh);
    for (const s of [-1, 1]) {
      const p = new T.Mesh(new T.BoxGeometry(d.x1 - d.x0 + 2 * ueber, 0.15, schraeg), dm);
      p.position.set((d.x0 + d.x1) / 2, hoch + 0.2 + dh / 2, (d.z0 + d.z1) / 2 + s * (tiefe / 4 + ueber / 2));
      p.rotation.x = s * Math.atan2(dh, tiefe / 2 + ueber); p.castShadow = true; g.add(p);
    }
    const giebel = new T.Shape([new T.Vector2(-tiefe / 2, 0), new T.Vector2(tiefe / 2, 0), new T.Vector2(0, dh)]);
    for (const x of [d.x0, d.x1]) {
      const m = new T.Mesh(new T.ExtrudeGeometry(giebel, { depth: 0.2, bevelEnabled: false }), wm);
      m.rotation.y = Math.PI / 2; m.position.set(x - 0.1, hoch + 0.2, (d.z0 + d.z1) / 2); m.castShadow = true; g.add(m);
    }
    const l = new T.PointLight('#FFE2B8', 5, Math.max(d.x1 - d.x0, tiefe) * 0.9, 1.4);
    l.position.set((d.x0 + d.x1) / 2, hoch - 0.5, (d.z0 + d.z1) / 2); scene.add(l); lampen.push(l);
  }

  // Innenwand (gerade, entlang x oder z) mit Türen und Katzenklappen.
  // oe = [{ typ: 'tuer' | 'klappe', pos }]  – pos = Mitte der Öffnung, gemessen ab a
  const raeume = [];
  function innenwand(a, b, hoch, farbe, oe = []) {
    const t = 0.2, langX = a[1] === b[1], quer = langX ? a[1] : a[0], s0 = langX ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]);
    const len = Math.abs(langX ? b[0] - a[0] : b[1] - a[1]), wm = mat(farbe, { r: 0.92 });
    const stueck = (u0, u1, y0, y1) => { if (u1 - u0 < 0.01) return;
      langX ? kiste(s0 + u0, s0 + u1, y0, y1, quer - t / 2, quer + t / 2, wm) : kiste(quer - t / 2, quer + t / 2, y0, y1, s0 + u0, s0 + u1, wm); };
    let u = 0;
    for (const o of [...oe].sort((p, q) => p.pos - q.pos)) {
      const br = o.typ === 'klappe' ? 0.38 : 1.0, ho = o.typ === 'klappe' ? 0.42 : 2.1;
      stueck(u, o.pos - br / 2, 0, hoch); stueck(o.pos - br / 2, o.pos + br / 2, ho, hoch);
      if (o.typ === 'klappe') {            // orangener Rahmen: hier passt nur eine Katze durch
        const r = mat('#E8A85C'), x0 = s0 + o.pos - br / 2 - 0.03, x1 = s0 + o.pos + br / 2 + 0.03;
        langX ? kiste(x0, x1, ho, ho + 0.04, quer - t / 2 - 0.01, quer + t / 2 + 0.01, r, false) : kiste(quer - t / 2 - 0.01, quer + t / 2 + 0.01, ho, ho + 0.04, x0, x1, r, false);
      }
      u = o.pos + br / 2;
    }
    stueck(u, len, 0, hoch);
  }
  // Leuchtende Lampe an der Decke (ohne echtes Licht – das wäre zu teuer)
  function deckenlampe(x, z, y, farbe = '#FFE9B8') {
    const m = new T.Mesh(new T.SphereGeometry(0.16, 12, 8), mat(farbe, { e: farbe, ei: 1.5 })); m.position.set(x, y - 0.2, z); lose.add(m);
  }

  // Nachbarhaus: vorne Flur + Essen, hinten Wohnzimmer und zwei Geheimräume (nur durch Katzenklappen)
  const N = P.nachbar;
  gebaeude(N, '#BFD8E8', '#5C6E8C', 'holz');
  innenwand([N.x0, -28], [N.x1, -28], N.h, '#F7F0E3', [{ typ: 'tuer', pos: 6 }]);
  innenwand([2, N.z0], [2, -28], N.h, '#F3E2F0', [{ typ: 'klappe', pos: 1.5 }]);
  innenwand([6.5, N.z0], [6.5, -28], N.h, '#E2F0F3', [{ typ: 'klappe', pos: 2.0 }]);
  raeume.push({ haus: 'Nachbarhaus', name: 'Geheimes Wollzimmer', x0: N.x0, x1: 2, z0: N.z0, z1: -28, geheim: true },
              { haus: 'Nachbarhaus', name: 'Wohnzimmer', x0: 2, x1: 6.5, z0: N.z0, z1: -28 },
              { haus: 'Nachbarhaus', name: 'Geheime Schatzkammer', x0: 6.5, x1: N.x1, z0: N.z0, z1: -28, geheim: true },
              { haus: 'Nachbarhaus', name: 'Flur und Esszimmer', x0: N.x0, x1: N.x1, z0: -28, z1: N.z1 });
  deckenlampe(4.25, -29.5, N.h); deckenlampe(0, -29.5, N.h, '#F8C8E8'); deckenlampe(8.25, -29.5, N.h, '#C8F0F8');
  for (const o of [
    // Wohnzimmer
    { typ: 'sofa', x: 4.25, z: -30.3, rot: 0 }, { typ: 'couchtisch', x: 4.25, z: -29.1 }, { typ: 'vase', x: 4.05, z: -29.1, y: 0.45 },
    { typ: 'teppich', x: 4.25, z: -29.2 },
    // Geheimes Wollzimmer: Kissen, ganz viel Wolle, Spielzeugmaus
    { typ: 'katzenkissen', x: 0.2, z: -30.2 }, { typ: 'kuscheldecke', x: -1.2, z: -29.0 }, { typ: 'wollknaeuel', x: -1.4, z: -30.4 },
    { typ: 'wollknaeuel', x: 1.2, z: -29.0 }, { typ: 'wollknaeuel', x: -0.5, z: -28.6 }, { typ: 'spielzeugmaus', x: 0.9, z: -30.5 },
    // Geheime Schatzkammer: Truhe, Kisten, Diamant
    { typ: 'truhe', x: 8.3, z: -30.55, rot: 0 }, { typ: 'kiste', x: 9.6, z: -30.6 }, { typ: 'kiste', x: 9.6, z: -30.0 }, { typ: 'kiste', x: 9.6, z: -30.3, y: 0.5 },
    { typ: 'diamant', x: 8.3, z: -30.55, y: 0.6 }, { typ: 'katzenkissen', x: 8.0, z: -28.9 },
    // vorne
    { typ: 'sessel', x: -1.2, z: -26.5, rot: 90 }, { typ: 'regal', x: 1.0, z: -27.65, rot: 0 },
    { typ: 'buch', x: 0.7, z: -27.65, y: 1.8 }, { typ: 'wecker', x: 1.3, z: -27.65, y: 1.8 }, { typ: 'pflanze', x: 9.4, z: -27.5 },
    { typ: 'esstisch', x: 6.5, z: -26.0 }, { typ: 'stuhl', x: 6.0, z: -25.3, rot: 180 }, { typ: 'stuhl', x: 7.0, z: -26.7 },
    { typ: 'tasse', x: 6.3, z: -26.0, y: 0.75 }, { typ: 'teller', x: 6.8, z: -26.1, y: 0.75 }, { typ: 'vase', x: 9.4, z: -23.0, y: 0.85 },
    { typ: 'kommode', x: 9.5, z: -23.0, rot: 270 }, { typ: 'kratzbaum', x: -1.4, z: -22.2 }, { typ: 'napf', x: 0.0, z: -22.0 },
    { typ: 'ball', x: 3.0, z: -24.5 }, { typ: 'wollknaeuel', x: 0.5, z: -25.5 },
  ]) bau.stelle(o, 0, -1, g);
  // Restaurant
  const RS = P.restaurant;
  gebaeude(RS, '#F2D3A2', '#9C3B2E', 'fliesen');
  const s = schild('RESTAURANT', 4.2, 0.7, '#9C3B2E', '#FFF4D6'); s.position.set(RS.tuer, 2.75, RS.z1 + 0.03); g.add(s);
  // Markise rot-weiß über der Tür
  for (let i = 0; i < 8; i++) {
    const m = new T.Mesh(new T.BoxGeometry(0.4, 0.04, 1.2), mat(i % 2 ? '#FFFFFF' : '#D9433A', { r: 0.8 }));
    m.position.set(RS.tuer - 1.4 + i * 0.4, 2.35, RS.z1 + 0.6); m.rotation.x = 0.25; m.castShadow = true; g.add(m);
  }
  // Hinten: Küche und zwei Geheimräume. Davor die Theke.
  const KW = -28.4;                                   // Wand zwischen Gastraum und Küche
  innenwand([RS.x0, KW], [RS.x1, KW], RS.h, '#F7F0E3', [{ typ: 'tuer', pos: 10.6 }]);
  innenwand([19, RS.z0], [19, KW], RS.h, '#F4E6C8', [{ typ: 'klappe', pos: 1.3 }]);
  innenwand([22, RS.z0], [22, KW], RS.h, '#F6D9D9', [{ typ: 'klappe', pos: 1.3 }]);
  raeume.push({ haus: 'Restaurant', name: 'Geheime Vorratskammer', x0: RS.x0, x1: 19, z0: RS.z0, z1: KW, geheim: true },
              { haus: 'Restaurant', name: 'Geheimes Katzen-Café', x0: 19, x1: 22, z0: RS.z0, z1: KW, geheim: true },
              { haus: 'Restaurant', name: 'Küche', x0: 22, x1: RS.x1, z0: RS.z0, z1: KW },
              { haus: 'Restaurant', name: 'Gastraum', x0: RS.x0, x1: RS.x1, z0: KW, z1: RS.z1 });
  deckenlampe(17.5, -29.7, RS.h, '#FFD9A0'); deckenlampe(20.5, -29.7, RS.h, '#F8C8E8'); deckenlampe(26, -29.7, RS.h);
  const thZ = KW + 0.15;
  kiste(18, 24, 0, 1.05, thZ, thZ + 0.65, '#8B5A36');
  kiste(17.95, 24.05, 1.05, 1.1, thZ - 0.05, thZ + 0.7, '#E8E1D4', false);
  for (const [x, f] of [[18.6, '#E74C3C'], [19.4, '#27AE60'], [23.4, '#F1C40F']]) {   // Flaschen auf der Theke (Deko)
    const b = new T.Mesh(new T.CylinderGeometry(0.04, 0.05, 0.3, 8), mat(f, { r: 0.2 })); b.position.set(x, 1.25, thZ + 0.3); g.add(b);
  }
  for (const o of [
    // Küche
    { typ: 'kuechenzeile', x: 25.5, z: -30.65, rot: 0 }, { typ: 'kuehlschrank', x: 29.4, z: -30.6, rot: 0 }, { typ: 'topf', x: 24.8, z: -30.65, y: 0.9 },
    { typ: 'kiste', x: 22.5, z: -30.6 },
    // Geheime Vorratskammer: Regal mit Gläsern, Kisten, Kissen
    { typ: 'regal', x: 17.5, z: -30.65, rot: 0 }, { typ: 'glas', x: 17.2, z: -30.65, y: 1.8 }, { typ: 'glas', x: 17.8, z: -30.65, y: 1.8 },
    { typ: 'kiste', x: 16.5, z: -28.95 }, { typ: 'kiste', x: 17.1, z: -28.95 }, { typ: 'katzenkissen', x: 18.2, z: -29.3 },
    // Geheimes Katzen-Café: Napf, Teller, Kissen, Ball
    { typ: 'napf', x: 20.0, z: -30.5 }, { typ: 'napf', x: 20.6, z: -30.5 }, { typ: 'katzenkissen', x: 20.5, z: -29.2 },
    { typ: 'teppich', x: 20.5, z: -29.6, breite: 2.4, tiefe: 1.8, farbe: '#C0392B' }, { typ: 'ball', x: 21.4, z: -29.0 },
  ]) bau.stelle(o, 0, -1, g);
  // Tische mit Resten
  const tische = [];
  const weissMat = mat('#FFFFFF', { r: 0.3 }), tuch = mat('#F7EFE2', { r: 0.9 }), bein = mat('#5A3A22');
  for (const [x, z] of [[18.5, -22.6], [27.5, -22.6], [18.5, -26.0], [21.8, -26.0], [25.0, -26.0], [28.0, -26.6]]) {
    const top = 0.75;
    const p = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.05, 20), tuch); p.position.set(x, top - 0.025, z); p.castShadow = p.receiveShadow = true; g.add(p);
    const b = new T.Mesh(new T.CylinderGeometry(0.05, 0.07, top - 0.05, 8), bein); b.position.set(x, (top - 0.05) / 2, z); g.add(b);
    const f = new T.Mesh(new T.CylinderGeometry(0.25, 0.28, 0.03, 12), bein); f.position.set(x, 0.015, z); g.add(f);
    bau.kollider(x, top - 0.025, z, 0.86, 0.05, 0.86);
    bau.kollider(x, (top - 0.05) / 2, z, 0.1, top - 0.05, 0.1);
    for (const [dx, dz, r] of [[0, 0.75, 180], [0, -0.75, 0]]) bau.stelle({ typ: 'stuhl', x: x + dx, z: z + dz, rot: r }, 0, -1, g);
    const teller = new T.Mesh(new T.CylinderGeometry(0.15, 0.12, 0.025, 16), weissMat); teller.position.set(x + 0.1, top + 0.012, z); lose.add(teller);
    const rest = reste(tische.length); rest.position.set(x + 0.1, top + 0.025, z); lose.add(rest);
    tische.push({ x, z, top, rest, voll: true, warte: 0, name: rest.userData.name });
  }

  // ---------- Garten hinter dem Haus: Terrasse, Pool, Rutsche ----------
  const Te = P.terrasse;
  const deck = texMat('holz', 0.7);
  flaeche(Te.x0, Te.x1, Te.z0, Te.z1, Te.h, deck, 1.6, Te.h);
  bau.kollider((Te.x0 + Te.x1) / 2, Te.h / 2, (Te.z0 + Te.z1) / 2, Te.x1 - Te.x0, Te.h, Te.z1 - Te.z0);
  // Liegestühle + Sonnenschirm (Deko, man kann drauf liegen)
  for (const x of [1.5, 3.2]) {
    kiste(x - 0.3, x + 0.3, Te.h, Te.h + 0.3, 11.2, 12.8, '#FFFFFF');
    const lehne = new T.Mesh(new T.BoxGeometry(0.6, 0.05, 0.6), mat('#4AA3DF', { r: 0.8 })); lehne.position.set(x, Te.h + 0.5, 11.15); lehne.rotation.x = -0.9; g.add(lehne);
    kiste(x - 0.28, x + 0.28, Te.h + 0.3, Te.h + 0.34, 11.4, 12.7, mat('#4AA3DF', { r: 0.8 }), false);
  }
  const schirm = new T.Mesh(new T.ConeGeometry(1.4, 0.5, 8), mat('#F39C12', { r: 0.8 })); schirm.position.set(8.6, 2.4, 11.8); schirm.castShadow = true; g.add(schirm);
  const stange = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 2.3), mat('#EEE')); stange.position.set(8.6, 1.2, 11.8); g.add(stange);
  // Pool: Wände, Boden, Rand, Tunnel-Loch in der Südwand
  const fl = mat('#7DD3EE', { r: 0.35 }), rand = mat('#E9E4DA', { r: 0.7 }), w = pool.wand, B = pool.boden, Tu = P.tunnel;
  kiste(pool.x0, pool.x1, B - 0.2, B, pool.z0, pool.z1, fl);                                  // Boden
  kiste(pool.x0, pool.x0 + w, B, 0, pool.z0, pool.z1, fl); kiste(pool.x1 - w, pool.x1, B, 0, pool.z0, pool.z1, fl);
  kiste(pool.x0 + w, pool.x1 - w, B, 0, pool.z0, pool.z0 + w, fl);
  kiste(pool.x0 + w, Tu.x0, B, 0, pool.z1 - w, pool.z1, fl); kiste(Tu.x1, pool.x1 - w, B, 0, pool.z1 - w, pool.z1, fl);
  kiste(Tu.x0, Tu.x1, Tu.y1, 0, pool.z1 - w, pool.z1, fl);
  for (const [x0, x1, z0, z1] of [[pool.x0 - 0.3, pool.x1 + 0.3, pool.z0 - 0.3, pool.z0], [pool.x0 - 0.3, pool.x1 + 0.3, pool.z1, pool.z1 + 0.3], [pool.x0 - 0.3, pool.x0, pool.z0, pool.z1], [pool.x1, pool.x1 + 0.3, pool.z0, pool.z1]])
    kiste(x0, x1, -0.01, 0.05, z0, z1, rand, false);
  // Leiter (Deko)
  for (const dx of [-0.2, 0.2]) { const st = new T.Mesh(new T.TorusGeometry(0.25, 0.025, 6, 12, Math.PI), mat('#D8D8D8', { m: 0.8, r: 0.3 })); st.position.set(8.0 + dx, 0.0, pool.z0 + 0.25); st.rotation.y = Math.PI / 2; g.add(st); }
  // Tunnel unter dem Rasen (dunkel, geheimnisvoll) + Schacht nach oben
  const stein = mat('#4E6E7A', { r: 0.8 });
  kiste(Tu.x0, Tu.x1, Tu.y0 - 0.2, Tu.y0, Tu.z0, Tu.z1, stein); kiste(Tu.x0, Tu.x1, Tu.y1, Tu.y1 + 0.2, Tu.z0, Tu.z1, stein);
  kiste(Tu.x0 - 0.2, Tu.x0, Tu.y0, Tu.y1, Tu.z0, Tu.z1, stein); kiste(Tu.x1, Tu.x1 + 0.2, Tu.y0, Tu.y1, Tu.z0, Tu.z1, stein);
  kiste(sch.x0, sch.x1, B - 0.2, B, sch.z0, sch.z1, stein);
  kiste(sch.x0 - 0.2, sch.x0, B, 0, sch.z0 - 0.2, sch.z1 + 0.2, stein); kiste(sch.x1, sch.x1 + 0.2, B, 0, sch.z0 - 0.2, sch.z1 + 0.2, stein);
  kiste(sch.x0, sch.x1, B, 0, sch.z1, sch.z1 + 0.2, stein);
  kiste(sch.x0, Tu.x0, B, 0, sch.z0 - 0.2, sch.z0, stein); kiste(Tu.x1, sch.x1, B, 0, sch.z0 - 0.2, sch.z0, stein); kiste(Tu.x0, Tu.x1, Tu.y1, 0, sch.z0 - 0.2, sch.z0, stein);
  // Leuchtsteine im Tunnel, damit man den Weg findet
  for (let z = Tu.z0 + 0.6; z < Tu.z1; z += 1.1) { const l = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), mat('#9FFFE0', { e: 0x7FFFD0, ei: 1.5 })); l.position.set(Tu.x0 + 0.05, Tu.y0 + 0.15, z); lose.add(l); }
  // Wasser
  const wasserMat = new T.MeshStandardMaterial({ color: '#3FB6E8', transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.1, depthWrite: false, side: T.DoubleSide });
  const flaecheW = (x0, x1, z0, z1, y) => { const m = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), wasserMat); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); lose.add(m); return m; };
  const pw = flaecheW(pool.x0 + w, pool.x1 - w, pool.z0 + w, pool.z1 - w, pool.wasser);
  flaecheW(sch.x0, sch.x1, sch.z0, sch.z1, pool.wasser);
  anim.push(z => { pw.position.y = pool.wasser + Math.sin(z * 1.3) * 0.006; wasserMat.opacity = 0.5 + Math.sin(z * 0.9) * 0.04; });
  // Wasser-Zonen (zum Schwimmen): flaeche = wo man Luft holt, luft:false = nur unter Wasser
  const wasser = [
    { name: 'Pool', x0: pool.x0 + w, x1: pool.x1 - w, z0: pool.z0 + w, z1: pool.z1 - w, y0: B, flaeche: pool.wasser },
    { name: 'Tunnel', x0: Tu.x0, x1: Tu.x1, z0: Tu.z0 - 0.3, z1: Tu.z1, y0: Tu.y0, flaeche: Tu.y1, luft: false },
    { name: 'Schacht', x0: sch.x0, x1: sch.x1, z0: sch.z0, z1: sch.z1, y0: B, flaeche: pool.wasser },
  ];

  // Rutschen-Turm mit Treppe
  const Tm = P.turm, holz = mat('#C98B4E', { r: 0.7 }), rot = mat('#E74C3C', { r: 0.5 });
  kiste(Tm.x0, Tm.x1, Tm.h - 0.1, Tm.h, Tm.z0, Tm.z1, holz);
  for (const [x, z] of [[Tm.x0 + 0.06, Tm.z0 + 0.06], [Tm.x1 - 0.06, Tm.z0 + 0.06], [Tm.x0 + 0.06, Tm.z1 - 0.06], [Tm.x1 - 0.06, Tm.z1 - 0.06]])
    kiste(x - 0.06, x + 0.06, 0, Tm.h + 0.6, z - 0.06, z + 0.06, holz);
  kiste(Tm.x0, Tm.x1, Tm.h + 0.5, Tm.h + 0.58, Tm.z0, Tm.z0 + 0.06, rot); kiste(Tm.x1 - 0.06, Tm.x1, Tm.h + 0.5, Tm.h + 0.58, Tm.z0, Tm.z1, rot);
  bau.kollider((Tm.x0 + Tm.x1) / 2, Tm.h + 0.3, Tm.z0 + 0.03, Tm.x1 - Tm.x0, 0.6, 0.06); bau.kollider(Tm.x1 - 0.03, Tm.h + 0.3, (Tm.z0 + Tm.z1) / 2, 0.06, 0.6, Tm.z1 - Tm.z0);
  const dachT = new T.Mesh(new T.ConeGeometry(0.95, 0.7, 4), rot); dachT.position.set((Tm.x0 + Tm.x1) / 2, Tm.h + 0.95, (Tm.z0 + Tm.z1) / 2); dachT.rotation.y = Math.PI / 4; g.add(dachT);
  const treppeL = 4.4, treppeA = Math.atan2(Tm.h, treppeL), n = 13;
  for (let i = 0; i < n; i++) {
    const zz = Tm.z1 + treppeL - (i + 1) * treppeL / n, y = (i + 1) * Tm.h / n;
    kiste(Tm.x0 + 0.1, Tm.x1 - 0.1, y - 0.05, y, zz, zz + treppeL / n + 0.02, holz, false);
  }
  for (const x of [Tm.x0 + 0.08, Tm.x1 - 0.08]) { const h = new T.Mesh(new T.BoxGeometry(0.06, 0.06, Math.hypot(treppeL, Tm.h)), holz); h.position.set(x, Tm.h / 2 + 0.5, Tm.z1 + treppeL / 2); h.rotation.x = treppeA; g.add(h); }
  bau.kollider((Tm.x0 + Tm.x1) / 2, Tm.h / 2 - 0.05, Tm.z1 + treppeL / 2, Tm.x1 - Tm.x0 - 0.2, 0.1, Math.hypot(treppeL, Tm.h), new T.Quaternion().setFromEuler(new T.Euler(treppeA, 0, 0)));
  // Die Rutsche selbst: eine gelbe Rinne entlang der Kurve (zum Rutschen braucht sie keine Physik)
  const kurve = new T.CatmullRomCurve3(RUTSCHE.map(p => new T.Vector3(...p)));
  const gelb = mat('#FFC928', { r: 0.35 });
  const seg = 28;
  for (let i = 0; i < seg; i++) {
    const a = kurve.getPointAt(i / seg), b = kurve.getPointAt((i + 1) / seg), l = a.distanceTo(b);
    const teil = new T.Group(); teil.position.copy(a).add(b).multiplyScalar(0.5); teil.position.y -= 0.08;
    teil.lookAt(b.x, b.y - 0.08, b.z);
    const boden = new T.Mesh(new T.BoxGeometry(0.5, 0.04, l + 0.03), gelb); teil.add(boden);
    for (const sx of [-0.25, 0.25]) { const r = new T.Mesh(new T.BoxGeometry(0.04, 0.16, l + 0.03), gelb); r.position.set(sx, 0.07, 0); teil.add(r); }
    teil.traverse(m => { if (m.isMesh) m.castShadow = true; });
    g.add(teil);
  }
  for (const t of [0.3, 0.55]) { const p = kurve.getPointAt(t), st = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, p.y), holz); st.position.set(p.x, p.y / 2 - 0.1, p.z); g.add(st); }

  // ---------- Geheimes Spielzimmer (Gartenhaus ohne Tür!) ----------
  const Sz = P.spielzimmer, gw = 0.2, sh = Sz.h;
  const huette = mat('#8DB36B', { r: 0.9 }), innenW = mat('#5B4A8C', { r: 0.9 });
  kiste(Sz.x0, Sz.x1, 0, sh, Sz.z0, Sz.z0 + gw, huette); kiste(Sz.x0, Sz.x1, 0, sh, Sz.z1 - gw, Sz.z1, huette);
  // Westwand mit kleinem Loch (42 cm hoch) – von draußen hinter den Büschen versteckt
  const BL = P.buschloch, lochH = 0.42;
  kiste(Sz.x0, Sz.x0 + gw, 0, sh, Sz.z0, BL.z0, huette); kiste(Sz.x0, Sz.x0 + gw, 0, sh, BL.z1, Sz.z1, huette);
  kiste(Sz.x0, Sz.x0 + gw, lochH, sh, BL.z0, BL.z1, huette);
  kiste(Sz.x1 - gw, Sz.x1, 0, sh, Sz.z0, Sz.z1, huette);
  for (const [x0, x1, z0, z1] of [[Sz.x0 + gw, Sz.x1 - gw, Sz.z0 + gw, Sz.z0 + gw + 0.01], [Sz.x0 + gw, Sz.x1 - gw, Sz.z1 - gw - 0.01, Sz.z1 - gw], [Sz.x1 - gw - 0.01, Sz.x1 - gw, Sz.z0 + gw, Sz.z1 - gw]])
    kiste(x0, x1, 0, sh, z0, z1, innenW, false);
  for (const [z0, z1, y0] of [[Sz.z0 + gw, BL.z0, 0], [BL.z1, Sz.z1 - gw, 0], [BL.z0, BL.z1, lochH]]) kiste(Sz.x0 + gw, Sz.x0 + gw + 0.01, y0, sh, z0, z1, innenW, false);
  kiste(Sz.x0 - 0.3, Sz.x1 + 0.3, sh, sh + 0.2, Sz.z0 - 0.3, Sz.z1 + 0.3, mat('#6B4A2E', { r: 0.9 }));
  // Holzboden (mit Loch für den Schacht)
  let br = [{ x0: Sz.x0 + gw, x1: Sz.x1 - gw, z0: Sz.z0 + gw, z1: Sz.z1 - gw }];
  br = minus(br, { x0: sch.x0 - 0.2, x1: sch.x1 + 0.2, z0: sch.z0 - 0.2, z1: sch.z1 + 0.2 });
  const parkett = texMat('holz', 0.6);
  for (const r of br) flaeche(r.x0, r.x1, r.z0, r.z1, 0.01, parkett, 1.6);
  for (const [x0, x1, z0, z1] of [[sch.x0 - 0.2, sch.x1 + 0.2, sch.z0 - 0.2, sch.z0], [sch.x0 - 0.2, sch.x1 + 0.2, sch.z1, sch.z1 + 0.2], [sch.x0 - 0.2, sch.x0, sch.z0, sch.z1], [sch.x1, sch.x1 + 0.2, sch.z0, sch.z1]])
    kiste(x0, x1, -0.01, 0.06, z0, z1, mat('#7DD3EE', { r: 0.35 }), false);
  // Möbel: Fernseher auf dem Schrank, Konsole, Sofa, Teppich, Sitzsack
  const tvX = 7.2, tvZ = Sz.z0 + gw + 0.25;
  bau.stelle({ typ: 'tvschrank', x: tvX, z: tvZ, rot: 0 }, 0, -1, g);
  bau.stelle({ typ: 'sofa', x: tvX, z: Sz.z1 - gw - 0.5, rot: 180 }, 0, -1, g);
  bau.stelle({ typ: 'teppich', x: tvX, z: 24.6 }, 0, -1, g);
  bau.stelle({ typ: 'katzenkissen', x: 2.0, z: 26.0 }, 0, -1, g);
  kiste(tvX - 0.7, tvX + 0.7, 0.55, 1.35, tvZ - 0.06, tvZ + 0.0, '#1A1A1F');
  kiste(tvX - 0.08, tvX + 0.08, 0.5, 0.56, tvZ - 0.06, tvZ, '#1A1A1F', false);
  const bild = document.createElement('canvas'); bild.width = 256; bild.height = 144;
  const bildTex = new T.CanvasTexture(bild); bildTex.colorSpace = T.SRGBColorSpace;
  const schirmTV = new T.Mesh(new T.PlaneGeometry(1.3, 0.72), new T.MeshBasicMaterial({ map: bildTex }));
  schirmTV.position.set(tvX, 0.95, tvZ + 0.005); lose.add(schirmTV);
  const konsole = new T.Group();
  const kk = new T.Mesh(new T.BoxGeometry(0.36, 0.07, 0.26), mat('#F4F4F6', { r: 0.4 })); konsole.add(kk);
  const lich = new T.Mesh(new T.BoxGeometry(0.2, 0.012, 0.01), mat('#4FC3F7', { e: 0x4FC3F7, ei: 2 })); lich.position.set(0, 0.0, 0.131); konsole.add(lich);
  konsole.position.set(tvX + 0.55, 0.535, tvZ + 0.05); konsole.traverse(m => { if (m.isMesh) m.castShadow = true; }); g.add(konsole);
  const pad = new T.Mesh(new T.BoxGeometry(0.16, 0.04, 0.09), mat('#2D2D35', { r: 0.5 })); pad.position.set(tvX - 0.4, 0.45, Sz.z1 - gw - 0.55); g.add(pad);
  const sack = new T.Mesh(new T.SphereGeometry(0.42, 16, 12), mat('#E74C8C', { r: 0.95 })); sack.scale.y = 0.6; sack.position.set(3.0, 0.25, 26.0); sack.castShadow = true; g.add(sack);
  bau.kollider(3.0, 0.2, 26.0, 0.6, 0.4, 0.6, null, { typ: 'katzenkissen', name: 'Sitzsack' });
  // Poster mit bunten Klötzchen
  const poster = document.createElement('canvas'); poster.width = 128; poster.height = 180;
  { const c = poster.getContext('2d'); c.fillStyle = '#1C1C3A'; c.fillRect(0, 0, 128, 180);
    const F = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9F45', '#3DE0E0'];
    for (let i = 0; i < 26; i++) { c.fillStyle = F[i % 7]; c.fillRect(8 + (i * 37 % 6) * 19, 170 - Math.floor(i / 6) * 19 - 19, 17, 17); }
    c.fillStyle = '#fff'; c.font = 'bold 22px system-ui'; c.textAlign = 'center'; c.fillText('KLÖTZCHEN', 64, 34); }
  const pt = new T.CanvasTexture(poster); pt.colorSpace = T.SRGBColorSpace;
  const po = new T.Mesh(new T.PlaneGeometry(0.8, 1.12), new T.MeshStandardMaterial({ map: pt, roughness: 0.8 }));
  po.position.set(Sz.x0 + gw + 0.015, 1.4, 24.0); po.rotation.y = Math.PI / 2; lose.add(po);
  const disco = new T.PointLight('#D6C2FF', 7, 9, 1.4); disco.position.set(5, 2.1, 24.5); scene.add(disco); lampen.push(disco);
  // Fernsehbild: kleine fallende Klötzchen (Vorschau)
  const bctx = bild.getContext('2d'), FARB = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9F45', '#3DE0E0'];
  const fallend = Array.from({ length: 9 }, (_, i) => ({ x: (i * 29) % 240, y: Math.random() * 144, v: 20 + Math.random() * 30, f: FARB[i % 7] }));
  let tvUhr = 0;
  anim.push(z => {
    if (z - tvUhr < 0.12) return; const dt = z - tvUhr; tvUhr = z;
    bctx.fillStyle = '#141432'; bctx.fillRect(0, 0, 256, 144);
    for (const f of fallend) { f.y += f.v * dt; if (f.y > 150) { f.y = -20; f.x = Math.floor(Math.random() * 15) * 16; } bctx.fillStyle = f.f; bctx.fillRect(f.x, f.y, 15, 15); bctx.fillRect(f.x + 16, f.y, 15, 15); bctx.fillRect(f.x, f.y + 16, 15, 15); }
    bctx.fillStyle = '#fff'; bctx.font = 'bold 22px system-ui'; bctx.textAlign = 'center';
    if (Math.floor(z * 1.5) % 2) bctx.fillText('🐾 = SPIELEN', 128, 80);
    bildTex.needsUpdate = true;
    lich.material.emissiveIntensity = 1.5 + Math.sin(z * 3) * 0.8;
  });

  verkleben(g);

  // ---------- Wo ist die Katze? ----------
  const ORTE = [
    ...raeume.map(r => [`${r.haus} · ${r.name}`, r, -1]),
    ['Geheimes Spielzimmer', P.spielzimmer, -0.2],
    ['Unterwasser-Tunnel', { x0: Tu.x0, x1: Tu.x1, z0: pool.z1 - 0.3, z1: sch.z0 }, -9],
    ['Unterwasser-Tunnel', sch, -9],
    ['Pool', pool, -9], ['Rutsche', { x0: Tm.x0, x1: Tm.x1, z0: Tm.z0, z1: Tm.z1 + treppeL }, -1],
    ['Terrasse', Te, -1], ['Restaurant', RS, -1], ['Nachbarhaus', N, -1],
    ['Zebrastreifen', { x0: P.zebra.x0, x1: P.zebra.x1, z0: S.z0, z1: S.z1 }, -1],
    ['Ampel', { x0: P.ampel.x0, x1: P.ampel.x1, z0: S.z0, z1: S.z1 }, -1],
    ['Straße', S, -1], ['Gehweg', { x0: S.x0, x1: S.x1, z0: P.gehwegN.z0, z1: P.gehwegN.z1 }, -1], ['Gehweg', { x0: S.x0, x1: S.x1, z0: P.gehwegS.z0, z1: P.gehwegS.z1 }, -1],
    ['Kellerschacht', { x0: KS.x0, x1: KS.x1, z0: 10, z1: KS.z1 }, -3],
    ['Kletterbaum', { x0: bx - 1, x1: bx + 2, z0: bz - 1, z1: bz + 1 }, -1],
    ['Vorgarten', { x0: Gt.x0, x1: Gt.x1, z0: Gt.z0, z1: 0 }, -1], ['Garten', Gt, -1],
  ];
  function ort(p) {
    if (p.x >= 0 && p.x < 14 && p.z >= 0 && p.z < 10) return null;       // im Haus: das weiß haus.js
    for (const [name, r, ymin] of ORTE) if (p.x >= r.x0 && p.x < r.x1 && p.z >= r.z0 && p.z < r.z1 && p.y > ymin - 0.4) return name;
    return 'Wiese';
  }
  // Raum im Nachbarhaus / Restaurant (für Geheimräume)
  function raum(p) { return raeume.find(r => p.x >= r.x0 && p.x < r.x1 && p.z >= r.z0 && p.z < r.z1 && p.y > -0.5 && p.y < 3) || null; }
  function imWasser(p) {
    for (const w of wasser) if (p.x > w.x0 && p.x < w.x1 && p.z > w.z0 && p.z < w.z1 && p.y > w.y0 - 0.3 && p.y < w.flaeche + 0.05) return w;
    return null;
  }
  const drin = (p, r) => p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1;

  return {
    anim, lampen, wasser, imWasser, ort, raum, drin, kurve, tische,
    // Verstecke und Geheimgänge draußen (y = Boden in Metern)
    verstecke: [
      { name: 'in der Baumhöhle', x0: bx - 0.15, x1: bx + 0.42, z0: bz - 0.27, z1: bz + 0.27, y: hoehleU },
      { name: 'im Gebüsch', x0: -0.6, x1: 0.95, z0: 24.7, z1: 26.3, y: 0 },
    ],
    geheimgaenge: [{ name: 'Loch hinter den Büschen', x0: Sz.x0 - 0.05, x1: Sz.x0 + gw + 0.05, z0: BL.z0, z1: BL.z1, y0: -0.1, y1: 0.4 }],
    rutscheStart: { x0: Tm.x0, x1: Tm.x0 + 0.35, z0: Tm.z0 + 0.2, z1: Tm.z1 - 0.2, y: Tm.h },
    konsole: { x: tvX, z: tvZ + 0.3, y: 0, raum: P.spielzimmer, sofa: { x: tvX, z: Sz.z1 - gw - 0.5 } },
  };
}

// Reste auf dem Teller: Hähnchenkeule, Spaghetti, Fisch, Würstchen …
const RESTE = ['Hähnchenkeule', 'Spaghetti', 'Fischgräte mit Fisch', 'Würstchen', 'Schnitzel', 'Frikadelle'];
function reste(i) {
  const g = new T.Group(), art = i % RESTE.length;
  const m = (geo, f, x, y, z) => { const me = new T.Mesh(geo, mat(f, { r: 0.6 })); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
  if (art === 0) { m(new T.SphereGeometry(0.05, 10, 8), '#C27C3A', 0, 0.03, 0).scale.set(1.4, 0.8, 1); m(new T.CylinderGeometry(0.012, 0.012, 0.09, 6), '#FFF8E8', 0.07, 0.03, 0).rotation.z = Math.PI / 2; }
  else if (art === 1) { for (let k = 0; k < 4; k++) m(new T.TorusGeometry(0.05 - k * 0.008, 0.008, 6, 14), '#F3D27A', 0, 0.01 + k * 0.012, 0).rotation.x = Math.PI / 2; m(new T.SphereGeometry(0.025, 8, 6), '#C0392B', 0, 0.055, 0); }
  else if (art === 2) { m(new T.SphereGeometry(0.05, 10, 8), '#E9A7A0', 0, 0.02, 0).scale.set(1.6, 0.5, 0.8); m(new T.ConeGeometry(0.03, 0.05, 4), '#E9A7A0', -0.09, 0.02, 0).rotation.z = Math.PI / 2; }
  else if (art === 3) { m(new T.CapsuleGeometry(0.02, 0.1, 4, 8), '#C0583A', 0, 0.02, 0).rotation.z = Math.PI / 2; m(new T.CapsuleGeometry(0.02, 0.08, 4, 8), '#C0583A', 0, 0.02, 0.05).rotation.z = Math.PI / 2; }
  else if (art === 4) { m(new T.BoxGeometry(0.14, 0.02, 0.1), '#D9A441', 0, 0.012, 0); m(new T.SphereGeometry(0.018, 6, 4), '#F4E04D', 0.04, 0.03, 0); }
  else { for (const x of [-0.03, 0.04]) m(new T.SphereGeometry(0.035, 10, 8), '#8B5A2B', x, 0.025, 0).scale.y = 0.6; }
  g.userData.name = RESTE[art];
  return g;
}
