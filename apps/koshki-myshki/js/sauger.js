// Roboter-Staubsauger: fährt seine Bahnen, dreht an Hindernissen um und saugt Scherben auf.
// Kommt er der Katze von der Seite zu nah → sie erschrickt! Springt sie oben drauf → sie fährt mit.
import * as THREE from '../vendor/three.js';
import { mat } from './modelle.js';

const T = THREE;
const RADIUS = 0.17, HOEHE = 0.09, TEMPO = 0.4;

export class Sauger {
  constructor(scene, world, R, netz, haus, def) {
    this.netz = netz;
    this.e = haus.etagen.findIndex(x => x.id === def.etage);
    this.y = haus.etagen[this.e].y;
    this.pos = new T.Vector3(def.x, this.y, def.z);
    this.richtung = Math.random() * Math.PI * 2; this.drehen = 0; this.schreckWarte = 3;
    this.body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(def.x, this.y + HOEHE / 2, def.z));
    world.createCollider(R.ColliderDesc.cylinder(HOEHE / 2, RADIUS).setFriction(1), this.body);
    this.m = baueSauger(); scene.add(this.m.wurzel);
  }
  frei(x, z) { const c = this.netz.zelle(this.e, x, z); return c >= 0 && this.netz.frei[c]; }

  // Gibt zurück: { schreck: true } oder { fahren: true } (oder nichts)
  schritt(dt, katze, scherben, scene) {
    const aus = {};
    this.schreckWarte -= dt;
    if (this.drehen > 0) {                       // auf der Stelle drehen
      this.drehen -= dt; this.richtung += dt * 2.2 * this.drehSeite;
      this.bewegt = { x: 0, z: 0 };
    } else {
      const dx = Math.sin(this.richtung), dz = Math.cos(this.richtung);
      // Hindernis voraus? Umdrehen. (Steht er selbst schon auf „belegt“, fährt er einfach weiter raus.)
      const hier = this.frei(this.pos.x, this.pos.z);
      if ((hier && !this.frei(this.pos.x + dx * 0.32, this.pos.z + dz * 0.32)) || Math.random() < dt * 0.05) {
        this.drehen = 0.6 + Math.random() * 1.2; this.drehSeite = Math.random() < 0.5 ? 1 : -1;
        this.bewegt = { x: 0, z: 0 };
      } else {
        this.bewegt = { x: dx * TEMPO * dt, z: dz * TEMPO * dt };
        this.pos.x += this.bewegt.x; this.pos.z += this.bewegt.z;
      }
    }
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.y + HOEHE / 2, z: this.pos.z });
    // Katze oben drauf? Dann fährt sie mit
    const k = katze.fuesse, d = Math.hypot(k.x - this.pos.x, k.z - this.pos.z);
    if (d < RADIUS + 0.06 && Math.abs(k.y - (this.y + HOEHE)) < 0.06) {
      katze.plattform = { x: this.bewegt.x, z: this.bewegt.z, dreh: this.drehen > 0 ? dt * 2.2 * this.drehSeite : 0 };
      aus.fahren = true;
    } else if (d < RADIUS + 0.22 && Math.abs(k.y - this.y) < 0.08 && this.schreckWarte <= 0) {
      this.schreckWarte = 8; aus.schreck = true;
      aus.weg = { x: (k.x - this.pos.x) / (d || 1), z: (k.z - this.pos.z) / (d || 1) };
    }
    // Scherben aufsaugen
    for (let i = scherben.length - 1; i >= 0; i--) {
      const s = scherben[i].m.position;
      if (Math.abs(s.y - this.y) < 0.15 && Math.hypot(s.x - this.pos.x, s.z - this.pos.z) < RADIUS + 0.05) {
        scene.remove(scherben[i].m); scherben.splice(i, 1); aus.gesaugt = true;
      }
    }
    return aus;
  }

  zeichne(dt, zeit) {
    const m = this.m;
    m.wurzel.position.copy(this.pos);
    m.wurzel.rotation.y = this.richtung;
    m.buerste.rotation.y += dt * 18;
    m.licht.material.emissiveIntensity = 0.6 + Math.sin(zeit * 4) * 0.4;
  }
}

function baueSauger() {
  const wurzel = new T.Group();
  const add = (geo, m, x, y, z) => { const me = new T.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; wurzel.add(me); return me; };
  add(new T.CylinderGeometry(RADIUS, RADIUS, HOEHE - 0.015, 28), mat('#2E3338', { r: 0.4, m: 0.3 }), 0, (HOEHE - 0.015) / 2 + 0.01, 0);
  add(new T.CylinderGeometry(RADIUS - 0.02, RADIUS - 0.01, 0.006, 28), mat('#4A535B', { r: 0.25, m: 0.4 }), 0, HOEHE + 0.003, 0);   // Deckel
  add(new T.TorusGeometry(RADIUS, 0.012, 6, 28), mat('#8A949C', { r: 0.5 }), 0, 0.04, 0).rotation.x = Math.PI / 2;           // Stoßstange
  add(new T.CylinderGeometry(0.035, 0.035, 0.012, 16), mat('#1B1F22', { r: 0.3 }), 0, HOEHE + 0.006, 0.06);                  // Knopf
  const licht = add(new T.SphereGeometry(0.012, 8, 6), new T.MeshStandardMaterial({ color: '#3CE07A', emissive: '#3CE07A', emissiveIntensity: 1 }), 0, HOEHE + 0.01, 0.11);
  const buerste = new T.Group(); buerste.position.set(0.11, 0.008, 0.1); wurzel.add(buerste);
  for (let i = 0; i < 3; i++) { const b = new T.Mesh(new T.BoxGeometry(0.07, 0.004, 0.008), mat('#C9A227')); b.rotation.y = i * Math.PI / 3; buerste.add(b); }
  return { wurzel, buerste, licht };
}
