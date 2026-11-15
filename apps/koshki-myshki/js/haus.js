// Строит дом из level/haus.json: полы, стены, окна, лестницы, мебель, улицу.
// Всё твёрдое получает «невидимую стенку» (коллайдер) для физики Rapier.
import * as THREE from '../vendor/three.js';
import { mergeGeometries } from '../vendor/three.js';
import { KATALOG, OEFFNUNG } from './katalog.js';
import { baueObjekt, mat } from './modelle.js';
import { textur } from './texturen.js';

const T = THREE;
const DECKE = 0.2;      // толщина пола/потолка

export function baueHaus(haus, scene, world, R) {
  const statisch = new T.Group();        // всё неподвижное – потом склеим для скорости
  const extra = new T.Group();           // прозрачное (стекло, вода) и анимированное
  scene.add(statisch, extra);
  const anim = [], dyn = [], kratz = new Map(), lampen = [], aquarien = [];
  const boden = world.createRigidBody(R.RigidBodyDesc.fixed());
  const [W, D] = haus.groesse;

  // Невидимая стенка-коробка (центр + размер), можно повернуть
  function kollider(cx, cy, cz, w, h, d, quat, meta) {
    const desc = R.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setTranslation(cx, cy, cz).setFriction(0.8);
    if (quat) desc.setRotation(quat);
    const c = world.createCollider(desc, boden);
    if (meta) kratz.set(c.handle, meta);
    return c;
  }
  // Коробка: видимая + твёрдая.  (x0..x1, y0..y1, z0..z1)
  function block(x0, x1, y0, y1, z0, z1, material, { fest = true, ziel = statisch } = {}) {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    if (w <= 0.001 || h <= 0.001 || d <= 0.001) return null;
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), material);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.castShadow = m.receiveShadow = true;
    ziel.add(m);
    if (fest) kollider(m.position.x, m.position.y, m.position.z, w, h, d);
    return m;
  }

  const etagen = haus.etagen;
  const deckeMat = new T.MeshStandardMaterial({ color: '#F6F3EE', roughness: 0.95 });
  const rahmenMat = mat('#FBFAF6', { r: 0.5 });
  const glasMat = new T.MeshStandardMaterial({ color: '#cfeaff', transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false });

  // ---------- Полы (с дырками для лестниц и кошачьих лазов) ----------
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
  etagen.forEach((e, i) => {
    const unten = etagen[i - 1];
    const loecher = [...(e.loecher || [])];
    if (unten) for (const t of unten.objekte.filter(o => o.typ === 'treppe'))
      loecher.push({ x0: Math.min(t.x0, t.x1), x1: Math.max(t.x0, t.x1), z0: Math.min(t.z0, t.z1), z1: Math.max(t.z0, t.z1) });
    for (const raum of e.raeume) {
      const bodenMat = new T.MeshStandardMaterial({ map: textur(raum.boden, raum.x1 - raum.x0, raum.z1 - raum.z0), roughness: raum.boden === 'fliesen' ? 0.35 : 0.8 });
      let rects = [{ x0: raum.x0, x1: raum.x1, z0: raum.z0, z1: raum.z1 }];
      for (const l of loecher) rects = minus(rects, l);
      for (const r of rects) {
        // Bodenbelag oben, Decke (weiß) unten – UV so, dass das Muster überall gleich läuft
        const m = block(r.x0, r.x1, e.y - 0.02, e.y, r.z0, r.z1, bodenMat, { fest: false });
        if (m) {
          const uv = m.geometry.attributes.uv, f = (r.x1 - r.x0) / (raum.x1 - raum.x0), g = (r.z1 - r.z0) / (raum.z1 - raum.z0);
          const ox = (r.x0 - raum.x0) / (raum.x1 - raum.x0), oz = (r.z0 - raum.z0) / (raum.z1 - raum.z0);
          for (let k = 0; k < uv.count; k++) uv.setXY(k, ox + uv.getX(k) * f, 1 - (oz + (1 - uv.getY(k)) * g));
        }
        block(r.x0, r.x1, e.y - DECKE, e.y - 0.02, r.z0, r.z1, i === 0 ? mat('#8C877F') : deckeMat, { fest: false });
        kollider((r.x0 + r.x1) / 2, e.y - DECKE / 2, (r.z0 + r.z1) / 2, r.x1 - r.x0, DECKE, r.z1 - r.z0);
      }
    }
  });
  // Крыша-потолок над чердаком
  const top = etagen[etagen.length - 1], dachY = top.y + top.hoehe;
  const luke = haus.dachluke;   // Loch in der Decke der Geheimkammer → aufs Dach
  for (const r of luke ? minus([{ x0: 0, x1: W, z0: 0, z1: D }], luke) : [{ x0: 0, x1: W, z0: 0, z1: D }]) block(r.x0, r.x1, dachY - DECKE, dachY, r.z0, r.z1, deckeMat);

  // ---------- Стены ----------
  const aussenMat = mat('#EAD9BC', { r: 0.95 });   // Fassade: heller Putz
  for (const e of etagen) {
    const innen = new T.MeshStandardMaterial({ color: e.wandfarbe, roughness: 0.92 });
    const wh = e.hoehe - DECKE;   // высота стены до потолка
    for (const w of e.waende) {
      const [ax, az] = w.a, [bx, bz] = w.b;
      const langX = Math.abs(bx - ax) > Math.abs(bz - az);
      const len = langX ? Math.abs(bx - ax) : Math.abs(bz - az);
      const s0g = langX ? Math.min(ax, bx) : Math.min(az, bz);
      const quer = langX ? az : ax;
      const t = w.aussen ? 0.25 : 0.15;
      const ext = w.aussen ? t / 2 : 0;   // Außenwände ragen an den Ecken etwas über
      const richtung = (langX ? (bx > ax) : (bz > az)) ? 1 : -1;
      // Außenseite: wo ist «draußen»?
      const aussenSeite = w.aussen ? (quer <= 0.01 ? -1 : 1) : 0;
      const stueck = (s0, s1, y0, y1, materialInnen = innen) => {
        // s entlang der Wand (0..len) → Weltkoordinaten
        const a = s0g + s0, b = s0g + s1;
        const q0 = quer - t / 2, q1 = quer + t / 2;
        const box = (qa, qb, m, fest) => langX ? block(a, b, e.y + y0, e.y + y1, qa, qb, m, { fest }) : block(qa, qb, e.y + y0, e.y + y1, a, b, m, { fest });
        if (aussenSeite) {
          const haut = 0.03;
          if (aussenSeite < 0) { box(q0, q0 + haut, aussenMat, false); box(q0 + haut, q1, materialInnen, false); }
          else { box(q1 - haut, q1, aussenMat, false); box(q0, q1 - haut, materialInnen, false); }
          langX ? kollider((a + b) / 2, e.y + (y0 + y1) / 2, quer, b - a, y1 - y0, t) : kollider(quer, e.y + (y0 + y1) / 2, (a + b) / 2, t, y1 - y0, b - a);
        } else box(q0, q1, materialInnen, true);
      };
      const oeff = (w.oeffnungen || []).map(o => {
        const def = { ...OEFFNUNG[o.typ], ...o };
        const mitte = richtung > 0 ? o.pos : len - o.pos;   // pos zählt ab Punkt a
        return { ...def, s0: mitte - def.breite / 2, s1: mitte + def.breite / 2 };
      }).sort((p, q) => p.s0 - q.s0);
      let s = -ext;
      for (const o of oeff) {
        stueck(s, o.s0, 0, wh);
        if (o.unten > 0) stueck(o.s0, o.s1, 0, o.unten);
        if (o.unten + o.hoehe < wh) stueck(o.s0, o.s1, o.unten + o.hoehe, wh);
        oeffnungDeko(o, e, langX, s0g, quer, t);
        s = o.s1;
      }
      stueck(s, len + ext, 0, wh);
    }
  }

  // Рамы окон, стекло, двери
  function oeffnungDeko(o, e, langX, s0g, quer, t) {
    const a = s0g + o.s0, b = s0g + o.s1, y0 = e.y + o.unten, y1 = e.y + o.unten + o.hoehe;
    const r = 0.06;
    const box = (sa, sb, ya, yb, qa, qb, m, fest = false, ziel) => langX ? block(sa, sb, ya, yb, qa, qb, m, { fest, ziel }) : block(qa, qb, ya, yb, sa, sb, m, { fest, ziel });
    const q0 = quer - t / 2 - 0.02, q1 = quer + t / 2 + 0.02;
    if (o.typ === 'fenster') {
      box(a - r, a, y0, y1, q0, q1, rahmenMat); box(b, b + r, y0, y1, q0, q1, rahmenMat);
      box(a - r, b + r, y1, y1 + r, q0, q1, rahmenMat); box(a - r - 0.04, b + r + 0.04, y0 - 0.05, y0, q0 - 0.06, q1 + 0.06, rahmenMat, true);
      box((a + b) / 2 - 0.025, (a + b) / 2 + 0.025, y0, y1, quer - 0.03, quer + 0.03, rahmenMat);
      const g = box(a, b, y0, y1, quer - 0.005, quer + 0.005, glasMat, true, extra);
      if (g) g.castShadow = false;
    } else if (o.typ === 'tuer' || o.typ === 'haustuer') {
      box(a - r, a, y0, y1, q0, q1, rahmenMat); box(b, b + r, y0, y1, q0, q1, rahmenMat);
      box(a - r, b + r, y1, y1 + r, q0, q1, rahmenMat);
      if (o.typ === 'haustuer') {
        box(a, b, y0, y1, quer - 0.04, quer + 0.04, mat('#8B4A2B', { r: 0.6 }), true);
        const knauf = new T.Mesh(new T.SphereGeometry(0.04, 10, 8), mat('#D4AF37', { m: 0.8, r: 0.3 }));
        knauf.position.set(langX ? b - 0.12 : quer + 0.07, y0 + 1.0, langX ? quer + 0.07 : b - 0.12);
        statisch.add(knauf);
      }
    } else if (o.typ === 'klappe') {
      const orange = mat('#FF8C2B', { r: 0.5 });
      box(a - 0.04, a, y0, y1, q0, q1, orange); box(b, b + 0.04, y0, y1, q0, q1, orange);
      box(a - 0.04, b + 0.04, y1, y1 + 0.04, q0, q1, orange);
    }
  }

  // ---------- Лестницы ----------
  function treppe(t, e, oben) {
    const rise = oben.y - e.y;
    const x0 = Math.min(t.x0, t.x1), x1 = Math.max(t.x0, t.x1), z0 = Math.min(t.z0, t.z1), z1 = Math.max(t.z0, t.z1);
    const entlangX = t.richtung.endsWith('x');
    const L = entlangX ? x1 - x0 : z1 - z0, B = entlangX ? z1 - z0 : x1 - x0;
    const winkel = { '+x': 0, '-x': Math.PI, '+z': -Math.PI / 2, '-z': Math.PI / 2 }[t.richtung];
    const g = new T.Group();
    g.position.set((x0 + x1) / 2, e.y, (z0 + z1) / 2);
    g.rotation.y = winkel;
    const n = Math.round(rise / 0.18), run = L / n;
    const stufe = mat('#B98552', { r: 0.6 }), seite = mat('#F1ECE2');
    const lokal = [];   // Kollider in lokalen Koordinaten
    for (let i = 0; i < n; i++) {
      const h = (i + 1) * rise / n;
      const m = new T.Mesh(new T.BoxGeometry(run, 0.04, B), stufe);
      m.position.set(-L / 2 + (i + 0.5) * run, h - 0.02, 0); g.add(m);
      const k = new T.Mesh(new T.BoxGeometry(run, h - 0.04, B - 0.02), seite);
      k.position.set(-L / 2 + (i + 0.5) * run, (h - 0.04) / 2, 0); g.add(k);
      if (i > 0) lokal.push([-L / 2 + (i + 0.5) * run, (i * rise / n) / 2, 0, run, i * rise / n, B]);
    }
    for (const m of g.children) { m.castShadow = m.receiveShadow = true; }
    statisch.add(g);
    g.updateMatrixWorld(true);
    const q = new T.Quaternion().setFromEuler(new T.Euler(0, winkel, 0));
    const v = new T.Vector3();
    for (const [cx, cy, cz, w, h, d] of lokal) { v.set(cx, cy, cz).applyMatrix4(g.matrixWorld); kollider(v.x, v.y, v.z, w, h, d, q); }
    // Rampe (glatt, damit die Katze nicht an jeder Stufe hängen bleibt)
    const a = Math.atan2(rise, L), dicke = 0.1, lang = Math.hypot(L, rise);
    const rq = new T.Quaternion().setFromEuler(new T.Euler(0, winkel, a, 'YXZ'));
    v.set(Math.sin(a) * dicke / 2, rise / 2 - Math.cos(a) * dicke / 2, 0).applyMatrix4(g.matrixWorld);
    kollider(v.x, v.y, v.z, lang, dicke, B, rq);
  }

  // ---------- Мебель и вещи ----------
  const tmp = new T.Vector3();
  // Einen Gegenstand aufstellen (auch für draußen: Nachbarhaus, Restaurant …).  basisY = Fußboden
  function stelle(o, basisY, etageNr = -1, ziel = statisch) {
      const k = KATALOG[o.typ] || {};
      const teil = baueObjekt(o, anim);
      const rot = (o.rot || 0) * Math.PI / 180;
      if (teil.dynamisch) {
        const h = teil.form === 'ball' ? teil.r * 2 : teil.h;
        const y = basisY + (o.y || 0) + h / 2 + 0.005;
        const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(o.x, y, o.z).setRotation(new T.Quaternion().setFromEuler(new T.Euler(0, rot, 0))).setLinearDamping(0.1).setAngularDamping(teil.form === 'ball' ? 0.3 : 0.6).setCcdEnabled(true));
        const cd = teil.form === 'ball' ? R.ColliderDesc.ball(teil.r) : teil.form === 'zylinder' ? R.ColliderDesc.cylinder(teil.h / 2, teil.r) : R.ColliderDesc.cuboid(teil.w / 2, teil.h / 2, teil.d / 2);
        cd.setMass(k.masse || 0.5).setFriction(teil.form === 'ball' ? 0.9 : 0.6).setRestitution(teil.form === 'ball' ? 0.55 : 0.1);
        const col = world.createCollider(cd, body);
        teil.obj.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
        teil.obj.position.set(o.x, y, o.z);
        scene.add(teil.obj);
        const d = { body, col, obj: teil.obj, typ: o.typ, k, prev: 0, ruhig: 0 };
        dyn.push(d);
        return d;
      }
      teil.obj.position.set(o.x, basisY + (o.y || 0), o.z);
      teil.obj.rotation.y = rot;
      // Aquarium & Co. (bewegt / durchsichtig) nicht zusammenkleben
      (anim.length && o.typ === 'aquarium' ? extra : ziel).add(teil.obj);
      const aq = o.typ === 'aquarium' ? { obj: teil.obj, x: o.x, y: basisY + (o.y || 0), z: o.z, rot, etage: etageNr, cols: [] } : null;
      if (aq) aquarien.push(aq);
      teil.obj.updateMatrixWorld(true);
      const q = new T.Quaternion().setFromEuler(new T.Euler(0, rot, 0));
      const meta = { typ: o.typ, name: k.name, kratzbar: k.kratzbar };
      if (!k.flach) for (const [cx, cy, cz, w, h, d] of teil.boxen) {
        tmp.set(cx, cy, cz).applyMatrix4(teil.obj.matrixWorld);
        const c = kollider(tmp.x, tmp.y, tmp.z, w, h, d, q, meta);
        if (aq) aq.cols.push(c);          // zum Umkippen abschaltbar
      }
      return teil;
  }
  etagen.forEach((e, i) => {
    for (const o of e.objekte) {
      if (o.typ === 'treppe') { treppe(o, e, etagen[i + 1]); continue; }
      stelle(o, e.y, i);
    }
    // Lampen
    for (const l of e.lampen || []) {
      const p = new T.PointLight('#FFD9A0', 6, 9, 1.6);
      p.position.set(l.x, e.y + l.y, l.z);
      scene.add(p); lampen.push(p);
      const birne = new T.Mesh(new T.SphereGeometry(0.09, 12, 8), mat('#FFF3D6', { e: 0xFFE2A8, ei: 2 }));
      birne.position.copy(p.position); extra.add(birne);
      const kabel = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, e.hoehe - DECKE - l.y), mat('#222'));
      kabel.position.set(l.x, e.y + (l.y + e.hoehe - DECKE) / 2, l.z); extra.add(kabel);
    }
  });

  // ---------- Крыша (Garten, Straße & Co. baut draussen.js) ----------
  aussen(scene, statisch, W, D, dachY, block, kollider, luke);

  // ---------- Склеить неподвижное (меньше работы для видеокарты) ----------
  verkleben(statisch);

  // В какой комнате кошка?
  const DACH = { name: 'Auf dem Dach' };
  function raumAn(p) {
    if (p.y > dachY - 0.05 && p.x > -0.6 && p.x < W + 0.6 && p.z > -0.6 && p.z < D + 0.6) return { etage: DACH, raum: null };
    for (let i = etagen.length - 1; i >= 0; i--) {
      const e = etagen[i];
      if (p.y < e.y - 0.3) continue;
      for (const r of e.raeume) if (p.x >= r.x0 && p.x < r.x1 && p.z >= r.z0 && p.z < r.z1) return { etage: e, raum: r };
      return { etage: e, raum: null };
    }
    return { etage: etagen[0], raum: null };
  }
  return { dyn, anim, kratz, raumAn, aquarien, etagen, lampen, mitte: new T.Vector3(W / 2, 2, D / 2), block, kollider, stelle, extra, minus };
}

function aussen(scene, statisch, W, D, dachY, block, kollider, luke) {
  // Satteldach – man kann darauf laufen (schräge Kollider)
  const dachMat = mat('#B5523B', { r: 0.8 });
  const hoch = 2.2, ueber = 0.5, dick = 0.15;
  const schraeg = Math.hypot(D / 2 + ueber, hoch), winkel = Math.atan2(hoch, D / 2 + ueber);
  const cos = Math.cos(winkel), sin = Math.sin(winkel);
  // Ein Stück Dachbrett: x0..x1, u0..u1 = Abstand vom First die Schräge runter
  function brett(s, x0, x1, u0, u1) {
    if (x1 - x0 < 0.01 || u1 - u0 < 0.01) return;
    const lz = (u0 + u1) / 2 - schraeg / 2;                 // Mitte im Brett
    const cy = dachY + hoch / 2 - lz * sin, cz = D / 2 + s * (D / 4 + ueber / 2 + lz * cos);
    const p = new T.Mesh(new T.BoxGeometry(x1 - x0, dick, u1 - u0), dachMat);
    p.position.set((x0 + x1) / 2, cy, cz); p.rotation.x = s * winkel;
    p.castShadow = p.receiveShadow = true; statisch.add(p);
    p.updateMatrixWorld();
    kollider(p.position.x, cy, cz, x1 - x0, dick, u1 - u0, new T.Quaternion().setFromEuler(p.rotation));
  }
  const dachH = z => dachY + hoch * (D / 2 + ueber - Math.abs(z - D / 2)) / (D / 2 + ueber) + dick / 2 / cos;   // Höhe der Dachfläche
  for (const s of [-1, 1]) {
    if (s === 1 && luke) {          // Südseite mit Dachluke: um das Loch herum
      const u0 = (luke.z0 - D / 2) / cos, u1 = (luke.z1 - D / 2) / cos;
      brett(s, -ueber, luke.x0, 0, schraeg); brett(s, luke.x1, W + ueber, 0, schraeg);
      brett(s, luke.x0, luke.x1, 0, u0); brett(s, luke.x0, luke.x1, u1, schraeg);
    } else brett(s, -ueber, W + ueber, 0, schraeg);
  }
  const giebel = new T.Shape([new T.Vector2(-D / 2, 0), new T.Vector2(D / 2, 0), new T.Vector2(0, hoch)]);
  for (const x of [0, W]) {
    const m = new T.Mesh(new T.ExtrudeGeometry(giebel, { depth: 0.25, bevelEnabled: false }), mat('#E9DCC5'));
    m.rotation.y = Math.PI / 2; m.position.set(x - 0.125, dachY, D / 2);
    m.castShadow = m.receiveShadow = true; statisch.add(m);
  }
  if (!luke) return;
  // Lukenrahmen (Holz) – damit man nicht unters Dach kriecht. Deckel steht offen.
  const holz = mat('#8B5A36', { r: 0.8 }), oben = dachH(luke.z0) + 0.04;
  block(luke.x0 - 0.06, luke.x1 + 0.06, dachY, oben, luke.z0 - 0.06, luke.z0, holz);
  block(luke.x0 - 0.06, luke.x1 + 0.06, dachY, dachH(luke.z1) + 0.04, luke.z1, luke.z1 + 0.06, holz);
  block(luke.x0 - 0.06, luke.x0, dachY, oben, luke.z0, luke.z1, holz);
  block(luke.x1, luke.x1 + 0.06, dachY, oben, luke.z0, luke.z1, holz);
  const deckel = new T.Mesh(new T.BoxGeometry(luke.x1 - luke.x0, 0.04, luke.z1 - luke.z0), holz);
  deckel.position.set((luke.x0 + luke.x1) / 2, oben + (luke.z1 - luke.z0) / 2 * 0.7, luke.z0 - 0.1); deckel.rotation.x = 1.2; statisch.add(deckel);

  // Schornstein + Katzen-Unterschlupf daneben (flaches Brett, kleines Dach, Kissen)
  const stein = mat('#9A4A3A', { r: 0.9 }), sx = 12.6, sz = 5.9;
  block(sx - 0.35, sx + 0.35, dachH(sz + 0.35) - 0.3, dachY + hoch + 1.0, sz - 0.35, sz + 0.35, stein);
  block(sx - 0.42, sx + 0.42, dachY + hoch + 1.0, dachY + hoch + 1.12, sz - 0.42, sz + 0.42, mat('#6E3529'));
  const by = dachY + hoch + 0.05;                                  // Boden der Hütte (knapp über dem First)
  const hx0 = 10.6, hx1 = 12.2, hz0 = 5.0, hz1 = 6.5;
  block(hx0, hx1, by - 0.08, by, hz0, hz1, holz);                   // Boden
  for (const [x, z] of [[hx0 + 0.05, hz1 - 0.05], [hx1 - 0.05, hz1 - 0.05]]) block(x - 0.04, x + 0.04, dachH(z) - 0.1, by - 0.08, z - 0.04, z + 0.04, holz, { fest: false });
  block(hx0, hx0 + 0.06, by, by + 0.7, hz0, hz1, holz);             // Rückwand (Westen)
  block(hx0, hx1, by, by + 0.7, hz0, hz0 + 0.06, holz);             // Nordwand
  block(hx0 - 0.1, hx1 + 0.1, by + 0.7, by + 0.76, hz0 - 0.1, hz1 + 0.15, mat('#2E7D5B', { r: 0.8 }));   // Dach (grün)
  block(hx0 + 0.15, hx1 - 0.2, by, by + 0.1, hz0 + 0.15, hz1 - 0.2, mat('#E8A0B8', { r: 1 }), { fest: false });   // Kissen
}

export function verkleben(gruppe) {
  gruppe.updateMatrixWorld(true);
  const proMat = new Map();
  const weg = [];
  gruppe.traverse(m => {
    if (!m.isMesh || Array.isArray(m.material) || m.material.transparent) return;
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    geo.applyMatrix4(m.matrixWorld);
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    geo.clearGroups();
    if (!proMat.has(m.material)) proMat.set(m.material, []);
    proMat.get(m.material).push(geo);
    weg.push(m);
  });
  for (const m of weg) { m.parent.remove(m); m.geometry.dispose(); }
  for (const [material, geos] of proMat) {
    const g = mergeGeometries(geos, false);
    if (!g) continue;
    const m = new T.Mesh(g, material);
    m.castShadow = m.receiveShadow = true;
    gruppe.add(m);
  }
  // leere Untergruppen bleiben – stören nicht
}
