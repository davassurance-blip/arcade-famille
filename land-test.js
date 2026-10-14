const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.resolve('dist/arcade-famille.html'));
  await page.click('.pcard >> nth=1'); await page.evaluate(() => launch(GAMES.find(x => x.id === 'frog'))); await page.click('#i-go');
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 780, height: 360 }); // rotation
  await page.waitForTimeout(600); await page.keyboard.press('Space'); await page.waitForTimeout(300);
  await page.screenshot({ path: 'dist/shot-land-frog.png' });
  console.log(await page.evaluate(() => [canvas.width, canvas.height, stage.clientWidth, stage.clientHeight]));
  await page.evaluate(() => quitGame()); await page.evaluate(() => launch(GAMES.find(x => x.id === 'platform'))); await page.click('#i-go'); await page.waitForTimeout(400);
  await page.screenshot({ path: 'dist/shot-land-platform.png' });
  console.log('errors', errs); await b.close();
})();
