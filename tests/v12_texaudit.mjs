import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto((process.env.URL || 'http://127.0.0.1:4181/sakura-plus/') + '?lvl=2'); await p.waitForFunction(() => window.__lvl && window.__lvl.player, null, { timeout: 60000 }); await p.waitForTimeout(3000);
const r = await p.evaluate(() => { const L = window.__lvl, m = {}; const walk = l => l.forEach(o => { if (o.list) walk(o.list); const k = o.texture?.key; if (!k || k === '__DEFAULT') { const t = o.type; m['<' + t + '>'] = (m['<' + t + '>'] || 0) + 1; return; } m[k] = (m[k] || 0) + 1; }); walk(L.children.list);
  const src = {}; for (const k of Object.keys(m)) { const t = L.textures.get(k); const s = t?.source?.[0]; src[k] = s ? (s.image?.src ? s.image.src.replace(location.origin, '') : (s.isCanvas ? 'CANVAS' : s.isRenderTexture ? 'RT' : 'gen')) : '-'; } return { m, src }; });
fs.writeFileSync('audit/v12/assets/tex.json', JSON.stringify(r, null, 1)); console.log(Object.keys(r.m).length); await b.close();
