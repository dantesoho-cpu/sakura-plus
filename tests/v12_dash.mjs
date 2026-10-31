import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const out = {}; fs.mkdirSync('audit/v12/dash', { recursive: true });
const DIRS = { R: ['ArrowRight'], L: ['ArrowLeft'], U: ['ArrowUp'], UR: ['ArrowUp', 'ArrowRight'], UL: ['ArrowUp', 'ArrowLeft'], DR: ['ArrowDown', 'ArrowRight'], DL: ['ArrowDown', 'ArrowLeft'], D: ['ArrowDown'] };
for (const lvl of ['2', '1']) {
  await p.goto((process.env.URL || 'http://127.0.0.1:4180/sakura-plus/') + '?lvl=' + lvl); await p.waitForTimeout(3500);
  if (lvl === '1') { await p.keyboard.press('Enter'); await p.waitForTimeout(1500); }
  await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; const pl = window.__lvl.player; pl.hp = 1e9; });
  await p.evaluate(() => window.__step(30)); const res = {}; let si = 0;
  for (const [n, ks] of Object.entries(DIRS)) {
    // airborne start for vertical-down tests: jump first
    await p.evaluate(() => { const pl = window.__lvl.player; pl.body.reset(pl.x, pl.y - 70); pl.body.setVelocity(0, 0); pl.canAirDash = true; pl.dashCd = 0; });
    await p.evaluate(() => window.__step(2));
    for (const k of ks) await p.keyboard.down(k);
    const a = await p.evaluate(() => [window.__lvl.player.x, window.__lvl.player.y]);
    await p.keyboard.down('Shift'); await p.evaluate(() => window.__step(2)); await p.keyboard.up('Shift');
    await p.evaluate(() => window.__step(3)); const anim = await p.evaluate(() => window.__lvl.player.anims.currentAnim?.key); const sp = await p.evaluate(() => { const pl = window.__lvl.player, c = window.__lvl.cameras.main; return [Math.round((pl.x - c.worldView.x) * 2), Math.round((pl.y - c.worldView.y) * 2)]; }); fs.appendFileSync('audit/v12/dash/pos.txt', lvl + ' ' + n + ' ' + sp + '\n');
    await p.screenshot({ path: `audit/v12/dash/L${lvl}_${String(si++).padStart(2, '0')}_${n}.png` });
    await p.evaluate(() => window.__step(5));
    const c = await p.evaluate(() => [window.__lvl.player.x, window.__lvl.player.y, window.__lvl.player.dbg.lastDir]);
    for (const k of ks) await p.keyboard.up(k);
    res[n] = { dx: Math.round(c[0] - a[0]), dy: Math.round(c[1] - a[1]), dir: c[2], anim };
    await p.evaluate(() => window.__step(40));
  }
  out['L' + lvl] = res;
}
out.errs = errs; console.log(JSON.stringify(out)); await b.close();
