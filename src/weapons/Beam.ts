import Phaser from 'phaser';
import type { Fx } from '../systems/Fx';
// Charge beam: hold to charge (swirling intake particles, building glow, 2 levels), release to fire a piercing helix beam.
export const BEAM = { start: 0.25, lv1: 0.55, lv2: 1.35, len: 380, dur: [0, 0.5, 0.85], half: [0, 6, 10], dmg: [0, 1, 2], tick: 0.09 };
type Tgt = { dead?: boolean; active: boolean; kind?: string; awake?: boolean; getBounds(): Phaser.Geom.Rectangle; hit(d: number, dir: number): void };
export class Beam {
  g: Phaser.GameObjects.Graphics; glow: Phaser.GameObjects.Image; chargeT = 0; level = 0; swirl: { a: number; r: number }[] = [];
  fireT = 0; fireLv = 0; t = 0; dmgT = 0; dir = 1; x = 0; y = 0; L = 0; fired = 0; hits = 0;
  constructor(public s: Phaser.Scene, public fx: Fx, public targets: () => Tgt[], public blocked: (x: number, y: number) => boolean) {
    this.g = s.add.graphics().setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    this.glow = s.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(12).setVisible(false);
    for (let i = 0; i < 16; i++) this.swirl.push({ a: i * 0.9, r: 8 + (i * 7) % 18 });
  }
  get firing() { return this.fireT > 0; }
  charge(dt: number, x: number, y: number) {
    if (this.firing) return; this.chargeT += dt; this.x = x; this.y = y;
    const lv = this.chargeT >= BEAM.lv2 ? 2 : this.chargeT >= BEAM.lv1 ? 1 : 0;
    if (lv > this.level) { this.level = lv; this.ring(x, y, lv === 2 ? 0xffffff : 0x9ff3ff, 18 + lv * 6); this.s.cameras.main.shake(70, 0.002 * lv); }
  }
  cancel() { this.chargeT = 0; this.level = 0; this.glow.setVisible(false); }
  release(x: number, y: number, dir: number) {
    const lv = this.level; this.cancel(); if (!lv || this.firing) return false;
    this.fireLv = lv; this.fireT = BEAM.dur[lv]; this.t = 0; this.dmgT = 0; this.dir = dir; this.x = x; this.y = y; this.fired++;
    this.s.cameras.main.shake(BEAM.dur[lv] * 1000, lv === 2 ? 0.009 : 0.005); this.ring(x, y, 0xff8fe0, 30); return true;
  }
  ring(x: number, y: number, c: number, r: number) {
    const o = this.s.add.circle(x, y, 3).setStrokeStyle(2, c).setFillStyle().setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    this.s.tweens.add({ targets: o, radius: r, alpha: 0, duration: 260, onComplete: () => o.destroy() });
  }
  update(dt: number, mx: number, my: number, dir: number) {
    const g = this.g; g.clear(); this.t += dt;
    if (this.chargeT > BEAM.start && !this.firing) this.drawCharge(dt, mx, my); else this.glow.setVisible(false);
    if (!this.firing) return;
    this.fireT -= dt; this.x = mx; this.y = my; this.dir = dir;
    let L = 0; while (L < BEAM.len && !this.blocked(mx + dir * L, my)) L += 4; this.L = L;
    const life = BEAM.dur[this.fireLv], age = life - this.fireT, env = Math.min(1, age / 0.06) * Math.min(1, this.fireT / 0.14);
    const H = BEAM.half[this.fireLv] * env, t = this.t, x1 = mx + dir * L;
    // body: outer pink haze, cyan sheath, white-hot core — thickness ripples along length
    for (let d = 0; d < L; d += 4) {
      const w = 1 + 0.14 * Math.sin(d * 0.16 - t * 45), xa = mx + dir * d, xb = Math.min(4, L - d) * dir;
      g.fillStyle(0xff3fb8, 0.28).fillRect(Math.min(xa, xa + xb), my - H * 1.7 * w, Math.abs(xb), H * 3.4 * w);
      g.fillStyle(0x6ff6ff, 0.75).fillRect(Math.min(xa, xa + xb), my - H * w, Math.abs(xb), H * 2 * w);
      g.fillStyle(0xffffff, 1).fillRect(Math.min(xa, xa + xb), my - H * 0.45 * w, Math.abs(xb), H * 0.9 * w);
    }
    // swirling helix: two counter-phased strands, front/back shading via cos
    const A = H * 1.9 + 2;
    for (let d = 0; d < L; d += 2.5) {
      for (let k = 0; k < (this.fireLv === 2 ? 3 : 2); k++) {
        const ph = d * 0.085 - t * 26 + k * (Math.PI * 2 / (this.fireLv === 2 ? 3 : 2)), yy = my + Math.sin(ph) * A, front = Math.cos(ph) > 0;
        g.fillStyle([0xff4fd8, 0x3ff3ff, 0xffd23f][k], front ? 0.95 : 0.35).fillCircle(mx + dir * d, yy, front ? 1.6 : 1);
      }
    }
    // muzzle burst
    const pr = (H * 1.6 + 4) * (1 + 0.3 * Math.sin(t * 60));
    g.fillStyle(0xff8fe0, 0.5).fillCircle(mx, my, pr * 1.4); g.fillStyle(0xffffff, 1).fillCircle(mx, my, pr * 0.7);
    for (let i = 0; i < 6; i++) { const a = t * 9 + i * Math.PI / 3; g.lineStyle(1.5, 0xffffff, 0.8).lineBetween(mx, my, mx + Math.cos(a) * pr * 2, my + Math.sin(a) * pr * 2); }
    // impact flare
    const fr = (H * 2 + 5) * (1 + 0.35 * Math.sin(t * 50 + 1));
    g.fillStyle(0xff3fb8, 0.45).fillCircle(x1, my, fr * 1.5); g.fillStyle(0x9ff3ff, 0.8).fillCircle(x1, my, fr); g.fillStyle(0xffffff, 1).fillCircle(x1, my, fr * 0.5);
    for (let i = 0; i < 4; i++) { const a = -t * 7 + i * Math.PI / 2; g.lineStyle(2, 0xffffff, 0.9).lineBetween(x1 - Math.cos(a) * fr * 2.2, my - Math.sin(a) * fr * 2.2, x1 + Math.cos(a) * fr * 2.2, my + Math.sin(a) * fr * 2.2); }
    if (Math.random() < 0.5) this.fx.spark(x1, my + (Math.random() - 0.5) * H * 2);
    // pierce damage along the whole length
    if ((this.dmgT -= dt) <= 0) { this.dmgT = BEAM.tick;
      const r = new Phaser.Geom.Rectangle(Math.min(mx, x1), my - BEAM.half[this.fireLv] * 1.7, L, BEAM.half[this.fireLv] * 3.4);
      for (const e of this.targets()) if (e.active && !e.dead && (e.kind !== 'boss' || e.awake) && Phaser.Geom.Intersects.RectangleToRectangle(r, e.getBounds())) { e.hit(BEAM.dmg[this.fireLv], dir); this.hits++; }
    }
  }
  drawCharge(dt: number, mx: number, my: number) {
    const g = this.g, lv = this.level, c = [0x9ff3ff, 0xff8fe0, 0xffffff][lv], k = Math.min(1, this.chargeT / BEAM.lv2);
    for (const q of this.swirl) { q.r -= (40 + 50 * lv) * dt; q.a += (7 + lv * 4) * dt; if (q.r < 2) { q.r = 16 + Math.random() * 10; q.a = Math.random() * 6.28; }
      const px = mx + Math.cos(q.a) * q.r, py = my + Math.sin(q.a) * q.r * 0.8;
      g.fillStyle(lv === 2 && Math.random() < 0.4 ? 0xffd23f : c, 0.9).fillRect(px - 0.75, py - 0.75, 1.5, 1.5);
      g.lineStyle(1, c, 0.35).lineBetween(px, py, mx + Math.cos(q.a - 0.5) * (q.r + 4), my + Math.sin(q.a - 0.5) * (q.r + 4) * 0.8); }
    const fl = 1 + 0.2 * Math.sin(this.t * (30 + lv * 20));
    this.glow.setVisible(true).setPosition(mx, my).setScale((0.25 + 0.55 * k) * fl).setTint(lv === 2 ? (Math.floor(this.t * 20) % 2 ? 0xffffff : 0xff8fe0) : c).setAlpha(0.6 + 0.4 * k);
    g.fillStyle(0xffffff, 0.9).fillCircle(mx, my, 1 + 2.5 * k * fl);
  }
}
