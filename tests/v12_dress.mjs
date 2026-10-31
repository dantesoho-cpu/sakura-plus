import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); fs.mkdirSync('audit/v12/dress', { recursive: true });
await p.goto((process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=2'); await p.waitForFunction(() => window.__lvl && window.__lvl.dress && window.__lvl.player && window.__game, null, { timeout: 60000, polling: 250 }); await p.waitForTimeout(800);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; const L = window.__lvl; L.player.hp = 1e9; L.enemies.forEach(e => { e.setActive(false).setVisible(false); e.dead = true; e.body && (e.body.enable = false); }); });
const D = () => p.evaluate(() => ({ ...window.__lvl.dress.dbg, gems: window.__lvl.env.dbg.gems, got: window.__lvl.env.dbg.got }));
const d0 = await D();
const tp = async (x, n = 20) => { await p.evaluate(x => { window.__lvl.player.body.reset(x, 430); }, x); await p.evaluate(n => window.__step(n), n); };
// vending: shoot twice
const v = await p.evaluate(() => window.__lvl.dress.vend.map(v => v.x)); await tp(v[0] - 70);
await p.evaluate(() => window.__lvl.player.facing = 1); for (let i = 0; i < 4; i++) { await p.keyboard.press('j'); await p.evaluate(() => window.__step(14)); } await p.evaluate(() => window.__step(20)); await p.screenshot({ path: 'audit/v12/dress/01_vend.png' });
const d1 = await D();
// dash through second vending
await tp(v[1] - 34); await p.keyboard.down('ArrowRight'); await p.evaluate(() => window.__step(2)); await p.keyboard.press('Shift'); const dx = []; for (let i = 0; i < 10; i++) dx.push(await p.evaluate(() => { window.__step(1); const P = window.__lvl.player; return [Math.round(P.x), P.dashing ? 1 : 0]; })); console.log('dash', v[1], JSON.stringify(dx)); await p.keyboard.up('ArrowRight'); await p.evaluate(() => window.__step(20)); const d2 = await D();
// terminal: stand
const tx = await p.evaluate(() => window.__lvl.dress.terms[0].x); await tp(tx, 30); await p.evaluate(() => window.__step(60)); await p.screenshot({ path: 'audit/v12/dress/02_term.png' }); const d3 = await D();
// strips + vents: walk across
const sx = await p.evaluate(() => window.__lvl.dress.strips[0].x); await tp(sx - 40); await p.keyboard.down('ArrowRight'); await p.evaluate(() => window.__step(30)); await p.keyboard.up('ArrowRight');
const vx = await p.evaluate(() => window.__lvl.dress.vents[0].x); await tp(vx, 10); await p.evaluate(() => window.__step(10)); await p.screenshot({ path: 'audit/v12/dress/03_vent.png' }); const d4 = await D();
// shoot a billboard: put sakura under it on a jet? just call hitShot at ad
const d5 = await p.evaluate(() => { const L = window.__lvl, a = L.dress.ads[0], q = L.dress.lan[0].L[0]; const r1 = L.dress.hitShot(a.x, a.im.y), r2 = L.dress.hitShot(q.x, q.y + 6); window.__step(6); return { r1, r2, ...L.dress.dbg }; });
await p.evaluate(x => window.__lvl.player.body.reset(x, 430), await p.evaluate(() => window.__lvl.dress.ads[0].x)); await p.evaluate(() => window.__step(4)); await p.screenshot({ path: 'audit/v12/dress/04_glitch.png' });
for (const [i, x] of [[0, 300], [1, 700], [2, 1150], [3, 1600]]) { await tp(x, 40); await p.screenshot({ path: `audit/v12/dress/wide_${i}.png` }); }
const ok = d0.far > 20 && d0.ads > 5 && d0.lanterns > 5 && d1.vended >= 1 && d1.gems > d0.gems && d2.vended >= 2 && d3.synced >= 1 && d4.steps >= 1 && d4.puffs >= 1 && d5.r1 && d5.r2 && d5.spins >= 1 && d5.glitch >= 1 && errs.length === 0;
console.log(JSON.stringify({ d0, d1, d2, d3, d4, d5, errs })); console.log(ok ? 'PASS' : 'FAIL'); await b.close(); process.exit(ok ? 0 : 1);
