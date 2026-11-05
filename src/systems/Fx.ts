import Phaser from 'phaser';
// Hit-stop, screenshake, explosions, sheet dust + pickup sparkles.
export class Fx {
  stopUntil = 0; boom: Phaser.GameObjects.Particles.ParticleEmitter; sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  constructor(public scene: Phaser.Scene) {
    this.boom = scene.add.particles(0, 0, 'spark', { lifespan: { min: 250, max: 550 }, speed: { min: 40, max: 160 }, angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 }, tint: [0xffffff, 0xffe066, 0xff8a3d, 0x63e6ff], blendMode: 'ADD', gravityY: 120, emitting: false }).setDepth(20);
    this.sparks = scene.add.particles(0, 0, 'spark2', { lifespan: 160, speed: { min: 60, max: 140 }, angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 }, tint: [0xffffff, 0x9ff3ff], blendMode: 'ADD', emitting: false }).setDepth(20);
  }
  get stopped() { return this.scene.time.now < this.stopUntil; }
  hitStop(ms: number) {
    this.stopUntil = Math.max(this.stopUntil, this.scene.time.now + ms);
    this.scene.physics.world.pause(); this.scene.anims.pauseAll();
    this.scene.time.delayedCall(this.stopUntil - this.scene.time.now + 1, () => this.tick());
  }
  // ROOT CAUSE of "Sakura gets stuck": overlapping hit-stops could leave the physics world paused forever (the last timer fired a hair
  // before stopUntil and skipped the resume). tick() runs every frame and resumes whenever the stop window is over.
  tick() { if (!this.stopped && this.scene.physics.world.isPaused) { this.scene.physics.world.resume(); this.scene.anims.resumeAll(); } }
  shake(ms = 120, i = 0.004) { this.scene.cameras.main.shake(ms, i); }
  spark(x: number, y: number) { this.sparks.explode(6, x, y); }
  explode(x: number, y: number, big = 1) {
    this.boom.explode(Math.round(22 * big), x, y);
    const r = this.scene.add.sprite(x, y, 'fx_boom', 0).setDepth(21).setScale(big * (0.88 + Math.random() * 0.28)).setFlipX(Math.random() < 0.5).setAngle((Math.random() - 0.5) * 40); // per-boom variation
    r.play('fx_boom'); r.once('animationcomplete', () => r.destroy());
    this.hitStop(70); this.shake(160, 0.006 * big);
  }
  /** sheet dust / landing puffs — prefers fx_dust* then spark/petal; soft lands use n~3, hard ~8 */
  dustLand(x: number, y: number, hard = false) {
    const s = this.scene, n = hard ? 8 : 3;
    const keys = ['fx_dust0', 'fx_dust1', 'fx_dust2', 'l2f_13', 'l2f_24', 'spark', 'petal'].filter(k => s.textures.exists(k));
    if (!keys.length) { this.spark(x, y); return; }
    for (let i = 0; i < n; i++) {
      const d = i < n / 2 ? -1 : 1, k = keys[i % keys.length];
      const im = s.add.image(x + d * (2 + Math.random() * 5), y - 1 - Math.random() * 2, k)
        .setDepth(9).setAlpha(hard ? 0.85 : 0.55).setScale(hard ? 0.45 : 0.28).setTint(0xe8dcc8);
      if (k.startsWith('fx_dust') || k.startsWith('l2f')) im.setBlendMode(Phaser.BlendModes.NORMAL);
      else im.setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: im, x: im.x + d * (16 + Math.random() * 18), y: im.y - 6 - Math.random() * 10,
        alpha: 0, scale: hard ? 0.15 : 0.08, angle: (Math.random() - 0.5) * 40, duration: 280 + Math.random() * 160, ease: 'Quad.out', onComplete: () => im.destroy() });
    }
    if (hard) this.shake(70, 0.0024);
  }
  /** pickup / flower sparkle burst from sheet FX (petal + spark + flash) */
  sparkle(x: number, y: number, tint = 0xffd6f0) {
    const s = this.scene;
    this.sparks.explode(10, x, y);
    const keys = ['petal', 'spark', 'spark2', 'flash'].filter(k => s.textures.exists(k));
    for (let i = 0; i < 7; i++) {
      const k = keys[i % keys.length] || 'spark';
      const a = (Math.PI * 2 * i) / 7 + Math.random() * 0.3;
      const im = s.add.image(x, y - 4, k).setBlendMode(Phaser.BlendModes.ADD).setTint(tint).setDepth(12)
        .setScale(0.35 + Math.random() * 0.25).setAngle(Math.random() * 360);
      s.tweens.add({ targets: im, x: x + Math.cos(a) * (18 + Math.random() * 16), y: y - 4 + Math.sin(a) * (14 + Math.random() * 12) - 8,
        alpha: 0, scale: 0.05, angle: im.angle + 90, duration: 320 + Math.random() * 140, ease: 'Cubic.out', onComplete: () => im.destroy() });
    }
    const ring = s.add.ellipse(x, y - 4, 8, 8).setStrokeStyle(2, tint).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: ring, scale: 4.5, alpha: 0, duration: 340, onComplete: () => ring.destroy() });
  }
}
