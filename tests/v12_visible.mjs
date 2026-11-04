import { chromium } from 'playwright';
const BASE = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const R = { bad: [] }; const fails = [];
for (const lvl of [1, 2]) {
  const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + (lvl === 2 ? '?lvl=2' : '')); if (lvl === 1) { await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 60000 }); await p.evaluate(() => window.__game.scene.getScene('Title').scene.start('Level1')); } await p.waitForFunction(() => window.__lvl?.player?.body && window.__lvl.enemies?.length && window.__game.loop.frame > 30, null, { timeout: 60000 }); await p.waitForTimeout(1000);
  const n = await p.evaluate(() => { window.__lvl.player.hp = 1e9; window.__lvl.player.invuln = 1e9; return window.__lvl.enemies.length; }); let checked = 0;
  for (let i = 0; i < n; i++) {
    const r = await p.evaluate(async (i) => { const L = window.__lvl, e = L.enemies[i]; if (!e || e.dead || !e.active) return null;
      L.player.body.reset(e.x - 120, e.y - 20); await new Promise(r => setTimeout(r, 700)); const vw = L.cameras.main.worldView; if (!vw.contains(e.x, e.y)) { L.player.body.reset(e.x - 60, e.y - 20); await new Promise(r => setTimeout(r, 900)); }
      if (!e.active || e.dead) return null; const cam = L.cameras.main.worldView, on = cam.contains(e.x, e.y); const fr = e.frame;
      return { i, kind: e.kind, el: !!e.elite, tex: e.texture.key, frame: fr?.name, anim: e.anims.currentAnim?.key, vis: e.visible, a: e.alpha, cf: e.cameraFilter & L.cameras.main.id, on, ok: !on || !(e.cameraFilter & L.cameras.main.id) && e.visible && e.alpha > 0.05 && e.texture.key !== '__MISSING' && fr && fr.width > 1 && on, x: Math.round(e.x), w: fr?.width }; }, i);
    if (!r) continue; checked++; if (!r.ok) { R.bad.push({ lvl, ...r }); if (R.bad.length < 4) await p.screenshot({ path: `audit/v12/iter17/invis_L${lvl}_${i}.png` }); }
  }
  R['L' + lvl] = { n, checked, errs }; if (errs.length) fails.push('errs L' + lvl); await p.context().close();
}
if (R.bad.length) fails.push('invisible ' + R.bad.length); R.fails = fails; R.result = fails.length ? 'FAIL' : 'PASS'; console.log(JSON.stringify(R)); await b.close();
