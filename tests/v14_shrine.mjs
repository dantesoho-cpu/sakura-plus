import { chromium } from 'playwright'; import fs from 'fs';
// v14 Shrine Cave: 5 tiers x 6 zones screenshots, landing on every tier, flush props, ramps, bubble lifts, swimming, currents, the current loop,
// both lever vaults, both secret alcoves, portal, enemy AI, boss (all attacks, imposing size) -> Victory ch2 -> level select
const D = 'audit/v14/shrine'; fs.mkdirSync(D, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text()); });
await p.goto((process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=shrine'); await p.waitForFunction(() => window.__lvl?.scene?.key === 'Shrine' && window.__lvl.player && window.__lvl.dbg?.tiers?.length, null, { timeout: 60000, polling: 250 }); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; const L = window.__lvl; L.player.hp = 1e9; L.player.damage = () => false; });
const R = {}; const tp = (x, y, n = 40, vx = 0) => p.evaluate(([x, y, n, vx]) => { const L = window.__lvl; L.player.body.reset(x, y); L.player.body.setVelocity(vx, 0); window.__step(n); }, [x, y, n, vx]);
const st = () => p.evaluate(() => { const L = window.__lvl, P = L.player; return { x: Math.round(P.x), y: Math.round(P.y), down: P.body.blocked.down, dbg: L.dbg }; });
const T1 = 1180, T2 = 1000, T3 = 830, T4 = 660, T5 = 490;
const shots = [['01_moss_T1', 600, T1], ['02_moss_T2', 400, T2], ['03_moss_T3', 1100, T3], ['04_moss_T4', 1800, T4], ['05_moss_T5', 1450, T5],
  ['06_falls_T1_pools', 2620, T1], ['07_falls_T2', 2700, T2], ['08_falls_T3', 2560, T3], ['09_falls_T4', 2900, T4], ['10_falls_T5', 2560, T5],
  ['11_terraces_T1', 4400, T1], ['12_terraces_T2', 4650, T2], ['13_terraces_T3_ramp', 4800, T3 - 30], ['14_terraces_T4', 5150, T4], ['15_terraces_T5', 5400, T5],
  ['16_sunken_deep', 6100, T1], ['17_sunken_T4', 6600, T4], ['18_sunken_T5', 6800, T5], ['19_crystal_T1', 8200, T1], ['20_crystal_T2', 7800, T2], ['21_crystal_T3', 8200, T3], ['22_crystal_T4', 8300, T4], ['22b_hollow_T1', 8700, T1]];
R.land = []; for (const [n, x, y] of shots) { await tp(x, y - 6, 50); const s = await st(); if (!n.includes('deep') && !n.includes('pools') && (s.y - y < -1 || s.y - y > 8 || !s.down)) R.land.push(`${n}:${s.y}`); await p.screenshot({ path: `${D}/${n}.png` }); }
console.log(JSON.stringify(R.land), await p.evaluate(() => window.__lvl.scene.key + JSON.stringify(window.__lvl.dbg)));
R.zones = await p.evaluate(() => window.__lvl.dbg.zones); R.tiers = await p.evaluate(() => [...window.__lvl.dbg.tiers].sort());
R.flush = await p.evaluate(() => { const L = window.__lvl; let bad = []; L.children.list.filter(o => o.type === 'Image' && o.texture.key.startsWith('sh_') && !o.texture.key.startsWith('sh_fx') && !/x_gate2|p_left/.test(o.texture.key) && o.originY === 1 && L.man[o.texture.key.slice(3)]).forEach(o => { const m = L.man[o.texture.key.slice(3)]; const foot = o.y - (m.h - 1 - m.foot) * o.scaleY; const g = L.groundAt(o.x, foot - 2); if (g < 0 || Math.abs(g - foot) > 1.5) bad.push(o.texture.key + '@' + Math.round(o.x)); }); return bad; });
// ramp: walk right up the sheet ramp onto the raised shelf
await tp(1300, T2 - 4, 20); await p.keyboard.down('ArrowRight'); for (let i = 0; i < 12; i++) await p.evaluate(() => window.__step(6)); await p.keyboard.up('ArrowRight'); await p.evaluate(() => window.__step(10));
{ const s = await st(); R.ramp = { x: s.x, y: s.y, n: s.dbg.ramp }; } await p.screenshot({ path: `${D}/23_ramp.png` });
// bubble lift in the Falls shaft: floor -> canopy
await tp(2250, T1 - 2, 140); { const s = await st(); R.lift = { y: s.y, n: s.dbg.lift, hit: await p.evaluate(() => window.__lvl.groundAt(2250, 440)) }; } await p.screenshot({ path: `${D}/24_lift.png` });
// swim stroke + current + loop
await tp(6000, 1100, 5); await p.evaluate(() => { window.__lvl.player.jumpPressed = true; window.__step(1); }); { const s = await p.evaluate(() => ({ vy: window.__lvl.player.body.velocity.y, n: window.__lvl.dbg.swim })); R.swim = s; }
await tp(5850, 1160, 5); await p.evaluate(() => window.__step(50)); { const s = await st(); R.current = { dx: s.x - 5850, n: s.dbg.current }; } await p.screenshot({ path: `${D}/25_current.png` });
await tp(6440, 1166, 2, 160); for (let i = 0; i < 6; i++) { await p.evaluate(() => window.__step(6)); if (i === 4) await p.screenshot({ path: `${D}/26_loop.png` }); } await p.evaluate(() => window.__step(60)); { const s = await st(); R.loop = { n: s.dbg.loop, x: s.x }; }
// lever vaults
R.vaults = [];
for (const [lx, ly] of [[2640, T5], [6200, T1]]) { const i = R.vaults.length; const v = await p.evaluate(i => { const v = window.__lvl.vaults[i]; return { cx: v.chest.x, sy: v.sy }; }, i);
  await tp(v.cx, v.sy - 4, 30); const before = await p.evaluate(i => window.__lvl.vaults[i].open, i); await tp(lx, ly - 4, 30); await tp(v.cx, v.sy - 4, 40); await p.screenshot({ path: `${D}/${27 + i}_vault${i}.png` });
  R.vaults.push({ before, ...(await p.evaluate(i => ({ on: window.__lvl.vaults[i].on, open: window.__lvl.vaults[i].open }), i)) }); }
// secret alcoves: the false wall fades and the chest opens
R.secrets = []; for (let i = 0; i < 2; i++) { const s = await p.evaluate(i => { const s = window.__lvl.secrets[i]; return { ex: s.ex, cx: s.chest.x, sy: s.sy }; }, i); await tp(s.ex + (i ? -20 : 20), s.sy - 4, 30); await p.screenshot({ path: `${D}/${29 + i}_secret${i}.png` });
  await tp(s.cx, s.sy - 4, 30); R.secrets.push(await p.evaluate(i => ({ found: window.__lvl.secrets[i].found, open: window.__lvl.secrets[i].open }), i)); }
R.ai = await p.evaluate(() => { const L = window.__lvl, P = L.player, out = {}; for (const C of ['jelly', 'orb', 'crab', 'mech']) { const e = L.enemies.find(e => (e.texture?.key || '').startsWith('nk_sh' + C) && !e.dead && e.kind !== 'boss'); if (!e) { out[C] = 'missing'; continue; }
  const x0 = e.x, s0 = (e.shots || 0) + (e.zaps || 0); P.body.reset(e.x + 70, e.y - 4); window.__step(240); out[C] = { moved: Math.round(Math.abs(e.x - x0)), fired: ((e.shots || 0) + (e.zaps || 0)) - s0 }; } return out; });
await tp(2620, T1 + 20, 30); R.water = await p.evaluate(() => window.__lvl.dbg.water);
await tp(8450, T4 - 4, 20); R.portal = await p.evaluate(() => ({ n: window.__lvl.dbg.portal, x: Math.round(window.__lvl.player.x) })); await p.screenshot({ path: `${D}/31_portal.png` });
await p.evaluate(() => { window.__lvl.enemies.filter(e => e.kind !== 'boss').forEach(e => { e.dead = true; e.destroy(); }); });
await tp(8930, T1 - 4, 30); R.arena = await p.evaluate(() => window.__lvl.arena); await p.evaluate(() => window.__step(120)); await p.screenshot({ path: `${D}/32_boss_intro.png` });
R.bossSize = await p.evaluate(() => [Math.round(window.__lvl.boss.displayWidth), Math.round(window.__lvl.boss.displayHeight)]);
for (let i = 0; i < 24; i++) { await p.evaluate(() => window.__step(30)); R.bossSize = [Math.max(R.bossSize[0], await p.evaluate(() => Math.round(window.__lvl.boss.displayWidth))), R.bossSize[1]]; if (i === 8) await p.screenshot({ path: `${D}/33_boss_fight.png` }); }
await p.evaluate(() => { const B = window.__lvl.boss; B.hit(B.maxHp / 2 + 1, 1); window.__step(30); }); for (let i = 0; i < 30; i++) { await p.evaluate(() => window.__step(30)); if (i === 6) await p.screenshot({ path: `${D}/34_boss_phase2.png` }); }
R.boss = await p.evaluate(() => ({ ...window.__lvl.boss.dbg, awake: window.__lvl.boss.awake }));
await p.evaluate(() => { const B = window.__lvl.boss; B.hit(999, 1); window.__step(400); }); R.won = await p.evaluate(() => window.__lvl.won);
for (let i = 0; i < 20 && !(await p.evaluate(() => window.__victory?.ch)); i++) await p.evaluate(() => window.__step(60)); R.victory = await p.evaluate(() => window.__victory?.ch);
await p.screenshot({ path: `${D}/35_victory.png` });
await p.evaluate(() => window.__game.loop.wake()); await p.evaluate(() => window.__game.scene.getScenes(true).forEach(s => s.scene.start('LevelSelect'))); await p.waitForTimeout(1500);
R.ls = await p.evaluate(() => window.__ls.cards.map(c => c.list.filter(o => o.text).map(o => o.text).slice(0, 2).join(' ')));
const ok = R.land.length === 0 && R.zones.length >= 6 && R.tiers.length === 5 && R.flush.length === 0 && R.ramp.n > 0 && R.ramp.y < T2 - 20 && R.lift.y < 700 && R.lift.n > 0 && R.swim.n > 0 && R.swim.vy < 0 && R.current.dx > 60 && R.loop.n > 0 && R.loop.x > 6600
  && R.vaults.every(v => v.before === false && v.on && v.open) && R.secrets.every(s => s.found && s.open) && Object.values(R.ai).every(a => a.fired > 0 || a.moved > 8) && R.water > 0 && R.portal.n > 0 && R.arena && R.bossSize[0] >= 250
  && R.boss.fan > 0 && R.boss.dive > 0 && R.boss.spiral > 0 && R.boss.summon > 0 && R.victory === 2 && R.ls.length >= 3 && /SHRINE/.test(R.ls[1]) && /FORTRESS|AIR/.test(R.ls.join(' ')) && errs.length === 0;
console.log(JSON.stringify({ ...R, errs: errs.slice(0, 5) })); console.log(ok ? 'PASS' : 'FAIL'); await b.close(); process.exit(ok ? 0 : 1);
