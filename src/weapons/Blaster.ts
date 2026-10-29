import Phaser from 'phaser';
// Arm-cannon: pooled projectiles, cooldown, muzzle flash. Walls kill shots (collider set up in scene).
export const BLASTER = { cooldown: 0.16, speed: 380, life: 0.9, damage: 1 };
export class Blaster {
  shots: Phaser.Physics.Arcade.Group; cd = 0; flash: Phaser.GameObjects.Image; fired = 0;
  constructor(public scene: Phaser.Scene, key: string, tex = 'shot', opts: Partial<typeof BLASTER> = {}) {
    Object.assign(this.cfg, opts);
    this.shots = scene.physics.add.group({ allowGravity: false, maxSize: 24 });
    this.flash = scene.add.image(0, 0, 'flash').setDepth(12).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    this.tex = tex; void key;
  }
  cfg = { ...BLASTER }; tex: string;
  update(dt: number) {
    this.cd -= dt;
    this.shots.getChildren().forEach((o: any) => { if (!o.active) return; o.life -= dt; if (o.life <= 0) this.kill(o); });
  }
  tryFire(x: number, y: number, dir: number, vy = 0): boolean {
    if (this.cd > 0) return false;
    const s = this.shots.get(x, y, this.tex) as any; if (!s) return false;
    s.setActive(true).setVisible(true).setDepth(11).setBlendMode(Phaser.BlendModes.ADD); s.body.enable = true; s.body.reset(x, y);
    s.body.setSize(s.width, s.height); s.setRotation(0); s.setFlipX(dir < 0); s.body.setVelocity(dir * this.cfg.speed, vy); s.life = this.cfg.life; s.damage = this.cfg.damage;
    this.cd = this.cfg.cooldown; this.fired++;
    this.flash.setPosition(x, y).setFlipX(dir < 0).setVisible(true).setScale(1);
    this.scene.tweens.killTweensOf(this.flash); this.scene.tweens.add({ targets: this.flash, scale: 0.3, duration: 70, onComplete: () => this.flash.setVisible(false) });
    return true;
  }
  // free-aim shot (boss patterns): ignores cooldown
  fireVel(x: number, y: number, vx: number, vy: number) {
    const s = this.shots.get(x, y, this.tex) as any; if (!s) return;
    s.setActive(true).setVisible(true).setDepth(11).setBlendMode(Phaser.BlendModes.ADD); s.body.enable = true; s.body.reset(x, y);
    s.body.setSize(s.width, s.height); s.setFlipX(vx < 0); s.setRotation(Math.atan2(vy, Math.abs(vx)) * Math.sign(vx || 1)); s.body.setVelocity(vx, vy); s.life = this.cfg.life; s.damage = 1; this.fired++;
  }
  kill(s: any) { s.setActive(false).setVisible(false); s.body.enable = false; s.body.setVelocity(0, 0); }
}
