// Parks the Level1 camera at fixed x positions (game loop stepped manually) and screenshots for integration review.
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/'; const TAG = process.env.TAG || 'before'; const L = process.env.L || 'Level1';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto(URL); await p.waitForTimeout(2500);
await p.evaluate(L => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(L); }, L); await p.waitForTimeout(2500);
const xs = (process.env.XS || '300,900,1500,2200,3000,3800,4600,5400').split(',').map(Number);
for (const x of xs) {
  await p.evaluate(x => { const S = window.__lvl, P = S.player, cam = S.cameras.main; P.damage = () => false; cam.stopFollow(); const y = S.physics.world.bounds.height - 200; P.body.reset(x, Math.min(P.y, y)); cam.centerOn(x, cam.midPoint.y); }, x);
  await p.waitForTimeout(600); await p.evaluate(x => { const cam = window.__lvl.cameras.main; cam.centerOn(x, window.__lvl.player.y - 30); }, x); await p.waitForTimeout(250);
  await p.screenshot({ path: `audit/v12/l1integ/${TAG}_${x}.png` });
}
await b.close(); console.log('ok');
