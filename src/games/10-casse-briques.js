/* ===== Casse-Briques (dès 8 ans) — niveaux dessinés, capsules, combos, boss ===== */
const BRICK_LEVELS = [
  // . vide  1-7 couleur simple  H solide(2)  S solide(3)  X indestructible  E explosive  M mobile
  ['..111111..', '.22222222.', '3333333333', '.44444444.', '..555555..'],
  ['.11....11.', '1221..1221', '1233333321', '.14444441.', '..155551..', '...1661...', '....11....'],
  ['..1....1..', '...1..1...', '..111111..', '.11H11H11.', '1111111111', '1.111111.1', '1.1....1.1', '...11.11..'],
  ['XXXXXXXXXX', '.1111111..', '.2E22E22..', '.3333333..', '.4E44E44..', '.5555555..', '..........', 'HHHHHHHHHH'],
  ['1.1.1.1.1.', '.2.2.2.2.2', '3.3.3.3.3.', '.4.4.4.4.4', '5.5.5.5.5.', '.H.H.H.H.H', 'M.M.M.M.M.'],
  ['....SS....', '...S11S...', '..S1221S..', '.S123321S.', 'S12344321S', '.XXXXXXXX.', '..E....E..'],
  ['MMMMMMMMMM', '..........', 'E1E1E1E1E1', '2222222222', '..........', 'H.H.H.H.H.', '.3.3.3.3.3'],
  ['1111111111', '1XXXXXXXX1', '1X222222X1', '1X2SSSS2X1', '1X2S44S2X1', '1X2SSSS2X1', '1X222222X1', '1XXXX.XXX1'],
  ['..M....M..', '.1111111..', 'E2222222E.', '.3333333..', '..44444...', '...555....', '....6.....', 'HHHHHHHHHH'],
  ['7E7E7E7E7E', 'SSSSSSSSSS', '1111111111', 'M..M..M..M', '2222222222', 'X.X.X.X.X.', '3333333333']
];
GAMES.push({
  id: 'bricks', title: 'Casse-Briques', tagline: 'Capsules, combos et boss', minAge: 8, color: '#ff6a55',
  icon: '<svg viewBox="0 0 64 64"><g><rect x="6" y="8" width="16" height="8" rx="2" fill="#ff4f4f"/><rect x="24" y="8" width="16" height="8" rx="2" fill="#ff9f1c"/><rect x="42" y="8" width="16" height="8" rx="2" fill="#ffd23f"/><rect x="6" y="18" width="16" height="8" rx="2" fill="#9dff5c"/><rect x="24" y="18" width="16" height="8" rx="2" fill="#38e0d6"/><rect x="42" y="18" width="16" height="8" rx="2" fill="#9b7bff"/></g><circle cx="36" cy="40" r="4" fill="#fff5e1"/><rect x="22" y="52" width="24" height="6" rx="3" fill="#fff5e1"/></svg>',
  howto: ['', 'Glisse le doigt pour la raquette. Attrape les capsules : multi-balles, laser, balle de feu… Un boss tous les 5 niveaux !', 'Balle rapide, briques renforcées, capsules piégées. Enchaîne les briques sans toucher la raquette pour le combo.'],
  pad: { left: true, buttons: [{ k: 'a', label: 'GO' }], hint: 'ou glisse le doigt · GO = lancer / tirer' },
  stars: s => s >= 4000 ? 3 : s >= 1800 ? 2 : s >= 500 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env; const hard = env.tier >= 2;
    const COLS = 10; let bricks = [], balls = [], caps = [], lasers = [], pad, lives = 3, score = 0, level = 1, over = false, t = 0, flash = 0, combo = 0, boss = null, msg = '', msgT = 0, shake = 0;
    let wide = 0, laser = 0, fire = 0, slow = 0, sticky = 0, laserT = 0;
    const pr = Particles();
    const ROWC = ['', '#ff4f4f', '#ff9f1c', '#ffd23f', '#9dff5c', '#38e0d6', '#9b7bff', '#ff4f9a'];
    const CAPS = { multi: ['#ffd23f', '×3'], wide: ['#38e0d6', 'LARGE'], laser: ['#ff4f9a', 'LASER'], fire: ['#ff9f1c', 'FEU'], slow: ['#9dff5c', 'LENT'], sticky: ['#9b7bff', 'COLLE'], life: ['#ff6a55', 'VIE'], small: ['#6b6b8f', 'MINI'] };
    const bw = () => (env.W - 20) / COLS, bh = () => Math.min(24, env.H * .032);
    function persist() { env.save({ level, lives, score }, 'Niveau ' + level + ' · ' + lives + ' vie' + (lives > 1 ? 's' : '') + ' · ' + score + ' pts'); }
    function layout() {
      const W = env.W; bricks = []; caps = []; lasers = []; boss = null; combo = 0;
      const isBoss = level % 5 === 0;
      if (isBoss) { const hp = 20 + level * 3 + (hard ? 10 : 0); boss = { x: W / 2, y: 90, w: Math.min(220, W * .5), h: 44, hp, max: hp, vx: 120 + level * 8, hitT: 0, shootT: 2 }; }
      else {
        const L = BRICK_LEVELS[(level - 1) % BRICK_LEVELS.length];
        L.forEach((row, r) => row.split('').forEach((ch, c) => {
          if (ch === '.') return; const b = { x: 10 + c * bw() + 2, y: 46 + r * (bh() + 4), w: bw() - 4, h: bh(), hp: 1, c: ROWC[1 + (r % 7)], kind: 'n' };
          if (/[1-7]/.test(ch)) { b.c = ROWC[+ch]; } else if (ch === 'H') { b.hp = 2; b.c = '#c9c9d6'; } else if (ch === 'S') { b.hp = 3; b.c = '#8a8aa8'; } else if (ch === 'X') { b.hp = 99; b.kind = 'x'; b.c = '#4b3fa3'; } else if (ch === 'E') { b.kind = 'e'; b.c = '#ff6a55'; } else if (ch === 'M') { b.kind = 'm'; b.c = '#ffd23f'; b.vx = 60 * pick([-1, 1]); }
          if (hard && b.hp === 1 && b.kind === 'n' && Math.random() < .15) b.hp = 2;
          bricks.push(b);
        }));
      }
      pad = pad || { x: W / 2, w: 0, h: 14 }; wide = 0; laser = 0; fire = 0; slow = 0; sticky = 0; reset();
      msg = isBoss ? 'BOSS !' : 'Niveau ' + level; msgT = 1.6;
    }
    function padW() { return clamp(env.W * (wide > 0 ? .34 : .22), wide > 0 ? 110 : 70, wide > 0 ? 200 : 130); }
    function reset() { balls = [{ x: pad.x, y: env.H - 60, vx: 0, vy: 0, r: 8, stuck: true }]; }
    function speed() { return ((hard ? 340 : 290) + level * 18) * (slow > 0 ? .65 : 1); }
    function launch(b) { if (!b.stuck) return; b.stuck = false; const a = rnd(-.5, .5); b.vx = Math.sin(a) * speed(); b.vy = -Math.cos(a) * speed(); sfx.jump(); }
    function dropCap(x, y) {
      if (Math.random() > (hard ? .2 : .26)) return;
      const pool = ['multi', 'multi', 'wide', 'laser', 'fire', 'slow', 'sticky', lives < 3 ? 'life' : 'wide']; if (hard) pool.push('small', 'small');
      caps.push({ x, y, k: pick(pool), vy: 110 });
    }
    function pick_(c) {
      sfx.ok(); env.vibe(25); score += 20; const name = CAPS[c.k][1];
      if (c.k === 'multi') { const src = balls.filter(b => !b.stuck)[0] || balls[0]; for (let i = 0; i < 2; i++) { const a = rnd(0, Math.PI * 2); balls.push({ x: src.x, y: src.y, vx: Math.cos(a) * speed(), vy: -Math.abs(Math.sin(a) * speed()) - 60, r: 8, stuck: false }); } }
      else if (c.k === 'wide') wide = 15; else if (c.k === 'laser') laser = 12; else if (c.k === 'fire') fire = 8; else if (c.k === 'slow') slow = 10; else if (c.k === 'sticky') sticky = 12;
      else if (c.k === 'life') lives = Math.min(5, lives + 1); else if (c.k === 'small') { wide = 0; pad.w = 60; }
      msg = name; msgT = 1;
    }
    function hitBrick(b, i, byFire) {
      if (b.kind === 'x' && !byFire) { sfx.tick(); return false; }
      b.hp -= byFire ? 99 : 1; combo++;
      if (b.hp > 0) { score += 5; sfx.hit(); return true; }
      bricks.splice(i, 1); score += (10 + Math.min(combo, 10) * 2) * level; pr.burst(b.x + b.w / 2, b.y + b.h / 2, b.c, 10, 160); sfx.coin(); env.vibe(12); dropCap(b.x + b.w / 2, b.y + b.h / 2);
      if (b.kind === 'e') { shake = .25; sfx.hit(); for (let j = bricks.length - 1; j >= 0; j--) { const o = bricks[j]; if (o.kind !== 'x' && Math.abs(o.x - b.x) < b.w * 1.6 && Math.abs(o.y - b.y) < b.h * 2.6) { bricks.splice(j, 1); score += 10 * level; pr.burst(o.x + o.w / 2, o.y + o.h / 2, o.c, 8, 160); } } }
      return true;
    }
    function loseBall() { lives--; flash = .5; combo = 0; sfx.lose(); env.vibe(150); if (lives <= 0) { over = true; env.gameOver(score, { text: 'Niveau ' + level }); return; } wide = 0; laser = 0; fire = 0; reset(); persist(); }
    function update(dt) {
      if (over) return; t += dt; flash = Math.max(0, flash - dt); msgT = Math.max(0, msgT - dt); shake = Math.max(0, shake - dt); const W = env.W, H = env.H;
      wide = Math.max(0, wide - dt); laser = Math.max(0, laser - dt); fire = Math.max(0, fire - dt); slow = Math.max(0, slow - dt); sticky = Math.max(0, sticky - dt); laserT = Math.max(0, laserT - dt);
      pad.w += (padW() - pad.w) * Math.min(1, dt * 8);
      if (input.held.left) pad.x -= 560 * dt; if (input.held.right) pad.x += 560 * dt;
      if (input.pointer.down) pad.x += (input.pointer.x - pad.x) * Math.min(1, dt * 16);
      pad.x = clamp(pad.x, pad.w / 2, W - pad.w / 2);
      const go = input.pressed.a || input.tap || input.pointer.justDown;
      if (go) { balls.forEach(launch); if (laser > 0 && laserT <= 0) { lasers.push({ x: pad.x - pad.w / 2 + 8, y: H - 50 }, { x: pad.x + pad.w / 2 - 8, y: H - 50 }); laserT = .3; sfx.tick(); } }
      const py = H - 44;
      for (let bi = balls.length - 1; bi >= 0; bi--) {
        const ball = balls[bi];
        if (ball.stuck) { ball.x = pad.x + (ball.off || 0); ball.y = py - ball.r; continue; }
        const steps = 3; let lost = false;
        for (let s = 0; s < steps && !lost; s++) {
          ball.x += ball.vx * dt / steps; ball.y += ball.vy * dt / steps;
          if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -1; } if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx *= -1; } if (ball.y < 36 + ball.r) { ball.y = 36 + ball.r; ball.vy *= -1; }
          if (ball.vy > 0 && ball.y + ball.r >= py && ball.y + ball.r <= py + pad.h + 8 && Math.abs(ball.x - pad.x) <= pad.w / 2 + ball.r) {
            combo = 0; const rel = (ball.x - pad.x) / (pad.w / 2); const a = rel * 1.15; const sp = speed(); ball.vx = Math.sin(a) * sp; ball.vy = -Math.abs(Math.cos(a) * sp); ball.y = py - ball.r; sfx.pop();
            if (sticky > 0) { ball.stuck = true; ball.off = ball.x - pad.x; ball.vx = ball.vy = 0; }
          }
          for (let i = bricks.length - 1; i >= 0; i--) {
            const b = bricks[i]; if (ball.x + ball.r < b.x || ball.x - ball.r > b.x + b.w || ball.y + ball.r < b.y || ball.y - ball.r > b.y + b.h) continue;
            const byFire = fire > 0;
            if (!byFire || b.kind === 'x') { const ox = Math.min(ball.x + ball.r - b.x, b.x + b.w - ball.x + ball.r), oy = Math.min(ball.y + ball.r - b.y, b.y + b.h - ball.y + ball.r); if (ox < oy) ball.vx *= -1; else ball.vy *= -1; }
            hitBrick(b, i, byFire && b.kind !== 'x'); break;
          }
          if (boss && Math.abs(ball.x - boss.x) < boss.w / 2 + ball.r && Math.abs(ball.y - boss.y) < boss.h / 2 + ball.r) { ball.vy *= -1; ball.y = boss.y + (ball.vy > 0 ? boss.h / 2 + ball.r : -boss.h / 2 - ball.r); boss.hp -= fire > 0 ? 3 : 1; boss.hitT = .1; score += 15; combo++; sfx.hit(); pr.burst(ball.x, ball.y, '#fff', 5, 120); }
          if (ball.y > H + 20) { balls.splice(bi, 1); lost = true; }
        }
      }
      if (!balls.length) { loseBall(); if (over) return; }
      for (let i = caps.length - 1; i >= 0; i--) { const c = caps[i]; c.y += c.vy * dt; if (c.y > H + 20) { caps.splice(i, 1); continue; } if (c.y > py - 14 && c.y < py + pad.h + 14 && Math.abs(c.x - pad.x) < pad.w / 2 + 16) { caps.splice(i, 1); pick_(c); } }
      for (let i = lasers.length - 1; i >= 0; i--) { const l = lasers[i]; l.y -= 700 * dt; if (l.y < 30) { lasers.splice(i, 1); continue; } let hit = false; for (let j = bricks.length - 1; j >= 0; j--) { const b = bricks[j]; if (l.x > b.x && l.x < b.x + b.w && l.y > b.y && l.y < b.y + b.h) { hitBrick(b, j, false); hit = true; break; } } if (!hit && boss && Math.abs(l.x - boss.x) < boss.w / 2 && Math.abs(l.y - boss.y) < boss.h / 2) { boss.hp--; boss.hitT = .1; score += 10; hit = true; } if (hit) lasers.splice(i, 1); }
      for (const b of bricks) if (b.kind === 'm') { b.x += b.vx * dt; if (b.x < 10 || b.x + b.w > W - 10) b.vx *= -1; }
      if (boss) {
        boss.x += boss.vx * dt; if (boss.x < boss.w / 2 + 10 || boss.x > W - boss.w / 2 - 10) boss.vx *= -1; boss.hitT = Math.max(0, boss.hitT - dt);
        boss.shootT -= dt; if (boss.shootT <= 0) { bricks.push({ x: boss.x - 14, y: boss.y + 30, w: 28, h: 16, hp: 1, c: '#ff4f4f', kind: 'd', vy: 120 }); boss.shootT = 2.5 - Math.min(1.2, level * .05); }
        if (boss.hp <= 0) { score += 500 * (level / 5); sfx.win(); shake = .5; for (let i = 0; i < 5; i++) setTimeout(() => pr.burst(boss ? boss.x + rnd(-60, 60) : W / 2, 90, pick(['#ffd23f', '#ff4f9a', '#fff']), 16, 240), i * 90); boss = null; msg = 'Boss vaincu !'; msgT = 2; }
      }
      for (let i = bricks.length - 1; i >= 0; i--) { const b = bricks[i]; if (b.kind === 'd') { b.y += b.vy * dt; if (b.y > H) bricks.splice(i, 1); else if (b.y + b.h > py && b.y < py + pad.h && Math.abs(b.x + b.w / 2 - pad.x) < pad.w / 2 + 10) { bricks.splice(i, 1); pad.w = 60; wide = 0; flash = .3; sfx.ko(); } } }
      const remaining = bricks.filter(b => b.kind !== 'x' && b.kind !== 'd').length;
      if (!remaining && !boss) { level++; score += 100 * level; sfx.win(); layout(); persist(); }
      pr.update(dt); env.setScore(score); env.hud('Niv. ' + level + (combo > 2 ? ' · combo ' + combo : '') + (balls.length > 1 ? ' · ' + balls.length + ' balles' : ''));
    }
    function draw(c) {
      const W = env.W, H = env.H; c.save(); if (shake > 0) c.translate(rnd(-5, 5) * shake, rnd(-5, 5) * shake);
      c.fillStyle = '#17123a'; c.fillRect(-10, -10, W + 20, H + 20);
      c.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 40; i++) c.fillRect((i * 83) % W, (i * 47 + t * 10) % H, 2, 2);
      if (flash > 0) { c.fillStyle = 'rgba(255,80,80,' + flash * .4 + ')'; c.fillRect(0, 0, W, H); }
      for (const b of bricks) { c.fillStyle = b.c; Draw.rr(c, b.x, b.y, b.w, b.h, 5); c.fill(); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(b.x + 3, b.y + 3, b.w - 6, 3); if (b.hp > 1 && b.kind !== 'x') { c.strokeStyle = '#fff'; c.lineWidth = 2; Draw.rr(c, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 4); c.stroke(); if (b.hp > 2) c.strokeRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12); } if (b.kind === 'x') { c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(b.x + 2, b.y + b.h / 2 - 1, b.w - 4, 2); } if (b.kind === 'e') { c.fillStyle = '#fff'; c.beginPath(); c.arc(b.x + b.w / 2, b.y + b.h / 2, 4 + Math.sin(t * 10) * 1.5, 0, 7); c.fill(); } }
      if (boss) { const b = boss; c.fillStyle = b.hitT > 0 ? '#fff' : '#ff4f9a'; Draw.rr(c, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 14); c.fill(); c.fillStyle = '#1b1540'; c.beginPath(); c.arc(b.x - b.w * .25, b.y, 9, 0, 7); c.arc(b.x + b.w * .25, b.y, 9, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(b.x - b.w * .25 + 3, b.y - 2, 4, 0, 7); c.arc(b.x + b.w * .25 + 3, b.y - 2, 4, 0, 7); c.fill(); c.strokeStyle = '#1b1540'; c.lineWidth = 3; c.beginPath(); c.moveTo(b.x - 14, b.y + 14); c.lineTo(b.x + 14, b.y + 14); c.stroke(); const bw2 = Math.min(360, W - 40); c.fillStyle = 'rgba(0,0,0,.5)'; Draw.rr(c, W / 2 - bw2 / 2, 14, bw2, 12, 6); c.fill(); c.fillStyle = '#ff4f9a'; if (b.hp > 0) { Draw.rr(c, W / 2 - bw2 / 2, 14, bw2 * b.hp / b.max, 12, 6); c.fill(); } }
      for (const cp of caps) { const k = CAPS[cp.k]; c.fillStyle = k[0]; c.shadowColor = k[0]; c.shadowBlur = 12; Draw.rr(c, cp.x - 22, cp.y - 11, 44, 22, 8); c.fill(); c.shadowBlur = 0; Draw.text(c, k[1], cp.x, cp.y + 1, 10, '#1b1540'); }
      c.fillStyle = '#ff4f9a'; for (const l of lasers) c.fillRect(l.x - 2, l.y - 10, 4, 16);
      const py = H - 44; c.fillStyle = laser > 0 ? '#ff4f9a' : sticky > 0 ? '#9b7bff' : '#fff5e1'; c.shadowColor = c.fillStyle; c.shadowBlur = 14; Draw.rr(c, pad.x - pad.w / 2, py, pad.w, pad.h, 7); c.fill();
      for (const b of balls) { c.fillStyle = fire > 0 ? '#ff9f1c' : '#fff5e1'; c.shadowColor = c.fillStyle; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill(); } c.shadowBlur = 0;
      pr.draw(c); c.restore();
      Draw.lives(c, lives, Math.max(3, lives), 22, 10);
      const fx = []; if (wide > 0) fx.push('LARGE ' + Math.ceil(wide)); if (laser > 0) fx.push('LASER ' + Math.ceil(laser)); if (fire > 0) fx.push('FEU ' + Math.ceil(fire)); if (slow > 0) fx.push('LENT ' + Math.ceil(slow)); if (sticky > 0) fx.push('COLLE ' + Math.ceil(sticky));
      if (fx.length) Draw.text(c, fx.join(' · '), W - 12, 14, 11, '#ffd23f', 'right', 800);
      if (balls.every(b => b.stuck)) Draw.text(c, 'Tape pour lancer', W / 2, H * .6, 22, 'rgba(255,255,255,.7)');
      if (msgT > 0) { c.globalAlpha = Math.min(1, msgT); Draw.text(c, msg, W / 2, H * .45, 30, '#ffd23f'); c.globalAlpha = 1; }
    }
    if (saved && saved.level) { level = clamp(saved.level | 0, 1, 99); lives = clamp(saved.lives | 0, 1, 5); score = saved.score | 0; }
    layout();
    return { update, draw, resize: () => { pad.x = clamp(pad.x, 0, env.W); } };
  }
});
