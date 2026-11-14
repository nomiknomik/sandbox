// Der Hund (Shiba Inu, 3D-Modell von Quaternius, CC0).
// Läuft seine Runde. Sieht er die Katze: bellt (weckt Oma und Opa!) und rennt hinterher.
// Er tut der Katze nichts – aber er ist laut. Auf Schränke springen kann er nicht.
import * as THREE from '../vendor/three.js';
import { GLTFLoader } from '../vendor/three.js';
import * as ton from './ton.js';

const T = THREE;
const LAUF = 1.1, RENNEN = 3.4;

export class Hund {
  constructor(scene, world, R, netz, haus, def) {
    this.world = world; this.R = R; this.netz = netz; this.def = def;
    this.e = haus.etagen.findIndex(x => x.id === def.etage);
    this.y = haus.etagen[this.e].y;
    this.pos = new T.Vector3(def.x, this.y, def.z);
    this.yaw = 0; this.zustand = 'runde'; this.runde = 0; this.weg = null; this.warte = 2;
    this.bellWarte = 0; this.jagdZeit = 0; this.tempo = 0; this.gebellt = 0; this.anim = 'Idle';
    this.wurzel = new T.Group(); scene.add(this.wurzel);
    new GLTFLoader().load('modelle/hund.glb', g => {
      const m = g.scene;
      // auf 45 cm Höhe bringen, Füße auf den Boden
      const box = new T.Box3().setFromObject(m), gr = box.getSize(new T.Vector3());
      const s = 0.45 / gr.y; m.scale.setScalar(s);
      m.position.y = -box.min.y * s;
      m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      this.wurzel.add(m);
      this.mixer = new T.AnimationMixer(m);
      this.clips = {};
      for (const c of g.animations) this.clips[c.name] = this.mixer.clipAction(c);
      this.spiele('Idle');
    });
  }

  spiele(name) {
    if (!this.clips || this.anim === name && this.aktion) return;
    const neu = this.clips[name]; if (!neu) return;
    neu.reset().fadeIn(0.2).play();
    if (this.aktion && this.aktion !== neu) this.aktion.fadeOut(0.2);
    this.aktion = neu; this.anim = name;
  }

  frei(x, z) { const c = this.netz.zelle(this.e, x, z); return c >= 0 && this.netz.frei[c]; }
  wegZu(x, z) { const p = this.netz.pfad(this.e, this.pos.x, this.pos.z, this.e, x, z); return p ? p.map(q => ({ x: q.x, z: q.z })) : null; }

  siehtKatze(katze) {
    const k = katze.pos, a = { x: this.pos.x, y: this.pos.y + 0.35, z: this.pos.z };
    const dx = k.x - a.x, dy = k.y - a.y, dz = k.z - a.z, l = Math.hypot(dx, dy, dz);
    if (l > 7 || Math.abs(katze.fuesse.y - this.y) > 1.6) return false;
    const hit = this.world.castRay(new this.R.Ray(a, { x: dx / l, y: dy / l, z: dz / l }), l + 0.2, true, this.R.QueryFilterFlags.EXCLUDE_DYNAMIC);
    return !!hit && hit.collider.handle === katze.col.handle;
  }

  // Gibt 'wuff' zurück, wenn er gerade bellt (dann ärgern sich die Menschen)
  schritt(dt, katze) {
    let ergebnis = null, tempo = 0;
    this.bellWarte -= dt;
    const k = katze.fuesse, dxz = Math.hypot(k.x - this.pos.x, k.z - this.pos.z);
    const sieht = this.siehtKatze(katze);
    const bellen = () => { if (this.bellWarte <= 0) { this.bellWarte = 1.4; ton.wuff(); ergebnis = 'wuff'; this.gebellt++; this.bellAnim = 0.6; } };

    if (this.zustand === 'runde') {
      if (sieht) { this.zustand = 'jagd'; this.jagdZeit = 0; this.weg = null; bellen(); }
      else if (this.warte > 0) this.warte -= dt;
      else if (!this.weg || !this.weg.length) {
        const r = this.def.runde[this.runde++ % this.def.runde.length];
        this.weg = this.wegZu(r[0], r[1]);
        if (!this.weg || !this.weg.length) this.warte = 1; else this.warte = 0;
      }
      tempo = LAUF;
    } else if (this.zustand === 'jagd') {
      this.jagdZeit += dt;
      tempo = RENNEN;
      if (sieht && Math.random() < dt * 1.2) bellen();
      // Planen: immer zur Katze (auf dem eigenen Stockwerk)
      this.planZeit = (this.planZeit || 0) - dt;
      if (this.planZeit <= 0) { this.planZeit = 0.6; this.weg = this.wegZu(k.x, k.z); }
      if (dxz < 0.7) { tempo = 0; this.weg = null; bellen(); }          // steht vor der Katze und bellt
      if (this.jagdZeit > 7 || (!sieht && this.jagdZeit > 2.5)) { this.zustand = 'muede'; this.warte = 4; this.weg = null; }
    } else if (this.zustand === 'muede') {
      this.warte -= dt;
      if (this.warte <= 0) { this.zustand = 'runde'; this.warte = 1; }
    }
    // Wegpunkte abgehen
    if (this.weg && this.weg.length && tempo > 0) {
      const z = this.weg[0], dx = z.x - this.pos.x, dz = z.z - this.pos.z, l = Math.hypot(dx, dz);
      const s = Math.min(l, tempo * dt);
      if (l > 0.001) { this.pos.x += dx / l * s; this.pos.z += dz / l * s; }
      if (l > 0.05) { let d = Math.atan2(dx, dz) - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 10); }
      if (l < 0.1) this.weg.shift();
      this.tempo = s / dt;
    } else {
      this.tempo = 0;
      if (this.zustand === 'jagd') { let d = Math.atan2(k.x - this.pos.x, k.z - this.pos.z) - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 8); }
    }
    return ergebnis;
  }

  zeichne(dt) {
    this.wurzel.position.copy(this.pos);
    this.wurzel.rotation.y = this.yaw;
    if (this.bellAnim > 0) { this.bellAnim -= dt; this.spiele('Attack'); }
    else this.spiele(this.tempo > 2 ? 'Gallop' : this.tempo > 0.2 ? 'Walk' : 'Idle');
    if (this.mixer) this.mixer.update(dt);
  }
}
