/* ===== Plateforme Pixel (dès 8 ans) — 5 niveaux générés, difficulté progressive =====
   Feel du saut : coyote time, saut mis en mémoire (jump buffer), hauteur minimale garantie,
   saut variable (maintenir = plus haut). Tuiles : 1 sol, 3 pièce, 4 piques, 5 drapeau, 6 bloc ?, 7 bloc vide, 8 checkpoint. */
GAMES.push({
  id: 'platform', landscape: true, title: 'Plateforme Pixel', tagline: 'Cours, saute, attrape les pièces', minAge: 8, color: '#5ad1ff',
  icon: '<svg viewBox="0 0 64 64"><rect x="4" y="46" width="56" height="14" fill="#b5642a"/><rect x="4" y="46" width="56" height="4" fill="#3fbf4f"/><rect x="34" y="26" width="22" height="8" fill="#b5642a"/><rect x="34" y="26" width="22" height="3" fill="#3fbf4f"/><circle cx="45" cy="16" r="5" fill="#ffd23f"/><rect x="14" y="22" width="12" height="12" rx="3" fill="#ffb27a"/><rect x="13" y="18" width="14" height="6" rx="2" fill="#ff4f4f"/><rect x="15" y="34" width="10" height="10" rx="2" fill="#38e0d6"/><circle cx="18" cy="27" r="1.5" fill="#1b1540"/><circle cx="23" cy="27" r="1.5" fill="#1b1540"/></svg>',
  howto: ['', 'Flèches pour courir, SAUT pour sauter : maintiens le bouton pour sauter plus haut ! Écrase les blobs, tape les blocs « ? » par en dessous, attrape le champignon. 5 niveaux de plus en plus durs.', 'Mode difficile : trous plus larges, piques, blobs rapides et chauves-souris. 5 niveaux.'],
  pad: { left: true, buttons: [{ k: 'a', label: 'SAUT' }], big: true, hint: 'ou tape l\'écran' },
  stars: s => s >= 1500 ? 3 : s >= 800 ? 2 : s >= 300 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env; const hard = env.tier >= 2;
    const ROWS = 12, LEVELS = 5; let d = 0, TS = 40, level = 0, lives = 4, score = 0, coins = 0, world = null, p = null, enemies = [], items = [], cam = 0, t = 0, inv = 0, msg = '', msgT = 0, checkpoint = 0, over = false, pops = [];
    const pr = Particles();
    const SKIES = [['#5ad1ff', '#dff6ff'], ['#7fd0ff', '#fff2c8'], ['#ff9f6b', '#ffe1a8'], ['#6a4fc0', '#ffb3c8'], ['#1b1540', '#4b3fa3']];
    const diff = L => L + (hard ? 1.5 : 0); // 0 → 6.5
    function gen(L) {
      const d = diff(L), cols = 90 + L * 25, g = []; for (let r = 0; r < ROWS; r++) g.push(new Uint8Array(cols));
      const gapMax = clamp(Math.round(1 + d * .5), 1, 4), gapProb = .45 + d * .08, enemyProb = clamp(.25 + d * .12, 0, .9);
      let x = 0, h = 2; const segs = []; enemies = []; items = [];
      while (x < cols) {
        const len = x === 0 ? 12 : rndi(6, 12);
        for (let i = 0; i < len && x + i < cols; i++) for (let r = ROWS - h; r < ROWS; r++) g[r][x + i] = 1;
        segs.push({ x, len: Math.min(len, cols - x), h });
        x += len;
        if (x < cols - 10 && Math.random() < gapProb) { x += rndi(1, gapMax); const nh = clamp(h + rndi(-1, 1), 1, 4); h = nh; }
      }
      segs.forEach((s, si) => {
        const top = ROWS - s.h;
        // plateforme flottante atteignable (3 tuiles au-dessus du sol max)
        if (s.len >= 5 && Math.random() < .6) { const px = s.x + rndi(1, s.len - 4), plen = rndi(2, 4), py = top - rndi(2, 3); if (py > 2) for (let i = 0; i < plen && px + i < cols; i++) { g[py][px + i] = 1; g[py - 1][px + i] = 3; } }
        // blocs ?
        if (s.len >= 5 && Math.random() < .7) { const bx = s.x + rndi(1, s.len - 3), by = top - 3; if (by > 1 && !g[by][bx] && !g[by + 1][bx]) { g[by][bx] = 6; if (Math.random() < .4 && bx + 1 < cols && !g[by][bx + 1]) g[by][bx + 1] = 6; } }
        // pièces au sol
        if (s.len >= 3 && Math.random() < .7) { const cx = s.x + rndi(0, s.len - 3); for (let i = 0; i < 3; i++) if (!g[top - 1][cx + i]) g[top - 1][cx + i] = 3; }
        // ennemis
        if (si > 0 && s.len >= 4) {
          const n = s.len >= 9 && Math.random() < .5 + d * .1 ? 2 : (Math.random() < .75 + d * .04 ? 1 : 0);
          for (let i = 0; i < n; i++) {
            const kinds = ['snail', 'slime']; if (d >= 1.5) kinds.push('slime'); if (d >= 2) kinds.push('hopper'); if (d >= 4) kinds.push('hopper');
            const k = pick(kinds), ex = (s.x + 2 + Math.floor(i * (s.len - 3) / n)) * TS;
            if (k === 'snail') enemies.push({ k, x: ex, y: (top - 1) * TS + TS * .35, vx: (22 + d * 4) * (TS / 40) * pick([-1, 1]), w: TS * .85, h: TS * .65, dead: 0, ph: rnd(0, 6) });
            else if (k === 'hopper') enemies.push({ k, x: ex, y: (top - 1) * TS + TS * .3, vx: 0, vy: 0, w: TS * .7, h: TS * .7, dead: 0, ph: rnd(0, 6), jt: rnd(.5, 1.5) });
            else enemies.push({ k: 'slime', x: ex, y: (top - 1) * TS + TS * .4, vx: (38 + d * 10) * (TS / 40) * pick([-1, 1]), w: TS * .8, h: TS * .6, dead: 0, ph: rnd(0, 6) });
          }
        }
        if (d >= 3.5 && si > 1 && Math.random() < (d - 3) * .2) enemies.push({ k: 'bat', x: (s.x + 3) * TS, y: (top - 4) * TS, vx: 70 * (TS / 40) * pick([-1, 1]), w: TS * .8, h: TS * .5, dead: 0, ph: rnd(0, 6), y0: (top - 4) * TS });
        // piques
        if (d >= 2.5 && si > 0 && s.len >= 7 && Math.random() < (d - 2) * .18) { const sx = s.x + rndi(2, s.len - 3); if (!g[top - 1][sx] && !g[top - 2][sx]) g[top - 1][sx] = 4; }
      });
      // checkpoint au milieu, drapeau à la fin
      const mid = segs.find(s => s.x > cols / 2 && s.len >= 4) || segs[Math.floor(segs.length / 2)]; g[ROWS - mid.h - 1][mid.x + 1] = 8;
      const last = segs[segs.length - 1]; g[ROWS - last.h - 1][Math.min(cols - 3, last.x + last.len - 3)] = 5;
      checkpoint = 0;
      return { g, cols, L };
    }
    function spawn(x) { p = { x: x + 2, y: (ROWS - 5) * TS, w: TS * .6, h: TS * .85, vx: 0, vy: 0, g: false, face: 1, coyote: 0, buf: 0, anim: 0, jumpT: 0, big: p ? p.big : false }; inv = 1.2; }
    function resize() { const old = TS; TS = clamp(Math.floor(Math.min(env.H / ROWS, env.W / 10)), 24, 56); const k = TS / old; if (world && k !== 1) { p.x *= k; p.y *= k; p.w *= k; p.h *= k; cam *= k; for (const e of enemies) { e.x *= k; e.y *= k; e.w *= k; e.h *= k; e.vx *= k; if (e.y0) e.y0 *= k; } for (const it of items) { it.x *= k; it.y *= k; it.vx *= k; } p.vx *= k; p.vy *= k; } }
    function persist() { env.save({ level, lives, score, coins, big: p && p.big }, 'Niveau ' + (level + 1) + ' · ' + lives + ' vie' + (lives > 1 ? 's' : '') + ' · ' + score + ' pts'); }
    function startLevel(L) { level = L; d = diff(L); world = gen(L); spawn(TS * 5); cam = 0; msg = 'Niveau ' + (L + 1) + ' / ' + LEVELS; msgT = 2.2; if (L === 0 && !hard) setTimeout(() => { if (!over && msgT <= 0) { msg = 'Maintiens SAUT pour sauter plus haut'; msgT = 3; } }, 2600); persist(); }
    const SOLID = { 1: 1, 6: 1, 7: 1 };
    function solid(cx, cy) { if (cy >= ROWS) return false; if (cx < 0 || cx >= world.cols) return true; if (cy < 0) return false; return !!SOLID[world.g[cy][cx]]; }
    function tileAt(cx, cy) { return (cy < 0 || cy >= ROWS || cx < 0 || cx >= world.cols) ? 0 : world.g[cy][cx]; }
    function hit(reason) {
      if (inv > 0) return;
      if (p.big) { p.big = false; inv = 1.5; sfx.ko(); env.vibe(60); pr.burst(p.x + p.w / 2, p.y + p.h / 2, '#ff4f9a', 10, 160); msg = 'Ouille ! Champignon perdu'; msgT = 1.2; return; }
      lives--; sfx.hit(); env.vibe(150); pr.burst(p.x + p.w / 2, p.y + p.h / 2, '#ff6a55', 16, 240);
      if (lives <= 0) { over = true; env.gameOver(score, { text: 'Niveau ' + (level + 1) + ' · ' + coins + ' pièces' }); return; }
      spawn(checkpoint * TS + TS); msg = reason; msgT = 1.5; persist();
    }
    function bump(cx, cy) { // bloc ? frappé par en dessous
      world.g[cy][cx] = 7; sfx.coin(); env.vibe(20); pops.push({ x: cx * TS + TS / 2, y: cy * TS, t: .5, cy });
      if (!p.big && Math.random() < .35) items.push({ k: 'shroom', x: cx * TS + TS * .1, y: (cy - 1) * TS + TS * .2, vx: 60 * (TS / 40), w: TS * .8, h: TS * .8, vy: 0 });
      else { coins++; score += 10; }
    }
    function update(dt) {
      if (over) return; t += dt; inv = Math.max(0, inv - dt); msgT = Math.max(0, msgT - dt);
      const K = TS / 40, SP = (hard ? 265 : 250) * K, JV = 640 * K, G = 1700 * K; // physique proportionnelle à la taille des tuiles
      const dir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
      p.vx += (dir * SP - p.vx) * Math.min(1, dt * (p.g ? 16 : 8)); if (dir) p.face = dir;
      const jumpPressed = input.pressed.a || input.pressed.up || input.pointer.justDown, jumpHeld = input.held.a || input.held.up || input.pointer.down;
      if (jumpPressed) p.buf = .16; else p.buf = Math.max(0, p.buf - dt);
      p.coyote = p.g ? .12 : Math.max(0, p.coyote - dt);
      if (p.buf > 0 && p.coyote > 0) { p.vy = -JV; p.g = false; p.coyote = 0; p.buf = 0; p.jumpT = 0; sfx.jump(); pr.burst(p.x + p.w / 2, p.y + p.h, '#fff', 4, 60); }
      p.jumpT += dt;
      if (!jumpHeld && p.vy < -260 * K && p.jumpT > .11) p.vy = -260 * K; // relâché : saut court, mais jamais minuscule
      p.vy = Math.min(950 * K, p.vy + G * dt);
      // X
      p.x += p.vx * dt;
      let c0 = Math.floor(p.y / TS), c1 = Math.floor((p.y + p.h - 1) / TS);
      if (p.vx > 0) { const cx = Math.floor((p.x + p.w) / TS); for (let cy = c0; cy <= c1; cy++) if (solid(cx, cy)) { p.x = cx * TS - p.w - .01; p.vx = 0; break; } }
      else if (p.vx < 0) { const cx = Math.floor(p.x / TS); for (let cy = c0; cy <= c1; cy++) if (solid(cx, cy)) { p.x = (cx + 1) * TS + .01; p.vx = 0; break; } }
      // Y
      p.y += p.vy * dt; p.g = false;
      const x0 = Math.floor((p.x + 3) / TS), x1 = Math.floor((p.x + p.w - 3) / TS);
      if (p.vy > 0) { const cy = Math.floor((p.y + p.h) / TS); for (let cx = x0; cx <= x1; cx++) if (solid(cx, cy)) { p.y = cy * TS - p.h; p.vy = 0; p.g = true; break; } }
      else if (p.vy < 0) { const cy = Math.floor(p.y / TS); const mid = Math.floor((p.x + p.w / 2) / TS); const order = [mid, x0, x1]; for (const cx of order) if (solid(cx, cy)) { p.y = (cy + 1) * TS; p.vy = 0; if (tileAt(cx, cy) === 6) bump(cx, cy); break; } }
      p.anim += Math.abs(p.vx) * dt * .05;
      // tuiles spéciales
      const mx = Math.floor((p.x + p.w / 2) / TS), my0 = Math.floor((p.y + 4) / TS), my1 = Math.floor((p.y + p.h - 4) / TS);
      for (let cy = my0; cy <= my1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const tl = tileAt(cx, cy);
        if (tl === 3) { world.g[cy][cx] = 0; coins++; score += 10; sfx.coin(); pr.burst(cx * TS + TS / 2, cy * TS + TS / 2, '#ffd23f', 8, 120); if (coins % 50 === 0) { lives++; msg = '+1 vie !'; msgT = 1.5; sfx.win(); } }
        else if (tl === 4 && cy === my1) hit('Aïe, des piques !');
        else if (tl === 8 && checkpoint === 0) { checkpoint = cx; msg = 'Checkpoint !'; msgT = 1.2; sfx.ok(); }
        else if (tl === 5) { score += 200 + lives * 50; sfx.win(); if (level >= LEVELS - 1) { over = true; env.gameOver(score, { win: true, text: 'Les ' + LEVELS + ' niveaux terminés !' }); return; } startLevel(level + 1); return; }
      }
      if (p.y > ROWS * TS + TS) { inv = 0; p.big = false; hit('Tombé dans le vide !'); }
      // objets (champignon)
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i]; it.vy = Math.min(600 * K, it.vy + G * dt); it.y += it.vy * dt; const by = Math.floor((it.y + it.h) / TS), ix = Math.floor((it.x + it.w / 2) / TS); if (solid(ix, by)) { it.y = by * TS - it.h; it.vy = 0; }
        it.x += it.vx * dt; const ex = Math.floor((it.vx > 0 ? it.x + it.w : it.x) / TS), ey = Math.floor((it.y + it.h / 2) / TS); if (solid(ex, ey)) { it.vx *= -1; }
        if (it.y > ROWS * TS + TS) { items.splice(i, 1); continue; }
        if (p.x < it.x + it.w && p.x + p.w > it.x && p.y < it.y + it.h && p.y + p.h > it.y) { items.splice(i, 1); p.big = true; score += 50; sfx.win(); env.vibe(40); msg = 'Champignon : un coup de plus !'; msgT = 1.5; pr.burst(it.x + it.w / 2, it.y + it.h / 2, '#ff4f9a', 12, 160); }
      }
      // ennemis
      for (const e of enemies) {
        if (e.dead > 0) { e.dead -= dt; continue; }
        if (Math.abs(e.x - p.x) > env.W * 1.2) continue;
        e.x += e.vx * dt;
        if (e.k === 'bat') { e.y = e.y0 + Math.sin(t * 3 + e.ph) * TS * 1.2; const ex = Math.floor((e.vx > 0 ? e.x + e.w : e.x) / TS); if (solid(ex, Math.floor(e.y0 / TS)) || e.x < 0 || e.x > world.cols * TS) e.vx *= -1; }
        else if (e.k === 'hopper') {
          e.vy = Math.min(900 * K, (e.vy || 0) + G * dt); e.y += e.vy * dt;
          const by = Math.floor((e.y + e.h) / TS), ix = Math.floor((e.x + e.w / 2) / TS);
          if (e.vy > 0 && solid(ix, by)) { e.y = by * TS - e.h; e.vy = 0; e.vx = 0; e.jt -= dt; if (e.jt <= 0) { e.jt = rnd(1.2, 2.2) - Math.min(.8, d * .1); e.vy = -(8 + Math.min(3, d)) * TS; e.vx = (p.x > e.x ? 1 : -1) * (70 + d * 10) * K; sfx.tick(); } }
          const ex = Math.floor((e.vx > 0 ? e.x + e.w : e.x) / TS), ey = Math.floor((e.y + e.h / 2) / TS); if (solid(ex, ey)) e.vx *= -1;
          if (e.y > ROWS * TS + TS) e.dead = 99;
        }
        else { const ex = Math.floor((e.vx > 0 ? e.x + e.w : e.x) / TS), ey = Math.floor((e.y + e.h / 2) / TS), by = Math.floor((e.y + e.h + 2) / TS); if (solid(ex, ey) || !solid(ex, by)) { e.vx *= -1; e.x += e.vx * dt * 2; } }
        if (p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
          if (p.vy > 0 && p.y + p.h < e.y + e.h * .7) { e.dead = 99; p.vy = (jumpHeld ? -520 : -400) * K; score += 50; sfx.pop(); env.vibe(40); pr.burst(e.x + e.w / 2, e.y + e.h / 2, e.k === 'bat' ? '#c084fc' : e.k === 'snail' ? '#ffd23f' : '#9dff5c', 12); }
          else hit(e.k === 'bat' ? 'Une chauve-souris !' : e.k === 'snail' ? 'Un escargot t\'a touché !' : e.k === 'hopper' ? 'Une sauterelle !' : 'Un blob t\'a touché !');
        }
      }
      for (let i = pops.length - 1; i >= 0; i--) { pops[i].t -= dt; if (pops[i].t <= 0) pops.splice(i, 1); }
      cam += (clamp(p.x - env.W * .38, 0, world.cols * TS - env.W) - cam) * Math.min(1, dt * 8);
      pr.update(dt);
      env.setScore(score); env.hud('Niv. ' + (level + 1) + '/' + LEVELS + ' · ' + coins + ' pièces');
    }
    function draw(c) {
      const W = env.W, H = env.H, worldH = ROWS * TS, offY = Math.max(0, (H - worldH) / 2), night = level === 4;
      const sky = SKIES[level]; const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]); c.fillStyle = g; c.fillRect(0, 0, W, H);
      if (night) { c.fillStyle = '#fff'; for (let i = 0; i < 30; i++) { c.fillRect((i * 97 + 13) % W, (i * 53 + 7) % (H * .6), 2, 2); } }
      c.fillStyle = night ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.4)'; for (let i = 0; i < 6; i++) { const x = ((i * 260 - cam * .2) % (W + 300) + W + 300) % (W + 300) - 150; c.beginPath(); c.arc(x, offY + worldH * .72, 130, Math.PI, 0); c.fill(); }
      c.fillStyle = night ? 'rgba(120,100,200,.25)' : 'rgba(80,170,90,.35)'; for (let i = 0; i < 8; i++) { const x = ((i * 200 - cam * .45) % (W + 260) + W + 260) % (W + 260) - 130; c.beginPath(); c.arc(x, offY + worldH * .9, 90, Math.PI, 0); c.fill(); }
      c.save(); c.translate(-Math.floor(cam), offY);
      const cx0 = Math.max(0, Math.floor(cam / TS)), cx1 = Math.min(world.cols - 1, Math.ceil((cam + W) / TS));
      const ground = night ? '#5b4a8a' : '#b5642a', grass = night ? '#8a7bd6' : '#3fbf4f';
      for (let cy = 0; cy < ROWS; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const tl = world.g[cy][cx]; if (!tl) continue; const x = cx * TS, y = cy * TS;
        if (tl === 1) { c.fillStyle = ground; c.fillRect(x, y, TS, TS); c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(x, y + TS / 2, TS / 2, 1); c.fillRect(x + TS / 2, y, 1, TS / 2); c.fillRect(x, y + TS - 1, TS, 1); if (!solid(cx, cy - 1)) { c.fillStyle = grass; c.fillRect(x, y, TS, TS * .22); } }
        else if (tl === 3) { const s = Math.abs(Math.sin(t * 5 + cx)); c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(x + TS / 2, y + TS / 2, TS * .3 * (.3 + .7 * s), TS * .3, 0, 0, 7); c.fill(); c.fillStyle = '#ff9f1c'; c.beginPath(); c.ellipse(x + TS / 2, y + TS / 2, TS * .15 * (.3 + .7 * s), TS * .15, 0, 0, 7); c.fill(); }
        else if (tl === 4) { c.fillStyle = '#6b6b8f'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + i * TS / 3, y + TS); c.lineTo(x + (i + .5) * TS / 3, y + TS * .25); c.lineTo(x + (i + 1) * TS / 3, y + TS); c.fill(); } }
        else if (tl === 5) { c.fillStyle = '#e8e8f0'; c.fillRect(x + TS * .45, y - TS * 1.5, TS * .1, TS * 2.5); c.fillStyle = '#ff4f9a'; c.beginPath(); c.moveTo(x + TS * .55, y - TS * 1.4); c.lineTo(x + TS * 1.3 + Math.sin(t * 6) * 3, y - TS); c.lineTo(x + TS * .55, y - TS * .6); c.fill(); }
        else if (tl === 8) { const on = checkpoint === cx; c.fillStyle = '#e8e8f0'; c.fillRect(x + TS * .45, y - TS * .8, TS * .1, TS * 1.8); c.fillStyle = on ? '#9dff5c' : '#b9b0e6'; c.fillRect(x + TS * .55, y - TS * .75, TS * .6, TS * .4); }
        else if (tl === 6 || tl === 7) { c.fillStyle = tl === 6 ? '#ffb020' : '#8a6a4a'; Draw.rr(c, x + 1, y + 1, TS - 2, TS - 2, 4); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + 3, y + 3, TS - 6, 3); if (tl === 6) Draw.text(c, '?', x + TS / 2, y + TS / 2 + 1, TS * .6, '#fff'); }
      }
      for (const pp of pops) { const k = 1 - pp.t / .5; c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(pp.x, pp.y - TS * .6 - k * TS * 1.2, TS * .22, TS * .28, 0, 0, 7); c.fill(); }
      for (const it of items) { c.fillStyle = '#ff4f9a'; c.beginPath(); c.arc(it.x + it.w / 2, it.y + it.h * .45, it.w / 2, Math.PI, 0); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(it.x + it.w * .3, it.y + it.h * .3, it.w * .12, 0, 7); c.arc(it.x + it.w * .7, it.y + it.h * .25, it.w * .1, 0, 7); c.fill(); c.fillStyle = '#ffe3c0'; c.fillRect(it.x + it.w * .25, it.y + it.h * .45, it.w * .5, it.h * .5); }
      for (const e of enemies) {
        if (e.dead > 0 || e.x < cam - TS || e.x > cam + W + TS) continue;
        if (e.k === 'bat') { c.fillStyle = '#c084fc'; const fl = Math.sin(t * 14 + e.ph) * e.h * .5; c.beginPath(); c.moveTo(e.x + e.w / 2, e.y + e.h / 2); c.lineTo(e.x, e.y + fl); c.lineTo(e.x + e.w * .2, e.y + e.h / 2); c.closePath(); c.fill(); c.beginPath(); c.moveTo(e.x + e.w / 2, e.y + e.h / 2); c.lineTo(e.x + e.w, e.y + fl); c.lineTo(e.x + e.w * .8, e.y + e.h / 2); c.closePath(); c.fill(); c.beginPath(); c.arc(e.x + e.w / 2, e.y + e.h / 2, e.h * .4, 0, 7); c.fill(); c.fillStyle = '#ff4f4f'; c.beginPath(); c.arc(e.x + e.w / 2 - 3, e.y + e.h / 2 - 2, 2, 0, 7); c.arc(e.x + e.w / 2 + 3, e.y + e.h / 2 - 2, 2, 0, 7); c.fill(); }
        else if (e.k === 'snail') { const dir = Math.sign(e.vx) || 1; c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(e.x + e.w * .5, e.y + e.h, e.w * .5, e.h * .35, 0, Math.PI, 0); c.fill(); c.fillStyle = '#ff9f1c'; c.beginPath(); c.arc(e.x + e.w * .45, e.y + e.h * .55, e.h * .42, 0, 7); c.fill(); c.strokeStyle = '#b5642a'; c.lineWidth = 2; c.beginPath(); c.arc(e.x + e.w * .45, e.y + e.h * .55, e.h * .22, 0, 5); c.stroke(); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(e.x + e.w * (dir > 0 ? .9 : .1), e.y + e.h * .7, e.h * .22, 0, 7); c.fill(); c.strokeStyle = '#ffd23f'; c.beginPath(); c.moveTo(e.x + e.w * (dir > 0 ? .95 : .05), e.y + e.h * .6); c.lineTo(e.x + e.w * (dir > 0 ? 1.05 : -.05), e.y + e.h * .3); c.stroke(); c.fillStyle = '#1b1540'; c.beginPath(); c.arc(e.x + e.w * (dir > 0 ? 1.05 : -.05), e.y + e.h * .3, 2, 0, 7); c.fill(); }
        else if (e.k === 'hopper') { const dir = p.x > e.x ? 1 : -1, air = e.vy !== 0; c.fillStyle = '#3fbf4f'; c.beginPath(); c.ellipse(e.x + e.w / 2, e.y + e.h * .6, e.w * .45, e.h * (air ? .5 : .38), 0, 0, 7); c.fill(); c.strokeStyle = '#2f9a3f'; c.lineWidth = 3; c.beginPath(); c.moveTo(e.x + e.w * .3, e.y + e.h * .8); c.lineTo(e.x + e.w * .1, e.y + e.h * (air ? 1.2 : .95)); c.moveTo(e.x + e.w * .7, e.y + e.h * .8); c.lineTo(e.x + e.w * .9, e.y + e.h * (air ? 1.2 : .95)); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(e.x + e.w * (.5 + dir * .22), e.y + e.h * .4, e.h * .16, 0, 7); c.fill(); c.fillStyle = '#1b1540'; c.beginPath(); c.arc(e.x + e.w * (.5 + dir * .26), e.y + e.h * .4, e.h * .08, 0, 7); c.fill(); }
        else { const sq = 1 + Math.sin(t * 8 + e.ph) * .08; c.fillStyle = hard ? '#ff4f9a' : '#9b7bff'; c.beginPath(); c.ellipse(e.x + e.w / 2, e.y + e.h, e.w / 2 * sq, e.h / sq, 0, Math.PI, 0); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(e.x + e.w * .35, e.y + e.h * .5, TS * .09, 0, 7); c.arc(e.x + e.w * .65, e.y + e.h * .5, TS * .09, 0, 7); c.fill(); c.fillStyle = '#1b1540'; c.beginPath(); c.arc(e.x + e.w * .35 + Math.sign(e.vx) * 2, e.y + e.h * .5, TS * .045, 0, 7); c.arc(e.x + e.w * .65 + Math.sign(e.vx) * 2, e.y + e.h * .5, TS * .045, 0, 7); c.fill(); }
      }
      // joueur
      if (!(inv > 0 && Math.floor(inv * 14) % 2)) {
        c.save(); c.translate(p.x + p.w / 2, p.y); c.scale(p.face, 1);
        const run = p.g && Math.abs(p.vx) > 30 ? Math.sin(p.anim * 2) : 0; const sq = !p.g ? (p.vy < 0 ? 1.08 : .94) : 1; c.scale(1 / sq, sq);
        c.fillStyle = p.big ? '#ff4f9a' : '#38e0d6'; Draw.rr(c, -p.w * .4, p.h * .5, p.w * .8, p.h * .5, 4); c.fill();
        c.fillStyle = '#1b1540'; c.fillRect(-p.w * .35, p.h * .85 + run * 3, p.w * .3, p.h * .15); c.fillRect(p.w * .05, p.h * .85 - run * 3, p.w * .3, p.h * .15);
        c.fillStyle = '#ffb27a'; Draw.rr(c, -p.w * .45, p.h * .12, p.w * .9, p.h * .45, 5); c.fill();
        c.fillStyle = p.big ? '#ff4f9a' : '#ff4f4f'; Draw.rr(c, -p.w * .5, 0, p.w, p.h * .2, 4); c.fill(); c.fillRect(0, p.h * .1, p.w * .7, p.h * .1);
        c.fillStyle = '#1b1540'; c.fillRect(p.w * .05, p.h * .28, p.w * .12, p.h * .12); c.fillRect(p.w * .28, p.h * .28, p.w * .12, p.h * .12);
        c.restore();
      }
      pr.draw(c);
      c.restore();
      Draw.lives(c, lives, Math.max(4, lives), 22, 14);
      if (p.big) { c.fillStyle = '#ff4f9a'; c.beginPath(); c.arc(22 + Math.max(4, lives) * 26 + 6, 24, 7, Math.PI, 0); c.fill(); }
      if (msgT > 0) { c.globalAlpha = Math.min(1, msgT); c.lineWidth = 6; c.strokeStyle = night ? '#1b1540' : '#fff'; const fs = W < 520 ? 17 : 26; c.font = '900 ' + fs + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(msg, W / 2, H * .3); Draw.text(c, msg, W / 2, H * .3, fs, night ? '#fff' : '#1b1540'); c.globalAlpha = 1; }
    }
    resize();
    if (saved && typeof saved.level === 'number') { lives = clamp(saved.lives | 0, 1, 9); score = saved.score | 0; coins = saved.coins | 0; startLevel(clamp(saved.level | 0, 0, LEVELS - 1)); p.big = !!saved.big; } else startLevel(0);
    return { update, draw, resize, dbg: () => ({ world, p, enemies, TS, level, lives }) };
  }
});
