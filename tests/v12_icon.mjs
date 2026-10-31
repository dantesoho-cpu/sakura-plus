import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto((process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=2'); await p.waitForFunction(() => !!(window.__lvl && window.__lvl.pk && window.__game), null, { timeout: 60000, polling: 250 }); await p.waitForTimeout(800);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; const L = window.__lvl; L.player.hp = 1e9; L.enemies.forEach(e => { if (e.kind !== 'boss') { e.setVisible(false); e.dead = true; } }); L.player.body.reset(1118, 430); window.__step(20); });
await p.screenshot({ path: 'audit/v12/08_cannon_icon.png', clip: { x: 380, y: 300, width: 300, height: 200 } });
await p.keyboard.down('ArrowRight'); await p.evaluate(() => window.__step(30)); await p.keyboard.up('ArrowRight');
const r = await p.evaluate(() => ({ px: window.__lvl.player.x, py: window.__lvl.player.y, pks: window.__lvl.pk.list.map(i => [i.kind, Math.round(i.x), Math.round(i.y)]), got: window.__lvl.pk.got.cannon, charges: window.__lvl.cannon.charges }));
console.log(JSON.stringify({ r, errs })); await b.close(); process.exit(r.got >= 1 && !errs.length ? 0 : 1);
