import Phaser from 'phaser';
// Independent multi-plane parallax. Each plane is its own texture (never stitched). Scenery planes are
// transparent PNGs at native aspect; sky is an opaque base. Positions snap to whole pixels (nearest).
// Scroll factors start at 0.05 / 0.15 / 0.30 / 0.50 / 0.80 and are tunable per-instance.
const q = (v: number) => Math.round(v);
export type StackPlane = {
  key: string;           // texture key
  f: number;             // horizontal scroll factor
  y: number;             // screen y (origin top)
  vy?: number;           // optional vertical parallax multiplier vs camera Y
  depth: number;
  opaque?: boolean;      // sky base fills the view; scenery uses native height
};
export type StackOpts = {
  planes?: StackPlane[];
  /** world bottom used to hide plane bottoms under the playfield */
  bot?: number;
};
const DEFAULT_FT: StackPlane[] = [
  { key: 'ft_sky', f: 0.05, y: 0, depth: -100, opaque: true },
  { key: 'ft_L1', f: 0.15, y: 80, vy: 6, depth: -96 },
  { key: 'ft_L2', f: 0.30, y: 110, vy: 10, depth: -92 },
  { key: 'ft_L3', f: 0.50, y: 140, vy: 14, depth: -88 },
  { key: 'ft_L4', f: 0.80, y: 165, vy: 18, depth: -84 },
];
export function loadFortressParallax(S: Phaser.Scene) {
  if (!S.textures.exists('ft_sky')) S.load.image('ft_sky', 'assets/ft/bg/ft_sky.png');
  for (let i = 1; i <= 4; i++) if (!S.textures.exists('ft_L' + i)) S.load.image('ft_L' + i, `assets/ft/bg/ft_L${i}.png`);
}
type Lay = { ts: Phaser.GameObjects.TileSprite; key: string; f: number; y: number; vy: number; nativeH: number };
export class ParallaxStack {
  layers: Lay[] = [];
  hooked = false;
  t = 0;
  constructor(public scene: Phaser.Scene, opts: StackOpts = {}) {
    const planes = opts.planes || DEFAULT_FT;
    const W = 480;
    for (const p of planes) {
      const tex = scene.textures.get(p.key);
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      const img = tex.getSourceImage() as HTMLImageElement;
      const h = p.opaque ? 270 : img.height;
      const ts = scene.add.tileSprite(0, p.y, W, h, p.key)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(p.depth);
      // keep native texel density: tileScale 1 (nearest). Opaque sky stretches to view height via display size.
      if (p.opaque) ts.setDisplaySize(W, 270);
      this.layers.push({ ts, key: p.key, f: p.f, y: p.y, vy: p.vy || 0, nativeH: img.height });
    }
  }
  /** tune a plane's scroll factor after construction (by index) */
  setFactor(i: number, f: number) { if (this.layers[i]) this.layers[i].f = f; }
  update(_dt: number) {
    if (!this.hooked) {
      this.hooked = true;
      const cam = this.scene.cameras.main;
      cam.on('prerender', this.sync, this);
      this.scene.events.once('shutdown', () => cam.off('prerender', this.sync, this));
    }
  }
  /** apply offsets on camera prerender so layers never lag a frame behind follow */
  sync = () => {
    const cam = this.scene.cameras.main, sx = cam.scrollX;
    const b = cam.getBounds();
    const vy = b.height > 270 ? Phaser.Math.Clamp((cam.scrollY - b.y) / Math.max(1, b.height - 270), 0, 1) - 0.5 : 0;
    for (const l of this.layers) {
      l.ts.tilePositionX = q(sx * l.f);
      l.ts.y = q(l.y - vy * l.vy * 2);
    }
  };
}
