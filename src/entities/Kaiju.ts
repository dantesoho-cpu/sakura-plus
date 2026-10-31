import Phaser from 'phaser';
import { audio } from '../audio/Audio';
import { Enemy } from './Enemy';
import type { Fx } from '../systems/Fx';
import type { Blaster } from '../weapons/Blaster';
// KAIJU UNIT — Neo-Kyo chapter boss. Art: boss_00 crop from Dante's sheet (no redraw); animated with layered
// sheet-crop copies: additive halo pulse, core glow, wing sway, afterimages. Escorts: boss_01..03 crops.
// Attacks: orb fan, radial ring, dive slam (shockwave), sweeping core laser (P2), escort summon. P2 under 50%: faster + rage tint.
export const KAIJU_HP = 90;
type St = 'sleep' | 'intro' | 'hover' | 'tele' | 'dive' | 'rise' | 'laser' | 'dying';
export class Kaiju extends Enemy {
  kind = 'boss'; maxHp = KAIJU_HP; awake = false; st: St = 'sleep'; stT = 0; next = 'fan'; hx: number; hy: number; n = 0;
  halo: Phaser.GameObjects.Image; core: Phaser.GameObjects.Image; ghosts: Phaser.GameObjects.Image[] = []; ghT = 0; las: Phaser.GameObjects.Graphics; lasA = 0; lasD = 1;
  summon: (k: number, x: number, y: number) => void = () => {}; escorts = () => 0; groundY: number; onDead: () => void = () => {};
  dbg = { attacks: {} as Record<string, number>, slams: 0, summons: 0, phase2: false, fx: 0 };
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster, gy: number) {
    super(s, x, y, 'l2_boss_00', KAIJU_HP, fx); this.hx = x; this.hy = y; this.groundY = gy; this.setOrigin(0.5, 0.5).setDepth(7.5).setScale(1.3); this.baseSX = 1.3;
    this.b.setAllowGravity(false); this.b.setSize(64, 56).setOffset(27, 26); this.eyeY = 0; this.aura.setVisible(false);
    this.halo = s.add.image(x, y, 'l2_boss_00').setScale(1.3).setBlendMode(Phaser.BlendModes.ADD).setTint(0xff4fd8).setAlpha(0).setDepth(7.4);
    this.core = s.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xd060ff).setDepth(7.6).setAlpha(0);
    this.las = s.add.graphics().setDepth(7.7).setBlendMode(Phaser.BlendModes.ADD); this.setAlpha(0);
  }
  /** sheet fx crop burst: l2f_XX image pops (scale from->to) and fades */
  fxc(id: number, x: number, y: number, from = 0.6, to = 1.6, ms = 360, depth = 12, ang = 0) { const k = 'l2f_' + String(id).padStart(2, '0'); if (!this.scene.textures.exists(k)) return null;
    const im = this.scene.add.image(x, y, k).setBlendMode(Phaser.BlendModes.ADD).setScale(from).setDepth(depth).setAngle(ang); this.scene.tweens.add({ targets: im, scale: to, alpha: 0, angle: ang + 40, duration: ms, ease: 'Cubic.out', onComplete: () => im.destroy() }); this.dbg.fx++; return im; }
  get p2() { return this.hp <= this.maxHp / 2; }
  knock() {}
  punch(sx: number, sy: number, ms = 140) { if (this.st === 'dying') return; this.scene.tweens.killTweensOf(this); this.setScale(1.3 * sx, 1.3 * sy); this.scene.tweens.add({ targets: this, scaleX: 1.3, scaleY: 1.3, duration: ms, ease: 'Quad.out' }); }
  hit(dmg: number, dir: number) { if (!this.awake || this.st === 'dying' || this.st === 'intro' || this.dead) return;
    audio.sfx('ehit', { rate: 0.7 }); this.hp -= dmg; this.flashT = 0.06; this.setTintFill(0xffffff); this.fx.spark(this.x - dir * 20, this.y); if (Math.random() < 0.5) this.fxc(2, this.x - dir * 24 + Phaser.Math.Between(-10, 10), this.y + Phaser.Math.Between(-20, 20), 0.4, 0.9, 200);
    if (!this.dbg.phase2 && this.p2) { this.dbg.phase2 = true; this.fx.shake(400, 0.01); this.roar(); (this.scene as any).toast?.show('KAIJU UNIT — CORE OVERLOAD', '#ff4fd8'); }
    if (this.hp <= 0) this.die(); }
  wake() { if (this.st !== 'sleep') return; this.st = 'intro'; this.stT = 1.6; const s = this.scene; this.y = this.hy - 160;
    s.tweens.add({ targets: this, alpha: 1, y: this.hy, duration: 1500, ease: 'Back.out' }); this.roar(); }
  roar() { const s = this.scene; audio.sfx('bossw', { rate: 0.6 }); this.fx.shake(500, 0.008); this.fxc(10, this.x, this.y, 0.8, 5, 700); this.fxc(9, this.x, this.y, 0.6, 3.5, 560);
    for (let i = 0; i < 3; i++) { const r = s.add.circle(this.x, this.y, 10).setStrokeStyle(3, i % 2 ? 0x3ff3ff : 0xff4fd8).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: r, radius: 160, alpha: 0, duration: 700, delay: i * 160, onComplete: () => r.destroy() }); } }
  reset() { this.hp = this.maxHp; this.st = 'sleep'; this.awake = false; this.setAlpha(0); this.setPosition(this.hx, this.hy); this.b.setVelocity(0, 0); this.clearTint(); this.las.clear(); this.dbg.phase2 = false; }
  tick(dt: number, px: number, py: number) {
    this.t += dt; if (this.flashT > 0 && (this.flashT -= dt) <= 0) this.clearTint();
    // layered animation (runs in every state)
    const pulse = 0.5 + 0.5 * Math.sin(this.t * (this.p2 ? 9 : 5));
    this.halo.setPosition(this.x, this.y).setFlipX(this.flipX).setScale(this.scaleX * (1.04 + 0.04 * pulse), this.scaleY * (1.04 + 0.04 * pulse)).setAlpha(this.alpha * (0.15 + 0.25 * pulse)).setAngle(this.angle);
    this.core.setPosition(this.x, this.y + 2).setScale(0.7 + 0.5 * pulse + (this.st === 'tele' ? 0.6 : 0)).setAlpha(this.alpha * (0.5 + 0.4 * pulse)).setTint(this.p2 ? 0xff3a6a : 0xd060ff);
    if (this.st === 'sleep' || this.st === 'dying') return;
    if (!this.awake && this.st !== 'intro') return;
    this.stT -= dt; if (this.flashT <= 0 && this.p2 && Math.floor(this.t * 6) % 2 === 0) this.setTint(0xffc0d0); else if (this.flashT <= 0) this.clearTint();
    this.setFlipX(px < this.x);
    if ((this.ghT -= dt) <= 0 && Math.abs(this.b.velocity.x) + Math.abs(this.b.velocity.y) > 120) { this.ghT = 0.05; const g = this.scene.add.image(this.x, this.y, 'l2_boss_00').setScale(1.3).setFlipX(this.flipX).setTintFill(0xff4fd8).setAlpha(0.45).setDepth(7.3).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({ targets: g, alpha: 0, scale: 1.4, duration: 260, onComplete: () => g.destroy() }); }
    if (this.st === 'intro') { if (this.stT <= 0) { this.st = 'hover'; this.stT = 1; this.awake = true; } return; }
    const sp = this.p2 ? 1.5 : 1;
    if (this.st === 'hover') {
      const tx = this.hx + Math.sin(this.t * 0.7 * sp) * 150, ty = this.hy + 10 + Math.sin(this.t * 1.9) * 14;
      this.b.setVelocity(Phaser.Math.Clamp((tx - this.x) * 2, -140, 140), Phaser.Math.Clamp((ty - this.y) * 2, -100, 100)); this.setAngle(Phaser.Math.Clamp(this.b.velocity.x * 0.05, -8, 8));
      if (this.stT <= 0) { const o = ['fan', 'ring', 'dive', ...(this.p2 ? ['laser', 'dive'] : []), ...(this.escorts() < 2 ? ['summon'] : [])];
        this.next = this.n < 4 ? ['fan', 'dive', 'ring', 'summon'][this.n] : o[Math.floor(Math.random() * o.length)]; this.n++;
        this.st = 'tele'; this.stT = this.next === 'dive' ? 0.7 : 0.55; this.b.setVelocity(0, 0); { const r = this.scene.add.circle(this.x, this.y, 6).setStrokeStyle(2, 0xff3050).setDepth(12).setBlendMode(Phaser.BlendModes.ADD); this.scene.tweens.add({ targets: r, radius: 40, alpha: 0, duration: this.stT * 1000, onComplete: () => r.destroy() }); } audio.sfx('bossw', { rate: 1.1 }); this.fxc(this.next === 'dive' ? 17 : 6, this.x, this.y + 2, 0.3, 1.8, this.stT * 1000, 12); }
    } else if (this.st === 'tele') { this.x += Math.sin(this.t * 80) * 0.8; if (this.next === 'dive') this.y = Math.max(this.hy - 50, this.y - 40 * dt);
      if (this.stT <= 0) this.attack(px, py);
    } else if (this.st === 'dive') { if (this.y >= this.groundY - 58) { this.b.setVelocity(0, 0); this.y = this.groundY - 58; this.slam(); this.st = 'rise'; this.stT = 0.6; }
    } else if (this.st === 'rise') { if (this.stT <= 0) this.b.setVelocityY(-160); if (this.y < this.hy) { this.st = 'hover'; this.stT = 1.4 / sp; this.b.setVelocity(0, 0); }
    } else if (this.st === 'laser') { this.lasA += this.lasD * dt * 1.1; this.drawLaser(px, py); if (this.stT <= 0) { this.las.clear(); this.st = 'hover'; this.stT = 1.2 / sp; } }
  }
  count(k: string) { this.dbg.attacks[k] = (this.dbg.attacks[k] || 0) + 1; }
  attack(px: number, py: number) { const k = this.next, sp = this.p2 ? 1.5 : 1; this.count(k); this.clearTint();
    const s = this.scene; this.punch(1.15, 0.88, 200);
    if (k === 'fan') { const a = Math.atan2(py - this.y, px - this.x), n = this.p2 ? 7 : 5;
      for (let i = 0; i < n; i++) this.gun.fireVel(this.x, this.y + 6, Math.cos(a + (i - (n - 1) / 2) * 0.16) * 140, Math.sin(a + (i - (n - 1) / 2) * 0.16) * 140, { tex: 'nk_s_orb', trail: 0xff4fd8, life: 3, pulse: true });
      audio.sfx('eshot', { rate: 0.8 }); this.fxc(16, this.x, this.y + 6, 0.5, 1.4, 260); this.st = 'hover'; this.stT = 1.3 / sp; }
    else if (k === 'ring') { const n = this.p2 ? 16 : 12, o = Math.random();
      for (let i = 0; i < n; i++) { const a = o + (i / n) * Math.PI * 2; this.gun.fireVel(this.x, this.y, Math.cos(a) * 110, Math.sin(a) * 110, { tex: 'nk_s_disk', trail: 0x3ff3ff, life: 3 }); }
      const r = s.add.circle(this.x, this.y, 8).setStrokeStyle(2, 0x3ff3ff).setDepth(12).setBlendMode(Phaser.BlendModes.ADD); s.tweens.add({ targets: r, radius: 70, alpha: 0, duration: 400, onComplete: () => r.destroy() });
      audio.sfx('eshot', { rate: 0.6 }); this.fxc(18, this.x, this.y, 0.6, 2.2, 360); this.st = 'hover'; this.stT = 1.5 / sp; }
    else if (k === 'dive') { this.x = Phaser.Math.Clamp(px, this.hx - 200, this.hx + 200); this.b.setVelocity(0, 420 * Math.min(sp, 1.3)); this.st = 'dive'; }
    else if (k === 'laser') { this.lasD = px > this.x ? -1 : 1; this.lasA = Math.PI / 2 + this.lasD * 1.2; this.st = 'laser'; this.stT = 2.2; audio.sfx('bossw', { rate: 1.4 }); }
    else { this.dbg.summons++; for (const [i, d] of [[1, -1], [2 + (this.n % 2), 1]]) { this.fxc(22, this.x + d * 60, this.y - 30, 0.3, 1.6, 500); this.summon(i, this.x + d * 60, this.y - 30); } this.roar(); this.st = 'hover'; this.stT = 1.6 / sp; } }
  slam() { const s = this.scene; this.dbg.slams++; audio.sfx('explode', { rate: 0.7 }); this.fx.shake(380, 0.012); this.fx.explode(this.x, this.groundY - 6, 0.8); this.fxc(14, this.x, this.groundY - 10, 0.6, 2.6, 420); for (const d of [-1, 1]) { const sm = this.fxc(13, this.x + d * 40, this.groundY - 14, 0.5, 1.4, 900, 9); sm?.setBlendMode(Phaser.BlendModes.NORMAL).setAlpha(0.8); if (sm) this.scene.tweens.add({ targets: sm, x: sm.x + d * 50, y: sm.y - 16, duration: 900 }); }
    for (const d of [-1, 1]) { this.gun.fireVel(this.x + d * 30, this.groundY - 8, d * 170, 0, { tex: 'nk_s_wave', trail: 0xff4fd8, life: 1.6 });
      for (let i = 0; i < 6; i++) { const r = s.add.rectangle(this.x + d * i * 10, this.groundY - 2, 6, 4, 0x8a8498).setDepth(9);
        s.tweens.add({ targets: r, x: r.x + d * (40 + Math.random() * 50), y: r.y - 20 - Math.random() * 30, angle: 360, alpha: 0, duration: 600, ease: 'Quad.out', onComplete: () => r.destroy() }); } }
    const ring = s.add.ellipse(this.x, this.groundY - 2, 20, 6).setStrokeStyle(3, 0xff4fd8).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: ring, scaleX: 14, scaleY: 3, alpha: 0, duration: 520, ease: 'Cubic.out', onComplete: () => ring.destroy() }); }
  lasHit = 0;
  drawLaser(px: number, py: number) { const g = this.las, x = this.x, y = this.y + 6, L = 520, ex = x + Math.cos(this.lasA) * L, ey = y + Math.sin(this.lasA) * L, w = 6 + Math.sin(this.t * 60) * 2;
    if (Math.floor(this.t * 20) !== Math.floor((this.t - 0.016) * 20)) { this.fxc(23, x, y, 0.8, 1.3, 120, 12, Phaser.Math.RadToDeg(this.lasA) - 90); this.fxc(15, ex > 0 ? Phaser.Math.Clamp(ex, x - 400, x + 400) : x, Math.min(ey, this.groundY - 4), 0.5, 1.2, 160); }
    g.clear(); g.lineStyle(w * 2.4, this.p2 ? 0xff3a6a : 0xb040ff, 0.35).lineBetween(x, y, ex, ey); g.lineStyle(w, 0xff9af0, 0.9).lineBetween(x, y, ex, ey); g.lineStyle(2, 0xffffff, 1).lineBetween(x, y, ex, ey);
    const dx = ex - x, dy = ey - y, t = Phaser.Math.Clamp(((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy), 0, 1);
    if (Math.hypot(x + dx * t - px, y + dy * t - py) < w + 6) { const p = (this.scene as any).player; if (p?.damage?.(x)) { this.lasHit++; this.fx.shake(120, 0.005); } } }
  die() { if (this.st === 'dying') return; this.st = 'dying'; this.awake = false; this.b.setVelocity(0, 0); this.b.enable = false; this.las.clear(); const s = this.scene; audio.sfx('explode');
    for (let i = 0; i < 14; i++) s.time.delayedCall(i * 140, () => { const ex = this.x + Phaser.Math.Between(-50, 50), ey = this.y + Phaser.Math.Between(-40, 40);
      this.fx.boom.explode(18, ex, ey); const r = s.add.sprite(ex, ey, 'fx_boom', 0).setDepth(21).setScale(0.6 + Math.random() * 0.8); r.play('fx_boom'); r.once('animationcomplete', () => r.destroy()); this.fx.shake(140, 0.008); audio.sfx('explode', { rate: 0.8 + Math.random() * 0.4, vol: 0.5 });
      this.setTintFill(i % 2 ? 0xffffff : 0xff4fd8); this.x += Phaser.Math.Between(-3, 3); this.fxc([14, 2, 6, 16][i % 4], ex, ey, 0.6, 2.4, 420, 22); });
    s.tweens.add({ targets: this, angle: 18, y: this.y + 30, duration: 2000, ease: 'Quad.in' });
    s.time.delayedCall(2100, () => { const fl = s.add.rectangle(240, 135, 480, 270, 0xffffff).setScrollFactor(0).setDepth(200); s.tweens.add({ targets: fl, alpha: 0, duration: 900, onComplete: () => fl.destroy() });
      this.fx.boom.explode(80, this.x, this.y); this.debris(); this.fxc(14, this.x, this.y, 1, 8, 900, 22); this.fxc(10, this.x, this.y, 1, 9, 1000, 22); this.fx.shake(600, 0.02); this.dead = true;
      for (const o of [this.halo, this.core, this.las, this.aura, this.tele]) o.destroy(); this.emit('destroyed', this); this.onDead(); this.destroy(); }); }
}
/** Kaiju escorts (boss_01..03 crops): hover in a loose orbit around Sakura and snipe twin bolts. */
export class KaijuEscort extends Enemy {
  kind = 'escort'; fireT = 1.4; ox: number;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster, i: number) { super(s, x, y, 'l2_boss_0' + i, 4, fx); this.setOrigin(0.5).setScale(0.7).setAlpha(0); this.b.setSize(this.width * 0.6, this.height * 0.6);
    this.eyeY = 0.1; this.ox = (i % 2 ? -1 : 1) * 90; s.tweens.add({ targets: this, alpha: 1, duration: 300 }); this.baseSX = 0.7; }
  punch() {} face() {}
  tick(dt: number, px: number, py: number) { super.tick(dt, px, py); if (this.dead) return; this.setScale(0.7); this.setFlipX(px < this.x);
    const tx = px + this.ox + Math.sin(this.t * 1.3) * 30, ty = py - 90 + Math.sin(this.t * 2.2) * 14;
    if (this.hitT <= 0) this.b.setVelocity(Phaser.Math.Clamp((tx - this.x) * 1.6, -110, 110), Phaser.Math.Clamp((ty - this.y) * 1.6, -90, 90)); this.setAngle(Phaser.Math.Clamp(this.b.velocity.x * 0.12, -14, 14));
    if ((this.fireT -= dt) <= 0.4 && this.teleT <= 0 && this.fireT + dt > 0.4) this.telegraph(0.4);
    if (this.fireT <= 0) { this.fireT = 2.4; const a = Math.atan2(py - this.y, px - this.x); for (const o of [-0.1, 0.1]) this.gun.fireVel(this.x, this.y, Math.cos(a + o) * 150, Math.sin(a + o) * 150, { tex: 'nk_s_bolt', trail: 0x3ff3ff, life: 2.4 }); audio.sfx('eshot', { rate: 1.5 }); } }
  knock(dir: number) { this.b.setVelocity(dir * 100, -40); }
}
