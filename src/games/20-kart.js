/* ===== Kart Grand Prix (dès 4 ans) — course vue de dessus, sprites Kenney (CC0), coupe de 3 circuits ===== */
const KART_TRACKS = [
  { name: 'Circuit des Prés', pts: [[400, 420], [1100, 300], [1800, 420], [2020, 820], [1800, 1220], [1100, 1320], [400, 1220], [190, 820]] },
  { name: 'Les Esses', pts: [[300, 320], [900, 250], [1220, 520], [1600, 300], [2000, 460], [2060, 900], [1720, 1260], [1300, 1010], [900, 1320], [350, 1260], [200, 760]] },
  { name: 'Le Serpent', pts: [[300, 420], [700, 210], [1100, 470], [1500, 210], [1950, 360], [2060, 800], [1760, 1010], [1900, 1360], [1300, 1420], [1000, 1060], [650, 1420], [250, 1220], [450, 820]] }
];
let KART_IMG = null;
GAMES.push({
  id: 'kart', title: 'Kart Grand Prix', tagline: 'Coupe de 3 circuits', minAge: 4, color: '#ff4f4f',
  icon: '<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="10" fill="#4faf40"/><path d="M14 46c0-22 36-22 36-6s-20 4-20 12" fill="none" stroke="#9fc8c8" stroke-width="12" stroke-linecap="round"/><rect x="38" y="30" width="12" height="20" rx="4" fill="#ff4f4f"/><rect x="40" y="34" width="8" height="5" rx="1" fill="#fff"/><rect x="12" y="30" width="10" height="16" rx="4" fill="#38a0e0"/></svg>',
  howto: ['La voiture avance toute seule : tourne à gauche et à droite pour rester sur la route. Passe sur les flèches jaunes pour aller plus vite !', 'Reste sur la piste, prends les flèches de vitesse, évite l\'huile. TURBO quand tu en as. 3 tours par circuit, 3 circuits.', 'Adversaires rapides : freine avant les épingles, garde tes turbos pour les lignes droites.'],
  pad: { left: true, buttons: [{ k: 'b', label: 'FREIN' }, { k: 'a', label: 'TURBO' }] },
  stars: s => s >= 2600 ? 3 : s >= 1600 ? 2 : s >= 700 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env; const tier = env.tier;
    if (!KART_IMG) { KART_IMG = {}; for (const k in KART_ART) { const i = new Image(); i.src = KART_ART[k]; KART_IMG[k] = i; } }
    const IMG = KART_IMG; const pr = Particles();
    const HALF = [120, 105, 95][tier], LAPS = 3, VMAX = [250, 330, 390][tier], WORLD_W = 2260, WORLD_H = 1640;
    let trackIdx = 0, cupPts = [0, 0, 0, 0], path = [], world = null, cars = [], items = [], phase = 'count', countT = 3.6, raceT = 0, t = 0, over = false, msg = '', msgT = 0, finishOrder = [], endT = 0, deco = [];
    const POINTS = [10, 6, 4, 2];
    function spline(pts) {
      const out = [], n = pts.length;
      for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]; const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), steps = Math.max(4, Math.round(d / 22));
        for (let s = 0; s < steps; s++) { const u = s / steps, u2 = u * u, u3 = u2 * u; out.push([.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3), .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]); } }
      return out;
    }
    const P = i => path[((i % path.length) + path.length) % path.length];
    function distToTrack(x, y, hint) { let best = 1e9, bi = 0; const n = path.length; const lo = hint == null ? 0 : hint - 14, hi = hint == null ? n : hint + 14; for (let i = lo; i < hi; i++) { const p = P(i), d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y); if (d < best) { best = d; bi = ((i % n) + n) % n; } } return { d: Math.sqrt(best), i: bi }; }
    function stroke(c, w, col, dash) { c.lineWidth = w; c.strokeStyle = col; c.lineJoin = 'round'; c.lineCap = 'butt'; c.setLineDash(dash || []); c.beginPath(); path.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke(); c.setLineDash([]); }
    function buildWorld() {
      path = spline(KART_TRACKS[trackIdx].pts);
      world = document.createElement('canvas'); world.width = WORLD_W; world.height = WORLD_H; const c = world.getContext('2d');
      c.fillStyle = '#5cc04a'; c.fillRect(0, 0, WORLD_W, WORLD_H); if (IMG.grass.complete && IMG.grass.width) for (let y = 0; y < WORLD_H; y += 128) for (let x = 0; x < WORLD_W; x += 128) c.drawImage(IMG.grass, x, y);
      let seed = 11 + trackIdx * 7; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      c.fillStyle = 'rgba(0,0,0,.05)'; for (let i = 0; i < 60; i++) { c.beginPath(); c.arc(r() * WORLD_W, r() * WORLD_H, 30 + r() * 60, 0, 7); c.fill(); }
      stroke(c, HALF * 2 + 70, '#e6d28a'); stroke(c, HALF * 2 + 26, '#fff'); stroke(c, HALF * 2 + 26, '#e8452c', [34, 34]); stroke(c, HALF * 2, '#8fb5b8'); stroke(c, HALF * 2 - 10, '#9fc4c6'); stroke(c, 5, 'rgba(255,255,255,.55)', [30, 40]);
      // ligne de départ en damier
      const p0 = P(0), p1 = P(1), a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]); c.save(); c.translate(p0[0], p0[1]); c.rotate(a); for (let i = 0; i < 2; i++) for (let j = -Math.floor(HALF / 20); j < Math.floor(HALF / 20); j++) { c.fillStyle = (i + j) % 2 ? '#fff' : '#1b1540'; c.fillRect(i * 20 - 20, j * 20, 20, 20); } c.restore();
      // décor : tribune et tentes près du départ, arbres et rochers ailleurs (jamais sur la piste)
      deco = []; const nx = -Math.sin(a), ny = Math.cos(a);
      deco.push({ k: 'tribune', x: p0[0] + nx * (HALF + 190), y: p0[1] + ny * (HALF + 190), a: a + Math.PI }, { k: 'tentB', x: p0[0] - nx * (HALF + 190) - Math.cos(a) * 150, y: p0[1] - ny * (HALF + 190) - Math.sin(a) * 150, a }, { k: 'tentR', x: p0[0] - nx * (HALF + 190) + Math.cos(a) * 150, y: p0[1] - ny * (HALF + 190) + Math.sin(a) * 150, a });
      for (const d of deco) { let k = 0; while (distToTrack(d.x, d.y).d < HALF + (d.k === 'tribune' ? 250 : 170) && k++ < 40) { const nr = distToTrack(d.x, d.y), p = P(nr.i), l = Math.hypot(d.x - p[0], d.y - p[1]) || 1; d.x += (d.x - p[0]) / l * 14; d.y += (d.y - p[1]) / l * 14; } }
      for (let i = 0; i < 260 && deco.length < 90; i++) { const x = 60 + r() * (WORLD_W - 120), y = 60 + r() * (WORLD_H - 120); if (distToTrack(x, y).d < HALF + 120) continue; if (deco.some(d => Math.hypot(d.x - x, d.y - y) < 110)) continue; const q = r(); deco.push({ k: q < .55 ? 'tree1' : q < .85 ? 'tree2' : 'rock', x, y, a: r() * 6.3 }); }
      for (let i = 30; i < path.length; i += 46) { const p = P(i), pn = P(i + 1), aa = Math.atan2(pn[1] - p[1], pn[0] - p[0]), side = (i / 46) % 2 ? 1 : -1; deco.push({ k: side > 0 ? 'tiresR' : 'tiresW', x: p[0] - Math.sin(aa) * (HALF + 52) * side, y: p[1] + Math.cos(aa) * (HALF + 52) * side, a: 0 }); }
      for (const d of deco) { const im = IMG[d.k]; if (!im.complete || !im.width) continue; c.save(); c.translate(d.x, d.y); c.rotate(d.a); c.drawImage(im, -im.width / 2, -im.height / 2); c.restore(); }
    }
    function startRace() {
      buildWorld(); const n = path.length; cars = []; items = [];
      const names = [env.profile.name, 'Zip', 'Nitro', 'Bolide'];
      for (let k = 0; k < 4; k++) { const row = Math.floor(k / 2), col = k % 2 ? 1 : -1; const idx = n - 4 - row * 5, p = P(idx), pn = P(idx + 1), a = Math.atan2(pn[1] - p[1], pn[0] - p[0]); const slot = 3 - k; // le joueur part dernier
        cars.push({ me: slot === 0, name: names[slot], img: 'car' + slot, x: p[0] - Math.sin(a) * col * HALF * .45, y: p[1] + Math.cos(a) * col * HALF * .45, a, v: 0, idx, lap: 0, half: false, done: false, time: 0, boost: 0, spin: 0, turbo: slot === 0 ? 2 : 0, skill: [0, .8, .88, .96][slot] + tier * .02, off: col * HALF * .4, wob: Math.random() * 6 }); }
      cars.sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0)); // joueur en premier dans la liste
      let seed = 5 + trackIdx * 3; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let i = 40; i < n - 20; i += Math.round(34 + r() * 30)) { const p = P(i), pn = P(i + 1), a = Math.atan2(pn[1] - p[1], pn[0] - p[0]), lat = (r() - .5) * HALF * 1.2, q = r(); items.push({ k: q < .5 ? 'arrow' : q < .5 + .2 + tier * .08 ? 'oil' : 'cone', x: p[0] - Math.sin(a) * lat, y: p[1] + Math.cos(a) * lat, a, on: true }); }
      phase = 'count'; countT = 3.6; raceT = 0; finishOrder = []; msg = KART_TRACKS[trackIdx].name; msgT = 2.5;
      env.save({ trackIdx, cupPts }, 'Circuit ' + (trackIdx + 1) + '/3 · ' + cupPts[0] + ' pts');
    }
    function progress(c) { return c.lap * path.length + c.idx + (c.done ? 1e7 - c.time * 100 : 0); }
    function rank(c) { return cars.slice().sort((a, b) => progress(b) - progress(a)).indexOf(c) + 1; }
    function updateCar(c, dt, steer, brake) {
      const near = distToTrack(c.x, c.y, c.idx); const prev = c.idx; c.idx = near.i; const n = path.length;
      if (prev > n * .45 && prev < n * .55) c.half = true;
      if (prev > n * .8 && c.idx < n * .2) { if (c.half) { c.lap++; c.half = false; if (c.me && c.lap < LAPS) { msg = c.lap === LAPS - 1 ? 'DERNIER TOUR !' : 'Tour ' + (c.lap + 1) + ' / ' + LAPS; msgT = 1.6; sfx.ok(); } if (c.lap >= LAPS && !c.done) { c.done = true; c.time = raceT; finishOrder.push(c); if (c.me) { sfx.win(); } } } }
      const offroad = near.d > HALF + 8; let vmax = VMAX * (c.me ? 1 : c.skill) * (offroad ? .5 : 1) * (c.boost > 0 ? 1.45 : 1); if (c.done) vmax *= .5;
      c.boost = Math.max(0, c.boost - dt); c.spin = Math.max(0, c.spin - dt);
      const acc = brake ? -500 : 260; c.v += (c.v < vmax ? acc : -420) * dt; c.v = clamp(c.v, 0, VMAX * 1.6); if (brake && c.v < 40) c.v = 40;
      if (c.spin > 0) { c.a += 9 * dt; c.v *= Math.pow(.25, dt); } else c.a += steer * (2.5 + (tier === 0 ? .3 : 0)) * dt * clamp(c.v / 140, .3, 1);
      c.x += Math.cos(c.a) * c.v * dt; c.y += Math.sin(c.a) * c.v * dt;
      if (near.d > HALF + 150) { const p = P(c.idx); c.x += (p[0] - c.x) * dt * 2; c.y += (p[1] - c.y) * dt * 2; } // remis sur la piste
      for (const it of items) { if (!it.on && it.k !== 'arrow' && it.k !== 'oil') continue; const d = Math.hypot(it.x - c.x, it.y - c.y); if (d > 46) continue;
        if (it.k === 'arrow' && c.boost < .3) { c.boost = 1.3; if (c.me) { sfx.coin(); env.vibe(20); } }
        else if (it.k === 'oil' && c.spin <= 0 && !c.oilT) { c.spin = .7; c.oilT = 1.5; if (c.me) { sfx.ko(); env.vibe(120); } }
        else if (it.k === 'cone' && it.on) { it.on = false; it.vx = Math.cos(c.a) * c.v * .8; it.vy = Math.sin(c.a) * c.v * .8; it.fly = .6; c.v *= .7; if (c.me) sfx.hit(); } }
      c.oilT = Math.max(0, (c.oilT || 0) - dt);
      if (offroad && c.v > 80 && Math.random() < dt * 20) { const z = cam.z; pr.burst(cam.sx(c.x, c.y), cam.sy(c.x, c.y), '#c9b56a', 2, 60); }
    }
    const cam = { z: 1, a: 0, x: 0, y: 0, cx: 0, cy: 0, sx(x, y) { const dx = x - this.x, dy = y - this.y, r = -this.a - Math.PI / 2; return this.cx + (dx * Math.cos(r) - dy * Math.sin(r)) * this.z; }, sy(x, y) { const dx = x - this.x, dy = y - this.y, r = -this.a - Math.PI / 2; return this.cy + (dx * Math.sin(r) + dy * Math.cos(r)) * this.z; } };
    function update(dt) {
      if (over) return; t += dt; msgT = Math.max(0, msgT - dt); pr.update(dt); const me = cars[0];
      if (phase === 'count') { const before = Math.ceil(countT - .6); countT -= dt; const after = Math.ceil(countT - .6); if (after !== before && after >= 0) { if (after === 0) sfx.win(); else sfx.tick(); } if (countT <= .6) phase = 'race'; }
      else if (phase === 'race' || phase === 'end') {
        raceT += dt; let steer = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
        if (input.pointer.down && !steer) steer = clamp((input.pointer.x - env.W / 2) / (env.W * .25), -1, 1);
        if (tier === 0 && !me.done) { const tg = P(me.idx + 7), want = Math.atan2(tg[1] - me.y, tg[0] - me.x); let da = want - me.a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; steer = clamp(steer + da * .9, -1, 1); } // aide à la conduite pour les petits
        if (input.pressed.a && me.turbo > 0 && me.boost <= .2 && !me.done) { me.turbo--; me.boost = 2; sfx.jump(); env.vibe(40); msg = 'TURBO !'; msgT = .8; }
        if (me.done) { const tg = P(me.idx + 8), want = Math.atan2(tg[1] - me.y, tg[0] - me.x); let da = want - me.a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; steer = clamp(da * 2, -1, 1); }
        updateCar(me, dt, steer, !!input.held.b && !me.done);
        for (let k = 1; k < cars.length; k++) { const c = cars[k]; const look = 8 + Math.round(c.v / 60), tg = P(c.idx + look), tn = P(c.idx + look + 1), ta = Math.atan2(tn[1] - tg[1], tn[0] - tg[0]); const lat = c.off + Math.sin(t * .7 + c.wob) * 20; const tx = tg[0] - Math.sin(ta) * lat, ty = tg[1] + Math.cos(ta) * lat; let da = Math.atan2(ty - c.y, tx - c.x) - c.a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
          const gap = progress(c) - progress(me); const save = c.skill; c.skill = save * (gap > 60 ? .9 : gap < -60 ? 1.1 : 1); updateCar(c, dt, clamp(da * 3, -1, 1), Math.abs(da) > .7 && c.v > VMAX * .6); c.skill = save; }
        for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) { const a = cars[i], b = cars[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 52 && d > 0) { const push = (52 - d) / 2, ux = dx / d, uy = dy / d; a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push; const av = (a.v + b.v) / 2; a.v = a.v * .6 + av * .4; b.v = b.v * .6 + av * .4; if ((a.me || b.me) && Math.random() < .2) { sfx.tick(); env.vibe(15); } } }
        for (const it of items) if (it.fly > 0) { it.fly -= dt; it.x += it.vx * dt; it.y += it.vy * dt; it.a += 12 * dt; }
        if (me.done && phase === 'race') { phase = 'end'; endT = 3.2; const r = rank(me); msg = ['VICTOIRE !', '2e place', '3e place', '4e place'][r - 1]; msgT = 3; }
        if (phase === 'end') { endT -= dt; if (endT <= 0) finishRace(); }
      }
      // caméra : derrière le joueur, monde tourné pour que la voiture pointe vers le haut
      cam.z = clamp(Math.min(env.W, env.H) / 560, .55, 1.15) * (1 - Math.min(.12, me.v / VMAX * .1)); cam.x = me.x; cam.y = me.y; let da = me.a - cam.a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; cam.a += da * Math.min(1, dt * 6); cam.cx = env.W / 2; cam.cy = env.H * .68;
      env.setScore(cupPts[0] * 100); env.hud('Circuit ' + (trackIdx + 1) + '/3 · Tour ' + Math.min(LAPS, me.lap + 1) + '/' + LAPS);
    }
    function finishRace() {
      const order = cars.slice().sort((a, b) => progress(b) - progress(a)); order.forEach((c, i) => { const slot = c.me ? 0 : +c.img.slice(3); cupPts[slot] += POINTS[i]; });
      trackIdx++;
      if (trackIdx >= KART_TRACKS.length) { over = true; const final = [0, 1, 2, 3].sort((a, b) => cupPts[b] - cupPts[a]); const pos = final.indexOf(0) + 1; const score = cupPts[0] * 100 + (pos === 1 ? 500 : 0); env.gameOver(score, { win: pos === 1, title: pos === 1 ? 'COUPE GAGNÉE !' : pos + 'e de la coupe', text: cupPts[0] + ' points sur 30' }); return; }
      startRace();
    }
    function sprite(c, k, x, y, a, sc) { const im = IMG[k]; if (!im.complete || !im.width) return; c.save(); c.translate(x, y); c.rotate(a); c.scale(sc || 1, sc || 1); c.drawImage(im, -im.width / 2, -im.height / 2); c.restore(); }
    function draw(c) {
      const W = env.W, H = env.H, me = cars[0]; c.fillStyle = '#4faf40'; c.fillRect(0, 0, W, H);
      c.save(); c.translate(cam.cx, cam.cy); c.scale(cam.z, cam.z); c.rotate(-cam.a - Math.PI / 2); c.translate(-cam.x, -cam.y);
      c.drawImage(world, 0, 0);
      for (const it of items) { if (it.k === 'cone') { if (it.on || it.fly > 0) sprite(c, 'cone', it.x, it.y, it.a); } else if (it.k === 'arrow') { c.globalAlpha = .75 + Math.sin(t * 8) * .25; sprite(c, 'arrow', it.x, it.y, it.a + Math.PI / 2, .6); c.globalAlpha = 1; } else sprite(c, 'oil', it.x, it.y, it.a, .8); }
      for (let k = cars.length - 1; k >= 0; k--) { const cr = cars[k]; c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(cr.x + 5, cr.y + 7, 34, 20, cr.a, 0, 7); c.fill(); if (cr.boost > 0) { c.fillStyle = 'rgba(255,160,30,.85)'; c.beginPath(); c.arc(cr.x - Math.cos(cr.a) * 44, cr.y - Math.sin(cr.a) * 44, 10 + Math.random() * 8, 0, 7); c.fill(); } sprite(c, cr.img, cr.x, cr.y, cr.a + Math.PI / 2, .62); }
      c.restore(); pr.draw(c);
      // HUD : position, tours, turbos, mini-carte
      const r = rank(me); c.lineWidth = 6; c.strokeStyle = '#1b1540'; c.font = '900 44px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'left'; c.textBaseline = 'middle'; c.strokeText(r + (r === 1 ? 'er' : 'e'), 14, 36); Draw.text(c, r + (r === 1 ? 'er' : 'e'), 14, 36, 44, ['#ffd23f', '#e8e8f0', '#ff9f1c', '#fff'][r - 1], 'left');
      for (let i = 0; i < me.turbo; i++) { c.fillStyle = '#ff9f1c'; c.strokeStyle = '#1b1540'; c.lineWidth = 3; c.beginPath(); c.arc(26 + i * 30, 78, 11, 0, 7); c.fill(); c.stroke(); } if (me.turbo) Draw.text(c, 'TURBO', 26 + me.turbo * 30, 78, 12, '#fff', 'left', 900);
      const mw = Math.min(130, W * .3), ms = mw / WORLD_W, mx = W - mw - 10, my = 10; c.fillStyle = 'rgba(27,21,64,.6)'; Draw.rr(c, mx - 4, my - 4, mw + 8, WORLD_H * ms + 8, 8); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); path.forEach((p, i) => { if (i % 3) return; i ? c.lineTo(mx + p[0] * ms, my + p[1] * ms) : c.moveTo(mx + p[0] * ms, my + p[1] * ms); }); c.closePath(); c.stroke();
      const cols = ['#ff4f4f', '#38a0e0', '#3fbf4f', '#ffd23f']; for (let k = cars.length - 1; k >= 0; k--) { const cr = cars[k]; c.fillStyle = cr.me ? cols[0] : cols[+cr.img.slice(3)]; c.strokeStyle = '#1b1540'; c.lineWidth = 2; c.beginPath(); c.arc(mx + cr.x * ms, my + cr.y * ms, cr.me ? 5.5 : 4, 0, 7); c.fill(); c.stroke(); }
      if (phase === 'count') { const n = Math.ceil(countT - .6); const im = IMG.lights; if (im.complete && im.width) c.drawImage(im, W / 2 - 80, H * .16); for (let i = 0; i < 3; i++) { c.fillStyle = n <= 0 ? '#3fdf5f' : (3 - n >= i ? '#ff3b30' : '#3a3a4a'); c.beginPath(); c.arc(W / 2 - 50 + i * 50, H * .16 + 32, 15, 0, 7); c.fill(); } c.lineWidth = 8; c.strokeStyle = '#1b1540'; c.font = '900 72px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.strokeText(n > 0 ? String(n) : 'PARTEZ !', W / 2, H * .4); Draw.text(c, n > 0 ? String(n) : 'PARTEZ !', W / 2, H * .4, 72, n > 0 ? '#fff' : '#9dff5c'); }
      if (msgT > 0 && phase !== 'count') { c.globalAlpha = Math.min(1, msgT * 2); c.lineWidth = 6; c.strokeStyle = '#1b1540'; const fs = Math.min(40, W / 10); c.font = '900 ' + fs + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(msg, W / 2, H * .3); Draw.text(c, msg, W / 2, H * .3, fs, '#ffd23f'); c.globalAlpha = 1; }
      else if (phase === 'count' && msgT > 0) { c.lineWidth = 5; c.strokeStyle = '#1b1540'; const fs = Math.min(26, W / 15); c.font = '900 ' + fs + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(msg, W / 2, H * .54); Draw.text(c, msg, W / 2, H * .54, fs, '#fff'); }
    }
    if (saved && typeof saved.trackIdx === 'number') { trackIdx = clamp(saved.trackIdx | 0, 0, 2); if (Array.isArray(saved.cupPts) && saved.cupPts.length === 4) cupPts = saved.cupPts.slice(); }
    // les images en data-URI se décodent en quelques millisecondes : on reconstruit le décor dès qu'elles sont prêtes
    startRace(); cam.a = cars[0].a; const ready = () => Object.values(IMG).every(i => i.complete && i.width); if (!ready()) { const iv = setInterval(() => { if (ready() || over) { clearInterval(iv); if (!over) buildWorld(); } }, 60); }
    return { update, draw, dbg: () => ({ cars, path, phase, trackIdx, cupPts, HALF }) };
  }
});
