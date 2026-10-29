// Render the whole Akari Valley zone by sweeping the real game camera, then stitch (python) into a scaled overview map.
import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto(process.env.URL || 'http://127.0.0.1:5173/sakura-plus/'); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
const [W, H] = await p.evaluate(() => { const s = window.__lvl, c = s.cameras.main; c.stopFollow(); c.removeBounds(); s.player.iT = 1e9; s.player.body.enable = false;
  s.children.list.forEach(o => { if (o.scrollFactorX === 0) o.setVisible(false); }); s.cull = (o) => o; s.deco.forEach(o => o.setVisible(true)); s.cullDeco = () => {}; return [s.physics.world.bounds.width, s.physics.world.bounds.height - 400]; });
for (let y = 0; y < H; y += 270) for (let x = 0; x < W; x += 480) {
  await p.evaluate(([x, y]) => { const s = window.__lvl; s.cameras.main.setScroll(x, y); s.deco.forEach(o => o.setVisible(true)); s.children.list.forEach(o => { if (o.scrollFactorX === 0) o.setVisible(false); }); }, [x, y]);
  await p.waitForTimeout(90); await p.screenshot({ path: `audit/ov/${y / 270}_${x / 480}.png` }); }
console.log(W, H); await b.close();
