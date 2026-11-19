/* ===== Plateforme Pixel (dès 8 ans) — 5 mondes générés par « morceaux » (escaliers, étages, balançoires, ascenseurs, ressorts, piliers…) =====
   Feel du saut : coyote time, saut mis en mémoire, hauteur minimale garantie, saut variable (maintenir = plus haut).
   Règle d'accessibilité : une marche fait au plus 2 tuiles de haut (le saut en monte 3), un trou au plus 3-4 tuiles ; plus haut = ressort, ascenseur ou balançoire.
   Tuiles : 1 sol, 3 pièce, 4 piques, 5 drapeau, 6 bloc « ! », 7 bloc vide, 8 checkpoint, 9 caisse, 10 cristaux, 11 cœur, 12 étoile. */
let PLAT_IMG = null;
const PLAT_HEROES = [[0, 'Zig'], [2, 'Bloup'], [4, 'Cyclo'], [6, 'Miel'], [9, 'Léo']];
GAMES.push({
  id: 'platform', landscape: true, title: 'Plateforme Pixel', tagline: 'Cours, saute, grimpe, lance des cristaux', minAge: 8, color: '#5ad1ff',
  icon: '<svg viewBox="0 0 64 64"><rect x="4" y="46" width="56" height="14" fill="#b5642a"/><rect x="4" y="46" width="56" height="4" fill="#3fbf4f"/><rect x="34" y="26" width="22" height="8" fill="#b5642a"/><rect x="34" y="26" width="22" height="3" fill="#3fbf4f"/><circle cx="45" cy="16" r="5" fill="#ffd23f"/><rect x="14" y="22" width="12" height="12" rx="3" fill="#ffb27a"/><rect x="13" y="18" width="14" height="6" rx="2" fill="#ff4f4f"/><rect x="15" y="34" width="10" height="10" rx="2" fill="#38e0d6"/><circle cx="18" cy="27" r="1.5" fill="#1b1540"/><circle cx="23" cy="27" r="1.5" fill="#1b1540"/></svg>',
  howto: ['', 'Flèches pour courir, SAUT pour sauter (maintiens pour sauter plus haut). Monte sur les balançoires, les ascenseurs et les ressorts. Ramasse des cristaux bleus et lance-les avec TIR. L\'étoile te rend invincible et rapide !', 'Mode difficile : plus de pièges, de monstres à piques et de cracheurs. Cristaux à lancer avec TIR, étoile, ressorts, balançoires. 5 mondes.'],
  pad: { left: true, buttons: [{ k: 'b', label: 'TIR' }, { k: 'a', label: 'SAUT' }], big: true, hint: 'ou tape l\'écran' },
  stars: s => s >= 2200 ? 3 : s >= 1100 ? 2 : s >= 350 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env; const hard = env.tier >= 2;
    const ROWS = 12, LEVELS = 5; let d = 0, TS = 40, level = 0, lives = 4, score = 0, coins = 0, ammo = 0, world = null, p = null, enemies = [], items = [], movers = [], springs = [], balls = [], shots = [], cam = 0, t = 0, inv = 0, starT = 0, msg = '', msgT = 0, checkpoint = 0, over = false, pops = [], phase = 'pick', hero = 0, pickT = 0, shotCd = 0, landT = 0;
    const pr = Particles();
    S.platHero = S.platHero || {}; if (S.platHero[env.profile.id] != null) hero = clamp(S.platHero[env.profile.id] | 0, 0, PLAT_HEROES.length - 1);
    const diff = L => L + (hard ? 1.5 : 0); // 0 → 5,5
    // ---------- fabrication d'un monde, morceau par morceau ----------
    function gen(L) {
      const d = diff(L), cols = 125 + L * 22, g = []; for (let r = 0; r < ROWS; r++) g.push(new Uint8Array(cols));
      enemies = []; items = []; movers = []; springs = []; balls = []; shots = [];
      let x = 0, h = 2, last = '';
      const surf = () => ROWS - h, set = (r, c, v) => { if (r >= 0 && r < ROWS && c >= 0 && c < cols) g[r][c] = v; }, free = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < cols && !g[r][c];
      const run = n => { for (let i = 0; i < n && x < cols; i++, x++) for (let r = ROWS - h; r < ROWS; r++) g[r][x] = 1; };
      const plat = (r, c, n) => { for (let i = 0; i < n; i++) set(r, c + i, 1); };
      const coinsRow = (r, c, n) => { for (let i = 0; i < n; i++) if (free(r, c + i)) set(r, c + i, 3); };
      const foe = (k, tx, row) => { // row = rangée d'air juste au-dessus du sol où il se tient
        const E = { k, dead: 0, ph: rnd(0, 6), hp: 1, stomp: true, vy: 0, stun: 0 }, px = tx * TS, by = (row + 1) * TS;
        if (k === 'slime') Object.assign(E, { w: TS * .8, h: TS * .6, vx: (38 + d * 9) * (TS / 40) * pick([-1, 1]) });
        else if (k === 'robot') Object.assign(E, { w: TS * .95, h: TS * .8, vx: (22 + d * 4) * (TS / 40) * pick([-1, 1]), hp: 2 });
        else if (k === 'hopper') Object.assign(E, { w: TS * .7, h: TS * .7, vx: 0, jt: rnd(.5, 1.5) });
        else if (k === 'spiky') Object.assign(E, { w: TS * .8, h: TS * .62, vx: (30 + d * 6) * (TS / 40) * pick([-1, 1]), stomp: false });
        else if (k === 'spitter') Object.assign(E, { w: TS * .85, h: TS * .8, vx: 0, ct: rnd(1, 2.5), face: -1 });
        else if (k === 'bat') Object.assign(E, { w: TS * .8, h: TS * .5, vx: 70 * (TS / 40) * pick([-1, 1]), y0: (row - 2) * TS });
        E.x = px + (TS - E.w) / 2; E.y = k === 'bat' ? E.y0 : by - E.h; enemies.push(E);
      };
      const walkers = () => { const k = ['slime', 'slime']; if (d >= .5) k.push('robot'); if (d >= 1.5) k.push('spiky', 'hopper'); if (d >= 3) k.push('spiky', 'hopper'); return pick(k); };
      const reward = (r, c) => { const q = Math.random(); set(r, c, q < .45 ? 10 : q < .6 ? 11 : q < .72 && d >= .5 ? 12 : 10); };
      // --- les morceaux ---
      const CH = {
        flat() { const x0 = x, n = rndi(7, 11), top = surf(); run(n);
          if (Math.random() < .7) coinsRow(top - 1, x0 + rndi(0, n - 4), 3);
          if (Math.random() < .75) { const bx = x0 + rndi(1, n - 3); if (free(top - 3, bx) && free(top - 2, bx)) { set(top - 3, bx, 6); if (Math.random() < .5 && free(top - 3, bx + 1)) set(top - 3, bx + 1, 6); } }
          const ne = Math.random() < .55 + d * .08 ? (n >= 9 && Math.random() < .35 + d * .1 ? 2 : 1) : 0; for (let i = 0; i < ne; i++) foe(walkers(), x0 + 3 + Math.floor(i * (n - 4) / ne), top - 1);
          if (d >= 2 && Math.random() < (d - 1) * .16) foe('bat', x0 + 3, top - 3);
          if (d >= 2 && Math.random() < (d - 1.5) * .2) { const sx = x0 + rndi(2, n - 3); if (free(top - 1, sx) && free(top - 2, sx) && !enemies.some(e => Math.abs(e.x / TS - sx) < 1.6)) set(top - 1, sx, 4); } },
        gap() { let w = rndi(2, Math.min(4, 2 + Math.floor(d / 2))), nh = clamp(h + pick([-1, 0, 0, 1]), 2, 5); if (w === 4) { if (h >= 3) nh = h - 1; else w = 3; } if (nh > h) w = 2; x += w; h = nh; run(3); }, // plus large = on atterrit plus bas ; on ne monte qu'au-dessus d'un petit trou
        stairs() { run(2); const n = rndi(2, 3); for (let i = 0; i < n && h < 6; i++) { h = Math.min(6, h + pick([1, 2, 2])); coinsRow(surf() - 1, x, 2); run(2); } const top = surf(), x0 = x; run(5); if (Math.random() < .6) foe(walkers(), x0 + 2, top - 1); reward(top - 1, x0 + 4); },
        strata() { if (h > 4) return CH.descent(); const x0 = x, top = surf(); run(12); plat(top - 2, x0 + 1, 3); plat(top - 4, x0 + 5, 3); plat(top - 6, x0 + 9, 3); coinsRow(top - 3, x0 + 1, 3); coinsRow(top - 5, x0 + 5, 3); reward(top - 7, x0 + 10); set(top - 7, x0 + 9, 3); set(top - 7, x0 + 11, 3); foe(walkers(), x0 + 6, top - 1); if (d >= 1 && Math.random() < .5) foe('slime', x0 + 6, top - 5); },
        moverH() { run(3); const top = surf(), w = rndi(6, 8), x0 = x; movers.push({ k: 'h', w: TS * 3, ax: x0 * TS + TS * .2, bx: (x0 + w - 3) * TS - TS * .2, y: top * TS, x: x0 * TS + TS * .2, sp: (55 + d * 6) * (TS / 40), dir: 1, dx: 0, dy: 0 }); coinsRow(top - 3, x0 + 2, w - 4); x += w; run(3); },
        swing() { run(3); const top = surf(), w = 7, x0 = x, L = 5.2 * TS; movers.push({ k: 's', w: TS * 2.4, px: (x0 + w / 2) * TS, py: (top - 6) * TS - TS * .35, L, amp: Math.asin((w / 2 - 1.2) * TS / L), om: 1.9, ph: rnd(0, 6), x: 0, y: 0, dx: 0, dy: 0 }); coinsRow(top - 3, x0 + 2, 3); x += w; run(3); },
        elevator() { if (h > 3) return CH.descent(); run(3); const lo = surf(), x0 = x; run(2); h = Math.min(6, h + 4); const hi = surf(); movers.push({ k: 'v', w: TS * 2, x: x0 * TS, ay: hi * TS, by: (lo - .5) * TS, y: (lo - .5) * TS, sp: 52 * (TS / 40), dir: -1, wait: 1, dx: 0, dy: 0 }); const x1 = x; run(6); coinsRow(hi - 1, x1 + 1, 3); if (Math.random() < .6) foe(walkers(), x1 + 4, hi - 1); },
        spring() { if (h > 3) return CH.descent(); run(4); springs.push({ x: (x - 1) * TS, y: (surf() - 1) * TS, t: 0 }); h = Math.min(6, h + rndi(3, 4)); const x1 = x, top = surf(); run(6); coinsRow(top - 3, x1, 3); reward(top - 1, x1 + 3); },
        descent() { run(2); x += rndi(0, 2); h = 2; const x1 = x; run(5); coinsRow(surf() - 1, x1 + 1, 3); },
        pillars() { run(2); const h0 = h; for (let i = 0; i < 3; i++) { x += 2; h = clamp(h + pick([-1, 0, 1]), Math.max(1, h0 - 1), Math.min(5, h0 + 1)); const x1 = x; run(rndi(1, 2)); set(surf() - 1, x1, 3); } x += 2; h = h0; run(3); },
        spitter() { const x0 = x, top = surf(); run(10); set(top - 1, x0 + 5, 9); set(top - 2, x0 + 5, 9); set(top - 1, x0 + 6, 9); set(top - 2, x0 + 6, 9); foe('spitter', x0 + 5.5, top - 3); coinsRow(top - 1, x0 + 1, 3); if (Math.random() < .5) set(top - 1, x0 + 8, 10); },
        ball() { const x0 = x, top = surf(); run(9); set(top - 3, x0 + 4, 9); balls.push({ px: (x0 + 4.5) * TS, py: (top - 2.5) * TS, r: TS * 2.15, a: rnd(0, 6), om: (1.5 + d * .12) * pick([-1, 1]) }); coinsRow(top - 1, x0 + 6, 2); },
        bonus() { if (h > 3) return CH.flat(); const x0 = x, top = surf(); run(8); springs.push({ x: (x0 + 1) * TS, y: (top - 1) * TS, t: 0 }); plat(top - 6, x0 + 3, 4); coinsRow(top - 7, x0 + 3, 4); set(top - 7, x0 + 5, d >= .5 && Math.random() < .5 ? 12 : 11); }
      };
      const bag = () => { const b = ['flat', 'flat', 'gap', 'gap', 'stairs', 'strata', 'moverH', 'swing', 'elevator', 'spring', 'bonus']; if (d >= 1) b.push('spitter', 'pillars', 'swing', 'moverH'); if (d >= 2) b.push('ball', 'pillars', 'spitter'); if (d >= 3.5) b.push('ball', 'gap'); return b; };
      run(12); const cps = [Math.floor(cols * .34), Math.floor(cols * .67)]; let cpi = 0;
      while (x < cols - 26) {
        if (cpi < 2 && x >= cps[cpi]) { const x0 = x; run(5); set(surf() - 1, x0 + 2, 8); cpi++; last = 'cp'; continue; }
        let k = h >= 5 && Math.random() < .5 ? 'descent' : pick(bag()); if (k === last || (k === 'gap' && (last === 'pillars' || last === 'moverH' || last === 'swing'))) k = 'flat'; CH[k](); last = k;
      }
      if (h > 4) CH.descent(); const xe = x; while (x < cols) run(1); set(surf() - 1, Math.min(cols - 4, xe + 8), 5);
      // filet de sécurité : un trou trop large sans plateforme mobile reçoit une marche au milieu
      const colH = c => { for (let r = 0; r < ROWS; r++) if (g[r][c] === 1 && r >= ROWS - 6) { let full = true; for (let q = r; q < ROWS; q++) if (g[q][c] !== 1) full = false; if (full) return ROWS - r; } return 0; };
      for (let c = 1; c < cols - 1; c++) { if (colH(c)) continue; let e = c; while (e < cols && !colH(e)) e++; const w = e - c, hl = colH(c - 1), hr = e < cols ? colH(e) : hl, covered = movers.some(m => { const a = (m.k === 's' ? m.px - 3.5 * TS : m.k === 'h' ? m.ax : m.x) / TS, b = (m.k === 's' ? m.px + 3.5 * TS : m.k === 'h' ? m.bx + m.w : m.x + m.w) / TS; return a < e && b > c; });
        if (!covered && (w >= 5 || (w === 4 && hr >= hl) || (w === 3 && hr > hl))) { const mid = c + Math.floor(w / 2), r = ROWS - Math.max(1, Math.min(hl, hr)); set(r, mid, 1); if (w >= 5) set(r, mid - 1, 1); }
        c = e; }
      enemies = enemies.filter(e => e.x > 13 * TS && e.x < (cols - 10) * TS); // pas d'ennemi au départ ni à l'arrivée
      checkpoint = 0;
      return { g, cols, L };
    }
    const groundY = tx => { for (let r = 1; r < ROWS; r++) if (SOLID[world.g[r][tx]] && !SOLID[world.g[r - 1][tx]]) return r * TS; return (ROWS - 3) * TS; };
    function spawn(tx) { const big = p ? p.big : false; p = { x: tx * TS + TS * .2, y: 0, w: TS * .6, h: TS * .85, vx: 0, vy: 0, g: false, face: 1, coyote: 0, buf: 0, anim: 0, jumpT: 0, big, on: null, spring: false }; p.y = groundY(tx) - p.h - 2; inv = 1.2; }
    const SCALE = ['x', 'y', 'w', 'h', 'vx', 'vy', 'y0', 'ax', 'bx', 'ay', 'by', 'px', 'py', 'L', 'r', 'sp'];
    function resize() { const old = TS; TS = clamp(Math.floor(Math.min(env.H / ROWS, env.W / 10)), 24, 56); const k = TS / old; if (world && k !== 1) { for (const arr of [[p], enemies, items, movers, springs, balls, shots]) for (const o of arr) for (const key of SCALE) if (typeof o[key] === 'number') o[key] *= k; cam *= k; } }
    function persist() { env.save({ level, lives, score, coins, ammo, big: p && p.big }, 'Monde ' + (level + 1) + ' · ' + lives + ' vie' + (lives > 1 ? 's' : '') + ' · ' + score + ' pts'); }
    function startLevel(L) { level = L; d = diff(L); world = gen(L); spawn(4); cam = 0; starT = 0; msg = 'Monde ' + (L + 1) + ' / ' + LEVELS; msgT = 2.2; persist(); }
    const SOLID = { 1: 1, 6: 1, 7: 1, 9: 1 };
    function solid(cx, cy) { if (cy >= ROWS) return false; if (cx < 0 || cx >= world.cols) return true; if (cy < 0) return false; return !!SOLID[world.g[cy][cx]]; }
    function tileAt(cx, cy) { return (cy < 0 || cy >= ROWS || cx < 0 || cx >= world.cols) ? 0 : world.g[cy][cx]; }
    const say = (m, dur) => { msg = m; msgT = dur || 1.5; };
    function hit(reason) {
      if (inv > 0 || starT > 0) return;
      if (p.big) { p.big = false; inv = 1.5; sfx.ko(); env.vibe(60); pr.burst(p.x + p.w / 2, p.y + p.h / 2, '#ff4f9a', 10, 160); say('Ouille ! Champignon perdu', 1.2); return; }
      lives--; sfx.hit(); env.vibe(150); pr.burst(p.x + p.w / 2, p.y + p.h / 2, '#ff6a55', 16, 240);
      if (lives <= 0) { over = true; env.gameOver(score, { text: 'Monde ' + (level + 1) + ' · ' + coins + ' pièces' }); return; }
      spawn(Math.max(4, checkpoint)); say(reason); persist();
    }
    function addCoin(n) { for (let i = 0; i < n; i++) { coins++; score += 10; if (coins % 50 === 0) { lives++; say('+1 vie !'); sfx.win(); } } }
    function bump(cx, cy) { // bloc « ! » frappé par en dessous
      world.g[cy][cx] = 7; sfx.coin(); env.vibe(20); const q = Math.random(), k = q < .5 ? 'coin' : q < .66 && !p.big ? 'shroom' : q < .84 ? 'gem' : q < .92 ? 'star' : q < .97 ? 'heart' : 'coin';
      if (k === 'coin') { pops.push({ x: cx * TS + TS / 2, y: cy * TS, t: .5 }); addCoin(1); return; }
      items.push({ k, x: cx * TS + TS * .1, y: (cy - 1) * TS + TS * .1, vx: (k === 'shroom' || k === 'star' ? 70 : 45) * (TS / 40) * (p.face || 1), vy: -330 * (TS / 40), w: TS * .8, h: TS * .8, t: 0 });
    }
    function take(k, x, y) {
      if (k === 'shroom') { p.big = true; score += 50; sfx.win(); say('Champignon : tu grandis, un coup de plus !'); }
      else if (k === 'gem') { ammo = Math.min(30, ammo + 3); score += 20; sfx.ok(); say('+3 cristaux : lance-les avec TIR', 1.3); }
      else if (k === 'heart') { lives = Math.min(9, lives + 1); sfx.win(); say('+1 vie !'); }
      else if (k === 'star') { starT = 8; score += 50; sfx.win(); say('ÉTOILE ! Invincible et rapide', 1.6); }
      env.vibe(40); pr.burst(x, y, k === 'gem' ? '#5ad1ff' : k === 'heart' ? '#ff4f6a' : k === 'star' ? '#ffd23f' : '#ff4f9a', 12, 170);
    }
    function kill(e, how) { e.dead = 99; score += e.k === 'spiky' || e.k === 'spitter' ? 80 : 50; sfx.pop(); env.vibe(30); pr.burst(e.x + e.w / 2, e.y + e.h / 2, e.k === 'bat' ? '#c084fc' : e.k === 'spiky' ? '#ff5a4a' : e.k === 'hopper' || e.k === 'spitter' ? '#ffb020' : '#5ad1ff', 12, how === 'star' ? 260 : 170); }
    function update(dt) {
      if (over) return; t += dt;
      if (phase === 'pick') { pickT += dt; const tp = input.tap; if (pickT > .4) { const n = PLAT_HEROES.length, bw = Math.min(env.W / (n + .6), 120), x0 = env.W / 2 - bw * n / 2; if (tp && tp.y > env.H * .2 && tp.y < env.H * .95) { const i = Math.floor((tp.x - x0) / bw); if (i >= 0 && i < n) { hero = i; S.platHero[env.profile.id] = i; save(); sfx.ok(); phase = 'go'; pickT = 0; } } if (input.pressed.left) { hero = (hero + n - 1) % n; sfx.tick(); } if (input.pressed.right) { hero = (hero + 1) % n; sfx.tick(); } if (input.pressed.a) { S.platHero[env.profile.id] = hero; save(); sfx.ok(); phase = 'go'; pickT = 0; } } return; }
      if (phase === 'go') { pickT += dt; if (pickT > .35 && !input.pointer.down) phase = 'play'; return; }
      inv = Math.max(0, inv - dt); starT = Math.max(0, starT - dt); msgT = Math.max(0, msgT - dt); shotCd = Math.max(0, shotCd - dt); landT = Math.max(0, landT - dt);
      const K = TS / 40, SP = (hard ? 265 : 250) * K * (starT > 0 ? 1.35 : 1), JV = 640 * K, G = 1700 * K; // physique proportionnelle à la taille des tuiles
      // plateformes mobiles (elles bougent d'abord, puis portent le joueur)
      for (const m of movers) {
        const ox = m.x, oy = m.y;
        if (m.k === 'h') { m.x += m.sp * m.dir * dt; if (m.x > m.bx) { m.x = m.bx; m.dir = -1; } if (m.x < m.ax) { m.x = m.ax; m.dir = 1; } }
        else if (m.k === 'v') { if (m.wait > 0) m.wait -= dt; else { m.y += m.sp * m.dir * dt; if (m.y < m.ay) { m.y = m.ay; m.dir = 1; m.wait = 1.1; } if (m.y > m.by) { m.y = m.by; m.dir = -1; m.wait = 1.1; } } }
        else { const a = m.amp * Math.sin(t * m.om + m.ph); m.x = m.px + Math.sin(a) * m.L - m.w / 2; m.y = m.py + Math.cos(a) * m.L; }
        m.dx = m.x - ox; m.dy = m.y - oy;
      }
      if (p.on) { p.x += p.on.dx; p.y = p.on.y - p.h; }
      const dir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0), wasG = p.g, onM = p.on;
      p.vx += (dir * SP - p.vx) * Math.min(1, dt * (p.g ? 16 : 8)); if (dir) { if (p.g && dir !== p.face && Math.abs(p.vx) > 120 * K) pr.burst(p.x + p.w / 2, p.y + p.h, '#fff', 3, 50); p.face = dir; }
      const jumpPressed = input.pressed.a || input.pressed.up || input.pointer.justDown, jumpHeld = input.held.a || input.held.up || input.pointer.down;
      if (jumpPressed) p.buf = .16; else p.buf = Math.max(0, p.buf - dt);
      p.coyote = p.g ? .12 : Math.max(0, p.coyote - dt);
      if (p.buf > 0 && p.coyote > 0) { p.vy = -JV; p.g = false; p.on = null; p.coyote = 0; p.buf = 0; p.jumpT = 0; p.spring = false; sfx.jump(); pr.burst(p.x + p.w / 2, p.y + p.h, '#fff', 4, 60); }
      p.jumpT += dt;
      if (!p.spring && !jumpHeld && p.vy < -260 * K && p.jumpT > .11) p.vy = -260 * K; // relâché : saut court, mais jamais minuscule
      p.vy = Math.min(950 * K, p.vy + G * dt); if (p.vy >= 0) p.spring = false;
      // tir de cristaux
      if (input.pressed.b) { if (ammo > 0 && shotCd <= 0) { ammo--; shotCd = .28; shots.push({ x: p.x + p.w / 2 + p.face * p.w * .4, y: p.y + p.h * .35, vx: p.face * 470 * K + p.vx * .3, vy: -70 * K, life: 1.3, mine: true, w: TS * .34 }); sfx.punch(); } else if (ammo <= 0 && msgT <= 0) { say('Plus de cristaux : ramasse-en des bleus', 1.2); sfx.ko(); } }
      // X
      p.x += p.vx * dt;
      let c0 = Math.floor(p.y / TS), c1 = Math.floor((p.y + p.h - 1) / TS);
      if (p.vx > 0 || (onM && onM.dx > 0)) { const cx = Math.floor((p.x + p.w) / TS); for (let cy = c0; cy <= c1; cy++) if (solid(cx, cy)) { p.x = cx * TS - p.w - .01; p.vx = Math.min(0, p.vx); break; } }
      if (p.vx < 0 || (onM && onM.dx < 0)) { const cx = Math.floor(p.x / TS); for (let cy = c0; cy <= c1; cy++) if (solid(cx, cy)) { p.x = (cx + 1) * TS + .01; p.vx = Math.max(0, p.vx); break; } }
      // Y
      const feet0 = p.y + p.h; p.y += p.vy * dt; p.g = false; p.on = null;
      const x0 = Math.floor((p.x + 3) / TS), x1 = Math.floor((p.x + p.w - 3) / TS);
      if (p.vy > 0) { const cy = Math.floor((p.y + p.h) / TS); for (let cx = x0; cx <= x1; cx++) if (solid(cx, cy)) { p.y = cy * TS - p.h; p.vy = 0; p.g = true; break; } }
      else if (p.vy < 0) { const cy = Math.floor(p.y / TS); const mid = Math.floor((p.x + p.w / 2) / TS); const order = [mid, x0, x1]; for (const cx of order) if (solid(cx, cy)) { p.y = (cy + 1) * TS; p.vy = 0; if (tileAt(cx, cy) === 6) bump(cx, cy); break; } }
      if (p.vy >= 0 && !p.g) for (const m of movers) { if (p.x + p.w > m.x + 2 && p.x < m.x + m.w - 2 && feet0 <= m.y - m.dy + 7 * K && p.y + p.h >= m.y - 1) { p.y = m.y - p.h; p.vy = 0; p.g = true; p.on = m; break; } }
      if (p.g && !wasG) { landT = .14; pr.burst(p.x + p.w / 2, p.y + p.h, '#fff', 5, 70); }
      for (const s of springs) { s.t = Math.max(0, s.t - dt); if (p.vy >= 0 && p.x + p.w > s.x + TS * .15 && p.x < s.x + TS * .85 && p.y + p.h > s.y + TS * .45 && p.y + p.h < s.y + TS * 1.05) { p.vy = -JV * 1.58; p.g = false; p.on = null; p.spring = true; p.jumpT = 1; s.t = .35; sfx.jump(); sfx.ok(); env.vibe(30); pr.burst(s.x + TS / 2, s.y + TS * .6, '#ff6a55', 8, 140); } }
      p.anim += Math.abs(p.vx) * dt * .05;
      if (starT > 0 && Math.random() < .6) pr.burst(p.x + rnd(0, p.w), p.y + rnd(0, p.h), pick(['#ffd23f', '#ff4f9a', '#5ad1ff', '#9dff5c']), 1, 40);
      // tuiles spéciales
      const my0 = Math.floor((p.y + 4) / TS), my1 = Math.floor((p.y + p.h - 4) / TS);
      for (let cy = my0; cy <= my1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const tl = tileAt(cx, cy);
        if (tl === 3) { world.g[cy][cx] = 0; addCoin(1); sfx.coin(); pr.burst(cx * TS + TS / 2, cy * TS + TS / 2, '#ffd23f', 8, 120); }
        else if (tl === 10 || tl === 11 || tl === 12) { world.g[cy][cx] = 0; take(tl === 10 ? 'gem' : tl === 11 ? 'heart' : 'star', cx * TS + TS / 2, cy * TS + TS / 2); }
        else if (tl === 4 && cy === my1) { hit('Aïe, des piques !'); if (over) return; }
        else if (tl === 8 && cx > checkpoint) { checkpoint = cx; say('Checkpoint !', 1.2); sfx.ok(); persist(); }
        else if (tl === 5) { score += 200 + lives * 50; sfx.win(); if (level >= LEVELS - 1) { over = true; env.gameOver(score, { win: true, text: 'Les ' + LEVELS + ' mondes terminés !' }); return; } startLevel(level + 1); return; }
      }
      if (p.y > ROWS * TS + TS) { inv = 0; starT = 0; p.big = false; hit('Tombé dans le vide !'); if (over) return; }
      // objets sortis des blocs : ils sautent du bloc et retombent au sol
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i]; it.t += dt; it.vy = Math.min(600 * K, it.vy + G * .8 * dt); it.y += it.vy * dt; const by = Math.floor((it.y + it.h) / TS), ix = Math.floor((it.x + it.w / 2) / TS);
        if (it.vy > 0 && solid(ix, by)) { it.y = by * TS - it.h; if (it.k === 'star') it.vy = -420 * K; else { it.vy = 0; if (it.k !== 'shroom') it.vx *= .8; } }
        it.x += it.vx * dt; const ex = Math.floor((it.vx > 0 ? it.x + it.w : it.x) / TS), ey = Math.floor((it.y + it.h / 2) / TS); if (solid(ex, ey)) { it.vx *= -1; it.x += it.vx * dt * 2; }
        if (it.y > ROWS * TS + TS) { items.splice(i, 1); continue; }
        if (it.t > .25 && p.x < it.x + it.w && p.x + p.w > it.x && p.y < it.y + it.h && p.y + p.h > it.y) { items.splice(i, 1); take(it.k, it.x + it.w / 2, it.y + it.h / 2); }
      }
      // projectiles (mes cristaux et les crachats)
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i]; s.life -= dt; if (s.mine) s.vy += 520 * K * dt; s.x += s.vx * dt; s.y += s.vy * dt; let gone = s.life <= 0 || solid(Math.floor(s.x / TS), Math.floor(s.y / TS));
        if (!gone && s.mine) { for (const e of enemies) if (e.dead <= 0 && s.x > e.x - 4 && s.x < e.x + e.w + 4 && s.y > e.y - 4 && s.y < e.y + e.h + 4) { e.hp--; if (e.hp <= 0) kill(e); else { e.stun = .8; sfx.pop(); } gone = true; break; } }
        else if (!gone && s.x > p.x && s.x < p.x + p.w && s.y > p.y && s.y < p.y + p.h) { gone = true; if (starT <= 0) hit('Touché par un crachat !'); if (over) return; }
        if (gone) { pr.burst(s.x, s.y, s.mine ? '#5ad1ff' : '#ff9f1c', 6, 110); shots.splice(i, 1); }
      }
      for (const b of balls) { b.a += b.om * dt; const bx = b.px + Math.cos(b.a) * b.r, by = b.py + Math.sin(b.a) * b.r; if (Math.hypot(bx - (p.x + p.w / 2), by - (p.y + p.h / 2)) < TS * .68) { hit('La boule à piques !'); if (over) return; } }
      // ennemis
      for (const e of enemies) {
        if (e.dead > 0) continue;
        if (Math.abs(e.x - p.x) > env.W * 1.2) continue;
        e.stun = Math.max(0, e.stun - dt);
        if (e.stun <= 0) e.x += e.vx * dt;
        if (e.k === 'bat') { e.y = e.y0 + Math.sin(t * 3 + e.ph) * TS * 1.2; const ex = Math.floor((e.vx > 0 ? e.x + e.w : e.x) / TS); if (solid(ex, Math.floor(e.y0 / TS)) || e.x < 0 || e.x > world.cols * TS) e.vx *= -1; }
        else if (e.k === 'hopper') {
          e.vy = Math.min(900 * K, (e.vy || 0) + G * dt); e.y += e.vy * dt;
          const by = Math.floor((e.y + e.h) / TS), ix = Math.floor((e.x + e.w / 2) / TS);
          if (e.vy > 0 && solid(ix, by)) { e.y = by * TS - e.h; e.vy = 0; e.vx = 0; e.jt -= dt; if (e.jt <= 0) { e.jt = rnd(1.2, 2.2) - Math.min(.8, d * .1); e.vy = -(8 + Math.min(3, d)) * TS; e.vx = (p.x > e.x ? 1 : -1) * (70 + d * 10) * K; sfx.tick(); } }
          const ex = Math.floor((e.vx > 0 ? e.x + e.w : e.x) / TS), ey = Math.floor((e.y + e.h / 2) / TS); if (solid(ex, ey)) e.vx *= -1;
          if (e.y > ROWS * TS + TS) e.dead = 99;
        }
        else if (e.k === 'spitter') { e.face = p.x > e.x ? 1 : -1; e.ct -= dt; if (e.ct <= 0 && Math.abs(p.x - e.x) < TS * 10 && Math.abs(p.y - e.y) < TS * 3.5) { e.ct = Math.max(1.5, 2.9 - d * .2); e.spit = .3; shots.push({ x: e.x + e.w / 2 + e.face * e.w * .5, y: e.y + e.h * .5, vx: e.face * (135 + d * 12) * K, vy: 0, life: 3.2, mine: false, w: TS * .3 }); sfx.tick(); } e.spit = Math.max(0, (e.spit || 0) - dt); }
        else { const ex = Math.floor((e.vx > 0 ? e.x + e.w : e.x) / TS), ey = Math.floor((e.y + e.h / 2) / TS), by = Math.floor((e.y + e.h + 2) / TS); if (solid(ex, ey) || !solid(ex, by)) { e.vx *= -1; e.x += e.vx * dt * 2; } }
        if (p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
          if (starT > 0) kill(e, 'star');
          else if (p.vy > 0 && p.y + p.h < e.y + e.h * .7 && e.stomp) { p.vy = (jumpHeld ? -520 : -400) * K; e.hp--; if (e.hp <= 0) kill(e); else { e.stun = 1; e.vx *= 1.5; sfx.pop(); env.vibe(25); say('Encore un coup !', .8); } }
          else if (e.stun <= 0 || !e.stomp) { hit(e.k === 'bat' ? 'Une chauve-souris !' : e.k === 'robot' ? 'Un gros robot t\'a touché !' : e.k === 'hopper' ? 'Le sauteur !' : e.k === 'spiky' ? 'Ça pique ! Lance-lui un cristal' : e.k === 'spitter' ? 'Le cracheur !' : 'Un robot t\'a touché !'); if (over) return; }
        }
      }
      for (let i = pops.length - 1; i >= 0; i--) { pops[i].t -= dt; if (pops[i].t <= 0) pops.splice(i, 1); }
      cam += (clamp(p.x - env.W * .38, 0, world.cols * TS - env.W) - cam) * Math.min(1, dt * 8);
      pr.update(dt);
      env.setScore(score); env.hud('Monde ' + (level + 1) + '/' + LEVELS + ' · ' + coins + ' pièces');
    }
    // --- graphismes : planches « Pixel Platformer » de Kenney (CC0). Chaque tuile est agrandie une fois, sans lissage, puis réutilisée.
    if (!PLAT_IMG) { PLAT_IMG = {}; for (const k in PLAT_ART) { const i = new Image(); i.src = PLAT_ART[k]; PLAT_IMG[k] = i; } }
    const IMG = PLAT_IMG; let cache = {}, cacheTS = 0;
    function spr(sheet, id, size, sx0, sy0, sw, sh) { // renvoie un canvas de la tuile à la taille demandée
      const im = IMG[sheet]; if (!im.complete || !im.width) return null; if (cacheTS !== TS) { cache = {}; cacheTS = TS; }
      const key = sheet + id + '_' + Math.round(size) + '_' + (sx0 || 0) + (sy0 || 0) + (sw || 0) + (sh || 0); let cv = cache[key]; if (cv) return cv;
      const u = sheet === 'tiles' ? 18 : 24, cols = im.width / u; cv = document.createElement('canvas'); cv.width = cv.height = Math.max(1, Math.round(size)); const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
      x.drawImage(im, (id % cols) * u + (sx0 || 0), Math.floor(id / cols) * u + (sy0 || 0), sw || u, sh || u, 0, 0, cv.width, cv.height); cache[key] = cv; return cv;
    }
    const STAR = ['....#....', '....#....', '...###...', '#########', '.#######.', '..#####..', '..#####..', '.###.###.', '.#.....#.'];
    function starSprite(size) { if (cacheTS !== TS) { cache = {}; cacheTS = TS; } const key = 'star' + Math.round(size); let cv = cache[key]; if (cv) return cv; cv = document.createElement('canvas'); cv.width = cv.height = Math.max(1, Math.round(size)); const x = cv.getContext('2d'), u = cv.width / 11; for (const [ox, oy, col] of [[1.6, 1.6, '#7a4a00'], [1, 1, '#ffd23f']]) { x.fillStyle = col; STAR.forEach((row, r) => { for (let c = 0; c < 9; c++) if (row[c] === '#') x.fillRect(Math.floor((c + ox) * u), Math.floor((r + oy) * u), Math.ceil(u), Math.ceil(u)); }); } x.fillStyle = '#fff6c8'; x.fillRect(Math.floor(5 * u), Math.floor(4 * u), Math.ceil(u), Math.ceil(u * 2)); cache[key] = cv; return cv; }
    const tile = (c, id, x, y, sx0, sy0, sw, sh) => { const cv = spr('tiles', id, TS, sx0, sy0, sw, sh); if (cv) c.drawImage(cv, Math.round(x), Math.round(y)); };
    function chr(c, id, cx, bottom, size, flip, squash) { const cv = spr('chars', id, size); if (!cv) return; c.save(); c.translate(Math.round(cx), Math.round(bottom)); c.scale(flip ? -1 : 1, 1); if (squash) c.scale(1 / squash, squash); c.drawImage(cv, -cv.width / 2, -cv.height); c.restore(); }
    // thèmes par monde : rangée de sol, décor de fond (colonne de départ, largeur), couleurs du ciel et du bas, petites plantes
    const THEMES = [{ row: 0, bg: 0, bw: 4, sky: '#dff6f5', low: '#c2e3e8', deco: [124, 125, 129] }, { row: 0, bg: 6, bw: 2, sky: '#7ff0a5', low: '#2eb082', deco: [124, 125, 129, 125] }, { row: 2, bg: 4, bw: 2, sky: '#fbc97b', low: '#cb815e', deco: [127, 125] }, { row: 4, bg: 0, bw: 4, sky: '#dff6f5', low: '#c2e3e8', deco: [145, 144] }, { row: 0, bg: 0, bw: 4, sky: '#dff6f5', low: '#c2e3e8', deco: [124, 129] }];
    function drawPick(c) {
      const W = env.W, H = env.H, n = PLAT_HEROES.length, bw = Math.min(W / (n + .6), 120), x0 = W / 2 - bw * n / 2; c.imageSmoothingEnabled = false;
      c.fillStyle = '#dff6f5'; c.fillRect(0, 0, W, H); c.fillStyle = '#c2e3e8'; c.fillRect(0, H * .72, W, H); for (let i = 0; i * TS < W; i++) { const cv = spr('tiles', 22, TS, 0, 2, 18, 16); if (cv) c.drawImage(cv, i * TS, Math.round(H * .72)); }
      Draw.text(c, 'Choisis ton héros', W / 2, H * .14, Math.min(30, W / 14), '#1b1540');
      PLAT_HEROES.forEach((hh, i) => { const x = x0 + i * bw + bw / 2, sel = i === hero, s = Math.min(bw * .9, H * .34) * (sel ? 1.12 : .9), hop = sel ? Math.abs(Math.sin(t * 6)) * 10 : 0; if (sel) { c.fillStyle = 'rgba(255,210,63,.55)'; Draw.rr(c, x - bw * .46, H * .72 - s * 1.12 - 14, bw * .92, s * 1.12 + 44, 14); c.fill(); } chr(c, hh[0] + (sel && Math.floor(t * 6) % 2 ? 1 : 0), x, H * .72 - hop, s); Draw.text(c, hh[1], x, H * .72 + 16, Math.min(16, bw * .2), '#1b1540'); });
      if (Math.sin(t * 5) > -.4) Draw.text(c, 'Touche ton héros pour partir', W / 2, H * .92, Math.min(17, W / 24), '#1b1540', 'center', 700); c.imageSmoothingEnabled = true;
    }
    function draw(c) {
      if (phase === 'pick') { drawPick(c); return; }
      const W = env.W, H = env.H, worldH = ROWS * TS, offY = Math.max(0, (H - worldH) / 2), night = level === 4, th = THEMES[level]; c.imageSmoothingEnabled = false;
      // fond : ciel uni, bande d'horizon illustrée qui défile lentement, bas uni
      const bs = Math.round(TS * 3.4), hy = Math.round(offY + worldH * .34); c.fillStyle = th.sky; c.fillRect(0, 0, W, H); c.fillStyle = th.low; c.fillRect(0, hy + bs - 1, W, H - hy - bs + 1);
      const bgi = IMG.bgs; if (bgi.complete && bgi.width) { const off = Math.floor(cam * .22) % (bs * th.bw); for (let i = -1; i * bs - off < W; i++) { const k = ((i % th.bw) + th.bw) % th.bw; c.drawImage(bgi, (th.bg + k) * 24, 24, 24, 24, i * bs - off, hy, bs + 1, bs); } }
      for (let i = 0; i < 5; i++) { const x = ((i * 310 - cam * .1 - t * 6) % (W + 300) + W + 300) % (W + 300) - 150, y = offY + worldH * (.08 + (i % 3) * .07); for (let k = 0; k < 3; k++) { const cv = spr('tiles', 153 + k, TS); if (cv) c.drawImage(cv, Math.round(x) + k * TS, Math.round(y)); } }
      if (night) { c.fillStyle = 'rgba(22,16,74,.72)'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; for (let i = 0; i < 40; i++) c.fillRect((i * 97 + 13) % W, (i * 53 + 7) % (H * .6), 2 + (i % 3 === 0), 2 + (i % 3 === 0)); c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(W * .8, offY + worldH * .16, TS * .7, 0, 7); c.fill(); }
      c.save(); c.translate(-Math.floor(cam), Math.round(offY));
      const cx0 = Math.max(0, Math.floor(cam / TS)), cx1 = Math.min(world.cols - 1, Math.ceil((cam + W) / TS)), g0 = th.row * 20;
      const isG = (x, y) => y >= 0 && y < ROWS && x >= 0 && x < world.cols && world.g[y][x] === 1;
      for (const m of movers) if (m.k === 's') { c.strokeStyle = '#7a4a21'; c.lineWidth = Math.max(3, TS * .09); for (const ex of [m.x + m.w * .12, m.x + m.w * .88]) { c.beginPath(); c.moveTo(m.px + (ex - m.x - m.w / 2) * .25, m.py); c.lineTo(ex, m.y + 2); c.stroke(); } c.fillStyle = '#4a2f14'; c.fillRect(m.px - TS * .5, m.py - TS * .18, TS, TS * .22); } else if (m.k === 'v') { c.fillStyle = 'rgba(27,21,64,.18)'; c.fillRect(m.x + m.w / 2 - 2, m.ay, 4, m.by - m.ay); }
      for (let cy = 0; cy < ROWS; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const tl = world.g[cy][cx], x = cx * TS, y = cy * TS;
        if (!tl) { if (cy < ROWS - 1 && world.g[cy + 1][cx] === 1 && (cx * 7 + world.L * 3) % 5 === 0 && !(cy > 0 && world.g[cy - 1][cx])) tile(c, th.deco[(cx * 13) % th.deco.length], x, y + TS * .12); continue; }
        if (tl === 1) { const L = isG(cx - 1, cy) || cx === 0, R = isG(cx + 1, cy) || cx === world.cols - 1, top = !isG(cx, cy - 1); // bords gauche / droit / haut : on rogne la marge transparente des tuiles
          const col = L && R ? 2 : L ? 3 : R ? 1 : 0, sx0 = col === 1 || col === 0 ? 2 : 0, sw = col === 0 ? 14 : col === 2 ? 18 : 16;
          if (top) { if (isG(cx, cy + 1)) tile(c, g0 + 20 + col, x, y, sx0, 2, sw, 16); else tile(c, g0 + col, x, y, sx0, 2, sw, 14); } else tile(c, 120 + col, x, y, sx0, 0, sw, 18); }
        else if (tl === 3) { const f = Math.floor(t * 6 + cx) % 4; const cv = spr('tiles', f === 1 || f === 3 ? 152 : 151, TS); if (cv) c.drawImage(cv, Math.round(x), Math.round(y + Math.sin(t * 4 + cx) * TS * .06)); }
        else if (tl === 4) tile(c, 68, x, y);
        else if (tl === 5) { tile(c, 131, x, y); tile(c, 131, x, y - TS); tile(c, Math.floor(t * 5) % 2 ? 112 : 111, x, y - TS * 2); }
        else if (tl === 8) tile(c, checkpoint >= cx ? 66 : 64, x, y);
        else if (tl === 6) tile(c, 10, x, y); else if (tl === 7) tile(c, 29, x, y); else if (tl === 9) tile(c, 26, x, y);
        else if (tl === 10) { const cv = spr('tiles', 67, TS); if (cv) c.drawImage(cv, Math.round(x), Math.round(y + Math.sin(t * 4 + cx) * TS * .08)); }
        else if (tl === 11) { const cv = spr('tiles', 44, TS); if (cv) c.drawImage(cv, Math.round(x), Math.round(y + Math.sin(t * 4 + cx) * TS * .08)); }
        else if (tl === 12) c.drawImage(starSprite(TS), Math.round(x), Math.round(y + Math.sin(t * 5 + cx) * TS * .1));
      }
      for (const s of springs) tile(c, s.t > 0 ? 108 : 107, s.x, s.y);
      for (const m of movers) { const cnt = Math.max(1, Math.ceil(m.w / TS)); c.save(); c.translate(Math.round(m.x), Math.round(m.y)); c.scale(m.w / (cnt * TS), 1); for (let i = 0; i < cnt; i++) { const cv = spr('tiles', cnt === 1 ? 49 : i === 0 ? 48 : i === cnt - 1 ? 50 : 49, TS); if (cv) c.drawImage(cv, i * TS, -Math.round(TS * .12)); } c.restore(); }
      for (const b of balls) { const bx = b.px + Math.cos(b.a) * b.r, by = b.py + Math.sin(b.a) * b.r; c.strokeStyle = '#6b6b8f'; c.lineWidth = Math.max(3, TS * .08); c.setLineDash([TS * .14, TS * .1]); c.beginPath(); c.moveTo(b.px, b.py); c.lineTo(bx, by); c.stroke(); c.setLineDash([]); chr(c, 8, bx, by + TS * .62, TS * 1.25); }
      for (const pp of pops) { const k = 1 - pp.t / .5; const cv = spr('tiles', 151, TS); if (cv) c.drawImage(cv, Math.round(pp.x - TS / 2), Math.round(pp.y - TS - k * TS * 1.2)); }
      for (const it of items) { const cv = it.k === 'star' ? starSprite(TS) : spr('tiles', it.k === 'shroom' ? 128 : it.k === 'gem' ? 67 : 44, TS); if (cv) c.drawImage(cv, Math.round(it.x + it.w / 2 - TS / 2), Math.round(it.y + it.h - TS)); }
      for (const e of enemies) {
        if (e.dead > 0 || e.x < cam - TS * 2 || e.x > cam + W + TS) continue; const f = Math.floor(t * 6 + e.ph) % 2, ex = e.x + e.w / 2, eb = e.y + e.h;
        if (e.k === 'bat') chr(c, [24, 25, 26, 25][Math.floor(t * 10 + e.ph) % 4], ex, eb + TS * .3, TS * 1.3, e.vx > 0);
        else if (e.k === 'robot') chr(c, e.stun > 0 ? 23 : 21 + f, ex, eb + TS * .08, TS * 1.25, e.vx > 0);
        else if (e.k === 'hopper') chr(c, 13 + (e.vy !== 0 ? 1 : 0), ex, eb + TS * .12, TS * 1.2, p.x > e.x, e.vy < 0 ? 1.1 : 1);
        else if (e.k === 'spiky') chr(c, 15 + f, ex, eb + TS * .1, TS * 1.25, e.vx > 0);
        else if (e.k === 'spitter') chr(c, e.spit > 0 || e.ct < .4 ? 12 : 11, ex, eb + TS * .1, TS * 1.2, e.face > 0, e.ct < .4 ? .92 : 1);
        else chr(c, 18 + f, ex, eb + TS * .08, TS * 1.2, e.vx > 0);
      }
      for (const s of shots) { if (s.mine) { const cv = spr('tiles', 67, TS * .62); if (cv) { c.save(); c.translate(Math.round(s.x), Math.round(s.y)); c.rotate(t * 14); c.drawImage(cv, -cv.width / 2, -cv.height / 2); c.restore(); } } else { c.fillStyle = '#7a2a00'; c.fillRect(Math.round(s.x - s.w / 2) - 2, Math.round(s.y - s.w / 2) - 2, s.w + 4, s.w + 4); c.fillStyle = Math.floor(t * 12) % 2 ? '#ff9f1c' : '#ffd23f'; c.fillRect(Math.round(s.x - s.w / 2), Math.round(s.y - s.w / 2), s.w, s.w); } }
      if (!(inv > 0 && Math.floor(inv * 14) % 2)) { // joueur : deux images de marche, écrasé à l'atterrissage, étiré en saut, plus grand avec le champignon
        const moving = p.g && Math.abs(p.vx) > 30, base = PLAT_HEROES[hero][0], id = base + (moving ? Math.floor(p.anim * 1.2) % 2 : (!p.g ? 1 : 0)), bg = p.big ? 1.22 : 1, sz = TS * 1.32 * bg, bob = moving ? Math.abs(Math.sin(p.anim * 3.8)) * TS * .05 : Math.sin(t * 3) * TS * .012;
        if (starT > 0) { c.globalAlpha = .35; for (let k = 1; k <= 3; k++) chr(c, id, p.x + p.w / 2 - p.vx * .03 * k, p.y + p.h + TS * .1, sz, p.face > 0); c.globalAlpha = 1; }
        if (p.g) { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + p.h + 1, p.w * .6, TS * .08, 0, 0, 7); c.fill(); }
        chr(c, id, p.x + p.w / 2, p.y + p.h + TS * .1 * bg - bob, sz, p.face > 0, !p.g ? (p.vy < 0 ? 1.1 : .94) : landT > 0 ? .86 : 1);
        if (starT > 0 && (starT > 2 || Math.floor(starT * 8) % 2)) { c.globalCompositeOperation = 'lighter'; c.fillStyle = 'hsla(' + Math.round(t * 600 % 360) + ',100%,60%,.28)'; c.beginPath(); c.arc(p.x + p.w / 2, p.y + p.h * .45, TS * .75, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over'; }
      }
      pr.draw(c);
      c.restore();
      const hs = 26; for (let i = 0; i < Math.max(4, lives); i++) { const cv = spr('tiles', i < lives ? 44 : 46, hs); if (cv) c.drawImage(cv, 10 + i * (hs + 2), 8); }
      let hx = 18 + Math.max(4, lives) * (hs + 2); if (p.big) { const cv = spr('tiles', 128, hs); if (cv) c.drawImage(cv, hx, 6); hx += hs + 4; }
      { const cv = spr('tiles', 67, hs); if (cv) { c.globalAlpha = ammo > 0 ? 1 : .4; c.drawImage(cv, hx, 8); c.globalAlpha = 1; } Draw.text(c, '×' + ammo, hx + hs + 2, 22, 16, night ? '#fff' : '#1b1540', 'left'); hx += hs + 40; }
      if (starT > 0) { c.drawImage(starSprite(hs), hx, 8); c.fillStyle = 'rgba(27,21,64,.3)'; c.fillRect(hx + hs + 4, 17, 60, 8); c.fillStyle = '#ffd23f'; c.fillRect(hx + hs + 4, 17, 60 * starT / 8, 8); }
      if (msgT > 0) { c.globalAlpha = Math.min(1, msgT); c.lineWidth = 6; c.strokeStyle = night ? '#1b1540' : '#fff'; const fs = Math.min(W < 520 ? 17 : 26, W / (msg.length * .56)); c.font = '900 ' + Math.round(fs) + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.strokeText(msg, W / 2, H * .3); Draw.text(c, msg, W / 2, H * .3, fs, night ? '#fff' : '#1b1540'); c.globalAlpha = 1; }
      c.imageSmoothingEnabled = true;
    }
    resize();
    if (saved && typeof saved.level === 'number') { lives = clamp(saved.lives | 0, 1, 9); score = saved.score | 0; coins = saved.coins | 0; ammo = clamp(saved.ammo | 0, 0, 30); startLevel(clamp(saved.level | 0, 0, LEVELS - 1)); p.big = !!saved.big; phase = 'play'; } else startLevel(0);
    return { update, draw, resize, dbg: () => ({ world, p, enemies, movers, springs, balls, TS, level, lives, phase, ROWS, play: () => { phase = 'play'; }, give: () => { ammo = 9; }, star: () => { starT = 8; }, warp: tx => { spawn(tx); cam = Math.max(0, p.x - env.W * .38); } }) };
  }
});
