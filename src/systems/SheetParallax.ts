import Phaser from 'phaser';
// v13 continuous parallax: 3 full-width seamless tiers (distant / mid / foreground) per level, each ONE hi-res image
// regenerated from that level's sheet panels (tools/v13_px.py, 4 texels per logical px). Drawn LINEAR-filtered with
// tileScale 1/4 and an UNROUNDED tile offset, so layers glide at sub-pixel precision instead of snapping in whole
// art-pixel steps (the old judder). Positions are applied on camera prerender (after follow), never a frame late.
export const PX_DENS = 4;
export type PxLay = { ts: Phaser.GameObjects.TileSprite; f: number; y: number; vy: number; k: number };
/** bot = screen y the tier stack rests on (world ground hides everything below) */
export const PX_BOT: Record<string, number> = { l1: 205, nk: 232, sh: 232 };
export const PX_SPEC: Record<string, { h: number; f: number; vy: number }[]> = {
  l1: [{ h: 270, f: 0.05, vy: 0 }, { h: 140, f: 0.16, vy: 8 }, { h: 100, f: 0.34, vy: 14 }],
  nk: [{ h: 270, f: 0.06, vy: 0 }, { h: 160, f: 0.17, vy: 8 }, { h: 100, f: 0.36, vy: 14 }],
  sh: [{ h: 270, f: 0.05, vy: 0 }, { h: 160, f: 0.16, vy: 8 }, { h: 110, f: 0.34, vy: 14 }],
};
export function loadPx(S: Phaser.Scene, lvl: string) { for (let i = 1; i <= 3; i++) if (!S.textures.exists(`px_${lvl}_L${i}`)) S.load.image(`px_${lvl}_L${i}`, `assets/px/${lvl}_L${i}.png`); }
export class SheetParallax {
  layers: PxLay[] = []; clouds: { img: Phaser.GameObjects.Image }[] = []; hooked = false; t = 0;
  constructor(public scene: Phaser.Scene, public lvl: string, depth0 = -95, public vyOf: () => number = () => 0) {
    PX_SPEC[lvl].forEach((s, i) => { const key = `px_${lvl}_L${i + 1}`, tex = scene.textures.get(key); tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
      const y = i ? PX_BOT[lvl] + 30 - s.h : PX_BOT[lvl] - 270, ts = scene.add.tileSprite(0, y, 480, s.h, key).setOrigin(0, 0).setScrollFactor(0).setDepth(depth0 + i * 4);
      const k = 1 / PX_DENS; ts.setTileScale(k, k); this.layers.push({ ts, f: s.f, y, vy: s.vy, k }); });
  }
  update(dt: number) { this.t += dt; if (!this.hooked) { this.hooked = true; const cam = this.scene.cameras.main; cam.on('prerender', this.sync, this); this.scene.events.once('shutdown', () => cam.off('prerender', this.sync, this)); } }
  /** world-px offset of each layer = scrollX * f; tilePosition is in texture px -> divide by tileScale */
  sync() { const cam = this.scene.cameras.main, sx = cam.scrollX, v = this.vyOf();
    for (const l of this.layers) { l.ts.tilePositionX = (sx * l.f) / l.k; l.ts.y = l.y + v * l.vy; } }
}
