import { audio } from '../audio/Audio';
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
        this.st = 'tele'; this.stT = this.next === 'charge' ? 0.8 : 0.6; this.b.setVelocity(0, 0); this.windup(this.next, px, py, this.stT);
      }
    } else if (this.st === 'tele') {
      const on = Math.floor(this.stT * 14) % 2 === 0; if (on) this.setTint(this.next === 'charge' ? 0xff4040 : 0xffb040); else this.clearTint();
      this.x += Math.sin(this.t * 90) * 0.6;
      if (this.next === 'charge') this.x -= (px > this.x ? 1 : -1) * 22 * dt; /* rear back before the charge */
      if (this.next === 'ring') this.setAngle(this.angle + 900 * dt * (1 - this.stT / 0.6)); /* spin-up */
      if (this.next === 'spread') this.y -= 10 * dt;
      if (this.stT <= 0) { this.clearTint(); if (this.next === 'ring') this.setAngle(0); this.fire(px, py); }
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
  /** per-attack telegraph visuals: spread = aim lines, charge = red streak + rear-back, ring = converging ring + spin, summon = portal glows */
  windup(k: string, px: number, py: number, sec: number) {
    const s = this.scene, ms = sec * 1000, ADD = Phaser.BlendModes.ADD;
    if (k === 'spread') { const a = Math.atan2(py - this.y, px - this.x), n = this.phase === 1 ? 3 : 5;
      for (let i = 0; i < n; i++) { const t = a + (i - (n - 1) / 2) * 0.28; const l = s.add.line(0, 0, this.x, this.y + 6, this.x + Math.cos(t) * 160, this.y + 6 + Math.sin(t) * 160, 0xffb040, 0.0).setOrigin(0).setLineWidth(1).setDepth(7).setBlendMode(ADD);
        s.tweens.add({ targets: l, alpha: { from: 0.1, to: 0.8 }, duration: ms, onComplete: () => l.destroy() }); } }
    else if (k === 'charge') { const d = px > this.x ? 1 : -1; const r = s.add.rectangle(this.x + d * 120, this.y, 240, 4, 0xff3040, 0.5).setDepth(7).setBlendMode(ADD);
      s.tweens.add({ targets: r, scaleY: { from: 0.3, to: 2.2 }, alpha: { from: 0.15, to: 0.6 }, duration: ms, yoyo: false, onComplete: () => r.destroy() });
      s.tweens.add({ targets: this, scaleX: 0.9, scaleY: 1.1, duration: ms * 0.8, yoyo: true }); }
    else if (k === 'ring') { const c = s.add.circle(this.x, this.y, 46).setStrokeStyle(2, 0xff4fd8).setFillStyle().setDepth(9).setBlendMode(ADD);
      s.tweens.add({ targets: c, radius: 6, alpha: { from: 0.3, to: 1 }, duration: ms, ease: 'Cubic.in', onUpdate: () => c.setPosition(this.x, this.y), onComplete: () => c.destroy() }); }
    else if (k === 'summon') for (const dx of [-30, 30]) { const g = s.add.image(this.x + dx, this.y, 'glow').setTint(0x9a5cff).setBlendMode(ADD).setDepth(9).setScale(0.2);
      s.tweens.add({ targets: g, scale: 1.4, alpha: { from: 1, to: 0.4 }, duration: ms, ease: 'Sine.inOut', onComplete: () => g.destroy() }); }
  }
  die() { // slow-mo, flashes, chained explosions, collapse, then the real destroy
    if (this.st === 'dying') return; this.st = 'dying'; this.dead = true; this.b.setVelocity(0, 0); this.b.enable = false; this.emit('dying', this);
    const sc = this.scene; let n = 0; this.clearTint();
    // slow-mo for the first ~1.2s (physics/tweens/anims), always restored
    const w = (sc.physics as any).world; const slow = (on: boolean) => { if (!sc.sys.isActive()) return; w.timeScale = on ? 2.5 : 1; sc.tweens.timeScale = on ? 0.4 : 1; sc.anims.globalTimeScale = on ? 0.4 : 1; };
    slow(true); sc.time.delayedCall(1200, () => slow(false)); sc.events.once('shutdown', () => { w.timeScale = 1; sc.tweens.timeScale = 1; sc.anims.globalTimeScale = 1; });
    sc.cameras.main.flash(120, 255, 255, 255); this.fx.shake(300, 0.006);
    // collapse: sags, tilts and sinks while it burns
    sc.tweens.add({ targets: this, y: this.y + 26, angle: (this.flipX ? 1 : -1) * 28, scaleY: 0.85, duration: 1400, ease: 'Quad.in' });
    sc.time.addEvent({ delay: 140, repeat: 9, callback: () => { n++; audio.sfx('explode', { rate: n === 10 ? 0.6 : 1 }); this.fx.explode(this.x + Phaser.Math.Between(-24, 24), this.y + Phaser.Math.Between(-16, 16), n === 10 ? 2 : 0.8);
      this.setTintFill(n % 2 ? 0xffffff : 0xff6040); if (n === 10) { sc.cameras.main.flash(260, 255, 240, 250); this.fx.shake(400, 0.012); this.emit('destroyed', this); this.destroy(); } } });
  }
}
