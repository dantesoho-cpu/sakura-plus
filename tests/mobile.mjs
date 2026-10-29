// Mobile emulation: iPhone 13 landscape, hasTouch. Real CDP touch events on the DOM buttons (multi-touch).
import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://127.0.0.1:4180/sakura-plus/';
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ ...devices['iPhone 13 landscape'] }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
const cdp = await ctx.newCDPSession(p); const L = (f, a) => p.evaluate(f, a); const W = ms => p.waitForTimeout(ms);
const ctr = async k => L(k => { const r = document.querySelector(`[data-k=${k}]`).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, k);
const held = new Map(); let nid = 1;
const send = type => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...held.values()] });
const down = async k => { const [x, y] = await ctr(k); held.set(k, { x, y, id: nid++ }); await send('touchStart'); };
const up = async k => { held.delete(k); await send(held.size ? 'touchEnd' : 'touchEnd'); };
const out = {};
await p.goto(URL); await W(2500);
out.controlsVisible = await L(() => getComputedStyle(document.getElementById('tc')).display);
out.rotateHint = await L(() => getComputedStyle(document.getElementById('rot')).display);
const cv = await L(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return [r.x, r.y, r.width, r.height, innerWidth, innerHeight]; }); out.canvas = cv;
await p.screenshot({ path: 'audit/M_title.png' });
await p.touchscreen.tap(cv[0] + cv[2] / 2, cv[1] + cv[3] / 2); await W(1500);
out.level = await L(() => !!window.__lvl?.player);
await L(() => { window.__lvl.player.iT = 1e9; });
const x0 = await L(() => window.__lvl.player.x);
await down('right'); await W(800);
const x1 = await L(() => window.__lvl.player.x); out.moveRight = Math.round(x1 - x0);
// multi-touch: hold right + press jump
const y0 = await L(() => window.__lvl.player.y); await down('jump'); let minY = y0;
for (let i = 0; i < 10; i++) { await W(40); minY = Math.min(minY, await L(() => window.__lvl.player.y)); }
await up('jump'); out.jumpRise = Math.round(y0 - minY);
await up('right'); await W(600);
const f0 = await L(() => window.__lvl.gun.fired);
await down('shoot'); await W(500); await up('shoot');
out.shotsFired = (await L(() => window.__lvl.gun.fired)) - f0;
// jet: give boots, double jump then hold
await L(() => { window.__lvl.player.hasJet = true; }); await W(500);
await down('jump'); await W(60); await up('jump'); await W(120); await down('jump'); await W(150);
let jet = false; for (let i = 0; i < 8; i++) { await W(40); jet = jet || await L(() => window.__lvl.player.jetting); } await up('jump'); out.jetOnHold = jet;
await p.screenshot({ path: 'audit/M_level.png' });
const dx0 = await L(() => window.__lvl.player.x); await W(800); await down('dash'); await W(250); await up('dash');
out.dashDx = Math.round(Math.abs((await L(() => window.__lvl.player.x)) - dx0));
out.scrollY = await L(() => scrollY);
await p.setViewportSize({ width: 390, height: 664 }); await W(400);
out.portraitRotateHint = await L(() => getComputedStyle(document.getElementById('rot')).display); await p.screenshot({ path: 'audit/M_portrait.png' });
await p.setViewportSize({ width: 844, height: 390 }); await W(300);
await L(() => window.__game.scene.start('Victory', { time: 60, got: 10, kills: 3, deaths: 0 })); await W(2800);
await p.touchscreen.tap(400, 200); await W(800);
out.victoryTapRestart = await L(() => window.__game.scene.isActive('Level1'));
out.errors = errs; console.log(JSON.stringify(out, null, 1)); await b.close();
