import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/?v=25audit';
const OUT = process.env.OUT || 'audit/v25/fort/before';
const WW = 7200;
const TIERS = { T1: 760, T2: 620, T3: 480, T4: 340, T5: 200 };
const STEP = 450;

fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto(BASE, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 90000 });
await p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start('Fortress'); });
await p.waitForFunction(() => window.__lvl?.player && window.__lvl.scene.key === 'Fortress', null, { timeout: 120000 });
await p.waitForTimeout(1000);

const report = await p.evaluate(() => {
  const L = window.__lvl;
  const kids = L.children?.list || [];
  const imgs = kids.filter(o => o?.texture && o.active !== false && o.visible !== false && typeof o.x === 'number');
  const out = { nImgs: imgs.length, float: [], overlap: [], scatter: [], byBand: {}, notes: {} };
  const bands = {};
  for (const o of imgs) {
    const k = o.texture.key || '';
    if (!k.startsWith('ft_') && !k.startsWith('glow')) continue;
    if (k.includes('fill') || k.includes('pano') || k === 'glow') continue;
    const bx = Math.floor(o.x / 450) * 450;
    bands[bx] = (bands[bx] || 0) + 1;
    // float check: originY 1 props far from any solid/one top
    if (o.originY === 1) {
      let near = null;
      for (const g of [L.ones, L.solids]) {
        if (!g) continue;
        for (const z of g.getChildren()) {
          const b = z.body; if (!b) continue;
          if (o.x < b.left - 8 || o.x > b.right + 8) continue;
          const d = Math.abs(b.top - o.y);
          if (d < 22 && (!near || d < near.d)) near = { top: b.top, d };
        }
      }
      if (!near) out.float.push({ tex: k, x: Math.round(o.x), y: Math.round(o.y), depth: o.depth });
    }
  }
  out.byBand = bands;
  // pairwise overlap among visible ft_ images in play depth
  const play = imgs.filter(o => (o.texture.key||'').startsWith('ft_') && o.depth >= 1.5 && o.depth < 8);
  for (let i = 0; i < play.length; i++) {
    const a = play[i], ab = a.getBounds?.() || { left:a.x, right:a.x+20, top:a.y-20, bottom:a.y };
    for (let j = i + 1; j < Math.min(i + 40, play.length); j++) {
      const b = play[j];
      if (Math.abs(a.x - b.x) > 80 || Math.abs(a.y - b.y) > 60) continue;
      const bb = b.getBounds?.() || { left:b.x, right:b.x+20, top:b.y-20, bottom:b.y };
      const ox = Math.min(ab.right, bb.right) - Math.max(ab.left, bb.left);
      const oy = Math.min(ab.bottom, bb.bottom) - Math.max(ab.top, bb.top);
      if (ox > 18 && oy > 14) {
        out.overlap.push({ a: a.texture.key, b: b.texture.key, x: Math.round((a.x+b.x)/2), y: Math.round((a.y+b.y)/2), ox: Math.round(ox), oy: Math.round(oy) });
      }
    }
  }
  out.notes.enemies = (L.enemies||[]).filter(e=>e&&!e.dead).length;
  out.notes.solids = L.solids?.getLength?.();
  out.notes.ones = L.ones?.getLength?.();
  out.notes.groundBands = L.groundBands;
  out.notes.propDress = 0;
  out.float = out.float.slice(0, 80);
  out.overlap = out.overlap.slice(0, 60);
  return out;
});

fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(report, null, 2));
console.log('imgs', report.nImgs, 'float', report.float.length, 'overlap', report.overlap.length, report.notes);

// Sweep screenshots: each tier, every STEP px
for (const [tn, ty] of Object.entries(TIERS)) {
  for (let x = 200; x < WW; x += STEP) {
    await p.evaluate(({x,y}) => {
      const L = window.__lvl, pl = L.player;
      if (pl) { pl.x = x; pl.y = y - 4; if (pl.body_) { pl.body_.reset(x, y - 28); pl.body_.setVelocity(0,0); } }
      L.cameras.main.centerOn(x, y - 50);
    }, { x, y: ty });
    await p.waitForTimeout(120);
    const name = `${tn}_x${String(x).padStart(4,'0')}.png`;
    await p.screenshot({ path: path.join(OUT, name) });
  }
  console.log('tier', tn, 'done');
}
// Wide panorama samples at zone centers
const zones = [
  ['dock', 500, 700], ['hangar', 1600, 700], ['battery', 2800, 700],
  ['engine', 4000, 700], ['bridges', 5200, 700], ['summit', 6700, 700],
];
for (const [name, x, y] of zones) {
  await p.evaluate(({x,y}) => { const L = window.__lvl; L.cameras.main.centerOn(x, y - 40); if (L.player) { L.player.x=x; L.player.y=y; } }, {x,y});
  await p.waitForTimeout(150);
  await p.screenshot({ path: path.join(OUT, `zone_${name}.png`) });
}
console.log('audit shots written to', OUT);
await b.close();
