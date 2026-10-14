/* ===== 2048 (dès 8 ans) — d'après le jeu de Gabriele Cirulli (MIT), règles identiques, réécrit pour l'arcade ===== */
GAMES.push({
  id: 'g2048', title: '2048', tagline: 'Fusionne les tuiles jusqu\'à 2048', minAge: 8, color: '#f0b27a', dom: true, swipeDom: true,
  icon: '<svg viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="8" fill="#bbada0"/><rect x="10" y="10" width="20" height="20" rx="3" fill="#eee4da"/><rect x="34" y="10" width="20" height="20" rx="3" fill="#f2b179"/><rect x="10" y="34" width="20" height="20" rx="3" fill="#f59563"/><rect x="34" y="34" width="20" height="20" rx="3" fill="#edc22e"/><text x="20" y="25" font-size="11" font-weight="900" text-anchor="middle" fill="#776e65">2</text><text x="44" y="25" font-size="11" font-weight="900" text-anchor="middle" fill="#fff">8</text><text x="20" y="49" font-size="10" font-weight="900" text-anchor="middle" fill="#fff">32</text><text x="44" y="49" font-size="9" font-weight="900" text-anchor="middle" fill="#fff">2048</text></svg>',
  howto: ['', 'Glisse dans une direction : toutes les tuiles glissent. Deux tuiles identiques fusionnent. Atteins 2048 !', 'Glisse pour fusionner les tuiles. Garde ta plus grosse tuile dans un coin !'],
  pad: { dpad: true, hint: 'ou glisse le doigt' },
  stars: s => s >= 20000 ? 3 : s >= 8000 ? 2 : s >= 2000 ? 1 : 0,
  create(env, saved) {
    const { input, sfx, dom } = env;
    let grid, score = 0, won = false, over = false, moved = false;
    const COLORS = { 2: ['#eee4da', '#776e65'], 4: ['#ede0c8', '#776e65'], 8: ['#f2b179', '#fff'], 16: ['#f59563', '#fff'], 32: ['#f67c5f', '#fff'], 64: ['#f65e3b', '#fff'], 128: ['#edcf72', '#fff'], 256: ['#edcc61', '#fff'], 512: ['#edc850', '#fff'], 1024: ['#edc53f', '#fff'], 2048: ['#edc22e', '#fff'] };
    const wrap = el('div', { class: 'dg' }), board = el('div', { class: 'g2048' }); const cells = [];
    for (let i = 0; i < 16; i++) { const c = el('div', { class: 't' }); cells.push(c); board.append(c); }
    wrap.append(board); dom.append(wrap);
    function fit() { const s = Math.floor(Math.min(env.W - 24, env.H - 40)); board.style.width = s + 'px'; board.style.height = s + 'px'; }
    function empty() { const e = []; for (let i = 0; i < 16; i++) if (!grid[i]) e.push(i); return e; }
    function add() { const e = empty(); if (!e.length) return; grid[pick(e)] = Math.random() < .9 ? 2 : 4; }
    function render() {
      for (let i = 0; i < 16; i++) { const v = grid[i], c = cells[i]; c.textContent = v ? String(v) : ''; c.className = 't' + (v ? ' v' + Math.min(v, 2048) : ''); const col = COLORS[v] || ['#3c3a32', '#fff']; c.style.background = v ? col[0] : ''; c.style.color = col[1]; c.style.fontSize = (v >= 1024 ? 22 : v >= 128 ? 28 : 34) + 'px'; }
      env.setScore(score); env.hud(won ? '2048 atteint !' : 'Max ' + Math.max(0, ...grid));
    }
    function slide(line) { // règles officielles : glisse, fusionne une seule fois par paire
      const a = line.filter(Boolean), out = []; let gained = 0;
      for (let i = 0; i < a.length; i++) { if (a[i] === a[i + 1]) { out.push(a[i] * 2); gained += a[i] * 2; i++; } else out.push(a[i]); }
      while (out.length < 4) out.push(0); return { out, gained };
    }
    function move(dir) { // 0 gauche 1 droite 2 haut 3 bas
      if (over) return; let changed = false, gained = 0; const g = grid.slice();
      for (let k = 0; k < 4; k++) {
        const idx = []; for (let j = 0; j < 4; j++) idx.push(dir < 2 ? k * 4 + j : j * 4 + k);
        if (dir === 1 || dir === 3) idx.reverse();
        const line = idx.map(i => g[i]); const { out, gained: gn } = slide(line); gained += gn;
        idx.forEach((i, j) => { if (g[i] !== out[j]) changed = true; g[i] = out[j]; });
      }
      if (!changed) { sfx.tick(); return; }
      grid = g; score += gained; if (gained) sfx.coin(); else sfx.pop(); env.vibe(10);
      if (!won && grid.includes(2048)) { won = true; sfx.win(); setTimeout(() => toast('2048 ! Continue pour aller plus loin'), 100); }
      add(); render(); persist();
      if (!empty().length && !canMove()) { over = true; sfx.lose(); setTimeout(() => env.gameOver(score, { win: won, text: 'Plus de coups possibles · max ' + Math.max(...grid) }), 600); }
    }
    function canMove() { for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const v = grid[r * 4 + c]; if (c < 3 && v === grid[r * 4 + c + 1]) return true; if (r < 3 && v === grid[(r + 1) * 4 + c]) return true; } return false; }
    function persist() { env.save({ grid, score, won }, 'Score ' + score + ' · max ' + Math.max(...grid)); }
    function update() {
      if (input.pressed.left || input.swipe === 'left') move(0); if (input.pressed.right || input.swipe === 'right') move(1);
      if (input.pressed.up || input.swipe === 'up') move(2); if (input.pressed.down || input.swipe === 'down') move(3);
    }
    if (saved && saved.grid && saved.grid.length === 16) { grid = saved.grid.slice(); score = saved.score | 0; won = !!saved.won; } else { grid = new Array(16).fill(0); add(); add(); }
    fit(); render();
    return { update, resize: fit };
  }
});
