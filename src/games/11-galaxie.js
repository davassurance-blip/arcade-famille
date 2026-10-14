/* ===== Galaxie (dès 8 ans) — shoot'em up : vagues, bonus d'armes, boss d'étape ===== */
GAMES.push({
  id: 'galaxy', title: 'Galaxie', tagline: 'Armes, vagues et boss', minAge: 8, color: '#9b7bff',
  icon: '<svg viewBox="0 0 64 64"><path d="M32 44l-14 10 4-14-10-8h12l8-16 8 16h12l-10 8 4 14z" fill="#38e0d6"/><circle cx="32" cy="30" r="4" fill="#fff5e1"/><rect x="30" y="6" width="4" height="10" rx="2" fill="#ffd23f"/><circle cx="14" cy="14" r="5" fill="#ff4f9a"/><circle cx="50" cy="12" r="4" fill="#9dff5c"/></svg>',
  howto: ['', 'Glisse le doigt pour piloter, le vaisseau tire tout seul. Ramasse les capsules pour de meilleures armes, et bats le boss à la fin de chaque étape !', 'Les envahisseurs ripostent, les astéroïdes pleuvent, les boss ont des patterns. Garde ton bouclier pour le boss.'],
  pad: { left: true, hint: 'ou glisse le doigt · tir automatique' },
  stars: s => s >= 4000 ? 3 : s >= 1800 ? 2 : s >= 600 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env; const hard = env.tier >= 2;
    const WAVES = 3; // vagues par étape avant le boss
    let ship, shots = [], foes = [], rocks = [], bullets = [], drops = [], boss = null, lives = 3, score = 0, stage = 1, wave = 0, t = 0, fire = 0, inv = 0, over = false, waveT = 1, msg = '', msgT = 0, big = false;
    let weapon = 1, rapid = 0, laser = 0, shield = 0, shake = 0;
    const pr = Particles(); let neb = null, nebW = 0, nebH = 0;
    const STAGE_COL = ['#ff4f9a', '#9dff5c', '#ffd23f', '#38e0d6', '#ff9f1c', '#c084fc'];
    const DROPS = { up: { c: '#ffd23f', l: 'ARME' }, rapid: { c: '#ff9f1c', l: 'RAPIDE' }, laser: { c: '#ff4f9a', l: 'LASER' }, shield: { c: '#38e0d6', l: 'BOUCLIER' }, life: { c: '#9dff5c', l: 'VIE' } };
    const WNAME = ['', 'Simple', 'Double', 'Triple', 'Quadruple'];
    function init() { ship = { x: env.W / 2, y: env.H - 70 }; }
    function persist() { env.save({ stage, score, lives, weapon }, 'Étape ' + stage + ' · ' + score + ' pts'); }
    // --- fond : nébuleuses pré-dessinées
    function makeNebula() {
      const W = env.W, H = env.H; if (neb && nebW === W && nebH === H) return; nebW = W; nebH = H;
      neb = document.createElement('canvas'); neb.width = W; neb.height = H * 2; const c = neb.getContext('2d');
      const cols = ['#5b2a8a', '#1f6f8a', '#8a2a5b', '#2a5b8a']; let seed = 7; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 14; i++) { const x = r() * W, y = r() * H * 2, rad = 80 + r() * 160; const g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, cols[i % 4] + 'aa'); g.addColorStop(1, cols[i % 4] + '00'); c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, 7); c.fill(); }
      // planètes lointaines
      for (let i = 0; i < 3; i++) { const x = r() * W, y = r() * H * 2, rad = 18 + r() * 30; const g = c.createRadialGradient(x - rad * .4, y - rad * .4, rad * .1, x, y, rad); g.addColorStop(0, '#ffe3a3'); g.addColorStop(1, ['#c0603a', '#3a7fc0', '#7a5cc0'][i]); c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, 7); c.fill(); if (i === 1) { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, rad * 1.7, rad * .4, -.4, 0, 7); c.stroke(); } }
    }
    // --- vagues et boss
    function spawnWave() {
      wave++; msg = 'Étape ' + stage + ' · Vague ' + wave + '/' + WAVES; msgT = 1.6; big = false;
      const n = Math.min(16, 5 + wave * 2 + stage * 2), cols = Math.min(8, n), W = env.W, col = STAGE_COL[(stage - 1) % STAGE_COL.length];
      for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols); foes.push({ x: W / 2 + (c - (cols - 1) / 2) * Math.min(60, W / (cols + 1)), y: -40 - r * 50, ty: 70 + r * 50, ph: rnd(0, 6), hp: (hard || stage > 2) && i % 4 === 0 ? 2 : 1, c: r % 2 ? col : '#e9e4ff', shootT: rnd(2, 6), kind: r % 2 }); }
    }
    function spawnBoss() {
      msg = 'BOSS !'; msgT = 2; big = true; sfx.hit();
      const hp = 25 + stage * 15 + (hard ? 15 : 0);
      boss = { x: env.W / 2, y: -90, ty: 110, hp, max: hp, w: 90 + stage * 6, ph: 0, shootT: 2, pat: 0, hitT: 0, c: STAGE_COL[(stage - 1) % STAGE_COL.length] };
    }
    function killBoss() {
      score += 500 * stage; sfx.win(); env.vibe(200); shake = .6; for (let i = 0; i < 6; i++) setTimeout(() => pr.burst(boss ? boss.x + rnd(-50, 50) : env.W / 2, 110 + rnd(-30, 30), pick(['#ffd23f', '#ff4f9a', '#fff']), 18, 260), i * 90);
      drops.push({ x: boss.x, y: boss.y, k: 'up', vy: 60 }); drops.push({ x: boss.x + 40, y: boss.y, k: Math.random() < .5 ? 'shield' : 'life', vy: 60 });
      boss = null; stage++; wave = 0; waveT = 3; msg = 'Étape ' + (stage - 1) + ' terminée !'; msgT = 2.5; persist();
    }
    function drop(x, y) { if (Math.random() > .12) return; const k = pick(['up', 'up', 'rapid', 'laser', 'shield', weapon >= 3 ? 'rapid' : 'up', lives < 3 ? 'life' : 'up']); drops.push({ x, y, k, vy: 70 }); }
    function pickUp(d) {
      sfx.ok(); env.vibe(30); pr.burst(d.x, d.y, DROPS[d.k].c, 12, 140);
      if (d.k === 'up') { weapon = Math.min(4, weapon + 1); msg = WNAME[weapon] + ' tir !'; }
      else if (d.k === 'rapid') { rapid = 10; msg = 'Tir rapide 10 s'; } else if (d.k === 'laser') { laser = 7; msg = 'LASER 7 s'; }
      else if (d.k === 'shield') { shield = 1; msg = 'Bouclier !'; } else if (d.k === 'life') { lives = Math.min(5, lives + 1); msg = '+1 vie'; }
      msgT = 1.2; score += 25;
    }
    function shoot() {
      const y = ship.y - 20;
      if (weapon === 1) shots.push({ x: ship.x, y, vx: 0 });
      else if (weapon === 2) { shots.push({ x: ship.x - 9, y, vx: 0 }, { x: ship.x + 9, y, vx: 0 }); }
      else if (weapon === 3) { shots.push({ x: ship.x, y, vx: 0 }, { x: ship.x - 10, y, vx: -140 }, { x: ship.x + 10, y, vx: 140 }); }
      else { shots.push({ x: ship.x - 9, y, vx: 0 }, { x: ship.x + 9, y, vx: 0 }, { x: ship.x - 12, y, vx: -180 }, { x: ship.x + 12, y, vx: 180 }); }
    }
    function hitShip() {
      if (inv > 0 || over) return;
      if (shield > 0) { shield = 0; inv = .8; sfx.ko(); pr.burst(ship.x, ship.y, '#38e0d6', 14, 200); msg = 'Bouclier brisé'; msgT = 1; return; }
      lives--; inv = 1.6; weapon = Math.max(1, weapon - 1); laser = 0; sfx.hit(); env.vibe(150); shake = .3; pr.burst(ship.x, ship.y, '#38e0d6', 20, 240);
      if (lives <= 0) { over = true; env.gameOver(score, { text: 'Étape ' + stage + ' · vague ' + wave }); } else persist();
    }
    function damageFoe(f, i, dmg) { f.hp -= dmg; if (f.hp <= 0) { foes.splice(i, 1); score += 20 * stage; pr.burst(f.x, f.y, f.c, 12, 180); sfx.coin(); env.vibe(10); drop(f.x, f.y); } else sfx.hit(); }
    function update(dt) {
      if (over) return; t += dt; inv = Math.max(0, inv - dt); msgT = Math.max(0, msgT - dt); rapid = Math.max(0, rapid - dt); laser = Math.max(0, laser - dt); shake = Math.max(0, shake - dt);
      const W = env.W, H = env.H; ship.y = H - 70;
      if (input.held.left) ship.x -= 440 * dt; if (input.held.right) ship.x += 440 * dt;
      if (input.pointer.down) ship.x += (input.pointer.x - ship.x) * Math.min(1, dt * 14);
      ship.x = clamp(ship.x, 24, W - 24);
      fire -= dt; if (fire <= 0) { shoot(); fire = (rapid > 0 ? .13 : hard ? .24 : .3); }
      for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.y -= 600 * dt; s.x += s.vx * dt; if (s.y < -10 || s.x < -10 || s.x > W + 10) shots.splice(i, 1); }
      // vagues / boss
      if (!foes.length && !boss) { waveT -= dt; if (waveT <= 0) { if (wave >= WAVES) spawnBoss(); else spawnWave(); waveT = 2.2; } }
      const sp = 1 + (stage - 1) * .15 + wave * .05;
      for (let i = foes.length - 1; i >= 0; i--) {
        const f = foes[i]; f.y += (f.ty - f.y) * Math.min(1, dt * 2); f.x += Math.sin(t * 1.5 + f.ph) * (f.kind ? 60 : 40) * dt * sp; f.ty += 5 * dt * sp;
        if ((hard || stage > 1) && f.y > 0) { f.shootT -= dt; if (f.shootT <= 0) { bullets.push({ x: f.x, y: f.y + 14, vx: 0, vy: 240 }); f.shootT = rnd(3, 8) / sp; } }
        for (let j = shots.length - 1; j >= 0; j--) { const s = shots[j]; if (Math.abs(s.x - f.x) < 18 && Math.abs(s.y - f.y) < 16) { shots.splice(j, 1); damageFoe(f, i, 1); break; } }
        if (!foes[i]) continue;
        if (laser > 0 && Math.abs(f.x - ship.x) < 14 && f.y < ship.y) { f.lz = (f.lz || 0) + dt; if (f.lz > .25) { f.lz = 0; damageFoe(f, i, 1); } }
        if (!foes[i]) continue;
        if (f.y > H - 40) { foes.splice(i, 1); hitShip(); }
        else if (inv <= 0 && Math.abs(f.x - ship.x) < 26 && Math.abs(f.y - ship.y) < 24) { foes.splice(i, 1); pr.burst(f.x, f.y, f.c, 12, 180); hitShip(); }
      }
      if (boss) {
        const b = boss; b.ph += dt; b.y += (b.ty - b.y) * Math.min(1, dt * 1.5); b.x = W / 2 + Math.sin(b.ph * .7) * (W / 2 - b.w / 2 - 10); b.hitT = Math.max(0, b.hitT - dt);
        b.shootT -= dt; if (b.shootT <= 0 && b.y > 60) {
          b.pat = (b.pat + 1) % 3;
          if (b.pat === 0) for (let k = -2; k <= 2; k++) bullets.push({ x: b.x + k * 14, y: b.y + 30, vx: k * 70, vy: 220 });
          else if (b.pat === 1) { const a = Math.atan2(ship.y - b.y, ship.x - b.x); for (let k = -1; k <= 1; k++) bullets.push({ x: b.x, y: b.y + 30, vx: Math.cos(a + k * .25) * 260, vy: Math.sin(a + k * .25) * 260 }); }
          else for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + b.ph; bullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150 + 40 }); }
          b.shootT = (hard ? 1.2 : 1.7) - Math.min(.6, stage * .08);
        }
        for (let j = shots.length - 1; j >= 0; j--) { const s = shots[j]; if (Math.abs(s.x - b.x) < b.w / 2 && Math.abs(s.y - b.y) < 32) { shots.splice(j, 1); b.hp--; b.hitT = .08; score += 5; pr.burst(s.x, s.y + 10, '#fff', 4, 100); sfx.tick(); } }
        if (laser > 0 && Math.abs(b.x - ship.x) < b.w / 2) { b.lz = (b.lz || 0) + dt; if (b.lz > .12) { b.lz = 0; b.hp--; b.hitT = .08; score += 5; } }
        if (inv <= 0 && Math.abs(b.x - ship.x) < b.w / 2 + 10 && Math.abs(b.y - ship.y) < 40) hitShip();
        if (b.hp <= 0) killBoss();
      }
      if ((hard || stage > 2) && !boss && Math.random() < dt * (.2 + stage * .05)) rocks.push({ x: rnd(20, W - 20), y: -30, r: rnd(12, 22), vy: rnd(90, 160), rot: 0, vr: rnd(-2, 2) });
      for (let i = rocks.length - 1; i >= 0; i--) { const r = rocks[i]; r.y += r.vy * dt; r.rot += r.vr * dt; if (r.y > H + 30) { rocks.splice(i, 1); continue; } for (let j = shots.length - 1; j >= 0; j--) { if (Math.hypot(shots[j].x - r.x, shots[j].y - r.y) < r.r) { shots.splice(j, 1); r.r -= 6; score += 5; sfx.tick(); if (r.r < 8) { rocks.splice(i, 1); pr.burst(r.x, r.y, '#b5642a', 8); break; } } } if (rocks[i] && inv <= 0 && Math.hypot(r.x - ship.x, r.y - ship.y) < r.r + 16) { rocks.splice(i, 1); hitShip(); } }
      for (let i = bullets.length - 1; i >= 0; i--) { const b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y > H + 10 || b.x < -10 || b.x > W + 10 || b.y < -40) { bullets.splice(i, 1); continue; } if (inv <= 0 && Math.abs(b.x - ship.x) < 16 && Math.abs(b.y - ship.y) < 18) { bullets.splice(i, 1); hitShip(); } }
      for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.y += d.vy * dt; d.x += Math.sin(t * 3 + d.y * .02) * 20 * dt; if (d.y > H + 20) { drops.splice(i, 1); continue; } if (Math.abs(d.x - ship.x) < 28 && Math.abs(d.y - ship.y) < 30) { drops.splice(i, 1); pickUp(d); } }
      pr.update(dt); env.setScore(score); env.hud('Étape ' + stage + ' · ' + WNAME[weapon] + (laser > 0 ? ' · Laser' : rapid > 0 ? ' · Rapide' : ''));
    }
    function draw(c) {
      const W = env.W, H = env.H; makeNebula();
      c.save(); if (shake > 0) c.translate(rnd(-4, 4) * shake, rnd(-4, 4) * shake);
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#07051a'); g.addColorStop(1, '#1b1540'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const ny = (t * 12) % (H * 2); c.globalAlpha = .55; c.drawImage(neb, 0, ny - H * 2); c.drawImage(neb, 0, ny); c.globalAlpha = 1;
      c.fillStyle = '#fff'; for (let i = 0; i < 90; i++) { const layer = i % 3, sx = (i * 97) % W, sy = ((i * 53) + t * (18 + layer * 30)) % H; c.globalAlpha = .25 + layer * .25; c.fillRect(sx, sy, 1 + layer, 1 + layer); } c.globalAlpha = 1;
      for (const r of rocks) { c.save(); c.translate(r.x, r.y); c.rotate(r.rot); c.fillStyle = '#8a5a2b'; c.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, rr = r.r * (k % 2 ? .8 : 1); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(r.r * .3, -r.r * .2, r.r * .25, 0, 7); c.fill(); c.restore(); }
      for (const f of foes) { c.fillStyle = f.c; if (f.kind) { c.beginPath(); c.moveTo(f.x, f.y + 14); c.lineTo(f.x + 18, f.y - 8); c.lineTo(f.x, f.y - 2); c.lineTo(f.x - 18, f.y - 8); c.closePath(); c.fill(); c.fillStyle = '#1b1540'; c.beginPath(); c.arc(f.x, f.y + 2, 4, 0, 7); c.fill(); } else { c.beginPath(); c.ellipse(f.x, f.y, 18, 10, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(f.x, f.y - 6, 9, 8, 0, Math.PI, 0); c.fill(); c.fillStyle = '#1b1540'; c.beginPath(); c.arc(f.x - 3, f.y - 7, 2, 0, 7); c.arc(f.x + 3, f.y - 7, 2, 0, 7); c.fill(); } if (f.hp > 1) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.ellipse(f.x, f.y, 21, 13, 0, 0, 7); c.stroke(); } }
      if (boss) { const b = boss; c.save(); c.translate(b.x, b.y); c.fillStyle = b.hitT > 0 ? '#fff' : b.c; c.beginPath(); c.moveTo(0, 36); c.lineTo(b.w / 2, 0); c.lineTo(b.w / 3, -26); c.lineTo(-b.w / 3, -26); c.lineTo(-b.w / 2, 0); c.closePath(); c.fill(); c.fillStyle = '#1b1540'; c.beginPath(); c.ellipse(0, -6, b.w / 5, 12, 0, 0, 7); c.fill(); c.fillStyle = '#ff4f4f'; c.beginPath(); c.arc(-b.w / 8, -6, 5 + Math.sin(b.ph * 6) * 2, 0, 7); c.arc(b.w / 8, -6, 5 + Math.sin(b.ph * 6) * 2, 0, 7); c.fill(); c.fillStyle = '#ff9f1c'; c.beginPath(); c.moveTo(-10, 36); c.lineTo(0, 50 + Math.sin(t * 40) * 6); c.lineTo(10, 36); c.fill(); c.restore(); }
      c.fillStyle = '#ffd23f'; for (const s of shots) c.fillRect(s.x - 2, s.y - 8, 4, 14);
      if (laser > 0) { c.fillStyle = 'rgba(255,79,154,.35)'; c.fillRect(ship.x - 9, 0, 18, ship.y - 10); c.fillStyle = '#ff4f9a'; c.fillRect(ship.x - 3 + Math.sin(t * 60) * 2, 0, 6, ship.y - 10); }
      c.fillStyle = '#ff4f4f'; for (const b of bullets) { c.beginPath(); c.arc(b.x, b.y, 5, 0, 7); c.fill(); }
      for (const d of drops) { const k = DROPS[d.k]; c.fillStyle = k.c; c.shadowColor = k.c; c.shadowBlur = 14; const pw = 16 + k.l.length * 6; Draw.rr(c, d.x - pw / 2, d.y - 12, pw, 24, 8); c.fill(); c.shadowBlur = 0; Draw.text(c, k.l, d.x, d.y + 1, 9, '#1b1540'); }
      if (!(inv > 0 && Math.floor(inv * 12) % 2)) { c.save(); c.translate(ship.x, ship.y); c.fillStyle = '#ff9f1c'; c.beginPath(); c.moveTo(-6, 16); c.lineTo(0, 26 + Math.sin(t * 40) * 5); c.lineTo(6, 16); c.fill(); c.fillStyle = '#38e0d6'; c.beginPath(); c.moveTo(0, -22); c.lineTo(16, 16); c.lineTo(0, 8); c.lineTo(-16, 16); c.closePath(); c.fill(); c.fillStyle = '#fff5e1'; c.beginPath(); c.arc(0, -4, 5, 0, 7); c.fill(); if (weapon >= 2) { c.fillStyle = '#ffd23f'; c.fillRect(-20, 4, 5, 10); c.fillRect(15, 4, 5, 10); } if (shield > 0) { c.strokeStyle = 'rgba(56,224,214,.8)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 30 + Math.sin(t * 8) * 2, 0, 7); c.stroke(); } c.restore(); }
      pr.draw(c); c.restore();
      Draw.lives(c, lives, Math.max(3, lives), 22, 10);
      if (boss) { const bw = Math.min(360, W - 40); c.fillStyle = 'rgba(0,0,0,.5)'; Draw.rr(c, W / 2 - bw / 2, 34, bw, 14, 7); c.fill(); const w = bw * boss.hp / boss.max; if (w > 0) { c.fillStyle = boss.hp / boss.max > .5 ? '#ff4f9a' : boss.hp / boss.max > .25 ? '#ff9f1c' : '#ff4f4f'; Draw.rr(c, W / 2 - bw / 2, 34, w, 14, 7); c.fill(); } Draw.text(c, 'BOSS · ÉTAPE ' + stage, W / 2, 58, 12, '#fff', 'center', 800); }
      if (msgT > 0) { c.globalAlpha = Math.min(1, msgT); Draw.text(c, msg, W / 2, H * .35, big ? 40 : 26, big ? '#ff4f9a' : '#ffd23f'); c.globalAlpha = 1; }
    }
    if (saved && saved.stage) { stage = clamp(saved.stage | 0, 1, 50); score = saved.score | 0; lives = clamp(saved.lives | 0, 1, 5); weapon = clamp(saved.weapon | 0, 1, 4); }
    init();
    return { update, draw, resize: () => { ship.x = clamp(ship.x, 24, env.W - 24); } };
  }
});
