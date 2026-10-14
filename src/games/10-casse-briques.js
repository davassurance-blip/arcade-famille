/* ===== Casse-Briques (dès 8 ans) ===== */
GAMES.push({
  id: 'bricks', title: 'Casse-Briques', tagline: 'Renvoie la balle, casse tout', minAge: 8, color: '#ff6a55',
  icon: '<svg viewBox="0 0 64 64"><g><rect x="6" y="8" width="16" height="8" rx="2" fill="#ff4f4f"/><rect x="24" y="8" width="16" height="8" rx="2" fill="#ff9f1c"/><rect x="42" y="8" width="16" height="8" rx="2" fill="#ffd23f"/><rect x="6" y="18" width="16" height="8" rx="2" fill="#9dff5c"/><rect x="24" y="18" width="16" height="8" rx="2" fill="#38e0d6"/><rect x="42" y="18" width="16" height="8" rx="2" fill="#9b7bff"/></g><circle cx="36" cy="40" r="4" fill="#fff5e1"/><rect x="22" y="52" width="24" height="6" rx="3" fill="#fff5e1"/></svg>',
  howto: ['', 'Glisse le doigt pour déplacer la raquette. Casse toutes les briques sans laisser tomber la balle !', 'Briques renforcées (2 coups), balle rapide, 3 vies. Chaque niveau accélère.'],
  pad: { left: true, buttons: [{ k: 'a', label: 'GO' }], hint: 'ou glisse le doigt' },
  stars: s => s >= 1200 ? 3 : s >= 600 ? 2 : s >= 200 ? 1 : 0,
  create(env) {
    const { input, sfx } = env; const hard = env.tier >= 2;
    const COLS = 8; let bricks = [], ball, pad, lives = 3, score = 0, level = 1, stuck = true, over = false, t = 0, flash = 0;
    const pr = Particles();
    const ROWC = ['#ff4f4f', '#ff9f1c', '#ffd23f', '#9dff5c', '#38e0d6', '#9b7bff', '#ff4f9a'];
    function layout() {
      const W = env.W; const rows = Math.min(7, 4 + level + (hard ? 1 : 0)); const bw = (W - 20) / COLS, bh = Math.min(26, env.H * .035);
      bricks = []; for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) { const hp = hard && r < 2 && (c + r) % 3 === 0 ? 2 : 1; bricks.push({ x: 10 + c * bw + 2, y: 50 + r * (bh + 4), w: bw - 4, h: bh, hp, c: ROWC[r % ROWC.length] }); }
      pad = { x: W / 2, w: clamp(W * .22, 70, 130), h: 14 }; reset();
    }
    function reset() { ball = { x: pad.x, y: env.H - 60, vx: 0, vy: 0, r: 8, sp: (hard ? 360 : 300) + level * 25 }; stuck = true; }
    function launch() { if (!stuck) return; stuck = false; const a = rnd(-.6, .6); ball.vx = Math.sin(a) * ball.sp; ball.vy = -Math.cos(a) * ball.sp; sfx.jump(); }
    function update(dt) {
      if (over) return; t += dt; flash = Math.max(0, flash - dt); const W = env.W, H = env.H;
      if (input.held.left) pad.x -= 520 * dt; if (input.held.right) pad.x += 520 * dt;
      if (input.pointer.down) pad.x += (input.pointer.x - pad.x) * Math.min(1, dt * 16);
      pad.x = clamp(pad.x, pad.w / 2, W - pad.w / 2);
      if (input.pressed.a || input.tap || input.pointer.justDown) launch();
      if (stuck) { ball.x = pad.x; ball.y = H - 60; }
      else {
        // sous-pas pour ne pas traverser les briques
        const steps = 3; for (let s = 0; s < steps; s++) {
          ball.x += ball.vx * dt / steps; ball.y += ball.vy * dt / steps;
          if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -1; sfx.tick(); } if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx *= -1; sfx.tick(); } if (ball.y < 36 + ball.r) { ball.y = 36 + ball.r; ball.vy *= -1; sfx.tick(); }
          const py = H - 44;
          if (ball.vy > 0 && ball.y + ball.r >= py && ball.y + ball.r <= py + pad.h + 6 && Math.abs(ball.x - pad.x) <= pad.w / 2 + ball.r) { const rel = (ball.x - pad.x) / (pad.w / 2); const a = rel * 1.1; ball.vx = Math.sin(a) * ball.sp; ball.vy = -Math.abs(Math.cos(a) * ball.sp); ball.y = py - ball.r; sfx.pop(); }
          for (let i = bricks.length - 1; i >= 0; i--) {
            const b = bricks[i]; if (ball.x + ball.r < b.x || ball.x - ball.r > b.x + b.w || ball.y + ball.r < b.y || ball.y - ball.r > b.y + b.h) continue;
            const ox = Math.min(ball.x + ball.r - b.x, b.x + b.w - ball.x + ball.r), oy = Math.min(ball.y + ball.r - b.y, b.y + b.h - ball.y + ball.r);
            if (ox < oy) ball.vx *= -1; else ball.vy *= -1;
            b.hp--; if (b.hp <= 0) { bricks.splice(i, 1); score += 10 * level; pr.burst(b.x + b.w / 2, b.y + b.h / 2, b.c, 10, 160); sfx.coin(); env.vibe(15); } else { score += 5; sfx.hit(); }
            break;
          }
          if (ball.y > H + 20) { lives--; flash = .5; sfx.lose(); env.vibe(150); if (lives <= 0) { over = true; env.gameOver(score, { text: 'Niveau ' + level }); return; } reset(); break; }
        }
      }
      if (!bricks.length) { level++; score += 100 * level; sfx.win(); layout(); }
      pr.update(dt); env.setScore(score); env.hud('Niv. ' + level + ' · ' + bricks.length + ' briques');
    }
    function draw(c) {
      const W = env.W, H = env.H; c.fillStyle = '#17123a'; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 40; i++) c.fillRect((i * 83) % W, (i * 47 + t * 10) % H, 2, 2);
      if (flash > 0) { c.fillStyle = 'rgba(255,80,80,' + flash * .4 + ')'; c.fillRect(0, 0, W, H); }
      for (const b of bricks) { c.fillStyle = b.c; Draw.rr(c, b.x, b.y, b.w, b.h, 5); c.fill(); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(b.x + 3, b.y + 3, b.w - 6, 3); if (b.hp > 1) { c.strokeStyle = '#fff'; c.lineWidth = 2; Draw.rr(c, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 4); c.stroke(); } }
      c.fillStyle = '#fff5e1'; c.shadowColor = '#38e0d6'; c.shadowBlur = 14; Draw.rr(c, pad.x - pad.w / 2, H - 44, pad.w, pad.h, 7); c.fill();
      c.beginPath(); c.arc(ball.x, ball.y, ball.r, 0, 7); c.fill(); c.shadowBlur = 0;
      pr.draw(c); Draw.lives(c, lives, 3, 22, 10);
      if (stuck) Draw.text(c, 'Tape pour lancer', W / 2, H * .6, 22, 'rgba(255,255,255,.7)');
    }
    layout();
    return { update, draw, resize: layout };
  }
});
