import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(process.env.URL || 'http://127.0.0.1:5173/sakura-plus/'); await p.waitForTimeout(2500);
// level car close-up (idle hover) then victory drive
await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
const c = await p.evaluate(() => { const l = window.__lvl, car = l.car; l.player.iT = 1e9; l.player.setPosition(car.x - 120, car.y - 30); l.player.body.reset(car.x - 120, car.y - 30); return [car.x, car.y]; });
await p.waitForTimeout(800);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = (n) => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; });
const shot = async (name, i, n) => { await p.evaluate(n => window.__step(n), n); await p.screenshot({ path: `audit/gif/${name}_${String(i).padStart(3, '0')}.png` }); };
for (let i = 0; i < 24; i++) await shot('car_idle', i, 4);
await p.evaluate(() => window.__lvl.scene.start('Victory', { time: 300, got: 10, kills: 20, deaths: 1 })); await p.evaluate(() => window.__step(30));
for (let i = 0; i < 70; i++) await shot('car_drive', i, 5);
console.log('car', c, 'errors', errs); await b.close();
