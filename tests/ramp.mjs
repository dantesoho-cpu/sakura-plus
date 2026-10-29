import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = [];
p.on('pageerror', e => errs.push(String(e)));
await p.goto(process.env.URL); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = (n) => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; window.__lvl.player.hp = 1e9; });
const out = [];
for (const k of ['sp30', 'sp29', 'sp12', 'sp25']) {
  const s0 = await p.evaluate((k) => { const L = window.__lvl, q = L.plats.find(z => z.k === k); if (!q) return null; const pl = L.player;
    const lowLeft = q.p[4] > q.p[q.w - 5]; const sx = lowLeft ? q.L - 30 : q.L + q.w + 30; const gy = q.T - 20;
    pl.setPosition(sx, gy); pl.body.reset(sx, gy); window.__step(60); return { k, L: q.L, T: q.T, w: q.w, lowLeft, start: [Math.round(pl.x), Math.round(pl.body.bottom)] }; }, k);
  if (!s0) { out.push({ k, missing: true }); continue; }
  const key = s0.lowLeft ? 'ArrowRight' : 'ArrowLeft'; await p.keyboard.down(key); const tr = [];
  for (let i = 0; i < 12; i++) tr.push(await p.evaluate(() => { window.__step(6); const pl = window.__lvl.player; return [Math.round(pl.x), Math.round(pl.body.bottom), window.__lvl.onSlope]; }));
  await p.keyboard.up(key); out.push({ ...s0, tr }); }
console.log(JSON.stringify({ out, errs })); await b.close();
