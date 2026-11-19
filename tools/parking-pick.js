// Choisit 30 niveaux par tranche d'âge parmi les candidats et écrit src/games/23-parking-data.js
const fs = require('fs'); const seen = new Set(), all = [];
for (const f of ['cands1', 'cands2', 'cands3']) for (const c of JSON.parse(fs.readFileSync('tools/' + f + '.json'))) if (!seen.has(c.s)) { seen.add(c.s); all.push(c); }
const used = new Set(), out = {};
const plan = { 0: i => Math.round(1 + i * 9 / 29), 1: i => Math.round(3 + i * 21 / 29), 2: i => Math.round(6 + i * 32 / 29) };
for (const tier of [0, 1, 2]) { const lv = []; for (let i = 0; i < 30; i++) { const target = plan[tier](i), kWant = tier === 0 ? 3 + i * .15 : 5 + i * .25; let best = null, bs = 1e9; for (const c of all) { if (used.has(c.s)) continue; const sc = Math.abs(c.m - target) * 10 + Math.abs(c.k - kWant) + Math.random() * .5; if (sc < bs) { bs = sc; best = c; } } used.add(best.s); lv.push(best); } lv.sort((a, b) => a.m - b.m || a.k - b.k); out[tier] = lv; console.log('tier', tier, lv.map(c => c.m + '/' + c.k).join(' ')); }
let js = "/* Niveaux de « Sortie de Parking » : [grille 6×6 en 36 lettres, nombre minimal de coups]. Fabriqués par tools/parking-gen.js (tirage au hasard + recherche de la position la plus difficile), choisis par tools/parking-pick.js. */\nconst PARK_LEVELS = {\n";
for (const tier of [0, 1, 2]) js += '  ' + tier + ': [' + out[tier].map(c => "['" + c.s + "', " + c.m + ']').join(', ') + '],\n';
fs.writeFileSync('src/games/23-parking-data.js', js + '};\n');
