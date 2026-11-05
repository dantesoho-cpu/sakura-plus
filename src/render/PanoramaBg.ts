import Phaser from 'phaser';
// Single panoramic background — one image, aspect preserved, no layer stacking / tiling seams.
// Camera scroll range maps onto the image so the full panorama is traversed without exposing edges.
const VIEW_W = 480, VIEW_H = 270;
const q = (v: number) => Math.round(v);

export type PanoOpts = {
  key?: string;
  /** path relative to public/, used only when the texture is not yet loaded */
  path?: string;
  depth?: number;
  /** camera clear color behind the pano (steel under-deck default) */
  bg?: number;
};

export function loadFortressPano(S: Phaser.Scene) {
  // Prefer the crisp viewport-cover bake (aspect-preserved, taller than view for vertical travel).
  if (!S.textures.exists('ft_pano')) S.load.image('ft_pano', 'assets/ft/bg/ft_pano_v.png');
}

export class PanoramaBg {
  img: Phaser.GameObjects.Image;
  key = 'ft_pano';
  /** display size (aspect preserved) */
  dw = 0; dh = 0;
  /** 0..1 factors implied by mapping cam range → image travel (informational / tests) */
  fx = 0; fy = 0;
  mode = 'pano' as const;
  layers: never[] = []; // fortress test used to read .layers; keep empty so old checks fail closed
  hooked = false;

  constructor(public scene: Phaser.Scene, opts: PanoOpts = {}) {
    const key = opts.key || 'ft_pano';
    this.key = key;
    const tex = scene.textures.get(key);
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const src = tex.getSourceImage() as HTMLImageElement;
    const iw = src.width, ih = src.height;
    // Scale uniformly so height covers the viewport; keep a little extra height for tier parallax
    // when the source is already a taller bake. Never shrink below cover-height.
    const cover = VIEW_H / ih;
    // If source is already taller than the view (pre-baked), display 1:1 for crisp pixels.
    // If source is the full native pano, scale to cover height.
    let scale = ih >= VIEW_H && iw / ih > 1.5 && ih <= VIEW_H * 1.35 ? 1 : cover;
    // Guarantee cover
    if (ih * scale < VIEW_H) scale = cover;
    if (iw * scale < VIEW_W) scale = Math.max(scale, VIEW_W / iw);
    this.dw = iw * scale;
    this.dh = ih * scale;
    scene.cameras.main.setBackgroundColor(opts.bg ?? 0x2a2840); // steel under-deck, never purple void
    this.img = scene.add.image(0, 0, key)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(opts.depth ?? -100)
      .setDisplaySize(this.dw, this.dh);
    // travel ranges
    const maxOx = Math.max(0, this.dw - VIEW_W);
    const maxOy = Math.max(0, this.dh - VIEW_H);
    // factors filled on first sync once cam bounds are known; seed with level-ish defaults
    this.fx = maxOx / Math.max(1, 7200 - VIEW_W);
    this.fy = maxOy / Math.max(1, 900 - VIEW_H);
  }

  update(_dt: number) {
    if (!this.hooked) {
      this.hooked = true;
      const cam = this.scene.cameras.main;
      cam.on('prerender', this.sync, this);
      this.scene.events.once('shutdown', () => cam.off('prerender', this.sync, this));
    }
  }

  sync = () => {
    const cam = this.scene.cameras.main;
    const b = cam.getBounds();
    const maxSx = Math.max(1, b.width - cam.width);
    const maxSy = Math.max(1, b.height - cam.height);
    const tx = Phaser.Math.Clamp(cam.scrollX / maxSx, 0, 1);
    const ty = Phaser.Math.Clamp(cam.scrollY / maxSy, 0, 1);
    const maxOx = Math.max(0, this.dw - VIEW_W);
    const maxOy = Math.max(0, this.dh - VIEW_H);
    this.fx = maxOx / maxSx;
    this.fy = maxOy / maxSy;
    // Negative offset slides the panorama under the viewport; clamp keeps edges covered.
    this.img.x = q(-tx * maxOx);
    this.img.y = q(-ty * maxOy);
  };
}
