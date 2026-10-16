/* ===== Duel Arena (dès 13 ans) — jeu de combat : 4 combattants, combos, spéciaux, 6 niveaux, boss ===== */
const DUEL_FIGHTERS = [
  { id: 'rex', name: 'Rex', color: '#38e0d6', color2: '#1a8f88', skin: '#ffb27a', hair: '#ff4f4f', speed: 240, hp: 100, punch: 7, kick: 13, special: 'fireball', sname: 'Boule de feu', desc: 'Équilibré · boule de feu à distance' },
  { id: 'bruno', name: 'Bruno', color: '#ff9f1c', color2: '#b35f00', skin: '#c98a5e', hair: '#3a2a1a', speed: 185, hp: 125, punch: 9, kick: 17, special: 'uppercut', sname: 'Uppercut', desc: 'Costaud et lent · uppercut dévastateur' },
  { id: 'kira', name: 'Kira', color: '#ff4f9a', color2: '#a3205f', skin: '#ffd9b3', hair: '#1b1540', speed: 290, hp: 85, punch: 5, kick: 10, special: 'dash', sname: 'Ruée éclair', desc: 'Très rapide · ruée qui traverse' },
  { id: 'volt', name: 'Volt', color: '#9dff5c', color2: '#3f9a1f', skin: '#c9c9d6', hair: '#4b3fa3', speed: 215, hp: 100, punch: 6, kick: 12, special: 'lightning', sname: 'Éclair', desc: 'Robot · éclair qui tombe sur l\'adversaire' }
];
const DUEL_LEVELS = [
  { foe: 'bruno', ai: .3, arena: 'dojo', title: 'Le Dojo' },
  { foe: 'kira', ai: .45, arena: 'roof', title: 'Les Toits' },
  { foe: 'volt', ai: .55, arena: 'forest', title: 'La Forêt' },
  { foe: 'rex', ai: .68, arena: 'volcano', title: 'Le Volcan' },
  { foe: 'kira', ai: .8, arena: 'space', title: 'La Station', dark: true },
  { foe: 'titan', ai: .9, arena: 'throne', title: 'La Salle du Trône', boss: true }
];
GAMES.push({
  id: 'duel', landscape: true, title: 'Duel Arena', tagline: 'Combats, combos, 6 niveaux', minAge: 13, color: '#ff4f9a',
  icon: '<svg viewBox="0 0 64 64"><rect x="10" y="48" width="44" height="6" rx="3" fill="#362b8a"/><circle cx="20" cy="18" r="7" fill="#ffb27a"/><rect x="14" y="26" width="12" height="16" rx="4" fill="#38e0d6"/><rect x="26" y="28" width="14" height="6" rx="3" fill="#ffb27a"/><circle cx="46" cy="18" r="7" fill="#c9c9d6"/><rect x="40" y="26" width="12" height="16" rx="4" fill="#ff4f9a"/><rect x="42" y="16" width="8" height="3" fill="#ff4f4f"/><path d="M34 22l4 6-6 2z" fill="#ffd23f"/></svg>',
  howto: ['', '', 'Choisis ton combattant. POING (enchaîne 3 fois = combo), PIED (puissant), SAUT + coup = attaque aérienne, Bas = garde. La barre jaune se remplit : SPÉCIAL quand elle est à moitié ! 6 adversaires, un boss à la fin.'],
  pad: { left: true, buttons: [{ k: 'up', label: 'SAUT' }, { k: 'c', label: 'SPÉCIAL' }, { k: 'a', label: 'POING' }, { k: 'b', label: 'PIED' }], hint: 'Bas = garde' },
  stars: s => s >= 9000 ? 3 : s >= 4500 ? 2 : s >= 1500 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env;
    const pr = Particles();
    let phase = 'select', selIdx = 0, level = 0, round = 1, wins = [0, 0], roundT = 60, phaseT = 0, t = 0, score = 0, banner = '', bannerT = 0, bigBanner = false, shake = 0, slow = 1, over = false, combo = { n: 0, t: 0 }, projs = [], fxs = [], hitstop = 0, pops = [], flashT = 0;
    const SC = () => clamp(env.H / 430, .9, 1.7); // taille des combattants selon l'écran
    let P = null, A = null;
    const floorY = () => env.H - 60;
    const ATT = {
      punch: { dur: .24, hitAt: .08, range: 72, kb: 120, stun: .22, cd: .04 }, punch2: { dur: .24, hitAt: .08, range: 76, kb: 140, stun: .22, cd: .04 }, punch3: { dur: .34, hitAt: .12, range: 84, kb: 320, stun: .4, cd: .18 },
      kick: { dur: .46, hitAt: .18, range: 100, kb: 260, stun: .35, cd: .2 }, air: { dur: .36, hitAt: .1, range: 86, kb: 200, stun: .3, cd: .1 },
      uppercut: { dur: .55, hitAt: .14, range: 70, kb: 160, stun: .7, cd: .3, launch: true }, dash: { dur: .34, hitAt: .06, range: 60, kb: 300, stun: .4, cd: .25, move: 900 }, fireball: { dur: .5, hitAt: .18, cd: .2 }, lightning: { dur: .7, hitAt: .32, cd: .3 }, shock: { dur: .8, hitAt: .3, cd: .4 }
    };
    function makeFighter(def, x, face, ai) {
      const boss = def === 'titan'; const d = boss ? { id: 'titan', name: 'Titan', color: '#4b3fa3', color2: '#2a1f5c', skin: '#8a8aa8', hair: '#ffd23f', speed: 170, hp: 170, punch: 11, kick: 19, special: 'shock', sname: 'Onde de choc', desc: 'Le boss' } : DUEL_FIGHTERS.find(f => f.id === def);
      return { def: d, x, y: 0, vx: 0, vy: 0, face, hp: d.hp, max: d.hp, power: 40, act: 'idle', actT: 0, cd: 0, block: false, hitT: 0, stun: 0, hitDone: false, chain: 0, chainT: 0, down: 0, ko: false, koT: 0, ai: ai == null ? null : { d: ai, t: 0, plan: 'approach' }, scale: boss ? 1.3 : 1, walk: 0, perfect: true, moveName: '', moveT: 0 };
    }
    function startLevel() {
      const L = DUEL_LEVELS[level]; round = 1; wins = [0, 0]; newRound(true);
      banner = 'NIVEAU ' + (level + 1) + ' · ' + L.title; bannerT = 2.2; bigBanner = true; phase = 'intro'; phaseT = 2.4; persist();
    }
    function newRound(first) {
      const L = DUEL_LEVELS[level]; const pdef = DUEL_FIGHTERS[selIdx];
      const ALT = { rex: 'volt', bruno: 'rex', kira: 'bruno', volt: 'kira' }; const foe = L.foe === pdef.id ? ALT[L.foe] : L.foe;
      P = makeFighter(pdef.id, env.W * .3, 1, null); A = makeFighter(foe, env.W * .7, -1, L.ai); A.def = Object.assign({}, A.def); if (L.dark && !L.boss) { A.def.color = '#2a1f5c'; A.def.name = A.def.name + ' Sombre'; }
      roundT = 60; projs = []; combo = { n: 0, t: 0 };
      if (!first) { banner = 'ROUND ' + round; bannerT = 1.4; bigBanner = true; phase = 'intro'; phaseT = 1.6; }
    }
    function persist() { env.save({ level, selIdx, score }, 'Niveau ' + (level + 1) + ' · ' + DUEL_FIGHTERS[selIdx].name + ' · ' + score + ' pts'); }
    function startAttack(f, kind) {
      if (f.ko || f.down > 0 || f.stun > 0 || f.cd > 0) return false;
      if (f.act !== 'idle' && !(f.act.startsWith('punch') && kind === 'punch' && f.chainT > 0)) return false;
      if (kind === 'punch') { if (f.act.startsWith('punch') && f.chainT > 0) { f.chain = Math.min(3, f.chain + 1); kind = 'punch' + (f.chain === 1 ? '' : f.chain); } else { f.chain = 1; } }
      if (kind === 'special') { if (f.power < 50) return false; f.power -= 50; kind = f.def.special; fx(f.x, floorY() + f.y - 60 * f.scale * SC(), f.def.color, 24, 260); sfx.win(); f.moveName = f.def.sname.toUpperCase() + ' !'; f.moveT = 1; flashT = .12; if (kind === 'lightning') fxs.push({ x: other(f).x, y: floorY(), t: .32, warn: true }); }
      f.act = kind; f.actT = 0; f.hitDone = false; f.chainT = 0; if (kind !== 'fireball' && kind !== 'lightning') sfx.punch();
      if (kind === 'dash') f.vx = f.face * ATT.dash.move;
      return true;
    }
    function fx(x, y, c, n, sp) { pr.burst(x, y, c, n, sp); }
    function other(f) { return f === P ? A : P; }
    function hit(from, to, dmg, kb, stun, launch) {
      const blocked = to.block && to.face === -from.face && to.y === 0 && !launch;
      if (blocked) { dmg = Math.round(dmg * .2); kb *= .4; stun = .08; }
      to.hp = Math.max(0, to.hp - dmg); to.hitT = .2; to.stun = stun; to.vx += from.face * kb; to.act = 'idle'; to.chain = 0; to.perfect = false;
      from.power = Math.min(100, from.power + (blocked ? 3 : 9)); to.power = Math.min(100, to.power + 5);
      if (launch && !blocked) { to.vy = -560; to.y -= 1; to.stun = 1; }
      const hx = to.x - from.face * 10, hy = floorY() + to.y - 60 * to.scale * SC();
      fx(hx, hy, blocked ? '#9b7bff' : '#ffd23f', blocked ? 5 : 14, blocked ? 120 : 260); fxs.push({ x: hx, y: hy, t: .18, blocked });
      sfx.hit(); env.vibe(blocked ? 15 : 60); shake = Math.max(shake, blocked ? .08 : dmg > 15 ? .3 : .18); hitstop = blocked ? .04 : dmg >= 18 ? .13 : dmg >= 12 ? .09 : .06;
      pops.push({ x: hx, y: hy - 30, t: .9, txt: blocked ? 'GARDE' : String(dmg), big: dmg >= 15, c: blocked ? '#9b7bff' : dmg >= 15 ? '#ff4f4f' : '#fff' });
      if (from === P) { if (!blocked) { combo.n++; combo.t = 1.2; score += dmg * 10 * Math.max(1, combo.n); } else score += 5; }
      if (to.hp <= 0) ko(to);
    }
    function ko(f) { f.ko = true; f.koT = 0; f.vy = -380; f.vx = -f.face * 260; slow = .3; sfx.lose(); env.vibe(300); shake = .6; banner = 'K.O. !'; bannerT = 2; bigBanner = true; phase = 'end'; phaseT = 2.4; }
    function controlFighter(f, dt) {
      const spec = ATT[f.act];
      if (spec) {
        f.actT += dt;
        if (!f.hitDone && f.actT >= spec.hitAt) {
          f.hitDone = true; const o = other(f);
          if (f.act === 'fireball') projs.push({ x: f.x + f.face * 40, y: floorY() + f.y - 60 * f.scale * SC(), vx: f.face * 460, from: f, t: 1.6, kind: 'fire', trail: [] });
          else if (f.act === 'shock') projs.push({ x: f.x + f.face * 50, y: floorY() - 14, vx: f.face * 300, from: f, t: 2, kind: 'shock' });
          else if (f.act === 'lightning') { const tx = o.x; fxs.push({ x: tx, y: 0, t: .3, bolt: true }); if (Math.abs(o.x - tx) < 50 && o.y > -120) hit(f, o, 22, 80, .5, false); }
          else { const dist = (o.x - f.x) * f.face; const yOk = f.act === 'air' ? (o.y - f.y) > -90 && (o.y - f.y) < 60 : Math.abs(o.y - f.y) < 80; if (dist > -10 && dist < spec.range * f.scale * SC() && yOk && !o.ko && o.down <= 0) hit(f, o, f.act === 'air' ? 10 : f.act === 'kick' ? f.def.kick : f.act === 'punch3' ? f.def.punch + 5 : f.act === 'uppercut' ? 26 : f.act === 'dash' ? 18 : f.def.punch, spec.kb, spec.stun, !!spec.launch); }
        }
        if (f.act.startsWith('punch') && f.actT >= spec.dur - .1 && f.chain < 3) f.chainT = .14;
        if (f.actT >= spec.dur) { f.act = 'idle'; f.cd = spec.cd; if (f.chain >= 3) f.chain = 0; }
      }
      f.cd = Math.max(0, f.cd - dt); f.hitT = Math.max(0, f.hitT - dt); f.stun = Math.max(0, f.stun - dt); f.chainT = Math.max(0, f.chainT - dt); if (f.chainT <= 0 && f.act === 'idle') f.chain = 0;
      f.vy += 1900 * dt; f.y += f.vy * dt;
      if (f.y > 0) { f.y = 0; if (f.vy > 300 && f.stun > 0 && !f.ko) { f.down = .7; f.stun = 0; shake = .2; fx(f.x, floorY(), '#fff', 8, 100); } f.vy = 0; }
      f.down = Math.max(0, f.down - dt);
      f.x += f.vx * dt; f.x = clamp(f.x, 36, env.W - 36); f.vx *= Math.pow(f.act === 'dash' ? .02 : .001, dt);
      if (f.ko) f.koT += dt;
    }
    function aiThink(dt) {
      const a = A.ai, d = a.d; a.t -= dt; const dist = Math.abs(P.x - A.x); if (A.ko || A.down > 0) return; A.face = P.x > A.x ? 1 : -1;
      if (a.t <= 0) {
        a.t = rnd(.5, 1.1) - d * .4; const r = Math.random(); const far = dist > 130;
        if (A.power >= 50 && Math.random() < .3 + d * .6) a.plan = 'special';
        else if (far) a.plan = r < .6 + d * .2 ? 'approach' : r < .85 ? 'jump' : 'wait';
        else a.plan = r < .3 + d * .2 ? 'punch' : r < .55 + d * .2 ? 'kick' : r < .8 ? 'block' : 'retreat';
        if (P.act !== 'idle' && !far && Math.random() < .25 + d * .5) a.plan = 'block';
        if (P.act === 'fireball' && Math.random() < d) a.plan = 'jump';
      }
      A.block = a.plan === 'block' && A.y === 0;
      if (A.stun > 0 || A.act !== 'idle') return;
      if (a.plan === 'approach') A.vx = A.face * A.def.speed * .9; else if (a.plan === 'retreat') A.vx = -A.face * A.def.speed * .8;
      else if (a.plan === 'jump') { if (A.y === 0) { A.vy = -640; A.vx = A.face * 180; } a.plan = 'approach'; }
      else if (a.plan === 'punch') { startAttack(A, 'punch'); if (Math.random() < d) setTimeout(() => { if (phase === 'fight') startAttack(A, 'punch'); }, 180); }
      else if (a.plan === 'kick') startAttack(A, 'kick'); else if (a.plan === 'special') { if (!startAttack(A, 'special')) a.plan = 'approach'; }
      if (A.y < 0 && dist < 110 && Math.random() < d * dt * 4) startAttack(A, 'air');
    }
    function update(dt0) {
      if (over) return; slow += (1 - slow) * Math.min(1, dt0 * 3); let dt = dt0 * slow; t += dt; flashT = Math.max(0, flashT - dt0);
      for (let i = pops.length - 1; i >= 0; i--) { pops[i].t -= dt0; pops[i].y -= 40 * dt0; if (pops[i].t <= 0) pops.splice(i, 1); }
      if (hitstop > 0) { hitstop -= dt0; dt = 0; } bannerT = Math.max(0, bannerT - dt0); shake = Math.max(0, shake - dt0); pr.update(dt);
      for (let i = fxs.length - 1; i >= 0; i--) { fxs[i].t -= dt0; if (fxs[i].t <= 0) fxs.splice(i, 1); }
      if (phase === 'select') { selectUpdate(); return; }
      if (phase === 'intro') { phaseT -= dt0; if (phaseT <= .6 && banner !== 'COMBATTEZ !') { banner = 'COMBATTEZ !'; bannerT = .8; bigBanner = true; } if (phaseT <= 0) phase = 'fight'; return; }
      if (phase === 'fight') {
        roundT -= dt; combo.t -= dt; if (combo.t <= 0) combo.n = 0;
        const dir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
        P.block = !!input.held.down && P.y === 0 && P.act === 'idle';
        if (P.stun <= 0 && P.act === 'idle' && !P.block && P.down <= 0) { if (dir) { P.vx = dir * P.def.speed; P.walk += dt * 10; } if (A.x !== P.x) P.face = A.x > P.x ? 1 : -1; if (input.pressed.up && P.y === 0) { P.vy = -680; sfx.jump(); } }
        if (input.pressed.a) startAttack(P, P.y < 0 ? 'air' : 'punch'); if (input.pressed.b) startAttack(P, P.y < 0 ? 'air' : 'kick'); if (input.pressed.c) { if (!startAttack(P, 'special') && P.power < 50) { banner = 'Barre jaune à 50 % pour le spécial'; bannerT = .9; bigBanner = false; } }
        if (dt > 0) { aiThink(dt); controlFighter(P, dt); controlFighter(A, dt); } P.moveT = Math.max(0, P.moveT - dt0); A.moveT = Math.max(0, A.moveT - dt0);
        for (let i = projs.length - 1; i >= 0; i--) { const p = projs[i]; p.x += p.vx * dt; p.t -= dt; const o = other(p.from); if (p.t <= 0 || p.x < -40 || p.x > env.W + 40) { projs.splice(i, 1); continue; } const oy = floorY() + o.y - (p.kind === 'shock' ? 10 : 60 * o.scale * SC()); if (!o.ko && Math.abs(p.x - o.x) < 34 && Math.abs(p.y - oy) < (p.kind === 'shock' ? 30 : 50)) { projs.splice(i, 1); hit(p.from, o, p.kind === 'shock' ? 24 : 20, 220, .4, false); fx(p.x, p.y, p.kind === 'shock' ? '#ffd23f' : '#ff9f1c', 14, 200); } }
        const sep = 44 * SC(); if (Math.abs(P.x - A.x) < sep && P.act !== 'dash' && A.act !== 'dash') { const push = (sep - Math.abs(P.x - A.x)) / 2, s = P.x < A.x ? -1 : 1; P.x += s * push; A.x -= s * push; }
        if (roundT <= 0 && phase === 'fight') { phase = 'end'; phaseT = 2.2; banner = 'TEMPS ÉCOULÉ'; bannerT = 2; bigBanner = true; }
      } else if (phase === 'end') {
        phaseT -= dt0; controlFighter(P, dt); controlFighter(A, dt);
        if (phaseT <= 0) {
          const pw = A.hp <= 0 || (P.hp > A.hp && A.hp > 0 && P.hp > 0), aw = P.hp <= 0 || (A.hp > P.hp && P.hp > 0 && A.hp > 0);
          if (pw) { wins[0]++; let pts = 500 + Math.round(P.hp / P.max * 100) * 10 + Math.round(roundT) * 3; if (P.perfect) { pts += 300; banner = 'PERFECT !'; } score += pts; sfx.win(); }
          else if (aw) wins[1]++;
          if (wins[0] >= 2) { score += 1000 * (level + 1); level++; if (level >= DUEL_LEVELS.length) { over = true; env.gameOver(score, { win: true, title: 'CHAMPION !', text: 'Tu as battu Titan et les 5 autres' }); return; } startLevel(); }
          else if (wins[1] >= 2) { over = true; env.gameOver(score, { text: 'Niveau ' + (level + 1) + ' · battu par ' + A.def.name }); return; }
          else { round++; newRound(false); }
        }
      }
      env.setScore(score); env.hud('N' + (level + 1) + ' R' + round + ' · ' + Math.max(0, Math.ceil(roundT)) + ' s');
    }
    // --- sélection du combattant
    function selectUpdate() {
      if (input.pressed.left) { selIdx = (selIdx + 3) % 4; sfx.tap(); } if (input.pressed.right) { selIdx = (selIdx + 1) % 4; sfx.tap(); }
      if (input.tap) { const W = env.W, cw = Math.min(150, (W - 40) / 4), x0 = W / 2 - cw * 2; const i = Math.floor((input.tap.x - x0) / cw); if (input.tap.y > env.H * .22 && input.tap.y < env.H * .72 && i >= 0 && i < 4) { if (selIdx === i) { sfx.ok(); startLevel(); } else { selIdx = i; sfx.tap(); } } else if (input.tap.y >= env.H * .72) { sfx.ok(); startLevel(); } }
      if (input.pressed.a || input.pressed.c) { sfx.ok(); startLevel(); }
    }
    // --- dessin
    function drawArena(c) {
      const W = env.W, H = env.H, fy = floorY(), L = DUEL_LEVELS[Math.min(level, DUEL_LEVELS.length - 1)], a = phase === 'select' ? 'dojo' : L.arena;
      const skies = { dojo: ['#ffb36b', '#ff6a55'], roof: ['#0b0820', '#2a1f5c'], forest: ['#2f7a4f', '#9dff5c'], volcano: ['#2a0a0a', '#ff4f1c'], space: ['#05030f', '#1b1540'], throne: ['#1b1540', '#5b2a8a'] };
      const g = c.createLinearGradient(0, 0, 0, fy); g.addColorStop(0, skies[a][0]); g.addColorStop(1, skies[a][1]); c.fillStyle = g; c.fillRect(0, 0, W, fy);
      if (a === 'dojo') { c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(W * .75, fy * .45, 50, 0, 7); c.fill(); c.fillStyle = 'rgba(60,20,20,.55)'; for (let i = 0; i < 6; i++) c.fillRect(i * W / 5 - 8, fy * .25, 16, fy * .75); c.fillRect(0, fy * .25, W, 14); c.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 5; i++) c.fillRect(i * W / 5 + 20, fy * .32, W / 5 - 56, fy * .5); }
      if (a === 'roof') { c.fillStyle = '#fff'; for (let i = 0; i < 40; i++) c.fillRect((i * 97) % W, (i * 53) % (fy * .6), 2, 2); c.fillStyle = '#120c33'; for (let i = 0; i < 9; i++) { const bw = 60 + (i * 37) % 50, bh = 80 + (i * 71) % 160, bx = i * W / 8 - 20; c.fillRect(bx, fy - bh, bw, bh); c.fillStyle = '#ffd23f'; for (let y = fy - bh + 12; y < fy - 10; y += 22) for (let x = bx + 8; x < bx + bw - 10; x += 18) if ((x * y) % 7 < 4) c.fillRect(x, y, 8, 10); c.fillStyle = '#120c33'; } c.fillStyle = '#ffd9a8'; c.beginPath(); c.arc(W * .15, fy * .25, 36, 0, 7); c.fill(); }
      if (a === 'forest') { c.fillStyle = '#1f5a35'; for (let i = 0; i < 10; i++) { const x = i * W / 9; c.fillRect(x - 10, fy * .3, 20, fy * .7); c.beginPath(); c.arc(x, fy * .3, 60, 0, 7); c.fill(); } c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 12; i++) c.fillRect((i * 131 + t * 20) % W, (i * 67) % fy, 3, 3); }
      if (a === 'volcano') { c.fillStyle = '#3a1010'; c.beginPath(); c.moveTo(0, fy); c.lineTo(W * .3, fy * .3); c.lineTo(W * .4, fy * .45); c.lineTo(W * .5, fy * .2); c.lineTo(W * .7, fy * .5); c.lineTo(W, fy * .3); c.lineTo(W, fy); c.fill(); c.fillStyle = '#ff9f1c'; c.beginPath(); c.arc(W * .5, fy * .22, 14 + Math.sin(t * 5) * 3, 0, 7); c.fill(); c.fillStyle = 'rgba(255,120,30,.5)'; for (let i = 0; i < 20; i++) c.fillRect((i * 83 + t * 30) % W, fy - ((i * 47 + t * 60) % fy), 3, 3); }
      if (a === 'space') { c.fillStyle = '#fff'; for (let i = 0; i < 80; i++) { c.globalAlpha = .3 + (i % 3) * .3; c.fillRect((i * 97 + t * (5 + i % 3 * 8)) % W, (i * 53) % fy, 2, 2); } c.globalAlpha = 1; const px = W * .8, py = fy * .3; const pg = c.createRadialGradient(px - 20, py - 20, 10, px, py, 70); pg.addColorStop(0, '#ffe3a3'); pg.addColorStop(1, '#3a7fc0'); c.fillStyle = pg; c.beginPath(); c.arc(px, py, 70, 0, 7); c.fill(); c.strokeStyle = 'rgba(56,224,214,.5)'; c.lineWidth = 2; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(i * W / 7, fy * .55); c.lineTo(i * W / 7 + 40, fy); c.stroke(); } }
      if (a === 'throne') { c.fillStyle = '#2a1f5c'; for (let i = 0; i < 7; i++) c.fillRect(i * W / 6 - 14, 0, 28, fy); c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(W / 2 - 60, fy); c.lineTo(W / 2 - 40, fy * .35); c.lineTo(W / 2 - 20, fy * .5); c.lineTo(W / 2, fy * .25); c.lineTo(W / 2 + 20, fy * .5); c.lineTo(W / 2 + 40, fy * .35); c.lineTo(W / 2 + 60, fy); c.fill(); c.fillStyle = '#ff4f4f'; c.fillRect(W / 2 - 50, fy * .55, 100, fy * .45); for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(255,210,63,' + (.4 + Math.sin(t * 3 + i) * .3) + ')'; c.beginPath(); c.arc(i * W / 5 + 40, fy * .2, 6, 0, 7); c.fill(); } }
      // sol
      const floors = { dojo: '#c98a5e', roof: '#3a3a4a', forest: '#5a8a3a', volcano: '#4a1a1a', space: '#2a2270', throne: '#5b2a8a' };
      c.fillStyle = floors[a]; c.fillRect(0, fy, W, H - fy); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, fy, W, 3); c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 1; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(W / 2 + (i - 4) * 60, fy); c.lineTo(W / 2 + (i - 4) * 110, H); c.stroke(); }
    }
    // --- combattant : silhouettes cernées, poses clés (anticipation / frappe / récupération)
    function shape(c, fill) { c.fillStyle = fill; c.fill(); c.lineWidth = 3; c.strokeStyle = '#1b1540'; c.stroke(); }
    function limb(c, x, y, w, h, r, fill) { Draw.rr(c, x, y, w, h, r); shape(c, fill); }
    function ball(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, 7); shape(c, fill); }
    function drawFighter(c, f) {
      const s = f.scale * SC(), fy = floorY() + f.y, hitFlash = f.hitT > 0 && Math.floor(f.hitT * 30) % 2 === 0, d = f.def;
      c.save(); c.translate(f.x, floorY()); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 4, 34 * s * (1 - Math.min(.5, -f.y / 400)), 8 * s, 0, 0, 7); c.fill(); c.restore();
      c.save(); c.translate(f.x, fy); c.scale(f.face * s, s);
      if (f.ko) { const r = Math.min(1, f.koT * 2.5); c.rotate(-r * Math.PI / 2); c.translate(0, -r * 10); }
      else if (f.down > 0) { c.rotate(-Math.PI / 2 * .9); c.translate(0, 14); }
      const spec = ATT[f.act]; const prog = spec ? f.actT / spec.dur : 0;
      // phases : 0-hitAt anticipation (recul), hitAt → hitAt+.1 frappe (extension max), puis récupération
      let ext = 0, wind = 0; if (spec) { const ha = spec.hitAt / spec.dur; if (prog < ha) wind = prog / ha; else { const k = (prog - ha) / (1 - ha); ext = k < .25 ? 1 : 1 - (k - .25) / .75; } }
      const punch = f.act.startsWith('punch') || f.act === 'dash', kick = f.act === 'kick' || f.act === 'air', upper = f.act === 'uppercut', cast = f.act === 'fireball' || f.act === 'lightning' || f.act === 'shock';
      const crouch = f.block ? .8 : 1, lean = f.hitT > 0 ? -.3 : kick ? .22 * ext - .12 * wind : punch ? .12 * ext - .1 * wind : upper ? -.2 * ext + .15 * wind : cast ? -.1 * wind : 0; c.rotate(lean);
      const walk = f.vx !== 0 && f.act === 'idle' && f.y === 0 && !f.block ? Math.sin(f.walk) : 0, bob = f.act === 'idle' && f.y === 0 ? Math.sin(t * 5) * 2 : 0;
      const skin = hitFlash ? '#fff' : d.skin, body = hitFlash ? '#fff' : d.color, dark = hitFlash ? '#fff' : d.color2, glove = hitFlash ? '#fff' : '#ff4f4f', boot = hitFlash ? '#fff' : '#2a2270';
      // jambes
      const legY = -50 * crouch;
      if (f.y < 0 && !kick) { limb(c, -16, legY + 10, 15, 30, 7, dark); limb(c, 4, legY + 4, 15, 30, 7, dark); }
      else if (kick) { limb(c, -18, legY, 15, 52, 7, dark); c.save(); c.translate(6, legY + 6); c.rotate(-1.35 * ext - .3 * wind); limb(c, -7, -4, 16, 44 + 36 * ext, 8, dark); ball(c, 0, 44 + 36 * ext, 10, boot); c.restore(); if (ext > .6) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 5; c.beginPath(); c.arc(6, legY + 6, 70, -1.6, -.2); c.stroke(); } }
      else { limb(c, -18 + walk * 7, legY, 15, 52 - (f.block ? 12 : 0), 7, dark); limb(c, 4 - walk * 7, legY, 15, 52 - (f.block ? 12 : 0), 7, dark); }
      if (!kick) { limb(c, -21 + walk * 7, -8, 22, 10, 4, boot); limb(c, 1 - walk * 7, -8, 22, 10, 4, boot); } else limb(c, -21, -8, 22, 10, 4, boot);
      // torse + ceinture
      limb(c, -22, -108 * crouch + bob, 44, 62 * crouch, 12, body); c.fillStyle = dark; c.fillRect(-22, -54 * crouch + bob, 44, 9); c.fillStyle = '#ffd23f'; c.fillRect(-5, -54 * crouch + bob, 10, 9);
      // bras arrière
      const armY = -98 * crouch + bob;
      c.save(); c.translate(-15, armY + 4); c.rotate(f.block ? -.3 : .5 + walk * .3 - wind * .4); limb(c, -6, 0, 13, 36, 7, body); ball(c, 0, 40, 10, glove); c.restore();
      // bras avant : selon le coup
      c.save(); c.translate(15, armY + 4);
      if (f.block) { c.rotate(-1.1); limb(c, -6, 0, 13, 34, 7, body); ball(c, 0, 38, 11, glove); }
      else if (punch) { c.rotate(1.57 + .5 * wind); const L = 20 + 56 * ext - 14 * wind; limb(c, -6, 0, 13, L, 7, body); ball(c, 0, L + 4, 12, glove); if (ext > .5) { c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(0, L - 30, 9, 36, 0, 0, 7); c.fill(); } }
      else if (upper) { c.rotate(.9 - 2.4 * ext + .3 * wind); const L = 26 + 30 * ext; limb(c, -6, 0, 13, L, 7, body); ball(c, 0, L + 4, 13, '#ffd23f'); if (ext > .4) { c.strokeStyle = 'rgba(255,210,63,.8)'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, L + 10, .3, 1.6); c.stroke(); } }
      else if (cast) { c.rotate(1.3 * (ext || wind * .6)); limb(c, -6, 0, 13, 32, 7, body); ball(c, 0, 40, 9 + (ext + wind) * 9, hitFlash ? '#fff' : d.color); }
      else { c.rotate(-.5 - walk * .3); limb(c, -6, 0, 13, 36, 7, body); ball(c, 0, 40, 10, glove); }
      c.restore();
      // tête
      const hy = -130 * crouch + bob; ball(c, 0, hy, 19, skin);
      c.fillStyle = hitFlash ? '#fff' : d.hair;
      if (d.id === 'volt') { limb(c, -20, hy - 22, 40, 16, 5, hitFlash ? '#fff' : d.hair); c.fillStyle = '#ff4f4f'; c.fillRect(-11, hy - 18, 22, 7); }
      else if (d.id === 'titan') { c.beginPath(); c.moveTo(-22, hy - 8); c.lineTo(-11, hy - 34); c.lineTo(0, hy - 16); c.lineTo(11, hy - 34); c.lineTo(22, hy - 8); c.closePath(); shape(c, hitFlash ? '#fff' : d.hair); }
      else { c.beginPath(); c.arc(0, hy - 7, 19, Math.PI, 0); c.closePath(); shape(c, hitFlash ? '#fff' : d.hair); if (d.id === 'kira') limb(c, -21, hy - 7, 10, 30, 4, hitFlash ? '#fff' : d.hair); if (d.id === 'rex') { c.fillStyle = '#ff4f4f'; c.fillRect(-20, hy - 4, 40, 6); c.fillRect(-26, hy - 2, 9, 14); } }
      c.fillStyle = '#1b1540'; c.fillRect(5, hy - 3, 5, 6); c.fillRect(12, hy - 3, 4, 6); if (f.hitT > 0 || f.ko) c.fillRect(3, hy + 9, 11, 3); else if (spec) { c.fillRect(4, hy + 8, 9, 4); } else c.fillRect(5, hy + 9, 8, 2);
      c.restore();
      // nom du coup spécial au-dessus
      if (f.moveT > 0) { c.globalAlpha = Math.min(1, f.moveT * 2); Draw.text(c, f.moveName, f.x, fy - 160 * s - 20, 18, d.color); c.globalAlpha = 1; }
    }
    function drawHud(c) {
      const W = env.W, bw = Math.min(300, W * .42);
      [[P, 14, 1], [A, W - 14 - bw, -1]].forEach(([f, x, d]) => {
        c.fillStyle = 'rgba(0,0,0,.45)'; Draw.rr(c, x, 14, bw, 20, 10); c.fill();
        const w = bw * f.hp / f.max; c.fillStyle = f.hp / f.max > .5 ? '#9dff5c' : f.hp / f.max > .25 ? '#ffd23f' : '#ff6a55'; if (w > 0) { Draw.rr(c, d > 0 ? x : x + bw - w, 14, w, 20, 10); c.fill(); }
        c.fillStyle = 'rgba(0,0,0,.45)'; Draw.rr(c, x, 38, bw * .6, 8, 4); c.fill(); c.fillStyle = f.power >= 50 ? (Math.floor(t * 6) % 2 ? '#ffd23f' : '#fff') : '#ffd23f'; const pw = bw * .6 * f.power / 100; if (pw > 0) { Draw.rr(c, d > 0 ? x : x + bw - pw, 38, pw, 8, 4); c.fill(); }
        c.fillStyle = f.def.color; c.beginPath(); c.arc(d > 0 ? x + bw + 16 : x - 16, 24, 12, 0, 7); c.fill();
        Draw.text(c, f.def.name, d > 0 ? x : x + bw, 56, 13, '#fff', d > 0 ? 'left' : 'right', 800);
        for (let i = 0; i < 2; i++) { c.fillStyle = i < wins[f === P ? 0 : 1] ? '#ffd23f' : 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(d > 0 ? x + bw - 10 - i * 18 : x + 10 + i * 18, 56, 6, 0, 7); c.fill(); }
      });
      Draw.text(c, String(Math.max(0, Math.ceil(roundT))), W / 2, 26, 26, '#fff');
      if (combo.n > 1 && combo.t > 0) Draw.text(c, combo.n + ' HITS !', W * .3, 90, 22, '#ffd23f');
    }
    function drawSelect(c) {
      const W = env.W, H = env.H; Draw.text(c, 'CHOISIS TON COMBATTANT', W / 2, H * .12, Math.min(28, W / 16), '#ffd23f');
      const cw = Math.min(150, (W - 40) / 4), x0 = W / 2 - cw * 2;
      DUEL_FIGHTERS.forEach((d, i) => { const x = x0 + i * cw, on = i === selIdx; c.fillStyle = on ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.25)'; Draw.rr(c, x + 6, H * .22, cw - 12, H * .5, 14); c.fill(); if (on) { c.strokeStyle = d.color; c.lineWidth = 3; c.stroke(); }
        const f = makeFighter(d.id, 0, 1, null); f.walk = t * 10; drawFighterAt(c, f, x + cw / 2, H * .66, on ? 1 : .85);
        Draw.text(c, d.name, x + cw / 2, H * .26, 18, on ? '#fff' : '#b9b0e6'); });
      const d = DUEL_FIGHTERS[selIdx]; Draw.text(c, d.desc + ' · Spécial : ' + d.sname, W / 2, H * .78, Math.min(15, W / 28), '#fff', 'center', 700); Draw.text(c, 'Tape sur ton combattant pour commencer', W / 2, H * .86 + Math.sin(t * 4) * 3, Math.min(15, W / 28), '#9dff5c', 'center', 800);
    }
    function drawFighterAt(c, f, x, baseY, s) { const fy0 = floorY; const save = { x: f.x, y: f.y, scale: f.scale }; f.x = x; f.y = baseY - fy0(); f.scale = s; drawFighter(c, f); f.x = save.x; f.y = save.y; f.scale = save.scale; }
    function draw(c) {
      const W = env.W, H = env.H; c.save(); if (shake > 0) c.translate(rnd(-8, 8) * shake, rnd(-5, 5) * shake);
      drawArena(c);
      if (phase === 'select') { drawSelect(c); c.restore(); return; }
      for (const p of projs) { if (p.trail) { p.trail.push(p.x); if (p.trail.length > 8) p.trail.shift(); p.trail.forEach((tx, i) => { c.globalAlpha = i / 10; c.fillStyle = '#ff9f1c'; c.beginPath(); c.arc(tx, p.y, 10 + i, 0, 7); c.fill(); }); c.globalAlpha = 1; } c.fillStyle = p.kind === 'shock' ? '#ffd23f' : '#fff'; c.shadowColor = p.kind === 'shock' ? '#ffd23f' : '#ff9f1c'; c.shadowBlur = 24; c.beginPath(); if (p.kind === 'shock') { c.moveTo(p.x - 26, p.y + 14); c.quadraticCurveTo(p.x, p.y - 40, p.x + 26, p.y + 14); } else { c.arc(p.x, p.y, 18 + Math.sin(t * 30) * 3, 0, 7); } c.fill(); c.shadowBlur = 0; c.lineWidth = 3; c.strokeStyle = '#1b1540'; c.stroke(); }
      for (const f of fxs) { if (f.warn) { c.strokeStyle = 'rgba(157,255,92,.9)'; c.lineWidth = 4; c.beginPath(); c.ellipse(f.x, f.y, 40 + (0.32 - f.t) * 60, 12, 0, 0, 7); c.stroke(); continue; } if (f.bolt) { c.strokeStyle = '#9dff5c'; c.lineWidth = 4; c.shadowColor = '#9dff5c'; c.shadowBlur = 16; c.beginPath(); c.moveTo(f.x, 0); for (let y = 40; y < floorY(); y += 40) c.lineTo(f.x + rnd(-14, 14), y); c.lineTo(f.x, floorY()); c.stroke(); c.shadowBlur = 0; } else { c.fillStyle = f.blocked ? '#9b7bff' : '#fff'; c.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, r = k % 2 ? 8 : 22 * (f.t / .18); c.lineTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r); } c.closePath(); c.fill(); } }
      drawFighter(c, A); drawFighter(c, P);
      pr.draw(c); c.restore();
      for (const p of pops) { c.globalAlpha = Math.min(1, p.t * 2); c.lineWidth = 5; c.strokeStyle = '#1b1540'; const fs = p.big ? 34 : 24; c.font = '900 ' + fs + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(p.txt, p.x, p.y); Draw.text(c, p.txt, p.x, p.y, fs, p.c); c.globalAlpha = 1; }
      if (flashT > 0) { c.fillStyle = 'rgba(255,255,255,' + flashT * 2 + ')'; c.fillRect(0, 0, W, H); }
      drawHud(c);
      if (phase === 'fight' && P.power >= 50 && Math.floor(t * 3) % 2) Draw.text(c, 'SPÉCIAL PRÊT !', 14 + Math.min(300, W * .42) / 2, 74, 13, '#ffd23f', 'center', 900);
      if (bannerT > 0) { c.globalAlpha = Math.min(1, bannerT * 1.5); const big = bigBanner; c.lineWidth = 6; c.strokeStyle = '#1b1540'; const fs = big ? Math.min(44, W / 12) : 16; c.font = '900 ' + fs + 'px ' + getComputedStyle(document.body).getPropertyValue('--font-display'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(banner, W / 2, H * .36); Draw.text(c, banner, W / 2, H * .36, fs, big ? '#ffd23f' : '#fff'); c.globalAlpha = 1; }
    }
    if (saved && typeof saved.level === 'number') { level = clamp(saved.level | 0, 0, DUEL_LEVELS.length - 1); selIdx = clamp(saved.selIdx | 0, 0, 3); score = saved.score | 0; startLevel(); }
    else { P = makeFighter('rex', env.W * .3, 1, null); A = makeFighter('bruno', env.W * .7, -1, .3); }
    return { update, draw, resize: () => { if (P) P.x = clamp(P.x, 36, env.W - 36); if (A) A.x = clamp(A.x, 36, env.W - 36); } };
  }
});
