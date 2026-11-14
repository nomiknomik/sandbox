// Главный файл: включает 3D, физику, кошку и запускает игровой цикл.
import * as THREE from '../vendor/three.js';
import * as RAPIER from '../vendor/rapier.js';
import { baueHaus } from './haus.js';
import { Katze } from './katze.js';
import { Steuerung } from './steuerung.js';
import * as ton from './ton.js';

const T = THREE, R = RAPIER;
const $ = id => document.getElementById(id);
const status = t => { $('laden').textContent = t; };

// ---------- Качество графики ----------
const QUALI = {
  schoen:  { name: 'Красиво', pixel: 2,   schatten: 2048, weich: true,  aa: true },
  mittel:  { name: 'Средне',  pixel: 1.5, schatten: 1024, weich: false, aa: true },
  schnell: { name: 'Быстро',  pixel: 1,   schatten: 0,    weich: false, aa: false },
};
let qName = null;
try { qName = localStorage.getItem('km-qualitaet'); } catch {}
if (!QUALI[qName]) qName = matchMedia('(pointer: coarse)').matches ? 'mittel' : 'schoen';
const Q = QUALI[qName];
for (const b of document.querySelectorAll('[data-q]')) {
  b.classList.toggle('an', b.dataset.q === qName);
  b.onclick = () => { try { localStorage.setItem('km-qualitaet', b.dataset.q); } catch {} location.reload(); };
}

status('Загружаю физику …');
await R.init();
status('Строю дом …');

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
const steuer = new Steuerung(renderer.domElement, { bSprung: 'springen', bPfote: 'pfote', bMiau: 'miau', bKamera: 'kamera' });

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
  schalk(d.k.punkte || 5, `💥 ${d.k.name} – вдребезги!`);
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
    if (meta) {
      ton.kratzen();
      if (meta.kratzbar === 'gut') { katze.zufrieden = (katze.zufrieden || 0) + 1; meldung('😺 Царап-царап! Когти острые.'); setTimeout(ton.schnurren, 450); }
      else schalk(3, `😾 ${meta.name} поцарапан!`);
      return;
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
    if (raum && raum.geheim && !katze.geheimGefunden) { katze.geheimGefunden = true; meldung('🤫 Секретная комната! Тут тебя никто не найдёт.'); }
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
    if (ein.kamera) { ichSicht = !ichSicht; $('bKamera').textContent = ichSicht ? '🎥' : '👁️'; meldung(ichSicht ? '👁️ Глазами кошки' : '🎥 Вид сзади'); }
    if (ein.miau) { ton.miau(); katze.miauZeit = 0.6; }
    if (ein.pfote) pfote();
    rest += dt;
    let n = 0, springen = ein.springen;
    while (rest >= SCHRITT && n < 5) {
      katze.schritt(SCHRITT, { ...ein, springen }, blickYaw, ichSicht);
      springen = false;
      world.step();
      rest -= SCHRITT; n++;
    }
    if (katze.gesprungen) { katze.gesprungen = false; }
    // Gefallen ins Nichts? Zurück in die Geheimkammer
    if (katze.pos.y < -6) { katze.teleport(startPunkt); meldung('🐱 Ой! Кошка снова дома.'); }
    ortZeigen();
  }
  // Bewegliche Sachen nachziehen + zerbrechen?
  for (const d of bau.dyn) {
    if (d.weg) continue;
    const p = d.body.translation(), q = d.body.rotation();
    d.obj.position.set(p.x, p.y, p.z); d.obj.quaternion.set(q.x, q.y, q.z, q.w);
    const v = d.body.linvel(), sp = Math.hypot(v.x, v.y, v.z);
    if (d.startY === undefined) d.startY = p.y;
    if (d.prev > 2.3 && d.prev - sp > 1.6) {
      if (d.k.zerbrechlich) { zerbrechen(d); continue; }
      ton.plopp(d.prev / 4);
    }
    if (!d.gezaehlt && p.y < d.startY - 0.4) { d.gezaehlt = true; if (!d.k.zerbrechlich && d.k.punkte) schalk(d.k.punkte, `${d.k.emoji} ${d.k.name} упала!`); }
    if (p.y < -8) { world.removeRigidBody(d.body); scene.remove(d.obj); d.weg = true; }
    d.prev = sp;
  }
  scherbenSchritt(dt);
  for (const a of bau.anim) a(zeit);
  katze.zeichne(dt, zeit, !ichSicht);
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
$('start').textContent = '▶ Играть';
$('start').onclick = () => {
  ton.tonStart();
  $('titel').style.display = 'none';
  laeuft = true; steuer.aktiv = true;
  if (!matchMedia('(pointer: coarse)').matches && renderer.domElement.requestPointerLock) { try { renderer.domElement.requestPointerLock(); } catch {} }
  meldung('🐱 Ты в секретной комнате на чердаке. Иди хулиганить!');
};
// Für Tests im Browser
window.__km = { renderer, sonne, scene, katze, bau, world, kamera, setBlick: (y, p) => { blickYaw = y; blickPitch = p; }, setIch: v => { ichSicht = v; } };
