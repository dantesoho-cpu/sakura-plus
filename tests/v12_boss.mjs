import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); fs.mkdirSync('audit/v12/boss', { recursive: true });
await p.goto((process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=2'); await p.waitForFunction(() => !!(window.__lvl && window.__lvl.boss && window.__lvl.player && window.__game), null, { timeout: 60000, polling: 250 }); await p.waitForTimeout(800);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; const L = window.__lvl; L.player.hp = 1e9; L.player.damage = () => false; });
await p.evaluate(() => { window.__lvl.player.body.reset((window.__lvl.AX0 || 3960) + 60, 430); window.__step(30); });
const s0 = await p.evaluate(() => { const L = window.__lvl; return { arena: L.arena, st: L.boss.st, alpha: L.boss.alpha }; });
await p.screenshot({ path: 'audit/v12/boss/01_intro.png' });
await p.evaluate(() => window.__step(90)); await p.screenshot({ path: 'audit/v12/boss/02_awake.png' });
const shots = [];
for (let i = 0; i < 30; i++) { await p.evaluate(() => window.__step(20)); if (i % 5 === 2) { const f = `audit/v12/boss/03_fight_${i}.png`; await p.screenshot({ path: f }); shots.push(f); } }
const s1 = await p.evaluate(() => { const L = window.__lvl; return { awake: L.boss.awake, dbg: JSON.parse(JSON.stringify(L.boss.dbg)), esc: L.boss.escorts(), hp: L.boss.hp, bossVisible: L.hud.bossLbl?.visible }; });
// shoot it a bit for real, then phase 2
await p.evaluate(() => { const L = window.__lvl; L.boss.st = 'laser'; L.boss.stT = 99; L.boss.b.setVelocity(0, 0); L.player.body.setAllowGravity(false); L.player.body.reset(L.boss.x - 110, L.boss.y + 20); });
await p.keyboard.down('KeyJ'); await p.evaluate(() => window.__step(60)); await p.keyboard.up('KeyJ'); await p.screenshot({ path: 'audit/v12/boss/03b_laser.png' }); await p.evaluate(() => { const L = window.__lvl; L.boss.st = 'hover'; L.boss.stT = 0.5; L.boss.las.clear(); L.player.body.setAllowGravity(true); });
const hpShot = await p.evaluate(() => window.__lvl.boss.hp);
await p.evaluate(() => { const B = window.__lvl.boss; B.hit(B.hp - B.maxHp / 2 + 1, 1); }); await p.evaluate(() => window.__step(400)); await p.screenshot({ path: 'audit/v12/boss/04_phase2.png' });
const s2 = await p.evaluate(() => JSON.parse(JSON.stringify(window.__lvl.boss.dbg)));
await p.evaluate(() => { const B = window.__lvl.boss; B.hit(B.hp, 1); }); await p.evaluate(() => window.__step(40)); await p.screenshot({ path: 'audit/v12/boss/05_death.png' });
await p.evaluate(() => window.__step(260));
const won = await p.evaluate(() => ({ won: window.__lvl.won, arena: window.__lvl.arena }));
await p.evaluate(() => window.__step(120)); await p.evaluate(() => { window.__game.loop.wake(); }); await p.waitForTimeout(3500);
const vic = await p.evaluate(() => ({ v: window.__victory || null, active: window.__game.scene.isActive('Victory') })); await p.screenshot({ path: 'audit/v12/boss/06_victory.png' });
const r = { s0, s1, hpShot, s2, won, vic, errs }; console.log(JSON.stringify(r));
const ok = s0.arena && s1.awake && hpShot < 90 && Object.keys(s2.attacks).length >= 4 && s2.slams > 0 && s2.phase2 && won.won && vic.active && vic.v?.ch === 2 && errs.length === 0;
console.log(ok ? 'PASS' : 'FAIL'); await b.close(); process.exit(ok ? 0 : 1);
