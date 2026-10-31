import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); fs.mkdirSync('audit/v12/tiers/map', { recursive: true });
await p.goto((process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=2'); await p.waitForFunction(() => window.__lvl && window.__lvl.tiers && window.__lvl.player && window.__game, null, { timeout: 60000, polling: 250 }); await p.waitForTimeout(800);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; const L = window.__lvl; L.player.hp = 1e9; });
const S = () => p.evaluate(() => { const L = window.__lvl, P = L.player; return { x: Math.round(P.x), y: Math.round(P.y), down: P.body.blocked.down || P.body.touching.down, tier: L.tiers.tierOf(P.y), ...L.tiers.dbg }; });
const tp = (x, y, n = 30) => p.evaluate(([x, y, n]) => { const P = window.__lvl.player; P.body.reset(x, y); P.body.setVelocity(0, 0); window.__step(n); }, [x, y, n]);
const out = {};
// stand on each tier
for (const [name, x, y] of [['lower', 300, 430], ['mid', 800, 200], ['upper', 1650, -30], ['sky', 4800, -260]]) { await tp(x, y, 40); out[name] = await S(); await p.screenshot({ path: `audit/v12/tiers/${name}.png` }); }
// mega spring lower->mid
await tp(600, 430, 20); await p.evaluate(() => window.__step(60)); out.spring = await S(); await p.screenshot({ path: 'audit/v12/tiers/spring.png' });
// lift lower->mid at 4270: stand on it and wait a full cycle peak
const lr = await p.evaluate(() => { const L = window.__lvl, l = L.tiers.lifts[0]; l.t = 0; window.__step(1); const P = L.player; P.body.reset(l.im.x, l.im.y - 2); P.body.setVelocity(0, 0); let minY = 1e9; for (let i = 0; i < 500; i++) { window.__step(1); minY = Math.min(minY, P.y); } return { minY: Math.round(minY), x: Math.round(P.x), y: Math.round(P.y) }; });
out.lift = lr;
// tower climb: hop up ledges at tower 0 by teleporting to each ledge and checking it holds
out.ledges = await p.evaluate(() => { const L = window.__lvl, r = []; for (const y of [250, 188, 126, 64]) { const g1 = L.groundAt(1280 - 42, y - 30), g2 = L.groundAt(1280 + 42, y - 30); r.push([y, g1, g2]); } return r; });
// walk off upper run edge -> fall to lower tier
await tp(1860, -30, 20); await p.keyboard.down('ArrowRight'); await p.evaluate(() => window.__step(40)); await p.keyboard.up('ArrowRight'); await p.evaluate(() => window.__step(120)); out.drop = await S();
// full map: stitch camera tiles
const L0 = await p.evaluate(() => { const L = window.__lvl, c = L.cameras.main; c.stopFollow(); L.update = () => {}; L.children.list.slice().forEach(o => { if (o.depth < 0 || (o.scrollFactorX !== undefined && o.scrollFactorX < 0.99)) o.setAlpha(0); }); c.setBackgroundColor(0x140c2a); return { W: 6080, top: -440, H: 540 }; });
const tiles = []; for (let y = L0.top; y < L0.H; y += 270) for (let x = 0; x < L0.W; x += 480) { await p.evaluate(([x, y]) => { const c = window.__lvl.cameras.main; c.setScroll(x, y); window.__step(1); }, [x, y]); const f = `audit/v12/tiers/map/t_${x}_${y}.png`; await p.screenshot({ path: f }); tiles.push([x, y, f]); }
fs.writeFileSync('audit/v12/tiers/map/tiles.json', JSON.stringify(tiles));
const ok = out.lower.tier === 0 && out.mid.tier === 1 && out.mid.down && out.upper.tier === 2 && out.upper.down && out.sky.tier === 3 && out.sky.down && out.spring.launches >= 1 && out.spring.y < 215 && out.lift.minY < 230 && out.drop.tier <= 1 && out.drop.y > 0 && errs.length === 0;
console.log(JSON.stringify({ out, errs })); console.log(ok ? 'PASS' : 'FAIL'); await b.close(); process.exit(ok ? 0 : 1);
