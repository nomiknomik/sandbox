// Das Kind – der beste Freund der Katze.
// Miaut die Katze in seiner Nähe → es gibt ein Leckerli (+❤️).
// Wird die Katze gejagt und läuft zum Kind → es lenkt Oma/Opa ab („Guck mal, ein Eichhörnchen!“).
import * as THREE from '../vendor/three.js';
import { mat } from './modelle.js';

const T = THREE;
const TEMPO = 1.3;

export class Kind {
  constructor(scene, netz, haus, def) {
    this.netz = netz; this.def = def;
    this.e = haus.etagen.findIndex(x => x.id === def.etage);
    this.y = haus.etagen[this.e].y;
    this.pos = new T.Vector3(def.x, this.y, def.z);
    this.yaw = 0; this.weg = null; this.warte = 2; this.runde = 0; this.tempo = 0; this.phase = 0;
    this.leckerliWarte = 0; this.rettenWarte = 0; this.winken = 0;
    this.m = baueKind(); scene.add(this.m.wurzel);
  }
  wegZu(x, z) { const p = this.netz.pfad(this.e, this.pos.x, this.pos.z, this.e, x, z); return p ? p.map(q => ({ x: q.x, z: q.z })) : null; }

  // miaut = hat die Katze gerade miaut?  Gibt { leckerli } oder { rettet: figur } zurück
  schritt(dt, katze, bewohner, miaut) {
    const aus = {};
    this.leckerliWarte -= dt; this.rettenWarte -= dt; this.winken -= dt;
    const k = katze.fuesse, gleich = Math.abs(k.y - this.y) < 1.2, d = Math.hypot(k.x - this.pos.x, k.z - this.pos.z);
    // Leckerli
    if (miaut && gleich && d < 2.5 && this.leckerliWarte <= 0) { this.leckerliWarte = 20; this.winken = 1.5; aus.leckerli = true; this.weg = null; this.warte = 3; }
    // Retten: eine Figur jagt die Katze, die Katze ist beim Kind
    if (gleich && d < 2.5 && this.rettenWarte <= 0) {
      const jaeger = bewohner.find(b => b.zustand === 'jagd' || b.zustand === 'schlag');
      if (jaeger) { this.rettenWarte = 30; this.winken = 2; aus.rettet = jaeger; this.weg = null; this.warte = 3; }
    }
    // Herumlaufen
    if (this.warte > 0) this.warte -= dt;
    else if (!this.weg || !this.weg.length) {
      const r = this.def.runde[this.runde++ % this.def.runde.length];
      this.weg = this.wegZu(r[0], r[1]); this.warte = this.weg ? 0 : 1;
    }
    this.tempo = 0;
    if (this.weg && this.weg.length && this.warte <= 0) {
      const z = this.weg[0], dx = z.x - this.pos.x, dz = z.z - this.pos.z, l = Math.hypot(dx, dz), s = Math.min(l, TEMPO * dt);
      if (l > 0.001) { this.pos.x += dx / l * s; this.pos.z += dz / l * s; this.yaw = Math.atan2(dx, dz); }
      if (l < 0.1) { this.weg.shift(); if (!this.weg.length) this.warte = 2 + Math.random() * 4; }
      this.tempo = s / dt;
    } else if (d < 3 && gleich) this.yaw = Math.atan2(k.x - this.pos.x, k.z - this.pos.z);   // schaut zur Katze
    return aus;
  }

  zeichne(dt, zeit) {
    const m = this.m;
    m.wurzel.position.copy(this.pos); m.wurzel.rotation.y = this.yaw;
    this.phase += dt * this.tempo * 6;
    const g = Math.min(1, this.tempo / 1);
    m.beine.forEach((b, i) => b.rotation.x = Math.sin(this.phase + i * Math.PI) * 0.5 * g);
    m.armL.rotation.x = Math.sin(this.phase) * 0.5 * g;
    m.armR.rotation.x = this.winken > 0 ? -2.8 : Math.sin(this.phase + Math.PI) * 0.5 * g;
    m.armR.rotation.z = this.winken > 0 ? Math.sin(zeit * 12) * 0.35 : 0;
    m.koerper.position.y = Math.abs(Math.sin(this.phase)) * 0.025 * g;
  }
}

function baueKind() {
  const wurzel = new T.Group(), koerper = new T.Group(); wurzel.add(koerper);
  const haut = mat('#F1C27D', { r: 0.8 }), shirt = mat('#F4C430', { r: 0.85 }), hose = mat('#3F6FB5', { r: 0.9 }), haar = mat('#7A4A24', { r: 0.95 });
  const add = (geo, m, x, y, z, eltern = koerper) => { const me = new T.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; eltern.add(me); return me; };
  const beine = [-0.07, 0.07].map(x => {
    const g = new T.Group(); g.position.set(x, 0.5, 0); koerper.add(g);
    add(new T.CylinderGeometry(0.055, 0.05, 0.45, 10), hose, 0, -0.24, 0, g);
    add(new T.SphereGeometry(0.06, 10, 8), mat('#E74C3C', { r: 0.6 }), 0, -0.47, 0.03, g).scale.set(1, 0.6, 1.5);   // Turnschuhe
    return g;
  });
  add(new T.CylinderGeometry(0.15, 0.16, 0.38, 14), shirt, 0, 0.7, 0);                   // Bauch
  add(new T.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), shirt, 0, 0.88, 0).scale.set(1, 0.4, 0.85);
  add(new T.CircleGeometry(0.05, 5), mat('#E74C3C', { r: 0.6 }), 0, 0.76, 0.155);       // Stern auf dem T-Shirt
  const kopf = new T.Group(); kopf.position.set(0, 1.05, 0); koerper.add(kopf);
  add(new T.SphereGeometry(0.14, 18, 14), haut, 0, 0, 0, kopf);
  add(new T.SphereGeometry(0.148, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), haar, 0, 0.01, -0.01, kopf);       // Haare
  for (const x of [-0.05, 0.05]) {
    add(new T.SphereGeometry(0.02, 8, 6), mat('#222'), x, 0.01, 0.128, kopf);
    add(new T.SphereGeometry(0.007, 6, 4), mat('#fff'), x - 0.006, 0.018, 0.145, kopf);
    add(new T.SphereGeometry(0.025, 8, 6), mat('#F29A9A', { r: 0.9 }), x * 1.7, -0.035, 0.11, kopf).scale.set(1, 0.7, 0.4);
  }
  add(new T.TorusGeometry(0.035, 0.008, 6, 12, Math.PI), mat('#8B3A3A'), 0, -0.045, 0.125, kopf).rotation.z = Math.PI;   // Lachen
  const arm = x => { const g = new T.Group(); g.position.set(x, 0.86, 0); koerper.add(g);
    add(new T.CylinderGeometry(0.04, 0.035, 0.36, 8), shirt, 0, -0.18, 0, g); add(new T.SphereGeometry(0.04, 8, 6), haut, 0, -0.38, 0, g); return g; };
  return { wurzel, koerper, beine, armL: arm(-0.19), armR: arm(0.19) };
}
