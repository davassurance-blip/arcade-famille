// Test de fumée : ouvre la version autonome, lance chaque jeu pour chaque profil, joue quelques secondes, capture.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve('dist/arcade-famille.html'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'dist/shot-profiles.png' });
  const games = await page.evaluate(() => GAMES.map(g => ({ id: g.id, minAge: g.minAge })));
  for (let pi = 0; pi < 3; pi++) {
    await page.click('.pcard >> nth=' + pi);
    await page.waitForTimeout(200);
    if (pi === 2) await page.screenshot({ path: 'dist/shot-home.png' });
    const age = await page.evaluate(() => current.age);
    for (const g of games) {
      if (age < g.minAge) continue;
      await page.evaluate(id => launch(GAMES.find(x => x.id === id)), g.id);
      await page.click('#i-go');
      await page.waitForTimeout(150);
      // joue : touches au hasard
      for (let i = 0; i < 40; i++) {
        const k = ['ArrowLeft', 'ArrowRight', 'Space', 'ArrowUp', 'KeyX', 'ArrowDown'][i % 6];
        await page.keyboard.down(k); await page.waitForTimeout(40); await page.keyboard.up(k);
        if (i % 10 === 0) { await page.mouse.click(200, 400); }
      }
      // jeux DOM : clique sur des boutons
      await page.evaluate(() => { document.querySelectorAll('#g-dom button').forEach((b, i) => { if (i < 6) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); if (i < 6) b.click(); }); });
      await page.waitForTimeout(400);
      if (pi === 2) await page.screenshot({ path: 'dist/shot-' + g.id + '.png' });
      const st = await page.evaluate(() => ({ score: Game.score, over: !!Game.over, active: Game.active }));
      console.log('profil', pi, 'jeu', g.id, JSON.stringify(st));
      await page.evaluate(() => quitGame());
      await page.waitForTimeout(100);
    }
    await page.click('#chip');
    await page.waitForTimeout(100);
  }
  // espace parents : création du code
  await page.click('#btn-parent-1');
  for (const k of ['1', '2', '3', '4', '1', '2', '3', '4']) { await page.click('#pinpad button:has-text("' + k + '")'); await page.waitForTimeout(60); }
  await page.waitForTimeout(400);
  console.log('parent screen visible:', await page.evaluate(() => !document.getElementById('scr-parent').hidden));
  await page.screenshot({ path: 'dist/shot-parent.png' });
  await page.click('#btn-parent-back');
  await page.click('#btn-parent-2');
  for (const k of ['9', '9', '9', '9']) { await page.click('#pinpad button:has-text("' + k + '")'); await page.waitForTimeout(60); }
  await page.waitForTimeout(300);
  console.log('wrong pin msg:', await page.textContent('#pin-err'));
  await page.click('#pin-cancel');
  // mode tablette paysage, plateforme
  await page.setViewportSize({ width: 1024, height: 700 });
  await page.click('#chip'); await page.click('.pcard >> nth=2');
  await page.evaluate(() => launch(GAMES.find(x => x.id === 'platform')));
  await page.click('#i-go'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(900); await page.keyboard.press('Space'); await page.waitForTimeout(600); await page.keyboard.up('ArrowRight');
  await page.screenshot({ path: 'dist/shot-tablet-platform.png' });
  await page.evaluate(() => quitGame());
  await page.evaluate(() => launch(GAMES.find(x => x.id === 'duel')));
  await page.click('#i-go'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(700); await page.keyboard.up('ArrowRight'); await page.keyboard.press('KeyX'); await page.waitForTimeout(250);
  await page.screenshot({ path: 'dist/shot-tablet-duel.png' });
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
