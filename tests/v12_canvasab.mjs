// Canvas A/B: hides one category of display objects at a time in Level1 under 4x throttle and measures fps (diagnostic).
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/'; const L = process.env.L || 'Level1';
const b = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] }); const out = {};
for (const cat of ['none', 'add', 'gfx', 'particles', 'tilesprite', 'sf<1']) {
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); await p.goto(URL); await p.waitForTimeout(2500);
  await p.evaluate(L => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(L); }, L); await p.waitForTimeout(3000);
  const n = await p.evaluate(cat => { const P = Phaser.GameObjects; let n = 0; for (const o of window.__lvl.children.list) { const hit = cat === 'add' ? o.blendMode === 1 : cat === 'gfx' ? o instanceof P.Graphics : cat === 'particles' ? o instanceof P.Particles.ParticleEmitter : cat === 'tilesprite' ? o instanceof P.TileSprite : cat === 'sf<1' ? (o.scrollFactorX < 1 && o.scrollFactorX > 0) : false; if (hit) { o.setAlpha ? o.setAlpha(0) : 0; o.visible = false; n++; } } return n; }, cat);
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.evaluate(() => { window.__ft = []; let l = performance.now(); const f = t => { window.__ft.push(t - l); l = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await p.keyboard.down('ArrowRight'); const t0 = Date.now(); while (Date.now() - t0 < 8000) { await p.keyboard.press('Shift'); await p.waitForTimeout(700); await p.keyboard.press('Space'); await p.waitForTimeout(500); } await p.keyboard.up('ArrowRight');
  out[cat] = await p.evaluate(n => { const a = window.__ft.slice(10); return { n, fps: +(1000 / (a.reduce((s, x) => s + x, 0) / a.length)).toFixed(1), over20: a.filter(x => x > 20).length }; }, n); await p.close();
}
console.log(JSON.stringify(out)); await b.close();
