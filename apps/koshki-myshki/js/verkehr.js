// Autos und Ampel.
// Die Autos halten an der roten Ampel und am Zebrastreifen, wenn jemand drauf ist.
// Überall sonst halten sie NICHT rechtzeitig – sie hupen nur. Also: aufpassen!
import * as THREE from '../vendor/three.js';
import { mat } from './modelle.js';
import { PLAN } from './draussen.js';

const T = THREE;
const VON = -48, BIS = 68, LANG = BIS - VON;                 // Autos fahren von hier bis da und kommen dann wieder
const BREMSEN = 6, GAS = 2.5;                                // m/s²
// Ampel für die Autos: grün → gelb → rot → rot-gelb → grün …   (Sekunden)
const PHASEN = [['gruen', 10], ['gelb', 2], ['rot', 9], ['rotgelb', 1.5]];

export class Verkehr {
  constructor(scene) {
    const S = PLAN.strasse;
    // Zwei Spuren: nach Osten (näher an unserem Haus) und nach Westen
    this.spuren = [{ dir: 1, z: S.z1 - 1.75 }, { dir: -1, z: S.z0 + 1.75 }];
    this.autos = [];
    const FARBEN = ['#E74C3C', '#3498DB', '#F1C40F', '#2ECC71', '#9B59B6', '#ECF0F1', '#E67E22', '#1ABC9C', '#34495E', '#FF7EB6'];
    let n = 0;
    for (const sp of this.spuren) for (let i = 0; i < 5; i++) {
      const art = (n % 4 === 3) ? 'lieferwagen' : 'auto';
      const a = { sp, x: VON + (i + 0.3 * (sp.dir < 0)) * LANG / 5 + Math.random() * 6, v: 0, max: 6.5 + Math.random() * 2.5, art, lang: art === 'auto' ? 4 : 5, hupe: 0, m: baueAuto(art, FARBEN[n % FARBEN.length]) };
      a.v = a.max; scene.add(a.m.wurzel); this.autos.push(a); n++;
    }
    this.phase = 0; this.phasenZeit = 0;
    this.ampeln = [];
    const A = PLAN.ampel;
    // Auto-Ampeln (an der Haltelinie) und Fußgänger-Ampeln (an den Enden des Übergangs)
    this.ampeln.push(autoAmpel(scene, A.x0 - 1.2, S.z1 + 0.4, -Math.PI / 2));
    this.ampeln.push(autoAmpel(scene, A.x1 + 1.2, S.z0 - 0.4, Math.PI / 2));
    this.fuss = [fussAmpel(scene, A.x1 + 0.4, S.z1 + 0.4, Math.PI), fussAmpel(scene, A.x0 - 0.4, S.z0 - 0.4, 0)];
    zebraSchild(scene, PLAN.zebra.x0 - 0.5, S.z1 + 0.5); zebraSchild(scene, PLAN.zebra.x1 + 0.5, S.z0 - 0.5);
    this.zeigAmpel();
  }
  get ampel() { return PHASEN[this.phase][0]; }
  get fussGruen() { return this.ampel === 'rot' && this.phasenZeit > 0.8 && this.phasenZeit < PHASEN[2][1] - 1.2; }

  zeigAmpel() {
    const a = this.ampel;
    for (const am of this.ampeln) {
      am.rot.material.emissiveIntensity = (a === 'rot' || a === 'rotgelb') ? 2.5 : 0.05;
      am.gelb.material.emissiveIntensity = (a === 'gelb' || a === 'rotgelb') ? 2.5 : 0.05;
      am.gruen.material.emissiveIntensity = a === 'gruen' ? 2.5 : 0.05;
    }
    for (const f of this.fuss) { f.rot.material.emissiveIntensity = this.fussGruen ? 0.05 : 2.2; f.gruen.material.emissiveIntensity = this.fussGruen ? 2.2 : 0.05; }
  }

  // Ist jemand auf dem Zebrastreifen?  wer = Liste von Punkten {x, z}
  zebraBelegt(wer) {
    const Z = PLAN.zebra, S = PLAN.strasse;
    return wer.some(p => p.x > Z.x0 - 0.3 && p.x < Z.x1 + 0.3 && p.z > S.z0 - 0.4 && p.z < S.z1 + 0.4);
  }
  // Kommt gleich ein schnelles Auto an Stelle x vorbei?
  autoNahe(x, weit = 14) {
    return this.autos.some(a => { const d = (x - a.x) * a.sp.dir; return d > -2 && d < weit && a.v > 2; });
  }

  // katze = Position der Katze (Füße), leute = Punkte von Fußgängern auf der Straße
  schritt(dt, katze, leute) {
    const aus = {};
    this.phasenZeit += dt;
    if (this.phasenZeit > PHASEN[this.phase][1]) { this.phasenZeit = 0; this.phase = (this.phase + 1) % PHASEN.length; }
    this.zeigAmpel();
    const S = PLAN.strasse, Z = PLAN.zebra, A = PLAN.ampel;
    const zebraVoll = this.zebraBelegt([...leute, katze]);
    const katzeAufStrasse = katze.z > S.z0 - 0.1 && katze.z < S.z1 + 0.1 && katze.y < 0.8;
    // Auf dem Zebrastreifen und bei Grün an der Ampel hupt keiner (dort halten die Autos ja)
    const geschuetzt = this.zebraBelegt([katze]) || (this.fussGruen && katze.x > A.x0 - 0.5 && katze.x < A.x1 + 0.5);
    for (const sp of this.spuren) {
      const hier = this.autos.filter(a => a.sp === sp).sort((a, b) => (a.x - b.x) * sp.dir);
      hier.forEach((a, i) => {
        const vorn = a.x + sp.dir * a.lang / 2;       // Stoßstange vorn
        let soll = a.max;
        const halt = (stelle, ab = BREMSEN) => {      // vor «stelle» anhalten (in Fahrtrichtung)
          const d = (stelle - vorn) * sp.dir;
          if (d < -0.5) return;
          soll = Math.min(soll, Math.sqrt(2 * ab * Math.max(0, d - 0.4)));
        };
        // Vorderes Auto (im Kreis)
        const vor = hier[(i + 1) % hier.length];
        if (vor !== a) {
          let gap = (vor.x - a.x) * sp.dir; if (gap < 0) gap += LANG;
          gap -= (a.lang + vor.lang) / 2;
          soll = Math.min(soll, Math.sqrt(2 * BREMSEN * Math.max(0, gap - 1.8)), gap < 1.5 ? 0 : 99);
        }
        // Ampel
        const linie = sp.dir > 0 ? A.x0 - 0.75 : A.x1 + 0.75;
        const bisLinie = (linie - vorn) * sp.dir;
        if (this.ampel === 'rot' || this.ampel === 'rotgelb' || (this.ampel === 'gelb' && bisLinie > 7)) halt(linie);
        // Zebrastreifen: halten, wenn jemand drauf ist
        if (zebraVoll) halt(sp.dir > 0 ? Z.x0 - 0.7 : Z.x1 + 0.7);
        // Katze irgendwo sonst auf der Straße: hupen und bremsen – aber zu spät!
        const zuKatze = (katze.x - vorn) * sp.dir;
        let schreck = false;
        if (katzeAufStrasse && !geschuetzt && Math.abs(katze.z - sp.z) < 1.4 && zuKatze > -0.5 && zuKatze < 16) {
          if (a.hupe <= 0 && a.v > 2) { a.hupe = 2.5; aus.hupe = true; }
          schreck = zuKatze < 8;
        }
        a.hupe -= dt;
        // Gas geben / bremsen
        if (a.v < soll && !schreck) a.v = Math.min(soll, a.v + GAS * dt); else a.v = Math.max(soll, a.v - 9 * dt);
        if (schreck) a.v = Math.max(0, a.v - 2.5 * dt);      // Vollbremsung reicht nicht mehr
        a.x += sp.dir * a.v * dt;
        if (sp.dir > 0 && a.x > BIS) a.x -= LANG;
        if (sp.dir < 0 && a.x < VON) a.x += LANG;
        // Erwischt? (Katze unter dem Auto)
        if (Math.abs(katze.x - a.x) < a.lang / 2 + 0.15 && Math.abs(katze.z - sp.z) < 1.05 && katze.y < 0.9 && a.v > 0.8) aus.ueberfahren = a;
      });
    }
    return aus;
  }

  zeichne(dt) {
    for (const a of this.autos) {
      const m = a.m;
      m.wurzel.position.set(a.x, 0, a.sp.z);
      m.wurzel.rotation.y = a.sp.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      for (const r of m.raeder) r.rotation.x += a.v * dt / 0.33;
      m.bremse.material.emissiveIntensity = a.v < a.max - 0.5 ? 2.5 : 0.4;
    }
  }
}

// ---------- Aussehen ----------
function baueAuto(art, farbe) {
  const wurzel = new T.Group(), lack = mat(farbe, { r: 0.35, m: 0.3 });
  const add = (geo, m, x, y, z) => { const me = new T.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; wurzel.add(me); return me; };
  const L = art === 'auto' ? 4 : 5, B = 1.8;
  const glas = mat('#2C3E50', { r: 0.1, m: 0.5 });
  if (art === 'auto') {
    add(new T.RoundedBoxGeometry(B, 0.65, L, 2, 0.12), lack, 0, 0.62, 0);
    add(new T.RoundedBoxGeometry(B - 0.2, 0.55, 2.1, 2, 0.12), lack, 0, 1.2, -0.25);
    add(new T.BoxGeometry(B - 0.16, 0.42, 2.0), glas, 0, 1.2, -0.25);
  } else {
    add(new T.RoundedBoxGeometry(B, 1.6, L, 2, 0.12), lack, 0, 1.1, -0.3);
    add(new T.RoundedBoxGeometry(B, 0.9, 1.3, 2, 0.12), lack, 0, 0.75, L / 2 - 0.65);
    add(new T.BoxGeometry(B - 0.12, 0.5, 0.06), glas, 0, 1.45, L / 2 - 1.28).rotation.x = -0.2;
    add(new T.BoxGeometry(B + 0.02, 0.4, L - 1.6), mat('#FFFFFF', { r: 0.5 }), 0, 1.25, -0.4);
  }
  const front = L / 2 - 0.02;
  for (const s of [-0.6, 0.6]) {
    add(new T.BoxGeometry(0.32, 0.14, 0.06), mat('#FFF7D0', { e: 0xFFF2B0, ei: 1.2 }), s, 0.72, front);
  }
  const bremse = add(new T.BoxGeometry(1.4, 0.1, 0.05), new T.MeshStandardMaterial({ color: '#C0392B', emissive: 0xFF2020, emissiveIntensity: 0.4 }), 0, 0.75, -L / 2 + 0.01);
  const raeder = [];
  const reifen = mat('#1E1E22', { r: 0.9 }), felge = mat('#D0D3D6', { m: 0.7, r: 0.3 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const r = new T.Group(); r.position.set(sx * (B / 2 - 0.05), 0.33, sz * (L / 2 - 0.8)); wurzel.add(r);
    const rr = new T.Mesh(new T.CylinderGeometry(0.33, 0.33, 0.24, 14), reifen); rr.rotation.z = Math.PI / 2; rr.castShadow = true; r.add(rr);
    const ff = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.26, 8), felge); ff.rotation.z = Math.PI / 2; r.add(ff);
    raeder.push(r);
  }
  return { wurzel, raeder, bremse };
}
function licht(farbe) { return new T.MeshStandardMaterial({ color: farbe, emissive: farbe, emissiveIntensity: 0.05, roughness: 0.3 }); }
function autoAmpel(scene, x, z, dreh) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = dreh; scene.add(g);
  const pfahl = new T.Mesh(new T.CylinderGeometry(0.06, 0.07, 3, 8), mat('#3A3F45', { m: 0.5, r: 0.4 })); pfahl.position.y = 1.5; pfahl.castShadow = true; g.add(pfahl);
  const kasten = new T.Mesh(new T.BoxGeometry(0.34, 0.95, 0.26), mat('#222428')); kasten.position.set(0, 3.0, 0); kasten.castShadow = true; g.add(kasten);
  const k = (f, y) => { const m = new T.Mesh(new T.CircleGeometry(0.1, 16), licht(f)); m.position.set(0, y, 0.135); g.add(m); return m; };
  return { rot: k('#FF2A2A', 3.3), gelb: k('#FFC400', 3.0), gruen: k('#22E05A', 2.7) };
}
function fussAmpel(scene, x, z, dreh) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = dreh; scene.add(g);
  const pfahl = new T.Mesh(new T.CylinderGeometry(0.05, 0.06, 2.3, 8), mat('#3A3F45', { m: 0.5, r: 0.4 })); pfahl.position.y = 1.15; pfahl.castShadow = true; g.add(pfahl);
  const kasten = new T.Mesh(new T.BoxGeometry(0.26, 0.56, 0.2), mat('#222428')); kasten.position.set(0, 2.3, 0); g.add(kasten);
  // kleines Männchen: stehend (rot) und gehend (grün)
  const mann = (f, y, geht) => {
    const gr = new T.Group(); gr.position.set(0, y, 0.105); g.add(gr);
    const m = licht(f);
    const kopf = new T.Mesh(new T.CircleGeometry(0.025, 10), m); kopf.position.y = 0.07; gr.add(kopf);
    const k = new T.Mesh(new T.PlaneGeometry(0.05, 0.08), m); gr.add(k);
    for (const s of [-1, 1]) { const b = new T.Mesh(new T.PlaneGeometry(0.02, 0.07), m); b.position.set(s * 0.015, -0.07, 0); if (geht) b.rotation.z = s * 0.4; gr.add(b); }
    return { material: m };
  };
  return { rot: mann('#FF2A2A', 2.42), gruen: mann('#22E05A', 2.17, true) };
}
function zebraSchild(scene, x, z) {
  const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
  const pfahl = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 2.4, 8), mat('#B0B4B8', { m: 0.5 })); pfahl.position.y = 1.2; g.add(pfahl);
  const s = new T.Mesh(new T.BoxGeometry(0.5, 0.5, 0.03), mat('#1E5BD8', { r: 0.4 })); s.position.y = 2.4; g.add(s);
  const d = new T.Mesh(new T.CircleGeometry(0.18, 3), mat('#FFFFFF')); d.position.set(0, 2.38, 0.02); d.rotation.z = Math.PI / 2; g.add(d);
  const d2 = d.clone(); d2.position.z = -0.02; d2.rotation.y = Math.PI; g.add(d2);
}
