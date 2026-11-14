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
  const anim = [], dyn = [], kratz = new Map(), lampen = [];
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
  block(0, W, dachY - DECKE, dachY, 0, D, deckeMat);

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
  etagen.forEach((e, i) => {
    for (const o of e.objekte) {
      if (o.typ === 'treppe') { treppe(o, e, etagen[i + 1]); continue; }
      const k = KATALOG[o.typ] || {};
      const teil = baueObjekt(o, anim);
      const rot = (o.rot || 0) * Math.PI / 180;
      if (teil.dynamisch) {
        const h = teil.form === 'ball' ? teil.r * 2 : teil.h;
        const y = e.y + (o.y || 0) + h / 2 + 0.005;
        const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(o.x, y, o.z).setRotation(new T.Quaternion().setFromEuler(new T.Euler(0, rot, 0))).setLinearDamping(0.1).setAngularDamping(teil.form === 'ball' ? 0.3 : 0.6).setCcdEnabled(true));
        const cd = teil.form === 'ball' ? R.ColliderDesc.ball(teil.r) : teil.form === 'zylinder' ? R.ColliderDesc.cylinder(teil.h / 2, teil.r) : R.ColliderDesc.cuboid(teil.w / 2, teil.h / 2, teil.d / 2);
        cd.setMass(k.masse || 0.5).setFriction(teil.form === 'ball' ? 0.9 : 0.6).setRestitution(teil.form === 'ball' ? 0.55 : 0.1);
        const col = world.createCollider(cd, body);
        teil.obj.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
        teil.obj.position.set(o.x, y, o.z);
        scene.add(teil.obj);
        dyn.push({ body, col, obj: teil.obj, typ: o.typ, k, prev: 0, ruhig: 0 });
        continue;
      }
      teil.obj.position.set(o.x, e.y + (o.y || 0), o.z);
      teil.obj.rotation.y = rot;
      // Aquarium & Co. (bewegt / durchsichtig) nicht zusammenkleben
      (anim.length && o.typ === 'aquarium' ? extra : statisch).add(teil.obj);
      teil.obj.updateMatrixWorld(true);
      const q = new T.Quaternion().setFromEuler(new T.Euler(0, rot, 0));
      const meta = k.kratzbar ? { typ: o.typ, name: k.name, kratzbar: k.kratzbar } : null;
      if (!k.flach) for (const [cx, cy, cz, w, h, d] of teil.boxen) {
        tmp.set(cx, cy, cz).applyMatrix4(teil.obj.matrixWorld);
        kollider(tmp.x, tmp.y, tmp.z, w, h, d, q, meta);
      }
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

  // ---------- Улица: трава, деревья, крыша ----------
  aussen(scene, statisch, W, D, dachY, block);
  // Fester Boden draußen (rund ums Haus)
  for (const [x0, x1, z0, z1] of [[-30, 0, -30, 40], [W, W + 30, -30, 40], [0, W, -30, 0], [0, W, D, 40]])
    kollider((x0 + x1) / 2, -0.25, (z0 + z1) / 2, x1 - x0, 0.5, z1 - z0);

  // ---------- Склеить неподвижное (меньше работы для видеокарты) ----------
  verkleben(statisch);

  // В какой комнате кошка?
  function raumAn(p) {
    for (let i = etagen.length - 1; i >= 0; i--) {
      const e = etagen[i];
      if (p.y < e.y - 0.3) continue;
      for (const r of e.raeume) if (p.x >= r.x0 && p.x < r.x1 && p.z >= r.z0 && p.z < r.z1) return { etage: e, raum: r };
      return { etage: e, raum: null };
    }
    return { etage: etagen[0], raum: null };
  }
  return { dyn, anim, kratz, raumAn, etagen, lampen, mitte: new T.Vector3(W / 2, 2, D / 2) };
}

function aussen(scene, statisch, W, D, dachY, block) {
  const gras = new T.MeshStandardMaterial({ map: textur('gras', 60, 60), roughness: 1 });
  const g = new T.Mesh(new T.PlaneGeometry(60, 60), gras);
  g.rotation.x = -Math.PI / 2; g.position.set(W / 2, -0.01, D / 2); g.receiveShadow = true;
  // Loch unter dem Haus ist egal – der Keller hat eigene Wände
  scene.add(g);
  // Weg zur Haustür
  const weg = new T.Mesh(new T.BoxGeometry(1.4, 0.02, 4), mat('#CBBFA8'));
  weg.position.set(W / 2, 0.0, -2.1); weg.receiveShadow = true; statisch.add(weg);
  // Satteldach (nur Deko)
  const dachMat = mat('#B5523B', { r: 0.8 });
  const hoch = 2.2, ueber = 0.5;
  const schraeg = Math.hypot(D / 2 + ueber, hoch);
  for (const s of [-1, 1]) {
    const p = new T.Mesh(new T.BoxGeometry(W + 2 * ueber, 0.15, schraeg), dachMat);
    p.position.set(W / 2, dachY + hoch / 2, D / 2 + s * (D / 4 + ueber / 2));
    p.rotation.x = s * Math.atan2(hoch, D / 2 + ueber);
    p.castShadow = p.receiveShadow = true; statisch.add(p);
  }
  const giebel = new T.Shape([new T.Vector2(-D / 2, 0), new T.Vector2(D / 2, 0), new T.Vector2(0, hoch)]);
  for (const x of [0, W]) {
    const m = new T.Mesh(new T.ExtrudeGeometry(giebel, { depth: 0.25, bevelEnabled: false }), mat('#E9DCC5'));
    m.rotation.y = Math.PI / 2; m.position.set(x - 0.125, dachY, D / 2);
    m.castShadow = m.receiveShadow = true; statisch.add(m);
  }
  // Bäume und Büsche
  const baum = (x, z, s = 1) => {
    const st = new T.Mesh(new T.CylinderGeometry(0.15 * s, 0.22 * s, 2 * s, 8), mat('#7A5230'));
    st.position.set(x, s, z); st.castShadow = true; statisch.add(st);
    for (let i = 0; i < 4; i++) {
      const k = new T.Mesh(new T.SphereGeometry((1.1 - i * 0.12) * s, 12, 10), mat(i % 2 ? '#4FA34A' : '#3E8E3E'));
      k.position.set(x + Math.cos(i * 1.7) * 0.5 * s, (2.2 + i * 0.35) * s, z + Math.sin(i * 1.7) * 0.5 * s);
      k.castShadow = true; statisch.add(k);
    }
  };
  baum(-4, 13, 1.3); baum(19, 12, 1.1); baum(-5, -3, 1.0); baum(18, -4, 1.4); baum(7, 17, 1.2);
  for (const [x, z] of [[2, 11.2], [4, 11.3], [10, 11.2], [12.5, 11.4], [-1.2, 6]]) {
    const b = new T.Mesh(new T.SphereGeometry(0.5, 12, 10), mat('#5DB04F')); b.scale.y = 0.7;
    b.position.set(x, 0.3, z); b.castShadow = true; statisch.add(b);
  }
  // Zaun
  const zaun = mat('#F4F1EA');
  for (let x = -6; x <= 20; x += 0.5) for (const z of [-7, 17]) { const p = new T.Mesh(new T.BoxGeometry(0.08, 0.8, 0.04), zaun); p.position.set(x, 0.4, z); p.castShadow = true; statisch.add(p); }
}

function verkleben(gruppe) {
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
