import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto('http://127.0.0.1:4181/sakura-plus/'); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start('Level1'); });
await p.waitForFunction(() => window.__lvl?.player?.body, null, { timeout: 60000 }); await p.waitForTimeout(1500);
const W = await p.evaluate(() => window.__lvl.physics.world.bounds.width); console.log('W', W);
for (let i = 0; i < 8; i++) { const x = 300 + i * (W - 600) / 7; await p.evaluate(x => { const L = window.__lvl; L.player.damage = () => false; L.player.body.reset(x, 100); }, x); await p.waitForTimeout(2200); await p.screenshot({ path: `/workspace/sakura/audit/v12/iter17/l1ground_after_${i}.png` }); }
await b.close();
