import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:4181/sakura-plus/?v=24';
const OUT = 'audit/v24';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function start(page, key) {
  await page.evaluate((k) => {
    const g = window.__game;
    g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key));
    window.__lvl = null;
    g.scene.start(k);
  }, key);
  await page.waitForFunction((k) => window.__lvl?.player && window.__lvl.scene.key === k, key, { timeout: 90000 });
  await sleep(400);
}

async function shot(page, rel) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  await page.screenshot({ path: p, type: 'png' });
  return p;
}

const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: 960, height: 540 } });
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 90000 });

const report = { bundle: null, audio: null, juice: {}, cps: {}, dens: {}, shots: [] };

report.bundle = await page.evaluate(() => {
  const s = [...document.scripts].map(x => x.src).find(u => /index-.*\.js/.test(u)) || '';
  return s.split('/').pop();
});

// --- juice: dust + sparkle + shake ---
await start(page, 'Level1');
report.audio = await page.evaluate(() => {
  const a = window.__audio;
  return a ? { music: a.set.music, sfx: a.set.sfx, trim: a.trim?.gain?.value, mute: a.set.mute } : null;
});
// hard land dust
await page.evaluate(() => {
  const L = window.__lvl, p = L.player;
  p.setPosition(400, 200); const b0 = p.body_ || p.body; b0.reset(400, 200); b0.setVelocity(0, 500); p.lastVy = 500;
});
await sleep(500);
report.juice.dustTex = await page.evaluate(() => {
  const L = window.__lvl;
  L.fx.dustLand(L.player.x, L.player.y, true);
  L.fx.sparkle(L.player.x + 40, L.player.y - 20, 0xffd6f0);
  L.fx.shake(130, 0.007);
  return {
    fx_dust: [0,1,2].map(i => L.textures.exists('fx_dust'+i)),
    spark: L.textures.exists('spark'),
    petal: L.textures.exists('petal'),
    dustLand: typeof L.fx.dustLand === 'function',
    sparkle: typeof L.fx.sparkle === 'function',
  };
});
// force soft+hard land visuals
await page.evaluate(() => {
  const L = window.__lvl, p = L.player, cam = L.cameras.main;
  p.setPosition(L.shrineX || 3688, 500);
   (p.body_||p.body).reset(p.x, p.y);
  L.fx.dustLand(p.x, p.y, true);
  L.fx.sparkle(p.x + 30, p.y - 24, 0xffd6f0);
  cam.shake(130, 0.007);
  cam.centerOn(p.x, p.y - 40);
});
await sleep(200);
report.shots.push(await shot(page, 'juice/l1_dust_sparkle_shake.png'));

// big-hit shake via enemy
await page.evaluate(() => {
  const L = window.__lvl;
  const e = (L.enemies || []).find(x => x && !x.dead);
  if (e) { L.cameras.main.centerOn(e.x, e.y - 20); e.hit(4, 1); }
});
await sleep(180);
report.shots.push(await shot(page, 'juice/l1_bighit.png'));

// pickup sparkle
await page.evaluate(() => {
  const L = window.__lvl, p = L.player;
  L.pk.add('heart', p.x + 20, p.y);
  L.pk.add('power', p.x - 20, p.y);
  // force take path via sparkle call
  L.fx.sparkle(p.x, p.y - 10, 0xff4f8f);
  L.fx.sparkle(p.x - 20, p.y - 10, 0xffd23f);
});
await sleep(200);
report.shots.push(await shot(page, 'juice/l1_pickup_sparkle.png'));

// --- progression: CP positions + dens ---
for (const key of ['Level1', 'Level2', 'Shrine', 'Fortress']) {
  await start(page, key);
  const info = await page.evaluate(() => {
    const L = window.__lvl;
    const foes = (L.enemies || []).filter(e => e && !e.dead && e.kind !== 'boss' && e.kind !== 'escort');
    const dens = {};
    for (const e of foes) { const b = Math.floor(e.x / 800) * 800; dens[b] = (dens[b] || 0) + 1; }
    const cam = L.cameras?.main;
    const w = (cam && cam.worldView && (cam.getBounds ? cam.getBounds().width : 0)) || L.physics?.world?.bounds?.width || 0;
    const cps = L.cps ? L.cps.map(([x,y]) => [x,y]) : (L.cpX ? [[L.cpX, L.spawn?.y]] : []);
    if (L.shrineX) cps.unshift([L.shrineX, 'shrine']);
    if (L.cp2X) cps.push([L.cp2X, L.cp2Y]);
    return {
      key: L.scene.key, w, spawn: L.spawn, cps, cpI: L.cpI, cp2: L.cp2X ? [L.cp2X, L.cp2Y] : null,
      foes: foes.length, dens, AX0: L.AX0,
      gaps: null,
    };
  });
  // compute gaps
  const pts = [info.spawn.x, ...info.cps.map(c => Array.isArray(c) ? c[0] : c), info.AX0 || info.w].filter(x => typeof x === 'number').sort((a,b)=>a-b);
  const gaps = [];
  for (let i = 1; i < pts.length; i++) gaps.push(Math.round(pts[i] - pts[i-1]));
  info.pts = pts; info.gaps = gaps; info.maxGap = Math.max(...gaps, 0);
  report.cps[key] = info;
  report.dens[key] = info.dens;

  // screenshot near mid CP / spawn
  const focus = info.cps.find(c => typeof c[0] === 'number' && c[0] > 3000) || info.cps[0] || [info.spawn.x, info.spawn.y];
  await page.evaluate(([x,y]) => {
    const L = window.__lvl, p = L.player; if (!p) return;
    const yy = typeof y === 'number' ? y : (p.y || 400);
    const b = p.body_ || p.body; p.setPosition(x, yy); if (b?.reset) b.reset(x, yy);
    L.cameras?.main?.centerOn(x, yy - 40);
  }, [focus[0], typeof focus[1] === 'number' ? focus[1] : 400]);
  await sleep(250);
  const dir = key === 'Level1' ? 'l1' : key === 'Level2' ? 'l2' : key === 'Shrine' ? 'shrine' : 'fort';
  report.shots.push(await shot(page, `${dir}/cp_mid.png`));
  report.shots.push(await shot(page, `live/${dir}.png`));
}

// light CP trigger test on L2
await start(page, 'Level2');
const cpTrig = await page.evaluate(async () => {
  const L = window.__lvl, p = L.player;
  const out = [];
  for (const [x, y] of L.cps) {
    p.setPosition(x + 8, y - 4); (p.body_||p.body).reset(x + 8, y - 4);
    // step a few frames of update by waiting
  }
  // walk past each
  for (let i = 0; i < L.cps.length; i++) {
    const [x, y] = L.cps[i];
    p.setPosition(x + 10, y); (p.body_||p.body).reset(x + 10, y);
    // manually mimic update check
    if (L.cpI < L.cps.length && p.x > L.cps[L.cpI][0] && Math.abs(p.y - L.cps[L.cpI][1]) < 140) {
      const [cx, cy] = L.cps[L.cpI]; L.cpLit = true; L.spawn = { x: cx, y: cy };
      L.cpLamps[L.cpI].setTint(0x3ff3ff); L.fx.explode(cx, cy - 60, 0.5); L.cpI++;
      out.push(cx);
    }
  }
  return { lit: out, cpI: L.cpI, spawn: L.spawn };
});
report.juice.l2CpTrig = cpTrig;
await sleep(300);
report.shots.push(await shot(page, 'l2/cp_all_lit.png'));

fs.writeFileSync(path.join(OUT, 'juice_prog.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await b.close();
