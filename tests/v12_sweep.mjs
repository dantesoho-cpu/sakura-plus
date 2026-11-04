// Scripted full playthrough bug sweep: both levels, walk/shoot every ~350px segment, check for errors, NaN, out-of-world,
// stuck player, feet flush on landing, enemy facing; then boss kill + victory. Shots in audit/v12/sweep/
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/'; const D = 'audit/v12/sweep'; fs.mkdirSync(D, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console:' + m.text()); });
const W = ms => p.waitForTimeout(ms), fails = [], out = {};
const start = async k => { await p.evaluate(k => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(k); }, k); await W(3500); await p.evaluate(() => { window.__lvl.player.damage = () => false; }); };
await p.goto(URL); await W(2500);
for (const lvl of ['Level1', 'Level2']) {
  await start(lvl); const info = await p.evaluate(() => { const L = window.__lvl; return { w: L.physics.world.bounds.width, h: L.physics.world.bounds.height, x0: Math.round(L.player.x), end: L.AX0 || null }; });
  const stop = Math.min(info.w - 200, info.end ? info.end - 100 : info.w - 200); let segs = 0, stuck = 0, shotsN = 0; const imp0 = await p.evaluate(() => window.__lvl.enemies.reduce((a, e) => a + (e.dbgImpacts || 0), 0));
  for (let x = info.x0; x < stop; x += 350) { segs++;
    const ok = await p.evaluate(x => { const L = window.__lvl, P = L.player; let gy = L.groundAt ? L.groundAt(x, 0) : -1; if (!(gy > 0)) gy = -1; if (gy < 0) for (let y = 40; y < L.physics.world.bounds.height - 20; y += 8) { const hit = L.physics.overlapRect ? L.physics.overlapRect(x, y, 2, 2, false, true).length : 0; if (hit) { gy = y; break; } } if (gy < 0) return false; P.body.reset(x, gy - 6); P.body.setVelocity(0, 0); return true; }, x);
    if (!ok) continue; await W(250);
    const x1 = await p.evaluate(() => window.__lvl.player.x); await p.keyboard.down('ArrowRight');
    for (let i = 0; i < 6; i++) { await p.keyboard.press('KeyJ'); shotsN++; await W(130); if (i === 2) { await p.keyboard.press('Space'); } }
    await p.keyboard.up('ArrowRight'); await W(350);
    const s = await p.evaluate(() => { const L = window.__lvl, P = L.player, B = P.body; const foes = L.enemies.filter(e => e.active && !e.dead && !e.turning && e.kind !== 'boss' && e.kind !== 'drone' && e.kind !== 'mine' && Math.abs(e.x - P.x) < 300 && Math.abs(e.y - P.y) < 40 && e.body?.blocked?.down);
      return { x: P.x, y: P.y, bot: B.bottom, nan: !isFinite(P.x + P.y), down: B.blocked.down || B.touching.down, ang: P.angle, anim: P.anims.currentAnim?.key, wh: L.physics.world.bounds.height,
        face: foes.filter(e => e.faceDir !== undefined && Math.sign(P.x - e.x) && e.faceDir !== Math.sign(P.x - e.x) && Math.abs(P.x - e.x) > 40).length }; });
    if (s.nan) fails.push(lvl + ' NaN at ' + x); if (s.y > s.wh + 50) fails.push(lvl + ' fell out at ' + x);
    if (Math.abs(s.x - x1) < 8 && s.down) stuck++;
    if (s.down && Math.abs(s.ang) > 1) fails.push(lvl + ' angle stuck ' + s.ang + ' at ' + x);
    if (s.anim === 'roll' || s.anim === 'ledge') { await W(600); const a2 = await p.evaluate(() => window.__lvl.player.anims.currentAnim?.key); if (a2 === 'roll') fails.push(lvl + ' roll stuck at ' + x); }
    if (segs % 6 === 1) await p.screenshot({ path: `${D}/${lvl}_${segs}.png` }); }
  const imp = await p.evaluate(() => window.__lvl.enemies.reduce((a, e) => a + (e.dbgImpacts || 0), 0)) - imp0;
  out[lvl] = { segs, stuck, shotsN, impacts: imp, fps: await p.evaluate(() => Math.round(window.__game.loop.actualFps)) };
  if (stuck > segs * 0.25) fails.push(lvl + ' stuck in ' + stuck + '/' + segs);
}
// boss -> victory
await p.evaluate(() => { const L = window.__lvl; L.player.body.reset((L.AX0 || 3960) + 60, 430); }); await W(4500);
await p.evaluate(() => { const B = window.__lvl.boss; B.hp = 1; }); await p.screenshot({ path: `${D}/boss.png` });
for (let i = 0; i < 40; i++) { const done = await p.evaluate(() => window.__lvl.boss.st === 'dying' || window.__lvl.boss.hp <= 0); if (done) break; await p.evaluate(() => { const B = window.__lvl.boss, P = window.__lvl.player; P.facing = B.x > P.x ? 1 : -1; P.setFlipX(P.facing < 0); }); await p.keyboard.press('KeyJ'); await W(150); }
out.bossDead = await p.evaluate(() => window.__lvl.boss.hp <= 0); if (!out.bossDead) { await p.evaluate(() => window.__lvl.boss.hit(5, 1)); out.bossForced = true; }
await p.screenshot({ path: `${D}/boss_dying.png` }); let vic = false; for (let i = 0; i < 30 && !vic; i++) { await W(500); vic = await p.evaluate(() => window.__game.scene.isActive('Victory')); }
if (!vic) fails.push('no victory'); else await p.screenshot({ path: `${D}/victory.png` });
console.log(JSON.stringify({ ...out, errs: errs.slice(0, 8), fails, result: fails.length || errs.length ? 'FAIL' : 'PASS' })); await b.close();
