// Unfall mit dem Auto: je nach Tempo des Autos
//   langsam  → Bein verletzt: 20 Minuten nur humpeln (langsam, kein Rennen)
//   mittel   → Kopf gestoßen: 10 Minuten verschwommen sehen
//   schnell  → Krankenhaus: 30 Minuten im Krankenzimmer, solange kann man nicht spielen
// Echte Minuten! Die Zeiten bleiben auf dem Gerät gespeichert (auch nach Neuladen).
import * as THREE from '../vendor/three.js';
import { mat } from './modelle.js';

const T = THREE;
const MIN = 60 * 1000;
const DAUER = { bein: 20 * MIN, augen: 10 * MIN, kh: 30 * MIN };
const SPEICHER = 'km-unfall';
// Das Krankenzimmer steht weit weg vom Dorf (niemand kommt hin)
export const ZIMMER = { x: 90, z: 90 };

export class Unfall {
  constructor(scene, katze, canvas) {
    this.canvas = canvas;
    try { this.ende = JSON.parse(localStorage.getItem(SPEICHER)) || {}; } catch { this.ende = {}; }
    this.hud = document.getElementById('verletzt');
    this.nebel = document.getElementById('nebel');
    this.schild = document.getElementById('krankenhaus');
    this.zimmer = baueZimmer(scene);
    this.verband = null; this.letzteSek = -1;
  }
  rest(art) { return Math.max(0, (this.ende[art] || 0) - Date.now()); }
  aktiv(art) { return this.rest(art) > 0; }
  speichern() { try { localStorage.setItem(SPEICHER, JSON.stringify(this.ende)); } catch {} }

  // Auto hat die Katze erwischt. tempo = Geschwindigkeit des Autos (m/s). Gibt die Art zurück.
  passiert(tempo) {
    const art = tempo < 4.5 ? 'bein' : tempo < 7 ? 'augen' : 'kh';
    this.ende[art] = Date.now() + DAUER[art];
    this.speichern(); this.letzteSek = -1;
    return art;
  }
  // Bein verletzt → langsamer
  tempoFaktor() { return this.aktiv('bein') ? 0.6 : 1; }

  // Einmal pro Bild: Anzeige oben, Nebel vor den Augen, Verband
  schritt(katze) {
    const sek = Math.floor(Date.now() / 1000);
    if (sek === this.letzteSek) return;
    this.letzteSek = sek;
    const teile = [];
    if (this.aktiv('bein')) teile.push('🩼 ' + uhr(this.rest('bein')));
    if (this.aktiv('augen')) teile.push('🤕 ' + uhr(this.rest('augen')));
    this.hud.textContent = teile.join('  ');
    this.hud.style.display = teile.length ? '' : 'none';
    const augen = this.aktiv('augen');
    this.canvas.style.filter = augen ? 'blur(3px) saturate(0.6)' : '';
    this.nebel.style.display = augen ? 'block' : 'none';
    this.verbandZeigen(katze, augen || this.aktiv('kh'));
    if (this.aktiv('kh')) this.schild.querySelector('b').textContent = uhr(this.rest('kh'));
  }
  // Weißer Verband um den Kopf
  verbandZeigen(katze, an) {
    if (an && !this.verband && katze.modell?.kopf) {
      this.verband = new T.Mesh(new T.TorusGeometry(0.075, 0.018, 8, 20), mat('#FFFFFF', { r: 0.9 }));
      this.verband.rotation.x = Math.PI / 2 - 0.3; this.verband.position.set(0, 0.04, 0);
      katze.modell.kopf.add(this.verband);
    }
    if (this.verband) this.verband.visible = an;
  }
  // Krankenhaus: Katze ins Bett, Schild mit der Restzeit
  insBett(katze) {
    katze.teleport({ x: ZIMMER.x + 1.6, y: 0.62, z: ZIMMER.z + 2.2 });
    this.schild.style.display = 'flex';
    document.body.classList.add('kh'); document.getElementById('ort').textContent = '📍 Krankenhaus · Zimmer 3';
  }
  raus() { this.schild.style.display = 'none'; document.body.classList.remove('kh'); }
  // Kamera schaut von oben ins Zimmer (es hat keine Decke – wie ein Puppenhaus)
  kamera(kam) {
    kam.position.set(ZIMMER.x + 3.4, 3.4, ZIMMER.z + 4.4);
    kam.lookAt(ZIMMER.x + 1.6, 0.6, ZIMMER.z + 2.2);
  }
}

function uhr(ms) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ---------- Das Krankenzimmer (einfach: Bett, Tropf, Nachttisch mit Blumen, Fenster) ----------
function baueZimmer(scene) {
  const g = new T.Group(); g.position.set(ZIMMER.x, 0, ZIMMER.z); scene.add(g);
  const kiste = (x0, x1, y0, y1, z0, z1, farbe, o = {}) => {
    const m = new T.Mesh(new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), typeof farbe === 'string' ? mat(farbe, o) : farbe);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = m.receiveShadow = true; g.add(m); return m;
  };
  const W = 4, D = 4, H = 2.6;
  kiste(-0.2, W + 0.2, -0.1, 0, -0.2, D + 0.2, '#D9E6E3', { r: 0.4 });            // Boden (Linoleum)
  kiste(-0.2, W + 0.2, 0, H, -0.2, 0, '#EAF4F1');                                  // Wände (oben offen)
  kiste(-0.2, 0, 0, H, 0, D, '#EAF4F1');
  kiste(W, W + 0.2, 0, H, 0, D, '#F2F7F5');
  kiste(-0.2, W + 0.2, 0, 0.9, D, D + 0.2, '#F2F7F5');
  // Fenster in der Rückwand
  kiste(1.2, 2.8, 1.0, 2.0, 0.0, 0.03, '#FFFFFF');
  kiste(1.3, 2.7, 1.1, 1.9, 0.03, 0.05, '#9FD4F2', { r: 0.1, m: 0.2 });
  // Bett: Gestell, Matratze, Decke, Kissen
  const bx = 1.6, bz = 2.2;
  kiste(bx - 0.55, bx + 0.55, 0, 0.4, bz - 1.1, bz + 1.1, '#C8CCD2', { r: 0.3, m: 0.4 });
  kiste(bx - 0.5, bx + 0.5, 0.4, 0.55, bz - 1.05, bz + 1.05, '#FFFFFF');
  kiste(bx - 0.52, bx + 0.52, 0.55, 0.6, bz - 0.2, bz + 1.05, '#8EC9E8');
  kiste(bx - 0.35, bx + 0.35, 0.55, 0.68, bz - 0.95, bz - 0.6, '#FFFFFF');
  kiste(bx - 0.55, bx + 0.55, 0.4, 1.0, bz - 1.15, bz - 1.1, '#C8CCD2', { r: 0.3, m: 0.4 });
  // Tropf-Ständer mit Beutel
  const st = mat('#B8BEC6', { r: 0.3, m: 0.6 });
  const stange = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 1.8), st); stange.position.set(2.5, 0.9, 1.4); g.add(stange);
  kiste(2.42, 2.58, 1.45, 1.7, 1.37, 1.43, '#DDF3FF', { op: 0.8 });
  // Nachttisch mit Blumen
  kiste(0.3, 0.8, 0, 0.6, 1.0, 1.5, '#E8D5B5');
  const vase = new T.Mesh(new T.CylinderGeometry(0.06, 0.05, 0.18, 12), mat('#5DADE2', { r: 0.2 })); vase.position.set(0.55, 0.69, 1.25); g.add(vase);
  for (const [dx, dz, f] of [[0, 0, '#E74C3C'], [0.05, 0.04, '#F1C40F'], [-0.05, 0.03, '#E91E63']]) {
    const b = new T.Mesh(new T.SphereGeometry(0.045, 8, 6), mat(f)); b.position.set(0.55 + dx, 0.88, 1.25 + dz); g.add(b);
  }
  // Herz-Monitor an der Wand
  kiste(3.2, 3.8, 1.2, 1.6, 0.0, 0.06, '#2C3E50');
  kiste(3.25, 3.75, 1.38, 1.41, 0.06, 0.07, '#2ECC71', { e: '#2ECC71' });
  return g;
}
