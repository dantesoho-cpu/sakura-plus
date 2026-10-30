const p = globalThis.__p, out = globalThis.__out, shot = globalThis.__shot;
await p.evaluate(() => { const L = window.__lvl, pl = L.player; pl.body.reset(5800, 960); L.cameras.main.stopFollow(); L.cameras.main.centerOn(6056, 900); });
await shot('gate', 0, 30);
