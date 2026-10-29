import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://127.0.0.1:5173/'); await p.waitForTimeout(3000); await p.screenshot({ path: 'audit/S_title.png' });
await p.keyboard.press('Enter'); await p.waitForTimeout(1500); await p.screenshot({ path: 'audit/S_lvl0.png' });
await p.keyboard.down('ArrowRight'); await p.waitForTimeout(1800); await p.keyboard.up('ArrowRight'); await p.screenshot({ path: 'audit/S_lvl1.png' });
console.log(JSON.stringify(await p.evaluate(() => { const s = window.__lvl; return { x: s.player.x, y: s.player.y, jet: s.player.hasJet, fps: window.__game.loop.actualFps, deco: s.deco.length, en: s.enemies.length }; })), errs);
await b.close();
