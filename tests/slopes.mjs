// Slope movement: run (real ArrowRight/Left input) across 45° and 22.5° hills; assert smooth traversal (no stalls), feet glued to the surface.
import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://127.0.0.1:5173/'); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
await p.evaluate(() => { const s = window.__lvl; s.enemies.forEach(e => e.destroy()); s.enemies = []; s.player.iT = 9999; });
const runs = [['45° hill', 78, 104, 'ArrowRight'], ['22.5° + 45° hill', 290, 318, 'ArrowRight'], ['22.5° hill leftward (up nN, down uU)', 189, 168, 'ArrowLeft'], ['45° up + 22.5° down leftward', 310, 288, 'ArrowLeft'], ['stepped 45s', 266, 290, 'ArrowRight']];
const res = [];
for (const [name, c0, c1, key] of runs) {
  await p.evaluate(c0 => { const s = window.__lvl, pl = s.player; const x = c0 * 16 + 8, y = 87 * 16; pl.setPosition(x, y); pl.body.reset(x, y); }, c0);
  await p.waitForTimeout(500); await p.keyboard.down(key);
  const tr = []; const t0 = Date.now();
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(50);
    const r = await p.evaluate(() => { const s = window.__lvl, pl = s.player, bd = pl.body; const sy = Math.min(s.surface(bd.left + 1, bd.bottom), s.surface(bd.right - 1, bd.bottom));
      return { x: Math.round(pl.x), feet: Math.round(bd.bottom), gap: Math.round(sy - bd.bottom), g: bd.blocked.down, vx: Math.round(bd.velocity.x), slope: s.onSlope, anim: pl.anims.currentAnim?.key }; });
    tr.push(r); if ((key === 'ArrowRight' && r.x > c1 * 16) || (key === 'ArrowLeft' && r.x < c1 * 16)) break; }
  await p.keyboard.up(key);
  const moving = tr.slice(4); const stalls = moving.filter(r => Math.abs(r.vx) < 100).length; const air = moving.filter(r => !r.g).length; const onSlope = tr.filter(r => r.slope).length;
  console.log(name, JSON.stringify(tr.slice(4).filter(r=>Math.abs(r.vx)<100||!r.g)));
  const reached = key === 'ArrowRight' ? tr.at(-1).x > c1 * 16 : tr.at(-1).x < c1 * 16;
  const ys = tr.map(r => r.feet); res.push({ name, reached, stalls, airborneSamples: air, slopeSamples: onSlope, climb: Math.max(...ys) - Math.min(...ys), maxGap: Math.max(...tr.map(r => Math.abs(r.gap))), ms: Date.now() - t0 });
  await p.screenshot({ path: `audit/slope_${res.length}.png` });
}
const pass = res.every(r => r.reached && r.stalls === 0 && r.airborneSamples <= 1 && r.slopeSamples > 3);
console.log(JSON.stringify(res, null, 1)); console.log('PASS', pass, errs); await b.close();
