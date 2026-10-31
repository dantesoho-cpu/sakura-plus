// Stable FPS bench: RUNS fresh browsers x (Level2, Level1), 4x CPU throttle, scripted top-speed run with dashes/jumps for SECS.
// Reports per-level MEDIAN (and min/max) of avg fps, p95 frame ms, and game.step busy ms/frame (CPU per frame, far less noisy than rAF).
// Env: URL, RUNS (5), SECS (8), GL=1 (WebGL via swiftshader; default = canvas fallback via --use-gl=angle), TAG.
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://127.0.0.1:4180/sakura-plus/', RUNS = +(process.env.RUNS || 5), SECS = +(process.env.SECS || 8), TAG = process.env.TAG || 'median';
const args = process.env.GL ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--use-gl=angle', '--enable-unsafe-swiftshader'];
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : +((s[s.length / 2 - 1] + s[s.length / 2]) / 2).toFixed(2); };
const all = { Level2: [], Level1: [] }; let renderer = '';
for (let r = 0; r < RUNS; r++) for (const L of ['Level2', 'Level1']) {
  const b = await chromium.launch({ args }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  await p.goto(URL); await p.waitForTimeout(2500);
  await p.evaluate(L => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(L); }, L); await p.waitForTimeout(3000);
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await p.waitForTimeout(500);
  await p.evaluate(() => { const g = window.__game; window.__ft = []; window.__bz = []; const st = g.loop.callback; g.loop.callback = (t, d) => { const a = performance.now(); st(t, d); window.__bz.push(performance.now() - a); };
    let l = performance.now(); const f = t => { window.__ft.push(t - l); l = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await p.keyboard.down('ArrowRight'); const t0 = Date.now();
  while (Date.now() - t0 < SECS * 1000) { await p.keyboard.press('Shift'); await p.waitForTimeout(700); await p.keyboard.press('Space'); await p.waitForTimeout(500); }
  await p.keyboard.up('ArrowRight');
  const m = await p.evaluate(() => { const a = window.__ft.slice(10).sort((x, y) => x - y), z = window.__bz.slice(10).sort((x, y) => x - y), n = a.length, avg = a.reduce((s, x) => s + x, 0) / n;
    return { fps: +(1000 / avg).toFixed(1), p95: +a[Math.floor(n * 0.95)].toFixed(1), busy: +z[Math.floor(z.length / 2)].toFixed(2), busyP95: +z[Math.floor(z.length * 0.95)].toFixed(2), r: window.__game.renderer.type === 2 ? 'webgl' : 'canvas' }; });
  renderer = m.r; all[L].push(m); await b.close();
}
const out = { TAG, URL, RUNS, SECS, renderer };
for (const L in all) { const a = all[L]; out[L] = { fpsMed: med(a.map(x => x.fps)), fpsMin: Math.min(...a.map(x => x.fps)), fpsMax: Math.max(...a.map(x => x.fps)), p95Med: med(a.map(x => x.p95)), busyMedMs: med(a.map(x => x.busy)), busyP95Med: med(a.map(x => x.busyP95)), headroomPct: Math.round((1 - med(a.map(x => x.busy)) / 16.67) * 100), runs: a.map(x => x.fps) }; }
console.log(JSON.stringify(out));
