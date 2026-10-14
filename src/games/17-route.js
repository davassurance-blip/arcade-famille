/* ===== Route Folle (dès 4 ans) — voiture vue de dessus, évite le trafic ===== */
GAMES.push({
  id: 'road', title: 'Route Folle', tagline: 'Évite les voitures, fais le plein', minAge: 4, color: '#ff9f1c',
  icon: '<svg viewBox="0 0 64 64"><rect x="12" y="4" width="40" height="56" fill="#3a3a4a"/><rect x="30" y="8" width="4" height="10" fill="#ffd23f"/><rect x="30" y="26" width="4" height="10" fill="#ffd23f"/><rect x="30" y="44" width="4" height="10" fill="#ffd23f"/><rect x="16" y="30" width="12" height="22" rx="4" fill="#ff4f4f"/><rect x="18" y="34" width="8" height="6" rx="2" fill="#5ad1ff"/><rect x="36" y="8" width="12" height="22" rx="4" fill="#38e0d6"/><rect x="38" y="12" width="8" height="6" rx="2" fill="#5ad1ff"/></svg>',
  howto: ['Tape à gauche ou à droite pour changer de voie. Évite les autres voitures et attrape les bidons d\'essence !', 'Change de voie pour éviter le trafic. L\'essence baisse : attrape les bidons. Ça accélère !', 'Trafic dense, 4 voies, essence qui file. Réflexes de pilote.'],
  pad: { left: true, hint: 'ou tape à gauche / à droite' },
  stars: s => s >= 1500 ? 3 : s >= 700 ? 2 : s >= 250 ? 1 : 0,
  create(env) {
    const { input, sfx } = env; const tier = env.tier;
    const LANES = tier === 2 ? 4 : 3; let lane = 1, x = 0, cars = [], items = [], speed = [160, 220, 280][tier], dist = 0, score = 0, fuel = 100, lives = tier === 0 ? 3 : 1, inv = 0, t = 0, over = false, nextCar = 1, nextItem = 2, shake = 0;
    const pr = Particles();
    const COLS = ['#38e0d6', '#9dff5c', '#ff4f9a', '#9b7bff', '#ffd23f'];
    const roadW = () => Math.min(env.W - 40, LANES * 90), laneX = i => (env.W - roadW()) / 2 + roadW() / LANES * (i + .5);
    function move(d) { const nl = clamp(lane + d, 0, LANES - 1); if (nl !== lane) { lane = nl; sfx.tick(); } }
    function update(dt) {
      if (over) return; t += dt; inv = Math.max(0, inv - dt); shake = Math.max(0, shake - dt);
      if (input.pressed.left) move(-1); if (input.pressed.right) move(1);
      if (input.tap) move(input.tap.x < env.W / 2 ? -1 : 1);
      x += (laneX(lane) - x) * Math.min(1, dt * 12);
      speed += dt * [2, 4, 6][tier]; dist += speed * dt; fuel -= dt * [3, 5, 7][tier];
      nextCar -= dt; if (nextCar <= 0) { const l = rndi(0, LANES - 1); if (!cars.some(c => c.lane === l && c.y < 120)) cars.push({ lane: l, y: -80, c: pick(COLS), v: speed * rnd(.35, .6) }); nextCar = [1.3, .95, .7][tier] * rnd(.7, 1.3) * (220 / speed); }
      nextItem -= dt; if (nextItem <= 0) { items.push({ lane: rndi(0, LANES - 1), y: -60, k: Math.random() < .75 ? 'fuel' : 'star' }); nextItem = rnd(2.5, 4.5); }
      const py = env.H - 110;
      for (let i = cars.length - 1; i >= 0; i--) { const c = cars[i]; c.y += (speed - c.v) * dt; if (c.y > env.H + 80) { cars.splice(i, 1); score += 5; continue; } if (inv <= 0 && c.lane === lane && Math.abs(c.y - py) < 66 && Math.abs(laneX(c.lane) - x) < 30) hit(i); }
      for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; it.y += speed * dt; if (it.y > env.H + 40) { items.splice(i, 1); continue; } if (it.lane === lane && Math.abs(it.y - py) < 50 && Math.abs(laneX(it.lane) - x) < 30) { items.splice(i, 1); if (it.k === 'fuel') { fuel = Math.min(100, fuel + 35); sfx.ok(); } else { score += 50; sfx.coin(); } pr.burst(laneX(it.lane), it.y, it.k === 'fuel' ? '#9dff5c' : '#ffd23f', 10); } }
      if (fuel <= 0) { fuel = 0; over = true; sfx.lose(); env.gameOver(score, { text: 'Panne sèche après ' + Math.floor(dist / 10) + ' m' }); return; }
      score = Math.max(score, 0); pr.update(dt); env.setScore(score + Math.floor(dist / 20)); env.hud('Essence ' + Math.ceil(fuel) + ' %');
    }
    function hit(i) { cars.splice(i, 1); lives--; inv = 1.5; shake = .3; sfx.hit(); env.vibe(200); pr.burst(x, env.H - 110, '#ff6a55', 16, 220); speed = Math.max([160, 220, 280][tier], speed * .7); if (lives <= 0) { over = true; env.gameOver(score + Math.floor(dist / 20), { text: Math.floor(dist / 10) + ' m parcourus' }); } }
    function car(c, cx, cy, color, flip) { c.save(); c.translate(cx, cy); if (flip) c.rotate(Math.PI); c.fillStyle = color; Draw.rr(c, -22, -34, 44, 68, 10); c.fill(); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-18, -30, 36, 14); c.fillRect(-18, 14, 36, 12); c.fillStyle = '#5ad1ff'; Draw.rr(c, -16, -18, 32, 12, 4); c.fill(); c.fillStyle = '#ffd23f'; c.fillRect(-18, -36, 8, 4); c.fillRect(10, -36, 8, 4); c.fillStyle = '#ff4f4f'; c.fillRect(-18, 32, 8, 4); c.fillRect(10, 32, 8, 4); c.fillStyle = '#1b1540'; [-24, 18].forEach(wx => { c.fillRect(wx, -26, 6, 14); c.fillRect(wx, 12, 6, 14); }); c.restore(); }
    function draw(c) {
      const W = env.W, H = env.H; c.save(); if (shake > 0) c.translate(rnd(-4, 4) * shake, 0);
      c.fillStyle = '#4faf40'; c.fillRect(-10, -10, W + 20, H + 20);
      c.fillStyle = '#3c8f30'; for (let i = 0; i < 12; i++) { const ty = ((i * 90 + dist) % (H + 100)) - 50; c.beginPath(); c.arc(14 + (i % 2) * 8, ty, 12, 0, 7); c.arc(W - 14 - (i % 2) * 8, ty + 40, 12, 0, 7); c.fill(); }
      const rw = roadW(), rx = (W - rw) / 2; c.fillStyle = '#3a3a4a'; c.fillRect(rx, 0, rw, H); c.fillStyle = '#e8e8f0'; c.fillRect(rx, 0, 4, H); c.fillRect(rx + rw - 4, 0, 4, H);
      c.fillStyle = '#ffd23f'; for (let l = 1; l < LANES; l++) for (let i = 0; i < 14; i++) { const ty = ((i * 70 + dist) % (H + 70)) - 70; c.fillRect(rx + rw / LANES * l - 2, ty, 4, 34); }
      for (const it of items) { const ix = laneX(it.lane); if (it.k === 'fuel') { c.fillStyle = '#9dff5c'; Draw.rr(c, ix - 14, it.y - 16, 28, 32, 5); c.fill(); c.fillStyle = '#1b1540'; c.fillRect(ix - 8, it.y - 20, 10, 6); Draw.text(c, 'E', ix, it.y + 1, 16, '#1b1540'); } else { c.fillStyle = '#ffd23f'; c.shadowColor = '#ffd23f'; c.shadowBlur = 12; c.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + t * 3, r = k % 2 ? 7 : 16; c.lineTo(ix + Math.cos(a) * r, it.y + Math.sin(a) * r); } c.closePath(); c.fill(); c.shadowBlur = 0; } }
      for (const cr of cars) car(c, laneX(cr.lane), cr.y, cr.c, false);
      if (!(inv > 0 && Math.floor(inv * 12) % 2)) car(c, x, H - 110, '#ff4f4f', false);
      pr.draw(c); c.restore();
      // jauge d'essence
      c.fillStyle = 'rgba(0,0,0,.45)'; Draw.rr(c, W - 130, 12, 118, 16, 8); c.fill(); c.fillStyle = fuel > 40 ? '#9dff5c' : fuel > 20 ? '#ffd23f' : '#ff6a55'; if (fuel > 0) { Draw.rr(c, W - 130, 12, 118 * fuel / 100, 16, 8); c.fill(); }
      if (tier === 0) Draw.lives(c, lives, 3, 22, 10);
    }
    x = laneX(lane);
    return { update, draw, resize: () => { x = laneX(lane); } };
  }
});
