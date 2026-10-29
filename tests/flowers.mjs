// Every memory flower must be collectable: teleport onto each, step, check it was collected (and log the tiles around it).
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto(process.env.URL || 'http://127.0.0.1:4180/sakura-plus/'); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
const r = await p.evaluate(() => { const g = window.__game, l = window.__lvl; g.loop.sleep(); let T = performance.now(); const step = n => { for (let i = 0; i < n; i++) { T += 16.67; g.step(T, 16.67); } };
  l.player.hp = 1e9; const out = [];
  for (const f of l.flowers.getChildren().slice()) { const x = f.x, y = f.y, bx = f.body.x, by = f.body.y; const pl = l.player; pl.setPosition(x, y + 6); pl.body.reset(x, y + 6); step(10);
    out.push({ mem: f.mem, x: x | 0, y: y | 0, body: [bx | 0, by | 0], got: !f.active, pl: [pl.x | 0, pl.y | 0], tiles: [-1, 0, 1].map(d => l.at(Math.floor(x / 16), Math.floor(y / 16) + d)).join('') }); }
  return { out, got: l.got }; });
console.log(JSON.stringify(r)); await b.close();
