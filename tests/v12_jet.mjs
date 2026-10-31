import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const out = {}; fs.mkdirSync('audit/v12/jet', { recursive: true });
for (const lvl of ['2', '1']) {
  await p.goto((process.env.URL || 'http://127.0.0.1:4180/sakura-plus/') + '?lvl=' + lvl); await p.waitForTimeout(3500);
  if (lvl === '1') { await p.keyboard.press('Enter'); await p.waitForTimeout(1500); }
  await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; const pl = window.__lvl.player; pl.hp = 1e9; pl.hasJet = true; });
  await p.evaluate(() => window.__step(30));
  const f0 = await p.evaluate(() => window.__lvl.player.pfx.flames);
  await p.keyboard.down('Space'); await p.evaluate(() => window.__step(3)); await p.keyboard.up('Space'); await p.evaluate(() => window.__step(18));
  await p.keyboard.down('Space'); await p.evaluate(() => window.__step(3)); await p.keyboard.up('Space'); await p.evaluate(() => window.__step(8));
  await p.keyboard.down('Space'); const ys = [];
  for (let i = 0; i < 6; i++) { await p.evaluate(() => window.__step(4)); ys.push(await p.evaluate(() => [window.__lvl.player.jetting, Math.round(window.__lvl.player.y)])); await p.screenshot({ path: `audit/v12/jet/L${lvl}_${i}.png` }); }
  await p.keyboard.up('Space');
  out['L' + lvl] = { ys, flames: (await p.evaluate(() => window.__lvl.player.pfx.flames)) - f0, bursts: await p.evaluate(() => window.__lvl.player.pfx.bursts) };
}
out.errs = errs; console.log(JSON.stringify(out)); await b.close();
