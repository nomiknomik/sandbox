// Наша кошка: как она выглядит и как двигается.
import * as THREE from '../vendor/three.js';
import { mat } from './modelle.js';

const T = THREE;
export const RADIUS = 0.13, HALB = 0.05;          // форма «капсула»: кошка 36 см высотой
const MITTE = RADIUS + HALB;                       // от лап до центра капсулы
export const SPRUNG = 7.2, SCHWERE = 21;          // прыжок ≈ 1,2 м вверх
const GEHEN = 2.4, RENNEN = 4.6;                  // скорость м/с

export class Katze {
  constructor(scene, world, R, start) {
    this.R = R; this.world = world;
    this.body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x, start.y + MITTE + 0.05, start.z));
    this.col = world.createCollider(R.ColliderDesc.capsule(HALB, RADIUS).setFriction(0), this.body);
    const c = world.createCharacterController(0.015);
    c.setUp({ x: 0, y: 1, z: 0 });
    c.setMaxSlopeClimbAngle(52 * Math.PI / 180);
    c.setMinSlopeSlideAngle(60 * Math.PI / 180);
    c.enableAutostep(0.12, 0.08, true);
    c.enableSnapToGround(0.12);
    c.setApplyImpulsesToDynamicBodies(true);
    c.setCharacterMass(4);
    this.ctrl = c;
    this.vy = 0; this.amBoden = false; this.yaw = 0; this.phase = 0; this.tempo = 0;
    this.pfoteZeit = 0; this.miauZeit = 0; this.luftZeit = 0;
    this.schub = { x: 0, z: 0 }; this.unverwundbar = 0;
    this.start = start;
    this.modell = baueKatze();
    scene.add(this.modell.wurzel);
  }

  get pos() { return this.body.translation(); }
  get fuesse() { const p = this.pos; return new T.Vector3(p.x, p.y - MITTE, p.z); }

  teleport(p) {
    this.body.setTranslation({ x: p.x, y: p.y + MITTE + 0.05, z: p.z }, true);
    this.body.setNextKinematicTranslation({ x: p.x, y: p.y + MITTE + 0.05, z: p.z });
    this.vy = 0;
  }

  // ein = { x: вправо, z: вперёд (−1..1), rennen, springen }   blick = куда смотрит камера
  schritt(dt, ein, blick, ichSicht) {
    const fx = Math.sin(blick), fz = Math.cos(blick);
    const rx = -fz, rz = fx;
    let mx = fx * ein.z + rx * ein.x, mz = fz * ein.z + rz * ein.x;
    const st = Math.min(1, Math.hypot(mx, mz));
    if (st > 0.01) { const l = Math.hypot(mx, mz); mx /= l; mz /= l; }
    const v = st * (ein.rennen || st > 0.92 ? RENNEN : GEHEN);
    // Gravitation und Sprung
    this.vy -= SCHWERE * dt;
    if (ein.springen && (this.amBoden || this.luftZeit < 0.12)) { this.vy = SPRUNG; this.amBoden = false; this.luftZeit = 1; this.gesprungen = true; }
    const want = { x: (mx * v + this.schub.x) * dt, y: this.vy * dt, z: (mz * v + this.schub.z) * dt };
    const abkl = Math.exp(-4 * dt); this.schub.x *= abkl; this.schub.z *= abkl;
    if (this.unverwundbar > 0) this.unverwundbar -= dt;
    this.ctrl.computeColliderMovement(this.col, want, this.R.QueryFilterFlags.EXCLUDE_SENSORS);
    const m = this.ctrl.computedMovement();
    const p = this.body.translation();
    this.body.setNextKinematicTranslation({ x: p.x + m.x, y: p.y + m.y, z: p.z + m.z });
    this.amBoden = this.ctrl.computedGrounded();
    if (this.amBoden) { if (this.vy < 0) this.vy = 0; this.luftZeit = 0; }
    else this.luftZeit += dt;
    if (this.vy > 0 && m.y < want.y * 0.5) this.vy = 0;     // Kopf an der Decke
    this.tempo = Math.hypot(m.x, m.z) / Math.max(dt, 1e-4);
    // Blickrichtung des Körpers
    if (ichSicht) this.yaw = blick;
    else if (st > 0.05) {
      const ziel = Math.atan2(mx, mz);
      let d = ziel - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 12);
    }
  }

  // Weggeschleudert (von der Pfanne)
  stoss(dx, dz) { const l = Math.hypot(dx, dz) || 1; this.schub = { x: dx / l * 5, z: dz / l * 5 }; this.vy = 5; this.unverwundbar = 2.5; }

  // Bild aktualisieren (Beine, Schwanz …)
  zeichne(dt, zeit, sichtbar) {
    const md = this.modell, p = this.body.translation();
    md.wurzel.visible = sichtbar && !(this.unverwundbar > 0 && Math.floor(zeit * 10) % 2);
    md.wurzel.position.set(p.x, p.y - MITTE, p.z);
    md.wurzel.rotation.y = this.yaw;
    const lauf = Math.min(1, this.tempo / RENNEN);
    this.phase += dt * (4 + this.tempo * 4.2);
    const sw = this.amBoden ? Math.sin(this.phase) * 0.75 * Math.min(1, this.tempo / 1.2) : 0;
    md.beine.forEach((b, i) => {
      const gegen = (i === 0 || i === 3) ? 1 : -1;
      b.rotation.x = this.amBoden ? sw * gegen : (i < 2 ? -0.9 : 0.8);
    });
    md.koerper.position.y = this.amBoden ? Math.abs(Math.sin(this.phase)) * 0.012 * lauf : 0;
    // Pfote heben
    if (this.pfoteZeit > 0) { this.pfoteZeit -= dt; md.beine[0].rotation.x = -1.6 * Math.sin(Math.min(1, this.pfoteZeit / 0.35) * Math.PI); }
    // Kopf beim Miauen
    if (this.miauZeit > 0) { this.miauZeit -= dt; md.kopf.rotation.x = -0.35 * Math.sin(Math.min(1, this.miauZeit / 0.6) * Math.PI); md.maul.scale.y = 1 + 2 * Math.sin(Math.min(1, this.miauZeit / 0.6) * Math.PI); }
    else { md.kopf.rotation.x = 0; md.maul.scale.y = 1; }
    // Schwanz wedelt
    md.schwanz.forEach((s, i) => { s.rotation.y = Math.sin(zeit * 2.2 - i * 0.5) * 0.18; s.rotation.x = -0.15 - lauf * 0.05; });
    // Blinzeln
    const blink = (zeit % 4) < 0.12 ? 0.1 : 1;
    md.augen.forEach(a => a.scale.y = blink);
  }
}

function baueKatze() {
  const fell = mat('#E8913A', { r: 0.85 }), hell = mat('#FBE3C4', { r: 0.9 }), dunkel = mat('#B8641F', { r: 0.85 });
  const rosa = mat('#F59AB0', { r: 0.6 });
  const wurzel = new T.Group();
  const koerper = new T.Group(); wurzel.add(koerper);
  const kugel = (r, m, x, y, z, sx = 1, sy = 1, sz = 1, eltern = koerper) => {
    const k = new T.Mesh(new T.SphereGeometry(r, 18, 14), m);
    k.position.set(x, y, z); k.scale.set(sx, sy, sz); k.castShadow = true; eltern.add(k); return k;
  };
  kugel(0.1, fell, 0, 0.2, 0, 1, 0.95, 2.0);
  kugel(0.08, hell, 0, 0.17, 0.07, 0.95, 0.9, 1.5);
  for (const z of [-0.08, 0, 0.08]) kugel(0.1, dunkel, 0, 0.205, z, 0.8, 0.98, 0.18);  // Streifen
  // Kopf
  const kopf = new T.Group(); kopf.position.set(0, 0.31, 0.2); koerper.add(kopf);
  kugel(0.09, fell, 0, 0, 0, 1.12, 0.95, 1, kopf);
  kugel(0.05, hell, 0, -0.03, 0.055, 1.4, 0.8, 0.9, kopf);
  for (const s of [-1, 1]) {
    const ohr = new T.Mesh(new T.ConeGeometry(0.038, 0.075, 4), fell);
    ohr.position.set(s * 0.055, 0.075, -0.01); ohr.rotation.set(-0.1, 0.785, s * -0.25); ohr.castShadow = true; kopf.add(ohr);
    const innen = new T.Mesh(new T.ConeGeometry(0.022, 0.05, 4), rosa);
    innen.position.set(s * 0.055, 0.07, 0.004); innen.rotation.copy(ohr.rotation); kopf.add(innen);
  }
  const augen = [];
  for (const s of [-1, 1]) {
    kugel(0.024, mat('#7BC950', { r: 0.2 }), s * 0.038, 0.018, 0.07, 1, 1.1, 0.6, kopf);
    augen.push(kugel(0.012, mat('#111', { r: 0.1 }), s * 0.038, 0.018, 0.084, 0.6, 1.5, 0.4, kopf));
    kugel(0.005, mat('#fff', { r: 0.1 }), s * 0.034, 0.03, 0.088, 1, 1, 1, kopf);
  }
  kugel(0.011, rosa, 0, -0.008, 0.094, 1.3, 0.8, 0.8, kopf);
  const maul = kugel(0.012, mat('#7A2E3B'), 0, -0.035, 0.088, 1.4, 0.3, 0.5, kopf);
  const bart = mat('#ffffff');
  for (const s of [-1, 1]) for (const k of [-1, 1]) {
    const b = new T.Mesh(new T.CylinderGeometry(0.0015, 0.0015, 0.09, 3), bart);
    b.position.set(s * 0.06, -0.02, 0.08); b.rotation.set(0, 0, Math.PI / 2 + k * 0.12); kopf.add(b);
  }
  // Beine: vorne links, vorne rechts, hinten links, hinten rechts
  const beine = [];
  for (const [x, z] of [[0.05, 0.12], [-0.05, 0.12], [0.05, -0.13], [-0.05, -0.13]]) {
    const b = new T.Group(); b.position.set(x, 0.16, z); koerper.add(b);
    const bein = new T.Mesh(new T.CylinderGeometry(0.024, 0.021, 0.15, 8), fell);
    bein.position.y = -0.075; bein.castShadow = true; b.add(bein);
    kugel(0.027, hell, 0, -0.15, 0.01, 1, 0.7, 1.25, b);
    beine.push(b);
  }
  // Schwanz aus Gliedern
  const schwanz = [];
  let eltern = new T.Group(); eltern.position.set(0, 0.24, -0.19); koerper.add(eltern);
  for (let i = 0; i < 7; i++) {
    const g = new T.Group(); g.position.set(0, i === 0 ? 0 : 0.045, i === 0 ? 0 : -0.012); eltern.add(g);
    kugel(0.026 - i * 0.002, i === 6 ? dunkel : (i % 2 ? dunkel : fell), 0, 0.02, 0, 1, 1.4, 1, g);
    g.rotation.x = -0.2;
    schwanz.push(g); eltern = g;
  }
  return { wurzel, koerper, kopf, beine, schwanz, augen, maul };
}
