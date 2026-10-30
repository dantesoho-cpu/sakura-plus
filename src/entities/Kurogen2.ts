import Phaser from 'phaser';
import { audio } from '../audio/Audio';
import { Enemy } from './Enemy';
import type { Fx } from '../systems/Fx';
import type { Blaster } from '../weapons/Blaster';
// Round 11 Kurogen units.
/** Wasp bomber: patrols high; when Sakura passes beneath it hovers over her and drops arcing plasma bombs. */
export class WaspBomber extends Enemy {
  kind = 'wasp'; home: Phaser.Math.Vector2; dropT = 1.2; dropped = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster) {
    super(s, x, y - 40, 'e_wasp', 2, fx); this.home = new Phaser.Math.Vector2(x, y - 40); this.b.setAllowGravity(false); this.b.setSize(24, 14).setOffset(5, 6); this.setOrigin(0.5, 1); this.eyeX = 5; this.eyeY = 0.55; this.play('wasp_fly');
  }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead || this.hitT > 0) return;
    const near = Math.abs(px - this.x) < 170 && py > this.y - 20 && py - this.y < 200; let tx = this.home.x + Math.sin(this.t * 0.9) * 40, ty = this.home.y + Math.sin(this.t * 2) * 5;
    if (near) { tx = px + Math.sin(this.t * 1.7) * 24; ty = Math.min(this.home.y + 10, py - 86); this.dropT -= dt;
      if (this.dropT < 0.3 && this.dropT + dt >= 0.3) { this.telegraph(0.3); this.play('wasp_drop', true); }
      if (this.dropT <= 0) { this.dropT = 1.7; this.dropped++; this.gun.fireVel(this.x, this.y - 2, this.b.velocity.x * 0.5, 30, { tex: 'eplasma', grav: 260, scale: 0.7, spin: 5, trail: 0xc04fff, life: 3 }); audio.sfx('eshot', { rate: 0.7 }); this.punch(1.15, 0.85); this.play('wasp_fly', true); } }
    this.b.setVelocity(Phaser.Math.Clamp((tx - this.x) * 2.5, -95, 95), Phaser.Math.Clamp((ty - this.y) * 2.5, -80, 80)); this.face(Math.sign(px - this.x) || this.faceDir); this.setAngle(Phaser.Math.Clamp(this.b.velocity.x * 0.12, -12, 12));
  }
  knock(dir: number) { this.b.setVelocity(dir * 140, -40); }
}
/** Sentry sniper: tripod railgun. Sweeps a laser sight onto Sakura, locks (flash), then fires a fast needle along the locked line. */
export class Sentry extends Enemy {
  kind = 'sentry'; st: 'idle' | 'aim' | 'lock' = 'idle'; stT = 1; ang = 0; sight: Phaser.GameObjects.Graphics; shots = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster) {
    super(s, x, y, 'e_sentry', 3, fx); this.setOrigin(0.5, 1); this.b.setAllowGravity(false); this.b.setImmovable(true); this.b.moves = false; this.b.setSize(18, 30).setOffset(6, 4); this.eyeX = -4; this.eyeY = 0.68; this.play('sentry_idle');
    this.sight = s.add.graphics().setDepth(7).setBlendMode(Phaser.BlendModes.ADD); this.once('destroy', () => this.sight.destroy());
  }
  get mx() { return this.x + this.faceDir * 14; } get my() { return this.y - 24; }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); this.sight.clear(); if (this.dead) return;
    const inR = Math.abs(px - this.x) < 260 && Math.abs(py - this.y) < 120; this.stT -= dt;
    const want = Math.atan2(py - this.my, px - this.mx);
    if (this.st === 'idle') { if (inR) this.face(Math.sign(px - this.x)); if (inR && this.stT <= 0 && !this.turning) { this.st = 'aim'; this.stT = 0.9; this.ang = want + this.faceDir * 0.35; this.play('sentry_charge', true); audio.sfx('charge', { rate: 1.6, vol: 0.5 }); } }
    else if (this.st === 'aim') { this.ang += Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - this.ang), -2.4 * dt, 2.4 * dt); this.drawSight(0.5 + 0.3 * Math.sin(this.t * 40), 1); if (this.stT <= 0) { this.st = 'lock'; this.stT = 0.22; this.telegraph(0.22); } }
    else if (this.st === 'lock') { this.drawSight(Math.floor(this.t * 30) % 2 ? 1 : 0.3, 2);
      if (this.stT <= 0) { this.st = 'idle'; this.stT = 1.6; this.shots++; const v = 380; this.gun.fireVel(this.mx, this.my, Math.cos(this.ang) * v, Math.sin(this.ang) * v, { tex: 'eneedle', trail: 0xff3040, life: 2 });
        audio.sfx('eshot2', { rate: 1.5 }); this.fx.spark(this.mx, this.my); this.punch(0.85, 1.1); this.play('sentry_idle', true); } }
  }
  drawSight(a: number, w: number) { const L = 320, g = this.sight; g.lineStyle(w, 0xff2040, a).beginPath().moveTo(this.mx, this.my).lineTo(this.mx + Math.cos(this.ang) * L, this.my + Math.sin(this.ang) * L).strokePath(); g.fillStyle(0xff8080, a).fillRect(this.mx - 1, this.my - 1, 3, 3); }
  knock() { /* bolted down */ }
}
/** Shield trooper: advances behind a hard-light shield. Front hits from normal shots are deflected; hit it from behind, with a tier-3 lance, or the beam. */
export class ShieldTrooper extends Enemy {
  kind = 'trooper'; fireT = 1.5; blocked = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster) {
    super(s, x, y, 'e_trooper', 4, fx); this.setOrigin(0.5, 1); this.b.setSize(20, 30).setOffset(4, 2); this.eyeX = 3; this.eyeY = 0.7; this.play('trooper_idle'); this.faceDir = -1; this.setFlipX(true);
  }
  hit(dmg: number, dir: number, beam = false) {
    if (!this.dead && !beam && dmg < 2 && dir === -this.faceDir && !this.turning) { this.blocked++; audio.sfx('ehit', { rate: 1.8 }); const sx = this.x + this.faceDir * 12, sy = this.y - 16;
      for (let i = 0; i < 6; i++) { const r = this.scene.add.rectangle(sx, sy + (Math.random() - 0.5) * 16, 2, 2, i % 2 ? 0x9ff0ff : 0xffffff).setDepth(11).setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({ targets: r, x: sx + this.faceDir * (8 + Math.random() * 14), y: r.y + (Math.random() - 0.5) * 18, alpha: 0, duration: 220, onComplete: () => r.destroy() }); }
      this.setTint(0x9ff0ff); this.scene.time.delayedCall(60, () => { if (!this.dead) this.clearTint(); }); return; }
    super.hit(dmg, dir);
  }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return; this.b.setVelocityY(this.b.velocity.y + 1100 * dt); if (this.hitT > 0) return;
    const sees = Math.abs(py - this.y) < 40 && Math.abs(px - this.x) < 180, d = Math.sign(px - this.x) || this.faceDir;
    if (sees) { this.face(d); const far = Math.abs(px - this.x) > 70; const sol = (this.scene as any).solid, edge = sol && this.b.blocked.down && !sol.getTileAtWorldXY(this.x + this.faceDir * 12, this.y + 4)?.collides; this.b.setVelocityX(this.turning || !far || edge ? 0 : this.faceDir * 28); this.play(far && !this.turning ? 'trooper_walk' : 'trooper_idle', true);
      if ((this.fireT -= dt) <= 0 && !this.turning) { this.fireT = 2.2; for (let i = 0; i < 3; i++) this.scene.time.delayedCall(i * 110, () => { if (!this.dead) { this.gun.fireVel(this.x + this.faceDir * 16, this.y - 20, this.faceDir * 200, 0, { tex: 'eneedle', trail: 0xff8f3f, life: 2 }); audio.sfx('eshot', { rate: 1.4 }); } }); } }
    else { const sol = (this.scene as any).solid, edge = sol && this.b.blocked.down && !sol.getTileAtWorldXY(this.x + this.faceDir * 12, this.y + 4)?.collides; if (this.b.blocked.left || this.b.blocked.right || edge) this.face(-this.faceDir); this.b.setVelocityX(this.turning ? 0 : this.faceDir * 18); this.play('trooper_walk', true); }
  }
  knock(dir: number) { this.b.setVelocityX(dir * 60); }
}
