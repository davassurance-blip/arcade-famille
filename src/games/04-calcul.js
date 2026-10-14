/* ===== Calcul Éclair (dès 4 ans) — DOM, 3 niveaux ===== */
function calcQuestion(tier, streak) {
  const hard = Math.min(1, streak / 12); // les questions se corsent avec la série
  let q, a;
  if (tier === 0) {
    const max = hard > .5 ? 10 : 6;
    if (Math.random() < .6) { const x = rndi(0, max), y = rndi(0, max - x); q = x + ' + ' + y; a = x + y; }
    else { const x = rndi(1, max), y = rndi(0, x); q = x + ' − ' + y; a = x - y; }
  } else if (tier === 1) {
    const r = Math.random();
    if (r < .4) { const x = rndi(2, 10), y = rndi(2, 10); q = x + ' × ' + y; a = x * y; }
    else if (r < .6) { const y = rndi(2, 9), a0 = rndi(2, 10); q = (y * a0) + ' ÷ ' + y; a = a0; }
    else if (r < .8) { const x = rndi(10, 99), y = rndi(10, 99); q = x + ' + ' + y; a = x + y; }
    else { const x = rndi(20, 99), y = rndi(1, x); q = x + ' − ' + y; a = x - y; }
  } else {
    const r = Math.random();
    if (r < .25) { const x = rndi(3, 12), y = rndi(3, 12), z = rndi(1, 30); q = x + ' × ' + y + ' + ' + z; a = x * y + z; }
    else if (r < .45) { const x = rndi(11, 25), y = rndi(3, 9); q = x + ' × ' + y; a = x * y; }
    else if (r < .6) { const x = rndi(4, 15); q = x + '²'; a = x * x; }
    else if (r < .75) { const y = rndi(3, 12), a0 = rndi(3, 15); q = (y * a0) + ' ÷ ' + y; a = a0; }
    else if (r < .9) { const x = rndi(-20, 20), y = rndi(1, 30); q = '(' + x + ') − ' + y; a = x - y; }
    else { const p = pick([10, 20, 25, 50, 75]), n = pick([40, 80, 120, 200, 300, 400]); q = p + ' % de ' + n; a = p * n / 100; }
  }
  const n = tier === 0 ? 3 : 4; const set = new Set([a]);
  while (set.size < n) { const d = a + pick([-1, 1]) * rndi(1, tier === 0 ? 3 : Math.max(2, Math.round(Math.abs(a) * .3) + 2)); if (tier === 0 && d < 0) continue; set.add(d); }
  return { q, a, choices: Array.from(set).sort(() => Math.random() - .5) };
}
GAMES.push({
  id: 'calc', title: 'Calcul Éclair', tagline: 'Réponds avant la fin du temps', minAge: 4, color: '#38e0d6', dom: true,
  icon: '<svg viewBox="0 0 64 64"><rect x="12" y="6" width="40" height="52" rx="8" fill="#fff5e1"/><rect x="18" y="12" width="28" height="12" rx="3" fill="#1b1540"/><text x="44" y="22" font-size="10" font-weight="900" text-anchor="end" fill="#9dff5c">42</text><g fill="#362b8a"><rect x="18" y="30" width="8" height="8" rx="2"/><rect x="28" y="30" width="8" height="8" rx="2"/><rect x="38" y="30" width="8" height="8" rx="2"/><rect x="18" y="40" width="8" height="8" rx="2"/><rect x="28" y="40" width="8" height="8" rx="2"/></g><rect x="38" y="40" width="8" height="12" rx="2" fill="#ff4f9a"/></svg>',
  howto: ['Additions et soustractions jusqu\'à 10. Tape la bonne réponse !', 'Tables, additions à deux chiffres, divisions. 60 secondes, série = bonus.', 'Calcul mental d\'ado : carrés, pourcentages, négatifs. Enchaîne pour multiplier les points.'],
  pad: null,
  stars: s => s >= 350 ? 3 : s >= 200 ? 2 : s >= 80 ? 1 : 0,
  create(env) {
    const { dom, sfx } = env; const tier = env.tier;
    const DUR = 60; let left = DUR, score = 0, streak = 0, best = 0, cur = null, done = false, answered = 0, good = 0, lock = false;
    const wrap = el('div', { class: 'dg' }), quiz = el('div', { class: 'quiz' });
    const bar = el('div', { class: 'tbar' }, el('i', { style: 'width:100%' }));
    const qEl = el('div', { class: 'q', 'aria-live': 'polite' }), ans = el('div', { class: 'ans', style: tier === 0 ? 'grid-template-columns:1fr' : '' }), st = el('div', { class: 'streak' });
    quiz.append(bar, qEl, ans, st); wrap.append(quiz); dom.append(wrap);
    function next() {
      cur = calcQuestion(tier, streak); qEl.className = 'q'; qEl.textContent = cur.q + ' = ?'; ans.textContent = '';
      cur.choices.forEach(v => { const b = el('button', null, String(v)); b.addEventListener('click', () => answer(b, v)); ans.append(b); });
      lock = false;
    }
    function answer(b, v) {
      if (done || lock) return; lock = true; answered++;
      if (v === cur.a) { good++; streak++; best = Math.max(best, streak); const mult = Math.min(3, 1 + Math.floor(streak / 4)); score += 10 * mult; b.classList.add('ok'); qEl.classList.add('ok'); sfx.ok(); env.vibe(20); st.textContent = streak >= 4 ? 'Série ' + streak + ' · ×' + mult : (streak ? 'Série ' + streak : ''); }
      else { streak = 0; b.classList.add('ko'); qEl.classList.add('ko'); sfx.ko(); env.vibe(80); st.textContent = 'La réponse était ' + cur.a; $$('button', ans).forEach(x => { if (Number(x.textContent) === cur.a) x.classList.add('ok'); }); if (tier > 0) left = Math.max(0, left - 2); }
      env.setScore(score); setTimeout(next, v === cur.a ? 300 : 900);
    }
    function update(dt) {
      if (done) return; left -= dt; $('i', bar).style.width = (left / DUR * 100) + '%'; env.hud(Math.ceil(left) + ' s');
      if (left <= 0) { done = true; env.gameOver(score, { win: good > 0, text: good + '/' + answered + ' bonnes réponses · meilleure série ' + best }); }
    }
    next();
    return { update };
  }
});
