import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); fs.mkdirSync('audit/v12/ia', { recursive: true });
await p.goto((process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=2'); await p.waitForTimeout(3500);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; const L = window.__lvl; L.player.hp = 1e9; L.enemies.forEach(e => { e.active && e.setActive(false).setVisible(false); e.dead = true; e.body && (e.body.enable = false); }); });
const st = () => p.evaluate(() => { const L = window.__lvl, pl = L.player; return { x: Math.round(pl.x), y: Math.round(pl.y), vy: Math.round(pl.body.velocity.y), ia: L.ia.dbg }; });
const info = await p.evaluate(() => { const ia = window.__lvl.ia; return { springs: ia.springs.map(s => s.x), brk: ia.brk.map(b => Math.round(b.im.x)), mov: ia.mov.map(m => [m.kind, Math.round(m.x0), Math.round(m.x1)]) }; });
const R = { info };
// 1 spring: drop onto it
await p.evaluate(x => { const pl = window.__lvl.player; pl.body.reset(x, 380); }, info.springs[0]); let minY = 999;
for (let i = 0; i < 40; i++) { await p.evaluate(() => window.__step(2)); const s = await st(); minY = Math.min(minY, s.y); if (i === 14) await p.screenshot({ path: 'audit/v12/ia/spring.png' }); }
R.spring = { launches: (await st()).ia.launches, minY };
// 2 breakable: shoot it
const bx = info.brk[0]; await p.evaluate(x => { const pl = window.__lvl.player; pl.body.reset(x - 70, 430); pl.facing = 1; }, bx); await p.evaluate(() => window.__step(20));
for (let i = 0; i < 8; i++) { await p.keyboard.press('j'); await p.evaluate(() => window.__step(14)); if (i === 5) await p.screenshot({ path: 'audit/v12/ia/break_shoot.png' }); }
R.shoot = (await st()).ia.broke;
// 3 breakable: dash through second
const bx2 = info.brk[1]; await p.evaluate(x => { const pl = window.__lvl.player; pl.body.reset(x - 50, 430); pl.facing = 1; pl.dashCd = 0; }, bx2); await p.evaluate(() => window.__step(20));
await p.keyboard.down('ArrowRight'); await p.keyboard.press('Shift'); await p.evaluate(() => window.__step(4)); await p.screenshot({ path: 'audit/v12/ia/break_dash.png' }); await p.evaluate(() => window.__step(10)); await p.keyboard.up('ArrowRight');
R.dash = (await st()).ia.broke;
// 4 moving platform: put player on it, see carried
const mv = await p.evaluate(() => { const m = window.__lvl.ia.mov.find(m => m.kind === 'move'); return m && [Math.round(m.im.x), Math.round(m.y0)]; });
if (mv) { await p.evaluate(([x, y]) => { const pl = window.__lvl.player; pl.body.reset(x, y - 6); }, mv); await p.evaluate(() => window.__step(6)); const a = await st();
  await p.evaluate(() => window.__step(60)); await p.screenshot({ path: 'audit/v12/ia/moving.png' }); const c = await st(); R.move = { x0: a.x, x1: c.x, y: c.y, rides: c.ia.rides }; }
// 5 falling platform
const fp = await p.evaluate(() => { const m = window.__lvl.ia.mov.find(m => m.kind === 'fall'); return m && [Math.round(m.im.x), Math.round(m.y0)]; });
if (fp) { await p.evaluate(([x, y]) => { const pl = window.__lvl.player; pl.body.reset(x, y - 6); }, fp); await p.evaluate(() => window.__step(30)); await p.screenshot({ path: 'audit/v12/ia/crumble.png' }); await p.evaluate(() => window.__step(30)); R.fall = await st(); }
R.errs = errs; console.log(JSON.stringify(R)); await b.close();
