/* ===== Ping-Pong (dès 4 ans) — table vue en perspective, la raquette suit le doigt ===== */
const PING_FOES = [['Pipo', '#ffb347', '#e8452c'], ['Lila', '#f6c9a0', '#7c5cff'], ['Max', '#d9a066', '#3fbf4f'], ['Zoé', '#f6c9a0', '#ff4f9a'], ['Kenji', '#eac086', '#38a0e0'], ['Maître Ping', '#e0c9a6', '#ffd23f']];
GAMES.push({
  id: 'ping', title: 'Ping-Pong', tagline: 'Renvoie la balle et bats 6 adversaires', minAge: 4, color: '#2bb673',
  icon: '<svg viewBox="0 0 64 64"><rect x="4" y="34" width="56" height="20" rx="4" fill="#1f8f5a"/><path d="M4 44h56M32 34v20" stroke="#fff" stroke-width="2"/><circle cx="24" cy="22" r="14" fill="#e8452c" stroke="#1b1540" stroke-width="3"/><rect x="32" y="30" width="7" height="16" rx="3" transform="rotate(-40 35 32)" fill="#d9a066" stroke="#1b1540" stroke-width="2.5"/><circle cx="49" cy="16" r="6" fill="#fff" stroke="#1b1540" stroke-width="2.5"/></svg>',
  howto: ['Glisse ton doigt : la raquette le suit. Mets-la devant la balle, elle repart toute seule !', 'La raquette suit ton doigt. Touche la balle avec le bord de la raquette pour l\'envoyer sur le côté. Bouge vite au moment de frapper : SMASH !', 'Vise les coins avec le bord de la raquette et smashe en bougeant vite. 6 adversaires de plus en plus rapides.'],
  pad: { left: true, hint: 'ou glisse le doigt' },
  stars: s => s >= 800 ? 3 : s >= 400 ? 2 : s >= 150 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env, tier = env.tier, pr = Particles();
    const FONT = getComputedStyle(document.body).getPropertyValue('--font-display');
    const HW = [.36, .27, .23][tier], HWC = .24, GOAL = tier === 0 ? 5 : 7, UB = .72;
    let level = 1, score = 0, over = false, t = 0, me = 0, foe = 0, px = 0, pv = 0, cx = 0, cTarget = 0, ball = null, wait = 1.2, server = 0, rally = 0, msg = '', msgT = 0, swingP = 0, swingC = 0, matchT = 0, lastPx = 0, trail = [], foeMood = 0, best = 0;
    if (saved && saved.level) { level = clamp(saved.level | 0, 1, 6); score = Math.max(0, saved.score | 0); }
    const G = {}; // géométrie de l'écran
    function geo() { const W = env.W, H = env.H, land = W > H; G.wn = land ? Math.min(W * .34, H * .62) : Math.min(W * .47, H * .4); G.land = land; G.yn = H * (land ? .8 : .82); G.yf = H * (land ? .4 : .36); G.D = 1.15; const sf = 1 / (1 + G.D); G.yh = (G.yf - sf * G.yn) / (1 - sf); }
    const P = (x, y, h) => { const s = 1 / (1 + (1 - y) * G.D); return { x: env.W / 2 + x * G.wn * s, y: G.yh + (G.yn - G.yh) * s - (h || 0) * G.wn * 1.5 * s, s }; };
    const say = (m, d) => { msg = m; msgT = d || 1.2; };
    function shoot(fromMe, x0, x1, T, smash) { ball = { fromMe, x0, y0: fromMe ? 1.03 : -.03, x1, y1: fromMe ? -.03 : 1.03, T, u: 0, smash, bounced: false, dead: 0 }; if (fromMe) { const e = [.5, .42, .36][tier] * Math.max(.6, 1.1 - level * .1) * (smash ? 1.8 : 1); cTarget = x1 + rnd(-e, e); } }
    function serve() { rally = 0; const T = [1.7, 1.35, 1.15][tier]; if (server === 0) shoot(true, px, clamp(px * .3 + rnd(-.3, .3), -.7, .7), T); else shoot(false, cx, clamp(rnd(-.5, .5), -.8, .8), T); sfx.pop(); if (server === 0) swingP = .2; else swingC = .2; }
    function point(mine) {
      if (mine) { me++; score += 10 + Math.min(20, rally * 2); sfx.coin(); foeMood = -1.5; say(rally >= 6 ? 'Quel échange !' : pick(['Point !', 'Bien joué !', 'Bravo !'])); } else { foe++; sfx.ko(); env.vibe(80); foeMood = 1.5; say('Point pour ' + PING_FOES[level - 1][0]); }
      best = Math.max(best, rally); ball = null; wait = 1.3; if ((me + foe) % 2 === 0) server = 1 - server;
      if (me >= GOAL || foe >= GOAL) matchT = 2.2;
    }
    function update(dt) {
      if (over) return; t += dt; geo(); pr.update(dt); msgT = Math.max(0, msgT - dt); swingP = Math.max(0, swingP - dt); swingC = Math.max(0, swingC - dt); foeMood -= Math.sign(foeMood) * Math.min(Math.abs(foeMood), dt);
      // raquette du joueur : le doigt, ou les flèches
      const k = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
      if (k) px += k * 2.6 * dt; else if (input.pointer.down) px = (input.pointer.x - env.W / 2) / G.wn;
      px = clamp(px, -1.25, 1.25); pv = pv * .6 + ((px - lastPx) / Math.max(dt, .001)) * .4; lastPx = px;
      if (matchT > 0) { matchT -= dt; if (matchT <= 0) { if (me >= GOAL) { score += 100 * level; if (level >= 6) { over = true; env.gameOver(score, { win: true, title: 'Champion !', text: 'Tu as battu les 6 adversaires.' }); return; } level++; me = 0; foe = 0; server = 0; wait = 1.6; say('Adversaire suivant : ' + PING_FOES[level - 1][0], 1.6); env.save({ level, score }, 'Adversaire ' + level); } else { over = true; env.gameOver(score, { title: 'Match perdu', text: PING_FOES[level - 1][0] + ' gagne ' + foe + ' à ' + me + '.' }); return; } } }
      else if (!ball) { wait -= dt; if (server === 1) cx += clamp(0 - cx, -1, 1) * dt * 2; if (wait <= 0) serve(); }
      // adversaire
      const vc = [1, 1.35, 1.6][tier] + level * .12;
      if (ball && ball.fromMe && !ball.dead) cx += clamp(cTarget - cx, -vc * dt, vc * dt); else if (ball && !ball.dead) cx += clamp(0 - cx, -vc * .4 * dt, vc * .4 * dt);
      if (ball) {
        const b = ball, pu = b.u; b.u += dt / b.T; b.x = b.x0 + (b.x1 - b.x0) * b.u; b.y = b.y0 + (b.y1 - b.y0) * b.u;
        const u = Math.min(b.u, 1.6); b.h = u < UB ? .12 * (1 - u / UB) + 4 * .2 * (u / UB) * (1 - u / UB) : Math.max(0, 4 * .15 * ((u - UB) / (1 - UB)) * (1.25 - (u - UB) / (1 - UB)));
        trail.push({ x: b.x, y: b.y, h: b.h }); if (trail.length > 7) trail.shift();
        if (pu < UB && b.u >= UB) { sfx.tick(); const q = P(b.x, b.y, 0); pr.burst(q.x, q.y, '#ffffff', 4, 60); }
        if (b.dead) { b.dead -= dt; if (b.dead <= 0) point(b.fromMe); }
        else if (b.u >= 1) {
          if (b.fromMe) { // à l'adversaire de renvoyer
            if (Math.abs(cx - b.x1) < HWC) { rally++; swingC = .2; sfx.pop(); const spread = Math.min(.9, (tier === 0 ? .35 : .5) + level * .07); shoot(false, b.x1, clamp(rnd(-spread, spread), -.9, .9), Math.max(.6, [1.6, 1.25, 1.05][tier] - level * .05 - rally * .012)); }
            else b.dead = .45;
          } else if (Math.abs(px - b.x1) < HW + .04) { // à moi
            rally++; swingP = .2; const off = clamp((b.x1 - px) / HW, -1, 1), smash = tier > 0 && Math.abs(pv) > 2.2;
            const x1 = clamp(b.x1 * .25 + off * (tier === 0 ? .55 : .85) + clamp(pv * .12, -.3, .3), -.92, .92);
            shoot(true, b.x1, x1, Math.max(.5, [1.5, 1.15, .98][tier] - rally * .015) / (smash ? 1.4 : 1), smash);
            if (smash) { sfx.punch(); say('SMASH !', .7); env.vibe(40); const q = P(b.x1, 1, .1); pr.burst(q.x, q.y, '#ffd23f', 12, 240); } else { sfx.pop(); env.vibe(12); }
          } else b.dead = .45;
        }
      }
      env.setScore(score); env.hud('Adversaire ' + level + '/6 · ' + me + ' – ' + foe);
    }
    function paddle(c, q, r, col, up, swing) { c.save(); c.translate(q.x, q.y); c.rotate((up ? 1 : -1) * swing * 2.5); c.fillStyle = '#d9a066'; c.strokeStyle = '#1b1540'; c.lineWidth = Math.max(1.5, r * .09); Draw.rr(c, -r * .17, up ? r * .7 : -r * 1.9, r * .34, r * 1.2, r * .12); c.fill(); c.stroke(); c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, r, r * (up ? .98 : .8), 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(-r * .3, -r * .3, r * .35, r * .22, -.6, 0, 7); c.fill(); c.restore(); }
    function drawBall(c) { const b = ball; if (!b) return; const sh = P(b.x, b.y, 0), q = P(b.x, b.y, b.h), r = Math.max(4, G.wn * .05 * q.s); if (b.y > -.05 && b.y < 1.05 && Math.abs(b.x) < 1.05) { c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(sh.x, sh.y, r * 1.1, r * .45, 0, 0, 7); c.fill(); }
      trail.forEach((p, i) => { const w = P(p.x, p.y, p.h); c.fillStyle = b.smash ? 'rgba(255,160,30,' + i * .07 + ')' : 'rgba(255,255,255,' + i * .045 + ')'; c.beginPath(); c.arc(w.x, w.y, r * (.4 + i * .08), 0, 7); c.fill(); });
      c.fillStyle = b.smash ? '#ffd23f' : '#fff'; c.strokeStyle = '#1b1540'; c.lineWidth = Math.max(1.5, r * .22); c.beginPath(); c.arc(q.x, q.y, r, 0, 7); c.fill(); c.stroke(); }
    function draw(c) {
      const W = env.W, H = env.H; if (!G.wn) geo(); const foeD = PING_FOES[level - 1];
      // salle
      const wall = c.createLinearGradient(0, 0, 0, G.yf); wall.addColorStop(0, '#3a2a8a'); wall.addColorStop(1, '#5b46c9'); c.fillStyle = wall; c.fillRect(0, 0, W, H);
      const fy = G.yf - (G.yn - G.yf) * .12; for (let i = 0; i < 7; i++) { const x = W * (i + .5) / 7; c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(x - W / 30, 0, W / 15, fy); }
      c.fillStyle = '#ffd23f'; for (let i = 0; i < 9; i++) { const x = W * i / 8, y = 18 + Math.sin(i * 1.3) * 6; c.beginPath(); c.moveTo(x - 12, y - 18); c.lineTo(x + 12, y - 18); c.lineTo(x, y + 2); c.closePath(); c.fillStyle = ['#ffd23f', '#ff4f9a', '#38e0d6'][i % 3]; c.fill(); }
      const fl = c.createLinearGradient(0, fy, 0, H); fl.addColorStop(0, '#b9773f'); fl.addColorStop(1, '#e0a05c'); c.fillStyle = fl; c.fillRect(0, fy, W, H - fy);
      c.strokeStyle = 'rgba(0,0,0,.08)'; c.lineWidth = 2; for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(W / 2 + i * W * .05, fy); c.lineTo(W / 2 + i * W * .2, H); c.stroke(); }
      // adversaire (derrière la table)
      const fq = P(cx, -.1, 0), fr = G.wn * .2, bob = Math.sin(t * 6) * 2; c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(fq.x, fq.y + 4, fr * 1.1, fr * .25, 0, 0, 7); c.fill();
      c.fillStyle = foeD[2]; c.strokeStyle = '#1b1540'; c.lineWidth = 3; Draw.rr(c, fq.x - fr * .75, fq.y - fr * 1.5 + bob, fr * 1.5, fr * 1.5, fr * .4); c.fill(); c.stroke();
      const hy = fq.y - fr * 2.05 + bob; c.fillStyle = foeD[1]; c.beginPath(); c.arc(fq.x, hy, fr * .72, 0, 7); c.fill(); c.stroke(); c.fillStyle = foeD[2]; c.fillRect(fq.x - fr * .72, hy - fr * .5, fr * 1.44, fr * .22);
      const look = ball ? clamp((ball.x - cx) * .12, -.12, .12) * fr * 4 : 0; c.fillStyle = '#1b1540'; for (const d of [-1, 1]) { c.beginPath(); c.arc(fq.x + d * fr * .27 + look, hy + fr * .02, fr * .09, 0, 7); c.fill(); }
      c.lineWidth = 2.5; c.beginPath(); if (foeMood > .2) c.arc(fq.x, hy + fr * .22, fr * .22, .15, Math.PI - .15); else if (foeMood < -.2) c.arc(fq.x, hy + fr * .45, fr * .2, Math.PI + .3, -.3); else { c.moveTo(fq.x - fr * .15, hy + fr * .32); c.lineTo(fq.x + fr * .15, hy + fr * .32); } c.stroke();
      // table
      const A = P(-1, 0), B = P(1, 0), C = P(1, 1), D = P(-1, 1), th = G.wn * .09;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(W / 2, G.yn + th * 2.6, G.wn * 1.05, th * 1.2, 0, 0, 7); c.fill();
      c.fillStyle = '#2a2166'; c.fillRect(D.x + G.wn * .12, D.y, G.wn * .1, th * 2.6); c.fillRect(C.x - G.wn * .22, C.y, G.wn * .1, th * 2.6);
      c.fillStyle = '#145c3b'; c.beginPath(); c.moveTo(D.x, D.y); c.lineTo(C.x, C.y); c.lineTo(C.x, C.y + th); c.lineTo(D.x, D.y + th); c.closePath(); c.fill();
      const tg = c.createLinearGradient(0, A.y, 0, D.y); tg.addColorStop(0, '#1f8f5a'); tg.addColorStop(1, '#2bb673'); c.fillStyle = tg; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.lineTo(C.x, C.y); c.lineTo(D.x, D.y); c.closePath(); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); const m0 = P(0, 0), m1 = P(0, 1); c.lineWidth = 2; c.beginPath(); c.moveTo(m0.x, m0.y); c.lineTo(m1.x, m1.y); c.stroke();
      paddle(c, P(cx, -.03, .1), G.wn * HWC * .5, foeD[2], false, swingC);
      if (ball && ball.y < .5) drawBall(c);
      const n0 = P(-1.08, .5), n1 = P(1.08, .5), nh = G.wn * .085; c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(n0.x, n0.y - nh, n1.x - n0.x, nh); c.strokeStyle = 'rgba(27,21,64,.25)'; c.lineWidth = 1; for (let x = n0.x; x < n1.x; x += 7) { c.beginPath(); c.moveTo(x, n0.y - nh); c.lineTo(x, n0.y); c.stroke(); } c.fillStyle = '#fff'; c.fillRect(n0.x, n0.y - nh - 3, n1.x - n0.x, 4); c.fillStyle = '#1b1540'; c.fillRect(n0.x - 3, n0.y - nh - 4, 5, nh + 8); c.fillRect(n1.x - 2, n0.y - nh - 4, 5, nh + 8);
      if (ball && ball.y >= .5) drawBall(c);
      c.globalAlpha = .93; paddle(c, P(px, 1.04, .07), G.wn * HW * .98, '#e8452c', true, swingP); c.globalAlpha = 1;
      pr.draw(c);
      // tableau de score
      const sw = Math.min(230, W - 24), sx = G.land ? 12 : W / 2 - sw / 2, sy = G.land ? 10 : 34, scx = sx + sw / 2; c.fillStyle = 'rgba(23,18,58,.85)'; Draw.rr(c, sx, sy, sw, 44, 12); c.fill();
      Draw.text(c, env.profile.name, sx + 12, sy + 22, 13, '#fff', 'left'); Draw.text(c, foeD[0], sx + sw - 12, sy + 22, 13, '#fff', 'right'); Draw.text(c, me + ' – ' + foe, scx, sy + 23, 26, '#ffd23f');
      for (let i = 0; i < GOAL; i++) { c.fillStyle = i < me ? '#9dff5c' : 'rgba(255,255,255,.2)'; c.fillRect(sx + 8 + i * 9, sy + 36, 7, 4); c.fillStyle = i < foe ? '#ff4f9a' : 'rgba(255,255,255,.2)'; c.fillRect(sx + sw - 15 - i * 9, sy + 36, 7, 4); }
      if (rally >= 3 && ball) Draw.text(c, 'Échange × ' + rally, scx, sy + 58, 14, '#fff');
      const big = (txt, y, fs, col) => { c.lineWidth = 6; c.strokeStyle = '#1b1540'; c.font = '900 ' + fs + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(txt, W / 2, y); c.fillStyle = col; c.fillText(txt, W / 2, y); };
      if (matchT > 0) big(me >= GOAL ? 'MATCH GAGNÉ !' : 'Match perdu…', H * .5, Math.min(40, W / 10), me >= GOAL ? '#9dff5c' : '#ff4f9a');
      else if (msgT > 0) { c.globalAlpha = Math.min(1, msgT * 3); big(msg, H * .5, Math.min(30, W / (msg.length * .6)), '#ffd23f'); c.globalAlpha = 1; }
      else if (!ball && wait > 0) big(server === 0 ? 'À toi de servir' : 'Service de ' + foeD[0], H * .5, Math.min(22, W / 16), '#fff');
    }
    env.save({ level, score }, 'Adversaire ' + level);
    return { update, draw, dbg: () => ({ ball, px, cx, me, foe, level, G, set: v => { px = v; } }) };
  }
});
