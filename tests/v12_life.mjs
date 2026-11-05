// Animated background life + sub-zones: per-level element counts, zone switching + toast, motion, screenshots and GIFs (audit/v12/life/).
import { chromium } from 'playwright'; import fs from 'fs'; import { execSync } from 'child_process';
const BASE = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/', D = 'audit/v12/life/'; fs.mkdirSync(D, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const fails = [], out = {};
for (const [lvl, need] of [['Level1', { petals: 25, mist: 4, falls: 2 }], ['Level2', { craft: 6, beacons: 10, ads: 6, haze: 3 }]]) {
  const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 60000 });
  await p.evaluate(l => window.__game.scene.getScene('Title').scene.start(l), lvl);
  await p.waitForFunction(() => window.__lvl?.player?.body && window.__life && window.__game.loop.frame > 30, null, { timeout: 60000 }); await p.waitForTimeout(800);
  const st = await p.evaluate(() => window.__life.stats); for (const k in need) if ((st[k] || 0) < need[k]) fails.push(`${lvl} ${k} ${st[k]}<${need[k]}`);
  const zones = [];
  for (const [i, f] of [0.12, 0.5, 0.86].entries()) {
    await p.evaluate(f => { const L = window.__lvl, P = L.player, W = window.__life.worldW, x = Math.round(W * f); let best = null;
      for (let dx = 0; dx < 900 && !best; dx += 16) for (const xx of [x + dx, x - dx]) { for (let y = -500; y < 700 && !best; y += 32) { const g = L.groundAt(xx, y); if (g > 0 && g - y < 40) best = [xx, g - 24]; } if (best) break; }
      if (best) { P.body.reset(best[0], best[1]); P.body.setVelocity(0, 0); } }, f);
    await p.waitForTimeout(1500); const z = await p.evaluate(() => ({ zone: window.__life.zone, tint: window.__life.tint, x: Math.round(window.__lvl.player.x) })); zones.push(z);
    const a = await p.evaluate(() => window.__life.items.filter(i => i.kind !== 'haze').slice(0, 30).map(i => [i.o.x, i.o.y + i.o.alpha * 100]));
    await p.waitForTimeout(400); const bb = await p.evaluate(() => window.__life.items.filter(i => i.kind !== 'haze').slice(0, 30).map(i => [i.o.x, i.o.y + i.o.alpha * 100]));
    const moved = a.filter((v, j) => Math.abs(v[0] - bb[j][0]) + Math.abs(v[1] - bb[j][1]) > 0.3).length; if (moved < a.length * 0.5) fails.push(`${lvl} zone${i} only ${moved}/${a.length} animated`);
    for (let r = 0; r < 8; r++) { await p.evaluate(() => { const P = window.__lvl.player; P.hp = Math.max(P.hp, 3); }); await p.waitForFunction(() => !window.__lvl.cameras.main.flashEffect.isRunning, null, { timeout: 5000 }).catch(() => {}); await p.screenshot({ path: `${D}${lvl}_zone${i}.png` }); if (!(await p.evaluate(() => window.__lvl.cameras.main.flashEffect.isRunning || window.__lvl.player.hurtT > 0))) break; await p.waitForTimeout(500); }
    if (i === 1 || process.env.ALLGIF) { fs.mkdirSync('/tmp/lf', { recursive: true }); execSync('rm -f /tmp/lf/*');
      for (let k = 0; k < 20; k++) { await p.keyboard.down('ArrowRight'); await p.screenshot({ path: `/tmp/lf/${String(k).padStart(3, '0')}.png` }); }
      await p.keyboard.up('ArrowRight');
      execSync(`python3 -c "from PIL import Image;import glob;fs=sorted(glob.glob('/tmp/lf/*.png'));im=[Image.open(f).convert('RGB').resize((480,270)).quantize(128) for f in fs];im[0].save('${D}${lvl}_life.gif',save_all=True,append_images=im[1:],duration=90,loop=0)"`); }
  }
  if (new Set(zones.map(z => z.zone)).size < 3) fails.push(lvl + ' zones not distinct ' + JSON.stringify(zones));
  if (new Set(zones.map(z => z.tint)).size < 3) fails.push(lvl + ' zone grade not distinct');
  if (errs.length) fails.push(lvl + ' errs ' + errs[0]); out[lvl] = { st, zones }; await p.context().close(); }
console.log(JSON.stringify(out)); console.log(JSON.stringify({ fails, result: fails.length ? 'FAIL' : 'PASS' })); await b.close(); process.exit(fails.length ? 1 : 0);
