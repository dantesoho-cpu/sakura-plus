// Outrun-the-camera feature: heat rises on dash chains, afterimages + lines show, snap on slow-down, she never leaves the 90% band.
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://127.0.0.1:4180/sakura-plus/'; const b = await chromium.launch(); const out = {}; const errs = [];
for (const L of ['Level1', 'Level2']) {
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(2500); await p.evaluate(L => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(L); }, L); await p.waitForTimeout(2500);
  const sp0 = await p.evaluate(() => window.__lvl.player.body.maxVelocity?.x);
  await p.keyboard.down('ArrowRight'); let maxOff = 0;
  for (let i = 0; i < 10; i++) { await p.keyboard.press('Shift'); await p.waitForTimeout(190); const o = await p.evaluate(() => { const c = window.__lvl.cameras.main, pl = window.__lvl.player; return Math.abs(pl.x - c.midPoint.x) / (c.width / c.zoom / 2); }); maxOff = Math.max(maxOff, o); if (i === 6) await p.screenshot({ path: `audit/v12/speedcam/${L}_outrun.png` }); }
  await p.keyboard.up('ArrowRight'); await p.waitForTimeout(120); await p.screenshot({ path: `audit/v12/speedcam/${L}_snap.png` }); await p.waitForTimeout(900);
  const clampT = await p.evaluate(async () => { const L = window.__lvl, c = L.cameras.main, pl = L.player; pl.body.reset(pl.x + 230, pl.y - 2); await new Promise(r => setTimeout(r, 70)); return +(Math.abs(pl.x - c.midPoint.x) / (c.width / c.zoom / 2)).toFixed(2); });
  out[L] = { clampT, maxOffFrac: +maxOff.toFixed(2), ...(await p.evaluate(() => ({ sc: window.__speedcam.dbg, zoom: window.__lvl.cameras.main.zoom, cull: window.__cull.dbg, maxRun: window.__lvl.player.body.maxVelocity?.x }))), sp0 }; await p.close();
}
const ok = Object.values(out).every(r => r.sc.maxHeat > 0.5 && r.sc.ghosts > 3 && r.sc.snaps >= 1 && r.maxOffFrac <= 0.92 && r.clampT <= 0.9) && errs.length === 0;
console.log(JSON.stringify({ out, errs })); console.log(ok ? 'PASS' : 'FAIL'); await b.close(); process.exit(ok ? 0 : 1);
