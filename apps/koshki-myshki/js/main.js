// Главный файл: включает 3D, физику, кошку и запускает игровой цикл.
import * as THREE from '../vendor/three.js';
import * as RAPIER from '../vendor/rapier.js';
import { baueHaus } from './haus.js';
import { setzeMoebel, mat } from './modelle.js';
import { Katze } from './katze.js';
import { Babulya } from './bewohner.js';
import { baueWegnetz } from './wege.js';
import { Steuerung } from './steuerung.js';
import { Maus, Angeln, Tropfen, echteFische } from './tiere.js';
import { Hund } from './hund.js';
import { Aufgaben, AUFGABEN, krone } from './aufgaben.js';
import * as ton from './ton.js';

const T = THREE, R = RAPIER;
const $ = id => document.getElementById(id);
const status = t => { $('laden').textContent = t; };

// ---------- Качество графики ----------
const QUALI = {
  schoen:  { name: 'Schön', pixel: 2,   schatten: 2048, weich: true,  aa: true },
  mittel:  { name: 'Mittel',  pixel: 1.5, schatten: 1024, weich: false, aa: true },
  schnell: { name: 'Schnell',  pixel: 1,   schatten: 0,    weich: false, aa: false },
};
let qName = null;
try { qName = localStorage.getItem('km-qualitaet'); } catch {}
if (!QUALI[qName]) qName = matchMedia('(pointer: coarse)').matches ? 'mittel' : 'schoen';
const Q = QUALI[qName];
for (const b of document.querySelectorAll('[data-q]')) {
  b.classList.toggle('an', b.dataset.q === qName);
  b.onclick = () => { try { localStorage.setItem('km-qualitaet', b.dataset.q); } catch {} location.reload(); };
}

status('Lade Physik …');
await R.init();
status('Baue das Haus …');

const renderer = new T.WebGLRenderer({ antialias: Q.aa, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, Q.pixel));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
if (Q.schatten) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap; }
$('spiel').prepend(renderer.domElement);

const scene = new T.Scene();
scene.background = new T.Color('#9ED3F5');
scene.fog = new T.Fog('#BFE3F7', 25, 70);
const kamera = new T.PerspectiveCamera(72, innerWidth / innerHeight, 0.03, 150);

// Свет: небо + солнце (тени через окна!)
scene.add(new T.HemisphereLight('#DDEEFF', '#E6D8C2', 0.85));
const sonne = new T.DirectionalLight('#FFF1D6', 4.2);
scene.add(sonne, sonne.target);

const world = new R.World({ x: 0, y: -9.81, z: 0 });
world.timestep = 1 / 60;
const haus = await (await fetch('level/haus.json')).json();
try { setzeMoebel(await (await fetch('modelle/moebel.json')).json()); } catch {}   // echte 3D-Möbel (sonst die einfachen)
const bau = baueHaus(haus, scene, world, R);
sonne.position.copy(bau.mitte).add(new T.Vector3(-11, 13, 15));
sonne.target.position.copy(bau.mitte);
if (Q.schatten) {
  sonne.castShadow = true;
  sonne.shadow.mapSize.set(Q.schatten, Q.schatten);
  Object.assign(sonne.shadow.camera, { left: -14, right: 14, top: 13, bottom: -13, near: 1, far: 60 });
  sonne.shadow.bias = -0.0004; sonne.shadow.normalBias = 0.03;
}

const startEtage = haus.etagen.find(e => e.id === haus.start.etage);
const startPunkt = { x: haus.start.x, y: startEtage.y, z: haus.start.z };
const katze = new Katze(scene, world, R, startPunkt);
world.step();                                    // einmal rechnen, damit Abfragen gehen
const netz = baueWegnetz(haus, world, R);
const bewohner = (haus.bewohner || []).map(d => new Babulya(scene, world, R, netz, haus, d));
for (const b of bewohner) b.m.kamera = kamera;
const aergern = (wo, plus, laut) => bewohner.forEach(b => b.aergern(wo, plus, laut));
const maeuse = (haus.maeuse || []).map(d => new Maus(scene, netz, haus, d));
const angeln = new Angeln(), tropfen = new Tropfen(scene);
const hunde = (haus.hunde || []).map(d => new Hund(scene, world, R, netz, haus, d));
// Aufgaben: Pokale stehen in der Geheimkammer
const geheimE = haus.etagen.find(e => e.raeume.some(r => r.geheim)), geheimR = geheimE.raeume.find(r => r.geheim);
const aufgaben = new Aufgaben(scene, { ...geheimR, y: geheimE.y }, (a, alle) => {
  setTimeout(() => { ton.juhu(); punkte += 25; hud(); meldung(`🏆 Aufgabe geschafft: ${a.text}! +25`); }, 1300);
  if (alle) setTimeout(() => { kroneAufsetzen(); meldung('👑 ALLE Aufgaben geschafft – du bist die Königskatze!'); }, 4000);
});
aufgaben.knopf.style.display = 'none';
function kroneAufsetzen() { if (katze.krone) return; katze.krone = krone(); katze.krone.position.set(0, 0.085, -0.01); katze.modell.kopf.add(katze.krone); }
if (aufgaben.anzahl === AUFGABEN.length) kroneAufsetzen();
echteFische(bau.aquarien);
const steuer = new Steuerung(renderer.domElement, { bSprung: 'springen', bPfote: 'pfote', bMiau: 'miau', bKamera: 'kamera', bMaul: 'tragen' });

// ---------- Счёт и сообщения ----------
let punkte = 0, herzen = 5;
function hud() {
  $('herzen').textContent = '❤️'.repeat(herzen) + '🤍'.repeat(5 - herzen);
  $('punkte').textContent = '😼 ' + punkte;
}
hud();
let meldTimer = 0;
function meldung(text) {
  const m = $('meldung'); m.textContent = text; m.classList.add('zeig');
  clearTimeout(meldTimer); meldTimer = setTimeout(() => m.classList.remove('zeig'), 2200);
}
function schalk(p, text) { punkte += p; hud(); meldung(text + (p ? ` +${p}` : '')); }

// ---------- Осколки ----------
const scherben = [];
const scherbenGeo = new T.TetrahedronGeometry(0.045);
function zerbrechen(d) {
  const p = d.body.translation(), v = d.body.linvel();
  const mats = []; d.obj.traverse(m => { if (m.isMesh && !m.material.transparent) mats.push(m.material); });
  world.removeRigidBody(d.body);
  scene.remove(d.obj);
  d.weg = true;
  const hit = world.castRay(new R.Ray({ x: p.x, y: p.y + 0.05, z: p.z }, { x: 0, y: -1, z: 0 }), 4, true, R.QueryFilterFlags.EXCLUDE_DYNAMIC | R.QueryFilterFlags.EXCLUDE_KINEMATIC);
  const bodenY = hit ? p.y + 0.05 - hit.timeOfImpact : p.y - 0.2;
  for (let i = 0; i < 12; i++) {
    const m = new T.Mesh(scherbenGeo, mats[i % mats.length] || mats[0]);
    const s = 0.5 + Math.random() * 0.9; m.scale.set(s, s * 0.5, s);
    m.position.set(p.x, Math.max(p.y, bodenY + 0.02), p.z);
    m.castShadow = true; scene.add(m);
    const a = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 1.6;
    scherben.push({ m, v: new T.Vector3(Math.cos(a) * sp + v.x * 0.2, 1 + Math.random() * 2, Math.sin(a) * sp + v.z * 0.2), boden: bodenY + 0.01, dreh: new T.Vector3(Math.random() * 9, Math.random() * 9, 0) });
  }
  while (scherben.length > 300) { const s = scherben.shift(); scene.remove(s.m); }
  ton.krach(1);
  aergern(p, 60, true);
  schalk(d.k.punkte || 5, `💥 ${d.k.name} – kaputt!`);
  if (d.typ === 'vase') aufgaben.melde('vase');
  aufgaben.melde('runter');
}
function scherbenSchritt(dt) {
  for (const s of scherben) {
    if (s.ruhe) continue;
    s.v.y -= 9.81 * dt;
    s.m.position.addScaledVector(s.v, dt);
    s.m.rotation.x += s.dreh.x * dt; s.m.rotation.y += s.dreh.y * dt;
    if (s.m.position.y < s.boden) {
      s.m.position.y = s.boden; s.v.y *= -0.3; s.v.x *= 0.6; s.v.z *= 0.6; s.dreh.multiplyScalar(0.5);
      if (Math.abs(s.v.y) < 0.3) s.ruhe = true;
    }
  }
}

// ---------- Лапа: столкнуть или поцарапать ----------
function pfote() {
  katze.pfoteZeit = 0.35;
  const p = katze.pos, fx = Math.sin(katze.yaw), fz = Math.cos(katze.yaw);
  // Angel-Spiel läuft? Dann zählt die Pfote dort
  if (angeln.aktiv) { angelErgebnis(angeln.druecken()); return; }
  // Maus erwischt?
  for (const m of maeuse) if (m.fangen(katze)) {
    ton.juhu(); gefangen.maeuse++;
    schalk(20, '🐭 Maus gefangen!'); aufgaben.melde('maus');
    return;
  }
  // Am Aquarium? Oben drauf = schubsen, davor = angeln!
  const aq = amAquarium();
  if (aq && katze.fuesse.y > aq.y + 1.0) { aquariumSchubsen(aq); return; }
  if (aq && aq.warte <= 0) { angeln.start(aq); return; }
  let bester = null, bestD = 0.55;
  for (const d of bau.dyn) {
    if (d.weg) continue;
    const q = d.body.translation();
    const dx = q.x - p.x, dy = q.y - p.y, dz = q.z - p.z;
    const dist = Math.hypot(dx, dy * 0.7, dz);
    if (dist > bestD || dy < -0.4 || dy > 0.6) continue;
    if ((dx * fx + dz * fz) / Math.max(0.01, Math.hypot(dx, dz)) < 0.2 && dist > 0.2) continue;
    bester = d; bestD = dist;
  }
  if (bester) {
    const m = bester.body.mass(), k = 1.6 + Math.random() * 0.6;
    bester.body.applyImpulse({ x: fx * k * m, y: 0.9 * m, z: fz * k * m }, true);
    bester.body.applyTorqueImpulse({ x: (Math.random() - 0.5) * 0.02 * m, y: (Math.random() - 0.5) * 0.02 * m, z: (Math.random() - 0.5) * 0.02 * m }, true);
    ton.hops();
    return;
  }
  // nichts zum Schubsen → kratzen?
  for (const h of [0.0, 0.15]) {
    const hit = world.castRay(new R.Ray({ x: p.x, y: p.y + h, z: p.z }, { x: fx, y: 0, z: fz }), 0.45, true, R.QueryFilterFlags.EXCLUDE_DYNAMIC, undefined, katze.col);
    const meta = hit && bau.kratz.get(hit.collider.handle);
    if (meta && meta.kratzbar) {
      ton.kratzen();
      if (meta.kratzbar === 'gut') { katze.zufrieden = (katze.zufrieden || 0) + 1; meldung('😺 Kratz-kratz! Krallen sind scharf.'); setTimeout(ton.schnurren, 450); }
      else { schalk(3, `😾 ${meta.name} zerkratzt!`); aergern(p, 45, false); if (meta.typ === 'sofa' || meta.typ === 'sessel') aufgaben.melde('kratzen'); }
      return;
    }
  }
}

// ---------- Aquarium: Fische angeln ----------
const gefangen = { maeuse: 0, fische: 0 };
for (const aq of bau.aquarien) aq.warte = 0;
function amAquarium() {
  const k = katze.fuesse;
  for (const aq of bau.aquarien) {
    const d = Math.hypot(k.x - aq.x, k.z - aq.z);
    if (!aq.umgekippt && d < 0.95 && k.y > aq.y - 0.2 && k.y < aq.y + 1.5) return aq;
  }
  return null;
}
let fischImMaul = null;
function angelErgebnis(erg) {
  const aq = angeln.aq; aq.warte = 2;
  if (erg === 'treffer') {
    const fische = aq.obj.userData.fische || [];
    const f = fische[Math.floor(Math.random() * fische.length)];
    if (f) { f.userData.weg = true; fischImMaul = { f, aq, zeit: 2 }; }
    ton.platsch(); ton.juhu(); gefangen.fische++;
    tropfen.spritzen(katze.pos, 10, 1.2);
    schalk(15, '🐟 Fisch geangelt!'); aufgaben.melde('fisch');
    aergern(katze.fuesse, 25, false);
  } else if (erg === 'daneben') {
    ton.platsch();
    katze.nass = 10;
    tropfen.spritzen(katze.pos, 24, 2.2);
    meldung('💦 PLATSCH! Ins Wasser gefallen – 10 Sekunden nass und langsam.');
    aergern(katze.fuesse, 40, true);
  } else meldung('🐟 Der Fisch ist weggeschwommen.');
}
function fischSchritt(dt) {
  if (!fischImMaul) return;
  const { f, aq } = fischImMaul, p = katze.pos;
  fischImMaul.zeit -= dt;
  const w = new T.Vector3(p.x + Math.sin(katze.yaw) * 0.3, p.y + 0.08, p.z + Math.cos(katze.yaw) * 0.3);
  f.position.copy(f.parent.worldToLocal(w));
  f.rotation.y = katze.yaw - aq.rot + Math.PI / 2 + Math.sin(zeit * 30) * 0.4;   // zappelt
  if (fischImMaul.zeit <= 0) {
    f.userData.weg = false; fischImMaul = null;
    ton.platsch(); meldung('🐟 Platsch – der Fisch springt zurück ins Wasser!');
  }
}
let aquaHinweis = false;

// ---------- Aquarium umwerfen (3× von oben schubsen) ----------
const pfuetzen = [];
function aquariumSchubsen(aq) {
  aq.schubs = (aq.schubs || 0) + 1; aq.wackeln = 0.5;
  ton.hops();
  if (aq.schubs < 3) { meldung(`🐾 Schubs! (${aq.schubs}/3)`); return; }
  aq.schubs = 0; aq.umgekippt = true; aq.kipp = 0; aq.aufraeumen = 25;
  aq.cols.slice(1).forEach(c => c.setEnabled(false));   // nur das Becken – der Schrank bleibt stehen
  // Pfütze vor dem Aquarium
  const vorn = { x: aq.x + Math.sin(aq.rot) * 1.0, z: aq.z + Math.cos(aq.rot) * 1.0 };
  const p = new T.Mesh(new T.CircleGeometry(1, 28), mat('#5BB8F0', { op: 0.55, r: 0.05 }));
  p.rotation.x = -Math.PI / 2; p.position.set(vorn.x, aq.y + 0.012, vorn.z); p.scale.setScalar(0.01); scene.add(p);
  pfuetzen.push(p); aq.pfuetze = p;
  // Fische zappeln auf dem Boden
  aq.zappler = (aq.obj.userData.fische || []).map((f, i) => {
    f.userData.weg = true;
    const a = i * 2.1, w = new T.Vector3(vorn.x + Math.cos(a) * 0.5, aq.y + 0.04, vorn.z + Math.sin(a) * 0.5);
    return { f, w };
  });
  ton.krach(1.3); setTimeout(ton.platsch, 250);
  tropfen.spritzen({ x: vorn.x, y: aq.y + 0.4, z: vorn.z }, 24, 3);
  aergern({ x: aq.x, y: aq.y, z: aq.z }, 100, true);
  schalk(50, '🌊 SPLASCH! Das Aquarium ist umgekippt – alle kommen angerannt!');
  aufgaben.melde('aquarium');
}
function aquarienSchritt(dt) {
  for (const aq of bau.aquarien) {
    let kipp = 0;
    if (aq.umgekippt) {
      aq.kipp = Math.min(1, aq.kipp + dt * 2.5);
      kipp = aq.kipp * aq.kipp * Math.PI / 2;
      if (aq.pfuetze) aq.pfuetze.scale.setScalar(Math.min(1.4, aq.pfuetze.scale.x + dt * 2));
      for (const z of aq.zappler) {                        // Fische springen auf dem Boden
        const w = z.w.clone(); w.y += Math.abs(Math.sin(zeit * 9 + z.w.x * 7)) * 0.12;
        z.f.position.copy(z.f.parent.worldToLocal(w)); z.f.rotation.set(Math.PI / 2, zeit * 3, Math.sin(zeit * 20) * 0.5);
      }
      aq.aufraeumen -= dt;
      if (aq.aufraeumen <= 0) {                            // Oma räumt auf
        aq.umgekippt = false; kipp = 0;
        aq.cols.slice(1).forEach(c => c.setEnabled(true));
        scene.remove(aq.pfuetze); aq.pfuetze = null;
        for (const z of aq.zappler) { z.f.rotation.set(0, 0, 0); z.f.userData.weg = false; }
        meldung('🧽 Oma hat aufgeräumt. Das Aquarium steht wieder, die Fische schwimmen.');
      }
    } else if (aq.wackeln > 0) { aq.wackeln -= dt; kipp = Math.sin(aq.wackeln * 40) * 0.05 * aq.wackeln; }
    // Becken kippt nach vorn über die untere Vorderkante und rutscht auf den Boden
    const becken = aq.obj.userData.becken; if (!becken) continue;
    const kq = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), kipp);
    const pivot = new T.Vector3(0, 0.7, 0.225);
    becken.quaternion.copy(kq);
    becken.position.copy(pivot).sub(pivot.clone().applyQuaternion(kq));
    if (aq.umgekippt) becken.position.y -= aq.kipp * aq.kipp * 0.25;
  }
}

// ---------- Im Maul tragen ----------
let getragen = null;
function tragen() {
  if (getragen) { ablegen(); return; }
  const k = katze.fuesse, fx = Math.sin(katze.yaw), fz = Math.cos(katze.yaw);
  let best = null, bd = 0.5;
  for (const d of bau.dyn) {
    if (d.weg || !d.k.tragbar) continue;
    const q = d.body.translation(), dist = Math.hypot(q.x - (k.x + fx * 0.2), q.z - (k.z + fz * 0.2));
    if (dist < bd && q.y - k.y > -0.3 && q.y - k.y < 0.45) { best = d; bd = dist; }
  }
  if (!best) { meldung('👄 Hier ist nichts zum Tragen.'); return; }
  getragen = best; best.gezaehlt = true;
  best.col.setSensor(true);
  best.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true);
  meldung(`👄 ${best.k.emoji} ${best.k.name} im Maul. Bring es in die Geheimkammer!`);
}
function maulPos() {
  const p = katze.pos;
  return { x: p.x + Math.sin(katze.yaw) * 0.27, y: p.y + 0.06, z: p.z + Math.cos(katze.yaw) * 0.27 };
}
function tragenSchritt() {
  if (!getragen) return;
  getragen.body.setNextKinematicTranslation(maulPos());
  getragen.body.setNextKinematicRotation(new T.Quaternion().setFromEuler(new T.Euler(0, katze.yaw, 0)));
}
function ablegen() {
  const d = getragen; getragen = null;
  d.body.setTranslation(maulPos(), true);
  d.body.setBodyType(R.RigidBodyType.Dynamic, true);
  d.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  d.col.setSensor(false); d.prev = 0;
  const { raum } = bau.raumAn(katze.fuesse);
  if (raum && raum.geheim && !d.trophae) {
    d.trophae = true; ton.juhu();
    schalk(10, `🏆 ${d.k.name} ist jetzt eine Trophäe!`); aufgaben.melde('trophae');
  } else meldung(`👄 ${d.k.name} abgelegt.`);
}

// ---------- Сковородкой по голове ----------
function getroffen(b) {
  const f = b.fuesse, k = katze.fuesse;
  katze.stoss(k.x - f.x, k.z - f.z);
  if (b.opa) ton.klatsch(); else ton.bong();
  sterne(1.6);
  herzen = Math.max(0, herzen - 1); hud();
  b.wut = Math.max(0, b.wut - 35);
  if (herzen > 0) { meldung(b.opa ? '📰 KLATSCH! −❤️' : '🍳 BONG! −❤️'); return; }
  meldung(`😿 ${b.def.name} hat dich erwischt! Die Katze wacht in der Geheimkammer auf …`);
  laeuft = false;
  setTimeout(() => {
    katze.teleport(startPunkt); katze.unverwundbar = 2;
    for (const x of bewohner) x.reset();
    herzen = 5; hud(); laeuft = true;
  }, 1800);
}
// Звёздочки над головой
const sternGruppe = new T.Group(); scene.add(sternGruppe);
for (let i = 0; i < 5; i++) { const s = new T.Mesh(new T.OctahedronGeometry(0.035), new T.MeshBasicMaterial({ color: '#FFD23F' })); sternGruppe.add(s); }
let sternZeit = 0;
function sterne(s) { sternZeit = s; }
function sterneSchritt(dt) {
  sternGruppe.visible = sternZeit > 0;
  if (sternZeit <= 0) return;
  sternZeit -= dt;
  const p = katze.pos;
  sternGruppe.children.forEach((s, i) => { const a = zeit * 5 + i * 1.257; s.position.set(p.x + Math.cos(a) * 0.15, p.y + 0.28 + Math.sin(a * 2) * 0.02, p.z + Math.sin(a) * 0.15); s.rotation.y = a * 2; });
}
// Миска и сон: +❤️
const naepfe = [];
haus.etagen.forEach(e => e.objekte.filter(o => o.typ === 'napf').forEach(o => naepfe.push({ x: o.x, y: e.y, z: o.z, warte: 0 })));
const SCHLAF = new Set(['sofa', 'sessel', 'bett', 'kinderbett', 'katzenkissen']);
let stillZeit = 0, schlafWarte = 0;
function heilen(dt) {
  const k = katze.fuesse;
  for (const n of naepfe) {
    n.warte -= dt;
    if (n.warte <= 0 && Math.hypot(k.x - n.x, k.z - n.z) < 0.4 && Math.abs(k.y - n.y) < 0.3) {
      n.warte = 25;
      if (herzen < 5) { herzen++; hud(); meldung('😋 Mampf-mampf! +❤️'); } else meldung('😋 Mampf-mampf!');
      ton.mampf();
    }
  }
  schlafWarte -= dt;
  if (katze.tempo < 0.05 && katze.amBoden) stillZeit += dt; else stillZeit = 0;
  if (stillZeit > 3 && schlafWarte <= 0) {
    const p = katze.pos;
    const hit = world.castRay(new R.Ray(p, { x: 0, y: -1, z: 0 }), 0.4, true, R.QueryFilterFlags.EXCLUDE_DYNAMIC, undefined, katze.col);
    const meta = hit && bau.kratz.get(hit.collider.handle);
    if (meta && SCHLAF.has(meta.typ)) {
      schlafWarte = 15; stillZeit = 0;
      ton.schnurren();
      if (herzen < 5) { herzen++; hud(); meldung('😴 Schnurr … ausgeruht. +❤️'); } else meldung('😴 Schnurr …');
      aufgaben.melde('schlafen');
    }
  }
}

// ---------- Камера ----------
let blickYaw = Math.PI, blickPitch = -0.2, ichSicht = !matchMedia('(pointer: coarse)').matches ? false : false;
const kamPos = new T.Vector3();
function kameraSetzen(dt) {
  const p = katze.pos;
  const dir = new T.Vector3(Math.sin(blickYaw) * Math.cos(blickPitch), Math.sin(blickPitch), Math.cos(blickYaw) * Math.cos(blickPitch));
  if (ichSicht) {
    kamera.position.set(p.x + Math.sin(katze.yaw) * 0.17, p.y + 0.14, p.z + Math.cos(katze.yaw) * 0.17);
    kamera.lookAt(kamera.position.clone().add(dir));
    return;
  }
  const ziel = new T.Vector3(p.x, p.y + 0.22, p.z);
  let abstand = 1.5;
  const hit = world.castRay(new R.Ray(ziel, { x: -dir.x, y: -dir.y, z: -dir.z }), abstand, true, R.QueryFilterFlags.EXCLUDE_DYNAMIC | R.QueryFilterFlags.EXCLUDE_KINEMATIC);
  if (hit) abstand = Math.max(0.12, hit.timeOfImpact - 0.1);
  const soll = ziel.clone().addScaledVector(dir, -abstand);
  kamPos.lerp(soll, Math.min(1, dt * 14));
  if (kamPos.distanceTo(soll) > 2) kamPos.copy(soll);
  // nie hinter einer Wand: wenn der Strahl getroffen hat, sofort
  if (hit) kamPos.copy(soll);
  kamera.position.copy(kamPos);
  kamera.lookAt(ziel);
}

// ---------- Где кошка ----------
let letzterRaum = '';
function ortZeigen() {
  const { etage, raum } = bau.raumAn(katze.fuesse);
  const txt = `${etage.name} · ${raum ? raum.name : '…'}`;
  if (txt !== letzterRaum) {
    letzterRaum = txt; $('ort').textContent = '📍 ' + txt;
    if (raum && raum.geheim && !katze.geheimGefunden) { katze.geheimGefunden = true; meldung('🤫 Geheimkammer! Hier findet dich niemand.'); }
  }
}

// ---------- Игровой цикл ----------
let laeuft = false, uhr = performance.now() / 1000, rest = 0, zeit = 0;
const SCHRITT = 1 / 60;
function frame() {
  requestAnimationFrame(frame);
  const jetzt = performance.now() / 1000;
  let dt = Math.min(0.1, jetzt - uhr); uhr = jetzt;
  zeit += dt;
  const ein = steuer.holen();
  if (laeuft) {
    const empf = steuer.touch ? 0.0045 : 0.0028;
    blickYaw -= ein.dx * empf; blickPitch -= ein.dy * empf;
    blickPitch = Math.max(ichSicht ? -1.35 : -1.2, Math.min(ichSicht ? 1.35 : 0.7, blickPitch));
    if (ein.kamera) { ichSicht = !ichSicht; $('bKamera').textContent = ichSicht ? '🎥' : '👁️'; meldung(ichSicht ? '👁️ Mit Katzenaugen' : '🎥 Von hinten'); }
    if (ein.miau) { ton.miau(); katze.miauZeit = 0.6; aergern(katze.fuesse, 4, false); }
    if (ein.pfote) pfote();
    if (ein.tragen) tragen();
    if (ein.liste) aufgaben.zeig(!aufgaben.liste.classList.contains('zeig'));
    for (const h of hunde) if (h.schritt(dt, katze) === 'wuff') {
      aergern(h.pos, 12, true); aufgaben.melde('hund');
      if (!h.gemeldet) { h.gemeldet = true; meldung('🐶 WUFF! Der Hund bellt – davon werden Oma und Opa wach!'); }
    }
    for (const b of bewohner) if (b.opa) { if (b.zustand === 'puste' && !b.pusteGemeldet) aufgaben.melde('opa'); b.pusteGemeldet = b.zustand === 'puste'; }
    aquarienSchritt(dt);
    // beim Angeln sitzt die Katze still
    if (angeln.aktiv) { ein.x = 0; ein.z = 0; ein.springen = false; }
    if (angeln.schritt(dt) === 'weg') angelErgebnis('weg');
    if (!aquaHinweis && !angeln.aktiv && amAquarium()) { aquaHinweis = true; meldung('🐟 Am Aquarium: Pfote drücken = Fische angeln!'); }
    for (const m of maeuse) {
      const e = m.schritt(dt, katze);
      if (e === 'entwischt') meldung('🐭 Die Maus ist entwischt!');
      if (e === 'gefangen') { ton.juhu(); gefangen.maeuse++; schalk(20, '🐭 Maus gefangen!'); aufgaben.melde('maus'); }
      if (e === 'raus' && bau.raumAn(katze.fuesse).etage === bau.etagen[m.e]) meldung('🐭 Piep! Die Maus ist aus ihrem Loch gekommen!');
    }
    fischSchritt(dt);
    rest += dt;
    let n = 0, springen = ein.springen;
    while (rest >= SCHRITT && n < 5) {
      katze.schritt(SCHRITT, { ...ein, springen }, blickYaw, ichSicht);
      tragenSchritt();
      springen = false;
      for (const b of bewohner) if (b.schritt(SCHRITT, katze) === 'treffer') getroffen(b);
      world.step();
      rest -= SCHRITT; n++;
    }
    if (katze.gesprungen) { katze.gesprungen = false; }
    // Gefallen ins Nichts? Zurück in die Geheimkammer
    if (katze.pos.y < -6) { katze.teleport(startPunkt); meldung('🐱 Hoppla! Die Katze ist wieder zu Hause.'); }
    ortZeigen();
    heilen(dt);
    for (const b of bewohner) if (b.spruch) { meldung(b.emoji + ' ' + b.spruch); b.spruch = ''; }
  }
  // Bewegliche Sachen nachziehen + zerbrechen?
  for (const d of bau.dyn) {
    if (d.weg) continue;
    const p = d.body.translation(), q = d.body.rotation();
    d.obj.position.set(p.x, p.y, p.z); d.obj.quaternion.set(q.x, q.y, q.z, q.w);
    const v = d.body.linvel(), sp = Math.hypot(v.x, v.y, v.z);
    if (d.startY === undefined) d.startY = p.y;
    if (d === getragen) { d.prev = 0; continue; }
    if (d.prev > 2.3 && d.prev - sp > 1.6) {
      if (d.k.zerbrechlich) { zerbrechen(d); continue; }
      ton.plopp(d.prev / 4);
    }
    if (!d.gezaehlt && p.y < d.startY - 0.4) { d.gezaehlt = true; if (!d.k.zerbrechlich && d.k.punkte) { schalk(d.k.punkte, `${d.k.emoji} ${d.k.name} fällt runter!`); aergern(p, 15, true); aufgaben.melde('runter'); } }
    if (p.y < -8) { world.removeRigidBody(d.body); scene.remove(d.obj); d.weg = true; }
    d.prev = sp;
  }
  scherbenSchritt(dt);
  for (const a of bau.anim) a(zeit);
  katze.zeichne(dt, zeit, !ichSicht);
  for (const b of bewohner) b.zeichne(dt, zeit);
  for (const m of maeuse) m.zeichne(dt, zeit);
  for (const h of hunde) h.zeichne(dt);
  tropfen.schritt(dt, katze);
  sterneSchritt(dt);
  kameraSetzen(dt);
  renderer.render(scene, kamera);
  fps(dt);
}

let fz = 0, fs = 0;
function fps(dt) { fz++; fs += dt; if (fs > 1) { $('fps').textContent = Math.round(fz / fs) + ' fps'; fz = fs = 0; } }

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  kamera.aspect = innerWidth / innerHeight; kamera.updateProjectionMatrix();
});

kamPos.copy(katze.pos);
frame();
status('');
$('start').disabled = false;
$('start').textContent = '▶ Spielen';
$('start').onclick = () => {
  ton.tonStart();
  $('titel').style.display = 'none';
  laeuft = true; steuer.aktiv = true;
  aufgaben.knopf.style.display = '';
  if (!matchMedia('(pointer: coarse)').matches && renderer.domElement.requestPointerLock) { try { renderer.domElement.requestPointerLock(); } catch {} }
  meldung('🐱 Du bist in der Geheimkammer auf dem Dachboden. Los, mach Unfug!');
};
// Für Tests im Browser
window.__km = { hunde, aufgaben, tragen, maeuse, angeln, gefangen, renderer, sonne, scene, katze, bewohner, netz, bau, world, kamera, setBlick: (y, p) => { blickYaw = y; blickPitch = p; }, setIch: v => { ichSicht = v; } };
