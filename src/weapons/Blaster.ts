import Phaser from 'phaser';
export type ShotOpts = { tex?: string; home?: () => [number, number]; turn?: number; grav?: number; wave?: [number, number]; spin?: number; trail?: number; life?: number; scale?: number; pulse?: boolean };
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
    this.now += dt; this.rapid = Math.max(0, this.rapid - dt);
    this.shots.getChildren().forEach((o: any) => { if (!o.active) return; o.life -= dt; o.age = (o.age || 0) + dt; if (o.life <= 0) { this.kill(o); return; }
      const eo = o.eo as ShotOpts | undefined;
      if (eo && !o.tier) { const b = o.body; let vx = b.velocity.x, vy = b.velocity.y;
        if (eo.grav) vy += eo.grav * dt;
        if (eo.home && o.age > 0.15) { const [tx, ty] = eo.home(); const sp = Math.hypot(vx, vy), cur = Math.atan2(vy, vx), want = Math.atan2(ty - o.y, tx - o.x); let d = Phaser.Math.Angle.Wrap(want - cur); const tr = (eo.turn || 2.2) * dt; d = Phaser.Math.Clamp(d, -tr, tr); vx = Math.cos(cur + d) * sp; vy = Math.sin(cur + d) * sp; }
        if (eo.wave) vy = o.bvy + eo.wave[0] * eo.wave[1] * Math.cos(o.age * eo.wave[1]);
        b.setVelocity(vx, vy); if (eo.spin) o.rotation += eo.spin * dt; else o.setRotation(Math.atan2(vy, vx));
        if (eo.pulse) o.setScale((eo.scale || 1) * (1 + 0.15 * Math.sin(o.age * 30)));
        if (eo.trail && (o.trT -= dt) <= 0) { o.trT = 0.03; const t = this.scene.add.rectangle(o.x, o.y, 2, 2, eo.trail).setDepth(10.8).setBlendMode(Phaser.BlendModes.ADD);
          this.scene.tweens.add({ targets: t, alpha: 0, scale: 0.3, x: t.x + (Math.random() - 0.5) * 4, y: t.y + (Math.random() - 0.5) * 4, duration: 260, onComplete: () => t.destroy() }); } }
      if (o.tier === 2) o.setScale(1, 1 + 0.25 * Math.sin(o.age * 60));
      if (o.tier === 3) { o.setScale(1 + 0.12 * Math.sin(o.age * 50), 1 + 0.18 * Math.sin(o.age * 50 + 1));
        if ((o.trT = (o.trT || 0) - dt) <= 0) { o.trT = 0.025; const g = this.scene.add.image(o.x, o.y, 'shot3').setFlipX(o.flipX).setBlendMode(Phaser.BlendModes.ADD).setDepth(10.9).setAlpha(0.5).setTint(0x7f4fff);
          this.scene.tweens.add({ targets: g, alpha: 0, scaleX: 0.5, scaleY: 0.3, duration: 160, onComplete: () => g.destroy() }); } } });
  }
  /** 3-tap combo: tier 1 dart, tier 2 helix bolt, tier 3 heavy plasma lance (2 dmg, pierces one). */
  tier = 0; lastT = -9; now = 0; rapid = 0;
  tryFire(x: number, y: number, dir: number, vy = 0, combo = false): boolean {
    if (this.cd > 0) return false;
    let tex = this.tex, tier = 0;
    if (combo) { this.tier = this.now - this.lastT < 0.55 ? (this.tier % 3) + 1 : 1; this.lastT = this.now; tier = this.tier; tex = 'shot' + tier; }
    const s = this.shots.get(x, y, tex) as any; if (!s) return false; s.setTexture(tex); s.eo = null; s.tier = tier; s.pierce = tier === 3 ? 1 : 0; s.age = 0;
    s.setActive(true).setVisible(true).setDepth(11).setBlendMode(Phaser.BlendModes.ADD); s.body.enable = true; s.body.reset(x, y);
    s.body.setSize(s.width, s.height); s.setRotation(0); s.setFlipX(dir < 0); s.body.setVelocity(dir * this.cfg.speed, vy); s.life = this.cfg.life; s.damage = tier === 3 ? 2 : this.cfg.damage;
    if (tier) { s.body.setVelocity(dir * this.cfg.speed * [1, 1, 1.1, 0.9][tier], vy); s.setScale(1); s.setAlpha(1); }
    this.cd = tier ? [0, 0.12, 0.13, 0.24][tier] * (this.rapid > 0 ? 0.6 : 1) : this.cfg.cooldown; this.fired++;
    if (tier) this.muzzle(x, y, dir, tier);
    this.flash.setPosition(x, y).setFlipX(dir < 0).setVisible(true).setScale(1);
    this.scene.tweens.killTweensOf(this.flash); this.scene.tweens.add({ targets: this.flash, scale: 0.3, duration: 70, onComplete: () => this.flash.setVisible(false) });
    return true;
  }
  muzzle(x: number, y: number, dir: number, tier: number) {
    const sc = this.scene, col = [0, 0x3ff3ff, 0xff4fd8, 0xffd23f][tier];
    this.flash.setTint(col);
    if (tier >= 2) { const r = sc.add.ellipse(x + dir * 2, y, 4, 4).setStrokeStyle(tier === 3 ? 2 : 1, col).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
      sc.tweens.add({ targets: r, scaleX: tier === 3 ? 3 : 2, scaleY: tier === 3 ? 6 : 4, alpha: 0, duration: 180, onComplete: () => r.destroy() }); }
    if (tier === 3) { sc.cameras.main.shake(60, 0.003);
      for (let i = 0; i < 6; i++) { const p = sc.add.rectangle(x, y, 2, 2, i % 2 ? 0xffd23f : 0xff4fd8).setDepth(12).setBlendMode(Phaser.BlendModes.ADD); const a = (Math.random() - 0.5) * 1.6;
        sc.tweens.add({ targets: p, x: x + dir * Math.cos(a) * (14 + Math.random() * 12), y: y + Math.sin(a) * 14, alpha: 0, duration: 200, onComplete: () => p.destroy() }); } }
  }
  // free-aim shot (enemy / boss patterns): ignores cooldown. Optional behaviours: homing, gravity, sine wave, spin, trail.
  fireVel(x: number, y: number, vx: number, vy: number, o: ShotOpts = {}) {
    const tex = o.tex || this.tex, s = this.shots.get(x, y, tex) as any; if (!s) return null; s.setTexture(tex);
    s.setActive(true).setVisible(true).setDepth(11).setBlendMode(o.tex ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD).setScale(o.scale || 1).setAlpha(1); s.body.enable = true; s.body.reset(x, y);
    s.body.setSize(s.width * 0.7, s.height * 0.7); s.setFlipX(false); s.setRotation(Math.atan2(vy, vx)); s.body.setVelocity(vx, vy); s.life = o.life || this.cfg.life; s.damage = 1; this.fired++;
    s.tier = 0; s.age = 0; s.eo = o; s.bvy = vy; s.trT = 0; return s;
  }
  kill(s: any) { s.setActive(false).setVisible(false); s.body.enable = false; s.body.setVelocity(0, 0); }
}
