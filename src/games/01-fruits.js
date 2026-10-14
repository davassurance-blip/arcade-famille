/* ===== Attrape-Fruits (dès 4 ans) ===== */
GAMES.push({
  id: 'fruits', title: 'Attrape-Fruits', tagline: 'Panier, fruits, pas de bombes !', minAge: 4, color: '#ff9f1c',
  icon: '<svg viewBox="0 0 64 64"><path d="M10 30h44l-5 24H15z" fill="#8a4b1f"/><path d="M12 30h40l-2 8H14z" fill="#b5642a"/><circle cx="24" cy="22" r="9" fill="#ff4f4f"/><circle cx="40" cy="20" r="9" fill="#ffd23f"/><path d="M24 13c2-4 6-4 6-4-1 4-4 5-6 4z" fill="#3fbf4f"/><path d="M40 11c2-4 6-4 6-4-1 4-4 5-6 4z" fill="#3fbf4f"/></svg>',
  howto: ['Glisse ton doigt pour bouger le panier. Attrape les fruits, évite les bombes !', 'Attrape les fruits, évite les bombes. Un fruit raté = un cœur en moins !', 'Mode rapide : fruits dorés = bonus, bombes partout.'],
  pad: { left: true, hint: 'ou glisse le doigt' },
  stars: s => s >= 400 ? 3 : s >= 200 ? 2 : s >= 80 ? 1 : 0,
  create(env) {
    const { input, sfx } = env; const tier = env.tier;
    const FR = [{ c: '#ff4f4f', n: 'pomme' }, { c: '#ffd23f', n: 'citron' }, { c: '#ff9f1c', n: 'orange' }, { c: '#b36bff', n: 'prune' }, { c: '#5ad1ff', n: 'myrtille' }, { c: '#ff6fb5', n: 'fraise' }];
    let items = [], lives = 3, score = 0, t = 0, spawn = 0, hurt = 0, combo = 0;
    const bk = { x: env.W / 2, w: 100 };
    const pr = Particles();
    const speedBase = [140, 200, 260][tier], interval = [1.1, .8, .62][tier], bombRate = [.12, .2, .28][tier];
    function spawnItem() {
      const W = env.W; const bomb = Math.random() < bombRate; const gold = !bomb && tier > 0 && Math.random() < .08;
      items.push({ x: rnd(30, W - 30), y: -30, r: bomb ? 16 : 18, vy: speedBase + t * 6 + rnd(-20, 40), bomb, gold, f: pick(FR), rot: rnd(0, 6), vr: rnd(-2, 2) });
    }
    function update(dt) {
      t += dt; const W = env.W, H = env.H; bk.w = clamp(W * .22, 80, 130);
      const sp = 480;
      if (input.held.left) bk.x -= sp * dt; if (input.held.right) bk.x += sp * dt;
      if (input.pointer.down) bk.x += (input.pointer.x - bk.x) * Math.min(1, dt * 14);
      bk.x = clamp(bk.x, bk.w / 2, W - bk.w / 2);
      spawn -= dt; if (spawn <= 0) { spawnItem(); spawn = Math.max(.35, interval - t * .01); }
      const by = H - 70;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i]; it.y += it.vy * dt; it.rot += it.vr * dt;
        if (it.y + it.r > by && it.y - it.r < by + 40 && Math.abs(it.x - bk.x) < bk.w / 2 + it.r * .6) {
          items.splice(i, 1);
          if (it.bomb) { lives--; hurt = .5; combo = 0; sfx.hit(); env.vibe(120); pr.burst(it.x, it.y, '#333', 14, 220); }
          else { combo++; const pts = (it.gold ? 50 : 10) + Math.min(combo, 10) * (tier ? 2 : 0); score += pts; sfx.coin(); pr.burst(it.x, it.y, it.gold ? '#ffd23f' : it.f.c, 10); }
          env.setScore(score);
        } else if (it.y - it.r > H) {
          items.splice(i, 1);
          if (!it.bomb && tier > 0) { lives--; hurt = .4; combo = 0; sfx.ko(); }
        }
      }
      hurt = Math.max(0, hurt - dt); pr.update(dt);
      env.hud('Combo ' + combo);
      if (lives <= 0) env.gameOver(score, { text: 'Tu as tenu ' + Math.round(t) + ' s' });
    }
    function draw(c) {
      const W = env.W, H = env.H;
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5ad1ff'); g.addColorStop(1, '#c9f3ff'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      // nuages
      c.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 4; i++) { const x = ((i * 190 + t * 18) % (W + 200)) - 100, y = 50 + i * 36; c.beginPath(); c.arc(x, y, 22, 0, 7); c.arc(x + 24, y - 10, 26, 0, 7); c.arc(x + 50, y, 20, 0, 7); c.fill(); }
      c.fillStyle = '#6cd35b'; c.fillRect(0, H - 34, W, 34); c.fillStyle = '#4faf40'; c.fillRect(0, H - 34, W, 6);
      if (hurt > 0) { c.fillStyle = 'rgba(255,60,60,' + hurt * .5 + ')'; c.fillRect(0, 0, W, H); }
      for (const it of items) {
        c.save(); c.translate(it.x, it.y); c.rotate(it.rot);
        if (it.bomb) { c.fillStyle = '#222'; c.beginPath(); c.arc(0, 0, it.r, 0, 7); c.fill(); c.strokeStyle = '#ff9f1c'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -it.r); c.quadraticCurveTo(10, -it.r - 10, 14, -it.r - 4); c.stroke(); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(14, -it.r - 4, 4 + Math.sin(t * 30) * 2, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(-5, -5, 5, 0, 7); c.fill(); }
        else { c.fillStyle = it.gold ? '#ffd23f' : it.f.c; c.beginPath(); c.arc(0, 0, it.r, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(-6, -6, 6, 0, 7); c.fill(); c.fillStyle = '#3fbf4f'; c.beginPath(); c.ellipse(5, -it.r + 1, 8, 4, -.6, 0, 7); c.fill(); c.strokeStyle = '#6b4a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -it.r + 2); c.lineTo(0, -it.r - 6); c.stroke(); if (it.gold) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.strokeRect(-3, -3, 6, 6); } }
        c.restore();
      }
      // panier
      const by = H - 70; c.fillStyle = '#8a4b1f'; c.beginPath(); c.moveTo(bk.x - bk.w / 2, by); c.lineTo(bk.x + bk.w / 2, by); c.lineTo(bk.x + bk.w / 2 - 12, by + 42); c.lineTo(bk.x - bk.w / 2 + 12, by + 42); c.closePath(); c.fill();
      c.fillStyle = '#b5642a'; c.fillRect(bk.x - bk.w / 2, by, bk.w, 10); c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 2; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(bk.x - bk.w / 2 + i * bk.w / 4, by + 10); c.lineTo(bk.x - bk.w / 2 + 8 + i * (bk.w - 16) / 4, by + 42); c.stroke(); }
      pr.draw(c);
      Draw.lives(c, lives, 3, 22, 14);
    }
    return { update, draw };
  }
});
