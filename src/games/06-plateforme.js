/* ===== Plateforme Pixel (dès 8 ans) — 5 niveaux générés, difficulté progressive =====
   Feel du saut : coyote time, saut mis en mémoire (jump buffer), hauteur minimale garantie,
   saut variable (maintenir = plus haut). Tuiles : 1 sol, 3 pièce, 4 piques, 5 drapeau, 6 bloc ?, 7 bloc vide, 8 checkpoint. */
let PLAT_IMG = null;
GAMES.push({
  id: 'platform', landscape: true, title: 'Plateforme Pixel', tagline: 'Cours, saute, attrape les pièces', minAge: 8, color: '#5ad1ff',
  icon: '<svg viewBox="0 0 64 64"><rect x="4" y="46" width="56" height="14" fill="#b5642a"/><rect x="4" y="46" width="56" height="4" fill="#3fbf4f"/><rect x="34" y="26" width="22" height="8" fill="#b5642a"/><rect x="34" y="26" width="22" height="3" fill="#3fbf4f"/><circle cx="45" cy="16" r="5" fill="#ffd23f"/><rect x="14" y="22" width="12" height="12" rx="3" fill="#ffb27a"/><rect x="13" y="18" width="14" height="6" rx="2" fill="#ff4f4f"/><rect x="15" y="34" width="10" height="10" rx="2" fill="#38e0d6"/><circle cx="18" cy="27" r="1.5" fill="#1b1540"/><circle cx="23" cy="27" r="1.5" fill="#1b1540"/></svg>',
  howto: ['', 'Flèches pour courir, SAUT pour sauter : maintiens le bouton pour sauter plus haut ! Saute sur les petits robots, tape les blocs jaunes par en dessous, attrape le champignon. 5 niveaux de plus en plus durs.', 'Mode difficile : trous plus larges, piques, robots rapides et chauves-souris. 5 niveaux.'],
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
          else hit(e.k === 'bat' ? 'Une chauve-souris !' : e.k === 'snail' ? 'Un gros robot t\'a touché !' : e.k === 'hopper' ? 'Le cube sauteur !' : 'Un robot t\'a touché !');
        }
      }
      for (let i = pops.length - 1; i >= 0; i--) { pops[i].t -= dt; if (pops[i].t <= 0) pops.splice(i, 1); }
      cam += (clamp(p.x - env.W * .38, 0, world.cols * TS - env.W) - cam) * Math.min(1, dt * 8);
      pr.update(dt);
      env.setScore(score); env.hud('Niv. ' + (level + 1) + '/' + LEVELS + ' · ' + coins + ' pièces');
    }
    // --- graphismes : planches « Pixel Platformer » de Kenney (CC0). Chaque tuile est agrandie une fois, sans lissage, puis réutilisée.
    if (!PLAT_IMG) { PLAT_IMG = {}; for (const k in PLAT_ART) { const i = new Image(); i.src = PLAT_ART[k]; PLAT_IMG[k] = i; } }
    const IMG = PLAT_IMG; let cache = {}, cacheTS = 0;
    function spr(sheet, id, size, sx0, sy0, sw, sh) { // renvoie un canvas de la tuile à la taille demandée
      const im = IMG[sheet]; if (!im.complete || !im.width) return null; if (cacheTS !== TS) { cache = {}; cacheTS = TS; }
      const key = sheet + id + '_' + size + '_' + (sx0 || 0) + (sy0 || 0) + (sw || 0) + (sh || 0); let cv = cache[key]; if (cv) return cv;
      const u = sheet === 'tiles' ? 18 : 24, cols = im.width / u; cv = document.createElement('canvas'); cv.width = cv.height = Math.max(1, Math.round(size)); const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
      x.drawImage(im, (id % cols) * u + (sx0 || 0), Math.floor(id / cols) * u + (sy0 || 0), sw || u, sh || u, 0, 0, cv.width, cv.height); cache[key] = cv; return cv;
    }
    const tile = (c, id, x, y, sx0, sy0, sw, sh) => { const cv = spr('tiles', id, TS, sx0, sy0, sw, sh); if (cv) c.drawImage(cv, Math.round(x), Math.round(y)); };
    function chr(c, id, cx, bottom, size, flip, squash) { const cv = spr('chars', id, size); if (!cv) return; c.save(); c.translate(Math.round(cx), Math.round(bottom)); c.scale(flip ? -1 : 1, 1); if (squash) c.scale(1 / squash, squash); c.drawImage(cv, -cv.width / 2, -cv.height); c.restore(); }
    // thèmes par niveau : rangée de sol, décor de fond (colonne de départ, largeur), couleurs du ciel et du bas, petites plantes
    const THEMES = [{ row: 0, bg: 0, bw: 4, sky: '#dff6f5', low: '#c2e3e8', deco: [124, 125, 129] }, { row: 0, bg: 6, bw: 2, sky: '#7ff0a5', low: '#2eb082', deco: [124, 125, 129, 125] }, { row: 2, bg: 4, bw: 2, sky: '#fbc97b', low: '#cb815e', deco: [127, 125] }, { row: 4, bg: 0, bw: 4, sky: '#dff6f5', low: '#c2e3e8', deco: [145, 144] }, { row: 0, bg: 0, bw: 4, sky: '#dff6f5', low: '#c2e3e8', deco: [124, 129] }];
    function draw(c) {
      const W = env.W, H = env.H, worldH = ROWS * TS, offY = Math.max(0, (H - worldH) / 2), night = level === 4, th = THEMES[level]; c.imageSmoothingEnabled = false;
      // fond : ciel uni, bande d'horizon illustrée qui défile lentement, bas uni
      const bs = Math.round(TS * 3.4), hy = Math.round(offY + worldH * .34); c.fillStyle = th.sky; c.fillRect(0, 0, W, H); c.fillStyle = th.low; c.fillRect(0, hy + bs - 1, W, H - hy - bs + 1);
      const bgi = IMG.bgs; if (bgi.complete && bgi.width) { const off = Math.floor(cam * .22) % (bs * th.bw); for (let i = -1; i * bs - off < W; i++) { const k = ((i % th.bw) + th.bw) % th.bw; c.drawImage(bgi, (th.bg + k) * 24, 24, 24, 24, i * bs - off, hy, bs + 1, bs); } }
      for (let i = 0; i < 5; i++) { const x = ((i * 310 - cam * .1 - t * 6) % (W + 300) + W + 300) % (W + 300) - 150, y = offY + worldH * (.08 + (i % 3) * .07); for (let k = 0; k < 3; k++) { const cv = spr('tiles', 153 + k, TS); if (cv) c.drawImage(cv, Math.round(x) + k * TS, Math.round(y)); } }
      if (night) { c.fillStyle = 'rgba(22,16,74,.72)'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; for (let i = 0; i < 40; i++) c.fillRect((i * 97 + 13) % W, (i * 53 + 7) % (H * .6), 2 + (i % 3 === 0), 2 + (i % 3 === 0)); c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(W * .8, offY + worldH * .16, TS * .7, 0, 7); c.fill(); }
      c.save(); c.translate(-Math.floor(cam), Math.round(offY));
      const cx0 = Math.max(0, Math.floor(cam / TS)), cx1 = Math.min(world.cols - 1, Math.ceil((cam + W) / TS)), g0 = th.row * 20;
      const isG = (x, y) => y >= 0 && y < ROWS && x >= 0 && x < world.cols && world.g[y][x] === 1;
      for (let cy = 0; cy < ROWS; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const tl = world.g[cy][cx], x = cx * TS, y = cy * TS;
        if (!tl) { if (cy < ROWS - 1 && world.g[cy + 1][cx] === 1 && (cx * 7 + world.L * 3) % 5 === 0 && !(cy > 0 && world.g[cy - 1][cx])) tile(c, th.deco[(cx * 13) % th.deco.length], x, y + TS * .12); continue; }
        if (tl === 1) { const L = isG(cx - 1, cy) || cx === 0, R = isG(cx + 1, cy) || cx === world.cols - 1, top = !isG(cx, cy - 1); // bords gauche / droit / haut : on rogne la marge transparente des tuiles
          const col = L && R ? 2 : L ? 3 : R ? 1 : 0, sx0 = col === 1 || col === 0 ? 2 : 0, sw = col === 0 ? 14 : col === 2 ? 18 : 16;
          if (top) { if (isG(cx, cy + 1)) tile(c, g0 + 20 + col, x, y, sx0, 2, sw, 16); else tile(c, g0 + col, x, y, sx0, 2, sw, 14); } else tile(c, 120 + col, x, y, sx0, 0, sw, 18); }
        else if (tl === 3) { const f = Math.floor(t * 6 + cx) % 4; const cv = spr('tiles', f === 1 || f === 3 ? 152 : 151, TS); if (cv) c.drawImage(cv, Math.round(x), Math.round(y + Math.sin(t * 4 + cx) * TS * .06)); }
        else if (tl === 4) tile(c, 68, x, y)
        else if (tl === 5) { tile(c, 131, x, y); tile(c, 131, x, y - TS); tile(c, Math.floor(t * 5) % 2 ? 112 : 111, x, y - TS * 2); }
        else if (tl === 8) tile(c, checkpoint === cx ? 66 : 64, x, y);
        else if (tl === 6) tile(c, 10, x, y); else if (tl === 7) tile(c, 29, x, y);
      }
      for (const pp of pops) { const k = 1 - pp.t / .5; const cv = spr('tiles', 151, TS); if (cv) c.drawImage(cv, Math.round(pp.x - TS / 2), Math.round(pp.y - TS - k * TS * 1.2)); }
      for (const it of items) { const cv = spr('tiles', 128, TS); if (cv) c.drawImage(cv, Math.round(it.x + it.w / 2 - TS / 2), Math.round(it.y + it.h - TS)); }
      for (const e of enemies) {
        if (e.dead > 0 || e.x < cam - TS * 2 || e.x > cam + W + TS) continue; const f = Math.floor(t * 6 + e.ph) % 2, ex = e.x + e.w / 2, eb = e.y + e.h;
        if (e.k === 'bat') chr(c, [24, 25, 26, 25][Math.floor(t * 10 + e.ph) % 4], ex, eb + TS * .3, TS * 1.3, e.vx > 0);
        else if (e.k === 'snail') chr(c, 21 + f, ex, eb + TS * .08, TS * 1.25, e.vx > 0);
        else if (e.k === 'hopper') chr(c, e.vy !== 0 ? 12 : 11, ex, eb + TS * .1, TS * 1.2, p.x > e.x, e.vy < 0 ? 1.1 : 1);
        else chr(c, 18 + f, ex, eb + TS * .08, TS * 1.2, e.vx > 0);
      }
      if (!(inv > 0 && Math.floor(inv * 14) % 2)) { // joueur : deux images de marche, étiré en saut
        const moving = p.g && Math.abs(p.vx) > 30, id = (p.big ? 6 : 0) + (moving ? Math.floor(p.anim * 1.2) % 2 : (!p.g ? 1 : 0));
        chr(c, id, p.x + p.w / 2, p.y + p.h + TS * .1, TS * 1.32, p.face > 0, !p.g ? (p.vy < 0 ? 1.08 : .95) : 1);
      }
      pr.draw(c);
      c.restore();
      const hs = 26; for (let i = 0; i < Math.max(4, lives); i++) { const cv = spr('tiles', i < lives ? 44 : 46, hs); if (cv) c.drawImage(cv, 10 + i * (hs + 2), 8); }
      if (p.big) { const cv = spr('tiles', 128, hs); if (cv) c.drawImage(cv, 14 + Math.max(4, lives) * (hs + 2), 6); }
      if (msgT > 0) { c.globalAlpha = Math.min(1, msgT); c.lineWidth = 6; c.strokeStyle = night ? '#1b1540' : '#fff'; const fs = W < 520 ? 17 : 26; c.font = '900 ' + fs + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(msg, W / 2, H * .3); Draw.text(c, msg, W / 2, H * .3, fs, night ? '#fff' : '#1b1540'); c.globalAlpha = 1; }
      c.imageSmoothingEnabled = true;
    }
    resize();
    if (saved && typeof saved.level === 'number') { lives = clamp(saved.lives | 0, 1, 9); score = saved.score | 0; coins = saved.coins | 0; startLevel(clamp(saved.level | 0, 0, LEVELS - 1)); p.big = !!saved.big; } else startLevel(0);
    return { update, draw, resize, dbg: () => ({ world, p, enemies, TS, level, lives }) };
  }
});
