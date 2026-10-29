import Phaser from 'phaser';
// Ambient cherry-blossom petals. Pooled, hard-capped. Back layer behind gameplay (small, slow parallax),
// front layer: few, larger, soft, faster parallax. Gentle sway + periodic wind gusts.
type P = { img: Phaser.GameObjects.Image; x: number; y: number; vy: number; ph: number; sw: number; rs: number; layer: number };
export const PETAL_CAP = { back: 46, front: 7 };
export class Petals {
  ps: P[] = []; wind = 0; gust = 0; gustT = 3;
  constructor(public scene: Phaser.Scene) {
    const mk = (layer: number) => {
      const img = scene.add.image(0, 0, layer ? 'petal_soft' : 'petal').setScrollFactor(0);
      img.setDepth(layer ? 30 : 5).setScale(layer ? Phaser.Math.FloatBetween(1.6, 2.4) : Phaser.Math.FloatBetween(0.6, 1.3)).setAlpha(layer ? 0.55 : Phaser.Math.FloatBetween(0.6, 0.95));
      const p: P = { img, x: Math.random() * 520 - 20, y: Math.random() * 290 - 10, vy: layer ? Phaser.Math.FloatBetween(28, 40) : Phaser.Math.FloatBetween(12, 26), ph: Math.random() * 6.28, sw: Phaser.Math.FloatBetween(0.8, 2), rs: Phaser.Math.FloatBetween(-3, 3), layer };
      this.ps.push(p);
    };
    for (let i = 0; i < PETAL_CAP.back; i++) mk(0); for (let i = 0; i < PETAL_CAP.front; i++) mk(1);
  }
  lastCam = 0;
  update(dt: number) {
    const cam = this.scene.cameras.main, dcx = cam.scrollX - this.lastCam; this.lastCam = cam.scrollX;
    this.gustT -= dt; if (this.gustT <= 0) { this.gust = Phaser.Math.FloatBetween(40, 80); this.gustT = Phaser.Math.FloatBetween(4, 8); }
    this.gust *= Math.pow(0.4, dt); this.wind = -14 - this.gust; // drifting left
    for (const p of this.ps) {
      const par = p.layer ? 1.3 : 0.5; p.ph += dt * p.sw;
      p.x += (this.wind * (p.layer ? 1.4 : 1) + Math.sin(p.ph) * 12) * dt - dcx * par; p.y += (p.vy + Math.cos(p.ph * 1.3) * 6) * dt;
      if (p.y > 285) { p.y = -8; p.x = Math.random() * 540; } if (p.x < -24) p.x += 528; if (p.x > 504) p.x -= 528;
      p.img.setPosition(Math.round(p.x), Math.round(p.y)); p.img.rotation += (p.rs + this.gust * 0.03) * dt; p.img.scaleY = p.img.scaleX * (0.55 + 0.45 * Math.abs(Math.sin(p.ph * 1.7)));
    }
  }
  get count() { return this.ps.length; }
}
