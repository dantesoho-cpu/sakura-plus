import { audio } from '../audio/Audio';
import Phaser from 'phaser';
import type { Fx } from '../systems/Fx';
// Charge beam: hold to charge (swirling intake particles, building glow, 2 levels), release to fire a piercing helix beam.
export const BEAM = { start: 0.25, lv1: 0.55, lv2: 1.35, len: 420, dur: [0, 0.5, 0.85], half: [0, 5, 9], dmg: [0, 1, 2], tick: 0.09 };
type Tgt = { dead?: boolean; active: boolean; kind?: string; awake?: boolean; getBounds(): Phaser.Geom.Rectangle; hit(d: number, dir: number): void };
export class Beam {
  g: Phaser.GameObjects.Graphics; gb: Phaser.GameObjects.Graphics; glow: Phaser.GameObjects.Image; chargeT = 0; level = 0; swirl: { a: number; r: number }[] = [];
  fireT = 0; fireLv = 0; t = 0; dmgT = 0; dir = 1; x = 0; y = 0; L = 0; fired = 0; hits = 0; owner: Phaser.GameObjects.Sprite | null = null; bandT = 0; bands: number[] = []; boost = 1; auraT = 0; dustT = 0;
  constructor(public s: Phaser.Scene, public fx: Fx, public targets: () => Tgt[], public blocked: (x: number, y: number) => boolean) {
    this.gb = s.add.graphics().setDepth(11.9); this.g = s.add.graphics().setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    this.glow = s.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(12).setVisible(false);
    for (let i = 0; i < 16; i++) this.swirl.push({ a: i * 0.9, r: 8 + (i * 7) % 18 });
  }
  get firing() { return this.fireT > 0; }
  charge(dt: number, x: number, y: number) {
    if (this.firing) return; this.chargeT += dt * this.boost; this.x = x; this.y = y;
    const lv = this.chargeT >= BEAM.lv2 ? 2 : this.chargeT >= BEAM.lv1 ? 1 : 0;
    if (lv > this.level) { this.level = lv; audio.sfx('ping', { rate: lv === 2 ? 1.5 : 1, vary: 0 }); this.ring(x, y, lv === 2 ? 0xffffff : 0x9ff3ff, 18 + lv * 6); this.s.cameras.main.shake(70, 0.002 * lv); }
  }
  cancel() { this.chargeT = 0; this.level = 0; this.glow.setVisible(false); }
  release(x: number, y: number, dir: number) {
    const lv = this.level; this.cancel(); if (!lv || this.firing) return false;
    this.fireLv = lv; this.bands = []; this.fireT = BEAM.dur[lv]; this.t = 0; this.dmgT = 0; this.dir = dir; this.x = x; this.y = y; this.fired++;
    this.s.cameras.main.shake(BEAM.dur[lv] * 1000, lv === 2 ? 0.009 : 0.005); this.ring(x, y, 0xff8fe0, 30); return true;
  }
  ring(x: number, y: number, c: number, r: number) {
    const o = this.s.add.circle(x, y, 3).setStrokeStyle(2, c).setFillStyle().setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    this.s.tweens.add({ targets: o, radius: r, alpha: 0, duration: 260, onComplete: () => o.destroy() });
  }
  update(dt: number, mx: number, my: number, dir: number) {
    const g = this.g; g.clear(); this.gb.clear(); this.t += dt;
    if (this.chargeT > BEAM.start && !this.firing) this.drawCharge(dt, mx, my); else this.glow.setVisible(false);
    if (!this.firing) return;
    this.fireT -= dt; this.x = mx; this.y = my; this.dir = dir;
    let L = 0; while (L < BEAM.len && !this.blocked(mx + dir * L, my)) L += 4; this.L = L;
    const life = BEAM.dur[this.fireLv], age = life - this.fireT, env = Math.min(1, age / 0.06) * Math.min(1, this.fireT / 0.14);
    const H = BEAM.half[this.fireLv] * env * (1 + 0.15 * Math.sin(age * 70)), t = this.t, lv2 = this.fireLv === 2;
    const Lx = Math.min(L, age * 2600); this.L = Lx; const x1 = mx + dir * Lx, Q = (v: number) => Math.round(v);
    // body: layered hard-edged columns, thickness surging along the length (kamehameha-style)
    for (let d = 0; d < Lx; d += 2) {
      const w = 1 + 0.16 * Math.sin(d * 0.14 - t * 55) + 0.08 * Math.sin(d * 0.37 + t * 31), xa = dir > 0 ? mx + d : mx - d - 2;
      const lay: [number, number, number][] = [[0x3a0f7a, 1, 1.55], [0xd81fa8, 1, 1.2], [0xff6fd8, 1, 0.9], [0x3ff3ff, 1, 0.6], [0xe8ffff, 1, 0.28]];
      for (const [c, al, m] of lay) { const h = Math.max(1, Q(H * m * w)); this.gb.fillStyle(c, al).fillRect(xa, my - h, 2, h * 2); }
    }
    // spiral energy ribbons wrapping the beam
    const n = lv2 ? 3 : 2, A = H * 1.35 + 2;
    for (let d = 0; d < Lx; d += 2) for (let k = 0; k < n; k++) {
      const ph = d * 0.075 - t * 34 + k * (Math.PI * 2 / n), c = Math.cos(ph), yy = Q(my + Math.sin(ph) * A), xx = dir > 0 ? mx + d : mx - d - 2;
      if (c > 0) this.gb.fillStyle(k === 2 ? 0xffd23f : k ? 0xbff8ff : 0xffe0f6, 1).fillRect(xx, yy - 1, 2, 2); else this.gb.fillStyle(0x3a0f6a, 0.6).fillRect(xx, yy, 2, 1);
    }
    // crackling lightning along both edges
    for (let e = 0; e < (lv2 ? 3 : 2); e++) { const sgn = e % 2 ? 1 : -1; g.lineStyle(1, e === 2 ? 0xffd23f : 0xbff8ff, 0.9).beginPath(); let px = mx, py = my + sgn * H * 1.3; g.moveTo(px, py);
      for (let d = 10; d < Lx; d += 10 + Math.random() * 10) { px = mx + dir * d; py = my + sgn * (H * (1.1 + Math.random() * 0.6)); g.lineTo(px, py); } g.strokePath(); }
    // travelling shockwave bands
    if ((this.bandT -= dt) <= 0) { this.bandT = 0.07; this.bands.push(0); }
    this.bands = this.bands.map(v => v + dt * 900).filter(v => v < Lx);
    for (const v of this.bands) { const xx = mx + dir * v, h = Q(H * 1.9 + 3); g.lineStyle(1, 0xffffff, 0.6 * (1 - v / Math.max(1, Lx))).strokeRect(xx - 1, my - h, 2, h * 2); }
    // muzzle: rotating star + square rings
    const pr = (H * 0.9 + 3) * (1 + 0.25 * Math.sin(t * 60));
    for (let i = 0; i < 8; i++) { const an = t * 10 + i * Math.PI / 4, r = i % 2 ? pr * 1.3 : pr * 1.9; g.lineStyle(i % 2 ? 1 : 2, i % 2 ? 0xff8fe0 : 0xffffff, 0.9).lineBetween(mx, my, mx + Math.cos(an) * r, my + Math.sin(an) * r); }
    { const gb = this.gb, md = (r: number, c: number, rot: number) => { gb.fillStyle(c, 1).beginPath(); for (let i = 0; i < 4; i++) { const an = rot + i * Math.PI / 2; if (i) gb.lineTo(mx + Math.cos(an) * r, my + Math.sin(an) * r); else gb.moveTo(mx + Math.cos(an) * r, my + Math.sin(an) * r); } gb.closePath(); gb.fillPath(); };
      md(pr * 1.3, 0xd81fa8, t * 9); md(pr, 0x3ff3ff, -t * 12); md(pr * 0.5, 0xffffff, 0); }
    // head: big spinning diamond orb at the leading edge
    const fr = (H * 1.5 + 4) * (1 + 0.25 * Math.sin(t * 48 + 1));
    const gb = this.gb, dia = (r: number, c: number, al: number, rot: number) => { gb.fillStyle(c, al).beginPath(); for (let i = 0; i < 4; i++) { const an = rot + i * Math.PI / 2; const p = [x1 + Math.cos(an) * r, my + Math.sin(an) * r]; if (i) gb.lineTo(p[0], p[1]); else gb.moveTo(p[0], p[1]); } gb.closePath(); gb.fillPath(); };
    dia(fr * 1.7, 0x5a1fb8, 0.6, t * 6); dia(fr * 1.3, 0xff3fc8, 0.85, -t * 8); dia(fr, 0x3ff3ff, 0.95, t * 11); dia(fr * 0.55, 0xffffff, 1, 0);
    for (let i = 0; i < 4; i++) { const an = -t * 7 + i * Math.PI / 2; g.lineStyle(1, 0xffffff, 0.9).lineBetween(x1, my, x1 + Math.cos(an) * fr * 2, my + Math.sin(an) * fr * 2); }
    if (Math.random() < 0.7) this.fx.spark(x1, my + (Math.random() - 0.5) * H * 2);
    if (lv2 && age < 0.03) { this.s.cameras.main.flash(60, 120, 60, 110); }
    // pierce damage along the whole length
    if ((this.dmgT -= dt) <= 0) { this.dmgT = BEAM.tick;
      const r = new Phaser.Geom.Rectangle(Math.min(mx, x1), my - BEAM.half[this.fireLv] * 1.7, Lx, BEAM.half[this.fireLv] * 3.4);
      for (const e of this.targets()) if (e.active && !e.dead && (e.kind !== 'boss' || e.awake) && Phaser.Geom.Intersects.RectangleToRectangle(r, e.getBounds())) { (e as any).hit(BEAM.dmg[this.fireLv] * (this.boost > 1 ? 2 : 1), dir, true); this.hits++; }
    }
  }
  drawCharge(dt: number, mx: number, my: number) {
    const g = this.g, lv = this.level, c = [0x9ff3ff, 0xff8fe0, 0xffffff][lv], k = Math.min(1, this.chargeT / BEAM.lv2), t = this.t, Q = Math.round;
    // intake streaks: energy pulled in from all around toward the cannon
    for (const q of this.swirl) { q.r -= (60 + 70 * lv) * dt; q.a += (5 + lv * 4) * dt; if (q.r < 3) { q.r = 22 + Math.random() * (18 + lv * 10); q.a = Math.random() * 6.28; }
      const px = mx + Math.cos(q.a) * q.r, py = my + Math.sin(q.a) * q.r * 0.85, tx = mx + Math.cos(q.a + 0.25) * (q.r + 7 + lv * 3), ty = my + Math.sin(q.a + 0.25) * (q.r + 7 + lv * 3) * 0.85;
      const col = lv === 2 && (q.a * 10 | 0) % 3 === 0 ? 0xffd23f : c; g.lineStyle(1, col, 0.8).lineBetween(px, py, tx, ty); g.fillStyle(0xffffff, 1).fillRect(Q(px), Q(py), 1, 1); }
    // two tilted orbit rings (Samus-style), dotted, spinning faster each level
    for (let r = 0; r < 2; r++) { const R = 7 + 6 * k, tilt = r ? 0.9 : -0.9, sp = (8 + lv * 6) * (r ? -1 : 1);
      for (let i = 0; i < 10; i++) { const an = t * sp + i * 0.628, ex = Math.cos(an) * R, ey = Math.sin(an) * R * 0.35, x = mx + ex * Math.cos(tilt) - ey * Math.sin(tilt), y = my + ex * Math.sin(tilt) + ey * Math.cos(tilt);
        g.fillStyle(r ? 0xff4fd8 : 0x3ff3ff, Math.sin(an) > 0 ? 1 : 0.4).fillRect(Q(x), Q(y), 2, 2); } }
    // core orb: stacked spinning diamonds
    const fl = 1 + 0.2 * Math.sin(t * (30 + lv * 20)), R0 = (2 + 6 * k) * fl;
    const gb = this.gb, dia = (r: number, col: number, al: number, rot: number) => { gb.fillStyle(col, al).beginPath(); for (let i = 0; i < 4; i++) { const an = rot + i * Math.PI / 2; if (i) gb.lineTo(mx + Math.cos(an) * r, my + Math.sin(an) * r); else gb.moveTo(mx + Math.cos(an) * r, my + Math.sin(an) * r); } gb.closePath(); gb.fillPath(); };
    dia(R0 * 1.6, 0x5a1fb8, 0.5, t * 5); dia(R0 * 1.2, lv === 2 && Math.floor(t * 20) % 2 ? 0xffd23f : 0xff3fc8, 0.85, -t * 7); dia(R0 * 0.8, 0x3ff3ff, 0.95, t * 9); dia(R0 * 0.4, 0xffffff, 1, 0);
    // lightning arcs leaping off the orb at full charge
    if (lv >= 1) for (let i = 0; i < lv * 2; i++) { let x = mx, y = my; const an = Math.random() * 6.28; g.lineStyle(1, i % 2 ? 0xffd23f : 0xbff8ff, 0.9).beginPath().moveTo(x, y);
      for (let s = 0; s < 3; s++) { x += Math.cos(an + (Math.random() - 0.5)) * (4 + lv * 2); y += Math.sin(an + (Math.random() - 0.5)) * (4 + lv * 2); g.lineTo(x, y); } g.strokePath(); }
    this.glow.setVisible(true).setPosition(mx, my).setScale((0.2 + 0.4 * k) * fl).setTint(lv === 2 ? (Math.floor(t * 20) % 2 ? 0xffffff : 0xff8fe0) : c).setAlpha(0.3 + 0.3 * k);
    this.bodyAura(dt, lv, k);
  }
  /** Energy aura flaring around her silhouette + ground dust/debris lifting; intensifies with charge level. */
  bodyAura(dt: number, lv: number, k: number) {
    const o = this.owner; if (!o) return; const s = this.s, g = this.g, fy = o.y - 1;
    // flame tongues licking upward around the body
    for (let i = 0; i < 7 + lv * 4; i++) { const ph = this.t * (9 + lv * 3) + i * 1.7, x = o.x + Math.sin(ph) * (7 + lv * 2), h = (10 + lv * 6) * (0.6 + 0.4 * Math.sin(ph * 1.3));
      g.fillStyle([0xff4fd8, 0x9ff3ff, 0xffffff][(i + lv) % 3], 0.22 + 0.12 * lv).fillRect(Math.round(x), Math.round(fy - 6 - h), 1 + (lv >> 1), Math.round(h)); }
        if ((this.auraT -= dt) <= 0) { this.auraT = lv === 2 ? 0.05 : lv === 1 ? 0.08 : 0.12;
      const ga = s.add.image(o.x, o.y, o.texture.key, o.frame.name).setOrigin(o.originX, o.originY).setFlipX(o.flipX).setTintFill(lv === 2 ? 0xffffff : lv === 1 ? 0xff6fe0 : 0x7ff3ff)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45).setDepth(9.5);
      s.tweens.add({ targets: ga, scaleX: 1.18 + 0.08 * lv, scaleY: 1.12 + 0.06 * lv, alpha: 0, duration: 220, onComplete: () => ga.destroy() }); }
    if ((this.dustT -= dt) <= 0) { this.dustT = 0.09 - lv * 0.025;
      for (let i = 0; i < 1 + lv; i++) { const big = Math.random() < 0.3 + lv * 0.15, x = o.x + (Math.random() - 0.5) * (30 + lv * 14);
        const d = big ? s.add.rectangle(x, fy, 2, 2, [0x6a5a48, 0x8a7a60, 0xff9fd8][i % 3]).setDepth(9) : s.add.image(x, fy, 'glow').setTint(0xd8c8b8).setAlpha(0.35).setScale(0.18).setDepth(9);
        s.tweens.add({ targets: d, y: fy - 10 - Math.random() * (14 + lv * 12), x: x + (o.x - x) * 0.3, angle: big ? 360 : 0, alpha: 0, duration: 450 + Math.random() * 300, onComplete: () => d.destroy() }); } }
  }
}
