/* ===== Galaxie (dès 8 ans) — tir spatial ===== */
GAMES.push({
  id: 'galaxy', title: 'Galaxie', tagline: 'Vaisseau contre envahisseurs', minAge: 8, color: '#9b7bff',
  icon: '<svg viewBox="0 0 64 64"><path d="M32 44l-14 10 4-14-10-8h12l8-16 8 16h12l-10 8 4 14z" fill="#38e0d6"/><circle cx="32" cy="30" r="4" fill="#fff5e1"/><rect x="30" y="6" width="4" height="10" rx="2" fill="#ffd23f"/><circle cx="14" cy="14" r="5" fill="#ff4f9a"/><circle cx="50" cy="12" r="4" fill="#9dff5c"/></svg>',
  howto: ['', 'Glisse le doigt pour piloter, le vaisseau tire tout seul. Détruis les vagues d\'envahisseurs !', 'Les envahisseurs ripostent et les astéroïdes pleuvent. 3 vies, vagues infinies.'],
  pad: { left: true, hint: 'ou glisse le doigt · tir automatique' },
  stars: s => s >= 1500 ? 3 : s >= 700 ? 2 : s >= 250 ? 1 : 0,
  create(env) {
    const { input, sfx } = env; const hard = env.tier >= 2;
    let ship, shots = [], foes = [], rocks = [], bullets = [], lives = 3, score = 0, wave = 0, t = 0, fire = 0, inv = 0, over = false, waveT = 0, msg = '', msgT = 0;
    const pr = Particles();
    function init() { ship = { x: env.W / 2, y: env.H - 70, w: 36 }; }
    function spawnWave() {
      wave++; msg = 'Vague ' + wave; msgT = 1.5; const n = Math.min(14, 5 + wave * 2), cols = Math.min(7, n), W = env.W;
      for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); foes.push({ x: W / 2 + (c - (cols - 1) / 2) * Math.min(64, W / (cols + 1)), y: -40 - r * 50, ty: 70 + r * 52, ph: rnd(0, 6), hp: hard && wave > 2 && i % 4 === 0 ? 2 : 1, c: ['#ff4f9a', '#9dff5c', '#ffd23f', '#38e0d6'][r % 4], shootT: rnd(2, 5) }); }
    }
    function update(dt) {
      if (over) return; t += dt; inv = Math.max(0, inv - dt); msgT = Math.max(0, msgT - dt); const W = env.W, H = env.H; ship.y = H - 70;
      if (input.held.left) ship.x -= 420 * dt; if (input.held.right) ship.x += 420 * dt;
      if (input.pointer.down) ship.x += (input.pointer.x - ship.x) * Math.min(1, dt * 14);
      ship.x = clamp(ship.x, 24, W - 24);
      fire -= dt; if (fire <= 0) { shots.push({ x: ship.x, y: ship.y - 20 }); fire = hard ? .22 : .28; if (S.sound && wave) sfx.tick(); }
      for (let i = shots.length - 1; i >= 0; i--) { shots[i].y -= 560 * dt; if (shots[i].y < -10) shots.splice(i, 1); }
      if (!foes.length) { waveT -= dt; if (waveT <= 0) { spawnWave(); waveT = 2; } }
      const sp = 1 + wave * .1;
      for (let i = foes.length - 1; i >= 0; i--) {
        const f = foes[i]; f.y += (f.ty - f.y) * Math.min(1, dt * 2); f.x += Math.sin(t * 1.5 + f.ph) * 40 * dt * sp; f.ty += 6 * dt * sp;
        if (hard && wave > 1) { f.shootT -= dt; if (f.shootT <= 0) { bullets.push({ x: f.x, y: f.y + 14 }); f.shootT = rnd(3, 7) / sp; } }
        for (let j = shots.length - 1; j >= 0; j--) { const s = shots[j]; if (Math.abs(s.x - f.x) < 18 && Math.abs(s.y - f.y) < 16) { shots.splice(j, 1); f.hp--; if (f.hp <= 0) { foes.splice(i, 1); score += 20 * (hard ? 2 : 1); pr.burst(f.x, f.y, f.c, 12, 180); sfx.coin(); env.vibe(10); } else sfx.hit(); break; } }
        if (f.y > H - 40) { foes.splice(i, 1); hit(); }
        else if (inv <= 0 && Math.abs(f.x - ship.x) < 26 && Math.abs(f.y - ship.y) < 24) { foes.splice(i, 1); pr.burst(f.x, f.y, f.c, 12, 180); hit(); }
      }
      if (hard && Math.random() < dt * (.25 + wave * .05)) rocks.push({ x: rnd(20, W - 20), y: -30, r: rnd(12, 22), vy: rnd(90, 160), rot: 0, vr: rnd(-2, 2) });
      for (let i = rocks.length - 1; i >= 0; i--) { const r = rocks[i]; r.y += r.vy * dt; r.rot += r.vr * dt; if (r.y > H + 30) { rocks.splice(i, 1); continue; } for (let j = shots.length - 1; j >= 0; j--) { if (Math.hypot(shots[j].x - r.x, shots[j].y - r.y) < r.r) { shots.splice(j, 1); r.r -= 6; score += 5; sfx.tick(); if (r.r < 8) { rocks.splice(i, 1); pr.burst(r.x, r.y, '#b5642a', 8); break; } } } if (rocks[i] && inv <= 0 && Math.hypot(r.x - ship.x, r.y - ship.y) < r.r + 16) { rocks.splice(i, 1); hit(); } }
      for (let i = bullets.length - 1; i >= 0; i--) { const b = bullets[i]; b.y += 260 * dt; if (b.y > H) { bullets.splice(i, 1); continue; } if (inv <= 0 && Math.abs(b.x - ship.x) < 16 && Math.abs(b.y - ship.y) < 18) { bullets.splice(i, 1); hit(); } }
      pr.update(dt); env.setScore(score); env.hud('Vague ' + wave);
    }
    function hit() { if (inv > 0) return; lives--; inv = 1.5; sfx.hit(); env.vibe(150); pr.burst(ship.x, ship.y, '#38e0d6', 20, 240); if (lives <= 0) { over = true; env.gameOver(score, { text: 'Vague ' + wave + ' atteinte' }); } }
    function draw(c) {
      const W = env.W, H = env.H; const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0820'); g.addColorStop(1, '#2a1f5c'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = '#fff'; for (let i = 0; i < 60; i++) { const sx = (i * 97) % W, sy = ((i * 53) + t * (20 + i % 3 * 25)) % H; c.globalAlpha = .3 + (i % 4) * .2; c.fillRect(sx, sy, 2, 2); } c.globalAlpha = 1;
      for (const r of rocks) { c.save(); c.translate(r.x, r.y); c.rotate(r.rot); c.fillStyle = '#8a5a2b'; c.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, rr = r.r * (k % 2 ? .8 : 1); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(r.r * .3, -r.r * .2, r.r * .25, 0, 7); c.fill(); c.restore(); }
      for (const f of foes) { c.fillStyle = f.c; c.beginPath(); c.ellipse(f.x, f.y, 18, 10, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(f.x, f.y - 6, 9, 8, 0, Math.PI, 0); c.fill(); c.fillStyle = '#1b1540'; c.beginPath(); c.arc(f.x - 3, f.y - 7, 2, 0, 7); c.arc(f.x + 3, f.y - 7, 2, 0, 7); c.fill(); if (f.hp > 1) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.ellipse(f.x, f.y, 21, 13, 0, 0, 7); c.stroke(); } }
      c.fillStyle = '#ffd23f'; for (const s of shots) { c.fillRect(s.x - 2, s.y - 8, 4, 14); }
      c.fillStyle = '#ff4f4f'; for (const b of bullets) { c.beginPath(); c.arc(b.x, b.y, 5, 0, 7); c.fill(); }
      if (!(inv > 0 && Math.floor(inv * 12) % 2)) { c.save(); c.translate(ship.x, ship.y); c.fillStyle = '#ff9f1c'; c.beginPath(); c.moveTo(-6, 16); c.lineTo(0, 26 + Math.sin(t * 40) * 5); c.lineTo(6, 16); c.fill(); c.fillStyle = '#38e0d6'; c.beginPath(); c.moveTo(0, -22); c.lineTo(16, 16); c.lineTo(0, 8); c.lineTo(-16, 16); c.closePath(); c.fill(); c.fillStyle = '#fff5e1'; c.beginPath(); c.arc(0, -4, 5, 0, 7); c.fill(); c.restore(); }
      pr.draw(c); Draw.lives(c, lives, 3, 22, 10);
      if (msgT > 0) { c.globalAlpha = Math.min(1, msgT); Draw.text(c, msg, W / 2, H * .35, 30, '#ffd23f'); c.globalAlpha = 1; }
    }
    init();
    return { update, draw, resize: () => { ship.x = clamp(ship.x, 24, env.W - 24); } };
  }
});
