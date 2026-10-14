/* ===== Fusée Étoiles (dès 4 ans) — un seul bouton ===== */
GAMES.push({
  id: 'rocket', title: 'Fusée Étoiles', tagline: 'Tape pour monter, évite les nuages', minAge: 4, color: '#ff4f9a',
  icon: '<svg viewBox="0 0 64 64"><path d="M32 6c10 8 14 22 10 38H22C18 28 22 14 32 6z" fill="#fff5e1"/><path d="M22 36l-8 10h8zM42 36l8 10h-8z" fill="#ff4f4f"/><circle cx="32" cy="24" r="5" fill="#38e0d6"/><path d="M26 44h12l-6 14z" fill="#ffd23f"/><path d="M8 18l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="#ffd23f"/><path d="M54 10l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" fill="#ffd23f"/></svg>',
  howto: ['Tape sur l\'écran pour faire monter la fusée. Passe entre les nuages et attrape les étoiles !', 'Tape pour monter, lâche pour descendre. Passages plus étroits, 1 seule vie.', 'Passages serrés et rapides. Réflexes de pilote !'],
  pad: { buttons: [{ k: 'a', label: 'HOP' }], hint: 'ou tape l\'écran' },
  stars: s => s >= 300 ? 3 : s >= 150 ? 2 : s >= 50 ? 1 : 0,
  create(env) {
    const { input, sfx } = env; const tier = env.tier;
    let y, vy, gates = [], stars = [], t = 0, dist = 0, score = 0, passed = 0, caught = 0, lives = [3, 2, 1][tier], inv = 0, over = false, nextGate = 1.2, started = false;
    const pr = Particles();
    const speed = [150, 210, 270][tier], gap = [250, 185, 150][tier], G = [900, 1300, 1500][tier], JUMP = [-320, -400, -430][tier];
    const RX = 90;
    function update(dt) {
      if (over) return; t += dt; const W = env.W, H = env.H; inv = Math.max(0, inv - dt); if (y == null) y = H / 2;
      const tap = input.pressed.a || input.pressed.up || input.tap || input.pointer.justDown;
      if (tap) { started = true; vy = JUMP; sfx.jump(); pr.burst(RX - 14, y + 14, '#ff9f1c', 4, 80); }
      if (!started) { y = H / 2 + Math.sin(t * 2) * 10; return; }
      vy = (vy || 0) + G * dt; y += vy * dt; dist += speed * dt;
      if (y < 20) { y = 20; vy = 0; } if (y > H - 30) { y = H - 30; hit(); }
      nextGate -= dt; if (nextGate <= 0) { const gy = rnd(80 + gap / 2, H - 60 - gap / 2); gates.push({ x: W + 60, y: gy, w: 60, ok: false }); if (Math.random() < .7) stars.push({ x: W + 60 + rnd(80, 160), y: rnd(60, H - 60), ph: rnd(0, 6) }); nextGate = [2.1, 1.7, 1.45][tier]; }
      for (let i = gates.length - 1; i >= 0; i--) {
        const g = gates[i]; g.x -= speed * dt; if (g.x + g.w < -20) { gates.splice(i, 1); continue; }
        if (!g.ok && g.x + g.w < RX) { g.ok = true; passed++; sfx.ok(); }
        if (inv <= 0 && RX + 16 > g.x && RX - 16 < g.x + g.w && (y - 12 < g.y - gap / 2 || y + 12 > g.y + gap / 2)) hit();
      }
      for (let i = stars.length - 1; i >= 0; i--) { const s = stars[i]; s.x -= speed * dt; if (s.x < -20) { stars.splice(i, 1); continue; } if (Math.hypot(s.x - RX, s.y - y) < 28) { stars.splice(i, 1); caught++; sfx.coin(); pr.burst(s.x, s.y, '#ffd23f', 10); } }
      score = passed * 10 + caught * 5; pr.update(dt); env.setScore(score); env.hud('Étoiles ' + caught);
    }
    function hit() { if (inv > 0 || over) return; lives--; inv = 1.5; sfx.hit(); env.vibe(150); pr.burst(RX, y, '#ff6a55', 16, 220); if (lives <= 0) { over = true; env.gameOver(score, { text: passed + ' passages · ' + caught + ' étoiles' }); } else { vy = JUMP * .6; } }
    function draw(c) {
      const W = env.W, H = env.H; const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b1540'); g.addColorStop(1, '#5b3fa0'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = '#fff'; for (let i = 0; i < 50; i++) { const sx = ((i * 97) - dist * (.2 + i % 3 * .15)) % (W + 20); c.globalAlpha = .3 + (i % 3) * .25; c.fillRect((sx + W + 20) % (W + 20), (i * 61) % H, 2, 2); } c.globalAlpha = 1;
      for (const gt of gates) { c.fillStyle = '#e9e4ff'; const top = gt.y - gap / 2, bot = gt.y + gap / 2; [[0, top], [bot, H]].forEach(([a, b]) => { Draw.rr(c, gt.x, a - 10, gt.w, b - a + 20, 18); c.fill(); for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(gt.x + 10 + k * 20, (k === 1 ? b - 6 : a + 6), 16, 0, 7); c.fill(); } }); c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(gt.x + gt.w - 10, 0, 10, top); c.fillRect(gt.x + gt.w - 10, bot, 10, H - bot); }
      for (const s of stars) { c.save(); c.translate(s.x, s.y); c.rotate(t * 2 + s.ph); c.fillStyle = '#ffd23f'; c.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, r = k % 2 ? 6 : 14; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.restore(); }
      // fusée
      if (y != null && !(inv > 0 && Math.floor(inv * 12) % 2)) {
        c.save(); c.translate(RX, y); c.rotate(clamp((vy || 0) / 900, -.5, .6));
        c.fillStyle = '#ff9f1c'; c.beginPath(); c.moveTo(-18, -6); c.lineTo(-30 - Math.random() * 10, 0); c.lineTo(-18, 6); c.fill();
        c.fillStyle = '#fff5e1'; c.beginPath(); c.moveTo(22, 0); c.quadraticCurveTo(10, -14, -18, -12); c.lineTo(-18, 12); c.quadraticCurveTo(10, 14, 22, 0); c.fill();
        c.fillStyle = '#ff4f4f'; c.beginPath(); c.moveTo(-10, -10); c.lineTo(-22, -20); c.lineTo(-18, -4); c.fill(); c.beginPath(); c.moveTo(-10, 10); c.lineTo(-22, 20); c.lineTo(-18, 4); c.fill();
        c.fillStyle = '#38e0d6'; c.beginPath(); c.arc(4, 0, 5, 0, 7); c.fill();
        c.restore();
      }
      pr.draw(c); Draw.lives(c, lives, [3, 2, 1][tier], 22, 10);
      if (!started) Draw.text(c, 'Tape pour décoller !', W / 2, H * .3, 24, '#ffd23f');
    }
    return { update, draw };
  }
});
