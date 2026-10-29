import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 640, height: 360 } });
await p.goto(process.env.URL); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate(() => { const L = window.__lvl;
  return L.plats.filter(q => q.w >= 150).map(q => { const v = q.p.map((t, i) => [t, i]).filter(a => a[0] >= 0); const lo = v[0][0] > v[v.length - 1][0] ? v[0] : v[v.length - 1];
    const x = q.L + lo[1], s = q.T + lo[0]; let gy = s - 40; while (gy < s + 80 && !L.solid.getTileAtWorldXY(x, gy)?.collides) gy++; return { k: q.k, x, surf: s, ground: Math.floor(gy / 16) * 16, gap: Math.floor(gy / 16) * 16 - s }; }); })));
await b.close();
