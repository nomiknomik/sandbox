// Mehr Häuser! Die große Villa und die Häuser gegenüber – alles steht in level/siedlung.json.
// Jedes Haus: Etagen mit Räumen, Wänden (mit Türen, Fenstern, Katzenklappen), Treppen, Balkonen und Pools.
// Geheimräume haben "geheim": true – hinein kommt man nur durch eine Katzenklappe.
// Koordinaten in der Datei sind "lokal" (0,0 = Ecke des Hauses), hier wird x/z vom Haus dazugezählt.
import * as THREE from '../vendor/three.js';
import { mat } from './modelle.js';
import { textur } from './texturen.js';
import { verkleben } from './haus.js';

const T = THREE;
const AUSSEN = 0.25, INNEN = 0.15, DECKE = 0.2;
// Größe der Öffnungen in Metern
const OEFF = {
  tuer:     { breite: 0.9,  hoehe: 2.1, unten: 0 },
  tor:      { breite: 1.8,  hoehe: 2.3, unten: 0 },
  glastuer: { breite: 1.4,  hoehe: 2.2, unten: 0 },          // raus auf den Balkon
  klappe:   { breite: 0.38, hoehe: 0.42, unten: 0 },         // nur für Katzen
  fenster:  { breite: 1.2,  hoehe: 1.2, unten: 0.9, glas: true },
};

// Rechteck minus Loch → bis zu 4 Rechtecke
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
const tief = o => JSON.parse(JSON.stringify(o));

// "kopie": ein Haus übernimmt die Etagen eines anderen (plus eigene Extra-Sachen)
function vorbereiten(sd) {
  return sd.haeuser.map(h => {
    if (!h.kopie) return h;
    const v = sd.haeuser.find(x => x.id === h.kopie);
    const etagen = tief(v.etagen);
    for (const e of etagen) e.objekte = [...(h.objekte_ersetzen?.[e.id] || e.objekte || []), ...(h.objekte_extra?.[e.id] || [])];
    return { ...tief(v), ...h, etagen };
  });
}

// Wo im Gras ein Loch sein muss (Keller, Gartenpools) – für draussen.js
export function bodenLoecher(sd) {
  const out = [];
  for (const h of vorbereiten(sd)) {
    const r = AUSSEN / 2;
    out.push({ x0: h.x - r, x1: h.x + h.w + r, z0: h.z - r, z1: h.z + h.d + r });
    for (const p of h.gartenpools || []) out.push({ x0: h.x + p.x0 - 0.2, x1: h.x + p.x1 + 0.2, z0: h.z + p.z0 - 0.2, z1: h.z + p.z1 + 0.2 });
  }
  return out;
}

export function baueSiedlung(sd, scene, bau, wasserListe) {
  const g = new T.Group(); scene.add(g);            // alles Feste – wird am Ende zusammengeklebt
  const lose = new T.Group(); scene.add(lose);      // Glas und Wasser (durchsichtig)
  const verstecke = [], gaenge = [], raeder = [], haeuser = vorbereiten(sd), balkone = [];
  const glasMat = new T.MeshStandardMaterial({ color: '#cfeaff', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false });
  const wasserMat = new T.MeshStandardMaterial({ color: '#3FB6E8', transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.1, depthWrite: false, side: T.DoubleSide });
  const deckeMat = mat('#F6F3EE', { r: 0.95 }), fliese = mat('#7DD3EE', { r: 0.35 }), randMat = mat('#E9E4DA', { r: 0.7 });
  const kiste = (x0, x1, y0, y1, z0, z1, m, fest = true) => bau.block(x0, x1, y0, y1, z0, z1, typeof m === 'string' ? mat(m) : m, { fest, ziel: g });
  const glas = (x0, x1, y0, y1, z0, z1) => { const m = bau.block(x0, x1, y0, y1, z0, z1, glasMat, { fest: true, ziel: lose }); if (m) m.castShadow = false; };
  const bodenMats = new Map();
  const bodenMat = name => {
    if (!bodenMats.has(name)) bodenMats.set(name, new T.MeshStandardMaterial({ map: textur(name, 3, 3), roughness: name === 'fliesen' ? 0.35 : 0.8 }));
    return bodenMats.get(name);
  };

  // Ein Becken mit Wasser (Boden bei y0, Wasser bis flaeche)
  function becken(name, x0, x1, z0, z1, y0, oben, flaeche) {
    const w = 0.15;
    kiste(x0 - w, x1 + w, y0 - 0.2, y0, z0 - w, z1 + w, fliese);
    kiste(x0 - w, x0, y0, oben, z0 - w, z1 + w, fliese); kiste(x1, x1 + w, y0, oben, z0 - w, z1 + w, fliese);
    kiste(x0, x1, y0, oben, z0 - w, z0, fliese); kiste(x0, x1, y0, oben, z1, z1 + w, fliese);
    kiste(x0 - w - 0.1, x1 + w + 0.1, oben, oben + 0.05, z0 - w - 0.1, z0 - w, randMat);
    kiste(x0 - w - 0.1, x1 + w + 0.1, oben, oben + 0.05, z1 + w, z1 + w + 0.1, randMat);
    kiste(x0 - w - 0.1, x0 - w, oben, oben + 0.05, z0 - w, z1 + w, randMat);
    kiste(x1 + w, x1 + w + 0.1, oben, oben + 0.05, z0 - w, z1 + w, randMat);
    const wa = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), wasserMat);
    wa.rotation.x = -Math.PI / 2; wa.position.set((x0 + x1) / 2, flaeche, (z0 + z1) / 2); lose.add(wa);
    wasserListe.push({ name, x0, x1, z0, z1, y0, flaeche });
  }

  // Treppe (immer Richtung +x): Stufen zum Anschauen + glatte Rampe für die Katze
  function treppe(x0, x1, z0, z1, y, rise) {
    const L = x1 - x0, B = z1 - z0, n = Math.max(2, Math.round(rise / 0.18)), run = L / n;
    const stufe = mat('#B98552', { r: 0.6 }), seite = mat('#F1ECE2');
    for (let i = 0; i < n; i++) {
      const h = (i + 1) * rise / n;
      kiste(x0 + i * run, x0 + (i + 1) * run, y + h - 0.04, y + h, z0, z1, stufe, false);
      kiste(x0 + i * run, x0 + (i + 1) * run, y, y + h - 0.04, z0 + 0.01, z1 - 0.01, seite, false);
      if (i > 0) bau.kollider(x0 + (i + 0.5) * run, y + i * rise / n / 2, (z0 + z1) / 2, run, i * rise / n, B);
    }
    const a = Math.atan2(rise, L), d = 0.1;
    const q = new T.Quaternion().setFromEuler(new T.Euler(0, 0, a));
    bau.kollider(x0 + L / 2 + Math.sin(a) * d / 2, y + rise / 2 - Math.cos(a) * d / 2, (z0 + z1) / 2, Math.hypot(L, rise), d, B, q);
  }

  // Wand von a nach b (gerade entlang x oder z) mit Öffnungen
  function wand(ax, az, bx, bz, y, h, t, oeffnungen, innenMat, aussenMat, aussenSeite) {
    const langX = Math.abs(bx - ax) > Math.abs(bz - az);
    const s0g = langX ? Math.min(ax, bx) : Math.min(az, bz), len = langX ? Math.abs(bx - ax) : Math.abs(bz - az);
    const quer = langX ? az : ax, ext = aussenMat ? t / 2 : 0;
    const stueck = (s0, s1, y0, y1) => {
      const a = s0g + s0, b = s0g + s1, q0 = quer - t / 2, q1 = quer + t / 2;
      const box = (qa, qb, m, fest) => langX ? kiste(a, b, y + y0, y + y1, qa, qb, m, fest) : kiste(qa, qb, y + y0, y + y1, a, b, m, fest);
      if (aussenMat) {
        const haut = 0.03;
        if (aussenSeite < 0) { box(q0, q0 + haut, aussenMat, false); box(q0 + haut, q1, innenMat, false); }
        else { box(q1 - haut, q1, aussenMat, false); box(q0, q1 - haut, innenMat, false); }
        langX ? bau.kollider((a + b) / 2, y + (y0 + y1) / 2, quer, b - a, y1 - y0, t) : bau.kollider(quer, y + (y0 + y1) / 2, (a + b) / 2, t, y1 - y0, b - a);
      } else box(q0, q1, innenMat, true);
    };
    const oe = (oeffnungen || []).map(o => {
      const d = { ...OEFF[o.typ], ...o };
      return { ...d, s0: d.pos - d.breite / 2, s1: d.pos + d.breite / 2 };
    }).sort((p, q) => p.s0 - q.s0);
    let s = -ext;
    for (const o of oe) {
      stueck(s, o.s0, 0, h);
      if (o.unten > 0) stueck(o.s0, o.s1, 0, o.unten);
      if (o.unten + o.hoehe < h) stueck(o.s0, o.s1, o.unten + o.hoehe, h);
      if (o.glas) {            // Glasscheibe: man sieht raus, fällt aber nicht runter
        const a = s0g + o.s0, b = s0g + o.s1;
        langX ? glas(a, b, y + o.unten, y + o.unten + o.hoehe, quer - 0.02, quer + 0.02) : glas(quer - 0.02, quer + 0.02, y + o.unten, y + o.unten + o.hoehe, a, b);
        const r = mat('#FBFAF6', { r: 0.5 });
        langX ? kiste(a - 0.05, b + 0.05, y + o.unten - 0.05, y + o.unten, quer - t / 2 - 0.04, quer + t / 2 + 0.04, r, false)
              : kiste(quer - t / 2 - 0.04, quer + t / 2 + 0.04, y + o.unten - 0.05, y + o.unten, a - 0.05, b + 0.05, r, false);
      }
      if (o.typ === 'klappe') {   // kleiner Rahmen um die Katzenklappe
        const a = s0g + o.s0, b = s0g + o.s1, r = mat('#E8A85C');
        langX ? kiste(a - 0.03, b + 0.03, y + o.hoehe, y + o.hoehe + 0.04, quer - t / 2 - 0.01, quer + t / 2 + 0.01, r, false)
              : kiste(quer - t / 2 - 0.01, quer + t / 2 + 0.01, y + o.hoehe, y + o.hoehe + 0.04, a - 0.03, b + 0.03, r, false);
      }
      s = o.s1;
    }
    stueck(s, len + ext, 0, h);
  }

  // Fenster automatisch verteilen (nicht auf Türen und nicht dort, wo innen eine Wand anstößt)
  function autoFenster(laenge, belegt, klein) {
    const out = [];
    for (let p = 1.6; p < laenge - 1.2; p += 3.0) {
      if (belegt.some(b => Math.abs(b - p) < 1.3)) continue;
      out.push(klein ? { typ: 'fenster', pos: p, breite: 0.8, hoehe: 0.8, unten: 0.9 } : { typ: 'fenster', pos: p });
    }
    return out;
  }

  for (const h of haeuser) {
    const X = h.x, Z = h.z, W = h.w, D = h.d;
    const fassade = mat(h.farbe || '#EAD9BC', { r: 0.95 });
    const L = (x, z) => [X + x, Z + z];
    const etagenOut = [];
    h.etagen.forEach((e, i) => {
      const y = e.y, hoch = e.h || 2.8, wh = hoch - DECKE, unten = h.etagen[i - 1];
      const innen = mat(e.wand || '#F3E6CF', { r: 0.92 });
      // --- Boden (mit Löchern für Treppen und Pools) ---
      const loecher = [...(e.loecher || [])];
      if (unten?.treppe) loecher.push(unten.treppe);
      for (const p of e.pools || []) if (!p.erhoeht) loecher.push(p);
      for (const r of e.raeume) {
        let rects = [{ x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1 }];
        for (const l of loecher) rects = minus(rects, l);
        const bm = bodenMat(r.boden || e.boden || 'holz');
        for (const q of rects) {
          kiste(X + q.x0, X + q.x1, y - 0.02, y, Z + q.z0, Z + q.z1, bm, false);
          kiste(X + q.x0, X + q.x1, y - DECKE, y - 0.02, Z + q.z0, Z + q.z1, deckeMat, false);
          bau.kollider(X + (q.x0 + q.x1) / 2, y - DECKE / 2, Z + (q.z0 + q.z1) / 2, q.x1 - q.x0, DECKE, q.z1 - q.z0);
        }
      }
      // --- Außenwände (oder Geländer auf der Dachterrasse) ---
      if (e.offen) {
        const gl = 1.0, r = mat('#FBFAF6', { r: 0.5 });
        for (const [x0, x1, z0, z1] of [[0, W, -0.08, 0.08], [0, W, D - 0.08, D + 0.08], [-0.08, 0.08, 0, D], [W - 0.08, W + 0.08, 0, D]]) {
          kiste(X + x0, X + x1, y, y + 0.15, Z + z0, Z + z1, r);
          glas(X + x0, X + x1, y + 0.15, y + gl, Z + z0, Z + z1);
          kiste(X + x0, X + x1, y + gl, y + gl + 0.05, Z + z0, Z + z1, r, false);
        }
      } else {
        const a = e.aussen || {}, innenW = (e.waende || []);
        // wo innen Wände an die Außenwand stoßen (dort kein Fenster)
        const stoss = seite => innenW.flatMap(w => [w.a, w.b]).filter(([x, z]) => seite === 'n' ? z === 0 : seite === 's' ? z === D : seite === 'w' ? x === 0 : x === W).map(([x, z]) => (seite === 'n' || seite === 's') ? x : z);
        const seiten = { n: [0, 0, W, 0, -1], s: [0, D, W, D, 1], w: [0, 0, 0, D, -1], o: [W, 0, W, D, 1] };
        for (const [k, [ax, az, bx, bz, aus]] of Object.entries(seiten)) {
          const oe = a[k] || [], len = k === 'n' || k === 's' ? W : D;
          const fe = e.fenster === false ? [] : autoFenster(len, [...oe.map(o => o.pos), ...stoss(k)], e.kleineFenster);
          wand(X + ax, Z + az, X + bx, Z + bz, y, wh, AUSSEN, [...oe, ...fe], innen, fassade, aus);
        }
      }
      // --- Innenwände ---
      for (const w of e.waende || []) {
        const [ax, az] = L(...w.a), [bx, bz] = L(...w.b);
        // pos zählt ab dem kleineren Ende der Wand
        wand(ax, az, bx, bz, y, wh, INNEN, w.o, innen, null, 0);
      }
      // --- Treppe nach oben ---
      if (e.treppe && h.etagen[i + 1]) { const t = e.treppe; treppe(X + t.x0, X + t.x1, Z + t.z0, Z + t.z1, y, h.etagen[i + 1].y - y); }
      // --- Pools ---
      for (const p of e.pools || []) {
        if (p.erhoeht) becken(p.name, X + p.x0, X + p.x1, Z + p.z0, Z + p.z1, y, y + 0.6, y + 0.5);
        else becken(p.name, X + p.x0, X + p.x1, Z + p.z0, Z + p.z1, y - p.tiefe, y, y - 0.15);
      }
      // --- Balkone ---
      for (const b of e.balkone || []) {
        const n = b.seite === 'n', t = b.tiefe || 1.6, r = mat('#FBFAF6', { r: 0.5 });
        const z0 = n ? -AUSSEN / 2 - t : D + AUSSEN / 2, z1 = n ? -AUSSEN / 2 : D + AUSSEN / 2 + t;
        kiste(X + b.von, X + b.bis, y - 0.2, y, Z + z0, Z + z1, mat('#D9C7A8', { r: 0.8 }));
        const zr = n ? z0 : z1 - 0.08;
        for (const [x0, x1, zz0, zz1] of [[b.von, b.bis, zr, zr + 0.08], [b.von, b.von + 0.08, z0, z1], [b.bis - 0.08, b.bis, z0, z1]]) {
          glas(X + x0, X + x1, y, y + 1.0, Z + zz0, Z + zz1);
          kiste(X + x0, X + x1, y + 1.0, y + 1.05, Z + zz0, Z + zz1, r, false);
        }
        balkone.push({ haus: h, x0: X + b.von, x1: X + b.bis, z0: Z + z0, z1: Z + z1, y });
      }
      // --- Möbel und Sachen ---
      for (const o of e.objekte || []) {
        if (o.typ === 'gluecksrad') { raeder.push({ x: X + o.x, y, z: Z + o.z, rot: o.rot || 0 }); continue; }
        bau.stelle({ ...o, x: X + o.x, z: Z + o.z }, y, -1, g);
      }
      etagenOut.push({ e, y, top: i === h.etagen.length - 1 });
    });
    // Gartenpools (im Boden)
    for (const p of h.gartenpools || []) becken(p.name, X + p.x0, X + p.x1, Z + p.z0, Z + p.z1, -p.tiefe, 0, -0.15);
    // Dach
    const oben = h.etagen[h.etagen.length - 1], dachY = oben.y + (oben.h || 2.8);
    if (!oben.offen) {
      kiste(X - AUSSEN / 2, X + W + AUSSEN / 2, dachY - DECKE, dachY, Z - AUSSEN / 2, Z + D + AUSSEN / 2, deckeMat);
      if (h.dach === 'sattel') {
        const dm = mat(h.dachfarbe || '#B5523B', { r: 0.8 }), dh = 2.0, ueber = 0.4;
        const schraeg = Math.hypot(D / 2 + ueber, dh);
        for (const s of [-1, 1]) {
          const p = new T.Mesh(new T.BoxGeometry(W + 2 * ueber, 0.15, schraeg), dm);
          p.position.set(X + W / 2, dachY + dh / 2, Z + D / 2 + s * (D / 4 + ueber / 2));
          p.rotation.x = s * Math.atan2(dh, D / 2 + ueber); p.castShadow = true; g.add(p);
        }
        const giebel = new T.Shape([new T.Vector2(-D / 2, 0), new T.Vector2(D / 2, 0), new T.Vector2(0, dh)]);
        for (const x of [X, X + W]) {
          const m = new T.Mesh(new T.ExtrudeGeometry(giebel, { depth: 0.2, bevelEnabled: false }), fassade);
          m.rotation.y = Math.PI / 2; m.position.set(x - 0.1, dachY, Z + D / 2); m.castShadow = true; g.add(m);
        }
      }
    }
    h._etagen = etagenOut;
    for (const v of h.verstecke || []) verstecke.push({ ...v, x0: X + v.x0, x1: X + v.x1, z0: Z + v.z0, z1: Z + v.z1, y: h.etagen.find(e => e.id === v.etage).y });
  }

  // ---------- Maulwurfgang: unterirdischer Tunnel von unserem Keller zur Villa ----------
  const MG = sd.maulwurfgang;
  if (MG) {
    const erde = mat('#6B4A2E', { r: 1 }), erdeHell = mat('#8A6440', { r: 1 }), y = MG.y, b = MG.breite / 2, hoch = 0.65;
    const z0 = MG.z - b, z1 = MG.z + b;
    kiste(MG.x0, MG.x1, y - 0.2, y, z0 - 0.2, z1 + 0.2, erdeHell);
    kiste(MG.x0, MG.x1, y + hoch, y + hoch + 0.2, z0 - 0.2, z1 + 0.2, erde);
    kiste(MG.x0, MG.x1, y, y + hoch, z0 - 0.2, z0, erde); kiste(MG.x0, MG.x1, y, y + hoch, z1, z1 + 0.2, erde);
    // Wurzeln, Steine und leuchtende Pilze (damit man etwas sieht)
    const pilzMat = mat('#B8F5A0', { e: 0x8CFF6A, ei: 1.2 }), stein = mat('#9A948A');
    for (let x = MG.x0 + 1; x < MG.x1 - 0.5; x += 1.3) {
      const s = (x * 7.3) % 1 > 0.5 ? 1 : -1;
      const p = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), pilzMat); p.scale.y = 0.6; p.position.set(x, y + 0.03, MG.z + s * (b - 0.06)); lose.add(p);
      const w = new T.Mesh(new T.CylinderGeometry(0.012, 0.02, 0.35, 5), erdeHell); w.position.set(x + 0.5, y + hoch - 0.15, MG.z - s * 0.15); w.rotation.z = 0.4; g.add(w);
      if ((x * 3.1) % 1 > 0.6) { const st = new T.Mesh(new T.DodecahedronGeometry(0.06), stein); st.position.set(x + 0.3, y + 0.04, MG.z + s * 0.2); g.add(st); }
    }
    for (const x of [MG.x0 + (MG.x1 - MG.x0) / 3, MG.x0 + 2 * (MG.x1 - MG.x0) / 3]) {
      const l = new T.PointLight('#C8FFB0', 1.6, 6, 1.6); l.position.set(x, y + 0.5, MG.z); scene.add(l);
    }
    // Ein freundlicher Maulwurf mit Sonnenbrille, ungefähr in der Mitte (nur zum Anschauen, in einer Nische)
    const mw = new T.Group(), fell = mat('#3B3330', { r: 1 }), rosa = mat('#F5A7B8');
    const k = new T.Mesh(new T.SphereGeometry(0.12, 12, 10), fell); k.scale.set(1, 0.85, 1.2); mw.add(k);
    const nase = new T.Mesh(new T.SphereGeometry(0.03, 8, 6), rosa); nase.position.set(0, 0.01, 0.15); mw.add(nase);
    for (const s of [-1, 1]) {
      const br = new T.Mesh(new T.BoxGeometry(0.06, 0.03, 0.01), mat('#111')); br.position.set(s * 0.04, 0.05, 0.12); mw.add(br);
      const pf = new T.Mesh(new T.SphereGeometry(0.04, 8, 6), rosa); pf.scale.set(1.3, 0.4, 1); pf.position.set(s * 0.1, -0.07, 0.09); mw.add(pf);
    }
    const mx = (MG.x0 + MG.x1) / 2;
    kiste(mx - 0.3, mx + 0.3, y, y + hoch, z1, z1 + 0.5, erde, false);       // Nische (Erdwand dahinter)
    mw.position.set(mx, y + 0.11, z1 + 0.15); mw.rotation.y = Math.PI; g.add(mw);
    gaenge.push({ name: 'Maulwurfgang zur Villa', x0: mx - 1, x1: mx + 1, z0, z1, y0: y - 0.1, y1: y + 0.5 });
  }

  verkleben(g);

  // Wo ist die Katze?  → { name, raum, haus }  oder null
  function ort(p) {
    if (MG && p.x > MG.x0 && p.x < MG.x1 && Math.abs(p.z - MG.z) < MG.breite && p.y < MG.y + 1) return { name: 'Maulwurfgang' };
    for (const b of balkone) if (p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1 && p.y > b.y - 0.5) return { name: `${b.haus.name} · Balkon` };
    for (const h of haeuser) {
      const lx = p.x - h.x, lz = p.z - h.z;
      if (lx < 0 || lz < 0 || lx > h.w || lz > h.d) {
        for (const q of h.gartenpools || []) if (lx > q.x0 - 1 && lx < q.x1 + 1 && lz > q.z0 - 1 && lz < q.z1 + 1) return { name: `${h.name} · ${q.name}` };
        continue;
      }
      let et = h._etagen[0];
      for (const e of h._etagen) if (p.y >= e.y - 0.4) et = e;
      const raum = et.e.raeume.find(r => lx >= r.x0 && lx < r.x1 && lz >= r.z0 && lz < r.z1);
      return { name: `${h.name} · ${et.e.name}${raum ? ' · ' + raum.name : ''}`, raum, haus: h };
    }
    return null;
  }
  return { ort, verstecke, geheimgaenge: gaenge, raeder };
}
