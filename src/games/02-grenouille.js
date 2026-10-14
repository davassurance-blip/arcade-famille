/* ===== Grenouille Sauteuse (dès 4 ans) — un seul bouton ===== */
GAMES.push({
  id: 'frog', title: 'Grenouille Sauteuse', tagline: 'Tape pour sauter !', minAge: 4, color: '#9dff5c',
  icon: '<svg viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="22" ry="16" fill="#3fbf4f"/><circle cx="22" cy="24" r="8" fill="#3fbf4f"/><circle cx="42" cy="24" r="8" fill="#3fbf4f"/><circle cx="22" cy="24" r="5" fill="#fff"/><circle cx="42" cy="24" r="5" fill="#fff"/><circle cx="23" cy="25" r="2.5" fill="#1b1540"/><circle cx="43" cy="25" r="2.5" fill="#1b1540"/><path d="M22 44q10 8 20 0" stroke="#1b1540" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="14" cy="54" rx="8" ry="4" fill="#2f9a3f"/><ellipse cx="50" cy="54" rx="8" ry="4" fill="#2f9a3f"/></svg>',
  howto: ['Tape sur l\'écran pour sauter par-dessus les troncs. Attrape les mouches !', 'Saute les troncs, attrape les mouches. Ça va de plus en plus vite !', 'Saute, attrape, survis. Les troncs doubles demandent le bon timing.'],
  pad: { buttons: [{ k: 'a', label: 'SAUT' }], hint: 'ou tape l\'écran' },
  stars: s => s >= 600 ? 3 : s >= 300 ? 2 : s >= 100 ? 1 : 0,
  create(env) {
    const { input, sfx } = env; const tier = env.tier;
    let frog = { y: 0, vy: 0, g: true }, obs = [], flies = [], caught = 0, speed = [180, 230, 280][tier], dist = 0, score = 0, lives = 3, inv = 0, t = 0, next = 1.2, nextFly = 1.5, squash = 0;
    const pr = Particles();
    const groundY = () => env.H - 60;
    function jump() { if (frog.g) { frog.vy = -[520, 560, 600][tier]; frog.g = false; sfx.jump(); squash = .15; } }
    function update(dt) {
      t += dt; const W = env.W, H = env.H, gy = groundY();
      speed += dt * [3, 5, 7][tier];
      if (input.pressed.a || input.pressed.up || input.tap || (input.pointer.justDown)) jump();
      frog.vy += 1500 * dt; frog.y += frog.vy * dt; if (frog.y > 0) { frog.y = 0; frog.vy = 0; if (!frog.g) squash = .12; frog.g = true; }
      dist += speed * dt; score = Math.floor(dist / 20) + caught * 25 | 0;
      next -= dt; if (next <= 0) { const dbl = tier > 0 && Math.random() < .3; obs.push({ x: W + 40, w: dbl ? 70 : 38, h: rnd(30, 44), dbl }); next = rnd(1.1, 2.1) * (200 / speed) + .3; }
      nextFly -= dt; if (nextFly <= 0) { flies.push({ x: W + 20, y: gy - rnd(70, 160), ph: rnd(0, 6) }); nextFly = rnd(1.5, 3); }
      
      const fx = 90, fy = gy + frog.y - 22, fr = 22;
      for (let i = obs.length - 1; i >= 0; i--) {
        const o = obs[i]; o.x -= speed * dt; if (o.x + o.w < -10) { obs.splice(i, 1); continue; }
        if (inv <= 0 && fx + fr * .7 > o.x && fx - fr * .7 < o.x + o.w && fy + fr * .8 > gy - o.h) { lives--; inv = 1.2; sfx.hit(); env.vibe(100); pr.burst(fx, fy, '#ff6a55', 12); }
      }
      for (let i = flies.length - 1; i >= 0; i--) {
        const f = flies[i]; f.x -= speed * 1.05 * dt; f.y += Math.sin(t * 6 + f.ph) * 20 * dt;
        if (f.x < -20) { flies.splice(i, 1); continue; }
        if (Math.hypot(f.x - fx, f.y - fy) < fr + 10) { flies.splice(i, 1); caught++; sfx.coin(); pr.burst(f.x, f.y, '#ffd23f', 8); }
      }
      inv = Math.max(0, inv - dt); squash = Math.max(0, squash - dt); pr.update(dt);
      env.setScore(score); env.hud('Mouches ' + caught);
      if (lives <= 0) env.gameOver(score, { text: Math.floor(dist / 20) + ' m parcourus' });
    }
    function draw(c) {
      const W = env.W, H = env.H, gy = groundY();
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffe08a'); g.addColorStop(.6, '#ffb36b'); g.addColorStop(1, '#5fc46f'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(W * .8, 70, 36, 0, 7); c.fill();
      // collines parallaxe
      c.fillStyle = '#7fd08a'; for (let i = 0; i < 6; i++) { const x = ((i * 260 - dist * .3) % (W + 300) + W + 300) % (W + 300) - 150; c.beginPath(); c.arc(x, gy + 30, 110, Math.PI, 0); c.fill(); }
      c.fillStyle = '#4faf40'; c.fillRect(0, gy, W, H - gy); c.fillStyle = '#3c8f30'; c.fillRect(0, gy, W, 8);
      c.fillStyle = '#2f7a28'; for (let i = 0; i < W / 40 + 2; i++) { const x = ((i * 40 - dist) % (W + 40) + W + 40) % (W + 40) - 20; c.fillRect(x, gy + 20, 18, 4); }
      for (const o of obs) { c.fillStyle = '#8a4b1f'; Draw.rr(c, o.x, gy - o.h, o.w, o.h + 6, 8); c.fill(); c.fillStyle = '#b5642a'; c.beginPath(); c.ellipse(o.x + o.w / 2, gy - o.h, o.w / 2, 7, 0, 0, 7); c.fill(); c.strokeStyle = '#6b3a14'; c.lineWidth = 2; c.beginPath(); c.ellipse(o.x + o.w / 2, gy - o.h, o.w / 4, 3, 0, 0, 7); c.stroke(); }
      for (const f of flies) { c.fillStyle = '#1b1540'; c.beginPath(); c.arc(f.x, f.y, 6, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; const w = Math.sin(t * 40) * 6; c.beginPath(); c.ellipse(f.x - 6, f.y - 6, 7, 3 + w * .3, -.5, 0, 7); c.ellipse(f.x + 6, f.y - 6, 7, 3 - w * .3, .5, 0, 7); c.fill(); }
      // grenouille
      const fx = 90, fy = gy + frog.y - 22; const sq = 1 + squash * 2;
      c.save(); c.translate(fx, gy + frog.y); c.scale(sq, 1 / sq); c.translate(0, -22);
      if (inv > 0 && Math.floor(inv * 12) % 2) c.globalAlpha = .4;
      c.fillStyle = '#3fbf4f'; c.beginPath(); c.ellipse(0, 4, 26, 18, 0, 0, 7); c.fill();
      c.fillStyle = '#2f9a3f'; c.beginPath(); c.ellipse(-18, 18, 10, 5, 0, 0, 7); c.ellipse(18, 18, 10, 5, 0, 0, 7); c.fill();
      [-11, 11].forEach(dx => { c.fillStyle = '#3fbf4f'; c.beginPath(); c.arc(dx, -14, 9, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(dx, -14, 6, 0, 7); c.fill(); c.fillStyle = '#1b1540'; c.beginPath(); c.arc(dx + 2, -14, 3, 0, 7); c.fill(); });
      c.strokeStyle = '#1b1540'; c.lineWidth = 2.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-10, 6); c.quadraticCurveTo(0, 14, 10, 6); c.stroke();
      c.fillStyle = '#ff9fb5'; c.beginPath(); c.arc(-20, 2, 4, 0, 7); c.arc(20, 2, 4, 0, 7); c.fill();
      c.restore();
      pr.draw(c);
      Draw.lives(c, lives, 3, 22, 14);
    }
    return { update, draw };
  }
});
