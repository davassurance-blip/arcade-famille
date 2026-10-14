/* ===== Échecs (dès 8 ans) — règles : chess.js (BSD, J. Hlywa) · IA minimax maison ===== */
GAMES.push({
  id: 'chess', title: 'Échecs', tagline: 'Contre le Robot ou à deux', minAge: 8, color: '#c9c9d6', dom: true,
  icon: '<svg viewBox="0 0 64 64"><rect x="8" y="8" width="48" height="48" rx="6" fill="#f3ead8"/><g fill="#8a7bd6"><rect x="8" y="8" width="12" height="12" rx="3"/><rect x="32" y="8" width="12" height="12"/><rect x="20" y="20" width="12" height="12"/><rect x="44" y="20" width="12" height="12"/><rect x="8" y="32" width="12" height="12"/><rect x="32" y="32" width="12" height="12"/><rect x="20" y="44" width="12" height="12"/><rect x="44" y="44" width="12" height="12" rx="3"/></g><path d="M38 50h14v-4l-3-3V32l3-5-3-7h-8l-3 7 3 5v11l-3 3z" fill="#1b1540"/><circle cx="45" cy="18" r="3" fill="#1b1540"/></svg>',
  howto: ['', 'Touche une pièce, puis la case où tu veux aller. Mets le roi du Robot échec et mat !', 'Le Robot calcule 3 coups à l\'avance. Mode 2 joueurs sur la même tablette possible.'],
  pad: null,
  stars: s => s >= 1000 ? 3 : s >= 400 ? 1 : 0,
  create(env, saved) {
    const { dom, sfx } = env; const tier = env.tier;
    const game = new Chess(); let mode = 'robot', sel = null, last = null, thinking = false, over = false, human = 'w';
    if (saved && saved.fen) { try { game.load(saved.fen); mode = saved.mode || 'robot'; } catch (e) { game.reset(); } }
    const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
    const GLYPH = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };
    const FILES = 'abcdefgh';
    // --- interface
    const wrap = el('div', { class: 'dg chess-wrap' });
    const bar = el('div', { class: 'chess-bar' });
    const status = el('div', { class: 'chess-status' });
    const modeBtn = el('button', { class: 'btn sm', onclick: () => { if (thinking) return; mode = mode === 'robot' ? 'duo' : 'robot'; render(); persist(); } });
    const undoBtn = el('button', { class: 'btn sm', onclick: undo }, 'Annuler');
    bar.append(modeBtn, status, undoBtn);
    const board = el('div', { class: 'chess', role: 'grid', 'aria-label': 'Échiquier' });
    const cells = {};
    for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) {
      const sq = FILES[f] + r; const c = el('button', { class: 'sq ' + ((f + r) % 2 ? 'light' : 'dark'), 'data-sq': sq, 'aria-label': sq });
      c.addEventListener('click', () => tap(sq)); cells[sq] = c; board.append(c);
    }
    wrap.append(bar, board); dom.append(wrap);
    function fit() { const s = Math.floor(Math.min(env.W - 24, env.H - 90) / 8) * 8; board.style.width = s + 'px'; board.style.height = s + 'px'; }
    function persist() { env.save({ fen: game.fen(), mode }, (mode === 'robot' ? 'Contre le Robot' : 'À deux') + ' · coup ' + Math.ceil(game.history().length / 2 + .5)); }
    function render() {
      modeBtn.textContent = mode === 'robot' ? 'Robot' : '2 joueurs';
      const turn = game.turn(); const inCheck = game.in_check();
      for (const sq in cells) {
        const c = cells[sq], p = game.get(sq); c.textContent = p ? GLYPH[p.type] : ''; c.className = 'sq ' + ((FILES.indexOf(sq[0]) + +sq[1]) % 2 ? 'light' : 'dark') + (p ? ' ' + (p.color === 'w' ? 'w' : 'b') : '');
        if (last && (sq === last.from || sq === last.to)) c.classList.add('last');
        if (sel === sq) c.classList.add('sel');
        if (p && p.type === 'k' && p.color === turn && inCheck) c.classList.add('check');
      }
      if (sel) game.moves({ square: sel, verbose: true }).forEach(m => cells[m.to].classList.add(game.get(m.to) ? 'cap' : 'hint'));
      if (over) return;
      if (thinking) status.textContent = 'Le Robot réfléchit…';
      else status.textContent = (inCheck ? 'Échec ! ' : '') + (mode === 'robot' ? 'À toi de jouer' : (turn === 'w' ? 'Aux Blancs' : 'Aux Noirs'));
      env.hud('Coup ' + Math.ceil(game.history().length / 2 + .5));
    }
    function tap(sq) {
      if (over || thinking) return; if (mode === 'robot' && game.turn() !== human) return;
      const p = game.get(sq);
      if (sel && sel !== sq) { const mv = game.move({ from: sel, to: sq, promotion: 'q' }); if (mv) { sel = null; after(mv); return; } }
      if (p && p.color === game.turn()) { sel = sel === sq ? null : sq; sfx.tap(); } else sel = null;
      render();
    }
    function after(mv) {
      last = mv; if (mv.captured) { sfx.coin(); env.vibe(30); } else sfx.pop();
      render(); persist();
      if (checkEnd()) return;
      if (mode === 'robot' && game.turn() !== human) { thinking = true; render(); setTimeout(robotMove, 80); }
    }
    function undo() {
      if (thinking || over) return; if (!game.history().length) return;
      game.undo(); if (mode === 'robot' && game.turn() !== human && game.history().length) game.undo();
      sel = null; last = null; render(); persist(); sfx.tap();
    }
    function material(color) { let m = 0; game.board().forEach(row => row.forEach(p => { if (p && p.color === color) m += VAL[p.type]; })); return m; }
    function checkEnd() {
      if (!game.game_over()) return false; over = true;
      const mate = game.in_checkmate(); const loserTurn = game.turn();
      let score, title, text, win;
      if (mate) {
        const winner = loserTurn === 'w' ? 'b' : 'w';
        if (mode === 'robot') { win = winner === human; score = win ? 1000 + Math.round(material(human) / 10) : Math.round((3900 - material('b')) / 10); title = win ? 'Échec et mat !' : 'Le Robot gagne'; text = win ? 'Tu as battu le Robot' : 'Le Robot t\'a mis mat'; }
        else { win = true; score = 1000; title = 'Échec et mat !'; text = (winner === 'w' ? 'Les Blancs' : 'Les Noirs') + ' gagnent'; }
      } else { score = 400; title = 'Partie nulle'; text = game.in_stalemate() ? 'Pat : plus aucun coup possible' : 'Match nul'; win = false; }
      status.textContent = title; env.setScore(score);
      setTimeout(() => env.gameOver(score, { win, title, text }), 900);
      return true;
    }
    // --- IA : minimax alpha-bêta, captures d'abord
    function evaluate() {
      let s = 0; const b = game.board();
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        const p = b[r][f]; if (!p) continue; let v = VAL[p.type];
        const center = 3.5 - Math.abs(f - 3.5) + 3.5 - Math.abs(r - 3.5); // 0..7
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
    function robotMove() {
      const depth = tier >= 2 ? 3 : 2, noise = tier >= 2 ? 10 : 60; const robot = game.turn(), maxi = robot === 'w';
      const ms = orderMoves(game.moves({ verbose: true })); let best = null, bestV = maxi ? -Infinity : Infinity;
      for (const m of ms) {
        game.move(m); let v = search(depth - 1, -Infinity, Infinity, !maxi) + rnd(-noise, noise); game.undo();
        if (maxi ? v > bestV : v < bestV) { bestV = v; best = m; }
      }
      thinking = false; if (!best) { checkEnd(); return; }
      const mv = game.move(best); last = mv; if (mv.captured) sfx.hit(); else sfx.pop(); render(); persist(); checkEnd();
    }
    fit(); render();
    if (mode === 'robot' && game.turn() !== human && !game.game_over()) { thinking = true; render(); setTimeout(robotMove, 300); }
    return { resize: fit };
  }
});
