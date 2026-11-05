import { chromium } from 'playwright'; import fs from 'fs';
// Shrine Cave: loads via ?lvl=shrine, zones/tiers screenshots, flush props, enemy AI acts, water, lever->gate->chest, portal, boss (all attacks) -> Victory ch2 -> Transit
const D = 'audit/v13/shrine'; fs.mkdirSync(D, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text()); });
await p.goto((process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=shrine'); await p.waitForFunction(() => window.__lvl?.scene?.key === 'Shrine' && window.__lvl.player, null, { timeout: 60000, polling: 250 }); await p.waitForTimeout(600);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; const L = window.__lvl; L.player.hp = 1e9; L.player.damage = () => false; });
const R = {}; const tp = (x, y, n = 40) => p.evaluate(([x, y, n]) => { const L = window.__lvl; L.player.body.reset(x, y); L.player.body.setVelocity(0, 0); window.__step(n); }, [x, y, n]);
const shots = [['01_moss_gate_lower', 300, 470], ['02_moss_mid_arc', 640, 330], ['03_shrine_upper', 990, 320], ['04_falls_lower', 1400, 470], ['05_falls_upper', 1780, 310], ['06_terraces_mid', 2540, 385], ['07_terraces_upper', 2780, 325], ['08_crystal_lower', 3600, 470], ['09_crystal_upper', 3700, 315]];
for (const [n, x, y] of shots) { await tp(x, y, 50); await p.screenshot({ path: `${D}/${n}.png` }); }
R.zones = await p.evaluate(() => window.__lvl.dbg.zones);
// flush: every prop's foot row sits on a surface (sampled from manifest)
R.flush = await p.evaluate(() => { const L = window.__lvl; let bad = []; L.children.list.filter(o => o.type === 'Image' && o.texture.key.startsWith('sh_') && !o.texture.key.startsWith('sh_fx') && o.originY === 1 && L.man[o.texture.key.slice(3)]).forEach(o => { const m = L.man[o.texture.key.slice(3)]; const foot = o.y - (m.h - 1 - m.foot) * o.scaleY; const g = L.groundAt(o.x, foot - 2); if (g < 0 || Math.abs(g - foot) > 1.5) bad.push(o.texture.key + '@' + Math.round(o.x)); }); return bad; });
// AI: put Sakura near each enemy class and check it acts (moves toward / shoots / zaps)
R.ai = await p.evaluate(() => { const L = window.__lvl, P = L.player, out = {}; for (const C of ['jelly', 'orb', 'crab', 'mech']) { const e = L.enemies.find(e => (e.texture?.key || '').startsWith('nk_sh' + C) && !e.dead && e.kind !== 'boss'); if (!e) { out[C] = 'missing'; continue; }
  const x0 = e.x, s0 = (e.shots || 0) + (e.zaps || 0); P.body.reset(e.x + 70, e.y - 4); window.__step(240); out[C] = { moved: Math.round(Math.abs(e.x - x0)), fired: ((e.shots || 0) + (e.zaps || 0)) - s0, faces: Math.sign(P.x - e.x) === e.faceDir }; } return out; });
await tp(610, 470, 30); R.water = await p.evaluate(() => { window.__step(20); return window.__lvl.dbg.water; }); await p.screenshot({ path: `${D}/10_water.png` });
await tp(2560, 470, 30); R.gateBlocks = await p.evaluate(() => window.__lvl.chestOpen === false);
await tp(2760, 330, 30); await tp(2560, 470, 60); R.lever = await p.evaluate(() => ({ on: window.__lvl.leverOn, chest: window.__lvl.chestOpen })); await p.screenshot({ path: `${D}/11_chest.png` });
await tp(3720, 318, 20); R.portal = await p.evaluate(() => ({ n: window.__lvl.dbg.portal, x: Math.round(window.__lvl.player.x) })); await p.screenshot({ path: `${D}/12_portal.png` });
await p.evaluate(() => { window.__lvl.enemies.filter(e => e.kind !== 'boss').forEach(e => { e.dead = true; e.destroy(); }); });
await tp(4330, 470, 30); R.arena = await p.evaluate(() => window.__lvl.arena); await p.evaluate(() => window.__step(120)); await p.screenshot({ path: `${D}/13_boss_intro.png` });
for (let i = 0; i < 24; i++) { await p.evaluate(() => window.__step(30)); if (i === 8) await p.screenshot({ path: `${D}/14_boss_fight.png` }); }
await p.evaluate(() => { const B = window.__lvl.boss; B.hit(B.maxHp / 2 + 1, 1); window.__step(30); }); for (let i = 0; i < 30; i++) { await p.evaluate(() => window.__step(30)); if (i === 6) await p.screenshot({ path: `${D}/15_boss_phase2.png` }); }
R.boss = await p.evaluate(() => ({ ...window.__lvl.boss.dbg, awake: window.__lvl.boss.awake, hp: window.__lvl.boss.hp }));
await p.evaluate(() => { const B = window.__lvl.boss; B.hit(999, 1); window.__step(400); }); R.won = await p.evaluate(() => window.__lvl.won);
await p.evaluate(() => { window.__step(300); }); R.victory = await p.evaluate(() => window.__victory?.ch);
await p.screenshot({ path: `${D}/16_victory.png` });
// level select: 3 cards, Shrine is chapter 2, Neo-Kyo chapter 3
await p.evaluate(() => window.__game.loop.wake()); await p.evaluate(() => window.__game.scene.getScenes(true).forEach(s => s.scene.start('LevelSelect'))); await p.waitForTimeout(1500);
R.ls = await p.evaluate(() => window.__ls.cards.map(c => c.list.filter(o => o.text).map(o => o.text).slice(0, 2).join(' '))); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400); await p.screenshot({ path: `${D}/17_levelselect.png` });
const ok = R.zones.length >= 4 && R.flush.length === 0 && Object.values(R.ai).every(a => a.fired > 0 || a.moved > 8) && R.water > 0 && R.gateBlocks && R.lever.on && R.lever.chest && R.portal.n > 0 && R.arena && R.boss.fan > 0 && R.boss.dive > 0 && R.boss.spiral > 0 && R.boss.summon > 0 && R.victory === 2 && R.ls.length >= 3 && /SHRINE/.test(R.ls[1]) && /NEO-KYO/.test(R.ls.join(" ")) && errs.length === 0;
console.log(JSON.stringify({ ...R, errs: errs.slice(0, 5) })); console.log(ok ? 'PASS' : 'FAIL'); await b.close(); process.exit(ok ? 0 : 1);
