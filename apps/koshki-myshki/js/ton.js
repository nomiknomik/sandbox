// Звуки делаются прямо в программе (синтезатор). Никаких записей голосов.
let ctx = null, laut = null;

export function tonStart() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    laut = ctx.createGain(); laut.gain.value = 0.7; laut.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function rauschen(dauer) {
  const n = Math.floor(ctx.sampleRate * dauer), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(); s.buffer = b; return s;
}
function huelle(g, t, a, h, d, max = 1) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(max, t + a);
  g.gain.setValueAtTime(max, t + a + h);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + h + d);
}

// Мяу: «пила» через два фильтра-форманты, высота поднимается и падает
export function miau() {
  if (!ctx) return;
  const t = ctx.currentTime, dauer = 0.55 + Math.random() * 0.2, hoch = 1 + (Math.random() - 0.5) * 0.25;
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(420 * hoch, t);
  o.frequency.linearRampToValueAtTime(760 * hoch, t + dauer * 0.35);
  o.frequency.linearRampToValueAtTime(470 * hoch, t + dauer);
  const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 6; vg.gain.value = 12;
  vib.connect(vg); vg.connect(o.frequency);
  const g = ctx.createGain(); huelle(g, t, 0.06, dauer * 0.5, dauer * 0.45, 0.5);
  for (const [f0, f1, q] of [[700, 1500, 6], [1800, 2600, 8]]) {
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.linearRampToValueAtTime(f1, t + dauer * 0.35); f.frequency.linearRampToValueAtTime(f0 * 1.1, t + dauer);
    o.connect(f); f.connect(g);
  }
  g.connect(laut);
  o.start(t); vib.start(t); o.stop(t + dauer + 0.05); vib.stop(t + dauer + 0.05);
}

// Дзынь-бах: разбилось стекло/фарфор
export function krach(staerke = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const r = rauschen(0.5), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
  const g = ctx.createGain(); huelle(g, t, 0.003, 0.02, 0.35, 0.6 * staerke);
  r.connect(hp); hp.connect(g); g.connect(laut); r.start(t);
  for (let i = 0; i < 5; i++) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 2200 + Math.random() * 3000;
    const og = ctx.createGain(); const s = t + Math.random() * 0.12;
    huelle(og, s, 0.002, 0, 0.25 + Math.random() * 0.3, 0.12 * staerke);
    o.connect(og); og.connect(laut); o.start(s); o.stop(s + 0.7);
  }
}

// Глухой «бум» (упала книга, мяч)
export function plopp(staerke = 1) {
  if (!ctx) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.15);
  huelle(g, t, 0.003, 0, 0.18, 0.5 * Math.min(1, staerke));
  o.connect(g); g.connect(laut); o.start(t); o.stop(t + 0.25);
}

// Царап-царап
export function kratzen() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 4; i++) {
    const r = rauschen(0.1), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500 + i * 300; f.Q.value = 2;
    const g = ctx.createGain(); huelle(g, t + i * 0.11, 0.01, 0.03, 0.05, 0.35);
    r.connect(f); f.connect(g); g.connect(laut); r.start(t + i * 0.11);
  }
}

// Мурр
export function schnurren() {
  if (!ctx) return;
  const t = ctx.currentTime, r = rauschen(1.2), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
  const g = ctx.createGain(); g.gain.value = 0;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 24; lg.gain.value = 0.25;
  lfo.connect(lg); lg.connect(g.gain);
  r.connect(f); f.connect(g); g.connect(laut); r.start(t); lfo.start(t); r.stop(t + 1.2); lfo.stop(t + 1.2);
}

export function hops() {
  if (!ctx) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(600, t + 0.08);
  huelle(g, t, 0.005, 0, 0.08, 0.12);
  o.connect(g); g.connect(laut); o.start(t); o.stop(t + 0.12);
}

// БОНГ! Сковородка
export function bong() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const [f, v, d] of [[310, 0.5, 0.9], [742, 0.3, 0.7], [1285, 0.18, 0.5], [2010, 0.1, 0.3]]) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f;
    huelle(g, t, 0.002, 0, d, v); o.connect(g); g.connect(laut); o.start(t); o.stop(t + d + 0.05);
  }
  plopp(1);
}
export function mampf() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 3; i++) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 500 + i * 120;
    huelle(g, t + i * 0.12, 0.005, 0.02, 0.06, 0.15); o.connect(g); g.connect(laut); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.12); }
}
