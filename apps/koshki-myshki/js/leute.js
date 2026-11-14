// Leute draußen: Fußgänger auf dem Gehweg, die Nachbarin und der Kellner im Restaurant.
// Nette Leute: Miau in ihrer Nähe → sie streicheln dich (+Punkte) oder geben dir etwas zu fressen (+❤️).
// Grummel-Leute (dunkle Kleidung, böses Gesicht): komm ihnen nicht zu nah – „Kschh!“ und −❤️.
import * as THREE from '../vendor/three.js';
import { mat } from './modelle.js';
import { PLAN } from './draussen.js';

const T = THREE;

// Sprechblase mit Emoji über dem Kopf
const blasenTex = new Map();
function blase(emoji) {
  if (!blasenTex.has(emoji)) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffffee'; g.beginPath(); g.arc(64, 58, 52, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(50, 104); g.lineTo(64, 126); g.lineTo(78, 104); g.fill();
    g.font = '64px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(emoji, 64, 62);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; blasenTex.set(emoji, t);
  }
  return blasenTex.get(emoji);
}

// Ein Mensch aus Grundformen.  f = Farben/Extras
export function baueMensch(f) {
  const wurzel = new T.Group(), koerper = new T.Group(); wurzel.add(koerper);
  const haut = mat(f.haut, { r: 0.8 }), oben = mat(f.oben, { r: 0.85 }), unten = mat(f.unten, { r: 0.9 });
  const add = (geo, m, x, y, z, eltern = koerper) => { const me = new T.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; eltern.add(me); return me; };
  const beine = [-0.09, 0.09].map(x => {
    const g = new T.Group(); g.position.set(x, 0.85, 0); koerper.add(g);
    add(new T.CylinderGeometry(0.07, 0.06, 0.8, 10), unten, 0, -0.42, 0, g);
    add(new T.SphereGeometry(0.07, 10, 8), mat(f.schuhe || '#3B2A20', { r: 0.6 }), 0, -0.83, 0.04, g).scale.set(1, 0.55, 1.6);
    return g;
  });
  if (f.rock) add(new T.CylinderGeometry(0.17, 0.3, 0.55, 16), unten, 0, 0.72, 0);
  const rumpf = new T.Group(); rumpf.position.y = 0.9; koerper.add(rumpf);       // zum Bücken
  add(new T.CylinderGeometry(0.19, 0.2, 0.6, 14), oben, 0, 0.3, 0, rumpf);
  add(new T.SphereGeometry(0.19, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), oben, 0, 0.58, 0, rumpf).scale.set(1.05, 0.4, 0.85);
  if (f.schuerze) add(new T.BoxGeometry(0.3, 0.55, 0.02), mat('#FFFFFF', { r: 0.8 }), 0, 0.12, 0.2, rumpf);
  const kopf = new T.Group(); kopf.position.set(0, 0.78, 0); rumpf.add(kopf);
  add(new T.SphereGeometry(0.13, 18, 14), haut, 0, 0, 0, kopf);
  if (f.haar) add(new T.SphereGeometry(0.137, 16, 12, 0, Math.PI * 2, 0, Math.PI * (f.lang ? 0.7 : 0.5)), mat(f.haar, { r: 0.95 }), 0, 0.015, -0.01, kopf);
  if (f.hut) { add(new T.CylinderGeometry(0.2, 0.2, 0.02, 16), mat(f.hut), 0, 0.1, 0, kopf); add(new T.CylinderGeometry(0.12, 0.13, 0.14, 16), mat(f.hut), 0, 0.17, 0, kopf); }
  for (const x of [-0.045, 0.045]) {
    add(new T.SphereGeometry(0.018, 8, 6), mat('#222'), x, 0.02, 0.118, kopf);
    if (f.grummel) add(new T.BoxGeometry(0.05, 0.012, 0.01), mat('#3A2A1A'), x, 0.055, 0.122, kopf).rotation.z = x > 0 ? 0.4 : -0.4;   // böse Augenbrauen
  }
  add(new T.SphereGeometry(0.022, 8, 6), haut, 0, -0.01, 0.13, kopf);
  const mund = add(new T.TorusGeometry(0.03, 0.007, 6, 12, Math.PI), mat('#8B3A3A'), 0, f.grummel ? -0.07 : -0.045, 0.118, kopf);
  if (!f.grummel) mund.rotation.z = Math.PI;                                       // Lächeln (oder grimmig)
  const arm = x => { const g = new T.Group(); g.position.set(x, 0.55, 0); rumpf.add(g);
    add(new T.CylinderGeometry(0.05, 0.045, 0.55, 8), oben, 0, -0.27, 0, g); add(new T.SphereGeometry(0.05, 8, 6), haut, 0, -0.57, 0, g); return g; };
  const armL = arm(-0.24), armR = arm(0.24);
  if (f.tasche) { const t = add(new T.BoxGeometry(0.22, 0.18, 0.08), mat(f.tasche, { r: 0.6 }), 0, -0.68, 0, armR); t.userData.tasche = true; }
  if (f.tablett) { add(new T.CylinderGeometry(0.2, 0.2, 0.02, 16), mat('#C9CED3', { m: 0.7, r: 0.3 }), 0, -0.6, 0.1, armR); }
  const sprite = new T.Sprite(new T.SpriteMaterial({ map: blase('💕'), depthTest: false }));
  sprite.scale.set(0.4, 0.4, 1); sprite.position.y = 2.05; sprite.visible = false; sprite.renderOrder = 20; wurzel.add(sprite);
  return { wurzel, koerper, rumpf, beine, armL, armR, sprite };
}

const NETT = [
  { haut: '#F1C27D', oben: '#E57373', unten: '#3F51B5', haar: '#5D4037' },
  { haut: '#C68642', oben: '#81C784', unten: '#455A64', haar: '#1B1B1B', lang: true, rock: true },
  { haut: '#FFDBAC', oben: '#FFD54F', unten: '#6D4C41', haar: '#E0B060', lang: true },
  { haut: '#8D5524', oben: '#4FC3F7', unten: '#37474F', haar: '#222' },
  { haut: '#F1C27D', oben: '#BA68C8', unten: '#BA68C8', haar: '#B0B0B0', rock: true, lang: true, tasche: '#C0392B' },
  { haut: '#E0AC69', oben: '#FF8A65', unten: '#1565C0', haar: '#3E2723', hut: '#795548' },
];
const GRUMMEL = [
  { haut: '#E8C39E', oben: '#3D3D45', unten: '#26262B', haar: '#555', grummel: true, tasche: '#222' },
  { haut: '#D9A877', oben: '#4A3B33', unten: '#2B2B2B', hut: '#222', grummel: true },
];
export const SPRUECHE_NETT = ['„Na, du Süße! Komm her!“', '„Oh, was für eine schöne Katze!“', '„Miez, miez, miez!“', '„Du bist aber flauschig!“'];
const FUTTER = ['🌭 „Hier, ein Stück Wurst!“', '🧀 „Magst du Käse?“', '🐟 „Ein Fischbrötchen – nur für dich!“', '🍪 „Psst, ein Keks!“'];
const GRUMMEL_SPRUCH = ['😠 „Kschh! Hau ab, du Flohschleuder!“', '😠 „Weg da! Ich hab’s eilig!“', '😠 „Igitt, eine Katze! Husch!“'];

// ---------- Ein Mensch, der irgendwo herumläuft ----------
export class Mensch {
  // def: { grummel, x, z, strasse: true }  oder  { innen: {x0,x1,z0,z1}, x, z, name }
  constructor(scene, def, aussehen) {
    this.def = def; this.grummel = !!def.grummel;
    this.pos = new T.Vector3(def.x, def.strasse ? 0.1 : 0, def.z);
    this.ziele = []; this.yaw = 0; this.tempo = 0; this.phase = 0;
    this.max = def.strasse ? 1.1 + Math.random() * 0.5 : 0.9;
    this.warte = Math.random() * 2; this.nett = 0; this.cool = 0; this.boese = 0; this.blaseZeit = 0; this.schlag = 0;
    this.seite = def.z > (PLAN.strasse.z0 + PLAN.strasse.z1) / 2 ? 'N' : 'S';
    this.m = baueMensch(aussehen || (this.grummel ? GRUMMEL : NETT)[Math.floor(Math.random() * (this.grummel ? GRUMMEL : NETT).length)]);
    scene.add(this.m.wurzel);
  }
  get aufStrasse() { const S = PLAN.strasse; return this.pos.z > S.z0 - 0.3 && this.pos.z < S.z1 + 0.3; }
  zeige(emoji, s = 2) { this.m.sprite.material.map = blase(emoji); this.m.sprite.visible = true; this.blaseZeit = s; }

  // Neue Ziele ausdenken
  plane() {
    if (this.def.innen) {
      const r = this.def.innen;
      this.ziele.push({ x: r.x0 + 0.6 + Math.random() * (r.x1 - r.x0 - 1.2), z: r.z0 + 0.6 + Math.random() * (r.z1 - r.z0 - 1.2) });
      return;
    }
    const S = PLAN.strasse, zN = (PLAN.gehwegN.z0 + PLAN.gehwegN.z1) / 2 + (Math.random() - 0.5), zS = (PLAN.gehwegS.z0 + PLAN.gehwegS.z1) / 2 + (Math.random() - 0.5);
    const meinZ = this.seite === 'N' ? zN : zS;
    if (Math.random() < 0.55) {
      // über die Straße: am Zebrastreifen oder an der Ampel
      const ampel = Math.random() < 0.5, ue = ampel ? PLAN.ampel : PLAN.zebra;
      const x = ue.x0 + 0.5 + Math.random() * (ue.x1 - ue.x0 - 1);
      const randHier = this.seite === 'N' ? S.z1 + 0.4 : S.z0 - 0.4, randDort = this.seite === 'N' ? S.z0 - 0.4 : S.z1 + 0.4;
      this.ziele.push({ x, z: meinZ }, { x, z: randHier, ampel, zebra: !ampel }, { x, z: randDort }, { x, z: this.seite === 'N' ? zS : zN, wechsel: true });
    } else this.ziele.push({ x: -34 + Math.random() * 86, z: meinZ });
  }

  // gibt zurück: { gestreichelt, futter, spruch, gehauen }
  schritt(dt, katze, miaut, verkehr) {
    const aus = {};
    this.cool -= dt; this.blaseZeit -= dt; this.schlag -= dt;
    if (this.blaseZeit <= 0) this.m.sprite.visible = false;
    const k = katze.fuesse, d = Math.hypot(k.x - this.pos.x, k.z - this.pos.z), nah = Math.abs(k.y - this.pos.y) < 1.0;
    // --- Katze in der Nähe ---
    if (this.grummel) {
      if (nah && d < 1.7 && this.cool <= 0) {
        if (this.boese <= 0) { this.boese = 0.7; this.zeige('😠', 1.5); }
        else { this.boese -= dt; if (this.boese <= 0.05 && d < 1.2 && !katze.versteckt) { aus.gehauen = true; aus.spruch = GRUMMEL_SPRUCH[Math.floor(Math.random() * GRUMMEL_SPRUCH.length)]; this.cool = 6; this.schlag = 0.5; this.boese = 0; } }
      } else this.boese = 0;
    } else if (miaut && nah && d < 2.2 && this.cool <= 0) {
      this.nett = 2.2; this.cool = 12; this.warte = 2.4;
      aus.gestreichelt = true; aus.spruch = '💕 ' + SPRUECHE_NETT[Math.floor(Math.random() * SPRUECHE_NETT.length)] + ' Streichel-streichel!';
      if (Math.random() < 0.45 || this.def.innen) { aus.futter = FUTTER[Math.floor(Math.random() * FUTTER.length)]; this.zeige('🍖', 2.2); }
      else this.zeige('💕', 2.2);
    }
    if (this.nett > 0 || this.schlag > 0 || (this.grummel && this.boese > 0)) this.yaw = Math.atan2(k.x - this.pos.x, k.z - this.pos.z);   // schaut zur Katze
    this.nett -= dt;
    // --- Laufen ---
    this.tempo = 0;
    if (this.warte > 0) { this.warte -= dt; return aus; }
    if (!this.ziele.length) this.plane();
    const z = this.ziele[0];
    // an der Ampel/am Zebrastreifen warten
    if (z.ampel && Math.hypot(z.x - this.pos.x, z.z - this.pos.z) < 0.15 && !verkehr.fussGruen) return aus;
    if (z.zebra && Math.hypot(z.x - this.pos.x, z.z - this.pos.z) < 0.15 && verkehr.autoNahe(z.x, 16)) return aus;
    if (this.nett > 0) return aus;
    const dx = z.x - this.pos.x, dz = z.z - this.pos.z, l = Math.hypot(dx, dz), s = Math.min(l, this.max * (this.aufStrasse ? 1.5 : 1) * dt);
    if (l > 0.001) { this.pos.x += dx / l * s; this.pos.z += dz / l * s; this.yaw = Math.atan2(dx, dz); }
    this.tempo = s / dt;
    if (l < 0.08) { this.ziele.shift(); if (z.wechsel) this.seite = this.seite === 'N' ? 'S' : 'N'; if (!this.ziele.length) this.warte = Math.random() * 3; }
    // Höhe: Gehweg 10 cm, Straße 0
    if (this.def.strasse) this.pos.y = this.aufStrasse ? 0 : 0.1;
    return aus;
  }

  zeichne(dt, zeit) {
    const m = this.m;
    m.wurzel.position.copy(this.pos); m.wurzel.rotation.y = this.yaw;
    this.phase += dt * this.tempo * 5;
    const g = Math.min(1, this.tempo / 1);
    m.beine.forEach((b, i) => b.rotation.x = Math.sin(this.phase + i * Math.PI) * 0.45 * g);
    // Bücken + streicheln
    const bueck = this.nett > 0 ? Math.min(1, this.nett * 2, (2.2 - this.nett) * 3) : 0;
    m.rumpf.rotation.x = bueck * 0.9;
    m.armL.rotation.x = bueck ? -1.2 * bueck + Math.sin(zeit * 9) * 0.15 : Math.sin(this.phase) * 0.45 * g;
    m.armR.rotation.x = this.schlag > 0 ? -2.4 * Math.sin(this.schlag / 0.5 * Math.PI) : bueck ? -1.2 * bueck : Math.sin(this.phase + Math.PI) * 0.45 * g;
    m.koerper.position.y = Math.abs(Math.sin(this.phase)) * 0.025 * g;
  }
}

// ---------- Kellner im Restaurant ----------
// Sitzt die Katze auf einem Tisch, wird er sauer und jagt sie mit dem Tablett.
export class Kellner {
  constructor(scene, raum, tische) {
    this.raum = raum; this.tische = tische;
    this.pos = new T.Vector3(21, 0, raum.z0 + 1.4);
    this.yaw = 0; this.tempo = 0; this.phase = 0; this.ziel = null; this.warte = 1; this.wut = 0; this.schlag = 0; this.pause = 0; this.blaseZeit = 0;
    this.m = baueMensch({ haut: '#F1C27D', oben: '#FFFFFF', unten: '#1E1E24', haar: '#2B1B12', schuerze: true, tablett: true, schuhe: '#111' });
    scene.add(this.m.wurzel);
  }
  zeige(emoji, s = 2) { this.m.sprite.material.map = blase(emoji); this.m.sprite.visible = true; this.blaseZeit = s; }
  schritt(dt, katze) {
    const aus = {}, r = this.raum, k = katze.fuesse;
    const drin = k.x > r.x0 && k.x < r.x1 && k.z > r.z0 && k.z < r.z1 && k.y < 2;
    const aufTisch = drin && k.y > 0.55;
    this.blaseZeit -= dt; if (this.blaseZeit <= 0) this.m.sprite.visible = false;
    this.pause -= dt; this.schlag -= dt;
    if (aufTisch && this.wut < 50) { this.wut = 100; aus.spruch = '🤵 „He! Katzen haben auf dem Tisch nichts zu suchen!“'; this.zeige('😡', 3); }
    this.wut -= dt * (drin ? 8 : 25);
    let ziel, tempo = 0.9;
    const d = Math.hypot(k.x - this.pos.x, k.z - this.pos.z);
    if (this.wut > 0 && drin) {
      ziel = { x: k.x, z: k.z }; tempo = 2.5;
      if (d < 0.9 && k.y < 1.4 && this.pause <= 0 && !katze.unverwundbar) {
        this.schlag = 0.5; this.pause = 1.5; aus.treffer = true; aus.spruch = '🍽️ SCHEPPER! Das Tablett! −❤️';
      }
    } else {
      if (this.warte > 0) this.warte -= dt;
      else if (!this.ziel) { const t = this.tische[Math.floor(Math.random() * this.tische.length)]; this.ziel = { x: t.x, z: t.z + 0.75 }; }
      ziel = this.warte > 0 ? null : this.ziel;
    }
    this.tempo = 0;
    if (ziel) {
      const dx = ziel.x - this.pos.x, dz = ziel.z - this.pos.z, l = Math.hypot(dx, dz), s = Math.min(Math.max(0, l - (this.wut > 0 ? 0.6 : 0)), tempo * dt);
      if (l > 0.01) { this.pos.x += dx / l * s; this.pos.z += dz / l * s; this.yaw = Math.atan2(dx, dz); }
      this.tempo = s / dt;
      if (this.wut <= 0 && l < 0.1) { this.ziel = null; this.warte = 2 + Math.random() * 3; }
    }
    this.pos.x = Math.min(r.x1 - 0.5, Math.max(r.x0 + 0.5, this.pos.x)); this.pos.z = Math.min(r.z1 - 0.5, Math.max(r.z0 + 0.5, this.pos.z));
    if (this.wut > 0 && d < 3) this.yaw = Math.atan2(k.x - this.pos.x, k.z - this.pos.z);
    return aus;
  }
  zeichne(dt) {
    const m = this.m;
    m.wurzel.position.copy(this.pos); m.wurzel.rotation.y = this.yaw;
    this.phase += dt * this.tempo * 5;
    const g = Math.min(1, this.tempo);
    m.beine.forEach((b, i) => b.rotation.x = Math.sin(this.phase + i * Math.PI) * 0.45 * g);
    m.armL.rotation.x = Math.sin(this.phase) * 0.4 * g;
    m.armR.rotation.x = this.schlag > 0 ? -2.6 * Math.sin(this.schlag / 0.5 * Math.PI) : -0.6;
  }
}
