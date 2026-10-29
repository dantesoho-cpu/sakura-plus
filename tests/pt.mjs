import { chromium } from 'playwright';
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:960,height:540}});
p.on('console',m=>console.log('C',m.text()));await p.goto('http://127.0.0.1:5173/');await p.waitForTimeout(2000);
await p.keyboard.down('ArrowRight');await p.keyboard.press('Shift');
for(let i=0;i<5;i++){console.log(await p.evaluate(()=>{const t=window.__game.scene.getScene('TestRoom').player.trail;return [t.getAliveParticleCount(),t.emitting,t.x,t.y,t.depth,t.visible,window.__game.scene.getScene('TestRoom').player.dashing]}));await p.waitForTimeout(40);}
await p.screenshot({path:'/tmp/pt.png'});await b.close();
