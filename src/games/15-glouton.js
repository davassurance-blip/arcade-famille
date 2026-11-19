/* ===== Glouton (dès 8 ans) — labyrinthes, pastilles et fantômes, 12 niveaux qui montent en douceur ===== */

/* Les labyrinthes. '#' mur, '.' pastille, 'o' super-pastille, '-' porte de l'enclos, 'G' enclos des fantômes,
   'P' départ du héros, ' ' couloir vide. Une ligne ouverte aux deux bouts forme un tunnel gauche-droite.
   Le premier est petit, tout en boucles (aucun cul-de-sac) ; les suivants sont plus grands.
   Chaque labyrinthe a sa couleur de murs : l'enfant voit tout de suite qu'il a changé de décor. */
const GLOUTON_MAZES = [
  { name: 'le Jardin', wall: '#123a6b', edge: '#4fb0ff', rows: [
    '###############',
    '#.............#',
    '#.##.#####.##.#',
    '#o...........o#',
    '#.##.     .##.#',
    '#.##.##-##.##.#',
    '    .#GGG#.    ',
    '#.##.#####.##.#',
    '#.............#',
    '#.##.#####.##.#',
    '#o.....P.....o#',
    '#.##.#####.##.#',
    '#.............#',
    '###############'] },
  { name: 'le Manoir', wall: '#2a2270', edge: '#8478ff', rows: [
    '###################',
    '#........#........#',
    '#o##.###.#.###.##o#',
    '#.................#',
    '#.##.#.#####.#.##.#',
    '#....#...#...#....#',
    '####.### # ###.####',
    '####.#       #.####',
    '####.# ##-## #.####',
    '    .  #GGG#  .    ',
    '####.# ##### #.####',
    '####.#       #.####',
    '####.# ##### #.####',
    '#........#........#',
    '#.##.###.#.###.##.#',
    '#o.#.....P.....#.o#',
    '##.#.#.#####.#.#.##',
    '#....#...#...#....#',
    '#.######.#.######.#',
    '#.................#',
    '###################'] },
  { name: 'le Temple', wall: '#5c2c0c', edge: '#ffa53a', rows: [
    '###################',
    '#....#.......#....#',
    '#.##.#.#####.#.##.#',
    '#o...............o#',
    '#.##.###.#.###.##.#',
    '#....#...#...#....#',
    '##.#.#.#####.#.#.##',
    '#..#..       ..#..#',
    '#.##.# ##-## #.##.#',
    '     # #GGG# #     ',
    '#.##.# ##### #.##.#',
    '#..#..       ..#..#',
    '##.#.#.#####.#.#.##',
    '#....#...#...#....#',
    '#.##.###.#.###.##.#',
    '#o.......P.......o#',
    '#.##.#.#####.#.##.#',
    '#....#.......#....#',
    '###################'] },
  { name: 'le Château', wall: '#551247', edge: '#ff62b4', rows: [
    '#####################',
    '#.........#.........#',
    '#.###.###.#.###.###.#',
    '#o#.....#...#.....#o#',
    '#.#.###.#.#.#.###.#.#',
    '#.....#...#...#.....#',
    '###.#.###.#.###.#.###',
    '#...#..       ..#...#',
    '#.###.# ##-## #.###.#',
    '     .  #GGG#  .     ',
    '#.###.# ##### #.###.#',
    '#...#..       ..#...#',
    '###.#.###.#.###.#.###',
    '#.....#...#...#.....#',
    '#.#.###.#.#.#.###.#.#',
    '#o#.....#.P.#.....#o#',
    '#.###.###.#.###.###.#',
    '#.........#.........#',
    '#####################'] }
];

/* Réglages par niveau — une ligne = un niveau.
   lab     : numéro du labyrinthe (0 Jardin, 1 Manoir, 2 Temple, 3 Château)
   n       : nombre de fantômes (rouge, puis orange, rose, bleu)
   heros   : vitesse du héros, en cases par seconde
   fant    : vitesse des fantômes (toujours inférieure à celle du héros)
   peur    : durée de la super-pastille, en secondes
   chasse  : durée d'une phase où les fantômes poursuivent
   repos   : durée d'une phase où ils repartent chacun dans leur coin
   hesite  : probabilité qu'un fantôme prenne un chemin au hasard à un croisement (1 = complètement distrait)
   L'ancienne difficulté (4 fantômes rapides, 7 s de peur) correspond à peu près au niveau 8 des 8-12 ans
   et au niveau 7 des 13 ans et plus. */
const GLOUTON_LEVELS = {
  // 8-12 ans
  1: [
    //lab  n  heros fant  peur chasse repos hesite
    [0,    1, 5.0,  2.6,  10,  6,     9,    .50],
    [0,    1, 5.0,  3.0,  9,   8,     8,    .40],
    [1,    2, 5.1,  3.1,  9,   10,    8,    .40],
    [1,    2, 5.1,  3.4,  8,   12,    7,    .32],
    [2,    3, 5.2,  3.6,  8,   14,    7,    .25],
    [2,    3, 5.2,  3.8,  7,   16,    6,    .20],
    [3,    4, 5.3,  3.9,  7,   16,    6,    .15],
    [1,    4, 5.3,  4.1,  6,   18,    5,    .12],
    [2,    4, 5.4,  4.3,  6,   20,    5,    .08],
    [3,    4, 5.4,  4.5,  5,   20,    4,    .06],
    [2,    4, 5.5,  4.6,  5,   22,    4,    .04],
    [3,    4, 5.6,  4.8,  4,   24,    3,    .02]
  ],
  // 13 ans et plus : un cran au-dessus à chaque niveau, mais la montée reste progressive
  2: [
    [0,    1, 5.6,  3.5,  8,   8,     7,    .35],
    [0,    2, 5.6,  3.8,  7,   10,    7,    .30],
    [1,    2, 5.7,  4.0,  7,   12,    6,    .22],
    [1,    3, 5.7,  4.2,  6,   14,    6,    .16],
    [2,    3, 5.8,  4.3,  6,   16,    5,    .12],
    [2,    4, 5.8,  4.5,  5,   18,    5,    .08],
    [3,    4, 5.9,  4.7,  5,   20,    5,    .05],
    [1,    4, 5.9,  4.9,  4,   20,    4,    .03],
    [2,    4, 6.0,  5.1,  4,   22,    4,    0],
    [3,    4, 6.0,  5.3,  3.5, 24,    3,    0],
    [2,    4, 6.1,  5.5,  3,   26,    3,    0],
    [3,    4, 6.2,  5.7,  2.5, 30,    2,    0]
  ]
};

/* Contrôle d'un labyrinthe par parcours en largeur depuis le départ : toutes les pastilles et tous les
   couloirs doivent être atteignables, l'enclos doit avoir sa porte et une case libre au-dessus. */
function gloutonCheck(rows) {
  const H = rows.length, W = rows[0].length, at = (x, y) => y < 0 || y >= H ? '#' : rows[y][((x % W) + W) % W];
  const open = (x, y) => '#-G'.indexOf(at(x, y)) < 0, N = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let start = null, door = null, pellets = 0, unreachable = 0, deadEnds = 0, tunnel = false;
  const sameLen = rows.every(r => r.length === W);
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { if (r[x] === 'P') start = [x, y]; if (r[x] === '-') door = [x, y]; } if (open(0, y) && open(W - 1, y)) tunnel = true; });
  const seen = {}, q = start ? [start] : []; if (start) seen[start] = 1;
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of N) { const nx = ((x + dx) % W + W) % W, ny = y + dy; if (open(nx, ny) && !seen[[nx, ny]]) { seen[[nx, ny]] = 1; q.push([nx, ny]); } } }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!open(x, y)) continue; const ch = rows[y][x];
    if (ch === '.' || ch === 'o') pellets++;
    if (!seen[[x, y]]) unreachable++;
    if (N.filter(([dx, dy]) => open(x + dx, y + dy)).length < 2) deadEnds++;
  }
  let sealed = true; for (let x = 0; x < W; x++) if (open(x, 0) || open(x, H - 1)) sealed = false;
  for (let y = 0; y < H; y++) if (open(0, y) !== open(W - 1, y)) sealed = false;
  const pen = !!door && at(door[0], door[1] + 1) === 'G' && at(door[0] - 1, door[1] + 1) === 'G' && at(door[0] + 1, door[1] + 1) === 'G' && open(door[0], door[1] - 1) && !!seen[[door[0], door[1] - 1]];
  return { ok: sameLen && !!start && pen && sealed && unreachable === 0 && pellets > 0, cols: W, rows: H, pellets, unreachable, deadEnds, tunnel, pen, sealed };
}

GAMES.push({
  id: 'glouton', title: 'Glouton', tagline: 'Mange tout, fuis les fantômes', minAge: 8, color: '#9dff5c',
  icon: '<svg viewBox="0 0 64 64"><path d="M30 10a22 22 0 1 0 18 34L30 32z" fill="#9dff5c"/><circle cx="30" cy="22" r="3" fill="#1b1540"/><circle cx="52" cy="14" r="4" fill="#ffd23f"/><circle cx="56" cy="40" r="3" fill="#ffd23f"/><path d="M44 48a9 9 0 0 1 18 0v12l-3-3-3 3-3-3-3 3-3-3-3 3z" fill="#ff4f9a"/><circle cx="50" cy="48" r="2" fill="#fff"/><circle cx="56" cy="48" r="2" fill="#fff"/></svg>',
  howto: ['',
    'Mange toutes les pastilles pour passer au niveau suivant : il y en a 12. Au début, un seul fantôme, pas très malin. Les grosses pastilles rendent les fantômes bleus : croque-les ! Attrape les cœurs pour gagner des vies.',
    '12 niveaux, 4 labyrinthes. Un seul fantôme au départ, puis ça se corse vite : fantômes plus rapides, super-pastilles plus courtes. Une vie bonus tous les 4000 points, et des cœurs à attraper.'],
  pad: { dpad: true, hint: 'ou glisse le doigt' },
  // 1 étoile : deux niveaux passés (environ 3500 points) ; 2 étoiles : arrivé vers le niveau 5 ; 3 étoiles : vers le niveau 8
  stars: s => s >= 25000 ? 3 : s >= 12000 ? 2 : s >= 3500 ? 1 : 0,
  create(env, saved) {
    const { input, sfx } = env;
    const TIER = env.tier >= 2 ? 2 : 1, TABLE = GLOUTON_LEVELS[TIER], LAST = TABLE.length;
    const MAX_LIVES = 5, START_LIVES = TIER === 1 ? 4 : 3;
    const LIFE_EVERY = TIER === 1 ? 3000 : 4000;      // une vie bonus à chaque palier de score
    const LIFE_LEVELS = [3, 6, 9];                    // +1 vie en terminant ces niveaux
    const LATE_TURN = .4;                             // on peut encore tourner juste après avoir dépassé un croisement
    const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }, OPP = { left: 'right', right: 'left', up: 'down', down: 'up' }, DKEYS = ['up', 'left', 'down', 'right'];
    const ANG = { left: Math.PI, right: 0, up: -Math.PI / 2, down: Math.PI / 2 };
    // Les quatre caractères, dans l'ordre d'arrivée : le rouge colle, l'orange est froussard, le rose coupe la route, le bleu prend à revers
    const KINDS = [{ c: '#ff4f4f', k: 'suit' }, { c: '#ff9f1c', k: 'timide' }, { c: '#ff9fd0', k: 'devant' }, { c: '#38e0d6', k: 'revers' }];
    const FRUITS = [{ n: 'cerise', pts: 100 }, { n: 'fraise', pts: 200 }, { n: 'orange', pts: 300 }, { n: 'pomme', pts: 500 }, { n: 'raisin', pts: 700 }, { n: 'étoile', pts: 1000 }];
    const BRAVOS = ['Bravo !', 'Super !', 'Génial !', 'Quel appétit !', 'Trop fort !', 'Bien joué !'];
    const pr = Particles();

    let level = 1, lives = START_LIVES, score = 0, nextLifeAt = LIFE_EVERY;
    let M, COLS, ROWS, grid, cfg, pellets, total, start, home, penC, corners, homeDist, corridors;
    let pac, ghosts, phase = 'ready', phaseT = 0, t = 0, levelT = 0, mode, modeT, fright = 0, eatChain = 0, freeze = 0, over = false;
    let fruit = null, fruitDone = 0, heart = null, heartAt = Infinity, heartDone = false;
    let banner = null, floats = [], inter = null;
    let cell = 20, ox = 0, oy = 0, side = false, layer = null;

    /* ---------- Labyrinthe ---------- */
    const wrapX = x => ((x % COLS) + COLS) % COLS;
    function open(x, y) { if (y < 0 || y >= ROWS) return false; const ch = grid[y][wrapX(x)]; return ch !== '#' && ch !== '-' && ch !== 'G'; }
    function canStep(x, y, d) { const v = DIRS[d]; return open(x + v[0], y + v[1]); }
    function readCfg(n) { const r = TABLE[n - 1]; return { maze: r[0], n: r[1], ps: r[2], gs: r[3], fright: r[4], chase: r[5], scatter: r[6], fuzz: r[7] }; }
    function loadLevel(n) {
      level = n; cfg = readCfg(n); M = GLOUTON_MAZES[cfg.maze];
      grid = M.rows.map(r => r.split('')); ROWS = grid.length; COLS = grid[0].length;
      pellets = 0; corridors = []; let door = null;
      grid.forEach((row, y) => row.forEach((ch, x) => {
        if (ch === '.' || ch === 'o') { pellets++; corridors.push([x, y]); }
        if (ch === 'P') { start = [x, y]; row[x] = ' '; }
        if (ch === '-') door = [x, y];
      }));
      total = pellets; home = [door[0], door[1] - 1]; penC = [door[0], door[1] + 1];
      corners = [[COLS - 2, 1], [1, ROWS - 2], [1, 1], [COLS - 2, ROWS - 2]];
      // distances jusqu'à la sortie de l'enclos : les yeux d'un fantôme croqué rentrent par le plus court chemin
      homeDist = grid.map(r => r.map(() => 1e9)); homeDist[home[1]][home[0]] = 0;
      const q = [home]; while (q.length) { const [x, y] = q.shift(); for (const d of DKEYS) { const nx = wrapX(x + DIRS[d][0]), ny = y + DIRS[d][1]; if (open(nx, ny) && homeDist[ny][nx] > homeDist[y][x] + 1) { homeDist[ny][nx] = homeDist[y][x] + 1; q.push([nx, ny]); } } }
      fruit = null; fruitDone = 0; heart = null; heartDone = false; levelT = 0; floats = [];
      heartAt = level % 2 === 0 ? rnd(10, 22) : Infinity; // un cœur se promène dans les niveaux pairs
      fit(); placeAll();
    }
    function mk(tx, ty, dir) { return { tx, ty, dir, p: 0, moving: false, x: tx, y: ty }; }
    function sync(e) { const v = DIRS[e.dir]; e.x = e.tx + v[0] * e.p; e.y = e.ty + v[1] * e.p; }
    function placeAll() {
      pac = mk(start[0], start[1], 'left'); pac.next = 'left'; pac.mouth = 0; pac.sx = 0; pac.sy = 0;
      // le premier fantôme attend dehors, les autres sortent de l'enclos un par un (plus vite aux niveaux élevés)
      const gap = Math.max(2, 5.5 - level * .3), slotX = [0, 0, -1, 1];
      ghosts = KINDS.slice(0, cfg.n).map((K, i) => {
        const g = mk(home[0], home[1], i % 2 ? 'right' : 'left');
        g.i = i; g.c = K.c; g.k = K.k; g.state = i === 0 ? 'out' : 'pen'; g.wait = i === 0 ? 0 : 1 + (i - 1) * gap; g.eyes = false; g.frightened = false;
        g.px = penC[0] + slotX[i]; g.py = penC[1]; if (i > 0) { g.x = g.px; g.y = g.py; }
        return g;
      });
      mode = 'scatter'; modeT = cfg.scatter; fright = 0; eatChain = 0; freeze = 0;
      phase = 'ready'; phaseT = 1.4; say('Prêt ?', 1.4);
    }

    /* ---------- Affichage : mise à l'échelle et murs pré-dessinés ---------- */
    function fit() {
      const W = env.W, H = env.H;
      // en paysage, les vies et le niveau vont dans la marge de gauche ; sinon dans un bandeau au-dessus du labyrinthe
      let c = Math.floor(Math.min((W - 8) / COLS, (H - 6) / ROWS)); side = (W - COLS * c) / 2 >= 150;
      const top = side ? 0 : 30; if (!side) c = Math.floor(Math.min((W - 8) / COLS, (H - top - 6) / ROWS));
      cell = Math.max(6, c); ox = Math.floor((W - COLS * cell) / 2); oy = top + Math.max(0, Math.floor((H - top - ROWS * cell) / 2));
      buildLayer();
    }
    // Les murs sont tracés une seule fois dans un canvas hors écran : des traits épais à bouts ronds reliant
    // les cases de mur voisines donnent des murs arrondis, bordés d'un liseré clair.
    function buildLayer() {
      const k = Math.min(2, window.devicePixelRatio || 1); layer = document.createElement('canvas');
      layer.width = Math.max(1, Math.round(COLS * cell * k)); layer.height = Math.max(1, Math.round(ROWS * cell * k));
      const c = layer.getContext('2d'); c.scale(k, k); c.lineCap = 'round'; c.lineJoin = 'round';
      const isW = (x, y) => y >= 0 && y < ROWS && x >= 0 && x < COLS && grid[y][x] === '#', mid = v => (v + .5) * cell;
      const thick = cell * .62, rim = Math.max(1.5, cell * .09);
      for (const [color, w] of [[M.edge, thick], [M.wall, thick - rim * 2]]) {
        c.strokeStyle = color; c.fillStyle = color; c.lineWidth = w; c.beginPath();
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          if (!isW(x, y)) continue;
          const r = isW(x + 1, y), d = isW(x, y + 1);
          if (r) { c.moveTo(mid(x), mid(y)); c.lineTo(mid(x + 1), mid(y)); }
          if (d) { c.moveTo(mid(x), mid(y)); c.lineTo(mid(x), mid(y + 1)); }
          if (!r && !d && !isW(x - 1, y) && !isW(x, y - 1)) { c.moveTo(mid(x), mid(y)); c.lineTo(mid(x) + .01, mid(y)); }
          if (r && d && isW(x + 1, y + 1)) c.fillRect(mid(x), mid(y), cell, cell); // cœur des gros blocs
        }
        c.stroke();
      }
      // porte de l'enclos
      c.fillStyle = '#ffd9ec';
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x] === '-') c.fillRect(x * cell - cell * .2, mid(y) - cell * .09, cell * 1.4, cell * .18);
    }

    /* ---------- Messages, score, vies ---------- */
    function say(txt, dur, color) { banner = { txt, t: dur || 1.5, d: dur || 1.5, color: color || '#ffd23f' }; }
    function float(x, y, txt, color) { floats.push({ x, y, txt, t: 1, color: color || '#fff' }); }
    const px = x => ox + (x + .5) * cell, py = y => oy + (y + .5) * cell;
    function gainLife(why) {
      if (lives < MAX_LIVES) { lives++; say(why + ' +1 vie', 2, '#ff8fc0'); sfx.win(); env.vibe(80); pr.burst(px(pac.x), py(pac.y), '#ff4f9a', 16); }
      else { score += 300; say('Plein de vies : +300 points', 1.6, '#ff8fc0'); sfx.coin(); } // déjà au maximum : des points à la place
    }
    function addScore(n) {
      score += n;
      while (score >= nextLifeAt) { nextLifeAt += LIFE_EVERY; gainLife('Vie bonus !'); }
    }
    function persist() { env.save({ level, lives, score }, 'Niveau ' + level + ' · ' + lives + ' vie' + (lives > 1 ? 's' : '') + ' · ' + score + ' pts'); }

    /* ---------- Déplacements case par case ----------
       Chaque personnage est sur une case (tx, ty) et avance d'une fraction p vers la case suivante.
       Arrivé au centre d'une case, il choisit sa direction : impossible de rater un croisement ou de se coincer. */
    function travel(e, dist, choose) {
      let guard = 8;
      while (dist > 1e-6 && guard--) {
        if (!e.moving) { choose(e); if (!e.moving) break; }
        const need = 1 - e.p;
        if (dist < need) { e.p += dist; dist = 0; }
        else { dist -= need; const v = DIRS[e.dir]; e.tx = wrapX(e.tx + v[0]); e.ty += v[1]; e.p = 0; e.moving = false; }
      }
      sync(e);
    }
    function reverse(e) {
      if (e.moving) { const v = DIRS[e.dir]; e.tx = wrapX(e.tx + v[0]); e.ty += v[1]; e.p = 1 - e.p; }
      e.dir = OPP[e.dir]; sync(e);
    }
    function wanted() {
      for (const d of DKEYS) if (input.pressed[d]) return d;
      if (input.swipe && DIRS[input.swipe]) return input.swipe;
      if (!pac.moving) for (const d of DKEYS) if (input.held[d]) return d; // arrêté contre un mur : le bouton maintenu suffit
      return null;
    }
    function pacChoose(e) {
      if (e.next !== e.dir && canStep(e.tx, e.ty, e.next)) e.dir = e.next; // virage mémorisé
      if (canStep(e.tx, e.ty, e.dir)) e.moving = true;
    }
    function pacUpdate(dt) {
      if (pac.moving && pac.next === OPP[pac.dir]) reverse(pac); // demi-tour immédiat, même entre deux cases
      else if (pac.moving && pac.next !== pac.dir && pac.p < LATE_TURN && canStep(pac.tx, pac.ty, pac.next)) {
        // virage demandé un poil trop tard : on l'accepte quand même, et le dessin rattrape le petit écart en douceur
        const bx = pac.x, by = pac.y; pac.dir = pac.next; sync(pac);
        if (Math.abs(bx - pac.x) < 1 && Math.abs(by - pac.y) < 1) { pac.sx += bx - pac.x; pac.sy += by - pac.y; }
      }
      travel(pac, cfg.ps * dt, pacChoose);
      const k = Math.exp(-dt * 22); pac.sx *= k; pac.sy *= k;
      if (pac.moving) pac.mouth += dt * 11;
      // on croque la pastille dès qu'on a dépassé la moitié du chemin vers sa case
      const v = DIRS[pac.dir], cx = pac.p > .5 ? wrapX(pac.tx + v[0]) : pac.tx, cy = pac.p > .5 ? pac.ty + v[1] : pac.ty, ch = grid[cy][cx];
      if (ch === '.' || ch === 'o') {
        grid[cy][cx] = ' '; pellets--;
        if (ch === 'o') {
          addScore(50); fright = cfg.fright; eatChain = 0; sfx.ok(); env.vibe(30);
          ghosts.forEach(g => { if (g.state === 'out' && !g.eyes) { if (!g.frightened) reverse(g); g.frightened = true; } });
        } else { addScore(10); if (pellets % 2 === 0) sfx.tick(); }
        const eaten = total - pellets;
        if (fruitDone < 2 && eaten >= Math.round(total * (fruitDone ? .7 : .35))) { fruit = { x: start[0], y: start[1], t: 10, kind: Math.min(FRUITS.length - 1, (level - 1) >> 1) }; fruitDone++; }
      }
      if (fruit && near(fruit, .6)) { const F = FRUITS[fruit.kind]; addScore(F.pts); sfx.coin(); float(fruit.x, fruit.y, '+' + F.pts, '#ffd23f'); pr.burst(px(fruit.x), py(fruit.y), '#ffd23f', 12); fruit = null; }
      if (heart && near(heart, .6)) { pr.burst(px(heart.x), py(heart.y), '#ff4f9a', 14); heart = null; gainLife('Un cœur !'); }
    }
    function near(o, r) { let dx = Math.abs(o.x - pac.x); dx = Math.min(dx, COLS - dx); return Math.hypot(dx, o.y - pac.y) < r; }

    /* ---------- Fantômes ---------- */
    function target(g) {
      if (mode === 'scatter') return corners[g.i];
      const v = DIRS[pac.dir], x = pac.tx, y = pac.ty;
      if (g.k === 'suit') return [x, y];
      if (g.k === 'timide') return Math.hypot(x - g.tx, y - g.ty) > 6 ? [x, y] : corners[g.i];
      if (g.k === 'devant') return [x + v[0] * 4, y + v[1] * 4];
      const r = ghosts[0]; return [2 * (x + v[0] * 2) - r.tx, 2 * (y + v[1] * 2) - r.ty];
    }
    function ghostChoose(g) {
      if (g.eyes) {
        if (g.tx === home[0] && g.ty === home[1]) { g.state = 'enter'; g.x = g.tx; g.y = g.ty; return; }
        let best = null, bd = 1e9; for (const d of DKEYS) { const nx = wrapX(g.tx + DIRS[d][0]), ny = g.ty + DIRS[d][1]; if (open(nx, ny) && homeDist[ny][nx] < bd) { bd = homeDist[ny][nx]; best = d; } }
        g.dir = best; g.moving = true; return;
      }
      // jamais de demi-tour spontané, sauf au fond d'une impasse
      let opts = DKEYS.filter(d => d !== OPP[g.dir] && canStep(g.tx, g.ty, d)); if (!opts.length) opts = [OPP[g.dir]];
      if (g.frightened || Math.random() < cfg.fuzz) g.dir = pick(opts);
      else { const tg = target(g); let bd = 1e9; for (const d of opts) { const dd = Math.hypot(g.tx + DIRS[d][0] - tg[0], g.ty + DIRS[d][1] - tg[1]); if (dd < bd - 1e-9) { bd = dd; g.dir = d; } } }
      g.moving = true;
    }
    function ghostUpdate(g, dt) {
      if (g.state === 'pen') { g.x = g.px; g.y = g.py + Math.sin(t * 5 + g.i) * .12; g.wait -= dt; if (g.wait <= 0) { g.state = 'leave'; g.y = g.py; } return; }
      if (g.state === 'leave') { // se recentre puis sort par la porte
        const sp = 3.2 * dt;
        if (Math.abs(g.x - home[0]) > .01) g.x += clamp(home[0] - g.x, -sp, sp);
        else { g.x = home[0]; g.y -= sp; if (g.y <= home[1]) { g.tx = home[0]; g.ty = home[1]; g.p = 0; g.moving = false; g.dir = g.i % 2 ? 'right' : 'left'; g.state = 'out'; sync(g); } }
        return;
      }
      if (g.state === 'enter') { g.y += 7 * dt; if (g.y >= penC[1]) { g.eyes = false; g.frightened = false; g.px = penC[0]; g.py = penC[1]; g.state = 'pen'; g.wait = .8; } return; }
      // dernière ligne droite : à partir du niveau 6, les fantômes accélèrent un peu quand il reste peu de pastilles
      const rush = level >= 6 && pellets < total * .15 ? .3 : 0;
      travel(g, (g.eyes ? 11 : g.frightened ? cfg.gs * .6 : cfg.gs + rush) * dt, ghostChoose);
    }

    /* ---------- Déroulement ---------- */
    function die() {
      phase = 'dying'; phaseT = 1.3; lives--; sfx.lose(); env.vibe(200); pr.burst(px(pac.x), py(pac.y), '#9dff5c', 20, 200); banner = null;
    }
    function afterDeath() {
      if (lives <= 0) { over = true; env.gameOver(score, { text: 'Niveau ' + level + ' sur ' + LAST + ' · ' + M.name }); return; }
      placeAll(); say(lives === 1 ? 'Dernière vie, courage !' : 'On y retourne !', 1.4);
      // coup de pouce : quand il ne reste qu'une vie, un cœur apparaît bientôt (une fois par niveau)
      if (lives === 1 && !heartDone) heartAt = levelT + 3;
      persist();
    }
    function levelDone() { phase = 'clear'; phaseT = 1.2; sfx.win(); env.vibe(60); banner = null; fruit = null; heart = null; pr.burst(px(pac.x), py(pac.y), '#ffd23f', 24, 220); }
    function afterClear() {
      const done = level; addScore(500);
      if (done >= LAST) { addScore(lives * 500); over = true; env.setScore(score); env.gameOver(score, { win: true, title: 'Champion !', text: 'Les ' + LAST + ' niveaux terminés · ' + lives + ' vie' + (lives > 1 ? 's' : '') + ' en réserve' }); return; }
      const prev = cfg, bonusLife = LIFE_LEVELS.indexOf(done) >= 0, lifeGiven = bonusLife && lives < MAX_LIVES;
      if (lifeGiven) lives++; else if (bonusLife) score += 300;
      loadLevel(done + 1);
      const news = [];
      if (cfg.maze !== prev.maze) news.push('Nouveau labyrinthe : ' + M.name + ' !');
      if (cfg.n > prev.n) news.push(cfg.n === 4 ? 'Les 4 fantômes sont là !' : 'Un nouveau fantôme arrive !');
      else if (cfg.gs > prev.gs) news.push('Les fantômes accélèrent !');
      if (!news.length) news.push('Reste bien concentré !');
      inter = { done, bravo: pick(BRAVOS), news, bonus: '+500 points' + (bonusLife ? (lifeGiven ? ' et +1 vie' : ' et +300') : ''), life: lifeGiven };
      phase = 'inter'; phaseT = 4; banner = null; persist();
    }
    function spawnHeart() {
      const far = corridors.filter(c => Math.abs(c[0] - pac.tx) + Math.abs(c[1] - pac.ty) >= 5); if (!far.length) return;
      const c = pick(far); heart = { x: c[0], y: c[1], t: 11 }; heartDone = true; heartAt = Infinity; sfx.pop();
    }
    function update(dt) {
      if (over) return; t += dt; pr.update(dt);
      if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
      for (let i = floats.length - 1; i >= 0; i--) { floats[i].t -= dt; if (floats[i].t <= 0) floats.splice(i, 1); }
      const w = pac && phase !== 'inter' ? wanted() : null; if (w) pac.next = w; // on peut préparer son départ pendant « Prêt ? »
      env.setScore(score); env.hud('Niv. ' + level + '/' + LAST + ' · ' + pellets + ' pastille' + (pellets > 1 ? 's' : ''));
      if (phase === 'ready') { phaseT -= dt; if (phaseT <= 0) phase = 'play'; return; }
      if (phase === 'dying') { phaseT -= dt; if (phaseT <= 0) afterDeath(); return; }
      if (phase === 'clear') { phaseT -= dt; if (phaseT <= 0) afterClear(); return; }
      if (phase === 'inter') { // écran entre deux niveaux : passe tout seul, ou d'un geste après un court instant
        phaseT -= dt; const skip = phaseT < 3.2 && (input.tap || input.swipe || DKEYS.some(d => input.pressed[d]) || input.pressed.a);
        if (phaseT <= 0 || skip) { inter = null; phase = 'ready'; phaseT = 1.2; say('Prêt ?', 1.2); }
        return;
      }
      if (freeze > 0) { freeze -= dt; return; } // petit arrêt sur image quand on croque un fantôme
      levelT += dt;
      if (fright > 0) { fright -= dt; if (fright <= 0) ghosts.forEach(g => g.frightened = false); }
      else {
        modeT -= dt;
        if (modeT <= 0) { mode = mode === 'scatter' ? 'chase' : 'scatter'; modeT = mode === 'chase' ? cfg.chase : cfg.scatter; ghosts.forEach(g => { if (g.state === 'out' && !g.eyes) reverse(g); }); }
      }
      if (fruit) { fruit.t -= dt; if (fruit.t <= 0) fruit = null; }
      if (heart) { heart.t -= dt; if (heart.t <= 0) heart = null; }
      if (levelT >= heartAt && !heart && !heartDone) spawnHeart();
      pacUpdate(dt); ghosts.forEach(g => ghostUpdate(g, dt));
      for (const g of ghosts) {
        if (g.state !== 'out' || g.eyes || !near(g, .65)) continue;
        if (g.frightened) {
          g.eyes = true; g.frightened = false; eatChain++; const pts = 200 * Math.pow(2, Math.min(3, eatChain - 1)); addScore(pts);
          sfx.coin(); sfx.punch(); env.vibe(40); pr.burst(px(g.x), py(g.y), g.c, 14, 200); pr.burst(px(g.x), py(g.y), '#fff', 6, 120);
          float(g.x, g.y, '+' + pts, '#7fe9ff'); freeze = .28;
          if (eatChain === cfg.n && cfg.n > 1) say('Festin de fantômes !', 1.6, '#7fe9ff');
        } else { die(); return; }
      }
      if (pellets <= 0) levelDone();
    }

    /* ---------- Dessin ---------- */
    function drawPac(c, x, y, r, ang, m) {
      c.fillStyle = 'rgba(157,255,92,.18)'; c.beginPath(); c.arc(x, y, r * 1.35, 0, 7); c.fill(); // halo sans flou
      c.fillStyle = '#9dff5c'; c.beginPath(); c.moveTo(x - Math.cos(ang) * r * .15, y - Math.sin(ang) * r * .15); c.arc(x, y, r, ang + m, ang - m + Math.PI * 2); c.closePath(); c.fill();
      c.strokeStyle = '#4fae1c'; c.lineWidth = Math.max(1, r * .12); c.beginPath(); c.arc(x, y, r - c.lineWidth / 2, ang + m + .15, ang - m - .15 + Math.PI * 2); c.stroke();
      // l'œil reste toujours du côté du haut
      const ea = ang + (ang === 0 || ang === Math.PI / 2 ? -1.2 : 1.2), ex = x + Math.cos(ea) * r * .5, ey = y + Math.sin(ea) * r * .5;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, r * .2, 0, 7); c.fill();
      c.fillStyle = '#1b1540'; c.beginPath(); c.arc(ex + Math.cos(ang) * r * .07, ey + Math.sin(ang) * r * .07, r * .11, 0, 7); c.fill();
    }
    function drawGhost(c, g, x, y) {
      const r = cell * .5, scared = g.frightened && !g.eyes, v = DIRS[g.dir] || DIRS.left;
      if (!g.eyes) {
        const blink = scared && fright < 2 && Math.floor(fright * 5) % 2 === 0;
        c.fillStyle = scared ? (blink ? '#f2f2ff' : '#2a3fd6') : g.c;
        const wob = Math.floor(t * 7 + g.i) % 2, b = y + r * .95;
        c.beginPath(); c.arc(x, y - r * .08, r, Math.PI, 0); c.lineTo(x + r, b);
        for (let k = 0; k < 3; k++) { const x1 = x + r - (k + .5) * r * 2 / 3, x2 = x + r - (k + 1) * r * 2 / 3; c.quadraticCurveTo(x1 + r * .16, b + (wob ? -r * .28 : r * .04), x1, b - r * .22); c.quadraticCurveTo(x1 - r * .16, b + (wob ? r * .04 : -r * .28), x2, b); }
        c.closePath(); c.fill();
        if (!scared) { c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(x - r * .4, y - r * .55, r * .22, r * .12, -.6, 0, 7); c.fill(); }
        if (scared) { // yeux ronds et bouche en zigzag
          c.fillStyle = blink ? '#d23a3a' : '#cfe0ff'; c.beginPath(); c.arc(x - r * .33, y - r * .2, r * .13, 0, 7); c.arc(x + r * .33, y - r * .2, r * .13, 0, 7); c.fill();
          c.strokeStyle = c.fillStyle; c.lineWidth = Math.max(1, r * .12); c.beginPath(); c.moveTo(x - r * .5, y + r * .4); for (let k = 1; k <= 4; k++) c.lineTo(x - r * .5 + k * r * .25, y + r * (k % 2 ? .22 : .4)); c.stroke();
          return;
        }
      }
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x - r * .36 + v[0] * r * .1, y - r * .22 + v[1] * r * .1, r * .25, r * .3, 0, 0, 7); c.ellipse(x + r * .36 + v[0] * r * .1, y - r * .22 + v[1] * r * .1, r * .25, r * .3, 0, 0, 7); c.fill();
      c.fillStyle = '#1b2a8a'; c.beginPath(); c.arc(x - r * .36 + v[0] * r * .22, y - r * .22 + v[1] * r * .24, r * .14, 0, 7); c.arc(x + r * .36 + v[0] * r * .22, y - r * .22 + v[1] * r * .24, r * .14, 0, 7); c.fill();
    }
    function drawHeart(c, x, y, s) { Draw.heart(c, x, y - s * .55, s, true); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(x - s * .22, y - s * .22, s * .09, 0, 7); c.fill(); }
    function drawFruit(c, kind, x, y, s) {
      const dot = (dx, dy, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, 7); c.fill(); };
      const stem = (x1, y1, cx, cy, x2, y2) => { c.strokeStyle = '#49c85a'; c.lineWidth = Math.max(1.5, s * .1); c.lineCap = 'round'; c.beginPath(); c.moveTo(x + x1 * s, y + y1 * s); c.quadraticCurveTo(x + cx * s, y + cy * s, x + x2 * s, y + y2 * s); c.stroke(); };
      if (kind === 0) { stem(-.2, .1, 0, -.6, .3, -.45); stem(.22, .15, .3, -.2, .3, -.45); dot(-.2, .18, .24, '#ff3b4f'); dot(.22, .22, .24, '#e0283c'); dot(-.27, .1, .07, 'rgba(255,255,255,.6)'); }
      else if (kind === 1) { c.fillStyle = '#ff3b5c'; c.beginPath(); c.moveTo(x - s * .38, y - s * .2); c.quadraticCurveTo(x - s * .42, y + s * .3, x, y + s * .48); c.quadraticCurveTo(x + s * .42, y + s * .3, x + s * .38, y - s * .2); c.quadraticCurveTo(x, y - s * .42, x - s * .38, y - s * .2); c.fill(); dot(-.14, 0, .04, '#ffe9a8'); dot(.14, .02, .04, '#ffe9a8'); dot(0, .22, .04, '#ffe9a8'); c.fillStyle = '#49c85a'; c.beginPath(); c.ellipse(x, y - s * .3, s * .26, s * .1, 0, 0, 7); c.fill(); }
      else if (kind === 2) { dot(0, .05, .4, '#ff9f1c'); dot(-.13, -.1, .09, 'rgba(255,255,255,.45)'); c.fillStyle = '#49c85a'; c.beginPath(); c.ellipse(x + s * .12, y - s * .36, s * .16, s * .08, -.5, 0, 7); c.fill(); }
      else if (kind === 3) { dot(-.13, .08, .3, '#ff4f4f'); dot(.13, .08, .3, '#ff4f4f'); dot(-.2, -.02, .08, 'rgba(255,255,255,.5)'); stem(0, -.12, .05, -.35, .15, -.45); }
      else if (kind === 4) { for (const [dx, dy] of [[-.22, -.15], [0, -.15], [.22, -.15], [-.11, .05], [.11, .05], [0, .25]]) dot(dx, dy, .14, '#a06bff'); dot(-.25, -.2, .04, 'rgba(255,255,255,.6)'); stem(0, -.28, .05, -.42, .16, -.48); }
      else { c.fillStyle = '#ffd23f'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? .2 : .46) * s; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); dot(-.08, -.08, .06, 'rgba(255,255,255,.7)'); }
    }
    // dessine un personnage, et son double de l'autre côté quand il traverse le tunnel
    function wrapDraw(x, fn) { fn(px(x)); if (x < 0) fn(px(x + COLS)); else if (x > COLS - 1) fn(px(x - COLS)); }
    function pill(c, txt, x, y, size, color) {
      Draw.text(c, '', 0, 0, size, color); /* règle la police avant de mesurer */ const w = Math.min(env.W - 12, c.measureText(txt).width + size * 1.4), h = size * 1.7;
      c.fillStyle = 'rgba(13,10,42,.86)'; Draw.rr(c, clamp(x - w / 2, 6, env.W - w - 6), y - h / 2, w, h, h / 2); c.fill();
      Draw.text(c, txt, clamp(x, w / 2 + 6, env.W - w / 2 - 6), y + 1, size, color);
    }
    function drawHud(c) {
      const txt = 'Niveau ' + level + '/' + LAST, kind = Math.min(FRUITS.length - 1, (level - 1) >> 1);
      if (side) {
        const mx = ox / 2;
        Draw.text(c, txt, mx, oy + 26, 20, '#fff'); Draw.text(c, M.name.charAt(0).toUpperCase() + M.name.slice(1), mx, oy + 50, 13, M.edge, 'center', 700);
        Draw.lives(c, lives, MAX_LIVES, mx - 52, oy + 70);
        drawFruit(c, kind, mx - 26, oy + 122, 24); Draw.text(c, FRUITS[kind].pts + ' pts', mx + 14, oy + 123, 13, '#ffd9a8', 'center', 700);
      } else {
        const y = Math.max(4, oy - 26);
        Draw.lives(c, lives, MAX_LIVES, Math.max(16, ox + 12), y);
        const rx = Math.min(env.W - 8, ox + COLS * cell - 4);
        Draw.text(c, txt, rx, y + 10, 15, '#fff', 'right'); drawFruit(c, kind, rx - 104, y + 9, 18);
      }
    }
    function drawInter(c) {
      const W = env.W, H = env.H, a = clamp((4 - phaseT) * 4, 0, 1);
      c.fillStyle = 'rgba(13,10,42,' + (.72 * a) + ')'; c.fillRect(0, 0, W, H);
      const w = Math.min(W - 20, 350), h = Math.min(H - 12, 228), x = (W - w) / 2, y = (H - h) / 2 + (1 - a) * 20, u = h / 228;
      c.globalAlpha = a; c.fillStyle = '#1b1540'; Draw.rr(c, x, y, w, h, 20); c.fill(); c.strokeStyle = M.edge; c.lineWidth = 3; Draw.rr(c, x, y, w, h, 20); c.stroke();
      Draw.text(c, inter.bravo + ' Niveau ' + inter.done + ' terminé', W / 2, y + 30 * u, Math.min(16, w / 19), '#9dff5c');
      Draw.text(c, inter.bonus, W / 2, y + 54 * u, 14, '#ffd23f', 'center', 700);
      if (inter.life) drawHeart(c, W / 2 + w * .36, y + 53 * u, 16 + Math.sin(t * 8) * 2);
      Draw.text(c, 'Niveau ' + level, W / 2, y + 98 * u, 40 * Math.max(.8, u), '#fff');
      inter.news.forEach((n, i) => Draw.text(c, n, W / 2, y + (138 + i * 22) * u, Math.min(15, w / 21), i ? '#ffd9a8' : M.edge, 'center', 800));
      // la troupe du niveau : autant de fantômes que dans le labyrinthe, le petit dernier sautille
      const gy = y + 196 * u, sp = Math.min(34, cell * 1.9), keep = cell; cell = Math.min(26, Math.max(16, cell));
      for (let i = 0; i < cfg.n; i++) drawGhost(c, { c: KINDS[i].c, i, dir: 'left', frightened: false, eyes: false }, W / 2 + (i - (cfg.n - 1) / 2) * sp, gy - (i === cfg.n - 1 && inter.news.some(n => n.indexOf('fantôme') >= 0) ? Math.abs(Math.sin(t * 6)) * 6 : 0));
      cell = keep; c.globalAlpha = 1;
    }
    function draw(c) {
      const W = env.W, H = env.H; c.fillStyle = '#0d0a2a'; c.fillRect(0, 0, W, H);
      // murs : ils clignotent quand le niveau est terminé
      c.globalAlpha = phase === 'clear' && Math.floor(phaseT * 6) % 2 === 0 ? .35 : 1; c.drawImage(layer, ox, oy, COLS * cell, ROWS * cell); c.globalAlpha = 1;
      // pastilles (un seul tracé), puis super-pastilles qui battent
      c.fillStyle = '#ffd9a8'; c.beginPath(); const pr0 = Math.max(1.5, cell * .11);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x] === '.') { c.moveTo(px(x) + pr0, py(y)); c.arc(px(x), py(y), pr0, 0, 7); }
      c.fill();
      const big = cell * (.3 + Math.sin(t * 6) * .05);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x] === 'o') { c.fillStyle = 'rgba(255,210,63,.25)'; c.beginPath(); c.arc(px(x), py(y), big * 1.5, 0, 7); c.fill(); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(px(x), py(y), big, 0, 7); c.fill(); }
      if (fruit && (fruit.t > 3 || Math.floor(fruit.t * 5) % 2)) drawFruit(c, fruit.kind, px(fruit.x), py(fruit.y), cell * 1.05);
      if (heart && (heart.t > 3 || Math.floor(heart.t * 5) % 2)) drawHeart(c, px(heart.x), py(heart.y), cell * (.95 + Math.sin(t * 7) * .1));
      // personnages, découpés au bord du labyrinthe (tunnel)
      c.save(); c.beginPath(); c.rect(ox, oy, COLS * cell, ROWS * cell); c.clip();
      if (phase === 'dying') { const k = clamp(phaseT / 1.3, 0, 1); if (k > .05) drawPac(c, px(pac.x), py(pac.y), cell * .52 * Math.min(1, k * 1.6), ANG[pac.dir], .3 + (1 - k) * 2.8); }
      else wrapDraw(pac.x + pac.sx, X => drawPac(c, X, py(pac.y + pac.sy), cell * .52, ANG[pac.dir], (Math.sin(pac.mouth) * .5 + .5) * .6 + .06));
      if (phase !== 'dying' || phaseT > .9) ghosts.forEach(g => wrapDraw(g.x, X => drawGhost(c, g, X, py(g.y))));
      c.restore();
      pr.draw(c);
      for (const f of floats) { c.globalAlpha = clamp(f.t * 2, 0, 1); Draw.text(c, f.txt, clamp(px(f.x), 24, W - 24), py(f.y) - (1 - f.t) * cell * 1.6, Math.max(14, cell * .8), f.color); } c.globalAlpha = 1;
      drawHud(c);
      // durée de peur restante : une jauge fine sous le labyrinthe
      if (fright > 0 && phase === 'play') { const bw = COLS * cell * .5, bx = ox + COLS * cell * .25, by = Math.min(H - 5, oy + ROWS * cell + 1); c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(bx, by, bw, 3); c.fillStyle = fright < 2 ? '#fff' : '#5a7bff'; c.fillRect(bx, by, bw * clamp(fright / cfg.fright, 0, 1), 3); }
      if (banner && phase !== 'inter') { c.globalAlpha = clamp(banner.t * 3, 0, 1); pill(c, banner.txt, ox + COLS * cell / 2, py(penC[1] + 2), clamp(cell * .95, 15, 22), banner.color); c.globalAlpha = 1; }
      if (phase === 'inter' && inter) drawInter(c);
    }

    /* ---------- Démarrage ou reprise ---------- */
    if (saved && saved.level) {
      lives = clamp(saved.lives | 0, 1, MAX_LIVES); score = Math.max(0, saved.score | 0); nextLifeAt = (Math.floor(score / LIFE_EVERY) + 1) * LIFE_EVERY;
      loadLevel(clamp(saved.level | 0, 1, LAST)); say('On reprend au niveau ' + level + ' !', 1.6); phaseT = 1.6;
    } else { loadLevel(1); say('Niveau 1 : c\'est parti !', 1.6); phaseT = 1.6; }
    persist();

    return {
      update, draw, resize: fit,
      // de quoi piloter un test : état complet, et quelques leviers
      dbg: () => ({
        pac, ghosts, level, lives, score, pellets, total, phase, mode, fright, cfg, fruit, heart, inter, banner, nextLifeAt, cell, ox, oy, side,
        cols: COLS, rows: ROWS, get grid() { return grid.map(r => r.join('')); }, mazeName: M.name, last: LAST, maxLives: MAX_LIVES,
        steer(d) { if (DIRS[d]) pac.next = d; },
        setLevel(n) { loadLevel(clamp(n | 0, 1, LAST)); inter = null; },
        nextLevel() { if (phase === 'play' || phase === 'ready') { pellets = 0; phase = 'play'; levelDone(); } },
        skip() { phaseT = 0; freeze = 0; },
        setLives(n) { lives = clamp(n | 0, 1, MAX_LIVES); },
        addScore(n) { addScore(n); },
        spawnHeart() { heartDone = false; spawnHeart(); return heart; },
        scare() { fright = cfg.fright; ghosts.forEach(g => { if (g.state === 'out' && !g.eyes) g.frightened = true; }); }
      })
    };
  }
});
