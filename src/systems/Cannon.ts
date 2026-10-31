import Phaser from 'phaser';
import { audio } from '../audio/Audio';
import { touch } from './Touch';
// MEGA CANNON: pickup grants a charge; C / touch CANNON fires. 1.0s charge-up (energy suck-in, darkening, rising rumble)
// then a screen-filling beam + flash + triple shockwave + debris storm that hits every enemy on screen.
export const CHARGE_T = 1.0, FIRE_T = 1.1;
export class Cannon {
  charges = 0; state: 'idle' | 'charge' | 'fire' = 'idle'; t = 0; dir = 1; ox = 0; oy = 0; dbg = { fired: 0, hits: 0, kills: 0 };
  g: Phaser.GameObjects.Graphics; dim: Phaser.GameObjects.Rectangle; flash: Phaser.GameObjects.Rectangle; orb: Phaser.GameObjects.Image; motes: { a: number; r: number; v: number; c: number }[] = [];
  debris: { x: number; y: number; vx: number; vy: number; l: number; c: number; s: number }[] = []; pressed = false; pd = 10; onBlast?: () => void;
  constructor(public s: Phaser.Scene, public p: any, public enemies: () => any[], public clearShots: () => void) {
    this.g = s.add.graphics().setDepth(40).setBlendMode(Phaser.BlendModes.ADD);
    this.dim = s.add.rectangle(0, 0, 480, 270, 0x0a0418, 1).setOrigin(0).setScrollFactor(0).setDepth(39).setAlpha(0);
    this.flash = s.add.rectangle(0, 0, 480, 270, 0xffffff, 1).setOrigin(0).setScrollFactor(0).setDepth(60).setAlpha(0);
    this.orb = s.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(41).setVisible(false);
    s.input.keyboard!.on('keydown-C', () => { this.pressed = true; });
    s.events.once('shutdown', () => { this.btn(false); });
  }
  btn(on: boolean) { const b = document.querySelector('[data-k="cannon"]') as HTMLElement | null; if (b) b.style.display = on ? 'flex' : 'none'; }
  give() { this.charges = Math.min(3, this.charges + 1); this.btn(true); }
  muzzle() { this.ox = this.p.x + this.dir * 16; this.oy = this.p.y - 19; }
  update(dt: number) {
    if (touch.cannonP) { this.pressed = true; touch.cannonP = false; }
    if (this.pressed && this.state === 'idle' && this.charges > 0 && this.p.hurtT <= 0 && this.p.hp > 0) this.start();
    this.pressed = false;
    const g = this.g; g.clear(); const cam = this.s.cameras.main, wv = cam.worldView;
    // debris always simulates
    for (const d of this.debris) { d.l -= dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 260 * dt; d.vx *= Math.pow(0.4, dt); }
    this.debris = this.debris.filter(d => d.l > 0);
    for (const d of this.debris) { g.fillStyle(d.c, Math.min(1, d.l * 2)); g.fillRect(d.x - d.s / 2, d.y - d.s / 2, d.s, d.s); }
    if (this.state === 'idle') return;
    this.t += dt; this.muzzle(); const b = this.p.body as Phaser.Physics.Arcade.Body; b.setVelocity(0, 0); b.allowGravity = false;
    if (this.state === 'charge') {
      const k = Math.min(1, this.t / CHARGE_T);
      this.dim.setAlpha(0.45 * k); cam.shake(60, 0.002 + 0.008 * k, true);
      if (Math.random() < 0.6 + k) this.motes.push({ a: Math.random() * 6.283, r: 70 + Math.random() * 60, v: 120 + 200 * k, c: Math.random() < 0.5 ? 0xff5fb0 : 0x3ff3ff });
      for (const m of this.motes) m.r -= m.v * dt;
      this.motes = this.motes.filter(m => m.r > 3);
      for (const m of this.motes) { const x = this.ox + Math.cos(m.a) * m.r, y = this.oy + Math.sin(m.a) * m.r, x2 = this.ox + Math.cos(m.a) * (m.r + 10), y2 = this.oy + Math.sin(m.a) * (m.r + 10);
        g.lineStyle(2, m.c, 0.9); g.lineBetween(x, y, x2, y2); }
      for (let i = 0; i < 3; i++) { const rr = (1 - ((this.t * 2.5 + i / 3) % 1)) * 60 * (1 - k * 0.5); g.lineStyle(2, i % 2 ? 0x3ff3ff : 0xff5fb0, 0.25 + 0.5 * (1 - rr / 60)); g.strokeCircle(this.ox, this.oy, rr); }
      const hx = 6 + 14 * k; g.lineStyle(1, 0xffffff, 0.7); for (let i = 0; i < 6; i++) { const a1 = this.t * 4 + i * 1.047, a2 = a1 + 1.047; g.lineBetween(this.ox + Math.cos(a1) * hx, this.oy + Math.sin(a1) * hx, this.ox + Math.cos(a2) * hx, this.oy + Math.sin(a2) * hx); }
      this.orb.setVisible(true).setPosition(this.ox, this.oy).setScale(0.15 + 0.9 * k + 0.08 * Math.sin(this.t * 40)).setTint(k > 0.8 && Math.floor(this.t * 30) % 2 ? 0xffffff : 0xff8fd0).setAlpha(0.9);
      g.fillStyle(0xffffff, 1); g.fillCircle(this.ox, this.oy, 2 + 6 * k);
      if (this.t >= CHARGE_T) this.blast();
    } else {
      const k = this.t / FIRE_T, w = wv.width + 80, H = 150 * Math.pow(1 - k, 0.6) + 10 * Math.sin(this.t * 60);
      const x0 = this.ox, x1 = this.ox + this.dir * w;
      const band = (h: number, c: number, a: number) => { if (h <= 0) return; g.fillStyle(c, a); g.beginPath(); g.moveTo(x0, this.oy - h * 0.25); for (let i = 0; i <= 12; i++) { const x = x0 + (x1 - x0) * i / 12; g.lineTo(x, this.oy - h / 2 - Math.sin(this.t * 50 + i) * h * 0.06); } for (let i = 12; i >= 0; i--) { const x = x0 + (x1 - x0) * i / 12; g.lineTo(x, this.oy + h / 2 + Math.sin(this.t * 47 + i * 1.3) * h * 0.06); } g.lineTo(x0, this.oy + h * 0.25); g.closePath(); g.fillPath(); };
      band(H * 1.25, 0xff2f90, 0.3); band(H, 0xc0207a, 0.45); band(H * 0.7, 0x1f8fc0, 0.5); band(H * 0.45, 0x3fd0ff, 0.45); band(H * (0.12 + 0.04 * Math.sin(this.t * 70)), 0xffffff, 1);
      for (let i = 0; i < 8; i++) { const yy = this.oy + (Math.random() - 0.5) * H; g.lineStyle(1 + Math.random() * 2, 0xffffff, 0.8); g.lineBetween(x0 + this.dir * Math.random() * w * 0.3, yy, x0 + this.dir * (w * 0.3 + Math.random() * w * 0.7), yy); }
      g.fillStyle(0xffffff, 1); g.fillCircle(this.ox, this.oy, H * 0.16); g.fillStyle(0xff8fd0, 0.5); g.fillCircle(this.ox, this.oy, H * 0.26);
      if (Math.random() < 0.9) for (let i = 0; i < 4; i++) this.debris.push({ x: wv.x + Math.random() * wv.width, y: this.oy + (Math.random() - 0.5) * H, vx: this.dir * (200 + Math.random() * 400), vy: (Math.random() - 0.5) * 200, l: 0.4 + Math.random() * 0.6, c: [0xff5fb0, 0x3ff3ff, 0xffffff, 0xffd23f][i], s: 2 + Math.random() * 3 });
      this.dim.setAlpha(0.45 * (1 - k)); this.orb.setScale(2.5 * (1 - k)).setTint(0xffffff);
      if (this.t >= FIRE_T) { this.state = 'idle'; this.orb.setVisible(false); this.dim.setAlpha(0); b.allowGravity = true; this.p.locked = false; this.p.setDepth(this.pd); if (!this.charges) this.btn(false); }
    }
  }
  start() { this.charges--; this.state = 'charge'; this.t = 0; this.dir = this.p.facing; this.p.locked = true; this.pd = this.p.depth; this.p.setDepth(45); this.p.dashing = false; this.p.dashT = 0; this.p.jetting = false; this.motes = []; audio.sfx('cannon_charge'); this.p.play('charge', true); }
  blast() {
    this.state = 'fire'; this.t = 0; this.dbg.fired++; audio.sfx('cannon_blast'); this.p.play('beamfire', true);
    const s = this.s, cam = s.cameras.main, wv = cam.worldView; this.flash.setAlpha(1); s.tweens.add({ targets: this.flash, alpha: 0, duration: 420, ease: 'Quad.easeOut' });
    cam.shake(900, 0.03, true); cam.flash?.(0);
    for (let i = 0; i < 3; i++) { const r = s.add.ellipse(this.ox, this.oy, 20, 20).setStrokeStyle(6 - i * 1.5, [0xffffff, 0xff5fb0, 0x3ff3ff][i]).setDepth(42).setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: r, scaleX: 30, scaleY: 22, alpha: 0, duration: 650 + i * 200, delay: i * 90, ease: 'Cubic.easeOut', onComplete: () => r.destroy() }); }
    for (let i = 0; i < 90; i++) { const a = Math.random() * 6.283, v = 150 + Math.random() * 450; this.debris.push({ x: this.ox, y: this.oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 0.5 + Math.random() * 0.9, c: [0xff5fb0, 0x3ff3ff, 0xffffff, 0xffd23f][i % 4], s: 2 + Math.random() * 4 }); }
    this.clearShots(); this.onBlast?.();
    for (const e of this.enemies()) { if (!e.active || e.dead) continue; if (e.x < wv.x - 20 || e.x > wv.right + 20 || e.y < wv.y - 40 || e.y > wv.bottom + 60) continue;
      this.dbg.hits++; const ex = e.x, ey = e.y; e.hit(e.kind === 'boss' ? Math.ceil((e.maxHp || 30) * 0.25) : 80, this.dir); if (e.dead || e.hp <= 0) this.dbg.kills++;
      for (let j = 0; j < 12; j++) { const a = Math.random() * 6.283, v = 80 + Math.random() * 200; this.debris.push({ x: ex, y: ey - 12, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, l: 0.6 + Math.random() * 0.5, c: j % 2 ? 0xffd23f : 0xffffff, s: 2 + Math.random() * 3 }); } }
    this.p.x -= this.dir * 6;
  }
}
