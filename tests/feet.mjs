import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(process.env.URL || 'http://127.0.0.1:5173/sakura-plus/'); await p.waitForTimeout(2500);
await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = (n) => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; window.__lvl.player.hp = 1e9; });
const tag = process.env.TAG || 'now'; const out = [];
// spots: flat spawn, + slope positions found from the map
const spots = await p.evaluate(() => { const l = window.__lvl, s = []; s.push([l.spawn.x, l.spawn.y]);
  s.push([84 * 16 + 8, 80 * 16], [92 * 16 + 8, 80 * 16], [300 * 16 + 8, 80 * 16]);
  return s; });
for (let i = 0; i < spots.length; i++) {
  const [x, y] = spots[i];
  const info = await p.evaluate(([x, y]) => { const l = window.__lvl, pl = l.player; pl.setPosition(x, y); pl.body.reset(x, y); window.__step(50);
    const bot = l.enemies.find(e => e.kind === 'bot' && !e.dead); if (bot) { bot.setPosition(pl.x + 30, pl.y - 10); bot.body.reset(pl.x + 30, pl.y - 10); bot.hp = 99; }
    window.__step(30); const c = l.cameras.main; return { px: (pl.x - c.worldView.x) * 2, py: (pl.y - c.worldView.y) * 2, feet: pl.body.bottom, y: pl.y, onSlope: l.onSlope }; }, [x, y]);
  await p.screenshot({ path: `audit/v6/f/feet_${tag}_${i}.png`, clip: { x: Math.max(0, info.px - 80), y: Math.max(0, info.py - 70), width: 200, height: 100 } }); out.push(info);
}
console.log(JSON.stringify({ out, errs })); await b.close();
