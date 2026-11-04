// Iter 17: title menu + controls overlay, level select (keys, best-time card, launch), elite enemy variants + death burst, L1 strip variety
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/'; const D = 'audit/v12/iter17'; fs.mkdirSync(D, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
const W = ms => p.waitForTimeout(ms), fails = [], out = {}; const act = k => p.evaluate(k => window.__game.scene.isActive(k), k);
await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__title?.sel !== undefined, null, { timeout: 60000 }); await W(1200);
await p.screenshot({ path: `${D}/title.png` });
await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await W(100); out.sel2 = await p.evaluate(() => window.__title.sel);
await p.keyboard.press('Enter'); await W(400); await p.screenshot({ path: `${D}/title_controls.png` }); out.ctl = await p.evaluate(() => !!window.__title.ctl);
await p.keyboard.press('Enter'); await W(200); out.ctlClosed = await p.evaluate(() => !window.__title.ctl);
await p.keyboard.press('ArrowUp'); await W(100); out.sel1 = await p.evaluate(() => window.__title.sel); await p.keyboard.press('Enter'); await W(1200);
out.ls = await act('LevelSelect'); if (!(out.sel2 === 2 && out.ctl && out.ctlClosed && out.sel1 === 1 && out.ls)) fails.push('title menu ' + JSON.stringify(out));
await p.screenshot({ path: `${D}/levelselect.png` });
await p.keyboard.press('ArrowRight'); await W(300); out.lsSel = await p.evaluate(() => window.__ls.sel); await p.screenshot({ path: `${D}/levelselect_l2.png` });
await p.keyboard.press('Escape'); await W(700); out.back = await act('Title'); if (!(out.lsSel === 1 && out.back)) fails.push('ls nav');
// best time persistence -> card text
await p.evaluate(() => localStorage.setItem('sakura.best.1', JSON.stringify({ time: 263, got: 9 })));
await p.evaluate(() => window.__game.scene.getScene('Title').scene.start('LevelSelect')); await W(1000);
out.best = await p.evaluate(() => window.__ls.cards[0].list.map(o => o.text).filter(Boolean).join('|')); await p.screenshot({ path: `${D}/levelselect_best.png` });
if (!/BEST 4:23 · ✿ 9\/10/.test(out.best)) fails.push('best ' + out.best);
await p.keyboard.press('ArrowRight'); await W(200); await p.keyboard.press('Enter'); await p.waitForFunction(() => window.__lvl?.scene?.key === 'Level2' && window.__lvl.player?.body, null, { timeout: 60000 }); out.launched = 'Level2';
await p.evaluate(() => localStorage.removeItem('sakura.best.1'));
// elites in both levels
for (const lvl of ['Level1', 'Level2']) { await p.evaluate(k => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(k); }, lvl);
  await p.waitForFunction(() => window.__lvl?.player?.body, null, { timeout: 60000 }); await W(1800);
  const r = await p.evaluate(() => { const L = window.__lvl, P = L.player; P.damage = () => false; const all = L.enemies.filter(e => e.active && !e.dead); const el = all.filter(e => e.elite); const e = el[0];
    const anim = e?.anims.currentAnim?.key; if (e) { e.setPosition(P.x + 70, P.y - (e.b.allowGravity ? 0 : 30)); e.b.reset(e.x, e.y); } return { total: all.length, elites: el.length, tex: e?.texture.key, anim, elitesSeen: L.__elites }; });
  await W(300); await p.screenshot({ path: `${D}/${lvl}_elite.png` });
  await p.evaluate(() => { const L = window.__lvl; const e = L.enemies.find(e => e.active && !e.dead && e.elite); e && e.die(); }); await W(140); await p.screenshot({ path: `${D}/${lvl}_elite_burst.png` });
  r.bursts = await p.evaluate(() => window.__lvl.__eliteBursts); out[lvl] = r;
  if (!(r.elites >= 1 && r.elites < r.total && /_v$/.test(r.tex) && (!r.anim || /_v$/.test(r.anim)) && r.bursts === 1)) fails.push(lvl + ' elite ' + JSON.stringify(r)); }
out.stripFlips = await p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start('Level1'); return 0; }); await p.waitForFunction(() => window.__lvl?.player?.body, null, { timeout: 60000 });
out.stripFlips = await p.evaluate(() => window.__lvl.stripFlips); if (!(out.stripFlips > 50)) fails.push('strip flips ' + out.stripFlips);
console.log(JSON.stringify({ ...out, errs, fails, result: fails.length || errs.length ? 'FAIL' : 'PASS' })); await b.close();
