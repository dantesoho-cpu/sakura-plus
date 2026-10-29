import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = [];
p.on('pageerror', e => errs.push(String(e)));
await p.goto(process.env.URL); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
const r = await p.evaluate(() => { const g = window.__game; g.loop.sleep(); let T = performance.now(); const step = n => { for (let i = 0; i < n; i++) { T += 16.67; g.step(T, 16.67); } };
  const L = window.__lvl, pl = L.player; pl.hp = 99; const out = [];
  const fl = L.plats.filter(q => q.w >= 80 && q.w < 140 && q.p.slice(4, -4).every(t => t >= 0) && Math.max(...q.p.slice(4,-4)) - Math.min(...q.p.slice(4,-4)) < 8).slice(0, 4);
  for (const q of fl) { const bot = L.enemies.find(e => e.kind === 'bot' && !e.dead); if (!bot) break;
    const cx = q.L + q.w / 2, top = q.T + q.p[Math.floor(q.w / 2)];
    pl.body.reset(cx + 260, top - 200); bot.body.reset(cx, top - 20); bot.mode = 'patrol'; let minX = 1e9, maxX = -1e9, off = 0;
    for (let f = 0; f < 480; f++) { step(1); pl.body.reset(cx + 260, top - 200); minX = Math.min(minX, bot.x); maxX = Math.max(maxX, bot.x); if (f > 30 && Math.abs(bot.body.bottom - (q.T + q.p[Math.max(0, Math.min(q.w - 1, Math.floor(bot.body.center.x - q.L)))])) > 3) off++; }
    out.push({ k: q.k, L: q.L, R: q.L + q.w, minX: Math.round(minX), maxX: Math.round(maxX), hopFrames: off, stayed: minX > q.L - 4 && maxX < q.L + q.w + 4 && off < 150 });
  }
  // enemy shot into a platform side
  const q = fl[0], sh = L.egun.shots.get(q.L - 30, q.T + q.p[10] + 6, 'e_bolt'); let killed = null;
  if (sh) { sh.setActive(true).setVisible(true); sh.body.enable = true; sh.life = 3; sh.body.setVelocity(300, 0); step(30); killed = !sh.active || sh.x < q.L + 20; }
  return { out, killed }; });
console.log(JSON.stringify({ ...r, errs })); await b.close();
