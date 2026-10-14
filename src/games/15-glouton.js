/* ===== Glouton (dès 8 ans) — labyrinthe, pastilles, 4 fantômes aux caractères différents ===== */
const GLOUTON_MAZE = [
  '###################',
  '#........#........#',
  '#o##.###.#.###.##o#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.### # ###.####',
  '####.#       #.####',
  '####.# ##-## #.####',
  '    .  #GGG#  .    ',
  '####.# ##### #.####',
  '####.#       #.####',
  '####.# ##### #.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#.....P.....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################'
];
GAMES.push({
  id: 'glouton', title: 'Glouton', tagline: 'Mange tout, fuis les fantômes', minAge: 8, color: '#9dff5c',
  icon: '<svg viewBox="0 0 64 64"><path d="M30 10a22 22 0 1 0 18 34L30 32z" fill="#9dff5c"/><circle cx="30" cy="22" r="3" fill="#1b1540"/><circle cx="52" cy="14" r="4" fill="#ffd23f"/><circle cx="56" cy="40" r="3" fill="#ffd23f"/><path d="M44 48a9 9 0 0 1 18 0v12l-3-3-3 3-3-3-3 3-3-3-3 3z" fill="#ff4f9a"/><circle cx="50" cy="48" r="2" fill="#fff"/><circle cx="56" cy="48" r="2" fill="#fff"/></svg>',
  howto: ['', 'Mange toutes les pastilles du labyrinthe. Les grosses pastilles rendent les fantômes bleus : mange-les !', 'Fantômes plus rapides, super-pastilles plus courtes. Chaque fantôme a sa tactique.'],
  pad: { dpad: true, hint: 'ou glisse le doigt' },
  stars: s => s >= 6000 ? 3 : s >= 2500 ? 2 : s >= 800 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env; const hard = env.tier >= 2;
    const ROWS = GLOUTON_MAZE.length, COLS = GLOUTON_MAZE[0].length;
    let maze, pellets, total, pac, ghosts, cell = 20, ox = 0, oy = 0, lives = 3, score = 0, level = 1, t = 0, mode = 'scatter', modeT = 7, fright = 0, eatChain = 0, over = false, msg = '', msgT = 0, fruit = null, fruitDone = 0, pause = 0, start;
    const pr = Particles();
    const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    const GCOL = ['#ff4f4f', '#ff9fd0', '#38e0d6', '#ff9f1c'], CORNERS = [[COLS - 2, 1], [1, 1], [COLS - 2, ROWS - 2], [1, ROWS - 2]];
    function wall(x, y) { if (y < 0 || y >= ROWS) return true; x = ((x % COLS) + COLS) % COLS; const ch = maze[y][x]; return ch === '#' || ch === '-'; }
    function pen(x, y) { return maze[y] && maze[y][x] === 'G'; }
    function resetLevel() {
      maze = GLOUTON_MAZE.map(r => r.split('')); pellets = 0; let gi = 0; const gpos = [];
      maze.forEach((row, y) => row.forEach((ch, x) => { if (ch === '.' || ch === 'o') pellets++; if (ch === 'P') { start = [x, y]; row[x] = ' '; } if (ch === 'G') { gpos.push([x, y]); } }));
      total = pellets; fruitDone = 0; fruit = null; placeAll(gpos);
    }
    function placeAll(gpos) {
      pac = { x: start[0], y: start[1], dir: 'left', next: 'left', mouth: 0, alive: true };
      ghosts = GCOL.map((c, i) => ({ x: i === 0 ? 9 : gpos[i - 1][0], y: i === 0 ? 7 : gpos[i - 1][1], dir: 'left', c, i, state: i === 0 ? 'out' : 'pen', wait: [0, 2, 5, 8][i], eyes: false, frightened: false }));
      mode = 'scatter'; modeT = 7; fright = 0; pause = 1.2; msg = level === 1 && lives === 3 && score === 0 ? 'C\'est parti !' : 'Prêt ?'; msgT = 1.2;
    }
    function fit() { cell = Math.floor(Math.min((env.W - 8) / COLS, (env.H - 8) / ROWS)); ox = Math.floor((env.W - COLS * cell) / 2); oy = Math.floor((env.H - ROWS * cell) / 2); }
    function persist() { env.save({ level, lives, score }, 'Niveau ' + level + ' · ' + lives + ' vie' + (lives > 1 ? 's' : '') + ' · ' + score + ' pts'); }
    function canGo(e, d) { const [dx, dy] = DIRS[d]; const nx = Math.round(e.x) + dx, ny = Math.round(e.y) + dy; if (e.eyes || e.state === 'leaving') { if (maze[ny] && (maze[ny][nx] === '-' || maze[ny][nx] === 'G')) return true; } return !wall(nx, ny) && !pen(nx, ny); }
    // « centre » d'une case : vrai une seule fois par case traversée (sinon on y resterait collé)
    function atCenter(e) { const near = Math.abs(e.x - Math.round(e.x)) < .1 && Math.abs(e.y - Math.round(e.y)) < .1; const key = Math.round(e.x) + ',' + Math.round(e.y); if (!near) { e.lastKey = null; return false; } if (e.lastKey === key) return false; e.lastKey = key; return true; }
    function nearCenter(e) { return Math.abs(e.x - Math.round(e.x)) < .1 && Math.abs(e.y - Math.round(e.y)) < .1; }
    function step(e, sp, dt) {
      const [dx, dy] = DIRS[e.dir]; e.x += dx * sp * dt; e.y += dy * sp * dt;
      if (e.x < -1) e.x += COLS; if (e.x > COLS) e.x -= COLS;
      // arrêt sur mur
      const cx = Math.round(e.x), cy = Math.round(e.y);
      if (!canGo(e, e.dir)) { const ahead = (e.x - cx) * dx + (e.y - cy) * dy; if (ahead > 0) { e.x = cx; e.y = cy; } }
    }
    function pacUpdate(dt) {
      const sp = (hard ? 5.6 : 5) + level * .15;
      if (atCenter(pac)) { pac.x = Math.round(pac.x); pac.y = Math.round(pac.y); if (canGo(pac, pac.next)) pac.dir = pac.next; }
      else if (nearCenter(pac) && pac.next !== pac.dir && canGo(pac, pac.next)) { pac.x = Math.round(pac.x); pac.y = Math.round(pac.y); pac.dir = pac.next; }
      else if (DIRS[pac.next][0] === -DIRS[pac.dir][0] && DIRS[pac.next][1] === -DIRS[pac.dir][1]) pac.dir = pac.next; // demi-tour immédiat
      if (canGo(pac, pac.dir) || !nearCenter(pac)) step(pac, sp, dt);
      pac.mouth += dt * 10;
      const cx = ((Math.round(pac.x) % COLS) + COLS) % COLS, cy = Math.round(pac.y); const ch = maze[cy] && maze[cy][cx];
      if (ch === '.' || ch === 'o') {
        maze[cy][cx] = ' '; pellets--; score += ch === 'o' ? 50 : 10; if (ch === 'o') { fright = hard ? 5 : 7; eatChain = 0; ghosts.forEach(g => { if (!g.eyes && g.state !== 'pen') { g.frightened = true; g.dir = opposite(g.dir); } }); sfx.ok(); } else if (pellets % 2 === 0) sfx.tick();
        if ((total - pellets === 70 || total - pellets === 170) && fruitDone < 2) { fruit = { x: start[0], y: start[1], t: 10 }; fruitDone++; }
      }
      if (fruit && Math.abs(pac.x - fruit.x) < .6 && Math.abs(pac.y - fruit.y) < .6) { score += 100 * level; sfx.win(); pr.burst(ox + (fruit.x + .5) * cell, oy + (fruit.y + .5) * cell, '#ff4f4f', 12); fruit = null; }
    }
    function opposite(d) { return { left: 'right', right: 'left', up: 'down', down: 'up' }[d]; }
    function ghostTarget(g) {
      if (g.eyes) return [9, 9];
      if (mode === 'scatter' && !g.frightened) return CORNERS[g.i];
      const px = Math.round(pac.x), py = Math.round(pac.y), [dx, dy] = DIRS[pac.dir];
      if (g.i === 0) return [px, py];
      if (g.i === 1) return [px + dx * 4, py + dy * 4];
      if (g.i === 2) { const r = ghosts[0]; return [px + (px - Math.round(r.x)), py + (py - Math.round(r.y))]; }
      return Math.hypot(px - g.x, py - g.y) > 8 ? [px, py] : CORNERS[3];
    }
    function ghostUpdate(g, dt) {
      if (g.state === 'pen') { g.wait -= dt; g.y += Math.sin(t * 4 + g.i) * dt * .5; if (g.wait <= 0) { g.state = 'leaving'; g.x = 9; g.y = 9; g.dir = 'up'; } return; }
      if (g.state === 'leaving') { g.y -= 3 * dt; if (g.y <= 7) { g.y = 7; g.x = 9; g.state = 'out'; g.dir = 'left'; } return; }
      const sp = g.eyes ? 9 : g.frightened ? 2.8 : (hard ? 4.6 : 4) + level * .15 + (pellets < 30 ? .6 : 0);
      if (atCenter(g)) {
        g.x = Math.round(g.x); g.y = Math.round(g.y);
        if (g.eyes && g.x === 9 && g.y === 9) { g.eyes = false; g.frightened = false; g.state = 'leaving'; return; }
        const opts = Object.keys(DIRS).filter(d => d !== opposite(g.dir) && canGo(g, d) && !(d === 'down' && maze[g.y + 1] && maze[g.y + 1][g.x] === '-' && !g.eyes));
        if (opts.length) {
          if (g.frightened && !g.eyes) g.dir = pick(opts);
          else { const tg = ghostTarget(g); g.dir = opts.sort((a, b) => { const A = DIRS[a], B = DIRS[b]; return Math.hypot(g.x + A[0] - tg[0], g.y + A[1] - tg[1]) - Math.hypot(g.x + B[0] - tg[0], g.y + B[1] - tg[1]); })[0]; }
        } else g.dir = opposite(g.dir);
      }
      step(g, sp, dt);
    }
    function die() {
      pac.alive = false; pause = 1.5; lives--; sfx.lose(); env.vibe(200); pr.burst(ox + (pac.x + .5) * cell, oy + (pac.y + .5) * cell, '#9dff5c', 20, 200);
      setTimeout(() => { if (over) return; if (lives <= 0) { over = true; env.gameOver(score, { text: 'Niveau ' + level + ' · ' + (total - pellets) + ' pastilles' }); } else { const gpos = [[8, 9], [9, 9], [10, 9]]; placeAll(gpos); persist(); } }, 1400);
    }
    function update(dt) {
      if (over) return; t += dt; msgT = Math.max(0, msgT - dt); pr.update(dt);
      if (input.pressed.left || input.swipe === 'left') pac.next = 'left'; if (input.pressed.right || input.swipe === 'right') pac.next = 'right';
      if (input.pressed.up || input.swipe === 'up') pac.next = 'up'; if (input.pressed.down || input.swipe === 'down') pac.next = 'down';
      if (pause > 0) { pause -= dt; return; }
      if (!pac.alive) return;
      if (fright > 0) { fright -= dt; if (fright <= 0) ghosts.forEach(g => g.frightened = false); } else { modeT -= dt; if (modeT <= 0) { mode = mode === 'scatter' ? 'chase' : 'scatter'; modeT = mode === 'chase' ? 20 : Math.max(3, 7 - level); ghosts.forEach(g => { if (g.state === 'out' && !g.eyes) g.dir = opposite(g.dir); }); } }
      if (fruit) { fruit.t -= dt; if (fruit.t <= 0) fruit = null; }
      pacUpdate(dt); ghosts.forEach(g => ghostUpdate(g, dt));
      for (const g of ghosts) {
        if (g.state !== 'out' || g.eyes) continue;
        if (Math.abs(g.x - pac.x) < .7 && Math.abs(g.y - pac.y) < .7) {
          if (g.frightened) { g.eyes = true; g.frightened = false; eatChain++; const pts = 200 * Math.pow(2, eatChain - 1); score += pts; sfx.coin(); env.vibe(40); pr.burst(ox + (g.x + .5) * cell, oy + (g.y + .5) * cell, g.c, 12); msg = '+' + pts; msgT = .8; pause = .3; }
          else { die(); return; }
        }
      }
      if (pellets <= 0) { level++; score += 500; sfx.win(); resetLevel(); msg = 'Niveau ' + level; msgT = 1.5; persist(); }
      env.setScore(score); env.hud('Niv. ' + level + ' · ' + pellets + ' pastilles');
    }
    function drawGhost(c, g) {
      const x = ox + (g.x + .5) * cell, y = oy + (g.y + .5) * cell, r = cell * .45, fr = g.frightened && !g.eyes;
      if (!g.eyes) { c.fillStyle = fr ? (fright < 2 && Math.floor(t * 8) % 2 ? '#fff' : '#2a3fd6') : g.c; c.beginPath(); c.arc(x, y - r * .1, r, Math.PI, 0); const wob = Math.floor(t * 8 + g.i) % 2; c.lineTo(x + r, y + r * .8); for (let k = 0; k < 4; k++) { const sx = x + r - (k + .5) * r / 2; c.lineTo(sx, y + r * (wob ? .55 : .8) + ((k + wob) % 2 ? 0 : r * .25)); } c.lineTo(x - r, y + r * .8); c.closePath(); c.fill(); }
      const [dx, dy] = DIRS[g.dir]; c.fillStyle = '#fff'; c.beginPath(); c.arc(x - r * .35, y - r * .2, r * .26, 0, 7); c.arc(x + r * .35, y - r * .2, r * .26, 0, 7); c.fill();
      c.fillStyle = fr ? '#fff' : '#1b1540'; if (fr) { c.beginPath(); c.moveTo(x - r * .5, y + r * .35); for (let k = 0; k < 5; k++) c.lineTo(x - r * .5 + k * r * .25, y + r * (k % 2 ? .2 : .4)); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke(); } else { c.beginPath(); c.arc(x - r * .35 + dx * r * .12, y - r * .2 + dy * r * .12, r * .13, 0, 7); c.arc(x + r * .35 + dx * r * .12, y - r * .2 + dy * r * .12, r * .13, 0, 7); c.fill(); }
    }
    function draw(c) {
      const W = env.W, H = env.H; c.fillStyle = '#0d0a2a'; c.fillRect(0, 0, W, H);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const ch = maze[y][x], px = ox + x * cell, py = oy + y * cell;
        if (ch === '#') { c.fillStyle = '#2a2270'; c.fillRect(px, py, cell, cell); c.strokeStyle = '#6a5fe0'; c.lineWidth = 2; c.beginPath(); if (!wall(x, y - 1)) { c.moveTo(px, py + 1); c.lineTo(px + cell, py + 1); } if (!wall(x, y + 1)) { c.moveTo(px, py + cell - 1); c.lineTo(px + cell, py + cell - 1); } if (!wall(x - 1, y) && x > 0) { c.moveTo(px + 1, py); c.lineTo(px + 1, py + cell); } if (!wall(x + 1, y) && x < COLS - 1) { c.moveTo(px + cell - 1, py); c.lineTo(px + cell - 1, py + cell); } c.stroke(); }
        else if (ch === '-') { c.fillStyle = '#ff9fd0'; c.fillRect(px, py + cell * .4, cell, cell * .2); }
        else if (ch === '.') { c.fillStyle = '#ffd9a8'; c.beginPath(); c.arc(px + cell / 2, py + cell / 2, cell * .1, 0, 7); c.fill(); }
        else if (ch === 'o') { c.fillStyle = '#ffd23f'; c.shadowColor = '#ffd23f'; c.shadowBlur = 10; c.beginPath(); c.arc(px + cell / 2, py + cell / 2, cell * (.26 + Math.sin(t * 6) * .05), 0, 7); c.fill(); c.shadowBlur = 0; }
      }
      if (fruit) { const fx = ox + (fruit.x + .5) * cell, fy = oy + (fruit.y + .5) * cell; c.fillStyle = '#ff4f4f'; c.beginPath(); c.arc(fx - cell * .15, fy + cell * .1, cell * .2, 0, 7); c.arc(fx + cell * .15, fy + cell * .15, cell * .2, 0, 7); c.fill(); c.strokeStyle = '#3fbf4f'; c.lineWidth = 2; c.beginPath(); c.moveTo(fx - cell * .15, fy - cell * .1); c.quadraticCurveTo(fx, fy - cell * .45, fx + cell * .15, fy - cell * .05); c.stroke(); }
      if (pac.alive) {
        const x = ox + (pac.x + .5) * cell, y = oy + (pac.y + .5) * cell, r = cell * .46, ang = { left: Math.PI, right: 0, up: -Math.PI / 2, down: Math.PI / 2 }[pac.dir], m = (Math.sin(pac.mouth) * .5 + .5) * .9 + .1;
        c.fillStyle = '#9dff5c'; c.shadowColor = '#9dff5c'; c.shadowBlur = 12; c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, ang + m * .5, ang - m * .5 + Math.PI * 2); c.closePath(); c.fill(); c.shadowBlur = 0;
        c.fillStyle = '#1b1540'; const ex = x + Math.cos(ang - Math.PI / 2) * r * .45, ey = y + Math.sin(ang - Math.PI / 2) * r * .45; c.beginPath(); c.arc(ex, ey, r * .14, 0, 7); c.fill();
      }
      ghosts.forEach(g => drawGhost(c, g));
      pr.draw(c);
      Draw.lives(c, lives, 3, 22, 10);
      if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 2); Draw.text(c, msg, W / 2, oy + 11.5 * cell, 22, '#ffd23f'); c.globalAlpha = 1; }
    }
    if (saved && saved.level) { level = clamp(saved.level | 0, 1, 50); lives = clamp(saved.lives | 0, 1, 5); score = saved.score | 0; }
    fit(); resetLevel();
    return { update, draw, resize: fit, dbg: () => ({ ghosts, pac, mode, fright, pellets }) };
  }
});
