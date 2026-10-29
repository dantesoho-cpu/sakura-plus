import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 640, height: 360 } });
await p.goto(process.env.URL); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
const spots = JSON.parse(process.env.SPOTS);
for (const [i, [x, y]] of spots.entries()) { await p.evaluate(([x, y]) => { const L = window.__lvl, pl = L.player; pl.body.reset(x, y); L.cameras.main.stopFollow(); L.cameras.main.centerOn(x, y); }, [x, y]); await p.waitForTimeout(400); await p.screenshot({ path: `/tmp/dbg${i}.png` }); }
await b.close();
