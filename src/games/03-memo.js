/* ===== Mémo (dès 4 ans) — DOM ===== */
const MEMO_SHAPES = [
  ['#ff4f4f', '<circle cx="50" cy="50" r="36"/>'],
  ['#38e0d6', '<rect x="16" y="16" width="68" height="68" rx="10"/>'],
  ['#ffd23f', '<path d="M50 10l12 26 28 3-21 19 6 28-25-14-25 14 6-28L10 39l28-3z"/>'],
  ['#ff4f9a', '<path d="M50 86L18 54a18 18 0 0 1 32-24 18 18 0 0 1 32 24z"/>'],
  ['#9dff5c', '<path d="M50 12l38 68H12z"/>'],
  ['#9b7bff', '<path d="M50 10l40 40-40 40-40-40z"/>'],
  ['#ff9f1c', '<path d="M62 14a38 38 0 1 0 24 60A30 30 0 0 1 62 14z"/>'],
  ['#5ad1ff', '<path d="M30 50a20 20 0 0 1 40-6 15 15 0 0 1 4 29H30a12 12 0 0 1 0-23z"/>'],
  ['#ff6a55', '<path d="M38 12h24v26h26v24H62v26H38V62H12V38h26z"/>'],
  ['#3fbf4f', '<path d="M50 8l36 21v42L50 92 14 71V29z"/>'],
  ['#c084fc', '<path d="M50 10c22 0 40 12 40 30S72 70 50 90C28 70 10 58 10 40S28 10 50 10z"/>'],
  ['#fb7185', '<path d="M20 70L50 14l30 56-30 16z"/>']
];
GAMES.push({
  id: 'memo', title: 'Mémo Formes', tagline: 'Retrouve les paires', minAge: 4, color: '#9b7bff', dom: true,
  icon: '<svg viewBox="0 0 64 64"><rect x="6" y="10" width="24" height="32" rx="5" fill="#fff5e1"/><rect x="34" y="10" width="24" height="32" rx="5" fill="#fff5e1"/><circle cx="18" cy="26" r="8" fill="#ff4f4f"/><path d="M46 17l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#ffd23f"/><rect x="20" y="36" width="24" height="20" rx="5" fill="#362b8a"/><text x="32" y="51" font-size="14" font-weight="900" text-anchor="middle" fill="#fff">?</text></svg>',
  howto: ['Retourne deux cartes. Si elles sont pareilles, tu gagnes la paire !', 'Retrouve toutes les paires en un minimum de coups.', 'Grille 4×5 : mémoire d\'ado exigée. Moins de coups = plus de points.'],
  pad: null,
  stars: s => s >= 900 ? 3 : s >= 600 ? 2 : s >= 300 ? 1 : 0,
  create(env) {
    const { dom, sfx } = env; const tier = env.tier;
    const cols = [3, 4, 4][tier], rows = [4, 4, 5][tier], pairs = cols * rows / 2;
    const shapes = MEMO_SHAPES.slice().sort(() => Math.random() - .5).slice(0, pairs);
    const deck = shapes.concat(shapes).map((s, i) => ({ s, i })).sort(() => Math.random() - .5);
    let open = [], found = 0, moves = 0, t = 0, lock = false, done = false;
    const wrap = el('div', { class: 'dg' });
    const grid = el('div', { class: 'memo', style: 'grid-template-columns:repeat(' + cols + ',minmax(0,1fr));max-width:' + (cols * 110) + 'px' });
    deck.forEach((card, idx) => {
      const b = el('button', { class: 'mc', 'aria-label': 'Carte ' + (idx + 1) });
      const back = el('div', { class: 'b' }); back.innerHTML = '<svg viewBox="0 0 100 100" fill="' + card.s[0] + '">' + card.s[1] + '</svg>';
      b.append(el('div', { class: 'in' }, el('div', { class: 'f' }), back));
      b.addEventListener('click', () => flip(b, card));
      grid.append(b);
    });
    wrap.append(grid); dom.append(wrap);
    function flip(b, card) {
      if (lock || done || b.classList.contains('open') || b.classList.contains('done')) return;
      sfx.pop(); b.classList.add('open'); open.push({ b, card });
      if (open.length < 2) return;
      moves++; lock = true; env.hud('Coups ' + moves);
      const [a, c] = open;
      if (a.card.s === c.card.s) {
        setTimeout(() => { a.b.classList.add('done'); c.b.classList.add('done'); a.b.classList.remove('open'); c.b.classList.remove('open'); open = []; lock = false; found++; sfx.ok(); env.vibe(30);
          env.setScore(calc());
          if (found === pairs) { done = true; sfx.win(); setTimeout(() => env.gameOver(calc(), { win: true, text: moves + ' coups en ' + Math.round(t) + ' s' }), 500); }
        }, 350);
      } else setTimeout(() => { a.b.classList.remove('open'); c.b.classList.remove('open'); open = []; lock = false; sfx.ko(); }, 800);
    }
    function calc() { return Math.max(0, found * 100 - Math.max(0, moves - found) * [8, 12, 15][tier] + Math.max(0, Math.round(120 - t)) * (found === pairs ? 2 : 0)); }
    function update(dt) { if (!done) { t += dt; env.hud('Coups ' + moves + ' · ' + Math.round(t) + ' s'); } }
    return { update };
  }
});
