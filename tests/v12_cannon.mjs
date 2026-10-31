import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); fs.mkdirSync('audit/v12/cannon', { recursive: true });
await p.goto((process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=2'); await p.waitForTimeout(3500);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; window.__lvl.player.hp = 1e9; });
await p.evaluate(() => window.__step(20));
// teleport just before the pickup, walk into it
await p.evaluate(() => { const pl = window.__lvl.player; pl.body.reset(1090, pl.y); });
await p.keyboard.down('ArrowRight'); await p.evaluate(() => window.__step(40)); await p.keyboard.up('ArrowRight'); await p.evaluate(() => window.__step(5));
const got = await p.evaluate(() => [window.__lvl.cannon.charges, window.__lvl.pk.got.cannon]);
// move to a crowd: find nearest live enemies ahead, park 120px left of first
const tgt = await p.evaluate(() => { const L = window.__lvl, e = L.enemies.filter(e => e.active && !e.dead).sort((a, b) => a.x - b.x).find(e => e.x > 1300); const pl = L.player; pl.body.reset(e.x - 150, pl.y - 10); pl.facing = 1; return Math.round(e.x); });
await p.evaluate(() => window.__step(30));
const before = await p.evaluate(() => { const L = window.__lvl, wv = L.cameras.main.worldView; return L.enemies.filter(e => e.active && !e.dead && e.x > wv.x && e.x < wv.right).length; });
await p.keyboard.press('c'); let i = 0;
for (let f = 0; f < 18; f++) { await p.evaluate(() => window.__step(7)); await p.screenshot({ path: `audit/v12/cannon/c_${String(i++).padStart(2, '0')}.png` }); }
const r = await p.evaluate(() => { const L = window.__lvl; return { dbg: L.cannon.dbg, state: L.cannon.state, locked: L.player.locked, charges: L.cannon.charges, grav: L.player.body.allowGravity }; });
// still playable after: move right
const x0 = await p.evaluate(() => window.__lvl.player.x); await p.keyboard.down('ArrowRight'); await p.evaluate(() => window.__step(20)); await p.keyboard.up('ArrowRight'); const x1 = await p.evaluate(() => window.__lvl.player.x);
console.log(JSON.stringify({ got, tgt, before, ...r, moved: Math.round(x1 - x0), errs })); await b.close();
