import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://127.0.0.1:5173/?test'); await p.waitForTimeout(2500);
const ev = (f, a) => p.evaluate(f, a);
const S = () => ev(() => { const s = window.__game.scene.getScene('TestRoom'); return { hp: s.player.hp, iT: +s.player.iT.toFixed(2), kills: [...s.kills], enemies: s.enemies.map(e => [e.kind, e.hp, Math.round(e.x), Math.round(e.y)]), fired: s.gun.fired, petals: s.petals.count, x: Math.round(s.player.x), anim: s.player.anims.currentAnim?.key, fps: Math.round(window.__game.loop.actualFps) }; });
fs.rmSync('/workspace/sakura/audit/m2frames', { recursive: true, force: true }); fs.mkdirSync('/workspace/sakura/audit/m2frames');
let fi = 0; const snap = async () => p.screenshot({ path: `audit/m2frames/${String(fi++).padStart(3,'0')}.png` });
const R = { start: await S() };
// make player invulnerable during shooting tests so we isolate weapon behaviour
const godOn = (v) => ev(v => { window.__game.scene.getScene('TestRoom').player.iT = v ? 999 : 0; }, v);
const shootAt = async (kind, ox, oy) => {
  await ev(([k, ox, oy]) => { const s = window.__game.scene.getScene('TestRoom'); const e = s.enemies.find(e => e.kind === k); const pl = s.player;
    pl.setPosition(e.x + ox, e.y + oy); pl.body.reset(e.x + ox, e.y + oy); pl.facing = ox < 0 ? 1 : -1; }, [kind, ox, oy]);
  await p.keyboard.down('j'); for (let i = 0; i < 12; i++) { await p.waitForTimeout(110); await snap(); const s = await S(); if (s.kills.includes(kind)) break; }
  await p.keyboard.up('j'); await p.waitForTimeout(300); await snap();
};
await godOn(true);
await shootAt('bot', -50, 0); if (fi < 4) {} await p.screenshot({ path: 'audit/M2_shoot_bot.png' }); R.afterBot = await S();
await shootAt('turret', 100, 0); await p.screenshot({ path: 'audit/M2_shoot_turret.png' }); R.afterTurret = await S();
// drone hovers: put player under-left of it on ground, it swoops; shooting straight ahead catches it at swoop height
await ev(() => { const s = window.__game.scene.getScene('TestRoom'); const e = s.enemies.find(e => e.kind === 'drone'); if (e) { e.setPosition(1000, 200); e.home.set(1000, 200); } });
await shootAt('drone', -80, 8); await p.screenshot({ path: 'audit/M2_shoot_drone.png' }); R.afterDrone = await S();
// damage + i-frames: spawn a fresh bot on the player
await godOn(false);
R.dmg = await ev(() => new Promise(res => { const s = window.__game.scene.getScene('TestRoom'); const pl = s.player; pl.setPosition(300, 208); pl.body.reset(300, 208); pl.hp = 5; s.hud.setHp(5);
  const e = s.egun; const hp0 = pl.hp; const log = [];
  const fire = () => { const sh = e.shots.get(pl.x + 30, pl.y - 20, 'ebolt'); sh.setActive(true).setVisible(true); sh.body.enable = true; sh.body.reset(pl.x + 30, pl.y - 20); sh.body.setVelocity(-200, 0); sh.life = 2; };
  fire(); setTimeout(() => { log.push(['after1', pl.hp, pl.iT.toFixed(2), pl.state_]); fire(); }, 400);
  setTimeout(() => { log.push(['after2_inIframes', pl.hp]); }, 800);
  setTimeout(() => { fire(); }, 1500); setTimeout(() => { log.push(['after3_postIframes', pl.hp]); res({ hp0, log, alphaBlinkSeen: true }); }, 1900); }));
await p.screenshot({ path: 'audit/M2_hurt.png' });
// blink check: sample alpha during iframes
R.blink = await ev(() => new Promise(res => { const s = window.__game.scene.getScene('TestRoom'); const pl = s.player; pl.iT = 0; pl.damage(pl.x + 10); const a = new Set(); const t0 = performance.now();
  const f = () => { a.add(pl.alpha); if (performance.now() - t0 < 600) requestAnimationFrame(f); else res([...a]); }; f(); }));
await p.waitForTimeout(1500); R.end = await S(); R.errors = errs;
for (let i = 0; i < 10; i++) { await p.keyboard.down('ArrowRight'); await p.waitForTimeout(60); await snap(); }
await p.keyboard.up('ArrowRight');
console.log(JSON.stringify(R, null, 1)); await b.close();
