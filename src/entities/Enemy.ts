import { FEEL } from '../tuning';
import { audio } from '../audio/Audio';
import Phaser from 'phaser';
import type { Fx } from '../systems/Fx';
// Base Kurogen unit: HP, hit-flash, knockback, destroy explosion.
export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number; flashT = 0; dead = false; kind = 'enemy'; contactDamage = 1; t = 0;
  constructor(scene: Phaser.Scene, x: number, y: number, tex: string, hp: number, public fx: Fx) {
    super(scene, x, y, tex, 0); scene.add.existing(this); scene.physics.add.existing(this); this.hp = hp; this.setDepth(8);
    this.aura = scene.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff2a3a).setDepth(9).setAlpha(0.4);
    this.tele = scene.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff3050).setDepth(9).setVisible(false);
  }
  aura: Phaser.GameObjects.Image; tele: Phaser.GameObjects.Image; teleT = 0; eyeY = 0.55; eyeX = 0;
  /** Attack telegraph: blinking red warning glow + ring for `sec` seconds. */
  telegraph(sec: number) {
    this.teleT = sec; const r = this.scene.add.circle(this.x, this.y - this.height * this.eyeY, 4).setStrokeStyle(1.5, 0xff4060).setFillStyle().setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: r, radius: 22, alpha: 0, duration: sec * 1000, onComplete: () => r.destroy() });
  }
  get b() { return this.body as Phaser.Physics.Arcade.Body; }
  hit(dmg: number, dir: number) {
    if (this.dead) return; audio.sfx('ehit'); this.hp -= dmg; this.flashT = FEEL.ehit.flash; this.setTintFill(0xffffff);
    this.fx.spark(this.x - dir * 4, this.y - this.height / 2); this.knock(dir); this.hitT = 0.18; this.punch(0.8, 1.18, 160); this.jolt(dir);
    if (this.hp <= 0) this.die(); else this.fx.hitStop(FEEL.ehit.stop);
  }
  /** hurt animation: drones spin-wobble, turrets recoil-shake (others: no-op besides flash/punch) */
  wob = 0; wobT = 0;
  jolt(dir: number) { if (this.dead || this.hp <= 0) return; const s = this.scene;
    if (this.kind === 'drone') { this.wob = dir * 45; this.wobT = 0; }
    else if (this.kind === 'turret') { const x0 = this.x; s.tweens.add({ targets: this, x: { from: x0 + dir * 3, to: x0 }, duration: 220, ease: 'Bounce.out' }); } }
  knock(dir: number) { if (this.b.moves) this.b.setVelocityX(dir * FEEL.ehit.knock); }
  /** Facing (+1 = right; sheets face right). Turning plays a quick squash-flip and blocks movement while it runs. */
  faceDir = 1; hitT = 0; turning = false; baseSX = 1;
  face(d: number) {
    if (!d || d === this.faceDir || this.turning || this.dead) return; this.turning = true; this.faceDir = d;
    this.scene.tweens.add({ targets: this, scaleX: 0.15, scaleY: 1.08, duration: 70, ease: 'Quad.in', onComplete: () => { if (this.dead) return; this.setFlipX(d < 0);
      this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 90, ease: 'Back.out', onComplete: () => { this.turning = false; } }); } });
  }
  punch(sx: number, sy: number, ms = 140) { if (this.turning || this.dead) return; this.scene.tweens.killTweensOf(this); this.setScale(sx, sy); this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: ms, ease: 'Quad.out' }); }
  die() {
    this.dead = true; audio.sfx('explode'); this.aura.destroy(); this.tele.destroy(); this.debris(); this.fx.explode(this.x, this.y - this.height / 2, this.kind === 'turret' ? 1.3 : 1);
    this.b.enable = false; this.clearTint(); this.setAngle(0);
    const d = this.scene.add.sprite(this.x, this.y, 'e_boom', 0).setOrigin(0.5, 1).setDepth(9).setFlipX(this.flipX); d.play('e_destroy');
    const sc = this.scene; d.once('animationcomplete', () => sc.tweens.add({ targets: d, alpha: 0, duration: 200, onComplete: () => d.destroy() })); this.emit('destroyed', this); this.destroy();
  }
  /** Hi-bit destruction: white flash, shockwave rings, tumbling hull debris, smoke puffs. */
  debris() {
    const s = this.scene, cx = this.x, cy = this.y - this.height / 2;
    const fl = s.add.image(cx, cy, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(2.2).setDepth(11);
    s.tweens.add({ targets: fl, scale: 0.2, alpha: 0, duration: 180, onComplete: () => fl.destroy() });
    [0xffffff, 0xff4fd8].forEach((c, i) => { const r = s.add.circle(cx, cy, 3).setStrokeStyle(2 - i * 0.5, c).setFillStyle().setDepth(11).setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: r, radius: 26 + i * 10, alpha: 0, duration: 320 + i * 120, ease: 'Cubic.easeOut', onComplete: () => r.destroy() }); });
    const cols = [0x3a3448, 0x5a5468, 0x8a8498, 0xff3040, 0x2a2436];
    for (let i = 0; i < 10; i++) { const d = s.add.rectangle(cx, cy, 2 + (i % 3), 2 + ((i + 1) % 2) * 2, cols[i % cols.length]).setDepth(10);
      const a = -Math.PI * (0.1 + 0.8 * Math.random()), v = 60 + Math.random() * 90, vx = Math.cos(a) * v, vy = Math.sin(a) * v;
      s.tweens.addCounter({ from: 0, to: 1, duration: 600 + Math.random() * 300, onUpdate: tw => { const t = tw.getValue() as number * 0.9; d.setPosition(cx + vx * t, cy + vy * t + 260 * t * t).setAngle(t * 720); d.setAlpha(1 - t); }, onComplete: () => d.destroy() }); }
    for (let i = 0; i < 4; i++) { const p = s.add.image(cx + (Math.random() - 0.5) * 14, cy, 'glow').setTint(0x403a50).setAlpha(0.7).setScale(0.5).setDepth(10);
      s.tweens.add({ targets: p, y: cy - 20 - Math.random() * 14, scale: 1.4, alpha: 0, duration: 700 + i * 120, delay: 80 + i * 40, onComplete: () => p.destroy() }); }
  }
  tick(dt: number, _px: number, _py: number) {
    this.t += dt; if (this.wob) { this.wobT += dt; this.wob *= Math.pow(0.004, dt); if (Math.abs(this.wob) < 0.5) this.wob = 0; } if (this.hitT > 0) this.hitT -= dt; if (this.flashT > 0 && (this.flashT -= dt) <= 0) this.clearTint();
    const ex = this.x + (this.flipX ? -this.eyeX : this.eyeX), ey = this.y - this.height * this.eyeY;
    if (this.kind === 'boss') this.aura.setVisible(false);
    this.aura.setPosition(ex, ey).setScale(0.45 + 0.15 * Math.sin(this.t * 6)).setAlpha(0.3 + 0.2 * Math.sin(this.t * 6));
    if (this.teleT > 0) { this.teleT -= dt; this.tele.setVisible(Math.floor(this.teleT * 20) % 2 === 0).setPosition(ex, ey).setScale(1.1); this.setTint(Math.floor(this.teleT * 20) % 2 ? 0xff9aa0 : 0xffffff); if (this.teleT <= 0) { this.tele.setVisible(false); this.clearTint(); } }
  }
}
