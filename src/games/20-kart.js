/* ===== Kart Grand Prix (dès 4 ans) — course en vue 3D (sol en perspective « mode 7 »), objets, pièces, sprites Kenney (CC0) ===== */
const KART_TRACKS = [
  { name: 'Circuit des Prés', pts: [[400, 420], [1100, 300], [1800, 420], [2020, 820], [1800, 1220], [1100, 1320], [400, 1220], [190, 820]] },
  { name: 'Les Esses', pts: [[300, 320], [900, 250], [1220, 520], [1600, 300], [2000, 460], [2060, 900], [1720, 1260], [1300, 1010], [900, 1320], [350, 1260], [200, 760]] },
  { name: 'Le Serpent', pts: [[300, 420], [700, 210], [1100, 470], [1500, 210], [1950, 360], [2060, 800], [1760, 1010], [1900, 1360], [1300, 1420], [1000, 1060], [650, 1420], [250, 1220], [450, 820]] }
];
const KART_ITEMS = { turbo: ['TURBO', '#ff9f1c'], missile: ['MISSILE', '#ff4f4f'], oil: ['HUILE', '#4b3fa3'], shield: ['BOUCLIER', '#38e0d6'], bolt: ['ÉCLAIR', '#ffd23f'] };
let KART_IMG = null;
GAMES.push({
  id: 'kart', title: 'Kart Grand Prix', tagline: 'Course 3D, objets et coupe', minAge: 4, color: '#ff4f4f',
  icon: '<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="10" fill="#4faf40"/><path d="M14 46c0-22 36-22 36-6s-20 4-20 12" fill="none" stroke="#9fc8c8" stroke-width="12" stroke-linecap="round"/><rect x="38" y="30" width="12" height="20" rx="4" fill="#ff4f4f"/><rect x="40" y="34" width="8" height="5" rx="1" fill="#fff"/><rect x="12" y="30" width="10" height="16" rx="4" fill="#38a0e0"/></svg>',
  howto: ['Choisis ta voiture et ton circuit. La voiture avance toute seule : tourne pour rester sur la route, attrape les pièces et les caisses « ? » !', 'Ramasse les caisses « ? » : appuie sur OBJET pour utiliser ce que tu as gagné (missile, huile, bouclier, éclair, turbo). Les pièces te rendent plus rapide.', 'Adversaires rapides qui utilisent aussi les objets. Garde un bouclier contre les missiles.'],
  pad: { left: true, buttons: [{ k: 'b', label: 'FREIN' }, { k: 'a', label: 'OBJET' }] },
  stars: s => s >= 2600 ? 3 : s >= 1500 ? 2 : s >= 600 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env; const tier = env.tier;
    if (!KART_IMG) { KART_IMG = {}; for (const k in KART_ART) { const i = new Image(); i.src = KART_ART[k]; KART_IMG[k] = i; } }
    const IMG = KART_IMG; const pr = Particles();
    const HALF = [125, 110, 100][tier], LAPS = 3, VMAX = [250, 330, 390][tier], WORLD_W = 2260, WORLD_H = 1640, POINTS = [10, 6, 4, 2];
    let phase = 'menu', selCar = 0, selTrack = 3, cup = true, trackIdx = 0, cupPts = [0, 0, 0, 0], path = [], world = null, cars = [], items = [], boxes = [], coins = [], shots = [], bills = [], countT = 3.6, raceT = 0, t = 0, over = false, msg = '', msgT = 0, endT = 0, flashT = 0, boltT = 0, totalCoins = 0, band = 2, slowFrames = 0;
    let floor = null, fctx = null;
    function spline(pts, stepLen) {
      const out = [], n = pts.length;
      for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]; const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), steps = Math.max(4, Math.round(d / (stepLen || 22)));
        for (let s = 0; s < steps; s++) { const u = s / steps, u2 = u * u, u3 = u2 * u; out.push([.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3), .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]); } }
      return out;
    }
    const P = i => path[((i % path.length) + path.length) % path.length];
    const dirAt = i => { const p = P(i), q = P(i + 1); return Math.atan2(q[1] - p[1], q[0] - p[0]); };
    const at = (i, lat) => { const p = P(i), a = dirAt(i); return [p[0] - Math.sin(a) * lat, p[1] + Math.cos(a) * lat, a]; };
    function distToTrack(x, y, hint) { let best = 1e9, bi = 0; const n = path.length; const lo = hint == null ? 0 : hint - 14, hi = hint == null ? n : hint + 14; for (let i = lo; i < hi; i++) { const p = P(i), d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y); if (d < best) { best = d; bi = ((i % n) + n) % n; } } return { d: Math.sqrt(best), i: bi }; }
    function stroke(c, w, col, dash) { c.lineWidth = w; c.strokeStyle = col; c.lineJoin = 'round'; c.lineCap = 'butt'; c.setLineDash(dash || []); c.beginPath(); path.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke(); c.setLineDash([]); }
    function buildWorld() {
      path = spline(KART_TRACKS[trackIdx].pts);
      world = document.createElement('canvas'); world.width = WORLD_W; world.height = WORLD_H; const c = world.getContext('2d');
      c.fillStyle = '#5cc04a'; c.fillRect(0, 0, WORLD_W, WORLD_H); if (IMG.grass.complete && IMG.grass.width) for (let y = 0; y < WORLD_H; y += 128) for (let x = 0; x < WORLD_W; x += 128) c.drawImage(IMG.grass, x, y);
      let seed = 11 + trackIdx * 7; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 90; i++) { c.fillStyle = i % 2 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.07)'; c.beginPath(); c.arc(r() * WORLD_W, r() * WORLD_H, 30 + r() * 70, 0, 7); c.fill(); }
      stroke(c, HALF * 2 + 70, '#e6d28a'); stroke(c, HALF * 2 + 26, '#fff'); stroke(c, HALF * 2 + 26, '#e8452c', [34, 34]); stroke(c, HALF * 2, '#8fb5b8'); stroke(c, HALF * 2 - 10, '#9fc4c6'); stroke(c, 6, 'rgba(255,255,255,.6)', [30, 40]);
      const a = dirAt(0), p0 = P(0); c.save(); c.translate(p0[0], p0[1]); c.rotate(a); for (let i = 0; i < 2; i++) for (let j = -Math.floor(HALF / 20); j < Math.floor(HALF / 20); j++) { c.fillStyle = (i + j) % 2 ? '#fff' : '#1b1540'; c.fillRect(i * 20 - 20, j * 20, 20, 20); } c.restore();
      // flèches de vitesse peintes au sol
      for (const it of items) if (it.k === 'arrow') { c.save(); c.translate(it.x, it.y); c.rotate(it.a + Math.PI / 2); const im = IMG.arrow; if (im.complete && im.width) { c.scale(.7, .7); c.drawImage(im, -im.width / 2, -im.height / 2); } c.restore(); }
      // décor à plat (tentes, tribune, pneus) cuit dans le sol ; arbres et rochers en relief (panneaux)
      const nx = -Math.sin(a), ny = Math.cos(a); const flat = [{ k: 'tribune', x: p0[0] + nx * (HALF + 190), y: p0[1] + ny * (HALF + 190), a: a + Math.PI }, { k: 'tentB', x: p0[0] - nx * (HALF + 190) - Math.cos(a) * 150, y: p0[1] - ny * (HALF + 190) - Math.sin(a) * 150, a }, { k: 'tentR', x: p0[0] - nx * (HALF + 190) + Math.cos(a) * 150, y: p0[1] - ny * (HALF + 190) + Math.sin(a) * 150, a }];
      for (const d of flat) { let k = 0; while (distToTrack(d.x, d.y).d < HALF + (d.k === 'tribune' ? 250 : 170) && k++ < 40) { const nr = distToTrack(d.x, d.y), p = P(nr.i), l = Math.hypot(d.x - p[0], d.y - p[1]) || 1; d.x += (d.x - p[0]) / l * 14; d.y += (d.y - p[1]) / l * 14; } }
      for (let i = 30; i < path.length; i += 40) { const side = (i / 40) % 2 ? 1 : -1, q = at(i, (HALF + 52) * side); flat.push({ k: side > 0 ? 'tiresR' : 'tiresW', x: q[0], y: q[1], a: 0 }); }
      for (const d of flat) { const im = IMG[d.k]; if (!im.complete || !im.width) continue; c.save(); c.translate(d.x, d.y); c.rotate(d.a); c.drawImage(im, -im.width / 2, -im.height / 2); c.restore(); }
      bills = []; for (let i = 0; i < 400 && bills.length < 110; i++) { const x = 40 + r() * (WORLD_W - 80), y = 40 + r() * (WORLD_H - 80); if (distToTrack(x, y).d < HALF + 140) continue; if (bills.some(d => Math.hypot(d.x - x, d.y - y) < 90) || flat.some(d => d.k !== 'tiresR' && d.k !== 'tiresW' && Math.hypot(d.x - x, d.y - y) < 230)) continue; const q = r(); bills.push({ k: q < .6 ? 'tree1' : q < .88 ? 'tree2' : 'rock', x, y, s: .9 + r() * .6 }); }
    }
    function startRace() {
      path = spline(KART_TRACKS[trackIdx].pts); const n = path.length; cars = []; items = []; boxes = []; coins = []; shots = [];
      let seed = 5 + trackIdx * 3; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let i = 50; i < n - 20; i += Math.round(60 + r() * 40)) { const lat = (r() - .5) * HALF * 1.1, q = at(i, lat); items.push({ k: r() < .62 ? 'arrow' : 'oil', x: q[0], y: q[1], a: q[2] }); }
      const nb = Math.max(3, Math.round(n / 70)); for (let k = 0; k < nb; k++) { const i = Math.round((k + .5) * n / nb); for (const f of [-.55, 0, .55]) { const q = at(i, f * HALF); boxes.push({ x: q[0], y: q[1], off: 0 }); } }
      for (let i = 20; i < n - 10; i += 9) { if (Math.floor(i / 45) % 2) continue; const lat = Math.sin(i * .13) * HALF * .55, q = at(i, lat); coins.push({ x: q[0], y: q[1], on: true }); }
      buildWorld();
      const names = [env.profile.name, 'Zip', 'Nitro', 'Bolide']; const others = [0, 1, 2, 3, 4].filter(k => k !== selCar);
      for (let k = 0; k < 4; k++) { const row = Math.floor(k / 2), col = k % 2 ? 1 : -1, slot = 3 - k; const idx = n - 4 - row * 5, q = at(idx, col * HALF * .45);
        cars.push({ me: slot === 0, slot, name: names[slot], img: 'car' + (slot === 0 ? selCar : others[slot - 1]), x: q[0], y: q[1], a: q[2], v: 0, idx, lap: 0, half: false, done: false, time: 0, boost: 0, spin: 0, item: null, itemT: 0, shield: 0, slow: 0, coins: 0, skill: [0, .8, .88, .96][slot] + tier * .02, off: col * HALF * .4, wob: Math.random() * 6 }); }
      cars.sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0));
      phase = 'count'; countT = 3.6; raceT = 0; msg = KART_TRACKS[trackIdx].name; msgT = 2.5; cam.a = cars[0].a;
      if (cup) env.save({ trackIdx, cupPts, selCar }, 'Coupe · circuit ' + (trackIdx + 1) + '/3 · ' + cupPts[0] + ' pts');
    }
    function progress(c) { return c.lap * path.length + c.idx + (c.done ? 1e7 - c.time * 100 : 0); }
    function rank(c) { return cars.slice().sort((a, b) => progress(b) - progress(a)).indexOf(c) + 1; }
    function spinOut(c, why) { if (c.shield > 0) { c.shield = 0; if (c.me) { sfx.ok(); say('Bouclier !'); } return; } if (c.spin > 0) return; c.spin = .9; if (c.me) { sfx.ko(); env.vibe(150); flashT = .2; if (why) say(why); } }
    function say(m) { msg = m; msgT = 1.1; }
    function useItem(c) {
      const k = c.item; if (!k) return; c.item = null;
      if (k === 'turbo') { c.boost = 2.2; if (c.me) sfx.jump(); }
      else if (k === 'missile') { shots.push({ idx: c.idx + 3, lat: 0, from: c, t: 5, x: c.x, y: c.y }); if (c.me) sfx.punch(); }
      else if (k === 'oil') { items.push({ k: 'oil', x: c.x - Math.cos(c.a) * 60, y: c.y - Math.sin(c.a) * 60, a: c.a, dyn: true, by: c }); if (c.me) sfx.pop(); }
      else if (k === 'shield') { c.shield = 8; if (c.me) sfx.ok(); }
      else if (k === 'bolt') { boltT = .5; flashT = .3; for (const o of cars) if (o !== c && !o.done) { if (o.shield > 0) o.shield = 0; else o.slow = 3; } sfx.hit(); if (!c.me) say('Éclair de ' + c.name + ' !'); }
      if (c.me) { say(KART_ITEMS[k][0] + ' !'); env.vibe(30); }
    }
    function updateCar(c, dt, steer, brake) {
      const near = distToTrack(c.x, c.y, c.idx); const prev = c.idx; c.idx = near.i; const n = path.length;
      if (prev > n * .45 && prev < n * .55) c.half = true;
      if (prev > n * .8 && c.idx < n * .2 && c.half) { c.lap++; c.half = false; if (c.me && c.lap < LAPS) { say(c.lap === LAPS - 1 ? 'DERNIER TOUR !' : 'Tour ' + (c.lap + 1) + ' / ' + LAPS); sfx.ok(); } if (c.lap >= LAPS && !c.done) { c.done = true; c.time = raceT; if (c.me) sfx.win(); } }
      const offroad = near.d > HALF + 8; let vmax = VMAX * (c.me ? 1 + Math.min(10, c.coins) * .012 : c.skill) * (offroad && c.shield <= 0 ? .5 : 1) * (c.boost > 0 ? 1.45 : 1) * (c.slow > 0 ? .55 : 1); if (c.done) vmax *= .5;
      c.boost = Math.max(0, c.boost - dt); c.spin = Math.max(0, c.spin - dt); c.shield = Math.max(0, c.shield - dt); c.slow = Math.max(0, c.slow - dt); c.oilT = Math.max(0, (c.oilT || 0) - dt);
      const acc = brake ? -500 : 260; c.v += (c.v < vmax ? acc : -420) * dt; c.v = clamp(c.v, 0, VMAX * 1.7); if (brake && c.v < 40) c.v = 40;
      if (c.spin > 0) { c.a += 9 * dt; c.v *= Math.pow(.25, dt); } else c.a += steer * (2.4 + (tier === 0 ? .3 : 0)) * dt * clamp(c.v / 140, .3, 1);
      c.x += Math.cos(c.a) * c.v * dt; c.y += Math.sin(c.a) * c.v * dt;
      if (near.d > HALF + 150) { const p = P(c.idx); c.x += (p[0] - c.x) * dt * 2; c.y += (p[1] - c.y) * dt * 2; }
      for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (Math.hypot(it.x - c.x, it.y - c.y) > 44) continue;
        if (it.k === 'arrow') { if (c.boost < .3) { c.boost = 1.3; if (c.me) { sfx.coin(); env.vibe(20); } } }
        else if (it.k === 'oil' && c.oilT <= 0 && it.by !== c) { c.oilT = 1.5; spinOut(c, 'Huile !'); if (it.dyn) items.splice(i, 1); } }
      for (const b of boxes) if (b.off <= 0 && Math.hypot(b.x - c.x, b.y - c.y) < 48) { b.off = 4; if (!c.item) { const r = rank(c), pool = r === 1 ? ['oil', 'oil', 'shield', 'turbo'] : r === 2 ? ['turbo', 'missile', 'oil', 'shield'] : ['missile', 'missile', 'turbo', 'turbo', 'bolt', 'shield']; c.item = pick(pool); c.itemT = rnd(1.2, 4); if (c.me) { sfx.win(); env.vibe(30); say(KART_ITEMS[c.item][0]); } } }
      if (c.me) for (const co of coins) if (co.on && Math.hypot(co.x - c.x, co.y - c.y) < 40) { co.on = false; c.coins++; totalCoins++; sfx.coin(); }
    }
    // --- caméra 3D : derrière le joueur. hc = hauteur, f = focale, hz = ligne d'horizon
    const cam = { x: 0, y: 0, a: 0, hc: 150, f: 300, hz: 100, back: 290 };
    function proj(x, y) { const dx = x - cam.x, dy = y - cam.y, ca = Math.cos(cam.a), sa = Math.sin(cam.a); const z = dx * ca + dy * sa, l = -dx * sa + dy * ca; if (z < 30) return null; const s = cam.f / z; return { x: env.W / 2 + l * s, y: cam.hz + cam.hc * s, s, z }; }
    function update(dt) {
      if (over) return; t += dt; msgT = Math.max(0, msgT - dt); flashT = Math.max(0, flashT - dt); boltT = Math.max(0, boltT - dt); pr.update(dt);
      if (phase === 'menu') { menuUpdate(); return; }
      if (dt > .03) { if (++slowFrames > 40) { band = Math.min(4, band + 1); slowFrames = 0; } } else slowFrames = Math.max(0, slowFrames - 1); // appareil lent : sol moins détaillé
      const me = cars[0];
      if (phase === 'count') { const before = Math.ceil(countT - .6); countT -= dt; const after = Math.ceil(countT - .6); if (after !== before && after >= 0) { if (after === 0) sfx.win(); else sfx.tick(); } if (countT <= .6) phase = 'race'; }
      else {
        raceT += dt; let steer = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
        if (input.pointer.down && !steer) steer = clamp((input.pointer.x - env.W / 2) / (env.W * .25), -1, 1);
        const aim = (c, look) => { const tg = P(c.idx + look); let da = Math.atan2(tg[1] - c.y, tg[0] - c.x) - c.a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; return da; };
        if (tier === 0 && !me.done) steer = clamp(steer + aim(me, 7) * .9, -1, 1); // aide à la conduite pour les petits
        if (me.done) steer = clamp(aim(me, 8) * 2, -1, 1);
        if (input.pressed.a && !me.done) { if (me.item) useItem(me); else if (msgT <= 0) say('Pas d\'objet'); }
        updateCar(me, dt, steer, !!input.held.b && !me.done);
        for (let k = 1; k < cars.length; k++) { const c = cars[k]; const look = 8 + Math.round(c.v / 60), q = at(c.idx + look, c.off + Math.sin(t * .7 + c.wob) * 20); let da = Math.atan2(q[1] - c.y, q[0] - c.x) - c.a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
          const gap = progress(c) - progress(me); const sv = c.skill; c.skill = sv * (gap > 60 ? .9 : gap < -60 ? 1.1 : 1); updateCar(c, dt, clamp(da * 3, -1, 1), Math.abs(da) > .7 && c.v > VMAX * .6); c.skill = sv;
          if (c.item && !c.done) { c.itemT -= dt; if (c.itemT <= 0) useItem(c); } }
        for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) { const a = cars[i], b = cars[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 52 && d > 0) { const push = (52 - d) / 2, ux = dx / d, uy = dy / d; a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push; const av = (a.v + b.v) / 2; a.v = a.v * .6 + av * .4; b.v = b.v * .6 + av * .4; if (a.shield > 0 && b.shield <= 0) spinOut(b); else if (b.shield > 0 && a.shield <= 0) spinOut(a); } }
        for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.t -= dt; s.idx += 760 * dt / 22; const q = at(Math.floor(s.idx), 0), q2 = at(Math.floor(s.idx) + 1, 0), u = s.idx % 1; s.x = q[0] + (q2[0] - q[0]) * u; s.y = q[1] + (q2[1] - q[1]) * u; let hit = false; for (const c of cars) if (c !== s.from && !c.done && Math.hypot(c.x - s.x, c.y - s.y) < HALF * .9 + 10) { const dIdx = ((c.idx - Math.floor(s.idx)) % path.length + path.length) % path.length; if (dIdx < 3 || dIdx > path.length - 3) { spinOut(c, 'Touché par un missile !'); const p = proj(c.x, c.y); if (p) pr.burst(p.x, p.y - 20, '#ff9f1c', 18, 220); if (s.from.me) { sfx.hit(); say('Touché !'); } hit = true; break; } } if (hit || s.t <= 0) shots.splice(i, 1); }
        for (const b of boxes) b.off = Math.max(0, b.off - dt);
        if (me.done && phase === 'race') { phase = 'end'; endT = 3.4; const r = rank(me); msg = ['VICTOIRE !', '2e place', '3e place', '4e place'][r - 1]; msgT = 3.2; }
        if (phase === 'end') { endT -= dt; if (endT <= 0) { finishRace(); return; } }
      }
      let da = me.a - cam.a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; cam.a += da * Math.min(1, dt * (me.spin > 0 ? 0 : 5));
      cam.x = me.x - Math.cos(cam.a) * cam.back; cam.y = me.y - Math.sin(cam.a) * cam.back;
      env.setScore(cup ? cupPts[0] * 100 + totalCoins * 5 : totalCoins * 5); env.hud((cup ? 'Circuit ' + (trackIdx + 1) + '/3 · ' : '') + 'Tour ' + Math.min(LAPS, me.lap + 1) + '/' + LAPS);
    }
    function finishRace() {
      const order = cars.slice().sort((a, b) => progress(b) - progress(a)); order.forEach((c, i) => { cupPts[c.slot] += POINTS[i]; });
      const pos = order.findIndex(c => c.me) + 1;
      if (!cup) { over = true; env.gameOver(POINTS[pos - 1] * 100 + totalCoins * 5 + (pos === 1 ? 300 : 0), { win: pos === 1, title: pos === 1 ? 'VICTOIRE !' : pos + 'e place', text: KART_TRACKS[trackIdx].name + ' · ' + totalCoins + ' pièces' }); return; }
      trackIdx++;
      if (trackIdx >= KART_TRACKS.length) { over = true; const final = [0, 1, 2, 3].sort((a, b) => cupPts[b] - cupPts[a]); const fp = final.indexOf(0) + 1; env.gameOver(cupPts[0] * 100 + totalCoins * 5 + (fp === 1 ? 500 : 0), { win: fp === 1, title: fp === 1 ? 'COUPE GAGNÉE !' : fp + 'e de la coupe', text: cupPts[0] + ' points sur 30 · ' + totalCoins + ' pièces' }); return; }
      startRace();
    }
    // --- menu : voiture + circuit
    function menuLayout() { const W = env.W, H = env.H; const cw = Math.min(86, (W - 24) / 5), cx0 = W / 2 - cw * 2.5, cy = H * .2, ch = Math.min(120, H * .2); const tw = Math.min(170, (W - 24) / 4), tx0 = W / 2 - tw * 2, ty = H * .5, th = Math.min(120, H * .22); return { cw, cx0, cy, ch, tw, tx0, ty, th, gy: H * .82 }; }
    function menuUpdate() {
      const L = menuLayout(), tp = input.tap;
      if (input.pressed.left) { selCar = (selCar + 4) % 5; sfx.tap(); } if (input.pressed.right) { selCar = (selCar + 1) % 5; sfx.tap(); }
      if (tp) { if (tp.y > L.cy && tp.y < L.cy + L.ch) { const i = Math.floor((tp.x - L.cx0) / L.cw); if (i >= 0 && i < 5) { selCar = i; sfx.tap(); } } else if (tp.y > L.ty && tp.y < L.ty + L.th) { const i = Math.floor((tp.x - L.tx0) / L.tw); if (i >= 0 && i < 4) { selTrack = i; sfx.tap(); } } else if (tp.y > L.gy - 30) go(); }
      if (input.pressed.a) go();
    }
    function go() { sfx.ok(); cup = selTrack === 3; trackIdx = cup ? 0 : selTrack; cupPts = [0, 0, 0, 0]; totalCoins = 0; startRace(); }
    function drawMenu(c) {
      const W = env.W, H = env.H, L = menuLayout(); const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5ad1ff'); g.addColorStop(.5, '#dff6ff'); g.addColorStop(.5, '#5cc04a'); g.addColorStop(1, '#3f9a35'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const title = (txt, y, fs, col) => { c.lineWidth = 6; c.strokeStyle = '#1b1540'; c.font = '900 ' + fs + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(txt, W / 2, y); Draw.text(c, txt, W / 2, y, fs, col); };
      title('KART GRAND PRIX', H * .07, Math.min(34, W / 11), '#ffd23f'); title('Ta voiture', L.cy - 14, 16, '#fff'); title('Ton circuit', L.ty - 14, 16, '#fff');
      for (let i = 0; i < 5; i++) { const x = L.cx0 + i * L.cw, on = i === selCar; c.fillStyle = on ? 'rgba(255,255,255,.85)' : 'rgba(27,21,64,.35)'; Draw.rr(c, x + 4, L.cy, L.cw - 8, L.ch, 12); c.fill(); if (on) { c.strokeStyle = '#ffd23f'; c.lineWidth = 4; c.stroke(); } const im = IMG['car' + i]; if (im.complete && im.width) { const s = Math.min((L.cw - 24) / im.width, (L.ch - 16) / im.height) * (on ? 1 + Math.sin(t * 6) * .04 : .9); c.drawImage(im, x + L.cw / 2 - im.width * s / 2, L.cy + L.ch / 2 - im.height * s / 2, im.width * s, im.height * s); } }
      for (let i = 0; i < 4; i++) { const x = L.tx0 + i * L.tw, on = i === selTrack; c.fillStyle = on ? 'rgba(255,255,255,.85)' : 'rgba(27,21,64,.35)'; Draw.rr(c, x + 4, L.ty, L.tw - 8, L.th, 12); c.fill(); if (on) { c.strokeStyle = '#ffd23f'; c.lineWidth = 4; c.stroke(); }
        const col = on ? '#1b1540' : '#fff';
        if (i < 3) { const pts = spline(KART_TRACKS[i].pts, 60), sc = Math.min((L.tw - 28) / WORLD_W, (L.th - 44) / WORLD_H), ox = x + L.tw / 2 - WORLD_W * sc / 2, oy = L.ty + 8; c.strokeStyle = on ? '#e8452c' : '#fff'; c.lineWidth = 4; c.lineJoin = 'round'; c.beginPath(); pts.forEach((p, k) => k ? c.lineTo(ox + p[0] * sc, oy + p[1] * sc) : c.moveTo(ox + p[0] * sc, oy + p[1] * sc)); c.closePath(); c.stroke(); Draw.text(c, KART_TRACKS[i].name, x + L.tw / 2, L.ty + L.th - 16, Math.min(12, L.tw / 9), col, 'center', 800); }
        else { Draw.text(c, 'COUPE', x + L.tw / 2, L.ty + L.th * .36, Math.min(20, L.tw / 5), on ? '#e8452c' : '#ffd23f'); Draw.text(c, 'les 3 circuits', x + L.tw / 2, L.ty + L.th - 16, Math.min(12, L.tw / 9), col, 'center', 800); } }
      c.fillStyle = '#9dff5c'; Draw.rr(c, W / 2 - 110, L.gy - 26, 220, 52, 16); c.fill(); c.strokeStyle = '#1b1540'; c.lineWidth = 4; c.stroke(); Draw.text(c, 'PARTIR !', W / 2, L.gy, 24, '#1b1540');
    }
    // --- rendu 3D
    function drawFloor(c) {
      const W = env.W, H = env.H, q = .5, w = Math.ceil(W * q), h = Math.ceil(H * q); if (!floor || floor.width !== w || floor.height !== h) { floor = document.createElement('canvas'); floor.width = w; floor.height = h; fctx = floor.getContext('2d'); }
      const hz = cam.hz * q, f = cam.f * q, ca = Math.cos(cam.a), sa = Math.sin(cam.a), rot = -cam.a - Math.PI / 2; fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.fillStyle = '#5cc04a'; fctx.fillRect(0, 0, w, h);
      for (let y = Math.ceil(hz) + 1; y < h; y += band) { const z = cam.hc * f / (y + band / 2 - hz), s = f / z; fctx.save(); fctx.beginPath(); fctx.rect(0, y, w, band); fctx.clip(); fctx.translate(w / 2, y + band / 2); fctx.scale(s, s); fctx.rotate(rot); fctx.translate(-(cam.x + ca * z), -(cam.y + sa * z)); fctx.drawImage(world, 0, 0); fctx.restore(); }
      c.imageSmoothingEnabled = true; const sy0 = Math.ceil(hz) + 1; c.drawImage(floor, 0, sy0, w, h - sy0, 0, sy0 / q, W, (h - sy0) / q); // seulement sous l'horizon
      // brume vers l'horizon
      const g = c.createLinearGradient(0, cam.hz, 0, cam.hz + H * .22); g.addColorStop(0, 'rgba(223,246,255,.85)'); g.addColorStop(1, 'rgba(223,246,255,0)'); c.fillStyle = g; c.fillRect(0, cam.hz, W, H * .22);
    }
    function flatSprite(c, k, p, rel, sc) { const im = IMG[k]; if (!im.complete || !im.width) return; c.save(); c.translate(p.x, p.y); c.scale(1, clamp(cam.hc / p.z * 1.35, .28, 1)); c.rotate(rel); c.scale(p.s * sc, p.s * sc); c.drawImage(im, -im.width / 2, -im.height / 2); c.restore(); }
    function draw(c) {
      const W = env.W, H = env.H; if (phase === 'menu') { drawMenu(c); return; }
      const me = cars[0]; const dRow = clamp(H * .42, 110, 185); cam.hc = 150; cam.f = clamp(Math.min(W, H) * .9, 240, 520); cam.hz = clamp(H - dRow - H * .2, H * .24, H * .46); cam.back = cam.hc * cam.f / dRow; // la voiture du joueur garde la même taille sur tous les écrans
      // ciel
      const sky = c.createLinearGradient(0, 0, 0, cam.hz); sky.addColorStop(0, '#38a8f0'); sky.addColorStop(1, '#dff6ff'); c.fillStyle = sky; c.fillRect(0, 0, W, cam.hz + 2);
      const pan = ((cam.a / 6.283) % 1 + 1) % 1; c.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { const x = (((i / 7 - pan) % 1 + 1) % 1) * W * 2.4 - W * .4, y = cam.hz * (.25 + (i % 3) * .2); c.globalAlpha = .9; c.beginPath(); c.arc(x, y, 22, 0, 7); c.arc(x + 26, y - 10, 28, 0, 7); c.arc(x + 56, y, 22, 0, 7); c.fill(); } c.globalAlpha = 1;
      c.fillStyle = '#7fb89a'; for (let i = 0; i < 9; i++) { const x = (((i / 9 - pan * 2) % 1 + 1) % 1) * W * 2 - W * .3; c.beginPath(); c.arc(x, cam.hz + 30, 90 + (i % 3) * 30, Math.PI, 0); c.fill(); }
      drawFloor(c);
      // objets à plat : huile, puis tout ce qui a du relief trié du plus loin au plus près
      for (const it of items) if (it.k === 'oil') { const p = proj(it.x, it.y); if (p && p.z < 1500) flatSprite(c, 'oil', p, it.a - cam.a, .8); }
      const list = [];
      for (const b of bills) { const p = proj(b.x, b.y); if (p && p.z > cam.back * 1.08 && p.z < 1700 && p.x > -200 && p.x < W + 200) list.push({ p, t: 'bill', o: b }); } // rien entre la caméra et la voiture
      for (const b of boxes) if (b.off <= 0) { const p = proj(b.x, b.y); if (p && p.z < 1500) list.push({ p, t: 'box' }); }
      for (const co of coins) if (co.on) { const p = proj(co.x, co.y); if (p && p.z < 1300) list.push({ p, t: 'coin' }); }
      for (const s of shots) { const p = proj(s.x, s.y); if (p) list.push({ p, t: 'shot' }); }
      for (const cr of cars) { const p = proj(cr.x, cr.y); if (p) list.push({ p, t: 'car', o: cr }); }
      list.sort((a, b) => b.p.z - a.p.z);
      for (const e of list) { const p = e.p, s = p.s;
        if (e.t === 'bill') { const im = IMG[e.o.k]; if (!im.complete || !im.width) continue; const sc = s * e.o.s * (e.o.k === 'rock' ? .9 : 1.25), wI = im.width * sc, hI = im.height * sc; c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(p.x, p.y, wI * .42, wI * .12, 0, 0, 7); c.fill(); c.drawImage(im, p.x - wI / 2, p.y - hI * (e.o.k === 'rock' ? .8 : .92), wI, hI); }
        else if (e.t === 'box') { const sz = 46 * s, by = p.y - sz * 1.25 - Math.sin(t * 4 + p.z) * 6 * s; c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(p.x, p.y, sz * .5, sz * .14, 0, 0, 7); c.fill(); const hue = (t * 120 + p.z) % 360; c.fillStyle = 'hsl(' + hue + ',90%,62%)'; c.strokeStyle = '#1b1540'; c.lineWidth = Math.max(1.5, 3 * s); Draw.rr(c, p.x - sz / 2, by, sz, sz, sz * .2); c.fill(); c.stroke(); Draw.text(c, '?', p.x, by + sz / 2 + 1, sz * .7, '#fff'); }
        else if (e.t === 'coin') { const r = 15 * s, w = Math.abs(Math.cos(t * 5 + p.z * .01)); c.fillStyle = '#ffd23f'; c.strokeStyle = '#b5642a'; c.lineWidth = Math.max(1, 2.5 * s); c.beginPath(); c.ellipse(p.x, p.y - r * 1.5, r * (.25 + .75 * w), r, 0, 0, 7); c.fill(); c.stroke(); }
        else if (e.t === 'shot') { const r = 17 * s; c.fillStyle = '#ff4f4f'; c.strokeStyle = '#1b1540'; c.lineWidth = Math.max(1.5, 3 * s); c.beginPath(); c.arc(p.x, p.y - r, r, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(p.x, p.y - r, r * .4, 0, 7); c.fill(); }
        else { const cr = e.o; c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(p.x, p.y + 6 * s, 44 * s, 20 * s * clamp(cam.hc / p.z * 1.35, .28, 1), 0, 0, 7); c.fill();
          if (cr.boost > 0) { c.fillStyle = 'rgba(255,160,30,.9)'; const bx = p.x - Math.sin(cr.a - cam.a) * 40 * s, by = p.y + Math.cos(cr.a - cam.a) * 40 * s * .6; c.beginPath(); c.arc(bx, by, (12 + Math.random() * 10) * s, 0, 7); c.fill(); }
          flatSprite(c, cr.img, { x: p.x, y: p.y - 8 * s, s, z: p.z }, cr.a - cam.a, .78);
          if (cr.shield > 0) { c.strokeStyle = 'rgba(56,224,214,' + (.6 + Math.sin(t * 10) * .3) + ')'; c.lineWidth = 4 * s + 1; c.beginPath(); c.ellipse(p.x, p.y - 8 * s, 52 * s, 44 * s, 0, 0, 7); c.stroke(); }
          if (cr.slow > 0) Draw.text(c, 'zzz', p.x, p.y - 60 * s, 18 * s + 6, '#ffd23f');
          if (!cr.me && p.z < 900) { c.lineWidth = 3; c.strokeStyle = '#1b1540'; c.font = '800 ' + Math.round(11 + 8 * s) + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-body'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(cr.name, p.x, p.y - 66 * s); c.fillStyle = '#fff'; c.fillText(cr.name, p.x, p.y - 66 * s); } }
      }
      pr.draw(c);
      if (boltT > 0 || flashT > 0) { c.fillStyle = 'rgba(255,255,255,' + Math.max(boltT, flashT) * 1.4 + ')'; c.fillRect(0, 0, W, H); }
      // HUD
      const r = rank(me), ord = r + (r === 1 ? 'er' : 'e'); c.lineWidth = 6; c.strokeStyle = '#1b1540'; c.font = '900 44px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'left'; c.textBaseline = 'middle'; c.strokeText(ord, 14, 36); Draw.text(c, ord, 14, 36, 44, ['#ffd23f', '#e8e8f0', '#ff9f1c', '#fff'][r - 1], 'left');
      c.fillStyle = '#ffd23f'; c.strokeStyle = '#b5642a'; c.lineWidth = 2.5; c.beginPath(); c.arc(26, 78, 10, 0, 7); c.fill(); c.stroke(); c.lineWidth = 4; c.strokeStyle = '#1b1540'; c.font = '900 18px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.strokeText('× ' + me.coins, 42, 79); Draw.text(c, '× ' + me.coins, 42, 79, 18, '#fff', 'left');
      const ix = W / 2 - 34, iy = 8; c.fillStyle = 'rgba(27,21,64,.75)'; Draw.rr(c, ix, iy, 68, 68, 14); c.fill(); c.strokeStyle = me.item ? KART_ITEMS[me.item][1] : 'rgba(255,255,255,.4)'; c.lineWidth = 4; c.stroke();
      if (me.item) { const k = me.item, cx = W / 2, cy = iy + 30; c.fillStyle = KART_ITEMS[k][1]; c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); if (k === 'bolt') { c.moveTo(cx + 6, cy - 20); c.lineTo(cx - 10, cy + 2); c.lineTo(cx, cy + 2); c.lineTo(cx - 6, cy + 20); c.lineTo(cx + 12, cy - 4); c.lineTo(cx + 2, cy - 4); c.closePath(); } else if (k === 'turbo') { c.moveTo(cx, cy - 20); c.lineTo(cx + 14, cy + 6); c.lineTo(cx + 5, cy + 6); c.lineTo(cx + 5, cy + 18); c.lineTo(cx - 5, cy + 18); c.lineTo(cx - 5, cy + 6); c.lineTo(cx - 14, cy + 6); c.closePath(); } else if (k === 'shield') { c.moveTo(cx, cy - 20); c.lineTo(cx + 16, cy - 12); c.lineTo(cx + 12, cy + 10); c.lineTo(cx, cy + 20); c.lineTo(cx - 12, cy + 10); c.lineTo(cx - 16, cy - 12); c.closePath(); } else if (k === 'oil') { c.ellipse(cx, cy + 4, 18, 11, 0, 0, 7); } else { c.arc(cx, cy, 15, 0, 7); } c.fill(); c.stroke(); Draw.text(c, KART_ITEMS[k][0], W / 2, iy + 59, 10, '#fff', 'center', 900); }
      else Draw.text(c, '?', W / 2, iy + 34, 30, 'rgba(255,255,255,.35)');
      const mw = Math.min(120, W * .28), ms = mw / WORLD_W, mx = W - mw - 10, my = 10; c.fillStyle = 'rgba(27,21,64,.6)'; Draw.rr(c, mx - 4, my - 4, mw + 8, WORLD_H * ms + 8, 8); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); path.forEach((p, i) => { if (i % 3) return; i ? c.lineTo(mx + p[0] * ms, my + p[1] * ms) : c.moveTo(mx + p[0] * ms, my + p[1] * ms); }); c.closePath(); c.stroke();
      const cols = ['#e8452c', '#38a0e0', '#3fbf4f', '#ffd23f', '#555']; for (let k = cars.length - 1; k >= 0; k--) { const cr = cars[k]; c.fillStyle = cols[+cr.img.slice(3)]; c.strokeStyle = cr.me ? '#fff' : '#1b1540'; c.lineWidth = 2; c.beginPath(); c.arc(mx + cr.x * ms, my + cr.y * ms, cr.me ? 6 : 4, 0, 7); c.fill(); c.stroke(); }
      const big = (txt, y, fs, col) => { c.lineWidth = 7; c.strokeStyle = '#1b1540'; c.font = '900 ' + fs + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(txt, W / 2, y); Draw.text(c, txt, W / 2, y, fs, col); };
      if (phase === 'count') { const n = Math.ceil(countT - .6); for (let i = 0; i < 3; i++) { c.fillStyle = n <= 0 ? '#3fdf5f' : (3 - n >= i ? '#ff3b30' : '#3a3a4a'); c.strokeStyle = '#1b1540'; c.lineWidth = 4; c.beginPath(); c.arc(W / 2 - 56 + i * 56, H * .2 + 70, 20, 0, 7); c.fill(); c.stroke(); } big(n > 0 ? String(n) : 'PARTEZ !', H * .48, Math.min(72, W / 5), n > 0 ? '#fff' : '#9dff5c'); if (msgT > 0) big(msg, H * .62, Math.min(24, W / 16), '#fff'); }
      else if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 2); big(msg, cam.hz + 30, Math.min(36, W / (msg.length * .62)), '#ffd23f'); c.globalAlpha = 1; }
    }
    if (saved && typeof saved.trackIdx === 'number') { trackIdx = clamp(saved.trackIdx | 0, 0, 2); cup = true; selTrack = 3; selCar = clamp(saved.selCar | 0, 0, 4); if (Array.isArray(saved.cupPts) && saved.cupPts.length === 4) cupPts = saved.cupPts.slice(); startRace(); }
    const ready = () => Object.values(IMG).every(i => i.complete && i.width); if (!ready()) { const iv = setInterval(() => { if (ready() || over) { clearInterval(iv); if (!over && phase !== 'menu') buildWorld(); } }, 60); }
    return { update, draw, dbg: () => ({ cars, path, phase, trackIdx, cupPts, HALF, boxes, coins }) };
  }
});
