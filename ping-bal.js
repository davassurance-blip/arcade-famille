// node ping-bal.js [matchs par ligne] — équilibre du Ping-Pong : un robot « humain » (il suit la balle avec retard, vitesse limitée, sans gestes d'effet) contre chaque adversaire.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const n = +(process.argv[2] || 8), b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  for (const prof of [1, 2]) {
    const page = await (await b.newContext({ viewport: { width: 390, height: 780 } })).newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto('file://' + path.resolve('dist/arcade-famille.html')); await page.click('.pcard >> nth=' + prof);
    await page.evaluate(() => launch(GAMES.find(x => x.id === 'ping'))); await page.click('#i-go'); await page.waitForTimeout(600);
    for (const [bot, sp, lag] of [['moyen', 2.0, .12], ['bon', 2.8, .06]]) {
      const res = await page.evaluate(({ n, sp, lag }) => { const out = []; const g = Game.inst;
        for (let idx = 0; idx < 9; idx++) { let w = 0, pts = 0, opp = 0, ms = 0, fs = 0;
          for (let m = 0; m < n; m++) { g.dbg().reset(idx); let px = 0, hist = [], guard = 0; const s0 = Object.assign({}, g.dbg().stats);
            while (guard++ < 60 * 400) { const d = g.dbg(); if (d.me >= d.goal || d.foe >= d.goal) { if (d.me > d.foe) w++; pts += d.me; opp += d.foe; ms += d.stats.ms - s0.ms; fs += d.stats.fs - s0.fs; break; }
              hist.push(d.ball && !d.ball.fromMe ? d.ball.x + (Math.random() - .5) * .12 : 0); const tg = hist[Math.max(0, hist.length - 1 - Math.round(lag * 60))];
              px += Math.max(-sp / 60, Math.min(sp / 60, tg - px)); d.set(px); g.update(1 / 60); } }
          out.push([idx, w, pts, opp, ms, fs]); } return out; }, { n, sp, lag });
      console.log('profil', prof === 1 ? '10 ans' : '13 ans', '| robot', bot); for (const r of res) console.log('  adv', r[0], 'victoires', r[1] + '/' + n, 'points', r[2] + '-' + r[3], 'smashs moi/lui', r[4] + '/' + r[5]);
    }
    console.log('errors', errs.slice(0, 3)); await page.close();
  }
  await b.close();
})();
