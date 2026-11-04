import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto('http://127.0.0.1:4181/sakura-plus/'); await p.waitForTimeout(2500);
for (const [k, x] of [['Level1', 900], ['Level2', 1900]]) { await p.evaluate(k => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(k); }, k);
  await p.waitForFunction(() => window.__lvl?.player?.body, null, { timeout: 60000 }); await p.waitForTimeout(1500);
  await p.evaluate(x => { const L = window.__lvl; L.player.damage = () => false; L.enemies.forEach(e => e.setVisible(false)); L.player.body.reset(x, L.player.y - 40); }, x); await p.waitForTimeout(2500);
  await p.screenshot({ path: `/tmp/th_${k}.png`, clip: { x: 0, y: 60, width: 960, height: 480 } }); }
await b.close();
