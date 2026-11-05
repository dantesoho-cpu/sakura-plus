import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto('http://127.0.0.1:4181/sakura-plus/?v=20fps');
await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 90000 });
await p.evaluate(() => { const g=window.__game; g.scene.getScenes(true).forEach(s=>g.scene.stop(s.scene.key)); g.scene.start('Fortress'); });
await p.waitForFunction(() => window.__lvl?.player && window.__cull, null, { timeout: 90000 });
await p.waitForTimeout(800);
const client = await p.context().newCDPSession(p);
await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.evaluate(() => {
  window.__fps = { frames: 0, times: [], last: performance.now(), running: true };
  const tick = (t) => { const f=window.__fps; if(!f.running) return; f.times.push(t-f.last); f.last=t; f.frames++; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
await p.keyboard.down('ArrowRight'); await p.keyboard.down('Shift');
await p.waitForTimeout(4500);
await p.keyboard.up('Shift'); await p.keyboard.up('ArrowRight');
const out = await p.evaluate(() => {
  const f=window.__fps; f.running=false; const times=f.times.slice(15); times.sort((a,b)=>a-b);
  const avg=1000/(times.reduce((s,v)=>s+v,0)/times.length);
  return { avgFps:+avg.toFixed(1), p95:+times[Math.floor(times.length*0.95)].toFixed(1), objs:window.__lvl.children.list.length, cull:window.__cull?.dbg };
});
fs.mkdirSync('audit/v20/fps',{recursive:true});
fs.writeFileSync('audit/v20/fps/fort_throttled.json', JSON.stringify(out,null,2));
console.log(JSON.stringify(out));
await b.close();
