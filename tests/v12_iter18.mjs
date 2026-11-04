import { chromium } from 'playwright';
const BASE = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/'; const D = 'audit/v12/iter18/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const R = {}; const fails = [];
await p.goto(BASE); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__title?.sel !== undefined, null, { timeout: 60000 });
await p.evaluate(() => window.__game.scene.getScene('Title').scene.start('Level1'));
await p.waitForFunction(() => window.__lvl?.player?.body && window.__lvl.enemies?.length && window.__game.loop.frame > 30, null, { timeout: 60000 });
// rest pose
await p.evaluate(() => { const L = window.__lvl; L.player.hp = 1e9; L.enemies.forEach(e => { if (Math.abs(e.x - L.player.x) < 500) { e.hp = 1; e.hit(1, 1); } }); });
await p.waitForTimeout(6500);
R.rest = await p.evaluate(() => { const P = window.__lvl.player; return { anim: P.anims.currentAnim?.key, rests: P.dbg.rests || 0, onGround: P.body.blocked.down, bottom: Math.round(P.body.bottom), y: Math.round(P.y) }; });
await p.screenshot({ path: D + 'rest_sit.png' }); if (R.rest.anim !== 'sit' || !R.rest.onGround) fails.push('rest');
await p.keyboard.down('ArrowRight'); await p.waitForTimeout(400); await p.keyboard.up('ArrowRight');
R.restBreak = await p.evaluate(() => window.__lvl.player.anims.currentAnim?.key); if (R.restBreak === 'sit') fails.push('restBreak');
// boom variants: kill one of each kind on camera
R.boom = {};
for (const k of ['wasp', 'sentry', 'trooper', 'drone', 'bot']) {
  const ok = await p.evaluate(async k => { const L = window.__lvl, e = L.enemies.find(e => e.kind === k && e.active && !e.dead); if (!e) return false; L.player.body.reset(e.x - 110, e.y - 10); await new Promise(r => setTimeout(r, 900)); if (!e.active) return false; e.hp = 1; e.hit(1, 1); if (!e.dead) e.die(); return true; }, k);
  if (ok) { await p.waitForTimeout(220); await p.screenshot({ path: D + `boom_${k}.png` }); R.boom[k] = true; }
}
R.boomV = await p.evaluate(() => window.__lvl.__boomV); for (const v of ['acid', 'plasma', 'ember']) if (!R.boomV?.[v]) fails.push('boom ' + v);
// chapter end -> victory -> transit -> level2
await p.evaluate(() => { const L = window.__lvl; L.scene.start('Victory', { time: 200, got: 8, kills: 30, deaths: 1, ch: 1 }); });
await p.waitForFunction(() => window.__game.scene.isActive('Victory'), null, { timeout: 20000 }); await p.waitForTimeout(2600); await p.screenshot({ path: D + 'victory_continue.png' });
await p.keyboard.press('Enter'); await p.waitForFunction(() => window.__game.scene.isActive('Transit'), null, { timeout: 20000 });
for (const [t, n] of [[900, 'transit_0'], [1600, 'transit_1'], [1300, 'transit_2']]) { await p.waitForTimeout(t); await p.screenshot({ path: D + n + '.png' }); }
R.transit = await p.evaluate(() => ({ layers: window.__transit.L.length, tex: window.__transit.L.map(l => l.getData('k')).filter(k => window.__transit.textures.exists(k)), traffic: window.__transit.traffic.length }));
if (R.transit.layers !== 5 || R.transit.tex.length !== 5 || R.transit.traffic < 2) fails.push('transit');
await p.waitForFunction(() => window.__game.scene.isActive('Level2') && window.__lvl?.player?.body, null, { timeout: 30000 }).catch(() => fails.push('no L2'));
R.end = await p.evaluate(() => window.__game.scene.getScenes(true).map(s => s.scene.key));
R.errs = errs; if (errs.length) fails.push('errs'); R.fails = fails; R.result = fails.length ? 'FAIL' : 'PASS'; console.log(JSON.stringify(R)); await b.close();
