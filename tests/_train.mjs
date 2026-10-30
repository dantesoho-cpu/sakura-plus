import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto((process.env.URL||'http://127.0.0.1:4180/sakura-plus/')+'?lvl=2'); await p.waitForTimeout(3500);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; });
const r = [];
for (const [i, px] of [[0, 300], [1, 1300]].entries()) { const o = await p.evaluate(px => { const L = window.__lvl; L.player.body.reset(px, L.groundAt(px, 100) - 2); for (let k = 0; k < 1500; k++) { window.__step(1); if (L.train.x > 60 && L.train.x < 200) break; } return [Math.round(L.train.x), Math.round(L.train.y), Math.round(L.cameras.main.scrollY), L.train.visible]; }, px); r.push(o); await p.screenshot({ path: `audit/l2/06_train_${i}.png` }); }
console.log(JSON.stringify(r)); await b.close();
