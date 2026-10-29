import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(process.env.URL || 'http://127.0.0.1:5173/sakura-plus/'); await p.waitForTimeout(2500);
await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__T = performance.now(); window.__step = (n) => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } }; window.__lvl.player.hp = 1e9; });
const shot = async (name, i, n) => { await p.evaluate(n => window.__step(n), n); await p.screenshot({ path: `audit/v6/f/${name}_${String(i).padStart(3, '0')}.png` }); };
const put = (x, y) => p.evaluate(([x, y]) => { const pl = window.__lvl.player; pl.setPosition(x, y); pl.body.reset(x, y); }, [x, y]);
const sp = await p.evaluate(() => [window.__lvl.spawn.x, window.__lvl.spawn.y]);
// 6 consecutive dashes, pressed as fast as the cooldown allows (and some early, to test the buffer)
await put(sp[0], sp[1]); await p.evaluate(() => window.__step(40));
const d0 = await p.evaluate(() => [window.__lvl.player.dashCount, window.__lvl.player.pfx.starts]);
await p.keyboard.down('ArrowRight'); let n = 0, ghostsPer = [];
for (let r = 0; r < 6; r++) { const g0 = await p.evaluate(() => window.__lvl.player.pfx.ghosts); await p.keyboard.press('Shift'); for (let i = 0; i < 11; i++) await shot("dash", n++, 2); ghostsPer.push([await p.evaluate(() => window.__lvl.player.pfx.ghosts) - g0, await p.evaluate(() => [window.__lvl.player.dashCount, window.__lvl.player.body.blocked.down, Math.round(window.__lvl.player.x)])]);
  }
await p.keyboard.up('ArrowRight'); for (let i = 0; i < 6; i++) await shot('dash', n++, 2);
const d1 = await p.evaluate(() => [window.__lvl.player.dashCount, window.__lvl.player.pfx.starts]);
// 4 jet boosts
await put(sp[0], sp[1]); await p.evaluate(() => { window.__lvl.player.hasJet = true; window.__step(30); });
let jets = 0; for (let r = 0; r < 4; r++) { await p.keyboard.press('Space'); await p.evaluate(() => window.__step(12)); await p.keyboard.down('Space');
  for (let i = 0; i < 8; i++) { await p.evaluate(() => window.__step(2)); jets += await p.evaluate(() => window.__lvl.player.jetting ? 1 : 0); } await p.keyboard.up('Space'); await p.evaluate(() => window.__step(70)); }
const d2 = await p.evaluate(() => window.__lvl.player.pfx.starts);
// charge pose -> fire/recoil
await put(sp[0], sp[1]); await p.evaluate(() => { const pl = window.__lvl.player; pl.facing = 1; pl.setFlipX(false); window.__step(40); });
n = 0; await p.keyboard.down('j'); const anims = new Set();
for (let i = 0; i < 26; i++) { await shot('charge', n++, 4); anims.add(await p.evaluate(() => window.__lvl.player.anims.currentAnim?.key)); }
await p.keyboard.up('j'); for (let i = 0; i < 30; i++) { await shot('charge', n++, 2); anims.add(await p.evaluate(() => window.__lvl.player.anims.currentAnim?.key)); }
// enemy turning: put a bot and drone facing away, then let them see her
await put(sp[0] + 40, sp[1]); await p.evaluate(() => window.__step(20));
const turned = await p.evaluate(() => { const l = window.__lvl, pl = l.player; const out = [];
  for (const [k, dx, dy] of [['bot', -90, 0], ['drone', 100, -40]]) { const e = l.enemies.find(e => e.kind === k && !e.dead && e.active); if (!e) continue; const x = pl.x + dx, y = pl.y + dy; e.setPosition(x, y); e.body.reset(x, y); if (e.home) e.home.set(x, y); e.hp = 99; if (e.face) e.face(dx < 0 ? -1 : 1); out.push(e); }
  window.__te = out; return out.map(e => [e.kind, e.faceDir]); });
n = 0; const facing = []; for (let i = 0; i < 70; i++) { await shot('turn', n++, 2); if (i % 10 == 9) facing.push(await p.evaluate(() => window.__te.map(e => [e.faceDir, Math.round(e.body.velocity.x), e.mode]))); }
console.log(JSON.stringify({ dashes: d1[0] - d0[0], fxStarts: d1[1] - d0[1], ghostsPer, jets, jetStarts: d2 - d1[1], anims: [...anims], turned, facing, errs })); await b.close();
