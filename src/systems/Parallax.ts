import Phaser from 'phaser';
// Multi-layer parallax built from generated hi-bit layers (tools/gen2.py). Every layer is a separate seamless,
// horizontally tileable RGBA strip (no fades): sky gradient, far clouds, far mountains, lake band (animated shimmer
// + glints), mid hills/castle, near clouds, near blossom forest, birds, and an optional foreground strip.
type Lay = { ts: Phaser.GameObjects.TileSprite; f: number; y: number; vy: number };
const SKY = [[38, 70, 190], [74, 120, 224], [150, 180, 240], [214, 200, 238]];
export class Parallax {
  layers: Lay[] = []; clouds: { img: Phaser.GameObjects.Image; v: number; f: number; x: number }[] = [];
  sparks: { img: Phaser.GameObjects.Image; x: number; y: number; ph: number }[] = []; birds: { g: Phaser.GameObjects.Sprite; x: number; y: number; v: number; ph: number }[] = [];
  t = 0; lake!: Lay; lake2!: Lay; fg?: Lay;
  constructor(public scene: Phaser.Scene, opts: { fg?: boolean } = {}) {
    const S = scene, W = 480;
    if (!S.textures.exists('skygrad')) { const c = S.textures.createCanvas('skygrad', 4, 270)!; const ctx = c.getContext();
      for (let y = 0; y < 270; y++) { const t = y / 269 * (SKY.length - 1), i = Math.min(SKY.length - 2, Math.floor(t)), k = t - i;
        // banded (posterised) gradient to stay hi-bit
        const kk = Math.round(k * 6) / 6; const c3 = SKY[i].map((v, j) => Math.round(v + (SKY[i + 1][j] - v) * kk));
        ctx.fillStyle = `rgb(${c3})`; ctx.fillRect(0, y, 4, 1); } c.refresh(); }
    S.cameras.main.setBackgroundColor(0x4a78e0);
    S.add.image(0, 0, 'skygrad').setOrigin(0).setScrollFactor(0).setDisplaySize(W, 270).setDepth(-100);
    const add = (key: string, y: number, f: number, d: number, vy = 0) => { const img = S.textures.get(key).getSourceImage();
      const ts = S.add.tileSprite(0, y, W, img.height, key).setOrigin(0, 0).setScrollFactor(0).setDepth(d); const l = { ts, f, y, vy }; this.layers.push(l); return l; };
    const cl = (i: number, x: number, y: number, f: number, v: number, d: number, sc: number, a: number) => {
      const img = S.add.image(x, y, 'g2cloud' + i).setOrigin(0).setScrollFactor(0).setDepth(d).setScale(sc).setAlpha(a); this.clouds.push({ img, v, f, x }); };
    // far clouds: small wisps, very slow
    const small = [1, 3, 7, 10, 12, 14, 15, 16], big = [0, 2, 4, 5, 6, 8, 9, 11, 13];
    for (let i = 0; i < 7; i++) cl(small[i % small.length], i * 90 + Phaser.Math.Between(0, 40), 14 + Phaser.Math.Between(0, 50), 0.01, 1.5, -97, 0.8, 0.85);
    add('g2_far_mtn', 70, 0.04, -95, 4);
    for (let i = 0; i < 4; i++) cl(big[i * 2 % big.length], i * 170 + Phaser.Math.Between(0, 60), 6 + Phaser.Math.Between(0, 34), 0.03, 4, -96, 0.7, 0.95);
    this.lake = add('g2_lake', 160, 0.09, -93, 8); this.lake2 = add('g2_lake', 160, 0.09, -92, 8); this.lake2.ts.setAlpha(0.35).setFlipY(true);
    add('g2_mid_hills', 128, 0.14, -90, 12);
    for (let i = 0; i < 3; i++) cl(big[(i * 2 + 1) % big.length], i * 220 + Phaser.Math.Between(0, 80), -6 + Phaser.Math.Between(0, 20), 0.2, 9, -88, 0.8, 1);
    add('g2_near_forest', 172, 0.26, -86, 18);
    if (opts.fg) { this.fg = add('g2_fg', 270 - 70, 1.15, 60, 0); this.fg.ts.setAlpha(0.9); }
    for (let i = 0; i < 26; i++) { const img = S.add.image(0, 0, i % 2 ? 'spark' : 'spark2').setScrollFactor(0).setDepth(-92).setScale(0.5).setBlendMode(Phaser.BlendModes.ADD);
      this.sparks.push({ img, x: Math.random() * 560, y: 168 + Math.random() * 40, ph: Math.random() * 6 }); }
    if (!S.anims.exists('bird')) S.anims.create({ key: 'bird', frames: S.anims.generateFrameNumbers('bird', {}), frameRate: 8, repeat: -1 });
    for (let i = 0; i < 5; i++) { const g = S.add.sprite(0, 0, 'bird').setScrollFactor(0).setDepth(-89).play({ key: 'bird', startFrame: i % 2 }).setTint(0x3a2a5a);
      this.birds.push({ g, x: Math.random() * 600, y: 40 + Math.random() * 50, v: 14 + Math.random() * 10, ph: Math.random() * 6 }); }
  }
  update(dt: number) {
    this.t += dt; const cam = this.scene.cameras.main, sx = cam.scrollX;
    const b = cam.getBounds(); const vy = b.height > 270 ? Phaser.Math.Clamp((cam.scrollY - b.y) / (b.height - 270), 0, 1) - 0.5 : 0;
    for (const l of this.layers) { l.ts.tilePositionX = Math.round(sx * l.f); l.ts.y = Math.round(l.y - vy * l.vy * 2); }
    // lake shimmer: two copies scrolling against each other + vertical wobble
    this.lake.ts.tilePositionX = Math.round(sx * 0.09 + this.t * 3); this.lake2.ts.tilePositionX = Math.round(sx * 0.09 - this.t * 5 + 37);
    this.lake2.ts.tilePositionY = Math.round(Math.sin(this.t * 1.3) * 2);
    for (const c of this.clouds) { c.x -= c.v * dt; let x = c.x - sx * c.f; const w = c.img.displayWidth, span = 480 + w + 40; x = ((x + w) % span + span) % span - w; c.img.x = Math.round(x); }
    const ly = this.lake.ts.y;
    for (const s of this.sparks) { const x = ((s.x - sx * 0.09 - this.t * 3) % 560 + 560) % 560; s.img.setPosition(Math.round(x), Math.round(s.y - 160 + ly)); s.img.setAlpha(Math.max(0, Math.sin(this.t * 3 + s.ph)) ** 4); }
    for (const bd of this.birds) { bd.x -= bd.v * dt; if (bd.x < -20) { bd.x = 520 + Math.random() * 200; bd.y = 30 + Math.random() * 60; } bd.g.setPosition(Math.round(bd.x - sx * 0.05 % 600), Math.round(bd.y + Math.sin(this.t * 2 + bd.ph) * 3)); }
  }
}
