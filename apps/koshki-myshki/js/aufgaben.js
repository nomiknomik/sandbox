// Aufgabenliste: kleine Ziele. Für jede geschaffte Aufgabe steht ein Pokal in der Geheimkammer.
// Alle geschafft → die Katze bekommt eine Krone. Der Stand bleibt auf diesem Gerät gespeichert.
import * as THREE from '../vendor/three.js';
import { mat } from './modelle.js';

const T = THREE;
export const AUFGABEN = [
  { id: 'vase',     text: 'Zerbrich 3 Vasen',                    emoji: '🏺', ziel: 3 },
  { id: 'maus',     text: 'Fang die Maus 3-mal',                 emoji: '🐭', ziel: 3 },
  { id: 'fisch',    text: 'Angle 2 Fische',                      emoji: '🐟', ziel: 2 },
  { id: 'runter',   text: 'Wirf 5 Sachen runter',                emoji: '💥', ziel: 5 },
  { id: 'kratzen',  text: 'Zerkratze ein Sofa oder einen Sessel', emoji: '😾', ziel: 1 },
  { id: 'schlafen', text: 'Mach ein Nickerchen',                 emoji: '😴', ziel: 1 },
  { id: 'trophae',  text: 'Bring 3 Sachen in die Geheimkammer',  emoji: '👄', ziel: 3 },
  { id: 'hund',     text: 'Lass den Hund 5-mal bellen',          emoji: '🐶', ziel: 5 },
  { id: 'opa',      text: 'Renn Opa davon, bis er schnauft',     emoji: '👴', ziel: 1 },
  { id: 'aquarium', text: 'Wirf das Aquarium um',                emoji: '🌊', ziel: 1 },
  { id: 'sauger',   text: 'Fahr auf dem Staubsauger mit',        emoji: '🤖', ziel: 5 },
  { id: 'versteck', text: 'Versteck dich hinter dem Sofa, wenn Oma dich jagt', emoji: '🙈', ziel: 1 },
];
const SPEICHER = 'km-aufgaben';

export class Aufgaben {
  // geheim = { x0, z0, x1, z1, y }   (wo die Pokale stehen)   geschafft(aufgabe, alleFertig) wird gerufen
  constructor(scene, geheim, geschafft) {
    this.stand = {};
    try { this.stand = JSON.parse(localStorage.getItem(SPEICHER)) || {}; } catch {}
    this.geschafft = geschafft;
    this.pokale = new T.Group(); scene.add(this.pokale);
    this.geheim = geheim;
    // Knopf oben + Liste
    const k = document.createElement('button'); k.id = 'bAufgaben'; document.body.append(k); this.knopf = k;
    const l = document.createElement('div'); l.id = 'aufgaben'; document.body.append(l); this.liste = l;
    k.onclick = e => { e.stopPropagation(); this.zeig(!l.classList.contains('zeig')); };
    l.onclick = e => { e.stopPropagation(); if (e.target.dataset.neu) { this.stand = {}; this.speichern(); this.malen(); } else this.zeig(false); };
    for (const ev of ['pointerdown', 'touchstart']) { k.addEventListener(ev, e => e.stopPropagation()); l.addEventListener(ev, e => e.stopPropagation()); }
    this.malen();
  }
  fertig(a) { return (this.stand[a.id] || 0) >= a.ziel; }
  get anzahl() { return AUFGABEN.filter(a => this.fertig(a)).length; }
  zeig(an) { this.liste.classList.toggle('zeig', an); }
  speichern() { try { localStorage.setItem(SPEICHER, JSON.stringify(this.stand)); } catch {} }

  // Etwas ist passiert (z. B. melde('vase'))
  melde(id, n = 1) {
    const a = AUFGABEN.find(x => x.id === id);
    if (!a || this.fertig(a)) return;
    this.stand[id] = Math.min(a.ziel, (this.stand[id] || 0) + n);
    this.speichern(); this.malen();
    if (this.fertig(a)) this.geschafft(a, this.anzahl === AUFGABEN.length);
  }

  malen() {
    this.knopf.textContent = `📋 ${this.anzahl}/${AUFGABEN.length}`;
    this.liste.innerHTML = '<h3>📋 Aufgaben</h3>' + AUFGABEN.map(a => {
      const n = this.stand[a.id] || 0, ok = n >= a.ziel;
      return `<div class="aufgabe${ok ? ' ok' : ''}"><span>${ok ? '🏆' : a.emoji}</span><span>${a.text}</span><b>${ok ? '✓' : n + '/' + a.ziel}</b></div>`;
    }).join('') + '<p>Für jede Aufgabe steht ein Pokal in der Geheimkammer. Alle geschafft? Dann gibt es eine Krone! 👑</p><button data-neu="1">↺ von vorn</button>';
    // Pokale in der Geheimkammer (an der Nordwand aufgereiht)
    this.pokale.clear();
    const g = this.geheim, n = this.anzahl;
    for (let i = 0; i < n; i++) {
      const p = pokal();
      p.position.set(g.x0 + 0.4 + (i % 5) * 0.32, g.y, g.z0 + 0.3 + Math.floor(i / 5) * 0.32);
      this.pokale.add(p);
    }
  }
}

function pokal() {
  const gold = mat('#F5C431', { r: 0.25, m: 0.8 }), g = new T.Group();
  const pts = [[0, 0], [0.06, 0], [0.06, 0.02], [0.015, 0.04], [0.015, 0.1], [0.07, 0.14], [0.08, 0.22], [0.075, 0.23]].map(([r, y]) => new T.Vector2(r, y));
  const m = new T.Mesh(new T.LatheGeometry(pts, 16), gold); m.castShadow = true; g.add(m);
  for (const s of [-1, 1]) { const h = new T.Mesh(new T.TorusGeometry(0.03, 0.007, 6, 12, Math.PI), gold); h.position.set(s * 0.075, 0.18, 0); h.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(h); }
  return g;
}

// Krone für die Katze
export function krone() {
  const gold = mat('#F5C431', { r: 0.25, m: 0.8 }), g = new T.Group();
  g.add(new T.Mesh(new T.CylinderGeometry(0.055, 0.05, 0.035, 12, 1, true), gold));
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, z = new T.Mesh(new T.ConeGeometry(0.014, 0.04, 4), gold);
    z.position.set(Math.cos(a) * 0.05, 0.035, Math.sin(a) * 0.05); g.add(z);
    const st = new T.Mesh(new T.SphereGeometry(0.008, 6, 4), mat('#E74C3C', { r: 0.2 })); st.position.set(Math.cos(a) * 0.055, 0.0, Math.sin(a) * 0.055); g.add(st);
  }
  g.children[0].material.side = T.DoubleSide;
  return g;
}
