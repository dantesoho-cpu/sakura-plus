// Iter 19: Enforcer phase shifts (2+3), dusk prop variety in L1 late sections, Sakura footfall puffs, input-aware mobile/TV hints
import { chromium } from 'playwright';
const BASE = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/'; const D = 'audit/v12/iter19/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const R = {}, fails = [], errs = [];
async function open(ctxOpts) { const c = await b.newContext(ctxOpts); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__title?.sel !== undefined, null, { timeout: 60000 }); return p; }
const p = await open({ viewport: { width: 960, height: 540 } });
// keyboard hints + pad hints on Title / LevelSelect
R.kbHint = await p.evaluate(() => window.__title.help.text);
await p.evaluate(() => { window.__padSim = true; }); await p.waitForTimeout(500);
R.padHint = await p.evaluate(() => window.__title.help.text); await p.screenshot({ path: D + 'title_pad_hint.png' });
await p.evaluate(() => window.__game.scene.getScene('Title').scene.start('LevelSelect')); await p.waitForTimeout(900);
R.lsPad = await p.evaluate(() => window.__lsHint?.text); await p.screenshot({ path: D + 'levelselect_pad_hint.png' });
await p.evaluate(() => { window.__padSim = false; }); await p.waitForTimeout(500); R.lsKb = await p.evaluate(() => window.__lsHint?.text);
if (!/ENTER/.test(R.kbHint) || !/✕/.test(R.padHint) || !/✕/.test(R.lsPad || '') || !/ENTER/.test(R.lsKb || '')) fails.push('hints ' + JSON.stringify([R.kbHint, R.padHint, R.lsPad, R.lsKb]));
await p.evaluate(() => window.__game.scene.getScene('LevelSelect').scene.start('Level1'));
await p.waitForFunction(() => window.__lvl?.player?.body && window.__lvl.enemies?.length && window.__game.loop.frame > 30, null, { timeout: 60000 });
// footfalls
await p.evaluate(() => { const P = window.__lvl.player; P.hp = 1e9; P.damage = () => false; }); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(1400); await p.screenshot({ path: D + 'footfall_run.png' }); await p.keyboard.up('ArrowRight');
R.steps = await p.evaluate(() => window.__lvl.player.steps); if (!(R.steps > 0)) fails.push('footfall ' + R.steps);
// dusk props
R.dusk = await p.evaluate(() => window.__lvl.duskN); if (!(R.dusk > 5)) fails.push('dusk ' + R.dusk);
for (const [f, n] of [[0.62, 'late_a'], [0.78, 'late_b'], [0.9, 'late_c']]) { await p.evaluate(f => { const L = window.__lvl; L.enemies.forEach(e => { if (e.kind !== 'boss') e.setActive(false).setVisible(false); }); const x = L.physics.world.bounds.width * f; L.player.body.reset(x, 200); }, f); await p.waitForTimeout(1500); await p.screenshot({ path: D + 'dusk_' + n + '.png' }); }
// boss phase shifts
await p.evaluate(() => { const L = window.__lvl, B = L.boss; L.player.body.reset(B.x - 140, B.y - 40); }); await p.waitForTimeout(2500);
for (const ph of [2, 3]) {
  await p.evaluate(ph => { const B = window.__lvl.boss; B.awake = true; B.hp = Math.floor(B.maxHp * (ph === 2 ? 0.66 : 0.33)) + 1; B.hit(2, 1); }, ph);
  await p.waitForTimeout(150); await p.screenshot({ path: D + `boss_phase${ph}_a.png` });
  const s = await p.evaluate(() => { const L = window.__lvl, B = L.boss, h = B.hp; B.hit(1, 1); return { shift: window.__enfShift, shield: B.shieldT > 0, inv: B.hp === h, ts: L.physics.world.timeScale, tw: L.tweens.timeScale, tt: L.time.timeScale }; });
  await p.waitForTimeout(400); await p.screenshot({ path: D + `boss_phase${ph}_b.png` });
  await p.waitForTimeout(1500); const s2 = await p.evaluate(() => { const L = window.__lvl, B = L.boss; return { st: B.st, shield: B.shieldT > 0, enrage: !!B.enrage, zoom: L.cameras.main.zoom }; });
  R['p' + ph] = { s, s2 }; if (s.shift?.ph !== ph || !s.shield || !s.inv || s.ts !== 1 || s.tw !== 1 || s.tt !== 1 || s2.shield || Math.abs(s2.zoom - 1) > 0.02 || (ph === 3 && !s2.enrage)) fails.push('phase' + ph + ' ' + JSON.stringify(R['p' + ph]));
}
// mobile (touch) hints
const m = await open({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
R.touchHint = await m.evaluate(() => window.__title.help.text); await m.screenshot({ path: D + 'mobile_title.png' });
await m.evaluate(() => window.__game.scene.getScene('Title').scene.start('LevelSelect')); await m.waitForTimeout(900);
R.lsTouch = await m.evaluate(() => window.__lsHint?.text); await m.screenshot({ path: D + 'mobile_levelselect.png' });
if (!/tap/.test(R.touchHint) || !/tap/.test(R.lsTouch || '')) fails.push('touch hints ' + JSON.stringify([R.touchHint, R.lsTouch]));
if (errs.length) fails.push('errs ' + errs.slice(0, 3).join(' | '));
console.log(JSON.stringify(R)); console.log(JSON.stringify({ fails, result: fails.length ? 'FAIL' : 'PASS' })); await b.close(); process.exit(fails.length ? 1 : 0);
