// Reachability: teleport to each check's start, use REAL key input (jump, double jump, hold for jet), assert landing on the target surface.
import { chromium } from 'playwright';
import fs from 'fs';
const src = fs.readFileSync('src/scenes/level1Map.ts', 'utf8');
const JET = JSON.parse(src.match(/JET_CHECKS = (.*);/)[1]), DBL = JSON.parse(src.match(/DBL_CHECKS = (.*);/)[1]);
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://127.0.0.1:5173/'); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
await p.evaluate(() => { const s = window.__lvl; s.enemies.forEach(e => e.destroy()); s.enemies = []; });
const tryCheck = async ([fc, fr, tc, tr], jet) => {
  await p.evaluate(([fc, fr, jet]) => { const s = window.__lvl, pl = s.player; pl.hasJet = jet; pl.hp = 5; pl.iT = 999; const x = fc * 16 + 8, y = fr * 16; pl.setPosition(x, y); pl.body.reset(x, y); }, [fc, fr, jet]);
  await p.waitForTimeout(300); const dir = tc >= fc ? 'ArrowRight' : 'ArrowLeft';
  await p.keyboard.down('Space'); await p.waitForTimeout(260); await p.keyboard.up('Space'); await p.waitForTimeout(40);
  await p.keyboard.down('Space'); // double jump, keep holding -> jet
  await p.waitForTimeout(250); await p.keyboard.down(dir);
  let best = 99, ok = false;
  for (let i = 0; i < 30; i++) { await p.waitForTimeout(80);
    const r = await p.evaluate(() => { const pl = window.__lvl.player; return { row: Math.round(pl.y / 16), g: pl.body.blocked.down, c: Math.floor(pl.x / 16) }; });
    best = Math.min(best, r.row); if ((dir === 'ArrowRight' ? r.c >= tc : r.c <= tc)) await p.keyboard.up(dir); if (r.g && r.row === tr) { ok = true; break; } if (i > 14) await p.keyboard.up('Space'); }
  await p.keyboard.up('Space'); await p.keyboard.up(dir); return { ok, best };
};
const out = { jet: [], dbl: [], noJet: [] };
for (const c of JET) out.jet.push([c, await tryCheck(c, true)]);
for (const c of JET) out.noJet.push([c, await tryCheck(c, false)]);
for (const c of DBL) out.dbl.push([c, await tryCheck(c, false)]);
const pass = out.jet.every(x => x[1].ok) && out.dbl.every(x => x[1].ok) && out.noJet.every(x => !x[1].ok);
console.log(JSON.stringify(out)); console.log('PASS', pass, errs); fs.writeFileSync('audit/reach.json', JSON.stringify({ pass, ...out }, null, 1));
await b.close();
