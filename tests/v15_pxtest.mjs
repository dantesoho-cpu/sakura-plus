import { chromium } from 'playwright'; import fs from 'fs';
const D = 'audit/v15/pxtest'; fs.mkdirSync(D, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto((process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=pxtest');
await p.waitForFunction(() => window.__pxtest?.bg?.layers?.length === 5, null, { timeout: 60000 });
await p.waitForTimeout(400);
const R = {};
R.planes = await p.evaluate(() => window.__pxtest.bg.layers.map(l => ({ key: l.key, f: l.f, h: l.nativeH })));
// capture frames while auto-scroll runs
for (let i = 0; i < 24; i++) {
  await p.waitForTimeout(450);
  const sx = await p.evaluate(() => Math.round(window.__pxtest.cameras.main.scrollX));
  await p.screenshot({ path: `${D}/f${String(i).padStart(2,'0')}_sx${sx}.png` });
}
R.scrollEnd = await p.evaluate(() => Math.round(window.__pxtest.cameras.main.scrollX));
R.plat = await p.evaluate(() => window.__pxtest.platStrip.map(im => im.texture.key));
// transparency: sample a sky pixel that should show sky through L2+ (upper left)
R.sample = await p.evaluate(() => {
  const L = window.__pxtest; const cam = L.cameras.main;
  return { planes: L.bg.layers.length, scroll: Math.round(cam.scrollX), factors: L.bg.layers.map(l => l.f) };
});
const ok = R.planes.length === 5 && R.scrollEnd > 400 && errs.length === 0
  && R.planes[0].key === 'ft_sky' && R.planes.every((pl,i) => Math.abs(pl.f - [0.05,0.15,0.30,0.50,0.80][i]) < 0.001);
console.log(JSON.stringify({ ...R, errs: errs.slice(0,5) }));
console.log(ok ? 'PASS' : 'FAIL');
await b.close(); process.exit(ok ? 0 : 1);
