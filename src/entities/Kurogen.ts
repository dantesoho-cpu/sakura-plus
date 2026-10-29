import Phaser from 'phaser';
import { Enemy } from './Enemy';
import type { Fx } from '../systems/Fx';
import type { Blaster } from '../weapons/Blaster';
// Scout drone: hovers on a sine path; when Sakura is near it strafes above her, telegraphs, then dives (lunge) and climbs back.
export class ScoutDrone extends Enemy {
  home: Phaser.Math.Vector2; kind = 'drone'; engaged = false; mode: 'patrol' | 'strafe' | 'tele' | 'dive' | 'recover' = 'patrol'; mT = 0; tgt = new Phaser.Math.Vector2(); rdir = 1;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx) {
    super(s, x, y, 'e_drone', 2, fx); this.home = new Phaser.Math.Vector2(x, y); this.b.setAllowGravity(false); this.b.setSize(24, 14).setOffset(6, 6); this.setOrigin(0.5, 1); this.play('drone_idle');
  }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return;
    const near = Math.abs(px - this.x) < 130 && Math.abs(py - this.y) < 100; this.mT -= dt;
    if (this.hitT > 0) return; // knocked back: let the knock velocity play out
    let tx = this.x, ty = this.y, sp = 70;
    if (this.mode === 'patrol') { tx = this.home.x + Math.sin(this.t * 1.2) * 30; ty = this.home.y + Math.sin(this.t * 2.4) * 8; if (near) { this.mode = 'strafe'; this.mT = 1.2 + Math.random(); } }
    else if (this.mode === 'strafe') { tx = px + Math.sin(this.t * 2.6) * 70; ty = py - 44 + Math.sin(this.t * 5) * 6; sp = 110; if (!near) this.mode = 'patrol'; else if (this.mT <= 0) { this.mode = 'tele'; this.mT = 0.5; this.telegraph(0.5); this.tgt.set(px, py - 4); } }
    else if (this.mode === 'tele') { this.b.setVelocity(-this.faceDir * 20, -25); this.face(Math.sign(px - this.x)); this.play('drone_attack', true); if (this.mT <= 0) { this.mode = 'dive'; this.mT = 0.55; this.punch(1.25, 0.8); } return; }
    else if (this.mode === 'dive') { const d = this.tgt.clone().subtract(new Phaser.Math.Vector2(this.x, this.y)).normalize().scale(220); this.b.setVelocity(d.x, d.y); this.setAngle(Phaser.Math.Clamp(d.x * 0.12, -25, 25)); if (this.mT <= 0 || Phaser.Math.Distance.Between(this.x, this.y, this.tgt.x, this.tgt.y) < 8) { this.mode = 'recover'; this.mT = 0.6; this.rdir = Math.sign(this.x - px) || -this.faceDir; } return; }
    else { tx = this.x + this.rdir * 30; ty = py - 50; sp = 90; if (this.mT <= 0) { this.mode = near ? 'strafe' : 'patrol'; this.mT = 1.4 + Math.random(); } }
    this.b.setVelocity(Phaser.Math.Clamp((tx - this.x) * 3, -sp, sp), Phaser.Math.Clamp((ty - this.y) * 3, -sp, sp));
    if (this.mode === 'recover') this.face(-this.rdir); /* backs away (locked dir) while still facing the player: no flip jitter */ else this.face(Math.sign(px - this.x) || this.faceDir); this.setAngle(Phaser.Math.Clamp(this.b.velocity.x * 0.15, -14, 14)); this.play(this.mode === 'strafe' ? 'drone_attack' : 'drone_idle', true);
  }
  knock(dir: number) { this.b.setVelocity(dir * 150, -60); if (this.mode === 'dive') { this.mode = 'recover'; this.mT = 0.5; this.rdir = dir || 1; } }
}
// Ground bot: patrols (with the odd hop); on sight it turns, crouches (telegraph) then lunges with a hop, recovers, and keeps pressing.
export class GroundBot extends Enemy {
  dir = -1; kind = 'bot'; engaged = false; mode: 'patrol' | 'tele' | 'lunge' | 'recover' | 'press' = 'patrol'; mT = 0; hopT = 2;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx) { super(s, x, y, 'e_bot', 3, fx); this.setOrigin(0.5, 1); this.b.setSize(18, 29).setOffset(2, 0); this.play('bot_idle'); this.faceDir = -1; this.setFlipX(true); }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return;
    this.b.setVelocityY(this.b.velocity.y + 1100 * dt); const onG = this.b.blocked.down; this.mT -= dt;
    if (this.hitT > 0) return;
    const sees = Math.abs(py - this.y) < 28 && Math.abs(px - this.x) < 130, toP = Math.sign(px - this.x) || this.dir;
    if (this.mode === 'patrol') {
      if (this.b.blocked.left) this.dir = 1; if (this.b.blocked.right) this.dir = -1;
      if (onG && (this.hopT -= dt) <= 0) { this.hopT = 1.5 + Math.random() * 2; this.b.setVelocityY(-120); this.punch(1.15, 0.85); }
      if (sees) { this.dir = toP; this.mode = 'tele'; this.mT = 0.45; this.telegraph(0.45); }
    } else if (this.mode === 'tele') { this.dir = toP; this.b.setVelocityX(0); this.face(this.dir); if (!this.turning) this.setScale(1.12, 0.86); this.play('bot_attack', true);
      if (this.mT <= 0 && !this.turning) { this.mode = 'lunge'; this.mT = 0.38; this.setScale(1); this.punch(0.85, 1.2); if (onG) this.b.setVelocityY(-170); } return; }
    else if (this.mode === 'lunge') { this.b.setVelocityX(this.dir * 175); if (this.mT <= 0) { this.mode = 'recover'; this.mT = 0.4; } this.play('bot_attack', true); return; }
    else if (this.mode === 'recover') { this.b.setVelocityX(this.b.velocity.x * Math.pow(0.02, dt)); if (this.mT <= 0) { this.mode = sees ? 'press' : 'patrol'; this.mT = 1.2; } this.play('bot_idle', true); return; }
    else if (this.mode === 'press') { this.dir = toP; if (!sees) this.mode = 'patrol'; else if (this.mT <= 0) { this.mode = 'tele'; this.mT = 0.45; this.telegraph(0.45); } }
    this.face(this.dir);
    // move only in the facing direction, and not mid-turn (no moonwalking)
    this.b.setVelocityX(this.turning ? 0 : this.faceDir * (this.mode === 'press' ? 80 : 35)); this.play(this.mode === 'press' ? 'bot_attack' : 'bot_idle', true);
    this.anims.timeScale = this.turning ? 0 : 1;
  }
  knock(dir: number) { this.b.setVelocity(dir * 150, -90); this.mode = 'recover'; this.mT = 0.35; }
}
// Turret: fixed, fires bolts at the player when in range.
export class Turret extends Enemy {
  kind = 'turret'; fireT = 1;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster) {
    super(s, x, y + 2, 'e_turret', 4, fx); this.setOrigin(0.5, 1); this.b.setAllowGravity(false); this.b.setImmovable(true); this.b.moves = false; this.b.setSize(23, 27).setOffset(2, 3); this.play('turret_idle');
  }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return;
    const inRange = Math.abs(px - this.x) < 200 && Math.abs(py - this.y) < 60; this.face(Math.sign(px - this.x));
    if (inRange) { this.fireT -= dt; if (this.fireT < 0.35) { if (!this.anims.currentAnim || this.anims.currentAnim.key !== 'turret_attack') { this.play('turret_attack'); this.telegraph(0.35); } }
      if (this.fireT <= 0) { this.fireT = 1.4; const d = px > this.x ? 1 : -1; this.gun.tryFire(this.x + d * 18, this.y - 22, d); this.punch(1.2, 0.85, 180); this.fx.spark(this.x + d * 18, this.y - 22); }
      else if (this.fireT < 1.0) this.play('turret_idle', true);
    } else { this.fireT = Math.max(this.fireT, 0.6); this.play('turret_idle', true); }
  }
}
