// Round 11: combo, beam, pickups, enemies, boss attacks, waterfalls, torii, sfx. Deterministic stepping; frames -> audit/v11/f
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(process.env.URL || 'http://127.0.0.1:4180/sakura-plus/'); await p.waitForTimeout(2500);
await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
await p.evaluate(() => { window.__intro?.finish?.(); });
await p.waitForTimeout(800);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = (n) => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; window.__lvl.player.hp = 1e9; });
const only = (process.env.ONLY || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k);
const shot = async (name, i, n) => { await p.evaluate(n => window.__step(n), n); await p.screenshot({ path: `audit/v11/f/${name}_${String(i).padStart(3, '0')}.png` }); };
const put = (x, y) => p.evaluate(([x, y]) => { const pl = window.__lvl.player; pl.setPosition(x, y); pl.body.reset(x, y); }, [x, y]);
const sp = await p.evaluate(() => [window.__lvl.spawn.x, window.__lvl.spawn.y]);
const out = { sfx: await p.evaluate(() => ['blaster1', 'blaster2', 'blaster3', 'dash', 'jet', 'beam', 'eshot', 'falls'].filter(k => window.__audio.buf[k]).length) };
if (want('combo')) {
  await put(sp[0], sp[1]); await p.evaluate(() => { const pl = window.__lvl.player; pl.facing = 1; window.__step(30); pl.dbg.combo = ''; });
  let n = 0; for (let r = 0; r < 4; r++) { await p.keyboard.down('j'); await p.evaluate(() => window.__step(2)); await p.keyboard.up('j'); for (let i = 0; i < 5; i++) await shot('combo', n++, 2); out['t'+r] = await p.evaluate(() => window.__lvl.player.dbg.combo); }
  await p.evaluate(() => window.__step(60)); out.pre = await p.evaluate(() => { const pl = window.__lvl.player; return [pl.gun.cd, pl.beam?.firing, pl.st, pl.hp, pl.body.blocked.down, pl.dashT, pl.hurtT]; }); await p.keyboard.down("j"); await p.evaluate(() => window.__step(2)); await p.keyboard.up("j"); await p.evaluate(() => window.__step(4));
  out.combo = await p.evaluate(() => window.__lvl.player.dbg.combo);
}
if (want('beam')) {
  await put(sp[0], sp[1]); await p.evaluate(() => { const pl = window.__lvl.player; pl.facing = 1; pl.setFlipX(false); window.__step(30); });
  let n = 0; await p.keyboard.down('j'); for (let i = 0; i < 24; i++) await shot('beam', n++, 4); await p.keyboard.up('j');
  for (let i = 0; i < 26; i++) await shot('beam', n++, 2); out.beam = await p.evaluate(() => [window.__lvl.player.beam.fired, window.__lvl.player.beam.hits]);
}
if (want('pk')) {
  out.pkList = await p.evaluate(() => window.__lvl.pk.list.map(i => [i.kind, Math.round(i.x), Math.round(i.base), Math.round(window.__lvl.groundAt(i.x, i.base - 20))]));
  let n = 0; for (const [k, x, y] of out.pkList.slice(0, 3)) { await p.evaluate(([x, y]) => { const pl = window.__lvl.player; pl.hp = 2; window.__lvl.hud.setHp(2); pl.setPosition(x - 30, y - 2); pl.body.reset(x - 30, y - 2); }, [x, y]);
    await p.keyboard.down('ArrowRight'); for (let i = 0; i < 6; i++) await shot('pk', n++, 4); await p.keyboard.up('ArrowRight'); }
  out.pkGot = await p.evaluate(() => [window.__lvl.pk.got, window.__lvl.player.hp, window.__lvl.rapT > 0 || window.__lvl.powT > 0]);
  await p.evaluate(() => { window.__lvl.player.hp = 1e9; const e = window.__lvl.enemies.find(e => e.kind === 'bot' && !e.dead); window.__lvl.kills = 3; e.hit(99, 1); window.__step(80); });
  out.drop = await p.evaluate(() => { const d = window.__lvl.pk.list.at(-1); return [window.__lvl.pk.dropN, Math.round(d.y), Math.round(window.__lvl.groundAt(d.x, d.y - 20))]; });
}
if (want('boss')) {
  await p.evaluate(() => { const L = window.__lvl, B = L.boss, pl = L.player; pl.hp = 1e9; B.awake = true; pl.body.reset(B.x - 110, B.y + 40); L.cameras.main.stopFollow(); L.cameras.main.centerOn(B.x - 40, B.y + 10); window.__step(5); });
  out.bossAtk = []; let n = 0;
  for (const k of ['spread', 'wave', 'laser', 'homing', 'ring', 'rain']) {
    await p.evaluate(k => { const L = window.__lvl, B = L.boss, pl = L.player; pl.iT = 0; B.hp = 5; B.setPosition(B.cx, B.gy); B.b.setVelocity(0, 0); B.next = k; B.st = 'tele'; B.stT = 0.6; B.windup(k, pl.x, pl.y - 18, 0.6); window.__h0 = pl.dbgHits; }, k);
    for (let i = 0; i < 12; i++) await shot('boss_' + k, n++, 6);
    out.bossAtk.push([k, await p.evaluate(() => [window.__lvl.player.dbgHits - window.__h0, window.__lvl.egun.shots.getChildren().filter(s => s.active).length])]);
    await p.evaluate(() => { for (const s of window.__lvl.egun.shots.getChildren()) window.__lvl.egun.kill(s); window.__step(30); });
  }
}
if (want('dmg')) { out.dmg = {};
  // beam vs a real enemy placed 80px in front
  const e0 = await p.evaluate(() => { const L = window.__lvl, e = L.enemies.find(e => e.kind !== 'boss' && !e.dead && e.kind !== 'drone'), pl = L.player; pl.hp = 1e9; pl.iT = 99; e.b.setVelocity(0,0); pl.body.reset(e.x - 90, e.y); pl.facing = 1; window.__step(20); pl.body.reset(e.x - 90, e.y); window.__e = e; return [e.kind, e.hp]; });
  await p.keyboard.down('j'); await p.evaluate(() => window.__step(90)); await p.keyboard.up('j'); await p.evaluate(() => window.__step(30));
  out.dmg.beam = [e0, await p.evaluate(() => [window.__e.hp, window.__e.dead, window.__lvl.player.beam.hits])];
  for (const k of ['homing', 'rain']) {
    out.dmg[k] = await p.evaluate(k => { const L = window.__lvl, B = L.boss, pl = L.player; for (const s of L.egun.shots.getChildren()) L.egun.kill(s); pl.hp = 1e9; pl.iT = 0; B.awake = true; B.hp = 5; B.setPosition(B.cx, B.gy); B.b.setVelocity(0,0);
      pl.body.reset(B.x - (k === 'rain' ? 110 : 170), B.gy); L.cameras.main.stopFollow(); L.cameras.main.centerOn(B.x - 40, B.y + 10); window.__step(40); pl.body.setVelocity(0, 0);
      const h0 = pl.dbgHits, p0 = [Math.round(pl.x), Math.round(pl.y)], src = []; const od = pl.damage.bind(pl); pl.damage = (x) => { src.push([Math.round(x), Math.round(B.x), L.egun.shots.getChildren().filter(s => s.active && Math.abs(s.x - x) < 1).map(s => s.texture.key)]); if (!src[src.length - 1][2].includes(k === 'rain' ? 'eneedle' : 'eplasma')) return false; return od(x); }; B.next = k; B.st = 'tele'; B.stT = 0.6; B.windup(k, pl.x, pl.y - 18, 0.6); let first = -1;
      for (let i = 0; i < 260 && first < 0; i++) { pl.body.setVelocityX(0); window.__step(1); if (pl.dbgHits > h0) first = i; } pl.damage = od; return { firstHitStep: first, p0, px: Math.round(pl.x), bx: Math.round(B.x), by: Math.round(B.y), src: src.slice(-2) }; }, k);
  }
}
if (want('wf')) { out.fallPos = await p.evaluate(() => window.__lvl.fallPos);
  let n = 0; for (const [x, y0, y1] of out.fallPos) { await p.evaluate(([x, y]) => { const L = window.__lvl, pl = L.player; pl.hp = 1e9; pl.iT = 99; pl.body.reset(x - 60, y); L.cameras.main.stopFollow(); L.cameras.main.centerOn(x, y); }, [x, (y0 + y1) / 2]); await shot('wf', n++, 3); }
  out.behind = []; for (const r of await p.evaluate(() => window.__lvl.wfRects.filter(r => r.behind))) {
    out.behind.push(await p.evaluate(r => { const L = window.__lvl, pl = L.player; pl.body.reset(r.x + r.w / 2, r.y + r.h - 20); L.cameras.main.startFollow(pl); window.__step(30); return [Math.round(pl.x), L.behindNow, +L.fallVol.toFixed(2), L.sil.visible]; }, r)); await shot('wfbehind', n++, 1); }
  out.vol = []; const r0 = out.fallPos[0]; for (const dx of [0, 150, 300, 500]) out.vol.push(await p.evaluate(([x, y]) => { const L = window.__lvl, pl = L.player; pl.body.reset(x, y); window.__step(4); return [Math.round(L.fallVol * 100) / 100, !!window.__audio.loops.falls]; }, [r0[0] + 40 + dx, r0[2] - 20]));
}
if (want('en')) { out.en = {}; let n = 0;
  for (const k of ['wasp', 'sentry', 'trooper']) {
    const info = await p.evaluate(k => { const L = window.__lvl, es = L.enemies.filter(e => e.kind === k), e = es[0], pl = L.player; pl.hp = 99; pl.iT = 0; const dx = k === 'wasp' ? 30 : -110;
      const gx = e.x + dx, g = L.groundAt(gx, e.y - 60); pl.body.reset(gx, (g > 0 ? g : e.y) - 2); L.cameras.main.stopFollow(); L.cameras.main.centerOn(e.x - 40, e.y - 20); window.__h0 = pl.dbgHits; return { count: es.length, at: [Math.round(e.x), Math.round(e.y)] }; }, k);
    for (let i = 0; i < 14; i++) { await p.evaluate(() => { window.__lvl.player.body.setVelocityX(0); }); await shot('en_' + k, n++, 10); }
    out.en[k] = { ...info, ...(await p.evaluate(k => { const L = window.__lvl, e = L.enemies.find(e => e.kind === k), pl = L.player; const r = { hits: pl.dbgHits - window.__h0, dropped: e.dropped, shots: e.shots, fd: e.faceDir, hp: e.hp, dead: e.dead };
      if (k === 'trooper') { const h = e.hp; e.hit(1, -e.faceDir); r.frontBlocked = e.blocked; r.hpAfterFront = e.hp; e.hitT = 0; e.hit(1, e.faceDir); r.hpAfterBack = e.hp; e.hit(1, -e.faceDir, true); r.hpAfterBeam = e.hp; e.hit(2, -e.faceDir); r.hpAfterLance = e.hp; r.h0 = h; }
      return r; }, k)) };
  }
}
globalThis.__p = p; globalThis.__out = out; globalThis.__shot = shot; globalThis.__put = put; globalThis.__sp = sp; globalThis.__want = want;
const extra = process.env.EXTRA; if (extra) await import(extra);
out.errs = errs; console.log(JSON.stringify(out)); await b.close();
