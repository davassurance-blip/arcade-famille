/* ===== Kart 3D (dès 4 ans) — vraie 3D (WebGL, bibliothèque Three.js embarquée, aucun réseau) =====
   Tout se calcule « le long de la piste » : un kart est repéré par sa distance sur le circuit (s), son écart à l'axe (lat) et son cap par rapport à la route (psi).
   C'est ce qui permet le tunnel où l'on roule sur les murs et au plafond (l'écart devient un angle autour du tube), les tremplins et les falaises
   (la hauteur de la route peut tomber d'un coup : le kart décolle puis retombe), et des pièges posés à un endroit précis du circuit.
   La scène est rendue dans un canvas WebGL à part, recopiée dans le canvas du jeu ; le tableau de bord est dessiné par-dessus en 2D. */
const K3D_TRACK = { name: 'Circuit du Grand Saut', half: 8, pts: [[0, -108], [70, -116], [133, -86], [155, -25], [118, 26], [61, 33], [40, 76], [86, 119], [50, 155], [-32, 148], [-90, 108], [-76, 50], [-126, 11], [-155, -54], [-108, -108]] };
const K3D_ITEMS = { turbo: ['TURBO', '#ff9f1c'], missile: ['MISSILE', '#ff4f4f'], oil: ['HUILE', '#3a3466'], star: ['ÉTOILE', '#ffe14d'], bolt: ['ÉCLAIR', '#8fe3ff'] };
const K3D_ANIMALS = [['Ours', 0x9a6238, 0xc98d5a], ['Lapin', 0xf2f2f2, 0xffc2d6], ['Renard', 0xf07a22, 0xffffff], ['Grenouille', 0x43b84c, 0xd8f5a2], ['Panda', 0xf5f5f5, 0x22222a]];
let K3D_GEO = null; // géométries des karts, décodées une seule fois
GAMES.push({
  id: 'kart3d', title: 'Kart 3D', tagline: 'Tunnel, grand saut, pièges et objets', minAge: 4, color: '#ff5a3c',
  icon: '<svg viewBox="0 0 64 64"><path d="M4 50 L26 22 L38 22 L60 50 Z" fill="#5c6270"/><path d="M30 50 L31.5 22 L32.5 22 L34 50 Z" fill="#fff"/><rect x="20" y="34" width="24" height="14" rx="5" fill="#e8452c" stroke="#1b1540" stroke-width="2.5"/><rect x="16" y="40" width="7" height="11" rx="2.5" fill="#1b1540"/><rect x="41" y="40" width="7" height="11" rx="2.5" fill="#1b1540"/><circle cx="32" cy="30" r="7" fill="#ffd23f" stroke="#1b1540" stroke-width="2.5"/></svg>',
  howto: ['Ton kart avance tout seul ! Glisse ton doigt à gauche ou à droite de l\'écran pour tourner (ou ◀ ▶). Tape l\'écran pour lancer ton objet.', 'Glisse le doigt sur l\'écran pour tourner (ou ◀ ▶), FREIN avant les virages. Passe sous les blocs de pierre quand ils sont levés, roule sur les murs du tunnel, prends le grand saut ! Tape l\'écran ou OBJET pour lancer ton objet.', 'Trois tours, 3 adversaires. Blocs de pierre, tonneaux, huile : évite-les. Caisses « ? » = objets (tape l\'écran ou OBJET). Dans le tunnel, on roule à 360°.'],
  pad: { left: true, xl: true, buttons: [{ k: 'b', label: 'FREIN' }, { k: 'a', label: 'OBJET' }], hint: 'ou glisse le doigt sur l\'écran' },
  stars: s => s >= 1000 ? 3 : s >= 600 ? 2 : s >= 300 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env, tier = env.tier, T3 = window.THREE;
    const FONT = getComputedStyle(document.body).getPropertyValue('--font-display');
    const VMAX = [25, 31, 36][tier], LAPS = 3, TR = K3D_TRACK, HALF = TR.half, RT = 7, GRAV = 20, TAU = Math.PI * 2;
    let renderer = null, scene = null, camera = null, fail = '', over = false, t = 0, phase = 'count', count = 3.6, lastCount = 4, finishT = 0, karts = [], path = [], N = 0, auto = false, view = 0, vbox = null, ibox = null, msg = '', msgT = 0, ratio = 1, slow = 0, frames = 0, raceT = 0, audio = null, shake = 0, flash = 0;
    let pads = [], coins = [], boxes = [], crushers = [], barrels = [], oils = [], missiles = [], camF = null, camU = null, dragX = null;
    const VIEWS = ['Derrière', 'De haut', 'Au volant']; S.k3dView = S.k3dView || {}; view = clamp(S.k3dView[env.profile.id] | 0, 0, 2);
    const say = (m, d) => { msg = m; msgT = d || 1.5; };
    const wrapA = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
    const P = i => path[((i % N) + N) % N];
    // ---------- piste ----------
    function buildPath() {
      const C = TR.pts, n = C.length, out = [];
      for (let i = 0; i < n; i++) { const p0 = C[(i + n - 1) % n], p1 = C[i], p2 = C[(i + 1) % n], p3 = C[(i + 2) % n], seg = Math.max(5, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 4));
        for (let k = 0; k < seg; k++) { const u = k / seg, u2 = u * u, u3 = u2 * u; out.push({ x: .5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3), z: .5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3) }); } }
      N = out.length; path = out;
      const raw = (x, z) => Math.sin(x * .027 + 1) * Math.cos(z * .022) * 9 + Math.sin(x * .012 - z * .017 + 2) * 8; path.raw = raw;
      for (const p of out) p.h0 = raw(p.x, p.z);
      for (let i = 0; i < N; i++) { let s = 0; for (let k = -7; k <= 7; k++) s += P(i + k).h0; out[i].y = s / 15; out[i].b = 0; } // collines adoucies le long de la route
      for (let i = 0; i < N; i++) { const a = out[i], b = P(i + 1), l = Math.hypot(b.x - a.x, b.z - a.z) || 1; a.dx = (b.x - a.x) / l; a.dz = (b.z - a.z) / l; a.len = l; a.ang = Math.atan2(a.dx, a.dz); }
      // tremplin, tunnel qui monte, puis grand tremplin au bord d'une falaise
      const F = f => Math.floor(N * f), add = new Float32Array(N), iA = F(.3), i0 = F(.47), i1 = F(.6), iB = F(.65);
      for (let k = 0; k <= 5; k++) add[iA - 5 + k] = 3.2 * k / 5;
      for (let i = i0; i <= iB; i++) { const u = clamp((i - i0) / (i1 - i0), 0, 1); add[i] = 11 * u * u * (3 - 2 * u); } for (let k = 0; k <= 4; k++) add[iB - 4 + k] += 4.6 * k / 4;
      for (let i = i0; i <= i1; i++) out[i].b = clamp(Math.min(i - i0, i1 - i) / 3, 0, 1);
      for (let i = 0; i < N; i++) out[i].y += add[i]; for (let i = 0; i < N; i++) out[i].ye = P(i + 1).y;
      for (const c of [iA, iB]) { const top = out[c].y; out[c].y = top - add[c]; P(c - 1).ye = top; out[c].cliff = add[c]; } // la route tombe d'un coup : on s'envole
      path.F = F; path.marks = { iA, i0, i1, iB };
    }
    // repère d'un point de la piste : position, « haut », « droite », direction de la route (dans le tunnel, l'écart tourne autour du tube)
    const _fr = { pos: null, up: null, right: null, tan: null, b: 0, gy: 0 };
    function frame(s, lat, o) {
      o = o || _fr; const i = ((Math.floor(s) % N) + N) % N, u = s - Math.floor(s), p = path[i], q = P(i + 1), x = p.x + p.dx * p.len * u, z = p.z + p.dz * p.len * u, y = p.y + (p.ye - p.y) * u, b = p.b + (q.b - p.b) * u;
      if (!o.pos) { o.pos = new T3.Vector3(); o.up = new T3.Vector3(); o.right = new T3.Vector3(); o.tan = new T3.Vector3(); }
      o.b = b; o.gy = y; o.tan.set(p.dx, clamp((p.ye - p.y) / p.len, -.7, .7), p.dz).normalize();
      if (b <= 0) { o.pos.set(x - p.dz * lat, y, z + p.dx * lat); o.up.set(0, 1, 0); o.right.set(-p.dz, 0, p.dx); return o; }
      const th = lat / RT, sn = Math.sin(th), cs = Math.cos(th), tx = x - p.dz * RT * sn, ty = y + RT - RT * cs, tz = z + p.dx * RT * sn, fl = b >= 1 ? 0 : 1 - b;
      o.pos.set(tx * b + (x - p.dz * lat) * fl, ty * b + y * fl, tz * b + (z + p.dx * lat) * fl);
      o.up.set(p.dz * sn * b, cs * b + fl, -p.dx * sn * b).normalize(); o.right.set(-p.dz * (cs * b + fl), sn * b, p.dx * (cs * b + fl)).normalize(); return o;
    }
    function nearest(x, z) { let bi = 0, bd = 1e18; for (let i = 0; i < N; i++) { const p = path[i], d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z); if (d < bd) { bd = d; bi = i; } } return bi; }
    function groundAt(x, z) { // hauteur du terrain : au niveau de la route près d'elle, vallonné plus loin
      const i = nearest(x, z), p = path[i], rx = x - p.x, rz = z - p.z, lat = rx * -p.dz + rz * p.dx, d = Math.abs(lat), al = clamp((rx * p.dx + rz * p.dz) / p.len, 0, 1), hr = p.y + (p.ye - p.y) * al, k = clamp((d - HALF - 9) / 30, 0, 1), sm = k * k * (3 - 2 * k);
      return { d, y: hr * (1 - sm) + path.raw(x, z) * sm - .3 * clamp((d - HALF - 1.3) / 1.2, 0, 1), i };
    }
    // ---------- scène ----------
    function geoFrom(m) { const dec = (b, C) => { const s = atob(b), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return new C(a.buffer); }; const v = dec(m.v, Int16Array), n = dec(m.n, Int8Array), c = dec(m.c, Uint8Array), g = new T3.BufferGeometry(), Pp = new Float32Array(v.length), Nn = new Float32Array(n.length), C = new Float32Array(c.length);
      for (let i = 0; i < v.length; i++) Pp[i] = v[i] / 32767 * m.s; for (let i = 0; i < n.length; i++) Nn[i] = n[i] / 127; for (let i = 0; i < c.length; i++) { const s = c[i] / 255; C[i] = s <= .04045 ? s / 12.92 : Math.pow((s + .055) / 1.055, 2.4); }
      g.setAttribute('position', new T3.BufferAttribute(Pp, 3)); g.setAttribute('normal', new T3.BufferAttribute(Nn, 3)); g.setAttribute('color', new T3.BufferAttribute(C, 3)); g.setIndex(new T3.BufferAttribute(dec(m.i, Uint16Array), 1)); return g; }
    function tinted(g, hex) { const out = g.clone(), src = g.getAttribute('color'), a = new Float32Array(src.array), c = new T3.Color(hex); for (let i = 0; i < a.length; i += 3) { const r = a[i], gg = a[i + 1], b = a[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); if (b >= r && b >= gg && mx - mn < .32 && mx > .12) { const l = Math.min(1.25, mx * 1.5); a[i] = c.r * l; a[i + 1] = c.g * l; a[i + 2] = c.b * l; } } out.setAttribute('color', new T3.BufferAttribute(a, 3)); return out; }
    function tex(w, h, fn) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; fn(cv.getContext('2d'), w, h); const tx = new T3.CanvasTexture(cv); tx.colorSpace = T3.SRGBColorSpace; return tx; }
    const label = (text, w, h, bg, fg) => tex(w, h, x => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.font = '900 ' + Math.round(h * .62) + 'px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 2); });
    // pilote : un petit animal (tête, oreilles, museau, yeux, corps, bras tendus vers le volant)
    function animal(kind, shirt) {
      const A = K3D_ANIMALS[kind], g = new T3.Group(), fur = new T3.MeshLambertMaterial({ color: A[1] }), alt = new T3.MeshLambertMaterial({ color: A[2] }), dark = new T3.MeshLambertMaterial({ color: 0x1b1540 }), sh = new T3.MeshLambertMaterial({ color: shirt }), sp = new T3.SphereGeometry(1, 14, 10);
      const ball = (m, r, x, y, z, sx, sy, sz) => { const o = new T3.Mesh(sp, m); o.position.set(x, y, z); o.scale.set(r * (sx || 1), r * (sy || 1), r * (sz || 1)); g.add(o); return o; };
      ball(sh, .15, 0, .1, 0, 1, 1.15, .9); ball(fur, .19, 0, .4, 0, 1, .95, .95); // corps, tête
      for (const sd of [-1, 1]) { const arm = new T3.Mesh(new T3.CylinderGeometry(.04, .04, .22, 6), sh); arm.position.set(sd * .13, .14, .1); arm.rotation.x = 1.15; arm.rotation.z = sd * -.25; g.add(arm); ball(fur, .05, sd * .1, .1, .2); ball(dark, .028, sd * .075, .44, .17); ball(new T3.MeshLambertMaterial({ color: 0xffffff }), .012, sd * .07, .45, .195); }
      if (kind === 0) { for (const sd of [-1, 1]) { ball(fur, .07, sd * .15, .56, 0); ball(alt, .04, sd * .15, .56, .035); } ball(alt, .08, 0, .36, .15, 1, .8, .8); ball(dark, .028, 0, .38, .22); }
      else if (kind === 1) { for (const sd of [-1, 1]) { ball(fur, .055, sd * .08, .7, -.02, 1, 3.2, .7).rotation.z = sd * -.12; ball(alt, .03, sd * .08, .7, .012, 1, 3.6, .5); } ball(alt, .025, 0, .38, .185); ball(fur, .06, 0, .14, -.16); }
      else if (kind === 2) { for (const sd of [-1, 1]) { const e = new T3.Mesh(new T3.ConeGeometry(.07, .16, 4), fur); e.position.set(sd * .12, .6, 0); e.rotation.z = sd * -.2; g.add(e); } const sn = new T3.Mesh(new T3.ConeGeometry(.08, .16, 8), alt); sn.position.set(0, .36, .2); sn.rotation.x = Math.PI / 2; g.add(sn); ball(dark, .026, 0, .37, .28); const tl = ball(fur, .07, 0, .2, -.22, 1, 1, 2.2); tl.rotation.x = -.6; ball(alt, .045, 0, .29, -.34); }
      else if (kind === 3) { for (const sd of [-1, 1]) { ball(fur, .07, sd * .1, .57, .06); ball(new T3.MeshLambertMaterial({ color: 0xffffff }), .045, sd * .1, .58, .1); ball(dark, .022, sd * .1, .585, .14); } ball(alt, .1, 0, .33, .1, 1.3, .5, 1); }
      else { for (const sd of [-1, 1]) { ball(alt, .07, sd * .15, .56, 0); ball(alt, .05, sd * .08, .43, .15, 1, 1.2, .5); } ball(alt, .026, 0, .37, .19); }
      return g;
    }
    function build() {
      buildPath(); const M = path.marks, F = path.F;
      renderer = new T3.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      scene = new T3.Scene(); scene.fog = new T3.Fog(0xbfe6ff, 130, 480); scene.background = new T3.Color(0x8fd3ff);
      camera = new T3.PerspectiveCamera(64, 1, .4, 900); camF = new T3.Vector3(0, 0, 1); camU = new T3.Vector3(0, 1, 0);
      scene.add(new T3.HemisphereLight(0xffffff, 0x6f9a55, 1.5)); const sun = new T3.DirectionalLight(0xfff2d6, 2.2); sun.position.set(120, 200, 80); scene.add(sun);
      const mat = new T3.MeshLambertMaterial({ vertexColors: true }), col = new T3.Color(), dummy = new T3.Object3D(); let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      // terrain
      { const G = 100, SZ = 520, pos = [], cols = [], idx = []; for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) { const x = (i / G - .5) * SZ, z = (j / G - .5) * SZ + 20, r = groundAt(x, z), v = .5 + .5 * Math.sin(x * .13) * Math.cos(z * .11); pos.push(x, r.d < HALF + 1.3 ? r.y - .3 : r.y, z); if (r.d < HALF + 4) col.setRGB(.56, .47, .3); else col.setRGB(.2 + v * .08, .5 + v * .14, .16 + v * .05); cols.push(col.r, col.g, col.b); }
        for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const a = j * (G + 1) + i; idx.push(a, a + G + 1, a + 1, a + 1, a + G + 1, a + G + 2); }
        const g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T3.Float32BufferAttribute(cols, 3)); g.setIndex(idx); g.computeVertexNormals(); scene.add(new T3.Mesh(g, mat)); }
      // route (hors tunnel), bordures, pointillés, damier, tremplins rayés, parois des falaises
      { const pos = [], cols = [], idx = []; const quad = (a, b, c2, d, r, g2, b2) => { const o = pos.length / 3; pos.push(...a, ...b, ...c2, ...d); for (let k = 0; k < 4; k++) cols.push(r, g2, b2); idx.push(o, o + 1, o + 2, o + 2, o + 1, o + 3); };
        const at = (i, e, lat, up) => { const p = P(i), q = P(i + 1); return e ? [q.x - q.dz * lat, p.ye + (up || 0), q.z + q.dx * lat] : [p.x - p.dz * lat, p.y + (up || 0), p.z + p.dx * lat]; };
        for (let i = 0; i < N; i++) { const p = path[i]; if (p.b > .7 && P(i + 1).b > .7) continue; const ramp = (i >= M.iA - 5 && i < M.iA) || (i >= M.iB - 4 && i < M.iB), s = (i % 2) ? .3 : .33;
          if (ramp) for (let k = 0; k < 8; k++) { const l0 = -HALF + k * HALF / 4, w = (k + i) % 2; quad(at(i, 0, l0), at(i, 0, l0 + HALF / 4), at(i, 1, l0), at(i, 1, l0 + HALF / 4), w ? 1 : .95, w ? .75 : .2, w ? .1 : .12); } else quad(at(i, 0, -HALF), at(i, 0, HALF), at(i, 1, -HALF), at(i, 1, HALF), s, s, s + .03);
          const red = Math.floor(i / 2) % 2; for (const sd of [-1, 1]) { quad(at(i, 0, sd * HALF, .05), at(i, 0, sd * (HALF + 1.3), .05), at(i, 1, sd * HALF, .05), at(i, 1, sd * (HALF + 1.3), .05), red ? .85 : .95, red ? .12 : .95, red ? .1 : .95); quad(at(i, 0, sd * (HALF + 1.3), .05), at(i, 0, sd * (HALF + 1.5), -.4), at(i, 1, sd * (HALF + 1.3), .05), at(i, 1, sd * (HALF + 1.5), -.4), .45, .38, .24); }
          if (i % 4 < 2 && !ramp) quad(at(i, 0, -.18, .04), at(i, 0, .18, .04), at(i, 1, -.18, .04), at(i, 1, .18, .04), .95, .95, .9);
          if (p.cliff) { const q = P(i - 1), top = q.ye; quad([p.x - q.dz * -(HALF + 1.5), top, p.z + q.dx * -(HALF + 1.5)], [p.x - q.dz * (HALF + 1.5), top, p.z + q.dx * (HALF + 1.5)], [p.x - q.dz * -(HALF + 1.5), p.y - .4, p.z + q.dx * -(HALF + 1.5)], [p.x - q.dz * (HALF + 1.5), p.y - .4, p.z + q.dx * (HALF + 1.5)], .5, .4, .3); } }
        for (let r = 0; r < 2; r++) for (let k = 0; k < 8; k++) { const l0 = -HALF + k * HALF / 4, w = (r + k) % 2, p = path[0], f = r * 1.4, a = [p.x - p.dz * l0 + p.dx * f, p.y + .06, p.z + p.dx * l0 + p.dz * f], b = [p.x - p.dz * (l0 + HALF / 4) + p.dx * f, p.y + .06, p.z + p.dx * (l0 + HALF / 4) + p.dz * f]; quad(a, b, [a[0] + p.dx * 1.4, a[1], a[2] + p.dz * 1.4], [b[0] + p.dx * 1.4, b[1], b[2] + p.dz * 1.4], w, w, w); }
        const g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T3.Float32BufferAttribute(cols, 3)); g.setIndex(idx); g.computeVertexNormals(); scene.add(new T3.Mesh(g, new T3.MeshLambertMaterial({ vertexColors: true, side: T3.DoubleSide }))); }
      // tunnel : un gros tuyau ; dedans, des anneaux de lumière de toutes les couleurs et des rampes lumineuses
      { const SEG = 24, pin = [], cin = [], pout = [], iin = [], ring = (i, e, rad, k) => { const p = P(i), q = P(i + 1), d = e ? q : p, y = (e ? p.ye : p.y) + RT, a = k / SEG * TAU, sn = Math.sin(a), cs = Math.cos(a); return [d.x - d.dz * rad * sn, y - rad * cs, d.z + d.dx * rad * sn]; };
        for (let i = M.i0; i < M.i1; i++) { if (path[i].b < .3 && P(i + 1).b < .3) continue; for (let k = 0; k < SEG; k++) { const o = pin.length / 3; pin.push(...ring(i, 0, RT + .12, k), ...ring(i, 0, RT + .12, k + 1), ...ring(i, 1, RT + .12, k), ...ring(i, 1, RT + .12, k + 1)); pout.push(...ring(i, 0, RT + .7, k), ...ring(i, 0, RT + .7, k + 1), ...ring(i, 1, RT + .7, k), ...ring(i, 1, RT + .7, k + 1));
            const lightRing = i % 3 === 0, strip = k % 6 === 0; if (lightRing) col.setHSL(((i - M.i0) * .045) % 1, 1, .58); else if (strip) col.setRGB(1, 1, .85); else col.setHSL(.68, .5, .1 + ((i + k) % 2) * .035); for (let q = 0; q < 4; q++) cin.push(col.r, col.g, col.b); iin.push(o, o + 1, o + 2, o + 2, o + 1, o + 3); } }
        const gi = new T3.BufferGeometry(); gi.setAttribute('position', new T3.Float32BufferAttribute(pin, 3)); gi.setAttribute('color', new T3.Float32BufferAttribute(cin, 3)); gi.setIndex(iin); scene.add(new T3.Mesh(gi, new T3.MeshBasicMaterial({ vertexColors: true, side: T3.DoubleSide, fog: false })));
        const go = new T3.BufferGeometry(); go.setAttribute('position', new T3.Float32BufferAttribute(pout, 3)); go.setIndex(iin); go.computeVertexNormals(); scene.add(new T3.Mesh(go, new T3.MeshLambertMaterial({ color: 0x2fae4e, side: T3.DoubleSide })));
        for (const i of [M.i0 + 1, M.i1 - 1]) { const p = path[i], rim = new T3.Mesh(new T3.TorusGeometry(RT + .7, 1, 10, 28), new T3.MeshLambertMaterial({ color: 0x23913f })); rim.position.set(p.x, p.y + RT, p.z); rim.rotation.y = p.ang; scene.add(rim); } }
      // décor : arbres, rochers, pneus et panneaux dans les virages
      { const spots = []; for (let k = 0; k < 900 && spots.length < 200; k++) { const x = (R() - .5) * 480, z = (R() - .5) * 480 + 20, r = groundAt(x, z); if (r.d > HALF + 8 && !(path[r.i].b > 0 && r.d < 22)) spots.push([x, r.y, z, .8 + R() * .9, R()]); }
        const trunk = new T3.InstancedMesh(new T3.CylinderGeometry(.35, .5, 2.4, 6), new T3.MeshLambertMaterial({ color: 0x7a4a21 }), spots.length), leaf = new T3.InstancedMesh(new T3.ConeGeometry(2.4, 5.2, 7), new T3.MeshLambertMaterial({ color: 0x2f9a48, flatShading: true }), spots.length), leaf2 = new T3.InstancedMesh(new T3.ConeGeometry(1.8, 4, 7), new T3.MeshLambertMaterial({ color: 0x46b85a, flatShading: true }), spots.length);
        spots.forEach((s, i) => { dummy.rotation.set(0, s[4] * 6, 0); dummy.scale.setScalar(s[3]); dummy.position.set(s[0], s[1] + 1.2 * s[3], s[2]); dummy.updateMatrix(); trunk.setMatrixAt(i, dummy.matrix); dummy.position.y = s[1] + 4.6 * s[3]; dummy.updateMatrix(); leaf.setMatrixAt(i, dummy.matrix); dummy.position.y = s[1] + 7 * s[3]; dummy.updateMatrix(); leaf2.setMatrixAt(i, dummy.matrix); }); scene.add(trunk, leaf, leaf2);
        const rocks = []; for (let k = 0; k < 300 && rocks.length < 40; k++) { const x = (R() - .5) * 460, z = (R() - .5) * 460 + 20, r = groundAt(x, z); if (r.d > HALF + 10) rocks.push([x, r.y, z, .5 + R() * 1.1, R()]); }
        const rk = new T3.InstancedMesh(new T3.DodecahedronGeometry(1, 0), new T3.MeshLambertMaterial({ color: 0x8d8f9c, flatShading: true }), rocks.length); rocks.forEach((s, i) => { dummy.rotation.set(s[4] * 3, s[4] * 6, 0); dummy.scale.set(s[3], s[3] * .7, s[3]); dummy.position.set(s[0], s[1] + .3, s[2]); dummy.updateMatrix(); rk.setMatrixAt(i, dummy.matrix); }); scene.add(rk);
        const tyres = [], signs = []; let lastS = -99; for (let i = 0; i < N; i += 2) { const a = path[i], b = P(i + 9); if (a.b > 0 || b.b > 0) continue; const turn = a.dx * b.dz - a.dz * b.dx; if (Math.abs(turn) > .3) { const side = turn > 0 ? -1 : 1; for (let k = 0; k < 3; k++) tyres.push([a.x - a.dz * side * (HALF + 2.6), a.y + .05 + k * .62, a.z + a.dx * side * (HALF + 2.6), (i + k) % 2]); if (i - lastS >= 10) { signs.push([i + 4, side, turn > 0 ? 1 : -1]); lastS = i; } } }
        const tm = new T3.InstancedMesh(new T3.CylinderGeometry(.95, .95, .6, 10), new T3.MeshLambertMaterial({ color: 0xffffff }), tyres.length); tyres.forEach((s, i) => { dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.position.set(s[0], s[1], s[2]); dummy.updateMatrix(); tm.setMatrixAt(i, dummy.matrix); tm.setColorAt(i, col.set(s[3] ? 0xd22b2b : 0xf2f2f2)); }); scene.add(tm);
        const tR = tex(128, 64, x => { x.fillStyle = '#ffd23f'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#1b1540'; for (const ox of [18, 62]) { x.beginPath(); x.moveTo(ox, 8); x.lineTo(ox + 30, 32); x.lineTo(ox, 56); x.lineTo(ox + 14, 32); x.closePath(); x.fill(); } }), tL = tR.clone(); tL.wrapS = T3.RepeatWrapping; tL.repeat.x = -1; tL.offset.x = 1; tL.needsUpdate = true;
        const sg = new T3.PlaneGeometry(4.4, 2.2), mR = new T3.MeshBasicMaterial({ map: tR, side: T3.DoubleSide }), mL = new T3.MeshBasicMaterial({ map: tL, side: T3.DoubleSide }), pm = new T3.MeshLambertMaterial({ color: 0x6b6b8f });
        for (const s of signs) { const p = P(s[0]), px = p.x - p.dz * s[1] * (HALF + 5), pz = p.z + p.dx * s[1] * (HALF + 5), m = new T3.Mesh(sg, s[2] > 0 ? mR : mL); m.position.set(px, p.y + 3.1, pz); m.rotation.y = Math.atan2(-p.dx, -p.dz); scene.add(m); const post = new T3.Mesh(new T3.CylinderGeometry(.14, .14, 2.2, 6), pm); post.position.set(px, p.y + 1.1, pz); scene.add(post); } }
      { // portique de départ, tribune, panneaux, montagnes, nuages
        const p = path[2], lm = new T3.MeshLambertMaterial({ color: 0xe8e8f0 }); for (const sd of [-1, 1]) { const po = new T3.Mesh(new T3.BoxGeometry(.8, 9, .8), lm); po.position.set(p.x - p.dz * sd * (HALF + 2), p.y + 4.5, p.z + p.dx * sd * (HALF + 2)); scene.add(po); }
        const bm = new T3.MeshBasicMaterial({ map: label('DÉPART', 512, 64, '#e8452c', '#fff') }), ban = new T3.Mesh(new T3.BoxGeometry(HALF * 2 + 5, 2.4, .5), [lm, lm, lm, lm, bm, bm]); ban.position.set(p.x, p.y + 8, p.z); ban.rotation.y = p.ang; scene.add(ban);
        const q = P(-6), gx = q.x - q.dz * (HALF + 13), gz = q.z + q.dx * (HALF + 13), gy = groundAt(gx, gz).y, grp = new T3.Group(); for (let k = 0; k < 4; k++) { const st = new T3.Mesh(new T3.BoxGeometry(34, 1.4, 2.4), new T3.MeshLambertMaterial({ color: k % 2 ? 0x7c5cff : 0x5ad1ff })); st.position.set(0, .7 + k * 1.4, k * 2.4); grp.add(st); }
        const crowd = new T3.InstancedMesh(new T3.SphereGeometry(.55, 6, 5), new T3.MeshLambertMaterial({ color: 0xffffff }), 100); for (let k = 0; k < 100; k++) { const r = Math.floor(k / 25); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.position.set(-16 + (k % 25) * 1.33 + (r % 2) * .6, 2 + r * 1.4, r * 2.4); dummy.updateMatrix(); crowd.setMatrixAt(k, dummy.matrix); crowd.setColorAt(k, col.set([0xff4f9a, 0xffd23f, 0x38e0d6, 0x9dff5c, 0xff9f1c, 0xffffff][(k * 7) % 6])); } grp.add(crowd); grp.position.set(gx, gy, gz); grp.lookAt(q.x, gy, q.z); grp.rotateY(Math.PI); scene.add(grp);
        const ADS = [['TURBO', '#38a0e0'], ['KART 3D', '#e8452c'], ['ZIP !', '#ffd23f'], ['NITRO', '#3fbf4f'], ['GO GO', '#9b7bff']]; let an = 0; for (let i = 22; i < N - 14; i += 29) { const a = path[i]; if (a.b > 0) continue; const sd2 = (an % 2) ? 1 : -1, ad = ADS[an++ % ADS.length], bx = a.x - a.dz * sd2 * (HALF + 6.5), bz = a.z + a.dx * sd2 * (HALF + 6.5), by = groundAt(bx, bz).y, m = new T3.Mesh(new T3.PlaneGeometry(11, 3), new T3.MeshBasicMaterial({ map: label(ad[0], 512, 140, ad[1], ad[1] === '#ffd23f' ? '#1b1540' : '#fff'), side: T3.DoubleSide })); m.position.set(bx, by + 2.6, bz); m.lookAt(a.x, by + 2.6, a.z); scene.add(m); }
        const mm = new T3.MeshLambertMaterial({ color: 0x7f8fb0, flatShading: true }), snow = new T3.MeshLambertMaterial({ color: 0xffffff, flatShading: true }); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, r = 380 + R() * 60, hgt = 90 + R() * 90, c1 = new T3.Mesh(new T3.ConeGeometry(70 + R() * 50, hgt, 6), mm); c1.position.set(Math.cos(a) * r, hgt / 2 - 12, Math.sin(a) * r + 20); c1.rotation.y = R() * 6; scene.add(c1); const c2 = new T3.Mesh(new T3.ConeGeometry(22, hgt * .3, 6), snow); c2.position.set(c1.position.x, hgt * .85 - 12 + .5, c1.position.z); c2.rotation.y = c1.rotation.y; scene.add(c2); }
        const cm = new T3.MeshBasicMaterial({ color: 0xffffff, fog: false }); for (let k = 0; k < 14; k++) { const g = new T3.Group(); for (let j = 0; j < 4; j++) { const s = new T3.Mesh(new T3.SphereGeometry(10 + R() * 9, 7, 5), cm); s.position.set(j * 13 - 20, R() * 5, R() * 8); s.scale.y = .55; g.add(s); } g.position.set((R() - .5) * 900, 130 + R() * 70, (R() - .5) * 900); scene.add(g); } }
      // --- ce qu'il y a sur la piste : turbos, pièces, caisses à objets, blocs de pierre, tonneaux, flaques d'huile
      const put = (obj, s, lat, h) => { const f = frame(s, lat); obj.position.copy(f.pos).addScaledVector(f.up, h || 0); const zAx = f.tan.clone(), xAx = new T3.Vector3().crossVectors(f.up, zAx).normalize(), yAx = new T3.Vector3().crossVectors(zAx, xAx); obj.quaternion.setFromRotationMatrix(new T3.Matrix4().makeBasis(xAx, yAx, zAx)); };
      { const tx = tex(128, 128, x => { x.fillStyle = '#ff9f1c'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#ffe14d'; for (const oy of [10, 68]) { x.beginPath(); x.moveTo(64, oy); x.lineTo(118, oy + 44); x.lineTo(86, oy + 44); x.lineTo(64, oy + 26); x.lineTo(42, oy + 44); x.lineTo(10, oy + 44); x.closePath(); x.fill(); } }), pm = new T3.MeshBasicMaterial({ map: tx, side: T3.DoubleSide, fog: false });
        for (const [f, lat] of [[.26, 0], [.615, 0], [.615, 5], [.615, -5], [.86, -3], [.12, 3]]) { const s = F(f), m = new T3.Mesh(new T3.PlaneGeometry(4.6, 7), pm); m.rotation.x = Math.PI / 2; const hold = new T3.Group(); hold.add(m); put(hold, s, lat, .1); scene.add(hold); pads.push({ s, lat }); } }
      { const cg = new T3.CylinderGeometry(.75, .75, .16, 16), cmat = new T3.MeshLambertMaterial({ color: 0xffc61a, emissive: 0x7a5200 }); const line = (f, lats) => lats.forEach((lat, k) => { const s = F(f) + k * 2, m = new T3.Mesh(cg, cmat), hold = new T3.Group(); m.rotation.order = 'YXZ'; m.rotation.x = Math.PI / 2; hold.add(m); put(hold, s, lat, 1.1); scene.add(hold); coins.push({ s, lat, m, hold, on: true, t: 0 }); });
        line(.06, [-3, -3, -3, -3]); line(.2, [4, 2, 0, -2, -4]); line(.36, [0, 0, 0, 0]); line(.5, [0, 5, 10, 15, 20, 25]); line(.7, [-4, -4, -4, 4, 4, 4]); line(.9, [3, 1, -1, -3]); }
      { const qt = tex(64, 64, x => { const g = x.createLinearGradient(0, 0, 64, 64); g.addColorStop(0, '#ff4f9a'); g.addColorStop(.5, '#ffd23f'); g.addColorStop(1, '#38e0d6'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); x.fillStyle = '#fff'; x.font = '900 48px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', 32, 35); }), bm = new T3.MeshBasicMaterial({ map: qt, transparent: true, opacity: .9 }), bg = new T3.BoxGeometry(1.7, 1.7, 1.7);
        for (const f of [.15, .41, .78]) for (const l of [-.66, -.22, .22, .66]) { const s = F(f), m = new T3.Mesh(bg, bm), hold = new T3.Group(); hold.add(m); put(hold, s, l * HALF, 1.4); scene.add(hold); boxes.push({ s, lat: l * HALF, m, hold, off: 0 }); } }
      { // blocs de pierre qui montent et s'écrasent : il faut passer quand ils sont levés
        const face = tex(128, 128, x => { x.fillStyle = '#8b93a8'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#5b6276'; x.lineWidth = 8; x.strokeRect(4, 4, 120, 120); x.fillStyle = '#1b1540'; x.beginPath(); x.moveTo(22, 40); x.lineTo(54, 54); x.lineTo(54, 66); x.lineTo(22, 60); x.fill(); x.beginPath(); x.moveTo(106, 40); x.lineTo(74, 54); x.lineTo(74, 66); x.lineTo(106, 60); x.fill(); x.fillRect(30, 86, 68, 14); x.fillStyle = '#fff'; for (let k = 0; k < 5; k++) x.fillRect(34 + k * 13, 86, 8, 8); }), fm = new T3.MeshLambertMaterial({ map: face }), sm = new T3.MeshLambertMaterial({ color: 0x7c8499 }), bg = new T3.BoxGeometry(4.6, 4.2, 2.6), pm = new T3.MeshLambertMaterial({ color: 0x5b6276 });
        for (const [f, ph] of [[.215, 0], [.82, 1.3]]) { const s = F(f), gate = { s, lanes: [] }; for (let k = 0; k < 3; k++) { const lat = (k - 1) * 5.3, m = new T3.Mesh(bg, [sm, sm, sm, sm, fm, fm]), hold = new T3.Group(), shd = new T3.Mesh(new T3.PlaneGeometry(4.6, 2.6), new T3.MeshBasicMaterial({ color: 0, transparent: true, opacity: .35, depthWrite: false })); shd.rotation.x = -Math.PI / 2; shd.position.y = .08; hold.add(m, shd); put(hold, s, lat, 0); scene.add(hold); gate.lanes.push({ lat, m, shd, ph: ph + k * 1.15, h: 5 }); }
          for (const sd of [-1, 1]) { const po = new T3.Mesh(new T3.BoxGeometry(1, 11, 1), pm), h2 = new T3.Group(); po.position.y = 5.5; h2.add(po); put(h2, s, sd * (HALF + 1.2), 0); scene.add(h2); } const beam = new T3.Mesh(new T3.BoxGeometry(HALF * 2 + 3.4, 1, 1.2), pm), hb = new T3.Group(); beam.position.y = 10.6; hb.add(beam); put(hb, s, 0, 0); scene.add(hb); crushers.push(gate); } }
      { const bg = new T3.CylinderGeometry(1.1, 1.1, 2.4, 12), bmat = new T3.MeshLambertMaterial({ color: 0xa5642a }), ring = new T3.MeshLambertMaterial({ color: 0x4a2f14 });
        for (const [f, ph] of [[.705, 0], [.735, 2.2], [.1, 1]]) { const hold = new T3.Group(), m = new T3.Mesh(bg, bmat); m.rotation.x = Math.PI / 2; for (const o of [-.7, .7]) { const r = new T3.Mesh(new T3.CylinderGeometry(1.14, 1.14, .2, 12), ring); r.position.y = o; m.add(r); } hold.add(m); scene.add(hold); barrels.push({ s: F(f), ph, hold, m, lat: 0 }); } }
      const oilG = new T3.CircleGeometry(1.5, 14), oilM = new T3.MeshBasicMaterial({ color: 0x15102e, transparent: true, opacity: .85, depthWrite: false });
      const addOil = (s, lat) => { const m = new T3.Mesh(oilG, oilM), hold = new T3.Group(); m.rotation.x = -Math.PI / 2; hold.add(m); put(hold, s, lat, .09); scene.add(hold); oils.push({ s, lat, hold }); }; build.addOil = addOil;
      for (const [f, l] of [[.555, 9], [.57, -12], [.94, 2], [.945, -4]]) addOil(F(f), l);
      // karts et pilotes
      if (!K3D_GEO) K3D_GEO = { wheel: geoFrom(K3D_MODELS.wheel), body: geoFrom(K3D_MODELS.karts[0].body) };
      const km = new T3.MeshLambertMaterial({ vertexColors: true }), shG = new T3.CircleGeometry(1.5, 16), shM = new T3.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .3, depthWrite: false }), SC = 2.6, mine = (env.profile.name ? env.profile.name.length : 0) % 5, COLS = [0xe8322a, 0x2f7de0, 0x33b24a, 0xffc61a];
      for (let k = 0; k < 4; k++) {
        const kind = (mine + k) % 5, g = new T3.Group(), tilt = new T3.Group(), body = new T3.Mesh(tinted(K3D_GEO.body, COLS[k]), km), drv = animal(kind, COLS[k]); drv.position.fromArray(K3D_MODELS.charPos); drv.position.y -= .06; drv.scale.setScalar(1.15); tilt.add(body, drv);
        const wheels = K3D_MODELS.wheelPos.map(wp => { const h = new T3.Group(), w = new T3.Mesh(K3D_GEO.wheel, km); h.position.fromArray(wp); h.add(w); tilt.add(h); return { h, w, front: wp[2] > 0 }; });
        tilt.scale.setScalar(SC); g.add(tilt); const sh = new T3.Mesh(shG, shM); sh.rotation.x = -Math.PI / 2; sh.position.y = .06; sh.scale.set(1, 1.3, 1); const shHold = new T3.Group(); shHold.add(sh); scene.add(shHold); const aura = new T3.Mesh(new T3.SphereGeometry(1.9, 12, 8), new T3.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: .35, depthWrite: false })); aura.position.y = 1; aura.visible = false; g.add(aura); scene.add(g);
        const row = Math.floor(k / 2), lat0 = (k % 2 ? 1 : -1) * HALF * .42;
        karts.push({ g, tilt, wheels, drv, shHold, aura, me: k === 0, name: k === 0 ? env.profile.name : K3D_ANIMALS[kind][0], s: N - 4 - row * 3.5, lat: lat0, psi: 0, v: 0, steer: 0, lap: -1, done: 0, boost: 0, off: false, base: [1, .9, .96, 1.02][k] * (tier === 0 ? .86 : tier === 1 ? .95 : 1.02), skill: 1, lane: lat0, laneT: 0, crash: 0, squash: 0, spin: 0, lean: 0, bump: 0, wy: 0, vy: 0, vg: 0, air: false, gy: 0, coins: 0, item: null, itemT: 0, star: 0, slowT: 0, rank: k + 1, started: false }); karts[k].skill = karts[k].base;
      }
      for (const k of karts) { k.gy = frame(k.s, k.lat).gy; k.wy = k.gy; } place(0);
    }
    const progress = k => k.lap * N + k.s + (k.done ? 1e6 - k.done : 0);
    const X3 = () => place.x || (place.x = { x: new T3.Vector3(), y: new T3.Vector3(), z: new T3.Vector3(), m: new T3.Matrix4(), f: {} });
    function basis(k, o) { const f = frame(k.s, k.lat, o.f); o.z.copy(f.tan).multiplyScalar(Math.cos(k.psi)).addScaledVector(f.right, Math.sin(k.psi)).normalize(); o.x.crossVectors(f.up, o.z).normalize(); o.y.crossVectors(o.z, o.x); return f; }
    function place(dt) {
      const o = X3();
      for (const k of karts) { const f = basis(k, o), lift = k.air ? Math.max(0, k.wy - f.gy) : 0; k.g.position.copy(f.pos); k.g.position.y += lift; k.g.quaternion.setFromRotationMatrix(o.m.makeBasis(o.x, o.y, o.z)); if (k.spin > 0) k.g.rotateY(k.spin * 12);
        k.shHold.position.copy(f.pos); k.shHold.quaternion.copy(k.g.quaternion); k.shHold.scale.setScalar(clamp(1 - lift * .06, .35, 1));
        const sq = k.squash > 0 ? Math.min(1, k.squash * 3) : 0; k.tilt.scale.set(2.6 * (1 + sq * .35), 2.6 * (1 - sq * .72), 2.6 * (1 + sq * .35));
        k.tilt.rotation.set(k.air ? clamp(-k.vy * .02, -.35, .35) : 0, 0, k.lean + Math.sin(k.bump) * .03 * (k.off ? 1 : 0)); k.tilt.position.y = k.off ? Math.abs(Math.sin(k.bump)) * .12 : 0; k.aura.visible = k.star > 0; if (k.star > 0) k.aura.material.color.setHSL((t * 2) % 1, 1, .6);
        for (const w of k.wheels) { w.w.rotation.x += k.v * dt * 1.6; if (w.front) w.h.rotation.y = -k.steer * .45; } }
    }
    // ---------- son : un souffle de vent qui suit la vitesse et un ronron très doux (pas de bourdon aigu) ----------
    function engine(v, boost) {
      const ac = sfx.ctx && sfx.ctx(); if (!ac) return;
      if (!audio) { try { const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); let last = 0; for (let i = 0; i < len; i++) { last = last * .96 + (Math.random() * 2 - 1) * .04; d[i] = last * 6; } for (let i = 0; i < 2000; i++) { const k = i / 2000; d[i] = d[i] * k + d[len - 2000 + i] * (1 - k); }
          const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; src.loopEnd = (len - 2000) / ac.sampleRate; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = .5; const gw = ac.createGain(); gw.gain.value = 0; src.connect(bp); bp.connect(gw); gw.connect(ac.destination); src.start();
          const o = ac.createOscillator(), lp = ac.createBiquadFilter(), go = ac.createGain(); o.type = 'triangle'; o.frequency.value = 50; lp.type = 'lowpass'; lp.frequency.value = 180; go.gain.value = 0; o.connect(lp); lp.connect(go); go.connect(ac.destination); o.start(); audio = { ac, src, bp, gw, o, go }; } catch (e) { return; } }
      const now = audio.ac.currentTime, r = clamp(v / VMAX, 0, 1.5);
      audio.bp.frequency.setTargetAtTime(300 + r * 700 + (boost ? 250 : 0), now, .15); audio.o.frequency.setTargetAtTime(42 + r * 38, now, .12);
      for (const [g, vol] of [[audio.gw, r * r * .05 + (boost ? .02 : 0)], [audio.go, .012 + r * .018]]) { g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(vol, now, .08); g.gain.setTargetAtTime(0, now + .3, .1); } // en pause, le son s'éteint tout seul
    }
    function stop() { if (audio) { try { audio.src.stop(); audio.o.stop(); audio.gw.disconnect(); audio.go.disconnect(); } catch (e) { } audio = null; } if (renderer) { try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) { } renderer = null; } }
    // ---------- conduite ----------
    function wreck(k, why, squash) { if (k.star > 0 || k.crash > 0 || k.safe > 0) return; k.crash = squash ? 1.5 : 1.1; k.safe = k.crash + 1.6; /* un petit moment d'immunité pour repartir */ if (squash) k.squash = 1.5; else k.spin = 1.1; k.v *= squash ? 0 : .3; if (k.me) { sfx.hit(); env.vibe(squash ? 200 : 120); shake = .4; say(why, 1.2); } }
    function drive(k, dt, steerIn, brake) {
      k.boost = Math.max(0, k.boost - dt); k.safe = Math.max(0, (k.safe || 0) - dt); k.crash = Math.max(0, k.crash - dt); k.squash = Math.max(0, k.squash - dt); k.spin = Math.max(0, k.spin - dt); k.star = Math.max(0, k.star - dt); k.slowT = Math.max(0, k.slowT - dt);
      let i = ((Math.floor(k.s) % N) + N) % N, u = k.s - Math.floor(k.s); const p0 = path[i], tube = p0.b > .5; k.off = !tube && !k.air && Math.abs(k.lat) > HALF + .6;
      const top = VMAX * k.skill * (k.off && k.star <= 0 ? .55 : 1) * (k.boost > 0 ? 1.35 : 1) * (k.star > 0 ? 1.2 : 1) * (k.slowT > 0 ? .6 : 1) * (1 + Math.min(10, k.coins) * .006);
      if (k.crash > 0) { k.v = Math.max(0, k.v - 40 * dt); steerIn = 0; } else if (brake) k.v = Math.max(0, k.v - 30 * dt); else if (k.v < top) k.v = Math.min(top, k.v + (k.boost > 0 ? 28 : 13) * dt); else k.v = Math.max(top, k.v - 20 * dt);
      k.steer += (steerIn - k.steer) * Math.min(1, dt * 9); const grip = clamp(k.v / 8, 0, 1) * (1.9 - clamp(k.v / VMAX, 0, 1) * .55) * (k.air ? .35 : 1);
      k.psi += k.steer * grip * dt;
      let rem = k.v * Math.cos(k.psi) * dt; while (rem > 0) { const seg = path[i], left = (1 - u) * seg.len; if (rem < left) { u += rem / seg.len; rem = 0; } else { rem -= left; i = (i + 1) % N; u = 0; k.psi += wrapA(path[i].ang - seg.ang); if (i === 0) { k.lap++; if (k.lap >= LAPS && !k.done) { k.done = raceT; if (k.me) finish(); } else if (k.me && k.lap > 0) { say(k.lap === LAPS - 1 ? 'Dernier tour !' : 'Tour ' + (k.lap + 1) + ' / ' + LAPS, 1.6); sfx.ok(); } } } }
      k.s = i + u; k.lat += k.v * Math.sin(k.psi) * dt; k.psi = clamp(k.psi, -1.1, 1.1);
      const p = path[i], bNow = p.b + (P(i + 1).b - p.b) * u;
      if (bNow <= 0) { const lim = HALF + 11; if (Math.abs(k.lat) > lim) { k.lat = Math.sign(k.lat) * lim; k.psi += -Math.sign(k.lat) * dt * 2.5; k.v *= 1 - dt * 1.5; } } // barrière invisible : on ne part pas dans le décor
      else if (bNow < 1) { const c = TAU * RT; k.lat = ((k.lat + c / 2) % c + c) % c - c / 2; if (P(i + 1).b < p.b && Math.abs(k.lat) > HALF * .7) k.lat -= Math.sign(k.lat) * Math.min(Math.abs(k.lat) - HALF * .7, dt * 34); } // à la sortie du tube, on redescend sur la route
      // hauteur : on suit la route ; si elle se dérobe plus vite que la chute (sommet d'un tremplin, falaise), on vole
      const gy = p.y + (p.ye - p.y) * u, vg = (gy - k.gy) / Math.max(dt, .001);
      if (!k.air) { if (bNow < .5 && vg < k.vg - GRAV * dt - 3) { k.air = true; k.vy = Math.max(-2, k.vg); k.wy = k.gy + k.vy * dt; if (k.me && k.vy > 3) { sfx.jump(); if (k.gy - gy > 6) say('GRAND SAUT !', 1.4); } } else k.vg = clamp(vg, -30, 30); }
      else { k.vy -= GRAV * dt; k.wy += k.vy * dt; if (k.wy <= gy) { k.air = false; k.vg = 0; if (k.me) { if (k.vy < -9) { shake = .3; env.vibe(60); sfx.pop(); } } } }
      if (!k.air) k.wy = gy; k.gy = gy;
      k.lean += (k.steer * clamp(k.v / VMAX, 0, 1) * .16 - k.lean) * Math.min(1, dt * 8); k.bump += dt * k.v * (k.off ? 1.3 : 0);
      if (k.air && k.wy - gy > 1.2) return; // en l'air, on ne touche à rien
      const near = (o, ds, dl) => { let d = o.s - k.s; if (d > N / 2) d -= N; if (d < -N / 2) d += N; return Math.abs(d) * 4 < ds && Math.abs(o.lat - k.lat) < dl; };
      for (const pd of pads) if (k.boost < .9 && near(pd, 3.6, 2.6)) { k.boost = 1.7; if (k.me) { sfx.jump(); say('TURBO !', .8); env.vibe(40); } }
      for (const c of coins) if (c.on && near(c, 2.2, 1.7)) { c.on = false; c.t = 6; c.hold.visible = false; k.coins++; if (k.me) sfx.coin(); }
      for (const b of boxes) if (b.off <= 0 && near(b, 2.2, 1.9)) { b.off = 4; b.hold.visible = false; if (!k.item) { const r = k.rank, pool = r === 1 ? ['oil', 'oil', 'turbo', 'star'] : r === 2 ? ['turbo', 'missile', 'oil', 'missile'] : ['missile', 'turbo', 'turbo', 'star', 'bolt', 'missile']; k.item = pick(pool); k.itemT = rnd(1.5, 4); if (k.me) { sfx.ok(); say(K3D_ITEMS[k.item][0] + ' !', 1); } } }
      for (const g of crushers) for (const l of g.lanes) if (l.h < 2.3 && near({ s: g.s, lat: l.lat }, 1.9, 2.9)) wreck(k, 'Écrasé !', true);
      for (const b of barrels) if (near(b, 1.9, 1.9)) wreck(k, 'Un tonneau !');
      for (let j = oils.length - 1; j >= 0; j--) if (near(oils[j], 1.6, 1.6) && k.crash <= 0 && k.star <= 0 && oils[j].by !== k) { wreck(k, 'Ça glisse !'); if (oils[j].by) { scene.remove(oils[j].hold); oils.splice(j, 1); } }
    }
    function useItem(k) {
      const it = k.item; if (!it) return; k.item = null;
      if (it === 'turbo') { k.boost = 2.2; if (k.me) sfx.jump(); }
      else if (it === 'star') { k.star = 6; k.crash = 0; k.squash = 0; k.spin = 0; if (k.me) sfx.win(); }
      else if (it === 'oil') { build.addOil(((k.s - 1.2) % N + N) % N, k.lat); oils[oils.length - 1].by = k; if (k.me) sfx.pop(); }
      else if (it === 'bolt') { for (const o of karts) if (o !== k && o.star <= 0) o.slowT = 3; flash = .25; if (k.me) sfx.hit(); else if (!karts[0].done) say('Éclair de ' + k.name + ' !', 1.2); }
      else if (it === 'missile') { const m = new T3.Mesh(new T3.ConeGeometry(.5, 1.8, 8), new T3.MeshBasicMaterial({ color: 0xff3b3b })); m.rotation.x = Math.PI / 2; const hold = new T3.Group(); hold.add(m); scene.add(hold); missiles.push({ s: k.s + .8, lat: k.lat, by: k, hold, life: 5 }); if (k.me) sfx.punch(); }
      if (k.me) env.vibe(30);
    }
    function aiSteer(k, dt, keep) {
      if (keep != null) k.lane = keep; else { k.laneT -= dt; if (k.laneT <= 0) { k.laneT = rnd(2, 5); k.lane = rnd(-.5, .5) * HALF; }
        for (const g of crushers) { let d = g.s - k.s; if (d < 0) d += N; if (d < 16 && d > .3) { const eta = d * 4 / Math.max(6, k.v); let best = g.lanes[0], bh = -1; for (const l of g.lanes) { const h = crushH(t + eta, l.ph); if (h > bh) { bh = h; best = l; } } k.lane = best.lat; if (bh < 2.5 && d < 5) return { s: 0, brake: true }; } } }
      const i = Math.floor(k.s) % N, want = clamp((k.lane - k.lat) / (5 + k.v * .22), -.55, .55), turn = wrapA(P(i + 2).ang - path[i].ang) / (2 * 4) * k.v, grip = Math.max(.3, clamp(k.v / 8, 0, 1) * (1.9 - clamp(k.v / VMAX, 0, 1) * .55));
      let ahead = 0; for (let j = 2; j < 11; j++) ahead += Math.abs(wrapA(P(i + j + 1).ang - P(i + j).ang));
      return { s: clamp((want - k.psi) * 5 - turn / grip, -1, 1), brake: ahead > .95 && k.v > VMAX * .74 };
    }
    const crushH = (tt, ph) => { const c = ((tt + ph) % 3.4 + 3.4) % 3.4; return c < 1.7 ? 5 : c < 1.95 ? 5 * (1 - (c - 1.7) / .25) : c < 2.85 ? 0 : 5 * (c - 2.85) / .55; };
    function finish() { phase = 'end'; finishT = 0; sfx.win(); }
    function update(dt) {
      if (over || fail) return; frames++; if (frames > 40) { if (dt > .027) slow++; else slow = Math.max(0, slow - 1); if (slow > 45 && ratio > .5) { ratio = Math.max(.5, ratio - .17); slow = 0; } } dt = Math.min(dt, .05); t += dt; msgT = Math.max(0, msgT - dt); shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt); const me = karts[0], ptr = input.pointer, tp = input.tap;
      // doigt sur l'écran : on glisse pour tourner, on tape pour lancer l'objet (ou changer de vue sur le bouton jaune)
      let useNow = input.pressed.a; if (tp) { if (vbox && tp.x > vbox.x && tp.x < vbox.x + vbox.w && tp.y > vbox.y && tp.y < vbox.y + vbox.h) { view = (view + 1) % 3; S.k3dView[env.profile.id] = view; save(); sfx.tap(); say('Vue : ' + VIEWS[view], 1); } else useNow = true; }
      let steer = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0); if (!steer && ptr.down && !(vbox && ptr.y < vbox.y + vbox.h + 6 && ptr.x < vbox.x + vbox.w + 6)) steer = clamp((ptr.x - env.W / 2) / (env.W * .27), -1, 1);
      // ce qui bouge tout seul sur la piste
      for (const g of crushers) for (const l of g.lanes) { const h = crushH(t, l.ph); if (l.h > .2 && h <= .2 && Math.abs(g.s - me.s) < 14) { sfx.hit(); if (Math.abs(g.s - me.s) < 6) shake = .2; } l.h = h; l.m.position.y = 2.1 + h; l.shd.material.opacity = .15 + (1 - h / 5) * .3; }
      for (const b of barrels) { b.lat = Math.sin(t * 1.25 + b.ph) * HALF * .85; const f = frame(b.s, b.lat); b.hold.position.copy(f.pos).addScaledVector(f.up, 1.1); b.hold.rotation.y = path[b.s].ang; b.m.rotation.y = -b.lat * .9; }
      for (const c of coins) { if (!c.on) { c.t -= dt; if (c.t <= 0) { c.on = true; c.hold.visible = true; } } else c.m.rotation.y = t * 3 + c.s; }
      for (const b of boxes) { if (b.off > 0) { b.off -= dt; if (b.off <= 0) b.hold.visible = true; } b.m.rotation.set(t * 1.3, t * 1.7, 0); b.m.position.y = Math.sin(t * 3 + b.s) * .2; }
      if (phase === 'count') { count -= dt; const c = Math.ceil(count); if (c !== lastCount && c >= 0 && c <= 3) { lastCount = c; if (c > 0) sfx.tick(); else sfx.ok(); } if (count <= 0) { phase = 'race'; say('PARTEZ !', 1); } }
      if (phase !== 'count') {
        raceT += dt;
        for (const k of karts) {
          if (k.me && !k.done && !auto) { let st = steer; if (tier === 0) st = clamp(steer + aiSteer(k, dt, clamp(k.lat, -HALF * .6, HALF * .6)).s * .5, -1, 1); drive(k, dt, st, input.held.b); if (useNow) { if (k.item) useItem(k); } } // les petits sont aidés : le kart revient doucement dans l'axe
          else { const ai = aiSteer(k, dt); if (!k.me) { const gap = progress(me) - progress(k); k.skill += (k.base * (k.done ? .8 : 1 + clamp(gap / 60, -.07, .1)) - k.skill) * dt; } drive(k, dt, ai.s, ai.brake); if (k.item) { k.itemT -= dt; if (k.itemT <= 0) useItem(k); } } // les adversaires attendent un peu le joueur, ou le rattrapent
        }
        for (let i = 0; i < karts.length; i++) for (let j = i + 1; j < karts.length; j++) { const a = karts[i], b = karts[j]; let ds = (b.s - a.s); if (ds > N / 2) ds -= N; if (ds < -N / 2) ds += N; ds *= 4; const dl = b.lat - a.lat, d = Math.hypot(ds, dl); if (d < 2.3 && d > .01 && Math.abs(a.wy - b.wy) < 1.5) { const push = (2.3 - d) / 2 * (dl >= 0 ? 1 : -1); a.lat -= push; b.lat += push; if (a.star > 0 && b.star <= 0) wreck(b, 'Bousculé !'); else if (b.star > 0 && a.star <= 0) wreck(a, 'Bousculé !'); else if ((a.me || b.me) && shake <= 0) { shake = .2; sfx.hit(); env.vibe(30); } } }
        for (let j = missiles.length - 1; j >= 0; j--) { const m = missiles[j]; m.life -= dt; m.s = (m.s + (VMAX * 1.9) * dt / 4) % N; let tg = null, bd = 1e9; for (const k of karts) if (k !== m.by && !k.done) { let d = k.s - m.s; if (d < -2) d += N; if (d < bd) { bd = d; tg = k; } } if (tg) m.lat += clamp(tg.lat - m.lat, -14 * dt, 14 * dt); const f = frame(m.s, m.lat); m.hold.position.copy(f.pos).addScaledVector(f.up, 1); m.hold.rotation.y = P(Math.floor(m.s)).ang;
          let hit = null; for (const k of karts) if (k !== m.by) { let d = k.s - m.s; if (d > N / 2) d -= N; if (d < -N / 2) d += N; if (Math.abs(d) * 4 < 2.4 && Math.abs(k.lat - m.lat) < 2) hit = k; } if (hit) { wreck(hit, 'Touché par ' + m.by.name + ' !'); if (m.by.me) { sfx.pop(); say('Touché !', 1); } } if (hit || m.life <= 0) { scene.remove(m.hold); missiles.splice(j, 1); } }
        const order = karts.slice().sort((a, b) => progress(b) - progress(a)); order.forEach((k, i) => { k.rank = i + 1; });
        if (phase === 'end') { finishT += dt; if (finishT > 3.2) { over = true; const pts = [1000, 650, 400, 250][me.rank - 1] + me.coins * 5 + Math.max(0, Math.round(120 - raceT)); stop(); env.gameOver(pts, { win: me.rank === 1, title: me.rank === 1 ? 'Victoire !' : me.rank + 'e sur 4', text: 'Course en ' + Math.floor(raceT / 60) + ' min ' + String(Math.floor(raceT % 60)).padStart(2, '0') + ' s · ' + me.coins + ' pièces' }); return; } }
      }
      place(dt); engine(me.v, me.boost > 0);
      // caméra : derrière le kart et bien au-dessus ; elle suit son « haut », donc dans le tunnel le monde tourne avec lui
      const o = X3(), f = basis(me, o), lift = me.air ? Math.max(0, me.wy - f.gy) : 0, port = env.H > env.W, sp = clamp(me.v / VMAX, 0, 1.4); me.drv.visible = view !== 2;
      camF.lerp(o.z, Math.min(1, dt * 5)).normalize(); camU.lerp(f.b > 0 ? o.y : new T3.Vector3(0, 1, 0), Math.min(1, dt * 6)).normalize(); camera.up.copy(camU); const px = f.pos.x, py = f.pos.y + lift, pz = f.pos.z;
      if (view === 2) { camera.position.set(px, py, pz).addScaledVector(o.z, .75).addScaledVector(camU, 1.45); camera.lookAt(px + o.z.x * 12 + camU.x * 1.1, py + o.z.y * 12 + camU.y * 1.1, pz + o.z.z * 12 + camU.z * 1.1); camera.fov += (((port ? 88 : 72) + sp * 8 + (me.boost > 0 ? 8 : 0)) - camera.fov) * Math.min(1, dt * 4); }
      else { const hi = view === 1, tube = f.b > .5, back = (port ? 10.5 : 9) * (hi ? 1.5 : 1) + me.v * .05, up = tube ? Math.min(port ? 5 : 4.4, RT * .8) * (hi ? 1.25 : 1) : (port ? 6.8 : 5.6) * (hi ? 1.9 : 1);
        camera.position.set(px, py, pz).addScaledVector(camF, -back).addScaledVector(camU, up); if (shake > 0) camera.position.x += rnd(-.15, .15); if (!tube) { const gy2 = frame(me.s - back / 4, me.lat).gy; camera.position.y = Math.max(camera.position.y, gy2 + 2); }
        camera.lookAt(px + o.z.x * (hi ? 10 : 7) + camU.x * 1.2, py + o.z.y * (hi ? 10 : 7) + camU.y * 1.2, pz + o.z.z * (hi ? 10 : 7) + camU.z * 1.2); camera.fov += (((port ? 78 : 62) + sp * 9 + (me.boost > 0 ? 8 : 0)) - camera.fov) * Math.min(1, dt * 4); }
      env.setScore(Math.max(0, [1000, 650, 400, 250][me.rank - 1] + me.coins * 5)); env.hud('Tour ' + clamp(me.lap + 1, 1, LAPS) + '/' + LAPS + ' · ' + me.rank + (me.rank === 1 ? 'er' : 'e'));
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
      if (flash > 0) { c.fillStyle = 'rgba(255,255,255,' + flash * 2.4 + ')'; c.fillRect(0, 0, W, H); }
      if (me.boost > 0 || me.star > 0) { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; for (let i = 0; i < 14; i++) { const a = i * 2.4 + t * 3, r0 = Math.min(W, H) * (.34 + (i * 37 % 10) * .02), r1 = r0 + 30 + (i % 3) * 24; c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * r0 * 1.5, H * .52 + Math.sin(a) * r0); c.lineTo(W / 2 + Math.cos(a) * r1 * 1.5, H * .52 + Math.sin(a) * r1); c.stroke(); } }
      // tableau de bord : rang, vue, tour, pièces, objet, carte, vitesse
      c.fillStyle = 'rgba(23,18,58,.8)'; Draw.rr(c, 10, 10, 92, 62, 14); c.fill(); Draw.text(c, me.rank + (me.rank === 1 ? 'er' : 'e'), 56, 38, 34, ['#ffd23f', '#e8e8f0', '#ff9f1c', '#fff'][me.rank - 1]); Draw.text(c, 'sur 4', 56, 62, 11, '#fff', 'center', 700);
      vbox = { x: 10, y: 80, w: 92, h: 44 }; c.fillStyle = 'rgba(255,210,63,.95)'; Draw.rr(c, vbox.x, vbox.y, vbox.w, vbox.h, 14); c.fill(); Draw.text(c, 'VUE', 56, 94, 11, '#1b1540'); Draw.text(c, VIEWS[view], 56, 110, 13, '#1b1540');
      c.fillStyle = 'rgba(23,18,58,.8)'; Draw.rr(c, W - 104, 10, 94, 40, 14); c.fill(); Draw.text(c, 'Tour ' + clamp(me.lap + 1, 1, LAPS) + '/' + LAPS, W - 57, 31, 17, '#fff');
      { const cx = W / 2, iy = 10; ibox = { x: cx - 36, y: iy, w: 72, h: 72 }; c.fillStyle = 'rgba(23,18,58,.8)'; Draw.rr(c, cx - 36, iy, 72, 72, 16); c.fill(); c.strokeStyle = me.item ? '#ffd23f' : 'rgba(255,255,255,.25)'; c.lineWidth = 3; c.stroke();
        if (me.item) { const k = me.item, col = K3D_ITEMS[k][1], cy = iy + 30; c.fillStyle = col; c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); if (k === 'missile') { c.moveTo(cx, cy - 20); c.lineTo(cx + 10, cy + 2); c.lineTo(cx + 10, cy + 16); c.lineTo(cx - 10, cy + 16); c.lineTo(cx - 10, cy + 2); c.closePath(); } else if (k === 'turbo') { c.moveTo(cx - 16, cy + 14); c.lineTo(cx, cy - 18); c.lineTo(cx + 16, cy + 14); c.lineTo(cx, cy + 4); c.closePath(); } else if (k === 'bolt') { c.moveTo(cx + 4, cy - 20); c.lineTo(cx - 12, cy + 2); c.lineTo(cx - 1, cy + 2); c.lineTo(cx - 6, cy + 18); c.lineTo(cx + 12, cy - 4); c.lineTo(cx + 1, cy - 4); c.closePath(); } else if (k === 'oil') c.ellipse(cx, cy + 4, 18, 11, 0, 0, 7); else { for (let j = 0; j < 10; j++) { const rr = j % 2 ? 9 : 20, aa = -Math.PI / 2 + j * Math.PI / 5; j ? c.lineTo(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr) : c.moveTo(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr); } c.closePath(); } c.fill(); c.stroke(); Draw.text(c, K3D_ITEMS[k][0], cx, iy + 61, 10, '#fff'); if (Math.sin(t * 6) > -.3) Draw.text(c, 'Tape l\'écran !', cx, iy + 86, 13, '#ffd23f'); }
        else Draw.text(c, '?', cx, iy + 38, 30, 'rgba(255,255,255,.25)'); }
      { const mw = Math.min(104, W * .24), mx = W - mw - 10, my = 58; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of TR.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } const sc = (mw - 16) / Math.max(x1 - x0, z1 - z0), X = x => mx + mw / 2 - (x - (x0 + x1) / 2) * sc, Y = z => my + mw / 2 - (z - (z0 + z1) / 2) * sc;
        c.fillStyle = 'rgba(23,18,58,.6)'; Draw.rr(c, mx, my, mw, mw, 12); c.fill(); c.lineWidth = 3; for (let i = 0; i < N; i += 2) { const p = path[i], q = P(i + 2); c.strokeStyle = p.b > .5 ? '#3fdc6a' : '#fff'; c.beginPath(); c.moveTo(X(p.x), Y(p.z)); c.lineTo(X(q.x), Y(q.z)); c.stroke(); }
        for (let k = karts.length - 1; k >= 0; k--) { const q = karts[k], f = frame(q.s, 0); c.fillStyle = q.me ? '#ffd23f' : '#ff4f9a'; c.strokeStyle = '#1b1540'; c.lineWidth = 2; c.beginPath(); c.arc(X(f.pos.x), Y(f.pos.z), q.me ? 5 : 3.5, 0, 7); c.fill(); c.stroke(); }
        c.fillStyle = 'rgba(23,18,58,.8)'; Draw.rr(c, mx, my + mw + 6, mw, 26, 10); c.fill(); c.fillStyle = '#ffc61a'; c.beginPath(); c.arc(mx + 18, my + mw + 19, 8, 0, 7); c.fill(); Draw.text(c, '× ' + me.coins, mx + 32, my + mw + 20, 15, '#fff', 'left'); }
      { const bx = 10, by = 132, bw = 92, f = clamp(me.v / (VMAX * 1.35), 0, 1); c.fillStyle = 'rgba(23,18,58,.8)'; Draw.rr(c, bx, by, bw, 34, 12); c.fill(); Draw.text(c, Math.round(me.v * 3.6) + ' km/h', bx + bw / 2, by + 12, 12, '#fff'); c.fillStyle = 'rgba(255,255,255,.18)'; Draw.rr(c, bx + 8, by + 21, bw - 16, 7, 3); c.fill(); c.fillStyle = me.boost > 0 ? '#ff9f1c' : me.off ? '#ff4f4f' : '#9dff5c'; Draw.rr(c, bx + 8, by + 21, Math.max(6, (bw - 16) * f), 7, 3); c.fill(); }
      if (me.off && phase === 'race' && Math.sin(t * 8) > 0) big(c, 'Reviens sur la route !', H * .36, Math.min(22, W / 16), '#ff8fb8');
      if (phase === 'count') { const n = Math.ceil(count); if (n <= 3) { const cx = W / 2, cy = H * .34; c.fillStyle = 'rgba(23,18,58,.85)'; Draw.rr(c, cx - 78, cy - 30, 156, 60, 18); c.fill(); for (let i = 0; i < 3; i++) { c.fillStyle = n <= 0 ? '#3fbf4f' : 3 - n >= i ? '#ff4f4f' : '#3a3466'; c.beginPath(); c.arc(cx - 48 + i * 48, cy, 17, 0, 7); c.fill(); } big(c, n > 0 ? String(n) : '', H * .52, 70, '#ffd23f'); } else big(c, TR.name, H * .36, Math.min(28, W / 14), '#fff'); }
      else if (phase === 'end') big(c, me.rank === 1 ? 'VICTOIRE !' : 'ARRIVÉE : ' + me.rank + 'e', H * .38, Math.min(42, W / 9), me.rank === 1 ? '#ffd23f' : '#fff');
      else if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 3); big(c, msg, H * .36, Math.min(34, W / (msg.length * .62)), '#ffd23f'); c.globalAlpha = 1; }
    }
    try { if (!T3) throw new Error('bibliothèque 3D absente'); build(); } catch (e) { fail = String(e && e.message || e).slice(0, 80); if (window.console) console.error(e); }
    return { update, draw, stop, dbg: () => ({ karts, path, N, phase, fail, ratio, raceT, HALF, marks: path.marks, info: renderer ? renderer.info.render : null, auto: on => { auto = on; }, setView: v => { view = v; }, warp: (f, lat) => { karts[0].s = N * f; karts[0].lat = lat || 0; karts[0].psi = 0; karts[0].air = false; karts[0].gy = frame(karts[0].s, 0).gy; }, give: it => { karts[0].item = it; } }) };
  }
});
