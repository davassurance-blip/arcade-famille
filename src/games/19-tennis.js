/* ===== Tennis Pop (dès 8 ans) — court en perspective, vrais points, tournoi de 4 adversaires ===== */
const TENNIS_CHARS = [
  { name: 'Léo', color: '#38e0d6', skin: '#ffb27a', hair: '#ff4f4f', speed: 1.5, power: 1.0, desc: 'Équilibré' },
  { name: 'Maya', color: '#ff4f9a', skin: '#c98a5e', hair: '#1b1540', speed: 1.9, power: .85, desc: 'Très rapide' },
  { name: 'Tom', color: '#ff9f1c', skin: '#ffd9b3', hair: '#3a2a1a', speed: 1.2, power: 1.3, desc: 'Frappe fort' },
  { name: 'Nour', color: '#9dff5c', skin: '#8a5a2b', hair: '#1b1540', speed: 1.6, power: 1.1, desc: 'Précise' }
];
const TENNIS_FOES = [
  { name: 'Lila', color: '#ffd23f', skin: '#ffd9b3', hair: '#ff9f1c', skill: .35 }, { name: 'Max', color: '#9b7bff', skin: '#c98a5e', hair: '#1b1540', skill: .55 },
  { name: 'Zoé', color: '#ff6a55', skin: '#ffb27a', hair: '#ffd23f', skill: .72 }, { name: 'La Championne', color: '#c9c9d6', skin: '#8a5a2b', hair: '#1b1540', skill: .9 }
];
GAMES.push({
  id: 'tennis', title: 'Tennis Pop', tagline: 'Tournoi en 4 matchs', minAge: 8, color: '#3fbf4f',
  icon: '<svg viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="8" fill="#3fbf4f"/><path d="M14 50L24 12h16l10 38z" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M10 50h44M19 31h26" stroke="#fff" stroke-width="2.5"/><circle cx="44" cy="20" r="6" fill="#d4ff3f"/><path d="M40 16q4 4 8 8" stroke="#fff" stroke-width="1.5" fill="none"/></svg>',
  howto: ['', 'Déplace-toi pour être devant la balle : elle est renvoyée toute seule. Appuie sur FRAPPE au bon moment pour un coup puissant. Gagne 3 jeux pour remporter le match !', 'Tournoi de 4 adversaires de plus en plus forts. Place tes coups loin de l\'adversaire.'],
  pad: { left: true, buttons: [{ k: 'a', label: 'FRAPPE' }], hint: 'ou glisse le doigt' },
  stars: s => s >= 4000 ? 3 : s >= 2000 ? 2 : s >= 600 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env; const hard = env.tier >= 2;
    let phase = 'select', selIdx = 0, level = 0, score = 0, over = false, t = 0;
    let me, foe, ball, serving = 'me', serveT = 0, pts = [0, 0], games = [0, 0], rally = 0, msg = '', msgT = 0, bounces = { side: null, n: 0 }, pointT = 0, lastHitBy = null, powerT = 0, flash = 0;
    const PTS = ['0', '15', '30', '40'];
    const pr = Particles();
    const NET_H = .07, G = 2.4;
    // projection du court : z 0 (ma ligne de fond) → 1 (ligne adverse)
    const geo = () => { const W = env.W, H = env.H; const nearY = H - 70, farY = H * .22; const halfNear = Math.min(W * .46, 260), halfFar = halfNear * .42; return { W, H, nearY, farY, halfNear, halfFar }; };
    function proj(x, z, y) { const g = geo(); const half = g.halfNear + (g.halfFar - g.halfNear) * z; const sy = g.nearY + (g.farY - g.nearY) * z; const sc = 1 + (.42 - 1) * z; return { x: g.W / 2 + x * half, y: sy - y * (g.nearY - g.farY) * .9 * sc, s: sc, gy: sy }; }
    function persist() { env.save({ level, selIdx, score }, 'Match ' + (level + 1) + ' · ' + TENNIS_CHARS[selIdx].name + ' · ' + score + ' pts'); }
    function startMatch() {
      const d = TENNIS_CHARS[selIdx], f = TENNIS_FOES[level];
      me = { def: d, x: 0, z: 0, swing: 0, side: 1 }; foe = { def: f, x: 0, z: 1, swing: 0, side: -1, skill: f.skill + (hard ? .08 : 0), target: 0 };
      pts = [0, 0]; games = [0, 0]; serving = 'me'; phase = 'serve'; serveT = 0; ball = null; msg = 'Match ' + (level + 1) + ' contre ' + f.name; msgT = 2.2; persist();
    }
    function newBall() { const srv = serving === 'me' ? me : foe; ball = { x: srv.x, z: srv.z, y: .25, vx: 0, vz: 0, vy: 0, held: true }; bounces = { side: null, n: 0 }; lastHitBy = null; rally = 0; }
    function serve(who) {
      const p = who === 'me' ? me : foe; const dir = who === 'me' ? 1 : -1;
      ball.held = false; ball.x = p.x; ball.z = p.z; ball.y = .3; ball.vz = dir * (1.15 + (who === 'me' ? .15 * me.def.power : foe.skill * .3)); ball.vx = (rnd(-.5, .5) - p.x * .4); ball.vy = .55; lastHitBy = who; p.swing = .35; sfx.pop(); rally = 0;
    }
    function hitBall(who, power) {
      const p = who === 'me' ? me : foe; const dir = who === 'me' ? 1 : -1; const other = who === 'me' ? foe : me;
      let aimX; if (who === 'me') { const off = clamp((ball.x - p.x) / .25, -1, 1); const steer = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0); aimX = clamp(off * .7 + steer * .45 + rnd(-.1, .1), -.95, .95); }
      else { const away = -Math.sign(other.x || rnd(-1, 1)); aimX = clamp(away * rnd(.3, .85) * foe.skill + rnd(-.4, .4) * (1 - foe.skill), -1.15, 1.15); }
      const sp = (power ? 1.75 : 1.15) * (who === 'me' ? me.def.power : (.9 + foe.skill * .35));
      ball.vz = dir * sp; ball.vx = (aimX - ball.x) * sp / 1.0 * .9; ball.vy = power ? .42 : .6 + rnd(-.05, .05); ball.y = Math.max(ball.y, .05);
      p.swing = .35; lastHitBy = who; bounces = { side: null, n: 0 }; rally++; sfx.pop(); env.vibe(10);
      if (power) { powerT = .5; sfx.ok(); flash = .25; pr.burst(proj(ball.x, ball.z, ball.y).x, proj(ball.x, ball.z, ball.y).y, '#d4ff3f', 10, 160); }
    }
    function point(winner, reason) {
      phase = 'point'; pointT = 1.6; pts[winner]++; const w = winner === 0 ? 'me' : 'foe'; msg = reason; msgT = 1.6; if (winner === 0) { score += 50 + rally * 10; sfx.coin(); } else sfx.ko();
      const a = pts[0], b = pts[1];
      if (a >= 4 && a - b >= 2) winGame(0); else if (b >= 4 && b - a >= 2) winGame(1);
      else if (a >= 3 && b >= 3) { if (a === b) msg += ' · Égalité'; else msg += ' · Avantage ' + (a > b ? me.def.name : foe.def.name); }
      else msg += ' · ' + PTS[a] + ' - ' + PTS[b];
      serving = games[0] + games[1] + 0 === 0 ? serving : serving; // le serveur change à chaque jeu (géré dans winGame)
    }
    function winGame(w) {
      games[w]++; pts = [0, 0]; serving = serving === 'me' ? 'foe' : 'me'; msg = (w === 0 ? 'JEU ' + me.def.name + ' !' : 'Jeu ' + foe.def.name) + ' · ' + games[0] + ' - ' + games[1]; msgT = 2; pointT = 2.2;
      if (w === 0) { score += 300; sfx.win(); }
      if (games[w] >= 3) {
        if (w === 0) { score += 1000 * (level + 1); level++; if (level >= TENNIS_FOES.length) { over = true; setTimeout(() => env.gameOver(score, { win: true, title: 'CHAMPION !', text: 'Tournoi remporté' }), 1500); return; } phase = 'won'; pointT = 2.6; msg = 'MATCH GAGNÉ ! ' + games[0] + ' - ' + games[1]; msgT = 2.6; persist(); }
        else { over = true; setTimeout(() => env.gameOver(score, { text: 'Battu par ' + foe.def.name + ' ' + games[1] + ' - ' + games[0] + ' au match ' + (level + 1) }), 1500); }
      }
    }
    function update(dt) {
      if (over) return; t += dt; msgT = Math.max(0, msgT - dt); powerT = Math.max(0, powerT - dt); flash = Math.max(0, flash - dt); pr.update(dt);
      if (phase === 'select') { if (input.pressed.left) { selIdx = (selIdx + 3) % 4; sfx.tap(); } if (input.pressed.right) { selIdx = (selIdx + 1) % 4; sfx.tap(); } if (input.tap) { const W = env.W, cw = Math.min(150, (W - 30) / 4), x0 = W / 2 - cw * 2; const i = Math.floor((input.tap.x - x0) / cw); if (i >= 0 && i < 4 && input.tap.y > env.H * .2 && input.tap.y < env.H * .7) { if (selIdx === i) startMatch(); else { selIdx = i; sfx.tap(); } } else if (input.tap.y >= env.H * .7) startMatch(); } if (input.pressed.a) startMatch(); return; }
      if (phase === 'won') { pointT -= dt; if (pointT <= 0) startMatch(); return; }
      // déplacements
      const spd = me.def.speed * (hard ? 1.05 : 1);
      if (input.held.left) me.x -= spd * dt; if (input.held.right) me.x += spd * dt;
      if (input.pointer.down) { const g = geo(); const tx = (input.pointer.x - g.W / 2) / g.halfNear; me.x += (tx - me.x) * Math.min(1, dt * 10); }
      me.x = clamp(me.x, -1.25, 1.25); me.swing = Math.max(0, me.swing - dt); foe.swing = Math.max(0, foe.swing - dt);
      if (phase === 'point') { pointT -= dt; if (ball && !ball.held) { ball.vy -= G * dt; ball.y += ball.vy * dt; ball.x += ball.vx * dt; ball.z += ball.vz * dt; if (ball.y < 0) { ball.y = 0; ball.vy *= -.5; ball.vx *= .8; ball.vz *= .8; } } if (pointT <= 0) { phase = 'serve'; serveT = 0; ball = null; } return; }
      if (phase === 'serve') {
        if (!ball) newBall(); serveT += dt; const srv = serving === 'me' ? me : foe;
        ball.x = srv.x; ball.z = srv.z; ball.y = .25 + Math.sin(t * 6) * .03;
        if (serving === 'me') { if (input.pressed.a || input.tap || serveT > 4) { serve('me'); phase = 'rally'; } }
        else { foe.x += (0 - foe.x) * Math.min(1, dt * 3); if (serveT > 1.2) { serve('foe'); phase = 'rally'; } }
        return;
      }
      // échange
      ball.vy -= G * dt; ball.y += ball.vy * dt; ball.x += ball.vx * dt; ball.z += ball.vz * dt;
      // filet
      if ((ball.z - ball.vz * dt - .5) * (ball.z - .5) <= 0 && ball.y < NET_H) { ball.vz *= -.15; ball.vx *= .3; ball.vy = Math.min(ball.vy, 0); sfx.hit(); point(lastHitBy === 'me' ? 1 : 0, 'Filet !'); return; }
      if (ball.y <= 0) {
        ball.y = 0; ball.vy = Math.abs(ball.vy) * .62; ball.vx *= .92; ball.vz *= .92; sfx.tick();
        const side = ball.z < .5 ? 'me' : 'foe'; const out = Math.abs(ball.x) > 1.02 || ball.z < -.02 || ball.z > 1.02;
        pr.burst(proj(ball.x, ball.z, 0).x, proj(ball.x, ball.z, 0).gy, '#fff', 4, 60);
        if (out) { point(lastHitBy === 'me' ? 1 : 0, 'Faute !'); return; }
        if (bounces.side === side) { bounces.n++; if (bounces.n >= 2) { point(side === 'me' ? 1 : 0, side === 'me' ? 'Point ' + foe.def.name : 'Point ' + me.def.name + ' !'); return; } } else bounces = { side, n: 1 };
      }
      if (ball.z < -.35 || ball.z > 1.35 || ball.y < -.1) { point(lastHitBy === 'me' ? 1 : 0, 'Faute !'); return; }
      // frappe du joueur : automatique si bien placé, puissante avec FRAPPE au bon moment
      if (ball.vz < 0 && ball.z < .16 && ball.z > -.12 && ball.y < .45 && lastHitBy !== 'me' && !ball.justHit) {
        const reach = .24 + (me.def.speed - 1.5) * .04; const inReach = Math.abs(ball.x - me.x) < reach;
        if (inReach) { const power = input.pressed.a || input.tap || (input.held.a && ball.z < .08); if (ball.z < .06 || power) { hitBall('me', !!power); ball.justHit = .2; } }
      }
      if (ball.justHit) { ball.justHit -= dt; if (ball.justHit <= 0) ball.justHit = 0; }
      // adversaire
      if (ball.vz > 0) { const tz = 1 - .02; const tt = Math.max(0, (tz - ball.z) / Math.max(.2, ball.vz)); foe.target = clamp(ball.x + ball.vx * tt * (1 - (1 - foe.skill) * .4), -1.2, 1.2); }
      else foe.target = foe.target * .9;
      const fs = (1.0 + foe.skill * 1.1); foe.x += clamp(foe.target - foe.x, -fs * dt, fs * dt);
      if (ball.vz > 0 && ball.z > .86 && ball.z < 1.12 && ball.y < .5 && lastHitBy !== 'foe' && Math.abs(ball.x - foe.x) < .26 + foe.skill * .08) { hitBall('foe', Math.random() < foe.skill * .35); }
      env.setScore(score); env.hud('Match ' + (level + 1) + ' · ' + games[0] + '-' + games[1] + ' · ' + (pts[0] >= 3 && pts[1] >= 3 ? (pts[0] === pts[1] ? '40-40' : pts[0] > pts[1] ? 'AV-40' : '40-AV') : PTS[Math.min(3, pts[0])] + '-' + PTS[Math.min(3, pts[1])]));
    }
    function drawPlayer(c, p, far) {
      const q = proj(p.x, p.z, 0), s = q.s * (far ? 1 : 1); const d = p.def;
      c.save(); c.translate(q.x, q.gy); c.scale(s, s); if (far) c.scale(-1, 1);
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 4, 26, 7, 0, 0, 7); c.fill();
      const run = Math.sin(t * 14) * (Math.abs(p.x) > 0 ? 1 : 0);
      c.fillStyle = '#fff'; Draw.rr(c, -16, -48, 12, 44, 6); c.fill(); Draw.rr(c, 4, -48, 12, 44, 6); c.fill();
      c.fillStyle = d.color; Draw.rr(c, -20, -96, 40, 52, 12); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-20, -70, 40, 4);
      c.fillStyle = d.skin; c.beginPath(); c.arc(0, -112, 16, 0, 7); c.fill(); c.fillStyle = d.hair; c.beginPath(); c.arc(0, -118, 16, Math.PI, 0); c.fill(); c.fillStyle = '#fff'; c.fillRect(-16, -112, 32, 5);
      c.fillStyle = '#1b1540'; c.fillRect(3, -112, 4, 4); c.fillRect(10, -112, 4, 4);
      // bras + raquette
      c.save(); c.translate(18, -86); const sw = p.swing > 0 ? Math.sin((1 - p.swing / .35) * Math.PI) : 0; c.rotate(-.3 - sw * 2.2); c.fillStyle = d.skin; Draw.rr(c, -5, 0, 10, 30, 5); c.fill(); c.strokeStyle = '#1b1540'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 30); c.lineTo(0, 48); c.stroke(); c.fillStyle = '#ff4f4f'; c.beginPath(); c.ellipse(0, 64, 13, 17, 0, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; for (let k = -8; k <= 8; k += 4) { c.beginPath(); c.moveTo(k, 48); c.lineTo(k, 80); c.stroke(); c.beginPath(); c.moveTo(-12, 64 + k); c.lineTo(12, 64 + k); c.stroke(); } c.restore();
      c.restore();
    }
    function drawCourt(c) {
      const g = geo(), W = g.W, H = g.H;
      const sky = c.createLinearGradient(0, 0, 0, g.farY); sky.addColorStop(0, '#5ad1ff'); sky.addColorStop(1, '#dff6ff'); c.fillStyle = sky; c.fillRect(0, 0, W, g.farY + 20);
      // tribunes
      c.fillStyle = '#2b2270'; c.fillRect(0, g.farY - 70, W, 80); for (let i = 0; i < 60; i++) { c.fillStyle = ['#ffd23f', '#ff4f9a', '#38e0d6', '#9dff5c', '#ff9f1c', '#fff'][i % 6]; c.beginPath(); c.arc((i * 53 + 20) % W, g.farY - 56 + (i % 3) * 20 + Math.sin(t * 3 + i) * 2, 6, 0, 7); c.fill(); }
      c.fillStyle = '#3fbf4f'; c.fillRect(0, g.farY + 10, W, H - g.farY);
      const p = (x, z) => proj(x, z, 0); const quad = (a, b, cc, d, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(a.x, a.gy); c.lineTo(b.x, b.gy); c.lineTo(cc.x, cc.gy); c.lineTo(d.x, d.gy); c.closePath(); c.fill(); };
      quad(p(-1.4, -.15), p(1.4, -.15), p(1.4, 1.15), p(-1.4, 1.15), '#2a8fb5'); quad(p(-1, 0), p(1, 0), p(1, 1), p(-1, 1), '#3a9fc8');
      c.strokeStyle = '#fff'; c.lineWidth = 3; const line = (x0, z0, x1, z1) => { const a = p(x0, z0), b = p(x1, z1); c.beginPath(); c.moveTo(a.x, a.gy); c.lineTo(b.x, b.gy); c.stroke(); };
      line(-1, 0, 1, 0); line(-1, 1, 1, 1); line(-1, 0, -1, 1); line(1, 0, 1, 1); line(-.8, 0, -.8, 1); line(.8, 0, .8, 1); line(-.8, .25, .8, .25); line(-.8, .75, .8, .75); line(0, .25, 0, .75);
      // filet
      const n0 = p(-1.1, .5), n1 = p(1.1, .5); const nh = (g.nearY - g.farY) * .9 * NET_H * n0.s;
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(n0.x, n0.gy - nh, n1.x - n0.x, nh); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; for (let x = n0.x; x < n1.x; x += 8) { c.beginPath(); c.moveTo(x, n0.gy - nh); c.lineTo(x, n0.gy); c.stroke(); } c.fillStyle = '#fff'; c.fillRect(n0.x, n0.gy - nh - 3, n1.x - n0.x, 3); c.fillStyle = '#1b1540'; c.fillRect(n0.x - 3, n0.gy - nh - 8, 6, nh + 8); c.fillRect(n1.x - 3, n0.gy - nh - 8, 6, nh + 8);
    }
    function drawBall(c) { if (!ball) return; const q = proj(ball.x, ball.z, ball.y); const sh = proj(ball.x, ball.z, 0); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(sh.x, sh.gy, 9 * sh.s, 4 * sh.s, 0, 0, 7); c.fill(); c.fillStyle = powerT > 0 ? '#fff' : '#d4ff3f'; c.shadowColor = '#d4ff3f'; c.shadowBlur = 10; c.beginPath(); c.arc(q.x, q.y, 9 * q.s + 2, 0, 7); c.fill(); c.shadowBlur = 0; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(q.x, q.y, 6 * q.s, .6, 2.4); c.stroke(); }
    function drawSelect(c) {
      const W = env.W, H = env.H; c.lineWidth = 5; c.strokeStyle = '#1b1540'; const fs0 = Math.min(26, W / 16); c.font = '900 ' + fs0 + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText('CHOISIS TON JOUEUR', W / 2, H * .1); Draw.text(c, 'CHOISIS TON JOUEUR', W / 2, H * .1, fs0, '#ffd23f');
      const cw = Math.min(150, (W - 30) / 4), x0 = W / 2 - cw * 2;
      TENNIS_CHARS.forEach((d, i) => { const x = x0 + i * cw, on = i === selIdx; c.fillStyle = on ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.2)'; Draw.rr(c, x + 5, H * .2, cw - 10, H * .5, 14); c.fill(); if (on) { c.strokeStyle = d.color; c.lineWidth = 3; c.stroke(); } const g = geo(); const fake = { def: d, x: ((x + cw / 2) - g.W / 2) / g.halfNear, z: 0, swing: on ? (t % 1.2 < .35 ? .35 - t % 1.2 : 0) : 0 }; const q = proj(fake.x, 0, 0); c.save(); c.translate(0, H * .62 - q.gy); c.scale(1, 1); drawPlayer(c, fake, false); c.restore(); Draw.text(c, d.name, x + cw / 2, H * .25, 18, '#1b1540'); Draw.text(c, d.desc, x + cw / 2, H * .66, 12, '#1b1540', 'center', 700); });
      Draw.text(c, 'Tape sur ton joueur pour entrer sur le court', W / 2, H * .8 + Math.sin(t * 4) * 3, Math.min(15, W / 28), '#1b1540', 'center', 800);
    }
    function draw(c) {
      const W = env.W, H = env.H; drawCourt(c);
      if (phase === 'select') { drawSelect(c); return; }
      drawPlayer(c, foe, true);
      if (ball && ball.z > .5) drawBall(c);
      drawPlayer(c, me, false);
      if (ball && ball.z <= .5) drawBall(c);
      pr.draw(c);
      if (flash > 0) { c.fillStyle = 'rgba(255,255,255,' + flash * .4 + ')'; c.fillRect(0, 0, W, H); }
      // tableau des scores
      c.fillStyle = 'rgba(27,21,64,.75)'; Draw.rr(c, 10, 10, 190, 52, 10); c.fill();
      const pt = (a, b) => a >= 3 && b >= 3 ? (a === b ? '40' : a > b ? 'AV' : '40') : PTS[Math.min(3, a)];
      Draw.text(c, me.def.name, 20, 26, 13, '#fff', 'left', 800); Draw.text(c, games[0] + '   ' + pt(pts[0], pts[1]), 190, 26, 14, serving === 'me' ? '#ffd23f' : '#fff', 'right', 800);
      Draw.text(c, foe.def.name, 20, 48, 13, '#b9b0e6', 'left', 800); Draw.text(c, games[1] + '   ' + pt(pts[1], pts[0]), 190, 48, 14, serving === 'foe' ? '#ffd23f' : '#b9b0e6', 'right', 800);
      if (phase === 'serve' && serving === 'me') Draw.text(c, 'FRAPPE pour servir', W / 2, H - 30, 15, '#fff', 'center', 800);
      if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 1.5); c.lineWidth = 6; c.strokeStyle = '#1b1540'; const fs = Math.min(30, W / 14); c.font = '900 ' + fs + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(msg, W / 2, H * .5); Draw.text(c, msg, W / 2, H * .5, fs, '#ffd23f'); c.globalAlpha = 1; }
    }
    if (saved && typeof saved.level === 'number') { level = clamp(saved.level | 0, 0, TENNIS_FOES.length - 1); selIdx = clamp(saved.selIdx | 0, 0, 3); score = saved.score | 0; startMatch(); }
    return { update, draw };
  }
});
