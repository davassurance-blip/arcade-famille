/* ===== Duel Arena (dès 13 ans) — combat 1 contre 1 ===== */
GAMES.push({
  id: 'duel', title: 'Duel Arena', tagline: 'Combat en 3 rounds contre le Robot', minAge: 13, color: '#ff4f9a',
  icon: '<svg viewBox="0 0 64 64"><rect x="10" y="48" width="44" height="6" rx="3" fill="#362b8a"/><circle cx="20" cy="18" r="7" fill="#ffb27a"/><rect x="14" y="26" width="12" height="16" rx="4" fill="#38e0d6"/><rect x="26" y="28" width="14" height="6" rx="3" fill="#ffb27a"/><circle cx="46" cy="18" r="7" fill="#c9c9d6"/><rect x="40" y="26" width="12" height="16" rx="4" fill="#ff4f9a"/><rect x="42" y="16" width="8" height="3" fill="#ff4f4f"/><path d="M34 22l4 6-6 2z" fill="#ffd23f"/></svg>',
  howto: ['', '', 'Flèches pour bouger, SAUT, POING (rapide) et PIED (puissant). Accroupi (bas) = garde. Gagne 2 rounds sur 3 contre le Robot.'],
  pad: { left: true, buttons: [{ k: 'up', label: 'SAUT' }, { k: 'a', label: 'POING' }, { k: 'b', label: 'PIED' }], hint: 'Bas ou S = garde' },
  stars: s => s >= 2500 ? 3 : s >= 1500 ? 2 : s >= 800 ? 1 : 0,
  create(env) {
    const { input, sfx } = env;
    const pr = Particles();
    const ATT = { punch: { dur: .28, hitAt: .1, range: 62, dmg: 8, kb: 120, cd: .1 }, kick: { dur: .5, hitAt: .22, range: 92, dmg: 15, kb: 260, cd: .25 } };
    let P, A, round = 1, wins = [0, 0], roundT = 60, state = 'fight', stateT = 0, t = 0, score = 0, banner = 'ROUND 1', bannerT = 1.5, shake = 0, over = false;
    const floorY = () => env.H - 50;
    function fighter(x, face, color, name) { return { x, y: 0, vx: 0, vy: 0, face, color, name, hp: 100, act: 'idle', actT: 0, cd: 0, block: false, hitT: 0, hitDone: false, ai: { t: 0, plan: 'approach' }, stun: 0 }; }
    function newRound() { P = fighter(env.W * .3, 1, '#38e0d6', env.profile.name); A = fighter(env.W * .7, -1, '#ff4f9a', 'Robot'); roundT = 60; state = 'fight'; banner = 'ROUND ' + round; bannerT = 1.5; }
    function attack(f, kind) { if (f.act !== 'idle' || f.cd > 0 || f.stun > 0 || f.y < 0) return; f.act = kind; f.actT = 0; f.hitDone = false; sfx.punch(); }
    function control(f, dt) {
      const spec = ATT[f.act];
      if (spec) { f.actT += dt; if (!f.hitDone && f.actT >= spec.hitAt) { f.hitDone = true; resolveHit(f, f === P ? A : P, spec); } if (f.actT >= spec.dur) { f.act = 'idle'; f.cd = spec.cd; } }
      f.cd = Math.max(0, f.cd - dt); f.hitT = Math.max(0, f.hitT - dt); f.stun = Math.max(0, f.stun - dt);
      f.vy += 1800 * dt; f.y += f.vy * dt; if (f.y > 0) { f.y = 0; f.vy = 0; }
      f.x += f.vx * dt; f.x = clamp(f.x, 30, env.W - 30); f.vx *= Math.pow(.001, dt);
    }
    function resolveHit(from, to, spec) {
      const dist = (to.x - from.x) * from.face; if (dist < 0 || dist > spec.range || Math.abs(to.y - from.y) > 70) return;
      let dmg = spec.dmg; const blocked = to.block && to.face === -from.face; if (blocked) dmg = Math.round(dmg * .25);
      to.hp = Math.max(0, to.hp - dmg); to.hitT = .25; to.stun = blocked ? .05 : .2; to.vx += from.face * spec.kb * (blocked ? .4 : 1); to.act = 'idle';
      sfx.hit(); env.vibe(blocked ? 20 : 60); shake = blocked ? .1 : .25; pr.burst(to.x + from.face * -10, floorY() + to.y - 60, blocked ? '#9b7bff' : '#ffd23f', blocked ? 5 : 12, 200);
      if (from === P) score += blocked ? 5 : dmg * 10;
    }
    function aiThink(dt) {
      const a = A.ai; a.t -= dt; const dist = Math.abs(P.x - A.x); A.face = P.x > A.x ? 1 : -1;
      if (a.t <= 0) { a.t = rnd(.25, .6); const r = Math.random(); a.plan = dist > 110 ? (r < .8 ? 'approach' : 'jump') : (r < .4 ? 'punch' : r < .65 ? 'kick' : r < .8 ? 'block' : r < .9 ? 'retreat' : 'wait'); if (P.act !== 'idle' && Math.random() < .45) a.plan = 'block'; }
      A.block = a.plan === 'block';
      if (A.stun > 0) return;
      if (a.plan === 'approach') A.vx = A.face * 170; else if (a.plan === 'retreat') A.vx = -A.face * 150; else if (a.plan === 'jump') { if (A.y === 0) { A.vy = -600; A.vx = A.face * 150; } }
      else if (a.plan === 'punch') attack(A, 'punch'); else if (a.plan === 'kick') attack(A, 'kick');
    }
    function update(dt) {
      if (over) return; t += dt; bannerT = Math.max(0, bannerT - dt); shake = Math.max(0, shake - dt); pr.update(dt);
      if (state === 'fight') {
        roundT -= dt;
        // joueur
        const dir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
        P.block = !!input.held.down && P.y === 0;
        if (P.stun <= 0 && P.act === 'idle' && !P.block) { if (dir) { P.vx = dir * 210; } if (A.x !== P.x) P.face = A.x > P.x ? 1 : -1; if ((input.pressed.up) && P.y === 0) { P.vy = -640; sfx.jump(); } }
        if (input.pressed.a) attack(P, 'punch'); if (input.pressed.b) attack(P, 'kick');
        aiThink(dt);
        control(P, dt); control(A, dt);
        // séparation des corps
        if (Math.abs(P.x - A.x) < 40) { const push = (40 - Math.abs(P.x - A.x)) / 2; const s = P.x < A.x ? -1 : 1; P.x += s * push; A.x -= s * push; }
        if (P.hp <= 0 || A.hp <= 0 || roundT <= 0) {
          const pw = A.hp <= 0 || (roundT <= 0 && P.hp > A.hp); const aw = P.hp <= 0 || (roundT <= 0 && A.hp > P.hp);
          if (pw) { wins[0]++; score += 500 + P.hp * 10 + Math.round(roundT) * 5; banner = 'K.O. ! Tu gagnes le round'; sfx.win(); }
          else if (aw) { wins[1]++; banner = 'Le Robot gagne le round'; sfx.lose(); } else banner = 'Égalité';
          bannerT = 2; state = 'between'; stateT = 2.2;
        }
      } else if (state === 'between') {
        stateT -= dt; control(P, dt); control(A, dt);
        if (stateT <= 0) {
          if (wins[0] >= 2) { over = true; env.gameOver(score, { win: true, text: 'Victoire ' + wins[0] + ' – ' + wins[1] }); return; }
          if (wins[1] >= 2 || round >= 3) { over = true; env.gameOver(score, { win: wins[0] > wins[1], text: 'Score final ' + wins[0] + ' – ' + wins[1] }); return; }
          round++; newRound();
        }
      }
      env.setScore(score); env.hud('R' + round + ' · ' + Math.max(0, Math.ceil(roundT)) + ' s');
    }
    function drawFighter(c, f) {
      const fy = floorY() + f.y; c.save(); c.translate(f.x, fy); if (shake > 0) c.translate(rnd(-3, 3), 0); c.scale(f.face, 1);
      const hit = f.hitT > 0; const crouch = f.block ? .8 : 1; const atk = ATT[f.act]; const prog = atk ? f.actT / atk.dur : 0; const ext = atk ? Math.sin(Math.min(1, prog * 2) * Math.PI) : 0;
      c.lineCap = 'round'; c.lineWidth = 9; c.strokeStyle = hit ? '#fff' : f.color;
      // jambes
      c.beginPath(); c.moveTo(-6, -40 * crouch); c.lineTo(-14, 0); c.moveTo(6, -40 * crouch); if (f.act === 'kick') c.lineTo(6 + 46 * ext, -36 - 10 * ext); else c.lineTo(14, 0); c.stroke();
      // corps
      c.beginPath(); c.moveTo(0, -42 * crouch); c.lineTo(0, -82 * crouch); c.stroke();
      // bras
      c.beginPath(); c.moveTo(0, -74 * crouch); if (f.act === 'punch') c.lineTo(10 + 44 * ext, -72); else if (f.block) { c.lineTo(16, -60); c.lineTo(14, -84); } else c.lineTo(16, -56 * crouch); c.moveTo(0, -74 * crouch); c.lineTo(-14, -54 * crouch); c.stroke();
      // tête
      c.fillStyle = hit ? '#fff' : (f === A ? '#c9c9d6' : '#ffb27a'); c.beginPath(); c.arc(0, -96 * crouch, 14, 0, 7); c.fill();
      if (f === A) { c.fillStyle = '#ff4f4f'; c.fillRect(2, -100 * crouch, 10, 4); } else { c.fillStyle = '#1b1540'; c.fillRect(4, -100 * crouch, 4, 4); }
      if (f.block) { c.strokeStyle = 'rgba(155,123,255,.7)'; c.lineWidth = 3; c.beginPath(); c.arc(0, -60, 44, -1.2, 1.2); c.stroke(); }
      c.restore();
    }
    function draw(c) {
      const W = env.W, H = env.H, fy = floorY();
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b1540'); g.addColorStop(1, '#4b2a7a'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 12; i++) { c.fillRect(i * (W / 12), 60 + (i % 3) * 30, W / 24, fy - 100 - (i % 3) * 30); }
      c.fillStyle = '#ff4f9a'; c.shadowColor = '#ff4f9a'; c.shadowBlur = 20; c.fillRect(0, fy, W, 4); c.shadowBlur = 0; c.fillStyle = '#2a1f5c'; c.fillRect(0, fy + 4, W, H - fy);
      pr.draw(c);
      drawFighter(c, A); drawFighter(c, P);
      // barres de vie
      const bw = Math.min(260, W * .4);
      [[P, 16, 1], [A, W - 16 - bw, -1]].forEach(([f, x, d]) => {
        c.fillStyle = 'rgba(0,0,0,.4)'; Draw.rr(c, x, 14, bw, 18, 9); c.fill();
        const w = bw * f.hp / 100; c.fillStyle = f.hp > 50 ? '#9dff5c' : f.hp > 25 ? '#ffd23f' : '#ff6a55'; if (w > 0) { Draw.rr(c, d > 0 ? x : x + bw - w, 14, w, 18, 9); c.fill(); }
        Draw.text(c, f.name, d > 0 ? x : x + bw, 44, 13, '#fff', d > 0 ? 'left' : 'right', 800);
        for (let i = 0; i < 2; i++) { c.fillStyle = i < wins[f === P ? 0 : 1] ? '#ffd23f' : 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(d > 0 ? x + bw - 10 - i * 18 : x + 10 + i * 18, 44, 6, 0, 7); c.fill(); }
      });
      if (bannerT > 0) { c.globalAlpha = Math.min(1, bannerT * 1.5); Draw.text(c, banner, W / 2, H * .3, 30, '#ffd23f'); c.globalAlpha = 1; }
    }
    newRound();
    return { update, draw, resize: () => { P.x = clamp(P.x, 30, env.W - 30); A.x = clamp(A.x, 30, env.W - 30); } };
  }
});
