// EXTRA module for r11.mjs: wall slide + wall jump
const p = globalThis.__p, out = globalThis.__out, shot = globalThis.__shot;
const w = await p.evaluate(() => { const L = window.__lvl, S = L.solid; // find an empty column next to >=4 stacked solid tiles, with open air in front
  for (let y = 4; y < S.layer.height - 6; y++) for (let x = 2; x < S.layer.width - 2; x++) { let ok = true; for (let k = 0; k < 7; k++) { const t = S.getTileAt(x + 1, y + k), a = S.getTileAt(x, y + k), a2 = S.getTileAt(x - 1, y + k); if (!t || !t.collides || (a && a.index >= 0) || (a2 && a2.index >= 0)) ok = false; } if (ok) return [x * 16 + 16 - 7, y * 16 + 40, x]; } return null; });
out.wall = { at: w };
if (w) {
  await p.evaluate(([x, y]) => { const pl = window.__lvl.player; pl.hp = 99; pl.iT = 1e9; pl.body.reset(x, y); pl.body.setVelocity(0, 200); window.__lvl.cameras.main.stopFollow(); window.__lvl.cameras.main.centerOn(x, y); }, w);
  await p.keyboard.down('ArrowRight'); const vys = [];
  for (let i = 0; i < 6; i++) { await shot('wall', i, 4); vys.push(await p.evaluate(() => { const pl = window.__lvl.player, b = pl.body; return [Math.round(b.velocity.y), pl.wallSliding, Math.round(pl.x), Math.round(pl.y), b.blocked.right, b.touching.right, pl.keys.right.isDown]; })); }
  out.wall.slide = vys; out.wall.slideT = await p.evaluate(() => +window.__lvl.player.dbg.wallSlideT.toFixed(2));
  const x0 = await p.evaluate(() => window.__lvl.player.x); await p.keyboard.press('Space'); await p.evaluate(() => window.__step(8));
  out.wall.jump = await p.evaluate(x0 => { const pl = window.__lvl.player; return { wj: pl.dbg.wallJumps, dx: Math.round(pl.x - x0), vy: Math.round(pl.body.velocity.y) }; }, x0);
  await shot('wall', 9, 2); await p.keyboard.up('ArrowRight');
}
