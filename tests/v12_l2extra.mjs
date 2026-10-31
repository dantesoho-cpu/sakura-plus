// L2 extra pieces: charge nodes light on touch/shot, steam vents give an updraft, holo signs flicker; shots in audit/v12/l2extra/
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(URL); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start('Level2'); }); await p.waitForTimeout(3000);
const info = await p.evaluate(() => { const E = window.__extra; return { n: E.nodes.map(n => [Math.round(n.x), Math.round(n.y0)]), v: E.vents.map(v => v.x), s: E.signs.length, d: E.dbg }; });
const fails = []; if (info.n.length < 6) fails.push('few nodes'); if (!info.v.length) fails.push('no vents'); if (!info.s) fails.push('no signs');
// touch a node
const [nx, ny] = info.n[0]; await p.evaluate(([x, y]) => { const S = window.__lvl, P = S.player; P.damage = () => false; P.body.reset(x, y + 18); P.body.setAllowGravity(false); }, [nx, ny]); await p.waitForTimeout(400);
await p.evaluate(() => window.__lvl.player.body.setAllowGravity(true)); await p.waitForTimeout(300);
await p.screenshot({ path: 'audit/v12/l2extra/node_touch.png' });
let d = await p.evaluate(() => window.__extra.dbg); if (d.lit < 1) fails.push('touch did not light');
// shoot a node directly via hitShot
const ok = await p.evaluate(() => { const E = window.__extra, n = E.nodes.find(n => !n.lit); return E.hitShot(n.x, n.im.y); }); if (!ok) fails.push('shot did not light');
// vent updraft: drop Sakura over a vent during a burst
const vx = info.v[0]; await p.evaluate(x => { const S = window.__lvl, P = S.player, E = window.__extra, v = E.vents[0]; v.t = v.per * Math.ceil(v.t / v.per) - 0.02; P.body.reset(x, S.extra.GY - 60); P.body.setVelocityY(0); }, vx);
await p.waitForTimeout(500); await p.screenshot({ path: 'audit/v12/l2extra/vent_lift.png' });
d = await p.evaluate(() => window.__extra.dbg); if (d.lifts < 1) fails.push('no lift');
// park near a sign
await p.evaluate(() => { const S = window.__lvl, E = window.__extra, g = E.signs[1]; S.player.body.reset(g.x0, S.extra.GY - 20); }); await p.waitForTimeout(700); await p.screenshot({ path: 'audit/v12/l2extra/sign.png' });
console.log(JSON.stringify({ info: { nodes: info.n.length, vents: info.v.length, signs: info.s }, dbg: d, errs, fails, result: fails.length || errs.length ? 'FAIL' : 'PASS' }));
await b.close();
