// EXTRA: frame each ledge/ground hill for a visual check
const p = globalThis.__p, out = globalThis.__out, shot = globalThis.__shot;
const hs = await p.evaluate(() => window.__lvl.plats.filter(q => ['sp18','sp25','sp12'].includes(q.k)).map(q => [q.k, q.L + q.w / 2, q.T + 40]));
out.hills = hs; let i = 0;
for (const [k, x, y] of hs) { await p.evaluate(([x, y]) => { const L = window.__lvl, pl = L.player; pl.hp = 99; pl.iT = 1e9; pl.body.reset(x - 140, y - 60); L.cameras.main.stopFollow(); L.cameras.main.centerOn(x, y + 20); window.__step(20); }, [x, y]); await shot('hill_' + k + '_' + i++, 0, 1); }
