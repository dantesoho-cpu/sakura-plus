import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); fs.mkdirSync('audit/v12/anim', { recursive: true }); const R = {};
for (const lvl of ['2', '1']) {
  await p.goto((process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=' + lvl); await p.waitForTimeout(3500); if (lvl === '1') { await p.keyboard.press('Enter'); await p.waitForTimeout(1500); }
  await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; window.__lvl.player.hp = 1e9; });
  await p.evaluate(() => window.__step(30)); const fr = new Set(); let ak;
  for (let i = 0; i < 30; i++) { await p.evaluate(() => window.__step(4)); const f = await p.evaluate(() => [window.__lvl.player.anims.currentAnim?.key, window.__lvl.player.frame.name]); ak = f[0]; fr.add(f[1]); }
  const r = { idleAnim: ak, idleFrames: fr.size };
  await p.keyboard.down('ArrowRight'); await p.evaluate(() => window.__step(50)); await p.keyboard.up('ArrowRight'); await p.keyboard.down('ArrowLeft'); await p.evaluate(() => window.__step(3));
  r.skidAnim = await p.evaluate(() => window.__lvl.player.anims.currentAnim?.key); await p.screenshot({ path: `audit/v12/anim/L${lvl}_skid.png` }); await p.evaluate(() => window.__step(30)); await p.keyboard.up('ArrowLeft');
  r.skids = await p.evaluate(() => window.__lvl.player.dbg.skids);
  for (const [n, ks] of [['UR', ['ArrowUp', 'ArrowRight']], ['DR', ['ArrowDown', 'ArrowRight']], ['U', ['ArrowUp']]]) { await p.evaluate(() => { const pl = window.__lvl.player; pl.body.reset(pl.x, pl.y - 70); pl.body.setVelocity(0, 0); pl.canAirDash = true; pl.dashCd = 0; }); await p.evaluate(() => window.__step(2));
    for (const k of ks) await p.keyboard.down(k); await p.keyboard.down('Shift'); await p.evaluate(() => window.__step(2)); await p.keyboard.up('Shift'); await p.evaluate(() => window.__step(5)); await p.screenshot({ path: `audit/v12/anim/L${lvl}_trail_${n}.png` }); for (const k of ks) await p.keyboard.up(k); await p.evaluate(() => window.__step(40)); }
  r.fx = await p.evaluate(() => { const f = window.__lvl.player.pfx; return { lines: f.lines, dirs: f.dirs, ghosts: f.ghosts }; }); R['L' + lvl] = r;
}
R.errs = errs; console.log(JSON.stringify(R)); await b.close();
