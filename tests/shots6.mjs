import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(process.env.URL || 'http://127.0.0.1:5173/sakura-plus/'); await p.waitForTimeout(2500);
await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = (n) => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; window.__lvl.player.hp = 1e9; });
const spots = JSON.parse(process.env.SPOTS || '[[2440,990,"gorge"],[2440,700,"gorge_hi"],[1100,1400,"trees"],[4700,1400,"trees2"],[1000,990,"bridge"]]');
for (const [x, y, name] of spots) { await p.evaluate(([x, y]) => { const pl = window.__lvl.player; pl.setPosition(x, y); pl.body.reset(x, y); window.__step(60); }, [x, y]);
  for (let i = 0; i < (name === 'gorge' ? 24 : 1); i++) { await p.evaluate(() => window.__step(3)); await p.screenshot({ path: `audit/v6/f/${name}_${String(i).padStart(3, '0')}.png` }); } }
console.log(JSON.stringify({ errs })); await b.close();
