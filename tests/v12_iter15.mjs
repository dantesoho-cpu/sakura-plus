// Iter 15 quality: layered hit impact (sheet spark + streak + ring), heavy-hit shake, hurt flash, stride timeScale, L2 fade-in
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/'; const D = 'audit/v12/iter15'; fs.mkdirSync(D, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
const W = ms => p.waitForTimeout(ms), fails = [], out = {};
const start = async k => { await p.evaluate(k => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(k); }, k); await W(3500); };
await p.goto(URL); await W(2500);
for (const lvl of ['Level1', 'Level2']) { await start(lvl);
  const r = await p.evaluate(() => { const L = window.__lvl, P = L.player; const e = L.enemies.find(e => e.active && !e.dead && e.kind !== 'boss' && e.hp > 3) || L.enemies.find(e => e.active && !e.dead && e.kind !== 'boss'); if (!e) return null; e.hp = 99;
    P.body.reset(e.x - 90, e.y); L.cameras.main.centerOn(e.x, e.y); const n0 = L.children.list.length; e.hit(1, 1); const n1 = L.children.list.length; return { kind: e.kind, added: n1 - n0, imp: e.dbgImpacts, ex: e.x }; });
  await W(30); await p.screenshot({ path: `${D}/${lvl}_hit.png` });
  const r2 = await p.evaluate(() => { const L = window.__lvl, e = L.enemies.find(e => e.hp > 90); const n0 = L.children.list.length; e.hit(4, 1); return { added: L.children.list.length - n0, shake: L.cameras.main.shakeEffect.isRunning }; });
  await W(30); await p.screenshot({ path: `${D}/${lvl}_heavyhit.png` });
  out[lvl] = { r, r2 }; if (!r || r.added < 2 || !(r2.added >= 3) || !r2.shake) fails.push(lvl + ' impact ' + JSON.stringify({ r, r2 }));
  const h = await p.evaluate(() => { const L = window.__lvl, P = L.player; P.iT = 0; P.damage(P.x + 20); return L.cameras.main.flashEffect.isRunning; }); await W(30); await p.screenshot({ path: `${D}/${lvl}_hurtflash.png` }); if (!h) fails.push(lvl + ' no hurt flash');
  await W(1200);
  const ts = await p.evaluate(async () => { const P = window.__lvl.player; P.iT = 9; return null; });
  await p.keyboard.down('ArrowRight'); await W(150); const slow = await p.evaluate(() => window.__lvl.player.anims.timeScale); await W(700); const fast = await p.evaluate(() => [window.__lvl.player.anims.timeScale, window.__lvl.player.state_]); await p.keyboard.up('ArrowRight');
  out[lvl].stride = [slow, fast]; if (!(fast[0] >= slow)) fails.push(lvl + ' stride ' + JSON.stringify([slow, fast])); }
console.log(JSON.stringify({ ...out, errs, fails, result: fails.length || errs.length ? 'FAIL' : 'PASS' })); await b.close();
