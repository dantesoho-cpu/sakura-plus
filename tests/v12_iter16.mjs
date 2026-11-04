// Iter 16: ambient depth layers, boss phase-2 transition, Sakura pose crossfade, L2 ground variety, on-camera kill chain
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/'; const D = 'audit/v12/iter16'; fs.mkdirSync(D, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
const W = ms => p.waitForTimeout(ms), fails = [], out = {};
const start = async k => { await p.evaluate(k => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(k); }, k); await W(3500); await p.evaluate(() => { window.__lvl.player.damage = () => false; }); };
await p.goto(URL); await W(2500);
for (const lvl of ['Level1', 'Level2']) { await start(lvl);
  await p.keyboard.down('ArrowRight'); await W(1200); await p.keyboard.press('Space'); await W(500); await p.keyboard.up('ArrowRight'); await W(600);
  const a = await p.evaluate(() => ({ ...window.__amb.dbg, vis: window.__amb.fg.filter(f => f.im.x > 0 && f.im.x < 480 && f.im.y > 0 && f.im.y < 270).length, blends: window.__lvl.player.blends }));
  await p.screenshot({ path: `${D}/${lvl}_ambient.png` }); out[lvl] = a;
  if (!(a.fg >= 6 && a.far === 3 && a.frames > 30 && a.blends >= 2)) fails.push(lvl + ' ambient/blend ' + JSON.stringify(a));
  // kill chain on camera: put 3 foes right in front of Sakura and destroy them in quick succession
  const ch = await p.evaluate(() => { const L = window.__lvl, P = L.player, es = L.enemies.filter(e => e.active && !e.dead && e.kind !== 'boss').slice(0, 3); if (es.length < 3) return null; es.forEach((e, i) => { e.setPosition(P.x + 60 + i * 36, P.y); e.body.reset(P.x + 60 + i * 36, P.y); }); return true; });
  await W(60); await p.evaluate(() => { const L = window.__lvl, P = L.player; L.enemies.filter(e => e.active && !e.dead && e.kind !== 'boss' && Math.abs(e.x - P.x - 96) < 60).slice(0, 3).forEach((e, i) => L.time.delayedCall(i * 90, () => !e.dead && e.die())); });
  await W(260); await p.screenshot({ path: `${D}/${lvl}_chain.png` }); const n = await p.evaluate(() => window.__lvl.__chain?.n); out[lvl].chain = n; if (!ch || !(n >= 2)) fails.push(lvl + ' chain ' + n); }
out.groundVar = await p.evaluate(() => window.__lvl.groundVar); if (!(out.groundVar > 10)) fails.push('ground var');
await p.evaluate(() => { const L = window.__lvl; L.player.body.reset(1400, 400); }); await W(800); await p.screenshot({ path: `${D}/Level2_ground.png` });
// boss phase transition
await p.evaluate(() => { const L = window.__lvl; L.player.body.reset((L.AX0 || 3960) + 60, 430); }); await W(4500);
await p.evaluate(() => { const B = window.__lvl.boss; B.hp = Math.floor(B.maxHp / 2) + 1; B.st = 'hover'; B.stT = 2; B.hit(2, 1); });
const t0 = await p.evaluate(() => { const L = window.__lvl, B = L.boss; return { p2: B.dbg.phase2, shift: B.dbg.p2shift, slow: L.physics.world.timeScale, st: B.st, pose: B.texture.key }; });
await W(120); await p.screenshot({ path: `${D}/boss_phase2_a.png` }); await W(350); await p.screenshot({ path: `${D}/boss_phase2_b.png` });
const inv = await p.evaluate(() => { const B = window.__lvl.boss, h = B.hp; B.hit(1, 1); return B.hp === h; });
await W(1600); const t1 = await p.evaluate(() => { const L = window.__lvl, B = L.boss; return { slow: L.physics.world.timeScale, tw: L.tweens.timeScale, st: B.st, zoom: L.cameras.main.zoom }; });
out.boss = { t0, inv, t1 }; if (!t0.p2 || t0.shift !== 1 || t0.slow !== 2.5 || !inv || t1.slow !== 1 || t1.tw !== 1 || t1.st === 'intro' || Math.abs(t1.zoom - 1) > 0.01) fails.push('boss p2 ' + JSON.stringify(out.boss));
console.log(JSON.stringify({ ...out, errs, fails, result: fails.length || errs.length ? 'FAIL' : 'PASS' })); await b.close();
