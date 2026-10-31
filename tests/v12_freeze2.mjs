import { chromium, devices } from 'playwright';
const URL = (process.env.URL || 'https://dantesoho-cpu.github.io/sakura-plus/') + '?lvl=2';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const R = {}; let fail = 0;
for (const mode of ['desktop', 'mobile']) {
  const ctx = await b.newContext(mode === 'mobile' ? { ...devices['iPhone 13 landscape'] } : { viewport: { width: 960, height: 540 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push('CE ' + m.text()));
  await p.goto(URL); await p.waitForTimeout(4000); const res = [];
  for (let k = 0; k < 4; k++) {
    // real-time: kill nearest enemy with overlapping hit-stops exactly like a killing shot (hit -> explode), then try to move
    await p.evaluate(() => { const L = window.__lvl; const e = L.enemies.filter(e => !e.dead).sort((a, b) => Math.abs(a.x - L.player.x) - Math.abs(b.x - L.player.x))[0]; if (e) { e.hp = 1; e.hit(1, 1); } L.fx.hitStop(40); });
    await p.waitForTimeout(400);
    const a = await p.evaluate(() => [window.__lvl.player.x, window.__lvl.physics.world.isPaused]); await p.keyboard.down(k % 2 ? 'ArrowLeft' : 'ArrowRight'); await p.keyboard.press('j'); await p.keyboard.press('Shift'); await p.waitForTimeout(500); await p.keyboard.up(k % 2 ? 'ArrowLeft' : 'ArrowRight');
    const c = await p.evaluate(() => [window.__lvl.player.x, window.__lvl.physics.world.isPaused, window.__game.loop.frame]); res.push({ paused: a[1], moved: Math.round(c[0] - a[0]), pausedAfter: c[1] });
    if (a[1] || c[1] || Math.abs(c[0] - a[0]) < 5) fail++;
  }
  R[mode] = { res, errs }; if (errs.length) fail++; await ctx.close();
}
R.fail = fail; console.log(JSON.stringify(R)); await b.close(); process.exit(fail ? 1 : 0);
