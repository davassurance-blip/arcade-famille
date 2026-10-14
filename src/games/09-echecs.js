/* ===== Échecs (dès 8 ans) — règles : chess.js (BSD, J. Hlywa) · pièces rhosgfx (CC0) · IA minimax maison ===== */
GAMES.push({
  id: 'chess', title: 'Échecs', tagline: 'Contre le Robot ou à deux', minAge: 8, color: '#c9c9d6', dom: true,
  icon: '<svg viewBox="0 0 64 64"><rect x="8" y="8" width="48" height="48" rx="6" fill="#f3ead8"/><g fill="#8a7bd6"><rect x="8" y="8" width="12" height="12" rx="3"/><rect x="32" y="8" width="12" height="12"/><rect x="20" y="20" width="12" height="12"/><rect x="44" y="20" width="12" height="12"/><rect x="8" y="32" width="12" height="12"/><rect x="32" y="32" width="12" height="12"/><rect x="20" y="44" width="12" height="12"/><rect x="44" y="44" width="12" height="12" rx="3"/></g><path d="M38 50h14v-4l-3-3V32l3-5-3-7h-8l-3 7 3 5v11l-3 3z" fill="#1b1540"/><circle cx="45" cy="18" r="3" fill="#1b1540"/></svg>',
  howto: ['', 'Touche une pièce, puis la case où tu veux aller. Mets le roi du Robot échec et mat ! Le bouton Indice te montre un bon coup.', 'Choisis la force du Robot (Facile, Moyen, Fort). Mode 2 joueurs sur la même tablette possible.'],
  pad: null,
  stars: s => s >= 1000 ? 3 : s >= 400 ? 1 : 0,
  create(env, saved) {
    const { dom, sfx } = env; const tier = env.tier;
    const game = new Chess(); let mode = 'robot', lvl = tier >= 2 ? 2 : 1, sel = null, last = null, thinking = false, over = false, human = 'w', hintMv = null, hintT = null, pending = null;
    if (saved && saved.fen) { try { game.load(saved.fen); mode = saved.mode || 'robot'; if (saved.lvl != null) lvl = saved.lvl; } catch (e) { game.reset(); } }
    const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
    const LVL = [{ n: 'Facile', d: 1, noise: 90 }, { n: 'Moyen', d: 2, noise: 30 }, { n: 'Fort', d: 3, noise: 6 }];
    const FILES = 'abcdefgh';
    const img = (color, type) => { const i = new Image(); i.src = CHESS_PIECES[color + type.toUpperCase()]; i.alt = ''; i.draggable = false; return i; };
    // --- interface
    const wrap = el('div', { class: 'dg chess-wrap' });
    const bar = el('div', { class: 'chess-bar' });
    const status = el('div', { class: 'chess-status' });
    const modeBtn = el('button', { class: 'btn sm', onclick: () => { if (thinking || pending) return; mode = mode === 'robot' ? 'duo' : 'robot'; render(); persist(); } });
    const lvlBtn = el('button', { class: 'btn sm', onclick: () => { if (thinking) return; lvl = (lvl + 1) % 3; sfx.tap(); render(); persist(); } });
    bar.append(modeBtn, lvlBtn, status);
    const bar2 = el('div', { class: 'chess-bar' });
    const undoBtn = el('button', { class: 'btn sm', onclick: undo }, 'Annuler');
    const hintBtn = el('button', { class: 'btn sm', onclick: hint }, 'Indice');
    const capB = el('div', { class: 'chess-cap' }), capW = el('div', { class: 'chess-cap' });
    bar2.append(undoBtn, capB, hintBtn);
    const board = el('div', { class: 'chess', role: 'grid', 'aria-label': 'Échiquier' });
    const cells = {};
    for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) {
      const sq = FILES[f] + r; const c = el('button', { class: 'sq ' + ((f + r) % 2 ? 'light' : 'dark'), 'data-sq': sq, 'aria-label': sq });
      c.addEventListener('click', () => tap(sq)); cells[sq] = c; board.append(c);
    }
    const promo = el('div', { class: 'chess-promo', hidden: '' });
    wrap.append(bar, board, capW, bar2, promo); dom.append(wrap);
    function fit() { const s = Math.floor(Math.min(env.W - 24, env.H - 150) / 8) * 8; board.style.width = s + 'px'; board.style.height = s + 'px'; }
    function persist() { env.save({ fen: game.fen(), mode, lvl }, (mode === 'robot' ? 'Contre le Robot (' + LVL[lvl].n + ')' : 'À deux') + ' · coup ' + Math.ceil(game.history().length / 2 + .5)); }
    function captured() {
      const start = { p: 8, n: 2, b: 2, r: 2, q: 1 }, left = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
      game.board().forEach(row => row.forEach(p => { if (p && p.type !== 'k') left[p.color][p.type]++; }));
      capW.textContent = ''; capB.textContent = '';
      for (const t of ['q', 'r', 'b', 'n', 'p']) { for (let i = 0; i < start[t] - left.b[t]; i++) capW.append(img('b', t)); for (let i = 0; i < start[t] - left.w[t]; i++) capB.append(img('w', t)); }
    }
    function render() {
      modeBtn.textContent = mode === 'robot' ? 'Robot' : '2 joueurs'; lvlBtn.textContent = LVL[lvl].n; lvlBtn.hidden = mode !== 'robot';
      const turn = game.turn(); const inCheck = game.in_check();
      for (const sq in cells) {
        const c = cells[sq], p = game.get(sq); c.textContent = ''; if (p) { const i = img(p.color, p.type); if (last && sq === last.to) i.classList.add('moved'); c.append(i); }
        c.className = 'sq ' + ((FILES.indexOf(sq[0]) + +sq[1]) % 2 ? 'light' : 'dark');
        if (last && (sq === last.from || sq === last.to)) c.classList.add('last');
        if (sel === sq) c.classList.add('sel');
        if (hintMv && (sq === hintMv.from || sq === hintMv.to)) c.classList.add('hintmv');
        if (p && p.type === 'k' && p.color === turn && inCheck) c.classList.add('check');
      }
      if (sel) game.moves({ square: sel, verbose: true }).forEach(m => cells[m.to].classList.add(game.get(m.to) ? 'cap' : 'hint'));
      captured();
      if (over) return;
      if (thinking) status.textContent = 'Le Robot réfléchit…';
      else status.textContent = (inCheck ? 'Échec ! ' : '') + (mode === 'robot' ? 'À toi de jouer' : (turn === 'w' ? 'Aux Blancs' : 'Aux Noirs'));
      env.hud('Coup ' + Math.ceil(game.history().length / 2 + .5));
    }
    function tap(sq) {
      if (over || thinking || pending) return; if (mode === 'robot' && game.turn() !== human) return;
      const p = game.get(sq);
      if (sel && sel !== sq) {
        const mvs = game.moves({ square: sel, verbose: true }).filter(m => m.to === sq);
        if (mvs.length) { if (mvs[0].promotion) { askPromotion(sel, sq); return; } const mv = game.move({ from: sel, to: sq }); sel = null; after(mv); return; }
      }
      if (p && p.color === game.turn()) { sel = sel === sq ? null : sq; sfx.tap(); } else sel = null;
      render();
    }
    function askPromotion(from, to) {
      pending = { from, to }; promo.textContent = ''; promo.hidden = false; const color = game.turn();
      promo.append(el('span', null, 'Ton pion devient :'));
      ['q', 'r', 'b', 'n'].forEach(t => { const b = el('button', { 'aria-label': t }); b.append(img(color, t)); b.addEventListener('click', () => { promo.hidden = true; const mv = game.move({ from, to, promotion: t }); pending = null; sel = null; after(mv); }); promo.append(b); });
    }
    function after(mv) {
      last = mv; hintMv = null; if (mv.captured) { sfx.coin(); env.vibe(30); } else sfx.pop();
      render(); persist();
      if (checkEnd()) return;
      if (mode === 'robot' && game.turn() !== human) { thinking = true; render(); setTimeout(robotMove, 120); }
    }
    function undo() {
      if (thinking || over || pending) return; if (!game.history().length) return;
      game.undo(); if (mode === 'robot' && game.turn() !== human && game.history().length) game.undo();
      sel = null; last = null; hintMv = null; render(); persist(); sfx.tap();
    }
    function hint() {
      if (thinking || over || pending) return; if (mode === 'robot' && game.turn() !== human) return;
      sfx.ok(); const best = bestMove(2, 0); if (!best) return; hintMv = best; sel = null; render();
      clearTimeout(hintT); hintT = setTimeout(() => { hintMv = null; render(); }, 2500);
    }
    function material(color) { let m = 0; game.board().forEach(row => row.forEach(p => { if (p && p.color === color) m += VAL[p.type]; })); return m; }
    function checkEnd() {
      if (!game.game_over()) return false; over = true;
      const mate = game.in_checkmate(); const loserTurn = game.turn();
      let score, title, text, win;
      if (mate) {
        const winner = loserTurn === 'w' ? 'b' : 'w';
        if (mode === 'robot') { win = winner === human; const bonus = [0, 300, 700][lvl]; score = win ? 1000 + bonus + Math.round(material(human) / 10) : Math.round((3900 - material('b')) / 10); title = win ? 'Échec et mat !' : 'Le Robot gagne'; text = win ? 'Tu as battu le Robot (' + LVL[lvl].n + ')' : 'Le Robot t\'a mis mat'; }
        else { win = true; score = 1000; title = 'Échec et mat !'; text = (winner === 'w' ? 'Les Blancs' : 'Les Noirs') + ' gagnent'; }
      } else { score = 400; title = 'Partie nulle'; text = game.in_stalemate() ? 'Pat : plus aucun coup possible' : 'Match nul'; win = false; }
      status.textContent = title; env.setScore(score); cells[Object.keys(cells).find(s => { const p = game.get(s); return p && p.type === 'k' && p.color === loserTurn; })].classList.add('mate');
      setTimeout(() => env.gameOver(score, { win, title, text }), 1200);
      return true;
    }
    // --- IA : minimax alpha-bêta, captures d'abord
    function evaluate() {
      let s = 0; const b = game.board();
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        const p = b[r][f]; if (!p) continue; let v = VAL[p.type];
        const center = 3.5 - Math.abs(f - 3.5) + 3.5 - Math.abs(r - 3.5);
        if (p.type === 'n' || p.type === 'b' || p.type === 'q') v += center * 4;
        if (p.type === 'p') v += (p.color === 'w' ? 7 - r : r) * 6 + center * 2;
        if (p.type === 'k') v -= center * 3;
        s += p.color === 'w' ? v : -v;
      }
      return s;
    }
    function orderMoves(ms) { return ms.sort((a, b) => (b.captured ? VAL[b.captured] : 0) - (a.captured ? VAL[a.captured] : 0)); }
    function search(depth, alpha, beta, maximizing) {
      if (depth === 0) return evaluate();
      const ms = orderMoves(game.moves({ verbose: true }));
      if (!ms.length) { if (game.in_checkmate()) return maximizing ? -100000 - depth : 100000 + depth; return 0; }
      if (maximizing) { let best = -Infinity; for (const m of ms) { game.move(m); best = Math.max(best, search(depth - 1, alpha, beta, false)); game.undo(); alpha = Math.max(alpha, best); if (beta <= alpha) break; } return best; }
      let best = Infinity; for (const m of ms) { game.move(m); best = Math.min(best, search(depth - 1, alpha, beta, true)); game.undo(); beta = Math.min(beta, best); if (beta <= alpha) break; } return best;
    }
    function bestMove(depth, noise) {
      const side = game.turn(), maxi = side === 'w';
      const ms = orderMoves(game.moves({ verbose: true })); let best = null, bestV = maxi ? -Infinity : Infinity;
      for (const m of ms) { game.move(m); const v = search(depth - 1, -Infinity, Infinity, !maxi) + rnd(-noise, noise); game.undo(); if (maxi ? v > bestV : v < bestV) { bestV = v; best = m; } }
      return best;
    }
    function robotMove() {
      const best = bestMove(LVL[lvl].d, LVL[lvl].noise);
      thinking = false; if (!best) { checkEnd(); return; }
      const mv = game.move(best); last = mv; if (mv.captured) sfx.hit(); else sfx.pop(); render(); persist(); checkEnd();
    }
    fit(); render();
    if (mode === 'robot' && game.turn() !== human && !game.game_over()) { thinking = true; render(); setTimeout(robotMove, 300); }
    return { resize: fit, stop: () => clearTimeout(hintT) };
  }
});
