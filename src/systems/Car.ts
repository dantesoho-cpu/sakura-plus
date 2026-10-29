import Phaser from 'phaser';
// Animated rig for the white retro coupe: body bob/suspension, spinning wheels, glowing lights, exhaust + petal trail.
export class Car extends Phaser.GameObjects.Container {
  body_: Phaser.GameObjects.Image; wheels: Phaser.GameObjects.Image[] = []; head: Phaser.GameObjects.Image; tail: Phaser.GameObjects.Image;
  trail?: Phaser.GameObjects.Particles.ParticleEmitter; smoke?: Phaser.GameObjects.Particles.ParticleEmitter;
  speed = 0; t = Math.random() * 9; lastX = 0; rig: any;
  constructor(s: Phaser.Scene, x: number, y: number, scale = 1) {
    super(s, x, y); s.add.existing(this); const r = this.rig = s.cache.json.get('car_rig'); this.lastX = x;
    // origin: bottom-centre of the body box
    const ox = -r.w / 2, oy = -r.h;
    for (const [wx, wy] of r.wheels) this.wheels.push(s.add.image(ox + wx, oy + wy, 'car_wheel'));
    this.body_ = s.add.image(ox, oy, 'car_body').setOrigin(0, 0);
    this.head = s.add.image(ox + r.head[0] + 4, oy + r.head[1], 'glow').setTint(0xfff3c0).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6);
    this.tail = s.add.image(ox + r.tail[0], oy + r.tail[1], 'glow').setTint(0xff3a6a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.35);
    this.add([...this.wheels, this.body_, this.head, this.tail]); this.setScale(scale);
  }
  /** start exhaust + petal trail (call once the car is in the scene's display list) */
  startTrail(depth: number) {
    const s = this.scene, r = this.rig, sc = this.scale;
    const ex = () => ({ x: this.x + (-r.w / 2 + r.exhaust[0]) * sc, y: this.y + (-r.h + r.exhaust[1]) * sc });
    const p = ex();
    this.smoke = s.add.particles(p.x, p.y, 'px', { lifespan: 600, speedX: { min: -60, max: -20 }, speedY: { min: -14, max: 4 }, scale: { start: 3 * sc, end: 0.5 }, alpha: { start: 0.5, end: 0 }, tint: [0xffffff, 0xd8d0f0], frequency: 40 }).setDepth(depth - 1).setScrollFactor(this.scrollFactorX);
    this.trail = s.add.particles(p.x, p.y, 'petal', { lifespan: 1100, speedX: { min: -110, max: -30 }, speedY: { min: -50, max: 10 }, gravityY: 30, rotate: { min: 0, max: 360 }, scale: { start: 1.3 * sc, end: 0 }, tint: [0xff8fd0, 0xffd6f0, 0xffffff], frequency: 30 }).setDepth(depth - 1).setScrollFactor(this.scrollFactorX);
    s.events.on('update', () => { if (!this.active) return; const q = ex(); this.smoke!.setPosition(q.x, q.y); this.trail!.setPosition(q.x, q.y); });
  }
  stopTrail() { this.smoke?.stop(); this.trail?.stop(); }
  preUpdate(_t: number, dms: number) {
    const dt = dms / 1000; this.t += dt; const vx = (this.x - this.lastX) / Math.max(dt, 1e-3); this.lastX = this.x; this.speed += (vx - this.speed) * Math.min(1, dt * 8);
    const r = this.rig, moving = Math.min(1, Math.abs(this.speed) / 60);
    for (const w of this.wheels) w.rotation += (this.speed / this.scale) * dt / r.r; // rolling without slip
    // hover/suspension: idle float + faster road bob when driving, body tilts back on acceleration
    this.body_.y = -r.h + Math.sin(this.t * 2.2) * 0.8 * (1 - moving) + Math.sin(this.t * 22) * 0.6 * moving;
    this.body_.rotation = Phaser.Math.Clamp(-this.speed / 9000, -0.04, 0.04);
    const fl = 0.85 + 0.15 * Math.sin(this.t * 13) * Math.sin(this.t * 7.3);
    this.head.setAlpha(fl).y = this.body_.y + r.head[1]; this.tail.setAlpha(0.6 + 0.4 * Math.sin(this.t * 4)).y = this.body_.y + r.tail[1];
  }
}
