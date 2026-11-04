import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader'] }); const p = await b.newPage();
await p.goto('http://127.0.0.1:4181/sakura-plus/'); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start('Level2'); });
await p.waitForFunction(() => window.__lvl?.player?.body, null, { timeout: 60000 }); await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate(() => window.__lvl.enemies.slice(0, 99).map(e => [e.kind, e.texture.key, e.eliteChk, e.elite, Math.round(e.x), window.__lvl.textures.exists(e.texture.key + '_v')]))));
await b.close();
