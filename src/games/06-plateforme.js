/* ===== Plateforme Pixel (dès 8 ans) — 3 niveaux générés ===== */
GAMES.push({
  id: 'platform', title: 'Plateforme Pixel', tagline: 'Cours, saute, attrape les pièces', minAge: 8, color: '#5ad1ff',
  icon: '<svg viewBox="0 0 64 64"><rect x="4" y="46" width="56" height="14" fill="#b5642a"/><rect x="4" y="46" width="56" height="4" fill="#3fbf4f"/><rect x="34" y="26" width="22" height="8" fill="#b5642a"/><rect x="34" y="26" width="22" height="3" fill="#3fbf4f"/><circle cx="45" cy="16" r="5" fill="#ffd23f"/><rect x="14" y="22" width="12" height="12" rx="3" fill="#ffb27a"/><rect x="13" y="18" width="14" height="6" rx="2" fill="#ff4f4f"/><rect x="15" y="34" width="10" height="10" rx="2" fill="#38e0d6"/><circle cx="18" cy="27" r="1.5" fill="#1b1540"/><circle cx="23" cy="27" r="1.5" fill="#1b1540"/></svg>',
  howto: ['', 'Flèches pour courir, SAUT pour sauter. Saute sur les blobs pour les écraser, attrape les pièces, atteins le drapeau !', 'Mode difficile : trous plus larges, piques, blobs rapides. 3 niveaux, 3 vies.'],
  pad: { left: true, buttons: [{ k: 'a', label: 'SAUT' }] },
  stars: s => s >= 900 ? 3 : s >= 500 ? 2 : s >= 200 ? 1 : 0,
  create(env) {
    const { input, sfx } = env; const hard = env.tier >= 2;
    const ROWS = 12; let TS = 40, level = 0, lives = 3, score = 0, coins = 0, world = null, p = null, enemies = [], cam = 0, t = 0, inv = 0, msg = '', msgT = 0, checkpoint = 0, over = false;
    const pr = Particles();
    const SKIES = [['#5ad1ff', '#dff6ff'], ['#ff9f6b', '#ffe1a8'], ['#1b1540', '#4b3fa3']];
    function gen(L) {
      const cols = 110 + L * 35, g = []; for (let r = 0; r < ROWS; r++) g.push(new Uint8Array(cols));
      let x = 0, h = 2; const segs = []; enemies = [];
      while (x < cols) {
        const len = x === 0 ? 10 : rndi(5, 11);
        for (let i = 0; i < len && x + i < cols; i++) for (let r = ROWS - h; r < ROWS; r++) g[r][x + i] = 1;
        segs.push({ x, len: Math.min(len, cols - x), h });
        x += len;
        if (x < cols - 10) { const gap = rndi(2, hard ? 4 : 3); x += gap; const nh = clamp(h + rndi(-1, hard ? 2 : 1), 1, 5); if (nh - h > 2) h = h + 2; else h = nh; }
      }
      // plateformes flottantes, pièces, ennemis, piques
      for (const s of segs) {
        const top = ROWS - s.h;
        if (s.len >= 4 && Math.random() < .7) { const px = s.x + rndi(1, Math.max(1, s.len - 4)), plen = rndi(2, 4), py = top - rndi(3, 4); if (py > 1) for (let i = 0; i < plen && px + i < cols; i++) { g[py][px + i] = 1; if (py > 1) g[py - 1][px + i] = 3; } }
        if (s.len >= 3 && Math.random() < .6) { const cx = s.x + rndi(0, s.len - 3); for (let i = 0; i < 3; i++) if (!g[top - 2][cx + i]) g[top - 2][cx + i] = 3; }
        if (s.x > 0 && s.len >= 5 && Math.random() < (hard ? .85 : .6)) enemies.push({ x: (s.x + 2) * TS, y: (top - 1) * TS, vx: (hard ? 90 : 60) * pick([-1, 1]), w: TS * .8, h: TS * .6, dead: 0, ph: rnd(0, 6) });
        if (hard && s.x > 0 && s.len >= 6 && Math.random() < .5) { const sx = s.x + rndi(2, s.len - 3); g[top - 1][sx] = 4; }
      }
      const last = segs[segs.length - 1]; const fx = Math.min(cols - 3, last.x + last.len - 3); g[ROWS - last.h - 1][fx] = 5;
      checkpoint = 0;
      return { g, cols, L };
    }
    function spawn(x) { p = { x: x + 2, y: (ROWS - 4) * TS, w: TS * .6, h: TS * .85, vx: 0, vy: 0, g: false, face: 1, coyote: 0, buf: 0, anim: 0 }; inv = 1.2; }
    function resize() {
      const old = TS; TS = clamp(Math.floor(Math.min(env.H / ROWS, env.W / 10)), 24, 56); const k = TS / old;
      if (world && k !== 1) { p.x *= k; p.y *= k; p.w *= k; p.h *= k; cam *= k; for (const e of enemies) { e.x *= k; e.y *= k; e.w *= k; e.h *= k; } }
    }
    function startLevel(L) { level = L; world = gen(L); spawn(TS * 5); cam = 0; msg = 'Niveau ' + (L + 1); msgT = 2; }
    function solid(cx, cy) { if (cy >= ROWS) return false; if (cx < 0 || cx >= world.cols) return true; if (cy < 0) return false; return world.g[cy][cx] === 1; }
    function tileAt(cx, cy) { return (cy < 0 || cy >= ROWS || cx < 0 || cx >= world.cols) ? 0 : world.g[cy][cx]; }
    function hit(reason) {
      if (inv > 0) return; lives--; sfx.hit(); env.vibe(150); pr.burst(p.x + p.w / 2, p.y + p.h / 2, '#ff6a55', 16, 240);
      if (lives <= 0) { over = true; env.gameOver(score, { text: 'Niveau ' + (level + 1) + ' · ' + coins + ' pièces' }); return; }
      spawn(checkpoint * TS + TS); msg = reason; msgT = 1.5;
    }
    function update(dt) {
      if (over) return; t += dt; inv = Math.max(0, inv - dt); msgT = Math.max(0, msgT - dt);
      const SP = 230, JV = 560, G = 1500;
      const dir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
      p.vx += (dir * SP - p.vx) * Math.min(1, dt * (p.g ? 14 : 7)); if (dir) p.face = dir;
      if (input.pressed.a || input.pressed.up) p.buf = .12; else p.buf = Math.max(0, p.buf - dt);
      p.coyote = p.g ? .09 : Math.max(0, p.coyote - dt);
      if (p.buf > 0 && p.coyote > 0) { p.vy = -JV; p.g = false; p.coyote = 0; p.buf = 0; sfx.jump(); }
      if (!input.held.a && !input.held.up && p.vy < -200) p.vy += G * 1.5 * dt; // saut court
      p.vy = Math.min(900, p.vy + G * dt);
      // X
      p.x += p.vx * dt;
      let c0 = Math.floor(p.y / TS), c1 = Math.floor((p.y + p.h - 1) / TS);
      if (p.vx > 0) { const cx = Math.floor((p.x + p.w) / TS); for (let cy = c0; cy <= c1; cy++) if (solid(cx, cy)) { p.x = cx * TS - p.w - .01; p.vx = 0; break; } }
      else if (p.vx < 0) { const cx = Math.floor(p.x / TS); for (let cy = c0; cy <= c1; cy++) if (solid(cx, cy)) { p.x = (cx + 1) * TS + .01; p.vx = 0; break; } }
      // Y
      p.y += p.vy * dt; p.g = false;
      const x0 = Math.floor((p.x + 2) / TS), x1 = Math.floor((p.x + p.w - 2) / TS);
      if (p.vy > 0) { const cy = Math.floor((p.y + p.h) / TS); for (let cx = x0; cx <= x1; cx++) if (solid(cx, cy)) { p.y = cy * TS - p.h; p.vy = 0; p.g = true; break; } }
      else if (p.vy < 0) { const cy = Math.floor(p.y / TS); for (let cx = x0; cx <= x1; cx++) if (solid(cx, cy)) { p.y = (cy + 1) * TS; p.vy = 0; break; } }
      p.anim += Math.abs(p.vx) * dt * .05;
      // tuiles spéciales
      const mx = Math.floor((p.x + p.w / 2) / TS), my0 = Math.floor((p.y + 4) / TS), my1 = Math.floor((p.y + p.h - 4) / TS);
      for (let cy = my0; cy <= my1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const tl = tileAt(cx, cy);
        if (tl === 3) { world.g[cy][cx] = 0; coins++; score += 10; sfx.coin(); pr.burst(cx * TS + TS / 2, cy * TS + TS / 2, '#ffd23f', 8, 120); }
        else if (tl === 4 && cy === my1) hit('Aïe, des piques !');
        else if (tl === 5) { score += 200 + (lives * 50); sfx.win(); if (level >= 2) { over = true; env.gameOver(score, { win: true, text: 'Les 3 niveaux terminés !' }); return; } startLevel(level + 1); return; }
      }
      if (mx > world.cols / 2 && checkpoint === 0 && p.g) { checkpoint = mx; msg = 'Checkpoint !'; msgT = 1.2; sfx.ok(); }
      if (p.y > ROWS * TS + TS) { inv = 0; hit('Tombé dans le vide !'); }
      // ennemis
      for (const e of enemies) {
        if (e.dead > 0) { e.dead -= dt; continue; }
        if (Math.abs(e.x - p.x) > env.W * 1.2) continue;
        e.x += e.vx * dt; const ex = Math.floor((e.vx > 0 ? e.x + e.w : e.x) / TS), ey = Math.floor((e.y + e.h / 2) / TS), by = Math.floor((e.y + e.h + 2) / TS);
        if (solid(ex, ey) || !solid(ex, by)) { e.vx *= -1; e.x += e.vx * dt * 2; }
        if (p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
          if (p.vy > 0 && p.y + p.h < e.y + e.h * .6) { e.dead = 99; p.vy = -380; score += 50; sfx.pop(); env.vibe(40); pr.burst(e.x + e.w / 2, e.y + e.h / 2, '#9dff5c', 12); }
          else hit('Un blob t\'a touché !');
        }
      }
      cam += (clamp(p.x - env.W * .38, 0, world.cols * TS - env.W) - cam) * Math.min(1, dt * 8);
      pr.update(dt);
      env.setScore(score); env.hud('Niv. ' + (level + 1) + ' · ' + coins + ' pièces');
    }
    function draw(c) {
      const W = env.W, H = env.H, worldH = ROWS * TS, offY = Math.max(0, (H - worldH) / 2);
      const sky = SKIES[level]; const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = level === 2 ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.35)'; for (let i = 0; i < 7; i++) { const x = ((i * 300 - cam * .25) % (W + 400) + W + 400) % (W + 400) - 200; c.beginPath(); c.arc(x, offY + worldH * .75, 160, Math.PI, 0); c.fill(); }
      if (level === 2) { c.fillStyle = '#fff'; for (let i = 0; i < 30; i++) { const x = (i * 97 + 13) % W, y = (i * 53 + 7) % (H * .6); c.fillRect(x, y, 2, 2); } }
      c.save(); c.translate(-Math.floor(cam), offY);
      const cx0 = Math.max(0, Math.floor(cam / TS)), cx1 = Math.min(world.cols - 1, Math.ceil((cam + W) / TS));
      for (let cy = 0; cy < ROWS; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const tl = world.g[cy][cx]; if (!tl) continue; const x = cx * TS, y = cy * TS;
        if (tl === 1) { const topFree = !solid(cx, cy - 1); c.fillStyle = level === 2 ? '#5b4a8a' : '#b5642a'; c.fillRect(x, y, TS, TS); c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(x, y + TS / 2, TS / 2, 1); c.fillRect(x + TS / 2, y, 1, TS / 2); c.fillRect(x, y + TS - 1, TS, 1); if (topFree) { c.fillStyle = level === 2 ? '#8a7bd6' : '#3fbf4f'; c.fillRect(x, y, TS, TS * .22); } }
        else if (tl === 3) { const s = Math.abs(Math.sin(t * 5 + cx)); c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(x + TS / 2, y + TS / 2, TS * .3 * (.3 + .7 * s), TS * .3, 0, 0, 7); c.fill(); c.fillStyle = '#ff9f1c'; c.beginPath(); c.ellipse(x + TS / 2, y + TS / 2, TS * .15 * (.3 + .7 * s), TS * .15, 0, 0, 7); c.fill(); }
        else if (tl === 4) { c.fillStyle = '#6b6b8f'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + i * TS / 3, y + TS); c.lineTo(x + (i + .5) * TS / 3, y + TS * .25); c.lineTo(x + (i + 1) * TS / 3, y + TS); c.fill(); } }
        else if (tl === 5) { c.fillStyle = '#e8e8f0'; c.fillRect(x + TS * .45, y - TS * 1.5, TS * .1, TS * 2.5); c.fillStyle = '#ff4f9a'; c.beginPath(); c.moveTo(x + TS * .55, y - TS * 1.4); c.lineTo(x + TS * 1.3 + Math.sin(t * 6) * 3, y - TS); c.lineTo(x + TS * .55, y - TS * .6); c.fill(); }
      }
      for (const e of enemies) { if (e.dead > 0 || e.x < cam - TS || e.x > cam + W + TS) continue; const sq = 1 + Math.sin(t * 8 + e.ph) * .08; c.fillStyle = hard ? '#ff4f9a' : '#9b7bff'; c.beginPath(); c.ellipse(e.x + e.w / 2, e.y + e.h, e.w / 2 * sq, e.h / sq, 0, Math.PI, 0); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(e.x + e.w * .35, e.y + e.h * .5, TS * .09, 0, 7); c.arc(e.x + e.w * .65, e.y + e.h * .5, TS * .09, 0, 7); c.fill(); c.fillStyle = '#1b1540'; c.beginPath(); c.arc(e.x + e.w * .35 + Math.sign(e.vx) * 2, e.y + e.h * .5, TS * .045, 0, 7); c.arc(e.x + e.w * .65 + Math.sign(e.vx) * 2, e.y + e.h * .5, TS * .045, 0, 7); c.fill(); }
      // joueur
      if (!(inv > 0 && Math.floor(inv * 14) % 2)) {
        c.save(); c.translate(p.x + p.w / 2, p.y); c.scale(p.face, 1);
        const run = p.g && Math.abs(p.vx) > 30 ? Math.sin(p.anim * 2) : 0;
        c.fillStyle = '#38e0d6'; Draw.rr(c, -p.w * .4, p.h * .5, p.w * .8, p.h * .5, 4); c.fill();
        c.fillStyle = '#1b1540'; c.fillRect(-p.w * .35, p.h * .85 + run * 3, p.w * .3, p.h * .15); c.fillRect(p.w * .05, p.h * .85 - run * 3, p.w * .3, p.h * .15);
        c.fillStyle = '#ffb27a'; Draw.rr(c, -p.w * .45, p.h * .12, p.w * .9, p.h * .45, 5); c.fill();
        c.fillStyle = '#ff4f4f'; Draw.rr(c, -p.w * .5, 0, p.w, p.h * .2, 4); c.fill(); c.fillRect(0, p.h * .1, p.w * .7, p.h * .1);
        c.fillStyle = '#1b1540'; c.fillRect(p.w * .05, p.h * .28, p.w * .12, p.h * .12); c.fillRect(p.w * .28, p.h * .28, p.w * .12, p.h * .12);
        c.restore();
      }
      pr.draw(c);
      c.restore();
      Draw.lives(c, lives, 3, 22, 14);
      if (msgT > 0) { c.globalAlpha = Math.min(1, msgT); c.lineWidth = 6; c.strokeStyle = level === 2 ? '#1b1540' : '#fff'; c.font = '900 28px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(msg, W / 2, H * .3); Draw.text(c, msg, W / 2, H * .3, 28, level === 2 ? '#fff' : '#1b1540'); c.globalAlpha = 1; }
    }
    resize(); startLevel(0);
    return { update, draw, resize };
  }
});
