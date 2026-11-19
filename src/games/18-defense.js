/* ===== Tour de Défense (dès 10 ans) — défends le château de la reine, royaume après royaume =====
   Une campagne de 5 cartes de plus en plus grandes. Sur chaque carte, des vagues d'ennemis suivent le chemin
   jusqu'au château : on pose des tours sur l'herbe pour les arrêter. Carte gagnée = la reine dit merci, on passe à la suivante.
   Toute la logique vit en « coordonnées de cases » (x, y) ; l'écran n'est qu'une projection (tournée d'un quart en portrait),
   ce qui permet de changer d'orientation en pleine partie et de simuler le jeu sans dessiner (tests d'équilibrage). */

// Les tours : 3 niveaux chacune. range en cases, rate = secondes entre deux tirs, air = touche les volants.
const TD_TOWERS = {
  arc: { n: 'Archer', cost: 50, air: true, lv: [{ range: 2.6, dmg: 10, rate: .6 }, { range: 2.9, dmg: 17, rate: .55 }, { range: 3.2, dmg: 28, rate: .48 }], d: 'Rapide, touche tout' },
  canon: { n: 'Canon', cost: 90, air: false, lv: [{ range: 2.3, dmg: 22, rate: 1.5, splash: 1 }, { range: 2.5, dmg: 38, rate: 1.4, splash: 1.1 }, { range: 2.7, dmg: 60, rate: 1.3, splash: 1.3 }], d: 'Explosion, pas les volants' },
  glace: { n: 'Glace', cost: 70, air: true, lv: [{ range: 2.1, dmg: 5, rate: .9, slow: .55, dur: 2, splash: .8 }, { range: 2.3, dmg: 9, rate: .85, slow: .45, dur: 2.5, splash: .9 }, { range: 2.5, dmg: 14, rate: .8, slow: .35, dur: 3, splash: 1 }], d: 'Ralentit les ennemis' },
  mage: { n: 'Mage', cost: 120, air: true, lv: [{ range: 2.7, dmg: 24, rate: 1.1, chain: 2 }, { range: 2.9, dmg: 38, rate: 1.05, chain: 3 }, { range: 3.1, dmg: 58, rate: 1, chain: 4 }], d: 'Éclair qui rebondit' }
};
const TD_ORDER = ['arc', 'canon', 'glace', 'mage'];
const tdUpCost = (k, lvl) => Math.round(TD_TOWERS[k].cost * (lvl === 1 ? .8 : 1.3) / 5) * 5; // prix pour passer du niveau lvl au suivant
// Les ennemis : hp de base (multipliés au fil des vagues), sp en cases/seconde, dmg = points de vie retirés au château.
const TD_FOES = {
  gob: { n: 'Gobelin', hp: 30, sp: 1.2, gold: 5, dmg: 1, r: .25, c: '#7ccf4a', c2: '#4f9a2c' },
  filou: { n: 'Filou', hp: 22, sp: 2.2, gold: 6, dmg: 1, r: .22, c: '#ffd23f', c2: '#d9a514' },
  ogre: { n: 'Blindé', hp: 130, sp: .8, gold: 14, dmg: 2, r: .32, c: '#ff6a55', c2: '#c6412f', armor: .6 },
  bat: { n: 'Chauve-souris', hp: 26, sp: 1.6, gold: 8, dmg: 1, r: .2, c: '#9b7bff', c2: '#6a4fd0', fly: true },
  cham: { n: 'Sorcier', hp: 70, sp: 1, gold: 12, dmg: 1, r: .26, c: '#35c9b4', c2: '#1f9484', heal: true },
  boss: { n: 'Chef', hp: 1, sp: .55, gold: 80, dmg: 5, r: .44, c: '#ff4f9a', c2: '#c4266b' }
};
/* Les cartes. wp = chemin en cases (entrée à gauche hors grille, dernier point = le château, qui occupe 3×3 cases).
   waves = liste de vagues, chacune une suite de groupes [ennemi, nombre, écart en secondes]. */
const TD_MAPS = [
  {
    n: 'La Prairie', cols: 11, rows: 7, gold: 170, boss: 170, wp: [[-1, 1], [3, 1], [3, 5], [6, 5], [6, 3], [9, 3]],
    th: { grass: '#6cc24a', dark: '#4ea636', light: '#8fdc62', path: '#e6c98c', edge: '#b98f52', peb: '#cba968', roof: '#e8452c', dens: .42, decor: [['tree', 4], ['bush', 3], ['rock', 1]], flowers: ['#ffffff', '#ffd23f', '#ff8fc7'] },
    water: [{ t: 'pond', x: .6, y: 3.9, rx: 1, ry: .7, kind: 'lily' }], merci: 'Merci ! Grâce à toi, la Prairie peut dormir tranquille.',
    waves: [[['gob', 6, 1.2]], [['gob', 9, 1]], [['gob', 8, .9], ['filou', 4, .8], ['boss', 1, 1]]]
  },
  {
    n: 'La Rivière', cols: 12, rows: 8, gold: 210, boss: 420, wp: [[-1, 6], [2, 6], [2, 1], [5, 1], [5, 6], [8, 6], [8, 3], [10, 3]],
    th: { grass: '#5fbf58', dark: '#43a046', light: '#86d977', path: '#e3c58a', edge: '#b08a50', peb: '#c7a565', roof: '#2f7fd6', dens: .4, decor: [['tree', 3], ['bush', 2], ['rock', 2], ['reed', 2]], flowers: ['#ffffff', '#ffe066', '#c9a7ff'] },
    water: [{ t: 'river', x: 7 }], merci: 'Bravo ! Le pont de la Rivière est sauvé, les pêcheurs applaudissent.',
    news: { k: 'bat', a: 'Nouveau : la chauve-souris', b: 'Elle vole tout droit. Le Canon ne peut pas la toucher.' },
    waves: [[['gob', 8, 1], ['filou', 5, .7]], [['gob', 8, .9], ['bat', 5, 1]], [['filou', 8, .6], ['gob', 8, .8], ['bat', 6, .9]], [['gob', 10, .7], ['bat', 7, .8], ['filou', 6, .6], ['boss', 1, 1]]]
  },
  {
    n: 'La Forêt', cols: 13, rows: 9, gold: 250, boss: 800, wp: [[-1, 4], [2, 4], [2, 1], [5, 1], [5, 7], [8, 7], [8, 2], [11, 2], [11, 5]],
    th: { grass: '#479e4b', dark: '#2f7f3a', light: '#63b85c', path: '#d4b47c', edge: '#8f6e3d', peb: '#b39258', roof: '#8a4fd6', dens: .5, decor: [['pine', 5], ['tree', 1], ['mush', 2], ['stump', 1], ['rock', 1]], flowers: ['#ffe066', '#ffffff'] },
    water: [{ t: 'pond', x: .5, y: 7.4, rx: 1, ry: .7, kind: 'lily' }], merci: 'Quel courage ! Toute la Forêt te dit merci.',
    news: { k: 'ogre', a: 'Nouveau : le Blindé', b: 'Les flèches lui font peu de mal. Sors le Canon ou le Mage !' },
    waves: [[['gob', 10, .8], ['ogre', 2, 2]], [['filou', 10, .55], ['ogre', 4, 1.6], ['bat', 6, .8]], [['gob', 12, .6], ['ogre', 5, 1.4], ['bat', 8, .7]], [['ogre', 6, 1.3], ['filou', 10, .5], ['bat', 8, .7], ['boss', 1, 1]]]
  },
  {
    n: 'La Montagne', cols: 14, rows: 9, gold: 290, boss: 1400, wp: [[-1, 7], [3, 7], [3, 4], [1, 4], [1, 1], [6, 1], [6, 6], [9, 6], [9, 1], [12, 1], [12, 6]],
    th: { grass: '#8fb596', dark: '#6f9a7b', light: '#e9f3f1', path: '#cfc7b8', edge: '#8f8778', peb: '#aaa292', roof: '#1f9484', dens: .5, snow: true, decor: [['rock', 4], ['pine', 4], ['bush', 1]], flowers: ['#ffffff', '#bfe6ff'] },
    water: [{ t: 'pond', x: 7.5, y: 8.25, rx: 1.1, ry: .6, kind: 'ice' }], merci: 'Incroyable ! La Montagne est libre, on fait sonner les cloches.',
    news: { k: 'cham', a: 'Nouveau : le Sorcier', b: 'Il soigne les ennemis autour de lui. Vise-le en premier !' },
    waves: [[['gob', 12, .7], ['cham', 2, 2], ['ogre', 3, 1.5]], [['bat', 10, .7], ['filou', 10, .5]], [['ogre', 7, 1.2], ['cham', 3, 1.5], ['gob', 12, .55]], [['filou', 14, .45], ['bat', 8, .7], ['ogre', 5, 1.2], ['cham', 3, 1.2]], [['ogre', 8, 1.1], ['cham', 4, 1.2], ['bat', 8, .7], ['boss', 1, 1]]]
  },
  {
    n: 'Le Château royal', cols: 15, rows: 10, gold: 330, boss: 2400, wp: [[-1, 1], [2, 1], [2, 8], [5, 8], [5, 2], [8, 2], [8, 8], [11, 8], [11, 5], [13, 5]],
    th: { grass: '#58b368', dark: '#3f9652', light: '#7fd08a', path: '#ddd5c6', edge: '#9a917f', peb: '#f3eee4', roof: '#d9a514', dens: .45, paved: true, decor: [['topiary', 4], ['bush', 3], ['tree', 1]], flowers: ['#ff6b8b', '#ffffff', '#ffd23f'] },
    water: [{ t: 'pond', x: 11.5, y: 2, rx: .85, ry: .85, kind: 'fountain' }], merci: 'Tu as sauvé tout le royaume ! Mille mercis, héros !',
    news: { k: 'boss', a: 'La grande bataille', b: 'Tous les ennemis attaquent le château royal. Tiens bon !' },
    waves: [[['gob', 12, .6], ['filou', 8, .5], ['ogre', 3, 1.4]], [['bat', 14, .5], ['cham', 4, 1.2], ['ogre', 6, 1.1]], [['filou', 16, .4], ['ogre', 8, 1], ['cham', 4, 1.1]], [['gob', 16, .45], ['bat', 14, .5], ['ogre', 8, 1], ['cham', 5, 1]], [['ogre', 10, .9], ['cham', 5, 1], ['bat', 12, .5], ['filou', 12, .4], ['boss', 1, 1]]]
  }
];
// Hasard reproductible : le décor d'une carte est toujours le même, quelle que soit la taille de l'écran.
function tdRng(a) { return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function tdDisc(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
function tdOval(c, x, y, rx, ry, col) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); }
function tdPoly(c, pts, col) { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }
function tdStar(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); c.fill(); }

/* ---------- Décor fixe (dessiné une fois dans l'image de fond) : (x, y) = centre de la case, s = taille d'une case ---------- */
function tdDecor(c, kind, x, y, s, v, th) {
  const snow = th.snow;
  if (kind !== 'mush' && kind !== 'reed') tdOval(c, x, y + .3 * s, .3 * s, .1 * s, 'rgba(0,0,0,.18)');
  if (kind === 'tree') {
    c.fillStyle = '#7a5230'; c.fillRect(x - .06 * s, y, .12 * s, .32 * s);
    const g1 = v < .5 ? '#2f8f3e' : '#3a9a34', g2 = v < .5 ? '#46b04f' : '#55b944';
    tdDisc(c, x - .16 * s, y - .06 * s, .22 * s, g1); tdDisc(c, x + .17 * s, y - .04 * s, .21 * s, g1); tdDisc(c, x, y - .24 * s, .27 * s, g1);
    tdDisc(c, x - .06 * s, y - .28 * s, .17 * s, g2); tdDisc(c, x + .12 * s, y - .1 * s, .1 * s, g2);
    if (v > .7) { tdDisc(c, x - .14 * s, y - .02 * s, .04 * s, '#ff5a4f'); tdDisc(c, x + .1 * s, y - .26 * s, .04 * s, '#ff5a4f'); tdDisc(c, x + .2 * s, y - .02 * s, .035 * s, '#ff5a4f'); }
  } else if (kind === 'pine') {
    c.fillStyle = '#6b4526'; c.fillRect(x - .05 * s, y + .12 * s, .1 * s, .2 * s);
    for (let i = 0; i < 3; i++) {
      const w = (.32 - i * .07) * s, by = y + (.2 - i * .24) * s, h = .36 * s;
      tdPoly(c, [x - w, by, x, by - h, x + w, by], i % 2 ? '#2c8a4a' : '#23763f'); tdPoly(c, [x - w * .1, by, x, by - h, x + w, by], 'rgba(0,0,0,.12)');
      if (snow) tdPoly(c, [x - w * .45, by - h * .55, x, by - h, x + w * .45, by - h * .55, x + w * .2, by - h * .45, x, by - h * .58, x - w * .2, by - h * .45], '#fff');
    }
  } else if (kind === 'rock') {
    const k = .8 + v * .4;
    tdPoly(c, [x - .28 * s * k, y + .3 * s, x - .22 * s * k, y - .02 * s, x - .04 * s, y - .2 * s * k, x + .2 * s * k, y - .08 * s, x + .3 * s * k, y + .3 * s], '#8a8fa3');
    tdPoly(c, [x - .22 * s * k, y - .02 * s, x - .04 * s, y - .2 * s * k, x + .2 * s * k, y - .08 * s, x + .02 * s, y + .05 * s], snow ? '#fff' : '#b3b8c9');
    tdPoly(c, [x + .02 * s, y + .05 * s, x + .2 * s * k, y - .08 * s, x + .3 * s * k, y + .3 * s, x + .08 * s, y + .3 * s], '#70748a');
  } else if (kind === 'bush') {
    const g = snow ? '#5d9b78' : '#3fa245';
    tdDisc(c, x - .15 * s, y + .14 * s, .16 * s, g); tdDisc(c, x + .15 * s, y + .15 * s, .15 * s, g); tdDisc(c, x, y + .04 * s, .2 * s, g); tdDisc(c, x - .04 * s, y, .11 * s, snow ? '#fff' : '#5fc25e');
    const fc = th.flowers[Math.floor(v * th.flowers.length) % th.flowers.length]; if (!snow) { tdDisc(c, x - .14 * s, y + .1 * s, .035 * s, fc); tdDisc(c, x + .1 * s, y + .02 * s, .035 * s, fc); tdDisc(c, x + .16 * s, y + .18 * s, .035 * s, fc); }
  } else if (kind === 'topiary') {
    c.fillStyle = '#b5673a'; c.fillRect(x - .11 * s, y + .16 * s, .22 * s, .16 * s); c.fillStyle = '#7a5230'; c.fillRect(x - .03 * s, y - .02 * s, .06 * s, .2 * s);
    tdDisc(c, x, y - .16 * s, .24 * s, '#2f9a4e'); tdDisc(c, x - .07 * s, y - .22 * s, .12 * s, '#4dbb69');
    if (v > .5) { tdDisc(c, x + .1 * s, y - .1 * s, .035 * s, '#ff6b8b'); tdDisc(c, x - .12 * s, y - .06 * s, .035 * s, '#ff6b8b'); tdDisc(c, x + .02 * s, y - .3 * s, .035 * s, '#ff6b8b'); }
  } else if (kind === 'mush') {
    for (const [dx, dy, k] of [[-.14, .12, 1], [.12, .2, .7], [.02, -.02, .55]]) { const mx = x + dx * s, my = y + dy * s; c.fillStyle = '#f3ead8'; c.fillRect(mx - .03 * s * k, my, .06 * s * k, .12 * s * k); c.fillStyle = '#e8452c'; c.beginPath(); c.arc(mx, my, .11 * s * k, Math.PI, 0); c.fill(); tdDisc(c, mx - .04 * s * k, my - .05 * s * k, .02 * s * k, '#fff'); tdDisc(c, mx + .04 * s * k, my - .04 * s * k, .018 * s * k, '#fff'); }
  } else if (kind === 'stump') {
    c.fillStyle = '#7a5230'; c.fillRect(x - .15 * s, y + .05 * s, .3 * s, .22 * s); tdOval(c, x, y + .27 * s, .15 * s, .05 * s, '#7a5230'); tdOval(c, x, y + .05 * s, .15 * s, .06 * s, '#d9b071'); c.strokeStyle = '#a57a40'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y + .05 * s, .08 * s, .03 * s, 0, 0, 7); c.stroke();
  } else if (kind === 'reed') {
    c.strokeStyle = '#3d8f3a'; c.lineWidth = Math.max(1.5, .035 * s);
    for (const dx of [-.14, -.02, .1, .2]) { c.beginPath(); c.moveTo(x + dx * s, y + .3 * s); c.lineTo(x + (dx + .04) * s, y - (.1 + (dx + .2) * .5) * s); c.stroke(); tdOval(c, x + (dx + .04) * s, y - (.14 + (dx + .2) * .5) * s, .03 * s, .08 * s, '#7a4a22'); }
  }
}

/* ---------- Personnages du château ---------- */
// La reine : (x, y) = ses pieds, h = hauteur. mood : '' (elle salue), 'cheer' (elle saute, bras levés), 'scared'.
function tdQueen(c, x, y, h, t, mood) {
  if (mood === 'cheer') y -= Math.abs(Math.sin(t * 7)) * h * .1;
  if (mood === 'scared') x += Math.sin(t * 40) * h * .015;
  tdPoly(c, [x - h * .27, y, x - h * .1, y - h * .52, x + h * .1, y - h * .52, x + h * .27, y], '#e0489a');
  tdPoly(c, [x - h * .27, y, x - h * .245, y - h * .08, x + h * .245, y - h * .08, x + h * .27, y], '#ffd23f');
  tdPoly(c, [x - h * .05, y - h * .08, x, y - h * .5, x + h * .05, y - h * .08], '#f27fbb');
  c.strokeStyle = '#f6cfa6'; c.lineWidth = Math.max(1.5, h * .07); c.lineCap = 'round';
  const aR = mood === 'cheer' ? -1.15 + Math.sin(t * 12) * .25 : mood === 'scared' ? -1.3 : -.75 + Math.sin(t * 5) * .4, aL = mood === 'cheer' ? Math.PI + 1.15 - Math.sin(t * 12) * .25 : mood === 'scared' ? Math.PI + 1.3 : Math.PI - .9;
  c.beginPath(); c.moveTo(x + h * .09, y - h * .47); c.lineTo(x + h * .09 + Math.cos(aR) * h * .25, y - h * .47 + Math.sin(aR) * h * .25); c.moveTo(x - h * .09, y - h * .47); c.lineTo(x - h * .09 + Math.cos(aL) * h * .25, y - h * .47 + Math.sin(aL) * h * .25 * (mood ? 1 : -1)); c.stroke(); c.lineCap = 'butt';
  tdOval(c, x, y - h * .6, h * .19, h * .2, '#f2b233'); tdDisc(c, x, y - h * .63, h * .14, '#f6cfa6');
  tdDisc(c, x - h * .05, y - h * .64, h * .02, '#1b1540'); tdDisc(c, x + h * .05, y - h * .64, h * .02, '#1b1540');
  if (mood === 'scared') tdDisc(c, x, y - h * .56, h * .03, '#a33'); else { c.strokeStyle = '#a33'; c.lineWidth = Math.max(1, h * .02); c.beginPath(); c.arc(x, y - h * .6, h * .06, .3, Math.PI - .3); c.stroke(); }
  tdPoly(c, [x - h * .13, y - h * .74, x - h * .15, y - h * .92, x - h * .07, y - h * .83, x, y - h * .95, x + h * .07, y - h * .83, x + h * .15, y - h * .92, x + h * .13, y - h * .74], '#ffd23f'); tdDisc(c, x, y - h * .8, h * .025, '#e8452c');
}
// Un villageois : cheer = entre 0 et 1 (il saute et lève les bras).
function tdVillager(c, x, y, h, col, t, cheer, v) {
  const j = cheer ? Math.abs(Math.sin(t * 8 + v * 6)) * h * .28 * cheer : 0; tdOval(c, x, y, h * .22, h * .06, 'rgba(0,0,0,.2)'); y -= j;
  c.fillStyle = '#4a3a2a'; c.fillRect(x - h * .12, y - h * .16, h * .09, h * .16); c.fillRect(x + h * .03, y - h * .16, h * .09, h * .16);
  c.fillStyle = col; Draw.rr(c, x - h * .18, y - h * .58, h * .36, h * .46, h * .1); c.fill();
  c.strokeStyle = col; c.lineWidth = Math.max(1.5, h * .09); c.lineCap = 'round'; const up = cheer ? -1 : 1, w = cheer ? Math.sin(t * 16 + v * 9) * h * .05 : 0;
  c.beginPath(); c.moveTo(x - h * .16, y - h * .5); c.lineTo(x - h * .3 + w, y - h * .5 + up * h * .2); c.moveTo(x + h * .16, y - h * .5); c.lineTo(x + h * .3 - w, y - h * .5 + up * h * .2); c.stroke(); c.lineCap = 'butt';
  tdDisc(c, x, y - h * .74, h * .17, '#f6cfa6'); c.fillStyle = v > .5 ? '#7a4a22' : '#3a2a1a'; c.beginPath(); c.arc(x, y - h * .77, h * .18, Math.PI, 0); c.fill();
  tdDisc(c, x - h * .06, y - h * .73, h * .025, '#1b1540'); tdDisc(c, x + h * .06, y - h * .73, h * .025, '#1b1540');
}
/* Le château : (x, y) = centre de ses 3×3 cases, frac = vie restante (0..1). Il se fissure puis perd des pierres quand il est touché. */
function tdCastle(c, x, y, s, frac, t, roof, big) {
  const st = '#d3d6e2', st2 = '#b4b8c9', st3 = '#8f93a8', dk = '#4d4f66';
  tdOval(c, x, y + .97 * s, 1.5 * s, .2 * s, 'rgba(0,0,0,.22)');
  // donjon, à l'arrière : c'est là-haut que se tient la reine
  c.fillStyle = st2; c.fillRect(x - .5 * s, y - 1.18 * s, s, 1.1 * s); c.fillStyle = st3; c.fillRect(x + .2 * s, y - 1.18 * s, .3 * s, 1.1 * s);
  c.fillStyle = st2; for (let i = 0; i < 4; i++) c.fillRect(x - .5 * s + i * .283 * s, y - 1.32 * s, .15 * s, .15 * s);
  c.fillStyle = dk; Draw.rr(c, x - .1 * s, y - .85 * s, .2 * s, .32 * s, .09 * s); c.fill();
  if (big) { c.fillStyle = roof; c.fillRect(x - .5 * s, y - .98 * s, s, .06 * s); }
  // tours d'angle, toits pointus et drapeaux
  for (const k of [-1, 1]) {
    const tx = x + k * 1.02 * s;
    c.fillStyle = st2; c.fillRect(tx - .32 * s, y - .8 * s, .64 * s, 1.78 * s); c.fillStyle = st3; c.fillRect(tx + .1 * s, y - .8 * s, .22 * s, 1.78 * s);
    c.fillStyle = st; c.fillRect(tx - .38 * s, y - .9 * s, .76 * s, .16 * s);
    c.fillStyle = dk; Draw.rr(c, tx - .07 * s, y - .5 * s, .14 * s, .3 * s, .06 * s); c.fill(); c.fillRect(tx - .05 * s, y + .2 * s, .1 * s, .22 * s);
    tdPoly(c, [tx - .42 * s, y - .9 * s, tx, y - 1.6 * s, tx + .42 * s, y - .9 * s], roof); tdPoly(c, [tx + .05 * s, y - .9 * s, tx, y - 1.6 * s, tx + .42 * s, y - .9 * s], 'rgba(0,0,0,.18)');
    c.strokeStyle = '#5a4630'; c.lineWidth = Math.max(1.5, .04 * s); c.beginPath(); c.moveTo(tx, y - 1.58 * s); c.lineTo(tx, y - 1.98 * s); c.stroke();
    const w = Math.sin(t * 5 + k) * .05 * s; tdPoly(c, [tx, y - 1.98 * s, tx + .3 * s, y - 1.9 * s + w, tx, y - 1.78 * s], k < 0 ? '#ffd23f' : '#ff4f9a');
  }
  // muraille crénelée et grande porte
  c.fillStyle = st; c.fillRect(x - .72 * s, y - .18 * s, 1.44 * s, 1.16 * s); c.fillStyle = st; for (let i = 0; i < 5; i++) c.fillRect(x - .72 * s + i * .32 * s, y - .32 * s, .17 * s, .16 * s);
  c.fillStyle = 'rgba(0,0,0,.07)'; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) c.fillRect(x - .68 * s + i * .36 * s + (j % 2) * .17 * s, y - .08 * s + j * .27 * s, .2 * s, .05 * s);
  c.fillStyle = dk; c.beginPath(); c.moveTo(x - .34 * s, y + .98 * s); c.lineTo(x - .34 * s, y + .46 * s); c.arc(x, y + .46 * s, .34 * s, Math.PI, 0); c.lineTo(x + .34 * s, y + .98 * s); c.fill();
  c.fillStyle = '#8a5a2b'; c.beginPath(); c.moveTo(x - .27 * s, y + .98 * s); c.lineTo(x - .27 * s, y + .46 * s); c.arc(x, y + .46 * s, .27 * s, Math.PI, 0); c.lineTo(x + .27 * s, y + .98 * s); c.fill();
  c.strokeStyle = '#5a3a18'; c.lineWidth = Math.max(1, .03 * s); c.beginPath(); for (const dx of [-.13, 0, .13]) { c.moveTo(x + dx * s, y + .24 * s); c.lineTo(x + dx * s, y + .98 * s); } c.stroke(); tdDisc(c, x + .07 * s, y + .66 * s, .035 * s, '#ffd23f');
  if (big) { tdPoly(c, [x - .16 * s, y - .02 * s, x + .16 * s, y - .02 * s, x + .16 * s, y + .12 * s, x, y + .2 * s, x - .16 * s, y + .12 * s], roof); tdStar(c, x, y + .07 * s, .07 * s, '#fff'); }
  // dégâts : fissures, pierres manquantes, traces de suie
  if (frac < .75) { c.strokeStyle = '#3a3c52'; c.lineWidth = Math.max(1.5, .035 * s); c.beginPath(); c.moveTo(x - .55 * s, y - .18 * s); c.lineTo(x - .46 * s, y + .08 * s); c.lineTo(x - .58 * s, y + .26 * s); c.lineTo(x - .5 * s, y + .5 * s); c.moveTo(x + 1.08 * s, y - .74 * s); c.lineTo(x + .98 * s, y - .5 * s); c.lineTo(x + 1.1 * s, y - .28 * s); c.stroke(); }
  if (frac < .45) { c.beginPath(); c.moveTo(x + .5 * s, y - .18 * s); c.lineTo(x + .42 * s, y + .12 * s); c.lineTo(x + .56 * s, y + .3 * s); c.moveTo(x - .92 * s, y + .1 * s); c.lineTo(x - 1.06 * s, y + .36 * s); c.lineTo(x - .96 * s, y + .6 * s); c.moveTo(x - .2 * s, y - 1.18 * s); c.lineTo(x - .1 * s, y - .98 * s); c.stroke(); tdOval(c, x + .1 * s, y - .28 * s, .16 * s, .1 * s, 'rgba(30,30,40,.35)'); tdOval(c, x - 1.02 * s, y - .86 * s, .2 * s, .08 * s, 'rgba(30,30,40,.3)'); }
}

/* ---------- Les tours : (x, y) = centre de la case, ang = direction de la cible à l'écran, kick = recul juste après un tir (1 → 0) ---------- */
function tdTower(c, k, lvl, x, y, s, ang, kick, t, icon) {
  tdOval(c, x, y + .34 * s, .36 * s, .12 * s, 'rgba(0,0,0,.22)');
  if (k === 'arc') { // tour de guet : en bois, puis en pierre, puis avec drapeau ; l'archer vise avec son arc
    const top = y - (.14 + lvl * .09) * s, wood = lvl === 1, body = wood ? '#bd8644' : '#c9ccd8', dark = wood ? '#8f5f2a' : '#9a9db0';
    tdPoly(c, [x - .3 * s, y + .36 * s, x - .22 * s, top, x + .22 * s, top, x + .3 * s, y + .36 * s], body); tdPoly(c, [x + .1 * s, y + .36 * s, x + .07 * s, top, x + .22 * s, top, x + .3 * s, y + .36 * s], dark);
    if (wood) { c.strokeStyle = dark; c.lineWidth = 1; c.beginPath(); for (let i = 1; i < 4; i++) { const yy = top + (y + .36 * s - top) * i / 4; c.moveTo(x - .26 * s, yy); c.lineTo(x + .1 * s, yy); } c.stroke(); }
    c.fillStyle = '#4a3218'; Draw.rr(c, x - .07 * s, y + .16 * s, .14 * s, .2 * s, .05 * s); c.fill();
    c.fillStyle = wood ? '#d7a05a' : '#e1e3ec'; c.fillRect(x - .31 * s, top - .1 * s, .62 * s, .13 * s); for (let i = 0; i < 3; i++) c.fillRect(x - .31 * s + i * .235 * s, top - .2 * s, .15 * s, .11 * s);
    if (lvl >= 2) { c.fillStyle = '#ffd23f'; c.fillRect(x - .31 * s, top + .03 * s, .62 * s, .04 * s); }
    if (lvl === 3) { c.strokeStyle = '#5a4630'; c.lineWidth = Math.max(1.5, .035 * s); c.beginPath(); c.moveTo(x - .25 * s, top - .2 * s); c.lineTo(x - .25 * s, top - .62 * s); c.stroke(); tdPoly(c, [x - .25 * s, top - .62 * s, x - .02 * s, top - .54 * s + Math.sin(t * 6) * .02 * s, x - .25 * s, top - .46 * s], '#e8452c'); }
    const hx = x + .03 * s, hy = top - .26 * s; tdDisc(c, hx, hy, .125 * s, lvl === 3 ? '#c0392b' : lvl === 2 ? '#2f7fd6' : '#2e8b57'); tdDisc(c, hx + Math.cos(ang) * .035 * s, hy + .02 * s + Math.sin(ang) * .02 * s, .08 * s, '#f6cfa6');
    c.save(); c.translate(hx, hy); c.rotate(ang); c.strokeStyle = '#6e4a22'; c.lineWidth = Math.max(1.5, .045 * s); c.beginPath(); c.arc(.06 * s, 0, .19 * s, -1.15, 1.15); c.stroke();
    const bx = .06 * s + Math.cos(1.15) * .19 * s, by = Math.sin(1.15) * .19 * s, pull = (1 - kick) * .1 * s; c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.moveTo(bx, -by); c.lineTo(bx - pull, 0); c.lineTo(bx, by); c.stroke();
    if (kick < .5) { c.strokeStyle = '#3a2a1a'; c.lineWidth = Math.max(1, .025 * s); c.beginPath(); c.moveTo(bx - pull, 0); c.lineTo(.32 * s, 0); c.stroke(); }
    c.restore();
  } else if (k === 'canon') { // affût carré, tourelle ronde et fût qui pivote ; deux fûts au niveau 3
    const w = (.29 + lvl * .02) * s, wood = lvl === 1;
    c.fillStyle = wood ? '#a87540' : '#9da1b5'; Draw.rr(c, x - w, y - .04 * s, 2 * w, .4 * s, .08 * s); c.fill(); c.fillStyle = wood ? '#7f5226' : '#73778d'; c.fillRect(x - w, y + .2 * s, 2 * w, .07 * s);
    tdDisc(c, x - w * .7, y + .08 * s, .03 * s, '#3b3f52'); tdDisc(c, x + w * .7, y + .08 * s, .03 * s, '#3b3f52');
    const cy = y - .12 * s, R = (.2 + lvl * .02) * s; tdDisc(c, x, cy + .03 * s, R, '#353a4d'); tdDisc(c, x, cy, R, '#565c75');
    c.save(); c.translate(x, cy); c.rotate(ang); const len = (.36 + lvl * .05) * s, bw = (.12 + lvl * .012) * s, off = -kick * .1 * s;
    const bar = dy => { c.fillStyle = '#262a3a'; Draw.rr(c, off - .06 * s, dy - bw / 2, len, bw, bw * .3); c.fill(); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(off, dy - bw / 2 + 1, len - .1 * s, bw * .25); c.fillStyle = lvl >= 2 ? '#ffd23f' : '#7b8099'; c.fillRect(off + len - .13 * s, dy - bw / 2 - 1, .06 * s, bw + 2); };
    if (lvl === 3) { bar(-bw * .58); bar(bw * .58); } else bar(0); c.restore();
    tdDisc(c, x, cy, .1 * s, lvl === 3 ? '#e8452c' : lvl === 2 ? '#ffd23f' : '#7b8099'); tdDisc(c, x - .03 * s, cy - .03 * s, .03 * s, 'rgba(255,255,255,.5)');
  } else if (k === 'glace') { // un grand cristal sur un socle, puis de plus en plus de cristaux
    c.fillStyle = '#b9c4e0'; Draw.rr(c, x - .3 * s, y + .12 * s, .6 * s, .25 * s, .07 * s); c.fill(); c.fillStyle = '#8f9cc0'; c.fillRect(x - .3 * s, y + .27 * s, .6 * s, .05 * s);
    const cr = (cx, by, w, h) => { tdPoly(c, [cx, by - h, cx + w, by - h * .35, cx + w * .6, by, cx - w * .6, by, cx - w, by - h * .35], '#5ad1ff'); tdPoly(c, [cx, by - h, cx - w, by - h * .35, cx - w * .6, by, cx - w * .1, by, cx - w * .15, by - h * .32], '#c9f1ff'); tdPoly(c, [cx + w, by - h * .35, cx + w * .6, by, cx + w * .15, by, cx + w * .25, by - h * .32], '#2f9fe0'); };
    const p = 1 + kick * .14; if (lvl >= 2) cr(x - .19 * s, y + .2 * s, .08 * s, (.24 + lvl * .05) * s); if (lvl >= 2) cr(x + .2 * s, y + .2 * s, .08 * s, (.2 + lvl * .05) * s);
    cr(x, y + .2 * s, (.13 + lvl * .015) * s * p, (.52 + lvl * .1) * s * p);
    if (lvl === 3) { const top = y + .2 * s - .82 * s * p; for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.09; tdDisc(c, x + Math.cos(a) * .22 * s, top + .22 * s + Math.sin(a) * .07 * s, .03 * s, '#fff'); } tdStar(c, x, top - .06 * s, .08 * s, '#fff'); }
  } else { // tour du mage : toit pointu étoilé et boule d'énergie qui flotte au-dessus
    const top = y - (.12 + lvl * .08) * s;
    tdPoly(c, [x - .25 * s, y + .36 * s, x - .18 * s, top, x + .18 * s, top, x + .25 * s, y + .36 * s], '#8a67e0'); tdPoly(c, [x + .08 * s, y + .36 * s, x + .06 * s, top, x + .18 * s, top, x + .25 * s, y + .36 * s], '#6447b8');
    c.fillStyle = '#ffe66d'; Draw.rr(c, x - .06 * s, top + .12 * s, .12 * s, .17 * s, .05 * s); c.fill(); c.fillStyle = '#3b2a8c'; Draw.rr(c, x - .06 * s, y + .2 * s, .12 * s, .16 * s, .05 * s); c.fill();
    if (lvl >= 2) { c.fillStyle = '#ffd23f'; c.fillRect(x - .2 * s, top + .02 * s, .4 * s, .04 * s); }
    tdPoly(c, [x - .29 * s, top + .02 * s, x, top - .4 * s, x + .29 * s, top + .02 * s], '#3b2a8c'); tdPoly(c, [x + .04 * s, top + .02 * s, x, top - .4 * s, x + .29 * s, top + .02 * s], '#2c1f6e'); tdStar(c, x - .07 * s, top - .1 * s, .05 * s, '#ffd23f');
    const oy = top - .56 * s + Math.sin(t * 3 + x) * .03 * s, r = (.075 + lvl * .015) * s * (1 + kick * .5); tdDisc(c, x, oy, r * 2, 'rgba(255,230,110,.28)'); tdDisc(c, x, oy, r, '#ffe66d'); tdDisc(c, x - r * .3, oy - r * .3, r * .35, '#fff');
    if (lvl === 3) for (let i = 0; i < 2; i++) { const a = t * 3 + i * Math.PI; tdDisc(c, x + Math.cos(a) * .2 * s, oy + Math.sin(a) * .07 * s, .035 * s, '#c9a7ff'); }
  }
  if (!icon) for (let i = 0; i < lvl; i++) { const sx = x + (i - (lvl - 1) / 2) * .22 * s; tdStar(c, sx, y + .43 * s, .125 * s, '#1b1540'); tdStar(c, sx, y + .43 * s, .085 * s, '#ffd23f'); }
}
const tdMageTop = (lvl, y, s) => y - (.12 + lvl * .08) * s - .56 * s; // hauteur de la boule du mage, d'où partent les éclairs

/* ---------- Les ennemis : une boule à gros yeux qui trottine, avec ses accessoires. f = { k, ph (phase de marche), hit, slow, hp, max } ---------- */
function tdFoe(c, f, x, y, s, face) {
  const F = TD_FOES[f.k], r = F.r * s, k = f.k, step = Math.sin(f.ph), fly = !!F.fly, body = f.hit > 0 ? '#ffffff' : F.c;
  tdOval(c, x, y + r * .95, r * (fly ? .6 : .9), r * .24, 'rgba(0,0,0,.2)');
  const by = y - Math.abs(step) * r * .2 - (fly ? r * 1.7 + Math.sin(f.ph * .4) * r * .2 : 0), sq = 1 + Math.abs(step) * .07;
  if (!fly) { tdOval(c, x - r * .42, y + r * .86 - Math.max(0, step) * r * .3, r * .3, r * .17, F.c2); tdOval(c, x + r * .42, y + r * .86 - Math.max(0, -step) * r * .3, r * .3, r * .17, F.c2); }
  if (k === 'bat') { const fl = Math.sin(f.ph * 1.6); for (const d of [-1, 1]) tdPoly(c, [x + d * r * .5, by - r * .2, x + d * r * 2.1, by - r * (.5 + fl * .9), x + d * r * 1.75, by + r * .1 - fl * r * .3, x + d * r * 1.3, by - r * .1, x + d * r * 1.1, by + r * .45, x + d * r * .5, by + r * .3], F.c2); tdPoly(c, [x - r * .7, by - r * .5, x - r * .5, by - r * 1.4, x - r * .1, by - r * .8], F.c); tdPoly(c, [x + r * .7, by - r * .5, x + r * .5, by - r * 1.4, x + r * .1, by - r * .8], F.c); }
  if (k === 'gob') for (const d of [-1, 1]) tdPoly(c, [x + d * r * .7, by - r * .5, x + d * r * 1.55, by - r * .75, x + d * r * .9, by + r * .1], F.c2);
  if (k === 'filou') { tdPoly(c, [x - r * .7, by - r * .5, x - r * .55, by - r * 1.5, x - r * .05, by - r * .85], F.c2); tdPoly(c, [x + r * .7, by - r * .5, x + r * .55, by - r * 1.5, x + r * .05, by - r * .85], F.c2); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = Math.max(1, r * .1); c.beginPath(); for (const dy of [-.3, .2]) { c.moveTo(x - face * r * 1.3, by + dy * r); c.lineTo(x - face * r * 1.9, by + dy * r); } c.stroke(); }
  if (k === 'boss') for (const d of [-1, 1]) tdPoly(c, [x + d * r * .45, by - r * .75, x + d * r * 1.05, by - r * 1.5, x + d * r * .95, by - r * .45], '#fff3d6');
  if (k === 'cham') { c.strokeStyle = '#7a5230'; c.lineWidth = Math.max(1.5, r * .14); c.beginPath(); c.moveTo(x + face * r * 1.15, by + r * .9); c.lineTo(x + face * r * 1.15, by - r * 1.1); c.stroke(); tdDisc(c, x + face * r * 1.15, by - r * 1.25, r * .3, '#9dff5c'); tdDisc(c, x + face * r * 1.08, by - r * 1.32, r * .1, '#fff'); }
  tdOval(c, x, by, r * sq, r * .93 / sq, body); tdOval(c, x - r * .25, by - r * .4, r * .4, r * .22, 'rgba(255,255,255,.22)');
  const ex = face * r * .16; for (const d of [-1, 1]) { tdDisc(c, x + ex + d * r * .32, by - r * .12, r * .25, '#fff'); tdDisc(c, x + ex + d * r * .32 + face * r * .08, by - r * .1, r * .12, '#1b1540'); }
  if (k === 'ogre' || k === 'boss') { c.strokeStyle = '#1b1540'; c.lineWidth = Math.max(1.5, r * .12); c.beginPath(); c.moveTo(x + ex - r * .6, by - r * .5); c.lineTo(x + ex - r * .12, by - r * .3); c.moveTo(x + ex + r * .6, by - r * .5); c.lineTo(x + ex + r * .12, by - r * .3); c.stroke(); }
  if (k === 'gob' || k === 'boss' || k === 'bat') { tdPoly(c, [x + ex - r * .22, by + r * .32, x + ex - r * .1, by + r * .6, x + ex + .02 * r, by + r * .32], '#fff'); if (k !== 'gob') tdPoly(c, [x + ex + r * .22, by + r * .32, x + ex + r * .1, by + r * .6, x + ex - .02 * r, by + r * .32], '#fff'); }
  if (k === 'ogre') { c.fillStyle = '#9aa0b8'; c.beginPath(); c.arc(x, by - r * .32, r * .88, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); c.fill(); c.fillStyle = '#6f7590'; c.fillRect(x - r * .9, by - r * .52, r * 1.8, r * .16); tdPoly(c, [x - r * .12, by - r * 1.1, x, by - r * 1.55, x + r * .12, by - r * 1.1], '#c9cde0'); c.fillStyle = '#7b8099'; Draw.rr(c, x + face * r * .65 - r * .3, by, r * .6, r * .75, r * .2); c.fill(); tdDisc(c, x + face * r * .65, by + r * .36, r * .12, '#ffd23f'); }
  if (k === 'cham') { tdPoly(c, [x - r * .8, by - r * .6, x + r * .1, by - r * 1.9, x + r * .8, by - r * .6], '#6a4fd0'); c.fillStyle = '#4b3fa3'; c.fillRect(x - r * .95, by - r * .72, r * 1.9, r * .2); tdStar(c, x + r * .05, by - r * 1.1, r * .2, '#ffd23f'); }
  if (k === 'boss') { tdPoly(c, [x - r * .4, by - r * .82, x - r * .45, by - r * 1.35, x - r * .2, by - r * 1.08, x, by - r * 1.42, x + r * .2, by - r * 1.08, x + r * .45, by - r * 1.35, x + r * .4, by - r * .82], '#ffd23f'); }
  if (f.slow > 0) { tdOval(c, x, by, r * sq, r * .93 / sq, 'rgba(120,215,255,.5)'); tdPoly(c, [x - r * .9, y + r, x - r * .6, y + r * .4, x - r * .3, y + r], '#c9f1ff'); tdPoly(c, [x + r * .2, y + r, x + r * .55, y + r * .5, x + r * .85, y + r], '#c9f1ff'); }
  if (!f.icon && (f.hp < f.max || k === 'boss')) { const w = Math.max(r * 2, s * .5), h = Math.max(4, s * .09), bx = x - w / 2, yy = by - r * (k === 'cham' ? 2.1 : k === 'boss' || k === 'ogre' ? 1.75 : 1.5) - h, fr = clamp(f.hp / f.max, 0, 1); c.fillStyle = '#1b1540'; Draw.rr(c, bx - 1.5, yy - 1.5, w + 3, h + 3, 3); c.fill(); c.fillStyle = fr > .5 ? '#7be04a' : fr > .25 ? '#ffd23f' : '#ff5a4f'; Draw.rr(c, bx, yy, Math.max(h, w * fr), h, 2); c.fill(); }
}

// Après une défaite, on propose de repartir de la carte perdue (score remis à zéro) plutôt que de tout refaire. Gardé en mémoire vive seulement.
let TD_CHECK = null;
GAMES.push({
  id: 'defense', title: 'Tour de Défense', tagline: 'Défends le château de la reine', minAge: 10, color: '#3fbf4f',
  icon: '<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="8" fill="#5fbf4a"/><path d="M4 22h18v22h16" stroke="#e6c98c" stroke-width="9" fill="none"/><rect x="36" y="26" width="22" height="26" fill="#d3d6e2"/><path d="M36 26v-6h5v4h4v-4h4v4h4v-4h5v6z" fill="#d3d6e2"/><path d="M43 52V42a4 4 0 0 1 8 0v10z" fill="#8a5a2b"/><path d="M47 18V6l9 4-9 4" fill="#ff4f9a" stroke="#5a4630" stroke-width="1.5"/><circle cx="14" cy="22" r="6" fill="#9b7bff"/><circle cx="12" cy="21" r="1.6" fill="#fff"/><circle cx="16" cy="21" r="1.6" fill="#fff"/></svg>',
  howto: ['', 'Les ennemis suivent le chemin jusqu\'au château de la reine. Choisis une tour, tape une case d\'herbe pour la poser, puis lance la vague. Tape une tour pour l\'améliorer ou la vendre. 5 royaumes à sauver !', 'Sauve les 5 royaumes : place tes tours aux virages, améliore-les, mélange les types (le Canon ne touche pas les volants, les flèches rebondissent sur les Blindés) et garde la pluie de flèches de la reine pour les coups durs.'],
  pad: null,
  stars: s => s >= 15000 ? 3 : s >= 6000 ? 2 : s >= 1000 ? 1 : 0, // 1 étoile : première carte finie · 2 : trois cartes · 3 : cinquième carte bien entamée
  create(env, saved) {
    const { input } = env, hard = env.tier >= 2, pr = Particles(), NM = TD_MAPS.length;
    const sfx = {}; for (const k in env.sfx) sfx[k] = () => { if (!quiet) env.sfx[k](); }; // muet pendant les simulations accélérées
    const FONT = getComputedStyle(document.body).getPropertyValue('--font-display') || 'sans-serif';
    const txt = (c, s, x, y, size, col, align = 'center', w = 900) => { c.font = w + ' ' + size + 'px ' + FONT; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, x, y); };
    // Réglages de difficulté : les 13 ans et plus ont un château moins solide, des ennemis plus résistants et un peu moins d'or.
    const HPMAX = hard ? 15 : 20, HPMAP = hard ? .68 : .6, HPWAVE = hard ? .25 : .22, GOLDK = hard ? .95 : 1, POWER_CD = 45, SELL = .7;
    const VIL = ['#ff9f1c', '#38e0d6', '#9b7bff', '#ffd23f', '#ff6a55', '#5ad1ff'];
    let mapI = 0, M = null, cols = 0, rows = 0, END = null, pathSet, waterSet, obstSet, castleSet, obst = [], gRoute, aRoute, gBase = 0;
    let towers = [], foes = [], shots = [], fx = [], queue = [], gold = 0, hp = HPMAX, wave = 0, inWave = false, waveT = 0, countdown = 0;
    let score = 0, kills = 0, mapKills = 0, phase = 'play', phT = 0, over = false, t = 0, speed = 1, sel = 'arc', selTower = null, power = 0, rain = 0;
    let msg = null, shake = 0, mood = '', moodT = 0, bubble = '', bubbleT = 0, cheer = 0, quiet = false, confetti = [], recap = null, tuto = false;
    let cell = 30, ox = 0, oy = 0, tr = false, L = null, bg = null, bgKey = '', btns = [];

    /* ----- Géométrie : cases → pixels (en portrait la grille est tournée : la colonne devient la ligne) ----- */
    const X = (x, y) => ox + ((tr ? y : x) + .5) * cell, Y = (x, y) => oy + ((tr ? x : y) + .5) * cell;
    const key = (x, y) => x + ',' + y;
    function mkRoute(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, cum, total: cum[cum.length - 1] }; }
    function routeAt(r, d) { d = clamp(d, 0, r.total); let i = 1; while (i < r.pts.length - 1 && r.cum[i] < d) i++; const a = r.pts[i - 1], b = r.pts[i], len = r.cum[i] - r.cum[i - 1] || 1, u = (d - r.cum[i - 1]) / len; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, (b[0] - a[0]) / len, (b[1] - a[1]) / len]; }
    const inWater = (x, y) => M.water.some(w => w.t === 'river' ? x === w.x : ((x - w.x) / (w.rx + .2)) ** 2 + ((y - w.y) / (w.ry + .2)) ** 2 < 1);
    const towerAt = (x, y) => towers.find(w => w.x === x && w.y === y);
    const canBuild = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && !pathSet.has(key(x, y)) && !castleSet.has(key(x, y)) && !waterSet.has(key(x, y)) && !obstSet.has(key(x, y)) && !towerAt(x, y);

    function setupMap(i, startGold) {
      mapI = i; M = TD_MAPS[i]; cols = M.cols; rows = M.rows; const WP = M.wp; END = WP[WP.length - 1]; gBase = 0; for (let j = 0; j < i; j++) gBase += TD_MAPS[j].waves.length;
      pathSet = new Set(); for (let j = 0; j < WP.length - 1; j++) { const [x0, y0] = WP[j], [x1, y1] = WP[j + 1], dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0); let x = x0, y = y0; for (;;) { pathSet.add(key(x, y)); if (x === x1 && y === y1) break; x += dx; y += dy; } }
      castleSet = new Set(); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) castleSet.add(key(END[0] + dx, END[1] + dy));
      waterSet = new Set(); for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (inWater(x, y) && !pathSet.has(key(x, y)) && !castleSet.has(key(x, y))) waterSet.add(key(x, y));
      // Arbres et rochers : seulement sur les cases éloignées du chemin, pour laisser libres les bons emplacements de tours.
      const R = tdRng(1000 + i * 77), tot = M.th.decor.reduce((a, d) => a + d[1], 0); obst = []; obstSet = new Set();
      const nearPath = (x, y) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (pathSet.has(key(x + dx, y + dy)) || castleSet.has(key(x + dx, y + dy))) return true; return false; };
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const a = R(), b = R(), v = R(); if (pathSet.has(key(x, y)) || castleSet.has(key(x, y)) || waterSet.has(key(x, y)) || nearPath(x, y) || a > M.th.dens) continue; let q = b * tot, kind = M.th.decor[0][0]; for (const d of M.th.decor) { if (q < d[1]) { kind = d[0]; break; } q -= d[1]; } obst.push({ x, y, kind, v }); obstSet.add(key(x, y)); }
      gRoute = mkRoute([[-2.5, WP[0][1]]].concat(WP.slice(1))); aRoute = mkRoute([[-2.5, WP[0][1]], END]); // les volants coupent tout droit
      towers = []; foes = []; shots = []; fx = []; queue = []; wave = 0; inWave = false; hp = HPMAX; gold = startGold; countdown = 45; selTower = null; mapKills = 0; power = 0; rain = 0; shake = 0; phase = 'play'; phT = 0; bgKey = ''; confetti = [];
      tuto = i === 0; msg = null; if (M.news) banner(M.news.a, M.news.b, 7, M.news.k); else banner(M.n, 'Pose tes tours, puis lance la vague', 4);
      say('Protège le château !', 3.5);
    }
    const startGoldOf = (i, left) => Math.round((TD_MAPS[i].gold * GOLDK + Math.min(120, left * .5)) / 5) * 5;
    function snapshot() { return { m: mapI, w: wave, gold, hp, score, kills, mk: mapKills, pw: Math.round(power), tw: towers.map(w => [w.x, w.y, w.k, w.lvl]) }; }
    function persist() { env.save(snapshot(), M.n + ' · vague ' + (wave + 1) + '/' + M.waves.length + ' · ' + gold + ' or'); }

    /* ----- Petits effets ----- */
    function banner(a, b, T, foe) { msg = { a, b: b || '', T, t: 0, foe: foe || null }; }
    function say(s, T) { bubble = s; bubbleT = T || 2; }
    function addFx(o) { if (!quiet && fx.length < 140) { o.t = 0; fx.push(o); } }
    function burst(x, y, col, n, sp) { if (!quiet) pr.burst(X(x, y), Y(x, y), col, n, sp); }

    /* ----- Construire, améliorer, vendre ----- */
    function place(k, x, y) {
      const T = TD_TOWERS[k]; if (!T || !canBuild(x, y)) return false; if (gold < T.cost) { banner('Pas assez d\'or', 'Il te faut ' + T.cost + ' pièces', 1.4); sfx.ko(); return false; }
      gold -= T.cost; towers.push({ x, y, k, lvl: 1, cd: .2, kick: 0, ax: 1, ay: 0, aim: null, spent: T.cost, born: t }); tuto = false; sfx.coin(); env.vibe(20); burst(x, y, '#fff', 10, 130); if (!inWave) persist(); return true;
    }
    function upgrade(tw) {
      if (!tw || tw.lvl >= 3) return false; const cost = tdUpCost(tw.k, tw.lvl); if (gold < cost) { banner('Pas assez d\'or', 'Il te faut ' + cost + ' pièces', 1.4); sfx.ko(); return false; }
      gold -= cost; tw.spent += cost; tw.lvl++; tw.born = t; sfx.win(); env.vibe(30); burst(tw.x, tw.y, '#ffd23f', 16, 170); if (!inWave) persist(); return true;
    }
    function sellTower(tw) { if (!tw) return; const back = Math.round(tw.spent * SELL); gold += back; towers = towers.filter(w => w !== tw); if (selTower === tw) selTower = null; addFx({ k: 'txt', x: tw.x, y: tw.y, s: '+' + back, T: 1 }); burst(tw.x, tw.y, '#ffd23f', 10, 120); sfx.coin(); if (!inWave) persist(); }

    /* ----- Vagues ----- */
    function startWave() {
      if (inWave || phase !== 'play' || wave >= M.waves.length) return; persist(); // sauvegarde avant de lancer : à la reprise on rejoue cette vague
      const early = wave > 0 ? Math.min(10, Math.floor(countdown / 1.5)) : 0; if (early > 0) gold += early;
      inWave = true; waveT = 0; queue = []; selTower = null; tuto = false; let at = .4, boss = false;
      for (const [k, n, gap] of M.waves[wave]) { for (let i = 0; i < n; i++) { queue.push({ k, at }); at += gap; } at += 1.3; if (k === 'boss') boss = true; }
      banner('Vague ' + (wave + 1) + ' sur ' + M.waves.length, boss ? 'Attention, le chef arrive !' : early > 0 ? 'En avance : +' + early + ' pièces d\'or' : '', 1.8, boss ? 'boss' : null); sfx.ok();
    }
    function spawn(k) {
      const F = TD_FOES[k], mult = (1 + mapI * HPMAP) * (1 + wave * HPWAVE), max = k === 'boss' ? M.boss * (hard ? 1.3 : 1) : F.hp * mult;
      foes.push({ k, F, d: 0, route: F.fly ? aRoute : gRoute, x: -3, y: 0, dx: 1, dy: 0, hp: max, max, slow: 0, slowF: 1, off: [rnd(-.13, .13), rnd(-.13, .13)], ph: rnd(0, 6), age: 0, healT: 1.5, healed: -9, hit: 0, face: 1, dead: false });
    }
    function damage(f, v) { if (f.dead) return; f.hp -= v; f.hit = .1; if (f.hp <= 0) { f.dead = true; gold += f.F.gold; kills++; mapKills++; score += f.k === 'boss' ? 200 : 10; if (!quiet) { sfx.pop(); addFx({ k: 'txt', x: f.x, y: f.y - .3, s: '+' + f.F.gold, T: .8 }); burst(f.x, f.y, f.F.c, f.k === 'boss' ? 30 : 10, f.k === 'boss' ? 260 : 150); if (f.k === 'boss') { env.vibe(120); say('Hourra !', 2); cheer = 2; } } } }
    function hitCastle(f) {
      f.dead = true; hp = Math.max(0, hp - f.F.dmg); shake = .5; mood = 'scared'; moodT = 1.4; say(pick(['Au secours !', 'Le château tremble !', 'Aïe !']), 1.6);
      if (!quiet) { sfx.hit(); env.vibe(150); addFx({ k: 'boom', x: END[0], y: END[1] + .6, r: 1.1, T: .45 }); addFx({ k: 'txt', x: END[0], y: END[1] - 1.2, s: '−' + f.F.dmg, T: 1, col: '#ff5a4f' }); }
      if (hp <= 0 && phase === 'play') { phase = 'lost'; phT = 0; selTower = null; if (!quiet) { burst(END[0], END[1], '#8f93a8', 40, 260); banner('Le château est tombé…', '', 3); } }
    }
    function fire(tw, st, f) {
      tw.cd = st.rate; tw.kick = 1; tw.ax = f.x - tw.x; tw.ay = f.y - tw.y;
      if (tw.k === 'mage') { // éclair : frappe la cible puis rebondit sur les voisins, de moins en moins fort
        const hitList = [f]; let cur = f, dmg = st.dmg;
        for (let i = 1; i < st.chain; i++) { let nx = null, bd = 2; for (const o of foes) { if (o.dead || hitList.includes(o) || o.d < 1.5) continue; const d = Math.hypot(o.x - cur.x, o.y - cur.y); if (d < bd) { bd = d; nx = o; } } if (!nx) break; hitList.push(nx); cur = nx; }
        addFx({ k: 'bolt', tw, pts: hitList.map(o => [o.x, o.y, !!o.F.fly, o.F.r]), T: .2 }); for (const o of hitList) { damage(o, dmg); dmg *= .8; }
      } else { const d = Math.hypot(f.x - tw.x, f.y - tw.y); shots.push({ k: tw.k, st, x0: tw.x, y0: tw.y, x: tw.x, y: tw.y, tg: f, tx: f.x, ty: f.y, t: 0, T: Math.max(.1, d / (tw.k === 'arc' ? 11 : tw.k === 'canon' ? 6 : 8)), air: !!f.F.fly }); }
    }
    function impact(s) {
      const st = s.st;
      if (s.k === 'arc') { if (s.tg && !s.tg.dead) damage(s.tg, st.dmg * (s.tg.F.armor || 1)); }
      else if (s.k === 'canon') { for (const o of foes) if (!o.dead && !o.F.fly && Math.hypot(o.x - s.tx, o.y - s.ty) <= st.splash) damage(o, st.dmg); addFx({ k: 'boom', x: s.tx, y: s.ty, r: st.splash, T: .4 }); burst(s.tx, s.ty, '#ff9f1c', 6, 120); }
      else { for (const o of foes) if (!o.dead && Math.hypot(o.x - s.tx, o.y - s.ty) <= st.splash) { damage(o, st.dmg); o.slow = st.dur; o.slowF = o.k === 'boss' ? Math.max(.7, st.slow) : st.slow; } addFx({ k: 'ice', x: s.tx, y: s.ty, r: st.splash, T: .4, air: s.air }); }
    }
    function usePower() { // le pouvoir de la reine : une pluie de flèches qui blesse tous les ennemis à la fois
      if (phase !== 'play') return false; if (power > 0) { sfx.ko(); return false; }
      const tg = foes.filter(f => f.d > 1.6 && !f.dead); if (!tg.length) { banner('Garde ce pouvoir pour une vague !', '', 1.6); sfx.ko(); return false; }
      power = POWER_CD; rain = 1; const dmg = 40 + 24 * mapI; for (const f of tg) damage(f, dmg); say('Pluie de flèches !', 1.8); mood = 'cheer'; moodT = 1.2; sfx.punch(); env.vibe(60); return true;
    }
    function waveCleared() {
      inWave = false; wave++; const bonus = 25 + 5 * (gBase + wave); gold += bonus; score += 40 * (gBase + wave); cheer = 2.2; mood = 'cheer'; moodT = 2;
      if (wave >= M.waves.length) { mapCleared(); return; }
      countdown = 15; say(pick(['Merci !', 'Bravo !', 'Bien joué !', 'Quel talent !']), 2.2); banner('Vague repoussée !', '+' + bonus + ' pièces d\'or', 2); sfx.win(); persist();
    }
    function mapCleared() {
      const bonus = 250 * (mapI + 1) + hp * 15; score += bonus; recap = { kills: mapKills, hp, bonus, last: mapI === NM - 1 }; phase = 'cleared'; phT = 0; selTower = null; msg = null; speed = 1; sfx.win(); env.vibe(200);
      if (!recap.last) env.save({ m: mapI + 1, w: 0, gold: startGoldOf(mapI + 1, gold), hp: HPMAX, score, kills, mk: 0, pw: 0, tw: [] }, TD_MAPS[mapI + 1].n + ' · début');
    }
    function nextMap() {
      if (phase !== 'cleared') return;
      if (mapI >= NM - 1) { over = true; TD_CHECK = null; env.gameOver(score, { win: true, title: 'Le royaume est sauvé !', text: NM + ' cartes défendues · ' + kills + ' ennemis vaincus' }); return; }
      setupMap(mapI + 1, startGoldOf(mapI + 1, gold)); sfx.ok(); persist();
    }

    /* ----- Simulation : avance le jeu de dt secondes (sans rien dessiner) ----- */
    function sim(dt) {
      if (phase === 'lost') { phT += dt; if (phT > 1.6 && !over) { over = true; TD_CHECK = mapI > 0 ? { pid: env.profile && env.profile.id, m: mapI } : null; env.gameOver(score, { title: 'Le château est tombé', text: M.n + ' (carte ' + (mapI + 1) + '/' + NM + ') · vague ' + (wave + 1) + ' · ' + kills + ' ennemis vaincus' }); } return; }
      if (phase !== 'play') return;
      power = Math.max(0, power - dt);
      if (!inWave) { if (!tuto) countdown -= dt; if (countdown <= 0) startWave(); return; }
      waveT += dt; while (queue.length && queue[0].at <= waveT) spawn(queue.shift().k);
      for (const f of foes) {
        f.age += dt; f.hit = Math.max(0, f.hit - dt); f.slow = Math.max(0, f.slow - dt); const sp = f.F.sp * (f.slow > 0 ? f.slowF : 1); f.d += sp * dt; f.ph += sp * dt * 7;
        const p = routeAt(f.route, f.d); f.x = p[0] + f.off[0]; f.y = p[1] + f.off[1]; f.dx = p[2]; f.dy = p[3];
        if (f.d >= f.route.total - .9) { hitCastle(f); continue; }
        // sorcier : soigne ses voisins ; un ennemi ne peut être soigné qu'une fois toutes les 2 s, même entouré de sorciers
        if (f.F.heal) { f.healT -= dt; if (f.healT <= 0) { f.healT = 2.2; let any = false; for (const o of foes) if (o !== f && !o.dead && o.hp < o.max && o.age - o.healed > 2 && Math.hypot(o.x - f.x, o.y - f.y) < 1.6) { o.hp = Math.min(o.max, o.hp + o.max * (o.k === 'boss' ? .02 : .08)); o.healed = o.age; any = true; } if (any) addFx({ k: 'heal', x: f.x, y: f.y, r: 1.6, T: .6 }); } }
      }
      for (const tw of towers) {
        tw.cd -= dt; tw.kick = Math.max(0, tw.kick - dt * 4); const T = TD_TOWERS[tw.k], st = T.lv[tw.lvl - 1]; let best = null, bd = 1e9;
        for (const f of foes) { if (f.dead || (f.F.fly && !T.air)) continue; const d = Math.hypot(f.x - tw.x, f.y - tw.y); if (d > st.range) continue; const rem = f.route.total - f.d + (tw.k === 'glace' && f.slow > .5 ? 100 : 0) - (f.F.heal && tw.k !== 'glace' ? 2 : 0); if (rem < bd) { bd = rem; best = f; } }
        if (best) { if (tw.cd <= 0) fire(tw, st, best); else { tw.ax = best.x - tw.x; tw.ay = best.y - tw.y; } }
      }
      for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.t += dt; if (s.tg && !s.tg.dead) { s.tx = s.tg.x; s.ty = s.tg.y; } const u = Math.min(1, s.t / s.T); s.x = s.x0 + (s.tx - s.x0) * u; s.y = s.y0 + (s.ty - s.y0) * u; if (u >= 1) { impact(s); shots.splice(i, 1); } }
      if (foes.some(f => f.dead)) foes = foes.filter(f => !f.dead);
      if (phase === 'play' && !queue.length && !foes.length) waveCleared();
    }

    /* ----- Mise en page : zone de jeu + panneau de boutons (en bas en portrait, à droite en paysage) ----- */
    function layout() {
      const W = env.W, H = env.H, land = W > H * 1.05; let aw, ah, ax = 0, ay = 0, pw = 0, barH = 0, topH = 0;
      if (land) { pw = clamp(Math.round(W * .25), 176, 240); aw = W - pw; ah = H; } else { topH = 34; barH = 134; ay = topH; aw = W; ah = H - topH - barH; }
      tr = ah > aw; const gc = tr ? rows : cols, gr = tr ? cols : rows;
      cell = Math.max(10, Math.floor(Math.min(aw / gc, ah / gr))); ox = Math.round(ax + (aw - gc * cell) / 2); oy = Math.round(ay + (ah - gr * cell) / 2);
      L = { land, pw, barH, topH, ax, ay, aw, ah, gc, gr };
      const k = [W, H, mapI, cell, ox, oy, tr, env.canvas.width].join(); if (k !== bgKey) { bgKey = k; buildBg(); }
      buildUI();
    }
    function clearedGeom() { const W = env.W, H = env.H, pw = Math.min(W - 16, 440), ph = Math.min(H - 12, 430), x = (W - pw) / 2, y = (H - ph) / 2, bh = clamp(ph * .13, 40, 52); return { x, y, pw, ph, bh, bx: x + 18, by: y + ph - bh - 14, bw: pw - 36 }; }
    function choiceGeom() { const W = env.W, H = env.H, pw = Math.min(W - 16, 400), ph = Math.min(H - 12, 300); return { x: (W - pw) / 2, y: (H - ph) / 2, pw, ph, bh: clamp(ph * .19, 44, 56) }; }
    function choose(cont) { if (phase !== 'choice') return; const m = TD_CHECK ? TD_CHECK.m : 0; TD_CHECK = null; if (cont && m > 0) setupMap(m, startGoldOf(m, 0)); else { phase = 'play'; banner(M.n, 'Pose tes tours, puis lance la vague', 4); } sfx.ok(); persist(); }
    function buildUI() {
      btns = []; const W = env.W, H = env.H, g = 6;
      if (phase === 'cleared') { const G = clearedGeom(); btns.push({ id: 'next', x: G.bx, y: G.by, w: G.bw, h: G.bh }); return; }
      if (phase === 'choice') { const G = choiceGeom(); btns.push({ id: 'cont', x: G.x + 18, y: G.y + G.ph - 2 * G.bh - 26, w: G.pw - 36, h: G.bh }); btns.push({ id: 'fresh', x: G.x + 18, y: G.y + G.ph - G.bh - 16, w: G.pw - 36, h: G.bh }); return; }
      if (L.land) {
        const x0 = W - L.pw + g, w = L.pw - 2 * g, top = 52, rem = H - top - 4 * g, hB = clamp(rem * .2, 38, 56), hC = clamp(rem * .2, 42, 60), bh = clamp((rem - hB - hC) / 2, 38, 84), bw = (w - g) / 2;
        if (selTower) { btns.push({ id: 'info', x: x0, y: top, w, h: bh }); btns.push({ id: 'up', x: x0, y: top + bh + g, w: bw, h: bh }); btns.push({ id: 'sell', x: x0 + bw + g, y: top + bh + g, w: bw, h: bh }); }
        else TD_ORDER.forEach((k, i) => btns.push({ id: 't:' + k, k, x: x0 + (i % 2) * (bw + g), y: top + Math.floor(i / 2) * (bh + g), w: bw, h: bh, col: true }));
        const yB = H - g - hC - g - hB; btns.push({ id: 'pow', x: x0, y: yB, w: w * .62 - g / 2, h: hB }); btns.push({ id: 'spd', x: x0 + w * .62 + g / 2, y: yB, w: w * .38 - g / 2, h: hB }); btns.push({ id: 'go', x: x0, y: H - g - hC, w, h: hC });
      } else {
        const y0 = H - L.barH + 7, hA = 64, yB = y0 + hA + g, hB = 50, w = W - 2 * g;
        if (selTower) { const bw = w * .29; btns.push({ id: 'info', x: g, y: y0, w: w - 2 * bw - 2 * g, h: hA }); btns.push({ id: 'up', x: g + w - 2 * bw - g, y: y0, w: bw, h: hA }); btns.push({ id: 'sell', x: g + w - bw, y: y0, w: bw, h: hA }); }
        else { const bw = (w - 3 * g) / 4; TD_ORDER.forEach((k, i) => btns.push({ id: 't:' + k, k, x: g + i * (bw + g), y: y0, w: bw, h: hA })); }
        const pw = Math.min(118, w * .3), sw = Math.min(64, w * .17); btns.push({ id: 'pow', x: g, y: yB, w: pw, h: hB }); btns.push({ id: 'spd', x: g + pw + g, y: yB, w: sw, h: hB }); btns.push({ id: 'go', x: g + pw + sw + 2 * g, y: yB, w: w - pw - sw - 2 * g, h: hB });
      }
    }
    function act(id) {
      if (id === 'next') { if (phT > .8) nextMap(); return; }
      if (id === 'cont' || id === 'fresh') { choose(id === 'cont'); return; }
      if (id.startsWith('t:')) { sel = id.slice(2); selTower = null; sfx.tap(); }
      else if (id === 'up') upgrade(selTower); else if (id === 'sell') sellTower(selTower);
      else if (id === 'go') { if (inWave) sfx.ko(); else startWave(); }
      else if (id === 'spd') { speed = speed === 1 ? 2 : 1; sfx.tap(); }
      else if (id === 'pow') usePower();
    }
    function tapBoard(p) {
      const gx = Math.floor((p.x - ox) / cell), gy = Math.floor((p.y - oy) / cell), x = tr ? gy : gx, y = tr ? gx : gy;
      const tw = towerAt(x, y); if (tw) { selTower = selTower === tw ? null : tw; sfx.tap(); return; }
      if (selTower) { selTower = null; return; } // un tap ailleurs referme la fiche de la tour, sans rien construire
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      if (!canBuild(x, y)) { sfx.ko(); banner(pathSet.has(key(x, y)) ? 'Pas sur le chemin !' : 'Ici, on ne peut pas construire', 'Choisis une case d\'herbe libre', 1.4); return; }
      place(sel, x, y);
    }

    function update(dt) {
      if (over) return; layout(); t += dt;
      const p = input.pointer;
      if (p.justDown && phase !== 'lost') { const b = btns.find(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h); if (b) act(b.id); else if (phase === 'play' && (L.land ? p.x < env.W - L.pw : p.y < env.H - L.barH && p.y > L.topH)) tapBoard(p); }
      for (let i = 0; i < speed && !over; i++) sim(dt);
      if (over) return;
      // minuteries purement visuelles
      pr.update(dt); if (msg) { msg.t += dt; if (msg.t > msg.T) msg = null; } shake = Math.max(0, shake - dt); moodT = Math.max(0, moodT - dt); if (moodT <= 0) mood = ''; bubbleT = Math.max(0, bubbleT - dt); cheer = Math.max(0, cheer - dt); rain = Math.max(0, rain - dt * 1.1);
      for (let i = fx.length - 1; i >= 0; i--) { fx[i].t += dt; if (fx[i].t >= fx[i].T) fx.splice(i, 1); }
      if (phase === 'play' && hp / HPMAX < .45 && Math.random() < dt * 5) addFx({ k: 'smoke', x: END[0] + rnd(-.9, .9), y: END[1] - rnd(.2, 1.1), T: 1.3 });
      if (phase === 'lost' && Math.random() < dt * 25) addFx({ k: 'smoke', x: END[0] + rnd(-1.2, 1.2), y: END[1] + rnd(-1.2, .8), T: 1.2 });
      if (phase === 'cleared') { phT += dt; cheer = 1; mood = 'cheer'; moodT = 1; if (confetti.length < 90 && Math.random() < dt * 40) confetti.push({ x: rnd(0, env.W), y: -10, vx: rnd(-40, 40), vy: rnd(70, 170), c: pick(COLORS), a: rnd(0, 6), va: rnd(-8, 8) }); for (let i = confetti.length - 1; i >= 0; i--) { const q = confetti[i]; q.x += q.vx * dt; q.y += q.vy * dt; q.a += q.va * dt; if (q.y > env.H + 12) confetti.splice(i, 1); } }
      env.setScore(score); env.hud('Carte ' + (mapI + 1) + '/' + NM + ' · Vague ' + Math.min(M.waves.length, wave + 1) + '/' + M.waves.length);
    }

    /* ----- Image de fond : herbe, eau, chemin, décor. Dessinée une seule fois par carte et par taille d'écran. ----- */
    function buildBg() {
      const W = env.W, H = env.H, sc = (env.canvas.width / W) || 1, th = M.th, s = cell, R = tdRng(31 + mapI * 101);
      if (!bg) bg = document.createElement('canvas'); bg.width = Math.max(1, Math.round(W * sc)); bg.height = Math.max(1, Math.round(H * sc));
      const c = bg.getContext('2d'); c.setTransform(sc, 0, 0, sc, 0, 0); c.lineJoin = 'round'; c.lineCap = 'round';
      c.fillStyle = th.grass; c.fillRect(0, 0, W, H);
      for (let i = 0, n = W * H / 2200; i < n; i++) { c.globalAlpha = .1 + R() * .14; tdOval(c, R() * W, R() * H, s * (.4 + R() * 1.1), s * (.2 + R() * .45), R() < .5 ? th.dark : th.light); } c.globalAlpha = 1;
      // les cases où l'on peut construire se devinent à peine : un carré arrondi un peu plus clair
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!pathSet.has(key(x, y)) && !castleSet.has(key(x, y)) && !waterSet.has(key(x, y)) && !obstSet.has(key(x, y))) { c.fillStyle = 'rgba(255,255,255,.09)'; Draw.rr(c, X(x, y) - .45 * s, Y(x, y) - .45 * s, .9 * s, .9 * s, .2 * s); c.fill(); }
      c.strokeStyle = th.dark; c.globalAlpha = .55; c.lineWidth = 1.5; c.beginPath(); for (let i = 0, n = W * H / 1100; i < n; i++) { const x = R() * W, y = R() * H; c.moveTo(x, y); c.lineTo(x - 2, y - 5); c.moveTo(x + 3, y); c.lineTo(x + 4.5, y - 6); } c.stroke(); c.globalAlpha = 1;
      const smooth = pts => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); };
      const line = (pts, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); };
      // eau : rivière (une colonne de cases, tracée en ondulant) ou mare
      for (const w of M.water) {
        if (w.t === 'river') { const pts = []; for (let y = -14; y <= rows + 14; y++) pts.push([X(w.x + Math.sin(y * 1.3 + mapI) * .12, y), Y(w.x + Math.sin(y * 1.3 + mapI) * .12, y)]); for (const [col, k] of [['#d9c88f', 1.06], ['#2f7fc4', .9], ['#4aa8e8', .78]]) { c.strokeStyle = col; c.lineWidth = s * k; smooth(pts); c.stroke(); } c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = Math.max(1.5, s * .04); for (let i = 0; i < 26; i++) { const yy = -2 + R() * (rows + 4), dx = (R() - .5) * .5, a = X(w.x + dx, yy), b = Y(w.x + dx, yy); c.beginPath(); c.moveTo(a, b); c.lineTo(a + (tr ? s * .25 : 0), b + (tr ? 0 : s * .25)); c.stroke(); } }
        else {
          const px = X(w.x, w.y), py = Y(w.x, w.y), rx = (tr ? w.ry : w.rx) * s, ry = (tr ? w.rx : w.ry) * s;
          if (w.kind === 'fountain') { tdOval(c, px, py + .08 * s, rx * 1.12, ry * .82, 'rgba(0,0,0,.2)'); tdOval(c, px, py, rx * 1.1, ry * .8, '#c9ccd8'); tdOval(c, px, py, rx * .92, ry * .64, '#4aa8e8'); tdOval(c, px - rx * .2, py - ry * .1, rx * .4, ry * .2, 'rgba(255,255,255,.3)'); c.fillStyle = '#b4b8c9'; c.fillRect(px - .07 * s, py - .5 * s, .14 * s, .5 * s); tdOval(c, px, py - .5 * s, .22 * s, .08 * s, '#d3d6e2'); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = Math.max(1.5, .04 * s); for (const d of [-1, 1]) { c.beginPath(); c.moveTo(px, py - .55 * s); c.quadraticCurveTo(px + d * .25 * s, py - .9 * s, px + d * .42 * s, py - .1 * s); c.stroke(); } }
          else { tdOval(c, px, py, rx * 1.12, ry * 1.14, w.kind === 'ice' ? '#e9f3f1' : '#d9c88f'); tdOval(c, px, py, rx, ry, w.kind === 'ice' ? '#9fd4ee' : '#2f7fc4'); tdOval(c, px, py - ry * .06, rx * .92, ry * .88, w.kind === 'ice' ? '#cfeaf7' : '#4aa8e8'); tdOval(c, px - rx * .3, py - ry * .3, rx * .35, ry * .18, 'rgba(255,255,255,.35)');
            if (w.kind === 'ice') { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px - rx * .5, py + ry * .2); c.lineTo(px, py); c.lineTo(px + rx * .1, py + ry * .5); c.moveTo(px, py); c.lineTo(px + rx * .5, py - ry * .3); c.stroke(); }
            else for (const [dx, dy] of [[.35, .25], [-.45, .35], [.1, -.4]]) { const lx = px + dx * rx, ly = py + dy * ry; c.fillStyle = '#3fa245'; c.beginPath(); c.moveTo(lx, ly); c.arc(lx, ly, .13 * s, .4, 5.9); c.closePath(); c.fill(); if (dx > .2) tdDisc(c, lx, ly, .045 * s, '#ff8fc7'); } }
        }
      }
      // chemin : un large trait bordé, qui arrive du bord de l'écran et finit sous le château
      const wp = [[-30, M.wp[0][1]]].concat(M.wp.slice(1)), pts = wp.map(p => [X(p[0], p[1]), Y(p[0], p[1])]);
      line(pts, 'rgba(0,0,0,.14)', s * 1.02); line(pts, th.edge, s * .92); line(pts, th.path, s * .76);
      const cells = Array.from(pathSet).map(k => k.split(',').map(Number)); for (let x = -8; x < -1; x++) cells.push([x, M.wp[0][1]]);
      for (const [x, y] of cells) {
        const px = X(x, y), py = Y(x, y);
        if (th.paved) { c.fillStyle = 'rgba(255,255,255,.3)'; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { Draw.rr(c, px - .34 * s + i * .36 * s, py - .34 * s + j * .36 * s, .32 * s, .32 * s, .07 * s); c.fill(); } c.fillStyle = 'rgba(0,0,0,.06)'; Draw.rr(c, px - .34 * s + (x + y & 1) * .36 * s, py - .34 * s, .32 * s, .32 * s, .07 * s); c.fill(); }
        else for (let i = 0; i < 4; i++) { c.globalAlpha = .5 + R() * .4; tdOval(c, px + (R() - .5) * .6 * s, py + (R() - .5) * .6 * s, s * (.03 + R() * .05), s * (.02 + R() * .03), R() < .7 ? th.peb : th.edge); } c.globalAlpha = 1;
      }
      // pont de bois là où le chemin traverse la rivière
      for (const w of M.water) if (w.t === 'river') for (const [x, y] of cells) if (x === w.x && y >= 0) { const px = X(x, y), py = Y(x, y); c.save(); c.translate(px, py); if (tr) c.rotate(Math.PI / 2); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-.66 * s, -.4 * s, 1.32 * s, .9 * s); c.fillStyle = '#b98345'; c.fillRect(-.66 * s, -.42 * s, 1.32 * s, .84 * s); c.strokeStyle = '#8a5a2b'; c.lineWidth = Math.max(1, .03 * s); c.beginPath(); for (let i = 1; i < 8; i++) { c.moveTo(-.66 * s + i * .165 * s, -.42 * s); c.lineTo(-.66 * s + i * .165 * s, .42 * s); } c.stroke(); c.lineCap = 'butt'; c.strokeStyle = '#6e4a22'; c.lineWidth = Math.max(2, .08 * s); c.beginPath(); c.moveTo(-.7 * s, -.44 * s); c.lineTo(.7 * s, -.44 * s); c.moveTo(-.7 * s, .44 * s); c.lineTo(.7 * s, .44 * s); c.stroke(); c.lineCap = 'round'; c.restore(); }
      // fleurs, puis arbres et rochers triés du fond vers l'avant (dans la grille : toujours aux mêmes cases ; autour : pour remplir l'écran)
      const gx0 = ox - .3 * s, gy0 = oy - .3 * s, gx1 = ox + L.gc * s + .3 * s, gy1 = oy + L.gr * s + .3 * s, ex = X(-1, M.wp[0][1]), ey = Y(-1, M.wp[0][1]);
      const offPath = (x, y) => tr ? Math.abs(x - ex) > s * .9 || y > oy : Math.abs(y - ey) > s * .9 || x > ox;
      const inGrid = (x, y) => x > gx0 && x < gx1 && y > gy0 && y < gy1;
      for (let i = 0, n = W * H / 5200; i < n; i++) { const x = R() * W, y = R() * H, col = th.flowers[Math.floor(R() * th.flowers.length)]; if (inGrid(x, y)) { const gx = Math.floor((x - ox) / s), gy = Math.floor((y - oy) / s), lx = tr ? gy : gx, ly = tr ? gx : gy; if (pathSet.has(key(lx, ly)) || waterSet.has(key(lx, ly)) || castleSet.has(key(lx, ly))) continue; } else if (!offPath(x, y)) continue; const q = Math.max(1.6, s * .045); if (th.snow) { tdOval(c, x, y, q * 3, q * 1.4, 'rgba(255,255,255,.7)'); continue; } for (let k = 0; k < 5; k++) tdDisc(c, x + Math.cos(k * 1.26) * q, y + Math.sin(k * 1.26) * q, q * .75, col); tdDisc(c, x, y, q * .6, '#f2a516'); }
      const list = obst.map(o => ({ x: X(o.x, o.y), y: Y(o.x, o.y), kind: o.kind, v: o.v, k: 1 }));
      for (let i = 0, n = W * H / (s * s) * .5; i < n; i++) { const x = R() * W, y = R() * H, a = R(), v = R(), k = .85 + R() * .5; if (inGrid(x, y) || !offPath(x, y)) continue; const tot = th.decor.reduce((q, d) => q + d[1], 0); let q = a * tot, kind = th.decor[0][0]; for (const d of th.decor) { if (q < d[1]) { kind = d[0]; break; } q -= d[1]; } list.push({ x, y, kind, v, k }); }
      list.sort((a, b) => a.y - b.y); for (const o of list) tdDecor(c, o.kind, o.x, o.y, s * o.k, o.v, th);
    }

    /* ----- Dessin ----- */
    function coin(c, x, y, r) { tdDisc(c, x, y, r, '#b8860b'); tdDisc(c, x, y - r * .12, r * .88, '#ffd23f'); tdDisc(c, x - r * .25, y - r * .35, r * .25, '#fff3b0'); }
    function wrap(c, s, maxW, size, w) { c.font = (w || 800) + ' ' + size + 'px ' + FONT; const out = []; let cur = ''; for (const word of s.split(' ')) { const nx = cur ? cur + ' ' + word : word; if (cur && c.measureText(nx).width > maxW) { out.push(cur); cur = word; } else cur = nx; } if (cur) out.push(cur); return out; }
    function drawShot(c, s) {
      const x = X(s.x, s.y), y = Y(s.x, s.y), u = s.t / s.T, sz = cell, dxl = s.tx - s.x0, dyl = s.ty - s.y0, a = tr ? Math.atan2(dxl, dyl) : Math.atan2(dyl, dxl), lift = s.air ? u * sz * .34 : 0;
      if (s.k === 'arc') { c.save(); c.translate(x, y - sz * .35 * (1 - u) - lift); c.rotate(a); c.strokeStyle = '#5a3a18'; c.lineWidth = Math.max(1.5, sz * .04); c.beginPath(); c.moveTo(-sz * .16, 0); c.lineTo(sz * .12, 0); c.stroke(); tdPoly(c, [sz * .2, 0, sz * .08, -sz * .05, sz * .08, sz * .05], '#e1e3ec'); tdPoly(c, [-sz * .16, 0, -sz * .24, -sz * .05, -sz * .2, 0, -sz * .24, sz * .05], '#fff'); c.restore(); }
      else if (s.k === 'canon') { const h = Math.sin(u * Math.PI) * sz * .55; tdOval(c, x, y + sz * .1, sz * .09, sz * .04, 'rgba(0,0,0,.25)'); tdDisc(c, x, y - sz * .12 * (1 - u) - h, sz * .1, '#1f2230'); tdDisc(c, x - sz * .03, y - sz * .12 * (1 - u) - h - sz * .03, sz * .03, '#7b8099'); }
      else { c.save(); c.translate(x, y - sz * .3 * (1 - u) - lift); c.rotate(a); tdPoly(c, [-sz * .3, 0, 0, -sz * .04, 0, sz * .04], 'rgba(160,230,255,.5)'); tdPoly(c, [sz * .16, 0, 0, -sz * .08, -sz * .1, 0, 0, sz * .08], '#5ad1ff'); tdPoly(c, [sz * .16, 0, 0, -sz * .08, -sz * .02, 0], '#e3f8ff'); c.restore(); }
    }
    function drawFx(c, e) {
      const x = X(e.x || 0, e.y || 0), y = Y(e.x || 0, e.y || 0), u = e.t / e.T, s = cell;
      if (e.k === 'boom') { c.globalAlpha = 1 - u; tdDisc(c, x, y, e.r * s * (.35 + u * .65), '#ffb347'); tdDisc(c, x, y, e.r * s * (.2 + u * .45), '#fff3b0'); c.strokeStyle = '#ff6a2b'; c.lineWidth = Math.max(2, s * .07 * (1 - u)); c.beginPath(); c.arc(x, y, e.r * s * (.4 + u * .7), 0, 7); c.stroke(); }
      else if (e.k === 'ice') { const yy = y - (e.air ? s * .34 : 0); c.globalAlpha = 1 - u; c.strokeStyle = '#c9f1ff'; c.lineWidth = Math.max(2, s * .06); c.beginPath(); c.arc(x, yy, e.r * s * (.3 + u * .7), 0, 7); c.stroke(); c.fillStyle = '#e3f8ff'; for (let i = 0; i < 6; i++) { const a = i * 1.047 + .3, d = e.r * s * (.2 + u * .6); tdPoly(c, [x + Math.cos(a) * d, yy + Math.sin(a) * d - s * .08, x + Math.cos(a) * d + s * .05, yy + Math.sin(a) * d, x + Math.cos(a) * d, yy + Math.sin(a) * d + s * .08, x + Math.cos(a) * d - s * .05, yy + Math.sin(a) * d], '#e3f8ff'); } }
      else if (e.k === 'heal') { c.globalAlpha = (1 - u) * .8; c.strokeStyle = '#9dff5c'; c.lineWidth = Math.max(2, s * .06); c.beginPath(); c.arc(x, y, e.r * s * u, 0, 7); c.stroke(); c.fillStyle = '#9dff5c'; c.fillRect(x - s * .03, y - s * (.5 + u * .4), s * .06, s * .2); c.fillRect(x - s * .1, y - s * (.43 + u * .4), s * .2, s * .06); }
      else if (e.k === 'smoke') { c.globalAlpha = (1 - u) * .5; tdDisc(c, x + Math.sin(e.t * 3 + e.x * 9) * s * .1, y - u * s * .9, s * (.12 + u * .22), '#6b6f80'); }
      else if (e.k === 'txt') { c.globalAlpha = clamp((1 - u) * 2, 0, 1); const yy = y - s * (.4 + u * .7), sz = Math.max(12, s * .34); c.font = '900 ' + sz + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 3; c.strokeStyle = '#1b1540'; c.strokeText(e.s, x, yy); c.fillStyle = e.col || '#ffd23f'; c.fillText(e.s, x, yy); }
      else if (e.k === 'bolt') { // éclair en zigzag, redessiné au hasard à chaque image pour qu'il crépite
        let px = X(e.tw.x, e.tw.y), py = tdMageTop(e.tw.lvl, Y(e.tw.x, e.tw.y), s); c.globalAlpha = 1 - u * .6;
        for (const q of e.pts) { const qx = X(q[0], q[1]), qy = Y(q[0], q[1]) - (q[2] ? s * .34 : 0), n = 4, dx = qx - px, dy = qy - py, len = Math.hypot(dx, dy) || 1; c.beginPath(); c.moveTo(px, py); for (let i = 1; i < n; i++) { const j = (Math.random() - .5) * s * .3; c.lineTo(px + dx * i / n - dy / len * j, py + dy * i / n + dx / len * j); } c.lineTo(qx, qy); c.strokeStyle = '#b388ff'; c.lineWidth = Math.max(3, s * .1); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.5, s * .04); c.stroke(); tdDisc(c, qx, qy, s * .12 * (1 - u), '#fff'); px = qx; py = qy; }
      }
      c.globalAlpha = 1;
    }
    function drawBubble(c, s, x, y, size) { c.font = '800 ' + size + 'px ' + FONT; const w = c.measureText(s).width + 16, h = size + 12, bx = clamp(x - w / 2, 4, env.W - w - 4 - (L.land ? L.pw : 0)); c.fillStyle = '#1b1540'; Draw.rr(c, bx - 2, y - h - 2, w + 4, h + 4, 9); c.fill(); tdPoly(c, [x - 7, y, x, y + 9, x + 7, y], '#1b1540'); c.fillStyle = '#fff'; Draw.rr(c, bx, y - h, w, h, 7); c.fill(); tdPoly(c, [x - 5, y - 1, x, y + 6, x + 5, y - 1], '#fff'); txt(c, s, bx + w / 2, y - h / 2 + 1, size, '#1b1540', 'center', 800); }

    function draw(c) {
      if (!L) layout(); buildUI(); const W = env.W, H = env.H, s = cell;
      c.lineJoin = 'round'; c.drawImage(bg, 0, 0, W, H);
      // reflets qui bougent sur l'eau
      for (const w of M.water) { if (w.kind === 'ice') continue; c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = Math.max(1.5, s * .035); c.beginPath(); for (let i = 0; i < (w.t === 'river' ? 8 : 2); i++) { const ph = (t * .35 + i * .37) % 1; let lx, ly; if (w.t === 'river') { ly = -1 + ((i * 2.7 + t * .5) % (rows + 2)); lx = w.x + Math.sin(ly * 1.3 + mapI) * .12 + Math.sin(i * 5) * .2; } else { lx = w.x + (i ? .3 : -.3) * w.rx; ly = w.y + (i ? .2 : -.1) * w.ry; } const px = X(lx, ly), py = Y(lx, ly), len = s * .14 * (1 + Math.sin(ph * 6.28) * .5); c.moveTo(px - len, py); c.lineTo(px + len, py); } c.stroke(); }
      // premières secondes : les cases conseillées clignotent
      if (tuto && phase === 'play') { const a = .25 + Math.sin(t * 5) * .15; c.fillStyle = 'rgba(255,255,255,' + a + ')'; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (canBuild(x, y) && (pathSet.has(key(x + 1, y)) || pathSet.has(key(x - 1, y)) || pathSet.has(key(x, y + 1)) || pathSet.has(key(x, y - 1)))) { Draw.rr(c, X(x, y) - .42 * s, Y(x, y) - .42 * s, .84 * s, .84 * s, .2 * s); c.fill(); } }
      if (selTower) { const st = TD_TOWERS[selTower.k].lv[selTower.lvl - 1], px = X(selTower.x, selTower.y), py = Y(selTower.x, selTower.y); c.fillStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.arc(px, py, st.range * s, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; c.setLineDash([8, 6]); c.lineDashOffset = -t * 20; c.stroke(); c.setLineDash([]); }
      // tout ce qui est posé au sol est dessiné du fond vers l'avant
      const ents = []; const cx = X(END[0], END[1]) + (shake > 0 ? Math.sin(t * 70) * shake * 6 : 0), cy = Y(END[0], END[1]);
      for (const tw of towers) ents.push({ y: Y(tw.x, tw.y) + .36 * s, tw }); for (const f of foes) if (!f.F.fly) ents.push({ y: Y(f.x, f.y), f });
      ents.push({ y: cy + .95 * s, castle: 1 }); ents.sort((a, b) => a.y - b.y);
      const drawF = f => { const sdx = tr ? f.dy : f.dx; if (sdx > .3) f.face = 1; else if (sdx < -.3) f.face = -1; if (f.age < .4) c.globalAlpha = f.age / .4; tdFoe(c, f, X(f.x, f.y), Y(f.x, f.y), s, f.face); c.globalAlpha = 1; };
      for (const e of ents) {
        if (e.tw) { const tw = e.tw, tg = tr ? Math.atan2(tw.ax, tw.ay) : Math.atan2(tw.ay, tw.ax); if (tw.aim == null) tw.aim = tg; let d = tg - tw.aim; d = Math.atan2(Math.sin(d), Math.cos(d)); tw.aim += d * .3; const pop = clamp((t - tw.born) * 5, 0, 1), px = X(tw.x, tw.y), py = Y(tw.x, tw.y); if (pop < 1) { c.save(); c.translate(px, py + .36 * s); c.scale(1 + (1 - pop) * .25, .6 + pop * .4); c.translate(-px, -py - .36 * s); } tdTower(c, tw.k, tw.lvl, px, py, s, tw.aim, tw.kick, t); if (pop < 1) c.restore(); }
        else if (e.f) drawF(e.f);
        else {
          const frac = phase === 'lost' ? 0 : hp / HPMAX, sink = phase === 'lost' ? Math.min(1, phT / 1.3) : 0;
          if (sink) { c.save(); c.beginPath(); c.rect(cx - 2 * s, cy - 2.2 * s, 4 * s, 3.2 * s); c.clip(); c.translate(0, sink * s * 1.2); c.globalAlpha = 1 - sink * .5; }
          tdCastle(c, cx, cy, s, frac, t, M.th.roof, mapI === NM - 1); if (!sink || sink < .6) tdQueen(c, cx, cy - 1.18 * s, .62 * s, t, mood);
          if (sink) { c.restore(); c.globalAlpha = 1; }
          for (let i = 0; i < 4; i++) { const k = i < 2 ? -1 : 1, far = i % 2; tdVillager(c, cx + k * (.56 + far * .72) * s, cy + (1.3 - far * .08) * s, .44 * s, VIL[(i + mapI) % VIL.length], t, phase === 'lost' ? 0 : cheer > 0 ? 1 : 0, i * .31 + .1); }
        }
      }
      for (const f of foes) if (f.F.fly) drawF(f);
      for (const sh of shots) drawShot(c, sh); for (const e of fx) drawFx(c, e); pr.draw(c);
      if (rain > 0) { c.strokeStyle = '#3a2a1a'; c.lineWidth = Math.max(1.5, s * .04); c.beginPath(); const bw = L.gc * s, bh = L.gr * s; for (let i = 0; i < 46; i++) { const u = ((1 - rain) * 1.6 + i * .137) % 1, px = ox + ((i * 97) % 100) / 100 * bw + u * s * .8 - s * .4, py = oy - s + u * (bh + s); c.moveTo(px, py); c.lineTo(px - s * .14, py - s * .4); } c.stroke(); }
      // vie du château, bulle de la reine
      if (phase !== 'lost') { const w = 2.1 * s, h = Math.max(9, s * .2), bx = cx - w / 2, yy = cy + 1.36 * s - h / 2 + (tr ? -.04 : 0) * s, fr = hp / HPMAX; c.fillStyle = '#1b1540'; Draw.rr(c, bx - 2, yy - 2, w + 4, h + 4, h / 2 + 2); c.fill(); c.fillStyle = fr > .5 ? '#7be04a' : fr > .25 ? '#ffd23f' : '#ff5a4f'; Draw.rr(c, bx, yy, Math.max(h, w * fr), h, h / 2); c.fill(); Draw.heart(c, bx - h * .2, yy - h * .45, h * 1.7, true); txt(c, hp + '/' + HPMAX, cx + h * .4, yy + h / 2 + .5, Math.max(9, h * 1.05), '#fff'); }
      if (bubbleT > 0 && phase === 'play') { c.globalAlpha = clamp(bubbleT * 3, 0, 1); drawBubble(c, bubble, cx, cy - 2.05 * s, clamp(s * .3, 11, 15)); c.globalAlpha = 1; }
      if (msg && phase !== 'cleared' && phase !== 'choice') drawBanner(c);
      if (phase === 'cleared') drawCleared(c); else if (phase === 'choice') drawChoice(c); else drawUI(c);
    }
    function drawBanner(c) {
      const a = clamp(Math.min(msg.t * 5, (msg.T - msg.t) * 3), 0, 1), cxm = L.ax + L.aw / 2, two = !!msg.b, s1 = 17, s2 = 12.5, maxW = Math.min(L.aw - 16, 400), lines = two ? wrap(c, msg.b, maxW - 24 - (msg.foe ? 44 : 0), s2, 700) : [];
      c.font = '900 ' + s1 + 'px ' + FONT; let w = c.measureText(msg.a).width; c.font = '700 ' + s2 + 'px ' + FONT; for (const l of lines) w = Math.max(w, c.measureText(l).width); w = Math.min(maxW, w + 28 + (msg.foe ? 44 : 0));
      const h = 14 + s1 + lines.length * (s2 + 4) + (two ? 4 : 0), x = cxm - w / 2, y = L.ay + 8 - (1 - a) * 12; c.globalAlpha = a; c.fillStyle = 'rgba(27,21,64,.92)'; Draw.rr(c, x, y, w, h, 12); c.fill();
      const tx = cxm + (msg.foe ? 20 : 0); if (msg.foe) tdFoe(c, { k: msg.foe, ph: t * 8, hit: 0, slow: 0, hp: 1, max: 1, icon: true }, x + 26, y + h / 2 + (msg.foe === 'bat' ? 12 : 0), msg.foe === 'boss' ? 34 : 50, 1);
      txt(c, msg.a, tx, y + 8 + s1 / 2, s1, '#ffd23f'); lines.forEach((l, i) => txt(c, l, tx, y + 14 + s1 + i * (s2 + 4) + s2 / 2, s2, '#fff', 'center', 700)); c.globalAlpha = 1;
    }
    function drawUI(c) {
      const W = env.W, H = env.H, nw = M.waves.length;
      if (L.land) { c.fillStyle = '#1b1540'; c.fillRect(W - L.pw, 0, L.pw, H); c.fillStyle = '#2b2270'; c.fillRect(W - L.pw, 0, 3, H); const x0 = W - L.pw + 12; coin(c, x0 + 9, 16, 9); txt(c, String(gold), x0 + 24, 17, 17, '#ffd23f', 'left'); Draw.heart(c, W - 62, 8, 17, true); txt(c, String(hp), W - 12, 17, 17, '#fff', 'right'); txt(c, (mapI + 1) + '. ' + M.n, x0, 39, 12, '#b9b0e6', 'left', 800); txt(c, 'Vague ' + Math.min(nw, wave + 1) + '/' + nw, W - 12, 39, 12, '#fff', 'right', 800); }
      else { c.fillStyle = '#1b1540'; c.fillRect(0, 0, W, L.topH); c.fillRect(0, H - L.barH, W, L.barH); c.fillStyle = '#2b2270'; c.fillRect(0, L.topH - 3, W, 3); c.fillRect(0, H - L.barH, W, 3); const y = L.topH / 2 - 1; coin(c, 18, y, 9); txt(c, String(gold), 32, y + 1, 17, '#ffd23f', 'left'); Draw.heart(c, 96, y - 9, 17, true); txt(c, hp + '/' + HPMAX, 109, y + 1, 15, '#fff', 'left'); txt(c, 'Vague ' + Math.min(nw, wave + 1) + '/' + nw, W - 10, y + 1, 13, '#fff', 'right', 800); txt(c, (mapI + 1) + '. ' + M.n, W - 86, y + 1, 12, '#b9b0e6', 'right', 800); }
      for (const b of btns) {
        const { x, y, w, h } = b, mx = x + w / 2, my = y + h / 2;
        if (b.k) { // bouton d'une tour : dessin de la tour, nom, prix
          const T = TD_TOWERS[b.k], on = sel === b.k && !selTower, ok = gold >= T.cost; c.fillStyle = on ? '#4b3fa3' : '#2b2270'; Draw.rr(c, x, y, w, h, 10); c.fill(); if (on) { c.strokeStyle = '#ffd23f'; c.lineWidth = 2.5; Draw.rr(c, x + 1.5, y + 1.5, w - 3, h - 3, 9); c.stroke(); }
          if (b.col) { const is = Math.min((h - 38) / 1.3, 40); c.globalAlpha = ok ? 1 : .45; tdTower(c, b.k, 1, mx, y + 4 + .85 * is, is, -.6, 0, t, true); c.globalAlpha = 1; txt(c, T.n, mx, y + h - 25, 12, '#fff', 'center', 800); coin(c, mx - 14, y + h - 10, 6); txt(c, String(T.cost), mx - 4, y + h - 9.5, 12, ok ? '#ffd23f' : '#ff6a55', 'left'); }
          else { const is = Math.min(h * .62, w * .42); c.globalAlpha = ok ? 1 : .45; tdTower(c, b.k, 1, x + is * .62, my + is * .22, is, -.6, 0, t, true); c.globalAlpha = 1; const tx = x + is * 1.12 + (w - is * 1.12) / 2 - 2; txt(c, T.n, tx, my - 9, w < 84 ? 11.5 : 13, '#fff', 'center', 800); coin(c, tx - 13, my + 11, 6); txt(c, String(T.cost), tx - 4, my + 11.5, 13, ok ? '#ffd23f' : '#ff6a55', 'left'); }
        } else if (b.id === 'info') { const tw = selTower, T = TD_TOWERS[tw.k], is = Math.min(h * .62, 44); c.fillStyle = '#2b2270'; Draw.rr(c, x, y, w, h, 10); c.fill(); tdTower(c, tw.k, tw.lvl, x + is * .62, my + is * .2, is, -.6, 0, t, true); const tx = x + is * 1.25; txt(c, T.n, tx, my - 11, 14, '#fff', 'left'); txt(c, 'Niveau ' + tw.lvl + (tw.lvl >= 3 ? ' (max)' : ''), tx, my + 5, 11.5, '#ffd23f', 'left', 800); if (h > 50 && w > 150) { const l = wrap(c, T.d, w - is * 1.25 - 6, 10.5, 700); txt(c, l[0], tx, my + 20, 10.5, '#b9b0e6', 'left', 700); } }
        else if (b.id === 'up') { const tw = selTower, max = tw.lvl >= 3, cost = max ? 0 : tdUpCost(tw.k, tw.lvl), ok = !max && gold >= cost; c.fillStyle = max ? '#2b2270' : ok ? '#7be04a' : '#4b5a45'; Draw.rr(c, x, y, w, h, 10); c.fill(); if (max) txt(c, 'Niveau max', mx, my, 12, '#b9b0e6', 'center', 800); else { txt(c, 'Améliorer', mx, my - 10, 13.5, ok ? '#1b1540' : '#c9d6c2'); coin(c, mx - 15, my + 11, 6.5); txt(c, String(cost), mx - 5, my + 11.5, 14, ok ? '#1b1540' : '#ff9a8a', 'left'); } }
        else if (b.id === 'sell') { const back = Math.round(selTower.spent * SELL); c.fillStyle = '#ff9f1c'; Draw.rr(c, x, y, w, h, 10); c.fill(); txt(c, 'Vendre', mx, my - 10, 13.5, '#1b1540'); coin(c, mx - 17, my + 11, 6.5); txt(c, '+' + back, mx - 7, my + 11.5, 14, '#1b1540', 'left'); }
        else if (b.id === 'go') { const pulse = !inWave && (tuto ? 0 : 1) ? 1 + Math.sin(t * 5) * .015 : 1; c.fillStyle = inWave ? '#2b2270' : '#7be04a'; Draw.rr(c, x, y, w, h, 12); c.fill(); if (!inWave) { c.fillStyle = 'rgba(255,255,255,.25)'; Draw.rr(c, x + 4, y + 3, w - 8, h * .38, 9); c.fill(); }
          if (inWave) { txt(c, 'Vague ' + (wave + 1) + ' en cours', mx, my - 8, 13.5, '#fff', 'center', 800); txt(c, 'Encore ' + (foes.length + queue.length) + ' ennemi' + (foes.length + queue.length > 1 ? 's' : ''), mx, my + 10, 11.5, '#b9b0e6', 'center', 700); }
          else { txt(c, '▶ Lancer la vague', mx, my - (tuto ? 0 : 7), 15.5 * pulse, '#1b1540'); if (!tuto) txt(c, 'Départ dans ' + Math.ceil(countdown) + ' s', mx, my + 12, 11.5, '#24531a', 'center', 800); } }
        else if (b.id === 'spd') { const on = speed === 2; c.fillStyle = on ? '#ffd23f' : '#2b2270'; Draw.rr(c, x, y, w, h, 10); c.fill(); txt(c, on ? '×2' : '×1', mx, my - 6, 18, on ? '#1b1540' : '#fff'); txt(c, 'Vitesse', mx, my + 13, 10, on ? '#1b1540' : '#b9b0e6', 'center', 800); }
        else if (b.id === 'pow') { const ready = power <= 0; c.fillStyle = ready ? '#e0489a' : '#2b2270'; Draw.rr(c, x, y, w, h, 10); c.fill(); if (!ready) { c.fillStyle = '#4b3fa3'; Draw.rr(c, x, y, Math.max(20, w * (1 - power / POWER_CD)), h, 10); c.fill(); }
          const ix = x + 20, iy = my; tdPoly(c, [ix - 11, iy + 7, ix - 13, iy - 8, ix - 6, iy - 1, ix, iy - 11, ix + 6, iy - 1, ix + 13, iy - 8, ix + 11, iy + 7], ready ? '#ffd23f' : '#8d86b8'); tdDisc(c, ix, iy + 2, 2, ready ? '#e8452c' : '#5a5290');
          const tx = x + 36 + (w - 36) / 2; if (ready) { txt(c, 'Pluie de', tx, my - 7, 11.5, '#fff', 'center', 800); txt(c, 'flèches', tx, my + 7, 11.5, '#fff', 'center', 800); } else { txt(c, Math.ceil(power) + ' s', tx, my, 15, '#fff'); } }
      }
      if (tuto && phase === 'play' && !msg) { const y = L.land ? env.H - 26 : L.ay + L.ah - 22, s1 = 'Tape une case qui clignote pour poser une tour'; c.font = '800 13px ' + FONT; const w = Math.min(L.aw - 12, c.measureText(s1).width + 24); c.fillStyle = 'rgba(27,21,64,.92)'; Draw.rr(c, L.ax + L.aw / 2 - w / 2, y - 14, w, 28, 12); c.fill(); txt(c, s1, L.ax + L.aw / 2, y + 1, 13, '#fff', 'center', 800); }
    }
    function drawChoice(c) { // au lancement suivant une défaite : reprendre à la carte perdue ou tout recommencer
      const W = env.W, H = env.H, G = choiceGeom(), { x, y, pw, ph } = G, m = TD_CHECK ? TD_CHECK.m : 0;
      c.fillStyle = 'rgba(20,14,50,.6)'; c.fillRect(0, 0, W, H); c.fillStyle = '#ffd23f'; Draw.rr(c, x - 3, y - 3, pw + 6, ph + 6, 21); c.fill(); c.fillStyle = '#231a5c'; Draw.rr(c, x, y, pw, ph, 18); c.fill();
      const top = y + 14, zone = btns[0].y - top - 6, qh = Math.min(zone, 110); tdQueen(c, x + pw * .16, top + zone / 2 + qh / 2, qh, t, '');
      const tx = x + pw * .3, tw = pw * .66; txt(c, 'On retente ?', tx + tw / 2, top + zone * .24, clamp(pw * .06, 17, 24), '#ffd23f');
      wrap(c, 'La reine a encore besoin de toi à ' + TD_MAPS[m].n + '.', tw, 13, 700).forEach((l, i) => txt(c, l, tx + tw / 2, top + zone * .24 + 28 + i * 17, 13, '#fff', 'center', 700));
      btns.forEach((b, i) => { c.fillStyle = i ? '#4b3fa3' : '#7be04a'; Draw.rr(c, b.x, b.y, b.w, b.h, 12); c.fill(); const fs = clamp(b.w * .045, 12.5, 16); if (i) txt(c, 'Recommencer à la carte 1', b.x + b.w / 2, b.y + b.h / 2 + 1, fs, '#fff'); else { txt(c, '▶ Reprendre à la carte ' + (m + 1), b.x + b.w / 2, b.y + b.h / 2 - 8, fs, '#1b1540'); txt(c, 'le score repart de zéro', b.x + b.w / 2, b.y + b.h / 2 + 11, 11, '#24531a', 'center', 800); } });
    }
    function drawCleared(c) {
      const W = env.W, H = env.H, G = clearedGeom(), a = clamp(phT * 3, 0, 1), { x, y, pw, ph } = G, u = ph / 430;
      c.fillStyle = 'rgba(20,14,50,' + (.6 * a) + ')'; c.fillRect(0, 0, W, H);
      c.save(); c.translate(W / 2, H / 2); const k = .85 + .15 * a - Math.max(0, .5 - Math.abs(phT - .25)) * 0; c.scale(k, k); c.translate(-W / 2, -H / 2); c.globalAlpha = a;
      c.fillStyle = '#ffd23f'; Draw.rr(c, x - 3, y - 3, pw + 6, ph + 6, 21); c.fill(); c.fillStyle = '#231a5c'; Draw.rr(c, x, y, pw, ph, 18); c.fill();
      c.fillStyle = '#2f2478'; Draw.rr(c, x, y, pw, ph * .19, 18); c.fill(); c.fillRect(x, y + ph * .1, pw, ph * .09);
      txt(c, recap.last ? 'Tout le royaume est sauvé !' : 'Royaume sauvé !', W / 2, y + ph * .075, clamp(Math.min(ph * .075, pw * (recap.last ? .062 : .085)), 16, 30), '#ffd23f');
      for (let i = 0; i < NM; i++) { const dx = W / 2 + (i - (NM - 1) / 2) * 22, dy = y + ph * .152; tdDisc(c, dx, dy, 6.5, i <= mapI ? '#7be04a' : '#4b3fa3'); if (i <= mapI) { c.strokeStyle = '#1b1540'; c.lineWidth = 2; c.beginPath(); c.moveTo(dx - 3, dy); c.lineTo(dx - .8, dy + 2.4); c.lineTo(dx + 3.4, dy - 2.6); c.stroke(); } }
      // de bas en haut : bouton, récapitulatif, foule ; la reine et sa bulle prennent la place qui reste
      const rh = clamp(ph * .105, 34, 46), ry = G.by - 8 - rh, vh = clamp(ph * .115, 30, 50), vy = ry - 5, zt = y + ph * .19 + 8, zb = vy - vh * 1.32, zh = zb - zt;
      const qh = zh * .96, qx = x + pw * .17, qy = zb; tdOval(c, qx, qy, qh * .3, qh * .06, 'rgba(0,0,0,.3)'); tdQueen(c, qx, qy, qh, t, 'cheer');
      const bx = x + pw * .34, bw = pw * .62, bh = zh * .8, by = zt + zh * .06, fs = clamp(Math.min(bw * .062, bh * .2), 11.5, 16), lines = wrap(c, M.merci, bw - 22, fs, 800);
      c.fillStyle = '#fff'; Draw.rr(c, bx, by, bw, bh, 14); c.fill(); tdPoly(c, [bx + 2, by + bh * .4, bx - 14, by + bh * .55, bx + 2, by + bh * .7], '#fff');
      lines.forEach((l, i) => txt(c, l, bx + bw / 2, by + bh / 2 + (i - (lines.length - 1) / 2) * (fs + 4), fs, '#231a5c', 'center', 800));
      const n = Math.max(5, Math.min(9, Math.floor(pw / 46))); for (let i = 0; i < n; i++) tdVillager(c, x + pw * (.09 + .82 * i / (n - 1)), vy, vh * (i % 2 ? 1 : .88), VIL[i % VIL.length], t, 1, i * .37 + .05);
      const cw = (pw - 36 - 16) / 3; [[String(recap.kills), 'ennemis vaincus'], [recap.hp + '/' + HPMAX, 'vie du château'], ['+' + recap.bonus, 'points bonus']].forEach((r, i) => { const rx = x + 18 + i * (cw + 8); c.fillStyle = '#2f2478'; Draw.rr(c, rx, ry, cw, rh, 9); c.fill(); txt(c, r[0], rx + cw / 2, ry + rh * .34, clamp(rh * .4, 13, 18), '#ffd23f'); txt(c, r[1], rx + cw / 2, ry + rh * .76, clamp(cw * .09, 8.5, 11), '#b9b0e6', 'center', 800); });
      const ok = phT > .8; c.fillStyle = ok ? '#7be04a' : '#4b5a45'; Draw.rr(c, G.bx, G.by, G.bw, G.bh, 12); c.fill(); if (ok) { c.fillStyle = 'rgba(255,255,255,.25)'; Draw.rr(c, G.bx + 4, G.by + 3, G.bw - 8, G.bh * .38, 9); c.fill(); }
      txt(c, recap.last ? 'Voir mon score ▶' : 'Carte suivante : ' + TD_MAPS[mapI + 1].n + ' ▶', W / 2, G.by + G.bh / 2 + 1, clamp(G.bw * .047, 13, 17), '#1b1540');
      c.restore(); c.globalAlpha = 1;
      for (const q of confetti) { c.save(); c.translate(q.x, q.y); c.rotate(q.a); c.fillStyle = q.c; c.fillRect(-4, -2.5, 8, 5); c.restore(); }
    }

    /* ----- Démarrage ou reprise d'une partie sauvegardée (on reprend au début de la vague en cours) ----- */
    if (saved && typeof saved.m === 'number' && TD_MAPS[saved.m]) {
      setupMap(saved.m, saved.gold | 0); wave = clamp(saved.w | 0, 0, M.waves.length - 1); hp = clamp(saved.hp | 0, 1, HPMAX); score = saved.score | 0; kills = saved.kills | 0; mapKills = saved.mk | 0; power = saved.pw | 0; tuto = false;
      for (const w of saved.tw || []) if (TD_TOWERS[w[2]] && canBuild(w[0], w[1])) { const lvl = clamp(w[3] | 0, 1, 3); let spent = TD_TOWERS[w[2]].cost; for (let l = 1; l < lvl; l++) spent += tdUpCost(w[2], l); towers.push({ x: w[0], y: w[1], k: w[2], lvl, cd: .2, kick: 0, ax: 1, ay: 0, aim: null, spent, born: -9 }); }
      countdown = 30; banner('Partie reprise', M.n + ' · vague ' + (wave + 1), 3);
    } else { setupMap(0, startGoldOf(0, 0)); if (TD_CHECK && env.profile && TD_CHECK.pid === env.profile.id && TD_CHECK.m > 0) { phase = 'choice'; msg = null; bubbleT = 0; } else { TD_CHECK = null; persist(); } }
    layout();

    // Pour les tests automatiques : état du jeu et commandes directes (cases en coordonnées logiques).
    const dbg = () => ({
      phase, map: mapI, maps: NM, mapName: M.n, wave, waves: M.waves.length, inWave, gold, hp, hpMax: HPMAX, score, kills, power, speed, over, countdown,
      towers: towers.map(w => ({ x: w.x, y: w.y, k: w.k, lvl: w.lvl })), foes: foes.length, foeList: foes.map(f => ({ k: f.k, x: f.x, y: f.y, hp: f.hp })), queue: queue.length,
      cell, ox, oy, tr, cols, rows, land: L.land, btns: btns.map(b => ({ id: b.id, x: b.x, y: b.y, w: b.w, h: b.h })),
      path: Array.from(pathSet).map(k => k.split(',').map(Number)).filter(p => p[0] >= 0),
      air: (() => { const o = []; for (let d = 2.5; d < aRoute.total - 1; d += 1) { const p = routeAt(aRoute, d); o.push([p[0], p[1]]); } return o; })(),
      free: (() => { const o = []; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (canBuild(x, y)) o.push([x, y]); return o; })(),
      cellXY: (x, y) => ({ x: X(x, y), y: Y(x, y) }), costs: { arc: 50, canon: 90, glace: 70, mage: 120 }, upCost: tdUpCost,
      place: (k, x, y) => place(k, x, y), upgrade: (x, y) => upgrade(towerAt(x, y)), sell: (x, y) => sellTower(towerAt(x, y)), select: (x, y) => { selTower = towerAt(x, y) || null; },
      choose, startWave, usePower, nextMap: () => { phT = 9; nextMap(); },
      step: (dt, n) => { quiet = true; for (let i = 0; i < n && !over && phase !== 'cleared'; i++) sim(dt); quiet = false; }, // avance vite, sans dessin ni son
      goMap: i => { setupMap(i, startGoldOf(i, 0)); }, setGold: g => { gold = g; }, setWave: n => { wave = clamp(n, 0, M.waves.length - 1); inWave = false; foes = []; queue = []; }, setHp: v => { hp = v; },
      winMap: () => { foes = []; queue = []; shots = []; inWave = false; wave = M.waves.length; mapCleared(); }, lose: () => { hitCastle({ F: { dmg: 99 }, dead: false }); }
    });
    return { update, draw, resize: () => { bgKey = ''; layout(); }, dbg };
  }
});
