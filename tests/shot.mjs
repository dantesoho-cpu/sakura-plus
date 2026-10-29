// quick visual: title + level at a few camera positions. usage: node tests/shot.mjs prefix
import { chromium } from 'playwright';
const pre = process.argv[2] || 'audit/v4/s';
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(process.env.URL || 'http://127.0.0.1:5173/sakura-plus/'); await p.waitForTimeout(2500); await p.screenshot({ path: pre + '_title.png' });
await p.keyboard.press('Enter'); await p.waitForTimeout(1500); console.log('E', JSON.stringify(errs));
const pts = JSON.parse(process.env.PTS || '[[0,0],[60,40],[200,60],[330,30]]');
for (const [i, [tx, ty]] of pts.entries()) { await p.evaluate(([x, y]) => { const pl = window.__lvl.player; pl.iT = 1e9; pl.setPosition(x * 16, y * 16); pl.body.reset(x * 16, y * 16); }, [tx, ty]); await p.waitForTimeout(700); await p.screenshot({ path: `${pre}_lv${i}.png` }); }
console.log('errors', JSON.stringify(errs)); await b.close();
