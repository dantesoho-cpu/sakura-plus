import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 640, height: 360 } });
await p.goto(process.env.URL); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate(() => { const L = window.__lvl, F = [...L.falls, ...L.falls2.map(f => f.t)];
  // a fall only clashes if it pours THROUGH the piece's walk surface at its own columns (water behind a prop's arch, below the deck, is by design)
  const cross = (q, f) => { for (let c = Math.max(0, Math.floor(f.x - q.L)); c < Math.min(q.w, Math.ceil(f.x + f.width - q.L)); c++) { const t = q.p[c]; if (t >= 0 && f.y < q.T + t - 2 && f.y + f.height > q.T + t + 2) return true; } return false; };
  const q0 = L.plats.find(q => q.p.some(t => t >= 0)), c0 = q0.p.findIndex(t => t >= 0); const selfTest = cross(q0, { x: q0.L + c0, width: 4, y: q0.T - 50, height: 200 });
  return { selfTest, falls: F.length, overlaps: L.plats.filter(q => F.some(f => cross(q, f))).map(q => [q.k, q.L, q.T, F.filter(f => cross(q, f)).map(f => [f.x|0, f.y|0, f.width, f.height|0])]) }; })));
await b.close();
