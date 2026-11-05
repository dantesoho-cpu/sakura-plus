import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.env.URL || 'http://127.0.0.1:4181/sakura-plus/?v=23g';
const OUT = process.env.OUT || 'audit/v23/geom_qa.json';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function boot(p) {
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 90000 });
}
async function start(p, key) {
  await p.evaluate((k) => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(k); }, key);
  await p.waitForFunction(() => window.__lvl?.player, null, { timeout: 90000 });
  await p.waitForTimeout(900);
}

const report = {};
for (const key of ['Level1', 'Level2', 'Shrine', 'Fortress']) {
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  await boot(p); await start(p, key);
  const diag = await p.evaluate(() => {
    const L = window.__lvl;
    const out = { key: L.scene.key, floatProps: [], stuckEnemies: [], nearMiss: [], overlapPlats: [], notes: {} };

    // Flying / hovering kinds — not expected to seat on a deck
    const flyRe = /(drone|wasp|mine|scout|jelly|hover|boss|sentry|orb|wing|avian|flyer|ship|rain|beam|float)/i;
    const SEAT = 16; // px: prefer nearest walk surface within this band of feet

    for (const e of (L.enemies || [])) {
      if (!e || e.dead || !e.active) continue;
      const k = e.kind || '?';
      if (flyRe.test(k)) continue;
      // originY===1 → sprite foot is e.y; else use body.bottom
      const oy = e.originY ?? 0.5;
      const feetY = oy >= 0.95 ? e.y : (e.b?.bottom ?? (e.y + (e.height || 20) * (1 - oy)));
      const cx = e.b?.center?.x ?? e.x;

      let near = null; // {top, d}
      let deep = null;

      const consider = (top) => {
        if (top == null || !Number.isFinite(top)) return;
        const d = top - feetY;
        if (Math.abs(d) <= SEAT) {
          if (!near || Math.abs(d) < Math.abs(near.d)) near = { top, d };
        } else if (d >= -4) {
          // surface at/below feet (or slightly above) but outside seat band
          if (!deep || Math.abs(d) < Math.abs(deep.d)) deep = { top, d };
        }
      };

      const checkRects = (arr) => {
        if (!arr) return;
        for (const r of arr.getChildren?.() || arr) {
          const b = r.body;
          if (!b) continue;
          // Arcade StaticBody: left/right/top are authoritative
          const left = b.left ?? b.x, right = b.right ?? (b.x + b.width), top = b.top ?? b.y;
          if (cx >= left - 4 && cx <= right + 4) consider(top);
        }
      };
      checkRects(L.solids); checkRects(L.ones); checkRects(L.walls);

      if (typeof L.platY === 'function') {
        const py = L.platY(cx, feetY);
        if (py < Infinity) consider(py);
      }
      if (typeof L.groundAt === 'function') {
        const g = L.groundAt(cx, feetY - 4);
        if (g > 0) consider(g);
      }
      if (typeof L.rampY === 'function') {
        const ry = L.rampY(cx);
        if (ry < Infinity) consider(ry);
      }
      try {
        const t = L.solid?.getTileAtWorldXY?.(cx, feetY + 2);
        if (t?.collides) consider(t.getTop?.() ?? t.pixelY);
      } catch {}

      // Trustworthy rule: seated if nearest deck is within SEAT of feet.
      // Deep groundAt alone (e.g. channel floor 34px under a pit) is NOT a pass — that's a real float.
      if (near) {
        if (Math.abs(near.d) > 6) out.nearMiss.push({ k, x: Math.round(cx), y: Math.round(e.y), feet: Math.round(feetY), walk: Math.round(near.top), d: Math.round(near.d) });
        continue;
      }
      out.stuckEnemies.push({
        k, x: Math.round(cx), y: Math.round(e.y), feet: Math.round(feetY),
        walk: deep ? Math.round(deep.top) : null,
        d: deep ? Math.round(deep.d) : null,
      });
    }

    // floating originY=1 props (L1-focused; Shrine/Fort props often sit on shelves via groundAt)
    const kids = L.children?.list || [];
    for (const o of kids) {
      if (!o?.texture || o.originY !== 1) continue;
      const key = o.texture.key || '';
      if (/^pl_|^p_|^sky|^bg|^par|^ft_|^nk_bg|^cl_|^sh_p_|^sh_col|^skin/.test(key)) continue;
      if (o.depth <= -14) continue;
      if (typeof L.groundAt !== 'function') continue;
      const g = L.groundAt(o.x, o.y - 8);
      if (g < 0) continue;
      const dy = Math.abs(g - o.y);
      let onPlat = false;
      if (typeof L.platY === 'function') {
        const py = L.platY(o.x, o.y);
        if (py < Infinity && Math.abs(py - o.y) < 18) onPlat = true;
      }
      // also accept solids/ones under feet
      const onRect = (() => {
        for (const g2 of [L.ones, L.solids]) {
          if (!g2) continue;
          for (const z of g2.getChildren()) {
            const b = z.body; if (!b) continue;
            if (o.x >= b.left - 4 && o.x <= b.right + 4 && Math.abs(b.top - o.y) < 18) return true;
          }
        }
        return false;
      })();
      if (!onPlat && !onRect && dy > 22 && o.y < g - 18) {
        out.floatProps.push({ tex: key, x: Math.round(o.x), y: Math.round(o.y), g: Math.round(g), dy: Math.round(dy), depth: o.depth });
      }
    }

    if (L.plats?.length) {
      const ps = L.plats;
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j];
        const overlapX = Math.min(a.L + a.w, b.L + b.w) - Math.max(a.L, b.L);
        if (overlapX < 20) continue;
        const aTop = a.T + (a.p.find(t => t >= 0) ?? 0);
        const bTop = b.T + (b.p.find(t => t >= 0) ?? 0);
        if (Math.abs(aTop - bTop) < 22) {
          out.overlapPlats.push({ a: a.k, b: b.k, x: Math.round((a.L + b.L) / 2), ya: Math.round(aTop), yb: Math.round(bTop), ox: Math.round(overlapX) });
        }
      }
      out.notes.plats = ps.length;
    }
    if (L.tiers) out.notes.tiers = { runs: L.tiers.runs?.length, lifts: L.tiers.lifts?.length, megas: L.tiers.megas?.length };
    out.notes.enemies = (L.enemies || []).filter(e => e && !e.dead).length;
    out.notes.T = { maxRun: window.__T?.maxRun, coyote: window.__T?.coyote, buffer: window.__T?.buffer };
    return out;
  });
  report[key] = diag;
  console.log(key, 'stuck', diag.stuckEnemies.length, 'near', diag.nearMiss.length, 'float', diag.floatProps.length, 'overlap', diag.overlapPlats.length, diag.notes);
  if (diag.stuckEnemies.length) console.log('  stuck sample', diag.stuckEnemies.slice(0, 8));
  await p.close();
}
fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log('wrote', OUT);
await b.close();
