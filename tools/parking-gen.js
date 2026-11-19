// Génère des niveaux de « sortie de parking » (grille 6×6, voiture A à sortir par la droite de la 3e rangée).
// Pour chaque plateau tiré au hasard, on explore toutes les positions atteignables et on garde la plus éloignée de la sortie.
const N = 6, CAP = +(process.argv[5] || 60000);
const occ = (P, pos) => { const g = new Int8Array(36).fill(-1); for (let i = 0; i < P.length; i++) for (let j = 0; j < P[i].len; j++) g[P[i].h ? P[i].fix * 6 + pos[i] + j : (pos[i] + j) * 6 + P[i].fix] = i; return g; };
function neigh(P, pos, out) { const g = occ(P, pos); out.length = 0; for (let i = 0; i < P.length; i++) { const p = P[i], at = q => g[p.h ? p.fix * 6 + q : q * 6 + p.fix]; for (let q = pos[i] - 1; q >= 0 && at(q) < 0; q--) { const n = pos.slice(); n[i] = q; out.push(n); } for (let q = pos[i] + 1; q + p.len <= 6 && at(q + p.len - 1) < 0; q++) { const n = pos.slice(); n[i] = q; out.push(n); } } }
const key = pos => String.fromCharCode(...pos.map(v => 48 + v));
function farthest(P, start) { // renvoie {pos, d} : la position la plus dure du groupe, ou null
  const seen = new Map([[key(start), start]]), q = [start], nb = []; for (let h = 0; h < q.length; h++) { neigh(P, q[h], nb); for (const n of nb) { const k = key(n); if (!seen.has(k)) { if (seen.size >= CAP) return null; seen.set(k, n); q.push(n); } } }
  const dist = new Map(), q2 = []; for (const [k, s] of seen) if (s[0] === 4) { dist.set(k, 0); q2.push(s); } if (!q2.length) return null;
  let last = q2[0]; for (let h = 0; h < q2.length; h++) { const d = dist.get(key(q2[h])); last = q2[h]; neigh(P, q2[h], nb); for (const n of nb) { const k = key(n); if (!dist.has(k)) { dist.set(k, d + 1); q2.push(n); } } }
  return { pos: last, d: dist.get(key(last)), size: seen.size };
}
function randomBoard(k) { const P = [{ h: true, len: 2, fix: 2 }], pos = [Math.floor(Math.random() * 4)]; let g = occ(P, pos);
  for (let t = 0; t < 200 && P.length < k + 1; t++) { const h = Math.random() < .5, len = Math.random() < .3 ? 3 : 2, fix = Math.floor(Math.random() * 6), p0 = Math.floor(Math.random() * (7 - len)); if (h && fix === 2) continue; let ok = true; for (let j = 0; j < len; j++) if (g[h ? fix * 6 + p0 + j : (p0 + j) * 6 + fix] >= 0) ok = false; if (!ok) continue; P.push({ h, len, fix }); pos.push(p0); g = occ(P, pos); }
  return P.length === k + 1 ? { P, pos } : null; }
const str = (P, pos) => { const g = occ(P, pos); let s = ''; for (let i = 0; i < 36; i++) s += g[i] < 0 ? 'o' : String.fromCharCode(65 + g[i]); return s; };
const buckets = {}, t0 = Date.now(), budget = +(process.argv[2] || 60) * 1000; let n = 0;
while (Date.now() - t0 < budget) { const k = +(process.argv[3] || 3) + Math.floor(Math.random() * (+(process.argv[4] || 13) - +(process.argv[3] || 3) + 1)), b = randomBoard(k); if (!b) continue; n++; const r = farthest(b.P, b.pos); if (!r || r.d < 1) continue;
  // on retire les véhicules inutiles : si la difficulté ne change pas sans lui, il ne sert à rien
  const bk = r.d + '_' + (k <= 6 ? 'a' : k <= 9 ? 'b' : 'c'); (buckets[bk] = buckets[bk] || []); if (buckets[bk].length < (r.d > 14 ? 40 : 8)) buckets[bk].push({ s: str(b.P, r.pos), m: r.d, k }); }
const all = [].concat(...Object.values(buckets)); require('fs').writeFileSync(process.argv[6] || 'tools/parking-cands.json', JSON.stringify(all));
const by = {}; for (const c of all) by[c.m] = (by[c.m] || 0) + 1; console.log(n, 'plateaux,', all.length, 'candidats ; par nombre de coups :', JSON.stringify(by));
