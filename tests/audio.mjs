// Audio: unlock on first input (desktop + mobile touch), album playlist continues across scenes, advances at track end, SFX fire, settings persist.
import { chromium } from 'playwright';
const U = process.env.URL; const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=user-gesture-required'] });
const errs = []; const A = p => p.evaluate(() => { const a = window.__audio; return { state: a.ctx.state, unlocked: a.unlocked, track: a.track, pos: +a.pos.toFixed(1), dur: +a.duration.toFixed(1), log: a.log.filter(l => !l.startsWith('sfx')), sfx: [...new Set(a.log.filter(l => l.startsWith('sfx') || l.startsWith('loop')))] }; });
let p = await b.newPage({ viewport: { width: 960, height: 540 } }); p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto(U); await p.waitForTimeout(2000); const before = await A(p);
await p.keyboard.press('Enter'); await p.waitForTimeout(3000); const afterStart = await A(p);
await p.keyboard.press('Space'); await p.waitForTimeout(150); await p.keyboard.press('Space'); await p.keyboard.press('x'); await p.keyboard.down('Shift'); await p.keyboard.up('Shift');
await p.keyboard.down('j'); await p.waitForTimeout(1800); await p.keyboard.up('j'); await p.waitForTimeout(500);
await p.keyboard.press('r'); await p.waitForTimeout(300);
await p.keyboard.press('p'); await p.waitForTimeout(300); await p.keyboard.press('m'); await p.keyboard.press('['); await p.waitForTimeout(200);
const saved = await p.evaluate(() => localStorage.getItem('sakura.audio')); await p.keyboard.press('m'); await p.keyboard.press(']'); await p.keyboard.press('p'); await p.waitForTimeout(300);
const inLevel = await A(p);
await p.evaluate(() => window.__audio.seek(window.__audio.duration - 1.5)); await p.waitForTimeout(5000); const advanced = await A(p);
await p.evaluate(() => { const a = window.__audio; a.play(6, a.duration ? 0 : 0); }); await p.waitForTimeout(4000); await p.evaluate(() => window.__audio.seek(window.__audio.duration - 1.5)); await p.waitForTimeout(5000); const wrapped = await A(p);
await p.close();
p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }); p.on('pageerror', e => errs.push(String(e)));
await p.goto(U); await p.waitForTimeout(2000); const mBefore = (await A(p)).state; await p.touchscreen.tap(422, 195); await p.waitForTimeout(3000); const m = await A(p);
console.log(JSON.stringify({ before: before.state, afterStart, inLevel: { track: inLevel.track, sfx: inLevel.sfx }, saved, advanced: advanced.log, wrapped: wrapped.log.slice(-3), mobile: { before: mBefore, after: m.state, unlocked: m.unlocked, log: m.log }, errs }, null, 1)); await b.close();
