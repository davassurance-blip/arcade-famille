/* ===== Jacques a dit (dès 4 ans) — mémoire des couleurs et des sons ===== */
GAMES.push({
  id: 'simon', title: 'Jacques a dit', tagline: 'Répète les couleurs', minAge: 4, color: '#ffd23f', dom: true,
  icon: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#1b1540"/><path d="M32 32L32 8A24 24 0 0 1 56 32z" fill="#ff4f4f"/><path d="M32 32L56 32A24 24 0 0 1 32 56z" fill="#38e0d6"/><path d="M32 32L32 56A24 24 0 0 1 8 32z" fill="#ffd23f"/><path d="M32 32L8 32A24 24 0 0 1 32 8z" fill="#9dff5c"/><circle cx="32" cy="32" r="8" fill="#1b1540"/></svg>',
  howto: ['Regarde les couleurs s\'allumer, puis tape-les dans le même ordre. À chaque tour, une couleur de plus !', 'Mémorise la suite de couleurs et de sons, puis rejoue-la. Ça va de plus en plus vite.', 'Suite rapide, 6 couleurs. Jusqu\'où ira ta mémoire ?'],
  pad: null,
  stars: s => s >= 12 ? 3 : s >= 8 ? 2 : s >= 4 ? 1 : 0,
  create(env) {
    const { dom, sfx } = env; const tier = env.tier;
    const PADS = [['#ff4f4f', 330], ['#38e0d6', 392], ['#ffd23f', 494], ['#9dff5c', 587], ['#9b7bff', 659], ['#ff9f1c', 784]].slice(0, tier === 2 ? 6 : 4);
    let seq = [], idx = 0, playing = false, round = 0, over = false, timers = [];
    const wrap = el('div', { class: 'dg' }), status = el('div', { class: 'simon-status' }, 'Regarde bien…');
    const grid = el('div', { class: 'simon' + (PADS.length === 6 ? ' six' : '') });
    const btns = PADS.map((p, i) => { const b = el('button', { class: 'spad', style: '--c:' + p[0], 'aria-label': 'Couleur ' + (i + 1) }); b.addEventListener('pointerdown', e => { e.preventDefault(); press(i); }); grid.append(b); return b; });
    wrap.append(status, grid); dom.append(wrap);
    function tone(i, ms) { if (!S.sound) return; try { const ac = new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = PADS[i][1]; g.gain.value = .15; o.connect(g); g.connect(ac.destination); o.start(); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + ms / 1000); o.stop(ac.currentTime + ms / 1000); setTimeout(() => ac.close(), ms + 100); } catch (e) { } }
    function light(i, ms) { btns[i].classList.add('on'); tone(i, ms); timers.push(setTimeout(() => btns[i].classList.remove('on'), ms)); }
    function speed() { return Math.max(tier === 0 ? 420 : 300, (tier === 0 ? 700 : tier === 1 ? 560 : 450) - round * 22); }
    function play() {
      playing = true; idx = 0; status.textContent = 'Regarde bien…'; grid.classList.add('lock');
      seq.forEach((v, k) => timers.push(setTimeout(() => light(v, speed() * .6), 600 + k * speed())));
      timers.push(setTimeout(() => { playing = false; grid.classList.remove('lock'); status.textContent = 'À toi !'; }, 600 + seq.length * speed()));
    }
    function next() { round++; seq.push(rndi(0, PADS.length - 1)); env.setScore(round - 1); env.hud('Tour ' + round); play(); }
    function press(i) {
      if (playing || over || !seq.length || idx >= seq.length) return; light(i, 250);
      if (i === seq[idx]) { idx++; env.vibe(10); if (idx === seq.length) { status.textContent = 'Bravo !'; sfx.ok(); env.setScore(round); timers.push(setTimeout(next, 900)); } }
      else { over = true; grid.classList.add('lock'); status.textContent = 'Oups, c\'était ' + ['rouge', 'bleu', 'jaune', 'vert', 'violet', 'orange'][seq[idx]]; btns[seq[idx]].classList.add('on'); sfx.lose(); env.vibe(150); timers.push(setTimeout(() => env.gameOver(round - 1, { text: round - 1 + ' tour' + (round > 2 ? 's' : '') + ' réussi' + (round > 2 ? 's' : '') }), 1300)); }
    }
    timers.push(setTimeout(next, 500));
    return { stop: () => timers.forEach(clearTimeout) };
  }
});
