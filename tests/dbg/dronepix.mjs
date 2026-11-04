import { chromium } from 'playwright';
const BASE = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
await p.goto(BASE); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 60000 }); await p.evaluate(() => window.__game.scene.getScene('Title').scene.start('Level1'));
await p.waitForFunction(() => window.__lvl?.player?.body && window.__lvl.enemies?.length && window.__game.loop.frame > 30, null, { timeout: 60000 });
const out = [];
const ids = await p.evaluate(() => { const L = window.__lvl; L.player.hp = 1e9; return L.enemies.map((e, i) => [i, e.kind]).filter(x => x[1] === 'drone').map(x => x[0]); });
for (const i of ids) {
  const r = await p.evaluate(async i => { const L = window.__lvl, e = L.enemies[i]; if (!e?.active) return null; L.player.body.reset(e.x - 160, e.y); await new Promise(r => setTimeout(r, 900)); if (!e.active) return null;
    L.physics.world.pause(); L.tweens.pauseAll(); L.anims.pauseAll(); const c = L.cameras.main; const sx = (e.x - c.worldView.x) * c.zoom, sy = (e.y - c.worldView.y) * c.zoom;
    return { i, sx, sy, el: e.elite, tex: e.texture.key, fr: e.frame.name, d: e.depth, vis: e.visible, a: e.alpha, sc: e.scaleX, tint: e.tintTopLeft, blend: e.blendMode, pipe: e.pipeline?.name, rc: e.renderFlags, cam: e.cameraFilter, mask: !!e.mask }; }, i);
  if (!r) continue; const clip = { x: Math.max(0, r.sx * 960 / 960 - 30), y: Math.max(0, r.sy - 30), width: 60, height: 60 };
  const scale = await p.evaluate(() => { const cv = document.querySelector('canvas'); return cv.getBoundingClientRect().width / window.__game.scale.width; });
  const cl = { x: Math.max(0, r.sx * scale - 30), y: Math.max(0, r.sy * scale - 30), width: 60, height: 60 };
  const A = await p.screenshot({ clip: cl }); await p.evaluate(i => window.__lvl.enemies[i].setVisible(false), i); await p.waitForTimeout(100);
  const B = await p.screenshot({ clip: cl }); await p.evaluate(i => { const L = window.__lvl; L.enemies[i].setVisible(true); L.physics.world.resume(); L.tweens.resumeAll(); L.anims.resumeAll(); }, i);
  r.diff = Buffer.compare(A, B) !== 0; out.push(r); if (!r.diff) await p.screenshot({ path: `audit/v12/iter17/invis_drone_${i}.png` });
}
console.log(JSON.stringify(out)); await b.close();
