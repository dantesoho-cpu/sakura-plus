import { chromium } from 'playwright'; import fs from 'fs';
const BASE = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/'; fs.mkdirSync('audit/v12/ground', { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [lvl, pts] of [['Level1', [[900, 0], [2600, 0], [5200, 0]]], ['Level2', [[1300, 0], [3000, 0]]]]) {
  const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
  await p.goto(BASE); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 60000 });
  await p.evaluate(l => window.__game.scene.getScene('Title').scene.start(l), lvl);
  await p.waitForFunction(() => window.__lvl?.player?.body && window.__game.loop.frame > 30, null, { timeout: 60000 }); await p.waitForTimeout(1000);
  for (const [x] of pts) { await p.evaluate(x => { const L = window.__lvl, P = L.player; P.body.reset(x, P.y); const g = L.groundAt(x, 0); P.body.reset(x, g - 30); }, x); await p.waitForTimeout(1200);
    await p.screenshot({ path: `audit/v12/ground/after_${lvl}_${x}.png` }); }
  console.log(lvl, JSON.stringify(await p.evaluate(() => window.__ground))); await p.context().close(); }
await b.close();
