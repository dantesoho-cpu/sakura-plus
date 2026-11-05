import { chromium } from 'playwright'; import fs from 'fs'; import { execSync } from 'child_process';
// Capture fortress single-pano scroll: GIF + start/mid/end stills
const D = 'audit/v15/fort_pano'; fs.mkdirSync(D, { recursive: true });
const FR = '/tmp/ftpano'; execSync(`rm -rf ${FR} && mkdir -p ${FR}`);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.message || e)));
const URL = (process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=fortress';
await p.goto(URL);
await p.waitForFunction(() => window.__fortress?.player && window.__lvl?.bg?.mode === 'pano', null, { timeout: 90000, polling: 250 });
await p.waitForTimeout(800);
await p.evaluate(() => {
  const g = window.__game; g.loop.sleep();
  window.__T = performance.now();
  window.__step = n => { for (let i = 0; i < n; i++) { window.__T += 16.67; g.step(window.__T, 16.67); } };
  const L = window.__lvl; L.player.hp = 1e9; L.player.damage = () => false;
  L.cameras.main.stopFollow();
});
const T1 = 760;
const info = await p.evaluate(() => {
  const b = window.__lvl.bg;
  return { mode: b.mode, key: b.key, dw: b.dw, dh: b.dh, fx: b.fx, fy: b.fy };
});
console.log('pano', JSON.stringify(info));
// scroll across level at T1, capturing frames
const N = 48;
const maxX = 7200 - 480;
for (let i = 0; i < N; i++) {
  const u = i / (N - 1);
  const sx = Math.round(u * maxX);
  await p.evaluate(([sx, T1]) => {
    const L = window.__lvl;
    L.cameras.main.setScroll(sx, T1 - 200);
    L.player.body.reset(sx + 200, T1 - 4);
    window.__step(2);
    L.bg.sync();
  }, [sx, T1]);
  const path = `${FR}/${String(i).padStart(3, '0')}.png`;
  await p.screenshot({ path });
  if (i === 0) await p.screenshot({ path: `${D}/01_start.png` });
  if (i === Math.floor((N - 1) / 2)) await p.screenshot({ path: `${D}/02_mid.png` });
  if (i === N - 1) await p.screenshot({ path: `${D}/03_end.png` });
}
// also a high tier mid shot for vertical
await p.evaluate(() => {
  const L = window.__lvl;
  L.cameras.main.setScroll(3200, 80);
  L.player.body.reset(3400, 200);
  window.__step(2); L.bg.sync();
});
await p.screenshot({ path: `${D}/04_high_tier.png` });
execSync(`ffmpeg -y -loglevel error -framerate 12 -i ${FR}/%03d.png -vf "scale=480:270:flags=neighbor,split[a][b];[a]palettegen=max_colors=192[p];[b][p]paletteuse=dither=none" ${D}/scroll.gif`);
const edges = await p.evaluate(() => {
  // sample corners of canvas via game — report bg image bounds vs view
  const b = window.__lvl.bg, cam = window.__lvl.cameras.main;
  return {
    img: { x: b.img.x, y: b.img.y, dw: b.dw, dh: b.dh },
    cam: { sx: cam.scrollX, sy: cam.scrollY },
    cover: b.img.x <= 0 && b.img.x + b.dw >= 480 && b.img.y <= 0 && b.img.y + b.dh >= 270,
  };
});
const ok = info.mode === 'pano' && info.dw > 480 && edges.cover && errs.length === 0 && fs.existsSync(`${D}/scroll.gif`);
console.log(JSON.stringify({ info, edges, errs: errs.slice(0, 5), gif: `${D}/scroll.gif` }));
console.log(ok ? 'PASS' : 'FAIL');
await b.close(); process.exit(ok ? 0 : 1);
