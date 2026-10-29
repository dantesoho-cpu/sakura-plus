import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = [];
p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto(process.env.URL + '?intro=1'); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
const seen = [];
for (let k = 0; k < 4; k++) { await p.waitForTimeout(2600); await p.screenshot({ path: `audit/v9/intro${k}.png` }); seen.push(await p.evaluate(() => [window.__intro?.i, window.__intro?.txt.text])); await p.keyboard.press('Enter'); }
await p.waitForTimeout(1500); const inLevel = await p.evaluate(() => !!window.__lvl && window.__game.scene.isActive('Level1'));
// skip path
await p.goto(process.env.URL + '?intro=1'); await p.waitForTimeout(2500); await p.keyboard.press('Enter'); await p.waitForTimeout(1000); await p.keyboard.press('Escape'); await p.waitForTimeout(1500);
const skipped = await p.evaluate(() => window.__game.scene.isActive('Level1'));
console.log(JSON.stringify({ seen, inLevel, skipped, errs })); await b.close();
