// Full scripted playthrough: Title -> Level1 -> 10 memories -> shrine -> boss -> gate -> car -> Victory -> restart.
// ASSISTS (disclosed): route traversal between flowers/shrine/arena uses teleports; player i-frames held on so drones can't end the run.
// REAL INPUT: title start, running, jumping, shooting the boss (X), walking through the gate to the car, ENTER restart on victory.
import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
let fi = 0; const frame = async () => p.screenshot({ path: `audit/gif/f${String(fi++).padStart(4, '0')}.png` });
const L = (f, a) => p.evaluate(f, a); const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
await p.goto('http://127.0.0.1:4180/sakura-plus/'); await p.waitForTimeout(2600); await p.screenshot({ path: 'audit/B_title.png' });
await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
const inv = () => L(() => { const pl = window.__lvl.player; pl.iT = 1e9; });
await inv(); await p.keyboard.down('ArrowRight');
for (let i = 0; i < 16; i++) { await p.waitForTimeout(200); if (i % 4 === 0) await p.keyboard.press('Space'); await frame(); }
await p.keyboard.up('ArrowRight'); await p.screenshot({ path: 'audit/B_level.png' });
log('jet pickup', await L(() => window.__lvl.player.hasJet));
const tp = (x, y) => L(([x, y]) => { const pl = window.__lvl.player; pl.setPosition(x, y); pl.body.reset(x, y); pl.iT = 1e9; }, [x, y]);
if (!(await L(() => window.__lvl.player.hasJet))) { const j = await L(() => [window.__lvl.jetPick.x, window.__lvl.jetPick.y]); await tp(j[0], j[1]); await p.waitForTimeout(300); }
const fl = await L(() => window.__lvl.flowers.getChildren().filter(f => f.active).map(f => [f.x, f.y]));
for (const [x, y] of fl) { await tp(x, y - 6); await p.waitForTimeout(250); }
await p.waitForTimeout(300); log('memories', await L(() => window.__lvl.got), 'toasts', await L(() => window.__lvl.toast.shown.length));
const sx = await L(() => window.__lvl.shrineX); await tp(sx - 30, 86 * 16); await p.waitForTimeout(400); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.up('ArrowRight');
log('shrine lit', await L(() => window.__lvl.shrineLit));
await tp(410 * 16, 86 * 16); await p.waitForTimeout(300); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(400); await p.keyboard.up('ArrowRight');
log('arena', await L(() => window.__lvl.arena), 'boss awake', await L(() => window.__lvl.boss.awake));
let t0 = Date.now(), shot = false;
while (Date.now() - t0 < 90000) {
  const s = await L(() => { const l = window.__lvl; return { hp: l.boss.hp, dead: l.boss.dead, bx: l.boss.x, by: l.boss.y, px: l.player.x, done: l.bossDead }; });
  if (s.done) break; await inv();
  const dir = s.bx > s.px ? 'ArrowRight' : 'ArrowLeft'; const far = Math.abs(s.bx - s.px) > 110;
  if (far) { await p.keyboard.down(dir); await p.waitForTimeout(90); await p.keyboard.up(dir); } else { await p.keyboard.down(dir); await p.waitForTimeout(16); await p.keyboard.up(dir); }
  await p.keyboard.press('x'); if (s.by < (await L(() => window.__lvl.player.y)) - 30 && Math.random() < 0.4) await p.keyboard.press('Space');
  await p.waitForTimeout(60); if (fi % 3 === 0 || !shot) await frame(); else fi++;
  if (!shot && s.hp < 20) { await p.screenshot({ path: 'audit/B_boss.png' }); shot = true; }
}
log('boss dead', await L(() => window.__lvl.bossDead), 'secs', ((Date.now() - t0) / 1000) | 0);
await p.waitForTimeout(800); await p.keyboard.down('ArrowRight');
let vic = false; for (let i = 0; i < 120 && !vic; i++) { await p.waitForTimeout(150); if (i % 10 === 5) await p.keyboard.press('Space'); if (i % 2) await frame();
  vic = await L(() => !!window.__victory || window.__game.scene.isActive('Victory')); }
await p.keyboard.up('ArrowRight'); log('gate open', await L(() => window.__lvl?.gateOpen), 'victory', vic);
await p.waitForTimeout(3000); for (let i = 0; i < 4; i++) { await frame(); await p.waitForTimeout(200); } await p.screenshot({ path: 'audit/B_victory.png' });
await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
const restarted = await L(() => window.__game.scene.isActive('Level1') && window.__lvl.got === 0 && window.__lvl.time_ < 3);
log('restart', restarted, 'errors', errs);
fs.writeFileSync('audit/play.json', JSON.stringify({ vic, restarted, errs }, null, 1)); await b.close();
