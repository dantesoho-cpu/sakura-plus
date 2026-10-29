import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(process.env.URL || 'http://127.0.0.1:5173/sakura-plus/'); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); const l = window.__lvl; l.player.iT = 1e9; l.toast?.clear?.();
  l.player.body.setAllowGravity(false); window.__step = (n, dx, dy) => { for (let i = 0; i < n; i++) { const pl = l.player; pl.body.reset(pl.x + dx, pl.y + dy); window.__T += 16.67; g.step(window.__T, 16.67); } }; });
await p.evaluate(() => { const l = window.__lvl; l.player.body.reset(60 * 16, 40 * 16); window.__step(40, 0, 0); });
for (let i = 0; i < 60; i++) { await p.evaluate(i => window.__step(3, 4, i < 30 ? -1.2 : 1.2), i); await p.screenshot({ path: `audit/gif/para_${String(i).padStart(3, '0')}.png` }); }
console.log('errors', errs); await b.close();
