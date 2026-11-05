import { chromium } from 'playwright'; import fs from 'fs';
// v15 Air Fortress: 5 tiers, zones, enemies AI, winged boss -> Victory ch4, level select card
const D = 'audit/v15/fort'; fs.mkdirSync(D, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.message || e)));
p.on('console', m => { if (m.type() === 'error' && !/favicon|404|AudioContext|Failed to load/.test(m.text())) errs.push(m.text()); });
const URL = (process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=fortress';
await p.goto(URL);
await p.waitForFunction(() => window.__fortress?.player && window.__lvl?.scene?.key === 'Fortress', null, { timeout: 90000, polling: 250 });
await p.waitForTimeout(1200);
await p.evaluate(() => {
  const g = window.__game; g.loop.sleep();
  window.__T = performance.now();
  window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } };
  const L = window.__lvl; L.player.hp = 1e9; L.player.damage = () => false;
});
const R = {};
const T1 = 760, T2 = 620, T3 = 480, T4 = 340, T5 = 200, AX0 = 6400;
const tp = (x, y, n = 40, vx = 0) => p.evaluate(([x, y, n, vx]) => {
  const L = window.__lvl; L.player.body.reset(x, y); L.player.body.setVelocity(vx, 0); window.__step(n);
}, [x, y, n, vx]);
const st = () => p.evaluate(() => {
  const L = window.__lvl, P = L.player;
  return { x: Math.round(P.x), y: Math.round(P.y), down: P.body.blocked.down, dbg: L.dbg, arena: L.arena };
});
const shots = [
  ['01_dock_T1', 400, T1], ['02_dock_T2', 800, T2], ['03_gantry_T3', 1600, T3],
  ['04_spires_T4', 2800, T4], ['05_hangar_T5', 3600, T5], ['06_bridge_T1', 5600, T1],
  ['07_mid_T2', 3200, T2], ['08_canopy_T5', 2400, T5],
];
R.land = [];
for (const [n, x, y] of shots) {
  await tp(x, y - 6, 55);
  const s = await st();
  if (s.y - y < -2 || s.y - y > 12 || !s.down) R.land.push(`${n}:y${s.y}`);
  await p.screenshot({ path: `${D}/${n}.png` });
}
R.pano = await p.evaluate(() => {
  const b = window.__lvl.bg;
  return { mode: b.mode, key: b.key, dw: Math.round(b.dw), dh: Math.round(b.dh), fx: +b.fx.toFixed(4), fy: +b.fy.toFixed(4), layers: (b.layers || []).length };
});
R.tiers = await p.evaluate(() => [...window.__lvl.dbg.tiers].sort((a,b)=>a-b));
// walk zones
for (const [x, y] of [[600, T1], [1800, T1], [3000, T2], [4200, T1], [5400, T1]]) {
  await tp(x, y - 4, 30);
}
R.zones = await p.evaluate(() => window.__lvl.dbg.zones);
// AI smoke
R.ai = await p.evaluate(() => {
  const L = window.__lvl, P = L.player, out = {};
  for (const C of ['drone', 'bot', 'avian']) {
    const e = L.enemies.find(e => !e.dead && e.kind === (C === 'avian' ? 'drone' : C) && e.texture?.key?.includes(C === 'avian' ? 'avian' : C === 'drone' ? 'drone' : 'human'));
    // looser match
  }
  for (const label of ['drone', 'orb', 'human', 'avian']) {
    const e = L.enemies.find(e => !e.dead && e.kind !== 'boss' && (e.texture?.key || '').includes(label));
    if (!e) { out[label] = 'missing'; continue; }
    const x0 = e.x, s0 = e.shots || 0;
    P.body.reset(e.x + 60, e.y - (e.originY === 1 ? 4 : 0));
    window.__step(200);
    out[label] = { moved: Math.round(Math.abs(e.x - x0)), fired: (e.shots || 0) - s0, kind: e.kind };
  }
  return out;
});
await p.screenshot({ path: `${D}/09_ai.png` });
// ring portal
await tp(AX0 - 200, T2 - 40, 20);
R.portal = await p.evaluate(() => ({ n: window.__lvl.dbg.portal, x: Math.round(window.__lvl.player.x) }));
await p.screenshot({ path: `${D}/10_portal.png` });
// clear non-boss, trigger arena
await p.evaluate(() => { window.__lvl.enemies.filter(e => e.kind !== 'boss').forEach(e => { try { e.dead = true; e.destroy(); } catch {} }); });
await tp(AX0 + 40, T1 - 4, 40);
R.arena = await p.evaluate(() => window.__lvl.arena);
await p.evaluate(() => window.__step(120));
await p.screenshot({ path: `${D}/11_boss_intro.png` });
R.bossSize = await p.evaluate(() => [Math.round(window.__lvl.boss.displayWidth), Math.round(window.__lvl.boss.displayHeight)]);
for (let i = 0; i < 28; i++) {
  await p.evaluate(() => window.__step(30));
  if (i === 10) await p.screenshot({ path: `${D}/12_boss_fight.png` });
}
await p.evaluate(() => { const B = window.__lvl.boss; B.hit(B.maxHp / 2 + 1, 1); window.__step(40); });
for (let i = 0; i < 24; i++) {
  await p.evaluate(() => window.__step(30));
  if (i === 8) await p.screenshot({ path: `${D}/13_boss_phase2.png` });
}
R.boss = await p.evaluate(() => ({ ...window.__lvl.boss.dbg, awake: window.__lvl.boss.awake, hp: window.__lvl.boss.hp }));
await p.evaluate(() => { const B = window.__lvl.boss; B.hp = 1; B.hit(99, 1); });
for (let i = 0; i < 40 && !(await p.evaluate(() => window.__lvl.won)); i++) await p.evaluate(() => window.__step(30));
R.won = await p.evaluate(() => window.__lvl.won);
R.bossDead = await p.evaluate(() => ({ dead: window.__lvl.boss?.dead, st: window.__lvl.boss?.st, hp: window.__lvl.boss?.hp }));
for (let i = 0; i < 30 && !(await p.evaluate(() => window.__victory?.ch)); i++) await p.evaluate(() => window.__step(60));
R.victory = await p.evaluate(() => window.__victory?.ch);
await p.screenshot({ path: `${D}/14_victory.png` });
await p.evaluate(() => { window.__game.loop.wake(); window.__game.scene.getScenes(true).forEach(s => s.scene.start('LevelSelect')); });
await p.waitForTimeout(1600);
await p.screenshot({ path: `${D}/15_level_select.png` });
R.ls = await p.evaluate(() => (window.__ls?.cards || []).map(c => c.list.filter(o => o.text).map(o => o.text).slice(0, 2).join(' ')));
const factorsOk = R.pano?.mode === 'pano' && R.pano?.key === 'ft_pano'
  && R.pano.layers === 0 && R.pano.dw > 480 && R.pano.dh >= 270
  && R.pano.fx > 0 && R.pano.fx < 1;
const aiOk = Object.values(R.ai).every(a => a !== 'missing' && (a.fired > 0 || a.moved > 4));
const ok = factorsOk && R.land.length === 0 && R.tiers.length >= 3 && R.zones.length >= 4
  && aiOk && R.portal.n > 0 && R.arena && R.bossSize[0] >= 200
  && R.boss.fan > 0 && R.boss.dive > 0 && (R.boss.rain > 0 || R.boss.beam > 0)
  && R.won && R.victory === 4 && R.ls.length === 4 && /FORTRESS|AIR/.test(R.ls.join(' '))
  && errs.length === 0;
console.log(JSON.stringify({ ...R, errs: errs.slice(0, 8) }, null, 0));
console.log(ok ? 'PASS' : 'FAIL');
await b.close(); process.exit(ok ? 0 : 1);
