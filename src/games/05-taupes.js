/* ===== Taupes Rigolotes (dès 4 ans) — DOM ===== */
const MOLE_SVG = '<svg viewBox="0 0 100 110"><ellipse cx="50" cy="70" rx="38" ry="42" fill="#8a5a2b"/><ellipse cx="50" cy="78" rx="24" ry="22" fill="#c48a52"/><circle cx="36" cy="52" r="7" fill="#fff"/><circle cx="64" cy="52" r="7" fill="#fff"/><circle cx="37" cy="53" r="3.5" fill="#1b1540"/><circle cx="65" cy="53" r="3.5" fill="#1b1540"/><ellipse cx="50" cy="66" rx="8" ry="6" fill="#ff8fa3"/><path d="M42 78q8 6 16 0" stroke="#1b1540" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="44" y="80" width="5" height="7" rx="1" fill="#fff"/><rect x="51" y="80" width="5" height="7" rx="1" fill="#fff"/></svg>';
const BOMB_SVG = '<svg viewBox="0 0 100 110"><circle cx="50" cy="72" r="34" fill="#222"/><circle cx="40" cy="60" r="8" fill="rgba(255,255,255,.2)"/><path d="M50 38q4-14 16-14" stroke="#ff9f1c" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="68" cy="22" r="7" fill="#ffd23f"/><circle cx="40" cy="70" r="5" fill="#fff"/><circle cx="60" cy="70" r="5" fill="#fff"/><path d="M40 86q10-8 20 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
GAMES.push({
  id: 'moles', title: 'Taupes Rigolotes', tagline: 'Tape vite sur les taupes', minAge: 4, color: '#ff6a55', dom: true,
  icon: '<svg viewBox="0 0 64 64"><ellipse cx="32" cy="50" rx="26" ry="9" fill="#3a2a12"/><ellipse cx="32" cy="38" rx="17" ry="18" fill="#8a5a2b"/><ellipse cx="32" cy="42" rx="10" ry="9" fill="#c48a52"/><circle cx="26" cy="32" r="3.5" fill="#fff"/><circle cx="38" cy="32" r="3.5" fill="#fff"/><circle cx="26.5" cy="32.5" r="1.8" fill="#1b1540"/><circle cx="38.5" cy="32.5" r="1.8" fill="#1b1540"/><ellipse cx="32" cy="38" rx="4" ry="3" fill="#ff8fa3"/></svg>',
  howto: ['Les taupes sortent de leur trou : tape dessus vite !', 'Tape les taupes, mais pas les bombes ! 30 secondes.', 'Grille 4×4, taupes ultra rapides, bombes piégées. Réflexes d\'ado.'],
  pad: null,
  stars: s => s >= 30 ? 3 : s >= 20 ? 2 : s >= 10 ? 1 : 0,
  create(env) {
    const { dom, sfx } = env; const tier = env.tier;
    const n = tier === 0 ? 3 : 4, DUR = 30; let left = DUR, score = 0, next = .6, done = false, miss = 0;
    const wrap = el('div', { class: 'dg' }), grid = el('div', { class: 'holes', style: 'grid-template-columns:repeat(' + n + ',minmax(0,1fr));max-width:' + (n * 120) + 'px' });
    const holes = [];
    for (let i = 0; i < n * n; i++) {
      const h = el('button', { class: 'hole', 'aria-label': 'Trou ' + (i + 1) }); const st = { el: h, up: false, bomb: false, timer: 0 };
      h.addEventListener('pointerdown', e => { e.preventDefault(); whack(st); });
      grid.append(h); holes.push(st);
    }
    wrap.append(grid); dom.append(wrap);
    function whack(st) {
      if (done) return;
      if (!st.up) { miss++; return; }
      st.up = false; st.el.classList.remove('up'); st.el.classList.add('hit');
      if (st.bomb) { score = Math.max(0, score - 3); sfx.hit(); env.vibe(150); env.hud('Aïe ! −3'); }
      else { score++; sfx.pop(); env.vibe(15); env.hud('Touché !'); }
      env.setScore(score);
    }
    function popOne() {
      const free = holes.filter(h => !h.up); if (!free.length) return;
      const st = pick(free); st.up = true; st.bomb = tier > 0 && Math.random() < .2; st.timer = [1.4, 1.0, .75][tier] * rnd(.8, 1.2);
      st.el.classList.remove('hit'); st.el.innerHTML = st.bomb ? BOMB_SVG : MOLE_SVG; void st.el.offsetWidth; st.el.classList.add('up');
    }
    function update(dt) {
      if (done) return; left -= dt; next -= dt;
      if (next <= 0) { popOne(); if (tier > 1 && Math.random() < .3) popOne(); next = [.9, .65, .5][tier] * rnd(.7, 1.2) * (1 - (DUR - left) / DUR * .35); }
      for (const h of holes) if (h.up) { h.timer -= dt; if (h.timer <= 0) { h.up = false; h.el.classList.remove('up'); } }
      if (Math.ceil(left) !== Math.ceil(left + dt)) env.hud(Math.ceil(left) + ' s');
      if (left <= 0) { done = true; env.gameOver(score, { win: score > 0, text: score + ' taupe' + (score > 1 ? 's' : '') + ' attrapée' + (score > 1 ? 's' : '') }); }
    }
    return { update };
  }
});
