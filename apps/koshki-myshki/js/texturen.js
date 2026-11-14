// Текстуры рисуются прямо в программе (никаких картинок скачивать не нужно)
import * as THREE from '../vendor/three.js';

function leinwand(n, malen) {
  const c = document.createElement('canvas'); c.width = c.height = n;
  malen(c.getContext('2d'), n);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function rauschen(ctx, n, staerke, menge = 4000) {
  for (let i = 0; i < menge; i++) {
    const a = Math.random() * staerke;
    ctx.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
    ctx.fillRect(Math.random() * n, Math.random() * n, 2, 2);
  }
}

// Каждая текстура покрывает «meter» метров
export const TEX = {
  holz: { meter: 1.6, t: () => leinwand(256, (c, n) => {
    const reihen = 8, h = n / reihen;
    for (let i = 0; i < reihen; i++) {
      const l = 58 + Math.random() * 10;
      c.fillStyle = `hsl(30,52%,${l}%)`; c.fillRect(0, i * h, n, h);
      for (let k = 0; k < 6; k++) { c.strokeStyle = `hsla(28,45%,${l - 12}%,.35)`; c.beginPath(); const y = i * h + Math.random() * h; c.moveTo(0, y); c.bezierCurveTo(n * .3, y + 3, n * .6, y - 3, n, y + 1); c.stroke(); }
      c.fillStyle = 'rgba(70,40,20,.5)'; c.fillRect(0, i * h, n, 1.5);
      const fuge = ((i * 97) % n); c.fillRect(fuge, i * h, 1.5, h);
    }
    rauschen(c, n, 0.06);
  }) },
  dielen: { meter: 2.4, t: () => leinwand(256, (c, n) => {
    const reihen = 6, h = n / reihen;
    for (let i = 0; i < reihen; i++) { const l = 48 + Math.random() * 12; c.fillStyle = `hsl(32,40%,${l}%)`; c.fillRect(0, i * h, n, h); c.fillStyle = 'rgba(50,30,15,.6)'; c.fillRect(0, i * h, n, 2); }
    rauschen(c, n, 0.08, 6000);
  }) },
  fliesen: { meter: 1.2, t: () => leinwand(128, (c, n) => {
    const k = n / 4;
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) { c.fillStyle = (x + y) % 2 ? '#E9EEF0' : '#D3DCE0'; c.fillRect(x * k, y * k, k, k); }
    c.strokeStyle = '#B9C3C8'; c.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * k, 0); c.lineTo(i * k, n); c.moveTo(0, i * k); c.lineTo(n, i * k); c.stroke(); }
    rauschen(c, n, 0.03, 800);
  }) },
  teppich: { meter: 1.0, t: () => leinwand(128, (c, n) => { c.fillStyle = '#E3BFC0'; c.fillRect(0, 0, n, n); rauschen(c, n, 0.08, 5000); }) },
  beton: { meter: 3.0, t: () => leinwand(256, (c, n) => { c.fillStyle = '#B9B4AC'; c.fillRect(0, 0, n, n); rauschen(c, n, 0.1, 9000); }) },
  gras: { meter: 4.0, t: () => leinwand(256, (c, n) => {
    c.fillStyle = '#6DB55A'; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 5000; i++) { c.fillStyle = `hsla(${95 + Math.random() * 25},50%,${35 + Math.random() * 25}%,.6)`; c.fillRect(Math.random() * n, Math.random() * n, 1.5, 4); }
  }) },
  putz: { meter: 2.0, t: () => leinwand(128, (c, n) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, n, n); rauschen(c, n, 0.05, 2500); }) },
  ziegel: { meter: 1.5, t: () => leinwand(256, (c, n) => {
    c.fillStyle = '#D8D2C6'; c.fillRect(0, 0, n, n);
    const h = n / 10, w = n / 4;
    for (let y = 0; y < 10; y++) for (let x = -1; x < 5; x++) { c.fillStyle = `hsl(${12 + Math.random() * 8},45%,${46 + Math.random() * 10}%)`; c.fillRect(x * w + (y % 2) * w / 2 + 2, y * h + 2, w - 4, h - 4); }
  }) },
};

const cache = {};
// Текстура с повтором под размер (w × h метров)
export function textur(name, w, h) {
  const def = TEX[name] || TEX.putz;
  if (!cache[name]) cache[name] = def.t();
  const t = cache[name].clone();
  t.repeat.set(w / def.meter, h / def.meter);
  t.needsUpdate = true;
  return t;
}
