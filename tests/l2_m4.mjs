import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto((process.env.URL || 'http://127.0.0.1:4180/sakura-plus/') + '?lvl=2'); await p.waitForTimeout(3500);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; });
const out = { n: await p.evaluate(() => window.__lvl.enemies.length) };
// settle: every walker drops onto its platform
await p.evaluate(() => { const L = window.__lvl; for (const e of L.enemies) e.b.enable = true; L.player.hp = 1e9; });
await p.evaluate(() => window.__step(5));
let k = 0;
for (const kind of ['drone', 'nksentry', 'assault', 'nkshield', 'heavy']) {
  const r = await p.evaluate(async kind => { const L = window.__lvl, e = L.enemies.find(e => e.kind === kind && !e.dead), pl = L.player; pl.hp = 1e9; pl.iT = 0;
    const side = kind === 'nkshield' || kind === 'assault' ? -1 : 1; pl.body.reset(e.x + side * 110, (kind === 'drone' ? L.groundAt(e.x + side * 110, e.y) : e.y) - 2); window.__step(10);
    const h0 = pl.dbgHits || 0; return { x: Math.round(e.x), side, h0 }; }, kind);
  for (let i = 0; i < 6; i++) { await p.evaluate(() => { window.__lvl.player.iT = 0; window.__step(25); }); await p.screenshot({ path: `audit/l2/06_${kind}_${i}.png` }); }
  Object.assign(r, await p.evaluate(kind => { const L = window.__lvl, e = L.enemies.find(e => e.kind === kind && !e.dead), pl = L.player; if (!e) return { gone: true };
    const g = kind === 'drone' ? null : L.groundAt(e.x, e.y - 8); const want = Math.sign(pl.x - e.x);
    return { shots: e.shots, faceOk: e.faceDir === want, flipOk: e.flipX === (want < 0), flush: g === null ? 'air' : Math.round(e.y - g), grounded: kind === 'drone' ? 'air' : e.b.blocked.down || e.b.touching.down, hits: (pl.dbgHits || 0) }; }, kind));
  r.killed = await p.evaluate(kind => { const L = window.__lvl, e = L.enemies.find(e => e.kind === kind && !e.dead); if (kind === 'nkshield') { const hp = e.hp; e.hit(1, -e.faceDir); var blk = e.hp === hp; } for (let i = 0; i < 20 && !e.dead; i++) e.hit(1, e.faceDir); window.__step(20); return [e.dead, blk]; }, kind);
  out[kind] = r;
}
out.flushAll = await p.evaluate(() => { const L = window.__lvl, r = []; for (const e of L.enemies.filter(e => e.kind !== 'drone' && !e.dead)) { L.player.body.reset(e.x - 160, L.groundAt(e.x - 160, e.y - 30) - 2); window.__step(40); r.push([e.kind, Math.round(e.x), Math.round(e.y - L.groundAt(e.x, e.y - 8)), e.b.blocked.down || e.b.touching.down]); } return r; });
// train/bg
await p.evaluate(() => { const L = window.__lvl; L.player.body.reset(1500, 290); window.__step(40); }); await p.screenshot({ path: 'audit/l2/06_train_bg_a.png' });
await p.evaluate(() => { const L = window.__lvl; L.player.body.reset(2950, 190); window.__step(60); }); await p.screenshot({ path: 'audit/l2/06_train_bg_b.png' });
out.train = await p.evaluate(() => [Math.round(window.__lvl.train.x), Math.round(window.__lvl.train.y)]);
out.errs = errs; console.log(JSON.stringify(out)); await b.close();
