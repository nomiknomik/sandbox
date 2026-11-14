// Как выглядят предметы в 3D.
// Каждый предмет собирается из простых форм (коробки, цилиндры, шары) – как из конструктора.
// Позже любую модель можно заменить на настоящую 3D-модель (glTF), паспорт в katalog.js не меняется.
//
// Статичный предмет:  { obj, boxen: [[x,y,z, ширина,высота,глубина], ...] }  (boxen = невидимые стенки для физики)
// Подвижный предмет:  { obj, form: 'box'|'ball'|'zylinder', masse }      (obj стоит центром в 0,0,0)
import * as THREE from '../vendor/three.js';

const T = THREE;
const mats = new Map();
// Материал с кэшем: одинаковые цвета – один материал (так iPad рисует быстрее)
export function mat(farbe, o = {}) {
  const key = farbe + JSON.stringify(o);
  if (!mats.has(key)) mats.set(key, new T.MeshStandardMaterial({ color: farbe, roughness: o.r ?? 0.75, metalness: o.m ?? 0, transparent: !!o.op, opacity: o.op ?? 1, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1, depthWrite: o.op ? false : true }));
  return mats.get(key);
}

function mesh(geo, m, x = 0, y = 0, z = 0, g) {
  const me = new T.Mesh(geo, typeof m === 'string' ? mat(m) : m);
  me.position.set(x, y, z);
  me.castShadow = true; me.receiveShadow = true;
  if (g) g.add(me);
  return me;
}
// Скруглённая коробка. y = низ коробки (так удобнее ставить на пол)
function kasten(g, w, h, d, farbe, x, y, z, { rund = 0.025, kollider = true, boxen } = {}) {
  const r = Math.min(rund, w / 2.2, h / 2.2, d / 2.2);
  const geo = r > 0.004 ? new T.RoundedBoxGeometry(w, h, d, 2, r) : new T.BoxGeometry(w, h, d);
  const me = mesh(geo, farbe, x, y + h / 2, z, g);
  if (kollider && boxen) boxen.push([x, y + h / 2, z, w, h, d]);
  return me;
}
function zyl(g, r1, r2, h, farbe, x, y, z, seg = 16) {
  return mesh(new T.CylinderGeometry(r1, r2, h, seg), farbe, x, y + h / 2, z, g);
}
function kugel(g, r, farbe, x, y, z, sx = 1, sy = 1, sz = 1) {
  const me = mesh(new T.SphereGeometry(r, 16, 12), farbe, x, y, z, g);
  me.scale.set(sx, sy, sz);
  return me;
}
function beine(g, w, d, h, farbe, dicke = 0.045, boxen) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (w / 2 - dicke), z = sz * (d / 2 - dicke);
    zyl(g, dicke / 2, dicke / 2.4, h, farbe, x, 0, z, 8);
    if (boxen) boxen.push([x, h / 2, z, dicke, h, dicke]);
  }
}

// ---------- Мебель ----------
const HOLZ = '#B07A4A', HOLZ_DUNKEL = '#7A4E2D', WEISS = '#F4F1EA';

const BAU = {
  sofa(g, b, o) {
    const c = o.farbe || '#3E8E9E';
    kasten(g, 2.2, 0.42, 0.9, c, 0, 0.0, 0, { boxen: b });
    kasten(g, 2.2, 0.48, 0.24, c, 0, 0.4, -0.33, { boxen: b, rund: 0.08 });
    for (const x of [-1.0, 1.0]) kasten(g, 0.22, 0.24, 0.9, c, x, 0.4, 0, { boxen: b, rund: 0.08 });
    for (const x of [-0.45, 0.45]) kasten(g, 0.88, 0.14, 0.64, '#57A9B8', x, 0.4, 0.1, { boxen: b, rund: 0.06 });
    kasten(g, 0.32, 0.3, 0.12, '#F2C14E', -0.6, 0.54, -0.18, { kollider: false, rund: 0.06 }).rotation.x = -0.25;
  },
  sessel(g, b, o) {
    const c = o.farbe || '#C4573F';
    kasten(g, 0.9, 0.42, 0.85, c, 0, 0, 0, { boxen: b });
    kasten(g, 0.9, 0.45, 0.22, c, 0, 0.4, -0.31, { boxen: b, rund: 0.08 });
    for (const x of [-0.37, 0.37]) kasten(g, 0.17, 0.22, 0.85, c, x, 0.4, 0, { boxen: b, rund: 0.07 });
    kasten(g, 0.56, 0.12, 0.6, '#D9775F', 0, 0.4, 0.08, { boxen: b, rund: 0.05 });
  },
  couchtisch(g, b) {
    kasten(g, 1.2, 0.06, 0.65, HOLZ, 0, 0.39, 0, { boxen: b });
    beine(g, 1.2, 0.65, 0.39, HOLZ_DUNKEL, 0.05, b);
  },
  esstisch(g, b) {
    kasten(g, 1.5, 0.06, 0.9, HOLZ, 0, 0.69, 0, { boxen: b });
    beine(g, 1.5, 0.9, 0.69, HOLZ_DUNKEL, 0.06, b);
  },
  stuhl(g, b) {
    kasten(g, 0.45, 0.05, 0.45, HOLZ, 0, 0.42, 0, { boxen: b });
    beine(g, 0.45, 0.45, 0.42, HOLZ_DUNKEL, 0.04);
    kasten(g, 0.45, 0.45, 0.05, HOLZ, 0, 0.47, -0.2, { boxen: b });
  },
  tvschrank(g, b) {
    kasten(g, 1.6, 0.5, 0.45, HOLZ_DUNKEL, 0, 0, 0, { boxen: b });
    kasten(g, 1.15, 0.68, 0.07, '#222', 0, 0.56, -0.06, { boxen: b, rund: 0.02 });
    kasten(g, 1.07, 0.6, 0.01, mat('#10202c', { r: 0.15, e: 0x0b2a3a, ei: 0.6 }), 0, 0.6, -0.02, { kollider: false, rund: 0 });
    kasten(g, 0.3, 0.06, 0.2, '#222', 0, 0.5, -0.06, { kollider: false });
  },
  aquarium(g, b, o, anim) {
    kasten(g, 1.0, 0.7, 0.45, HOLZ_DUNKEL, 0, 0, 0, { boxen: b });
    // Glas, Wasser, Sand
    const glas = kasten(g, 1.0, 0.52, 0.45, mat('#bfe6ff', { op: 0.18, r: 0.05 }), 0, 0.7, 0, { kollider: false, rund: 0.01 });
    glas.castShadow = false;
    const wasser = kasten(g, 0.96, 0.44, 0.41, mat('#3fa7d6', { op: 0.35, r: 0.1 }), 0, 0.72, 0, { kollider: false, rund: 0 });
    wasser.castShadow = false;
    kasten(g, 0.96, 0.05, 0.41, '#E8D29A', 0, 0.71, 0, { kollider: false, rund: 0 });
    kasten(g, 1.02, 0.04, 0.47, '#333', 0, 1.22, 0, { kollider: false, rund: 0.01 });
    b.push([0, 0.98, 0, 1.0, 0.56, 0.45]);
    for (const [x, h] of [[-0.35, 0.3], [-0.28, 0.22], [0.36, 0.26]]) zyl(g, 0.012, 0.02, h, '#3BA55C', x, 0.75, -0.1, 6);
    // Fische, die hin und her schwimmen
    const farben = ['#FF8A1E', '#FFD23F', '#FF5D8F'];
    farben.forEach((f, i) => {
      const fisch = new T.Group();
      kugel(fisch, 0.035, f, 0, 0, 0, 1.4, 1, 0.6);
      const schw = mesh(new T.ConeGeometry(0.025, 0.04, 4), f, -0.06, 0, 0, fisch); schw.rotation.z = Math.PI / 2;
      kugel(fisch, 0.007, '#111', 0.035, 0.012, 0.016);
      fisch.position.set(0, 0.85 + i * 0.1, -0.05 + i * 0.06);
      g.add(fisch);
      anim.push(t => {
        const p = t * (0.5 + i * 0.17) + i * 2;
        fisch.position.x = Math.sin(p) * 0.38;
        fisch.position.y = 0.88 + i * 0.09 + Math.sin(p * 2.3) * 0.02;
        fisch.rotation.y = Math.cos(p) > 0 ? 0 : Math.PI;
      });
    });
  },
  kratzbaum(g, b) {
    kasten(g, 0.6, 0.06, 0.6, '#C9B08A', 0, 0, 0, { boxen: b });
    zyl(g, 0.07, 0.07, 1.45, '#D8C29A', 0, 0.06, 0, 10); b.push([0, 0.75, 0, 0.14, 1.45, 0.14]);
    kasten(g, 0.42, 0.05, 0.42, '#C9B08A', 0.08, 0.5, 0.08, { boxen: b });
    kasten(g, 0.38, 0.05, 0.38, '#C9B08A', -0.08, 0.95, -0.06, { boxen: b });
    zyl(g, 0.22, 0.2, 0.08, '#E07A5F', 0, 1.42, 0, 16); b.push([0, 1.46, 0, 0.42, 0.08, 0.42]);
    kugel(g, 0.035, '#F2C14E', 0.18, 0.86, 0.15);
  },
  regal(g, b, o) {
    const W = 1.0, H = 1.8, D = 0.35;
    for (const x of [-W / 2 + 0.02, W / 2 - 0.02]) kasten(g, 0.04, H, D, HOLZ, x, 0, 0, { kollider: false, rund: 0.01 });
    kasten(g, W, H, 0.02, HOLZ_DUNKEL, 0, 0, -D / 2 + 0.01, { kollider: false, rund: 0 });
    for (const y of [0, 0.45, 0.9, 1.35, 1.76]) kasten(g, W, 0.04, D, HOLZ, 0, y, 0, { kollider: false, rund: 0.01 });
    b.push([0, H / 2, 0, W, H, D]);
    // Bücher (Deko)
    const bf = ['#C0392B', '#2E86C1', '#27AE60', '#F1C40F', '#8E44AD', '#E67E22'];
    for (const y of [0.04, 0.49, 0.94]) {
      let x = -W / 2 + 0.07;
      for (let i = 0; x < W / 2 - 0.12; i++) {
        const w = 0.04 + ((i * 7 + y * 10) % 3) * 0.015, h = 0.26 + ((i * 5) % 4) * 0.03;
        kasten(g, w, h, 0.22, bf[(i + Math.round(y * 10)) % bf.length], x + w / 2, y, 0.02, { kollider: false, rund: 0.005 });
        x += w + 0.008;
      }
    }
  },
  pflanze(g, b) {
    zyl(g, 0.17, 0.13, 0.32, '#C8693F', 0, 0, 0, 14); b.push([0, 0.16, 0, 0.32, 0.32, 0.32]);
    zyl(g, 0.15, 0.15, 0.02, '#4A3426', 0, 0.3, 0, 14);
    const gr = ['#3E9B4F', '#4DB360', '#2F8040'];
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9, r = 0.1 + (i % 3) * 0.05;
      kugel(g, 0.16 - (i % 3) * 0.02, gr[i % 3], Math.cos(a) * r, 0.55 + (i % 4) * 0.15, Math.sin(a) * r, 1, 1.3, 1);
    }
  },
  kuechenzeile(g, b, o) {
    const L = o.laenge || 5;
    kasten(g, L, 0.86, 0.6, '#F7F3EA', 0, 0, 0, { boxen: b, rund: 0.01 });
    kasten(g, L, 0.1, 0.5, '#5E5248', 0, 0, 0.04, { kollider: false, rund: 0 });
    kasten(g, L + 0.02, 0.04, 0.62, '#8D6E52', 0, 0.86, 0, { boxen: b, rund: 0.01 });
    for (let x = -L / 2 + 0.5; x < L / 2; x += 0.6) kasten(g, 0.012, 0.6, 0.01, '#CFC6B6', x, 0.15, 0.3, { kollider: false, rund: 0 });
    for (let x = -L / 2 + 0.25; x < L / 2; x += 0.6) kasten(g, 0.12, 0.02, 0.02, '#888', x, 0.75, 0.31, { kollider: false, rund: 0 });
    // Herd (bei x = -1.7) und Spüle (bei x = +0.8)
    kasten(g, 0.6, 0.01, 0.5, mat('#1d1d1d', { r: 0.2 }), -1.7, 0.9, 0, { kollider: false, rund: 0 });
    for (const [dx, dz] of [[-0.13, -0.1], [0.13, -0.1], [-0.13, 0.12], [0.13, 0.12]]) zyl(g, 0.08, 0.08, 0.006, '#444', -1.7 + dx, 0.91, dz, 16);
    kasten(g, 0.55, 0.01, 0.42, mat('#C9CED3', { m: 0.6, r: 0.3 }), 0.8, 0.9, 0, { kollider: false, rund: 0 });
    zyl(g, 0.015, 0.015, 0.25, mat('#ccc', { m: 0.8, r: 0.2 }), 0.8, 0.9, -0.24, 8);
    // Hängeschrank links (nicht vor dem Fenster)
    kasten(g, 1.8, 0.7, 0.35, '#F7F3EA', -L / 2 + 0.9, 1.5, -0.12, { boxen: b, rund: 0.01 });
  },
  kuehlschrank(g, b) {
    kasten(g, 0.7, 1.9, 0.7, '#EEF3F6', 0, 0, 0, { boxen: b, rund: 0.05 });
    kasten(g, 0.68, 0.01, 0.01, '#BCC6CC', 0, 1.2, 0.35, { kollider: false, rund: 0 });
    kasten(g, 0.03, 0.4, 0.04, '#9AA5AD', 0.27, 1.35, 0.36, { kollider: false, rund: 0.01 });
    kasten(g, 0.03, 0.3, 0.04, '#9AA5AD', 0.27, 0.8, 0.36, { kollider: false, rund: 0.01 });
    kasten(g, 0.1, 0.1, 0.01, '#E74C3C', -0.15, 1.5, 0.355, { kollider: false, rund: 0.01 });
  },
  schuhschrank(g, b) {
    kasten(g, 1.0, 0.9, 0.35, '#E4D3B5', 0, 0, 0, { boxen: b });
    kasten(g, 0.01, 0.8, 0.01, '#B49E7C', 0, 0.05, 0.175, { kollider: false, rund: 0 });
  },
  kommode(g, b) {
    kasten(g, 1.0, 0.85, 0.45, '#D9B98C', 0, 0, 0, { boxen: b });
    for (const y of [0.12, 0.38, 0.64]) {
      kasten(g, 0.92, 0.22, 0.02, '#E8CDA6', 0, y, 0.22, { kollider: false, rund: 0.01 });
      zyl(g, 0.02, 0.02, 0.03, '#7A5A3A', 0, y + 0.1, 0.24, 8).rotation.x = Math.PI / 2;
    }
  },
  bett(g, b, o) {
    const W = o.w || 1.6, L = o.l || 2.0, decke = o.decke || '#E8A0A8';
    kasten(g, W, 0.3, L, HOLZ, 0, 0, 0, { kollider: false });
    kasten(g, W - 0.08, 0.2, L - 0.08, WEISS, 0, 0.3, 0.02, { kollider: false, rund: 0.06 });
    b.push([0, 0.25, 0, W, 0.5, L]);
    kasten(g, W - 0.04, 0.07, L * 0.62, decke, 0, 0.49, L * 0.18, { kollider: false, rund: 0.03 });
    const n = W > 1.2 ? [-W / 4, W / 4] : [0];
    for (const x of n) kasten(g, W / n.length - 0.15, 0.12, 0.35, '#FFFFFF', x, 0.5, -L / 2 + 0.3, { kollider: false, rund: 0.05 });
    kasten(g, W, 0.95, 0.08, HOLZ_DUNKEL, 0, 0, -L / 2 + 0.04, { boxen: b });
  },
  kinderbett(g, b, o) { BAU.bett(g, b, { w: 0.9, l: 1.9, decke: '#5B8DEF' }); },
  nachttisch(g, b) {
    kasten(g, 0.45, 0.5, 0.4, '#D9B98C', 0, 0, 0, { boxen: b });
    zyl(g, 0.015, 0.015, 0.03, '#7A5A3A', 0, 0.32, 0.2, 8).rotation.x = Math.PI / 2;
  },
  kleiderschrank(g, b) {
    kasten(g, 1.8, 2.1, 0.6, '#C99A6B', 0, 0, 0, { boxen: b });
    kasten(g, 0.01, 2.0, 0.01, '#8E6A47', 0, 0.05, 0.3, { kollider: false, rund: 0 });
    for (const x of [-0.08, 0.08]) kasten(g, 0.03, 0.3, 0.03, '#6E4F33', x, 1.0, 0.31, { kollider: false, rund: 0.01 });
  },
  schreibtisch(g, b) {
    kasten(g, 1.2, 0.05, 0.6, '#F2F2F2', 0, 0.7, 0, { boxen: b });
    for (const x of [-0.58, 0.58]) kasten(g, 0.04, 0.7, 0.58, '#5B8DEF', x, 0, 0, { boxen: b, rund: 0.01 });
  },
  spielzeugkiste(g, b) {
    kasten(g, 0.8, 0.5, 0.5, '#E74C3C', 0, 0, 0, { boxen: b, rund: 0.04 });
    kasten(g, 0.82, 0.06, 0.52, '#F1C40F', 0, 0.48, 0, { kollider: false, rund: 0.02 });
    kasten(g, 0.18, 0.18, 0.18, '#3498DB', -0.2, 0.52, 0, { kollider: false, rund: 0.02 });
  },
  badewanne(g, b) {
    const W = 1.7, H = 0.6, D = 0.75, t = 0.08;
    kasten(g, W, 0.1, D, WEISS, 0, 0, 0, { boxen: b, rund: 0.02 });
    for (const z of [-D / 2 + t / 2, D / 2 - t / 2]) kasten(g, W, H, t, WEISS, 0, 0, z, { boxen: b, rund: 0.03 });
    for (const x of [-W / 2 + t / 2, W / 2 - t / 2]) kasten(g, t, H, D, WEISS, x, 0, 0, { boxen: b, rund: 0.03 });
    const w = kasten(g, W - 2 * t, 0.01, D - 2 * t, mat('#7FC8EE', { op: 0.6, r: 0.05 }), 0, 0.42, 0, { kollider: false, rund: 0 });
    w.castShadow = false;
    kugel(g, 0.05, '#FFD23F', 0.3, 0.45, 0.05, 1.1, 0.9, 1);   // Quietscheentchen
  },
  waschbecken(g, b) {
    zyl(g, 0.09, 0.12, 0.7, WEISS, 0, 0, -0.05, 12);
    kasten(g, 0.6, 0.15, 0.45, WEISS, 0, 0.7, 0, { boxen: b, rund: 0.05 });
    b.push([0, 0.35, -0.05, 0.22, 0.7, 0.22]);
    kasten(g, 0.5, 0.6, 0.02, mat('#d8eef5', { m: 0.7, r: 0.05 }), 0, 1.1, -0.21, { kollider: false, rund: 0.01 });
  },
  toilette(g, b) {
    zyl(g, 0.15, 0.12, 0.4, WEISS, 0, 0, 0.05, 14); b.push([0, 0.2, 0.05, 0.32, 0.4, 0.4]);
    kasten(g, 0.38, 0.4, 0.18, WEISS, 0, 0.35, -0.22, { boxen: b, rund: 0.04 });
    zyl(g, 0.17, 0.17, 0.03, '#EDEDED', 0, 0.4, 0.06, 16);
  },
  waschmaschine(g, b) {
    kasten(g, 0.6, 0.85, 0.6, '#F4F6F8', 0, 0, 0, { boxen: b, rund: 0.04 });
    const tuer = zyl(g, 0.17, 0.17, 0.03, mat('#5F7C8A', { r: 0.2 }), 0, 0, 0, 20);
    tuer.rotation.x = Math.PI / 2; tuer.position.set(0, 0.4, 0.3);
    kasten(g, 0.5, 0.08, 0.02, '#C9D2D8', 0, 0.72, 0.3, { kollider: false, rund: 0.01 });
  },
  heizung(g, b) {
    kasten(g, 0.8, 1.4, 0.4, mat('#B8BEC4', { m: 0.4, r: 0.4 }), 0, 0, 0, { boxen: b, rund: 0.04 });
    for (const x of [-0.25, 0.25]) zyl(g, 0.03, 0.03, 1.0, mat('#B87333', { m: 0.6, r: 0.35 }), x, 1.4, -0.1, 8);
    kasten(g, 0.12, 0.12, 0.02, '#E74C3C', 0.2, 1.1, 0.2, { kollider: false, rund: 0.02 });
  },
  werkbank(g, b) {
    kasten(g, 2.0, 0.06, 0.7, HOLZ, 0, 0.84, 0, { boxen: b, rund: 0.01 });
    beine(g, 2.0, 0.7, 0.84, HOLZ_DUNKEL, 0.07, b);
    kasten(g, 2.0, 0.03, 0.6, HOLZ, 0, 0.2, 0, { boxen: b, rund: 0 });
    kasten(g, 0.3, 0.05, 0.08, '#C0392B', -0.4, 0.9, 0.1, { kollider: false, rund: 0.01 });
    kasten(g, 1.6, 0.8, 0.03, '#C9A97A', 0, 1.1, -0.34, { kollider: false, rund: 0 });
  },
  kiste(g, b) {
    kasten(g, 0.5, 0.5, 0.5, '#C9A26B', 0, 0, 0, { boxen: b, rund: 0.015 });
    kasten(g, 0.505, 0.02, 0.08, '#B48A55', 0, 0.48, 0, { kollider: false, rund: 0 });
  },
  truhe(g, b) {
    kasten(g, 1.0, 0.45, 0.55, '#6E4A2B', 0, 0, 0, { boxen: b });
    kasten(g, 1.0, 0.15, 0.55, '#7E5634', 0, 0.45, 0, { boxen: b, rund: 0.06 });
    for (const x of [-0.35, 0.35]) kasten(g, 0.05, 0.61, 0.57, mat('#C9A227', { m: 0.6, r: 0.4 }), x, 0, 0, { kollider: false, rund: 0.01 });
  },
  gelaender(g, b, o) {
    const L = o.laenge || 4;
    kasten(g, L, 0.05, 0.06, HOLZ_DUNKEL, 0, 0.88, 0, { kollider: false });
    for (let x = -L / 2 + 0.05; x <= L / 2; x += 0.25) zyl(g, 0.015, 0.015, 0.88, WEISS, x, 0, 0, 6);
    b.push([0, 0.45, 0, L, 0.9, 0.06]);
  },
  teppich(g, b, o) {
    const w = o.breite || 2, d = o.tiefe || 1.5;
    const m = kasten(g, w, 0.012, d, o.farbe || '#8C3B3B', 0, 0.001, 0, { kollider: false, rund: 0 });
    m.castShadow = false;
    const r = kasten(g, w - 0.2, 0.004, d - 0.2, mat('#ffffff', { op: 0.18 }), 0, 0.013, 0, { kollider: false, rund: 0 });
    r.castShadow = false;
  },
  napf(g) {
    zyl(g, 0.13, 0.1, 0.07, '#E74C3C', 0, 0, 0, 18);
    zyl(g, 0.105, 0.105, 0.005, '#8B5A2B', 0, 0.065, 0, 16);
  },
  katzenkissen(g, b) {
    zyl(g, 0.36, 0.34, 0.12, '#9B59B6', 0, 0, 0, 20); b.push([0, 0.06, 0, 0.66, 0.12, 0.66]);
    zyl(g, 0.27, 0.27, 0.03, '#C39BD3', 0, 0.11, 0, 20);
  },
  katzenbrett(g, b) {
    kasten(g, 0.45, 0.05, 0.45, '#E8A85C', 0, -0.05, 0, { boxen: b, rund: 0.015 });
    kasten(g, 0.4, 0.04, 0.4, '#F4E1C1', 0, -0.005, 0, { kollider: false, rund: 0.015 });
  },
};

// ---------- Подвижные вещи ----------
const DYN = {
  vase(g) {
    const pts = [[0, 0], [0.06, 0], [0.085, 0.05], [0.09, 0.12], [0.07, 0.22], [0.045, 0.28], [0.05, 0.32], [0.06, 0.34]].map(([r, y]) => new T.Vector2(r, y - 0.17));
    const farbe = ['#3A7BD5', '#D5573A', '#2BAE9A', '#B03AD5'][Math.floor(Math.random() * 4)];
    mesh(new T.LatheGeometry(pts, 18), mat(farbe, { r: 0.25 }), 0, 0, 0, g);
    mesh(new T.TorusGeometry(0.088, 0.008, 6, 18), '#F5F0E0', 0, -0.05, 0, g).rotation.x = Math.PI / 2;
    kugel(g, 0.03, '#FF6F91', 0, 0.2, 0); kugel(g, 0.025, '#FFD23F', 0.03, 0.19, 0.02);
    return { form: 'zylinder', r: 0.085, h: 0.34 };
  },
  tasse(g) {
    const f = ['#E74C3C', '#F7F3EA', '#3498DB', '#F1C40F'][Math.floor(Math.random() * 4)];
    mesh(new T.CylinderGeometry(0.045, 0.038, 0.09, 14), mat(f, { r: 0.3 }), 0, 0, 0, g);
    mesh(new T.CylinderGeometry(0.038, 0.038, 0.005, 14), '#5A3825', 0, 0.04, 0, g);
    const h = mesh(new T.TorusGeometry(0.025, 0.007, 6, 12), mat(f, { r: 0.3 }), 0.05, 0, 0, g);
    return { form: 'zylinder', r: 0.045, h: 0.09 };
  },
  teller(g) {
    mesh(new T.CylinderGeometry(0.12, 0.08, 0.025, 20), mat('#FBFBF7', { r: 0.3 }), 0, 0, 0, g);
    kugel(g, 0.03, '#E67E22', 0.02, 0.02, 0, 1, 0.5, 1);
    return { form: 'zylinder', r: 0.12, h: 0.03 };
  },
  glas(g) {
    mesh(new T.CylinderGeometry(0.055, 0.055, 0.14, 14), mat('#cfefff', { op: 0.45, r: 0.1 }), 0, -0.01, 0, g);
    mesh(new T.CylinderGeometry(0.05, 0.05, 0.1, 14), mat('#B0263A', { r: 0.4 }), 0, -0.025, 0, g);
    mesh(new T.CylinderGeometry(0.058, 0.058, 0.03, 14), mat('#E74C3C', { r: 0.6 }), 0, 0.07, 0, g);
    return { form: 'zylinder', r: 0.058, h: 0.16 };
  },
  topf(g) {
    mesh(new T.CylinderGeometry(0.14, 0.13, 0.16, 18), mat('#9AA4AA', { m: 0.7, r: 0.3 }), 0, 0, 0, g);
    mesh(new T.CylinderGeometry(0.145, 0.145, 0.02, 18), mat('#7F8A90', { m: 0.7, r: 0.3 }), 0, 0.085, 0, g);
    for (const x of [-0.17, 0.17]) kasten(g, 0.06, 0.02, 0.04, '#333', x, 0.03, 0, { kollider: false, rund: 0.005 });
    return { form: 'zylinder', r: 0.14, h: 0.18 };
  },
  buch(g) {
    kasten(g, 0.16, 0.24, 0.05, ['#C0392B', '#27AE60', '#2E86C1'][Math.floor(Math.random() * 3)], 0, -0.12, 0, { kollider: false, rund: 0.008 });
    return { form: 'box', w: 0.16, h: 0.24, d: 0.05 };
  },
  wecker(g) {
    const k = mesh(new T.CylinderGeometry(0.055, 0.055, 0.05, 18), mat('#E74C3C', { m: 0.3, r: 0.3 }), 0, 0, 0, g);
    k.rotation.x = Math.PI / 2;
    const z = mesh(new T.CylinderGeometry(0.045, 0.045, 0.01, 18), '#FFFFFF', 0, 0, 0.026, g); z.rotation.x = Math.PI / 2;
    for (const x of [-0.035, 0.035]) kugel(g, 0.02, '#F1C40F', x, 0.055, 0);
    return { form: 'box', w: 0.12, h: 0.12, d: 0.06 };
  },
  ball(g) {
    kugel(g, 0.11, mat('#E74C3C', { r: 0.4 }), 0, 0, 0);
    mesh(new T.TorusGeometry(0.108, 0.012, 6, 24), '#FFFFFF', 0, 0, 0, g);
    return { form: 'ball', r: 0.11 };
  },
  wollknaeuel(g) {
    kugel(g, 0.07, mat('#E84393', { r: 0.95 }), 0, 0, 0);
    for (let i = 0; i < 3; i++) { const t = mesh(new T.TorusGeometry(0.068, 0.006, 4, 18), '#FD79A8', 0, 0, 0, g); t.rotation.set(i * 1.1, i * 0.7, 0); }
    return { form: 'ball', r: 0.07 };
  },
  bauklotz(g) {
    kasten(g, 0.18, 0.18, 0.18, ['#E74C3C', '#3498DB', '#F1C40F', '#2ECC71'][Math.floor(Math.random() * 4)], 0, -0.09, 0, { kollider: false, rund: 0.02 });
    return { form: 'box', w: 0.18, h: 0.18, d: 0.18 };
  },
  spielzeugmaus(g) {
    kugel(g, 0.04, '#9AA0A6', 0, 0, 0, 1.6, 0.9, 1);
    for (const z of [-0.025, 0.025]) kugel(g, 0.018, '#F5B7C5', 0.045, 0.03, z, 0.4, 1, 1);
    kugel(g, 0.008, '#F5B7C5', 0.07, 0, 0);
    const s = zyl(g, 0.004, 0.004, 0.1, '#F5B7C5', -0.1, -0.05, 0, 4); s.rotation.z = Math.PI / 2;
    return { form: 'box', w: 0.13, h: 0.06, d: 0.06 };
  },
};

// Предмет строится здесь.  anim = список функций, которые зовутся каждый кадр (рыбки и т.п.)
export function baueObjekt(o, anim) {
  const g = new T.Group();
  if (DYN[o.typ]) {
    const form = DYN[o.typ](g, o);
    return { obj: g, dynamisch: true, ...form };
  }
  const boxen = [];
  const f = BAU[o.typ];
  if (f) f(g, boxen, o, anim);
  else kasten(g, 0.4, 0.4, 0.4, '#FF00FF', 0, 0, 0, { boxen });   // неизвестный предмет – розовый куб
  return { obj: g, boxen };
}
