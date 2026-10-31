// Iter 13: charge-node group rewards (bridge / drop), sheet-robot variety (scout/mine/lancer) acting per tier, Sakura flutter + double-jump flip. Shots in audit/v12/iter13/
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(URL); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start('Level2'); }); await p.waitForTimeout(3000);
const fails = []; const W = ms => p.waitForTimeout(ms);
await p.evaluate(() => { const P = window.__lvl.player; P.damage = () => false; });
// group 0 -> bridge
await p.evaluate(() => { const E = window.__extra, P = window.__lvl.player, G = E.groups[0]; P.body.reset(G.x, E.GY - 2); G.n.forEach(n => E.light(n)); }); await W(900);
let d = await p.evaluate(() => window.__extra.dbg); if (d.bridges < 1) fails.push('no bridge');
const br = await p.evaluate(() => window.__extra.lastBridge);
await p.evaluate(br => { const P = window.__lvl.player; P.body.reset(br.x + 70, br.y - 30); P.body.setVelocity(0, 0); }, br); await W(800);
const st = await p.evaluate(() => { const P = window.__lvl.player; return { y: Math.round(P.body.bottom), down: P.body.blocked.down || P.body.touching.down }; });
if (!st.down || Math.abs(st.y - br.y) > 3) fails.push('cannot stand on bridge ' + JSON.stringify(st) + ' by=' + br.y);
await p.screenshot({ path: 'audit/v12/iter13/bridge.png' });
// group 1 -> drop
await p.evaluate(() => { const E = window.__extra, P = window.__lvl.player, G = E.groups[1]; P.body.reset(G.x - 60, E.GY - 2); G.n.forEach(n => E.light(n)); }); await W(700);
await p.screenshot({ path: 'audit/v12/iter13/drop.png' }); d = await p.evaluate(() => window.__extra.dbg); if (d.drops < 1) fails.push('no drop');
// new foes act
const res = {};
for (const k of ['scout', 'mine', 'lancer']) {
  const r = await p.evaluate(k => { const S = window.__lvl, e = S.enemies.find(e => e.kind === k && e.active && !e.dead); if (!e) return null; S.player.body.reset(e.x - 70, e.kind === 'mine' ? e.y + 40 : e.y - 2); return { x: e.x, y: e.y }; }, k);
  if (!r) { fails.push('missing ' + k); continue; } await W(2600);
  res[k] = await p.evaluate(k => { const e = window.__lvl.enemies.filter(e => e.kind === k); const a = e.find(e => e.active) || e[0]; return { n: e.length, hops: a.hops, rams: a.rams, charges: a.charges, face: a.faceDir, px: window.__lvl.player.x - a.x, feet: a.kind !== 'mine' ? [Math.round(a.y), window.__lvl.groundAt(a.x, a.y - 6)] : null }; }, k);
  await p.screenshot({ path: `audit/v12/iter13/foe_${k}.png` });
}
if (!(res.scout?.hops > 0)) fails.push('scout no hop'); if (!(res.mine?.rams > 0)) fails.push('mine no ram'); if (!(res.lancer?.charges > 0)) fails.push('lancer no charge');
for (const k in res) { const r = res[k]; if (Math.sign(r.px) !== r.face && Math.abs(r.px) > 8) fails.push(k + ' not facing'); if (r.feet && r.feet[1] >= 0 && Math.abs(r.feet[0] - r.feet[1]) > 2) fails.push(k + ' feet ' + r.feet); }
// Sakura: fall flutter + double-jump flip
await p.evaluate(() => { const S = window.__lvl, P = S.player; P.body.reset(800, 300); }); await W(300);
const an = await p.evaluate(() => { const P = window.__lvl.player; return { key: P.anims.currentAnim?.key, frames: P.anims.currentAnim?.frames.length }; });
if (an.key === 'fall' && an.frames < 2) fails.push('fall not animated');
const fa = await p.evaluate(() => window.__game.anims.get('fall').frames.map(f => f.textureKey)); if (fa.length < 2) fails.push('fall frames');
await p.evaluate(() => { const S = window.__lvl, P = S.player; P.body.reset(900, 60); }); await W(150); await p.evaluate(() => { window.__lvl.player.airJumps = 1; });
await p.keyboard.down('Space'); await W(80); await p.keyboard.up('Space'); await W(130); await p.screenshot({ path: 'audit/v12/iter13/djump_flip.png' });
const sp = await p.evaluate(() => ({ spins: window.__lvl.player.spins, ang: window.__lvl.player.angle })); await W(700);
const ang2 = await p.evaluate(() => window.__lvl.player.angle); if (!(sp.spins > 0)) fails.push('no flip'); if (Math.abs(ang2) > 0.5) fails.push('angle stuck ' + ang2);
console.log(JSON.stringify({ dbg: d, br, st, res, an, fa, sp, ang2, errs, fails, result: fails.length || errs.length ? 'FAIL' : 'PASS' }));
await b.close();
