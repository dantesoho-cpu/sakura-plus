import Phaser from 'phaser';
import { Enemy } from './Enemy';
import type { Fx } from '../systems/Fx';
import type { Blaster } from '../weapons/Blaster';
// Kurogen Enforcer mini-boss. P1 (>66%): hover + telegraphed 3-way spread. P2: + telegraphed horizontal charge.
// P3 (<33%): + radial 8-bolt ring and drone summons (max 2). Telegraph = flashing tint + shake; no knockback.
export const BOSS_HP = 30;
type St = 'idle' | 'hover' | 'tele' | 'charge' | 'dying';
export class Enforcer extends Enemy {
  kind = 'boss'; maxHp = BOSS_HP; st: St = 'idle'; stT = 1.2; next = 'spread'; cx: number; gy: number; chargeDir = 1; awake = false;
  summon: (x: number, y: number) => void = () => {}; attacks: string[] = [];
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster) {
    super(s, x, y, 'boss', BOSS_HP, fx); this.cx = x; this.gy = y; this.b.setAllowGravity(false); this.b.setSize(44, 30).setOffset(8, 8);
    this.setOrigin(0.5, 0.5); this.setDepth(8); this.play('boss_idle'); this.contactDamage = 1;
  }
  get phase() { return this.hp > this.maxHp * 0.66 ? 1 : this.hp > this.maxHp * 0.33 ? 2 : 3; }
  knock() {}
  reset() { this.hp = this.maxHp; this.st = 'idle'; this.stT = 1.2; this.awake = false; this.setPosition(this.cx, this.gy); this.b.setVelocity(0, 0); this.clearTint(); }
  hit(dmg: number, dir: number) { if (!this.awake || this.st === 'dying') return; super.hit(dmg, dir); }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead || !this.awake || this.st === 'dying') return;
    this.stT -= dt; this.setFlipX(px > this.x);
    if (this.st === 'idle' || this.st === 'hover') {
      const tx = this.cx + Math.sin(this.t * 0.9) * 120, ty = this.gy + Math.sin(this.t * 2.1) * 14;
      this.b.setVelocity(Phaser.Math.Clamp((tx - this.x) * 2.2, -110, 110), Phaser.Math.Clamp((ty - this.y) * 2.2, -80, 80));
      if (this.stT <= 0) { // choose + telegraph
        const opts = ['spread', ...(this.phase >= 2 ? ['charge'] : []), ...(this.phase >= 3 ? ['ring', 'summon'] : [])];
        this.next = opts[Math.floor(Math.random() * opts.length)]; if (this.attacks.length < 3) this.next = opts[this.attacks.length % opts.length];
        this.st = 'tele'; this.stT = this.next === 'charge' ? 0.8 : 0.6; this.b.setVelocity(0, 0);
      }
    } else if (this.st === 'tele') {
      const on = Math.floor(this.stT * 14) % 2 === 0; if (on) this.setTint(this.next === 'charge' ? 0xff4040 : 0xffb040); else this.clearTint();
      this.x += Math.sin(this.t * 90) * 0.6;
      if (this.stT <= 0) { this.clearTint(); this.fire(px, py); }
    } else if (this.st === 'charge') {
      this.b.setVelocity(this.chargeDir * 300, 0); this.setAngle(this.chargeDir * 8);
      if (this.stT <= 0 || Math.abs(this.x - this.cx) > 330) { this.setAngle(0); this.st = 'hover'; this.stT = 1.0; }
    }
  }
  fire(px: number, py: number) {
    this.attacks.push(this.next); const rest = this.phase === 3 ? 0.8 : this.phase === 2 ? 1.1 : 1.5;
    this.st = 'hover'; this.stT = rest;
    if (this.next === 'spread') {
      const a = Math.atan2(py - this.y, px - this.x), n = this.phase === 1 ? 3 : 5;
      for (let i = 0; i < n; i++) { const t = a + (i - (n - 1) / 2) * 0.28; this.gun.fireVel(this.x, this.y + 6, Math.cos(t) * 150, Math.sin(t) * 150); }
    } else if (this.next === 'charge') {
      this.chargeDir = px > this.x ? 1 : -1; this.y = Phaser.Math.Clamp(py - 12, this.gy, this.gy + 70); this.st = 'charge'; this.stT = 1.1; this.fx.shake(200, 0.004);
    } else if (this.next === 'ring') {
      for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2 + this.t; this.gun.fireVel(this.x, this.y, Math.cos(t) * 120, Math.sin(t) * 120); }
    } else if (this.next === 'summon') { this.summon(this.x - 30, this.y); this.summon(this.x + 30, this.y); }
  }
  die() { // chained explosions, then the real destroy
    if (this.st === 'dying') return; this.st = 'dying'; this.dead = true; this.b.setVelocity(0, 0); this.b.enable = false; this.emit('dying', this);
    const sc = this.scene; let n = 0;
    sc.time.addEvent({ delay: 140, repeat: 9, callback: () => { n++; this.fx.explode(this.x + Phaser.Math.Between(-24, 24), this.y + Phaser.Math.Between(-16, 16), n === 10 ? 2 : 0.8);
      this.setTintFill(n % 2 ? 0xffffff : 0xff6040); if (n === 10) { this.emit('destroyed', this); this.destroy(); } } });
  }
}
