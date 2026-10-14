/* ===== Tour de Défense (dès 10 ans) — place des tours, survis aux vagues ===== */
GAMES.push({
  id: 'defense', title: 'Tour de Défense', tagline: 'Place tes tours, tiens 20 vagues', minAge: 10, color: '#3fbf4f',
  icon: '<svg viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="8" fill="#4faf40"/><path d="M6 24h20v16h18V6" stroke="#d9b36b" stroke-width="10" fill="none"/><rect x="36" y="38" width="14" height="14" rx="3" fill="#9b7bff"/><rect x="39" y="32" width="8" height="8" fill="#9b7bff"/><circle cx="14" cy="44" r="6" fill="#ff4f9a"/><circle cx="12" cy="43" r="1.5" fill="#fff"/><circle cx="16" cy="43" r="1.5" fill="#fff"/></svg>',
  howto: ['', '', 'Choisis une tour en bas, tape une case libre pour la poser. Les ennemis suivent le chemin : ne les laisse pas sortir ! Tape une tour pour l\'améliorer. Tiens 20 vagues.'],
  pad: null,
  stars: s => s >= 3000 ? 3 : s >= 1500 ? 2 : s >= 500 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env; const hard = env.tier >= 2;
    const COLS = 12, ROWS = 10, WAVES = hard ? 25 : 20;
    const WP = [[-1, 2], [3, 2], [3, 7], [7, 7], [7, 2], [10, 2], [10, 10]]; // chemin en cases
    const TYPES = { arc: { n: 'Arc', cost: 50, range: 2.6, dmg: 9, rate: .55, c: '#38e0d6' }, canon: { n: 'Canon', cost: 90, range: 2.3, dmg: 22, rate: 1.4, splash: 1, c: '#ff9f1c' }, glace: { n: 'Glace', cost: 70, range: 2.2, dmg: 4, rate: .7, slow: 2, c: '#5ad1ff' } };
    let cell = 30, ox = 0, oy = 0, barH = 64, towers = [], foes = [], shots = [], gold = hard ? 110 : 140, lives = 10, wave = 0, inWave = false, spawnQ = [], spawnT = 0, countdown = 20, sel = 'arc', selTower = null, score = 0, kills = 0, over = false, t = 0, msg = '', msgT = 0;
    const pr = Particles();
    const pathCells = new Set(); for (let i = 0; i < WP.length - 1; i++) { const [x0, y0] = WP[i], [x1, y1] = WP[i + 1]; const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0); let x = x0, y = y0; while (x !== x1 || y !== y1) { pathCells.add(x + ',' + y); x += dx; y += dy; } pathCells.add(x1 + ',' + y1); }
    // en portrait, la grille est tournée (10 colonnes × 12 lignes) : (x,y) logique → (y,x) écran
    let tr = false; const SX = (x, y) => tr ? y : x, SY = (x, y) => tr ? x : y;
    function fit() { tr = env.H - barH > env.W; const cw = tr ? ROWS : COLS, ch = tr ? COLS : ROWS; cell = Math.floor(Math.min(env.W / cw, (env.H - barH - 10) / ch)); ox = Math.floor((env.W - cw * cell) / 2); oy = Math.floor((env.H - barH - ch * cell) / 2); }
    const PX = (x, y) => ox + SX(x, y) * cell, PY = (x, y) => oy + SY(x, y) * cell;
    function persist() { env.save({ wave, gold, lives, score, kills, towers: towers.map(tw => ({ x: tw.x, y: tw.y, k: tw.k, lvl: tw.lvl })) }, 'Vague ' + wave + ' · ' + lives + ' vies · ' + gold + ' or'); }
    function startWave() {
      if (inWave) return; wave++; inWave = true; selTower = null; const n = 6 + wave * 2; spawnQ = [];
      for (let i = 0; i < n; i++) { let k = 'slime'; if (wave >= 3 && i % 3 === 2) k = 'fast'; if (wave >= 5 && i % 5 === 4) k = 'tank'; spawnQ.push(k); }
      if (wave % 5 === 0) spawnQ.push('boss'); spawnT = 0; msg = 'Vague ' + wave + (wave % 5 === 0 ? ' · BOSS' : ''); msgT = 1.5; sfx.ok(); persist();
    }
    function spawn(k) {
      const hpB = { slime: 28, fast: 18, tank: 110, boss: 500 }[k], sp = { slime: 1.3, fast: 2.4, tank: .8, boss: .65 }[k], g = { slime: 4, fast: 5, tank: 14, boss: 60 }[k];
      const mult = 1 + wave * (hard ? .22 : .16); foes.push({ k, x: WP[0][0], y: WP[0][1], wp: 1, hp: hpB * mult, max: hpB * mult, sp, gold: g, slow: 0, r: k === 'boss' ? .42 : k === 'tank' ? .34 : .26, c: { slime: '#9b7bff', fast: '#ffd23f', tank: '#ff6a55', boss: '#ff4f9a' }[k] });
    }
    function tapCell(cx, cy) {
      const tw = towers.find(w => w.x === cx && w.y === cy);
      if (tw) { selTower = selTower === tw ? null : tw; sfx.tap(); return; }
      selTower = null; if (pathCells.has(cx + ',' + cy)) { sfx.ko(); return; }
      const ty = TYPES[sel]; if (gold < ty.cost) { msg = 'Pas assez d\'or'; msgT = 1; sfx.ko(); return; }
      gold -= ty.cost; towers.push({ x: cx, y: cy, k: sel, lvl: 1, cd: 0 }); sfx.coin(); env.vibe(20); pr.burst(PX(cx + .5, cy + .5), PY(cx + .5, cy + .5), ty.c, 10, 120); persist();
    }
    function upgrade(tw) { const cost = Math.round(TYPES[tw.k].cost * .7 * tw.lvl); if (tw.lvl >= 3) return; if (gold < cost) { msg = 'Pas assez d\'or'; msgT = 1; sfx.ko(); return; } gold -= cost; tw.lvl++; sfx.win(); pr.burst(PX(tw.x + .5, tw.y + .5), PY(tw.x + .5, tw.y + .5), '#fff', 12, 140); persist(); }
    function stat(tw) { const ty = TYPES[tw.k]; return { range: ty.range + (tw.lvl - 1) * .35, dmg: ty.dmg * (1 + (tw.lvl - 1) * .6), rate: ty.rate * (1 - (tw.lvl - 1) * .15) }; }
    function update(dt) {
      if (over) return; t += dt; msgT = Math.max(0, msgT - dt); pr.update(dt);
      if (input.tap) {
        const tp = input.tap; const by = env.H - barH;
        if (tp.y >= by) { // barre du bas
          const keys = Object.keys(TYPES), bw = env.W / 5; const i = Math.floor(tp.x / bw);
          if (i < 3) { sel = keys[i]; selTower = null; sfx.tap(); } else if (i === 3) { if (selTower) upgrade(selTower); } else startWave();
        } else { const sx = Math.floor((tp.x - ox) / cell), sy = Math.floor((tp.y - oy) / cell); const cx = tr ? sy : sx, cy = tr ? sx : sy; if (cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS) tapCell(cx, cy); }
      }
      if (!inWave) { countdown -= dt; if (countdown <= 0) { startWave(); } }
      else {
        spawnT -= dt; if (spawnQ.length && spawnT <= 0) { spawn(spawnQ.shift()); spawnT = spawnQ.length && spawnQ[0] === 'boss' ? 1.5 : Math.max(.35, .9 - wave * .02); }
        if (!spawnQ.length && !foes.length) { inWave = false; countdown = 18; gold += 20 + wave * 3; score += 100 * wave; sfx.win(); msg = 'Vague ' + wave + ' repoussée ! +' + (20 + wave * 3) + ' or'; msgT = 2; if (wave >= WAVES) { over = true; env.gameOver(score, { win: true, text: WAVES + ' vagues tenues · ' + kills + ' ennemis' }); return; } persist(); }
      }
      for (let i = foes.length - 1; i >= 0; i--) {
        const f = foes[i]; const tg = WP[f.wp]; const sp = f.sp * (f.slow > 0 ? .5 : 1); f.slow = Math.max(0, f.slow - dt);
        const dx = tg[0] - f.x, dy = tg[1] - f.y, d = Math.hypot(dx, dy);
        if (d < sp * dt) { f.x = tg[0]; f.y = tg[1]; f.wp++; if (f.wp >= WP.length) { foes.splice(i, 1); lives -= f.k === 'boss' ? 3 : 1; sfx.hit(); env.vibe(150); if (lives <= 0) { lives = 0; over = true; env.gameOver(score, { text: 'Vague ' + wave + ' · ' + kills + ' ennemis vaincus' }); return; } continue; } }
        else { f.x += dx / d * sp * dt; f.y += dy / d * sp * dt; }
      }
      for (const tw of towers) {
        tw.cd -= dt; if (tw.cd > 0) continue; const st = stat(tw);
        let best = null, bestP = -1; for (const f of foes) { const d = Math.hypot(f.x + .5 - (tw.x + .5), f.y + .5 - (tw.y + .5)); if (d <= st.range) { const p = f.wp * 100 - Math.hypot(WP[f.wp][0] - f.x, WP[f.wp][1] - f.y); if (p > bestP) { bestP = p; best = f; } } }
        if (best) { tw.cd = st.rate; shots.push({ x: tw.x + .5, y: tw.y + .5, tg: best, k: tw.k, dmg: st.dmg, sp: tw.k === 'canon' ? 5 : 9, c: TYPES[tw.k].c }); if (S.sound) sfx.tick(); }
      }
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i]; const f = s.tg; if (!foes.includes(f)) { shots.splice(i, 1); continue; }
        const dx = f.x + .5 - s.x, dy = f.y + .5 - s.y, d = Math.hypot(dx, dy);
        if (d < .25) { shots.splice(i, 1); const victims = s.k === 'canon' ? foes.filter(o => Math.hypot(o.x - f.x, o.y - f.y) <= 1) : [f]; for (const v of victims) { v.hp -= s.dmg; if (s.k === 'glace') v.slow = 2; } pr.burst(PX(f.x + .5, f.y + .5), PY(f.x + .5, f.y + .5), s.c, s.k === 'canon' ? 10 : 3, 100); }
        else { s.x += dx / d * s.sp * dt; s.y += dy / d * s.sp * dt; }
      }
      for (let i = foes.length - 1; i >= 0; i--) { const f = foes[i]; if (f.hp <= 0) { foes.splice(i, 1); gold += f.gold; kills++; score += f.k === 'boss' ? 200 : 10; sfx.pop(); pr.burst(PX(f.x + .5, f.y + .5), PY(f.x + .5, f.y + .5), f.c, 12, 160); } }
      env.setScore(score); env.hud('Vague ' + wave + '/' + WAVES + ' · ' + gold + ' or · ' + lives + ' ♥');
    }
    function draw(c) {
      const W = env.W, H = env.H; c.fillStyle = '#4faf40'; c.fillRect(0, 0, W, H);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const px = PX(x, y), py = PY(x, y); c.fillStyle = pathCells.has(x + ',' + y) ? '#d9b36b' : ((x + y) % 2 ? '#52b545' : '#4faf40'); c.fillRect(px, py, cell, cell); }
      c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = 1; c.strokeRect(ox, oy, (tr ? ROWS : COLS) * cell, (tr ? COLS : ROWS) * cell);
      { const ex = PX(10.5, 9.5), ey = PY(10.5, 9.5); c.fillStyle = '#1b1540'; c.fillRect(ex - 2, ey - cell * .4, 3, cell * .8); c.fillStyle = '#ff4f4f'; c.beginPath(); c.moveTo(ex + 1, ey - cell * .4); c.lineTo(ex + cell * .4, ey - cell * .25); c.lineTo(ex + 1, ey - cell * .1); c.fill(); }
      for (const tw of towers) {
        const px = PX(tw.x + .5, tw.y + .5), py = PY(tw.x + .5, tw.y + .5), ty = TYPES[tw.k], st = stat(tw);
        if (selTower === tw) { c.fillStyle = 'rgba(255,255,255,.15)'; c.beginPath(); c.arc(px, py, st.range * cell, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.stroke(); }
        c.fillStyle = '#2b2270'; Draw.rr(c, px - cell * .38, py - cell * .38, cell * .76, cell * .76, 6); c.fill();
        c.fillStyle = ty.c; if (tw.k === 'arc') { c.beginPath(); c.moveTo(px, py - cell * .28); c.lineTo(px + cell * .24, py + cell * .2); c.lineTo(px - cell * .24, py + cell * .2); c.closePath(); c.fill(); } else if (tw.k === 'canon') { c.beginPath(); c.arc(px, py, cell * .24, 0, 7); c.fill(); c.fillStyle = '#1b1540'; c.beginPath(); c.arc(px, py, cell * .1, 0, 7); c.fill(); } else { c.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; c.lineTo(px + Math.cos(a) * cell * .26, py + Math.sin(a) * cell * .26); } c.closePath(); c.fill(); }
        for (let k = 0; k < tw.lvl; k++) { c.fillStyle = '#ffd23f'; c.fillRect(px - cell * .3 + k * cell * .2, py + cell * .26, cell * .14, cell * .08); }
      }
      for (const f of foes) { const px = PX(f.x + .5, f.y + .5), py = PY(f.x + .5, f.y + .5), r = f.r * cell; c.fillStyle = f.slow > 0 ? '#5ad1ff' : f.c; c.beginPath(); c.ellipse(px, py + r * .1, r, r * .9, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(px - r * .3, py - r * .2, r * .2, 0, 7); c.arc(px + r * .3, py - r * .2, r * .2, 0, 7); c.fill(); c.fillStyle = '#1b1540'; c.beginPath(); c.arc(px - r * .3, py - r * .2, r * .1, 0, 7); c.arc(px + r * .3, py - r * .2, r * .1, 0, 7); c.fill(); c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(px - r, py - r - 6, r * 2, 4); c.fillStyle = '#9dff5c'; c.fillRect(px - r, py - r - 6, r * 2 * f.hp / f.max, 4); }
      for (const s of shots) { c.fillStyle = s.c; c.beginPath(); c.arc(PX(s.x, s.y), PY(s.x, s.y), s.k === 'canon' ? 6 : 3, 0, 7); c.fill(); }
      pr.draw(c);
      // barre du bas
      const by = H - barH; c.fillStyle = '#1b1540'; c.fillRect(0, by, W, barH); const bw = W / 5;
      Object.keys(TYPES).forEach((k, i) => { const ty = TYPES[k], x = i * bw; if (sel === k) { c.fillStyle = 'rgba(255,255,255,.15)'; Draw.rr(c, x + 4, by + 6, bw - 8, barH - 12, 10); c.fill(); } c.fillStyle = ty.c; c.beginPath(); c.arc(x + bw / 2, by + 24, 10, 0, 7); c.fill(); Draw.text(c, ty.n, x + bw / 2, by + 44, 12, '#fff', 'center', 800); Draw.text(c, ty.cost + ' or', x + bw / 2, by + 56, 10, gold >= ty.cost ? '#ffd23f' : '#ff6a55', 'center', 700); });
      const ux = 3 * bw; if (selTower && selTower.lvl < 3) { c.fillStyle = '#9b7bff'; Draw.rr(c, ux + 4, by + 8, bw - 8, barH - 16, 10); c.fill(); Draw.text(c, 'Améliorer', ux + bw / 2, by + 26, 12, '#fff', 'center', 800); Draw.text(c, Math.round(TYPES[selTower.k].cost * .7 * selTower.lvl) + ' or', ux + bw / 2, by + 44, 11, '#1b1540', 'center', 800); } else if (selTower) Draw.text(c, 'Niveau max', ux + bw / 2, by + 32, 11, '#b9b0e6', 'center', 700);
      const wx = 4 * bw; c.fillStyle = inWave ? '#4b3fa3' : '#9dff5c'; Draw.rr(c, wx + 4, by + 8, bw - 8, barH - 16, 10); c.fill(); Draw.text(c, inWave ? 'Vague ' + wave : 'Lancer', wx + bw / 2, by + 26, 12, inWave ? '#fff' : '#1b1540', 'center', 800); Draw.text(c, inWave ? foes.length + spawnQ.length + ' restants' : 'dans ' + Math.ceil(countdown) + ' s', wx + bw / 2, by + 44, 10, inWave ? '#b9b0e6' : '#1b1540', 'center', 700);
      if (msgT > 0) { c.globalAlpha = Math.min(1, msgT); Draw.text(c, msg, W / 2, oy + (tr ? COLS : ROWS) * cell / 2, 24, '#fff'); c.globalAlpha = 1; }
    }
    if (saved && saved.towers) { wave = saved.wave | 0; gold = saved.gold | 0; lives = saved.lives | 0; score = saved.score | 0; kills = saved.kills | 0; towers = saved.towers.map(w => ({ x: w.x, y: w.y, k: w.k, lvl: w.lvl, cd: 0 })); }
    fit();
    return { update, draw, resize: fit, dbg: () => ({ towers, gold, cell, ox, oy, wave, foes: foes.length }) };
  }
});
