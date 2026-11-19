const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.resolve('dist/arcade-famille.html')); await page.click('.pcard >> nth=1');
  await page.evaluate(() => launch(GAMES.find(x => x.id === 'kart'))); await page.click('#i-go'); await page.waitForTimeout(500); await page.keyboard.press('Space'); await page.waitForTimeout(4500);
  const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  for (const k of Object.keys(await page.evaluate(() => KART_ITEMS))) {
    await page.evaluate(k => { const c = Game.inst.dbg().cars[0]; c.item = k; c.ammo = 0; }, k);
    const H = box.h, dRow = Math.min(330, Math.max(120, H * .46)), hz = Math.min(H * .34, Math.max(H * .2, H * .74 - dRow));
    await page.touchscreen.tap(box.x + box.w / 2, box.y + hz + dRow); await page.waitForTimeout(350);
    const st = await page.evaluate(() => { const c = Game.inst.dbg().cars[0]; return [c.item, c.ammo, +c.star.toFixed(1), +c.magnet.toFixed(1), +c.shield.toFixed(1), +c.boost.toFixed(1)]; });
    if (k === 'bomb' || k === 'star') await page.screenshot({ path: 'dist/kart-it-' + k + '.png' });
    console.log(k, JSON.stringify(st)); await page.waitForTimeout(900);
  }
  console.log('errors', errs); await b.close();
})();
