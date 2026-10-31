// TV-browser proxy: 4x CPU throttle, 960x540, Sakura runs right at top speed with dashes for 12s in L2 and L1; reports frame-time stats.
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://127.0.0.1:4180/sakura-plus/'; const TAG = process.env.TAG || 'run';
const b = await chromium.launch({ args: process.env.GL ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--use-gl=angle', '--enable-unsafe-swiftshader'] }); const res = {};
for (const L of ['Level2', 'Level1']) {
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(2500);
  await p.evaluate(L => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(L); }, L); await p.waitForTimeout(3000);
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.evaluate(() => { window.__ft = []; let l = performance.now(); const f = t => { window.__ft.push(t - l); l = t; if (window.__ft.length < 100000) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await p.keyboard.down('ArrowRight'); const t0 = Date.now();
  while (Date.now() - t0 < 12000) { await p.keyboard.press('Shift'); await p.waitForTimeout(700); await p.keyboard.press('Space'); await p.waitForTimeout(500); }
  await p.keyboard.up('ArrowRight');
  const r = await p.evaluate(() => { const a = window.__ft.slice(10).sort((x, y) => x - y); const n = a.length, avg = a.reduce((s, x) => s + x, 0) / n; return { frames: n, avgFps: +(1000 / avg).toFixed(1), p95ms: +a[Math.floor(n * 0.95)].toFixed(1), p99ms: +a[Math.floor(n * 0.99)].toFixed(1), over20ms: a.filter(x => x > 20).length, objs: window.__lvl.children.list.length, renderer: window.__game.renderer.type === 2 ? 'webgl' : 'canvas', phaserFps: Math.round(window.__game.loop.actualFps), x: Math.round(window.__lvl.player.x) }; });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); r.errs = errs; res[L] = r; await p.close();
}
console.log(JSON.stringify({ TAG, res })); await b.close();
