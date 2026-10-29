import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await p.goto('http://127.0.0.1:5173/'); await p.waitForTimeout(2500);
const cv = await p.$('canvas'); let n = 0;
const shot = async (f) => cv.screenshot({ path: f });
await p.waitForTimeout(400); await shot('audit/A_game_1.png');
await p.keyboard.down('ArrowRight'); let fr = 0;
for (let i = 0; i < 70; i++) { if (i % 14 === 3) { await p.keyboard.press('Space'); } if (i % 9 === 0) await p.keyboard.press('KeyJ'); if (i===40) await p.keyboard.press('Shift');
  await cv.screenshot({ path: `audit/gif/${String(fr++).padStart(3,'0')}.png` }); }
await p.keyboard.up('ArrowRight');
await p.evaluate(() => { const s = window.__game.scene.getScene('TestRoom'); s.player.setPosition(1070, 208); s.player.body.reset(1070, 208); });
await p.waitForTimeout(900); await shot('audit/A_game_2.png');
const st = await p.evaluate(() => { const s = window.__game.scene.getScene('TestRoom'); return { got: s.got, fps: Math.round(window.__game.loop.actualFps), x: Math.round(s.player.x) }; });
console.log(JSON.stringify({ st, errs })); await b.close();
