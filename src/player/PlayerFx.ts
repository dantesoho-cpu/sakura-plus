import Phaser from 'phaser';
// Dash / jet-boost light trail (additive pink ribbon) + cycling-spectrum afterimages + jet-boot ring pulses & heat shimmer.
const SPECTRUM = [0x3ff3ff, 0xff4fd8, 0x9a6bff, 0xffd23f];
export class PlayerFx {
  g: Phaser.GameObjects.Graphics; pts: { x: number; y: number; a: number }[] = []; ghostT = 0; ci = 0; ringT = 0; ghosts = 0;
  shimmer: Phaser.GameObjects.Particles.ParticleEmitter;
  constructor(public s: Phaser.Scene, public p: Phaser.Physics.Arcade.Sprite & { dashing: boolean; jetting: boolean }) {
    this.g = s.add.graphics().setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    this.shimmer = s.add.particles(0, 0, 'px', { lifespan: { min: 200, max: 420 }, speedY: { min: 20, max: 60 }, speedX: { min: -30, max: 30 }, scale: { start: 0.9, end: 0.2 },
      alpha: { start: 0.9, end: 0 }, tint: [0xffffff, 0xff9ff0, 0xb58cff, 0x9ff3ff], blendMode: 'ADD', frequency: 30, quantity: 1, emitting: false, follow: p, followOffset: { x: 0, y: 6 } }).setDepth(9);
  }
  update(dt: number) {
    const p = this.p, on = p.dashing || p.jetting, cy = p.y - 16;
    if (on) this.pts.unshift({ x: p.x, y: cy, a: 1 });
    for (const q of this.pts) q.a -= dt * 3.2; this.pts = this.pts.filter(q => q.a > 0).slice(0, 22);
    const g = this.g; g.clear();
    for (let i = 0; i < this.pts.length - 1; i++) {
      const a = this.pts[i], b = this.pts[i + 1], k = a.a * (1 - i / this.pts.length);
      g.lineStyle(16 * k + 3, 0xff3fb8, 0.3 * k).lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(8 * k + 1, 0xff8fe0, 0.6 * k).lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(3 * k + 0.5, 0xffffff, 0.9 * k).lineBetween(a.x, a.y, b.x, b.y);
    }
    if (on && (this.ghostT -= dt) <= 0) { this.ghostT = p.dashing ? 0.025 : 0.06; this.ghost(); }
    if (p.jetting) {
      if (!this.shimmer.emitting) this.shimmer.start();
      if ((this.ringT -= dt) <= 0) { this.ringT = 0.11; const r = this.s.add.ellipse(p.x, p.y + 4, 6, 2).setStrokeStyle(1, Math.random() < 0.5 ? 0x9ff3ff : 0xff8fe0).setFillStyle().setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
        this.s.tweens.add({ targets: r, scaleX: 2.6, scaleY: 2.6, y: p.y + 18, alpha: 0, duration: 260, onComplete: () => r.destroy() }); }
    } else if (this.shimmer.emitting) this.shimmer.stop();
  }
  ghost() {
    const p = this.p; const c = SPECTRUM[this.ci++ % SPECTRUM.length]; this.ghosts++;
    const im = this.s.add.image(p.x, p.y, p.texture.key, p.frame.name).setOrigin(p.originX, p.originY).setFlipX(p.flipX).setScale(p.scaleX, p.scaleY)
      .setTintFill(c).setAlpha(0.6).setDepth(9);
    this.s.tweens.add({ targets: im, alpha: 0, duration: 380, scaleX: p.scaleX * 1.05, onComplete: () => im.destroy() });
  }
}
