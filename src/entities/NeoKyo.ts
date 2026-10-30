import Phaser from 'phaser';
import { audio } from '../audio/Audio';
import { Enemy } from './Enemy';
import type { Fx } from '../systems/Fx';
import type { Blaster } from '../weapons/Blaster';
// Neo-Kyo units (chapter 2), art from Dante's sheet via tools/l2_enemy.py. All face Sakura; walkers use gravity and stand on platforms.
export const NK_FRAMES: Record<string, number> = { drone: 4, sentry: 4, assault: 4, shield: 4, heavy: 4 };
export function nkAnims(s: Phaser.Scene) {
  const A = s.anims, f = (u: string, ix: number[]) => ix.map(i => ({ key: `nk_${u}_${i}` }));
  if (A.exists('nk_drone_fly')) return;
  // frames regenerated from the sheet: 0 idle, 1 step A, 2 step B, 3 fire
  A.create({ key: 'nk_drone_fly', frames: f('drone', [0, 0, 1, 1]), frameRate: 6, repeat: -1 }); A.create({ key: 'nk_drone_aim', frames: f('drone', [2, 3]), frameRate: 10, repeat: -1 });
  A.create({ key: 'nk_sentry_walk', frames: f('sentry', [0, 1, 0, 2]), frameRate: 8, repeat: -1 }); A.create({ key: 'nk_sentry_aim', frames: f('sentry', [0, 3]), frameRate: 16, repeat: -1 });
  A.create({ key: 'nk_assault_walk', frames: f('assault', [1, 0, 2, 0]), frameRate: 7, repeat: -1 }); A.create({ key: 'nk_assault_aim', frames: f('assault', [3]), frameRate: 14, repeat: -1 });
  A.create({ key: 'nk_shield_walk', frames: f('shield', [1, 0, 2, 0]), frameRate: 5, repeat: -1 }); A.create({ key: 'nk_shield_aim', frames: f('shield', [0, 3]), frameRate: 14, repeat: -1 });
  A.create({ key: 'nk_heavy_walk', frames: f('heavy', [1, 0, 2, 0]), frameRate: 4, repeat: -1 }); A.create({ key: 'nk_heavy_aim', frames: f('heavy', [0, 3]), frameRate: 12, repeat: -1 });
}
type L2 = { groundAt(x: number, y: number): number; player: any; fx: Fx };
/** walker base: gravity, edge/wall-aware patrol, face Sakura when she's in sight, step bob (visual only) */
abstract class Walker extends Enemy {
  minX: number; maxX: number; speed = 26; dir = 1; sight = 200; bobA = 1; stepT = 0;
  constructor(s: Phaser.Scene, x: number, y: number, u: string, hp: number, fx: Fx, public gun: Blaster, bw: number, bh: number, range = 70) {
    super(s, x, y, `nk_${u}_0`, hp, fx); this.setOrigin(0.5, 1); this.b.setSize(bw, bh).setOffset((this.width - bw) / 2, this.height - bh); this.minX = x - range; this.maxX = x + range; this.play(`nk_${u}_walk`); this.u = u;
  }
  u: string; get L() { return this.scene as unknown as L2; }
  sees(px: number, py: number) { return Math.abs(px - this.x) < this.sight && Math.abs(py - this.y) < 70; }
  grounded() { return this.b.blocked.down || this.b.touching.down; }
  edgeAhead(d: number) { const g = this.L.groundAt(this.x + d * (this.b.width / 2 + 4), this.y - 6); return g < 0 || Math.abs(g - this.y) > 6; }
  walk(dt: number, px: number, py: number, stop: boolean) {
    if (stop || this.turning) { this.b.setVelocityX(0); return; }
    if (this.x < this.minX) this.dir = 1; else if (this.x > this.maxX) this.dir = -1;
    if (this.grounded() && (this.edgeAhead(this.dir) || (this.dir > 0 ? this.b.blocked.right : this.b.blocked.left))) this.dir *= -1;
    this.b.setVelocityX(this.dir * this.speed); if (!this.sees(px, py)) this.face(this.dir);
    this.stepT += dt * this.speed * 0.25; if (!this.scene.tweens.isTweening(this)) this.setAngle(Math.sin(this.stepT) * this.bobA);
  }
  tick(dt: number, px: number, py: number) { super.tick(dt, px, py); if (this.dead) return; this.b.setVelocityY(Math.min(500, this.b.velocity.y + 1100 * dt)); }
  knock(dir: number) { this.b.setVelocityX(dir * 60); }
  muzzle() { return [this.x + this.faceDir * this.width * 0.42, this.y - this.height * 0.62]; }
  flash(x: number, y: number, c: number) { const g = this.scene.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(c).setScale(0.5).setDepth(11); this.scene.tweens.add({ targets: g, scale: 0.1, alpha: 0, duration: 120, onComplete: () => g.destroy() }); }
}
/** Drone: hovering orb. Figure-8 drift near home, drifts toward Sakura, telegraphs then fires a 3-orb fan of homing-lite plasma. */
export class NkDrone extends Enemy {
  kind = 'drone'; home: Phaser.Math.Vector2; fireT = 1.6; shots = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster) { super(s, x, y, 'nk_drone_0', 2, fx); this.home = new Phaser.Math.Vector2(x, y); this.setOrigin(0.5, 0.5); this.b.setSize(20, 18); this.play('nk_drone_fly'); this.eyeY = 0; this.eyeX = 2; }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return; this.aura.setPosition(this.x, this.y);
    const near = Math.abs(px - this.x) < 220 && Math.abs(py - this.y) < 160;
    const tx = this.home.x + Math.sin(this.t * 0.8) * 34 + (near ? Phaser.Math.Clamp(px - this.home.x, -60, 60) * 0.5 : 0), ty = this.home.y + Math.sin(this.t * 1.6) * 10;
    if (this.hitT <= 0) this.b.setVelocity(Phaser.Math.Clamp((tx - this.x) * 2, -70, 70), Phaser.Math.Clamp((ty - this.y) * 2, -60, 60));
    this.face(Math.sign(px - this.x) || this.faceDir); if (!this.wob) this.setAngle(Phaser.Math.Clamp(this.b.velocity.x * 0.15, -10, 10)); else this.setAngle(Math.sin(this.wobT * 30) * this.wob);
    if (near && (this.fireT -= dt) <= 0.35 && this.teleT <= 0 && this.fireT + dt > 0.35) { this.telegraph(0.35); this.play('nk_drone_aim'); }
    if (near && this.fireT <= 0) { this.fireT = 2.2; this.shots++; const a = Math.atan2(py - this.y, px - this.x);
      for (const o of [-0.22, 0, 0.22]) this.gun.fireVel(this.x, this.y, Math.cos(a + o) * 120, Math.sin(a + o) * 120, { tex: 'nk_s_orb', trail: 0xff4fd8, life: 2.6, pulse: true });
      audio.sfx('eshot', { rate: 1.3 }); this.punch(1.2, 0.8); this.scene.time.delayedCall(220, () => { if (!this.dead) this.play('nk_drone_fly'); }); }
  }
  knock(dir: number) { this.b.setVelocity(dir * 120, -30); }
}
/** Sentry: spider walker. Scuttles, stops and plants (squash), then fires a twin cyan bolt pair at Sakura. */
export class NkSentry extends Walker {
  kind = 'nksentry'; fireT = 1.5; aimT = 0; shots = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, gun: Blaster) { super(s, x, y, 'sentry', 3, fx, gun, 26, 18, 60); this.speed = 40; this.bobA = 2; this.eyeY = 0.7; }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return; const see = this.sees(px, py); if (see) this.face(Math.sign(px - this.x) || this.faceDir);
    if (this.aimT > 0) { this.aimT -= dt; this.b.setVelocityX(0);
      if (this.aimT <= 0) { this.play('nk_sentry_walk'); this.shots++; const [mx, my] = this.muzzle(), a = Math.atan2(py - 12 - my, px - mx);
        for (const dy of [-3, 3]) this.gun.fireVel(mx, my + dy, Math.cos(a) * 230, Math.sin(a) * 230, { tex: 'nk_s_bolt', trail: 0x3ff3ff, life: 2 });
        this.flash(mx, my, 0x3ff3ff); audio.sfx('eshot2', { rate: 1.4 }); this.punch(1.15, 0.85); } return; }
    if (see && (this.fireT -= dt) <= 0 && this.grounded()) { this.fireT = 1.9; this.aimT = 0.45; this.telegraph(0.45); this.play('nk_sentry_aim'); this.punch(1.1, 0.8, 300); return; }
    if (this.hitT <= 0) this.walk(dt, px, py, false);
  }
}
/** Assault: rifle trooper. Patrols on real walk frames; in range it halts, aims (eye flare) and fires a 3-round tracer burst. */
export class NkAssault extends Walker {
  kind = 'assault'; fireT = 1.2; burst = 0; burstT = 0; shots = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, gun: Blaster) { super(s, x, y, 'assault', 4, fx, gun, 14, 40, 80); this.speed = 34; this.bobA = 0; this.eyeY = 0.86; this.sight = 230; }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return; const see = this.sees(px, py);
    if (this.burst > 0) { this.b.setVelocityX(0); if ((this.burstT -= dt) <= 0) { this.burstT = 0.11; this.burst--; this.shots++; const [mx, my] = this.muzzle();
        this.gun.fireVel(mx, my, this.faceDir * 300, Phaser.Math.Clamp((py - 14 - my) * 0.6, -60, 60) + (Math.random() - 0.5) * 16, { tex: 'nk_s_tracer', trail: 0xff3040, life: 1.6 });
        this.flash(mx, my, 0xffa040); audio.sfx('eshot', { rate: 1.8, vol: 0.6 }); this.x -= this.faceDir; if (!this.burst) this.play('nk_assault_walk'); } return; }
    if (see) { this.face(Math.sign(px - this.x) || this.faceDir); this.fireT -= dt;
      if (this.fireT <= 0.4 && this.fireT + dt > 0.4) { this.telegraph(0.4); this.play('nk_assault_aim'); }
      if (this.fireT <= 0) { this.fireT = 2; this.burst = 3; this.burstT = 0; }
      if (this.fireT < 0.4) { this.b.setVelocityX(0); return; } }
    if (this.hitT <= 0) this.walk(dt, px, py, see && Math.abs(px - this.x) < 90); if (this.b.velocity.x === 0 && !this.burst && this.fireT >= 0.4) this.anims.pause(); else this.anims.resume();
  }
}
/** Shield: hard-light hex shield in front deflects normal shots (hit from behind, with tier-3, power or the beam). Throws spinning hex disks that weave. */
export class NkShield extends Walker {
  kind = 'nkshield'; fireT = 2; blocked = 0; shots = 0; g: Phaser.GameObjects.Graphics;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, gun: Blaster) { super(s, x, y, 'shield', 5, fx, gun, 22, 44, 60); this.speed = 20; this.bobA = 1; this.eyeY = 0.82; this.g = s.add.graphics().setDepth(8.5).setBlendMode(Phaser.BlendModes.ADD); this.once('destroy', () => this.g.destroy()); }
  hit(dmg: number, dir: number, beam = false) {
    if (!this.dead && !beam && dmg < 2 && dir === -this.faceDir && !this.turning) { this.blocked++; this.shT = 0.15; audio.sfx('ehit', { rate: 1.8 }); const sx = this.x + this.faceDir * 16, sy = this.y - 24;
      for (let i = 0; i < 6; i++) { const r = this.scene.add.rectangle(sx, sy + (Math.random() - 0.5) * 20, 2, 2, i % 2 ? 0x9ff0ff : 0xffffff).setDepth(11).setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({ targets: r, x: sx + this.faceDir * (8 + Math.random() * 14), y: r.y + (Math.random() - 0.5) * 18, alpha: 0, duration: 220, onComplete: () => r.destroy() }); } return; }
    super.hit(dmg, dir);
  }
  shT = 0;
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return; const see = this.sees(px, py); if (see) this.face(Math.sign(px - this.x) || this.faceDir);
    this.shT = Math.max(0, this.shT - dt); const g = this.g; g.clear(); if (!this.turning) { const sx = this.x + this.faceDir * 16, sy = this.y - 24, a = 0.35 + 0.15 * Math.sin(this.t * 5) + this.shT * 4;
      g.lineStyle(1.5, 0x7ff6ff, Math.min(1, a + 0.2)); g.fillStyle(0x3ff3ff, a * 0.35);
      const pts = [[0, -20], [this.faceDir * 5, -12], [this.faceDir * 6, 0], [this.faceDir * 5, 12], [0, 20]].map(([x, y]) => new Phaser.Math.Vector2(sx + x, sy + y)); g.fillPoints(pts, false); g.strokePoints(pts, false);
      for (let i = -2; i <= 2; i++) g.fillStyle(0xffffff, a * 0.5).fillRect(sx + this.faceDir * 2, sy + i * 7 + Math.sin(this.t * 3 + i) * 1.5, 1, 2); }
    if (see && (this.fireT -= dt) <= 0.5 && this.fireT + dt > 0.5) { this.telegraph(0.5); this.play('nk_shield_aim'); }
    if (see && this.fireT <= 0) { this.fireT = 2.6; this.shots++; this.play('nk_shield_walk'); const [mx, my] = this.muzzle();
      this.gun.fireVel(mx, my, this.faceDir * 110, 0, { tex: 'nk_s_disk', spin: 12, wave: [26, 5], trail: 0x7ff6ff, life: 3.2 }); audio.sfx('eshot2', { rate: 0.8 }); this.punch(0.9, 1.08); }
    if (this.hitT <= 0) this.walk(dt, px, py, see && Math.abs(px - this.x) < 60 || this.fireT < 0.5);
  }
}
/** Heavy: slow stomping walker (small shake per step). Lobs a mortar that arcs onto Sakura and bursts into a ground shockwave running both ways. */
export class NkHeavy extends Walker {
  kind = 'heavy'; fireT = 2.2; shots = 0; waves: { o: Phaser.GameObjects.Image; vx: number; life: number }[] = []; mortars: any[] = []; lastStep = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, gun: Blaster) { super(s, x, y, 'heavy', 9, fx, gun, 24, 52, 70); this.speed = 14; this.bobA = 0.6; this.eyeY = 0.75; this.sight = 260; this.once('destroy', () => { this.waves.forEach(w => w.o.destroy()); this.mortars.forEach(m => m.destroy()); }); }
  knock() { /* too heavy */ }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); const L = this.L;
    for (const w of this.waves) { w.life -= dt; w.o.x += w.vx * dt; w.o.setAlpha(Math.min(1, w.life * 2)).setScale(1, 0.8 + 0.3 * Math.sin(w.life * 30)); const gy = L.groundAt(w.o.x, w.o.y - 8);
      if (gy < 0 || Math.abs(gy - w.o.y) > 4) w.life = 0; else if (Math.abs(L.player.x - w.o.x) < 12 && L.player.y > w.o.y - 12 && L.player.y <= w.o.y + 2) L.player.damage(w.o.x); if (w.life <= 0) w.o.destroy(); }
    this.waves = this.waves.filter(w => w.life > 0);
    for (const m of this.mortars) { m.vy += 420 * dt; m.x += m.vx * dt; m.y += m.vy * dt; m.rotation += 6 * dt; if ((m.trT = (m.trT || 0) - dt) <= 0) { m.trT = 0.03; const t = this.scene.add.image(m.x, m.y, 'glow').setTint(0xff8030).setBlendMode(Phaser.BlendModes.ADD).setScale(0.18).setDepth(10); this.scene.tweens.add({ targets: t, alpha: 0, scale: 0.05, duration: 300, onComplete: () => t.destroy() }); }
      const gy = L.groundAt(m.x, m.y - 10); if (Math.hypot(L.player.x - m.x, L.player.y - 16 - m.y) < 10) { L.player.damage(m.x); m.dead = true; }
      if (m.dead || (gy >= 0 && m.y >= gy) || m.y > 700) { const yy = gy >= 0 && m.y >= gy - 2 ? gy : m.y; this.fx.explode(m.x, yy - 6, 0.6); audio.sfx('explode', { rate: 1.4, vol: 0.5 }); this.scene.cameras.main.shake(80, 0.003);
        if (!m.dead && gy >= 0) for (const d of [-1, 1]) this.waves.push({ o: this.scene.add.image(m.x, gy, 'nk_s_wave').setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(9).setFlipX(d < 0), vx: d * 130, life: 0.9 });
        m.dead = true; m.destroy(); } }
    this.mortars = this.mortars.filter(m => !m.dead);
    if (this.dead) return; const see = this.sees(px, py); if (see) this.face(Math.sign(px - this.x) || this.faceDir);
    if (see && (this.fireT -= dt) <= 0.6 && this.fireT + dt > 0.6) { this.telegraph(0.6); this.play('nk_heavy_aim'); }
    if (see && this.fireT <= 0) { this.fireT = 3; this.shots++; this.play('nk_heavy_walk'); const mx = this.x + this.faceDir * 8, my = this.y - 54, T = 1.1;
      const m = this.scene.add.image(mx, my, 'nk_s_mortar').setDepth(11).setBlendMode(Phaser.BlendModes.ADD) as any; m.vx = (px - mx) / T; m.vy = (py - 4 - my - 0.5 * 420 * T * T) / T; this.mortars.push(m);
      this.flash(mx, my, 0xff9040); audio.sfx('eshot', { rate: 0.55 }); this.punch(1.06, 0.92, 220); }
    if (this.hitT <= 0) this.walk(dt, px, py, this.fireT < 0.6);
    // stomp: footfall on each walk-frame change
    const fr = this.anims.currentFrame?.index ?? 0; if (this.anims.currentAnim?.key === 'nk_heavy_walk' && fr !== this.lastStep && this.b.velocity.x !== 0) { this.lastStep = fr; audio.sfx('ehit', { rate: 0.4, vol: 0.35 });
      if (Math.abs(this.L.player.x - this.x) < 240) this.scene.cameras.main.shake(60, 0.0015); }
  }
}
