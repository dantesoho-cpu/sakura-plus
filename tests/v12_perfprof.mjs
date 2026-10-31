import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
for (const L of ['Level1','Level2']) {
const p = await b.newPage({ viewport: { width: 960, height: 540 } }); await p.goto('http://127.0.0.1:4181/sakura-plus/'); await p.waitForTimeout(2500);
await p.evaluate(L => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(L); },L); await p.waitForTimeout(3000);
const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const fps = async () => p.evaluate(() => new Promise(r => { const a = []; let l = performance.now(); const f = t => { a.push(t - l); l = t; if (a.length < 120) requestAnimationFrame(f); else r(+(1000 / (a.slice(5).reduce((s, x) => s + x, 0) / 115)).toFixed(1)); }; requestAnimationFrame(f); }));
const r = { base: await fps() };
r.timing = await p.evaluate(() => new Promise(res => { const g = window.__game, s = window.__lvl; let u = 0, d = 0, n = 0; const ou = s.sys.step.bind(s.sys), orr = g.renderer.render.bind(g.renderer);
  s.sys.step = (t, dt) => { const a = performance.now(); ou(t, dt); u += performance.now() - a; n++; }; g.renderer.render = (...x) => { const a = performance.now(); orr(...x); d += performance.now() - a; };
  setTimeout(() => res({ updMs: +(u / n).toFixed(2), renMs: +(d / n).toFixed(2), n }), 2000); }));
const kinds = await p.evaluate(() => { const m = {}; for (const o of window.__lvl.children.list) { const k = o.type + (o.scrollFactorX !== 1 ? '_par' : '') + (o.blendMode === 1 ? '_add' : ''); m[k] = (m[k] || 0) + 1; } return m; });
r.kinds = kinds;
await p.evaluate(() => window.__lvl.children.list.forEach(o => { if (o.scrollFactorX !== 1 && o.scrollFactorX !== 0) o.__v = o.visible, o.visible = false; })); r.noParallax = await fps();
await p.evaluate(() => window.__lvl.children.list.forEach(o => { if (o.__v !== undefined) o.visible = o.__v; if (o.blendMode === 1) o.__w = o.visible, o.visible = false; })); r.noAdd = await fps();
await p.evaluate(() => { window.__lvl.children.list.forEach(o => { if (o.__w !== undefined) o.visible = o.__w; }); window.__lvl.cameras.main.setVisible(false); }); r.noRender = await fps();
console.log(L, JSON.stringify(r)); await p.close(); }
await b.close();
