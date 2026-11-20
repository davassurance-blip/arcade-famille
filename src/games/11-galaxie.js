/* ===== Galaxie (dès 8 ans) — shoot'em up vertical à la 1942 / Raiden / Sky Force =====
   Cinq mondes qui défilent (Océan, Désert, Ville de nuit, Orage, Espace). L'avion se promène dans tout l'écran et tire tout seul.
   Chaque monde est un petit scénario écrit à la main : formations volantes (courbes, piqués, boucles, par les côtés, par derrière),
   ennemis au sol qui font partie du décor (bateaux, chars, tourelles…), un mini-boss au milieu et un gros boss à la fin.
   Toute la logique vit en « pixels logiques » : un téléphone en portrait fait 390 de large ; l'écran réel n'est qu'un zoom (u).
   On peut donc tourner l'appareil en pleine partie, et simuler le jeu sans dessiner (robots de test et d'équilibrage). */

// Trajectoires des formations : points de passage [x, y] en fractions de la zone de jeu (x < 0 ou > 1 = hors écran sur le côté,
// y < 0 = au-dessus, y > 1 = derrière le joueur). Les noms en « L » ont un miroir automatique en « R ».
const GX_PATHS = {
  sL: [[.12, -.1], [.2, .22], [.8, .4], [.78, .62], [.2, .74], [.12, 1.15]],           // grand S
  arcL: [[-.15, .08], [.25, .3], [.7, .42], [1.2, .28]],                               // traverse en arc depuis le côté
  loopL: [[.22, -.1], [.25, .42], [.5, .62], [.75, .42], [.5, .22], [.26, .42], [.34, 1.15]], // boucle complète
  vL: [[.08, -.1], [.3, .5], [.52, .62], [.72, .3], [.9, -.15]],                       // descend puis remonte
  backL: [[.14, 1.12], [.16, .62], [.45, .3], [.85, .16], [1.2, .1]],                  // arrive par derrière
  sideL: [[-.15, .5], [.3, .46], [.62, .26], [.4, .12], [-.2, .1]],                    // entre par le côté, demi-tour
  zigL: [[.2, -.1], [.75, .18], [.25, .4], [.75, .62], [.3, .85], [.5, 1.15]],         // zigzag
  ringL: [[.5, -.1], [.2, .25], [.5, .5], [.8, .25], [.5, .08], [.2, .25], [.5, .5], [.8, .25], [1.2, .1]] // cercle
};
const gxPath = n => n.endsWith('R') ? GX_PATHS[n.slice(0, -1) + 'L'].map(p => [1 - p[0], p[1]]) : GX_PATHS[n];

// Ennemis volants. hp = points de vie, r = rayon de collision, sp = vitesse, med = médailles lâchées, fire = façon de tirer.
const GX_AIR = {
  fig: { hp: 1, r: 13, pts: 100, sp: 135, med: 1, fire: 'aim', cd: [2.5, 5], w: 36, h: 34 },      // chasseur léger : la « chair à canon »
  dart: { hp: 1, r: 10, pts: 150, sp: 150, med: 1, w: 22, h: 28 },                                  // piqueur : vise puis fonce
  gun: { hp: 9, r: 19, pts: 500, sp: 110, med: 3, fire: 'aim3', cd: [2.2, 3.2], w: 46, h: 50 },    // hélico : se poste et tire
  bomb: { hp: 22, r: 27, pts: 1000, sp: 40, med: 5, fire: 'fan', cd: [2.8, 3.6], w: 88, h: 66 },   // gros bombardier : lâche une capsule
  rock: { hp: 5, r: 17, pts: 150, sp: 70, med: 1, w: 40, h: 40 },                                   // astéroïde
  mis: { hp: 2, r: 8, pts: 80, sp: 105, med: 0, w: 14, h: 26 }                                      // missile à tête chercheuse (destructible)
};
// Ennemis au sol : ils défilent avec le décor (rel = vitesse propre, ex. un bateau qui avance), tur = positions des tourelles.
const GX_GND = {
  boat: { hp: 5, r: 15, pts: 300, med: 2, fire: 'aim', cd: [2.6, 3.8], rel: -14, tur: [[0, -6]], w: 30, h: 78 },
  destroyer: { hp: 16, r: 21, pts: 800, med: 4, fire: 'aim', cd: [1.9, 2.7], rel: -18, tur: [[0, -26], [0, 22]], w: 40, h: 128 },
  sub: { hp: 7, r: 14, pts: 600, med: 3, fire: 'aim3', cd: [1.6, 2.2], rel: -8, tur: [], sub: 1, w: 30, h: 84 },
  tank: { hp: 6, r: 15, pts: 300, med: 2, fire: 'aim', cd: [2.4, 3.4], rel: 0, tur: [[0, 0]], roam: 20, w: 34, h: 38 },
  bunker: { hp: 12, r: 17, pts: 600, med: 3, fire: 'aim3', cd: [2.6, 3.4], rel: 0, tur: [[0, 0]], big: 1, w: 42, h: 42 },
  balloon: { hp: 9, r: 18, pts: 500, med: 3, fire: 'aim', cd: [2.2, 3], rel: 0, tur: [[0, 12]], w: 44, h: 60, sway: 1 }
};

// Scénarios. Chaque ligne : [délai en secondes depuis la ligne précédente, action, action…].
// a(type, trajectoire, nombre, options) = formation volante ; g(type, x, options) = ennemi au sol ; s(décor, x) = élément de décor.
// Options utiles : cap (capsule lâchée si toute la formation est détruite), fx / fy (position), dy (décalage vers le haut).
const gxa = (t, p, n, o) => ['a', t, p, n || 1, o || {}], gxg = (t, x, o) => ['g', t, x, o || {}], gxs = (k, x) => ['s', k, x];
const GX_WORLDS = (() => {
  const a = gxa, g = gxg, s = gxs, MID = ['mid'], BOSS = ['boss'];
  return [
    {
      n: 'Océan', key: 'ocean', style: 'prop', shadow: 1, mid: 'carrier', boss: 'cuirasse', pal: { a: '#e5484d', b: '#8f1d2c', c: '#fff1d6' }, gpal: { a: '#8d99ae', b: '#4a5568', c: '#d9534f' },
      script: [
        [2, a('fig', 'sL', 5)], [4, a('fig', 'sR', 5)], [3.5, g('boat', .3)], [2, a('fig', 'arcL', 5)], [1.5, s('isle', .82)],
        [2, a('fig', 'arcR', 5, { cap: 'P' })], [3, g('boat', .7), g('boat', .22, { dy: 80 })], [3, a('fig', 'loopL', 6, { cap: 'sh' })], [2, s('isle', .14)],
        [3, a('dart', 'dive', 3)], [2.5, g('destroyer', .5)], [3, a('fig', 'vL', 4), a('fig', 'vR', 4, { cap: 'auto' })],
        [4, a('bomb', 'down', 1, { fx: .5 })], [2.5, g('sub', .3)], [3, a('fig', 'sL', 6), g('boat', .76)],
        [4.5, MID],
        [2, a('fig', 'loopR', 6, { cap: 'auto' })], [3, g('sub', .7), g('boat', .25)], [3, a('gun', 'hover', 1, { fx: .3 }), a('gun', 'hover', 1, { fx: .7 })],
        [4, a('fig', 'backL', 4)], [3, a('dart', 'dive', 4), s('isle', .5)], [3, g('destroyer', .3), g('destroyer', .72, { dy: 130 })],
        [3.5, a('fig', 'zigL', 6), a('fig', 'arcR', 5, { cap: 'B' })], [5.5, BOSS]
      ]
    },
    {
      n: 'Désert', key: 'desert', style: 'prop', shadow: 1, mid: 'scorpion', boss: 'forteresse', pal: { a: '#3f7d5a', b: '#1f4030', c: '#ffd23f' }, gpal: { a: '#7d8a55', b: '#454f2c', c: '#e07b39' },
      script: [
        [2, a('fig', 'zigL', 6)], [3, g('tank', .3), g('tank', .68, { dy: 60 })], [3, a('fig', 'sR', 6, { cap: 'auto' })], [2.5, g('bunker', .5)],
        [2.5, a('dart', 'dive', 4)], [3, a('fig', 'loopL', 6), g('tank', .8)], [3.5, a('gun', 'hover', 1, { fx: .5 })], [2, g('bunker', .2), g('bunker', .8)],
        [3.5, a('fig', 'sideL', 5), a('fig', 'sideR', 5, { cap: 'auto' })], [3.5, g('tank', .4), g('tank', .6, { dy: 50 }), g('tank', .25, { dy: 120 })],
        [3, a('bomb', 'down', 1, { fx: .35 })], [3, a('fig', 'backR', 5)], [3, a('dart', 'dive', 5), g('bunker', .65)],
        [4.5, MID],
        [2, a('fig', 'ringL', 7, { cap: 'auto' })], [3.5, g('tank', .2), g('bunker', .5), g('tank', .8)], [3, a('gun', 'hover', 1, { fx: .25 }), a('gun', 'hover', 1, { fx: .75 })],
        [4, a('fig', 'vL', 5), a('fig', 'vR', 5)], [3.5, a('bomb', 'down', 1, { fx: .65 }), g('tank', .3)], [3.5, a('fig', 'backL', 4), a('fig', 'backR', 4)],
        [3.5, g('bunker', .3), g('bunker', .7), a('dart', 'dive', 4)], [3.5, a('fig', 'zigR', 7, { cap: 'auto' })], [5.5, BOSS]
      ]
    },
    {
      n: 'Ville de nuit', key: 'city', style: 'jet', shadow: 1, mid: 'ailenoire', boss: 'cyclone', pal: { a: '#ff5fa2', b: '#8a1f5c', c: '#ffe45c' }, gpal: { a: '#5a6b96', b: '#2c3654', c: '#38e0d6' },
      script: [
        [2, a('fig', 'arcL', 6), a('fig', 'arcR', 6)], [3.5, g('bunker', .26), g('bunker', .74)], [3, a('fig', 'loopR', 7, { cap: 'auto' })], [3, a('dart', 'dive', 5)],
        [2.5, g('tank', .5), g('tank', .15, { dy: 70 })], [3, a('gun', 'hover', 1, { fx: .3 }), a('gun', 'hover', 1, { fx: .7 })], [4, a('fig', 'zigL', 7)],
        [3, g('bunker', .5), a('fig', 'backL', 5)], [3.5, a('bomb', 'down', 1, { fx: .3 }), a('bomb', 'down', 1, { fx: .7, delay: 2.5 })],
        [5, a('fig', 'ringR', 8, { cap: 'auto' })], [3.5, g('tank', .3), g('tank', .7), a('dart', 'dive', 5)],
        [4.5, MID],
        [2, a('fig', 'sL', 7), a('fig', 'sR', 7, { cap: 'auto' })], [4, g('bunker', .2), g('bunker', .5, { dy: 60 }), g('bunker', .8)],
        [3.5, a('gun', 'hover', 1, { fx: .5 }), a('fig', 'sideL', 5), a('fig', 'sideR', 5)], [4, a('dart', 'dive', 6)], [3, a('fig', 'backL', 5), a('fig', 'backR', 5)],
        [3.5, a('bomb', 'down', 1, { fx: .5 }), g('tank', .25), g('tank', .75)], [4, a('fig', 'loopL', 7), a('fig', 'loopR', 7, { cap: 'B' })], [6, BOSS]
      ]
    },
    {
      n: 'Orage', key: 'storm', style: 'jet', shadow: 0, bolts: 1, mid: 'zeppelin', boss: 'tonnerre', pal: { a: '#ffb347', b: '#a8501a', c: '#ffffff' }, gpal: { a: '#9aa3c0', b: '#4f587a', c: '#ff4f9a' },
      script: [
        [2, a('fig', 'zigL', 7), a('fig', 'zigR', 7)], [3.5, g('balloon', .3), g('balloon', .7)], [3, a('dart', 'dive', 6)], [3, a('fig', 'ringL', 8, { cap: 'auto' })],
        [3.5, a('gun', 'hover', 1, { fx: .22 }), a('gun', 'hover', 1, { fx: .5, fy: .16 }), a('gun', 'hover', 1, { fx: .78 })], [4.5, g('balloon', .5), a('fig', 'backL', 5)],
        [3.5, a('bomb', 'down', 1, { fx: .5 }), a('fig', 'arcL', 6)], [4, g('balloon', .2), g('balloon', .8), a('dart', 'dive', 5)], [3.5, a('fig', 'sL', 7), a('fig', 'sR', 7, { cap: 'auto' })],
        [5, MID],
        [2, a('fig', 'loopL', 8), a('fig', 'sideR', 6)], [3.5, g('balloon', .35), g('balloon', .65, { dy: 60 })], [3, a('dart', 'dive', 7), a('gun', 'hover', 1, { fx: .5 })],
        [4, a('fig', 'backL', 5), a('fig', 'backR', 5, { cap: 'auto' })], [3.5, a('bomb', 'down', 1, { fx: .28 }), a('bomb', 'down', 1, { fx: .72 })],
        [5, a('fig', 'ringR', 8), g('balloon', .5)], [3.5, a('fig', 'vL', 6), a('fig', 'vR', 6), a('dart', 'dive', 5)], [4, a('fig', 'zigL', 8, { cap: 'auto' })], [6, BOSS]
      ]
    },
    {
      n: 'Espace', key: 'space', style: 'alien', shadow: 0, mid: 'croiseur', boss: 'noyau', pal: { a: '#9dff5c', b: '#2f8f3a', c: '#ff4f9a' }, gpal: { a: '#8f9bb8', b: '#454e6b', c: '#9dff5c' },
      script: [
        [2, a('rock', 'drift', 5)], [3, a('fig', 'ringL', 8)], [3, g('bunker', .3), g('bunker', .7)], [3, a('fig', 'sL', 7), a('fig', 'sR', 7, { cap: 'auto' })],
        [3.5, a('rock', 'drift', 6), a('dart', 'dive', 6)], [3.5, a('gun', 'hover', 1, { fx: .25 }), a('gun', 'hover', 1, { fx: .75 }), g('bunker', .5)],
        [4, a('fig', 'backL', 6), a('fig', 'backR', 6)], [3.5, a('bomb', 'down', 1, { fx: .5 }), a('rock', 'drift', 5)], [4, a('fig', 'loopL', 8), a('fig', 'loopR', 8, { cap: 'auto' })],
        [4, g('bunker', .2), g('bunker', .5, { dy: 70 }), g('bunker', .8), a('dart', 'dive', 6)],
        [5, MID],
        [2, a('rock', 'drift', 8)], [3, a('fig', 'zigL', 8), a('fig', 'zigR', 8, { cap: 'auto' })], [4, a('gun', 'hover', 1, { fx: .2 }), a('gun', 'hover', 1, { fx: .5, fy: .15 }), a('gun', 'hover', 1, { fx: .8 })],
        [4.5, a('bomb', 'down', 1, { fx: .3 }), a('bomb', 'down', 1, { fx: .7 }), g('bunker', .5)], [5, a('fig', 'sideL', 7), a('fig', 'sideR', 7), a('dart', 'dive', 6)],
        [4, a('fig', 'ringL', 8), a('fig', 'ringR', 8), a('rock', 'drift', 5)], [4, a('fig', 'backL', 6), a('fig', 'backR', 6, { cap: 'B' })], [6, BOSS]
      ]
    }
  ];
})();

// Boss et mini-boss. Chacun a une coque (dessinée une fois) et des « points faibles » : tourelles (gun, big), moteurs (eng), cœur (core).
// La barre de vie est la somme de tout ; tirer sur le cœur tant qu'il reste des tourelles fait moins mal (il est blindé).
// atk = attaques du cœur pour chaque phase (la phase monte quand la barre descend).
const GX_PART = { gun: { hp: 12, r: 13 }, big: { hp: 24, r: 17 }, eng: { hp: 20, r: 15 }, core: { hp: 90, r: 22 } };
const GX_BOSS = {
  carrier: { name: 'PORTE-AVIONS', mini: 1, ground: 1, w: 100, h: 300, fy: .38, sway: .2, parts: [{ k: 'gun', x: -28, y: -90 }, { k: 'gun', x: -28, y: 80 }, { k: 'core', x: 30, y: -6, r: 18, hp: 55 }], atk: [['summon', 'burst'], ['summon', 'fan', 'burst']] },
  cuirasse: { name: 'CUIRASSÉ LÉVIATHAN', ground: 1, w: 132, h: 380, fy: .4, sway: .2, parts: [{ k: 'gun', x: -38, y: -70 }, { k: 'gun', x: 38, y: -70 }, { k: 'gun', x: -38, y: 64 }, { k: 'gun', x: 38, y: 64 }, { k: 'big', x: 0, y: -128 }, { k: 'big', x: 0, y: 118 }, { k: 'core', x: 0, y: -14 }], atk: [['fan', 'rain'], ['fan', 'burst', 'summon'], ['ring', 'fan', 'torp', 'burst']] },
  scorpion: { name: 'SCORPION', mini: 1, w: 124, h: 150, fy: .24, sway: .3, cr: 34, rot: [[0, -36, 46], [0, 34, 46]], parts: [{ k: 'gun', x: -40, y: 22 }, { k: 'gun', x: 40, y: 22 }, { k: 'core', x: 0, y: 0, hp: 60 }], atk: [['fan', 'burst'], ['ring', 'fan', 'burst']] },
  forteresse: { name: 'FORTERESSE MAMMOUTH', ground: 1, w: 250, h: 196, fy: .3, sway: .16, parts: [{ k: 'gun', x: -92, y: -46 }, { k: 'gun', x: 92, y: -46 }, { k: 'gun', x: -92, y: 50 }, { k: 'gun', x: 92, y: 50 }, { k: 'big', x: 0, y: 62 }, { k: 'core', x: 0, y: -12, r: 24 }], atk: [['burst', 'rain'], ['fan', 'ring', 'torp'], ['spiral', 'fan', 'burst']] },
  ailenoire: { name: 'AILE NOIRE', mini: 1, w: 210, h: 96, fy: .22, sway: .34, cr: 30, parts: [{ k: 'eng', x: -52, y: -4 }, { k: 'eng', x: 52, y: -4 }, { k: 'core', x: 0, y: 6, hp: 60 }], atk: [['rain', 'burst'], ['fan', 'summon', 'burst']] },
  cyclone: { name: 'HÉLICO GÉANT CYCLONE', w: 230, h: 200, fy: .27, sway: .26, cr: 44, rot: [[-78, -14, 60], [78, -14, 60]], parts: [{ k: 'eng', x: -78, y: -14 }, { k: 'eng', x: 78, y: -14 }, { k: 'gun', x: -30, y: 58 }, { k: 'gun', x: 30, y: 58 }, { k: 'core', x: 0, y: 6 }], atk: [['fan', 'burst'], ['spiral', 'summon', 'fan'], ['ring', 'burst', 'spiral']] },
  zeppelin: { name: 'ZEPPELIN DE COMBAT', mini: 1, w: 96, h: 250, fy: .32, sway: .3, cr: 36, parts: [{ k: 'gun', x: 0, y: -78 }, { k: 'gun', x: 0, y: 80 }, { k: 'gun', x: -32, y: 0 }, { k: 'gun', x: 32, y: 0 }, { k: 'core', x: 0, y: 0, r: 19, hp: 60 }], atk: [['burst', 'rain'], ['ring', 'beam', 'burst']] },
  tonnerre: { name: 'FORTERESSE VOLANTE TONNERRE', w: 336, h: 150, fy: .22, sway: .1, cr: 42, parts: [{ k: 'eng', x: -118, y: 8 }, { k: 'eng', x: -60, y: -8 }, { k: 'eng', x: 60, y: -8 }, { k: 'eng', x: 118, y: 8 }, { k: 'gun', x: -88, y: 34 }, { k: 'gun', x: 88, y: 34 }, { k: 'core', x: 0, y: 12 }], atk: [['beam', 'fan'], ['beam', 'ring', 'summon'], ['beam2', 'spiral', 'fan']] },
  croiseur: { name: 'CROISEUR ALIEN', mini: 1, w: 176, h: 132, fy: .25, sway: .32, cr: 38, parts: [{ k: 'eng', x: -58, y: -22 }, { k: 'eng', x: 58, y: -22 }, { k: 'big', x: 0, y: 40 }, { k: 'core', x: 0, y: -6, hp: 65 }], atk: [['fan', 'torp'], ['spiral', 'ring', 'burst']] },
  noyau: { name: 'BASE SPATIALE NOYAU', w: 250, h: 250, fy: .3, sway: .16, cr: 50, orbit: 1, parts: [{ k: 'gun', x: 98, y: 0 }, { k: 'big', x: 49, y: 85 }, { k: 'gun', x: -49, y: 85 }, { k: 'big', x: -98, y: 0 }, { k: 'gun', x: -49, y: -85 }, { k: 'big', x: 49, y: -85 }, { k: 'core', x: 0, y: 0, r: 28, hp: 120 }], atk: [['ring', 'burst'], ['spiral', 'beam', 'torp'], ['spiral', 'ring', 'beam2', 'summon']] }
};
// Capsules à ramasser.
const GX_CAPS = {
  P: { c: '#ffd23f', l: 'P', n: 'TIR' }, L: { c: '#ff4f9a', l: 'L', n: 'LASER' }, M: { c: '#ff9f1c', l: 'M', n: 'MISSILES' }, S: { c: '#9dff5c', l: 'S', n: 'TIR DE CÔTÉ' },
  B: { c: '#c084fc', l: 'B', n: 'BOMBE' }, sh: { c: '#38e0d6', l: '', n: 'BOUCLIER' }, life: { c: '#ff6a8a', l: '', n: 'VIE' }, D: { c: '#5ad1ff', l: '', n: 'AILIER' }
};
const GX_SEC = { L: 'LASER', M: 'MISSILES', S: 'CÔTÉS' };
let GX_CHECK = null; // dernier monde atteint avant une défaite : on propose d'y reprendre (score remis à zéro)

/* ---------- Dessins : tout est tracé au canvas une seule fois, puis réutilisé comme image ----------
   Chaque fonction dessine centré sur (0, 0), en pixels logiques. Les ennemis volent vers le bas (nez en +y),
   le joueur et les bateaux pointent vers le haut. p = palette du monde { a: couleur, b: foncé, c: accent }. */
const GX_ART = (() => {
  const OUT = 'rgba(8,12,32,.82)', GLASS = ['#d9f6ff', '#2a5fa8'];
  const poly = (c, pts, mir) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); if (mir) for (let i = pts.length - 2; i >= 0; i -= 2) c.lineTo(-pts[i], pts[i + 1]); c.closePath(); };
  const fs = (c, fill, stroke, lw) => { if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1.5; c.stroke(); } };
  const grad = (g, cols) => { cols.forEach((k, i) => g.addColorStop(i / (cols.length - 1), k)); return g; };
  const gh = (c, x0, x1, ...cols) => grad(c.createLinearGradient(x0, 0, x1, 0), cols);
  const gv = (c, y0, y1, ...cols) => grad(c.createLinearGradient(0, y0, 0, y1), cols);
  const gr = (c, x, y, r, ...cols) => grad(c.createRadialGradient(x, y, 0, x, y, r), cols);
  const ell = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry === undefined ? rx : ry, 0, 0, 7); };
  const rr = (c, x, y, w, h, r) => Draw.rr(c, x, y, w, h, r);
  // éclaircit (k > 0) ou assombrit (k < 0) une couleur #rrggbb
  const lite = (hex, k) => { const n = parseInt(hex.slice(1), 16), t = k > 0 ? 255 : 0, a = Math.abs(k); const f = s => Math.round(((n >> s) & 255) * (1 - a) + t * a); return 'rgb(' + f(16) + ',' + f(8) + ',' + f(0) + ')'; };
  const metal = (c, x0, x1, p) => gh(c, x0, x1, p.b, p.a, lite(p.a, .45), p.a, p.b);
  const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  // tache faite de cercles (îles, nuages, rochers) : renvoie la liste des cercles
  const blobs = (r, n, w, h, rmin, rmax) => { const o = []; for (let i = 0; i < n; i++) { const a = r() * 7, d = Math.sqrt(r()); o.push([Math.cos(a) * d * w, Math.sin(a) * d * h, rmin + r() * (rmax - rmin)]); } return o; };
  const fillBlobs = (c, bl, grow, col, dx, dy) => { c.fillStyle = col; c.beginPath(); for (const b of bl) { c.moveTo(b[0] + (dx || 0) + b[2] + grow, b[1] + (dy || 0)); c.arc(b[0] + (dx || 0), b[1] + (dy || 0), Math.max(1, b[2] + grow), 0, 7); } c.fill(); };
  const A = {
    OUT, poly, fs, gh, gv, gr, ell, lite, rng,
    /* --- joueur et ses munitions --- */
    player(c) {
      poly(c, [0, -8, 23, 12, 23, 19, 7, 15, 0, 17], 1); fs(c, gh(c, -23, 23, '#0f6a8a', '#2fbfe2', '#b3f6ff', '#2fbfe2', '#0f6a8a'), OUT);
      c.fillStyle = 'rgba(255,255,255,.45)'; poly(c, [0, -8, 23, 12, 21, 13, 0, -4.5], 1); c.fill();
      c.fillStyle = '#ff9f1c'; c.fillRect(19, 11.5, 3.4, 7); c.fillRect(-22.4, 11.5, 3.4, 7);
      poly(c, [0, 13, 11, 25, 4, 23, 0, 26], 1); fs(c, gh(c, -11, 11, '#0f6a8a', '#27a5c9', '#0f6a8a'), OUT);
      poly(c, [0, -27, 3.5, -20, 6, -2, 5, 18, 2.5, 23], 1); fs(c, gh(c, -6, 6, '#7f93ae', '#ffffff', '#7f93ae'), OUT);
      c.fillStyle = '#ff4f9a'; c.fillRect(-4.6, 9, 9.2, 2.4);
      ell(c, 0, -9, 3, 7.5); fs(c, gv(c, -16, -2, GLASS[0], GLASS[1]), OUT, 1); c.fillStyle = 'rgba(255,255,255,.85)'; ell(c, -1, -12, .9, 2.4); c.fill();
      c.fillStyle = '#1d2440'; c.fillRect(-5, 21, 4, 4); c.fillRect(1, 21, 4, 4);
    },
    drone(c) {
      poly(c, [0, -3, 10, 5, 10, 8, 0, 6], 1); fs(c, gh(c, -10, 10, '#b4571a', '#ffb347', '#ffe3a3', '#ffb347', '#b4571a'), OUT, 1.2);
      poly(c, [0, -11, 3, -4, 3, 8, 0, 10], 1); fs(c, gh(c, -3, 3, '#8fa3bd', '#fff', '#8fa3bd'), OUT, 1.2); ell(c, 0, -3, 1.6, 3); fs(c, GLASS[1]);
    },
    shot(c) { rr(c, -5, -11, 10, 22, 5); fs(c, 'rgba(255,170,40,.45)'); rr(c, -3, -10, 6, 20, 3); fs(c, gv(c, -10, 10, '#ffffff', '#ffe45c', '#ff9f1c')); },
    shotB(c) { rr(c, -7, -13, 14, 26, 7); fs(c, 'rgba(90,220,255,.45)'); rr(c, -4.5, -12, 9, 24, 4.5); fs(c, gv(c, -12, 12, '#ffffff', '#9ff3ff', '#2fbfe2')); },
    shotS(c) { ell(c, 0, 0, 6.5); fs(c, 'rgba(120,255,90,.4)'); ell(c, 0, 0, 4.5); fs(c, gr(c, -1, -1, 5, '#ffffff', '#c6ff8a', '#4fbf3a')); },
    pmis(c) { poly(c, [0, -10, 3, -5, 3, 6, 5, 10, 0, 8], 1); fs(c, gh(c, -3, 3, '#c9d3e3', '#ffffff', '#c9d3e3'), OUT, 1); c.fillStyle = '#ff9f1c'; c.fillRect(-3, -4, 6, 2.5); },
    /* --- projectiles ennemis : cœur blanc, couleur vive, liseré sombre : lisibles sur tous les fonds --- */
    bulO(c) { ell(c, 0, 0, 7.5); fs(c, 'rgba(60,0,10,.75)'); ell(c, 0, 0, 6.2); fs(c, gr(c, 0, 0, 6.2, '#ffffff', '#fff3a0', '#ff8a1c', '#ff3b30')); },
    bulP(c) { ell(c, 0, 0, 8.5); fs(c, 'rgba(40,0,50,.75)'); ell(c, 0, 0, 7.2); fs(c, gr(c, 0, 0, 7.2, '#ffffff', '#ffc4f0', '#ff4fd0', '#a020f0')); },
    glow(c) { ell(c, 0, 0, 32); fs(c, gr(c, 0, 0, 32, 'rgba(255,255,255,1)', 'rgba(255,240,150,.95)', 'rgba(255,150,40,.7)', 'rgba(255,60,20,.25)', 'rgba(255,40,0,0)')); },
    smoke(c) { ell(c, 0, 0, 24); fs(c, gr(c, 0, 0, 24, 'rgba(60,60,70,.7)', 'rgba(50,50,60,.4)', 'rgba(40,40,50,0)')); },
    halo(c) { ell(c, 0, 0, 24); fs(c, gr(c, 0, 0, 24, 'rgba(255,255,255,.75)', 'rgba(255,255,255,.25)', 'rgba(255,255,255,0)')); },
    crater(c) { ell(c, 0, 0, 20); fs(c, gr(c, 0, 0, 20, 'rgba(15,12,10,.85)', 'rgba(30,22,16,.6)', 'rgba(30,20,10,0)')); },
    medal(c) {
      c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.6 : 10; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath();
      fs(c, gv(c, -10, 10, '#fff7c2', '#ffd23f', '#f08a00'), 'rgba(90,40,0,.85)', 1.4); c.fillStyle = 'rgba(255,255,255,.8)'; ell(c, -2, -3, 1.6); c.fill();
    },
    cap(c, k) {
      const K = GX_CAPS[k]; ell(c, 0, 0, 14); fs(c, '#ffffff', OUT, 1.5); ell(c, 0, 0, 11.5); fs(c, gr(c, -3, -4, 14, lite(K.c, .55), K.c, lite(K.c, -.35)));
      if (K.l) { c.font = '900 15px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#14123a'; c.fillText(K.l, 0, 1); }
      else if (k === 'life') { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, 7); c.bezierCurveTo(-11, -1, -6, -9, 0, -3.5); c.bezierCurveTo(6, -9, 11, -1, 0, 7); c.fill(); }
      else if (k === 'sh') { c.fillStyle = '#fff'; poly(c, [0, -7, 6, -4.5, 5.5, 2, 0, 7.5], 1); c.fill(); c.fillStyle = K.c; poly(c, [0, -4, 3.3, -2.5, 3, 1.4, 0, 4.4], 1); c.fill(); }
      else { c.fillStyle = '#fff'; poly(c, [0, -7, 2, -1, 8, 4, 8, 6, 2, 5, 0, 7], 1); c.fill(); }
    },
    /* --- ennemis volants --- */
    prop(c, p) {
      rr(c, -17, -6, 34, 11, 5); fs(c, gv(c, -6, 5, lite(p.a, .3), p.a, p.b), OUT);
      for (const x of [-11, 11]) { c.fillStyle = p.c; ell(c, x, -.5, 3.2); c.fill(); c.fillStyle = p.b; ell(c, x, -.5, 1.4); c.fill(); }
      rr(c, -7, -16.5, 14, 5, 2); fs(c, p.a, OUT, 1.2);
      poly(c, [0, -15, 3, -12, 5, 2, 4, 11, 0, 14], 1); fs(c, gh(c, -5, 5, p.b, lite(p.a, .4), p.b), OUT);
      ell(c, 0, 1, 2.6, 4.6); fs(c, gv(c, -3, 5, GLASS[0], GLASS[1]), OUT, 1);
      c.fillStyle = '#39405a'; ell(c, 0, 14, 2.6, 2); c.fill(); c.fillStyle = 'rgba(255,255,255,.42)'; ell(c, 0, 15.6, 9, 1.5); c.fill();
    },
    jet(c, p) {
      poly(c, [0, 17, 3, 8, 17, -9, 17, -14, 6, -11, 4, -17, 0, -15], 1); fs(c, metal(c, -17, 17, p), OUT);
      poly(c, [0, 17, 3.2, 6, 3.6, -12, 0, -14], 1); fs(c, gh(c, -4, 4, p.b, lite(p.a, .55), p.b));
      ell(c, 0, 5, 2.3, 5); fs(c, gv(c, 0, 10, '#fffbd6', p.c), OUT, 1);
      c.fillStyle = p.c; c.fillRect(13, -13.5, 4, 3); c.fillRect(-17, -13.5, 4, 3); c.fillStyle = '#ffcf6b'; ell(c, 0, -15.5, 2.6, 1.8); c.fill();
    },
    saucer(c, p) {
      ell(c, 0, 0, 16.5); fs(c, gr(c, -4, -5, 20, lite(p.a, .55), p.a, p.b), OUT); ell(c, 0, 0, 11); fs(c, null, 'rgba(0,0,0,.3)', 1);
      c.fillStyle = p.c; for (let i = 0; i < 6; i++) { ell(c, Math.cos(i * 1.047) * 13.6, Math.sin(i * 1.047) * 13.6, 1.8); c.fill(); }
      ell(c, 0, 0, 7); fs(c, gr(c, -2, -2, 8, '#ffffff', '#9aefff', '#2a6fb0'), OUT, 1);
    },
    dart(c, p) { poly(c, [0, 13, 10, -11, 4, -8, 0, -13], 1); fs(c, metal(c, -10, 10, p), OUT); poly(c, [0, 9, 3, -4, 0, -7], 1); fs(c, p.c); },
    heli(c, p) {
      c.fillStyle = p.b; c.fillRect(-2, -24, 4, 20); rr(c, -8, -25, 16, 4, 2); fs(c, p.a, OUT, 1);
      for (const s of [-1, 1]) { rr(c, s * 15.5 - 3.5, 0, 7, 12, 3); fs(c, p.b, OUT, 1); }
      ell(c, 0, 4, 12, 17); fs(c, metal(c, -12, 12, p), OUT); ell(c, 0, 13, 7, 6.5); fs(c, gv(c, 6, 19, GLASS[0], GLASS[1]), OUT, 1);
      c.fillStyle = p.c; c.fillRect(-12, 1, 24, 2); c.fillStyle = '#1b2036'; ell(c, 0, 0, 3.5); c.fill();
    },
    pod(c, p) {
      for (let i = 0; i < 6; i++) { const a = i * 1.047 + .52; c.save(); c.rotate(a); poly(c, [0, -22, 5, -12, -5, -12]); fs(c, p.b, OUT, 1); c.restore(); }
      ell(c, 0, 0, 16); fs(c, gr(c, -4, -5, 20, lite(p.a, .55), p.a, p.b), OUT); ell(c, 0, 3, 7.5); fs(c, gr(c, 0, 3, 8, '#ffffff', p.c, lite(p.c, -.5)), OUT, 1); c.fillStyle = '#14123a'; ell(c, 0, 5, 2.6); c.fill();
    },
    bomber(c, p) {
      poly(c, [0, -3, 42, -11, 43, -2, 30, 6, 0, 12], 1); fs(c, gv(c, -11, 12, lite(p.a, .35), p.a, p.b), OUT);
      for (const x of [-29, -16, 16, 29]) { rr(c, x - 3.5, -1, 7, 15, 3); fs(c, p.b, OUT, 1); c.fillStyle = 'rgba(255,255,255,.42)'; ell(c, x, 15, 6.5, 1.4); c.fill(); }
      for (const x of [-36, 36]) { c.fillStyle = p.c; ell(c, x, -5, 3.4); c.fill(); c.fillStyle = p.b; ell(c, x, -5, 1.5); c.fill(); }
      rr(c, -15, -31, 30, 8, 3); fs(c, p.a, OUT); poly(c, [0, -30, 5, -22, 7, 10, 5, 24, 0, 30], 1); fs(c, gh(c, -7, 7, p.b, lite(p.a, .5), p.b), OUT);
      ell(c, 0, 21, 3.5, 6); fs(c, gv(c, 15, 27, GLASS[0], GLASS[1]), OUT, 1); c.fillStyle = p.c; c.fillRect(-6.5, -4, 13, 2.5);
    },
    cruiser(c, p) {
      poly(c, [0, 30, 14, 20, 40, -6, 42, -26, 30, -12, 12, -22, 0, -16], 1); fs(c, metal(c, -42, 42, p), OUT);
      poly(c, [0, 24, 9, 16, 12, -10, 0, -12], 1); fs(c, gh(c, -12, 12, p.b, lite(p.a, -.2), p.b)); ell(c, 0, 4, 7, 11); fs(c, gr(c, 0, 4, 11, '#ffffff', p.c, lite(p.c, -.5)), OUT, 1);
      c.fillStyle = p.c; for (const x of [-32, -24, 24, 32]) { ell(c, x, -8 + Math.abs(x) * .1, 1.8); c.fill(); }
    },
    rock(c, p, seed) {
      const r = rng(seed || 3); c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * .628, d = 13 + r() * 6; c.lineTo(Math.cos(a) * d, Math.sin(a) * d); } c.closePath();
      fs(c, gr(c, -5, -6, 24, '#b9a48c', '#7d6a58', '#3d3340'), OUT); c.fillStyle = 'rgba(0,0,0,.28)'; for (let i = 0; i < 4; i++) { ell(c, r() * 18 - 9, r() * 18 - 9, 1.5 + r() * 3); c.fill(); }
    },
    emis(c, p) { poly(c, [0, 12, 3.2, 6, 3.2, -7, 6, -12, 0, -9], 1); fs(c, gh(c, -3, 3, '#c9d3e3', '#ffffff', '#c9d3e3'), OUT, 1); c.fillStyle = '#ff3b30'; poly(c, [0, 12, 3.2, 6, -3.2, 6]); c.fill(); c.fillRect(-3.2, -3, 6.4, 2.4); },
    /* --- ennemis au sol --- */
    wake(c, y, w, len) { c.fillStyle = 'rgba(255,255,255,.3)'; poly(c, [0, y, w, y + len, w * .45, y + len * .86, 0, y + len], 1); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; poly(c, [0, y, w * .5, y + len * .7, 0, y + len * .8], 1); c.fill(); },
    boat(c, p) {
      A.wake(c, 12, 11, 26); poly(c, [0, -36, 7, -20, 8.5, 12, 6, 21, 0, 22.5], 1); fs(c, metal(c, -9, 9, p), OUT);
      c.fillStyle = 'rgba(0,0,0,.18)'; poly(c, [0, -30, 4.5, -18, 5.5, 10, 0, 18], 1); c.fill(); rr(c, -5, 3, 10, 13, 2); fs(c, lite(p.a, .3), OUT, 1); c.fillStyle = p.c; c.fillRect(-5, 12.5, 10, 2.2);
    },
    destroyer(c, p) {
      A.wake(c, 26, 15, 36); poly(c, [0, -62, 9, -40, 12, 20, 9, 40, 0, 44], 1); fs(c, metal(c, -12, 12, p), OUT);
      c.fillStyle = 'rgba(0,0,0,.16)'; poly(c, [0, -54, 6, -38, 8, 20, 0, 38], 1); c.fill(); rr(c, -7, -12, 14, 22, 3); fs(c, gv(c, -12, 10, lite(p.a, .4), p.a), OUT, 1);
      c.fillStyle = '#20263d'; ell(c, 0, 3, 3.6, 3); c.fill(); c.fillStyle = p.c; c.fillRect(-8, -44, 16, 2.4); c.fillRect(-9, 34, 18, 2.4);
    },
    sub(c, p) {
      c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.6; ell(c, 0, 0, 13, 38); c.stroke(); ell(c, 0, 0, 8, 34); fs(c, gh(c, -8, 8, '#12303d', '#2f6f7f', '#4f9aa8', '#2f6f7f', '#12303d'), OUT);
      rr(c, -4, -9, 8, 15, 3.5); fs(c, '#1c4552', OUT, 1); c.fillStyle = p.c; c.fillRect(-4, -2, 8, 2); c.fillStyle = '#12303d'; c.fillRect(-9, 24, 18, 3);
    },
    tank(c, p) {
      for (const s of [-1, 1]) { rr(c, s * 12 - 4.5, -17, 9, 34, 3); fs(c, '#23283a', OUT, 1); c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 1; c.beginPath(); for (let y = -14; y < 16; y += 4) { c.moveTo(s * 12 - 4, y); c.lineTo(s * 12 + 4, y); } c.stroke(); }
      rr(c, -10, -14, 20, 28, 4); fs(c, gv(c, -14, 14, lite(p.a, .3), p.a, p.b), OUT); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-7, 7, 14, 4);
    },
    bunker(c, p, key) {
      if (key === 'space') { rr(c, -20, -20, 40, 40, 6); fs(c, gv(c, -20, 20, '#7b86a3', '#4a5371'), OUT); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1; c.strokeRect(-15, -15, 30, 30); c.fillStyle = p.c; for (const [x, y] of [[-16, -16], [16, -16], [-16, 16], [16, 16]]) { ell(c, x, y, 1.6); c.fill(); } }
      else if (key === 'city') { rr(c, -20, -20, 40, 40, 4); fs(c, gv(c, -20, 20, '#3d4a70', '#232c4a'), OUT); c.strokeStyle = p.c; c.lineWidth = 1.5; ell(c, 0, 0, 15); c.stroke(); }
      else { c.beginPath(); for (let i = 0; i < 8; i++) c.lineTo(Math.cos(i * .785 + .39) * 20, Math.sin(i * .785 + .39) * 20); c.closePath(); fs(c, gr(c, -5, -6, 26, '#d8d2c2', '#a39c8a', '#6d675a'), OUT); ell(c, 0, 0, 13); fs(c, 'rgba(0,0,0,.2)'); }
    },
    balloon(c, p) {
      for (const s of [-1, 1]) { poly(c, [s * 6, -22, s * 19, -30, s * 16, -16]); fs(c, p.b, OUT, 1); } poly(c, [0, -20, 4, -30, -4, -30]); fs(c, p.b, OUT, 1);
      ell(c, 0, -2, 17, 25); fs(c, gh(c, -17, 17, p.b, p.a, lite(p.a, .5), p.a, p.b), OUT); c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1; ell(c, 0, -2, 9, 25); c.stroke(); c.beginPath(); c.moveTo(0, -27); c.lineTo(0, 23); c.stroke();
      c.fillStyle = p.c; c.fillRect(-16, -5, 32, 3); rr(c, -7, 16, 14, 11, 3); fs(c, '#2a3150', OUT, 1);
    },
    tur(c, p) { rr(c, -2.2, 2, 4.4, 14, 1.5); fs(c, '#1c2238', OUT, 1); ell(c, 0, 0, 7); fs(c, gr(c, -2, -2, 8, lite(p.a, .6), p.a, p.b), OUT, 1.2); c.fillStyle = p.c; ell(c, 0, 0, 2.4); c.fill(); },
    turB(c, p) { for (const x of [-4, 4]) { rr(c, x - 2.2, 3, 4.4, 17, 1.5); fs(c, '#1c2238', OUT, 1); } rr(c, -9.5, -9, 19, 17, 5); fs(c, gr(c, -3, -3, 13, lite(p.a, .6), p.a, p.b), OUT, 1.3); c.fillStyle = p.c; c.fillRect(-6, -2, 12, 2.6); },
    /* --- décor --- */
    isle(c, seed) {
      const r = rng(seed), land = blobs(r, 7, 34, 26, 16, 30), green = land.map(b => [b[0] * .75, b[1] * .75, b[2] * .62]);
      fillBlobs(c, land, 20, 'rgba(90,215,225,.22)'); fillBlobs(c, land, 10, 'rgba(120,235,235,.3)'); fillBlobs(c, land, 3, 'rgba(255,255,255,.55)');
      fillBlobs(c, land, 0, '#f0d9a0'); fillBlobs(c, land, -4, '#e6c784'); fillBlobs(c, green, 0, '#3f9c4d'); fillBlobs(c, green, -5, '#57b85c', -2, -2);
      for (let i = 0; i < 5; i++) { const g = green[i % green.length], x = g[0] + (r() - .5) * g[2], y = g[1] + (r() - .5) * g[2]; c.fillStyle = 'rgba(0,40,20,.3)'; ell(c, x + 4, y + 5, 7); c.fill(); for (let k = 0; k < 7; k++) { c.save(); c.translate(x, y); c.rotate(k * .9 + r()); c.fillStyle = k % 2 ? '#2f8f45' : '#236e36'; c.beginPath(); c.ellipse(5.5, 0, 6, 2.1, 0, 0, 7); c.fill(); c.restore(); } c.fillStyle = '#7a5a2a'; ell(c, x, y, 1.6); c.fill(); }
    },
    cloud(c, seed, col, shade, hi) {
      const r = rng(seed), bl = blobs(r, 9, 52, 22, 16, 30); if (shade) fillBlobs(c, bl, 0, shade, 4, 7); fillBlobs(c, bl, 0, col); if (!hi) return;
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); for (const b of bl) { c.moveTo(b[0] - 5 + b[2] * .6, b[1] - 6); c.arc(b[0] - 5, b[1] - 6, b[2] * .6, 0, 7); } c.fill();
    },
    mesa(c, seed) {
      const r = rng(seed), pts = []; for (let i = 0; i < 11; i++) { const a = i * .571, d = 30 + r() * 20; pts.push(Math.cos(a) * d * 1.15, Math.sin(a) * d * .9); }
      c.save(); c.translate(8, 12); poly(c, pts); fs(c, 'rgba(70,40,10,.35)'); c.restore(); poly(c, pts); fs(c, '#9c5f34', 'rgba(60,30,10,.6)', 1.5);
      c.save(); c.scale(.8, .78); c.translate(-3, -5); poly(c, pts); fs(c, gv(c, -40, 40, '#d99a5c', '#bd7a42')); c.restore();
      c.strokeStyle = 'rgba(90,45,15,.3)'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { const y = -18 + i * 10; c.beginPath(); c.moveTo(-26 + r() * 8, y); c.quadraticCurveTo(0, y + r() * 6 - 3, 24 - r() * 8, y + 2); c.stroke(); }
    },
    planet(c, seed) {
      const r = rng(seed), R = 44 + r() * 26, pal = [['#ffd9a0', '#d0683a', '#5a2030'], ['#b8f0ff', '#3a86c8', '#1a2a6a'], ['#f0d0ff', '#8a5cc8', '#2a1a5a']][seed % 3];
      ell(c, 0, 0, R + 6); fs(c, gr(c, 0, 0, R + 6, 'rgba(255,255,255,0)', 'rgba(255,255,255,0)', 'rgba(160,190,255,.12)', 'rgba(160,190,255,0)'));
      ell(c, 0, 0, R); fs(c, gr(c, -R * .35, -R * .4, R * 1.5, pal[0], pal[1], pal[2])); c.save(); ell(c, 0, 0, R); c.clip();
      c.globalAlpha = .22; for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#000' : '#fff'; c.beginPath(); c.ellipse(0, -R + r() * R * 2, R * 1.2, 3 + r() * 7, .15, 0, 7); c.fill(); } c.restore(); c.globalAlpha = 1;
      if (seed % 3 === 1) { c.strokeStyle = 'rgba(255,240,210,.55)'; c.lineWidth = 5; c.beginPath(); c.ellipse(0, 0, R * 1.5, R * .32, -.35, .25, 2.9); c.stroke(); }
    },
    girder(c) {
      rr(c, -22, -100, 44, 200, 4); fs(c, gh(c, -22, 22, '#2b3350', '#4d5878', '#2b3350'), 'rgba(0,0,0,.5)', 1.5); c.strokeStyle = 'rgba(160,180,230,.28)'; c.lineWidth = 2; c.beginPath();
      for (let y = -100; y < 100; y += 40) { c.moveTo(-22, y); c.lineTo(22, y + 40); c.moveTo(22, y); c.lineTo(-22, y + 40); } c.stroke();
      for (let y = -80; y < 100; y += 40) { c.fillStyle = (y / 40 | 0) % 2 ? '#38e0d6' : '#ffd23f'; ell(c, 0, y, 2.5); c.fill(); }
    },
    /* --- coques des boss --- */
    cuirasse(c, p, D) {
      c.fillStyle = 'rgba(255,255,255,.28)'; poly(c, [0, 110, 60, 189, 26, 180, 0, 189], 1); c.fill();
      poly(c, [0, -188, 22, -150, 40, -92, 46, 0, 44, 106, 34, 150, 0, 160], 1); fs(c, gh(c, -46, 46, '#333c50', '#768196', '#aab4c6', '#768196', '#333c50'), OUT, 2);
      poly(c, [0, -174, 16, -146, 32, -90, 37, 0, 35, 102, 26, 142, 0, 151], 1); fs(c, gh(c, -37, 37, '#93734a', '#caa56b', '#93734a')); c.save(); c.clip(); c.strokeStyle = 'rgba(60,35,10,.16)'; c.lineWidth = 1; c.beginPath(); for (let x = -36; x < 38; x += 6) { c.moveTo(x, -180); c.lineTo(x, 160); } c.stroke(); c.restore();
      rr(c, -23, -58, 46, 100, 7); fs(c, gv(c, -58, 42, '#b4bece', '#69748a'), OUT); rr(c, -15, -46, 30, 66, 6); fs(c, gv(c, -46, 20, '#8f9ab0', '#5d6880'), OUT, 1);
      for (const y of [28, 48]) { ell(c, 0, y, 9, 7); fs(c, '#242a3c', OUT, 1); ell(c, 0, y, 5, 3.6); fs(c, '#0d101c'); }
      c.fillStyle = p.c; c.fillRect(-10, -162, 20, 3); c.fillRect(-30, 128, 60, 3);
      for (const q of D.parts) { ell(c, q.x, q.y, (q.r || GX_PART[q.k].r) + 3); fs(c, '#4b556c', OUT, 1); }
    },
    carrier(c, p, D) {
      c.fillStyle = 'rgba(255,255,255,.28)'; poly(c, [0, 100, 46, 150, 20, 143, 0, 150], 1); c.fill();
      poly(c, [0, -148, 16, -128, 34, -90, 36, 110, 26, 132, 0, 136], 1); fs(c, gh(c, -36, 36, '#30384a', '#687389', '#30384a'), OUT, 2);
      poly(c, [-30, -124, 30, -124, 44, -70, 44, 96, 30, 124, -30, 124]); fs(c, gv(c, -124, 124, '#5b6478', '#434b5e'), OUT, 1.5);
      c.strokeStyle = '#f3f3f3'; c.lineWidth = 2; c.setLineDash([12, 9]); c.beginPath(); c.moveTo(-6, -116); c.lineTo(-6, 116); c.stroke(); c.setLineDash([]); c.strokeStyle = '#ffd23f'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-22, -116); c.lineTo(-22, 116); c.moveTo(12, -116); c.lineTo(12, 116); c.stroke();
      for (const y of [-52, 52]) { c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(-18, y - 12, 22, 24); }
      for (const y of [64, 92]) { c.save(); c.translate(26, y); c.scale(.42, .42); c.rotate(Math.PI); A.prop(c, { a: '#e5484d', b: '#8f1d2c', c: '#fff1d6' }); c.restore(); }
      rr(c, 18, -34, 24, 56, 5); fs(c, gv(c, -34, 22, '#aab4c6', '#69748a'), OUT);
      for (const q of D.parts) if (q.k !== 'core') { ell(c, q.x, q.y, GX_PART[q.k].r + 3); fs(c, '#39415a', OUT, 1); }
    },
    forteresse(c, p, D) {
      for (const s of [-1, 1]) { rr(c, s * 100 - 24, -96, 48, 192, 12); fs(c, '#232838', OUT, 2); c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 2; c.beginPath(); for (let y = -88; y < 92; y += 9) { c.moveTo(s * 100 - 21, y); c.lineTo(s * 100 + 21, y); } c.stroke(); }
      poly(c, [0, -86, 62, -86, 86, -56, 86, 62, 66, 90, 0, 90], 1); fs(c, gv(c, -86, 90, '#c9a15c', '#a07c40', '#7a5c2c'), OUT, 2);
      c.save(); c.clip(); c.fillStyle = 'rgba(90,60,20,.3)'; for (const [x, y, rx, ry] of [[-50, -50, 26, 15], [40, -66, 22, 12], [56, 30, 20, 26], [-58, 50, 24, 16], [0, 80, 30, 10]]) { ell(c, x, y, rx, ry); c.fill(); } c.restore();
      c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1.2; c.strokeRect(-56, -70, 112, 136); for (const x of [-30, 30]) { c.fillStyle = '#1c2030'; rr(c, x - 9, -84, 18, 9, 2); c.fill(); }
      ell(c, 0, -12, 42); fs(c, gr(c, -10, -22, 50, '#e3c488', '#b08a4a', '#6f5326'), OUT, 2); ell(c, 0, -12, 30); fs(c, null, 'rgba(0,0,0,.3)', 1.5);
      c.fillStyle = p.c; c.fillRect(-84, -8, 22, 4); c.fillRect(62, -8, 22, 4);
      for (const q of D.parts) if (q.k !== 'core') { ell(c, q.x, q.y, GX_PART[q.k].r + 3); fs(c, '#5a4a2c', OUT, 1); }
    },
    scorpion(c, p, D) {
      c.fillStyle = p.b; c.fillRect(-4, -66, 8, 30); rr(c, -16, -70, 32, 7, 3); fs(c, p.a, OUT);
      for (const s of [-1, 1]) { poly(c, [s * 14, 4, s * 52, 14, s * 52, 30, s * 14, 26]); fs(c, gv(c, 4, 30, p.a, p.b), OUT); }
      ell(c, 0, 4, 22, 54); fs(c, metal(c, -22, 22, p), OUT, 2); ell(c, 0, 44, 11, 12); fs(c, gv(c, 32, 56, GLASS[0], GLASS[1]), OUT, 1);
      c.fillStyle = p.c; c.fillRect(-21, -22, 42, 3); c.fillRect(-21, 22, 42, 3);
    },
    cyclone(c, p, D) {
      c.fillStyle = p.b; c.fillRect(-5, -96, 10, 50); rr(c, -24, -98, 48, 9, 4); fs(c, p.a, OUT);
      poly(c, [0, -30, 80, -26, 86, -8, 80, 6, 0, 22], 1); fs(c, gv(c, -30, 22, lite(p.a, .2), p.a, p.b), OUT, 2);
      for (const s of [-1, 1]) { ell(c, s * 78, -14, 25); fs(c, gr(c, s * 78 - 6, -20, 30, lite(p.a, .5), p.a, p.b), OUT, 2); }
      ell(c, 0, 10, 34, 78); fs(c, metal(c, -34, 34, p), OUT, 2); ell(c, 0, 70, 17, 17); fs(c, gv(c, 54, 88, GLASS[0], GLASS[1]), OUT, 1.5);
      c.fillStyle = p.c; c.fillRect(-33, -28, 66, 4); c.fillRect(-30, 40, 60, 4);
      for (const q of D.parts) if (q.k === 'gun') { ell(c, q.x, q.y, 15); fs(c, p.b, OUT, 1); }
    },
    ailenoire(c, p, D) {
      poly(c, [0, 44, 14, 30, 103, -14, 99, -27, 42, -18, 22, -38, 0, -31], 1); fs(c, gh(c, -103, 103, '#0e1024', '#2c2f5a', '#474b86', '#2c2f5a', '#0e1024'), OUT, 2);
      c.strokeStyle = p.a; c.lineWidth = 2; c.beginPath(); c.moveTo(-98, -14); c.lineTo(-14, 28); c.lineTo(0, 40); c.lineTo(14, 28); c.lineTo(98, -14); c.stroke();
      ell(c, 0, 26, 6, 10); fs(c, gv(c, 16, 36, '#fffbd6', p.c), OUT, 1);
    },
    zeppelin(c, p, D) {
      for (const s of [-1, 1]) { poly(c, [s * 12, -96, s * 40, -122, s * 36, -86]); fs(c, p.b, OUT); } poly(c, [0, -98, 6, -124, -6, -124]); fs(c, p.b, OUT);
      ell(c, 0, 0, 40, 118); fs(c, gh(c, -40, 40, p.b, p.a, lite(p.a, .55), p.a, p.b), OUT, 2); c.strokeStyle = 'rgba(0,0,0,.16)'; c.lineWidth = 1; for (const k of [.35, .7]) { ell(c, 0, 0, 40 * k, 118); c.stroke(); } for (const y of [-60, 60]) { c.beginPath(); c.moveTo(-36, y); c.lineTo(36, y); c.stroke(); }
      c.fillStyle = p.c; c.fillRect(-39, -32, 78, 4); c.fillRect(-39, 30, 78, 4);
      for (const q of D.parts) if (q.k === 'gun') { ell(c, q.x, q.y, 15); fs(c, '#2a3150', OUT, 1); }
    },
    tonnerre(c, p, D) {
      poly(c, [0, 62, 30, 42, 164, 14, 166, -6, 122, -28, 40, -52, 0, -58], 1); fs(c, gv(c, -58, 62, '#5a2030', '#3a1626', '#1c0e1a'), OUT, 2.5);
      poly(c, [0, 54, 26, 36, 150, 10, 118, -20, 38, -44, 0, -50], 1); fs(c, gh(c, -150, 150, '#2a1220', '#6a2a3a', '#a84a4a', '#6a2a3a', '#2a1220'));
      c.strokeStyle = p.a; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-160, 4); c.lineTo(-30, -44); c.lineTo(0, -52); c.lineTo(30, -44); c.lineTo(160, 4); c.stroke();
      rr(c, -16, -40, 32, 96, 12); fs(c, gh(c, -16, 16, '#2a1220', '#8a3a44', '#2a1220'), OUT); ell(c, 0, 46, 9, 12); fs(c, gv(c, 34, 58, '#fffbd6', p.a), OUT, 1.5);
      for (const q of D.parts) if (q.k !== 'core') { ell(c, q.x, q.y, GX_PART[q.k].r + 4); fs(c, '#1c0e1a', OUT, 1); }
    },
    croiseur(c, p, D) {
      poly(c, [0, 62, 24, 44, 80, -4, 86, -50, 60, -26, 26, -46, 0, -34], 1); fs(c, metal(c, -86, 86, p), OUT, 2);
      poly(c, [0, 52, 16, 36, 22, -22, 0, -26], 1); fs(c, gh(c, -22, 22, p.b, '#16301c', p.b), OUT, 1);
      c.fillStyle = p.c; for (const x of [-70, -56, -42, 42, 56, 70]) { ell(c, x, -14 + Math.abs(x) * .14, 2.6); c.fill(); }
      for (const q of D.parts) if (q.k !== 'core') { ell(c, q.x, q.y, GX_PART[q.k].r + 3); fs(c, '#16301c', OUT, 1); }
    },
    noyau(c, p, D) {
      c.strokeStyle = '#3a4260'; c.lineWidth = 9; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * 1.047; c.moveTo(Math.cos(a) * 40, Math.sin(a) * 40); c.lineTo(Math.cos(a) * 98, Math.sin(a) * 98); } c.stroke();
      ell(c, 0, 0, 98); c.strokeStyle = OUT; c.lineWidth = 22; c.stroke(); c.strokeStyle = '#6d7896'; c.lineWidth = 18; c.stroke(); c.strokeStyle = '#a4aecb'; c.lineWidth = 5; c.stroke();
      c.fillStyle = p.c; for (let i = 0; i < 24; i++) { const a = i * .2618 + .13; ell(c, Math.cos(a) * 98, Math.sin(a) * 98, 1.7); c.fill(); }
      ell(c, 0, 0, 50); fs(c, gr(c, -12, -14, 62, '#aab4d0', '#59627f', '#252b45'), OUT, 2); ell(c, 0, 0, 38); fs(c, null, 'rgba(0,0,0,.35)', 2);
      for (let i = 0; i < 6; i++) { const a = i * 1.047; ell(c, Math.cos(a) * 98, Math.sin(a) * 98, 21); fs(c, '#3a4260', OUT, 1.5); }
    }
  };
  return A;
})();

GAMES.push({
  id: 'galaxy', title: 'Galaxie', tagline: '5 mondes, armes et boss géants', minAge: 8, color: '#9b7bff',
  icon: '<svg viewBox="0 0 64 64"><path d="M32 44l-14 10 4-14-10-8h12l8-16 8 16h12l-10 8 4 14z" fill="#38e0d6"/><circle cx="32" cy="30" r="4" fill="#fff5e1"/><rect x="30" y="6" width="4" height="10" rx="2" fill="#ffd23f"/><circle cx="14" cy="14" r="5" fill="#ff4f9a"/><circle cx="50" cy="12" r="4" fill="#9dff5c"/></svg>',
  howto: ['',
    'Glisse ton doigt partout sur l\'écran : l\'avion le suit et tire tout seul. Ramasse les capsules (meilleures armes) et les étoiles (points). BOMBE nettoie l\'écran ; si tu es touché, une bombe part toute seule pour te sauver. Un boss t\'attend au bout de chaque monde !',
    'Cinq mondes, de l\'Océan à l\'Espace. Glisse le doigt pour piloter, le tir est automatique. Fais monter ton tir (P), choisis ton arme secondaire (L, M, S), enchaîne les ennemis pour le multiplicateur et garde tes bombes pour les boss : vise leurs tourelles, puis le cœur.'],
  pad: { dpad: true, buttons: [{ k: 'a', label: 'BOMBE' }], hint: 'ou glisse le doigt · tir automatique' },
  stars: s => s >= 650000 ? 3 : s >= 250000 ? 2 : s >= 55000 ? 1 : 0, // mesuré avec les robots : monde 1 fini ≈ 60 à 75 000, monde 2 ≈ 190 à 250 000, monde 4 ≈ 650 à 750 000, tout ≈ 1 000 000
  create(env, saved) {
    const { input, sfx } = env, A = GX_ART, hard = env.tier >= 2, NW = GX_WORLDS.length;
    const SCROLL = 52, TH = 600, MAXLIVES = hard ? 5 : 6, PI = Math.PI;
    const FONT = getComputedStyle(document.body).getPropertyValue('--font-display') || 'sans-serif';
    // --- géométrie : u = zoom écran, LW × LH = terrain en pixels logiques, AW = largeur utile des formations
    let u = 1, LW = 390, LH = 560, AW = 390, ss = 0;
    // --- état de la partie
    let wi = 0, Wd = GX_WORLDS[0], phase = 'play', phT = 0, T = 0, scroll = 0, over = false, quiet = false, god = false;
    let score = 0, lives = hard ? 4 : 5, bombs = hard ? 2 : 3, pw = 1, sec = '', secLv = 0, drones = 0;
    let combo = 0, comboT = 0, mult = 1, kills = 0, spawned = 0, medalsGot = 0, noHit = true;
    let foes = [], gfoes = [], shots = [], pmis = [], bullets = [], beams = [], picks = [], medals = [], booms = [], parts = [], texts = [], scen = [], warns = [], timers = [], forms = {}, formId = 0;
    let boss = null, si = 0, sT = 0, hold = '', holdT = 0, banner = null, shake = 0, flash = 0, bombFx = 0, fade = 1, recap = null, btns = [], boltT = 5, skyFlash = 0, amb = [], ctl = null, laser = null;
    let SP = {}, bg = null, bgKey = '', spKey = '', fired = 0;
    const P = { x: 195, y: 440, inv: 2, shield: 0, bank: 0, fT: 0, sT: 0, dT: 0, lz: 0 };
    const sndT = {};
    const snd = n => { if (quiet) return; if (sndT[n] !== undefined && T - sndT[n] < .07) return; sndT[n] = T; sfx[n](); };
    const vib = ms => { if (!quiet) env.vibe(ms); };
    const later = (t, fn) => timers.push({ t, fn });
    // x d'une fraction de la zone utile ; en dehors de [0, 1] on sort franchement de l'écran, même sur un écran très large
    const X = fx => fx < 0 ? fx * 320 : fx > 1 ? LW + (fx - 1) * 320 : LW / 2 + (fx - .5) * AW;
    // --- difficulté : tout dépend du monde (wi) et de l'âge. H = « dureté » de 0 à 1 : les 13 ans et plus jouent toujours à 1 ;
    // les 8-12 ans commencent à 0 (monde 1 très doux) et montent d'un cran par monde, pour rejoindre les grands au dernier (avec plus de vies).
    const H = () => hard ? 1 : Math.min(1, wi * .25), mix = (a, b) => a + (b - a) * H();
    const bsp = () => (86 + wi * 20) * mix(.88, 1.1);                           // vitesse des projectiles ennemis
    const fireK = () => [2, 1.3, .95, .78, .64][wi] * mix(1.25, .88);           // les ennemis tirent rarement au début, de plus en plus souvent ensuite
    const hpK = () => (1 + wi * .35) * (!hard && wi === 0 ? .72 : mix(1, 1.2)); // solidité des gros ennemis et des boss
    const figFire = () => wi === 0 ? (hard ? .12 : 0) : .2 + wi * .12 + H() * .1; // les petits chasseurs du monde 1 ne tirent pas
    const soft = () => wi === 0;                                                // premier monde : tout est adouci, on doit s'y amuser sans stress

    /* ---------- images pré-dessinées ---------- */
    function sil(src, col) { const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height; const c = cv.getContext('2d'); c.drawImage(src, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = col; c.fillRect(0, 0, cv.width, cv.height); return cv; }
    // fabrique une image w × h (pixels logiques) ; full = on prépare aussi l'ombre portée et la version blanche (flash quand on touche)
    function mk(w, h, fn, full) {
      const cv = document.createElement('canvas'), k = w * ss > 900 ? Math.min(ss, 1.5) : ss; cv.width = Math.ceil(w * k); cv.height = Math.ceil(h * k);
      const c = cv.getContext('2d'); c.scale(k, k); c.translate(w / 2, h / 2); c.lineJoin = 'round'; fn(c);
      const s = { cv, w, h }; if (full) { s.sh = sil(cv, '#060a1c'); s.wh = sil(cv, '#ffffff'); } return s;
    }
    function buildSprites() {
      const key = ss + '|' + wi; if (key === spKey) return; spKey = key; SP = {};
      const p = Wd.pal, g = Wd.gpal, alien = Wd.style === 'alien', S = (n, w, h, fn, full) => { SP[n] = mk(w, h, fn, full); };
      S('player', 50, 58, A.player, 1); S('drone', 24, 24, A.drone, 1); S('shot', 12, 24, A.shot); S('shotB', 16, 28, A.shotB); S('shotS', 14, 14, A.shotS); S('pmis', 12, 22, A.pmis);
      S('bulO', 16, 16, A.bulO); S('bulP', 18, 18, A.bulP); S('glow', 64, 64, A.glow); S('smoke', 48, 48, A.smoke); S('halo', 48, 48, A.halo); S('crater', 40, 40, A.crater); S('medal', 22, 22, A.medal);
      for (const k in GX_CAPS) S('cap_' + k, 30, 30, c => A.cap(c, k));
      S('fig', 36, 36, c => (alien ? A.saucer : Wd.style === 'jet' ? A.jet : A.prop)(c, p), 1); S('dart', 22, 28, c => A.dart(c, p), 1);
      S('gun', 46, 52, c => (alien ? A.pod : A.heli)(c, p), 1); S('bomb', 88, 66, c => (alien ? A.cruiser : A.bomber)(c, p), 1); S('mis', 14, 26, c => A.emis(c, p), 1);
      for (let i = 0; i < 3; i++) S('rock' + i, 40, 40, c => A.rock(c, p, 5 + i * 9), 1);
      S('boat', 30, 78, c => A.boat(c, g), 1); S('destroyer', 40, 128, c => A.destroyer(c, g), 1); S('sub', 30, 84, c => A.sub(c, g), 1); S('tank', 34, 38, c => A.tank(c, g), 1);
      S('bunker', 42, 42, c => A.bunker(c, g, Wd.key), 1); S('balloon', 44, 60, c => A.balloon(c, g), 1); S('tur', 22, 36, c => A.tur(c, g), 1); S('turB', 30, 44, c => A.turB(c, g), 1);
      S('core', 60, 60, c => { A.ell(c, 0, 0, 27); A.fs(c, '#1a1430', A.OUT, 2); A.ell(c, 0, 0, 22); A.fs(c, A.gr(c, -5, -6, 26, '#ffffff', '#ff8ac0', '#ff2f6a', '#7a0f3a')); c.fillStyle = 'rgba(255,255,255,.7)'; A.ell(c, -7, -8, 4.5, 3); c.fill(); });
      S('eng', 44, 44, c => { A.ell(c, 0, 0, 19); A.fs(c, A.gr(c, -4, -5, 22, '#8a93ad', '#4a5270', '#1c2036'), A.OUT, 1.5); A.ell(c, 0, 0, 10); A.fs(c, A.gr(c, 0, 0, 10, '#fffbd6', '#ffb347', '#d9480f'), A.OUT, 1); }, 1);
      const k = Wd.key;
      if (k === 'ocean') { for (let i = 0; i < 3; i++) S('isle' + i, 190, 170, c => A.isle(c, 21 + i * 13)); for (let i = 0; i < 2; i++) S('cloud' + i, 190, 124, c => A.cloud(c, 4 + i * 5, 'rgba(255,255,255,.9)', 0, 1)); }
      if (k === 'desert') for (let i = 0; i < 3; i++) S('mesa' + i, 150, 124, c => A.mesa(c, 31 + i * 17));
      if (k === 'city') for (let i = 0; i < 2; i++) S('smog' + i, 190, 124, c => A.cloud(c, 9 + i * 5, 'rgba(30,36,70,.9)', 0, 0));
      if (k === 'storm') for (let i = 0; i < 3; i++) S('cum' + i, 324, 212, c => { c.scale(1.7, 1.7); A.cloud(c, 14 + i * 7, '#69749f', '#2c3358', 1); }); // gros nuages dessinés directement en grand : pas de mise à l'échelle à chaque image
      if (k === 'space') { for (let i = 0; i < 3; i++) S('planet' + i, 230, 170, c => A.planet(c, 40 + i)); S('girder', 50, 204, A.girder); }
      for (const b of [Wd.mid, Wd.boss]) { const D = GX_BOSS[b]; S('hull_' + b, D.w, D.h, c => A[b](c, b === 'cuirasse' || b === 'carrier' || b === 'forteresse' ? g : p, D), 1); }
    }
    function blit(c, s, x, y, rot, sc, img) {
      const w = s.w * (sc || 1), h = s.h * (sc || 1);
      if (rot) { c.save(); c.translate(x, y); c.rotate(rot); c.drawImage(img || s.cv, -w / 2, -h / 2, w, h); c.restore(); } else c.drawImage(img || s.cv, x - w / 2, y - h / 2, w, h);
    }

    /* ---------- décor : une grande tuile par monde, qui boucle verticalement, plus des couches en parallaxe ---------- */
    function buildBg() {
      const key = Math.round(LW) + '|' + ss + '|' + wi; if (key === bgKey) return; bgKey = key;
      const bs = ss <= 2.6 ? ss : 2, r = A.rng(11 + wi * 7), k = Wd.key, pk = a => a[Math.floor(r() * a.length)]; // tuile à la taille exacte de l'écran : elle se recopie sans mise à l'échelle (rapide)
      const tile = fn => { const cv = document.createElement('canvas'); cv.width = Math.ceil(LW * bs - .01); cv.height = Math.round(TH * bs); const c = cv.getContext('2d'); c.scale(cv.width / LW, cv.height / TH); fn(c); return cv; };
      const wrap = (y, m, f) => { f(y); if (y < m) f(y + TH); if (y > TH - m) f(y - TH); }; // ce qui dépasse en haut réapparaît en bas : pas de couture
      const blob = (c, x, y, rad, col) => wrap(y, rad, yy => { const g = c.createRadialGradient(x, yy, 0, x, yy, rad); g.addColorStop(0, col); g.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); c.fillStyle = g; c.fillRect(x - rad, yy - rad, rad * 2, rad * 2); });
      const area = LW * TH; bg = { sp: 1, over: [], col: '#000', bs };
      if (k === 'ocean') {
        bg.col = '#176bb3';
        const waves = (c, a, dens) => { c.strokeStyle = 'rgba(255,255,255,' + a + ')'; c.lineWidth = 1.4; c.lineCap = 'round'; for (let i = 0; i < area / dens; i++) { const x = r() * LW, y = r() * TH, w = 4 + r() * 9; wrap(y, 6, yy => { c.beginPath(); c.moveTo(x - w, yy); c.quadraticCurveTo(x, yy - 4, x + w, yy); c.stroke(); }); } };
        bg.base = tile(c => { c.fillStyle = bg.col; c.fillRect(0, 0, LW, TH); for (let i = 0; i < area / 4200; i++) blob(c, r() * LW, r() * TH, 50 + r() * 120, pk(['rgba(45,150,215,.5)', 'rgba(10,70,150,.5)', 'rgba(80,200,225,.22)'])); waves(c, .3, 1000); });
        bg.over = [{ cv: tile(c => waves(c, .5, 1500)), sp: 1.3, a: .45, sway: 8, off: 0 }]; // une nappe de vaguelettes glisse sur celles du fond : l'eau bouge
      } else if (k === 'desert') {
        bg.col = '#dcae68';
        bg.base = tile(c => {
          c.fillStyle = bg.col; c.fillRect(0, 0, LW, TH); for (let i = 0; i < area / 5000; i++) blob(c, r() * LW, r() * TH, 50 + r() * 110, pk(['rgba(242,205,135,.55)', 'rgba(192,138,72,.42)']));
          const road = (w, col, dx) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); for (let y = -20; y <= TH + 20; y += 15) c.lineTo(LW / 2 + dx + AW * .27 * Math.sin(y / TH * PI * 2), y); c.stroke(); };
          road(30, 'rgba(176,124,66,.45)', 0); road(2.5, 'rgba(120,78,38,.35)', -8); road(2.5, 'rgba(120,78,38,.35)', 8);
          c.strokeStyle = 'rgba(150,95,45,.3)'; c.lineWidth = 1.2; for (let i = 0; i < area / 2400; i++) { const x = r() * LW, y = r() * TH, l = 9 + r() * 18; wrap(y, 8, yy => { c.beginPath(); c.moveTo(x - l, yy); c.quadraticCurveTo(x, yy - 5, x + l, yy); c.stroke(); }); }
          for (let i = 0; i < area / 9000; i++) { const x = r() * LW, y = 10 + r() * (TH - 20), s = 2 + r() * 4; c.fillStyle = 'rgba(80,45,15,.35)'; A.ell(c, x + 2, y + 3, s * 1.3, s); c.fill(); c.fillStyle = '#9a6a40'; A.ell(c, x, y, s * 1.3, s); c.fill(); c.fillStyle = 'rgba(255,225,170,.4)'; A.ell(c, x - s * .4, y - s * .3, s * .5, s * .35); c.fill(); }
          for (let i = 0; i < area / 24000; i++) { const x = 50 + r() * (LW - 100), y = 14 + r() * (TH - 28); c.fillStyle = 'rgba(80,45,15,.3)'; A.ell(c, x + 4, y + 5, 6, 3); c.fill(); c.fillStyle = '#3f8f4a'; Draw.rr(c, x - 1.8, y - 8, 3.6, 15, 1.8); c.fill(); Draw.rr(c, x - 6, y - 3, 12, 3.2, 1.6); c.fill(); c.fillRect(x - 6, y - 6, 3, 5); c.fillRect(x + 3, y - 7, 3, 6); }
          // parois du canyon sur les deux bords
          for (const sd of [0, 1]) {
            const edge = (y, d) => 20 + d + 13 * Math.sin(y / TH * PI * 4 + sd * 2) + 8 * Math.sin(y / TH * PI * 10 + 1 + sd * 3), wall = (d, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(sd ? LW + 5 : -5, -5); for (let y = -5; y <= TH + 5; y += 10) c.lineTo(sd ? LW - edge(y, d) : edge(y, d), y); c.lineTo(sd ? LW + 5 : -5, TH + 5); c.fill(); };
            wall(12, 'rgba(90,50,15,.28)'); wall(0, '#a8663a'); wall(-7, '#c98a52'); wall(-15, '#d99a5c');
          }
        });
      } else if (k === 'city') {
        bg.col = '#151c36';
        bg.base = tile(c => {
          c.fillStyle = bg.col; c.fillRect(0, 0, LW, TH); const PX = 104, PY = 150, x0 = (LW % PX) / 2 - PX + 13;
          c.fillStyle = 'rgba(255,255,255,.16)'; for (let x = x0 - 13; x < LW + PX; x += PX) for (let y = 4; y < TH; y += 24) c.fillRect(x - 1, y, 2, 10); for (let y = 12; y < TH; y += PY) for (let x = 6; x < LW; x += 24) c.fillRect(x, y - 1, 10, 2);
          const build = (x, y, w, h) => {
            const hg = 7 + r() * 9, col = pk(['#27304f', '#2f3a5c', '#343058', '#253050', '#3a3560']); c.fillStyle = '#0a0f20'; c.fillRect(x, y + h - hg, w, hg);
            for (let wx = x + 3; wx < x + w - 4; wx += 6) if (r() < .5) { c.fillStyle = r() < .7 ? '#ffd98a' : '#9fe8ff'; c.fillRect(wx, y + h - hg + 2, 3, Math.min(4, hg - 3)); }
            const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, A.lite(col, .18)); g.addColorStop(1, col); c.fillStyle = g; c.fillRect(x, y, w, h - hg); c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = 1; c.strokeRect(x + .5, y + .5, w - 1, h - hg - 1);
            const t = r(), cx = x + w / 2, cy = y + (h - hg) / 2;
            if (t < .3 && w > 30) { c.fillStyle = 'rgba(255,217,138,.75)'; for (let ix = x + 6; ix < x + w - 7; ix += 9) for (let iy = y + 6; iy < y + h - hg - 7; iy += 9) if (r() < .55) c.fillRect(ix, iy, 4, 4); }
            else if (t < .45 && w > 34 && h > 50) { c.strokeStyle = 'rgba(255,95,162,.7)'; c.lineWidth = 2; A.ell(c, cx, cy, 12); c.stroke(); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(cx - 5, cy - 6, 2.5, 12); c.fillRect(cx + 2.5, cy - 6, 2.5, 12); c.fillRect(cx - 5, cy - 1.2, 10, 2.4); }
            else { for (let i = 0; i < 2; i++) { const ax = x + 5 + r() * Math.max(1, w - 22), ay = y + 5 + r() * Math.max(1, h - hg - 20); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(ax + 2, ay + 2, 11, 8); c.fillStyle = '#4a5578'; c.fillRect(ax, ay, 11, 8); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(ax, ay, 11, 2); } if (r() < .5) { blob(c, cx, cy, 9, 'rgba(255,60,60,.55)'); c.fillStyle = '#ff6b6b'; A.ell(c, cx, cy, 1.6); c.fill(); } }
          };
          for (let bx = x0; bx < LW; bx += PX) for (let j = 0; j < TH / PY; j++) {
            const by = j * PY + 24, t = r();
            if (t < .12) { c.fillStyle = '#12301f'; Draw.rr(c, bx, by, 78, 126, 8); c.fill(); for (let i = 0; i < 9; i++) { c.fillStyle = pk(['#1d5a34', '#2a7a44', '#226a3c']); A.ell(c, bx + 10 + r() * 58, by + 10 + r() * 106, 5 + r() * 5); c.fill(); } }
            else if (t < .5) build(bx, by, 78, 126); else if (t < .78) { build(bx, by, 78, 58); build(bx, by + 64, 78, 62); } else { build(bx, by, 36, 126); build(bx + 42, by, 36, 70); build(bx + 42, by + 76, 36, 50); }
          }
          for (let x = x0 - 13; x < LW + PX; x += PX) for (let y = 12; y < TH; y += PY) { blob(c, x, y, 22, 'rgba(255,215,140,.3)'); c.fillStyle = '#ffe9b0'; A.ell(c, x - 9, y - 9, 1.5); c.fill(); A.ell(c, x + 9, y + 9, 1.5); c.fill(); }
          for (let i = 0; i < area / 9000; i++) { const v = r() < .5, col = r() < .5 ? '#fff6d0' : '#ff5a5a'; c.fillStyle = col; if (v) { const x = x0 - 13 + Math.floor(r() * (LW / PX + 2)) * PX + (r() < .5 ? -5 : 5), y = r() * TH; c.fillRect(x - 2.5, y, 1.6, 1.6); c.fillRect(x + 1, y, 1.6, 1.6); } else { const y = 12 + Math.floor(r() * 4) * PY + (r() < .5 ? -5 : 5), x = r() * LW; c.fillRect(x, y - 2.5, 1.6, 1.6); c.fillRect(x, y + 1, 1.6, 1.6); } }
        });
      } else if (k === 'storm') {
        bg.col = '#262c4a'; bg.sp = .5;
        bg.base = tile(c => { c.fillStyle = bg.col; c.fillRect(0, 0, LW, TH); for (let i = 0; i < area / 3200; i++) blob(c, r() * LW, r() * TH, 50 + r() * 100, pk(['rgba(74,86,136,.5)', 'rgba(18,20,42,.55)', 'rgba(112,124,176,.28)'])); });
      } else {
        bg.col = '#060514'; bg.sp = .3;
        bg.base = tile(c => {
          c.fillStyle = bg.col; c.fillRect(0, 0, LW, TH); for (let i = 0; i < area / 14000; i++) blob(c, r() * LW, r() * TH, 90 + r() * 130, pk(['rgba(120,50,170,.34)', 'rgba(30,110,150,.3)', 'rgba(170,40,100,.24)', 'rgba(40,60,160,.3)']));
          for (let i = 0; i < area / 800; i++) { c.fillStyle = 'rgba(255,255,255,' + (.25 + r() * .6).toFixed(2) + ')'; const s = .7 + r() * 1.1; c.fillRect(r() * LW, r() * TH, s, s); }
        });
        bg.stars = []; for (let i = 0; i < Math.min(70, area / 7000); i++) bg.stars.push({ x: r(), y: r() * TH, s: 1 + r() * 1.4, c: pk(['#ffffff', '#ffffff', '#bfe6ff', '#ffe9b0', '#ffc4f0']), ph: r() * 7 }); // étoiles proches : elles défilent plus vite que le fond et scintillent
      }
    }
    // éléments de décor qui défilent : [image, période d'apparition (s), vitesse (1 = sol), couche (0 sol, 1 nuages bas), opacité, échelle]
    const AMB = { ocean: [['cloud', 6, 1.7, 1, .5, 1.3], ['isle', 15, 1, 0, 1, 1]], desert: [['mesa', 3.4, 1, 0, 1, 1]], city: [['smog', 5, 1.6, 1, .5, 1.6], ['light', 4.5, 1, 0, 1, 1]], storm: [['cum', 2.4, 1, 0, 1, 1], ['cum', 5, 2.2, 1, .3, 1]], space: [['planet', 17, .45, 0, 1, 1], ['girder', 6.5, 1, 0, 1, 1]] };
    const NVAR = { isle: 3, cloud: 2, mesa: 3, smog: 2, cum: 3, planet: 3 };
    function addScen(kind, fx, y, def) {
      const d = def || AMB[Wd.key].find(a => a[0] === kind) || [kind, 0, 1, 0, 1, 1], n = NVAR[kind], s = { kind, spr: kind === 'light' ? null : kind + (n ? rndi(0, n - 1) : ''), pz: d[2], layer: d[3], a: d[4], sc: kind === 'cum' ? 1 : d[5] * rnd(.85, 1.15), ph: rnd(0, 6) };
      // les rochers du désert et les poutrelles de l'espace restent sur les côtés : le milieu doit rester lisible
      s.x = fx !== undefined ? X(fx) : kind === 'mesa' || kind === 'girder' ? (Math.random() < .5 ? rnd(-10, LW * .2) : rnd(LW * .8, LW + 10)) : rnd(0, LW);
      const h = kind === 'light' ? 30 : SP[s.spr].h * s.sc; s.h = h; s.y = y !== undefined ? y : -h / 2 - 4; scen.push(s);
    }

    /* ---------- apparitions ---------- */
    function spl(pts, v) { // Catmull-Rom : la courbe passe par tous les points
      const n = pts.length, i = Math.min(n - 2, Math.floor(v)), f = v - i, p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      const q = k => .5 * (2 * p1[k] + (p2[k] - p0[k]) * f + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f * f + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * f * f * f);
      return [q(0), q(1)];
    }
    const pathPts = name => gxPath(name).map(q => [X(q[0]), q[1] * LH]);
    function spawnAir(type, path, n, o, free) {
      const Tp = GX_AIR[type], fid = ++formId, isPath = !!GX_PATHS[path.replace(/R$/, 'L')], F = forms[fid] = { n, left: n, dead: 0, cap: o.cap, path, pts: isPath ? pathPts(path) : null, free };
      const back = isPath && F.pts[0][1] > LH, d0 = (o.delay || 0) + (back ? 1.2 : 0);
      if (back) warns.push({ x: F.pts[0][0], t: 1.4 + (o.delay || 0) }); // un ennemi qui arrive par derrière est toujours annoncé
      for (let i = 0; i < n; i++) {
        const hp = Math.max(1, Math.round(type === 'fig' || type === 'dart' ? (wi >= 3 ? 2 : 1) : type === 'mis' ? 2 : Tp.hp * hpK()));
        const e = { k: type, T: Tp, fid, hp, max: hp, x: -99, y: -99, rot: 0, t: 0, wait: d0 + i * (o.gap || .3), v: 0, mv: isPath ? 'path' : path, st: 0, flash: 0, acc: 0, cd: Tp.cd ? rnd(Tp.cd[0], Tp.cd[1]) * fireK() * .5 : 9, spr: type, free };
        if (isPath) { e.x = F.pts[0][0]; e.y = F.pts[0][1]; }
        else if (path === 'down') { e.x = X(o.fx !== undefined ? o.fx : rnd(.2, .8)); e.y = -Tp.h; e.ph = rnd(0, 6); }
        else if (path === 'dive') { e.x = X(n > 1 ? .12 + .76 * i / (n - 1) : .5); e.y = -30; e.ty = LH * (.12 + .07 * (i % 2)); e.wait = d0 + i * .2; }
        else if (path === 'hover') { e.x = e.tx = X(o.fx !== undefined ? o.fx : .5); e.y = -40; e.ty = LH * (o.fy || .22); e.stay = 9; }
        else if (path === 'drift') { e.x = X(rnd(.05, .95)); e.y = -30 - i * 50; e.vx = rnd(-24, 24); e.vy = rnd(.8, 1.3) * Tp.sp; e.wait = d0; e.spr = 'rock' + (i % 3); e.vr = rnd(-1.5, 1.5); }
        else if (path === 'seek') { e.x = o.x + (i - (n - 1) / 2) * 30; e.y = o.y; e.a = PI / 2; e.wait = 0; }
        foes.push(e); if (!free) spawned++;
      }
    }
    function spawnGnd(type, fx, o) {
      const Tp = GX_GND[type], hp = Math.round(Tp.hp * hpK()), x = X(fx) + rnd(-8, 8);
      gfoes.push({ k: type, T: Tp, ground: 1, x, x0: x, y: -Tp.h / 2 - 8 - (o.dy || 0), hp, max: hp, cd: rnd(Tp.cd[0], Tp.cd[1]) * fireK() * .6, ang: PI / 2, flash: 0, t: rnd(0, 2), ph: rnd(0, 6), ti: 0, up: Tp.sub ? 0 : 1, acc: 0 }); spawned++;
    }
    function spawnBoss(key) {
      const D = GX_BOSS[key], k = hpK();
      const b = boss = { key, D, mini: !!D.mini, x: LW / 2, y: -D.h / 2 - 10, ty: 0, t: 0, in: true, phase: 1, ai: 0, acd: 2.2, dead: 0, ang: 0, sw: 0, boomT: 0, smokeT: 0 };
      b.parts = D.parts.map(q => { const base = GX_PART[q.k], hp = Math.round((q.hp || base.hp) * k); return { k: q.k, ox: q.x, oy: q.y, r: q.r || base.r, hp, max: hp, alive: true, cd: rnd(1.6, 3.4), ang: PI / 2, flash: 0, x: b.x + q.x, y: b.y + q.y }; });
      b.max = b.hp = b.parts.reduce((s, q) => s + q.hp, 0); bossTy();
      if (!D.mini) spawned++; snd('hit');
    }
    function bossTy() { if (boss) boss.ty = Math.max(boss.D.fy * LH, boss.D.h / 2 - 34); }

    /* ---------- tirs ---------- */
    function bullet(x, y, vx, vy, k) { if (bullets.length < 70) bullets.push({ x, y, vx, vy, k: k || 0, r: k ? 6 : 5 }); }
    function aimShot(x, y, v, n, spread, k) { const a0 = Math.atan2(P.y - y, P.x - x); for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * spread; bullet(x, y, Math.cos(a) * v, Math.sin(a) * v, k); } }
    function fire(kind, x, y) {
      const v = bsp(), easy = soft();
      if (kind === 'aim') aimShot(x, y, v, 1, 0, 0); else if (kind === 'aim3') aimShot(x, y, v, easy ? 2 : 3, .26, 0);
      else { const n = easy ? 3 : 5; for (let i = 0; i < n; i++) { const a = PI / 2 + (i - (n - 1) / 2) * .32; bullet(x, y, Math.cos(a) * v, Math.sin(a) * v, 0); } }
    }
    function addShot(x, y, ang, sp, d, s) { fired++; if (shots.length < 80) shots.push({ x, y, vx: Math.sin(ang) * sp, vy: -Math.cos(ang) * sp, d, s, r: s === 'shotB' ? 6 : 4, rot: ang }); }
    function fireMain() {
      const x = P.x, y = P.y - 22, V = 640;
      if (pw === 1) addShot(x, y, 0, V, 1, 'shot'); else if (pw === 2) { addShot(x - 7, y + 4, 0, V, 1, 'shot'); addShot(x + 7, y + 4, 0, V, 1, 'shot'); }
      else if (pw === 3) { addShot(x, y, 0, V, 1, 'shot'); addShot(x - 9, y + 6, -.12, V, 1, 'shot'); addShot(x + 9, y + 6, .12, V, 1, 'shot'); }
      else { addShot(x, y, 0, V, pw === 5 ? 2 : 1, pw === 5 ? 'shotB' : 'shot'); for (const a of [-.24, -.1, .1, .24]) addShot(x + a * 60, y + 6, a, V, 1, 'shot'); }
    }
    function fireSec() {
      if (sec === 'M') { const n = secLv >= 3 ? 4 : 2; for (let i = 0; i < n && pmis.length < 10; i++) { const s = (i % 2 ? 1 : -1) * (i < 2 ? 1 : 1.7); pmis.push({ x: P.x + s * 12, y: P.y, a: -PI / 2 + s * .7, v: 240, t: 0, d: secLv >= 2 ? 5 : 3 }); } P.sT = .85; }
      else if (sec === 'S') { const A2 = secLv >= 3 ? [PI / 2, -PI / 2, PI * .75, -PI * .75, PI / 4, -PI / 4] : secLv === 2 ? [PI / 2, -PI / 2, PI * .75, -PI * .75] : [PI / 2, -PI / 2]; for (const a of A2) addShot(P.x, P.y, a, 520, 1, 'shotS'); P.sT = .24; }
    }
    function useBomb() {
      if (bombs <= 0 || bombFx > 0 || phase !== 'play') return; bombs--; bombFx = 1; flash = .8; shake = Math.max(shake, .7); P.inv = Math.max(P.inv, 1.6); snd('punch'); snd('ko'); vib(120);
      cancelBullets(); beams = [];
      for (const e of foes) if (e.wait <= 0 && e.y > -30) hit(e, 30); for (const e of gfoes) if (e.y > -20) { e.up = Math.max(e.up, 1); hit(e, 30); }
      if (boss && !boss.in && !boss.dead) { for (const q of boss.parts) if (q.alive && q.k !== 'core') hitPart(q, 14, true); boss.hp -= boss.max * .05; }
      for (let i = 0; i < 7; i++) later(i * .07, () => boom(rnd(20, LW - 20), rnd(30, LH - 60), rnd(26, 46)));
    }
    // les projectiles ennemis effacés deviennent de petites étoiles : la bombe et les changements de phase rapportent
    function cancelBullets() { for (const b of bullets) if (medals.length < 60) medals.push({ x: b.x, y: b.y, vx: rnd(-30, 30), vy: rnd(-70, -20), v: 10, sm: 1, t: 0 }); bullets = []; }

    /* ---------- dégâts, explosions, récompenses ---------- */
    function boom(x, y, size) {
      if (booms.length > 30) booms.shift(); booms.push({ x, y, t: 0, d: .32 + size * .009, r: size });
      const n = Math.min(9, 3 + size / 6 | 0); for (let i = 0; i < n && parts.length < 150; i++) { const a = rnd(0, 7), v = rnd(40, 90 + size * 3); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, l: rnd(.3, .7), c: pick(['#fff3a0', '#ff9f1c', '#ff5a3c', '#ffffff']), r: rnd(1.5, 3.5) }); }
    }
    function say(s, x, y, col, size) { if (texts.length > 14) texts.shift(); for (const q of texts) if (Math.abs(q.x - x) < 90 && Math.abs(q.y - y) < 15) y -= 17; texts.push({ s, x: clamp(x, 16 + s.length * (size || 13) * .32, LW - 16 - s.length * (size || 13) * .32), y, t: 0, col: col || '#ffd23f', size: size || 13 }); }
    function dropMedals(x, y, n) { for (let i = 0; i < n && medals.length < 60; i++) medals.push({ x: x + rnd(-12, 12), y: y + rnd(-10, 10), vx: rnd(-50, 50), vy: rnd(-110, -40), v: 50, t: 0 }); }
    function pickCap() { // capsule « au choix » : on donne ce qui manque le plus
      const w = [['P', pw < 5 ? 5 : .4], ['L', sec === 'L' && secLv >= 3 ? .2 : 1], ['M', sec === 'M' && secLv >= 3 ? .2 : 1], ['S', sec === 'S' && secLv >= 3 ? .2 : .8], ['B', bombs < 5 ? (bombs === 0 ? .8 : .2) : 0], ['sh', P.shield ? 0 : 1.1], ['D', drones < 2 ? 1.2 : 0], ['life', lives < MAXLIVES ? (lives <= 2 ? 2.2 : .2) : 0]];
      let tot = 0; for (const q of w) tot += q[1]; let v = Math.random() * tot; for (const q of w) { v -= q[1]; if (v <= 0) return q[0]; } return 'P';
    }
    function dropCap(k, x, y) { const a = rnd(.6, 2.5); picks.push({ k: k === 'auto' ? pickCap() : k, x: clamp(x, 30, LW - 30), y: clamp(y, 30, LH * .6), vx: Math.cos(a) * 52, vy: Math.abs(Math.sin(a)) * 52, t: 0 }); }
    function addScore(n) { score += Math.round(n) * mult; }
    function hit(e, d) { if (e.dead) return; e.hp -= d; e.flash = .09; if (e.hp <= 0) kill(e); }
    function kill(e) {
      if (e.dead) return; e.dead = true; const Tp = e.T; addScore(Tp.pts); combo++; comboT = 3.2; mult = Math.min(8, 1 + (combo / 8 | 0)); if (!e.free) kills++;
      boom(e.x, e.y, Tp.r * 1.7); if (Tp.r > 16) { later(.08, () => boom(e.x + rnd(-10, 10), e.y + rnd(-10, 10), Tp.r)); shake = Math.max(shake, .25); snd('punch'); } else snd('pop'); vib(8);
      dropMedals(e.x, e.y, Tp.med); if (e.k === 'bomb') dropCap('auto', e.x, e.y);
      if (e.ground && (Wd.key === 'desert' || Wd.key === 'city')) scen.push({ kind: 'crater', spr: 'crater', x: e.x, y: e.y, pz: 1, layer: 0, a: 1, sc: Tp.r / 13, h: 40, ph: 0 });
      const F = forms[e.fid]; if (F) { F.dead++; if (F.dead === F.n && F.n > 2 && !F.free) { addScore(500); say('FORMATION +' + 500 * mult, e.x, e.y - 14, '#9dff5c', 14); snd('coin'); if (F.cap) dropCap(F.cap, e.x, e.y); else dropMedals(e.x, e.y, 3); } }
    }
    function hitPart(q, d, force) {
      const b = boss, armored = q.k === 'core' && !force && b.parts.some(z => z.alive && z.k !== 'core'); if (armored) d *= .6;
      q.flash = .09; if (q.k === 'core') { b.hp -= d; return; }
      const dd = Math.min(d, q.hp); q.hp -= dd; b.hp -= dd;
      if (q.hp <= 0) { q.alive = false; boom(q.x, q.y, 34); later(.1, () => boom(q.x, q.y, 22)); dropMedals(q.x, q.y, 3); addScore(1000); say('+' + 1000 * mult, q.x, q.y - 16); shake = Math.max(shake, .35); snd('punch'); vib(30); }
    }
    // un tir du joueur touche-t-il le boss ? D'abord les points faibles, puis (boss volants) le centre de la coque, qui vaut un demi-coup au cœur
    function bossHit(x, y, d, r) {
      const b = boss; if (!b || b.in || b.dead) return false;
      for (const q of b.parts) if (q.alive && (x - q.x) * (x - q.x) + (y - q.y) * (y - q.y) < (q.r + r) * (q.r + r)) { hitPart(q, d); return true; }
      if (!b.D.ground && Math.hypot(x - b.x, y - b.y) < b.D.cr) { hitPart(b.parts[b.parts.length - 1], d * .5); return true; }
      return false;
    }
    function hurt() {
      if (P.inv > 0 || god || phase !== 'play') return;
      if (P.shield) { P.shield = 0; P.inv = 1.3; snd('ko'); boom(P.x, P.y, 20); say('Bouclier brisé', P.x, P.y - 34, '#38e0d6'); clearNear(110); return; }
      // 8-12 ans : s'il reste une bombe, elle part toute seule et sauve la vie (« bombe de secours »)
      if (!hard && bombs > 0 && bombFx <= 0) { noHit = false; useBomb(); say('BOMBE DE SECOURS !', P.x, P.y - 36, '#c084fc', 15); return; }
      lives--; noHit = false; combo = 0; mult = 1; P.inv = soft() && !hard ? 3.2 : 2.6; pw = Math.max(1, pw - 1); snd('hit'); vib(150); shake = Math.max(shake, .6); flash = Math.max(flash, .35); boom(P.x, P.y, 40); clearNear(170);
      if (lives <= 0) { phase = 'dead'; phT = 0; for (let i = 0; i < 6; i++) later(i * .12, () => boom(P.x + rnd(-24, 24), P.y + rnd(-24, 24), rnd(24, 44))); }
    }
    function clearNear(rad) { bullets = bullets.filter(b => Math.hypot(b.x - P.x, b.y - P.y) > rad); }
    function collect(k, x, y) {
      const C = GX_CAPS[k]; let msg = C.n; snd('ok'); vib(25);
      if (k === 'P') { if (pw < 5) { pw++; msg = pw === 5 ? 'TIR MAXIMUM !' : 'TIR NIVEAU ' + pw; } else { addScore(1000); msg = '+' + 1000 * mult; } }
      else if (GX_SEC[k]) { if (sec === k) { if (secLv < 3) secLv++; else addScore(1000); } else { sec = k; secLv = Math.max(1, secLv); } msg = C.n + ' NIVEAU ' + secLv; P.sT = 0; }
      else if (k === 'B') { if (bombs < 5) bombs++; else addScore(500); msg = 'BOMBE +1'; }
      else if (k === 'sh') { P.shield = 1; }
      else if (k === 'life') { if (lives < MAXLIVES) { lives++; msg = 'VIE +1'; } else { addScore(2000); msg = '+' + 2000 * mult; } }
      else if (k === 'D') { if (drones < 2) drones++; else addScore(1000); msg = 'AILIER'; }
      say(msg, x, y - 22, C.c, 15); for (let i = 0; i < 8 && parts.length < 150; i++) { const a = i * .785; parts.push({ x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, t: 0, l: .4, c: C.c, r: 2.5 }); }
    }

    /* ---------- le monde : scénario, début, fin ---------- */
    function persist() { env.save({ w: wi, score, lives, bombs, pw, sec, secLv, drones }, 'Monde ' + (wi + 1) + ' · ' + Wd.n + ' · ' + score + ' pts'); GX_CHECK = { pid: env.profile && env.profile.id, w: wi }; }
    function startWorld(i, silent) {
      wi = i; Wd = GX_WORLDS[i]; foes = []; gfoes = []; shots = []; pmis = []; bullets = []; beams = []; picks = []; medals = []; booms = []; parts = []; texts = []; scen = []; warns = []; timers = []; forms = {};
      boss = null; si = 0; sT = Wd.script[0][0]; hold = ''; recap = null; kills = spawned = medalsGot = 0; noHit = true; combo = 0; mult = 1; boltT = 5; laser = null;
      buildSprites(); buildBg(); P.x = LW / 2; P.y = LH - 90; P.inv = 2.5; P.bank = 0; phase = 'play'; phT = 0; fade = 1;
      amb = AMB[Wd.key].map(d => ({ d, t: rnd(.3, d[1]) })); for (const a of amb) for (let y = rnd(0, 150); y < LH; y += a.d[1] * SCROLL * a.d[2] * rnd(.7, 1.3)) if (a.d[0] !== 'isle' && a.d[0] !== 'planet') addScen(a.d[0], undefined, y, a.d);
      banner = { a: 'MONDE ' + (i + 1) + ' / ' + NW, b: Wd.n.toUpperCase(), c: i === 0 && !silent ? 'Glisse ton doigt : l\'avion te suit et tire tout seul' : '', t: 0, d: 3.4 };
      if (!silent) persist();
    }
    function act(a) {
      if (a[0] === 'a') spawnAir(a[1], a[2], a[3], a[4]); else if (a[0] === 'g') spawnGnd(a[1], a[2], a[3]); else if (a[0] === 's') addScen(a[1], a[2]);
      else if (a[0] === 'mid') { hold = 'mid'; spawnBoss(Wd.mid); banner = { a: 'MINI-BOSS', b: boss.D.name, c: '', t: 0, d: 2.4, warn: 1 }; }
      else if (a[0] === 'boss') { hold = 'wait'; holdT = 0; }
    }
    function runScript(dt) {
      if (hold === 'mid') { if (boss) return; hold = ''; }
      if (hold === 'boss') return;
      if (hold === 'warn') { holdT -= dt; if (Math.floor(holdT * 2.5) !== Math.floor((holdT + dt) * 2.5)) snd('tick'); if (holdT <= 0) { hold = 'boss'; spawnBoss(Wd.boss); } return; }
      if (hold === 'wait') { // avant le boss, on laisse l'écran se vider
        holdT += dt; if ((foes.length <= 1 && gfoes.length <= 1) || holdT > 7) { hold = 'warn'; holdT = 3; cancelBullets(); snd('ko'); vib(200); } return;
      }
      sT -= dt; while (sT <= 0 && si < Wd.script.length && !hold) { const row = Wd.script[si++]; for (let k = 1; k < row.length; k++) act(row[k]); if (si < Wd.script.length) sT += Wd.script[si][0] * (hard ? .95 : 1.08); }
    }
    function bossDown() {
      const b = boss; boss = null; flash = 1; shake = 1; boom(b.x, b.y, 90); snd('win'); vib(250);
      dropMedals(b.x, b.y, b.mini ? 8 : 16); addScore(b.mini ? 3000 : 8000 * (wi + 1)); say('+' + (b.mini ? 3000 : 8000 * (wi + 1)) * mult, b.x, b.y, '#ffd23f', 20); combo += 8; comboT = 4;
      if (b.mini) { dropCap('auto', b.x, b.y); dropCap(pw < 4 ? 'P' : 'auto', b.x + 30, b.y); return; }
      kills++; phase = 'clear'; phT = 0; const k0 = kills, s0 = score; for (const e of foes) if (e.wait <= 0) kill(e); foes = []; for (const e of gfoes.slice()) kill(e); kills = k0; score = s0; cancelBullets(); beams = []; // tout ce qui reste explose avec lui (sans compter dans le score)
    }
    function makeRecap() {
      const pct = spawned ? Math.min(1, kills / spawned) : 1, rows = [['Ennemis détruits', kills + ' / ' + spawned, Math.round(pct * 100) * 40], ['Étoiles ramassées', '' + medalsGot, medalsGot * 30], ['Vies restantes', '' + lives, lives * 500], ['Bombes gardées', '' + bombs, bombs * 200]];
      if (noHit) rows.push(['Sans une égratignure !', '', 4000]);
      let total = 0; for (const q of rows) total += q[2]; total *= wi + 1; score += total;
      let gift = ''; if (wi < NW - 1 && lives < (hard ? 3 : 4)) { lives++; gift = '+1 vie offerte pour la suite'; } // un coup de pouce à ceux qui finissent le monde de justesse
      recap = { rows, total, gift, t: 0, last: wi === NW - 1 }; phase = 'recap'; phT = 0; snd('win');
    }
    function next() {
      if (phase !== 'recap') return;
      if (wi === NW - 1) { over = true; GX_CHECK = null; env.setScore(score); env.gameOver(score, { win: true, title: 'Galaxie sauvée !', text: 'Les ' + NW + ' mondes terminés' }); return; }
      phase = 'trans'; phT = 0;
    }
    function choose(cont) { const w = cont && GX_CHECK ? clamp(GX_CHECK.w | 0, 0, NW - 1) : 0; btns = []; if (cont) pw = 2; startWorld(w); }

    /* ---------- simulation ---------- */
    function updPlayer(dt) {
      const ox = P.x; let bomb = input.pressed.a;
      if (ctl) { const dx = ctl.x - P.x, dy = ctl.y - P.y, d = Math.hypot(dx, dy), m = Math.min(d, ctl.sp * dt); if (d > .5) { P.x += dx / d * m; P.y += dy / d * m; } if (ctl.bomb) { bomb = true; ctl.bomb = false; } }
      else {
        // au doigt : l'avion se place un peu au-dessus du doigt, pour qu'on le voie toujours
        if (input.pointer.down) { const dx = input.pointer.x / u - P.x, dy = input.pointer.y / u - 46 - P.y, d = Math.hypot(dx, dy), m = Math.min(d, 1000 * dt); if (d > .5) { P.x += dx / d * m; P.y += dy / d * m; } }
        let kx = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0), ky = (input.held.down ? 1 : 0) - (input.held.up ? 1 : 0); if (kx && ky) { kx *= .707; ky *= .707; } P.x += kx * 300 * dt; P.y += ky * 300 * dt;
      }
      P.x = clamp(P.x, 16, LW - 16); P.y = clamp(P.y, 34, LH - 22);
      P.bank += (clamp((P.x - ox) / Math.max(dt, .001) / 260, -1, 1) - P.bank) * Math.min(1, dt * 10); P.inv = Math.max(0, P.inv - dt);
      if (bomb) useBomb();
      if (phase !== 'play') { laser = null; return; }
      P.fT -= dt; if (P.fT <= 0) { fireMain(); P.fT = .17; }
      if (sec === 'M' || sec === 'S') { P.sT -= dt; if (P.sT <= 0) fireSec(); }
      if (drones) { P.dT -= dt; if (P.dT <= 0) { P.dT = .34; for (let i = 0; i < drones; i++) addShot(P.x + (i ? 30 : -30), P.y - 4, 0, 640, 1, 'shot'); } }
      // laser : un rayon continu qui traverse les petits ennemis
      if (sec === 'L') {
        const w = [7, 11, 16][secLv - 1], dps = [11, 18, 27][secLv - 1]; laser = { x: P.x, y: P.y - 24, w, top: 0 };
        const zap = e => { if (e.dead || Math.abs(e.x - P.x) > e.T.r + w / 2 || e.y > P.y - 10 || e.y < -10) return; e.acc += dps * dt; if (e.acc >= 1) { const n = Math.floor(e.acc); e.acc -= n; hit(e, n); } };
        for (const e of foes) if (e.wait <= 0) zap(e); for (const e of gfoes) if (e.up > .6) zap(e);
        if (boss && !boss.in && !boss.dead) { // sur un boss, le rayon s'arrête au premier point faible rencontré
          let best = null; for (const q of boss.parts) if (q.alive && Math.abs(q.x - P.x) < q.r + w / 2 && q.y < P.y && (!best || q.y > best.y)) best = q;
          if (!best && !boss.D.ground && Math.abs(boss.x - P.x) < boss.D.cr && boss.y < P.y) best = boss.parts[boss.parts.length - 1];
          if (best) { P.lz += dps * dt * (best.k === 'core' && Math.abs(best.x - P.x) > best.r ? .5 : 1); if (P.lz >= 1) { const n = Math.floor(P.lz); P.lz -= n; hitPart(best, n); } laser.top = best.y; }
        }
      } else laser = null;
    }
    function updShots(dt) {
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i]; s.x += s.vx * dt; s.y += s.vy * dt; let gone = s.y < -16 || s.y > LH + 16 || s.x < -16 || s.x > LW + 16;
        if (!gone) for (const e of foes) { if (e.wait > 0 || e.dead) continue; const rr = e.T.r + s.r; if ((e.x - s.x) * (e.x - s.x) + (e.y - s.y) * (e.y - s.y) < rr * rr) { hit(e, s.d); gone = true; break; } }
        if (!gone) for (const e of gfoes) { if (e.dead || e.up < .6) continue; const rr = e.T.r + s.r; if ((e.x - s.x) * (e.x - s.x) + (e.y - s.y) * (e.y - s.y) < rr * rr) { hit(e, s.d); gone = true; break; } }
        if (!gone && boss && bossHit(s.x, s.y, s.d, s.r)) gone = true;
        if (gone) { if (s.y > 0 && s.y < LH && s.x > 0 && s.x < LW && parts.length < 150) parts.push({ x: s.x, y: s.y, vx: rnd(-40, 40), vy: rnd(-10, 60), t: 0, l: .18, c: '#fff3a0', r: 2 }); shots.splice(i, 1); }
      }
      // missiles à tête chercheuse : chacun choisit la cible la plus proche et tourne vers elle
      for (let i = pmis.length - 1; i >= 0; i--) {
        const m = pmis[i]; m.t += dt; m.v = Math.min(420, m.v + 500 * dt); let best = null, bd = 1e9;
        const see = (x, y, o, part) => { if (y < -10 || y > LH) return; const d = (x - m.x) * (x - m.x) + (y - m.y) * (y - m.y); if (d < bd) { bd = d; best = { x, y, o, part }; } };
        for (const e of foes) if (e.wait <= 0 && !e.dead) see(e.x, e.y, e); for (const e of gfoes) if (!e.dead && e.up > .6) see(e.x, e.y, e);
        if (boss && !boss.in && !boss.dead) for (const q of boss.parts) if (q.alive) see(q.x, q.y, q, 1);
        if (best) { let da = Math.atan2(best.y - m.y, best.x - m.x) - m.a; while (da > PI) da -= PI * 2; while (da < -PI) da += PI * 2; m.a += clamp(da, -6 * dt, 6 * dt); }
        m.x += Math.cos(m.a) * m.v * dt; m.y += Math.sin(m.a) * m.v * dt;
        if (parts.length < 150 && Math.random() < dt * 30) parts.push({ x: m.x, y: m.y, vx: 0, vy: 30, t: 0, l: .3, c: 'rgba(255,255,255,.6)', r: 2 });
        let gone = m.t > 3.2 || m.y < -20 || m.y > LH + 20 || m.x < -20 || m.x > LW + 20;
        if (!gone && best && bd < (best.part ? best.o.r + 8 : best.o.T.r + 8) ** 2) { if (best.part) hitPart(best.o, m.d); else hit(best.o, m.d); boom(m.x, m.y, 12); gone = true; }
        if (gone) pmis.splice(i, 1);
      }
    }
    function updFoes(dt) {
      const spK = 1 + wi * .06;
      for (let i = foes.length - 1; i >= 0; i--) {
        const e = foes[i], Tp = e.T; let out = e.dead;
        if (!out && e.wait > 0) { e.wait -= dt; continue; }
        if (!out) {
          e.t += dt; e.flash = Math.max(0, e.flash - dt); const sp = Tp.sp * spK;
          if (e.mv === 'path') {
            const pts = forms[e.fid].pts, n = pts.length - 1, a = spl(pts, e.v), b = spl(pts, Math.min(n, e.v + .02)), d = Math.hypot(b[0] - a[0], b[1] - a[1]) / .02 || 1;
            e.v += sp * dt / d; if (e.v >= n) out = true; else { const q = spl(pts, e.v); e.x = q[0]; e.y = q[1]; e.rot = Math.atan2(b[1] - a[1], b[0] - a[0]) - PI / 2; }
          } else if (e.mv === 'down') { e.y += sp * dt; e.x += Math.sin(e.t * 1.3 + e.ph) * 16 * dt; out = e.y > LH + Tp.h; }
          else if (e.mv === 'dive') { // descend, s'arrête en clignotant (on a le temps de voir venir), puis fonce tout droit
            if (e.st === 0) { e.y += sp * 1.3 * dt; if (e.y >= e.ty) { e.st = 1; e.t1 = mix(.8, .55); } }
            else if (e.st === 1) { e.t1 -= dt; const a = Math.atan2(P.y - e.y, P.x - e.x); e.rot = a - PI / 2; if (e.t1 <= 0) { e.st = 2; e.vx = Math.cos(a) * sp * 2.2; e.vy = Math.sin(a) * sp * 2.2; } }
            else { e.x += e.vx * dt; e.y += e.vy * dt; out = e.y > LH + 30 || e.x < -30 || e.x > LW + 30 || e.y < -40; }
          } else if (e.mv === 'hover') {
            if (e.st === 0) { e.y += (e.ty - e.y) * Math.min(1, dt * 2) + 8 * dt; if (e.y > e.ty - 3) { e.st = 1; e.t = 0; } }
            else if (e.st === 1) { e.stay -= dt; e.x = e.tx + Math.sin(e.t * .9) * 28; e.y = e.ty + Math.sin(e.t * 1.7) * 8; if (e.stay <= 0) e.st = 2; }
            else { e.y -= sp * dt; out = e.y < -50; }
          } else if (e.mv === 'drift') { e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.vr * dt; out = e.y > LH + 30; }
          else if (e.mv === 'seek') { if (e.t < 3) { let da = Math.atan2(P.y - e.y, P.x - e.x) - e.a; while (da > PI) da -= PI * 2; while (da < -PI) da += PI * 2; e.a += clamp(da, -1.3 * dt, 1.3 * dt); } e.x += Math.cos(e.a) * sp * dt; e.y += Math.sin(e.a) * sp * dt; e.rot = e.a - PI / 2; out = e.t > 8 || e.y > LH + 30 || e.x < -30 || e.x > LW + 30 || e.y < -60; if (parts.length < 150 && Math.random() < dt * 20) parts.push({ x: e.x, y: e.y, vx: 0, vy: -20, t: 0, l: .35, c: 'rgba(255,200,120,.7)', r: 2.2 }); }
          // tir
          if (Tp.fire && !out) { e.cd -= dt; if (e.cd <= 0) { e.cd = rnd(Tp.cd[0], Tp.cd[1]) * fireK(); if (e.y > 10 && e.y < LH * .66 && e.x > 0 && e.x < LW && Math.hypot(P.x - e.x, P.y - e.y) > 110 && (e.k !== 'fig' || Math.random() < figFire()) && phase === 'play') fire(Tp.fire, e.x, e.y + 8); } }
          // contact avec le joueur (zone indulgente)
          if (!out && Math.hypot(P.x - e.x, P.y - e.y) < Tp.r * .55 + 4 && P.inv <= 0 && phase === 'play' && !god) { hurt(); if (e.max <= 2) kill(e); out = e.dead; }
        }
        if (out) { const F = forms[e.fid]; if (F && --F.left <= 0) delete forms[e.fid]; foes.splice(i, 1); }
      }
      for (let i = gfoes.length - 1; i >= 0; i--) {
        const e = gfoes[i], Tp = e.T; if (e.dead) { gfoes.splice(i, 1); continue; }
        e.t += dt; e.flash = Math.max(0, e.flash - dt); e.y += (SCROLL + Tp.rel) * dt; if (Tp.roam) e.x = e.x0 + Math.sin(e.t * .6 + e.ph) * Tp.roam; if (Tp.sway) e.x = e.x0 + Math.sin(e.t * .8 + e.ph) * 10;
        if (Tp.sub) { const c = e.t % 9; e.up = clamp(c < 2.4 ? 0 : c < 3.2 ? (c - 2.4) / .8 : c < 7.4 ? 1 : 1 - (c - 7.4) / .8, 0, 1); } // le sous-marin : sous l'eau, il est intouchable
        if (e.y > LH + Tp.h) { gfoes.splice(i, 1); continue; }
        let da = Math.atan2(P.y - e.y, P.x - e.x) - e.ang; while (da > PI) da -= PI * 2; while (da < -PI) da += PI * 2; e.ang += da * Math.min(1, dt * 4);
        e.cd -= dt; if (e.cd <= 0) { e.cd = rnd(Tp.cd[0], Tp.cd[1]) * fireK(); if (e.y > 16 && e.y < LH * .72 && e.up > .9 && Math.hypot(P.x - e.x, P.y - e.y) > 100 && phase === 'play') { const tu = Tp.tur.length ? Tp.tur[e.ti++ % Tp.tur.length] : [0, 0]; fire(Tp.fire, e.x + tu[0] + Math.cos(e.ang) * 12, e.y + tu[1] + Math.sin(e.ang) * 12); } }
      }
    }
    function attack(name) {
      const b = boss, c = b.parts[b.parts.length - 1], v = bsp(), ph = b.phase, tough = H() > .6, alive = () => boss === b && !b.dead;
      if (name === 'fan') aimShot(c.x, c.y, v, (b.mini ? 2 : 3) + Math.round(ph * mix(1, 2) + mix(1, 0)), .21, 1);
      else if (name === 'burst') for (let i = 0; i < (soft() ? 2 : 3); i++) later(i * .3, () => { if (alive()) aimShot(c.x, c.y, v * (soft() ? 1 : 1.25), tough && ph > 1 ? 2 : 1, .16, 1); });
      else if (name === 'ring') { const n = 7 + ph * 2 + Math.round(H() * 3), a0 = rnd(0, 7); for (let i = 0; i < n; i++) bullet(c.x, c.y, Math.cos(a0 + i / n * PI * 2) * v * .8, Math.sin(a0 + i / n * PI * 2) * v * .8, 1); }
      else if (name === 'spiral') { const n = 10 + ph * 2 + Math.round(H() * 4), a0 = rnd(0, 7); for (let i = 0; i < n; i++) later(i * .13, () => { if (!alive()) return; const a = a0 + i * .44; bullet(c.x, c.y, Math.cos(a) * v * .85, Math.sin(a) * v * .85, 1); bullet(c.x, c.y, -Math.cos(a) * v * .85, -Math.sin(a) * v * .85, 1); }); }
      else if (name === 'rain') { const n = 4 + ph + Math.round(H() * 2); for (let i = 0; i < n; i++) later(i * .2, () => { if (alive()) bullet(X(rnd(.04, .96)), -8, 0, v * .95, 1); }); }
      else if (name === 'summon') spawnAir('fig', pick(['sL', 'sR', 'arcL', 'arcR', 'vL', 'vR']), 3 + (ph > 1 ? 1 : 0), {}, true);
      else if (name === 'torp') spawnAir('mis', 'seek', ph > 2 || tough ? 2 : 1, { x: c.x, y: c.y + 10 }, true);
      else if (name === 'beam' || name === 'beam2') { beams.push({ x: P.x, w: 30, warn: mix(1.25, 1), t: .7 }); if (name === 'beam2') beams.push({ x: clamp(P.x + (Math.random() < .5 ? -1 : 1) * rnd(70, 110), 20, LW - 20), w: 30, warn: mix(1.5, 1.2), t: .7 }); snd('tick'); }
    }
    function updBoss(dt) {
      const b = boss, D = b.D; b.t += dt;
      if (b.dead) { // agonie : une chaîne d'explosions le long de la coque
        b.dead += dt; b.boomT -= dt; if (b.boomT <= 0) { b.boomT = .11; boom(b.x + rnd(-.4, .4) * D.w, b.y + rnd(-.4, .4) * D.h, rnd(18, 40)); shake = Math.max(shake, .3); snd('punch'); }
        if (b.dead > (b.mini ? 1.3 : 2.5)) bossDown(); return;
      }
      if (b.leave) { b.y -= 70 * dt; if (b.y < -D.h) { boss = null; return; } }
      else if (b.in) { b.y = Math.min(b.ty, b.y + 75 * dt); if (b.y >= b.ty) b.in = false; }
      else { b.sw += dt * (.42 + b.phase * .1); b.x = LW / 2 + Math.sin(b.sw) * Math.max(0, Math.min(D.sway * AW, (LW - D.w) / 2 - 4)); b.y = b.ty + (D.ground ? 0 : Math.sin(b.t * .8) * 10); if (b.mini && b.t > 50) b.leave = true; }
      if (D.orbit) b.ang += dt * .3;
      const ca = Math.cos(b.ang), sa = Math.sin(b.ang);
      for (const q of b.parts) {
        const rot = D.orbit && q.k !== 'core'; q.x = b.x + (rot ? q.ox * ca - q.oy * sa : q.ox); q.y = b.y + (rot ? q.ox * sa + q.oy * ca : q.oy); q.flash = Math.max(0, q.flash - dt);
        if (!q.alive || b.in || b.leave || (q.k !== 'gun' && q.k !== 'big')) continue;
        let da = Math.atan2(P.y - q.y, P.x - q.x) - q.ang; while (da > PI) da -= PI * 2; while (da < -PI) da += PI * 2; q.ang += da * Math.min(1, dt * 3);
        q.cd -= dt; if (q.cd <= 0) { q.cd = rnd(2.8, 4.2) * fireK() * (q.k === 'big' ? 1.25 : 1) * (soft() && !hard ? 1.8 : 1); if (q.y > 0 && q.y < LH * .8 && Math.hypot(P.x - q.x, P.y - q.y) > 90 && phase === 'play') aimShot(q.x + Math.cos(q.ang) * 16, q.y + Math.sin(q.ang) * 16, bsp(), q.k === 'big' ? (wi === 0 && !hard ? 2 : 3) : 1, .24, 0); }
      }
      if (b.in || b.leave) return;
      const f = b.hp / b.max, ph = D.atk.length < 3 ? (f > .5 ? 1 : 2) : f > .62 ? 1 : f > .3 ? 2 : 3;
      if (ph > b.phase) { b.phase = ph; b.acd = 1.8; cancelBullets(); shake = Math.max(shake, .5); flash = Math.max(flash, .4); snd('ko'); say(ph === D.atk.length ? 'IL S\'ÉNERVE !' : 'PHASE ' + ph, b.x, b.y + 30, '#ff4f9a', 18); for (let i = 0; i < 4; i++) later(i * .1, () => boom(b.x + rnd(-.35, .35) * D.w, b.y + rnd(-.35, .35) * D.h, 26)); }
      b.acd -= dt; if (b.acd <= 0 && phase === 'play') { const L = D.atk[b.phase - 1]; attack(L[b.ai++ % L.length]); b.acd = Math.max(1.1, 3.3 - b.phase * .35 - wi * .14) * mix(1.3, .85) * (b.mini ? 1.15 : 1) * (soft() ? (hard ? 1.3 : 1.5) : 1); }
      if (b.hp < b.max * .5) { b.smokeT -= dt; if (b.smokeT <= 0 && parts.length < 150) { b.smokeT = .12; parts.push({ x: b.x + rnd(-.3, .3) * D.w, y: b.y + rnd(-.3, .3) * D.h, vx: rnd(-10, 10), vy: SCROLL, t: 0, l: .9, c: 'rgba(40,40,50,.5)', r: rnd(4, 8) }); } }
      if (!D.ground && Math.hypot(P.x - b.x, P.y - b.y) < D.cr) hurt();
      if (b.hp <= 0) { b.dead = .001; cancelBullets(); beams = []; for (const q of b.parts) q.alive = false; snd('hit'); }
    }
    function updMisc(dt) {
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; if (!b) continue; b.x += b.vx * dt; b.y += b.vy * dt; // (être touché efface les projectiles voisins : la liste peut raccourcir)
        if (b.y > LH + 12 || b.y < -30 || b.x < -12 || b.x > LW + 12) { bullets.splice(i, 1); continue; }
        if (P.inv <= 0 && (b.x - P.x) * (b.x - P.x) + (b.y - P.y) * (b.y - P.y) < (b.r * .7 + 4) * (b.r * .7 + 4)) { bullets.splice(i, 1); hurt(); }
      }
      for (let i = beams.length - 1; i >= 0; i--) { const b = beams[i]; if (!b) continue; if (b.warn > 0) { b.warn -= dt; if (b.warn <= 0) { snd('hit'); shake = Math.max(shake, .3); if (b.bolt) skyFlash = 1; } } else { b.t -= dt; if (Math.abs(P.x - b.x) < b.w / 2 + 3) hurt(); if (b.t <= 0) beams.splice(i, 1); } }
      // capsules : elles rebondissent un moment dans l'écran pour laisser le temps de les attraper
      for (let i = picks.length - 1; i >= 0; i--) {
        const p = picks[i]; p.t += dt; const d = Math.hypot(P.x - p.x, P.y - p.y);
        if (d < 70 && phase !== 'dead') { p.x += (P.x - p.x) / d * 240 * dt; p.y += (P.y - p.y) / d * 240 * dt; } else { p.x += p.vx * dt; p.y += p.vy * dt; }
        if (p.t < 11) { if (p.x < 22 || p.x > LW - 22) { p.vx = Math.abs(p.vx) * (p.x < 22 ? 1 : -1); } if (p.y < 40) p.vy = Math.abs(p.vy); if (p.y > LH - 60) p.vy = -Math.abs(p.vy); }
        if (d < 28 && phase !== 'dead') { collect(p.k, p.x, p.y); picks.splice(i, 1); } else if (p.y > LH + 30) picks.splice(i, 1);
      }
      const all = phase === 'clear';
      for (let i = medals.length - 1; i >= 0; i--) {
        const m = medals[i]; m.t += dt; const dx = P.x - m.x, dy = P.y - m.y, d = Math.hypot(dx, dy) || 1;
        if ((d < 95 || all) && phase !== 'dead') { const v = all ? 620 : 380; m.x += dx / d * v * dt; m.y += dy / d * v * dt; } else { m.vy = Math.min(SCROLL + 36, m.vy + 170 * dt); m.vx *= 1 - Math.min(1, dt * 2); m.x += m.vx * dt; m.y += m.vy * dt; }
        if (d < 24 && phase !== 'dead') { score += m.v * mult; if (!m.sm) medalsGot++; snd('coin'); medals.splice(i, 1); } else if (m.y > LH + 20) medals.splice(i, 1);
      }
      for (let i = booms.length - 1; i >= 0; i--) { const b = booms[i]; b.t += dt; b.y += SCROLL * .5 * dt; if (b.t >= b.d) booms.splice(i, 1); }
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t >= p.l) parts.splice(i, 1); }
      for (let i = texts.length - 1; i >= 0; i--) { const q = texts[i]; q.t += dt; q.y -= 26 * dt; if (q.t > 1.3) texts.splice(i, 1); }
      for (let i = warns.length - 1; i >= 0; i--) { warns[i].t -= dt; if (warns[i].t <= 0) warns.splice(i, 1); }
      for (let i = scen.length - 1; i >= 0; i--) { const s = scen[i]; s.y += SCROLL * s.pz * dt; if (s.y - s.h / 2 - 200 * (s.kind === 'light') > LH + 10) scen.splice(i, 1); }
      for (const a of amb) { a.t -= dt; if (a.t <= 0) { a.t = a.d[1] * rnd(.7, 1.3); if (scen.length < 26) addScen(a.d[0], undefined, undefined, a.d); } }
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) { combo = 0; mult = 1; } }
      // monde de l'orage : la foudre tombe là où se trouve le joueur, après un avertissement bien visible
      skyFlash = Math.max(0, skyFlash - dt * 3);
      if (Wd.bolts && phase === 'play' && !boss && hold !== 'warn') { boltT -= dt; if (boltT <= 0) { boltT = rnd(5, 8); beams.push({ x: clamp(P.x + rnd(-30, 30), 20, LW - 20), w: 26, warn: mix(1.4, 1.2), t: .4, bolt: 1 }); snd('tick'); } }
    }
    function sim(dt) {
      T += dt; phT += dt; shake = Math.max(0, shake - dt * 1.8); flash = Math.max(0, flash - dt * 2.2); bombFx = Math.max(0, bombFx - dt * 1.6); fade = Math.max(0, fade - dt * 1.5);
      scroll += SCROLL * dt; if (banner) { banner.t += dt; if (banner.t > banner.d) banner = null; }
      if (phase === 'choice') { updMisc(dt); const p = input.tap || (input.pointer.justDown ? input.pointer : null); if (p && phT > .4) for (const b of btns) if (p.x / u > b.x && p.x / u < b.x + b.w && p.y / u > b.y && p.y / u < b.y + b.h) { snd('ok'); choose(b.id === 'cont'); break; } return; }
      for (let i = timers.length - 1; i >= 0; i--) { const q = timers[i]; q.t -= dt; if (q.t <= 0) { timers.splice(i, 1); q.fn(); } }
      if (phase === 'play') runScript(dt);
      if (phase !== 'dead' && phase !== 'trans') updPlayer(dt);
      updShots(dt); updFoes(dt); if (boss) updBoss(dt); updMisc(dt);
      if (phase === 'clear' && phT > 3.2) makeRecap();
      else if (phase === 'recap') { recap.t += dt; if ((recap.t > 1.5 && (input.tap || input.pointer.justDown || input.pressed.a)) || recap.t > 16) next(); }
      else if (phase === 'trans' && phT > .55) startWorld(wi + 1);
      else if (phase === 'dead' && phT > 1.9 && !over) { over = true; env.setScore(score); env.gameOver(score, { text: 'Monde ' + (wi + 1) + ' — ' + Wd.n + (hold === 'boss' ? ' · face au boss' : '') }); }
    }
    function update(dt) {
      if (over) return; sim(dt); env.setScore(score); env.hud('Monde ' + (wi + 1) + '/' + NW + ' · ' + Wd.n);
    }

    /* ---------- dessin ---------- */
    function txt(c, s, x, y, size, col, align, stroke) {
      c.font = '900 ' + size + 'px ' + FONT; c.textAlign = align || 'center'; c.textBaseline = 'middle';
      if (stroke !== 0) { c.lineJoin = 'round'; c.lineWidth = Math.max(2.5, size * .2); c.strokeStyle = 'rgba(8,10,32,.85)'; c.strokeText(s, x, y); } c.fillStyle = col; c.fillText(s, x, y);
    }
    function drawTile(c, cv, off, dx) {
      const y0 = ((off % TH) + TH) % TH, m = c.getTransform();
      if (Math.abs(m.a - bg.bs) < .002 && !m.b) { // cas normal : copie pixel pour pixel, sans mise à l'échelle
        const h = cv.height, H = c.canvas.height; c.save(); c.setTransform(1, 0, 0, 1, Math.round(m.e + (dx || 0) * m.a), Math.round(m.f)); for (let y = Math.round(y0 * m.a) - h; y < H; y += h) c.drawImage(cv, 0, y); c.restore();
      } else for (let y = y0 - TH; y < LH; y += TH) c.drawImage(cv, dx || 0, y, LW, TH + .6);
    }
    function bar(c, x, y, w, k, col) { c.fillStyle = 'rgba(8,10,32,.75)'; c.fillRect(x - w / 2 - 1, y - 1, w + 2, 5); c.fillStyle = col; c.fillRect(x - w / 2, y, w * clamp(k, 0, 1), 3); }
    function rotor(c, x, y, r, a) { c.fillStyle = 'rgba(220,232,255,.1)'; A.ell(c, x, y, r); c.fill(); c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = 'rgba(235,242,255,.55)'; c.fillRect(-r, -r * .045, r * 2, r * .09); c.fillRect(-r * .045, -r, r * .09, r * 2); c.restore(); }
    function drawScen(c, s) {
      if (s.kind === 'light') { // projecteur de la ville : un faisceau qui balaie le ciel
        const a = Math.sin(T * .7 + s.ph) * 1.1 + (s.ph > 3 ? 0 : PI); c.save(); c.translate(s.x, s.y); c.rotate(a);
        const g = c.createLinearGradient(0, 0, 190, 0); g.addColorStop(0, 'rgba(255,250,210,.4)'); g.addColorStop(1, 'rgba(255,250,210,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(0, -3); c.lineTo(190, -34); c.lineTo(190, 34); c.lineTo(0, 3); c.fill(); c.restore();
        c.fillStyle = '#1c2440'; A.ell(c, s.x, s.y, 7); c.fill(); c.fillStyle = '#fff7c9'; A.ell(c, s.x, s.y, 4); c.fill(); return;
      }
      if (s.a < 1) c.globalAlpha = s.a; blit(c, SP[s.spr], s.x, s.y, 0, s.sc); c.globalAlpha = 1;
    }
    function drawGnd(c, e) {
      const s = SP[e.k], Tp = e.T; if (e.y < -s.h || e.dead) return;
      if (Tp.sub) { if (e.up > 0 && e.up < 1) { c.strokeStyle = 'rgba(255,255,255,' + (.7 * (1 - Math.abs(e.up - .5) * 2)).toFixed(2) + ')'; c.lineWidth = 2; A.ell(c, e.x, e.y, 20 + e.up * 8, 44 + e.up * 8); c.stroke(); } c.globalAlpha = .22 + .78 * e.up; }
      blit(c, s, e.x, e.y); if (e.flash > 0) { c.globalAlpha = .75; blit(c, s, e.x, e.y, 0, 1, s.wh); }
      c.globalAlpha = 1; for (const tu of Tp.tur) blit(c, Tp.big ? SP.turB : SP.tur, e.x + tu[0], e.y + tu[1], e.ang - PI / 2);
      if (e.hp < e.max && e.max >= 5) bar(c, e.x, e.y + Tp.r + 6, 24, e.hp / e.max, '#9dff5c');
    }
    function drawFoe(c, e) {
      const s = SP[e.spr]; blit(c, s, e.x, e.y, e.rot);
      if (e.flash > 0 || (e.mv === 'dive' && e.st === 1 && Math.floor(T * 12) % 2)) { c.globalAlpha = .8; blit(c, s, e.x, e.y, e.rot, 1, s.wh); c.globalAlpha = 1; }
      if (e.k === 'gun' && Wd.style !== 'alien') rotor(c, e.x, e.y, 22, T * 24);
      if (e.max >= 9 && e.hp < e.max) bar(c, e.x, e.y - e.T.r - 8, 28, e.hp / e.max, '#9dff5c');
    }
    function drawBoss(c) {
      const b = boss, D = b.D, hull = SP['hull_' + b.key], armored = b.parts.some(q => q.alive && q.k !== 'core');
      if (!D.ground && Wd.shadow) { c.globalAlpha = .22; blit(c, hull, b.x + 26, b.y + 40, b.ang, .9, hull.sh); c.globalAlpha = 1; }
      blit(c, hull, b.x, b.y, D.orbit ? b.ang : 0); if (b.dead && Math.floor(T * 16) % 2) { c.globalAlpha = .55; blit(c, hull, b.x, b.y, D.orbit ? b.ang : 0, 1, hull.wh); c.globalAlpha = 1; }
      if (b.dead) return;
      for (const q of b.parts) {
        if (!q.alive) { blit(c, SP.crater, q.x, q.y, 0, q.r / 13); continue; }
        if (q.k === 'gun') blit(c, SP.tur, q.x, q.y, q.ang - PI / 2, 1.5); else if (q.k === 'big') blit(c, SP.turB, q.x, q.y, q.ang - PI / 2, 1.45); else if (q.k === 'eng') blit(c, SP.eng, q.x, q.y, 0, q.r / 15);
        else { // le cœur : une grille le protège tant qu'il reste des tourelles
          blit(c, SP.core, q.x, q.y, 0, q.r / 22 * (1 + Math.sin(T * 6) * .06));
          if (armored) { c.strokeStyle = 'rgba(205,215,235,.85)'; c.lineWidth = 2.4; c.beginPath(); for (const k of [-.45, 0, .45]) { const hh = Math.sqrt(1 - k * k) * q.r * .8; c.moveTo(q.x + k * q.r, q.y - hh); c.lineTo(q.x + k * q.r, q.y + hh); c.moveTo(q.x - hh, q.y + k * q.r); c.lineTo(q.x + hh, q.y + k * q.r); } c.stroke(); }
        }
        if (q.flash > 0) { c.fillStyle = 'rgba(255,255,255,.75)'; A.ell(c, q.x, q.y, q.r); c.fill(); }
        if (!b.in && (q.k !== 'core' || !armored)) { c.strokeStyle = 'rgba(255,232,90,' + (.4 + .35 * Math.sin(T * 6 + q.ox)).toFixed(2) + ')'; c.lineWidth = 1.6; A.ell(c, q.x, q.y, q.r + 4 + Math.sin(T * 6 + q.ox) * 1.5); c.stroke(); }
      }
      if (D.rot) for (const q of D.rot) rotor(c, b.x + q[0], b.y + q[1], q[2], T * 20);
    }
    function drawPlayer(c) {
      if (phase === 'dead' || phase === 'choice') return; const x = P.x, y = P.y, s = SP.player;
      if (P.inv > 0 && phase === 'play' && Math.floor(T * 14) % 2) c.globalAlpha = .4;
      const fl = 9 + Math.sin(T * 55) * 3 + (phase === 'recap' ? 8 : 0);
      for (const sx of [-3, 3]) { c.fillStyle = '#ff9f1c'; c.beginPath(); c.moveTo(x + sx - 2.8, y + 23); c.lineTo(x + sx, y + 23 + fl); c.lineTo(x + sx + 2.8, y + 23); c.fill(); c.fillStyle = '#fff3a0'; c.beginPath(); c.moveTo(x + sx - 1.4, y + 23); c.lineTo(x + sx, y + 23 + fl * .55); c.lineTo(x + sx + 1.4, y + 23); c.fill(); }
      const w = s.w * (1 - Math.abs(P.bank) * .2); c.drawImage(s.cv, x - w / 2, y - s.h / 2, w, s.h);
      for (let i = 0; i < drones; i++) blit(c, SP.drone, x + (i ? 30 : -30), y + 6 + Math.sin(T * 4 + i * 2) * 2);
      c.globalAlpha = 1;
      if (P.shield) { c.globalAlpha = .5; blit(c, SP.halo, x, y, 0, 1.45); c.globalAlpha = 1; c.strokeStyle = 'rgba(56,224,214,.9)'; c.lineWidth = 2.2; A.ell(c, x, y, 31 + Math.sin(T * 7) * 1.5); c.stroke(); }
    }
    function drawBeam(c, b) {
      if (b.warn > 0) { // avertissement : colonne rouge qui clignote, avec un point d'exclamation en haut et en bas
        const k = Math.floor(T * 9) % 2; c.fillStyle = 'rgba(255,50,50,' + (k ? .2 : .1) + ')'; c.fillRect(b.x - b.w / 2, 0, b.w, LH); c.fillStyle = 'rgba(255,90,90,.8)'; c.fillRect(b.x - b.w / 2, 0, 1.5, LH); c.fillRect(b.x + b.w / 2 - 1.5, 0, 1.5, LH);
        for (const y of [26, LH - 30]) { c.fillStyle = k ? '#ffd23f' : '#ff4f4f'; c.beginPath(); c.moveTo(b.x, y - 11); c.lineTo(b.x + 11, y + 8); c.lineTo(b.x - 11, y + 8); c.closePath(); c.fill(); txt(c, '!', b.x, y + 1.5, 12, '#14123a', 'center', 0); }
        return;
      }
      const k = clamp(b.t * 4, 0, 1);
      if (b.bolt) { c.fillStyle = 'rgba(190,220,255,' + (.35 * k).toFixed(2) + ')'; c.fillRect(b.x - b.w / 2, 0, b.w, LH); for (const [lw, col] of [[7, 'rgba(140,190,255,.7)'], [2.5, '#ffffff']]) { c.strokeStyle = col; c.lineWidth = lw * k; c.beginPath(); c.moveTo(b.x, -5); for (let y = 20; y < LH + 20; y += 26) c.lineTo(b.x + Math.sin(y * 12.9 + Math.floor(T * 30) * 7) * b.w * .38, y); c.stroke(); } }
      else { c.fillStyle = 'rgba(255,79,208,' + (.35 * k).toFixed(2) + ')'; c.fillRect(b.x - b.w / 2, 0, b.w, LH); c.fillStyle = 'rgba(255,140,220,' + k.toFixed(2) + ')'; c.fillRect(b.x - b.w * .3, 0, b.w * .6, LH); c.fillStyle = 'rgba(255,255,255,' + k.toFixed(2) + ')'; c.fillRect(b.x - b.w * .14, 0, b.w * .28, LH); }
    }
    function choiceBtns() { const w = Math.min(300, LW - 40), x = LW / 2 - w / 2, y = LH * .44; btns = [{ id: 'cont', x, y, w, h: 54, t: 'Reprendre au monde ' + ((GX_CHECK ? GX_CHECK.w : 0) + 1), s: 'score remis à zéro' }, { id: 'new', x, y: y + 66, w, h: 54, t: 'Depuis le monde 1', s: 'nouvelle partie' }]; }
    function drawHud(c, LW) { // LW local : sur petit écran l'affichage est grossi, donc moins large
      // avancement dans le monde
      c.fillStyle = 'rgba(8,10,32,.5)'; c.fillRect(0, 0, LW, 3); c.fillStyle = '#ffd23f'; c.fillRect(0, 0, LW * (hold === 'boss' || phase === 'clear' || phase === 'recap' ? 1 : si / Wd.script.length), 3);
      for (let i = 0; i < lives; i++) Draw.heart(c, 15 + i * 17, 9, 13, true);
      for (let i = 0; i < bombs; i++) blit(c, SP.cap_B, 15 + i * 17, 35, 0, .52);
      // arme principale et arme secondaire, avec leurs niveaux
      const px = LW - 10; txt(c, 'TIR', px - 52, 15, 10, '#ffd23f', 'right'); for (let i = 0; i < 5; i++) { c.fillStyle = i < pw ? '#ffd23f' : 'rgba(255,255,255,.22)'; c.fillRect(px - 48 + i * 10, 11, 8, 8); }
      if (sec) { const col = GX_CAPS[sec].c; txt(c, GX_SEC[sec], px - 32, 31, 10, col, 'right'); for (let i = 0; i < 3; i++) { c.fillStyle = i < secLv ? col : 'rgba(255,255,255,.22)'; c.fillRect(px - 28 + i * 10, 27, 8, 8); } }
      if (mult > 1) { const y = 24; txt(c, '×' + mult, LW / 2, y, 20, '#9dff5c'); bar(c, LW / 2, y + 13, 40, comboT / 3.2, '#9dff5c'); }
      if (boss && !boss.in && !boss.dead) {
        const w = Math.min(LW - 40, 300), x = LW / 2 - w / 2, y = 49, k = clamp(boss.hp / boss.max, 0, 1);
        c.fillStyle = 'rgba(8,10,32,.8)'; Draw.rr(c, x - 2, y - 2, w + 4, 13, 6); c.fill(); if (k > 0) { c.fillStyle = k > .62 ? '#9dff5c' : k > .3 ? '#ffd23f' : '#ff4f4f'; Draw.rr(c, x, y, Math.max(8, w * k), 9, 4.5); c.fill(); }
        if (!boss.mini) { c.fillStyle = 'rgba(8,10,32,.8)'; c.fillRect(x + w * .3, y, 1.5, 9); c.fillRect(x + w * .62, y, 1.5, 9); }
        txt(c, boss.D.name, LW / 2, y + 20, 10, '#ffffff');
      }
    }
    function draw(c) {
      c.save(); c.scale(u, u); c.save(); if (shake > 0) c.translate(rnd(-1, 1) * shake * 6, rnd(-1, 1) * shake * 6);
      c.fillStyle = bg.col; c.fillRect(-8, -8, LW + 16, LH + 16); drawTile(c, bg.base, scroll * bg.sp);
      for (const o of bg.over) { c.globalAlpha = o.a; drawTile(c, o.cv, scroll * o.sp + o.off, Math.sin(T * .6) * o.sway); } c.globalAlpha = 1;
      if (bg.stars) for (const q of bg.stars) { c.globalAlpha = .55 + .45 * Math.sin(T * 3 + q.ph); c.fillStyle = q.c; const y = (q.y + scroll * (.6 + q.s * .3)) % TH * LH / TH; c.fillRect(q.x * LW, y, q.s, q.s); if (q.s > 2) { c.fillRect(q.x * LW - 3, y + q.s / 2 - .4, q.s + 6, .8); c.fillRect(q.x * LW + q.s / 2 - .4, y - 3, .8, q.s + 6); } } c.globalAlpha = 1;
      if (skyFlash > 0) { c.fillStyle = 'rgba(200,215,255,' + (skyFlash * .3).toFixed(2) + ')'; c.fillRect(0, 0, LW, LH); }
      for (const s of scen) if (!s.layer) drawScen(c, s);
      if (boss && boss.D.ground) drawBoss(c);
      for (const e of gfoes) drawGnd(c, e);
      for (const s of scen) if (s.layer) drawScen(c, s);
      // ombres portées des avions sur le sol
      if (Wd.shadow) { c.globalAlpha = .22; for (const e of foes) if (e.wait <= 0) blit(c, SP[e.spr], e.x + 14, e.y + 20, e.rot, .82, SP[e.spr].sh); if (phase !== 'dead' && phase !== 'choice') blit(c, SP.player, P.x + 14, P.y + 22, 0, .82, SP.player.sh); c.globalAlpha = 1; }
      for (const m of medals) { const k = (m.sm ? .55 : 1) * (1 + Math.sin(T * 9 + m.x) * .1); blit(c, SP.medal, m.x, m.y, 0, k); }
      if (boss && !boss.D.ground) drawBoss(c);
      for (const e of foes) if (e.wait <= 0) drawFoe(c, e);
      for (const s of shots) blit(c, SP[s.s], s.x, s.y, s.s === 'shotS' ? 0 : s.rot);
      for (const m of pmis) blit(c, SP.pmis, m.x, m.y, m.a + PI / 2);
      if (laser) { const top = laser.top || 0, h = laser.y - top, w = laser.w, j = Math.sin(T * 70) * 1.2; c.fillStyle = 'rgba(255,79,154,.3)'; c.fillRect(laser.x - w, top, w * 2, h); c.fillStyle = '#ff8ac0'; c.fillRect(laser.x - w / 2 + j, top, w, h); c.fillStyle = '#fff'; c.fillRect(laser.x - w / 5, top, w / 2.5, h); if (top > 0) blit(c, SP.glow, laser.x, top, 0, .5 + Math.sin(T * 40) * .08); }
      for (const p of picks) { c.globalAlpha = .55 + Math.sin(T * 8) * .2; blit(c, SP.halo, p.x, p.y, 0, 1.1); c.globalAlpha = p.t > 9 && Math.floor(T * 8) % 2 ? .5 : 1; blit(c, SP['cap_' + p.k], p.x, p.y, 0, 1 + Math.sin(T * 6 + p.x) * .07); c.globalAlpha = 1; }
      drawPlayer(c);
      for (const b of beams) drawBeam(c, b);
      for (let i = 0; i < bullets.length; i++) { const b = bullets[i]; blit(c, b.k ? SP.bulP : SP.bulO, b.x, b.y, 0, 1 + Math.sin(T * 12 + i) * .12); }
      for (const b of booms) { const k = b.t / b.d; c.globalAlpha = 1 - k * k; blit(c, SP.glow, b.x, b.y, 0, b.r / 32 * (.5 + k * .9)); c.globalAlpha = (1 - k) * .7; c.strokeStyle = '#fff'; c.lineWidth = 2; A.ell(c, b.x, b.y, b.r * (.4 + k * 1.1)); c.stroke(); } c.globalAlpha = 1;
      for (const p of parts) { c.globalAlpha = 1 - p.t / p.l; c.fillStyle = p.c; if (p.r > 3.4) { A.ell(c, p.x, p.y, p.r); c.fill(); } else c.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); } c.globalAlpha = 1;
      if (Wd.key === 'storm') { c.strokeStyle = 'rgba(200,220,255,.3)'; c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 36; i++) { const x = ((i * 97.3 - T * 90) % (LW + 60) + LW + 60) % (LW + 60) - 30, y = (i * 53.7 + T * 560 + i * i * 7) % (LH + 40) - 20; c.moveTo(x, y); c.lineTo(x - 5, y + 17); } c.stroke(); }
      if (bombFx > 0) { const R = (1 - bombFx) * Math.hypot(LW, LH); c.strokeStyle = 'rgba(255,255,255,' + bombFx.toFixed(2) + ')'; c.lineWidth = 14 * bombFx + 2; A.ell(c, P.x, P.y, R); c.stroke(); c.strokeStyle = 'rgba(192,132,252,' + bombFx.toFixed(2) + ')'; c.lineWidth = 6; A.ell(c, P.x, P.y, R * .8); c.stroke(); }
      for (const q of texts) { c.globalAlpha = clamp((1.3 - q.t) * 2.5, 0, 1); txt(c, q.s, q.x, q.y, q.size, q.col); } c.globalAlpha = 1;
      for (const w of warns) if (Math.floor(T * 8) % 2) { const y = LH - 24; c.fillStyle = '#ff4f4f'; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(w.x, y - 14); c.lineTo(w.x + 13, y + 8); c.lineTo(w.x - 13, y + 8); c.closePath(); c.fill(); c.stroke(); txt(c, '!', w.x, y + 1, 13, '#fff', 'center', 0); }
      c.restore();
      if (flash > 0) { c.fillStyle = 'rgba(255,255,255,' + (flash * .6).toFixed(2) + ')'; c.fillRect(0, 0, LW, LH); }
      if (phase !== 'choice') { const hk = clamp(1 / u, 1, 1.3); c.save(); c.scale(hk, hk); drawHud(c, LW / hk); c.restore(); }
      if (hold === 'warn' && phase === 'play') { // annonce du boss
        const k = Math.floor(T * 5) % 2, y = LH * .34; c.fillStyle = 'rgba(255,40,60,' + (k ? .3 : .16) + ')'; c.fillRect(0, y - 52, LW, 104); c.fillStyle = k ? '#ffd23f' : '#ff4f4f'; for (let x = -20 + (T * 60) % 28; x < LW; x += 28) { c.beginPath(); c.moveTo(x, y - 52); c.lineTo(x + 14, y - 52); c.lineTo(x + 6, y - 44); c.lineTo(x - 8, y - 44); c.fill(); c.beginPath(); c.moveTo(x, y + 44); c.lineTo(x + 14, y + 44); c.lineTo(x + 6, y + 52); c.lineTo(x - 8, y + 52); c.fill(); }
        txt(c, 'ATTENTION', LW / 2, y - 18, 34, k ? '#ffd23f' : '#ffffff'); txt(c, 'BOSS EN APPROCHE', LW / 2, y + 12, 15, '#ffffff'); txt(c, GX_BOSS[Wd.boss].name, LW / 2, y + 32, 12, '#ffd23f');
      }
      if (banner && phase === 'play') { const k = clamp(Math.min(banner.t * 3, (banner.d - banner.t) * 2), 0, 1), y = LH * .3; c.globalAlpha = k; txt(c, banner.a, LW / 2, y - 26, 15, banner.warn ? '#ff8a8a' : '#cfd6ff'); txt(c, banner.b, LW / 2, y + 4, banner.b.length > 14 ? 24 : 36, banner.warn ? '#ffd23f' : '#ffffff'); if (banner.c) txt(c, banner.c, LW / 2, y + 36, 12.5, '#ffd23f'); c.globalAlpha = 1; }
      if (phase === 'recap') {
        const R = recap, w = Math.min(330, LW - 20), n = R.rows.length, h = 96 + n * 24 + (R.gift ? 22 : 0) + 30, x = LW / 2 - w / 2, y = Math.max(46, LH * .5 - h / 2);
        c.globalAlpha = clamp(R.t * 3, 0, 1); c.fillStyle = 'rgba(12,10,44,.9)'; Draw.rr(c, x, y, w, h, 16); c.fill(); c.strokeStyle = '#ffd23f'; c.lineWidth = 2; c.stroke();
        txt(c, R.last ? 'GALAXIE SAUVÉE !' : 'MONDE ' + (wi + 1) + ' TERMINÉ', LW / 2, y + 24, 19, '#ffd23f', 'center', 0); txt(c, Wd.n + ' — ' + GX_BOSS[Wd.boss].name.toLowerCase() + ' détruit', LW / 2, y + 46, 11, '#cfd6ff', 'center', 0);
        R.rows.forEach((q, i) => { if (R.t < .5 + i * .3) return; const yy = y + 74 + i * 24; txt(c, q[0], x + 16, yy, 12.5, '#ffffff', 'left', 0); txt(c, q[1], x + w - 92, yy, 12.5, '#9fe8ff', 'right', 0); txt(c, '+' + q[2] * (wi + 1), x + w - 16, yy, 12.5, '#ffd23f', 'right', 0); });
        let yy = y + 74 + n * 24 + 6; if (R.t > .5 + n * .3) { c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(x + 16, yy - 14, w - 32, 1); txt(c, 'BONUS', x + 16, yy, 15, '#ffffff', 'left', 0); txt(c, '+' + R.total, x + w - 16, yy, 17, '#ffd23f', 'right', 0); if (R.gift) txt(c, R.gift, LW / 2, yy + 23, 12, '#ff8ab0', 'center', 0); }
        if (R.t > 1.5 && Math.floor(T * 2.5) % 2) txt(c, R.last ? 'Touche l\'écran' : 'Touche l\'écran pour continuer', LW / 2, y + h - 16, 12, '#9dff5c', 'center', 0); c.globalAlpha = 1;
      }
      if (phase === 'choice') {
        choiceBtns(); c.fillStyle = 'rgba(8,8,30,.55)'; c.fillRect(0, 0, LW, LH); txt(c, 'On retente ?', LW / 2, LH * .26, 30, '#ffd23f'); txt(c, 'Tu étais arrivé au monde ' + (wi + 1) + ' : ' + Wd.n, LW / 2, LH * .26 + 32, 13, '#ffffff');
        for (const b of btns) { c.fillStyle = b.id === 'cont' ? '#9b7bff' : '#2a2560'; Draw.rr(c, b.x, b.y, b.w, b.h, 14); c.fill(); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; c.stroke(); txt(c, b.t, b.x + b.w / 2, b.y + 20, 17, '#fff', 'center', 0); txt(c, b.s, b.x + b.w / 2, b.y + 40, 11, '#dcd6ff', 'center', 0); }
      }
      const f = phase === 'trans' ? clamp(phT / .5, 0, 1) : fade; if (f > 0) { c.fillStyle = 'rgba(6,5,20,' + f.toFixed(2) + ')'; c.fillRect(0, 0, LW, LH); }
      c.restore();
    }

    /* ---------- mise en page, reprise, tests ---------- */
    function layout() {
      const W = env.W || 390, H = env.H || 560; u = Math.min(W / 390, H / 540); // idéal : 390 de large (portrait), 540 de haut
      if (W / u > 760) u = Math.max(u, Math.min(H / 440, W / 760)); // écran large (paysage) : on zoome, quitte à ne garder que 440 de haut, pour que tout reste lisible
      u = clamp(u, .7, 2.2); LW = W / u; LH = H / u; AW = clamp(LW, 390, 760);
      ss = u * Math.min(2, window.devicePixelRatio || 1); // pixels réels par pixel logique : les images sont préparées exactement à cette taille
    }
    // l'écran a changé (rotation de l'appareil) : on recale tout par rapport au centre, et on redessine le décor à la bonne taille
    function resize() {
      const oW = LW, oH = LH; layout(); if (Math.abs(oW - LW) < .5 && Math.abs(oH - LH) < .5) { buildSprites(); buildBg(); return; }
      const dx = (LW - oW) / 2, ky = LH / oH, mv = o => { o.x += dx; o.y *= ky; };
      for (const L of [foes, gfoes, shots, pmis, bullets, picks, medals, booms, parts, texts, scen]) L.forEach(mv);
      for (const e of gfoes) e.x0 += dx; for (const e of foes) { if (e.tx !== undefined) e.tx += dx; if (e.ty !== undefined) e.ty *= ky; } for (const b of beams) b.x += dx; for (const w of warns) w.x += dx;
      for (const id in forms) if (forms[id].pts) forms[id].pts = pathPts(forms[id].path);
      mv(P); P.x = clamp(P.x, 16, LW - 16); P.y = clamp(P.y, 34, LH - 22); if (boss) { boss.x += dx; boss.y *= ky; bossTy(); }
      buildSprites(); buildBg();
    }
    layout();
    if (saved && typeof saved.w === 'number') {
      score = Math.max(0, saved.score | 0); lives = clamp(saved.lives | 0, 1, MAXLIVES); bombs = clamp(saved.bombs | 0, 0, 5); pw = clamp(saved.pw | 0, 1, 5);
      sec = GX_SEC[saved.sec] ? saved.sec : ''; secLv = sec ? clamp(saved.secLv | 0, 1, 3) : 0; drones = clamp(saved.drones | 0, 0, 2);
      startWorld(clamp(saved.w | 0, 0, NW - 1)); banner.c = 'Partie reprise';
    } else if (GX_CHECK && env.profile && GX_CHECK.pid === env.profile.id && GX_CHECK.w > 0) { startWorld(clamp(GX_CHECK.w | 0, 0, NW - 1), true); phase = 'choice'; banner = null; choiceBtns(); }
    else startWorld(0);

    // Pour les tests automatiques et les robots d'équilibrage : état du jeu et commandes directes (coordonnées logiques ; écran = logique × u).
    const dbg = () => ({
      phase, hold, over, world: wi, worlds: NW, worldName: Wd.n, tier: env.tier, score, lives, maxLives: MAXLIVES, bombs, pw, sec, secLv, drones, mult, combo, kills, spawned, medalsGot,
      progress: si / Wd.script.length, fired, u, LW, LH, AW, P: { x: P.x, y: P.y, inv: P.inv, shield: P.shield },
      foes: foes.filter(e => e.wait <= 0).map(e => ({ k: e.k, x: e.x, y: e.y, r: e.T.r, hp: e.hp, mv: e.mv, st: e.st })), gfoes: gfoes.map(e => ({ k: e.k, x: e.x, y: e.y, r: e.T.r, hp: e.hp, up: e.up })),
      bullets: bullets.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r })), beams: beams.map(b => ({ x: b.x, w: b.w, warn: b.warn, bolt: !!b.bolt })), picks: picks.map(p => ({ k: p.k, x: p.x, y: p.y })),
      counts: { foes: foes.length, gfoes: gfoes.length, shots: shots.length, pmis: pmis.length, bullets: bullets.length, medals: medals.length, booms: booms.length, parts: parts.length, scen: scen.length, texts: texts.length },
      boss: boss && { key: boss.key, name: boss.D.name, mini: boss.mini, ground: !!boss.D.ground, x: boss.x, y: boss.y, hp: boss.hp, max: boss.max, phase: boss.phase, phases: boss.D.atk.length, entering: boss.in, dead: !!boss.dead, cr: boss.D.cr || 0, parts: boss.parts.map(q => ({ k: q.k, x: q.x, y: q.y, r: q.r, alive: q.alive, hp: q.hp })) },
      btns: btns.map(b => ({ id: b.id, x: b.x * u, y: b.y * u, w: b.w * u, h: b.h * u })), recap: recap && { total: recap.total, rows: recap.rows.map(q => q.slice()), gift: recap.gift, t: recap.t },
      step(dt, n) { quiet = true; for (let i = 0; i < n && !over; i++) sim(dt); quiet = false; env.setScore(score); },   // avance vite, sans dessin ni son
      ctl(x, y, bomb, sp) { ctl = x === null ? null : { x, y, bomb: !!bomb, sp: sp || 420 }; },                      // pilote automatique : va vers (x, y)
      god(v) { god = !!v; }, bomb: useBomb, hit: hurt, cont: next, choose,
      goWorld(i) { startWorld(clamp(i, 0, NW - 1)); }, give(k) { collect(k, P.x, P.y); },
      set(o) { if (o.lives !== undefined) lives = o.lives; if (o.bombs !== undefined) bombs = o.bombs; if (o.pw !== undefined) pw = o.pw; if (o.sec !== undefined) { sec = o.sec; secLv = o.secLv || 1; } if (o.drones !== undefined) drones = o.drones; if (o.score !== undefined) score = o.score; },
      skipTo(what) { const i = Wd.script.findIndex(r => r.some(a => a && a[0] === what)); if (i >= 0) { foes = []; gfoes = []; bullets = []; boss = null; hold = ''; si = i; sT = .1; } },   // saute au mini-boss ('mid') ou au boss ('boss')
      spawnBoss(mini) { foes = []; gfoes = []; bullets = []; if (mini) { hold = 'mid'; spawnBoss(Wd.mid); } else { si = Wd.script.length; hold = 'boss'; spawnBoss(Wd.boss); } },
      hurtBoss(frac) { if (boss) boss.hp = Math.min(boss.hp, boss.max * frac); }, killBoss() { if (boss) boss.hp = 0; },
      winWorld() { boss = null; hold = 'boss'; si = Wd.script.length; phase = 'clear'; phT = 9; }
    });
    return { update, draw, resize, dbg };
  }
});
