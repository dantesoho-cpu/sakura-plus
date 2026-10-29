import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://127.0.0.1:5173/'); await p.waitForTimeout(2500);
const st = () => p.evaluate(() => { const s = window.__game.scene.getScene('TestRoom'); const pl = s.player; return { x: +pl.x.toFixed(1), y: +pl.y.toFixed(1), vx: +pl.body.velocity.x.toFixed(0), vy: +pl.body.velocity.y.toFixed(0), ground: pl.body.blocked.down, state: pl.state_, anim: pl.anims.currentAnim?.key }; });
const R = {}; const frames = []; let gifOn = false;
const snap = async () => { if (gifOn) frames.push(await p.screenshot({ type: 'png' })); };
R.start = await st();
// run right
gifOn = true; await p.keyboard.down('ArrowRight');
for (let i = 0; i < 6; i++) { await p.waitForTimeout(80); await snap(); }
R.running = await st(); await p.screenshot({ path: 'audit/M1_run.png' });
await p.keyboard.up('ArrowRight'); await p.waitForTimeout(350); R.stopped = await st();
// single jump: measure peak
const peak = async (hold) => { const y0 = (await st()).y; await p.keyboard.down('Space'); let minY = y0; const t0 = Date.now();
  while (Date.now() - t0 < 700) { if (Date.now() - t0 > hold) await p.keyboard.up('Space'); const s = await st(); minY = Math.min(minY, s.y); if (gifOn && frames.length<60) await snap(); }
  await p.keyboard.up('Space'); await p.waitForTimeout(500); return +(y0 - minY).toFixed(1); };
R.jumpFull = await peak(400); R.jumpTap = await peak(40);
// double jump, full hold both: press, hold, release at apex-ish, press+hold again
let y0 = (await st()).y; await p.keyboard.down('Space'); let minA=y0; let up=false; for(let i=0;i<200;i++){const q=await st(); minA=Math.min(minA,q.y); if(q.vy<-100)up=true; if(up&&q.vy>-30)break;} await p.keyboard.up('Space');
R.singleApex=+(y0-minA).toFixed(1); await p.keyboard.down('Space'); R.afterDJ = await st(); await p.screenshot({ path: 'audit/M1_doublejump.png' });
let minY = minA; for (let i=0;i<60;i++){ const q=await st(); minY=Math.min(minY,q.y); if (gifOn && frames.length<90) await snap(); if(q.vy>50)break; } await p.keyboard.up('Space');
R.doubleJumpHeight = +(y0 - minY).toFixed(1); R.djExtra=+(R.doubleJumpHeight-R.singleApex).toFixed(1); await p.waitForTimeout(1200);
// jump buffer (in-page, frame-accurate): after a jump, fire Space keydown when falling and feet <=10px above ground
R.bufferJump = await p.evaluate(() => new Promise(res => { const sc = window.__game.scene.getScene('TestRoom'), pl = sc.player; const gy = 208;
  const kd = (t) => window.dispatchEvent(new KeyboardEvent(t, { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
  kd('keydown'); setTimeout(() => kd('keyup'), 50); setTimeout(() => { kd('keydown'); setTimeout(() => kd('keyup'), 50); }, 250); let fired = false, j0 = 0, h = 0;
  const tick = () => { if (!fired && pl.body.velocity.y > 0 && gy - pl.y <= 10 && gy - pl.y > 2) { fired = true; h = gy - pl.y; j0 = pl.dbg.jumps; kd('keydown'); setTimeout(() => kd('keyup'), 30);
      setTimeout(() => res({ pressedAboveGround: +h.toFixed(1), groundedAtPress: pl.body.blocked.down, rejumped: pl.dbg.jumps > j0, airJumpsLeftAtPress: 0 }), 300); return; } requestAnimationFrame(tick); };
  setTimeout(tick, 400); setTimeout(() => res({ timeout: true }), 3000); }));
await p.waitForTimeout(1500);
R.landed = await st();
// dash
const x0 = (await st()).x; await p.keyboard.down('ArrowRight'); await p.keyboard.press('Shift'); await p.waitForTimeout(110); await p.screenshot({ path: 'audit/M1_dash.png' }); for (let i=0;i<4;i++) await snap();
await p.waitForTimeout(150); await p.keyboard.up('ArrowRight'); R.dashDX = +((await st()).x - x0).toFixed(1);
await p.waitForTimeout(500);
// coyote: walk off ledge at x~34*16 then jump shortly after
await p.evaluate(() => { const pl = window.__game.scene.getScene('TestRoom').player; pl.setPosition(30*16, 13*16-1); pl.body.reset(30*16, 13*16-1); });
await p.waitForTimeout(400); await p.keyboard.down('ArrowRight'); let s; do { s = await st(); } while (s.ground && s.x < 36*16);
await p.waitForTimeout(40); const preVy = (await st()).vy; await p.keyboard.press('Space'); await p.waitForTimeout(50); s = await st(); await p.keyboard.up('ArrowRight');
R.coyote = { offLedgeGround: false, vyAfterJump: s.vy, worked: s.vy < -100 };
// stability: fps
await p.waitForTimeout(1000); R.fps = await p.evaluate(() => window.__game.loop.actualFps.toFixed(1));
R.dbg = await p.evaluate(() => window.__game.scene.getScene('TestRoom').player.dbg); R.errors = errs; console.log(JSON.stringify(R, null, 1));
const fs = await import('fs'); fs.mkdirSync('/tmp/gif', { recursive: true }); frames.forEach((f, i) => fs.writeFileSync(`/tmp/gif/${String(i).padStart(3,'0')}.png`, f));
await b.close();
