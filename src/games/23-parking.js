/* ===== Sortie de Parking (dès 5 ans) — casse-tête de voitures à glisser : libère la voiture jaune =====
   30 niveaux par tranche d'âge, du plus simple au plus dur (niveaux fabriqués et vérifiés par tools/parking-gen.js).
   Un niveau = 36 lettres (grille 6×6, ligne par ligne) : « o » case vide, « A » la voiture jaune, B, C… les autres. La sortie est à droite de la 3e rangée. */
function parkParse(s) { const m = {}; for (let i = 0; i < 36; i++) { const ch = s[i]; if (ch === 'o') continue; (m[ch] = m[ch] || []).push(i); } return Object.keys(m).sort().map(ch => { const c = m[ch], h = c.length > 1 && Math.floor(c[0] / 6) === Math.floor(c[1] / 6); return { ch, h, len: c.length, fix: h ? Math.floor(c[0] / 6) : c[0] % 6, pos: h ? c[0] % 6 : Math.floor(c[0] / 6) }; }); }
function parkOcc(P, pos, skip) { const g = new Int8Array(36).fill(-1); for (let i = 0; i < P.length; i++) { if (i === skip) continue; for (let j = 0; j < P[i].len; j++) g[P[i].h ? P[i].fix * 6 + pos[i] + j : (pos[i] + j) * 6 + P[i].fix] = i; } return g; }
function parkSolve(P, start) { // plus court chemin jusqu'à la sortie : renvoie la liste des coups [indice du véhicule, nouvelle position] ou null
  const key = p => p.join(''), seen = new Map([[key(start), null]]), q = [start];
  for (let h = 0; h < q.length && h < 150000; h++) {
    const cur = q[h]; if (cur[0] === 4) { const path = []; let k = key(cur); for (; ;) { const e = seen.get(k); if (!e) break; path.unshift(e.mv); k = e.from; } return path; }
    const g = parkOcc(P, cur), ck = key(cur);
    for (let i = 0; i < P.length; i++) { const p = P[i], at = v => g[p.h ? p.fix * 6 + v : v * 6 + p.fix]; const tryPos = v => { const n = cur.slice(); n[i] = v; const k = key(n); if (!seen.has(k)) { seen.set(k, { from: ck, mv: [i, v] }); q.push(n); } }; for (let v = cur[i] - 1; v >= 0 && at(v) < 0; v--) tryPos(v); for (let v = cur[i] + 1; v + p.len <= 6 && at(v + p.len - 1) < 0; v++) tryPos(v); }
  }
  return null;
}
const PARK_COLS = ['#ffd23f', '#e8452c', '#38a0e0', '#3fbf4f', '#ff8a3d', '#9b7bff', '#ff4f9a', '#27c2b3', '#8a6a4a', '#5c6bc0', '#c0ca33', '#ec407a', '#78909c', '#ab47bc', '#26a69a', '#ef5350'];
GAMES.push({
  id: 'parking', title: 'Sortie de Parking', tagline: 'Déplace les voitures pour sortir la jaune', minAge: 5, color: '#ffb020',
  icon: '<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="8" fill="#4a4f63"/><path d="M60 24v14" stroke="#9dff5c" stroke-width="5"/><rect x="9" y="24" width="26" height="14" rx="5" fill="#ffd23f" stroke="#1b1540" stroke-width="2.5"/><rect x="24" y="27" width="6" height="8" rx="2" fill="#1b3a5c"/><rect x="40" y="10" width="13" height="38" rx="5" fill="#e8452c" stroke="#1b1540" stroke-width="2.5"/><rect x="10" y="44" width="26" height="12" rx="5" fill="#38a0e0" stroke="#1b1540" stroke-width="2.5"/></svg>',
  howto: ['Glisse les voitures avec ton doigt pour faire de la place. La voiture JAUNE doit rouler jusqu\'à la sortie verte !', 'Chaque véhicule ne roule que dans son sens (avant / arrière). Libère le passage pour sortir la voiture jaune par la droite, en un minimum de coups. 30 niveaux.', 'Sors la voiture jaune en un minimum de coups pour gagner 3 étoiles. 30 niveaux, les derniers demandent plus de 25 coups.'],
  pad: null,
  stars: s => s >= 1800 ? 3 : s >= 900 ? 2 : s >= 300 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env, tier = env.tier, pr = Particles();
    const FONT = getComputedStyle(document.body).getPropertyValue('--font-display');
    const LV = PARK_LEVELS[tier], NL = LV.length, pkey = env.profile.id + '_' + tier;
    S.park = S.park || {}; const prog = S.park[pkey] = S.park[pkey] || { stars: [], best: [] }; // progression gardée par joueur
    const unlocked = () => { let n = 0; while (n < NL && prog.stars[n] > 0) n++; return Math.min(NL - 1, n); };
    let phase = 'select', t = 0, over = false, lv = 0, P = [], pos = [], vis = [], moves = 0, undo = [], grab = null, hint = null, hintsUsed = 0, wonT = 0, wonStars = 0, exitX = 0, session = 0, solvedNow = 0, lay = null, btns = [], min = 0, selScroll = 0, tip = 0;
    function start(i, st) { lv = i; P = parkParse(LV[i][0]); min = LV[i][1]; pos = st && st.pos && st.pos.length === P.length ? st.pos.slice() : P.map(p => p.pos); vis = pos.slice(); moves = st ? st.moves | 0 : 0; undo = []; grab = null; hint = null; hintsUsed = st ? st.hints | 0 : 0; wonT = 0; exitX = 0; phase = 'play'; tip = i === 0 && !prog.stars[0] ? 6 : 0; persist(); }
    const persist = () => env.save({ lv, pos, moves, hints: hintsUsed, session }, 'Niveau ' + (lv + 1) + ' · ' + moves + ' coup' + (moves > 1 ? 's' : ''));
    function layout() {
      const W = env.W, H = env.H, land = W > H * 1.1;
      if (land) { const b = Math.min(H - 24, W * .6); lay = { land, b, bx: 14, by: (H - b) / 2, px: b + 40, pw: W - b - 54 }; }
      else { const b = Math.min(W - 28, H - 230); lay = { land, b, bx: (W - b) / 2, by: 76, px: 12, pw: W - 24 }; }
      lay.cs = lay.b / 6;
    }
    function range(i) { const g = parkOcc(P, pos, i), p = P[i], at = v => g[p.h ? p.fix * 6 + v : v * 6 + p.fix]; let a = pos[i], b = pos[i]; while (a > 0 && at(a - 1) < 0) a--; while (b + p.len < 6 && at(b + p.len) < 0) b++; return [a, b]; }
    function applyMove(i, v) { if (v === pos[i]) return; undo.push([i, pos[i]]); pos[i] = v; moves++; hint = null; sfx.tick(); env.vibe(12); if (i === 0 && v === 4) win(); else persist(); }
    function win() {
      const st = moves <= min + (tier === 0 ? 3 : 1) ? 3 : moves <= Math.ceil(min * 1.6) + 2 ? 2 : 1; wonStars = hintsUsed > 2 && tier > 0 ? Math.min(st, 2) : st; phase = 'won'; wonT = 0; sfx.win(); env.vibe(80);
      const before = prog.stars[lv] || 0; if (wonStars > before) { session += (wonStars - before) * 100; prog.stars[lv] = wonStars; } if (!prog.best[lv] || moves < prog.best[lv]) prog.best[lv] = moves; solvedNow++; save(); env.save({ lv: Math.min(NL - 1, lv + 1), session }, 'Niveau ' + Math.min(NL, lv + 2));
    }
    function finish() { over = true; const total = prog.stars.reduce((a, b) => a + (b || 0), 0), all = prog.stars.filter(Boolean).length >= NL; env.gameOver(session, { win: all, title: all ? 'Tous les niveaux réussis !' : 'À bientôt au parking', text: prog.stars.filter(Boolean).length + ' niveaux sur ' + NL + ' · ' + total + ' ★ au total' }); }
    function tapBtn(p) { if (phase === 'won' && wonT <= .9) return true; for (const b of btns) if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) { if (b.off) { sfx.ko(); return true; } b.fn(); return true; } return false; }
    function update(dt) {
      if (over) return; t += dt; pr.update(dt); layout(); tip = Math.max(0, tip - dt); const p = input.pointer;
      for (let i = 0; i < P.length; i++) if (!grab || grab.i !== i) vis[i] += (pos[i] - vis[i]) * Math.min(1, dt * 22);
      if (hint) { hint.t -= dt; if (hint.t <= 0) hint = null; }
      if (phase === 'won') { wonT += dt; exitX += dt * 9; if (wonT < 1.2 && Math.random() < .5) pr.burst(rnd(0, env.W), rnd(0, env.H * .5), pick(PARK_COLS), 5, 200); }
      if (p.justDown && tapBtn(p)) { env.setScore(session); return; }
      if (phase === 'play') {
        if (p.justDown) { const cx = Math.floor((p.x - lay.bx) / lay.cs), cy = Math.floor((p.y - lay.by) / lay.cs); if (cx >= 0 && cx < 6 && cy >= 0 && cy < 6) { const i = parkOcc(P, pos)[cy * 6 + cx]; if (i >= 0) { const r = range(i); grab = { i, a: r[0], b: r[1], p0: P[i].h ? p.x : p.y, v0: pos[i] }; sfx.tap(); if (r[0] === r[1]) { sfx.ko(); } } } }
        if (grab) {
          const pc = P[grab.i]; if (p.down) vis[grab.i] = clamp(grab.v0 + ((pc.h ? p.x : p.y) - grab.p0) / lay.cs, grab.a, grab.b);
          else { const v = clamp(Math.round(vis[grab.i]), grab.a, grab.b), i = grab.i; grab = null; applyMove(i, v); }
        }
      }
      env.setScore(session); env.hud(phase === 'select' ? prog.stars.filter(Boolean).length + '/' + NL + ' niveaux' : 'Niveau ' + (lv + 1) + '/' + NL + ' · ' + moves + ' coup' + (moves > 1 ? 's' : ''));
    }
    // --- dessin d'un véhicule, dans un repère où il roule vers la droite (longueur L, largeur w)
    function vehicle(c, L, w, col, kind, hero) {
      const r = w * .28, dark = 'rgba(0,0,0,.28)';
      c.fillStyle = 'rgba(0,0,0,.25)'; Draw.rr(c, 3, 5, L, w, r); c.fill();
      c.fillStyle = '#1b1540'; for (const x of [L * .16, L * .74]) { Draw.rr(c, x, -w * .06, L * .13, w * 1.12, 3); c.fill(); } // roues
      c.fillStyle = col; c.strokeStyle = '#1b1540'; c.lineWidth = Math.max(2, w * .055); Draw.rr(c, 0, 0, L, w, r); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.22)'; Draw.rr(c, L * .04, w * .08, L * .92, w * .22, r * .5); c.fill();
      if (kind === 'truck') { // cabine + remorque
        c.fillStyle = '#f2f2f7'; c.strokeStyle = '#1b1540'; Draw.rr(c, L * .04, w * .08, L * .62, w * .84, r * .4); c.fill(); c.stroke(); c.strokeStyle = 'rgba(27,21,64,.18)'; c.lineWidth = 2; for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(L * (.04 + k * .124), w * .12); c.lineTo(L * (.04 + k * .124), w * .88); c.stroke(); }
        c.fillStyle = col; c.fillRect(L * .06, w * .42, L * .58, w * .16);
        c.fillStyle = '#1b3a5c'; Draw.rr(c, L * .8, w * .14, L * .1, w * .72, 4); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(L * .82, w * .18, L * .03, w * .3);
      } else if (kind === 'bus') {
        c.fillStyle = '#1b3a5c'; Draw.rr(c, L * .9, w * .14, L * .06, w * .72, 3); c.fill(); for (let k = 0; k < 5; k++) { Draw.rr(c, L * (.1 + k * .155), w * .1, L * .11, w * .16, 2); c.fill(); Draw.rr(c, L * (.1 + k * .155), w * .74, L * .11, w * .16, 2); c.fill(); }
        c.fillStyle = dark; Draw.rr(c, L * .1, w * .34, L * .74, w * .32, 5); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; Draw.rr(c, L * .3, w * .42, L * .14, w * .16, 3); c.fill(); Draw.rr(c, L * .55, w * .42, L * .14, w * .16, 3); c.fill();
      } else { // voiture : pare-brise, toit, lunette arrière
        c.fillStyle = '#1b3a5c'; Draw.rr(c, L * .2, w * .12, L * .52, w * .76, w * .2); c.fill();
        c.fillStyle = col; Draw.rr(c, L * .32, w * .17, L * .26, w * .66, w * .14); c.fill(); c.fillStyle = dark; Draw.rr(c, L * .32, w * .17, L * .26, w * .66, w * .14); c.fill(); c.fillStyle = col; Draw.rr(c, L * .34, w * .21, L * .22, w * .58, w * .12); c.fill();
        c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(L * .62, w * .2); c.lineTo(L * .69, w * .2); c.lineTo(L * .66, w * .42); c.lineTo(L * .62, w * .42); c.fill();
        if (hero) { c.fillStyle = '#fff'; c.beginPath(); c.arc(L * .45, w * .5, w * .13, 0, 7); c.fill(); c.fillStyle = '#1b1540'; c.font = '900 ' + Math.round(w * .2) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('★', L * .45, w * .52); }
      }
      c.fillStyle = '#fff6c8'; Draw.rr(c, L * .955, w * .1, L * .035, w * .2, 2); c.fill(); Draw.rr(c, L * .955, w * .7, L * .035, w * .2, 2); c.fill(); // phares
      c.fillStyle = '#ff4f4f'; Draw.rr(c, L * .01, w * .1, L * .03, w * .18, 2); c.fill(); Draw.rr(c, L * .01, w * .72, L * .03, w * .18, 2); c.fill();
    }
    function button(c, x, y, w, h, label, fn, col, off) { btns.push({ x, y, w, h, fn, off }); c.fillStyle = 'rgba(0,0,0,.25)'; Draw.rr(c, x, y + 4, w, h, 14); c.fill(); c.fillStyle = off ? 'rgba(255,255,255,.14)' : col || '#ffd23f'; Draw.rr(c, x, y, w, h, 14); c.fill(); Draw.text(c, label, x + w / 2, y + h / 2 + 1, Math.min(h * .4, w / (label.length * .78)), off ? 'rgba(255,255,255,.4)' : col && col !== '#ffd23f' && col !== '#9dff5c' ? '#fff' : '#1b1540'); }
    function stars(c, x, y, n, size, dim) { for (let k = 0; k < 3; k++) Draw.text(c, '★', x + (k - 1) * size * 1.05, y, size, k < n ? '#ffd23f' : dim || 'rgba(255,255,255,.22)'); }
    function drawBoard(c) {
      const { bx, by, b, cs } = lay, ey = by + 2 * cs;
      c.fillStyle = 'rgba(0,0,0,.3)'; Draw.rr(c, bx - 10, by - 6, b + 20, b + 22, 18); c.fill();
      c.fillStyle = '#d9d2c5'; Draw.rr(c, bx - 12, by - 12, b + 24, b + 24, 18); c.fill(); // bordure de trottoir
      c.fillStyle = '#4a4f63'; Draw.rr(c, bx - 2, by - 2, b + 4, b + 4, 8); c.fill();
      c.fillStyle = '#4a4f63'; c.fillRect(bx + b, ey + 3, 16, cs - 6); // ouverture de la sortie
      c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 2; for (let k = 1; k < 6; k++) { c.beginPath(); c.moveTo(bx + k * cs, by + 4); c.lineTo(bx + k * cs, by + b - 4); c.moveTo(bx + 4, by + k * cs); c.lineTo(bx + b - 4, by + k * cs); c.stroke(); }
      c.fillStyle = 'rgba(157,255,92,.13)'; c.fillRect(bx, ey, b, cs); // couloir de sortie
      const pulse = .6 + Math.sin(t * 5) * .4; c.fillStyle = 'rgba(157,255,92,' + (.5 + pulse * .5) + ')'; for (let k = 0; k < 3; k++) { const ax = bx + b + 2 + ((t * 14 + k * 7) % 16) - 6; c.beginPath(); c.moveTo(ax, ey + cs * .32); c.lineTo(ax + 8, ey + cs * .5); c.lineTo(ax, ey + cs * .68); c.closePath(); c.fill(); }
      c.fillStyle = '#9dff5c'; c.fillRect(bx + b + 12, ey - 2, 5, cs + 4);
      const order = P.map((p, i) => i).sort((a, b2) => (grab && grab.i === a ? 1 : 0) - (grab && grab.i === b2 ? 1 : 0));
      for (const i of order) {
        const p = P[i], v = vis[i] + (i === 0 && phase === 'won' ? exitX : 0), x = bx + (p.h ? v : p.fix) * cs, y = by + (p.h ? p.fix : v) * cs, L = p.len * cs - 8, w = cs - 10, held = grab && grab.i === i;
        c.save(); if (i === 0 && phase === 'won') { c.beginPath(); c.rect(bx - 2, by - 20, env.W, b + 40); c.clip(); }
        if (p.h) c.translate(x + 4, y + 5); else { c.translate(x + 5, y + 4 + L); c.rotate(-Math.PI / 2); } // les véhicules verticaux regardent vers le haut
        if (held) { c.translate(L / 2, w / 2); c.scale(1.04, 1.04); c.translate(-L / 2, -w / 2); }
        vehicle(c, L, w, PARK_COLS[i % PARK_COLS.length], p.len === 3 ? (i % 2 ? 'truck' : 'bus') : 'car', i === 0);
        if (hint && hint.i === i) { c.strokeStyle = '#fff'; c.lineWidth = 4; c.setLineDash([8, 6]); c.lineDashOffset = -t * 30; Draw.rr(c, -3, -3, L + 6, w + 6, w * .3); c.stroke(); c.setLineDash([]); }
        c.restore();
      }
      if (hint) { const p = P[hint.i], d = Math.sign(hint.v - pos[hint.i]), mid = pos[hint.i] + p.len / 2 + d * (p.len / 2 + .15 + (t * 1.5 % .5)), x = bx + (p.h ? mid : p.fix + .5) * cs, y = by + (p.h ? p.fix + .5 : mid) * cs; c.save(); c.translate(x, y); c.rotate(p.h ? (d > 0 ? 0 : Math.PI) : (d > 0 ? Math.PI / 2 : -Math.PI / 2)); c.fillStyle = '#fff'; c.strokeStyle = '#1b1540'; c.lineWidth = 3; c.beginPath(); c.moveTo(-cs * .18, -cs * .22); c.lineTo(cs * .2, 0); c.lineTo(-cs * .18, cs * .22); c.closePath(); c.fill(); c.stroke(); c.restore(); }
      if (tip > 0 && phase === 'play') { const hx = bx + (vis[0] + 1 + (t % 1.6) * 1.2) * cs, hy = ey + cs * .7; c.globalAlpha = Math.min(1, tip); c.fillStyle = '#fff'; c.strokeStyle = '#1b1540'; c.lineWidth = 3; c.beginPath(); c.arc(hx, hy, cs * .16, 0, 7); c.fill(); c.stroke(); Draw.rr(c, hx - cs * .07, hy, cs * .14, cs * .3, cs * .07); c.fill(); c.stroke(); c.globalAlpha = 1; }
    }
    function draw(c) {
      const W = env.W, H = env.H; if (!lay) layout(); btns = [];
      const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#3f8f4f'); bg.addColorStop(1, '#2f6f43'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 40; i++) c.fillRect((i * 131) % W, (i * 71) % H, 14, 5);
      if (phase === 'select') { drawSelect(c); return; }
      drawBoard(c); pr.draw(c);
      const best = prog.best[lv], info = 'Objectif : ' + min + ' coup' + (min > 1 ? 's' : '') + (best ? '  ·  Ton record : ' + best : '');
      if (lay.land) {
        const x = lay.px, w = lay.pw; Draw.text(c, 'NIVEAU ' + (lv + 1), x + w / 2, 30, 24, '#fff'); stars(c, x + w / 2, 60, prog.stars[lv] || 0, 20);
        Draw.text(c, moves + ' coup' + (moves > 1 ? 's' : ''), x + w / 2, 96, 30, '#ffd23f'); Draw.text(c, info, x + w / 2, 124, Math.min(13, w / 24), 'rgba(255,255,255,.85)', 'center', 700);
        const bh = Math.min(48, (H - 160) / 4 - 8), y0 = 146; button(c, x, y0, w, bh, '↶ ANNULER', doUndo, '#7c5cff', !undo.length); button(c, x, y0 + (bh + 8), w, bh, '⟳ RECOMMENCER', () => { sfx.tap(); start(lv); }, '#38a0e0'); button(c, x, y0 + (bh + 8) * 2, w, bh, '💡 INDICE', doHint, '#ffd23f'); button(c, x, y0 + (bh + 8) * 3, w, bh, '☰ NIVEAUX', () => { sfx.tap(); phase = 'select'; }, '#4a4f63');
      } else {
        Draw.text(c, 'NIVEAU ' + (lv + 1), 16, 26, 22, '#fff', 'left'); stars(c, W / 2 + 6, 27, prog.stars[lv] || 0, 16); Draw.text(c, moves + ' coup' + (moves > 1 ? 's' : ''), W - 16, 26, 22, '#ffd23f', 'right'); Draw.text(c, info, W / 2, 54, Math.min(13, W / 28), 'rgba(255,255,255,.85)', 'center', 700);
        const y = lay.by + lay.b + 30, bw = (W - 24 - 16) / 3, bh = Math.min(54, H - y - 70); button(c, 12, y, bw, bh, '↶ ANNULER', doUndo, '#7c5cff', !undo.length); button(c, 12 + bw + 8, y, bw, bh, '⟳ REFAIRE', () => { sfx.tap(); start(lv); }, '#38a0e0'); button(c, 12 + (bw + 8) * 2, y, bw, bh, '💡 INDICE', doHint, '#ffd23f');
        button(c, W / 2 - 80, y + bh + 14, 160, 40, '☰ NIVEAUX', () => { sfx.tap(); phase = 'select'; }, '#4a4f63');
      }
      if (tip > 0 && phase === 'play') { c.globalAlpha = Math.min(1, tip); const y = lay.by + lay.b * .82; c.fillStyle = 'rgba(23,18,58,.88)'; Draw.rr(c, lay.bx + 6, y - 20, lay.b - 12, 40, 12); c.fill(); Draw.text(c, 'Glisse la voiture jaune vers la sortie', lay.bx + lay.b / 2, y + 1, Math.min(16, lay.b / 22), '#ffd23f'); c.globalAlpha = 1; }
      if (phase === 'won' && wonT > .7) { // panneau de victoire
        btns = []; const a = Math.min(1, (wonT - .7) * 3), pw = Math.min(330, W - 30), ph = 250, x = W / 2 - pw / 2, y = H / 2 - ph / 2; c.fillStyle = 'rgba(10,8,30,' + .55 * a + ')'; c.fillRect(0, 0, W, H); c.globalAlpha = a;
        c.fillStyle = '#17123a'; Draw.rr(c, x, y, pw, ph, 22); c.fill(); c.strokeStyle = '#ffd23f'; c.lineWidth = 4; c.stroke();
        Draw.text(c, pick2(['Bravo !', 'Sortie !', 'Bien joué !'], lv), W / 2, y + 40, 30, '#ffd23f'); for (let k = 0; k < 3; k++) { const on = k < wonStars && wonT > 1 + k * .25, sc = on ? 1 + Math.max(0, .5 - (wonT - 1 - k * .25)) : 1; Draw.text(c, '★', W / 2 + (k - 1) * 54, y + 96, 46 * sc, on ? '#ffd23f' : 'rgba(255,255,255,.18)'); }
        Draw.text(c, moves + ' coup' + (moves > 1 ? 's' : '') + '  ·  objectif ' + min, W / 2, y + 140, 15, '#fff', 'center', 700);
        const last = lv >= NL - 1; button(c, x + 16, y + ph - 76, pw - 32 - 96, 56, last ? 'TERMINER' : 'NIVEAU SUIVANT ▶', () => { sfx.ok(); if (last) finish(); else start(lv + 1); }, '#9dff5c'); button(c, x + pw - 16 - 88, y + ph - 76, 88, 56, '⟳', () => { sfx.tap(); start(lv); }, '#38a0e0'); c.globalAlpha = 1;
      }
    }
    const pick2 = (a, i) => a[i % a.length];
    function doUndo() { const u = undo.pop(); if (!u) return; pos[u[0]] = u[1]; moves = Math.max(0, moves - 1); hint = null; sfx.tap(); persist(); }
    function doHint() { const path = parkSolve(P, pos); if (!path || !path.length) { sfx.ko(); return; } hint = { i: path[0][0], v: path[0][1], t: 4 }; hintsUsed++; sfx.ok(); }
    function drawSelect(c) {
      const W = env.W, H = env.H, land = W > H * 1.1, cols = land ? 10 : 5, rows = Math.ceil(NL / cols), top = land ? 58 : 96, bot = 76, gw = Math.min(W - 24, land ? 900 : 440), cw = gw / cols, ch = Math.min(cw * (land ? .95 : 1.02), (H - top - bot) / rows), x0 = W / 2 - gw / 2, un = unlocked(), total = prog.stars.reduce((a, b) => a + (b || 0), 0);
      Draw.text(c, 'SORTIE DE PARKING', W / 2, land ? 24 : 34, Math.min(26, W / 16), '#ffd23f'); Draw.text(c, total + ' ★ sur ' + NL * 3 + '   ·   choisis un niveau', W / 2, land ? 46 : 64, 14, '#fff', 'center', 700);
      for (let i = 0; i < NL; i++) {
        const x = x0 + (i % cols) * cw + 4, y = top + Math.floor(i / cols) * ch + 4, w = cw - 8, h = ch - 8, st = prog.stars[i] || 0, open = i <= un, cur = i === un && !st;
        btns.push({ x, y, w, h, off: !open, fn: () => { sfx.ok(); start(i); } });
        c.fillStyle = 'rgba(0,0,0,.25)'; Draw.rr(c, x, y + 3, w, h, 12); c.fill(); c.fillStyle = !open ? 'rgba(20,30,25,.45)' : st ? '#2a2166' : cur ? '#ffd23f' : '#4a4f63'; Draw.rr(c, x, y, w, h, 12); c.fill(); if (cur) { c.strokeStyle = '#fff'; c.lineWidth = 2 + Math.sin(t * 6); c.stroke(); }
        if (!open) { c.fillStyle = 'rgba(255,255,255,.35)'; Draw.rr(c, x + w / 2 - w * .16, y + h * .44, w * .32, h * .26, 4); c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.beginPath(); c.arc(x + w / 2, y + h * .44, w * .1, Math.PI, 0); c.stroke(); }
        else { Draw.text(c, String(i + 1), x + w / 2, y + h * (st ? .4 : .5), Math.min(h * .42, w * .44), cur ? '#1b1540' : '#fff'); if (st) stars(c, x + w / 2, y + h * .78, st, Math.min(w * .24, h * .22)); }
      }
      const by = H - bot + 14; if (solvedNow > 0 || session > 0) button(c, W / 2 - 150, by, 140, 46, 'CONTINUER ▶', () => { sfx.ok(); start(un); }, '#9dff5c'), button(c, W / 2 + 10, by, 140, 46, 'TERMINER', finish, '#7c5cff'); else button(c, W / 2 - 110, by, 220, 46, un > 0 ? 'CONTINUER ▶ NIVEAU ' + (un + 1) : 'JOUER ▶', () => { sfx.ok(); start(un); }, '#9dff5c');
    }
    if (saved && typeof saved.lv === 'number') { session = saved.session | 0; start(clamp(saved.lv | 0, 0, NL - 1), saved.pos ? saved : null); }
    return { update, draw, dbg: () => ({ P, pos, lay, lv, moves, phase, min, btns, solve: () => parkSolve(P, pos), go: i => start(i) }) };
  }
});
