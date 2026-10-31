import Phaser from 'phaser';
// Hit-stop, screenshake, explosions. Hit-stop freezes physics + tweens + anims for a few ms.
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
    const r = this.scene.add.sprite(x, y, 'fx_boom', 0).setDepth(21).setScale(big);
    r.play('fx_boom'); r.once('animationcomplete', () => r.destroy());
    this.hitStop(70); this.shake(160, 0.006 * big);
  }
}
