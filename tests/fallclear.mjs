import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 640, height: 360 } });
await p.goto(process.env.URL); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate(() => { const L = window.__lvl, F = [...L.falls, ...L.falls2.map(f => f.t)];
  return { falls: F.length, overlaps: L.plats.filter(q => F.some(f => q.L + q.w > f.x && q.L < f.x + f.width && q.T < f.y + f.height)).map(q => [q.k, q.L, q.T, F.filter(f => q.L + q.w > f.x && q.L < f.x + f.width).map(f => [f.x|0, f.y|0, f.width, f.height|0])]) }; })));
await b.close();
