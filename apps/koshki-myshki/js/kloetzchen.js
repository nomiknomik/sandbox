// Klötzchen – das Spiel auf der Konsole im geheimen Spielzimmer.
// Bunte Klötzchen fallen von oben. Schieb und dreh sie so, dass volle Reihen entstehen –
// volle Reihen verschwinden. Wenn der Turm oben anstößt, ist das Spiel vorbei.
const BREIT = 10, HOCH = 20;
// Die 7 Formen (jede aus 4 Kästchen) und ihre Farben
const FORMEN = [
  { f: '#3DE0E0', z: [[0, 1], [1, 1], [2, 1], [3, 1]] },     // Stange
  { f: '#FFD93D', z: [[1, 0], [2, 0], [1, 1], [2, 1]] },     // Würfel
  { f: '#C77DFF', z: [[1, 0], [0, 1], [1, 1], [2, 1]] },     // T
  { f: '#6BCB77', z: [[1, 0], [2, 0], [0, 1], [1, 1]] },     // S
  { f: '#FF6B6B', z: [[0, 0], [1, 0], [1, 1], [2, 1]] },     // Z
  { f: '#4D96FF', z: [[0, 0], [0, 1], [1, 1], [2, 1]] },     // J
  { f: '#FF9F45', z: [[2, 0], [0, 1], [1, 1], [2, 1]] },     // L
];
const PUNKTE = [0, 100, 300, 500, 800];
const BEST = 'km-kloetzchen-best';

export class Kloetzchen {
  constructor() {
    const d = document.createElement('div'); d.id = 'kloetzchen';
    d.innerHTML = `
      <div class="kl-rahmen">
        <canvas class="kl-feld" width="${BREIT * 30}" height="${HOCH * 30}"></canvas>
        <div class="kl-seite">
          <h2>🧱 Klötzchen</h2>
          <div>Nächstes</div><canvas class="kl-next" width="120" height="80"></canvas>
          <div class="kl-zahl">Punkte <b data-w="punkte">0</b></div>
          <div class="kl-zahl">Reihen <b data-w="reihen">0</b></div>
          <div class="kl-zahl">Stufe <b data-w="stufe">1</b></div>
          <div class="kl-zahl">Rekord <b data-w="best">0</b></div>
          <div class="kl-hilfe">⬅ ➡ schieben · ⬆ drehen<br>⬇ schneller · Leertaste fallen lassen</div>
          <button class="kl-ende">✖ Zurück aufs Sofa</button>
        </div>
      </div>
      <div class="kl-meldung"></div>
      <div class="kl-knoepfe">
        <button data-k="links">◀</button><button data-k="drehen">⟳</button><button data-k="rechts">▶</button>
        <button data-k="runter">▼</button><button data-k="fallen">⤓</button>
      </div>`;
    document.body.append(d);
    this.el = d; this.feldC = d.querySelector('.kl-feld'); this.nextC = d.querySelector('.kl-next');
    this.ctx = this.feldC.getContext('2d'); this.nctx = this.nextC.getContext('2d');
    this.aktiv = false;
    d.querySelector('.kl-ende').onclick = () => this.stop();
    for (const ev of ['pointerdown', 'touchstart', 'mousedown']) d.addEventListener(ev, e => e.stopPropagation());
    // Knöpfe (Finger): gedrückt halten wiederholt
    for (const b of d.querySelectorAll('[data-k]')) {
      let t = 0;
      const los = e => { e.preventDefault(); this.taste(b.dataset.k); clearInterval(t); if (b.dataset.k !== 'drehen' && b.dataset.k !== 'fallen') t = setInterval(() => this.taste(b.dataset.k), b.dataset.k === 'runter' ? 50 : 120); };
      const aus = () => clearInterval(t);
      b.addEventListener('pointerdown', los); b.addEventListener('pointerup', aus); b.addEventListener('pointerleave', aus); b.addEventListener('pointercancel', aus);
    }
    // Tastatur: nur solange das Spiel offen ist (und dann bekommt die Katze die Tasten nicht)
    addEventListener('keydown', e => {
      if (!this.aktiv) return;
      const k = { ArrowLeft: 'links', KeyA: 'links', ArrowRight: 'rechts', KeyD: 'rechts', ArrowUp: 'drehen', KeyW: 'drehen', KeyX: 'drehen',
        ArrowDown: 'runter', KeyS: 'runter', Space: 'fallen', Escape: 'ende', KeyP: 'pause' }[e.code];
      e.stopImmediatePropagation(); e.preventDefault();
      if (k === 'ende') this.stop(); else if (k) this.taste(k);
    }, true);
  }

  // onEnde(punkte, reihen) wird gerufen, wenn man aufhört
  start(onEnde) {
    this.onEnde = onEnde;
    this.feld = Array.from({ length: HOCH }, () => Array(BREIT).fill(null));
    this.punkte = 0; this.reihen = 0; this.stufe = 1; this.vorbei = false; this.sack = [];
    try { this.best = +localStorage.getItem(BEST) || 0; } catch { this.best = 0; }
    this.naechstes = this.ziehe(); this.neu();
    this.fallZeit = 0; this.aktiv = true; this.blitz = [];
    this.el.classList.add('zeig'); this.zahlen(); this.melde('Los geht’s! 🐾');
    this.uhr = performance.now();
    const loop = () => { if (!this.aktiv) return; this.tick(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  stop() {
    if (!this.aktiv) return;
    this.aktiv = false; this.el.classList.remove('zeig');
    if (this.onEnde) this.onEnde(this.punkte, this.reihen);
  }
  // Gerechter Zufall: alle 7 Formen kommen gemischt, bevor sich eine wiederholt
  ziehe() {
    if (!this.sack.length) { this.sack = [0, 1, 2, 3, 4, 5, 6]; for (let i = 6; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.sack[i], this.sack[j]] = [this.sack[j], this.sack[i]]; } }
    const n = this.sack.pop();
    return { n, f: FORMEN[n].f, z: FORMEN[n].z.map(p => [...p]) };
  }
  neu() {
    this.stein = this.naechstes; this.naechstes = this.ziehe();
    this.sx = 3; this.sy = -1;
    if (!this.passt(this.stein.z, this.sx, this.sy)) { this.sy = -2; }
    if (!this.passt(this.stein.z, this.sx, this.sy)) this.ende();
  }
  passt(z, x, y) {
    return z.every(([a, b]) => { const X = x + a, Y = y + b; return X >= 0 && X < BREIT && Y < HOCH && (Y < 0 || !this.feld[Y][X]); });
  }
  drehe(z) {
    // um die Mitte der Form drehen (der Würfel dreht sich nicht)
    if (this.stein.n === 1) return z;
    const g = this.stein.n === 0 ? 3 : 2;
    return z.map(([a, b]) => [g - b, a]);
  }
  taste(k) {
    if (!this.aktiv || this.vorbei) { if (this.vorbei && k === 'fallen') this.start(this.onEnde); return; }
    if (k === 'pause') { this.pause = !this.pause; this.melde(this.pause ? '⏸ Pause' : ''); return; }
    if (this.pause) return;
    if (k === 'links' && this.passt(this.stein.z, this.sx - 1, this.sy)) this.sx--;
    if (k === 'rechts' && this.passt(this.stein.z, this.sx + 1, this.sy)) this.sx++;
    if (k === 'drehen') {
      const z = this.drehe(this.stein.z);
      for (const dx of [0, -1, 1, -2, 2]) if (this.passt(z, this.sx + dx, this.sy)) { this.stein.z = z; this.sx += dx; break; }
    }
    if (k === 'runter') { if (this.passt(this.stein.z, this.sx, this.sy + 1)) { this.sy++; this.punkte += 1; this.fallZeit = 0; } else this.landen(); }
    if (k === 'fallen') { let n = 0; while (this.passt(this.stein.z, this.sx, this.sy + 1)) { this.sy++; n++; } this.punkte += 2 * n; this.landen(); }
    this.zahlen(); this.malen();
  }
  landen() {
    for (const [a, b] of this.stein.z) { const Y = this.sy + b; if (Y < 0) { this.ende(); return; } this.feld[Y][this.sx + a] = this.stein.f; }
    // volle Reihen weg
    const voll = [];
    for (let y = 0; y < HOCH; y++) if (this.feld[y].every(Boolean)) voll.push(y);
    if (voll.length) {
      for (const y of voll) { this.feld.splice(y, 1); this.feld.unshift(Array(BREIT).fill(null)); }
      this.reihen += voll.length; this.punkte += PUNKTE[voll.length] * this.stufe;
      this.stufe = 1 + Math.floor(this.reihen / 8);
      this.melde(['', 'Eine Reihe! 👍', 'Zwei Reihen! 🎉', 'Drei Reihen! 🤩', 'VIER REIHEN! 🐱👑'][voll.length]);
      this.blitz = voll.map(y => ({ y, t: 0.25 }));
      if (this.onReihe) this.onReihe(voll.length);
    }
    this.neu(); this.fallZeit = 0;
  }
  ende() {
    this.vorbei = true;
    if (this.punkte > this.best) { this.best = this.punkte; try { localStorage.setItem(BEST, this.best); } catch {} this.melde('🏆 Neuer Rekord! ⤓ = nochmal'); }
    else this.melde('Turm zu hoch – vorbei! ⤓ = nochmal');
    this.zahlen();
  }
  melde(t) {
    const m = this.el.querySelector('.kl-meldung'); m.textContent = t; m.classList.toggle('zeig', !!t);
    clearTimeout(this.mt); if (t && !this.vorbei && !this.pause) this.mt = setTimeout(() => m.classList.remove('zeig'), 1400);
  }
  zahlen() {
    for (const [k, v] of Object.entries({ punkte: this.punkte, reihen: this.reihen, stufe: this.stufe, best: Math.max(this.best, this.punkte) }))
      this.el.querySelector(`[data-w="${k}"]`).textContent = v;
  }
  tick() {
    const jetzt = performance.now(), dt = Math.min(0.1, (jetzt - this.uhr) / 1000); this.uhr = jetzt;
    if (!this.vorbei && !this.pause) {
      this.fallZeit += dt;
      const takt = Math.max(0.08, 0.8 * Math.pow(0.85, this.stufe - 1));
      if (this.fallZeit > takt) { this.fallZeit = 0; if (this.passt(this.stein.z, this.sx, this.sy + 1)) this.sy++; else this.landen(); }
    }
    for (const b of this.blitz) b.t -= dt;
    this.malen();
  }
  kaestchen(c, x, y, f, g = 30, schatten = false) {
    c.fillStyle = f; c.globalAlpha = schatten ? 0.22 : 1;
    c.fillRect(x * g + 1, y * g + 1, g - 2, g - 2);
    if (!schatten) {
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x * g + 1, y * g + 1, g - 2, 5);
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x * g + 1, y * g + g - 6, g - 2, 5);
    }
    c.globalAlpha = 1;
  }
  malen() {
    const c = this.ctx;
    c.fillStyle = '#141432'; c.fillRect(0, 0, BREIT * 30, HOCH * 30);
    c.strokeStyle = 'rgba(255,255,255,.05)';
    for (let x = 1; x < BREIT; x++) { c.beginPath(); c.moveTo(x * 30, 0); c.lineTo(x * 30, HOCH * 30); c.stroke(); }
    for (let y = 0; y < HOCH; y++) for (let x = 0; x < BREIT; x++) if (this.feld[y][x]) this.kaestchen(c, x, y, this.feld[y][x]);
    for (const b of this.blitz) if (b.t > 0) { c.fillStyle = `rgba(255,255,255,${b.t * 3})`; c.fillRect(0, b.y * 30, BREIT * 30, 30); }
    if (!this.vorbei) {
      // Schatten: wo landet der Stein?
      let gy = this.sy; while (this.passt(this.stein.z, this.sx, gy + 1)) gy++;
      for (const [a, b] of this.stein.z) if (gy + b >= 0) this.kaestchen(c, this.sx + a, gy + b, this.stein.f, 30, true);
      for (const [a, b] of this.stein.z) if (this.sy + b >= 0) this.kaestchen(c, this.sx + a, this.sy + b, this.stein.f);
    }
    const n = this.nctx; n.fillStyle = '#141432'; n.fillRect(0, 0, 120, 80);
    for (const [a, b] of this.naechstes.z) this.kaestchen(n, a + 0.5, b + 0.8, this.naechstes.f, 26);
  }
}
