// Glücksrad in der geheimen Spielhalle der Villa.
// Pfote drücken → das Rad dreht sich, wird langsamer und bleibt bei einem Preis stehen.
import * as THREE from '../vendor/three.js';
import { mat } from './modelle.js';

const T = THREE;
// Die Felder (im Uhrzeigersinn). p = Punkte, herz = +1 Herz, stern = Souvenir „Glücksstern“
export const PREISE = [
  { text: '+10', emoji: '😺', farbe: '#FF6B6B', p: 10 },
  { text: 'Herz', emoji: '❤️', farbe: '#FFD93D', herz: true },
  { text: '+25', emoji: '😸', farbe: '#6BCB77', p: 25 },
  { text: 'Niete', emoji: '😿', farbe: '#8E8E9A', p: 0 },
  { text: '+50', emoji: '😻', farbe: '#4D96FF', p: 50 },
  { text: 'Stern', emoji: '⭐', farbe: '#C77DFF', stern: true },
  { text: '+15', emoji: '🐟', farbe: '#FF9F45', p: 15 },
  { text: 'JACKPOT', emoji: '💰', farbe: '#F5C431', p: 100 },
];
const N = PREISE.length, FELD = Math.PI * 2 / N;

export class Gluecksrad {
  // pos = { x, y, z, rot }  (rot in Grad: in welche Richtung das Rad schaut)
  constructor(scene, bau, pos) {
    this.pos = pos; this.w = 0; this.winkel = Math.random() * 6; this.dreht = false; this.warte = 0;
    const g = new T.Group(); g.position.set(pos.x, pos.y, pos.z); g.rotation.y = (pos.rot || 0) * Math.PI / 180;
    scene.add(g); this.gruppe = g;
    // Ständer
    const holz = mat('#7A4E2D'), gold = mat('#F5C431', { r: 0.3, m: 0.7 });
    const box = (w, h, d, m, x, y, z) => { const me = new T.Mesh(new T.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = me.receiveShadow = true; g.add(me); return me; };
    box(1.4, 0.1, 0.6, holz, 0, 0.05, 0);
    box(0.12, 1.5, 0.12, holz, 0, 0.8, -0.12);
    // Rad (Bild auf einer Leinwand gemalt)
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d'), m = 256;
    PREISE.forEach((f, i) => {
      x.beginPath(); x.moveTo(m, m); x.arc(m, m, 250, -(i + 1) * FELD, -i * FELD); x.closePath();
      x.fillStyle = f.farbe; x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 6; x.stroke();
      x.save(); x.translate(m, m); x.rotate(-(i + 0.5) * FELD);
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
      x.font = '52px system-ui, sans-serif'; x.fillText(f.emoji, 175, 0);
      x.font = `bold ${f.text.length > 5 ? 26 : 34}px system-ui, sans-serif`; x.fillText(f.text, 95, 0);
      x.restore();
    });
    x.beginPath(); x.arc(m, m, 34, 0, Math.PI * 2); x.fillStyle = '#F5C431'; x.fill();
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    this.rad = new T.Group(); this.rad.position.set(0, 1.35, 0.0); g.add(this.rad);
    const scheibe = new T.Mesh(new T.CircleGeometry(0.7, 48), new T.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
    scheibe.position.z = 0.035; this.rad.add(scheibe);
    const rand = new T.Mesh(new T.CylinderGeometry(0.72, 0.72, 0.06, 48), gold); rand.rotation.x = Math.PI / 2; rand.castShadow = true; this.rad.add(rand);
    // Lämpchen am Rand (blinken)
    this.lampen = [];
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, l = new T.Mesh(new T.SphereGeometry(0.025, 8, 6), new T.MeshStandardMaterial({ color: '#FFF3C4', emissive: '#FFD54A', emissiveIntensity: 1 }));
      l.position.set(Math.cos(a) * 0.76, 1.35 + Math.sin(a) * 0.76, 0.04); g.add(l); this.lampen.push(l);
    }
    // Zeiger oben
    const zeiger = new T.Mesh(new T.ConeGeometry(0.07, 0.18, 3), mat('#E74C3C', { r: 0.4 }));
    zeiger.rotation.z = Math.PI; zeiger.position.set(0, 2.1, 0.06); g.add(zeiger);
    // Physik: Ständer und Rad
    const q = new T.Quaternion().setFromEuler(new T.Euler(0, g.rotation.y, 0));
    const welt = (lx, ly, lz) => new T.Vector3(lx, ly, lz).applyQuaternion(q).add(g.position);
    let p = welt(0, 0.05, 0); bau.kollider(p.x, p.y, p.z, 1.4, 0.1, 0.6, q);
    p = welt(0, 1.35, 0); bau.kollider(p.x, p.y, p.z, 1.5, 1.5, 0.1, q);
    this.vorne = welt(0, 0, 0.8);
    this.zeit = 0;
  }
  // Steht die Katze davor?
  nah(f) { return Math.hypot(f.x - this.vorne.x, f.z - this.vorne.z) < 1.0 && Math.abs(f.y - this.pos.y) < 0.6; }
  drehen() {
    if (this.dreht || this.warte > 0) return false;
    this.w = 9 + Math.random() * 6; this.dreht = true; return true;
  }
  // gibt den Preis zurück, sobald das Rad stehen bleibt
  schritt(dt) {
    this.zeit += dt;
    if (this.warte > 0) this.warte -= dt;
    this.lampen.forEach((l, i) => { l.material.emissiveIntensity = this.dreht ? ((i + Math.floor(this.zeit * 12)) % 2 ? 2 : 0.2) : 0.8 + Math.sin(this.zeit * 2 + i) * 0.4; });
    if (!this.dreht) return null;
    this.winkel += this.w * dt;
    this.w -= 3.2 * dt;
    this.rad.rotation.z = this.winkel;
    if (this.w > 0) return null;
    this.dreht = false; this.warte = 3;
    // Welches Feld ist oben unter dem Zeiger?
    const a = ((Math.PI / 2 - this.winkel) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    return PREISE[Math.floor(a / FELD) % N];
  }
}
