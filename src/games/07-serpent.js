/* ===== Serpent Néon (dès 8 ans) ===== */
GAMES.push({
  id: 'snake', title: 'Serpent Néon', tagline: 'Mange, grandis, ne te mords pas', minAge: 8, color: '#9dff5c',
  icon: '<svg viewBox="0 0 64 64"><path d="M12 48h16V32H40v16h12" stroke="#9dff5c" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="52" cy="48" r="7" fill="#9dff5c"/><circle cx="54" cy="46" r="2" fill="#1b1540"/><circle cx="14" cy="18" r="6" fill="#ff4f9a"/></svg>',
  howto: ['', 'Glisse le doigt (ou flèches) pour tourner. Mange les points, évite les murs et ta queue.', 'Des blocs apparaissent sur le terrain. Plus tu manges, plus ça accélère.'],
  pad: { dpad: true, hint: 'ou glisse le doigt / tape à côté de la tête' },
  stars: s => s >= 200 ? 3 : s >= 100 ? 2 : s >= 40 ? 1 : 0,
  create(env) {
    const { input, sfx } = env; const hard = env.tier >= 2;
    let cols = 20, rows = 20, cell = 20, ox = 0, oy = 0;
    let snake, dir, ndir, queue = [], food, walls, acc, step, score, dead, t = 0, grow, flash = 0;
    const pr = Particles();
    function resize() { const W = env.W, H = env.H; cols = W > H ? 26 : 18; rows = W > H ? 16 : 26; cell = Math.floor(Math.min((W - 16) / cols, (H - 16) / rows)); ox = Math.floor((W - cols * cell) / 2); oy = Math.floor((H - rows * cell) / 2); }
    function reset() {
      resize(); snake = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }, { x: Math.floor(cols / 2) - 1, y: Math.floor(rows / 2) }, { x: Math.floor(cols / 2) - 2, y: Math.floor(rows / 2) }];
      dir = { x: 1, y: 0 }; ndir = dir; queue = []; walls = []; acc = 0; step = hard ? .14 : .19; score = 0; dead = false; grow = 0; placeFood();
    }
    function free(x, y) { return !snake.some(s => s.x === x && s.y === y) && !walls.some(w => w.x === x && w.y === y); }
    function placeFood() { let n = 0; do { food = { x: rndi(0, cols - 1), y: rndi(0, rows - 1) }; } while (!free(food.x, food.y) && n++ < 500); }
    // file d'attente de 2 virages : deux balayages rapides donnent deux virages successifs
    function turn(nx, ny) { const last = queue.length ? queue[queue.length - 1] : dir; if ((nx === -last.x && ny === -last.y) || (nx === last.x && ny === last.y)) return; if (queue.length < 2) queue.push({ x: nx, y: ny }); }
    function tapTurn(tp) { const hx = ox + (snake[0].x + .5) * cell, hy = oy + (snake[0].y + .5) * cell; const dx = tp.x - hx, dy = tp.y - hy; if (dir.x !== 0) turn(0, dy > 0 ? 1 : -1); else turn(dx > 0 ? 1 : -1, 0); }
    function update(dt) {
      if (dead) return; t += dt; flash = Math.max(0, flash - dt);
      if (input.pressed.left || input.swipe === 'left') turn(-1, 0); if (input.pressed.right || input.swipe === 'right') turn(1, 0);
      if (input.pressed.up || input.swipe === 'up') turn(0, -1); if (input.pressed.down || input.swipe === 'down') turn(0, 1);
      if (input.tap) tapTurn(input.tap);
      acc += dt; if (acc < step) return; acc -= step;
      if (queue.length) dir = queue.shift(); const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (h.x < 0 || h.y < 0 || h.x >= cols || h.y >= rows || !free(h.x, h.y) && !(h.x === snake[snake.length - 1].x && h.y === snake[snake.length - 1].y && grow === 0)) { die(); return; }
      snake.unshift(h);
      if (h.x === food.x && h.y === food.y) { score += 10; grow += hard ? 2 : 1; sfx.coin(); env.vibe(20); pr.burst(ox + (food.x + .5) * cell, oy + (food.y + .5) * cell, '#ff4f9a', 10); step = Math.max(hard ? .08 : .1, step * .982); placeFood(); flash = .2;
        if (hard && snake.length % 3 === 0) { let n = 0, w; do { w = { x: rndi(0, cols - 1), y: rndi(0, rows - 1) }; } while ((!free(w.x, w.y) || Math.abs(w.x - h.x) + Math.abs(w.y - h.y) < 4) && n++ < 200); if (n < 200) walls.push(w); }
      }
      if (grow > 0) grow--; else snake.pop();
      env.setScore(score); env.hud('Longueur ' + snake.length);
    }
    function die() { dead = true; sfx.hit(); env.vibe(200); pr.burst(ox + (snake[0].x + .5) * cell, oy + (snake[0].y + .5) * cell, '#9dff5c', 20, 200); setTimeout(() => env.gameOver(score, { text: 'Longueur ' + snake.length }), 600); }
    function draw(c) {
      const W = env.W, H = env.H; c.fillStyle = '#0d0a2a'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#15113a'; c.fillRect(ox, oy, cols * cell, rows * cell);
      c.strokeStyle = 'rgba(157,255,92,.08)'; c.lineWidth = 1; for (let i = 0; i <= cols; i++) { c.beginPath(); c.moveTo(ox + i * cell, oy); c.lineTo(ox + i * cell, oy + rows * cell); c.stroke(); } for (let j = 0; j <= rows; j++) { c.beginPath(); c.moveTo(ox, oy + j * cell); c.lineTo(ox + cols * cell, oy + j * cell); c.stroke(); }
      c.strokeStyle = '#9b7bff'; c.lineWidth = 3; c.shadowColor = '#9b7bff'; c.shadowBlur = 14; c.strokeRect(ox - 2, oy - 2, cols * cell + 4, rows * cell + 4); c.shadowBlur = 0;
      for (const w of walls) { c.fillStyle = '#ff6a55'; Draw.rr(c, ox + w.x * cell + 2, oy + w.y * cell + 2, cell - 4, cell - 4, 4); c.fill(); }
      const pulse = 1 + Math.sin(t * 8) * .12; c.fillStyle = '#ff4f9a'; c.shadowColor = '#ff4f9a'; c.shadowBlur = 16; c.beginPath(); c.arc(ox + (food.x + .5) * cell, oy + (food.y + .5) * cell, cell * .34 * pulse, 0, 7); c.fill(); c.shadowBlur = 0;
      c.shadowColor = '#9dff5c'; c.shadowBlur = flash > 0 ? 24 : 10;
      snake.forEach((s, i) => { const k = 1 - i / snake.length * .5; c.fillStyle = i === 0 ? '#d4ff9e' : 'rgb(' + Math.round(157 * k) + ',255,' + Math.round(92 * k) + ')'; Draw.rr(c, ox + s.x * cell + 1.5, oy + s.y * cell + 1.5, cell - 3, cell - 3, i === 0 ? cell * .35 : cell * .22); c.fill(); });
      c.shadowBlur = 0;
      const hd = snake[0]; c.fillStyle = '#1b1540'; const ex = ox + (hd.x + .5) * cell + dir.x * cell * .18, ey = oy + (hd.y + .5) * cell + dir.y * cell * .18; const px = dir.y * cell * .2, py = dir.x * cell * .2; c.beginPath(); c.arc(ex + px, ey + py, cell * .09, 0, 7); c.arc(ex - px, ey - py, cell * .09, 0, 7); c.fill();
      pr.update(1 / 60); pr.draw(c);
    }
    reset();
    return { update, draw, resize: () => { const sx = snake[0]; resize(); if (sx.x >= cols || sx.y >= rows) reset(); } };
  }
});
