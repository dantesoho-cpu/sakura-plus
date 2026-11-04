import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto('http://127.0.0.1:4181/sakura-plus/'); await p.waitForTimeout(2500);
await p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start('Level1'); }); await p.waitForTimeout(3500);
await p.evaluate(() => { const P = window.__lvl.player; P.damage=()=>false; P.body.reset(704 - 9, 576 + 26); P.body.setVelocity(0, 40); });
await p.keyboard.down('ArrowRight');
for (let i=0;i<15;i++){ await p.waitForTimeout(25); console.log(JSON.stringify(await p.evaluate(()=>{const P=window.__lvl.player,b=P.body;return {top:Math.round(b.top),bot:Math.round(b.bottom),r:Math.round(b.right),br:b.blocked.right,vy:Math.round(b.velocity.y),cd:P.hangCd.toFixed(2),g:b.blocked.down, h:b.height}})));}
await b.close();
