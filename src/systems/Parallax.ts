import Phaser from 'phaser';
// Parallax built from the user's painted panorama (tools/pano_layers.py): sky colour, far mountains+painted clouds,
// mid lake/blossom layer, plus painted cloud cut-outs drifting and twinkles over the lake. Layers are mirror-looped.
export class Parallax {
  layers: { ts: Phaser.GameObjects.TileSprite; f: number }[] = []; clouds: { img: Phaser.GameObjects.Image; v: number }[] = [];
  sparks: { img: Phaser.GameObjects.Image; x: number; y: number; ph: number }[] = []; t = 0;
  constructor(public scene: Phaser.Scene) {
    const pano = scene.cache.json.get('pano'); const [r, g, b] = pano.sky;
    scene.cameras.main.setBackgroundColor(Phaser.Display.Color.GetColor(r, g, b));
    const add = (key: string, y: number, f: number, d: number) => { const h = scene.textures.get(key).getSourceImage().height;
      const ts = scene.add.tileSprite(0, y, 480, h, key).setOrigin(0, 0).setScrollFactor(0).setDepth(d); this.layers.push({ ts, f }); return ts; };
    add('P_far', 0, 0.05, -90);
    for (let i = 0; i < 4; i++) { const img = scene.add.image(i * 150 + Phaser.Math.Between(0, 50), 8 + Phaser.Math.Between(0, 45), 'cloud' + (i % 3)).setOrigin(0).setScrollFactor(0).setDepth(-88);
      this.clouds.push({ img, v: Phaser.Math.FloatBetween(2, 5) }); }
    const mid = add('P_mid', 120, 0.2, -85);
    for (let i = 0; i < 36; i++) { const [x, y] = pano.water[i % pano.water.length];
      const img = scene.add.image(0, 0, i % 2 ? 'spark' : 'spark2').setScrollFactor(0).setDepth(-84).setScale(0.5).setBlendMode(Phaser.BlendModes.ADD);
      this.sparks.push({ img, x, y: y + mid.y, ph: Math.random() * 6 }); }
    this.midW = scene.textures.get('P_mid').getSourceImage().width;
  }
  midW = 1720;
  update(dt: number) {
    this.t += dt; const sx = this.scene.cameras.main.scrollX;
    for (const l of this.layers) l.ts.tilePositionX = Math.round(sx * l.f);
    for (const c of this.clouds) { let x = c.img.x - c.v * dt; if (x < -c.img.width) x += 480 + c.img.width + 60; c.img.x = x; }
    const off = Math.round(sx * 0.2), W = this.midW;
    for (const s of this.sparks) { const x = ((s.x - off) % W + W) % W; s.img.setPosition(x, s.y); s.img.setAlpha(Math.max(0, Math.sin(this.t * 3 + s.ph)) ** 3); s.img.setVisible(x < 480); }
  }
}
