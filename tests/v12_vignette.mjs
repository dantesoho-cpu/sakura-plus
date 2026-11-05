import { chromium } from 'playwright'; import fs from 'fs';
const tag = process.env.TAG || 'after'; fs.mkdirSync('audit/v12/vignette', { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto((process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=2'); await p.waitForFunction(() => window.__lvl && window.__lvl.tiers && window.__lvl.player && window.__game, null, { timeout: 60000, polling: 250 }); await p.waitForTimeout(800);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; window.__lvl.player.hp = 1e9; });
const shots = [[800, 200], [1650, -30], [2700, 200], [3500, -30], [4800, -260]]; const res = [];
for (const [x, y] of shots) { const r = await p.evaluate(([x, y]) => { const P = window.__lvl.player; P.body.reset(x, y); P.body.setVelocity(0, 0); window.__step(45); return { down: P.body.blocked.down || P.body.touching.down, y: Math.round(P.y) }; }, [x, y]); res.push(r); await p.screenshot({ path: `audit/v12/vignette/${tag}_${x}.png` }); }
const d = await p.evaluate(() => ({ v: window.__lvl.tiers.dbg.vignettes || 0, n: (window.__vig || []).length, fps: window.__game.loop.actualFps }));
const ok = tag === 'before' || (d.v >= 14 && d.n >= 40 && res.every((r, i) => r.down || Math.abs(r.y - shots[i][1]) < 30) && errs.length === 0);
console.log(JSON.stringify({ d, res, errs })); console.log(ok ? 'PASS' : 'FAIL'); await b.close(); process.exit(ok ? 0 : 1);
