/* ===== Mots Mystères (dès 5 ans) — grilles générées. Les premières sont simples (lettres de remplissage au hasard) ;
   ensuite les grilles sont « pleines » comme dans les vrais mots mêlés : presque toutes les cases servent à un mot,
   la liste devient longue (elle défile) et les lettres qui restent forment le MOT MYSTÈRE. ===== */
const MOTS_THEMES = {
  'Animaux': 'CHAT CHIEN LION OURS LOUP ZEBRE TIGRE SINGE LAPIN VACHE MOUTON CHEVAL GIRAFE RENARD DAUPHIN ELEPHANT PANDA KOALA HIBOU TORTUE ANE COQ RAT BALEINE REQUIN FOURMI ABEILLE CANARD POULE CHEVRE SOURIS CASTOR',
  'Fruits': 'POMME POIRE FRAISE BANANE CERISE ORANGE CITRON RAISIN MELON KIWI PECHE PRUNE MANGUE ANANAS ABRICOT FIGUE DATTE NOIX MYRTILLE PASTEQUE NOISETTE',
  'École': 'LIVRE STYLO CAHIER GOMME REGLE CRAIE TABLE CLASSE CARTABLE CRAYON DICTEE LECON TROUSSE COLLE CISEAUX MAITRE ELEVE CALCUL LECTURE DESSIN CANTINE',
  'Espace': 'LUNE SOLEIL ETOILE FUSEE COMETE PLANETE MARS TERRE SATURNE GALAXIE ORBITE ROBOT METEORE VENUS NEPTUNE COSMOS JUPITER SATELLITE',
  'Sport': 'FOOT TENNIS JUDO RUGBY NATATION VELO SKI BASKET COURSE BALLON BOXE GOLF SURF HOCKEY ESCRIME DANSE KARATE MEDAILLE EQUIPE ARBITRE',
  'Maison': 'LIT PORTE TABLE CHAISE LAMPE CANAPE FENETRE CUISINE JARDIN TAPIS MIROIR ESCALIER TOIT MUR SALON BUREAU CLE CHAMBRE GARAGE BALCON RIDEAU',
  'Nature': 'ARBRE FLEUR FORET RIVIERE MONTAGNE NUAGE PLUIE NEIGE VENT PLAGE MER LAC HERBE FEUILLE ROCHER ORAGE VOLCAN DESERT COLLINE CASCADE',
  'À table': 'PAIN LAIT BEURRE FROMAGE GATEAU CREPE PIZZA PATES SOUPE SALADE POULET RIZ OEUF MIEL SUCRE CHOCOLAT TARTE CAROTTE TOMATE YAOURT',
  'Musique': 'PIANO GUITARE VIOLON FLUTE TAMBOUR CHANSON NOTE RYTHME BATTERIE HARPE TROMPETTE CONCERT MELODIE CHORALE',
  'Voyage': 'AVION TRAIN BATEAU VALISE HOTEL CARTE MUSEE METRO TAXI VOITURE BILLET CAMPING ILE PORT ROUTE TUNNEL PONT GARE'
};
// petits mots qui servent à boucher les trous des grilles pleines
const MOTS_PETITS = 'AMI ARC BAL BEC BOL BUS CAR COL COU DOS EAU ETE FEE FER FEU FIL GEL JEU JUS MIE MOT NEZ NID OIE OUI PAS PEU PIE POT ROI RUE SAC SEL SOL SUD THE TOT VER VIE VOL ZOO AIR ANS ART BAS BON CRI DUR EST FIN GAI ICI LOI NET NON OSE PRE RIT SUR TON UNE VIF BEAU BLEU BOIS CAFE CIEL COIN DAME DENT FETE FILS HAUT JOLI JOUR MAIN MIDI MOIS NEUF NOIR NORD PAGE PAPA PEUR PIED RIRE ROSE SAGE SOIR TARD TOUR VERT AIDE AIMER ALLER AMIE ANGE ARME BAIN BOND CAGE CLOU DIRE DOUX ECRU ELAN ETRE FOIS GANT IDEE JOIE LIEN LIRE MARE NAGE OSER PILE RAME RIVE SAUT TIRE UNIR VIDE ZERO';
const MOTS_BAN = ['CUL', 'CON', 'PUTE', 'BITE', 'MERDE', 'SEXE', 'CACA', 'PIPI', 'ZIZI', 'NUL', 'MORT', 'TUE', 'PET'];
const MOTS_DIRS = [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]];
function motsLines(g, N) { // toutes les lignes de la grille (dans les deux sens)
  const out = [];
  for (let i = 0; i < N; i++) { let a = '', b = ''; for (let j = 0; j < N; j++) { a += g[i][j] || '.'; b += g[j][i] || '.'; } out.push(a, b); }
  for (let k = -N + 1; k < N; k++) { let a = '', b = ''; for (let i = 0; i < N; i++) { const j = i + k; if (j >= 0 && j < N) { a += g[i][j] || '.'; b += g[i][N - 1 - j] || '.'; } } out.push(a, b); }
  return out.concat(out.map(s => s.split('').reverse().join('')));
}
/* Fabrique une grille. pool : mots à placer d'abord ; dict : tous les mots utilisables pour remplir (grille pleine) ;
   mystPool : mots candidats pour le mot mystère. Renvoie { grid, words:[{w,x0,y0,x1,y1}], myst:{w,cells} | null } ou null. */
function motsBuild(N, nd, pool, want, packed, dict, mystPool, R) {
  const rnd = R || Math.random, ri = n => Math.floor(rnd() * n), dirs = MOTS_DIRS.slice(0, nd);
  const grid = []; for (let y = 0; y < N; y++) grid.push(new Array(N).fill(''));
  const words = [], used = {};
  const fits = (w, x0, y0, d) => { const L = w.length, x1 = x0 + d[0] * (L - 1), y1 = y0 + d[1] * (L - 1); if (x0 < 0 || y0 < 0 || x0 >= N || y0 >= N || x1 < 0 || x1 >= N || y1 < 0 || y1 >= N) return -1; let cov = 0; for (let i = 0; i < L; i++) { const c = grid[y0 + d[1] * i][x0 + d[0] * i]; if (!c) cov++; else if (c !== w[i]) return -1; } return cov; };
  const put = (w, x0, y0, d) => { for (let i = 0; i < w.length; i++) grid[y0 + d[1] * i][x0 + d[0] * i] = w[i]; words.push({ w, x0, y0, x1: x0 + d[0] * (w.length - 1), y1: y0 + d[1] * (w.length - 1) }); used[w] = 1; };
  for (const w of pool.slice(0, want)) { if (used[w]) continue; for (let k = 0; k < 300; k++) { const d = dirs[ri(nd)], x0 = ri(N), y0 = ri(N); if (fits(w, x0, y0, d) > 0) { put(w, x0, y0, d); break; } } }
  let myst = null;
  if (packed) {
    const minM = 4, maxM = N >= 10 ? 9 : 8; let guard = 0;
    for (;;) {
      const empty = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!grid[y][x]) empty.push([x, y]);
      const E = empty.length; if (E <= maxM) { if (E < minM) return null; break; } if (++guard > 400) return null;
      for (let i = empty.length - 1; i > 0; i--) { const j = ri(i + 1);[empty[i], empty[j]] = [empty[j], empty[i]]; }
      let done = false;
      for (let ci = 0; ci < empty.length && ci < 14 && !done; ci++) { // on cherche un mot qui passe par une case vide
        const cx = empty[ci][0], cy = empty[ci][1], cands = []; let best = 0;
        for (const d of dirs) for (const w of dict) { if (used[w]) continue; for (let o = 0; o < w.length; o++) { const cov = fits(w, cx - d[0] * o, cy - d[1] * o, d); if (cov > 0 && E - cov >= minM) { cands.push([w, cx - d[0] * o, cy - d[1] * o, d, cov]); if (cov > best) best = cov; } } }
        const good = cands.filter(c => c[4] >= best - 1); if (good.length) { const c = good[ri(good.length)]; put(c[0], c[1], c[2], c[3]); done = true; }
      }
      if (!done) return null;
    }
    const cells = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!grid[y][x]) cells.push([x, y]);
    const cand = mystPool.filter(w => w.length === cells.length && !used[w]); if (!cand.length) return null;
    const mw = cand[ri(cand.length)]; cells.forEach((c, i) => { grid[c[1]][c[0]] = mw[i]; }); myst = { w: mw, cells };
  } else {
    const letters = 'EEEEAAAIIISSNNRRTTOOLLUUDCMPGBVHFQJXYZK', base = grid.map(r => r.slice());
    for (let k = 0; k < 30; k++) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!base[y][x]) grid[y][x] = letters[ri(letters.length)]; const ls = motsLines(grid, N); if (!MOTS_BAN.some(b => ls.some(l => l.includes(b)))) break; }
  }
  if (packed) { const ls = motsLines(grid, N), ok = new Set(words.map(o => o.w)); for (const b of MOTS_BAN) if (!ok.has(b) && ls.some(l => l.includes(b)) && !words.some(o => o.w.includes(b))) return null; }
  return { grid, words, myst };
}
// réglage de chaque niveau : taille, nombre de mots (grille simple), nombre de directions (2, 4 ou 8), grille pleine avec mot mystère
function motsLevel(tier, L) {
  if (tier === 0) return { N: [5, 5, 6, 6, 7, 7][L - 1], want: [3, 4, 4, 5, 6, 7][L - 1], nd: L < 5 ? 2 : 4, packed: false, maxLen: L < 3 ? 4 : 5 };
  const T = tier === 1 ? [[7, 6, 2, 0], [8, 8, 2, 0], [8, 11, 4, 0], [9, 0, 4, 1], [10, 16, 8, 0], [10, 0, 8, 1], [10, 0, 8, 1], [11, 0, 8, 1], [11, 0, 8, 1], [11, 0, 8, 1], [11, 0, 8, 1], [11, 0, 8, 1]]
    : [[8, 9, 4, 0], [9, 13, 8, 0], [10, 0, 8, 1], [10, 0, 8, 1], [11, 0, 8, 1], [11, 0, 8, 1], [12, 0, 8, 1], [12, 0, 8, 1], [12, 0, 8, 1], [12, 0, 8, 1], [12, 0, 8, 1], [12, 0, 8, 1]];
  const r = T[L - 1]; return { N: r[0], want: r[1], nd: r[2], packed: !!r[3], maxLen: r[0] };
}
GAMES.push({
  id: 'mots', title: 'Mots Mystères', tagline: 'Retrouve les mots cachés, puis le mot mystère', minAge: 5, color: '#7c5cff',
  icon: '<svg viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="9" fill="#2a2166"/><rect x="10" y="24" width="44" height="14" rx="7" fill="#ffd23f"/><g font-size="11" font-weight="900" text-anchor="middle" fill="#fff"><text x="18" y="20">K</text><text x="32" y="20">A</text><text x="46" y="20">P</text><text x="18" y="52">O</text><text x="32" y="52">U</text><text x="46" y="52">R</text></g><g font-size="11" font-weight="900" text-anchor="middle" fill="#1b1540"><text x="18" y="35">M</text><text x="32" y="35">O</text><text x="46" y="35">T</text></g></svg>',
  howto: ['Pose ton doigt sur la première lettre d\'un mot et glisse jusqu\'à la dernière. Les mots sont écrits en bas !', 'Glisse du doigt sur chaque mot de la liste (elle défile !). Dès le niveau 4, la grille est pleine : quand tous les mots sont trouvés, les lettres qui restent forment le MOT MYSTÈRE.', 'Grilles pleines dès le niveau 3, mots dans les 8 directions, liste qui défile, chrono serré. Les lettres restantes forment le MOT MYSTÈRE.'],
  pad: null,
  stars: s => s >= 6000 ? 3 : s >= 2500 ? 2 : s >= 600 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env, tier = env.tier, pr = Particles();
    const FONT = getComputedStyle(document.body).getPropertyValue('--font-display');
    const COLS = ['#ffd23f', '#38e0d6', '#ff4f9a', '#9dff5c', '#ff9f1c', '#8fb4ff', '#c79bff', '#ff7a6b'];
    const MAXLV = tier === 0 ? 6 : 12, MULT = tier === 0 ? 3 : 1;
    const THEME_OF = {}; for (const n in MOTS_THEMES) for (const w of MOTS_THEMES[n].split(' ')) if (!THEME_OF[w]) THEME_OF[w] = n;
    const THEMED = Object.keys(THEME_OF), DICT = THEMED.concat(MOTS_PETITS.split(' ').filter(w => !THEME_OF[w]));
    let level = 1, score = 0, over = false, t = 0, N = 5, grid = [], words = [], myst = null, sel = null, timeLeft = 0, timeMax = 0, doneT = 0, hint = null, hints = 3, theme = '', lastTheme = '', shake = 0, lay = null, intro = 0, cfg = null, scroll = 0, drag = null, phase = 'find', mystGot = [], mystMsg = 0;
    if (saved && saved.level) { level = clamp(saved.level | 0, 1, MAXLV); score = Math.max(0, saved.score | 0); }
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rndi(0, i);[a[i], a[j]] = [a[j], a[i]]; } return a; };
    function build() {
      cfg = motsLevel(tier, level); N = cfg.N; let res = null;
      if (cfg.packed) { // grille pleine : un thème en vedette, complété par tous les autres mots ; plusieurs essais si la grille ne se ferme pas
        for (let k = 0; k < 40 && !res; k++) { const names = Object.keys(MOTS_THEMES).filter(n => n !== lastTheme); theme = pick(names); const pool = shuffle(MOTS_THEMES[theme].split(' ').filter(w => w.length <= N)).slice(0, Math.round(N * .7)).sort((a, b) => b.length - a.length); res = motsBuild(N, cfg.nd, pool, pool.length, true, shuffle(DICT.filter(w => w.length <= N)), THEMED); }
      }
      if (!res) { // grille simple
        const names = Object.keys(MOTS_THEMES).filter(n => n !== lastTheme && (tier > 0 || ['Animaux', 'Fruits', 'Maison', 'Nature', 'À table'].includes(n)));
        let pool = []; for (let k = 0; k < 12 && pool.length < cfg.want; k++) { const th = pick(names), pl = MOTS_THEMES[th].split(' ').filter(w => w.length <= cfg.maxLen && w.length >= 3); if (pl.length > pool.length) { pool = pl; theme = th; } }
        pool = shuffle(pool.slice()); const want = cfg.want || 12; if (pool.length < want) pool = pool.concat(shuffle(THEMED.filter(w => w.length <= cfg.maxLen && !pool.includes(w))));
        res = motsBuild(N, cfg.nd, pool.slice(0, want).sort((a, b) => b.length - a.length), want, false, DICT, THEMED);
      }
      lastTheme = theme; grid = res.grid; myst = res.myst;
      words = res.words.sort((a, b) => a.w < b.w ? -1 : 1).map((o, i) => Object.assign(o, { found: false, col: COLS[i % COLS.length], pop: 0 }));
      const per = tier === 1 ? Math.max(8, 15 - level * .6) : Math.max(6, 12 - level * .5);
      timeMax = tier === 0 ? 0 : Math.max(45, words.length * per + (myst ? 15 : 0)); timeLeft = timeMax;
      hints = 3; hint = null; sel = null; doneT = 0; intro = 2; scroll = 0; drag = null; phase = 'find'; mystGot = myst ? myst.cells.map(() => false) : []; mystMsg = 0;
      env.save({ level, score }, 'Niveau ' + level);
    }
    function layout() {
      const W = env.W, H = env.H, land = W > H * 1.15, mh = myst ? 62 : 0;
      if (land) { const g = Math.min(H - 20, W * .56); lay = { land, gx: 12, gy: (H - g) / 2, g, lx: g + 28, ly: 54, lw: W - g - 40, lh: H - 84 - mh }; }
      else { const g = Math.min(W - 16, H * .58); lay = { land, gx: (W - g) / 2, gy: 46, g, lx: 10, ly: 46 + g + 12, lw: W - 20, lh: H - g - 66 - mh }; }
      lay.cs = lay.g / N;
      lay.cols = land ? (lay.lw > 300 ? 2 : 1) : (lay.lw > 520 ? 4 : tier === 0 ? 2 : 3); lay.rows = Math.ceil(words.length / lay.cols); lay.rh = 38;
      const fit = Math.max(2, Math.floor(lay.lh / lay.rh)); lay.vis = lay.rows > fit ? fit : lay.rows; if (tier > 0 && lay.rows > 4 && !land) lay.vis = Math.min(lay.vis, 4); // 4 lignes visibles, le reste défile
      if (lay.rows <= lay.vis) lay.rh = Math.min(46, lay.lh / Math.max(1, lay.rows));
      lay.vh = lay.vis * lay.rh; lay.maxScroll = Math.max(0, (lay.rows - lay.vis) * lay.rh); lay.my = lay.ly + lay.vh + 10;
    }
    const cellAt = (x, y) => { const cx = Math.floor((x - lay.gx) / lay.cs), cy = Math.floor((y - lay.gy) / lay.cs); return cx >= 0 && cx < N && cy >= 0 && cy < N ? [cx, cy] : null; };
    const hintBox = () => ({ x: lay.land ? lay.lx : env.W - 112, y: lay.land ? 10 : 6, w: 102, h: 34 });
    function levelDone() { const bonus = 50 + level * 20 + Math.round(timeLeft); score += bonus * MULT; doneT = 2.4; sfx.win(); env.vibe(80); for (let i = 0; i < 6; i++) pr.burst(rnd(40, env.W - 40), rnd(60, env.H * .6), pick(COLS), 14, 260); }
    function update(dt) {
      if (over) return; t += dt; pr.update(dt); shake = Math.max(0, shake - dt); intro = Math.max(0, intro - dt); mystMsg = Math.max(0, mystMsg - dt); layout(); scroll = clamp(scroll, 0, lay.maxScroll);
      for (const o of words) o.pop = Math.max(0, o.pop - dt * 2);
      if (hint) { hint.t -= dt; if (hint.t <= 0) hint = null; }
      if (doneT > 0) { doneT -= dt; if (doneT <= 0) { if (level >= MAXLV) { over = true; env.gameOver(score, { win: true, title: 'Champion des mots !', text: 'Tu as terminé les ' + MAXLV + ' grilles.' }); return; } level++; build(); } return; }
      if (timeMax) { timeLeft -= dt; if (timeLeft <= 0) { over = true; env.gameOver(score, { title: 'Temps écoulé !', text: 'Tu es arrivé au niveau ' + level + '.' }); return; } if (timeLeft < 10 && Math.floor(timeLeft) !== Math.floor(timeLeft + dt)) sfx.tick(); }
      const p = input.pointer;
      if (p.justDown) {
        const hb = hintBox();
        if (p.x > hb.x && p.x < hb.x + hb.w && p.y > hb.y && p.y < hb.y + hb.h) {
          const left = words.filter(o => !o.found);
          if (hints > 0 && phase === 'find' && left.length) { const o = pick(left); hint = { x: o.x0, y: o.y0, t: 2.5 }; hints--; if (tier > 0) score = Math.max(0, score - 20); sfx.ok(); const i = words.indexOf(o), row = Math.floor(i / lay.cols); scroll = clamp((row - 1) * lay.rh, 0, lay.maxScroll); o.pop = 1; } else sfx.ko();
        }
        else if (p.x > lay.lx && p.x < lay.lx + lay.lw && p.y > lay.ly && p.y < lay.ly + lay.vh) drag = { y0: p.y, s0: scroll };
        else {
          const c = cellAt(p.x, p.y);
          if (phase === 'myst') { if (c) { const i = myst.cells.findIndex(q => q[0] === c[0] && q[1] === c[1]); if (i >= 0 && !mystGot[i]) { mystGot[i] = true; sfx.coin(); pr.burst(lay.gx + (c[0] + .5) * lay.cs, lay.gy + (c[1] + .5) * lay.cs, '#ffd23f', 10, 160); if (mystGot.every(Boolean)) { score += (100 + myst.w.length * 20) * MULT; mystMsg = 2.4; levelDone(); } } else if (i < 0) { sfx.ko(); shake = .25; } } }
          else { sel = c ? { x0: c[0], y0: c[1], x1: c[0], y1: c[1] } : null; if (c) sfx.tap(); }
        }
      }
      if (drag) { if (p.down) scroll = clamp(drag.s0 - (p.y - drag.y0), 0, lay.maxScroll); else drag = null; }
      if (sel && p.down) { // on accroche le doigt à l'une des 8 directions
        const fx = (p.x - lay.gx) / lay.cs - .5 - sel.x0, fy = (p.y - lay.gy) / lay.cs - .5 - sel.y0, len = Math.round(Math.max(Math.abs(fx), Math.abs(fy)));
        if (len === 0) { sel.x1 = sel.x0; sel.y1 = sel.y0; }
        else { const a = Math.round(Math.atan2(fy, fx) / (Math.PI / 4)), dx = [1, 1, 0, -1, -1, -1, 0, 1][(a + 8) % 8], dy = [0, 1, 1, 1, 0, -1, -1, -1][(a + 8) % 8]; let L = len; while (L > 0 && (sel.x0 + dx * L < 0 || sel.x0 + dx * L >= N || sel.y0 + dy * L < 0 || sel.y0 + dy * L >= N)) L--; const nx = sel.x0 + dx * L, ny = sel.y0 + dy * L; if (nx !== sel.x1 || ny !== sel.y1) { sel.x1 = nx; sel.y1 = ny; sfx.tick(); } }
      }
      if (sel && p.justUp) {
        const o = words.find(o => !o.found && ((o.x0 === sel.x0 && o.y0 === sel.y0 && o.x1 === sel.x1 && o.y1 === sel.y1) || (o.x0 === sel.x1 && o.y0 === sel.y1 && o.x1 === sel.x0 && o.y1 === sel.y0)));
        if (o) {
          o.found = true; o.pop = 1; score += o.w.length * 10 * MULT; sfx.coin(); env.vibe(25);
          const mx = lay.gx + ((o.x0 + o.x1) / 2 + .5) * lay.cs, my = lay.gy + ((o.y0 + o.y1) / 2 + .5) * lay.cs; pr.burst(mx, my, o.col, 16, 200);
          if (words.every(q => q.found)) { if (myst) { phase = 'myst'; mystMsg = 3.5; sfx.ok(); } else levelDone(); }
          else if (lay.maxScroll > 0) { const vis0 = Math.floor(scroll / lay.rh) * lay.cols, vis1 = vis0 + lay.vis * lay.cols; if (words.slice(vis0, vis1).every(q => q.found)) { const nx = words.findIndex(q => !q.found); scroll = clamp(Math.floor(nx / lay.cols) * lay.rh, 0, lay.maxScroll); } } // plus rien à chercher à l'écran : on amène la suite
        } else if (sel.x0 !== sel.x1 || sel.y0 !== sel.y1) { sfx.ko(); shake = .25; }
        sel = null;
      }
      if (!p.down) sel = null;
      const left = words.filter(o => !o.found).length; env.setScore(score); env.hud('Niveau ' + level + '/' + MAXLV + (left ? ' · ' + left + ' mot' + (left > 1 ? 's' : '') : ''));
    }
    function capsule(c, x0, y0, x1, y1, col, alpha) { const cs = lay.cs; c.globalAlpha = alpha; c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = cs * .72; c.beginPath(); c.moveTo(lay.gx + (x0 + .5) * cs, lay.gy + (y0 + .5) * cs); c.lineTo(lay.gx + (x1 + .5) * cs + .01, lay.gy + (y1 + .5) * cs); c.stroke(); c.globalAlpha = 1; c.lineCap = 'butt'; }
    function draw(c) {
      const W = env.W, H = env.H; if (!lay) layout(); const cs = lay.cs;
      const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2b1f6b'); bg.addColorStop(1, '#17123a'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) { const x = (i * 97 + t * 8) % (W + 80) - 40, y = (i * 61) % H; Draw.text(c, 'ABCDEFGHIJKLMNOP'[i], x, y, 46, 'rgba(255,255,255,.045)'); }
      Draw.text(c, (myst ? 'GRILLE PLEINE' : theme.toUpperCase()), lay.land ? lay.lx + 112 : 12, lay.land ? 27 : 23, myst ? 13 : 16, '#ffd23f', 'left');
      if (timeMax) { const bw = lay.land ? lay.lw : W - 250, bx = lay.land ? lay.lx : 128, by = lay.land ? H - 14 : 18, f = clamp(timeLeft / timeMax, 0, 1); if (bw > 40) { c.fillStyle = 'rgba(255,255,255,.14)'; Draw.rr(c, bx, by, bw, 10, 5); c.fill(); c.fillStyle = f < .25 ? '#ff4f4f' : f < .5 ? '#ff9f1c' : '#9dff5c'; if (f > .02) { Draw.rr(c, bx, by, bw * f, 10, 5); c.fill(); } } }
      const hb = hintBox(); c.fillStyle = hints > 0 ? '#ffd23f' : 'rgba(255,255,255,.18)'; Draw.rr(c, hb.x, hb.y, hb.w, hb.h, 17); c.fill(); Draw.text(c, 'INDICE ' + '●'.repeat(hints), hb.x + hb.w / 2, hb.y + hb.h / 2 + 1, 13, hints > 0 ? '#1b1540' : 'rgba(255,255,255,.5)');
      // grille
      const sx = shake > 0 ? Math.sin(t * 70) * 5 * (shake / .25) : 0; c.save(); c.translate(sx, 0);
      c.fillStyle = '#fff8ec'; Draw.rr(c, lay.gx - 4, lay.gy - 4, lay.g + 8, lay.g + 8, 16); c.fill();
      c.fillStyle = 'rgba(27,21,64,.05)'; for (let y = 0; y < N; y++) for (let x = (y % 2); x < N; x += 2) c.fillRect(lay.gx + x * cs, lay.gy + y * cs, cs, cs);
      for (const o of words) if (o.found) capsule(c, o.x0, o.y0, o.x1, o.y1, o.col, myst ? .5 : .62);
      if (phase === 'myst' || (myst && doneT > 0)) myst.cells.forEach((q, i) => { const cxp = lay.gx + (q[0] + .5) * cs, cyp = lay.gy + (q[1] + .5) * cs, r = cs * (.4 + (mystGot[i] ? 0 : Math.sin(t * 7 + i) * .05)); c.fillStyle = mystGot[i] ? '#ffd23f' : '#fff'; c.strokeStyle = '#ff4f9a'; c.lineWidth = 3; c.beginPath(); c.arc(cxp, cyp, r, 0, 7); c.fill(); c.stroke(); });
      if (sel) capsule(c, sel.x0, sel.y0, sel.x1, sel.y1, '#7c5cff', .5);
      if (hint) { c.strokeStyle = '#ff4f9a'; c.lineWidth = 4; c.beginPath(); c.arc(lay.gx + (hint.x + .5) * cs, lay.gy + (hint.y + .5) * cs, cs * (.42 + Math.sin(t * 10) * .06), 0, 7); c.stroke(); }
      c.font = '900 ' + Math.round(cs * .56) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#1b1540';
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.fillText(grid[y][x], lay.gx + (x + .5) * cs, lay.gy + (y + .54) * cs);
      c.restore();
      // liste des mots (elle défile quand elle est longue)
      const cols = lay.cols, rh = lay.rh, cw = lay.lw / cols; c.save(); c.beginPath(); c.rect(lay.lx, lay.ly, lay.lw, lay.vh); c.clip();
      words.forEach((o, i) => {
        const x = lay.lx + (i % cols) * cw, y = lay.ly + Math.floor(i / cols) * rh - scroll; if (y > lay.ly + lay.vh || y + rh < lay.ly) return; const fs = Math.min(rh * .5, cw / (Math.max(6, o.w.length) * .68)) * (1 + o.pop * .25);
        c.fillStyle = o.found ? o.col : 'rgba(255,255,255,.1)'; Draw.rr(c, x + 3, y + 3, cw - 6, rh - 6, Math.min(12, rh * .3)); c.fill();
        Draw.text(c, o.w, x + cw / 2, y + rh / 2 + 1, fs, o.found ? '#1b1540' : '#fff');
        if (o.found) { const tw = c.measureText(o.w).width; c.strokeStyle = '#1b1540'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x + cw / 2 - tw / 2 - 4, y + rh / 2); c.lineTo(x + cw / 2 + tw / 2 + 4, y + rh / 2); c.stroke(); }
      });
      c.restore();
      if (lay.maxScroll > 0) { // ascenseur + flèches « il y en a encore »
        const th = lay.vh * lay.vis / lay.rows, ty = lay.ly + (lay.vh - th) * (scroll / lay.maxScroll); c.fillStyle = 'rgba(255,255,255,.15)'; Draw.rr(c, lay.lx + lay.lw - 3, lay.ly, 4, lay.vh, 2); c.fill(); c.fillStyle = '#ffd23f'; Draw.rr(c, lay.lx + lay.lw - 3, ty, 4, th, 2); c.fill();
        const below = words.filter((o, i) => !o.found && lay.ly + Math.floor(i / cols) * rh - scroll >= lay.ly + lay.vh - 2).length, above = words.filter((o, i) => !o.found && Math.floor(i / cols) * rh - scroll + rh <= 2).length, bob = Math.sin(t * 5) * 2;
        if (below) { const g = c.createLinearGradient(0, lay.ly + lay.vh - 26, 0, lay.ly + lay.vh); g.addColorStop(0, 'rgba(23,18,58,0)'); g.addColorStop(1, 'rgba(23,18,58,.95)'); c.fillStyle = g; c.fillRect(lay.lx, lay.ly + lay.vh - 26, lay.lw, 26); Draw.text(c, '▼ encore ' + below + ' mot' + (below > 1 ? 's' : ''), lay.lx + lay.lw / 2, lay.ly + lay.vh - 8 + bob, 13, '#ffd23f'); }
        if (above) { const g = c.createLinearGradient(0, lay.ly, 0, lay.ly + 24); g.addColorStop(0, 'rgba(23,18,58,.95)'); g.addColorStop(1, 'rgba(23,18,58,0)'); c.fillStyle = g; c.fillRect(lay.lx, lay.ly, lay.lw, 24); Draw.text(c, '▲ ' + above, lay.lx + lay.lw / 2, lay.ly + 9 - bob, 13, '#ffd23f'); }
      }
      if (myst) { // mot mystère : les cases se remplissent quand on touche les lettres restantes
        const n = myst.w.length, bw = Math.min(34, (lay.lw - 20) / n), x0 = lay.lx + lay.lw / 2 - n * bw / 2, y = lay.my + 20, show = doneT > 0;
        Draw.text(c, 'MOT MYSTÈRE' + (phase === 'myst' || show ? ' · ' + THEME_OF[myst.w] : ' · ' + n + ' lettres'), lay.lx + lay.lw / 2, lay.my + 8, 12, phase === 'myst' ? '#ffd23f' : 'rgba(255,255,255,.7)');
        for (let i = 0; i < n; i++) { const got = mystGot[i]; c.fillStyle = got ? '#ffd23f' : phase === 'myst' ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.1)'; Draw.rr(c, x0 + i * bw + 2, y, bw - 4, 30, 7); c.fill(); Draw.text(c, got ? myst.w[i] : '?', x0 + i * bw + bw / 2, y + 16, 17, got ? '#1b1540' : 'rgba(255,255,255,.45)'); }
      }
      pr.draw(c);
      const banner = (txt, sub) => { c.fillStyle = 'rgba(23,18,58,.86)'; c.fillRect(0, lay.gy + lay.g / 2 - 46, W, 92); Draw.text(c, txt, W / 2, lay.gy + lay.g / 2 - (sub ? 12 : 0), Math.min(32, W / (txt.length * .62)), '#ffd23f'); if (sub) Draw.text(c, sub, W / 2, lay.gy + lay.g / 2 + 22, Math.min(15, W / (sub.length * .52)), '#fff', 'center', 700); };
      if (doneT > 0) banner(myst ? 'Mot mystère : ' + myst.w + ' !' : level >= MAXLV ? 'Bravo !' : 'Niveau ' + level + ' réussi !', level >= MAXLV ? 'Toutes les grilles sont finies' : myst ? 'Niveau ' + level + ' réussi !' : 'Grille suivante…');
      else if (phase === 'myst' && mystMsg > 0) { c.globalAlpha = Math.min(1, mystMsg); c.fillStyle = 'rgba(23,18,58,.9)'; Draw.rr(c, 8, 4, W - 16, 40, 12); c.fill(); Draw.text(c, 'Touche les lettres qui restent !', W / 2, 25, Math.min(17, W / 20), '#ffd23f'); c.globalAlpha = 1; }
      else if (intro > 0) { c.globalAlpha = Math.min(1, intro * 2); banner('Niveau ' + level + ' · ' + words.length + ' mots', myst ? 'Grille pleine : un mot mystère est caché !' : cfg.nd <= 2 ? 'Mots vers la droite et vers le bas' : cfg.nd <= 4 ? 'Attention : mots en diagonale !' : 'Dans tous les sens, même à l\'envers !'); c.globalAlpha = 1; }
    }
    build();
    return { update, draw, dbg: () => ({ words, grid, N, lay, level, score, myst, phase, scroll }) };
  }
});
