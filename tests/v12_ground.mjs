// Grounding audit: every bottom-anchored prop (origin y=1) standing on solid ground must have its lowest opaque row
// touch or overlap the ground surface (gap <= 0px) in at least one column. Writes audit/v12/ground/*.png crops of offenders.
import { chromium } from 'playwright'; import fs from 'fs';
const BASE = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/', D = 'audit/v12/ground/'; fs.mkdirSync(D, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const out = {}; const fails = [];
for (const lvl of (process.env.LV || 'Level1,Level2').split(',')) {
  const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__title?.sel !== undefined, null, { timeout: 60000 });
  await p.evaluate(l => window.__game.scene.getScene('Title').scene.start(l), lvl);
  await p.waitForFunction(() => window.__lvl?.player?.body && window.__game.loop.frame > 30, null, { timeout: 60000 }); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const L = window.__lvl, T = L.textures, res = { n: 0, float: [] }; const cache = {};
    const solid = (x, y) => { const t = L.solid?.getTileAtWorldXY?.(x, y) || L.layer?.getTileAtWorldXY?.(x, y); return !!(t && (t.collides || t.index > 0)); };
    const surf = (x, y0) => { if (L.groundAt) { const g = L.groundAt(x, y0); return g; } for (let y = y0; y < y0 + 40; y++) if (solid(x, y)) return y; return -1; };
    for (const o of L.children.list) { if (!o.texture || o.originY !== 1 || o.alpha < 0.05 || o.scrollFactorX !== 1 || o.angle || o.texture.key === '__MISSING' || !o.frame) continue;
      if (o === L.player || L.enemies?.includes(o) || o.body) continue; const k = o.texture.key; if (/^(skin|px|glow|spark|__|pk_)/.test(k)) continue;
      const fw = o.frame.width, fh = o.frame.height; if (fw < 6 || fh < 6) continue; const sc = o.scaleY, sx = o.scaleX;
      // per-column lowest opaque pixel (alpha>96)
      const key = k + ':' + o.frame.name; let cols = cache[key]; if (!cols) { cols = []; for (let x = 0; x < fw; x += 1) { let lo = -1; for (let y = fh - 1; y >= Math.max(0, fh - 40); y--) if (T.getPixelAlpha(x, y, k, o.frame.name) > 96) { lo = y; break; } cols.push(lo); } cache[key] = cols; }
      const left = o.x - fw * sx * o.originX, top = o.y - fh * sc; let minGap = 1e9, anyG = false, ground = 0;
      for (let x = 0; x < fw; x += 2) { const lo = cols[x]; if (lo < 0) continue; const wx = o.flipX ? left + (fw - 1 - x) * sx : left + x * sx, by = top + (lo + 1) * sc;
        const g = surf(wx, by - 10); if (g < 0 || g - by > 24 || by - g > 40) continue; anyG = true; ground++; minGap = Math.min(minGap, g - by); }
      if (!anyG || ground < 2) continue; res.n++;
      if (minGap > 0) res.float.push({ k, x: Math.round(o.x), y: Math.round(o.y), gap: +minGap.toFixed(2), d: o.depth }); }
    return res; });
  out[lvl] = { checked: r.n, floating: r.float.length, list: r.float.slice(0, 40), errs };
  for (const f of r.float.slice(0, 6)) { await p.evaluate(() => window.__lvl.scene.resume()); await p.evaluate(f => { const L = window.__lvl; const c = L.cameras.main; c.stopFollow(); c.setBounds?.(-1e5,-1e5,2e5,2e5); c.setScroll(f.x - 240, f.y - 165); L.scene.pause(); }, f); await p.waitForTimeout(300); await p.screenshot({ path: `${D}${process.env.TAG || 'cur'}_${lvl}_${f.k}_${f.x}.png`, clip: { x: 300, y: 170, width: 360, height: 200 } }); }
  if (r.float.length) fails.push(lvl + ' floating ' + r.float.length); if (r.n < 20) fails.push(lvl + ' too few checked ' + r.n);
  await p.context().close();
}
console.log(JSON.stringify(out)); console.log(JSON.stringify({ fails, result: fails.length ? 'FAIL' : 'PASS' })); await b.close(); process.exit(fails.length ? 1 : 0);
