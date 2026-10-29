import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(process.env.URL || 'http://127.0.0.1:5173/sakura-plus/'); await p.waitForTimeout(2500);
await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = (n) => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; window.__lvl.player.hp = 1e9; });
const shot = async (name, i, n) => { await p.evaluate(n => window.__step(n), n); await p.screenshot({ path: `audit/v5/f/${name}_${String(i).padStart(3, '0')}.png` }); };
const put = (x, y) => p.evaluate(([x, y]) => { const pl = window.__lvl.player; pl.setPosition(x, y); pl.body.reset(x, y); }, [x, y]);
const sp = await p.evaluate(() => [window.__lvl.spawn.x, window.__lvl.spawn.y]);
// --- dash trail
await put(sp[0], sp[1]); await p.evaluate(() => window.__step(40));
await p.keyboard.down('ArrowRight'); let n = 0;
for (let r = 0; r < 3; r++) { await p.keyboard.press('Shift'); for (let i = 0; i < 12; i++) await shot('dash', n++, 2); }
await p.keyboard.up('ArrowRight'); for (let i = 0; i < 8; i++) await shot('dash', n++, 2);
const ghosts = await p.evaluate(() => window.__lvl.player.pfx.ghosts);
// --- jet plume
await put(sp[0], sp[1]); await p.evaluate(() => { window.__lvl.player.hasJet = true; window.__step(30); });
await p.keyboard.press('Space'); await p.evaluate(() => window.__step(14)); await p.keyboard.down('Space'); await p.evaluate(() => window.__step(3)); await p.keyboard.up('Space'); await p.evaluate(() => window.__step(3)); await p.keyboard.down('Space');
n = 0; let jet = 0; for (let i = 0; i < 36; i++) { await shot('jet', n++, 2); jet += await p.evaluate(() => window.__lvl.player.jetting ? 1 : 0); }
await p.keyboard.up('Space'); await p.evaluate(() => window.__step(90));
// --- charge beam vs. a row of enemies
await put(sp[0], sp[1]); await p.evaluate(() => window.__step(40));
const lined = await p.evaluate(() => { const l = window.__lvl, pl = l.player; pl.facing = 1; pl.setFlipX(false); let k = 0;
  for (const e of l.enemies) { if (e.dead || !e.active || e.kind === 'turret' || k >= 3) continue; const x = pl.x + 70 + k * 55, y = e.kind === 'drone' ? pl.y - 6 : pl.y; e.setPosition(x, y); e.body.reset(x, y); if (e.home) e.home.set(x, y); e.hp = 6; k++; } return k; });
n = 0; await p.keyboard.down('j'); for (let i = 0; i < 26; i++) await shot('beam', n++, 4);
const lvl = await p.evaluate(() => window.__lvl.player.beam.level);
await p.keyboard.up('j'); for (let i = 0; i < 34; i++) await shot('beam', n++, 2);
const bs = await p.evaluate(() => { const bm = window.__lvl.player.beam; return { fired: bm.fired, hits: bm.hits, L: bm.L, dead: window.__lvl.enemies.filter(e => e.dead).length }; });
for (let i = 0; i < 20; i++) await shot('beam', n++, 3);
// --- enemies close-up: one of each kind lined up in view (idle -> telegraph -> attack)
await put(sp[0] + 40, sp[1]); await p.evaluate(() => window.__step(30));
await p.evaluate(() => { const l = window.__lvl, pl = l.player; const pick = k => l.enemies.find(e => e.kind === k && !e.dead && e.active);
  [['turret', 200, 0], ['drone', 120, -40], ['bot', 165, 0]].forEach(([k, dx, dy]) => { const e = pick(k); if (!e) return; const x = pl.x + dx, y = pl.y + dy; e.setPosition(x, y); e.body.reset(x, y); if (e.home) e.home.set(x, y); e.hp = 99; }); });
n = 0; for (let i = 0; i < 70; i++) await shot('enemy', n++, 2);
console.log(JSON.stringify({ ghosts, jet, lined, chargeLevel: lvl, ...bs, errs })); await b.close();
