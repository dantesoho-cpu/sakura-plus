// EXTRA: hold X to charge in-game, capture frames around the player
const p = globalThis.__p, out = globalThis.__out, shot = globalThis.__shot;
await p.evaluate(() => { const L = window.__lvl, pl = L.player; pl.body.reset(1700, 1380); window.__step(40); });
await p.keyboard.down('X'); out.chargeAnims = [];
for (let i = 0; i < 16; i++) { await shot('chg', i, 5); out.chargeAnims.push(await p.evaluate(() => { const pl = window.__lvl.player; return pl.anims.currentAnim?.key + ':' + pl.anims.currentFrame?.index; })); }
await p.keyboard.up('X'); await shot('chg', 16, 3); await shot('chg', 17, 3);
out.pxy = await p.evaluate(() => { const L = window.__lvl, pl = L.player, c = L.cameras.main; return [Math.round((pl.x - c.worldView.x) * 2), Math.round((pl.y - c.worldView.y) * 2)]; });
