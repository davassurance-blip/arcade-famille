/* ===== Tennis Pop (dès 8 ans) — modèle Mario Tennis : lifté / slice / lob / amorti / smash, charge, coup droit & revers, tournoi ===== */
const TENNIS_CHARS = [
  { name: 'Léo', type: 'Équilibré', color: '#38e0d6', skin: '#ffb27a', hair: '#ff4f4f', speed: 1.55, power: 1.0, reach: .24, desc: 'Bon partout' },
  { name: 'Maya', type: 'Rapide', color: '#ff4f9a', skin: '#c98a5e', hair: '#1b1540', speed: 1.95, power: .85, reach: .24, desc: 'Court vite, frappe léger' },
  { name: 'Tom', type: 'Puissant', color: '#ff9f1c', skin: '#ffd9b3', hair: '#3a2a1a', speed: 1.25, power: 1.3, reach: .23, desc: 'Frappe fort, lent' },
  { name: 'Nour', type: 'Technique', color: '#9dff5c', skin: '#8a5a2b', hair: '#1b1540', speed: 1.5, power: 1.0, reach: .3, desc: 'Grande allonge, vise juste' }
];
const TENNIS_FOES = [
  { name: 'Lila', color: '#ffd23f', skin: '#ffd9b3', hair: '#ff9f1c', skill: .3 }, { name: 'Max', color: '#9b7bff', skin: '#c98a5e', hair: '#1b1540', skill: .5 },
  { name: 'Zoé', color: '#ff6a55', skin: '#ffb27a', hair: '#ffd23f', skill: .7 }, { name: 'La Championne', color: '#c9c9d6', skin: '#8a5a2b', hair: '#1b1540', skill: .88 }
];
GAMES.push({
  id: 'tennis', title: 'Tennis Pop', tagline: 'Lifté, slice, lob, amorti', minAge: 8, color: '#3fbf4f',
  icon: '<svg viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="8" fill="#3fbf4f"/><path d="M14 50L24 12h16l10 38z" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M10 50h44M19 31h26" stroke="#fff" stroke-width="2.5"/><circle cx="44" cy="20" r="6" fill="#d4ff3f"/><path d="M40 16q4 4 8 8" stroke="#fff" stroke-width="1.5" fill="none"/></svg>',
  howto: ['', 'Déplace-toi sur ta moitié de court. LIFTÉ (A) ou SLICE (B) quand la balle arrive ; maintiens le bouton pour charger un coup plus fort. Haut + coup = lob, Bas + coup = amorti. 3 jeux gagnés = match !', 'Tournoi de 4 adversaires. Lob quand l\'adversaire monte au filet, amorti quand il reste au fond, smash sur les balles hautes.'],
  pad: { dpad: true, buttons: [{ k: 'a', label: 'LIFTÉ' }, { k: 'b', label: 'SLICE' }], hint: 'Haut + coup = lob · Bas + coup = amorti' },
  stars: s => s >= 4000 ? 3 : s >= 2000 ? 2 : s >= 600 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env; const hard = env.tier >= 2;
    let phase = 'select', selIdx = 0, level = 0, score = 0, over = false, t = 0;
    let me, foe, ball, serving = 'me', serveT = 0, pts = [0, 0], games = [0, 0], rally = 0, msg = '', msgT = 0, bounces = { side: null, n: 0 }, pointT = 0, lastHitBy = null, flash = 0, pops = [], charge = null, chargeT = 0;
    const PTS = ['0', '15', '30', '40'];
    const pr = Particles();
    const NET_H = .075, G = 1.7, SPD = hard ? 1.1 : 1;
    const SHOTS = { // vz : vitesse en longueurs de court / s, vy : hauteur initiale, bounce : [vy, vz] après rebond
      topspin: { vz: .92, vy: .5, bounce: [.8, 1.0], c: '#ff9f1c', n: 'LIFTÉ' }, slice: { vz: .78, vy: .36, bounce: [.42, .78], c: '#5ad1ff', n: 'SLICE' },
      flat: { vz: .8, vy: .52, bounce: [.62, .9], c: '#fff', n: '' }, lob: { vz: .5, vy: 1.15, bounce: [.6, .9], c: '#c084fc', n: 'LOB' },
      drop: { vz: .36, vy: .55, bounce: [.3, .5], c: '#9dff5c', n: 'AMORTI' }, smash: { vz: 1.35, vy: -.1, bounce: [.6, .95], c: '#ff4f4f', n: 'SMASH !' }
    };
    const geo = () => { const W = env.W, H = env.H; const nearY = H - 60, farY = H * .2; const halfNear = Math.min(W * .47, 300), halfFar = halfNear * .4; return { W, H, nearY, farY, halfNear, halfFar }; };
    function proj(x, z, y) { const g = geo(); const half = g.halfNear + (g.halfFar - g.halfNear) * z; const sy = g.nearY + (g.farY - g.nearY) * z; const sc = 1 + (.4 - 1) * z; return { x: g.W / 2 + x * half, y: sy - y * (g.nearY - g.farY) * .85 * sc, s: sc, gy: sy }; }
    function persist() { env.save({ level, selIdx, score }, 'Match ' + (level + 1) + ' · ' + TENNIS_CHARS[selIdx].name + ' · ' + score + ' pts'); }
    function startMatch() {
      const d = TENNIS_CHARS[selIdx], f = TENNIS_FOES[level];
      me = { def: d, x: 0, z: .04, swing: 0, hand: 1, shotName: '', shotT: 0, far: false }; foe = { def: f, x: 0, z: .96, swing: 0, hand: 1, skill: Math.min(.95, f.skill + (hard ? .07 : 0)), tx: 0, tz: .96, shotName: '', shotT: 0, far: true };
      pts = [0, 0]; games = [0, 0]; serving = 'me'; phase = 'serve'; serveT = 0; ball = null; msg = 'Match ' + (level + 1) + ' · ' + f.name; msgT = 2.2; persist();
    }
    function newBall() { me.z = .04; foe.z = .96; const srv = serving === 'me' ? me : foe; ball = { x: srv.x, z: srv.z, y: .3, vx: 0, vz: 0, vy: 0, held: true, kind: 'flat', trail: [] }; bounces = { side: null, n: 0 }; lastHitBy = null; rally = 0; }
    function launch(who, kind, aimX, powerMul, fromY) {
      const p = who === 'me' ? me : foe, dir = who === 'me' ? 1 : -1, sh = SHOTS[kind], other = who === 'me' ? foe : me;
      const pw = (who === 'me' ? me.def.power : .9 + foe.skill * .3) * powerMul * SPD;
      ball.held = false; ball.kind = kind; ball.y = Math.max(fromY, .03); ball.z = p.z; ball.x = p.x + (ball.x - p.x) * .3;
      const dist = kind === 'drop' ? .62 : kind === 'lob' ? .96 : 1; const travel = Math.abs(dist - (who === 'me' ? ball.z : 1 - ball.z));
      ball.vz = dir * sh.vz * pw; ball.vy = sh.vy * (kind === 'smash' ? 1 : Math.sqrt(pw)); const tt = travel / Math.abs(ball.vz); ball.vx = (aimX - ball.x) / Math.max(.4, tt);
      p.swing = .4; p.shotName = sh.n; p.shotT = sh.n ? .9 : 0; lastHitBy = who; bounces = { side: null, n: 0 }; rally++; ball.trail = [];
      sfx.pop(); env.vibe(8); if (powerMul > 1.15) { flash = .15; sfx.ok(); }
    }
    function playerHit(kind, charged, perfect) {
      const steer = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0); const side = Math.sign(ball.x - me.x) || 1; me.hand = side; // coup droit à droite, revers à gauche
      const back = side < 0 && !charged ? .92 : 1; let aimX = steer ? steer * .78 : (-side * .35 + rnd(-.25, .25)); if (kind === 'drop') aimX *= .5;
      const high = ball.y > .22 && kind !== 'lob' && kind !== 'drop'; if (high) kind = 'smash';
      const mult = (charged ? 1.22 : 1) * (perfect ? 1.15 : 1) * back; launch('me', kind, clamp(aimX, -.95, .95), mult, ball.y);
      if (perfect) { pops.push({ x: me.x, z: me.z, txt: 'PARFAIT !', t: 1, c: '#ffd23f' }); score += 20; pr.burst(proj(me.x, me.z, .3).x, proj(me.x, me.z, .3).y, '#ffd23f', 12, 160); }
      else if (kind === 'smash') pops.push({ x: me.x, z: me.z, txt: 'SMASH !', t: 1, c: '#ff4f4f' });
      else if (kind === 'lob' || kind === 'drop') pops.push({ x: me.x, z: me.z, txt: SHOTS[kind].n, t: .8, c: SHOTS[kind].c });
      else pops.push({ x: me.x, z: me.z, txt: side < 0 ? 'Revers' : 'Coup droit', t: .7, c: '#fff' });
    }
    function foeHit() {
      const high = ball.y > .22; let kind = 'topspin'; const r = Math.random(), sk = foe.skill;
      if (high) kind = 'smash'; else if (me.z > .22 && r < .45 * sk + .1) kind = 'lob'; else if (me.z < .1 && r < .25 * sk) kind = 'drop'; else if (r < .35) kind = 'slice';
      foe.hand = Math.sign(ball.x - foe.x) || 1; const away = -Math.sign(me.x || rnd(-1, 1)); let aimX = clamp(away * rnd(.25, .85) * (.5 + sk * .5) + rnd(-.5, .5) * (1 - sk), -1.1, 1.1); if (kind === 'drop') aimX *= .4;
      launch('foe', kind, aimX, .95 + sk * .25 + (Math.random() < sk * .3 ? .2 : 0), ball.y); if (kind !== 'topspin' && kind !== 'slice') pops.push({ x: foe.x, z: foe.z, txt: SHOTS[kind].n, t: .8, c: SHOTS[kind].c });
    }
    function point(winner, reason) {
      phase = 'point'; pointT = 1.7; pts[winner]++; msg = reason; msgT = 1.7; charge = null; if (winner === 0) { score += 50 + rally * 10; sfx.coin(); } else sfx.ko();
      const a = pts[0], b = pts[1];
      if (a >= 4 && a - b >= 2) winGame(0); else if (b >= 4 && b - a >= 2) winGame(1);
      else if (a >= 3 && b >= 3) msg += a === b ? ' · Égalité' : ' · Avantage ' + (a > b ? me.def.name : foe.def.name);
      else msg += ' · ' + PTS[a] + ' - ' + PTS[b];
    }
    function winGame(w) {
      games[w]++; pts = [0, 0]; serving = serving === 'me' ? 'foe' : 'me'; msg = (w === 0 ? 'JEU ' + me.def.name + ' !' : 'Jeu ' + foe.def.name) + ' · ' + games[0] + ' - ' + games[1]; msgT = 2.2; pointT = 2.4;
      if (w === 0) { score += 300; sfx.win(); }
      if (games[w] >= 3) {
        if (w === 0) { score += 1000 * (level + 1); level++; if (level >= TENNIS_FOES.length) { over = true; setTimeout(() => env.gameOver(score, { win: true, title: 'CHAMPION !', text: 'Tournoi remporté' }), 1500); return; } phase = 'won'; pointT = 2.6; msg = 'MATCH GAGNÉ ' + games[0] + ' - ' + games[1] + ' !'; msgT = 2.6; persist(); }
        else { over = true; setTimeout(() => env.gameOver(score, { text: 'Battu par ' + foe.def.name + ' ' + games[1] + ' - ' + games[0] + ' au match ' + (level + 1) }), 1500); }
      }
    }
    function moveMe(dt) {
      const slow = charge ? .6 : 1, spd = me.def.speed * slow; let dx = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0), dz = (input.held.up ? 1 : 0) - (input.held.down ? 1 : 0);
      if (input.pointer.down) { const g = geo(); const tx = (input.pointer.x - g.W / 2) / g.halfNear; dx = clamp((tx - me.x) * 6, -1, 1); }
      me.x = clamp(me.x + dx * spd * dt, -1.3, 1.3); me.z = clamp(me.z + dz * spd * .7 * dt, .0, .42);
    }
    function update(dt) {
      if (over) return; t += dt; msgT = Math.max(0, msgT - dt); flash = Math.max(0, flash - dt); pr.update(dt);
      for (let i = pops.length - 1; i >= 0; i--) { pops[i].t -= dt; if (pops[i].t <= 0) pops.splice(i, 1); }
      if (phase === 'select') { if (input.pressed.left) { selIdx = (selIdx + 3) % 4; sfx.tap(); } if (input.pressed.right) { selIdx = (selIdx + 1) % 4; sfx.tap(); } if (input.tap) { const W = env.W, cw = Math.min(150, (W - 30) / 4), x0 = W / 2 - cw * 2; const i = Math.floor((input.tap.x - x0) / cw); if (i >= 0 && i < 4 && input.tap.y > env.H * .2 && input.tap.y < env.H * .7) { if (selIdx === i) startMatch(); else { selIdx = i; sfx.tap(); } } else if (input.tap.y >= env.H * .7) startMatch(); } if (input.pressed.a || input.pressed.b) startMatch(); return; }
      if (phase === 'won') { pointT -= dt; if (pointT <= 0) startMatch(); return; }
      me.swing = Math.max(0, me.swing - dt); foe.swing = Math.max(0, foe.swing - dt); me.shotT = Math.max(0, me.shotT - dt); foe.shotT = Math.max(0, foe.shotT - dt);
      if (phase === 'point') { pointT -= dt; if (ball && !ball.held) { ball.vy -= G * dt; ball.y += ball.vy * dt; ball.x += ball.vx * dt; ball.z += ball.vz * dt; if (ball.y < 0) { ball.y = 0; ball.vy *= -.4; ball.vx *= .7; ball.vz *= .7; } } if (pointT <= 0) { phase = 'serve'; serveT = 0; ball = null; } return; }
      if (phase === 'serve') {
        if (!ball) newBall(); serveT += dt; const srv = serving === 'me' ? me : foe;
        if (serving === 'me') { let dx = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0); me.x = clamp(me.x + dx * 1.2 * dt, -.9, .9); }
        ball.x = srv.x; ball.z = srv.z; ball.y = .3 + Math.sin(t * 6) * .04;
        if (serving === 'me') { const a = input.pressed.a || input.tap, b = input.pressed.b; if (a || b || serveT > 5) { launch('me', b ? 'slice' : 'topspin', clamp(-me.x * .5 + rnd(-.4, .4), -.8, .8), 1.05, .4); phase = 'rally'; } }
        else { foe.x += (0 - foe.x) * Math.min(1, dt * 3); if (serveT > 1.3) { launch('foe', Math.random() < .7 ? 'topspin' : 'slice', clamp(rnd(-.7, .7), -.8, .8), .95 + foe.skill * .25, .4); phase = 'rally'; } }
        return;
      }
      // --- échange
      moveMe(dt);
      // charge : maintenir A ou B
      const held = input.held.a ? 'topspin' : input.held.b ? 'slice' : null; if (held) { if (charge !== held) { charge = held; chargeT = 0; } chargeT += dt; } else charge = null;
      ball.vy -= G * dt; ball.y += ball.vy * dt; ball.x += ball.vx * dt; ball.z += ball.vz * dt;
      ball.trail.push([ball.x, ball.z, ball.y]); if (ball.trail.length > 10) ball.trail.shift();
      if ((ball.z - ball.vz * dt - .5) * (ball.z - .5) <= 0 && ball.y < NET_H) { ball.vz *= -.15; ball.vx *= .3; ball.vy = Math.min(ball.vy, 0); sfx.hit(); point(lastHitBy === 'me' ? 1 : 0, 'Filet !'); return; }
      if (ball.y <= 0) {
        const sh = SHOTS[ball.kind]; ball.y = 0; ball.vy = Math.abs(ball.vy) * sh.bounce[0]; ball.vz *= sh.bounce[1]; ball.vx *= .92; sfx.tick();
        const side = ball.z < .5 ? 'me' : 'foe'; const out = Math.abs(ball.x) > 1.02 || ball.z < -.02 || ball.z > 1.02;
        pr.burst(proj(ball.x, ball.z, 0).x, proj(ball.x, ball.z, 0).gy, '#fff', 4, 60);
        if (out) { point(lastHitBy === 'me' ? 1 : 0, 'Faute !'); return; }
        if (bounces.side === side) { bounces.n++; if (bounces.n >= 2) { point(side === 'me' ? 1 : 0, side === 'me' ? 'Point ' + foe.def.name : 'Point ' + me.def.name + ' !'); return; } } else bounces = { side, n: 1 };
      }
      if (ball.z < -.4 || ball.z > 1.4 || ball.y < -.1) { point(lastHitBy === 'me' ? 1 : 0, 'Faute !'); return; }
      // --- frappe du joueur
      if (ball.vz < 0 && lastHitBy !== 'me' && !ball.justHit) {
        const reach = me.def.reach + (charge ? .03 : 0); const inX = Math.abs(ball.x - me.x) < reach, inZ = ball.z > me.z - .06 && ball.z < me.z + .16, low = ball.y < .5;
        if (inX && inZ && low) {
          const pressA = input.pressed.a, pressB = input.pressed.b; const lobMod = input.held.up, dropMod = input.held.down;
          const perfectWin = ball.z > me.z - .02 && ball.z < me.z + .07;
          if (pressA || pressB) { let k = pressB ? 'slice' : 'topspin'; if (lobMod) k = 'lob'; else if (dropMod) k = 'drop'; playerHit(k, false, perfectWin); ball.justHit = .25; }
          else if (charge && ball.z < me.z + .08) { let k = charge; if (lobMod) k = 'lob'; else if (dropMod) k = 'drop'; playerHit(k, chargeT > .25, false); ball.justHit = .25; }
          else if (ball.z < me.z + .03) { playerHit('flat', false, false); me.shotName = ''; pops.pop(); ball.justHit = .25; } // renvoi automatique faible
        }
      }
      if (ball.justHit) { ball.justHit -= dt; if (ball.justHit <= 0) ball.justHit = 0; }
      // --- adversaire : se place en 2D, choisit son coup
      if (ball.vz > 0 && lastHitBy === 'me') { const tz = ball.kind === 'drop' ? .66 : ball.kind === 'lob' ? .92 : .9; const tt = Math.max(0, (tz - ball.z) / Math.max(.15, ball.vz)); foe.tx = clamp(ball.x + ball.vx * tt * (.6 + foe.skill * .4), -1.25, 1.25); foe.tz = clamp(tz + (1 - foe.skill) * .06, .58, .98); }
      else { foe.tx = foe.tx * .95; foe.tz = .94; }
      const fs = (.9 + foe.skill * 1.2); foe.x += clamp(foe.tx - foe.x, -fs * dt, fs * dt); foe.z += clamp(foe.tz - foe.z, -fs * .7 * dt, fs * .7 * dt);
      if (ball.vz > 0 && lastHitBy === 'me' && ball.z > foe.z - .16 && ball.z < foe.z + .06 && ball.y < .5 && Math.abs(ball.x - foe.x) < .24 + foe.skill * .1) { foeHit(); }
      env.setScore(score); env.hud('Match ' + (level + 1) + ' · ' + games[0] + '-' + games[1] + ' · ' + (pts[0] >= 3 && pts[1] >= 3 ? (pts[0] === pts[1] ? '40-40' : pts[0] > pts[1] ? 'AV-40' : '40-AV') : PTS[Math.min(3, pts[0])] + '-' + PTS[Math.min(3, pts[1])]));
    }
    // --- dessin
    function drawPlayer(c, p) {
      const q = proj(p.x, p.z, 0), s = q.s * (p.far ? 1.05 : 1.25), d = p.def;
      c.save(); c.translate(q.x, q.gy); c.scale(s, s);
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 4, 26, 7, 0, 0, 7); c.fill();
      const sw = p.swing > 0 ? Math.sin((1 - p.swing / .4) * Math.PI) : 0, hand = p.hand, charging = !p.far && charge && phase === 'rally';
      c.lineWidth = 2.5; c.strokeStyle = '#1b1540';
      const leg = (x) => { Draw.rr(c, x, -48, 12, 44, 6); c.fillStyle = '#fff'; c.fill(); c.stroke(); }; leg(-16); leg(4);
      Draw.rr(c, -20, -96, 40, 52, 12); c.fillStyle = d.color; c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-18, -70, 36, 4);
      c.beginPath(); c.arc(0, -112, 16, 0, 7); c.fillStyle = d.skin; c.fill(); c.stroke(); c.beginPath(); c.arc(0, -118, 16, Math.PI, 0); c.closePath(); c.fillStyle = d.hair; c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(-16, -112, 32, 5);
      c.fillStyle = '#1b1540'; c.fillRect(3, -112, 4, 4); c.fillRect(10, -112, 4, 4);
      // bras + raquette : coup droit (main droite) ou revers (deux mains, raquette à gauche)
      c.save(); c.translate(18 * hand, -86); c.scale(hand, 1); c.rotate(-.3 - sw * 2.4 + (charging ? -1.0 : 0));
      Draw.rr(c, -5, 0, 10, 30, 5); c.fillStyle = d.skin; c.fill(); c.stroke(); c.lineWidth = 3; c.beginPath(); c.moveTo(0, 30); c.lineTo(0, 48); c.stroke(); c.beginPath(); c.ellipse(0, 64, 13, 17, 0, 0, 7); c.fillStyle = charging ? '#ffd23f' : '#ff4f4f'; c.fill(); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1; for (let k = -8; k <= 8; k += 4) { c.beginPath(); c.moveTo(k, 48); c.lineTo(k, 80); c.stroke(); c.beginPath(); c.moveTo(-12, 64 + k); c.lineTo(12, 64 + k); c.stroke(); }
      if (sw > .4) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 70, .2, 1.4); c.stroke(); }
      c.restore();
      if (hand < 0) { c.save(); c.translate(-6, -86); c.rotate(.6 - sw * 1.5); Draw.rr(c, -5, 0, 10, 26, 5); c.fillStyle = d.skin; c.fill(); c.strokeStyle = '#1b1540'; c.lineWidth = 2.5; c.stroke(); c.restore(); }
      c.restore();
      if (p.shotT > 0) { c.globalAlpha = Math.min(1, p.shotT * 2); Draw.text(c, p.shotName, q.x, q.gy - 150 * s, 15, SHOTS[(p.shotName || '').toLowerCase() === 'lifté' ? 'topspin' : 'flat'].c, 'center', 900); c.globalAlpha = 1; }
    }
    function drawCourt(c) {
      const g = geo(), W = g.W, H = g.H;
      const sky = c.createLinearGradient(0, 0, 0, g.farY); sky.addColorStop(0, '#5ad1ff'); sky.addColorStop(1, '#dff6ff'); c.fillStyle = sky; c.fillRect(0, 0, W, g.farY + 20);
      c.fillStyle = '#2b2270'; c.fillRect(0, g.farY - 70, W, 80); for (let i = 0; i < 60; i++) { c.fillStyle = ['#ffd23f', '#ff4f9a', '#38e0d6', '#9dff5c', '#ff9f1c', '#fff'][i % 6]; c.beginPath(); c.arc((i * 53 + 20) % W, g.farY - 56 + (i % 3) * 20 + Math.sin(t * 3 + i) * 2, 6, 0, 7); c.fill(); }
      c.fillStyle = '#3fbf4f'; c.fillRect(0, g.farY + 10, W, H - g.farY);
      const p = (x, z) => proj(x, z, 0); const quad = (a, b, cc, d, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(a.x, a.gy); c.lineTo(b.x, b.gy); c.lineTo(cc.x, cc.gy); c.lineTo(d.x, d.gy); c.closePath(); c.fill(); };
      quad(p(-1.45, -.12), p(1.45, -.12), p(1.45, 1.12), p(-1.45, 1.12), '#2a8fb5'); quad(p(-1, 0), p(1, 0), p(1, 1), p(-1, 1), '#3a9fc8');
      c.strokeStyle = '#fff'; c.lineWidth = 3; const line = (x0, z0, x1, z1) => { const a = p(x0, z0), b = p(x1, z1); c.beginPath(); c.moveTo(a.x, a.gy); c.lineTo(b.x, b.gy); c.stroke(); };
      line(-1, 0, 1, 0); line(-1, 1, 1, 1); line(-1, 0, -1, 1); line(1, 0, 1, 1); line(-.8, 0, -.8, 1); line(.8, 0, .8, 1); line(-.8, .25, .8, .25); line(-.8, .75, .8, .75); line(0, .25, 0, .75);
      const n0 = p(-1.1, .5), n1 = p(1.1, .5); const nh = (g.nearY - g.farY) * .85 * NET_H * n0.s;
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(n0.x, n0.gy - nh, n1.x - n0.x, nh); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; for (let x = n0.x; x < n1.x; x += 8) { c.beginPath(); c.moveTo(x, n0.gy - nh); c.lineTo(x, n0.gy); c.stroke(); } c.fillStyle = '#fff'; c.fillRect(n0.x, n0.gy - nh - 3, n1.x - n0.x, 3); c.fillStyle = '#1b1540'; c.fillRect(n0.x - 3, n0.gy - nh - 8, 6, nh + 8); c.fillRect(n1.x - 3, n0.gy - nh - 8, 6, nh + 8);
    }
    function drawBall(c) {
      if (!ball) return; const sh = SHOTS[ball.kind] || SHOTS.flat;
      if (!ball.held) ball.trail.forEach((tr, i) => { const q = proj(tr[0], tr[1], tr[2]); c.globalAlpha = i / ball.trail.length * .5; c.fillStyle = sh.c; c.beginPath(); c.arc(q.x, q.y, (4 + i * .5) * q.s, 0, 7); c.fill(); }); c.globalAlpha = 1;
      const q = proj(ball.x, ball.z, ball.y), s0 = proj(ball.x, ball.z, 0); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(s0.x, s0.gy, 9 * s0.s, 4 * s0.s, 0, 0, 7); c.fill();
      c.fillStyle = '#d4ff3f'; c.shadowColor = '#d4ff3f'; c.shadowBlur = 10; c.beginPath(); c.arc(q.x, q.y, 9 * q.s + 2, 0, 7); c.fill(); c.shadowBlur = 0; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(q.x, q.y, 6 * q.s, .6, 2.4); c.stroke();
    }
    function drawSelect(c) {
      const W = env.W, H = env.H; c.lineWidth = 5; c.strokeStyle = '#1b1540'; const fs0 = Math.min(26, W / 16); c.font = '900 ' + fs0 + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText('CHOISIS TON JOUEUR', W / 2, H * .1); Draw.text(c, 'CHOISIS TON JOUEUR', W / 2, H * .1, fs0, '#ffd23f');
      const cw = Math.min(150, (W - 30) / 4), x0 = W / 2 - cw * 2;
      TENNIS_CHARS.forEach((d, i) => { const x = x0 + i * cw, on = i === selIdx; c.fillStyle = on ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.2)'; Draw.rr(c, x + 5, H * .2, cw - 10, H * .5, 14); c.fill(); if (on) { c.strokeStyle = d.color; c.lineWidth = 3; c.stroke(); } const g = geo(); const fake = { def: d, x: ((x + cw / 2) - g.W / 2) / g.halfNear, z: 0, swing: on ? Math.max(0, .4 - t % 1.4) : 0, hand: 1, shotT: 0, far: false }; const q = proj(fake.x, 0, 0); c.save(); c.translate(0, H * .62 - q.gy); drawPlayer(c, fake); c.restore(); Draw.text(c, d.name, x + cw / 2, H * .25, 18, '#1b1540'); Draw.text(c, d.type, x + cw / 2, H * .3, 12, '#1b1540', 'center', 800); if (cw > 120) Draw.text(c, d.desc, x + cw / 2, H * .66, 11, '#1b1540', 'center', 700); });
      if (cw <= 120) Draw.text(c, TENNIS_CHARS[selIdx].desc, W / 2, H * .74, 13, '#1b1540', 'center', 800);
      Draw.text(c, 'Tape sur ton joueur pour entrer sur le court', W / 2, H * .8 + Math.sin(t * 4) * 3, Math.min(15, W / 28), '#1b1540', 'center', 800);
    }
    function draw(c) {
      const W = env.W, H = env.H; drawCourt(c);
      if (phase === 'select') { drawSelect(c); return; }
      drawPlayer(c, foe); if (ball && ball.z > .5) drawBall(c); drawPlayer(c, me); if (ball && ball.z <= .5) drawBall(c);
      pr.draw(c);
      for (const p of pops) { const q = proj(p.x, p.z, .9); c.globalAlpha = Math.min(1, p.t * 2); c.lineWidth = 4; c.strokeStyle = '#1b1540'; c.font = '900 18px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(p.txt, q.x, q.y - (1 - p.t) * 30); Draw.text(c, p.txt, q.x, q.y - (1 - p.t) * 30, 18, p.c); c.globalAlpha = 1; }
      if (flash > 0) { c.fillStyle = 'rgba(255,255,255,' + flash * .5 + ')'; c.fillRect(0, 0, W, H); }
      c.fillStyle = 'rgba(27,21,64,.75)'; Draw.rr(c, 10, 10, 190, 52, 10); c.fill();
      const pt = (a, b) => a >= 3 && b >= 3 ? (a === b ? '40' : a > b ? 'AV' : '40') : PTS[Math.min(3, a)];
      Draw.text(c, me.def.name, 20, 26, 13, '#fff', 'left', 800); Draw.text(c, games[0] + '   ' + pt(pts[0], pts[1]), 190, 26, 14, serving === 'me' ? '#ffd23f' : '#fff', 'right', 800);
      Draw.text(c, foe.def.name, 20, 48, 13, '#b9b0e6', 'left', 800); Draw.text(c, games[1] + '   ' + pt(pts[1], pts[0]), 190, 48, 14, serving === 'foe' ? '#ffd23f' : '#b9b0e6', 'right', 800);
      if (charge) { const q = proj(me.x, me.z, 0); c.fillStyle = 'rgba(0,0,0,.4)'; Draw.rr(c, q.x - 24, q.gy + 8, 48, 7, 3); c.fill(); c.fillStyle = chargeT > .25 ? '#ffd23f' : '#fff'; Draw.rr(c, q.x - 24, q.gy + 8, 48 * Math.min(1, chargeT / .25), 7, 3); c.fill(); }
      if (phase === 'serve' && serving === 'me') Draw.text(c, 'LIFTÉ ou SLICE pour servir · ◀ ▶ pour te placer', W / 2, H - 28, 13, '#fff', 'center', 800);
      if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 1.5); c.lineWidth = 6; c.strokeStyle = '#1b1540'; const fs = Math.min(30, W / 14); c.font = '900 ' + fs + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(msg, W / 2, H * .5); Draw.text(c, msg, W / 2, H * .5, fs, '#ffd23f'); c.globalAlpha = 1; }
    }
    if (saved && typeof saved.level === 'number') { level = clamp(saved.level | 0, 0, TENNIS_FOES.length - 1); selIdx = clamp(saved.selIdx | 0, 0, 3); score = saved.score | 0; startMatch(); }
    return { update, draw, dbg: () => ({ ball, me, foe, phase, pts, games, rally }) };
  }
});
