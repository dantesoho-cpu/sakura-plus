import Phaser from 'phaser';
import { Enemy } from './Enemy';
import type { Fx } from '../systems/Fx';
import type { Blaster } from '../weapons/Blaster';
// Scout drone: hovers on a sine path, swoops at player when close.
export class ScoutDrone extends Enemy {
  home: Phaser.Math.Vector2; kind = 'drone'; engaged = false;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx) {
    super(s, x, y, 'e_drone', 2, fx); this.home = new Phaser.Math.Vector2(x, y); this.b.setAllowGravity(false); this.b.setSize(24, 14).setOffset(6, 6); this.setOrigin(0.5, 1); this.play('drone_idle');
  }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return;
    const near0 = Math.abs(px - this.x) < 110 && Math.abs(py - this.y) < 90;
    if (near0 && !this.engaged) { this.engaged = true; this.telegraph(0.4); } if (!near0) this.engaged = false;
    if (this.teleT > 0) { this.b.setVelocity(0, -8); this.play('drone_attack', true); return; }
    const near = near0;
    const tx = near ? px : this.home.x + Math.sin(this.t * 1.2) * 30, ty = near ? py + 2 : this.home.y + Math.sin(this.t * 2.4) * 8;
    this.b.setVelocity(Phaser.Math.Clamp((tx - this.x) * 2, -70, 70), Phaser.Math.Clamp((ty - this.y) * 2, -60, 60));
    this.setFlipX(px > this.x); this.setAngle(Phaser.Math.Clamp(this.b.velocity.x * 0.15, -12, 12)); this.play(near ? 'drone_attack' : 'drone_idle', true);
  }
  knock(dir: number) { this.b.setVelocity(dir * 70, -20); }
}
// Ground bot: patrols, charges when player is level and close.
export class GroundBot extends Enemy {
  dir = -1; kind = 'bot'; engaged = false;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx) { super(s, x, y, 'e_bot', 3, fx); this.setOrigin(0.5, 1); this.b.setSize(18, 30).setOffset(2, 2); this.play('bot_idle'); }
  knockT = 0;
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return;
    this.b.setVelocityY(this.b.velocity.y + 1100 * dt);
    if (this.knockT > 0) { this.knockT -= dt; return; }
    if (this.b.blocked.left) this.dir = 1; if (this.b.blocked.right) this.dir = -1;
    const charge = Math.abs(py - this.y) < 24 && Math.abs(px - this.x) < 120;
    if (charge && !this.engaged) { this.engaged = true; this.telegraph(0.35); } if (!charge) this.engaged = false;
    if (this.teleT > 0) { this.b.setVelocityX(0); this.setFlipX(px > this.x); this.play('bot_attack', true); return; }
    if (charge) this.dir = Math.sign(px - this.x) || this.dir;
    this.b.setVelocityX(this.dir * (charge ? 85 : 35)); this.setFlipX(this.dir > 0); this.play(charge ? 'bot_attack' : 'bot_idle', true);
  }
  knock(dir: number) { this.b.setVelocityX(dir * 120); this.knockT = 0.12; }
}
// Turret: fixed, fires bolts at the player when in range.
export class Turret extends Enemy {
  kind = 'turret'; fireT = 1;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster) {
    super(s, x, y, 'e_turret', 4, fx); this.setOrigin(0.5, 1); this.b.setAllowGravity(false); this.b.setImmovable(true); this.b.moves = false; this.b.setSize(23, 27).setOffset(2, 3); this.play('turret_idle');
  }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return;
    const inRange = Math.abs(px - this.x) < 200 && Math.abs(py - this.y) < 60; this.setFlipX(px < this.x);
    if (inRange) { this.fireT -= dt; if (this.fireT < 0.35) { if (!this.anims.currentAnim || this.anims.currentAnim.key !== 'turret_attack') { this.play('turret_attack'); this.telegraph(0.35); } }
      if (this.fireT <= 0) { this.fireT = 1.4; const d = px > this.x ? 1 : -1; this.gun.tryFire(this.x + d * 18, this.y - 22, d); }
      else if (this.fireT < 1.0) this.play('turret_idle', true);
    } else { this.fireT = Math.max(this.fireT, 0.6); this.play('turret_idle', true); }
  }
}
