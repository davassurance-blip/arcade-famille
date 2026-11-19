/* ===== Mots mystères (dès 5 ans) — grilles générées, de plus en plus grandes et tordues au fil des niveaux ===== */
const MOTS_THEMES = {
  'Animaux': 'CHAT CHIEN LION OURS LOUP ZEBRE TIGRE SINGE LAPIN VACHE MOUTON CHEVAL GIRAFE RENARD DAUPHIN ELEPHANT PANDA KOALA HIBOU TORTUE ANE COQ RAT',
  'Fruits': 'POMME POIRE FRAISE BANANE CERISE ORANGE CITRON RAISIN MELON KIWI PECHE PRUNE MANGUE ANANAS ABRICOT FIGUE DATTE NOIX',
  'École': 'LIVRE STYLO CAHIER GOMME REGLE CRAIE TABLE CLASSE CARTABLE CRAYON DICTEE LECON TROUSSE COLLE CISEAUX MAITRE ELEVE',
  'Espace': 'LUNE SOLEIL ETOILE FUSEE COMETE PLANETE MARS TERRE SATURNE GALAXIE ORBITE ROBOT METEORE VENUS NEPTUNE COSMOS',
  'Sport': 'FOOT TENNIS JUDO RUGBY NATATION VELO SKI BASKET COURSE BALLON BOXE GOLF SURF HOCKEY ESCRIME DANSE KARATE',
  'Maison': 'LIT PORTE TABLE CHAISE LAMPE CANAPE FENETRE CUISINE JARDIN TAPIS MIROIR ESCALIER TOIT MUR SALON BUREAU CLE',
  'Nature': 'ARBRE FLEUR FORET RIVIERE MONTAGNE NUAGE PLUIE NEIGE VENT PLAGE MER LAC HERBE FEUILLE ROCHER ORAGE VOLCAN',
  'À table': 'PAIN LAIT BEURRE FROMAGE GATEAU CREPE PIZZA PATES SOUPE SALADE POULET RIZ OEUF MIEL SUCRE CHOCOLAT TARTE',
  'Musique': 'PIANO GUITARE VIOLON FLUTE TAMBOUR CHANSON NOTE RYTHME BATTERIE HARPE TROMPETTE CONCERT MELODIE',
  'Voyage': 'AVION TRAIN BATEAU VALISE HOTEL CARTE MUSEE METRO TAXI VOITURE BILLET CAMPING ILE PORT ROUTE'
};
const MOTS_BAN = ['CUL', 'CON', 'PUTE', 'BITE', 'MERDE', 'SEXE', 'CACA', 'PIPI', 'ZIZI', 'NUL', 'MORT', 'TUE'];
GAMES.push({
  id: 'mots', title: 'Mots Mystères', tagline: 'Retrouve les mots cachés dans la grille', minAge: 5, color: '#7c5cff',
  icon: '<svg viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="9" fill="#2a2166"/><rect x="10" y="24" width="44" height="14" rx="7" fill="#ffd23f"/><g font-size="11" font-weight="900" text-anchor="middle" fill="#fff"><text x="18" y="20">K</text><text x="32" y="20">A</text><text x="46" y="20">P</text><text x="18" y="52">O</text><text x="32" y="52">U</text><text x="46" y="52">R</text></g><g font-size="11" font-weight="900" text-anchor="middle" fill="#1b1540"><text x="18" y="35">M</text><text x="32" y="35">O</text><text x="46" y="35">T</text></g></svg>',
  howto: ['Pose ton doigt sur la première lettre d\'un mot et glisse jusqu\'à la dernière. Les mots sont écrits en bas !', 'Glisse du doigt sur chaque mot de la liste. Les grilles grandissent, puis les mots se cachent en diagonale et à l\'envers. Attention au chrono !', 'Mots dans les 8 directions, grilles de plus en plus grandes, chrono serré. INDICE montre une première lettre (−20 points).'],
  pad: null,
  stars: s => s >= 2800 ? 3 : s >= 1200 ? 2 : s >= 400 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env, tier = env.tier, pr = Particles();
    const FONT = getComputedStyle(document.body).getPropertyValue('--font-display');
    const COLS = ['#ffd23f', '#38e0d6', '#ff4f9a', '#9dff5c', '#ff9f1c', '#8fb4ff', '#c79bff', '#ff7a6b'];
    const MAXLV = tier === 0 ? 6 : 15;
    let level = 1, score = 0, over = false, t = 0, N = 5, grid = [], words = [], sel = null, timeLeft = 0, timeMax = 0, doneT = 0, hint = null, hints = 3, theme = '', lastTheme = '', shake = 0, lay = null, intro = 0;
    if (saved && saved.level) { level = clamp(saved.level | 0, 1, MAXLV); score = Math.max(0, saved.score | 0); }
    function dirsFor() {
      const d = [[1, 0], [0, 1]];
      const diag = tier === 2 || (tier === 1 && level >= 3) || (tier === 0 && level >= 5), rev = (tier === 2 && level >= 3) || (tier === 1 && level >= 6);
      if (diag) d.push([1, 1], [1, -1]);
      if (rev) { d.push([-1, 0], [0, -1]); if (diag) d.push([-1, -1], [-1, 1]); }
      return d;
    }
    function lines(g) { // toutes les lignes de la grille, pour vérifier qu'aucun mot gênant n'apparaît par hasard
      const out = [];
      for (let i = 0; i < N; i++) { let a = '', b = ''; for (let j = 0; j < N; j++) { a += g[i][j]; b += g[j][i]; } out.push(a, b); }
      for (let k = -N + 1; k < N; k++) { let a = '', b = ''; for (let i = 0; i < N; i++) { const j = i + k; if (j >= 0 && j < N) { a += g[i][j]; b += g[i][N - 1 - j]; } } out.push(a, b); }
      return out.concat(out.map(s => s.split('').reverse().join('')));
    }
    function build() {
      N = clamp([5, 7, 8][tier] + Math.floor((level - 1) / 2), 5, [7, 10, 11][tier]);
      const want = clamp([3, 5, 6][tier] + Math.floor(level / 2), 3, [6, 10, 12][tier]);
      const names = Object.keys(MOTS_THEMES).filter(n => n !== lastTheme && (tier > 0 || ['Animaux', 'Fruits', 'Maison', 'Nature', 'À table'].includes(n)));
      const maxLen = tier === 0 ? Math.min(N, level < 3 ? 4 : 5) : N, minLen = tier === 2 && level > 4 ? 4 : 3;
      let pool = []; for (let k = 0; k < 12 && pool.length < want; k++) { const th = pick(names), pl = MOTS_THEMES[th].split(' ').filter(w => w.length <= maxLen && w.length >= minLen); if (pl.length > pool.length) { pool = pl; theme = th; } }
      lastTheme = theme;
      for (let i = pool.length - 1; i > 0; i--) { const j = rndi(0, i);[pool[i], pool[j]] = [pool[j], pool[i]]; }
      pool = pool.slice(0, want).sort((a, b) => b.length - a.length);
      const dirs = dirsFor(); grid = []; for (let y = 0; y < N; y++) grid.push(new Array(N).fill(''));
      words = [];
      for (const w of pool) {
        for (let k = 0; k < 300; k++) {
          const d = pick(dirs), L = w.length, x0 = rndi(0, N - 1), y0 = rndi(0, N - 1), x1 = x0 + d[0] * (L - 1), y1 = y0 + d[1] * (L - 1);
          if (x1 < 0 || x1 >= N || y1 < 0 || y1 >= N) continue;
          let ok = true; for (let i = 0; i < L && ok; i++) { const c = grid[y0 + d[1] * i][x0 + d[0] * i]; if (c && c !== w[i]) ok = false; }
          if (!ok) continue;
          for (let i = 0; i < L; i++) grid[y0 + d[1] * i][x0 + d[0] * i] = w[i];
          words.push({ w, x0, y0, x1, y1, found: false, col: COLS[words.length % COLS.length], pop: 0 }); break;
        }
      }
      const letters = tier === 2 && level >= 5 ? words.map(o => o.w).join('') : 'EEEEAAAIIISSNNRRTTOOLLUUDCMPGBVHFQJXYZK';
      const base = grid.map(r => r.slice());
      for (let k = 0; k < 30; k++) {
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!base[y][x]) grid[y][x] = letters[rndi(0, letters.length - 1)];
        const ls = lines(grid); if (!MOTS_BAN.some(b => ls.some(l => l.includes(b)))) break;
      }
      timeMax = tier === 0 ? 0 : Math.max(40, words.length * ([0, 26, 19][tier] - Math.min(6, level * .5))); timeLeft = timeMax;
      hints = 3; hint = null; sel = null; doneT = 0; intro = 1.6;
      env.save({ level, score }, 'Niveau ' + level);
    }
    function layout() {
      const W = env.W, H = env.H, land = W > H * 1.15;
      if (land) { const g = Math.min(H - 20, W * .58); lay = { land, gx: 12, gy: (H - g) / 2, g, lx: g + 28, ly: 54, lw: W - g - 40, lh: H - 84 }; }
      else { const g = Math.min(W - 16, H * .6); lay = { land, gx: (W - g) / 2, gy: 46, g, lx: 10, ly: 46 + g + 12, lw: W - 20, lh: H - g - 66 }; }
      lay.cs = lay.g / N;
    }
    const cellAt = (x, y) => { const cx = Math.floor((x - lay.gx) / lay.cs), cy = Math.floor((y - lay.gy) / lay.cs); return cx >= 0 && cx < N && cy >= 0 && cy < N ? [cx, cy] : null; };
    const hintBox = () => ({ x: lay.land ? lay.lx : env.W - 112, y: lay.land ? 10 : 6, w: 102, h: 34 });
    function update(dt) {
      if (over) return; t += dt; pr.update(dt); shake = Math.max(0, shake - dt); intro = Math.max(0, intro - dt); layout();
      for (const o of words) o.pop = Math.max(0, o.pop - dt * 2);
      if (hint) { hint.t -= dt; if (hint.t <= 0) hint = null; }
      if (doneT > 0) { doneT -= dt; if (doneT <= 0) { if (level >= MAXLV) { over = true; env.gameOver(score, { win: true, title: 'Champion des mots !', text: 'Tu as terminé les ' + MAXLV + ' grilles.' }); return; } level++; build(); } return; }
      if (timeMax) { timeLeft -= dt; if (timeLeft <= 0) { over = true; env.gameOver(score, { title: 'Temps écoulé !', text: 'Tu es arrivé au niveau ' + level + '.' }); return; } if (timeLeft < 10 && Math.floor(timeLeft) !== Math.floor(timeLeft + dt)) sfx.tick(); }
      const p = input.pointer;
      if (p.justDown) {
        const hb = hintBox();
        if (p.x > hb.x && p.x < hb.x + hb.w && p.y > hb.y && p.y < hb.y + hb.h) {
          const left = words.filter(o => !o.found); if (hints > 0 && left.length) { const o = pick(left); hint = { x: o.x0, y: o.y0, t: 2.5 }; hints--; if (tier > 0) score = Math.max(0, score - 20); sfx.ok(); } else sfx.ko();
        } else { const c = cellAt(p.x, p.y); sel = c ? { x0: c[0], y0: c[1], x1: c[0], y1: c[1] } : null; if (c) sfx.tap(); }
      }
      if (sel && p.down) { // on accroche le doigt à l'une des 8 directions
        const fx = (p.x - lay.gx) / lay.cs - .5 - sel.x0, fy = (p.y - lay.gy) / lay.cs - .5 - sel.y0, len = Math.round(Math.max(Math.abs(fx), Math.abs(fy)));
        if (len === 0) { sel.x1 = sel.x0; sel.y1 = sel.y0; }
        else { const a = Math.round(Math.atan2(fy, fx) / (Math.PI / 4)), dx = [1, 1, 0, -1, -1, -1, 0, 1][(a + 8) % 8], dy = [0, 1, 1, 1, 0, -1, -1, -1][(a + 8) % 8]; let L = len; while (L > 0 && (sel.x0 + dx * L < 0 || sel.x0 + dx * L >= N || sel.y0 + dy * L < 0 || sel.y0 + dy * L >= N)) L--; const nx = sel.x0 + dx * L, ny = sel.y0 + dy * L; if (nx !== sel.x1 || ny !== sel.y1) { sel.x1 = nx; sel.y1 = ny; sfx.tick(); } }
      }
      if (sel && p.justUp) {
        const o = words.find(o => !o.found && ((o.x0 === sel.x0 && o.y0 === sel.y0 && o.x1 === sel.x1 && o.y1 === sel.y1) || (o.x0 === sel.x1 && o.y0 === sel.y1 && o.x1 === sel.x0 && o.y1 === sel.y0)));
        if (o) {
          o.found = true; o.pop = 1; score += o.w.length * 10; sfx.coin(); env.vibe(25);
          const mx = lay.gx + ((o.x0 + o.x1) / 2 + .5) * lay.cs, my = lay.gy + ((o.y0 + o.y1) / 2 + .5) * lay.cs; pr.burst(mx, my, o.col, 16, 200);
          if (words.every(q => q.found)) { const bonus = 50 + level * 20 + Math.round(timeLeft); score += bonus; doneT = 2; sfx.win(); env.vibe(80); for (let i = 0; i < 6; i++) pr.burst(rnd(40, env.W - 40), rnd(60, env.H * .6), pick(COLS), 14, 260); }
        } else if (sel.x0 !== sel.x1 || sel.y0 !== sel.y1) { sfx.ko(); shake = .25; }
        sel = null;
      }
      if (!p.down) sel = null;
      env.setScore(score); env.hud('Niveau ' + level + (tier === 0 ? ' / ' + MAXLV : ''));
    }
    function capsule(c, x0, y0, x1, y1, col, alpha) { const cs = lay.cs; c.globalAlpha = alpha; c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = cs * .72; c.beginPath(); c.moveTo(lay.gx + (x0 + .5) * cs, lay.gy + (y0 + .5) * cs); c.lineTo(lay.gx + (x1 + .5) * cs + .01, lay.gy + (y1 + .5) * cs); c.stroke(); c.globalAlpha = 1; c.lineCap = 'butt'; }
    function draw(c) {
      const W = env.W, H = env.H; if (!lay) layout(); const cs = lay.cs;
      const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2b1f6b'); bg.addColorStop(1, '#17123a'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.04)'; for (let i = 0; i < 14; i++) { const x = (i * 97 + t * 8) % (W + 80) - 40, y = (i * 61) % H; Draw.text(c, 'ABCDEFGHIJKLMNOP'[i], x, y, 46, 'rgba(255,255,255,.045)'); }
      // bandeau : thème + chrono
      Draw.text(c, theme.toUpperCase(), lay.land ? lay.lx + 112 : 12, lay.land ? 27 : 23, 16, '#ffd23f', 'left');
      if (timeMax) { const bw = lay.land ? lay.lw : W - 250, bx = lay.land ? lay.lx : 120, by = lay.land ? H - 14 : 18, f = clamp(timeLeft / timeMax, 0, 1); if (bw > 40) { c.fillStyle = 'rgba(255,255,255,.14)'; Draw.rr(c, bx, by, bw, 10, 5); c.fill(); c.fillStyle = f < .25 ? '#ff4f4f' : f < .5 ? '#ff9f1c' : '#9dff5c'; if (f > .02) { Draw.rr(c, bx, by, bw * f, 10, 5); c.fill(); } } }
      const hb = hintBox(); c.fillStyle = hints > 0 ? '#ffd23f' : 'rgba(255,255,255,.18)'; Draw.rr(c, hb.x, hb.y, hb.w, hb.h, 17); c.fill(); Draw.text(c, 'INDICE ' + '●'.repeat(hints), hb.x + hb.w / 2, hb.y + hb.h / 2 + 1, 13, hints > 0 ? '#1b1540' : 'rgba(255,255,255,.5)');
      // grille
      const sx = shake > 0 ? Math.sin(t * 70) * 5 * (shake / .25) : 0; c.save(); c.translate(sx, 0);
      c.fillStyle = '#fff8ec'; Draw.rr(c, lay.gx - 4, lay.gy - 4, lay.g + 8, lay.g + 8, 16); c.fill();
      c.fillStyle = 'rgba(27,21,64,.05)'; for (let y = 0; y < N; y++) for (let x = (y % 2); x < N; x += 2) c.fillRect(lay.gx + x * cs, lay.gy + y * cs, cs, cs);
      for (const o of words) if (o.found) capsule(c, o.x0, o.y0, o.x1, o.y1, o.col, .62);
      if (sel) capsule(c, sel.x0, sel.y0, sel.x1, sel.y1, '#7c5cff', .5);
      if (hint) { c.strokeStyle = '#ff4f9a'; c.lineWidth = 4; c.beginPath(); c.arc(lay.gx + (hint.x + .5) * cs, lay.gy + (hint.y + .5) * cs, cs * (.42 + Math.sin(t * 10) * .06), 0, 7); c.stroke(); }
      c.font = '900 ' + Math.round(cs * .56) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#1b1540';
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.fillText(grid[y][x], lay.gx + (x + .5) * cs, lay.gy + (y + .54) * cs);
      c.restore();
      // liste des mots
      const cols = lay.land ? (words.length > 7 ? 2 : 1) : (lay.lw > 520 ? 4 : words.length > 8 ? 3 : 2), rows = Math.ceil(words.length / cols), rh = Math.min(46, lay.lh / rows), cw = lay.lw / cols;
      words.forEach((o, i) => {
        const x = lay.lx + (i % cols) * cw, y = lay.ly + Math.floor(i / cols) * rh, fs = Math.min(rh * .56, cw / (Math.max(6, o.w.length) * .68)) * (1 + o.pop * .25);
        c.fillStyle = o.found ? o.col : 'rgba(255,255,255,.1)'; Draw.rr(c, x + 3, y + 3, cw - 6, rh - 6, Math.min(12, rh * .3)); c.fill();
        Draw.text(c, o.w, x + cw / 2, y + rh / 2 + 1, fs, o.found ? '#1b1540' : '#fff');
        if (o.found) { const tw = c.measureText(o.w).width; c.strokeStyle = '#1b1540'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x + cw / 2 - tw / 2 - 4, y + rh / 2); c.lineTo(x + cw / 2 + tw / 2 + 4, y + rh / 2); c.stroke(); }
      });
      pr.draw(c);
      const banner = (txt, sub) => { c.fillStyle = 'rgba(23,18,58,.82)'; c.fillRect(0, lay.gy + lay.g / 2 - 46, W, 92); Draw.text(c, txt, W / 2, lay.gy + lay.g / 2 - (sub ? 12 : 0), Math.min(34, W / 12), '#ffd23f'); if (sub) Draw.text(c, sub, W / 2, lay.gy + lay.g / 2 + 22, 15, '#fff', 'center', 700); };
      if (doneT > 0) banner(level >= MAXLV ? 'Bravo !' : 'Niveau ' + level + ' réussi !', level >= MAXLV ? '' : 'Grille suivante…');
      else if (intro > 0) { c.globalAlpha = Math.min(1, intro * 2); const d = dirsFor().length; banner('Niveau ' + level, d <= 2 ? 'Mots vers la droite et vers le bas' : d <= 4 ? 'Attention : mots en diagonale !' : 'Dans tous les sens, même à l\'envers !'); c.globalAlpha = 1; }
    }
    build();
    return { update, draw, dbg: () => ({ words, grid, N, lay, level, score }) };
  }
});
