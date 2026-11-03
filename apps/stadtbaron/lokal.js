/* =====================================================================
   OHNE INTERNET – zwei (oder drei) Geräte im selben WLAN oder Hotspot.
   Statt GitHub reden die Geräte direkt miteinander (WebRTC).
   Den „Handschlag“ (wie erreicht man mich?) zeigt ein Gerät als QR-Code,
   das andere scannt ihn und zeigt seine Antwort als QR-Code zurück.
   Der Gastgeber hat den Spielstand – wie sonst die Datei auf GitHub.
   Die anderen Geräte schicken ihm Änderungen, er sagt „ok“ oder „nein,
   der Stand ist inzwischen anders“ (dann nochmal probieren).
   Der Stand wird auf jedem Gerät gespeichert: Nach einem Neustart der App
   geht das Spiel weiter, sobald die Geräte wieder verbunden sind.
   Diese Datei ist in Würmer und Морской бой gleich (lokal.js).
   Braucht aus der App: QR.malen(canvas, text) und jsQR.js.
   ===================================================================== */
const Lokal = (() => {
  const L = {
    an: false, rolle: null, stand: null, geraet: '', peers: {}, opt: {},
    offen: null,               // noch nicht fertige Verbindung (Handschlag läuft)
    wartend: {}, nr: 0,
  };
  const lies = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const schreib = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const zufall = n => Math.floor(Math.random() * n);

  // Start: Einstellungen der App übernehmen, gespeicherten Stand laden
  L.einrichten = function (opt) {
    this.opt = opt; this.geraet = opt.geraet; this.schluessel = opt.praefix + '-lokal';
    const m = lies(this.schluessel);
    if (m && m.rolle) Object.assign(this, { rolle: m.rolle, stand: m.stand || null });   // „an“ macht erst die App (Menü „Ohne Internet“)
  };
  L.merken = function () { if (this.rolle) schreib(this.schluessel, { rolle: this.rolle, stand: this.stand }); };
  L.verbunden = function () { return Object.values(this.peers).some(p => p.k.readyState === 'open'); };
  L.anzahl = function () { return Object.values(this.peers).filter(p => p.k.readyState === 'open').length; };
  L.beenden = function () {
    for (const p of Object.values(this.peers)) try { p.pc.close(); } catch {}
    if (this.offen) try { this.offen.pc.close(); } catch {}
    this.peers = {}; this.offen = null; this.an = false; this.rolle = null; this.stand = null;
    try { localStorage.removeItem(this.schluessel); } catch {}
  };

  /* ---------- Spielstand lesen und schreiben (wie bei GitHub) ---------- */
  L.lesen = function () { return this.stand; };
  const rev = s => (s && s._lr) || 0;
  L.schreiben = async function (neu) {
    if (this.rolle === 'wirt') { this.setzen(neu, rev(this.stand) + 1); return true; }
    if (!this.verbunden()) throw new Error('Keine Verbindung zum anderen Gerät – ⚡ antippen');
    const r = ++this.nr;
    const antwort = await new Promise(ok => {
      this.wartend[r] = ok;
      setTimeout(() => { if (this.wartend[r]) { delete this.wartend[r]; ok(null); } }, 6000);
      this.anWirt({ t: 'cas', r, b: rev(this.stand), s: neu });
    });
    if (!antwort) throw new Error('Das andere Gerät antwortet nicht');
    this.annehmen(antwort.s);
    return antwort.ok;
  };
  // Gastgeber: neuen Stand übernehmen und an alle schicken
  L.setzen = function (neu, r) {
    if (neu) neu._lr = r;
    this.stand = neu; this.merken();
    for (const p of Object.values(this.peers)) this.schicken(p, { t: 'stand', s: neu });
    this.opt.wennStand && this.opt.wennStand(neu);
  };
  // Mitspieler: Stand vom Gastgeber übernehmen
  L.annehmen = function (s) {
    if (JSON.stringify(s) === JSON.stringify(this.stand)) return;
    this.stand = s; this.merken();
    this.opt.wennStand && this.opt.wennStand(s);
  };

  /* ---------- Nachrichten ---------- */
  // Große Stände in Stücke teilen (manche Geräte schaffen nur 64 KB pro Nachricht)
  L.schicken = function (p, m) {
    if (!p || p.k.readyState !== 'open') return;
    const d = JSON.stringify(m);
    try {
      if (d.length < 60000) return p.k.send(d);
      const n = Math.ceil(d.length / 60000);
      for (let i = 0; i < n; i++) p.k.send(JSON.stringify({ t: 'teil', i, n, d: d.slice(i * 60000, (i + 1) * 60000) }));
    } catch {}
  };
  L.anWirt = function (m) { this.schicken(Object.values(this.peers).find(p => p.k.readyState === 'open'), m); };
  L.empfang = function (p, m) {
    p.letzte = performance.now();
    if (m.t === 'teil') {
      p.teile = m.i === 0 ? [] : (p.teile || []);
      p.teile.push(m.d);
      if (p.teile.length === m.n) { const ganz = p.teile.join(''); p.teile = null; this.empfang(p, JSON.parse(ganz)); }
      return;
    }
    if (m.t === 'p') return;
    if (m.t === 'hallo') {
      if (m.g === this.geraet) return;
      // Altes Kabel zum selben Gerät weg, neues merken
      const alt = this.peers[m.g];
      if (alt && alt !== p) try { alt.pc.close(); } catch {}
      for (const [g, q] of Object.entries(this.peers)) if (q === p && g !== m.g) delete this.peers[g];
      this.peers[m.g] = p; p.g = m.g;
      if (this.rolle === 'wirt') {
        // Hat der Mitspieler einen neueren Stand (z. B. Gastgeber-App frisch)? Dann den nehmen.
        if (m.rev > rev(this.stand)) this.schicken(p, { t: 'gib' });
        else this.schicken(p, { t: 'stand', s: this.stand });
      }
      this.opt.wennVerbunden && this.opt.wennVerbunden(m.g, p.s);
      return;
    }
    if (this.rolle === 'wirt') {
      if (m.t === 'cas') {
        const ok = m.b === rev(this.stand);
        if (ok) this.setzen(m.s, rev(this.stand) + 1);
        this.schicken(p, { t: 'antwort', r: m.r, ok, s: this.stand });
      }
      if (m.t === 'uebernimm' && rev(m.s) > rev(this.stand)) this.setzen(m.s, rev(m.s));
    } else {
      if (m.t === 'stand') this.annehmen(m.s);
      if (m.t === 'gib') this.schicken(p, { t: 'uebernimm', s: this.stand });
      if (m.t === 'antwort' && this.wartend[m.r]) { const ok = this.wartend[m.r]; delete this.wartend[m.r]; ok(m); }
    }
  };

  /* ---------- Verbindung (WebRTC ohne fremde Server) ---------- */
  // Aus der langen WebRTC-Beschreibung (SDP) nur das Nötigste → kleiner QR-Code
  const sdpZuCode = (sdp, typ, nr) => {
    const hol = re => (sdp.match(re) || [])[1] || '';
    const fp = hol(/a=fingerprint:sha-256 (\S+)/i).split(':').map(h => parseInt(h, 16));
    const fpText = btoa(String.fromCharCode(...fp)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const kand = [];
    for (const m of sdp.matchAll(/a=candidate:\S+ \d+ udp \d+ (\S+) (\d+) typ host/gi)) { const k = m[1] + '/' + m[2]; if (!kand.includes(k)) kand.push(k); }
    return ['LK1', typ + nr, hol(/a=setup:(\S+)/).slice(0, 4), hol(/a=ice-ufrag:(\S+)/), hol(/a=ice-pwd:(\S+)/), fpText, kand.slice(0, 8).join(',')].join('~');
  };
  const codeLesen = code => {
    const t = String(code || '').trim().replace(/^.*?(LK1~)/, '$1').split('~');
    if (t.length < 7 || t[0] !== 'LK1' || !/^[AB]\d+$/.test(t[1])) return null;
    return { typ: t[1][0], nr: t[1].slice(1), setup: t[2], ufrag: t[3], pwd: t[4], fp: t[5], kand: t[6] ? t[6].split(',') : [] };
  };
  const codeZuSdp = a => {
    const roh = atob(a.fp.replace(/-/g, '+').replace(/_/g, '/'));
    const fp = [...roh].map(c => c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join(':');
    const setup = { actp: 'actpass', acti: 'active', pass: 'passive' }[a.setup] || (a.typ === 'A' ? 'actpass' : 'active');
    const z = ['v=0', 'o=- ' + (Date.now() % 1e9) + ' 2 IN IP4 127.0.0.1', 's=-', 't=0 0', 'a=group:BUNDLE 0', 'a=msid-semantic: WMS',
      'm=application 9 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 0.0.0.0'];
    a.kand.forEach((k, i) => { const j = k.lastIndexOf('/'); z.push(`a=candidate:${i + 1} 1 udp ${2122260223 - i * 256} ${k.slice(0, j)} ${k.slice(j + 1)} typ host generation 0`); });
    z.push('a=ice-ufrag:' + a.ufrag, 'a=ice-pwd:' + a.pwd, 'a=ice-options:trickle', 'a=fingerprint:sha-256 ' + fp, 'a=setup:' + setup, 'a=mid:0',
           'a=sctp-port:5000', 'a=max-message-size:262144');
    return z.join('\r\n') + '\r\n';
  };
  L.codeLesen = codeLesen;
  const iceFertig = pc => new Promise(ok => {
    if (pc.iceGatheringState === 'complete') return ok();
    const t = setTimeout(ok, 2500);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); ok(); } });
  });
  // Safari verrät die eigene WLAN-Adresse erst, wenn die Kamera einmal erlaubt ist
  const kameraKurz = async () => { try { const s = await navigator.mediaDevices.getUserMedia({ video: true }); s.getTracks().forEach(t => t.stop()); } catch {} };

  // Ein „Kabel“: Daten-Kanal (Spielstand) + Spiel-Kanal (für das Live-Zuschauen der App)
  L.kanaeleSetzen = function (p) {
    const k = p.k;
    k.onopen = () => { p.letzte = performance.now(); this.schicken(p, { t: 'hallo', g: this.geraet, rev: rev(this.stand) }); this.offen = this.offen === p ? null : this.offen; this.anzeigeNeu(); };
    k.onclose = () => { for (const [g, q] of Object.entries(this.peers)) if (q === p) { delete this.peers[g]; this.opt.wennGetrennt && this.opt.wennGetrennt(g); } this.anzeigeNeu(); };
    k.onmessage = e => { try { this.empfang(p, JSON.parse(e.data)); } catch {} };
  };
  L.neuesKabel = function () {
    if (!window.RTCPeerConnection) throw new Error('Dieses Gerät kann keine Direktverbindung (WebRTC).');
    if (this.offen) try { this.offen.pc.close(); } catch {}
    const pc = new RTCPeerConnection({ iceServers: [] });
    const p = this.offen = { pc, letzte: performance.now() };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') try { pc.close(); p.k && p.k.onclose && p.k.onclose(); } catch {} };
    return p;
  };
  // Gastgeber: Angebot machen → Code für den QR
  L.anbieten = async function () {
    await kameraKurz();
    const p = this.neuesKabel();
    p.nr = String(1000 + zufall(9000));
    p.k = p.pc.createDataChannel('daten', { ordered: true }); this.kanaeleSetzen(p);
    p.s = p.pc.createDataChannel('spiel', { ordered: true });
    await p.pc.setLocalDescription(await p.pc.createOffer());
    await iceFertig(p.pc);
    return sdpZuCode(p.pc.localDescription.sdp, 'A', p.nr);
  };
  // Mitspieler: Angebot lesen → Antwort-Code für den QR
  L.beantworten = async function (code) {
    const a = codeLesen(code);
    if (!a || a.typ !== 'A') throw new Error('Das ist kein Gastgeber-Code.');
    await kameraKurz();
    const p = this.neuesKabel(); p.nr = a.nr;
    p.pc.ondatachannel = e => { if (e.channel.label === 'spiel') p.s = e.channel; else { p.k = e.channel; this.kanaeleSetzen(p); } };
    await p.pc.setRemoteDescription({ type: 'offer', sdp: codeZuSdp(a) });
    await p.pc.setLocalDescription(await p.pc.createAnswer());
    await iceFertig(p.pc);
    return sdpZuCode(p.pc.localDescription.sdp, 'B', p.nr);
  };
  // Gastgeber: Antwort einsetzen → gleich verbunden
  L.antwortNehmen = async function (code) {
    const a = codeLesen(code), p = this.offen;
    if (!a || a.typ !== 'B') throw new Error('Das ist kein Antwort-Code.');
    if (!p || p.pc.signalingState !== 'have-local-offer') throw new Error('Bitte erst neu anfangen.');
    if (a.nr !== p.nr) throw new Error('Diese Antwort gehört zu einem alten QR-Code.');
    await p.pc.setRemoteDescription({ type: 'answer', sdp: codeZuSdp(a) });
  };

  // Lebenszeichen: alle 2 s ein „p“. Nichts gehört seit 8 s? Dann ist die Verbindung weg.
  setInterval(() => {
    const jetzt = performance.now();
    for (const p of new Set(Object.values(L.peers))) {
      if (p.k.readyState !== 'open') continue;
      L.schicken(p, { t: 'p' });
      if (jetzt - p.letzte > 8000) try { p.pc.close(); p.k.onclose(); } catch {}
    }
  }, 2000);
  // Nach dem Aufwachen (Bildschirm war aus) kurz Zeit lassen, bevor „weg“ gilt
  document.addEventListener('visibilitychange', () => { if (!document.hidden) for (const p of Object.values(L.peers)) p.letzte = performance.now(); });

  /* ---------- Fenster zum Verbinden (eigenes, über allem) ---------- */
  const css = `
  #lk{position:fixed;inset:0;z-index:9999;display:none;background:#0b1220e6;padding:max(14px,env(safe-area-inset-top)) 14px 14px;overflow:auto;
      font:16px/1.35 -apple-system,system-ui,sans-serif;color:#f2f4f7;-webkit-user-select:none;user-select:none}
  #lk.on{display:flex}
  #lk .box{margin:auto;background:#1d2433;border:1px solid #2e3a50;border-radius:22px;padding:18px 18px 16px;max-width:430px;width:100%;text-align:center;box-shadow:0 10px 40px #000a}
  #lk h2{margin:0 0 8px;font-size:22px}
  #lk p{margin:8px 0;white-space:pre-line;color:#cfd6df}
  #lk small{color:#a9b3bf}
  #lk button small{color:#d8f5dc;font-weight:500}
  #lk button{display:block;width:100%;margin:8px 0 0;padding:13px 14px;border:0;border-radius:14px;background:#2f8a3a;color:#fff;font:700 17px -apple-system,system-ui,sans-serif;cursor:pointer}
  #lk button.zweit{background:#2e3a50}
  #lk canvas{width:min(78vw,300px);height:auto;background:#fff;border-radius:12px;padding:8px;image-rendering:pixelated;margin:6px auto;display:block}
  #lk video{width:100%;max-height:52vh;border-radius:12px;background:#000;object-fit:cover}
  #lk textarea{width:100%;height:64px;border-radius:10px;border:1px solid #2e3a50;background:#0f1522;color:#fff;font:13px monospace;padding:8px;-webkit-user-select:text;user-select:text}
  #lk .fehler{color:#ff8a7a}
  #lk .ok{color:#7ee08a;font-weight:700}
  /* Querformat mit wenig Höhe (iPhone quer): QR-Code links, Text und Knöpfe rechts */
  @media (orientation:landscape) and (max-height:560px){
    #lk .box{max-width:760px;display:grid;grid-template-columns:auto 1fr;column-gap:18px;align-items:start}
    #lk .box>*{grid-column:2}
    #lk .box>canvas,#lk .box>video{grid-column:1;grid-row:1/span 9;width:min(78vh,300px);max-height:none;align-self:center}
    #lk .box:not(:has(canvas,video)){display:block;max-width:430px}
  }
  #lk .schritt{display:inline-block;background:#47d7e8;color:#0b1220;border-radius:99px;padding:1px 9px;font-weight:800;font-size:13px;margin-right:6px}`;
  let el = null, video = null, strom = null, scanAn = false, zustand = '';
  const html = (h, knoepfe = []) => {
    if (!el) {
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      el = document.createElement('div'); el.id = 'lk'; document.body.appendChild(el);
    }
    scanStopp();
    el.innerHTML = '<div class="box">' + h + '<div class="kn"></div></div>';
    const box = el.querySelector('.kn');
    for (const [t, fn, art] of knoepfe) { const b = document.createElement('button'); b.innerHTML = t; if (art) b.className = art; b.onclick = fn; box.appendChild(b); }
    el.classList.add('on');
  };
  const zu = () => { scanStopp(); zustand = ''; clearTimeout(L.hinweisTimer); if (el) el.classList.remove('on'); };
  L.zu = zu;
  L.istOffen = () => !!(el && el.classList.contains('on'));
  const fehler = text => { const f = el && el.querySelector('#lk-meldung'); if (f) { f.textContent = text; f.className = 'fehler'; } };

  // Kamera: QR-Code lesen (jsQR wird erst hier geladen)
  const jsqrLaden = async () => {
    if (window.jsQR) return;
    await new Promise((ok, f) => { const s = document.createElement('script'); s.src = 'jsQR.js'; s.onload = ok; s.onerror = f; document.head.appendChild(s); });
  };
  function scanStopp() { scanAn = false; if (strom) strom.getTracks().forEach(t => t.stop()); strom = null; }
  async function scannen(pruefe, fertig) {
    video = el.querySelector('video');
    try {
      await jsqrLaden();
      strom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = strom; video.setAttribute('playsinline', ''); video.muted = true; await video.play();
    } catch { scanStopp(); return fehler('Kamera geht nicht – in den Einstellungen erlauben, oder den Code unten einfügen.'); }
    scanAn = true;
    const cv = document.createElement('canvas'), c = cv.getContext('2d', { willReadFrequently: true });
    const suchen = () => {
      if (!scanAn) return;
      if (video.readyState >= 2 && video.videoWidth) {
        const f = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
        cv.width = video.videoWidth * f; cv.height = video.videoHeight * f;
        c.drawImage(video, 0, 0, cv.width, cv.height);
        const code = jsQR(c.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height, { inversionAttempts: 'dontInvert' });
        if (code) { const f2 = pruefe(code.data); if (!f2) { scanStopp(); return fertig(code.data); } fehler(f2); }
      }
      setTimeout(() => requestAnimationFrame(suchen), 60);
    };
    requestAnimationFrame(suchen);
  }
  const einfuegen = (pruefe, fertig) => `<textarea id="lk-code" placeholder="LK1~…" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>`;
  const einfuegenKnopf = (pruefe, fertig) => ['📋 Eingefügten Code nehmen', () => {
    const t = el.querySelector('#lk-code').value, f = pruefe(t); if (f) return fehler(f); fertig(t);
  }, 'zweit'];
  const kopierKnopf = code => ['📋 Code kopieren (AirDrop/Nachricht)', async () => {
    try { if (navigator.share) await navigator.share({ text: code }); else await navigator.clipboard.writeText(code); } catch { try { await navigator.clipboard.writeText(code); } catch {} }
  }, 'zweit'];
  const WLAN = '<small>Beide Geräte im <b>selben WLAN</b> – oder ein Gerät macht einen <b>persönlichen Hotspot</b> und das andere verbindet sich damit. Internet braucht man nicht.</small>';

  // Hauptfenster: Wer zeigt, wer scannt?
  L.dialog = function (fertig) {
    this.fertig = fertig || this.fertig;
    const titel = this.opt.titel || 'Ohne Internet';
    const verb = this.anzahl();
    const kn = [];
    const zeigen = ['📱 Ich zeige den QR-Code<br><small>(Gastgeber' + (verb ? ' – noch ein Gerät' : '') + ')</small>', () => this.wirtStart()];
    const scan = ['📷 Ich scanne den QR-Code<br><small>(Mitspieler)</small>', () => this.gastStart()];
    // Wer beim letzten Mal Mitspieler war, sieht „scannen“ zuerst
    if (this.rolle === 'gast') kn.push(scan, zeigen); else if (verb) kn.push(zeigen); else kn.push(zeigen, scan);
    if (verb) kn.push(['✓ Weiter', () => { zu(); this.fertig && this.fertig(); }]);
    kn.push(['Abbrechen', () => { zu(); this.opt.wennAbbruch && this.opt.wennAbbruch(); }, 'zweit']);
    const status = verb ? `<p class="ok">✓ Verbunden mit ${verb} Gerät${verb > 1 ? 'en' : ''}</p>`
      : this.an && this.stand ? '<p>Das Spiel ist gespeichert. Einfach neu verbinden – es geht dort weiter, wo ihr wart.</p>' : '';
    html(`<h2>📶 ${titel}</h2>${status}<p>Ein Gerät zeigt einen QR-Code, das andere scannt ihn. Danach umgekehrt.</p>${WLAN}`, kn);
  };
  L.wirtStart = async function () {
    zustand = 'wirt';
    html('<h2>📱 Gastgeber</h2><p>Bereite den QR-Code vor …</p>');
    let code;
    try { code = await this.anbieten(); } catch (e) { return html(`<h2>📱 Gastgeber</h2><p class="fehler">${e.message}</p>`, [['← Zurück', () => this.dialog()]]); }
    if (zustand !== 'wirt') return;
    const ohneWlan = !/\d+\.\d+\.\d+\.\d+|:/.test(code.split('~')[6] || '');
    html(`<h2>📱 Gastgeber</h2><p><span class="schritt">1</span>Das andere Gerät scannt diesen Code<br><small>(dort: 📷 Ich scanne den QR-Code)</small></p><canvas id="lk-qr"></canvas>
      ${ohneWlan ? '<p class="fehler">Keine WLAN-Adresse gefunden – WLAN oder Hotspot an? Kamera erlaubt?</p>' : ''}
      <p><span class="schritt">2</span>Dann zeigt es einen Antwort-Code. Den scannst du hier:</p><p id="lk-meldung"></p>`,
      [['📷 Antwort scannen', () => this.antwortScannen()], kopierKnopf(code), ['📋 Antwort einfügen', () => this.antwortEinfuegen(), 'zweit'], ['← Zurück', () => this.dialog(), 'zweit']]);
    this.opt.qr(el.querySelector('#lk-qr'), code);
    window.letzterLokalCode = code;
  };
  const pruefeAntwort = t => { const a = codeLesen(t); return !a ? 'Das ist kein Verbindungs-Code.' : a.typ !== 'B' ? 'Das ist der Gastgeber-Code – bitte den Antwort-Code vom anderen Gerät.' : L.offen && a.nr !== L.offen.nr ? 'Diese Antwort gehört zu einem alten QR-Code.' : ''; };
  L.antwortScannen = function () {
    const qr = el.querySelector('#lk-qr');
    html('<h2>📷 Antwort scannen</h2><video muted playsinline></video><p id="lk-meldung">Antwort-Code vom anderen Gerät in den Rahmen halten</p>',
      [['← Zurück zum QR-Code', () => this.wirtZeigenNochmal(), 'zweit']]);
    scannen(pruefeAntwort, t => this.antwortBenutzen(t));
  };
  L.wirtZeigenNochmal = function () {
    const code = window.letzterLokalCode;
    zustand = 'wirt';
    html(`<h2>📱 Gastgeber</h2><p>Das andere Gerät scannt diesen Code:</p><canvas id="lk-qr"></canvas><p id="lk-meldung"></p>`,
      [['📷 Antwort scannen', () => this.antwortScannen()], ['📋 Antwort einfügen', () => this.antwortEinfuegen(), 'zweit'], ['← Zurück', () => this.dialog(), 'zweit']]);
    this.opt.qr(el.querySelector('#lk-qr'), code);
  };
  L.antwortEinfuegen = function () {
    html(`<h2>📋 Antwort einfügen</h2><p>Antwort-Code vom anderen Gerät hier einfügen:</p>${einfuegen()}<p id="lk-meldung"></p>`,
      [einfuegenKnopf(pruefeAntwort, t => this.antwortBenutzen(t)), ['← Zurück', () => this.wirtZeigenNochmal(), 'zweit']]);
  };
  L.antwortBenutzen = async function (t) {
    if (this.rolle !== 'wirt') { Object.assign(this, { an: true, rolle: 'wirt' }); this.merken(); }   // eigener gespeicherter Stand gilt jetzt
    html('<h2>📶 Verbinde …</h2><p>Gleich geht es los.</p><p id="lk-meldung"></p>', [['← Zurück', () => this.dialog(), 'zweit']]);
    try { await this.antwortNehmen(t); } catch (e) { return fehler(e.message); }
    this.wartenAufVerbindung();
  };
  L.gastStart = function () {
    zustand = 'gast';
    html(`<h2>📷 Mitspieler</h2><video muted playsinline></video><p id="lk-meldung">QR-Code vom Gastgeber in den Rahmen halten</p>${einfuegen()}`,
      [einfuegenKnopf(pruefeAngebot, t => this.angebotBenutzen(t)), ['← Zurück', () => this.dialog(), 'zweit']]);
    scannen(pruefeAngebot, t => this.angebotBenutzen(t));
  };
  const pruefeAngebot = t => { const a = codeLesen(t); return !a ? 'Das ist kein Verbindungs-Code.' : a.typ !== 'A' ? 'Das ist ein Antwort-Code – bitte den QR-Code vom Gastgeber.' : ''; };
  L.angebotBenutzen = async function (t) {
    html('<h2>📷 Mitspieler</h2><p>Bereite die Antwort vor …</p>');
    // Als Mitspieler: alte Verbindungen weg (der Gastgeber hat den Stand)
    for (const p of Object.values(this.peers)) try { p.pc.close(); } catch {}
    this.peers = {};
    if (this.rolle !== 'gast') { Object.assign(this, { an: true, rolle: 'gast' }); this.merken(); }
    let code;
    try { code = await this.beantworten(t); } catch (e) { return html(`<h2>📷 Mitspieler</h2><p class="fehler">${e.message}</p>`, [['Nochmal scannen', () => this.gastStart()], ['← Zurück', () => this.dialog(), 'zweit']]); }
    html(`<h2>📷 Mitspieler</h2><p><span class="schritt">2</span>Jetzt scannt der Gastgeber diesen Antwort-Code<br><small>(dort: 📷 Antwort scannen)</small></p><canvas id="lk-qr"></canvas><p id="lk-meldung">Warte auf den Gastgeber …</p>`,
      [kopierKnopf(code), ['Nochmal scannen', () => this.gastStart(), 'zweit']]);
    this.opt.qr(el.querySelector('#lk-qr'), code);
    window.letzterLokalCode = code;
    this.wartenAufVerbindung(60000);
  };
  // Warten, bis der Kanal offen ist; dann Fenster zu und weiter in der App
  L.wartenAufVerbindung = function (lang = 15000) {
    const p = this.offen, start = performance.now();
    clearTimeout(this.hinweisTimer);
    const schauen = () => {
      if (!this.istOffen()) return;
      if (p && p.k && p.k.readyState === 'open') {
        html('<h2>📶 Verbunden ✓</h2><p class="ok">Die Geräte sind verbunden.</p>');
        this.hinweisTimer = setTimeout(() => { zu(); this.fertig && this.fertig(); }, 700);
        return;
      }
      if (performance.now() - start > lang) return fehler('Klappt nicht? Beide im selben WLAN/Hotspot? Kamera erlaubt? Dann „Zurück“ und nochmal.');
      this.hinweisTimer = setTimeout(schauen, 250);
    };
    schauen();
  };
  // Für die Anzeige in der App (z. B. ⚡-Knopf)
  L.anzeigeNeu = function () { this.opt.wennAnders && this.opt.wennAnders(); };
  return L;
})();
