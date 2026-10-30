// EXTRA for r11.mjs: enemy contact + shots hurt the player with invulnerability OFF
const p = globalThis.__p, out = globalThis.__out, shot = globalThis.__shot;
out.hurt = await p.evaluate(() => {
  const L = window.__lvl, pl = L.player, st = n => window.__step(n), R = {};
  const kinds = [...new Set(L.enemies.filter(e => e.active && !e.dead && e.kind !== 'boss').map(e => e.kind))];
  for (const k of kinds) { const e = L.enemies.find(z => z.kind === k && z.active && !z.dead); pl.hp = 5; pl.iT = 0; pl.hurtT = 0;
    pl.body.reset(e.x - 6, e.y - 4); pl.body.setVelocity(0, 0); const x0 = pl.x; st(2);
    const hp1 = pl.hp, it = +pl.iT.toFixed(2), vx = Math.round(pl.body.velocity.x); pl.body.reset(e.x - 6, e.y - 4); st(20); const hp2 = pl.hp; // inside i-frames: no second hit
    R[k] = { hit: 5 - hp1, iframes: it, kbVx: vx, awayFromEnemy: Math.sign(vx) === Math.sign(x0 - e.x) || vx === 0 ? Math.sign(vx) !== 0 : false, extraHitInIframes: hp1 - hp2 }; }
  // enemy shot: fire one straight at the player
  pl.hp = 5; pl.iT = 0; pl.body.reset(pl.x, pl.y); const s = L.egun.shots.getFirstDead ? L.egun.shots.getFirstDead(true, pl.x - 60, pl.y - 18) : null;
  if (s) { s.setActive(true).setVisible(true); s.body.enable = true; s.body.reset(pl.x - 60, pl.y - 18); s.body.setVelocity(400, 0); st(20); R.shot = { hit: 5 - pl.hp, shotKilled: !s.active }; } else R.shot = 'no pool api';
  // death at 0 HP -> full respawn
  pl.hp = 1; pl.iT = 0; const e = L.enemies.find(z => z.active && !z.dead && z.kind !== 'boss'); pl.body.reset(e.x - 6, e.y - 4); st(40);
  R.death = { hpAfter: pl.hp, deaths: L.deaths, atSpawn: Math.hypot(pl.x - L.spawn.x, pl.y - L.spawn.y) < 40 };
  return R; });
{ const h = out.hurt, ks = Object.keys(h).filter(k => k !== 'shot' && k !== 'death');
  out.hurtPass = ks.every(k => h[k].hit + h[k].extraHitInIframes === 1) && h.shot.hit === 1 && h.shot.shotKilled && h.death.deaths === 1 && h.death.hpAfter === 5; }
