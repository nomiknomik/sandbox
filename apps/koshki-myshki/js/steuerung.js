// Управление: клавиатура + мышь (компьютер) и джойстик + кнопки (iPad).
export class Steuerung {
  constructor(flaeche, knoepfe) {
    this.tasten = new Set();
    this.joy = { x: 0, z: 0 };
    this.dx = 0; this.dy = 0;
    this.einmal = {};                     // springen, pfote, miau, kamera – срабатывают один раз
    this.halten = {};                     // кнопка зажата (прыжок держим)
    this.gesperrt = false;
    this.touch = false;

    addEventListener('keydown', e => {
      if (e.repeat) return;
      this.tasten.add(e.code);
      const k = { Space: 'springen', KeyE: 'pfote', KeyF: 'pfote', KeyQ: 'miau', KeyM: 'miau', KeyC: 'kamera', KeyV: 'kamera' }[e.code];
      if (k) { this.einmal[k] = true; e.preventDefault(); }
    });
    addEventListener('keyup', e => this.tasten.delete(e.code));
    addEventListener('blur', () => this.tasten.clear());

    // Maus: Klick sperrt den Zeiger, dann dreht die Maus die Kamera
    document.addEventListener('pointerlockchange', () => { this.gesperrt = document.pointerLockElement === flaeche; });
    document.addEventListener('mousemove', e => {
      if (this.gesperrt) { this.dx += e.movementX; this.dy += e.movementY; }
    });

    // Finger: links = Joystick, rechts = umschauen
    const basis = document.getElementById('joy'), knauf = document.getElementById('joyKnauf');
    let joyId = null, joyX = 0, joyY = 0;
    const blicke = new Map();
    flaeche.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') {
        if (this.aktiv && !this.gesperrt && flaeche.requestPointerLock) { try { flaeche.requestPointerLock(); } catch {} }
        else if (this.gesperrt) this.einmal.pfote = true;
        return;
      }
      this.touch = true;
      flaeche.setPointerCapture(e.pointerId);
      if (e.clientX < innerWidth * 0.45 && joyId === null) {
        joyId = e.pointerId; joyX = e.clientX; joyY = e.clientY;
        basis.style.display = 'block';
        basis.style.left = joyX + 'px'; basis.style.top = joyY + 'px';
        knauf.style.transform = 'translate(-50%,-50%)';
      } else blicke.set(e.pointerId, [e.clientX, e.clientY]);
    });
    flaeche.addEventListener('pointermove', e => {
      if (e.pointerId === joyId) {
        let x = e.clientX - joyX, y = e.clientY - joyY;
        const r = 60, l = Math.hypot(x, y);
        if (l > r) { x *= r / l; y *= r / l; }
        this.joy.x = x / r; this.joy.z = -y / r;
        knauf.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      } else if (blicke.has(e.pointerId)) {
        const [lx, ly] = blicke.get(e.pointerId);
        this.dx += (e.clientX - lx) * 1.6; this.dy += (e.clientY - ly) * 1.6;
        blicke.set(e.pointerId, [e.clientX, e.clientY]);
      }
    });
    const los = e => {
      if (e.pointerId === joyId) { joyId = null; this.joy.x = this.joy.z = 0; basis.style.display = 'none'; }
      blicke.delete(e.pointerId);
    };
    flaeche.addEventListener('pointerup', los);
    flaeche.addEventListener('pointercancel', los);

    // Bildschirm-Knöpfe
    for (const [id, was] of Object.entries(knoepfe)) {
      const b = document.getElementById(id);
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); this.einmal[was] = true; this.halten[was] = true; b.classList.add('an'); });
      const aus = () => { this.halten[was] = false; b.classList.remove('an'); };
      b.addEventListener('pointerup', aus); b.addEventListener('pointercancel', aus); b.addEventListener('pointerleave', aus);
    }
  }

  // Was will der Spieler gerade?  (einmal-Sachen werden dabei «verbraucht»)
  holen() {
    const t = this.tasten;
    let x = (t.has('KeyD') || t.has('ArrowRight') ? 1 : 0) - (t.has('KeyA') || t.has('ArrowLeft') ? 1 : 0);
    let z = (t.has('KeyW') || t.has('ArrowUp') ? 1 : 0) - (t.has('KeyS') || t.has('ArrowDown') ? 1 : 0);
    if (!x && !z) { x = this.joy.x; z = this.joy.z; }
    const aus = { x, z, rennen: t.has('ShiftLeft') || t.has('ShiftRight'), dx: this.dx, dy: this.dy, ...this.einmal };
    this.dx = this.dy = 0; this.einmal = {};
    return aus;
  }
}
