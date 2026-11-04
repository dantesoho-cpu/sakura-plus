import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto('http://127.0.0.1:4181/sakura-plus/'); await p.waitForTimeout(2500);
for (let run=0;run<1;run++){
await p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start('Level1'); }); await p.waitForTimeout(3500);
await p.evaluate(() => { const P = window.__lvl.player; P.damage=()=>false; P.body.reset(704 - 9, 576 + 26); P.body.setVelocity(0, 40); });
await p.keyboard.down('ArrowRight'); await p.waitForTimeout(300);
console.log('hang',JSON.stringify(await p.evaluate(()=>{const P=window.__lvl.player;return {h:P.hang,y:P.y,bot:P.body.bottom}})));
await p.keyboard.up('ArrowRight'); await p.keyboard.press('Space');
for (let i=0;i<8;i++){ await p.waitForTimeout(70); console.log(JSON.stringify(await p.evaluate(()=>{const P=window.__lvl.player,b=P.body;return {y:Math.round(P.y),bot:Math.round(b.bottom),vy:Math.round(b.velocity.y),d:b.blocked.down,st:P.state_,a:P.anims.currentAnim?.key,lk:P.locked}})));}
}
console.log(await p.evaluate(()=>{const L=window.__lvl,P=L.player,b=P.body;const ow=L.oneway.getTileAtWorldXY(P.x,b.bottom+2);const sb=L.physics.world.staticBodies.getArray().filter(s=>s.left<b.right&&s.right>b.left&&Math.abs(s.top-b.bottom)<4).map(s=>[s.gameObject?.type,s.gameObject?.texture?.key,s.x,s.y,s.width,s.height]);const bodies=L.physics.world.bodies.getArray().filter(s=>s!==b&&s.left<b.right&&s.right>b.left&&Math.abs(s.top-b.bottom)<4).map(s=>[s.gameObject?.constructor?.name,s.gameObject?.texture?.key,s.immovable]);return JSON.stringify({ow:ow?.index,sb,bodies,tb:b.touching,wa:b.wasTouching})}));
await b.close();
