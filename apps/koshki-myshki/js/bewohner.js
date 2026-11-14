// Жители дома. Пока одна: бабуля со сковородкой.
// Состояния:  ruhe (занимается делами) → jagd (гонится) → schlag (замах сковородкой) → снова ruhe
import * as THREE from '../vendor/three.js';
import { mat } from './modelle.js';

const T = THREE;
const R_KAPS = 0.24, H_KAPS = 0.56, MITTE = R_KAPS + H_KAPS;   // рост ≈ 1,6 м
const RUHE_TEMPO = 1.0, JAGD_TEMPO = 2.15;
const WUT_JAGD = 50;               // с какой злости начинается погоня

export class Babulya {
  constructor(scene, world, R, netz, haus, def) {
    this.R = R; this.world = world; this.netz = netz; this.haus = haus; this.def = def;
    const ei = haus.etagen.findIndex(e => e.id === def.etage);
    this.startP = { x: def.x, y: haus.etagen[ei].y, z: def.z };
    this.body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(def.x, this.startP.y + MITTE + 0.05, def.z));
    this.col = world.createCollider(R.ColliderDesc.capsule(H_KAPS, R_KAPS).setFriction(0), this.body);
    const c = world.createCharacterController(0.02);
    c.setUp({ x: 0, y: 1, z: 0 }); c.setMaxSlopeClimbAngle(50 * Math.PI / 180);
    c.enableAutostep(0.25, 0.15, true); c.enableSnapToGround(0.3);
    c.setApplyImpulsesToDynamicBodies(true); c.setCharacterMass(60);
    this.ctrl = c;
    this.vy = 0; this.yaw = 0; this.wut = 0; this.zustand = 'ruhe';
    this.weg = null; this.wegZeit = 0; this.runde = 0; this.warte = 1;
    this.schlagZeit = 0; this.pause = 0; this.phase = 0; this.tempo = 0;
    this.klemmt = 0; this.letztePos = new T.Vector3(); this.ausweichen = 0;
    this.spruch = '';
    this.m = baueBabulya();
    scene.add(this.m.wurzel);
  }

  get fuesse() { const p = this.body.translation(); return { x: p.x, y: p.y - MITTE, z: p.z }; }
  etageVon(y) { const E = this.haus.etagen; for (let i = E.length - 1; i >= 0; i--) if (y >= E[i].y - 0.4) return i; return 0; }

  // Шум или шалость: бабуля злится (если слышит)
  aergern(wo, plus, laut = true) {
    const f = this.fuesse;
    const gleich = this.etageVon(f.y) === this.etageVon(wo.y);
    const d = Math.hypot(f.x - wo.x, f.z - wo.z);
    if (!laut && !(gleich && d < 7)) return false;
    const faktor = gleich ? 1 : 0.6;
    this.wut = Math.min(100, this.wut + plus * faktor);
    if (this.wut >= WUT_JAGD && this.zustand === 'ruhe') { this.zustand = 'jagd'; this.spruch = 'Ах ты, хулиганка! 🍳'; this.weg = null; }
    return true;
  }

  siehtKatze(katze) {
    const p = this.body.translation(), k = katze.pos;
    const kopf = { x: p.x, y: p.y + 0.6, z: p.z };
    const dx = k.x - kopf.x, dy = k.y - kopf.y, dz = k.z - kopf.z, l = Math.hypot(dx, dy, dz);
    if (l > 12) return false;
    const hit = this.world.castRay(new this.R.Ray(kopf, { x: dx / l, y: dy / l, z: dz / l }), l + 0.2, true, this.R.QueryFilterFlags.EXCLUDE_DYNAMIC, undefined, this.col);
    return !!hit && hit.collider.handle === katze.col.handle;
  }

  // Zurück auf Anfang (nach Game over)
  reset() {
    this.body.setTranslation({ x: this.startP.x, y: this.startP.y + MITTE + 0.05, z: this.startP.z }, true);
    this.body.setNextKinematicTranslation({ x: this.startP.x, y: this.startP.y + MITTE + 0.05, z: this.startP.z });
    this.wut = 0; this.zustand = 'ruhe'; this.weg = null; this.vy = 0;
  }

  // Ein Physik-Schritt. Gibt 'treffer' zurück, wenn die Pfanne die Katze erwischt.
  schritt(dt, katze) {
    let ergebnis = null;
    const f = this.fuesse, k = katze.fuesse;
    const meineE = this.etageVon(f.y), katzeE = this.etageVon(k.y);
    const dxz = Math.hypot(k.x - f.x, k.z - f.z), dy = k.y - f.y;
    let ziel = null, tempo = RUHE_TEMPO;

    if (this.zustand === 'jagd' || this.zustand === 'schlag') {
      const sieht = this.siehtKatze(katze);
      // Wut lässt langsam nach, schneller wenn die Katze weg ist
      this.wut -= dt * (sieht ? 1.5 : 5);
      if (this.wut < 20 && this.zustand === 'jagd') { this.zustand = 'ruhe'; this.spruch = 'Ну ладно… 😤'; this.weg = null; }
      tempo = JAGD_TEMPO;
      const erreichbar = dy < 1.35 && dy > -0.6;
      if (this.zustand === 'schlag') {
        this.schlagZeit += dt;
        if (!this.getroffen && this.schlagZeit > 0.28) {
          this.getroffen = true;
          if (dxz < 1.0 && erreichbar && !katze.unverwundbar) ergebnis = 'treffer';
          else this.spruch = 'Мимо! 😠';
        }
        if (this.schlagZeit > 0.6) { this.zustand = 'jagd'; this.pause = 0.8; }
      } else if (dxz < 0.85 && erreichbar && meineE === katzeE && this.pause <= 0) {
        this.zustand = 'schlag'; this.schlagZeit = 0; this.getroffen = false;
      } else {
        // Weg zur Katze (neu planen jede Sekunde)
        this.wegZeit -= dt;
        const aufTreppe = this.weg && this.weg[0] && this.weg[0].treppe;
        if (!this.weg || (this.wegZeit <= 0 && !aufTreppe)) {
          this.wegZeit = 1;
          this.weg = this.netz.pfad(meineE, f.x, f.z, katzeE, k.x, k.z);
          if (!this.weg) { this.wut -= dt * 10; if (!this.unerreichbarGesagt) { this.spruch = 'Где эта кошка?! 🤨'; this.unerreichbarGesagt = true; } }
          else this.unerreichbarGesagt = false;
        }
        if (!erreichbar && dxz < 1.2 && meineE === katzeE) { this.weg = null; if (Math.random() < dt * 0.4) this.spruch = 'А ну слезай! 👊'; }
      }
      this.pause -= dt;
    } else {
      // Ruhe: Runde durchs Haus mit Pausen
      this.wut = Math.max(0, this.wut - dt * 2);
      if (this.warte > 0) { this.warte -= dt; this.weg = null; }
      else if (!this.weg) {
        const r = this.def.runde[this.runde % this.def.runde.length];
        const e = this.haus.etagen.findIndex(x => x.id === r[0]);
        this.weg = this.netz.pfad(meineE, f.x, f.z, e, r[1], r[2]);
        if (!this.weg) { this.runde++; this.warte = 1; }
      }
    }
    // Wegpunkt ansteuern
    if (this.weg && this.weg.length && this.zustand !== 'schlag') {
      let p = this.weg[0];
      if (Math.hypot(p.x - f.x, p.z - f.z) < 0.35 && Math.abs(this.haus.etagen[p.e].y - f.y) < 1.2) {
        this.weg.shift();
        if (!this.weg.length) { this.weg = null; if (this.zustand === 'ruhe') { this.runde++; this.warte = 2 + Math.random() * 3; } }
        p = this.weg && this.weg[0];
      }
      if (p) ziel = p;
    }
    if (this.zustand === 'jagd' && !this.weg && dxz > 0.6 && meineE === katzeE) ziel = { x: k.x, z: k.z };

    let mx = 0, mz = 0;
    if (ziel) {
      mx = ziel.x - f.x; mz = ziel.z - f.z;
      const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l;
      // Feststecken? kurz zur Seite ausweichen
      if (this.ausweichen > 0) { this.ausweichen -= dt; const t = mx; mx = mx * 0.3 - mz * this.seite; mz = mz * 0.3 + t * this.seite; }
    }
    this.vy -= 20 * dt;
    const want = { x: mx * tempo * dt, y: this.vy * dt, z: mz * tempo * dt };
    this.ctrl.computeColliderMovement(this.col, want, this.R.QueryFilterFlags.EXCLUDE_SENSORS);
    const m = this.ctrl.computedMovement(), p = this.body.translation();
    this.body.setNextKinematicTranslation({ x: p.x + m.x, y: p.y + m.y, z: p.z + m.z });
    if (this.ctrl.computedGrounded() && this.vy < 0) this.vy = 0;
    this.tempo = Math.hypot(m.x, m.z) / dt;
    // Blickrichtung
    let blick = null;
    if (ziel && (mx || mz)) blick = Math.atan2(mx, mz);
    if (this.zustand === 'schlag' || (this.zustand === 'jagd' && dxz < 2)) blick = Math.atan2(k.x - f.x, k.z - f.z);
    if (blick !== null) { let d = blick - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 8); }
    // Feststeck-Erkennung
    this.klemmt += dt;
    if (this.klemmt > 1.2) {
      const jetzt = new T.Vector3(p.x, p.y, p.z);
      if (ziel && jetzt.distanceTo(this.letztePos) < 0.15) { this.ausweichen = 0.7; this.seite = Math.random() < 0.5 ? 1 : -1; this.wegZeit = 0; }
      this.letztePos.copy(jetzt); this.klemmt = 0;
    }
    if (p.y < -8) this.reset();
    return ergebnis;
  }

  zeichne(dt, zeit) {
    const m = this.m, p = this.body.translation();
    m.wurzel.position.set(p.x, p.y - MITTE, p.z);
    m.wurzel.rotation.y = this.yaw;
    this.phase += dt * this.tempo * 5;
    const geht = Math.min(1, this.tempo / 1.2);
    m.koerper.position.y = Math.abs(Math.sin(this.phase)) * 0.03 * geht;
    m.koerper.rotation.z = Math.sin(this.phase) * 0.05 * geht;
    m.fuesse.forEach((fu, i) => fu.position.z = Math.sin(this.phase + i * Math.PI) * 0.12 * geht);
    m.armL.rotation.x = Math.sin(this.phase + Math.PI) * 0.4 * geht;
    // Pfannen-Arm: ruhig unten, bei Jagd erhoben, beim Schlag runter
    let a = Math.sin(this.phase) * 0.3 * geht;
    if (this.zustand === 'jagd') a = -2.4 + Math.sin(zeit * 9) * 0.15;
    if (this.zustand === 'schlag') a = this.schlagZeit < 0.22 ? -2.9 : -2.9 + Math.min(1, (this.schlagZeit - 0.22) / 0.12) * 2.6;
    m.armR.rotation.x = a;
    // Wut-Anzeige über dem Kopf
    m.wutBalken.scale.x = Math.max(0.001, this.wut / 100);
    m.wutBalken.material.color.setHSL(0.15 - 0.15 * this.wut / 100, 0.9, 0.5);
    m.wutAnzeige.visible = this.wut > 3;
    m.wutAnzeige.quaternion.copy(m.kamera ? m.kamera.quaternion : m.wutAnzeige.quaternion);
    m.ausruf.visible = this.zustand !== 'ruhe';
    m.ausruf.scale.setScalar(0.28 + Math.sin(zeit * 10) * 0.03);
  }
}

function baueBabulya() {
  const wurzel = new T.Group(), koerper = new T.Group(); wurzel.add(koerper);
  const haut = mat('#F2C6A0', { r: 0.8 }), kleid = mat('#7B4FA0', { r: 0.85 }), schuerze = mat('#FFF6E8', { r: 0.9 });
  const add = (geo, m, x, y, z, eltern = koerper) => { const me = new T.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; eltern.add(me); return me; };
  add(new T.CylinderGeometry(0.2, 0.34, 0.95, 18), kleid, 0, 0.55, 0);                    // Kleid
  add(new T.CylinderGeometry(0.17, 0.2, 0.32, 16), kleid, 0, 1.17, 0);                    // Oberkörper
  const s = add(new T.CylinderGeometry(0.16, 0.27, 0.7, 16, 1, true, -0.9, 1.8), schuerze, 0, 0.62, 0.012);
  s.material.side = T.DoubleSide;
  add(new T.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), kleid, 0, 1.3, 0).scale.set(1, 0.4, 0.85); // Schultern
  for (let i = 0; i < 9; i++) add(new T.SphereGeometry(0.02, 6, 4), mat('#FFFFFF'), Math.cos(i * 2.4) * 0.27, 0.25 + (i % 3) * 0.2, Math.sin(i * 2.4) * 0.27 - 0.05).scale.set(1, 1, 0.4);
  const kopf = new T.Group(); kopf.position.set(0, 1.47, 0.01); koerper.add(kopf);
  add(new T.SphereGeometry(0.135, 18, 14), haut, 0, 0, 0, kopf);
  add(new T.SphereGeometry(0.14, 16, 12), mat('#C9C9CF', { r: 0.95 }), 0, 0.04, -0.03, kopf).scale.set(1.02, 0.85, 1);   // Haare
  add(new T.SphereGeometry(0.07, 12, 10), mat('#C9C9CF', { r: 0.95 }), 0, 0.12, -0.1, kopf);                         // Dutt
  add(new T.SphereGeometry(0.025, 8, 6), haut, 0, -0.01, 0.135, kopf);                                              // Nase
  for (const x of [-0.05, 0.05]) {
    add(new T.TorusGeometry(0.033, 0.006, 6, 16), mat('#5A3A1A', { r: 0.4 }), x, 0.015, 0.125, kopf);              // Brille
    add(new T.SphereGeometry(0.012, 8, 6), mat('#222'), x, 0.015, 0.123, kopf);
    add(new T.SphereGeometry(0.025, 8, 6), mat('#F29A9A', { r: 0.9 }), x * 1.6, -0.035, 0.105, kopf).scale.set(1, 0.7, 0.4);
  }
  add(new T.TorusGeometry(0.03, 0.006, 6, 12, Math.PI), mat('#8B3A3A'), 0, -0.05, 0.12, kopf).rotation.z = Math.PI;
  // Arme
  const arm = (x) => { const g = new T.Group(); g.position.set(x, 1.3, 0); koerper.add(g);
    add(new T.CylinderGeometry(0.05, 0.045, 0.5, 10), kleid, 0, -0.25, 0, g); add(new T.SphereGeometry(0.05, 10, 8), haut, 0, -0.52, 0, g); return g; };
  const armL = arm(-0.24), armR = arm(0.24);
  // Bratpfanne in der rechten Hand
  const pfanne = new T.Group(); pfanne.position.set(0, -0.55, 0.05); armR.add(pfanne);
  add(new T.CylinderGeometry(0.025, 0.025, 0.28, 8), mat('#5A3A1A'), 0, 0.0, 0.12, pfanne).rotation.x = Math.PI / 2;
  const topf = add(new T.CylinderGeometry(0.17, 0.14, 0.05, 20), mat('#2B2B2B', { m: 0.6, r: 0.35 }), 0, 0, 0.42, pfanne);
  topf.rotation.x = Math.PI / 2;
  // Füße
  const fuesse = [-0.1, 0.1].map(x => add(new T.SphereGeometry(0.07, 10, 8), mat('#3B2A20'), x, 0.04, 0.03, wurzel));
  fuesse.forEach(f => f.scale.set(1, 0.6, 1.6));
  // Wut-Anzeige (immer zur Kamera gedreht)
  const wutAnzeige = new T.Group(); wutAnzeige.position.set(0, 1.85, 0); wurzel.add(wutAnzeige);
  add(new T.PlaneGeometry(0.5, 0.07), new T.MeshBasicMaterial({ color: '#222', transparent: true, opacity: 0.5, depthTest: false }), 0, 0, 0, wutAnzeige).renderOrder = 10;
  const wutBalken = add(new T.PlaneGeometry(0.48, 0.05), new T.MeshBasicMaterial({ color: '#f00', depthTest: false }), 0, 0, 0.001, wutAnzeige);
  wutBalken.geometry.translate(0.24, 0, 0); wutBalken.position.x = -0.24; wutBalken.renderOrder = 11;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.font = 'bold 56px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#E8231A'; x.strokeStyle = '#fff'; x.lineWidth = 6; x.strokeText('!', 32, 54); x.fillText('!', 32, 54);
  const ausruf = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), depthTest: false }));
  ausruf.position.set(0, 2.12, 0); ausruf.renderOrder = 12; wurzel.add(ausruf);
  return { wurzel, koerper, kopf, armL, armR, fuesse, wutAnzeige, wutBalken, ausruf };
}
