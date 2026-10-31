import { chromium, devices } from 'playwright';
const URL = (process.env.URL || 'https://dantesoho-cpu.github.io/sakura-plus/') + '?lvl=2';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const R = {};
for (const mode of ['desktop', 'mobile']) {
  const ctx = await b.newContext(mode === 'mobile' ? { ...devices['iPhone 13 landscape'] } : { viewport: { width: 960, height: 540 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PE ' + e.message + ' @ ' + (e.stack || '').split('\n').slice(0, 4).join(' | '))); p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await p.goto(URL); await p.waitForTimeout(4000);
  const st = () => p.evaluate(() => { const L = window.__lvl, pl = L.player; return { x: Math.round(pl.x), y: Math.round(pl.y), frame: window.__game.loop.frame, alive: L.enemies.filter(e => !e.dead).length }; });
  const s0 = await st(); const log = [];
  // real-time play: run right shooting, dashing, jumping
  await p.keyboard.down('ArrowRight');
  for (let i = 0; i < 60; i++) { await p.keyboard.press('j'); if (i % 7 === 3) await p.keyboard.press('Shift'); if (i % 9 === 5) await p.keyboard.press('Space'); await p.waitForTimeout(120); if (i % 10 === 9) log.push(await st()); }
  await p.keyboard.up('ArrowRight');
  // kill nearest enemy directly via hit, then keep moving
  await p.evaluate(() => { const L = window.__lvl; const e = L.enemies.filter(e => !e.dead).sort((a, b) => Math.abs(a.x - L.player.x) - Math.abs(b.x - L.player.x))[0]; e && e.hit(999, 1); });
  await p.waitForTimeout(500); await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(800); await p.keyboard.up('ArrowLeft'); log.push(await st());
  await p.waitForTimeout(500); const s1 = await st(); await p.waitForTimeout(500); const s2 = await st();
  R[mode] = { s0, log, s1, s2, running: s2.frame > s1.frame, errs: [...new Set(errs)].slice(0, 8) }; await ctx.close();
}
console.log(JSON.stringify(R, null, 1)); await b.close();
