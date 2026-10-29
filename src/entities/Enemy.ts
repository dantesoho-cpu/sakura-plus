import Phaser from 'phaser';
import type { Fx } from '../systems/Fx';
// Base Kurogen unit: HP, hit-flash, knockback, destroy explosion.
export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number; flashT = 0; dead = false; kind = 'enemy'; contactDamage = 1; t = 0;
  constructor(scene: Phaser.Scene, x: number, y: number, tex: string, hp: number, public fx: Fx) {
    super(scene, x, y, tex, 0); scene.add.existing(this); scene.physics.add.existing(this); this.hp = hp; this.setDepth(8);
  }
  get b() { return this.body as Phaser.Physics.Arcade.Body; }
  hit(dmg: number, dir: number) {
    if (this.dead) return; this.hp -= dmg; this.flashT = 0.08; this.setTintFill(0xffffff);
    this.fx.spark(this.x - dir * 4, this.y - this.height / 2); this.knock(dir);
    if (this.hp <= 0) this.die(); else this.fx.hitStop(35);
  }
  knock(dir: number) { if (this.b.moves) this.b.setVelocityX(dir * 90); }
  die() {
    this.dead = true; this.fx.explode(this.x, this.y - this.height / 2, this.kind === 'turret' ? 1.3 : 1);
    this.b.enable = false; this.clearTint(); this.setAngle(0);
    const d = this.scene.add.sprite(this.x, this.y, 'e_boom', 0).setOrigin(0.5, 1).setDepth(9).setFlipX(this.flipX); d.play('e_destroy');
    const sc = this.scene; d.once('animationcomplete', () => sc.tweens.add({ targets: d, alpha: 0, duration: 200, onComplete: () => d.destroy() })); this.emit('destroyed', this); this.destroy();
  }
  tick(dt: number, _px: number, _py: number) { this.t += dt; if (this.flashT > 0 && (this.flashT -= dt) <= 0) this.clearTint(); }
}
