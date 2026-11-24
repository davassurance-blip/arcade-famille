/* ===== Ping-Pong (dès 4 ans) — championnat : 3 coupes, 9 adversaires de plus en plus forts, coups liftés / coupés / smashs / effets =====
   La balle va d'une raquette à l'autre en rebondissant une fois (u de 0 à 1, rebond à UB). Chaque coup change sa durée, son arc,
   son accélération après le rebond (kick) et sa courbe. L'adversaire a un temps de réaction, une vitesse, et rate plus ou moins selon le coup reçu. */
const PING_FOES = [ // nom, peau, maillot, cheveux, vitesse, durée de balle, placement, fautes, lecture des effets, lift, coupé, effet, smash, réaction, style
  ['Pipo', '#ffb347', '#e8452c', '#7a4a21', 1.3, 1.3, .15, .24, .2, 0, 0, 0, 0, .3, 'Il débute : il renvoie au milieu.'],
  ['Lila', '#f6c9a0', '#7c5cff', '#ffd23f', 2.2, 1.2, .25, .2, .3, 0, 0, 0, 0, .22, 'Rapide, mais elle fait des fautes.'],
  ['Max', '#d9a066', '#3fbf4f', '#1b1540', 1.6, 1, .35, .16, .35, .15, 0, 0, .05, .2, 'Il tape fort. Fais-le courir !'],
  ['Zoé', '#f6c9a0', '#ff4f9a', '#b5642a', 2, 1.02, .45, .12, .5, .45, 0, .05, .05, .16, 'Ses balles liftées accélèrent après le rebond.'],
  ['Kenji', '#eac086', '#38a0e0', '#1b1540', 2.2, 1.05, .5, .1, .75, .1, .45, .1, .05, .14, 'Il coupe tout : ses balles sont lentes et basses.'],
  ['Nina', '#c68642', '#ff9f1c', '#3a2414', 2.3, .98, .62, .1, .6, .2, .1, .1, .12, .14, 'Elle vise toujours le coin où tu n\'es pas.'],
  ['Igor', '#f1c27d', '#c0392b', '#e8e8f0', 2.5, .86, .6, .08, .65, .3, .05, .1, .3, .1, 'Le smasheur. Ne lui laisse pas le temps.'],
  ['Sora', '#eac086', '#00b894', '#6c5ce7', 2.8, .84, .7, .06, .85, .2, .2, .45, .15, .08, 'Ses balles tournent : suis la balle, pas la ligne.'],
  ['Maître Ping', '#e0c9a6', '#ffd23f', '#ffffff', 3, .8, .75, .05, .9, .3, .2, .25, .25, .07, 'Le champion. Il sait tout faire.']];
const PING_CUPS = [['Coupe de Bronze', '#cd7f32', '#1f8f5a', '#2bb673', '#3a2a8a', '#5b46c9'], ['Coupe d\'Argent', '#c9d1e0', '#1d5fa8', '#2f86d6', '#16324f', '#2a5d8a'], ['Coupe d\'Or', '#ffd23f', '#7a1f3d', '#b0305a', '#2a1238', '#5a2470']];
GAMES.push({
  id: 'ping', title: 'Ping-Pong', tagline: 'Championnat : 3 coupes, 9 adversaires', minAge: 4, color: '#2bb673',
  icon: '<svg viewBox="0 0 64 64"><rect x="4" y="34" width="56" height="20" rx="4" fill="#1f8f5a"/><path d="M4 44h56M32 34v20" stroke="#fff" stroke-width="2"/><circle cx="24" cy="22" r="14" fill="#e8452c" stroke="#1b1540" stroke-width="3"/><rect x="32" y="30" width="7" height="16" rx="3" transform="rotate(-40 35 32)" fill="#d9a066" stroke="#1b1540" stroke-width="2.5"/><circle cx="49" cy="16" r="6" fill="#fff" stroke="#1b1540" stroke-width="2.5"/></svg>',
  howto: ['Glisse ton doigt : la raquette le suit. Mets-la devant la balle, elle repart toute seule ! Gagne les 3 coupes.', 'La raquette suit ton doigt. Pousse vers l\'AVANT en frappant pour un LIFT (rapide), tire vers l\'ARRIÈRE pour un COUPÉ (lent), tape sur la balle pour une FRAPPE sèche. Balle haute ? Le SMASH part tout seul !', 'Lift, coupé, effet sur le côté, smash sur les balles hautes. Vise les lignes, mais pas dehors ! 9 adversaires, 3 coupes.'],
  pad: null, /* tout se joue au doigt sur la table (au clavier : flèches, Espace = lift, X = coupé) */
  stars: s => s >= 4000 ? 3 : s >= 1500 ? 2 : s >= 300 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env, tier = env.tier, pr = Particles();
    const FONT = getComputedStyle(document.body).getPropertyValue('--font-display');
    const HW = [.36, .27, .23][tier], HWC = .24, UB = .72, ROUNDS = ['Quart de finale', 'Demi-finale', 'FINALE'];
    const TYPES = { n: { T: 1, a: .2, b: .15, k: 1, col: '255,255,255' }, lift: { T: .8, a: .13, b: .1, k: 1.45, col: '255,140,40' }, cut: { T: 1.28, a: .22, b: .06, k: .7, col: '90,200,255' }, side: { T: .95, a: .18, b: .13, k: 1.1, col: '200,130,255' }, smash: { T: .6, a: .07, b: .08, k: 1.2, col: '255,220,60' }, lob: { T: 1.5, a: .5, b: .34, k: .85, col: '255,255,255' } };
    let idx = 0, score = 0, hearts = 3, over = false, t = 0, me = 0, foe = 0, px = 0, pv = 0, pvy = 0, cx = 0, cTarget = 0, ball = null, wait = 1.2, server = 0, rally = 0, msg = '', msgT = 0, msgCol = '#ffd23f', swingP = 0, swingC = 0, matchT = 0, lastPx = 0, lastPy = null, trail = [], foeMood = 0, phase = 'intro', introT = 0, downT = 9, pyo = 0, cupWon = -1, flash = 0;
    S.ping = S.ping || {}; if (!saved && S.ping[env.profile.id]) saved = S.ping[env.profile.id]; // championnat gardé par joueur, même après « Menu »
    if (saved) { idx = clamp((saved.idx != null ? saved.idx : (saved.level || 1) - 1) | 0, 0, 8); score = Math.max(0, saved.score | 0); hearts = clamp(saved.hearts == null ? 3 : saved.hearts | 0, 1, 3); }
    const F = () => PING_FOES[idx], cup = () => Math.floor(idx / 3), GOAL = () => tier === 0 ? 4 : cup() === 0 ? 5 : 7;
    // caractéristiques de l'adversaire, adaptées à l'âge du joueur
    const st = () => { const f = F(), e = tier === 0, h = tier === 2; return { v: f[4] * (e ? .75 : h ? 1.1 : 1), T: f[5] * (e ? 1.3 : h ? .92 : 1), place: f[6] * (e ? .6 : 1), err: f[7] * (h ? .8 : 1) + (e ? .08 : 0), spin: f[8], lift: e && idx < 6 ? 0 : f[9], cut: e && idx < 6 ? 0 : f[10], side: e ? 0 : f[11], smash: e ? f[12] * .4 : f[12], delay: f[13] + (e ? .12 : 0) }; };
    const G = {};
    function geo() { const W = env.W, H = env.H, land = W > H; G.land = land; G.wn = land ? Math.min(W * .34, H * .62) : Math.min(W * .47, H * .4); G.yn = H * (land ? .8 : .82); G.yf = H * (land ? .4 : .36); G.D = 1.15; const sf = 1 / (1 + G.D); G.yh = (G.yf - sf * G.yn) / (1 - sf); }
    const P = (x, y, h) => { const s = 1 / (1 + (1 - y) * G.D); return { x: env.W / 2 + x * G.wn * s, y: G.yh + (G.yn - G.yh) * s - (h || 0) * G.wn * 1.5 * s, s }; };
    const say = (m, d, col) => { msg = m; msgT = d || 1.2; msgCol = col || '#ffd23f'; };
    const persist = () => { S.ping[env.profile.id] = { idx, score, hearts }; env.save({ idx, score, hearts }, PING_CUPS[cup()][0] + ' · ' + ROUNDS[idx % 3] + ' · ' + F()[0]); };
    function shoot(fromMe, x0, x1, T, type, extra) {
      const ty = TYPES[type]; ball = Object.assign({ fromMe, type, x0, y0: fromMe ? 1.03 : -.03, x1, y1: fromMe ? -.03 : 1.03, T: T * ty.T, u: 0, a: ty.a, b: ty.b, kick: ty.k, curve: 0, col: ty.col, dead: 0, out: false, react: 0, x: x0, y: fromMe ? 1.03 : -.03, h: .1 }, extra || {}); trail = [];
      if (fromMe) { const s = st(); ball.react = s.delay * (type === 'smash' ? 1.6 : 1); ball.noise = rnd(-1, 1) * .1 * (1 - s.spin); }
    }
    const stats = { ms: 0, fs: 0 };
    function serve() { rally = 0; if (me + foe === 0 && idx > 0) say('Ta raquette : niveau ' + (idx + 1), 1.4, '#9dff5c'); const s = st(), T = server === 0 ? [1.7, 1.35, 1.2][tier] : Math.max(1.05, s.T * 1.2); if (server === 0) { shoot(true, px, clamp(px * .3 + rnd(-.3, .3), -.7, .7), T, 'n'); swingP = .2; } else { shoot(false, cx, clamp(rnd(-.5, .5), -.8, .8), T, 'n'); swingC = .2; } sfx.pop(); }
    function point(mine, why) {
      if (mine) { me++; score += 10 + Math.min(30, rally * 2); sfx.coin(); foeMood = -1.6; say(why || (rally >= 8 ? 'Quel échange !' : pick(['Point !', 'Bien joué !', 'Bravo !'])), 1.2, '#9dff5c'); }
      else { foe++; sfx.ko(); env.vibe(80); foeMood = 1.6; say(why || 'Point pour ' + F()[0], 1.2, '#ff8fb8'); }
      ball = null; wait = 1.3; if ((me + foe) % 2 === 0) server = 1 - server; if (me >= GOAL() || foe >= GOAL()) matchT = 2.2;
    }
    function cpuReturn(b) { // l'adversaire a touché la balle : que renvoie-t-il ?
      const s = st(), margin = Math.abs(cx - b.x1) / HWC; rally++; swingC = .2;
      const hard = b.type === 'lift' ? 2.2 : b.type === 'cut' ? 1.5 : b.type === 'side' ? 2 : 0, pErr = b.type === 'smash' ? 1 - (.12 + .5 * s.spin) : s.err * (1 + hard * (1 - s.spin)) + rally * .012 + (margin > .75 ? .12 : 0);
      if (Math.random() < pErr) { sfx.pop(); if (Math.random() < .5) shoot(false, b.x1, rnd(-.4, .4), s.T, 'n', { fault: 'net' }); else shoot(false, b.x1, (b.x1 >= 0 ? 1 : -1) * rnd(1.6, 1.85), s.T, 'n'); foeMood = -1; return; }
      const pace = Math.max(.6, s.T * Math.max(.72, 1 - rally * .02));
      if (margin > .62 || b.type === 'smash' || (b.type === 'cut' && Math.random() < (1 - s.spin) * .65) || (b.type === 'lift' && Math.random() < (1 - s.spin) * .4) || (b.type === 'side' && Math.random() < (1 - s.spin) * .4)) { sfx.pop(); shoot(false, b.x1, rnd(-.5, .5), s.T, 'lob'); return; } // en difficulté : balle haute
      const away = px > 0 ? -1 : 1, x1 = Math.random() < s.place ? away * rnd(.4, .78) : rnd(-.5, .5), r = Math.random(), high = b.type === 'cut' || b.weak; /* l'adversaire ne smashe que sur une balle haute ou molle, comme le joueur */
      if (high && Math.random() < Math.min(.7, s.smash * 2.2)) { stats.fs++; shoot(false, b.x1, away * rnd(.25, .7), pace, 'smash'); sfx.punch(); say('Smash de ' + F()[0] + ' !', .7, '#ff8fb8'); flash = .12; }
      else if (r < s.lift) { shoot(false, b.x1, x1, pace, 'lift'); sfx.pop(); }
      else if (r < s.lift + s.cut) { shoot(false, b.x1, x1, pace, 'cut'); sfx.tick(); }
      else if (r < s.lift + s.cut + s.side) { const d = pick([-1, 1]); shoot(false, b.x1, clamp(x1 + d * .08, -.85, .85), pace, 'side', { curve: -d * .15 }); /* effet : une courbe douce et régulière, plus de crochet au dernier moment */ sfx.pop(); }
      else { shoot(false, b.x1, x1, pace, 'n'); sfx.pop(); }
    }
    function myReturn(b) {
      rally++; swingP = .22; const off = clamp((b.x1 - px) / HW, -1, 1), up = input.held.a || pvy < -.9, down = input.held.b || pvy > .9, sideways = tier > 0 && Math.abs(pv) > 2, tapHit = tier > 0 && downT < .28; /* doigt posé juste avant la balle = frappe sèche */
      let type = 'n'; if (b.type === 'lob' && !down) type = 'smash'; /* balle haute : le smash part tout seul */ else if (up) type = 'lift'; else if (down) type = 'cut'; else if (sideways) type = 'side';
      let x1 = b.x1 * .25 + off * (tier === 0 ? .55 : .95) + clamp(pv * .12, -.3, .3); x1 = tier === 0 ? clamp(x1, -.9, .9) : clamp(x1, -1.3, 1.3);
      const T = (type === 'n' && tapHit ? .82 : 1) * Math.max(.55, [1.45, 1.1, .95][tier] * Math.max(.7, 1 - rally * .02) * (1 - Math.min(8, idx) * .022)); /* la raquette du joueur monte de niveau à chaque adversaire battu */
      shoot(true, b.x1, x1, T, type, type === 'side' ? { curve: -Math.sign(pv) * .2 } : type === 'n' && Math.abs(off) > .85 ? { weak: true } : null);
      const q = P(b.x1, 1, .1);
      if (type === 'smash') { stats.ms++; sfx.punch(); say('SMASH !', .7); env.vibe(50); pr.burst(q.x, q.y, '#ffd23f', 16, 280); flash = .1; }
      else if (type === 'lift') { sfx.punch(); say('Lift !', .5, '#ff9f1c'); env.vibe(20); pr.burst(q.x, q.y, '#ff9f1c', 6, 160); }
      else if (type === 'cut') { sfx.tick(); say('Coupé', .5, '#8fe3ff'); env.vibe(12); }
      else if (type === 'side') { sfx.pop(); say('Effet !', .5, '#c79bff'); }
      else if (tapHit) { sfx.punch(); say('Frappe !', .5, '#fff'); env.vibe(25); pr.burst(q.x, q.y, '#ffffff', 6, 170); }
      else { sfx.pop(); env.vibe(12); }
    }
    function startMatch() { me = 0; foe = 0; server = 0; wait = 1; ball = null; rally = 0; cx = 0; phase = 'play'; persist(); }
    function update(dt) {
      if (over) return; t += dt; geo(); pr.update(dt); msgT = Math.max(0, msgT - dt); swingP = Math.max(0, swingP - dt); swingC = Math.max(0, swingC - dt); flash = Math.max(0, flash - dt); foeMood -= Math.sign(foeMood) * Math.min(Math.abs(foeMood), dt);
      const k = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0), ptr = input.pointer;
      if (k) px += k * 2.8 * dt; else if (ptr.down) px = (ptr.x - env.W / 2) / G.wn;
      px = clamp(px, -1.25, 1.25); pv = pv * .6 + ((px - lastPx) / Math.max(dt, .001)) * .4; lastPx = px;
      if (ptr.down && lastPy != null) pvy = pvy * .55 + ((ptr.y - lastPy) / G.wn / Math.max(dt, .001)) * .45; else pvy *= .8; lastPy = ptr.down ? ptr.y : null; downT = ptr.justDown ? 0 : downT + dt; pyo += (clamp(pvy * .06, -.13, .07) - pyo) * Math.min(1, dt * 14); /* la raquette avance ou recule avec le doigt */
      if (phase === 'intro' || phase === 'cup') { introT += dt; if (introT > .7 && (ptr.justDown || input.pressed.a || input.pressed.b)) { if (phase === 'cup' && idx > 8) { over = true; delete S.ping[env.profile.id]; env.gameOver(score, { win: true, title: 'Champion du monde !', text: 'Tu as gagné les 3 coupes.' }); return; } if (phase === 'cup') { phase = 'intro'; introT = 0; sfx.tap(); } else { sfx.ok(); startMatch(); } } env.setScore(score); env.hud(idx > 8 ? 'Champion !' : PING_CUPS[cup()][0]); return; }
      if (matchT > 0) {
        matchT -= dt; if (matchT <= 0) {
          if (me >= GOAL()) { score += 100 * (idx + 1); idx++; introT = 0; if (idx % 3 === 0) { cupWon = idx / 3 - 1; score += 300; phase = 'cup'; sfx.win(); if (idx <= 8) persist(); else S.ping[env.profile.id] = { idx: 8, score, hearts }; } else { phase = 'intro'; persist(); } }
          else { hearts--; if (hearts <= 0) { over = true; delete S.ping[env.profile.id]; env.gameOver(score, { title: 'Éliminé', text: F()[0] + ' gagne ' + foe + ' à ' + me + ' (' + PING_CUPS[cup()][0] + ').' }); return; } phase = 'intro'; introT = 0; persist(); }
        }
      }
      else if (!ball) { wait -= dt; cx += clamp(0 - cx, -1, 1) * dt * 2; if (wait <= 0) serve(); }
      const s = st();
      if (ball) {
        const b = ball, pu = b.u; b.u += dt / b.T * (b.u > UB ? b.kick : 1); const uu = Math.min(b.u, 1);
        b.x = b.x0 + (b.x1 - b.x0) * b.u + b.curve * Math.sin(Math.PI * uu); b.y = b.y0 + (b.y1 - b.y0) * b.u;
        const u = Math.min(b.u, 1.6); b.h = u < UB ? .12 * (1 - u / UB) + 4 * b.a * (u / UB) * (1 - u / UB) : Math.max(0, 4 * b.b * ((u - UB) / (1 - UB)) * (1.25 - (u - UB) / (1 - UB)));
        trail.push({ x: b.x, y: b.y, h: b.h }); if (trail.length > 8) trail.shift();
        // l'adversaire se déplace (après son temps de réaction) ; un effet le trompe s'il lit mal la balle
        if (b.fromMe && !b.dead) { b.react -= dt; if (b.react <= 0) { cTarget = b.x1 + (b.x - b.x1) * (1 - s.spin) * .8 + (b.noise || 0); cx += clamp(cTarget - cx, -s.v * dt, s.v * dt); } } else if (!b.dead) cx += clamp(0 - cx, -s.v * .35 * dt, s.v * .35 * dt);
        if (b.fault === 'net' && !b.dead && b.u >= .5) { b.dead = .5; b.u = .5; b.T = 1e9; sfx.tick(); say('Dans le filet !', 1, b.fromMe ? '#ff8fb8' : '#9dff5c'); }
        if (pu < UB && b.u >= UB && !b.dead) { if (Math.abs(b.x) > 1.03) { b.out = true; say('Dehors !', 1, b.fromMe ? '#ff8fb8' : '#9dff5c'); sfx.ko(); } else { sfx.tick(); const q = P(b.x, b.y, 0); pr.burst(q.x, q.y, '#ffffff', 4, 60); } }
        if (b.dead) { b.dead -= dt; if (b.fault === 'net') b.h = Math.max(0, b.h - dt * .4); if (b.dead <= 0) point(b.fault === 'net' || b.out ? !b.fromMe : b.fromMe, b.fault === 'net' ? 'Dans le filet !' : b.out ? 'Dehors !' : null); }
        else if (b.out) { if (b.u >= 1.2) b.dead = .01; }
        else if (b.u >= 1) { if (b.fromMe) { if (Math.abs(cx - b.x1) < HWC) cpuReturn(b); else b.dead = .45; } else if (Math.abs(px - b.x1) < HW + .04) myReturn(b); else b.dead = .45; }
      }
      env.setScore(score); env.hud(PING_CUPS[cup()][0] + ' · ' + me + ' – ' + foe);
    }
    function paddle(c, q, r, col, up, swing) { c.save(); c.translate(q.x, q.y - (up ? swing * r * 1.2 : 0)); c.rotate((up ? 1 : -1) * swing * 2.5); c.fillStyle = '#d9a066'; c.strokeStyle = '#1b1540'; c.lineWidth = Math.max(1.5, r * .09); Draw.rr(c, -r * .17, up ? r * .7 : -r * 1.9, r * .34, r * 1.2, r * .12); c.fill(); c.stroke(); c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, r, r * (up ? .98 : .8), 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(-r * .3, -r * .3, r * .35, r * .22, -.6, 0, 7); c.fill(); c.restore(); }
    function drawBall(c) {
      const b = ball; if (!b) return; if (!b.fromMe && !b.dead && !b.fault && b.u < UB && Math.abs(b.x1) < 1.2) { const ux = b.x0 + (b.x1 - b.x0) * UB + b.curve * Math.sin(Math.PI * UB), w = P(ux, b.y0 + (b.y1 - b.y0) * UB, 0), rr = Math.max(6, G.wn * .07 * w.s); c.strokeStyle = 'rgba(255,255,255,' + (.25 + .35 * b.u / UB) + ')'; c.lineWidth = 2; c.beginPath(); c.ellipse(w.x, w.y, rr, rr * .42, 0, 0, 7); c.stroke(); } /* petit rond blanc : l'endroit où la balle va rebondir */
      const sh = P(b.x, b.y, 0), q = P(b.x, b.y, b.h), r = Math.max(4, G.wn * .052 * q.s);
      if (b.y > -.05 && b.y < 1.05 && Math.abs(b.x) < 1.05) { c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(sh.x, sh.y, r * 1.1, r * .45, 0, 0, 7); c.fill(); }
      trail.forEach((p, i) => { const w = P(p.x, p.y, p.h); c.fillStyle = 'rgba(' + b.col + ',' + i * (b.type === 'n' || b.type === 'lob' ? .045 : .085) + ')'; c.beginPath(); c.arc(w.x, w.y, r * (.4 + i * .075), 0, 7); c.fill(); });
      c.fillStyle = b.type === 'smash' ? '#ffd23f' : '#fff'; c.strokeStyle = '#1b1540'; c.lineWidth = Math.max(1.5, r * .22); c.beginPath(); c.arc(q.x, q.y, r, 0, 7); c.fill(); c.stroke();
      if (b.type === 'lob' && !b.fromMe && tier > 0 && b.u > .35 && b.u < 1) Draw.text(c, '▲ SMASH !', q.x, q.y - r * 2.6, 14, '#ffd23f');
    }
    function person(c, x, y, fr, f, mood, look, bob) { // adversaire : corps, tête, cheveux, bandeau
      c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(x, y + 4, fr * 1.1, fr * .25, 0, 0, 7); c.fill();
      c.fillStyle = f[2]; c.strokeStyle = '#1b1540'; c.lineWidth = Math.max(2, fr * .07); Draw.rr(c, x - fr * .75, y - fr * 1.5 + bob, fr * 1.5, fr * 1.5, fr * .4); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x - fr * .75, y - fr * .95 + bob, fr * 1.5, fr * .16);
      const hy = y - fr * 2.05 + bob; c.fillStyle = f[3]; c.beginPath(); c.arc(x, hy - fr * .12, fr * .8, Math.PI, 0); c.fill(); c.stroke();
      c.fillStyle = f[1]; c.beginPath(); c.arc(x, hy, fr * .72, 0, 7); c.fill(); c.stroke();
      c.fillStyle = f[3]; c.beginPath(); c.arc(x, hy - fr * .08, fr * .74, Math.PI * 1.08, Math.PI * 1.92); c.closePath(); c.fill();
      c.fillStyle = f[2]; c.fillRect(x - fr * .7, hy - fr * .34, fr * 1.4, fr * .17);
      c.fillStyle = '#1b1540'; for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * fr * .27 + look, hy + fr * .06, fr * .09, 0, 7); c.fill(); }
      c.lineWidth = Math.max(2, fr * .06); c.beginPath(); if (mood > .2) c.arc(x, hy + fr * .24, fr * .22, .15, Math.PI - .15); else if (mood < -.2) c.arc(x, hy + fr * .48, fr * .2, Math.PI + .3, -.3); else { c.moveTo(x - fr * .15, hy + fr * .34); c.lineTo(x + fr * .15, hy + fr * .34); } c.stroke();
    }
    function trophy(c, x, y, r, col) { c.fillStyle = col; c.strokeStyle = '#1b1540'; c.lineWidth = Math.max(2, r * .08); c.beginPath(); c.moveTo(x - r * .7, y - r); c.lineTo(x + r * .7, y - r); c.quadraticCurveTo(x + r * .7, y + r * .1, x, y + r * .25); c.quadraticCurveTo(x - r * .7, y + r * .1, x - r * .7, y - r); c.closePath(); c.fill(); c.stroke(); for (const d of [-1, 1]) { c.beginPath(); c.arc(x + d * r * .78, y - r * .55, r * .3, 0, 7); c.stroke(); } c.fillRect(x - r * .1, y + r * .2, r * .2, r * .45); c.strokeRect(x - r * .1, y + r * .2, r * .2, r * .45); Draw.rr(c, x - r * .5, y + r * .6, r, r * .28, r * .08); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(x - r * .45, y - r * .85, r * .18, r * .6); }
    const big = (c, txt, y, fs, col) => { c.lineWidth = Math.max(4, fs * .2); c.lineJoin = 'round'; c.strokeStyle = '#1b1540'; c.font = '900 ' + Math.round(fs) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(txt, env.W / 2, y); c.fillStyle = col; c.fillText(txt, env.W / 2, y); };
    function draw(c) {
      const W = env.W, H = env.H; if (!G.wn) geo(); const ci = Math.min(2, cup()), C = PING_CUPS[ci], f = PING_FOES[Math.min(8, idx)];
      // salle, public, fanions aux couleurs de la coupe
      const fy = G.yf - (G.yn - G.yf) * .12, wall = c.createLinearGradient(0, 0, 0, fy); wall.addColorStop(0, C[4]); wall.addColorStop(1, C[5]); c.fillStyle = wall; c.fillRect(0, 0, W, H);
      for (let row = 0; row < 3; row++) { const y = fy - 14 - row * 20, n = Math.ceil(W / 26) + 1; for (let i = 0; i < n; i++) { const hsh = (i * 37 + row * 91) % 7, bobc = Math.sin(t * (3 + hsh * .4) + i) * (foeMood !== 0 || matchT > 0 ? 3 : 1); c.fillStyle = ['#ffb347', '#f6c9a0', '#d9a066', '#c68642', '#eac086', '#f1c27d', '#e0c9a6'][hsh]; c.globalAlpha = .5 - row * .1; c.beginPath(); c.arc(i * 26 + (row % 2) * 13, y + bobc, 8, 0, 7); c.fill(); c.fillStyle = ['#ff4f9a', '#38e0d6', '#ffd23f', '#9dff5c', '#7c5cff', '#ff9f1c', '#fff'][(hsh * 3 + row) % 7]; c.fillRect(i * 26 + (row % 2) * 13 - 9, y + 7 + bobc, 18, 12); } } c.globalAlpha = 1;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, fy - 6, W, 6);
      for (let i = 0; i < 9; i++) { const x = W * i / 8, y = 2 + Math.sin(i * 1.3) * 5; c.beginPath(); c.moveTo(x - 12, y); c.lineTo(x + 12, y); c.lineTo(x, y + 20); c.closePath(); c.fillStyle = i % 2 ? C[1] : '#fff'; c.fill(); }
      const fl = c.createLinearGradient(0, fy, 0, H); fl.addColorStop(0, '#a5673a'); fl.addColorStop(1, '#e0a05c'); c.fillStyle = fl; c.fillRect(0, fy, W, H - fy);
      c.strokeStyle = 'rgba(0,0,0,.08)'; c.lineWidth = 2; for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(W / 2 + i * W * .05, fy); c.lineTo(W / 2 + i * W * .2, H); c.stroke(); }
      const sp = c.createRadialGradient(W / 2, (G.yn + G.yf) / 2, 10, W / 2, (G.yn + G.yf) / 2, Math.max(W, H) * .7); sp.addColorStop(0, 'rgba(255,255,255,.14)'); sp.addColorStop(1, 'rgba(0,0,20,.3)'); c.fillStyle = sp; c.fillRect(0, 0, W, H);
      if (phase !== 'play') { drawIntro(c, C, f); return; }
      const fq = P(cx, -.1, 0), fr = G.wn * .2; person(c, fq.x, fq.y, fr, f, foeMood, ball ? clamp((ball.x - cx) * .5, -.5, .5) * fr * .25 : 0, Math.sin(t * 6) * 2);
      // table
      const A = P(-1, 0), B = P(1, 0), Cn = P(1, 1), D = P(-1, 1), th = G.wn * .09;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(W / 2, G.yn + th * 2.6, G.wn * 1.05, th * 1.2, 0, 0, 7); c.fill();
      c.fillStyle = '#2a2166'; c.fillRect(D.x + G.wn * .12, D.y, G.wn * .1, th * 2.6); c.fillRect(Cn.x - G.wn * .22, Cn.y, G.wn * .1, th * 2.6);
      c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.moveTo(D.x, D.y); c.lineTo(Cn.x, Cn.y); c.lineTo(Cn.x, Cn.y + th); c.lineTo(D.x, D.y + th); c.closePath(); c.fill(); c.fillStyle = C[2]; c.globalAlpha = .6; c.fill(); c.globalAlpha = 1;
      const tg = c.createLinearGradient(0, A.y, 0, D.y); tg.addColorStop(0, C[2]); tg.addColorStop(1, C[3]); c.fillStyle = tg; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.lineTo(Cn.x, Cn.y); c.lineTo(D.x, D.y); c.closePath(); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); const m0 = P(0, 0), m1 = P(0, 1); c.lineWidth = 2; c.beginPath(); c.moveTo(m0.x, m0.y); c.lineTo(m1.x, m1.y); c.stroke();
      paddle(c, P(cx, -.03, .1), G.wn * HWC * .5, f[2], false, swingC);
      if (ball && ball.y < .5) drawBall(c);
      const n0 = P(-1.08, .5), n1 = P(1.08, .5), nh = G.wn * .085; c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(n0.x, n0.y - nh, n1.x - n0.x, nh); c.strokeStyle = 'rgba(27,21,64,.25)'; c.lineWidth = 1; for (let x = n0.x; x < n1.x; x += 7) { c.beginPath(); c.moveTo(x, n0.y - nh); c.lineTo(x, n0.y); c.stroke(); } c.fillStyle = '#fff'; c.fillRect(n0.x, n0.y - nh - 3, n1.x - n0.x, 4); c.fillStyle = '#1b1540'; c.fillRect(n0.x - 3, n0.y - nh - 4, 5, nh + 8); c.fillRect(n1.x - 2, n0.y - nh - 4, 5, nh + 8);
      if (ball && ball.y >= .5) drawBall(c);
      c.globalAlpha = .93; paddle(c, P(px, 1.04 + pyo, .07), G.wn * HW * .98, '#e8452c', true, swingP); c.globalAlpha = 1;
      pr.draw(c); if (flash > 0) { c.fillStyle = 'rgba(255,255,255,' + flash * 3 + ')'; c.fillRect(0, 0, W, H); }
      // tableau de score
      const sw = Math.min(250, W - 24), sx = G.land ? 12 : W / 2 - sw / 2, sy = G.land ? 10 : 30, scx = sx + sw / 2, goal = GOAL(); c.fillStyle = 'rgba(23,18,58,.88)'; Draw.rr(c, sx, sy, sw, 58, 12); c.fill(); c.fillStyle = C[1]; Draw.rr(c, sx, sy, sw, 16, 8); c.fill();
      Draw.text(c, ROUNDS[idx % 3].toUpperCase(), scx, sy + 9, 10, '#1b1540'); Draw.text(c, env.profile.name, sx + 12, sy + 34, 13, '#fff', 'left'); Draw.text(c, f[0], sx + sw - 12, sy + 34, f[0].length > 8 ? 10 : 13, '#fff', 'right'); Draw.text(c, me + ' – ' + foe, scx, sy + 35, 24, '#ffd23f');
      for (let i = 0; i < goal; i++) { c.fillStyle = i < me ? '#9dff5c' : 'rgba(255,255,255,.2)'; c.fillRect(sx + 8 + i * 9, sy + 49, 7, 4); c.fillStyle = i < foe ? '#ff4f9a' : 'rgba(255,255,255,.2)'; c.fillRect(sx + sw - 15 - i * 9, sy + 49, 7, 4); }
      Draw.lives(c, hearts, 3, G.land ? sx + sw + 14 : sx + 2, sy + (G.land ? 14 : 66));
      if (rally >= 3 && ball) Draw.text(c, 'Échange × ' + rally, G.land ? W - 80 : scx + 60, G.land ? 24 : sy + 80, 13, '#fff');
      if (matchT > 0) big(c, me >= goal ? 'MATCH GAGNÉ !' : 'Match perdu…', H * .5, Math.min(40, W / 10), me >= goal ? '#9dff5c' : '#ff4f9a');
      else if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 3); big(c, msg, H * .52, Math.min(30, W / (msg.length * .6)), msgCol); c.globalAlpha = 1; }
      else if (!ball && wait > 0) big(c, server === 0 ? 'À toi de servir' : 'Service de ' + f[0], H * .52, Math.min(22, W / 16), '#fff');
    }
    function drawIntro(c, C, f) {
      const W = env.W, H = env.H, a = Math.min(1, introT * 2.5); c.fillStyle = 'rgba(15,10,45,.72)'; c.fillRect(0, 0, W, H); c.globalAlpha = a;
      if (phase === 'cup') { const cw = PING_CUPS[cupWon]; trophy(c, W / 2, H * .36 + Math.sin(t * 3) * 5, Math.min(W, H) * .16, cw[1]); big(c, cw[0].toUpperCase(), H * .6, Math.min(34, W / 13), cw[1]); big(c, 'GAGNÉE !  +300', H * .6 + 40, Math.min(24, W / 16), '#fff'); if (Math.random() < .3) pr.burst(rnd(0, W), rnd(0, H * .5), pick(['#ffd23f', '#ff4f9a', '#38e0d6', '#9dff5c']), 6, 160); pr.draw(c); }
      else {
        const land = W > H * 1.2, top = land ? H * .1 : H * .09; big(c, C[0].toUpperCase(), top, Math.min(30, W / 14), C[1]); big(c, ROUNDS[idx % 3], top + 34, Math.min(20, W / 20), '#fff');
        for (let i = 0; i < 3; i++) trophy(c, W / 2 + (i - 1) * 46, top + 78, 13, i < cup() ? PING_CUPS[i][1] : 'rgba(255,255,255,.18)'); // coupes déjà gagnées
        const fr = Math.min(W * .16, H * (land ? .13 : .1)), py = land ? H * .78 : H * .6; person(c, W / 2, py, fr, f, 0, 0, Math.sin(t * 4) * 2);
        big(c, f[0], py + 30, Math.min(30, W / 12), '#ffd23f');
        const words = f[14].split(' '), lines = ['']; c.font = '700 15px ' + FONT; for (const w of words) { if (c.measureText(lines[lines.length - 1] + ' ' + w).width > W - 40) lines.push(w); else lines[lines.length - 1] += (lines[lines.length - 1] ? ' ' : '') + w; }
        if (!land) { lines.forEach((l, i) => Draw.text(c, l, W / 2, py + 64 + i * 20, 15, '#fff', 'center', 700)); const s = st(), bars = [['Vitesse', s.v / 3.4], ['Puissance', 1.1 - s.T * .6], ['Précision', 1 - s.err * 3.5], ['Effets', (s.lift + s.cut + s.side + s.smash) * .9 + .08]], bw = Math.min(150, W * .36), bx = W / 2 - bw / 2 + 36, by = py + 74 + lines.length * 20; bars.forEach((b, i) => { Draw.text(c, b[0], bx - 10, by + i * 20, 13, '#fff', 'right', 700); c.fillStyle = 'rgba(255,255,255,.18)'; Draw.rr(c, bx, by - 5 + i * 20, bw, 10, 5); c.fill(); c.fillStyle = C[1]; Draw.rr(c, bx, by - 5 + i * 20, Math.max(10, bw * clamp(b[1], .06, 1)), 10, 5); c.fill(); }); }
        else Draw.text(c, f[14], W / 2, py + 58, 14, '#fff', 'center', 700);
        Draw.lives(c, hearts, 3, W / 2 - 38, land ? H * .1 + 96 : H * .09 + 104);
        if (introT > .7 && Math.sin(t * 5) > -.4) big(c, 'Touche pour jouer', H - (land ? 16 : 34), Math.min(20, W / 18), '#9dff5c');
      }
      c.globalAlpha = 1;
    }
    persist();
    return { update, draw, dbg: () => ({ stats, goal: GOAL(), reset: i => { idx = i; me = foe = 0; ball = null; wait = .4; matchT = 0; phase = 'play'; hearts = 3; server = 0; }, ball, px, cx, me, foe, idx, phase, hearts, G, set: v => { px = v; }, skip: (a, b) => { me = a; foe = b; matchT = .05; ball = null; } }) };
  }
});
