// captures v10 cinematics: intro panels (shimmer/clouds), boss windups + death, victory car sequence
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = []; p.on('pageerror', e => errs.push(String(e.stack).slice(0, 500)));
await p.addInitScript(() => { window.__rnd = Math.random; }); const U = process.env.URL; let n = 0; const snap = async (pre, ms = 0) => { await p.screenshot({ path: `audit/v10/f/${pre}${String(n++).padStart(3, '0')}.png` }); if (ms) await p.waitForTimeout(ms); };
await p.goto(U + '?intro=1'); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
for (let i = 0; i < 24; i++) await snap('i', 120); await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); await p.waitForTimeout(500); for (let i = 0; i < 16; i++) await snap('i', 120);
await p.evaluate(() => window.__intro.finish()); await p.waitForTimeout(2500);
const boss = await p.evaluate(() => { const L = window.__lvl, B = L.boss, pl = L.player; pl.hp = 99; pl.iT = 999; B.awake = true; pl.body.reset(B.x - 90, B.y + 20); L.cameras.main.stopFollow(); L.cameras.main.centerOn(B.x - 40, B.y); return { x: B.x, y: B.y }; });
const tele = [];
for (const k of ['spread', 'charge', 'ring', 'summon']) { await p.evaluate(k => { const B = window.__lvl.boss; B.st = 'hover'; B.stT = 0; B.attacks = [1, 2, 3]; B.hp = k === 'spread' ? 30 : 5; Math.random = (() => { const o = ['spread', 'charge', 'ring', 'summon']; return () => o.indexOf(k) / 4 + 0.01; })(); }, k);
  for (let i = 0; i < 6; i++) await snap('b', 110); tele.push(await p.evaluate(() => window.__lvl.boss.next)); await p.evaluate(() => { Math.random = window.__rnd; }); await p.waitForTimeout(900); }
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__st = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; Math.random = window.__rnd; const B = window.__lvl.boss; B.hp = 1; B.hit(5, 1); }); const ts = await p.evaluate(() => window.__lvl.physics.world.timeScale);
for (let i = 0; i < 40; i++) { await p.evaluate(() => window.__st(4)); await snap('d'); }
await p.evaluate(() => window.__st(200)); await p.evaluate(() => window.__game.loop.wake());
const after = await p.evaluate(() => ({ ts: window.__lvl.physics.world.timeScale, tw: window.__lvl.tweens.timeScale, an: window.__lvl.anims.globalTimeScale }));
await p.waitForTimeout(2500); await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__lvl.scene.start('Victory', { time: 200, got: 10, kills: 20, deaths: 1 }); window.__T = performance.now(); window.__st = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; });
const vx = []; for (let i = 0; i < 60; i++) { await p.evaluate(() => window.__st(6)); vx.push(await p.evaluate(() => Math.round(window.__car.x))); await snap('v'); }
const car = { vx: vx.filter((_, i) => i % 6 === 0) };
console.log(JSON.stringify({ tele, slowTs: ts, after, car, errs })); await b.close();
