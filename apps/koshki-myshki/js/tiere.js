// Tiere im Haus: die Maus, die Fische im Aquarium und das Angel-Spiel.
import * as THREE from '../vendor/three.js';
import { mat } from './modelle.js';
import * as ton from './ton.js';

const T = THREE;

// ---------- Echte 3D-Fische (Quaternius, CC0) ----------
// modelle/fische.json: je Fisch eine Liste { farbe, ecken: [x,y,z, x,y,z, …] } – 1 m lang, Kopf zeigt nach +x
export async function echteFische(aquarien) {
  let daten;
  try { daten = await (await fetch('modelle/fische.json')).json(); } catch { return; }   // klappt nicht? Dann bleiben die einfachen Fische
  const vorlagen = Object.values(daten).map(teile => {
    const g = new T.Group();
    for (const t of teile) {
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(t.ecken, 3));
      geo.computeVertexNormals();
      const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color: t.farbe, roughness: 0.45, flatShading: true }));
      g.add(m);
    }
    return g;
  });
  for (const aq of aquarien) {
    (aq.obj.userData.fische || []).forEach((fisch, i) => {
      fisch.clear();
      const f = vorlagen[i % vorlagen.length].clone();
      f.scale.setScalar(0.16);                   // 16 cm lang
      fisch.add(f);
    });
  }
}

// ---------- Die Maus ----------
// Zustände: loch (versteckt) → raus (schnuppert herum) → flucht (rennt zum Loch) → loch
//           gefangen (zappelt im Maul der Katze) → heim (entwischt, rennt zum Loch)
const LAUF = 0.7, FLUCHT = 1.7, HEIM = 3.0;     // Katze: gehen 2,4 / rennen 4,6 m/s

export class Maus {
  constructor(scene, netz, haus, def) {
    this.netz = netz;
    this.e = haus.etagen.findIndex(x => x.id === def.etage);
    this.y = haus.etagen[this.e].y;
    const r = (def.rot || 0) * Math.PI / 180;
    this.richtung = { x: Math.sin(r), z: Math.cos(r) };   // wohin das Loch schaut
    this.loch = { x: def.x, z: def.z };
    this.tuer = { x: def.x + this.richtung.x * 0.45, z: def.z + this.richtung.z * 0.45 };   // vor dem Loch
    this.pos = new T.Vector3(def.x, this.y, def.z);
    this.yaw = r; this.zustand = 'loch'; this.warte = 4; this.weg = null; this.ziel = null;
    this.phase = 0; this.tempo = 0; this.piepWarte = 0; this.schutz = 0;
    this.m = baueMaus();
    scene.add(this.m.wurzel);
    // Mauseloch an der Wand: dunkler Bogen
    const bogen = new T.Mesh(new T.CircleGeometry(0.075, 20, 0, Math.PI), mat('#1b120c', { r: 1 }));
    bogen.position.set(def.x + this.richtung.x * 0.006, this.y + 0.002, def.z + this.richtung.z * 0.006);
    bogen.rotation.y = r; bogen.scale.set(1.3, 1.5, 1);
    scene.add(bogen);
  }

  get sichtbar() { return this.zustand !== 'loch'; }
  get fangbar() { return (this.zustand === 'raus' || this.zustand === 'flucht') && this.schutz <= 0; }

  frei(x, z) { const c = this.netz.zelle(this.e, x, z); return c >= 0 && this.netz.frei[c]; }
  freieStrecke(a, b) {
    const l = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(l / 0.15);
    for (let i = 1; i <= n; i++) if (!this.frei(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n)) return false;
    return true;
  }
  // Weg zum Loch: erst übers Wegnetz zur Tür, dann hinein
  heimWeg() {
    const p = this.netz.pfad(this.e, this.pos.x, this.pos.z, this.e, this.tuer.x, this.tuer.z) || [];
    return [...p.map(q => ({ x: q.x, z: q.z })), { x: this.tuer.x, z: this.tuer.z }, { x: this.loch.x, z: this.loch.z }];
  }
  zufallsZiel() {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, d = 0.8 + Math.random() * 2.2;
      const z = { x: this.pos.x + Math.cos(a) * d, z: this.pos.z + Math.sin(a) * d };
      if (Math.hypot(z.x - this.loch.x, z.z - this.loch.z) > 5.5) continue;   // nicht zu weit vom Loch
      if (this.frei(z.x, z.z) && this.freieStrecke(this.pos, z)) return z;
    }
    return { x: this.tuer.x, z: this.tuer.z };
  }

  // Ein Schritt. Gibt 'entwischt' zurück, wenn sie sich aus dem Maul befreit.
  schritt(dt, katze) {
    let ergebnis = null;
    this.schutz -= dt; this.piepWarte -= dt;
    const k = katze.fuesse;
    const katzeNah = Math.abs(k.y - this.y) < 0.5 ? Math.hypot(k.x - this.pos.x, k.z - this.pos.z) : 99;
    let tempo = 0;
    if (this.zustand === 'loch') {
      this.warte -= dt;
      // kommt nur raus, wenn die Katze nicht direkt davor sitzt
      if (this.warte <= 0 && katzeNah > 2.2) { this.zustand = 'raus'; this.weg = [{ x: this.tuer.x, z: this.tuer.z }]; this.warte = 0; }
    } else if (this.zustand === 'raus') {
      if (katzeNah < 1.2) { this.zustand = 'flucht'; this.weg = this.heimWeg(); this.piep(); this.schreck = 0.7; }
      else if (!this.weg || !this.weg.length) {
        this.warte -= dt;
        if (this.warte <= 0) { this.weg = [this.zufallsZiel()]; this.warte = 1 + Math.random() * 2.5; this.schnuppern = 0; }
        else this.schnuppern = (this.schnuppern || 0) + dt;
      }
      tempo = LAUF;
      if (katzeNah < 4 && this.piepWarte <= 0 && Math.random() < dt * 0.3) this.piep();
    } else if (this.zustand === 'flucht' || this.zustand === 'heim') {
      tempo = this.zustand === 'heim' ? HEIM : FLUCHT;
      // vor Schreck erstarrt sie immer wieder kurz – die Chance für die Katze!
      if (this.zustand === 'flucht') {
        this.schreck = (this.schreck ?? 0) - dt;
        if (this.schreck > 0) tempo = 0;
        else if (this.schreck < -1.3) this.schreck = 0.6;
      }
    } else if (this.zustand === 'gefangen') {
      this.warte -= dt;
      // zappelt im Maul der Katze
      const p = katze.pos, fx = Math.sin(katze.yaw), fz = Math.cos(katze.yaw);
      this.pos.set(p.x + fx * 0.3, p.y + 0.02, p.z + fz * 0.3);
      this.yaw = katze.yaw + Math.PI / 2 + Math.sin(this.warte * 30) * 0.4;
      if (this.warte <= 0) {
        // entwischt! Fällt vor der Katze auf den Boden und rennt heim
        const b = katze.fuesse;
        this.pos.set(b.x + fx * 0.3, this.y, b.z + fz * 0.3);
        if (Math.abs(b.y - this.y) > 0.3) this.pos.set(this.tuer.x, this.y, this.tuer.z);   // Katze war nicht auf dem Boden
        this.zustand = 'heim'; this.weg = this.heimWeg(); this.schutz = 3; this.piep();
        ergebnis = 'entwischt';
      }
      return ergebnis;
    }
    // Wegpunkte abgehen
    if (this.weg && this.weg.length && tempo > 0) {
      const z = this.weg[0], dx = z.x - this.pos.x, dz = z.z - this.pos.z, l = Math.hypot(dx, dz);
      const s = Math.min(l, tempo * dt);
      if (l > 0.001) { this.pos.x += dx / l * s; this.pos.z += dz / l * s; this.yaw = Math.atan2(dx, dz); }
      this.tempo = tempo;
      if (l < 0.06) {
        this.weg.shift();
        if (!this.weg.length && (this.zustand === 'flucht' || this.zustand === 'heim')) {
          // nach dem Fang bleibt sie länger drin
          this.warte = this.zustand === 'heim' ? 20 : 8 + Math.random() * 8;
          this.zustand = 'loch';
        }
      }
    } else this.tempo = 0;
    this.pos.y = this.y;
    // Katze springt/rennt direkt auf die Maus → gefangen
    if (this.fangbar && Math.abs(k.y - this.y) < 0.25 && Math.hypot(k.x - this.pos.x, k.z - this.pos.z) < 0.28) {
      this.zustand = 'gefangen'; this.warte = 2.5; this.piep(); ergebnis = 'gefangen';
    }
    // kommt sie raus, piepst sie (damit man sie findet)
    if (this.zustand === 'raus' && !this.drausen) { this.drausen = true; this.piepWarte = 0; this.piep(); ergebnis = ergebnis || 'raus'; }
    if (this.zustand === 'loch') this.drausen = false;
    return ergebnis;
  }

  piep() { if (this.piepWarte <= 0) { ton.piep(); this.piepWarte = 1.2; } }

  // Die Pfote der Katze: erwischt? (vor der Katze, nicht zu weit)
  fangen(katze) {
    if (!this.fangbar) return false;
    const k = katze.fuesse, fx = Math.sin(katze.yaw), fz = Math.cos(katze.yaw);
    const px = k.x + fx * 0.18, pz = k.z + fz * 0.18;
    if (Math.abs(k.y - this.y) > 0.4) return false;
    if (Math.hypot(px - this.pos.x, pz - this.pos.z) > 0.6 && Math.hypot(k.x - this.pos.x, k.z - this.pos.z) > 0.45) return false;
    this.zustand = 'gefangen'; this.warte = 2.5; this.piep();
    return true;
  }

  zeichne(dt, zeit) {
    const m = this.m;
    m.wurzel.visible = this.sichtbar;
    if (!this.sichtbar) return;
    m.wurzel.position.copy(this.pos);
    m.wurzel.rotation.y = this.yaw;
    this.phase += dt * (6 + this.tempo * 14);
    const lauf = Math.min(1, this.tempo / 1.5);
    m.koerper.position.y = Math.abs(Math.sin(this.phase)) * 0.012 * lauf;
    m.fuesse.forEach((f, i) => f.position.z = f.userData.z + Math.sin(this.phase + (i % 2) * Math.PI) * 0.02 * lauf);
    m.schwanz.forEach((s, i) => s.rotation.y = Math.sin(zeit * 6 - i * 0.6) * (0.25 + lauf * 0.2));
    // Schnuppern: Nase wackelt
    m.kopf.rotation.x = this.tempo < 0.05 ? Math.sin(zeit * 18) * 0.06 : 0;
    m.wurzel.rotation.z = this.zustand === 'gefangen' ? Math.sin(zeit * 25) * 0.3 : 0;
  }
}

function baueMaus() {
  const fell = mat('#9A9DA6', { r: 0.9 }), bauch = mat('#E9E3DA', { r: 0.9 }), rosa = mat('#F5A3B5', { r: 0.6 }), schwarz = mat('#111', { r: 0.2 });
  const wurzel = new T.Group(), koerper = new T.Group(); wurzel.add(koerper);
  koerper.scale.setScalar(1.4);                 // etwas größer als echt – damit man sie gut sieht
  const kugel = (r, m, x, y, z, sx = 1, sy = 1, sz = 1, eltern = koerper) => {
    const k = new T.Mesh(new T.SphereGeometry(r, 14, 10), m);
    k.position.set(x, y, z); k.scale.set(sx, sy, sz); k.castShadow = true; eltern.add(k); return k;
  };
  kugel(0.045, fell, 0, 0.045, 0, 0.95, 0.85, 1.4);          // Körper
  kugel(0.035, bauch, 0, 0.033, 0.012, 0.9, 0.7, 1.3);
  const kopf = new T.Group(); kopf.position.set(0, 0.055, 0.065); koerper.add(kopf);
  kugel(0.032, fell, 0, 0, 0, 1, 0.95, 1.15, kopf);
  kugel(0.016, fell, 0, -0.008, 0.03, 1, 0.9, 1.2, kopf);   // Schnauze
  kugel(0.007, rosa, 0, -0.004, 0.05, 1, 1, 1, kopf);        // Nase
  for (const s of [-1, 1]) {
    kugel(0.026, fell, s * 0.028, 0.03, -0.008, 1, 1, 0.35, kopf);   // große Ohren
    kugel(0.019, rosa, s * 0.028, 0.03, -0.0, 1, 1, 0.3, kopf);
    kugel(0.008, schwarz, s * 0.017, 0.01, 0.026, 1, 1.15, 0.8, kopf);   // Augen
    kugel(0.0025, mat('#fff'), s * 0.015, 0.014, 0.032, 1, 1, 1, kopf);
  }
  const bart = mat('#ddd');
  for (const s of [-1, 1]) for (const k of [-1, 1]) {
    const b = new T.Mesh(new T.CylinderGeometry(0.0008, 0.0008, 0.05, 3), bart);
    b.position.set(s * 0.02, -0.006, 0.042); b.rotation.set(0, 0, Math.PI / 2 + k * 0.15); kopf.add(b);
  }
  const fuesse = [];
  for (const [x, z] of [[0.025, 0.04], [-0.025, 0.04], [0.025, -0.035], [-0.025, -0.035]]) {
    const f = kugel(0.011, rosa, x, 0.008, z, 1, 0.6, 1.5); f.userData.z = z; fuesse.push(f);
  }
  // Schwanz aus Gliedern
  const schwanz = [];
  let eltern = new T.Group(); eltern.position.set(0, 0.03, -0.06); koerper.add(eltern);
  for (let i = 0; i < 8; i++) {
    const g = new T.Group(); g.position.set(0, 0, i === 0 ? 0 : -0.018); eltern.add(g);
    const st = new T.Mesh(new T.CylinderGeometry(0.004 - i * 0.0003, 0.004 - i * 0.0003, 0.02, 5), rosa);
    st.rotation.x = Math.PI / 2; st.position.z = -0.009; g.add(st);
    g.rotation.x = i < 3 ? 0.12 : -0.05;
    schwanz.push(g); eltern = g;
  }
  return { wurzel, koerper, kopf, fuesse, schwanz };
}

// ---------- Fische angeln (Minispiel am Aquarium) ----------
// Ein Fisch schwimmt im Balken hin und her. Pfote drücken, wenn er im grünen Feld ist!
export class Angeln {
  constructor() {
    const d = document.createElement('div');
    d.id = 'angeln';
    d.innerHTML = '<div class="text">🐾 Pfote drücken, wenn der Fisch im grünen Feld ist!</div><div class="balken"><div class="feld"></div><div class="fisch">🐟</div></div>';
    document.body.append(d);
    this.el = d; this.feld = d.querySelector('.feld'); this.fisch = d.querySelector('.fisch');
    this.aktiv = false; this.stufe = 0;
  }
  start(aq) {
    this.aq = aq; this.aktiv = true; this.zeit = 0;
    this.breite = Math.max(0.12, 0.26 - this.stufe * 0.03);           // grünes Feld wird schwerer
    this.links = 0.1 + Math.random() * (0.8 - this.breite);
    this.x = Math.random() < 0.5 ? 0 : 1; this.v = (0.7 + this.stufe * 0.15) * (this.x ? -1 : 1);
    this.feld.style.left = this.links * 100 + '%'; this.feld.style.width = this.breite * 100 + '%';
    this.el.classList.add('zeig');
  }
  stop() { this.aktiv = false; this.el.classList.remove('zeig'); }
  // Gibt 'weg' zurück, wenn der Fisch zu lange nicht geangelt wurde
  schritt(dt) {
    if (!this.aktiv) return null;
    this.zeit += dt;
    this.x += this.v * dt;
    if (this.x > 1) { this.x = 1; this.v = -Math.abs(this.v); }
    if (this.x < 0) { this.x = 0; this.v = Math.abs(this.v); }
    this.fisch.style.left = this.x * 100 + '%';
    this.fisch.style.transform = `translate(-50%,-50%) scaleX(${this.v > 0 ? -1 : 1})`;
    if (this.zeit > 7) { this.stop(); return 'weg'; }
    return null;
  }
  // Pfote! 'treffer' oder 'daneben'
  druecken() {
    const ok = this.x >= this.links - 0.02 && this.x <= this.links + this.breite + 0.02;
    this.stop();
    if (ok) this.stufe = Math.min(5, this.stufe + 1);
    return ok ? 'treffer' : 'daneben';
  }
}

// ---------- Wassertropfen (wenn die Katze nass ist) ----------
export class Tropfen {
  constructor(scene) {
    this.liste = [];
    const geo = new T.SphereGeometry(0.012, 6, 4), m = mat('#5BB8F0', { r: 0.1, op: 0.85 });
    for (let i = 0; i < 24; i++) { const t = new T.Mesh(geo, m); t.visible = false; scene.add(t); this.liste.push({ t, v: new T.Vector3(), leben: 0 }); }
    this.i = 0; this.uhr = 0;
  }
  spritzen(p, n = 14, stark = 1.6) {
    for (let k = 0; k < n; k++) this.neu(p, stark);
  }
  neu(p, stark) {
    const d = this.liste[this.i++ % this.liste.length];
    d.t.position.set(p.x + (Math.random() - 0.5) * 0.15, p.y + 0.15, p.z + (Math.random() - 0.5) * 0.15);
    const a = Math.random() * Math.PI * 2;
    d.v.set(Math.cos(a) * stark * Math.random(), stark * (0.5 + Math.random() * 0.8), Math.sin(a) * stark * Math.random());
    d.leben = 1.2; d.t.visible = true;
  }
  schritt(dt, katze) {
    if (katze.nass > 0) { this.uhr -= dt; if (this.uhr <= 0) { this.uhr = 0.12; this.neu(katze.pos, 0.3); } }
    for (const d of this.liste) {
      if (d.leben <= 0) continue;
      d.leben -= dt; d.v.y -= 9.81 * dt; d.t.position.addScaledVector(d.v, dt);
      if (d.leben <= 0) d.t.visible = false;
    }
  }
}
