// Где могут ходить люди? Дом делится на клеточки 25 × 25 см.
// Клетка свободна, если там есть пол и человек (≈ 50 см толщиной, 1,6 м ростом) не задевает мебель.
// Кошачьи дверцы (42 см высотой) и лазы в полу для людей закрыты сами собой.
// Путь ищет алгоритм A* («А-звёздочка»), между этажами – по лестницам.

const ZELLE = 0.25;

export function baueWegnetz(haus, world, R) {
  const E = haus.etagen, [W, D] = haus.groesse;
  const NX = Math.ceil(W / ZELLE), NZ = Math.ceil(D / ZELLE), PRO = NX * NZ;
  const frei = new Uint8Array(PRO * E.length);
  const form = new R.Cuboid(0.2, 0.6, 0.2), rot = { x: 0, y: 0, z: 0, w: 1 };
  const filter = R.QueryFilterFlags.EXCLUDE_DYNAMIC | R.QueryFilterFlags.EXCLUDE_KINEMATIC;
  E.forEach((et, e) => {
    for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) {
      const x = (ix + 0.5) * ZELLE, z = (iz + 0.5) * ZELLE;
      // Platz für den Körper?
      if (world.intersectionWithShape({ x, y: et.y + 0.92, z }, rot, form, filter)) continue;
      // Boden darunter?
      const hit = world.castRay(new R.Ray({ x, y: et.y + 0.3, z }, { x: 0, y: -1, z: 0 }), 0.6, true, filter);
      if (hit) frei[e * PRO + iz * NX + ix] = 1;
    }
  });
  const zelle = (e, x, z) => {
    const ix = Math.floor(x / ZELLE), iz = Math.floor(z / ZELLE);
    if (ix < 0 || iz < 0 || ix >= NX || iz >= NZ) return -1;
    return e * PRO + iz * NX + ix;
  };
  const mitte = i => { const e = Math.floor(i / PRO), r = i % PRO; return { e, x: (r % NX + 0.5) * ZELLE, z: (Math.floor(r / NX) + 0.5) * ZELLE }; };
  // Nächste freie Zelle (z. B. wenn die Katze auf dem Sofa sitzt)
  function naechsteFreie(e, x, z, max = 1.5) {
    const c = zelle(e, x, z);
    if (c >= 0 && frei[c]) return c;
    let best = -1, bd = Infinity;
    const r = Math.ceil(max / ZELLE);
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const k = zelle(e, x + dx * ZELLE, z + dz * ZELLE);
      if (k < 0 || !frei[k]) continue;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }
  // Treppen = Sprünge zwischen den Etagen
  const spruenge = new Map();   // zelle → [{ziel, ueber: Punkt auf der Rampe, kosten}]
  E.forEach((et, e) => {
    for (const t of et.objekte.filter(o => o.typ === 'treppe')) {
      const x0 = Math.min(t.x0, t.x1), x1 = Math.max(t.x0, t.x1), z0 = Math.min(t.z0, t.z1), z1 = Math.max(t.z0, t.z1);
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const [dx, dz] = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] }[t.richtung];
      const halb = dx ? (x1 - x0) / 2 : (z1 - z0) / 2;
      const unten = naechsteFreie(e, mx - dx * (halb + 0.4), mz - dz * (halb + 0.4), 0.6);
      const rampe = { e: e + 1, x: mx + dx * (halb - 0.25), z: mz + dz * (halb - 0.25), treppe: true };
      let oben = -1;
      for (const [ox, oz] of [[dx * (halb + 0.45), dz * (halb + 0.45)], [dx * (halb - 0.25) + dz * 0.9, dz * (halb - 0.25) + dx * 0.9], [dx * (halb - 0.25) - dz * 0.9, dz * (halb - 0.25) - dx * 0.9]]) {
        const k = zelle(e + 1, mx + ox, mz + oz);
        if (k >= 0 && frei[k]) { oben = k; break; }
      }
      if (unten < 0 || oben < 0) continue;
      const kosten = halb * 2 + 2;
      if (!spruenge.has(unten)) spruenge.set(unten, []);
      if (!spruenge.has(oben)) spruenge.set(oben, []);
      spruenge.get(unten).push({ ziel: oben, ueber: rampe, kosten });
      spruenge.get(oben).push({ ziel: unten, ueber: { e, x: mx - dx * (halb - 0.3), z: mz - dz * (halb - 0.3), treppe: true }, kosten });
    }
  });

  // Gerade Linie frei? (für glatte Wege)
  function sicht(a, b) {
    const pa = mitte(a), pb = mitte(b);
    if (pa.e !== pb.e) return false;
    const n = Math.ceil(Math.hypot(pb.x - pa.x, pb.z - pa.z) / (ZELLE * 0.5));
    for (let i = 1; i < n; i++) {
      const x = pa.x + (pb.x - pa.x) * i / n, z = pa.z + (pb.z - pa.z) * i / n;
      // etwas Abstand halten: auch die Nachbarn quer zur Richtung prüfen
      if (!frei[zelle(pa.e, x, z)]) return false;
    }
    return true;
  }

  const g = new Float32Array(frei.length), vor = new Int32Array(frei.length), zu = new Uint8Array(frei.length);
  function pfad(e0, x0, z0, e1, x1, z1) {
    const s = naechsteFreie(e0, x0, z0, 0.8), ziel = naechsteFreie(e1, x1, z1, 1.6);
    if (s < 0 || ziel < 0) return null;
    const pz = mitte(ziel);
    g.fill(Infinity); vor.fill(-1); zu.fill(0);
    const heap = [[0, s]]; g[s] = 0;
    const h = i => { const p = mitte(i); return Math.hypot(p.x - pz.x, p.z - pz.z) + Math.abs(p.e - pz.e) * 4; };
    const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const pp = (k - 1) >> 1; if (heap[pp][0] <= heap[k][0]) break; [heap[pp], heap[k]] = [heap[k], heap[pp]]; k = pp; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    let gefunden = false, schritte = 0;
    while (heap.length && schritte++ < 40000) {
      const [, i] = pop();
      if (zu[i]) continue; zu[i] = 1;
      if (i === ziel) { gefunden = true; break; }
      const e = Math.floor(i / PRO), r = i % PRO, ix = r % NX, iz = Math.floor(r / NX);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = ix + dx, nz = iz + dz;
        if (nx < 0 || nz < 0 || nx >= NX || nz >= NZ) continue;
        const n = e * PRO + nz * NX + nx;
        if (!frei[n] || zu[n]) continue;
        if (dx && dz && (!frei[e * PRO + iz * NX + nx] || !frei[e * PRO + nz * NX + ix])) continue;
        const ng = g[i] + (dx && dz ? 1.414 : 1) * ZELLE;
        if (ng < g[n]) { g[n] = ng; vor[n] = i; push(ng + h(n), n); }
      }
      for (const sp of spruenge.get(i) || []) {
        const ng = g[i] + sp.kosten;
        if (ng < g[sp.ziel]) { g[sp.ziel] = ng; vor[sp.ziel] = i; push(ng + h(sp.ziel), sp.ziel); }
      }
    }
    if (!gefunden) return null;
    const kette = [];
    for (let i = ziel; i >= 0; i = vor[i]) kette.unshift(i);
    // Glätten: Zellen überspringen, die man geradeaus erreicht; Treppen-Rampen einfügen
    const weg = [];
    let a = 0;
    while (a < kette.length - 1) {
      let b = a + 1;
      const ea = Math.floor(kette[a] / PRO);
      if (Math.floor(kette[b] / PRO) !== ea) {
        const sp = (spruenge.get(kette[a]) || []).find(x => x.ziel === kette[b]);
        if (sp) weg.push(sp.ueber);
        weg.push({ ...mitte(kette[b]), treppe: true }); a = b; continue;
      }
      while (b + 1 < kette.length && Math.floor(kette[b + 1] / PRO) === ea && sicht(kette[a], kette[b + 1])) b++;
      weg.push(mitte(kette[b])); a = b;
    }
    if (!weg.length) weg.push(pz);
    return weg;
  }
  return { pfad, frei, NX, NZ, ZELLE, zelle, spruenge, anzahlFrei: frei.reduce((s, v) => s + v, 0) };
}
