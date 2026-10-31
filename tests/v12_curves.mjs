import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); fs.mkdirSync('audit/v12/curves', { recursive: true });
await p.goto((process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=2'); await p.waitForFunction(() => window.__lvl && window.__lvl.tiers && window.__lvl.player && window.__game, null, { timeout: 60000, polling: 250 }); await p.waitForTimeout(800);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; const L = window.__lvl; L.player.hp = 1e9; });
const out = [];
const C = await p.evaluate(() => window.__lvl.tiers.curves.map(c => ({ k: c.k, x: c.x, y: c.y, w: c.w, top: c.top })));
for (const [i, c] of C.entries()) {
  if (c.k === 'overhang' || c.k === 'arch' || c.k === 'pipe') { const r = await p.evaluate(c => { const P = window.__lvl.player; const mx = c.x + Math.floor(c.w * 0.7); P.body.reset(mx, c.top[Math.floor(c.w * 0.7)] - 20); P.body.setVelocity(0, 0); window.__step(40); return { k: c.k, y: Math.round(P.y), want: c.top[Math.floor(c.w * 0.7)], down: P.body.blocked.down || P.body.touching.down }; }, c); r.ok = r.down && Math.abs(r.y - r.want) < 26; out.push(r); continue; }
  await p.evaluate(c => { const P = window.__lvl.player; P.body.reset(c.x - 30, 420); P.body.setVelocity(0, 0); window.__step(30); }, c);
  await p.keyboard.down('ArrowRight');
  const r = await p.evaluate(c => { const P = window.__lvl.player; let minY = 1e9, dev = 0, n = 0; for (let f = 0; f < 140; f++) { window.__step(1); const i = Math.round(P.x - c.x); if (i > 8 && i < c.w - 8 && c.top[i] > 0 && c.top[i] < 438 && (P.body.blocked.down || P.body.touching.down)) { dev = Math.max(dev, Math.abs(P.body.bottom - c.top[i])); n++; } minY = Math.min(minY, P.body.bottom); if (f === 50) window.__shot = 1; } return { k: c.k, minY: Math.round(minY), dev: Math.round(dev), onCurve: n }; }, c);
  await p.keyboard.up('ArrowRight');
  // screenshot: place player mid-piece on surface
  await p.evaluate(c => { const P = window.__lvl.player; const i = Math.floor(c.w * 0.45); P.body.reset(c.x + i, (c.top[i] > 0 ? c.top[i] : 430) - 4); P.body.setVelocity(0, 0); window.__step(20); }, c);
  await p.screenshot({ path: `audit/v12/curves/${i}_${c.k}.png` });
  r.ok = r.onCurve > 10 && r.dev < 16 && r.minY < 400; out.push(r);
}
const ok = out.every(r => r.ok) && errs.length === 0;
console.log(JSON.stringify({ out, errs })); console.log(ok ? 'PASS' : 'FAIL'); await b.close(); process.exit(ok ? 0 : 1);
