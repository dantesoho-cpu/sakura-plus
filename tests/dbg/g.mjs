import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader'] }); const p = await b.newPage();
await p.goto('http://127.0.0.1:4181/sakura-plus/'); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start('Level1'); }); await p.waitForTimeout(3500);
console.log(await p.evaluate(()=>{const L=window.__lvl;return [700,704,708,712,716,720,730].map(x=>x+':'+L.groundAt(x,500)+':'+(L.solid.getTileAtWorldXY(x,570)?.index)+'/'+(L.solid.getTileAtWorldXY(x,560)?.index)).join(' ')}));
await b.close();
