// Giant setpiece tops are standable (one-way decks) + stuck repro: hold keys across pause/blur, then verify she still moves.
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(process.env.URL || 'http://127.0.0.1:4180/sakura-plus/'); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
const decks = await p.evaluate(() => { const g = window.__game, l = window.__lvl; g.loop.sleep(); let T = performance.now(); const step = n => { for (let i = 0; i < n; i++) { T += 16.67; g.step(T, 16.67); } };
  l.player.hp = 1e9; const pts = [[3304, 656, 'torii kasagi'], [3250, 720, 'torii nuki'], [3304, 928, 'torii base'], [3068, 768, 'lantern roof'], [3068, 864, 'lantern mid'], [6056, 800, 'gate top'], [5826, 768, 'gate lantern']];
  return pts.map(([x, y, n]) => { const pl = l.player; pl.body.reset(x, y - 40); step(50); return { n, want: y, bottom: Math.round(pl.body.bottom), down: pl.body.blocked.down || pl.body.touching.down }; }); });
// hit-stop race repro (the real stuck bug): world left paused after the stop window -> must self-heal next frame
const hs = await p.evaluate(() => { const g = window.__game, l = window.__lvl; let T = performance.now(); const step = n => { for (let i = 0; i < n; i++) { T += 16.67; g.step(T, 16.67); } };
  const pl = l.player; pl.body.reset(3500, 960); step(20); l.fx.hitStop(40); l.fx.stopUntil = l.time.now - 1; l.physics.world.pause(); const x0 = pl.x; pl.body.setVelocityX(100); step(15); return { resumed: !l.physics.world.isPaused, moved: Math.round(pl.x - x0) }; });
// stuck repro: from a flat spot hold right + shoot, pause, release while paused, resume, blur; then tap right and expect movement
await p.evaluate(() => { const l = window.__lvl; l.player.body.reset(3500, 960); window.__game.loop.wake(); });
await p.waitForTimeout(500);
await p.keyboard.down('ArrowRight'); await p.keyboard.down('j'); await p.waitForTimeout(400);
await p.keyboard.press('p'); await p.waitForTimeout(300); await p.keyboard.up('ArrowRight'); await p.keyboard.up('j'); await p.keyboard.press('p'); await p.waitForTimeout(300);
await p.evaluate(() => window.dispatchEvent(new Event('blur'))); await p.waitForTimeout(200);
const x0 = await p.evaluate(() => window.__lvl.player.x); await p.waitForTimeout(500); const xIdle = await p.evaluate(() => window.__lvl.player.x);
await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(600); await p.keyboard.up('ArrowLeft'); const x1 = await p.evaluate(() => window.__lvl.player.x);
// R respawns at checkpoint
await p.keyboard.press('r'); await p.waitForTimeout(300); const r = await p.evaluate(() => ({ x: window.__lvl.player.x | 0, spawn: window.__lvl.spawn.x | 0, n: window.__lvl.manualRespawns }));
console.log(JSON.stringify({ decks, hitstopRace: hs, stuck: { drift: Math.round(xIdle - x0), movedLeft: Math.round(x0 - x1) }, respawn: r, errs })); await b.close();
