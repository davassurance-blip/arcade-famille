/* ===== Kart 3D (dès 4 ans) — vraie 3D (WebGL, bibliothèque Three.js embarquée, aucun réseau) =====
   Le monde : un terrain vallonné, une route qui suit le relief, des karts 3D vus de dos (modèles Kenney, CC0).
   La scène 3D est rendue dans un canvas WebGL à part, puis recopiée dans le canvas du jeu ; le tableau de bord est dessiné par-dessus en 2D.
   La conduite reste simple : le kart accélère tout seul, on tourne et on freine. Hors de la route, on ralentit. */
const K3D_TRACKS = [
  { name: 'Circuit des Collines', half: 8, pts: [[0, -150], [95, -160], [185, -120], [215, -35], [165, 35], [85, 45], [55, 105], [120, 165], [70, 215], [-45, 205], [-125, 150], [-105, 70], [-175, 15], [-215, -75], [-150, -150]], hills: 1 }
];
let K3D_GEO = null; // géométries des karts, décodées une seule fois
GAMES.push({
  id: 'kart3d', title: 'Kart 3D', tagline: 'Une vraie course en 3D (essai)', minAge: 4, color: '#ff5a3c',
  icon: '<svg viewBox="0 0 64 64"><path d="M4 50 L26 22 L38 22 L60 50 Z" fill="#5c6270"/><path d="M30 50 L31.5 22 L32.5 22 L34 50 Z" fill="#fff"/><rect x="20" y="34" width="24" height="14" rx="5" fill="#e8452c" stroke="#1b1540" stroke-width="2.5"/><rect x="16" y="40" width="7" height="11" rx="2.5" fill="#1b1540"/><rect x="41" y="40" width="7" height="11" rx="2.5" fill="#1b1540"/><circle cx="32" cy="30" r="7" fill="#ffd23f" stroke="#1b1540" stroke-width="2.5"/></svg>',
  howto: ['Ton kart avance tout seul ! Appuie sur ◀ et ▶ pour tourner. Reste sur la route et fais 3 tours.', 'Le kart accélère tout seul : ◀ ▶ pour tourner, FREIN avant les virages serrés. Roule sur les flèches jaunes pour un turbo. 3 tours contre 3 adversaires.', 'Trois tours contre 3 adversaires rapides. Freine tard, coupe les virages sans mordre l\'herbe, prends les turbos.'],
  pad: { left: true, buttons: [{ k: 'b', label: 'FREIN' }] },
  stars: s => s >= 1000 ? 3 : s >= 600 ? 2 : s >= 300 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env, tier = env.tier, T3 = window.THREE;
    const FONT = getComputedStyle(document.body).getPropertyValue('--font-display');
    const VMAX = [24, 30, 35][tier], LAPS = 3, TR = K3D_TRACKS[0], HALF = TR.half, NAMES = ['Toi', 'Zoé', 'Max', 'Lila'];
    let renderer = null, scene = null, camera = null, fail = '', over = false, t = 0, phase = 'count', count = 3.6, lastCount = 4, finishT = 0, karts = [], pads = [], path = [], N = 0, camA = 0, auto = false, view = 0, vbox = null, msg = '', msgT = 0, ratio = 1, slow = 0, frames = 0, raceT = 0, audio = null, shake = 0;
    const VIEWS = ['Derrière', 'De haut', 'Au volant']; S.k3dView = S.k3dView || {}; view = clamp(S.k3dView[env.profile.id] | 0, 0, 2);
    const say = (m, d) => { msg = m; msgT = d || 1.5; };
    // ---------- piste : courbe fermée qui passe par les points de contrôle ----------
    function buildPath() {
      const P = TR.pts, n = P.length, out = [];
      for (let i = 0; i < n; i++) { const p0 = P[(i + n - 1) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n], seg = Math.max(6, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 4));
        for (let k = 0; k < seg; k++) { const u = k / seg, u2 = u * u, u3 = u2 * u; out.push({ x: .5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3), z: .5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3) }); } }
      N = out.length;
      const raw = (x, z) => (Math.sin(x * .021 + 1) * Math.cos(z * .017) * 7 + Math.sin(x * .009 - z * .013 + 2) * 6) * TR.hills;
      for (const p of out) p.h0 = raw(p.x, p.z);
      for (let i = 0; i < N; i++) { let s = 0; for (let k = -8; k <= 8; k++) s += out[(i + k + N) % N].h0; out[i].y = s / 17; } // relief adouci le long de la route
      for (let i = 0; i < N; i++) { const a = out[i], b = out[(i + 1) % N], l = Math.hypot(b.x - a.x, b.z - a.z) || 1; a.dx = (b.x - a.x) / l; a.dz = (b.z - a.z) / l; a.len = l; }
      path = out; path.raw = raw;
    }
    // point de la piste le plus proche (recherche locale autour d'un indice connu, ou complète)
    function nearest(x, z, hint) { let bi = 0, bd = 1e18; const scan = (i) => { const p = path[i], d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z); if (d < bd) { bd = d; bi = i; } }; if (hint == null) for (let i = 0; i < N; i++) scan(i); else for (let k = -14; k <= 14; k++) scan(((hint + k) % N + N) % N); return bi; }
    function roadInfo(x, z, hint) { // indice, écart latéral (signé), hauteur du sol à cet endroit
      const i = nearest(x, z, hint), p = path[i], q = path[(i + 1) % N], rx = x - p.x, rz = z - p.z, along = clamp((rx * p.dx + rz * p.dz) / p.len, -.5, 1.5), lat = rx * -p.dz + rz * p.dx, hr = p.y + (q.y - p.y) * clamp(along, 0, 1), d = Math.abs(lat);
      const k = clamp((d - HALF - 9) / 30, 0, 1), sm = k * k * (3 - 2 * k); return { i, lat, d, y: hr * (1 - sm) + path.raw(x, z) * sm - .3 * clamp((d - HALF - 1.3) / 1.2, 0, 1) }; // bas-côté 30 cm sous la route : le terrain ne peut jamais la recouvrir
    }
    // ---------- scène ----------
    function geoFrom(m) { const dec = (b, C) => { const s = atob(b), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return new C(a.buffer); }; const v = dec(m.v, Int16Array), n = dec(m.n, Int8Array), c = dec(m.c, Uint8Array), g = new T3.BufferGeometry(), P = new Float32Array(v.length), Nn = new Float32Array(n.length), C = new Float32Array(c.length);
      for (let i = 0; i < v.length; i++) P[i] = v[i] / 32767 * m.s; for (let i = 0; i < n.length; i++) Nn[i] = n[i] / 127; for (let i = 0; i < c.length; i++) { const s = c[i] / 255; C[i] = s <= .04045 ? s / 12.92 : Math.pow((s + .055) / 1.055, 2.4); }
      g.setAttribute('position', new T3.BufferAttribute(P, 3)); g.setAttribute('normal', new T3.BufferAttribute(Nn, 3)); g.setAttribute('color', new T3.BufferAttribute(C, 3)); g.setIndex(new T3.BufferAttribute(dec(m.i, Uint16Array), 1)); return g; }
    function tinted(g, hex) { const out = g.clone(), src = g.getAttribute('color'), a = new Float32Array(src.array), c = new T3.Color(hex); for (let i = 0; i < a.length; i += 3) { const r = a[i], gg = a[i + 1], b = a[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); if (b >= r && b >= gg && mx - mn < .32 && mx > .12) { const l = Math.min(1.25, mx * 1.5); a[i] = c.r * l; a[i + 1] = c.g * l; a[i + 2] = c.b * l; } } out.setAttribute('color', new T3.BufferAttribute(a, 3)); return out; }
    function label(text, w, h, bg, fg, font) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.font = '900 ' + (font || Math.round(h * .62)) + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 2); const tx = new T3.CanvasTexture(cv); tx.colorSpace = T3.SRGBColorSpace; return tx; }
    function build() {
      buildPath();
      renderer = new T3.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); renderer.setClearColor(0x8fd3ff);
      scene = new T3.Scene(); scene.fog = new T3.Fog(0xbfe6ff, 140, 520); scene.background = new T3.Color(0x8fd3ff);
      camera = new T3.PerspectiveCamera(64, 1, .5, 900);
      scene.add(new T3.HemisphereLight(0xffffff, 0x6f9a55, 1.5)); const sun = new T3.DirectionalLight(0xfff2d6, 2.2); sun.position.set(120, 200, 80); scene.add(sun);
      const mat = new T3.MeshLambertMaterial({ vertexColors: true }), col = new T3.Color();
      // terrain : grille dont la hauteur rejoint celle de la route à son approche
      { const G = 110, SZ = 660, pos = [], cols = [], idx = []; for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) { const x = (i / G - .5) * SZ, z = (j / G - .5) * SZ + 30, r = roadInfo(x, z), v = .5 + .5 * Math.sin(x * .13) * Math.cos(z * .11); pos.push(x, r.d < HALF + 1.3 ? r.y - .3 : r.y, z); if (r.d < HALF + 4) col.setRGB(.56, .47, .3); else col.setRGB(.2 + v * .08, .5 + v * .14, .16 + v * .05); cols.push(col.r, col.g, col.b); }
        for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const a = j * (G + 1) + i; idx.push(a, a + G + 1, a + 1, a + 1, a + G + 1, a + G + 2); }
        const g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T3.Float32BufferAttribute(cols, 3)); g.setIndex(idx); g.computeVertexNormals(); scene.add(new T3.Mesh(g, mat)); }
      // route, bordures rouges et blanches, ligne pointillée, damier de départ : un seul maillage
      { const pos = [], cols = [], idx = []; const quad = (a, b, c2, d, r, g2, b2) => { const o = pos.length / 3; pos.push(...a, ...b, ...c2, ...d); for (let k = 0; k < 4; k++) cols.push(r, g2, b2); idx.push(o, o + 1, o + 2, o + 2, o + 1, o + 3); };
        const at = (i, lat, up) => { const p = path[(i % N + N) % N]; return [p.x - p.dz * lat, p.y + (up || 0), p.z + p.dx * lat]; };
        for (let i = 0; i < N; i++) { const s = (i % 2) ? .3 : .33; quad(at(i, -HALF), at(i, HALF), at(i + 1, -HALF), at(i + 1, HALF), s, s, s + .03);
          const red = Math.floor(i / 2) % 2; for (const sd of [-1, 1]) quad(at(i, sd * HALF, .05), at(i, sd * (HALF + 1.3), .05), at(i + 1, sd * HALF, .05), at(i + 1, sd * (HALF + 1.3), .05), red ? .85 : .95, red ? .12 : .95, red ? .1 : .95);
          for (const sd of [-1, 1]) quad(at(i, sd * (HALF + 1.3), .05), at(i, sd * (HALF + 1.5), -.4), at(i + 1, sd * (HALF + 1.3), .05), at(i + 1, sd * (HALF + 1.5), -.4), .45, .38, .24);
          if (i % 4 < 2) quad(at(i, -.18, .04), at(i, .18, .04), at(i + 1, -.18, .04), at(i + 1, .18, .04), .95, .95, .9); }
        for (let r = 0; r < 2; r++) for (let k = 0; k < 8; k++) { const l0 = -HALF + k * HALF / 4, w = (r + k) % 2; const p = path[0], f = r * 1.4, a = [p.x - p.dz * l0 + p.dx * f, p.y + .06, p.z + p.dx * l0 + p.dz * f], b = [p.x - p.dz * (l0 + HALF / 4) + p.dx * f, p.y + .06, p.z + p.dx * (l0 + HALF / 4) + p.dz * f]; quad(a, b, [a[0] + p.dx * 1.4, a[1], a[2] + p.dz * 1.4], [b[0] + p.dx * 1.4, b[1], b[2] + p.dz * 1.4], w, w, w); }
        const g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T3.Float32BufferAttribute(cols, 3)); g.setIndex(idx); g.computeVertexNormals(); const m = new T3.Mesh(g, new T3.MeshLambertMaterial({ vertexColors: true, side: T3.DoubleSide })); scene.add(m); }
      // arbres, rochers, pneus : des « instances » (un seul objet répété) pour rester léger
      const dummy = new T3.Object3D(); let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      { const spots = []; for (let k = 0; k < 900 && spots.length < 230; k++) { const x = (R() - .5) * 600, z = (R() - .5) * 600 + 30, r = roadInfo(x, z); if (r.d > HALF + 8) spots.push([x, r.y, z, .8 + R() * .9, R()]); }
        const trunk = new T3.InstancedMesh(new T3.CylinderGeometry(.35, .5, 2.4, 6), new T3.MeshLambertMaterial({ color: 0x7a4a21 }), spots.length), leaf = new T3.InstancedMesh(new T3.ConeGeometry(2.4, 5.2, 7), new T3.MeshLambertMaterial({ color: 0x2f9a48, flatShading: true }), spots.length), leaf2 = new T3.InstancedMesh(new T3.ConeGeometry(1.8, 4, 7), new T3.MeshLambertMaterial({ color: 0x46b85a, flatShading: true }), spots.length);
        spots.forEach((s, i) => { dummy.rotation.set(0, s[4] * 6, 0); dummy.scale.setScalar(s[3]); dummy.position.set(s[0], s[1] + 1.2 * s[3], s[2]); dummy.updateMatrix(); trunk.setMatrixAt(i, dummy.matrix); dummy.position.y = s[1] + 4.6 * s[3]; dummy.updateMatrix(); leaf.setMatrixAt(i, dummy.matrix); dummy.position.y = s[1] + 7 * s[3]; dummy.updateMatrix(); leaf2.setMatrixAt(i, dummy.matrix); });
        scene.add(trunk, leaf, leaf2);
        const rocks = []; for (let k = 0; k < 300 && rocks.length < 50; k++) { const x = (R() - .5) * 560, z = (R() - .5) * 560 + 30, r = roadInfo(x, z); if (r.d > HALF + 10) rocks.push([x, r.y, z, .5 + R() * 1.1, R()]); }
        const rk = new T3.InstancedMesh(new T3.DodecahedronGeometry(1, 0), new T3.MeshLambertMaterial({ color: 0x8d8f9c, flatShading: true }), rocks.length); rocks.forEach((s, i) => { dummy.rotation.set(s[4] * 3, s[4] * 6, 0); dummy.scale.set(s[3], s[3] * .7, s[3]); dummy.position.set(s[0], s[1] + .3, s[2]); dummy.updateMatrix(); rk.setMatrixAt(i, dummy.matrix); }); scene.add(rk); }
      { // piles de pneus et panneaux à chevrons à l'extérieur des virages
        const tyres = [], signs = []; let lastS = -99; for (let i = 0; i < N; i += 2) { const a = path[i], b = path[(i + 10) % N], turn = a.dx * b.dz - a.dz * b.dx; if (Math.abs(turn) > .28) { const side = turn > 0 ? -1 : 1; for (let k = 0; k < 3; k++) tyres.push([a.x - a.dz * side * (HALF + 2.6), a.y + .35 + k * .62, a.z + a.dx * side * (HALF + 2.6), (i + k) % 2]); if (i - lastS >= 10) { signs.push([i + 4, side, turn > 0 ? 1 : -1]); lastS = i; } } }
        const tg = new T3.CylinderGeometry(.95, .95, .6, 10); const tm = new T3.InstancedMesh(tg, new T3.MeshLambertMaterial({ color: 0xffffff }), tyres.length); tyres.forEach((s, i) => { dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.position.set(s[0], s[1], s[2]); dummy.updateMatrix(); tm.setMatrixAt(i, dummy.matrix); tm.setColorAt(i, col.set(s[3] ? 0xd22b2b : 0xf2f2f2)); }); scene.add(tm);
        const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = '#ffd23f'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#1b1540'; for (const ox of [18, 62]) { x.beginPath(); x.moveTo(ox, 8); x.lineTo(ox + 30, 32); x.lineTo(ox, 56); x.lineTo(ox + 14, 32); x.closePath(); x.fill(); } const tR = new T3.CanvasTexture(cv); tR.colorSpace = T3.SRGBColorSpace; const tL = tR.clone(); tL.wrapS = T3.RepeatWrapping; tL.repeat.x = -1; tL.offset.x = 1; tL.needsUpdate = true;
        const sg = new T3.PlaneGeometry(4.4, 2.2), mR = new T3.MeshBasicMaterial({ map: tR, side: T3.DoubleSide }), mL = new T3.MeshBasicMaterial({ map: tL, side: T3.DoubleSide }), pm = new T3.MeshLambertMaterial({ color: 0x6b6b8f });
        for (const s of signs) { const p = path[s[0] % N], px = p.x - p.dz * s[1] * (HALF + 5), pz = p.z + p.dx * s[1] * (HALF + 5), m = new T3.Mesh(sg, s[2] > 0 ? mR : mL); m.position.set(px, p.y + 3.1, pz); m.rotation.y = Math.atan2(-p.dx, -p.dz); scene.add(m); const post = new T3.Mesh(new T3.CylinderGeometry(.14, .14, 2.2, 6), pm); post.position.set(px, p.y + 1.1, pz); scene.add(post); } }
      { // portique de départ, tribune, panneaux, montagnes, nuages
        const p = path[2], lm = new T3.MeshLambertMaterial({ color: 0xe8e8f0 }); for (const sd of [-1, 1]) { const po = new T3.Mesh(new T3.BoxGeometry(.8, 9, .8), lm); po.position.set(p.x - p.dz * sd * (HALF + 2), p.y + 4.5, p.z + p.dx * sd * (HALF + 2)); scene.add(po); }
        const ban = new T3.Mesh(new T3.BoxGeometry(HALF * 2 + 5, 2.4, .5), [lm, lm, lm, lm, new T3.MeshBasicMaterial({ map: label('DÉPART', 512, 64, '#e8452c', '#fff') }), new T3.MeshBasicMaterial({ map: label('DÉPART', 512, 64, '#e8452c', '#fff') })]); ban.position.set(p.x, p.y + 8, p.z); ban.rotation.y = Math.atan2(p.dx, p.dz); scene.add(ban);
        const q = path[N - 6], sd = 1, gx = q.x - q.dz * sd * (HALF + 13), gz = q.z + q.dx * sd * (HALF + 13), gy = roadInfo(gx, gz).y, grp = new T3.Group(); for (let k = 0; k < 4; k++) { const st = new T3.Mesh(new T3.BoxGeometry(34, 1.4, 2.4), new T3.MeshLambertMaterial({ color: k % 2 ? 0x7c5cff : 0x5ad1ff })); st.position.set(0, .7 + k * 1.4, k * 2.4); grp.add(st); }
        const crowd = new T3.InstancedMesh(new T3.SphereGeometry(.55, 6, 5), new T3.MeshLambertMaterial({ color: 0xffffff }), 100); for (let k = 0; k < 100; k++) { const r = Math.floor(k / 25); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.position.set(-16 + (k % 25) * 1.33 + (r % 2) * .6, 2 + r * 1.4, r * 2.4); dummy.updateMatrix(); crowd.setMatrixAt(k, dummy.matrix); crowd.setColorAt(k, col.set([0xff4f9a, 0xffd23f, 0x38e0d6, 0x9dff5c, 0xff9f1c, 0xffffff][(k * 7) % 6])); } grp.add(crowd); grp.position.set(gx, gy, gz); grp.lookAt(q.x, gy, q.z); grp.rotateY(Math.PI); scene.add(grp);
        const ADS = [['TURBO', '#38a0e0'], ['KART 3D', '#e8452c'], ['ZIP !', '#ffd23f'], ['NITRO', '#3fbf4f'], ['GO GO', '#9b7bff']]; let an = 0; for (let i = 30; i < N - 20; i += 37) { const a = path[i], sd2 = (an % 2) ? 1 : -1, ad = ADS[an++ % ADS.length], bx = a.x - a.dz * sd2 * (HALF + 6.5), bz = a.z + a.dx * sd2 * (HALF + 6.5), by = roadInfo(bx, bz).y, m = new T3.Mesh(new T3.PlaneGeometry(11, 3), new T3.MeshBasicMaterial({ map: label(ad[0], 512, 140, ad[1], ad[1] === '#ffd23f' ? '#1b1540' : '#fff'), side: T3.DoubleSide })); m.position.set(bx, by + 2.6, bz); m.lookAt(a.x, by + 2.6, a.z); scene.add(m); for (const o of [-4.6, 4.6]) { const po = new T3.Mesh(new T3.BoxGeometry(.3, 1.4, .3), new T3.MeshLambertMaterial({ color: 0x6b6b8f })); po.position.set(bx + a.dx * o, by + .6, bz + a.dz * o); scene.add(po); } }
        const mm = new T3.MeshLambertMaterial({ color: 0x7f8fb0, flatShading: true, fog: true }), snow = new T3.MeshLambertMaterial({ color: 0xffffff, flatShading: true }); for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, r = 430 + R() * 60, hgt = 90 + R() * 90, c1 = new T3.Mesh(new T3.ConeGeometry(70 + R() * 50, hgt, 6), mm); c1.position.set(Math.cos(a) * r, hgt / 2 - 12, Math.sin(a) * r + 30); c1.rotation.y = R() * 6; scene.add(c1); const c2 = new T3.Mesh(new T3.ConeGeometry(22, hgt * .3, 6), snow); c2.position.set(c1.position.x, hgt * .85 - 12 + .5, c1.position.z); c2.rotation.y = c1.rotation.y; scene.add(c2); }
        const cm = new T3.MeshBasicMaterial({ color: 0xffffff, fog: false }); for (let k = 0; k < 14; k++) { const g = new T3.Group(); for (let j = 0; j < 4; j++) { const s = new T3.Mesh(new T3.SphereGeometry(10 + R() * 9, 7, 5), cm); s.position.set(j * 13 - 20, R() * 5, R() * 8); s.scale.y = .55; g.add(s); } g.position.set((R() - .5) * 900, 120 + R() * 70, (R() - .5) * 900); scene.add(g); } }
      // turbos : bandes de flèches jaunes posées sur la route
      { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = '#ff9f1c'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#ffe14d'; for (const oy of [10, 68]) { x.beginPath(); x.moveTo(64, oy); x.lineTo(118, oy + 44); x.lineTo(86, oy + 44); x.lineTo(64, oy + 26); x.lineTo(42, oy + 44); x.lineTo(10, oy + 44); x.closePath(); x.fill(); } const tx = new T3.CanvasTexture(cv); tx.colorSpace = T3.SRGBColorSpace; const pm = new T3.MeshBasicMaterial({ map: tx });
        for (const f of [.2, .47, .72]) { const i = Math.floor(N * f), a = path[i], lat = (f * 10 % 2 < 1 ? -1 : 1) * HALF * .4, m = new T3.Mesh(new T3.PlaneGeometry(5, 7), pm); m.rotation.x = -Math.PI / 2; const hold = new T3.Group(); hold.add(m); hold.position.set(a.x - a.dz * lat, a.y + .09, a.z + a.dx * lat); hold.rotation.y = Math.atan2(a.dx, a.dz) + Math.PI; const b = path[(i + 2) % N]; hold.rotation.x = 0; scene.add(hold); pads.push({ x: hold.position.x, z: hold.position.z }); } }
      // karts
      if (!K3D_GEO) K3D_GEO = { wheel: geoFrom(K3D_MODELS.wheel), karts: K3D_MODELS.karts.map(k => ({ body: geoFrom(k.body), driver: geoFrom(k.driver) })) };
      const km = new T3.MeshLambertMaterial({ vertexColors: true }), shG = new T3.CircleGeometry(1.5, 16), shM = new T3.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .3, depthWrite: false }), SC = 2.6, mine = (env.profile.id ? String(env.profile.id).length : 0) % 5;
      for (let k = 0; k < 4; k++) {
        const g = new T3.Group(), tilt = new T3.Group(), gi = K3D_GEO.karts[(mine + k) % 5], body = new T3.Mesh(tinted(gi.body, [0xe8322a, 0x2f7de0, 0x33b24a, 0xffc61a][k]), km), drv = new T3.Mesh(gi.driver, km); drv.position.fromArray(K3D_MODELS.charPos); tilt.add(body, drv);
        const wheels = K3D_MODELS.wheelPos.map(wp => { const h = new T3.Group(), w = new T3.Mesh(K3D_GEO.wheel, km); h.position.fromArray(wp); h.add(w); tilt.add(h); return { h, w, front: wp[2] > 0 }; });
        tilt.scale.setScalar(SC); g.add(tilt); const sh = new T3.Mesh(shG, shM); sh.rotation.x = -Math.PI / 2; sh.position.y = .06; sh.scale.set(1, 1.3, 1); g.add(sh); scene.add(g);
        const row = Math.floor(k / 2), sdl = (k % 2 ? 1 : -1) * HALF * .42, si = N - 5 - row * 4, p = path[si];
        karts.push({ g, tilt, wheels, drv, me: k === 0, name: NAMES[k], x: p.x - p.dz * sdl, z: p.z + p.dx * sdl, y: p.y, a: Math.atan2(p.dx, p.dz), v: 0, steer: 0, i: si, lap: 0, half: false, done: 0, boost: 0, off: false, skill: [1, .9, .96, 1.02][k] * (tier === 0 ? .86 : tier === 1 ? .95 : 1.02), lane: sdl, laneT: 0, spin: 0, lean: 0, bump: 0, pitch: 0, rank: k + 1 });
      }
      camA = karts[0].a; place(0);
    }
    const progress = k => k.lap * N + ((k.i + 5) % N) + (k.done ? 1e6 - k.done : 0);
    function place(dt) { for (const k of karts) { k.g.position.set(k.x, k.y, k.z); k.g.rotation.set(0, k.a, 0); k.tilt.rotation.set(k.pitch, 0, k.lean + Math.sin(k.bump) * .03 * (k.off ? 1 : 0)); k.tilt.position.y = k.off ? Math.abs(Math.sin(k.bump)) * .12 : 0; for (const w of k.wheels) { w.w.rotation.x += k.v * dt * 1.6; if (w.front) w.h.rotation.y = k.steer * .45; } } }
    // ---------- son du moteur : deux oscillateurs dont la hauteur suit la vitesse ----------
    function engine(v, boost, off) {
      const ac = sfx.ctx && sfx.ctx(); if (!ac) { if (audio) { try { audio.g.gain.value = 0; } catch (e) { } } return; }
      if (!audio) { try { const g = ac.createGain(), f = ac.createBiquadFilter(), o1 = ac.createOscillator(), o2 = ac.createOscillator(), g2 = ac.createGain(); f.type = 'lowpass'; f.frequency.value = 700; o1.type = 'sawtooth'; o2.type = 'square'; g2.gain.value = .35; g.gain.value = 0; o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(ac.destination); o1.start(); o2.start(); audio = { ac, g, f, o1, o2 }; } catch (e) { return; } }
      const now = audio.ac.currentTime, r = clamp(v / VMAX, 0, 1.5), fr = 55 + r * 115 + (boost ? 30 : 0) + Math.sin(t * 40) * (off ? 6 : 1.5);
      audio.o1.frequency.setTargetAtTime(fr, now, .05); audio.o2.frequency.setTargetAtTime(fr * .5, now, .05); audio.f.frequency.setTargetAtTime(500 + r * 1300, now, .08);
      audio.g.gain.cancelScheduledValues(now); audio.g.gain.setTargetAtTime(.035 + r * .03, now, .05); audio.g.gain.setTargetAtTime(0, now + .25, .08); // si le jeu se met en pause, le moteur se tait tout seul
    }
    function stop() { if (audio) { try { audio.o1.stop(); audio.o2.stop(); audio.g.disconnect(); } catch (e) { } audio = null; } if (renderer) { try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) { } renderer = null; } }
    // ---------- conduite ----------
    function drive(k, dt, steerIn, brake) {
      const r = roadInfo(k.x, k.z, k.i); k.i = r.i; k.off = r.d > HALF + .6; k.boost = Math.max(0, k.boost - dt); k.spin = Math.max(0, k.spin - dt);
      const top = VMAX * k.skill * (k.off ? .55 : 1) * (k.boost > 0 ? 1.35 : 1), acc = k.v < top ? (k.boost > 0 ? 26 : 13) : -22;
      k.v = Math.max(0, k.v + (brake ? -30 : acc) * dt); if (k.v > top && !brake) k.v = Math.max(top, k.v - 18 * dt);
      k.steer += (steerIn - k.steer) * Math.min(1, dt * 9); const grip = clamp(k.v / 8, 0, 1) * (1.9 - clamp(k.v / VMAX, 0, 1) * .55);
      k.a += k.steer * grip * dt * (k.spin > 0 ? 0 : 1); if (k.spin > 0) k.a += dt * 11;
      k.x += Math.sin(k.a) * k.v * dt; k.z += Math.cos(k.a) * k.v * dt;
      if (r.d > HALF + 24) { const p = path[r.i], s = r.lat > 0 ? 1 : -1; k.x = p.x - p.dz * s * (HALF + 24); k.z = p.z + p.dx * s * (HALF + 24); k.v *= .9; } // on ne part pas dans le décor
      const r2 = roadInfo(k.x, k.z, k.i), ny = r2.y; k.pitch += (clamp((k.y - ny) / Math.max(.2, k.v * dt) * .7, -.3, .3) - k.pitch) * Math.min(1, dt * 6); k.y = ny;
      k.lean += (k.steer * clamp(k.v / VMAX, 0, 1) * .16 - k.lean) * Math.min(1, dt * 8); k.bump += dt * k.v * (k.off ? 1.3 : 0);
      for (const pd of pads) if (k.boost < .7 && Math.hypot(pd.x - k.x, pd.z - k.z) < 3.6) { k.boost = 1.6; if (k.me) { sfx.jump(); say('TURBO !', .8); env.vibe(40); } }
      // tours : il faut être passé par la moitié du circuit
      if (k.i > N * .45 && k.i < N * .55) k.half = true; if (k.half && k.i < N * .1) { k.half = false; k.lap++; if (k.lap >= LAPS && !k.done) { k.done = raceT; if (k.me) finish(); } else if (k.me) { say(k.lap === LAPS - 1 ? 'Dernier tour !' : 'Tour ' + (k.lap + 1) + ' / ' + LAPS, 1.6); sfx.ok(); } }
    }
    function aiSteer(k, dt, keep) { if (keep != null) k.lane = keep; else { k.laneT -= dt; if (k.laneT <= 0) { k.laneT = rnd(2, 5); k.lane = rnd(-.45, .45) * HALF; } } const look = Math.round(3 + k.v * .14), p = path[(k.i + look) % N], tx = p.x - p.dz * k.lane, tz = p.z + p.dx * k.lane; let da = Math.atan2(tx - k.x, tz - k.z) - k.a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
      const a = path[k.i], b = path[(k.i + 12) % N], turn = Math.abs(a.dx * b.dz - a.dz * b.dx); return { s: clamp(da * 3.2, -1, 1), brake: (turn > .38 && k.v > VMAX * .7) || (k.off && Math.abs(da) > .5 && k.v > VMAX * .4) }; }
    function finish() { phase = 'end'; finishT = 0; sfx.win(); }
    function update(dt) {
      if (over || fail) return; frames++; if (frames > 40) { if (dt > .027) slow++; else slow = Math.max(0, slow - 1); if (slow > 45 && ratio > .5) { ratio = Math.max(.5, ratio - .17); slow = 0; } } dt = Math.min(dt, .05); t += dt; msgT = Math.max(0, msgT - dt); shake = Math.max(0, shake - dt); const me = karts[0];
      { const tp = input.tap; if (tp && vbox && tp.x > vbox.x && tp.x < vbox.x + vbox.w && tp.y > vbox.y && tp.y < vbox.y + vbox.h) { view = (view + 1) % 3; S.k3dView[env.profile.id] = view; save(); sfx.tap(); say('Vue : ' + VIEWS[view], 1); } }
      if (phase === 'count') { count -= dt; const c = Math.ceil(count); if (c !== lastCount && c >= 0 && c <= 3) { lastCount = c; if (c > 0) sfx.tick(); else sfx.ok(); } if (count <= 0) { phase = 'race'; say('PARTEZ !', 1); } }
      if (phase !== 'count') {
        raceT += dt; const steer = (input.held.left ? 1 : 0) - (input.held.right ? 1 : 0);
        for (const k of karts) {
          if (k.me && !k.done && !auto) { // les petits sont aidés : le kart revient doucement dans l'axe de la route
            let st = steer; if (tier === 0) { const r = roadInfo(k.x, k.z, k.i); st = clamp(steer + aiSteer(k, dt, clamp(r.lat, -HALF * .6, HALF * .6)).s * .5, -1, 1); } drive(k, dt, st, input.held.b);
          } else { const ai = aiSteer(k, dt); if (!k.me) { const gap = progress(me) - progress(k); k.base = k.base || k.skill; k.skill += (k.base * (k.done ? .8 : 1 + clamp(gap / 220, -.07, .09)) - k.skill) * dt; } drive(k, dt, ai.s, ai.brake); } // les adversaires attendent un peu le joueur, ou le rattrapent
        }
        for (let i = 0; i < karts.length; i++) for (let j = i + 1; j < karts.length; j++) { const a = karts[i], b = karts[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < 2.3 && d > .01) { const push = (2.3 - d) / 2, nx = dx / d, nz = dz / d; a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push; a.v *= .985; b.v *= .985; if ((a.me || b.me) && shake <= 0) { shake = .25; sfx.hit(); env.vibe(30); } } }
        const order = karts.slice().sort((a, b) => progress(b) - progress(a)); order.forEach((k, i) => { k.rank = i + 1; });
        if (phase === 'end') { finishT += dt; if (finishT > 3.2) { over = true; const pts = [1000, 650, 400, 250][me.rank - 1] + Math.max(0, Math.round(150 - raceT)); stop(); env.gameOver(pts, { win: me.rank === 1, title: me.rank === 1 ? 'Victoire !' : me.rank + 'e sur 4', text: 'Course en ' + Math.floor(raceT / 60) + ' min ' + String(Math.floor(raceT % 60)).padStart(2, '0') + ' s' }); return; } }
      }
      place(dt); engine(me.v, me.boost > 0, me.off);
      // caméra : derrière le kart, avec un peu de retard dans les virages
      let da = me.a - camA; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; camA += da * Math.min(1, dt * 4.5);
      const port = env.H > env.W, sp = clamp(me.v / VMAX, 0, 1.4); me.drv.visible = view !== 2;
      if (view === 2) { // au volant : l'œil à la place du pilote, on voit le nez du kart et les roues avant
        camera.position.set(me.x + Math.sin(me.a) * .75, me.y + 1.42 + (shake > 0 ? rnd(-.05, .05) : 0), me.z + Math.cos(me.a) * .75); const la = me.a + me.steer * .12; camera.lookAt(me.x + Math.sin(la) * 12, me.y + 1.1, me.z + Math.cos(la) * 12); camera.rotateZ(-me.lean * .6);
        camera.fov += (((port ? 88 : 72) + sp * 8 + (me.boost > 0 ? 8 : 0)) - camera.fov) * Math.min(1, dt * 4);
      } else { const hi = view === 1, back = (port ? 9.5 : 8) * (hi ? 1.7 : 1) + me.v * .05, up = (port ? 4.6 : 3.6) * (hi ? 2.4 : 1), cx = me.x - Math.sin(camA) * back, cz = me.z - Math.cos(camA) * back, gy = roadInfo(cx, cz, me.i).y;
        camera.position.set(cx + (shake > 0 ? rnd(-.15, .15) : 0), Math.max(gy + 1.6, me.y + up), cz); camera.lookAt(me.x + Math.sin(me.a) * (hi ? 9 : 5), me.y + 1.3, me.z + Math.cos(me.a) * (hi ? 9 : 5));
        camera.fov += (((port ? 78 : 62) + sp * 9 + (me.boost > 0 ? 8 : 0)) - camera.fov) * Math.min(1, dt * 4); }
      env.setScore(Math.max(0, [1000, 650, 400, 250][me.rank - 1])); env.hud('Tour ' + Math.min(LAPS, me.lap + 1) + '/' + LAPS + ' · ' + me.rank + (me.rank === 1 ? 'er' : 'e'));
    }
    const big = (c, txt, y, fs, col) => { c.lineWidth = Math.max(4, fs * .18); c.lineJoin = 'round'; c.strokeStyle = '#1b1540'; c.font = '900 ' + Math.round(fs) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(txt, env.W / 2, y); c.fillStyle = col; c.fillText(txt, env.W / 2, y); };
    function draw(c) {
      const W = env.W, H = env.H;
      if (fail) { c.fillStyle = '#17123a'; c.fillRect(0, 0, W, H); Draw.text(c, 'La 3D ne démarre pas sur cet appareil', W / 2, H / 2 - 14, Math.min(20, W / 20), '#ffd23f'); Draw.text(c, fail, W / 2, H / 2 + 18, 13, '#fff', 'center', 700); return; }
      if (!renderer) return;
      // la qualité s'adapte : si l'appareil peine, on dessine la 3D avec moins de points
      const dpr = Math.min(window.devicePixelRatio || 1, 2), rw = Math.max(2, Math.round(W * dpr * ratio)), rh = Math.max(2, Math.round(H * dpr * ratio)); if (renderer.domElement.width !== rw || renderer.domElement.height !== rh) { renderer.setSize(rw, rh, false); camera.aspect = W / H; } camera.updateProjectionMatrix();
      renderer.render(scene, camera); c.drawImage(renderer.domElement, 0, 0, W, H);
      const me = karts[0];
      if (me.boost > 0 || me.v > VMAX * 1.02) { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; for (let i = 0; i < 14; i++) { const a = i * 2.4 + t * 3, r0 = Math.min(W, H) * (.34 + (i * 37 % 10) * .02), r1 = r0 + 30 + (i % 3) * 24; c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * r0 * 1.5, H * .52 + Math.sin(a) * r0); c.lineTo(W / 2 + Math.cos(a) * r1 * 1.5, H * .52 + Math.sin(a) * r1); c.stroke(); } }
      // tableau de bord
      c.fillStyle = 'rgba(23,18,58,.8)'; Draw.rr(c, 10, 10, 92, 62, 14); c.fill(); Draw.text(c, me.rank + (me.rank === 1 ? 'er' : 'e'), 56, 38, 34, ['#ffd23f', '#e8e8f0', '#ff9f1c', '#fff'][me.rank - 1]); Draw.text(c, 'sur 4', 56, 62, 11, '#fff', 'center', 700);
      vbox = { x: 10, y: 80, w: 92, h: 40 }; c.fillStyle = 'rgba(255,210,63,.95)'; Draw.rr(c, vbox.x, vbox.y, vbox.w, vbox.h, 14); c.fill(); Draw.text(c, 'VUE', 56, 93, 11, '#1b1540'); Draw.text(c, VIEWS[view], 56, 108, 12, '#1b1540');
      c.fillStyle = 'rgba(23,18,58,.8)'; Draw.rr(c, W - 104, 10, 94, 40, 14); c.fill(); Draw.text(c, 'Tour ' + Math.min(LAPS, me.lap + 1) + '/' + LAPS, W - 57, 31, 17, '#fff');
      { const mw = Math.min(104, W * .24), mx = W - mw - 10, my = 58; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of TR.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } const sc = (mw - 16) / Math.max(x1 - x0, z1 - z0), X = x => mx + mw / 2 - (x - (x0 + x1) / 2) * sc, Y = z => my + mw / 2 - (z - (z0 + z1) / 2) * sc;
        c.fillStyle = 'rgba(23,18,58,.6)'; Draw.rr(c, mx, my, mw, mw, 12); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); for (let i = 0; i <= N; i += 3) { const p = path[i % N]; i ? c.lineTo(X(p.x), Y(p.z)) : c.moveTo(X(p.x), Y(p.z)); } c.closePath(); c.stroke();
        for (let k = karts.length - 1; k >= 0; k--) { const q = karts[k]; c.fillStyle = q.me ? '#ffd23f' : '#ff4f9a'; c.strokeStyle = '#1b1540'; c.lineWidth = 2; c.beginPath(); c.arc(X(q.x), Y(q.z), q.me ? 5 : 3.5, 0, 7); c.fill(); c.stroke(); } }
      { const bw = Math.min(150, W * .36), bx = 10, by = H - 22, f = clamp(me.v / (VMAX * 1.35), 0, 1); c.fillStyle = 'rgba(23,18,58,.7)'; Draw.rr(c, bx, by - 4, bw, 16, 8); c.fill(); c.fillStyle = me.boost > 0 ? '#ff9f1c' : me.off ? '#ff4f4f' : '#9dff5c'; Draw.rr(c, bx + 3, by - 1, Math.max(8, (bw - 6) * f), 10, 5); c.fill(); Draw.text(c, Math.round(me.v * 3.6) + ' km/h', bx + bw + 8, by + 5, 13, '#fff', 'left'); }
      if (me.off && phase === 'race' && Math.sin(t * 8) > 0) big(c, 'Reviens sur la route !', H * .3, Math.min(22, W / 16), '#ff8fb8');
      if (phase === 'count') { const n = Math.ceil(count); if (n <= 3) { const cx = W / 2, cy = H * .26; c.fillStyle = 'rgba(23,18,58,.85)'; Draw.rr(c, cx - 78, cy - 30, 156, 60, 18); c.fill(); for (let i = 0; i < 3; i++) { c.fillStyle = n <= 0 ? '#3fbf4f' : 3 - n >= i ? '#ff4f4f' : '#3a3466'; c.beginPath(); c.arc(cx - 48 + i * 48, cy, 17, 0, 7); c.fill(); } big(c, n > 0 ? String(n) : '', H * .45, 70, '#ffd23f'); } else big(c, TR.name, H * .3, Math.min(28, W / 14), '#fff'); }
      else if (phase === 'end') { big(c, me.rank === 1 ? 'VICTOIRE !' : 'ARRIVÉE : ' + me.rank + 'e', H * .32, Math.min(42, W / 9), me.rank === 1 ? '#ffd23f' : '#fff'); }
      else if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 3); big(c, msg, H * .3, Math.min(34, W / 10), '#ffd23f'); c.globalAlpha = 1; }
    }
    try { if (!T3) throw new Error('bibliothèque 3D absente'); build(); } catch (e) { fail = String(e && e.message || e).slice(0, 80); }
    return { update, draw, stop, dbg: () => ({ karts, path, N, phase, fail, ratio, raceT, HALF, info: renderer ? renderer.info.render : null, auto: on => { auto = on; }, setView: v => { view = v; } }) };
  }
});
