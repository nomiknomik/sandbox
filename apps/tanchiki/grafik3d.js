/* =====================================================================
   3D-GRAFIK für Танчики – echte Voxel-Würfel mit Licht und Schatten.
   Benutzt Three.js (three.module.min.js, MIT-Lizenz, liegt im Ordner).
   Die Spielregeln bleiben in index.html – hier wird nur GEMALT.
   Koordinaten: Spiel-x → 3D-x, Spiel-y → 3D-z, Höhe → 3D-y.
   ===================================================================== */
const D3_HOEHE = 176, D3_OBEN = (208 - D3_HOEHE) / 2;   // sichtbarer Ausschnitt in Spiel-Punkten
const D3 = {
  bereit: false, laedt: false, fehler: false,

  async laden() {
    if (this.laedt || this.bereit) return;
    this.laedt = true;
    try {
      this.T = await import('./three.module.min.js');
      this.aufbauen();
      this.bereit = true;
      aufteilen();
    } catch (e) {
      console.error(e); this.fehler = true;
      if (einst.grafik === '3d') { einst.grafik = 'block'; einstSpeichern(); meldung('3D geht auf diesem Gerät nicht – Block-Grafik'); }
    }
  },

  /* ---------- Bühne, Kamera, Licht ---------- */
  aufbauen() {
    const T = this.T;
    const cv = this.cv = document.createElement('canvas');
    cv.id = 'bild3d';
    cv.style.cssText = 'position:fixed;left:0;top:0;display:none;pointer-events:none';
    document.body.insertBefore(cv, $('bild'));
    const r = this.r = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
    r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
    const s = this.szene = new T.Scene();
    s.background = new T.Color('#151923');
    // Kamera: von oben, 30° nach hinten gekippt, ohne Perspektive (wie ein Voxel-Spiel)
    // Das 3D-Bild ist 208 breit und nur HOEHE hoch – durch die Schräge braucht das Feld weniger Höhe
    const cam = this.cam = new T.OrthographicCamera(-104, 104, D3_HOEHE / 2, -D3_HOEHE / 2, 1, 900);
    const w = 38 * Math.PI / 180;
    this.camPos = new T.Vector3(104, 400 * Math.cos(w), 104 + 400 * Math.sin(w));
    this.camZiel = new T.Vector3(104, 3, 106);
    cam.position.copy(this.camPos); cam.lookAt(this.camZiel);
    // Licht: Himmel + Sonne von oben links mit weichen Schatten
    this.himmel = new T.HemisphereLight('#d4e6ff', '#3b3524', 1.1); s.add(this.himmel);
    const sonne = this.sonne = new T.DirectionalLight('#fff1d6', 2.6);
    sonne.position.set(104 - 110, 230, 104 - 90); sonne.target.position.set(104, 0, 104);
    sonne.castShadow = true; sonne.shadow.mapSize.set(2048, 2048);
    Object.assign(sonne.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 10, far: 600 });
    sonne.shadow.bias = -0.0006; sonne.shadow.normalBias = 0.25;
    s.add(sonne, sonne.target);
    // ein paar Lampen für Explosionen und Mündungsfeuer (immer gleich viele → kein Ruckeln)
    this.lampen = [];
    for (let i = 0; i < 4; i++) { const l = new T.PointLight('#ff9a40', 0, 80, 1.6); l.position.set(0, 10, 0); s.add(l); this.lampen.push({ l, leben: 0, max: 1, staerke: 0 }); }
    this.scheinwerfer = [];

    this.mats();
    this.feldAufbauen();
    this.teilchenAufbauen();
    Object.assign(this, { panzer: new Map(), kugeln: new Map(), effekte: new Map(), gesehen: new Map(), kugelnAlt: new Set(),
                          karteId: null, kv: -1, karte: new Uint8Array(N * N), zeit: 0, wackeln: 0, letzte: performance.now(), rueck: new Map(), lage: new Map(), nacht: null });
  },

  textur(canvas, wieder = false) {
    const T = this.T, t = new T.CanvasTexture(canvas);
    t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; t.minFilter = T.LinearMipmapLinearFilter; t.anisotropy = 4;
    if (wieder) t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  },
  mats() {
    const T = this.T;
    this.tex = { ziegel: this.textur(TEX[ZIEGEL]), stahl: this.textur(TEX[STAHL]), wald: this.textur(TEX[WALD]), pflaster: this.textur(PFLASTER, true),
                 basis: this.textur(BASIS_HD), basisKaputt: this.textur(BASIS_KAPUTT_HD), wellen: this.textur(WELLEN, true) };
    this.mat = {
      ziegel: new T.MeshLambertMaterial({ map: this.tex.ziegel }),
      stahl: new T.MeshPhongMaterial({ map: this.tex.stahl, shininess: 60, specular: '#7a8290' }),
      wald: new T.MeshLambertMaterial({ map: this.tex.wald, alphaTest: 0.5, side: T.DoubleSide }),
      panzer: new T.MeshLambertMaterial({ vertexColors: true }),
      rand: new T.MeshLambertMaterial({ map: this.tex.pflaster, color: '#9aa0aa' }),
      leuchten: new T.MeshBasicMaterial({ color: '#fff3c0' }),
    };
    const glut = farbe => new T.SpriteMaterial({ map: this.textur(GLUT[farbe]), blending: T.AdditiveBlending, depthWrite: false, transparent: true });
    this.glut = { gelb: glut('gelb'), feuer: glut('feuer'), blau: glut('blau'), rot: glut('rot'), weiss: glut('weiss') };
    this.knallTex = { g: KNALL_GROSS_HD.map(c => this.textur(c)), k: KNALL_KLEIN_HD.map(c => this.textur(c)) };
  },

  /* ---------- Spielfeld: Boden, Wasser, Mauern, Bäume, Basis, Rand ---------- */
  feldAufbauen() {
    const T = this.T, s = this.szene;
    // großer Steinboden außen herum
    const aussen = new T.Mesh(new T.PlaneGeometry(520, 520), new T.MeshLambertMaterial({ map: this.tex.pflaster, color: '#5c616c' }));
    this.tex.pflaster.repeat.set(1, 1);
    aussen.material.map = this.textur(PFLASTER, true); aussen.material.map.repeat.set(40, 40);
    aussen.rotation.x = -Math.PI / 2; aussen.position.set(104, -2.01, 104); aussen.receiveShadow = true; s.add(aussen);
    // Mauer rund ums Feld
    const randTex = this.textur(PFLASTER, true); randTex.repeat.set(26, 1);
    const randMat = new T.MeshLambertMaterial({ map: randTex, color: '#8a909a' });
    for (const [x, z, bx, bz] of [[104, -6, 224, 12], [104, 214, 224, 12], [-6, 104, 12, 232], [214, 104, 12, 232]]) {
      const m = new T.Mesh(new T.BoxGeometry(bx, 9, bz), randMat); m.position.set(x, 2.5, z); m.castShadow = m.receiveShadow = true; s.add(m);
    }
    // Boden des Spielfelds (Gras, Wasser, Eis als ein großes Bild)
    this.bodenCv = leinwand(FR, FR); this.bodenTex = this.textur(this.bodenCv);
    const boden = new T.Mesh(new T.PlaneGeometry(FELD, FELD), new T.MeshLambertMaterial({ map: this.bodenTex }));
    boden.rotation.x = -Math.PI / 2; boden.position.set(104, 0, 104); boden.receiveShadow = true; s.add(boden);
    // Spuren und Brandflecken (eigene durchsichtige Schicht)
    this.spurCv = leinwand(416, 416); this.spurG = this.spurCv.getContext('2d'); this.spurTex = this.textur(this.spurCv);
    const spur = new T.Mesh(new T.PlaneGeometry(FELD, FELD), new T.MeshBasicMaterial({ map: this.spurTex, transparent: true, depthWrite: false }));
    spur.rotation.x = -Math.PI / 2; spur.position.set(104, 0.05, 104); s.add(spur);
    // Wellen auf dem Wasser
    this.wasserCv = leinwand(208, 208); this.wasserMaskTex = new T.CanvasTexture(this.wasserCv);
    this.tex.wellen.repeat.set(13, 13);
    this.wellenMat = new T.MeshBasicMaterial({ map: this.tex.wellen, alphaMap: this.wasserMaskTex, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false });
    const wellen = new T.Mesh(new T.PlaneGeometry(FELD, FELD), this.wellenMat);
    wellen.rotation.x = -Math.PI / 2; wellen.position.set(104, 0.1, 104); s.add(wellen);
    // Mauer-Würfel: je Art 4 Sorten (welches Viertel der Textur), damit das Muster passt
    const wuerfel = (hoehe, qx, qy) => {
      const g = new T.BoxGeometry(4, hoehe, 4); g.translate(0, hoehe / 2, 0);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + qx) / 2, (uv.getY(i) + 1 - qy) / 2);
      return g;
    };
    this.mauern = [];
    for (const [typ, mat, h] of [[ZIEGEL, this.mat.ziegel, 8], [STAHL, this.mat.stahl, 9]]) for (let q = 0; q < 4; q++) {
      const m = new T.InstancedMesh(wuerfel(h, q & 1, q >> 1), mat, N * N);
      m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(N * N * 3).fill(1), 3);
      m.count = 0; m.castShadow = m.receiveShadow = true; m.frustumCulled = false; s.add(m);
      this.mauern.push({ typ, q, m });
    }
    // Baumkronen: schweben über dem Boden, Panzer fahren darunter
    const krone = new T.BoxGeometry(4, 6, 4); krone.translate(0, 8, 0);
    this.baeume = new T.InstancedMesh(krone, this.mat.wald, N * N);
    this.baeume.instanceColor = new T.InstancedBufferAttribute(new Float32Array(N * N * 3).fill(1), 3);
    this.baeume.count = 0; this.baeume.castShadow = true; this.baeume.receiveShadow = true; this.baeume.frustumCulled = false; s.add(this.baeume);
    // Basis: Stahlklotz mit goldenem Stern
    const bg = new T.BoxGeometry(16, 7, 16); bg.translate(0, 3.5, 0);
    const seite = new T.MeshPhongMaterial({ map: this.textur(TEX[STAHL]), shininess: 50, color: '#c8ccd4' });
    this.basisOben = new T.MeshPhongMaterial({ map: this.tex.basis, shininess: 30 });
    this.basis = new T.Mesh(bg, [seite, seite, this.basisOben, seite, seite, seite]);
    this.basis.position.set(BX + 8, 0, BY + 8); this.basis.castShadow = this.basis.receiveShadow = true; s.add(this.basis);
    this.basisGlut = new T.Sprite(this.glut.gelb); this.basisGlut.scale.set(34, 34, 1); this.basisGlut.position.set(BX + 8, 9, BY + 8); s.add(this.basisGlut);
    // Extra (Bonus): schwebendes Bild mit Rahmen
    this.bonusMats = {};
    for (const art of BONUS_ARTEN) {
      const c = leinwand(72, 72), t = c.getContext('2d');
      t.fillStyle = 'rgba(21,25,35,0.92)'; t.fillRect(2, 2, 68, 68); t.strokeStyle = '#FF7A24'; t.lineWidth = 4; t.strokeRect(4, 4, 64, 64);
      t.imageSmoothingEnabled = false; t.drawImage(BONUS_HD[art], 8, 8, 56, 56);
      this.bonusMats[art] = new T.SpriteMaterial({ map: this.textur(c), depthTest: false });
    }
    this.bonus = new T.Sprite(this.bonusMats.helm); this.bonus.scale.set(16, 16, 1); this.bonus.renderOrder = 5; this.bonus.visible = false; s.add(this.bonus);
    this.bonusGlut = new T.Sprite(this.glut.gelb); this.bonusGlut.scale.set(36, 36, 1); this.bonusGlut.visible = false; s.add(this.bonusGlut);
  },

  // Neue Karte: Boden-Bild malen, Mauern und Bäume setzen
  karteNeu(k) {
    const g = this.bodenCv.getContext('2d'), Z = 16;
    const zelle = (x, y) => (x < 0 || y < 0 || x >= N || y >= N) ? LEER : k[y * N + x];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const t = k[y * N + x], q = t === WASSER ? TEX[WASSER] : t === EIS ? TEX[EIS] : BODEN[Math.floor(hash(x >> 1, y >> 1, 70) * 4)];
      g.drawImage(q, (x & 1) * 16, (y & 1) * 16, 16, 16, x * Z, y * Z, Z, Z);
      if (t === WASSER) {
        if (zelle(x, y - 1) !== WASSER) { g.fillStyle = 'rgba(0,10,40,0.5)'; g.fillRect(x * Z, y * Z, Z, 5); }
        for (const [nx, ny, rx, ry, rw, rh] of [[-1, 0, 0, 0, 2, 16], [1, 0, 14, 0, 2, 16], [0, 1, 0, 14, 16, 2], [0, -1, 0, 0, 16, 2]])
          if (zelle(x + nx, y + ny) !== WASSER) for (let i = 0; i < 8; i++) if (hash(x * 8 + i, y, 71 + nx * 3 + ny) < 0.55) { g.fillStyle = 'rgba(220,240,255,0.75)'; g.fillRect(x * Z + rx + (rw > 2 ? i * 2 : 0), y * Z + ry + (rh > 2 ? i * 2 : 0), 2, 2); }
      }
    }
    this.bodenTex.needsUpdate = true;
    const w = this.wasserCv.getContext('2d'); w.fillStyle = '#000'; w.fillRect(0, 0, 208, 208); w.fillStyle = '#fff';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (k[y * N + x] === WASSER) w.fillRect(x * 4, y * 4, 4, 4);
    this.wasserMaskTex.needsUpdate = true;
    this.spurG.clearRect(0, 0, 416, 416); this.spurTex.needsUpdate = true;
    const m = new this.T.Matrix4(); let n = 0;
    const c = new this.T.Color();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (k[y * N + x] === WALD) {
      const h = hash(x >> 1, y >> 1, 90), s = 0.85 + 0.3 * h;
      m.makeScale(1, s, 1); m.setPosition(x * 4 + 2, 0, y * 4 + 2); this.baeume.setMatrixAt(n, m);
      const f = 0.8 + 0.35 * hash(x, y, 91); c.setRGB(f * (0.9 + 0.2 * h), f, f * 0.85); this.baeume.setColorAt(n++, c);
    }
    this.baeume.count = n; this.baeume.instanceMatrix.needsUpdate = true; this.baeume.instanceColor.needsUpdate = true;
    this.mauernSetzen(k);
  },
  mauernSetzen(k) {
    const m = new this.T.Matrix4(), c = new this.T.Color();
    for (const e of this.mauern) e.n = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const t = k[y * N + x]; if (t !== ZIEGEL && t !== STAHL) continue;
      const e = this.mauern[(t === STAHL ? 4 : 0) + (x & 1) + (y & 1) * 2];
      m.makeTranslation(x * 4 + 2, 0, y * 4 + 2); e.m.setMatrixAt(e.n, m);
      const f = 0.86 + 0.24 * hash(x, y, t === STAHL ? 93 : 92); c.setRGB(f, f, f); e.m.setColorAt(e.n++, c);
    }
    for (const e of this.mauern) { e.m.count = e.n; e.m.instanceMatrix.needsUpdate = true; e.m.instanceColor.needsUpdate = true; }
  },

  /* ---------- Panzer aus Voxeln bauen ---------- */
  // Kasten in eine Liste: Ecken (x0,y0,z0)-(x1,y1,z1), Farbe [r,g,b] 0..255
  geometrie(kaesten) {
    const T = this.T, pos = [], nor = [], col = [];
    const F = [ // Flächen: Normale + 4 Ecken (Index in [x0|x1, y0|y1, z0|z1])
      [[1, 0, 0], [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]]], [[-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]]],
      [[0, 1, 0], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]]], [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]],
      [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]], [[0, 0, -1], [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]]]];
    for (const [x0, y0, z0, x1, y1, z1, c] of kaesten) {
      const P = [[x0, x1], [y0, y1], [z0, z1]], cc = [c[0] / 255, c[1] / 255, c[2] / 255].map(v => Math.pow(v, 2.2));
      for (const [n, ecken] of F) {
        const e = ecken.map(([a, b, d]) => [P[0][a], P[1][b], P[2][d]]);
        for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...e[i]); nor.push(...n); col.push(...cc); }
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    return g;
  },
  panzerCache: {},
  panzerGeo(form, farbe, anim) {
    const k = form + farbe + anim;
    if (this.panzerCache[k]) return this.panzerCache[k];
    const d = FORMEN[form], basis = HD_FARBEN[farbe], akz = AKZENT[farbe], unten = [], oben = [];
    const var_ = (c, x, y, s, st = 0.12) => rausch(c, Math.floor(x * 2) + 50, Math.floor(y * 2) + 50, s, st);
    const X = v => v - 8, Z = v => v - 8;                      // Spiel-Raster (0..16) → Mitte des Panzers
    // Ketten mit Gliedern, die sich bewegen
    const [kx, kb, ky0, ky1] = d.k;
    for (const sx of [kx, 16 - kx - kb]) {
      unten.push([X(sx) + 0.15, 0.4, Z(ky0) + 0.3, X(sx + kb) - 0.15, 2.4, Z(ky1) - 0.3, [42, 40, 38]]);
      for (let z = ky0; z < ky1; z += 1) {
        const a = z + anim * 0.5;
        if (a + 0.5 > ky1) continue;
        unten.push([X(sx), 0, Z(a), X(sx + kb), 2.9, Z(a) + 0.55, var_([70, 68, 64], sx, a, 61, 0.2)]);
      }
      for (let z = ky0 + 1.5; z < ky1 - 1; z += 3.2) {                                    // Laufräder außen
        const aussen = sx === kx ? X(sx) - 0.3 : X(sx + kb);
        unten.push([aussen, 0.6, Z(z), aussen + 0.3, 2.2, Z(z) + 1.6, [120, 118, 110]]);
      }
    }
    // Rumpf, oben in kleine Voxel geteilt (wie im Icon)
    const [rx, ry, rb, rh] = d.r;
    unten.push([X(rx), 2.2, Z(ry), X(rx + rb), 4.4, Z(ry + rh), mische(basis, [0, 0, 0], 0.25)]);
    for (let z = ry; z < ry + rh; z += 1) for (let x = rx; x < rx + rb; x += 1) {
      let c = var_(basis, x, z, 62, 0.16);
      if (akz && (z === ry + 1 || z === ry + rh - 3)) c = var_(akz, x, z, 63, 0.1);       // Farbstreifen
      if (z >= ry + rh - 2 && x > rx && x < rx + rb - 1 && (x & 1)) c = mische(c, [0, 0, 0], 0.45);   // Lüftung hinten
      const h = 4.4 + (hash(x, z, 64) < 0.15 ? 0.25 : 0);
      unten.push([X(x), 4.3, Z(z), X(x + 1), h + 0.35, Z(z + 1), c]);
    }
    if (d.p) for (const sx of [rx - 0.6, rx + rb]) unten.push([X(sx), 2.4, Z(ry + 2), X(sx + 0.6), 4.2, Z(ry + rh - 2), mische(basis, [80, 80, 80], 0.5)]);
    if (d.n) unten.push([X(rx + 1), 2.4, Z(ry - 1), X(rx + rb - 1), 4.0, Z(ry), basis]);
    // Turm + Rohr (eigenes Teil, damit es beim Schießen zurückzuckt)
    const turm = mische(basis, [255, 255, 255], 0.07), rohr = mische(basis, [130, 130, 130], 0.45);
    const [lx, ly, lb, lh] = d.l, tx = d.t[0] + 0.5, tz = d.t[1] + 0.5, tr = d.t[2];
    const dicke = Math.max(1.2, lb * 0.65), rx0 = 8 - dicke / 2;
    oben.push([X(rx0), 5.5, Z(ly), X(rx0 + dicke), 6.9, Z(tz), rohr]);
    oben.push([X(rx0) - 0.35, 5.3, Z(ly) - 0.2, X(rx0 + dicke) + 0.35, 7.1, Z(ly) + 1.4, mische(rohr, [0, 0, 0], 0.3)]);   // Mündung
    if (d.q) {
      for (let z = tz - 3; z < tz + 3; z += 1) for (let x = 5; x < 11; x += 1) oben.push([X(x), 4.6, Z(z), X(x + 1), 7.4 + (hash(x, z, 65) < 0.2 ? 0.2 : 0), Z(z + 1), var_(turm, x, z, 66)]);
    } else {
      for (let z = Math.floor(tz - tr); z < tz + tr; z += 0.5) for (let x = Math.floor(tx - tr); x < tx + tr; x += 0.5) {
        const a = Math.hypot(x + 0.25 - tx, z + 0.25 - tz) / tr; if (a > 1) continue;
        oben.push([X(x), 4.6, Z(z), X(x + 0.5), 7.6 - 0.9 * a * a, Z(z + 0.5), var_(turm, x, z, 67, 0.1)]);
      }
    }
    oben.push([X(tx + tr * 0.25), 7.4, Z(tz + tr * 0.1), X(tx + tr * 0.25 + 1.2), 7.9, Z(tz + tr * 0.1 + 1.2), akz || mische(turm, [0, 0, 0], 0.35)]);   // Luke
    return this.panzerCache[k] = { unten: this.geometrie(unten), oben: this.geometrie(oben) };
  },

  /* ---------- Teilchen: Feuer, Rauch, Trümmer, Funken (alles kleine Würfel) ---------- */
  teilchenAufbauen() {
    const T = this.T, g = new T.BoxGeometry(1, 1, 1);
    const art = (mat, n, schatten) => { const m = new T.InstancedMesh(g, mat, n); m.count = 0; m.frustumCulled = false; m.castShadow = schatten; m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(n * 3), 3); this.szene.add(m); return { m, n, liste: [] }; };
    this.tl = {
      feuer: art(new T.MeshBasicMaterial({ blending: T.AdditiveBlending, transparent: true, depthWrite: false }), 500, false),
      rauch: art(new T.MeshLambertMaterial({ transparent: true, opacity: 0.6, depthWrite: false }), 300, false),
      brocken: art(new T.MeshLambertMaterial(), 400, true),
    };
    this.tlm = new T.Matrix4(); this.tlq = new T.Quaternion(); this.tlv = new T.Vector3(); this.tls = new T.Vector3(); this.tlc = new T.Color(); this.tle = new T.Euler();
  },
  teil(art, o) {
    const a = this.tl[art]; if (a.liste.length >= a.n) return;
    a.liste.push(Object.assign({ vx: 0, vy: 0, vz: 0, g: 0, gr: 1, wachs: 0, reib: 0.96, l: 30, dreh: Math.random() * 6, dw: (Math.random() - 0.5) * 0.3, farbe: [255, 255, 255] }, o, { ml: o.l || 30 }));
  },
  teilchenBewegen(dt) {
    for (const [name, a] of Object.entries(this.tl)) {
      let n = 0;
      a.liste = a.liste.filter(t => (t.l -= dt) > 0);
      for (const t of a.liste) {
        t.x += t.vx * dt; t.y += t.vy * dt; t.z += t.vz * dt; t.vy -= t.g * dt;
        if (t.y < t.gr / 2 && t.g) { t.y = t.gr / 2; t.vy = Math.abs(t.vy) * 0.35; t.vx *= 0.7; t.vz *= 0.7; t.dw *= 0.6; }   // abprallen
        const r = Math.pow(t.reib, dt); t.vx *= r; t.vz *= r; if (!t.g) t.vy *= r;
        t.gr += t.wachs * dt; t.dreh += t.dw * dt;
        const f = t.l / t.ml, s = name === 'brocken' ? t.gr * Math.min(1, f * 3) : t.gr * (name === 'feuer' ? 0.4 + f * 0.6 : 1);
        this.tle.set(t.dreh, t.dreh * 0.7, 0); this.tlq.setFromEuler(this.tle);
        this.tlm.compose(this.tlv.set(t.x, t.y, t.z), this.tlq, this.tls.set(s, s, s));
        a.m.setMatrixAt(n, this.tlm);
        const hell = name === 'feuer' ? Math.min(1, f * 1.3) : 1;
        this.tlc.setRGB(Math.pow(t.farbe[0] / 255 * hell, 2.2), Math.pow(t.farbe[1] / 255 * hell, 2.2), Math.pow(t.farbe[2] / 255 * hell, 2.2));
        a.m.setColorAt(n, this.tlc); n++;
      }
      a.m.count = n; a.m.instanceMatrix.needsUpdate = true; if (a.m.instanceColor) a.m.instanceColor.needsUpdate = true;
    }
  },
  lampe(x, z, staerke, farbe, leben) {
    const l = this.lampen.reduce((a, b) => (a.leben / a.max < b.leben / b.max ? a : b));
    l.l.color.set(farbe); l.l.position.set(x, 12, z); Object.assign(l, { leben, max: leben, staerke });
  },
  explosion(x, z) {
    for (let i = 0; i < 40; i++) { const w = Math.random() * 6.28, v = Math.random() * 0.9 + 0.2; this.teil('feuer', { x, y: 3 + Math.random() * 4, z, vx: Math.cos(w) * v, vz: Math.sin(w) * v, vy: Math.random() * 0.8, gr: 1.5 + Math.random() * 2.5, farbe: [255, 120 + Math.random() * 110, 30], l: 18 + Math.random() * 18, reib: 0.9 }); }
    for (let i = 0; i < 18; i++) { const w = Math.random() * 6.28, v = Math.random() * 0.3; this.teil('rauch', { x, y: 4, z, vx: Math.cos(w) * v, vz: Math.sin(w) * v, vy: 0.15 + Math.random() * 0.15, gr: 2 + Math.random() * 2, wachs: 0.06, farbe: [70, 68, 66], l: 50 + Math.random() * 40 }); }
    for (let i = 0; i < 16; i++) { const w = Math.random() * 6.28, v = 0.5 + Math.random() * 1.2; this.teil('brocken', { x, y: 4, z, vx: Math.cos(w) * v, vz: Math.sin(w) * v, vy: 1 + Math.random() * 1.5, g: 0.09, gr: 0.8 + Math.random() * 1.2, farbe: [50 + Math.random() * 30, 52, 48], l: 70 + Math.random() * 40, reib: 0.98 }); }
    this.lampe(x, z, 9000, '#ff8a30', 30);
    this.wackeln = Math.max(this.wackeln, 3);
    this.fleck(x, z, 18, 0.55);
  },
  einschlag(x, z, metall) {
    for (let i = 0; i < 9; i++) { const w = Math.random() * 6.28, v = 0.4 + Math.random() * 0.8; this.teil('feuer', { x, y: 4, z, vx: Math.cos(w) * v, vz: Math.sin(w) * v, vy: Math.random() * 0.6, gr: 0.6, farbe: metall ? [190, 230, 255] : [255, 210, 90], l: 8 + Math.random() * 8, reib: 0.88 }); }
    for (let i = 0; i < 3; i++) this.teil('rauch', { x, y: 3, z, vx: (Math.random() - 0.5) * 0.2, vz: (Math.random() - 0.5) * 0.2, vy: 0.1, gr: 1.4, wachs: 0.05, farbe: [120, 110, 100], l: 30 });
    this.lampe(x, z, 2500, metall ? '#9fd8ff' : '#ffb050', 8);
    this.wackeln = Math.max(this.wackeln, 0.6);
    if (!metall) this.fleck(x, z, 4, 0.3);
  },
  fleck(x, z, r, a) {
    const g = this.spurG; g.globalAlpha = a; g.drawImage(RUSS, x * 2 - r * 2, z * 2 - r * 2, r * 4, r * 4); g.globalAlpha = 1; this.spurTex.needsUpdate = true;
  },
  funkeln(x, y, z, farbe, n = 20) {
    for (let i = 0; i < n; i++) { const w = i / n * 6.28, v = 0.5 + Math.random() * 0.6; this.teil('feuer', { x, y, z, vx: Math.cos(w) * v, vz: Math.sin(w) * v, vy: (Math.random() - 0.3) * 0.8, gr: 0.8, farbe, l: 25 + Math.random() * 15, reib: 0.94 }); }
    this.lampe(x, z, 4000, '#ffe9a0', 18);
  },

  /* ---------- Was ist neu passiert? (wie in der Block-Grafik) ---------- */
  ereignisse(V, dt) {
    const spiel = modus === 'spiel' || !!(V.opt && V.opt.demo);
    if (this.karteId !== V.kartenId) {
      this.karteId = V.kartenId; this.kv = V.kv; this.karte.set(V.karte); this.karteNeu(V.karte);
      for (const a of Object.values(this.tl)) a.liste.length = 0;
      this.gesehen.clear(); this.kugelnAlt.clear(); this.lage.clear();
      this.schnee = V.karte.reduce((a, t) => a + (t === EIS), 0) >= 80;
    } else if (this.kv !== V.kv) {
      this.kv = V.kv; let n = 0;
      for (let i = 0; i < N * N; i++) {
        const a = this.karte[i], b = V.karte[i]; if (a === b) continue;
        if (spiel && (a === ZIEGEL || a === STAHL) && b === LEER && n++ < 60) {
          const x = (i % N) * 4 + 2, z = Math.floor(i / N) * 4 + 2, farbe = a === STAHL ? [180, 186, 196] : [150 + Math.random() * 30, 60, 40];
          for (let j = 0; j < 2; j++) { const w = Math.random() * 6.28, v = 0.2 + Math.random() * 0.6; this.teil('brocken', { x, y: 3 + Math.random() * 3, z, vx: Math.cos(w) * v, vz: Math.sin(w) * v, vy: 0.5 + Math.random(), g: 0.08, gr: 0.9 + Math.random() * 0.8, farbe, l: 60 + Math.random() * 40 }); }
          this.teil('rauch', { x, y: 3, z, vy: 0.08, gr: 2, wachs: 0.05, farbe: [140, 120, 100], l: 30 });
        }
        if (a === WALD || b === WALD || a === WASSER || b === WASSER) { this.karteNeu(V.karte); break; }
      }
      this.karte.set(V.karte); this.mauernSetzen(V.karte);
    }
    if (!spiel) return;
    for (const e of V.effekte) {
      const k = e.art + e.x + ',' + e.y + ',' + (V.t - e.t);
      if (this.gesehen.has(k)) continue;
      this.gesehen.set(k, V.t);
      if (e.t > 6 && e.art !== 'p') continue;
      if (e.art === 'g') this.explosion(e.x, e.y);
      if (e.art === 'k') { const c = Math.floor(e.x / 4), r = Math.floor(e.y / 4); this.einschlag(e.x, e.y, [-1, 0, 1].some(a => [-1, 0, 1].some(b => V.karte[(r + b) * N + c + a] === STAHL))); }
    }
    for (const [k, t] of this.gesehen) if (V.t - t > 200 || t > V.t) this.gesehen.delete(k);
    // Mündungsfeuer + Rückstoß
    const jetzt = new Set();
    for (const k of V.kugeln) {
      jetzt.add(k.id);
      if (this.kugelnAlt.has(k.id)) continue;
      this.lampe(k.x, k.y, 1800, '#ffd27a', 6);
      for (let i = 0; i < 6; i++) this.teil('feuer', { x: k.x, y: 6.2, z: k.y, vx: DX[k.r] * (0.4 + Math.random() * 0.6) + (Math.random() - 0.5) * 0.3, vz: DY[k.r] * (0.4 + Math.random() * 0.6) + (Math.random() - 0.5) * 0.3, vy: Math.random() * 0.2, gr: 0.9, farbe: [255, 220, 120], l: 6 + Math.random() * 5, reib: 0.85 });
      this.teil('rauch', { x: k.x - DX[k.r] * 2, y: 6, z: k.y - DY[k.r] * 2, vx: DX[k.r] * 0.1, vz: DY[k.r] * 0.1, vy: 0.06, gr: 1.4, wachs: 0.06, farbe: [150, 150, 150], l: 28 });
      let best = null, d = 400;
      for (const p of V.panzer) { const a = Math.abs(p.x + 8 + DX[p.r] * 8 - k.x) + Math.abs(p.y + 8 + DY[p.r] * 8 - k.y); if (a < d) { d = a; best = p; } }
      if (best && d < 10) this.rueck.set(best.id, 6);
    }
    this.kugelnAlt = jetzt;
    const b = V.bonus ? V.bonus.art + V.bonus.x + ',' + V.bonus.y : null;
    if (b !== this.bonusAlt) {
      if (b) this.funkeln(V.bonus.x + 8, 8, V.bonus.y + 8, [255, 240, 150], 14);
      else if (this.bonusLage) this.funkeln(this.bonusLage[0], 8, this.bonusLage[1], [255, 255, 200], 28);
      this.bonusAlt = b; this.bonusLage = V.bonus ? [V.bonus.x + 8, V.bonus.y + 8] : null;
    }
  },

  /* ---------- Ein Bild malen ---------- */
  malen(V) {
    const T = this.T, jetzt = performance.now(), dt = V.pause ? 0 : Math.min(3, (jetzt - this.letzte) / 16.67);
    this.letzte = jetzt; this.zeit += dt;
    const a = V.alpha == null ? 1 : V.alpha, blink = n => Math.floor(V.t / n) % 2 === 0;
    this.ereignisse(V, dt);
    this.stimmung(V);
    // Panzer
    const da = new Set();
    for (const p of V.panzer) {
      da.add(p.id);
      let o = this.panzer.get(p.id);
      if (!o) {
        o = { g: new T.Group(), unten: new T.Mesh(undefined, this.mat.panzer), oben: new T.Mesh(undefined, this.mat.panzer) };
        o.unten.castShadow = o.oben.castShadow = true; o.unten.receiveShadow = o.oben.receiveShadow = true;
        o.g.add(o.unten, o.oben); this.szene.add(o.g);
        o.strahl = new T.Sprite(this.glut.blau); o.strahl.scale.set(30, 30, 1); this.szene.add(o.strahl);
        o.schild = new T.Mesh(new T.IcosahedronGeometry(11, 1), new T.MeshBasicMaterial({ color: '#47D7E8', wireframe: true, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false }));
        this.szene.add(o.schild);
        o.eis = new T.Mesh(new T.BoxGeometry(17, 9, 17), new T.MeshLambertMaterial({ color: '#a8e0ff', transparent: true, opacity: 0.35, depthWrite: false }));
        this.szene.add(o.eis);
        this.panzer.set(p.id, o);
      }
      const [gx, gy] = lage(p, a), x = gx + 8, z = gy + 8;
      const spawn = p.spawn > 0;
      o.g.visible = !spawn;
      o.strahl.visible = spawn;
      if (spawn) {
        o.strahl.position.set(x, 6 + Math.sin(this.zeit * 0.3) * 1.5, z); o.strahl.material.opacity = 0.6 + 0.4 * Math.sin(this.zeit * 0.5);
        if (Math.random() < 0.5) this.teil('feuer', { x: x + (Math.random() - 0.5) * 14, y: 0.5, z: z + (Math.random() - 0.5) * 14, vy: 0.35 + Math.random() * 0.3, gr: 0.7, farbe: [150, 220, 255], l: 20, reib: 1 });
      }
      const farbe = panzerFarbe(V, p, blink), form = panzerForm(V, p), geo = this.panzerGeo(form, farbe, p.anim);
      o.unten.geometry = geo.unten; o.oben.geometry = geo.oben;
      // bewegt? → wippen, Staub, Spuren
      const alt = this.lage.get(p.id), bewegt = alt && (alt[0] !== p.x || alt[1] !== p.y);
      this.lage.set(p.id, [p.x, p.y]);
      if (bewegt) {
        o.bewegt = 8;
        const unten = V.karte[((p.y + 8) >> 2) * N + ((p.x + 8) >> 2)];
        if (unten !== EIS && unten !== WASSER && Math.random() < 0.18 * dt) this.teil('rauch', { x: x - DX[p.r] * 8 + (Math.random() - 0.5) * 6, y: 0.8, z: z - DY[p.r] * 8 + (Math.random() - 0.5) * 6, vx: -DX[p.r] * 0.08, vz: -DY[p.r] * 0.08, vy: 0.05, gr: 1.6, wachs: 0.05, farbe: [130, 112, 84], l: 30 });
        if (dt > 0) { const f = FORMEN[form].k, g2 = this.spurG; g2.fillStyle = 'rgba(12,9,5,0.10)';
          for (const s of [f[0], 16 - f[0] - f[1]]) { const q = s - 8 + f[1] / 2; if (p.r & 1) g2.fillRect(x * 2 - 2, (z + q) * 2 - f[1], 4, f[1] * 2); else g2.fillRect((x + q) * 2 - f[1], z * 2 - 2, f[1] * 2, 4); }
          this.spurNeu = true; }
      }
      o.bewegt = Math.max(0, (o.bewegt || 0) - dt);
      const wipp = o.bewegt > 0 && Math.floor(this.zeit / 3) % 2 ? 0.25 : 0;
      o.g.position.set(x, wipp, z);
      o.g.rotation.y = -p.r * Math.PI / 2;
      const rk = this.rueck.get(p.id) || 0; o.oben.position.z = rk * 0.25;
      if (rk) this.rueck.set(p.id, Math.max(0, rk - dt));
      o.schild.visible = !spawn && p.schild > 0;
      if (o.schild.visible) { o.schild.position.set(x, 4, z); o.schild.rotation.set(this.zeit * 0.02, this.zeit * 0.035, 0); o.schild.material.opacity = 0.35 + 0.25 * Math.sin(this.zeit * 0.3); }
      o.eis.visible = !spawn && p.sp >= 0 && p.starr > 0; if (o.eis.visible) o.eis.position.set(x, 4.5, z);
      if (p.sp < 0 && p.bonus && farbe === 'rot') this.lampe(x, z, 800, '#ff3020', 2);
      this.scheinwerferSetzen(p, x, z);
    }
    for (const [id, o] of this.panzer) if (!da.has(id)) { this.szene.remove(o.g, o.strahl, o.schild, o.eis); this.panzer.delete(id); }
    // Kugeln: leuchtende Würfel mit Glühen
    const kda = new Set();
    for (const k of V.kugeln) {
      kda.add(k.id);
      let o = this.kugeln.get(k.id);
      if (!o) { o = { m: new T.Mesh(new T.BoxGeometry(1.4, 1.4, 1.4), this.mat.leuchten), glut: new T.Sprite(this.glut.gelb) }; o.glut.scale.set(11, 11, 1); this.szene.add(o.m, o.glut); this.kugeln.set(k.id, o); }
      const [x, z] = lage(k, a);
      o.m.position.set(x, 6.2, z); o.glut.position.set(x, 6.2, z); o.m.rotation.y = this.zeit * 0.3;
      if (dt > 0 && Math.random() < 0.6) this.teil('feuer', { x: x - DX[k.r] * 1.5, y: 6.2, z: z - DY[k.r] * 1.5, gr: 0.6, farbe: [255, 170, 60], l: 6, reib: 1 });
    }
    for (const [id, o] of this.kugeln) if (!kda.has(id)) { this.szene.remove(o.m, o.glut); this.kugeln.delete(id); }
    // Feuerbälle der Explosionen (die Bilder aus der Block-Grafik als leuchtende Tafeln)
    const eda = new Set();
    for (const e of V.effekte) {
      if (e.art === 'p') continue;
      const k = e.art + e.x + ',' + e.y + ',' + (V.t - e.t); eda.add(k);
      let s = this.effekte.get(k);
      if (!s) { s = new T.Sprite(new T.SpriteMaterial({ blending: T.AdditiveBlending, depthWrite: false, transparent: true })); this.szene.add(s); this.effekte.set(k, s); }
      const gross = e.art === 'g', bilder = this.knallTex[e.art], f = Math.min(bilder.length - 1, gross ? Math.floor(e.t / 5) : e.t >> 2);
      if (s.material.map !== bilder[f]) { s.material.map = bilder[f]; s.material.needsUpdate = true; }
      const gr = gross ? 44 : 16; s.scale.set(gr, gr, 1); s.position.set(e.x, gross ? 9 : 6, e.y);
    }
    for (const [k, s] of this.effekte) if (!eda.has(k)) { this.szene.remove(s); s.material.dispose(); this.effekte.delete(k); }
    // Basis
    const kaputt = !!V.basisKaputt;
    if (this.basisWar !== kaputt) { this.basisWar = kaputt; this.basisOben.map = kaputt ? this.tex.basisKaputt : this.tex.basis; this.basisOben.needsUpdate = true; this.basis.scale.y = kaputt ? 0.55 : 1; }
    this.basisGlut.visible = !kaputt; this.basisGlut.material.opacity = 0.35 + 0.15 * Math.sin(this.zeit * 0.08);
    // Bonus
    this.bonus.visible = this.bonusGlut.visible = !!V.bonus;
    if (V.bonus) {
      const h = 10 + Math.sin(this.zeit * 0.12) * 1.5;
      this.bonus.material = this.bonusMats[V.bonus.art]; this.bonus.position.set(V.bonus.x + 8, h, V.bonus.y + 8);
      this.bonusGlut.position.set(V.bonus.x + 8, h, V.bonus.y + 8); this.bonusGlut.material.opacity = 0.5 + 0.3 * Math.sin(this.zeit * 0.2);
    }
    // Schnee, Feuerwerk
    if (this.schnee && dt > 0) for (let i = 0; i < 2; i++) this.teil('feuer', { x: Math.random() * 240 - 16, y: 70, z: Math.random() * 260 - 30, vx: 0.1, vy: -0.35 - Math.random() * 0.2, gr: 0.6 + Math.random() * 0.5, farbe: [200, 210, 225], l: 220, reib: 1 });
    if (V.phase === 'spiel' && V.gegnerIdx >= 20 && !V.panzer.some(p => p.sp < 0) && dt > 0 && Math.random() < 0.05 * dt) {
      const farben = [[255, 90, 90], [120, 220, 255], [255, 230, 90], [140, 255, 140], [255, 140, 255]];
      this.funkeln(20 + Math.random() * 170, 30 + Math.random() * 20, 20 + Math.random() * 120, farben[zufall(farben.length)], 34); Ton.spiel('knall');
    }
    // Wasser bewegt sich, Lampen verglühen, Teilchen fliegen
    this.tex.wellen.offset.set((this.zeit * 0.004) % 1, (this.zeit * 0.002) % 1);
    this.wellenMat.opacity = 0.45 + 0.12 * Math.sin(this.zeit * 0.05);
    for (const l of this.lampen) { l.leben = Math.max(0, l.leben - dt); l.l.intensity = l.staerke * Math.pow(l.leben / l.max, 1.5); }
    this.teilchenBewegen(dt);
    if (this.spurNeu && Math.floor(this.zeit) % 6 === 0) { this.spurTex.needsUpdate = true; this.spurNeu = false; }
    if (dt > 0 && Math.floor(this.zeit) % 120 === 0 && !this.verblasst) {                // Spuren verblassen langsam
      this.verblasst = true; const g2 = this.spurG; g2.globalCompositeOperation = 'destination-out'; g2.fillStyle = 'rgba(0,0,0,0.12)'; g2.fillRect(0, 0, 416, 416); g2.globalCompositeOperation = 'source-over'; this.spurTex.needsUpdate = true;
    } else if (Math.floor(this.zeit) % 120 !== 0) this.verblasst = false;
    // Kamera wackelt bei Explosionen
    this.wackeln = Math.max(0, this.wackeln - dt * 0.15);
    const w = this.wackeln;
    this.cam.position.set(this.camPos.x + (Math.random() - 0.5) * w, this.camPos.y, this.camPos.z + (Math.random() - 0.5) * w);
    this.sparModus();
    this.r.render(this.szene, this.cam);
  },
  // Tag, Nacht, eingefrorene Gegner
  stimmung(V) {
    const nacht = nachtLevel(V.level);
    if (nacht !== this.nacht) {
      this.nacht = nacht;
      this.himmel.intensity = nacht ? 0.32 : 1.1; this.sonne.intensity = nacht ? 0.35 : 2.6;
      this.sonne.color.set(nacht ? '#7f9cff' : '#fff1d6'); this.szene.background.set(nacht ? '#05070d' : '#151923');
      for (const s of this.scheinwerfer) { this.szene.remove(s, s.target); }
      this.scheinwerfer = [];
      if (nacht) for (let i = 0; i < 6; i++) {
        const s = new this.T.SpotLight('#fff2cc', 0, 140, 0.5, 0.6, 1.2); s.position.set(0, 7, 0); this.szene.add(s, s.target); this.scheinwerfer.push(s);
      }
      this.scheinwerferFrei = 0;
    }
    this.scheinwerferFrei = 0;
    for (const s of this.scheinwerfer) s.intensity = 0;
    const uhr = V.uhr > 0;
    this.himmel.color.set(uhr ? '#9cc8ff' : '#d4e6ff');
  },
  scheinwerferSetzen(p, x, z) {
    if (!this.nacht || p.spawn > 0) return;
    const s = this.scheinwerfer[this.scheinwerferFrei++]; if (!s) return;
    s.intensity = p.sp >= 0 ? 9000 : 5000;
    s.position.set(x + DX[p.r] * 7, 6, z + DY[p.r] * 7); s.target.position.set(x + DX[p.r] * 60, 0, z + DY[p.r] * 60);
  },
  // Ruckelt es? Dann ohne Schatten und mit weniger Bildpunkten
  sparModus() {
    if (HD.sparen && !this.gespart) {
      this.gespart = true; this.r.setPixelRatio(1); this.r.shadowMap.enabled = false;
      this.szene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); });
      this.groesse(this.w, this.h, this.x, this.y, true);
    }
  },
  // Lage und Größe des 3D-Bildes = genau das Spielfeld im 2D-Bild
  groesse(w, h, x, y, immer) {
    if (!immer && w === this.w && h === this.h && x === this.x && y === this.y) return;
    Object.assign(this, { w, h, x, y });
    this.r.setSize(Math.round(w), Math.round(h), false);
    Object.assign(this.cv.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  },
  zeigen(an) { if (this.cv) this.cv.style.display = an ? 'block' : 'none'; },
  // 3D-Punkt → Punkt im 2D-Bild (für Punkte-Zahlen)
  aufBild(x, y, z, ox, oy) {
    const v = new this.T.Vector3(x, y, z).project(this.cam);
    return [ox + (v.x + 1) / 2 * FR, oy + D3_OBEN * GR + (1 - v.y) / 2 * D3_HOEHE * GR];
  },
  texte(c, V, ox, oy) {
    for (const e of V.effekte) if (e.art === 'p' && e.t > 20) {
      const [x, y] = this.aufBild(e.x, 10 + (e.t - 20) * 0.08, e.y, ox, oy);
      schrift(c, e.w, x, y, 3, '#fff', true);
    }
  },
};
