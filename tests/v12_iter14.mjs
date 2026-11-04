// Iter 14: L1 lantern circuits (bridge/drop), Sakura ledge grab + climb + high-speed landing roll, Kaiju sheet poses. Shots in audit/v12/iter14/
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/'; fs.mkdirSync('audit/v12/iter14', { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
const W = ms => p.waitForTimeout(ms), fails = [], out = {};
const start = async k => { await p.evaluate(k => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(k); }, k); await W(3500); await p.evaluate(() => { window.__lvl.player.damage = () => false; }); };
await p.goto(URL); await W(2500); await start('Level1');
// --- L1 lanterns
out.l1 = await p.evaluate(() => window.__extra1.dbg); if (out.l1.groups < 3) fails.push('few lantern groups ' + out.l1.groups);
await p.evaluate(() => { const E = window.__extra1, P = window.__lvl.player, G = E.groups[0]; P.body.reset(G.x - 70, G.y - 2); }); await W(300);
await p.keyboard.down('ArrowRight'); await W(1100); await p.keyboard.up('ArrowRight'); await W(200);
out.touchLit = await p.evaluate(() => window.__extra1.groups[0].n.filter(l => l.lit).length); if (out.touchLit < 1) fails.push('touch did not light');
await p.evaluate(() => { const E = window.__extra1; E.groups[0].n.forEach(l => E.light(l)); }); await W(900);
const br = await p.evaluate(() => window.__extra1.lastBridge); if (!br) fails.push('no L1 bridge');
else { await p.evaluate(br => { const P = window.__lvl.player; P.body.reset(br.x + 47, br.y - 30); }, br); await W(900);
  out.st = await p.evaluate(() => { const P = window.__lvl.player; return { y: Math.round(P.body.bottom), down: P.body.blocked.down || P.body.touching.down }; });
  if (!out.st.down || Math.abs(out.st.y - br.y) > 3) fails.push('cannot stand on L1 bridge ' + JSON.stringify(out.st) + ' ' + br.y); await p.screenshot({ path: 'audit/v12/iter14/l1_bridge.png' }); }
// shoot-light group 1
await p.evaluate(() => { const E = window.__extra1, P = window.__lvl.player, G = E.groups[1]; P.body.reset(G.n[0].x - 60, G.y - 2); P.facing = 1; }); await W(500);
for (let i = 0; i < 12; i++) { await p.keyboard.press('KeyJ'); await W(140); await p.evaluate(() => { const E = window.__extra1, P = window.__lvl.player, G = E.groups[1], n = G.n.find(l => !l.lit); if (n) { P.body.reset(n.x - 60, G.y - 2); P.facing = 1; } }); }
await W(700); out.l1b = await p.evaluate(() => window.__extra1.dbg); if (out.l1b.drops < 1) fails.push('no L1 drop (shoot) ' + JSON.stringify(out.l1b)); await p.screenshot({ path: 'audit/v12/iter14/l1_drop.png' });
// --- ledge grab: find a wall with a lip (solid tile, empty above, empty tile column to the left)
const L = await p.evaluate(() => { const S = window.__lvl, so = S.solid, c = (x, y) => !!so.getTileAt(x, y)?.collides;
  for (let y = 10; y < so.layer.height - 4; y++) for (let x = 20; x < 380; x++) if (c(x, y) && c(x, y + 1) && c(x, y + 2) && !c(x, y - 1) && !c(x, y - 2) && !c(x, y - 3) && !c(x - 1, y) && !c(x - 1, y + 1) && !c(x - 1, y + 2) && !c(x - 1, y + 3) && !c(x - 1, y - 1) && !c(x - 1, y - 2) && !S.oneway.getTileAt(x - 1, y)?.index > 0 && !c(x - 2, y + 4)) return { tx: x * 16, ty: y * 16 }; return null; });
if (!L) fails.push('no ledge spot'); else {
  await p.evaluate(L => { const P = window.__lvl.player; P.body.reset(L.tx - 9, L.ty + 26); P.body.setVelocity(0, 40); }, L); await p.keyboard.down('ArrowRight'); await W(300);
  out.hang = await p.evaluate(() => { const P = window.__lvl.player; return { grabs: P.dbg.grabs, hang: !!P.hang, anim: P.anims.currentAnim?.key, y: Math.round(P.y) }; }); await p.keyboard.up('ArrowRight');
  await p.screenshot({ path: 'audit/v12/iter14/ledge_hang.png' }); if (!(out.hang.grabs > 0) || out.hang.anim !== 'ledge') fails.push('no ledge grab ' + JSON.stringify(out.hang) + JSON.stringify(L));
  await p.keyboard.press('Space'); await W(90); await p.screenshot({ path: 'audit/v12/iter14/ledge_climb.png' }); await W(500);
  out.climb = await p.evaluate(() => { const P = window.__lvl.player; return { climbs: P.dbg.climbs, bot: Math.round(P.body.bottom), down: P.body.blocked.down, x: Math.round(P.x) }; });
  if (!(out.climb.climbs > 0) || (out.climb.bot > L.ty + 2 || out.climb.bot < L.ty - 26 /* deck/skin caps (platY) sit up to ~24px above the tile lip */) || !out.climb.down) fails.push('climb failed ' + JSON.stringify(out.climb) + ' ty=' + L.ty); }
// --- landing roll: drop from high while running
const R = await p.evaluate(() => { const S = window.__lvl, E = window.__extra1, G = E.groups[2] || E.groups[0]; return { x: G.x - 200, y: G.y }; });
await p.evaluate(R => { const P = window.__lvl.player; P.body.reset(R.x, R.y - 220); P.body.setVelocity(180, 0); }, R); await p.keyboard.down('ArrowRight');
let rolled = null; for (let i = 0; i < 40 && !rolled; i++) { await W(40); rolled = await p.evaluate(() => { const P = window.__lvl.player; return P.anims.currentAnim?.key === 'roll' ? { f: P.anims.currentFrame.index, rolls: P.dbg.rolls } : null; }); }
await p.screenshot({ path: 'audit/v12/iter14/land_roll.png' }); await W(500); await p.keyboard.up('ArrowRight');
out.roll = await p.evaluate(() => { const P = window.__lvl.player; return { rolls: P.dbg.rolls, anim: P.anims.currentAnim?.key, ang: P.angle }; }); if (!(out.roll.rolls > 0)) fails.push('no roll ' + JSON.stringify(out.roll));
if (out.roll.anim === 'roll') fails.push('roll stuck');
// --- Kaiju poses
await start('Level2'); await p.evaluate(() => { const L = window.__lvl; L.player.body.reset((L.AX0 || 3960) + 60, 430); }); await W(4000);
const pz = []; for (const [st, nx] of [['tele', 'fan'], ['tele', 'dive'], ['laser', 'fan']]) { await p.evaluate(([st, nx]) => { const B = window.__lvl.boss; B.st = st; B.next = nx; B.stT = 5; B.b.setVelocity(0, 0); }, [st, nx]); await W(250);
  pz.push(await p.evaluate(() => window.__lvl.boss.texture.key)); await p.screenshot({ path: `audit/v12/iter14/kaiju_${st}_${nx}.png` }); }
await p.evaluate(() => { const B = window.__lvl.boss; B.st = 'hover'; B.stT = 3; B.las.clear(); B.roar(); }); await W(150); pz.push(await p.evaluate(() => window.__lvl.boss.texture.key)); await p.screenshot({ path: 'audit/v12/iter14/kaiju_roar.png' });
await W(900); pz.push(await p.evaluate(() => window.__lvl.boss.texture.key)); out.poses = pz;
const want = ['l2_kp_charge', 'l2_kp_tuck', 'l2_kp_charge', 'l2_kp_roar', 'l2_boss_00']; if (pz.join() !== want.join()) fails.push('poses ' + pz);
console.log(JSON.stringify({ ...out, errs, fails, result: fails.length || errs.length ? 'FAIL' : 'PASS' })); await b.close();
