// Garderobe: Fellfarbe aussuchen und Sachen anziehen.
// Die Sachen werden nach und nach freigeschaltet – je mehr Aufgaben geschafft, desto mehr.
// Was man gewählt hat, merkt sich das Gerät (localStorage).
import * as THREE from '../vendor/three.js';
import { mat } from './modelle.js';

const T = THREE;
const SPEICHER = 'km-aussehen';
// fell, hell (Bauch/Schnauze), dunkel (Streifen)
export const FELLE = [
  { id: 'rot', name: 'Rot getigert', farben: ['#E8913A', '#FBE3C4', '#B8641F'] },
  { id: 'schwarz', name: 'Schwarz', farben: ['#2B2B30', '#F2F2F2', '#18181C'] },
  { id: 'grau', name: 'Grau getigert', farben: ['#8E949C', '#E8EAEC', '#5E646B'] },
  { id: 'weiss', name: 'Schneeweiß', farben: ['#F7F5F0', '#FFFFFF', '#E3DED3'] },
  { id: 'schoko', name: 'Schoko', farben: ['#7B4A2B', '#E9D2B6', '#583420'] },
  { id: 'siam', name: 'Creme', farben: ['#EADBC4', '#FFF8EC', '#7A5C48'] },
];
// ab = so viele Aufgaben müssen geschafft sein
export const SACHEN = [
  { id: 'nichts', name: 'Nichts', emoji: '🐱', ab: 0 },
  { id: 'schleife', name: 'Schleife', emoji: '🎀', ab: 2 },
  { id: 'brille', name: 'Sonnenbrille', emoji: '🕶️', ab: 5 },
  { id: 'halstuch', name: 'Halstuch', emoji: '🧣', ab: 8 },
  { id: 'zauberhut', name: 'Zauberhut', emoji: '🎩', ab: 12 },
  { id: 'umhang', name: 'Heldenumhang', emoji: '🦸', ab: 16 },
];

function bauSache(id) {
  const g = new T.Group();
  const m = (geo, farbe, x, y, z, o = {}) => { const me = new T.Mesh(geo, mat(farbe, o)); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
  if (id === 'schleife') {          // auf dem Kopf, zwischen den Ohren
    for (const s of [-1, 1]) { const f = m(new T.ConeGeometry(0.035, 0.06, 4), '#FF4F9A', s * 0.035, 0, 0); f.rotation.z = s * Math.PI / 2; }
    m(new T.SphereGeometry(0.018, 8, 6), '#FF4F9A', 0, 0, 0);
    g.position.set(0.045, 0.075, 0.0); g.userData.kopf = true;
  } else if (id === 'brille') {
    for (const s of [-1, 1]) { const gl = m(new T.CylinderGeometry(0.026, 0.026, 0.008, 14), '#111', s * 0.04, 0, 0, { r: 0.1, m: 0.5 }); gl.rotation.x = Math.PI / 2; }
    m(new T.BoxGeometry(0.03, 0.006, 0.006), '#111', 0, 0.005, 0);
    g.position.set(0, 0.02, 0.092); g.userData.kopf = true;
  } else if (id === 'halstuch') {
    const t = m(new T.TorusGeometry(0.075, 0.018, 8, 18), '#D63031', 0, 0, 0); t.rotation.x = Math.PI / 2 - 0.3;
    const z = m(new T.ConeGeometry(0.035, 0.07, 3), '#D63031', 0, -0.04, 0.07); z.rotation.x = Math.PI;
    g.position.set(0, 0.27, 0.17);
  } else if (id === 'zauberhut') {
    m(new T.CylinderGeometry(0.075, 0.075, 0.008, 18), '#3B2A80', 0, 0, 0);
    m(new T.ConeGeometry(0.05, 0.14, 16), '#3B2A80', 0, 0.07, 0);
    for (const [x, y, z] of [[0.02, 0.05, 0.04], [-0.02, 0.09, 0.025], [0.0, 0.03, -0.045]]) m(new T.SphereGeometry(0.008, 6, 4), '#FFD93D', x, y, z, { e: 0xFFD93D, ei: 0.6 });
    g.position.set(0, 0.08, -0.01); g.userData.kopf = true;
  } else if (id === 'umhang') {
    const u = m(new T.BoxGeometry(0.17, 0.006, 0.3), '#E53935', 0, 0, 0); u.rotation.x = 0.25;
    m(new T.BoxGeometry(0.17, 0.02, 0.02), '#FFD93D', 0, 0.01, 0.15);
    g.position.set(0, 0.31, -0.07);
  }
  return g;
}

export class Garderobe {
  constructor(katze, aufgaben, meldung) {
    this.katze = katze; this.aufgaben = aufgaben; this.meldung = meldung;
    this.wahl = { fell: 'rot', sache: 'nichts' };
    try { Object.assign(this.wahl, JSON.parse(localStorage.getItem(SPEICHER)) || {}); } catch {}
    const k = document.createElement('button'); k.id = 'bGarderobe'; k.textContent = '🎨'; document.body.append(k);
    const l = document.createElement('div'); l.id = 'garderobe'; document.body.append(l); this.liste = l;
    k.onclick = e => { e.stopPropagation(); this.malen(); l.classList.toggle('zeig'); };
    l.onclick = e => {
      e.stopPropagation();
      const b = e.target.closest('button'); if (!b) { l.classList.remove('zeig'); return; }
      if (b.dataset.fell) this.wahl.fell = b.dataset.fell;
      if (b.dataset.sache) {
        const s = SACHEN.find(x => x.id === b.dataset.sache);
        if (this.aufgaben.anzahl < s.ab) { this.meldung(`🔒 ${s.emoji} ${s.name} gibt es ab ${s.ab} geschafften Aufgaben.`); return; }
        this.wahl.sache = s.id;
      }
      this.speichern(); this.anziehen(); this.malen();
    };
    for (const ev of ['pointerdown', 'touchstart']) { k.addEventListener(ev, e => e.stopPropagation()); l.addEventListener(ev, e => e.stopPropagation()); }
    this.knopf = k;
    this.anziehen();
  }
  speichern() { try { localStorage.setItem(SPEICHER, JSON.stringify(this.wahl)); } catch {} }
  anziehen() {
    const f = FELLE.find(x => x.id === this.wahl.fell) || FELLE[0], st = this.katze.modell.stoff;
    st.fell.color.set(f.farben[0]); st.hell.color.set(f.farben[1]); st.dunkel.color.set(f.farben[2]);
    if (this.angezogen) this.angezogen.removeFromParent();
    const s = SACHEN.find(x => x.id === this.wahl.sache);
    if (!s || s.id === 'nichts' || this.aufgaben.anzahl < s.ab) { this.angezogen = null; return; }
    const g = bauSache(s.id);
    (g.userData.kopf ? this.katze.modell.kopf : this.katze.modell.koerper).add(g);
    this.angezogen = g;
  }
  malen() {
    const n = this.aufgaben.anzahl;
    this.liste.innerHTML = '<h3>🎨 Garderobe</h3><p>Fell:</p><div class="reihe">' +
      FELLE.map(f => `<button data-fell="${f.id}" class="${f.id === this.wahl.fell ? 'an' : ''}" title="${f.name}" style="background:linear-gradient(135deg,${f.farben[0]} 60%,${f.farben[1]} 60%)"></button>`).join('') +
      '</div><p>Anziehen:</p><div class="reihe">' +
      SACHEN.map(s => `<button data-sache="${s.id}" class="sache ${s.id === this.wahl.sache ? 'an' : ''} ${n < s.ab ? 'zu' : ''}">${n < s.ab ? '🔒' : s.emoji}<small>${n < s.ab ? 'ab ' + s.ab + ' 🏆' : s.name}</small></button>`).join('') +
      `</div><p class="klein">Neue Sachen gibt es für geschaffte Aufgaben (du hast ${n}).</p>`;
  }
}
