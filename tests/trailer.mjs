// Trailer capture (real-time video). ASSISTS (disclosed): teleports between set pieces, i-frames, boss hp trimmed so the fight fits the cut.
import { chromium } from 'playwright'; import fs from 'fs';
const dir = 'audit/v9/raw'; fs.rmSync(dir, { recursive: true, force: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 960, height: 540 }, recordVideo: { dir, size: { width: 960, height: 540 } } }); const p = await ctx.newPage();
const T0 = Date.now(), marks = []; const mark = n => marks.push([n, (Date.now() - T0) / 1000]);
const L = (f, a) => p.evaluate(f, a); const w = ms => p.waitForTimeout(ms); const K = p.keyboard;
const tp = (x, y, face = 1) => L(([x, y, f]) => { const l = window.__lvl, pl = l.player; pl.setPosition(x, y); pl.body.reset(x, y); pl.iT = 1e9; pl.facing = f; l.cameras.main.centerOn(x, y); }, [x, y, face]);
const inv = () => L(() => { window.__lvl.player.iT = 1e9; window.__lvl.player.hp = 5; });
await p.goto(process.env.URL + '?intro=1'); await w(2600); mark('title'); await w(1400); await K.press('Enter'); await w(700); mark('intro');
for (let k = 0; k < 4; k++) { await w(k === 3 ? 2300 : 1900); await K.press('Enter'); if (k < 3) { /* finish typing then next */ } }
for (let k = 0; k < 6 && !(await L(() => !!window.__lvl?.player && window.__game.scene.isActive('Level1'))); k++) { await K.press('Enter'); await w(1200); }
await w(900); mark('level'); await inv();
// traversal + petal dash
await K.down('ArrowRight'); for (let i = 0; i < 12; i++) { await w(220); if (i % 3 === 0) await K.press('Space'); if (i % 3 === 1) await K.press('Shift'); await inv(); } await K.up('ArrowRight');
mark('giants'); await tp(206 * 16 - 236 - 20, 62 * 16 - 20); await w(400); await K.down('ArrowRight');
for (let i = 0; i < 10; i++) { await w(230); if (i % 2 === 0) { await K.down('Space'); await w(260); await K.up('Space'); } if (i === 5) await K.press('Shift'); await inv(); } await K.up('ArrowRight');
mark('waterfall'); await tp(378 * 16 - 330, 62 * 16 - 20); await w(300); await K.down('ArrowRight');
for (let i = 0; i < 10; i++) { await w(240); if (i % 3 === 0) await K.press('Space'); if (i === 4) await K.press('Shift'); await inv(); } await K.up('ArrowRight');
// charge beam at the nearest bot/drone
mark('beam'); const e = await L(() => { const l = window.__lvl; const e = l.enemies.find(e => !e.dead && e.kind !== 'boss' && e.kind !== 'turret' && e.x > 1200 && e.x < 6000); return e ? [e.x | 0, e.y | 0] : null; });
if (e) await tp(e[0] - 120, e[1] - 4, 1); await w(300); await K.down('x'); await w(1300); await K.up('x'); await w(900); await K.press('x'); await w(250); await K.press('x'); await w(500);
mark('flowers'); const fl = await L(() => window.__lvl.flowers.getChildren().filter(f => f.active).map(f => [f.x, f.y]));
for (const [x, y] of fl) { await tp(x, y - 6); await w(220); }
// boss
mark('boss'); const sx = await L(() => window.__lvl.shrineX); await tp(sx - 30, 86 * 16); await w(200); await K.down('ArrowRight'); await w(400); await K.up('ArrowRight');
await tp(410 * 16, 86 * 16); await w(200); await K.down('ArrowRight'); await w(400); await K.up('ArrowRight');
let t0 = Date.now(); let trimmed = false;
while (Date.now() - t0 < 40000) { const s = await L(() => { const l = window.__lvl; return { hp: l.boss.hp, bx: l.boss.x, px: l.player.x, done: l.bossDead }; }); if (s.done) break; await inv();
  if (!trimmed && Date.now() - t0 > 5000) { trimmed = true; await L(() => { const b = window.__lvl.boss; b.hp = Math.min(b.hp, 4); }); }
  const d = s.bx > s.px ? 'ArrowRight' : 'ArrowLeft'; await K.down(d); await w(Math.abs(s.bx - s.px) > 110 ? 90 : 16); await K.up(d); await K.press('x'); if (Math.random() < 0.25) await K.press('Space'); await w(50); }
mark('bossdead'); await w(1200);
mark('gate'); await K.down('ArrowRight'); let vic = false; for (let i = 0; i < 120 && !vic; i++) { await w(150); if (i % 10 === 5) await K.press('Space'); vic = await L(() => window.__game.scene.isActive('Victory')); }
await K.up('ArrowRight'); mark('victory'); await w(4500); mark('end');
const vpath = await p.video().path(); await ctx.close(); await b.close();
fs.writeFileSync('audit/v9/trailer_marks.json', JSON.stringify({ marks, vic, vpath }, null, 1)); console.log(JSON.stringify({ marks, vic, vpath }));
