import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'http://127.0.0.1:4181/sakura-plus/?v=20a';
const OUT = 'audit/v20';
fs.mkdirSync(`${OUT}/fort`, { recursive: true });
fs.mkdirSync(`${OUT}/victory`, { recursive: true });
fs.mkdirSync(`${OUT}/l1`, { recursive: true });
fs.mkdirSync(`${OUT}/l2`, { recursive: true });
fs.mkdirSync(`${OUT}/shrine`, { recursive: true });
fs.mkdirSync(`${OUT}/hud`, { recursive: true });

const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const pageErrors = [];

async function boot(p, q = '') {
  const errs = [];
  p.on('pageerror', e => { const m = String(e.message || e); errs.push(m); pageErrors.push(m); });
  await p.goto(URL.split('?')[0] + (q || '?v=20a'), { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 90000 });
  return errs;
}

async function startScene(p, key) {
  await p.evaluate((k) => {
    const g = window.__game;
    g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key));
    g.scene.start(k);
  }, key);
  await p.waitForFunction(() => window.__lvl?.player, null, { timeout: 90000 });
}

async function shot(p, path) {
  fs.mkdirSync(path.replace(/\/[^/]+$/, ''), { recursive: true });
  await p.screenshot({ path });
  console.log('shot', path);
}

// --- Fortress ground fill shots (low camera) ---
{
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = await boot(p, '?lvl=fortress&v=20fort');
  await p.waitForFunction(() => window.__lvl?.player, null, { timeout: 90000 });
  await p.waitForTimeout(800);
  // dismiss title banner
  await p.waitForTimeout(600);
  const zones = [
    ['dock', 220],
    ['gantry', 1500],
    ['spires', 2600],
    ['bridge', 5000],
    ['arena', 6100],
  ];
  for (const [name, x] of zones) {
    await p.evaluate(({ x }) => {
      const L = window.__lvl;
      const T1 = 760;
      L.player.x = x; L.player.y = T1 - 20;
      L.player.setVelocity?.(0, 0);
      const b = L.player.body; if (b) { b.x = x; b.y = T1 - 40; b.setVelocity(0, 0); }
      // force camera low enough that fill must reach past bottom edge
      L.cameras.main.stopFollow();
      L.cameras.main.setScroll(x - 240, T1 - 180); // bottom ~ T1+90 → deep into fill
      L.cameras.main.shake(0, 0);
    }, { x });
    await p.waitForTimeout(250);
    await shot(p, `${OUT}/fort/${name}_low.png`);
  }
  // natural follow mid dock
  await p.evaluate(() => {
    const L = window.__lvl; const T1 = 760;
    L.player.x = 400; L.player.y = T1 - 20;
    L.cameras.main.startFollow(L.player, true, 1, 1, 0, 30);
    L.cameras.main.setScroll(400 - 240, T1 - 200);
  });
  await p.waitForTimeout(400);
  await shot(p, `${OUT}/fort/play.png`);
  await shot(p, `${OUT}/hud/fort.png`);
  // pit between bands should still show sky
  await p.evaluate(() => {
    const L = window.__lvl;
    L.cameras.main.stopFollow();
    L.cameras.main.setScroll(1050 - 240, 760 - 200); // over first pit ~1000-1180
  });
  await p.waitForTimeout(200);
  await shot(p, `${OUT}/fort/pit_sky.png`);
  const fortInfo = await p.evaluate(() => ({
    bands: window.__lvl.groundBands?.length,
    fillTex: ['ft_fill_00','ft_fill_deep_00','ft_fill_lip'].map(k => !!window.__lvl.textures.exists(k)),
    bg: window.__lvl.cameras.main.backgroundColor?.color,
    objs: window.__lvl.children.list.length,
    cull: window.__cull?.dbg,
  }));
  console.log('fortInfo', JSON.stringify(fortInfo));
  fs.writeFileSync(`${OUT}/fort/info.json`, JSON.stringify({ ...fortInfo, errs }, null, 2));
  await p.close();
}

// --- Victory path: from Fortress scene.start + hard-stop Victory ---
const victory = { fortress: null, hard: null };
{
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = await boot(p, '?lvl=fortress&v=20vic');
  await p.waitForFunction(() => window.__lvl?.player, null, { timeout: 90000 });
  await p.waitForTimeout(500);
  // start Victory as Fortress would (ch:4)
  await p.evaluate(() => {
    const L = window.__lvl;
    L.scene.start('Victory', { time: 333, got: 8, kills: 22, deaths: 1, ch: 4, gems: 5 });
  });
  await p.waitForFunction(() => window.__game.scene.isActive('Victory') || window.__victory, null, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1800);
  await shot(p, `${OUT}/victory/from_fortress.png`);
  victory.fortress = {
    active: await p.evaluate(() => window.__game.scene.isActive('Victory')),
    data: await p.evaluate(() => window.__victory || null),
    errs: [...errs],
  };
  await p.close();
}
{
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = await boot(p);
  // hard stop all then Victory — this is the v19 crash path
  await p.evaluate(() => {
    const g = window.__game;
    g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key));
    g.scene.start('Victory', { time: 120, got: 7, kills: 12, deaths: 1, ch: 1 });
  });
  await p.waitForTimeout(2000);
  await shot(p, `${OUT}/victory/hard_stop.png`);
  victory.hard = {
    active: await p.evaluate(() => window.__game.scene.isActive('Victory')),
    data: await p.evaluate(() => window.__victory || null),
    errs: [...errs],
  };
  await p.close();
}
console.log('victory', JSON.stringify(victory, null, 2));
fs.writeFileSync(`${OUT}/victory/result.json`, JSON.stringify(victory, null, 2));

// --- Smoke all four levels ---
const smoke = {};
for (const [k, dir] of [['Level1','l1'],['Level2','l2'],['Shrine','shrine'],['Fortress','fort']]) {
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e.message || e)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 90000 });
  await p.evaluate((key) => {
    const g = window.__game;
    g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key));
    g.scene.start(key);
  }, k);
  await p.waitForFunction(() => window.__lvl?.player, null, { timeout: 90000 });
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(1400); await p.keyboard.press('Shift');
  await p.waitForTimeout(500); await p.keyboard.up('ArrowRight');
  await shot(p, `${OUT}/${dir}/after_play.png`);
  await shot(p, `${OUT}/hud/${dir}.png`);
  smoke[k] = await p.evaluate(() => ({
    x: Math.round(window.__lvl.player.x),
    hp: window.__lvl.player.hp,
    cull: !!window.__cull,
    roundPx: window.__lvl.cameras.main.roundPixels,
    lerp: +window.__lvl.cameras.main.lerp.x.toFixed(3),
    objs: window.__lvl.children.list.length,
    cullDbg: window.__cull?.dbg || null,
  }));
  smoke[k].errs = errs;
  await p.close();
  console.log(k, JSON.stringify(smoke[k]));
}

const summary = {
  round: 'v20',
  bundle: 'index-PTkan4YQ.js',
  smoke,
  victory,
  pageErrors,
  pass: Object.values(smoke).every(s => !s.errs?.length) &&
        !victory.fortress?.errs?.length &&
        !victory.hard?.errs?.length &&
        victory.fortress?.active &&
        victory.hard?.active,
};
fs.writeFileSync(`${OUT}/smoke.json`, JSON.stringify(summary, null, 2));
console.log('PASS', summary.pass);
await b.close();
