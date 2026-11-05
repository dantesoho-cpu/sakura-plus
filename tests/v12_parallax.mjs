// Parallax smoothness probe: deterministic 60fps stepping while Sakura runs right in L1 and L2.
// Records per-rendered-frame camera scroll + each bg layer offset (checked at camera postrender = what's on screen)
// and writes frame-exact GIFs. TAG=before|after. Output: audit/v12/parallax/<TAG>_<lvl>.gif + metrics JSON.
import { chromium } from 'playwright'; import fs from 'fs'; import { execSync } from 'child_process';
const BASE = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/', TAG = process.env.TAG || 'after', D = 'audit/v12/parallax/', N = +(process.env.N || 90);
fs.mkdirSync(D, { recursive: true }); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const out = {}; const fails = [];
for (const lvl of ['Level1', 'Level2']) {
  const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__title?.sel !== undefined, null, { timeout: 60000 });
  await p.evaluate(l => window.__game.scene.getScene('Title').scene.start(l), lvl);
  await p.waitForFunction(() => window.__lvl?.player?.body && window.__game.loop.frame > 30, null, { timeout: 60000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const L = window.__lvl, g = window.__game, cam = L.cameras.main; L.player.hp = 1e9; L.player.damage = () => false;
    L.enemies.forEach(e => { if (e.kind !== 'boss') { e.setActive(false).setVisible(false); e.b && (e.b.enable = false); } });
    const lays = () => { const r = []; if (L.bg?.layers) { for (const l of L.bg.layers) if (!l.anim) r.push([l.ts.tilePositionX, l.f]); } else if (Array.isArray(L.bg)) L.bg.forEach((s, i) => r.push([s.tilePositionX, s.__f ?? [0.06, 0.14, 0.26, 0.42, 0.6][i]])); return r; };
    window.__rec = []; cam.on('postrender', () => window.__rec.push({ sx: cam.scrollX, px: L.player.x, l: lays() }));
    g.loop.sleep(); window.__T = performance.now(); window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.667; g.step(window.__T, 16.667); } }; window.__step(5); });
  await p.keyboard.down('ArrowRight'); await p.evaluate(() => window.__step(40)); // reach run speed
  const fr = D + `_f_${TAG}_${lvl}/`; fs.rmSync(fr, { recursive: true, force: true }); fs.mkdirSync(fr, { recursive: true });
  await p.evaluate(() => { window.__rec = []; });
  for (let i = 0; i < N; i++) { await p.evaluate(() => window.__step(1)); await p.screenshot({ path: fr + String(i).padStart(3, '0') + '.png' }); }
  await p.keyboard.up('ArrowRight');
  const rec = await p.evaluate(() => window.__rec);
  // desync = |layer offset - scroll*f| beyond rounding; step irregularity = frames where scroll step deviates >=1px from previous step while running
  let desync = 0, maxErr = 0, irr = 0, zero = 0; const steps = [];
  for (let i = 0; i < rec.length; i++) { const r = rec[i]; for (const [tp, f] of r.l) { const e = Math.abs(tp - Math.round(r.sx) * f); maxErr = Math.max(maxErr, e); if (e > 0.75) desync++; }
    if (i) { const d = r.sx - rec[i - 1].sx; steps.push(+d.toFixed(2)); if (d === 0) zero++; if (i > 1 && Math.abs(d - (rec[i - 1].sx - rec[i - 2].sx)) >= 1) irr++; } }
  out[lvl] = { frames: rec.length, layers: rec[0]?.l.length, desyncSamples: desync, maxLayerErr: +maxErr.toFixed(2), stepIrregular: irr, zeroSteps: zero, steps: steps.slice(30).join(","), errs };
  execSync(`ffmpeg -y -loglevel error -framerate 60 -i ${fr}%03d.png -vf "scale=480:270:flags=neighbor,split[a][b];[a]palettegen=max_colors=192[p];[b][p]paletteuse=dither=none" ${D}${TAG}_${lvl}.gif`);
  execSync(`cp ${fr}000.png ${D}${TAG}_${lvl}_frame0.png`); fs.rmSync(fr, { recursive: true, force: true });
  await p.context().close();
}
console.log(JSON.stringify(out)); if (TAG === 'after') for (const k in out) { if (out[k].desyncSamples > 0) fails.push(k + ' desync'); if (out[k].errs.length) fails.push(k + ' errs'); }
console.log(JSON.stringify({ fails, result: fails.length ? 'FAIL' : 'PASS' })); await b.close(); process.exit(fails.length ? 1 : 0);
