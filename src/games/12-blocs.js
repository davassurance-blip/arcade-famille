/* ===== Blocs (dès 8 ans) — puzzle de briques qui tombent ===== */
GAMES.push({
  id: 'blocks', title: 'Blocs', tagline: 'Complète des lignes', minAge: 8, color: '#38e0d6',
  icon: '<svg viewBox="0 0 64 64"><g><rect x="8" y="40" width="12" height="12" fill="#ff4f9a"/><rect x="20" y="40" width="12" height="12" fill="#ff4f9a"/><rect x="32" y="40" width="12" height="12" fill="#ff4f9a"/><rect x="20" y="28" width="12" height="12" fill="#ff4f9a"/><rect x="44" y="40" width="12" height="12" fill="#ffd23f"/><rect x="44" y="28" width="12" height="12" fill="#ffd23f"/><rect x="44" y="16" width="12" height="12" fill="#ffd23f"/><rect x="44" y="4" width="12" height="12" fill="#ffd23f"/><rect x="8" y="16" width="12" height="12" fill="#9dff5c"/><rect x="20" y="16" width="12" height="12" fill="#9dff5c"/><rect x="8" y="4" width="12" height="12" fill="#9dff5c"/><rect x="20" y="4" width="12" height="12" fill="#9dff5c"/></g></svg>',
  howto: ['', 'Glisse à gauche/droite pour déplacer, tape pour tourner, glisse vers le bas pour faire tomber. Complète des lignes !', 'Départ rapide, vitesse qui grimpe à chaque niveau. Combien de lignes tiendras-tu ?'],
  pad: { left: true, buttons: [{ k: 'a', label: 'TOUR' }, { k: 'b', label: 'BAS' }], hint: 'ou glisse / tape' },
  stars: s => s >= 3000 ? 3 : s >= 1200 ? 2 : s >= 400 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env; const hard = env.tier >= 2;
    const COLS = 10, ROWS = 20;
    const SHAPES = { I: [[1, 1, 1, 1]], O: [[1, 1], [1, 1]], T: [[0, 1, 0], [1, 1, 1]], S: [[0, 1, 1], [1, 1, 0]], Z: [[1, 1, 0], [0, 1, 1]], J: [[1, 0, 0], [1, 1, 1]], L: [[0, 0, 1], [1, 1, 1]] };
    const COL = { I: '#38e0d6', O: '#ffd23f', T: '#9b7bff', S: '#9dff5c', Z: '#ff4f4f', J: '#5ad1ff', L: '#ff9f1c' };
    let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null)), cur, next, score = 0, lines = 0, level = 1, acc = 0, over = false, cell = 20, ox = 0, oy = 0, flashRows = [], flashT = 0, t = 0, pieceT = 0;
    const pr = Particles();
    const speed = () => Math.max(.08, (hard ? .55 : .8) * Math.pow(.85, level - 1));
    function bag() { const k = pick(Object.keys(SHAPES)); return { k, m: SHAPES[k].map(r => r.slice()), x: Math.floor(COLS / 2) - 1, y: -1 }; }
    function fits(m, x, y) { for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) if (m[r][c]) { const gx = x + c, gy = y + r; if (gx < 0 || gx >= COLS || gy >= ROWS || (gy >= 0 && grid[gy][gx])) return false; } return true; }
    function rotate() { const m = cur.m[0].map((_, i) => cur.m.map(r => r[i]).reverse()); for (const k of [0, -1, 1, -2, 2]) if (fits(m, cur.x + k, cur.y)) { cur.m = m; cur.x += k; sfx.tap(); return; } }
    function move(dx) { if (fits(cur.m, cur.x + dx, cur.y)) { cur.x += dx; } }
    function lock() {
      cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && cur.y + r >= 0) grid[cur.y + r][cur.x + c] = COL[cur.k]; }));
      const full = []; for (let r = 0; r < ROWS; r++) if (grid[r].every(Boolean)) full.push(r);
      if (full.length) { flashRows = full; flashT = .25; const pts = [0, 100, 300, 500, 800][full.length] * level; score += pts; lines += full.length; level = 1 + Math.floor(lines / 10); sfx.coin(); env.vibe(30); if (full.length === 4) sfx.win(); }
      else sfx.tick();
      cur = next; next = bag(); pieceT = 0;
      if (!fits(cur.m, cur.x, cur.y + 1)) { over = true; sfx.lose(); env.gameOver(score, { text: lines + ' lignes · niveau ' + level }); }
      persist();
    }
    function clearRows() { for (const r of flashRows) { grid.splice(r, 1); grid.unshift(Array(COLS).fill(null)); for (let c = 0; c < COLS; c++) pr.burst(ox + (c + .5) * cell, oy + (r + .5) * cell, '#fff', 2, 120); } flashRows = []; }
    function hardDrop() { while (fits(cur.m, cur.x, cur.y + 1)) { cur.y++; score += 2; } lock(); }
    function persist() { env.save({ grid, score, lines, level, cur, next }, 'Niveau ' + level + ' · ' + lines + ' lignes · ' + score + ' pts'); }
    function update(dt) {
      if (over) return; t += dt; pr.update(dt);
      if (flashT > 0) { flashT -= dt; if (flashT <= 0) clearRows(); return; }
      if (input.pressed.left || input.swipe === 'left') move(-1); if (input.pressed.right || input.swipe === 'right') move(1);
      if (input.pressed.a || input.pressed.up || input.tap) rotate();
      if (input.pressed.b || input.swipe === 'down') { hardDrop(); if (over) return; }
      // auto-répétition gauche/droite quand on maintient
      if (input.held.left || input.held.right) { pieceT += dt; if (pieceT > .18) { move(input.held.left ? -1 : 1); pieceT = .1; } } else pieceT = 0;
      acc += dt * (input.held.down ? 8 : 1);
      if (acc >= speed()) { acc = 0; if (fits(cur.m, cur.x, cur.y + 1)) cur.y++; else lock(); }
      env.setScore(score); env.hud('Niv. ' + level + ' · ' + lines + ' lignes');
    }
    function fit() { cell = Math.floor(Math.min((env.W - 110) / COLS, (env.H - 20) / ROWS)); ox = Math.floor((env.W - COLS * cell) / 2) - 30; oy = Math.floor((env.H - ROWS * cell) / 2); }
    function block(c, x, y, color, s = cell) { c.fillStyle = color; Draw.rr(c, x + 1, y + 1, s - 2, s - 2, 4); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + 3, y + 3, s - 6, 3); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(x + 3, y + s - 5, s - 6, 2); }
    function draw(c) {
      const W = env.W, H = env.H; c.fillStyle = '#0d0a2a'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#15113a'; c.fillRect(ox, oy, COLS * cell, ROWS * cell);
      c.strokeStyle = 'rgba(56,224,214,.08)'; c.lineWidth = 1; for (let i = 0; i <= COLS; i++) { c.beginPath(); c.moveTo(ox + i * cell, oy); c.lineTo(ox + i * cell, oy + ROWS * cell); c.stroke(); }
      for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) if (grid[r][col]) block(c, ox + col * cell, oy + r * cell, flashRows.includes(r) ? '#fff' : grid[r][col]);
      if (!over && flashT <= 0) {
        let gy = cur.y; while (fits(cur.m, cur.x, gy + 1)) gy++;
        cur.m.forEach((row, r) => row.forEach((v, col) => { if (!v) return; if (gy + r >= 0) { c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; Draw.rr(c, ox + (cur.x + col) * cell + 2, oy + (gy + r) * cell + 2, cell - 4, cell - 4, 4); c.stroke(); } if (cur.y + r >= 0) block(c, ox + (cur.x + col) * cell, oy + (cur.y + r) * cell, COL[cur.k]); }));
      }
      c.strokeStyle = '#38e0d6'; c.lineWidth = 3; c.shadowColor = '#38e0d6'; c.shadowBlur = 12; c.strokeRect(ox - 2, oy - 2, COLS * cell + 4, ROWS * cell + 4); c.shadowBlur = 0;
      // suivant
      const nx = ox + COLS * cell + 14, ny = oy + 30; Draw.text(c, 'Suivant', nx + 30, oy + 10, 13, '#b9b0e6', 'center', 700);
      const s = Math.min(cell, 18); next.m.forEach((row, r) => row.forEach((v, col) => { if (v) block(c, nx + col * s, ny + r * s, COL[next.k], s); }));
      pr.draw(c);
    }
    if (saved && saved.grid) { grid = saved.grid; score = saved.score | 0; lines = saved.lines | 0; level = saved.level || 1; cur = saved.cur; next = saved.next; } else { cur = bag(); next = bag(); }
    fit();
    return { update, draw, resize: fit };
  }
});
