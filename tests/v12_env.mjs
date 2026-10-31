import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); fs.mkdirSync('audit/v12/env', { recursive: true });
await p.goto((process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=2'); await p.waitForTimeout(3500);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; const L = window.__lvl; L.player.hp = 1e9; L.enemies.forEach(e => { e.setActive(false).setVisible(false); e.dead = true; e.body && (e.body.enable = false); }); });
const g0 = await p.evaluate(() => { const e = window.__lvl.env; const g = e.gems[0]; return { n: e.gems.length, x: g.im.x, y: g.y0, d: { ...e.dbg } }; });
// walk/run through first gem arc
await p.evaluate(g => window.__lvl.player.body.reset(g.x - 40, 430), g0); await p.evaluate(() => window.__step(10));
await p.keyboard.down('ArrowRight'); for (let i = 0; i < 6; i++) { await p.keyboard.press('Space'); await p.evaluate(() => window.__step(12)); if (i === 2) await p.screenshot({ path: 'audit/v12/env/gems.png' }); } await p.keyboard.up('ArrowRight');
const g1 = await p.evaluate(() => ({ ...window.__lvl.env.dbg }));
// dash past a tree + banner
const tx = await p.evaluate(() => window.__lvl.env.trees[0].x); await p.evaluate(x => window.__lvl.player.body.reset(x - 60, 430), tx); await p.evaluate(() => window.__step(10));
await p.keyboard.down('ArrowRight'); await p.keyboard.press('Shift'); await p.evaluate(() => window.__step(8)); await p.keyboard.up('ArrowRight'); await p.evaluate(() => window.__step(10)); await p.screenshot({ path: 'audit/v12/env/tree.png' });
const g2 = await p.evaluate(() => ({ ...window.__lvl.env.dbg }));
for (const [i, x] of [[0, 900], [1, 1900], [2, 3000]]) { await p.evaluate(x => window.__lvl.player.body.reset(x, 430), x); await p.evaluate(() => window.__step(40)); await p.screenshot({ path: `audit/v12/env/wide_${i}.png` }); }
console.log(JSON.stringify({ g0, g1, g2, errs })); await b.close();
