import Phaser from 'phaser';
// Final grounding pass: per-column lowest opaque pixel of every bottom-anchored static prop vs the solid surface.
// Any prop whose closest column is above ground is lowered so it overlaps by 1px; bottoms land on whole pixels (HiRes
// renders sub-pixel, so fractional bottoms used to show a hairline gap). Adds a soft contact shadow under the footprint.
const cache: Record<string, number[]> = {};
export function groundProps(s: Phaser.Scene, groundAt: (x: number, y: number) => number, skip = /^(skin|px|glow|spark|__|pk_|cshadow)/) {
  if (!s.textures.exists('cshadow')) { const g = s.make.graphics({}, false); for (let i = 0; i < 6; i++) { g.fillStyle(0x1a0e22, 0.13); g.fillEllipse(32, 6, 64 - i * 9, 12 - i * 1.6); } g.generateTexture('cshadow', 64, 12); g.destroy(); }
  const T = s.textures, out = { fixed: 0, shadows: 0, checked: 0 }; const list = [...s.children.list];
  for (const o of list as any[]) {
    if (!o.texture || o.originY !== 1 || o.scrollFactorX !== 1 || o.angle || !o.frame || o.body || o.type !== 'Image') continue;
    const k = o.texture.key; if (skip.test(k)) continue; const fw = o.frame.width, fh = o.frame.height; if (fw < 6 || fh < 6) continue;
    const ck = k + ':' + o.frame.name; let cols = cache[ck];
    if (!cols) { cols = []; for (let x = 0; x < fw; x++) { let lo = -1; for (let y = fh - 1; y >= Math.max(0, fh - 40); y--) if (T.getPixelAlpha(x, y, k, o.frame.name)! > 96) { lo = y; break; } cols.push(lo); } cache[ck] = cols; }
    const sx = o.scaleX, sc = o.scaleY, left = o.x - fw * sx * o.originX, top = o.y - fh * sc;
    let minGap = 1e9, n = 0, fx0 = 1e9, fx1 = -1e9, gy = 0;
    for (let x = 0; x < fw; x += 2) { const lo = cols[x]; if (lo < 0) continue; const wx = o.flipX ? left + (fw - 1 - x) * sx : left + x * sx, by = top + (lo + 1) * sc;
      const g = groundAt(wx, by - 10); if (g < 0 || g - by > 24 || by - g > 40) continue; n++; if (g - by < minGap) { minGap = g - by; } if (by >= g - 2) { fx0 = Math.min(fx0, wx); fx1 = Math.max(fx1, wx); gy = g; } }
    if (n < 2) continue; out.checked++;
    if (minGap > -1) { o.y = Math.ceil(o.y + minGap + 1); out.fixed++;
      // recompute footprint after the drop
      fx0 = 1e9; fx1 = -1e9; const t2 = o.y - fh * sc; for (let x = 0; x < fw; x += 2) { const lo = cols[x]; if (lo < 0) continue; const wx = o.flipX ? left + (fw - 1 - x) * sx : left + x * sx, by = t2 + (lo + 1) * sc, g = groundAt(wx, by - 10); if (g >= 0 && by >= g - 2 && by - g < 40) { fx0 = Math.min(fx0, wx); fx1 = Math.max(fx1, wx); gy = g; } } }
    const fwid = fx1 - fx0; if (fwid >= 10 && o.depth > -15 && o.alpha > 0.5) { const sh = s.add.image((fx0 + fx1) / 2, gy + 1, 'cshadow').setDisplaySize(fwid * 1.15 + 6, Math.min(8, 3 + fwid * 0.06)).setDepth(o.depth - 0.01).setAlpha(o.alpha); sh.setScrollFactor(1); out.shadows++; }
  }
  (window as any).__ground = out; return out;
}
