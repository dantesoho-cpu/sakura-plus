import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = [];
p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto(process.env.URL); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = (n) => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; window.__lvl.player.hp = 1e9; });
const info = await p.evaluate(() => ({ n: window.__plats, kinds: new Set(window.__lvl.plats.map(q => q.k)).size, list: window.__lvl.plats.map(q => [q.k, q.L, q.T, q.w]) }));
// drop the player onto a sample of platforms (incl. ramps) and check she lands on the profile
const res = [];
for (const i of [...Array(info.n).keys()].filter(i => i % Math.max(1, Math.floor(info.n / 16)) === 0)) {
  const r = await p.evaluate((i) => { const L = window.__lvl, q = L.plats[i], pl = L.player; let c = Math.floor(q.w / 2); while (c < q.w && q.p[c] < 0) c++;
    const x = q.L + c, want = q.T + q.p[c]; pl.setPosition(x, want - 60); pl.body.reset(x, want - 60); window.__step(70);
    return { k: q.k, want, bottom: Math.round(pl.body.bottom), down: pl.body.blocked.down }; }, i); res.push(r); }
const ramp = info.list.findIndex(q => /sp(18|30|12)$/.test(q[0]));
if (process.env.SHOT) for (const [x, y, n] of JSON.parse(process.env.SHOT)) { await p.evaluate(([x, y, z]) => { const pl = window.__lvl.player; pl.setPosition(x, y); pl.body.reset(x, y); window.__lvl.cameras.main.setZoom(z); window.__step(40); }, [x, y, +(process.env.ZOOM || 1)]); await p.screenshot({ path: `audit/v8/f/${n}.png` }); }
console.log(JSON.stringify({ list: info.list, n: info.n, kinds: info.kinds, ok: res.filter(r => r.down && Math.abs(r.bottom - r.want) <= 3).length, of: res.length, res, errs }));
await b.close();
