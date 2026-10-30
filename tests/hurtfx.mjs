const p = globalThis.__p, out = globalThis.__out, shot = globalThis.__shot;
await p.evaluate(() => { const L = window.__lvl, pl = L.player; pl.hp = 5; pl.iT = 0; pl.body.reset(1700, 1380); window.__step(30); L.cameras.main.stopFollow(); L.cameras.main.centerOn(1700, 1340); pl.damage(pl.x + 10); });
out.hfx = []; for (let i = 0; i < 10; i++) { await shot('hfx', i, 3); out.hfx.push(await p.evaluate(() => { const pl = window.__lvl.player; return [pl.sil, pl.alpha, +pl.iT.toFixed(2)]; })); }
await p.evaluate(() => window.__step(80)); out.hfxEnd = await p.evaluate(() => { const pl = window.__lvl.player; return [pl.sil, pl.isTinted, pl.iT <= 0]; });
