import Phaser from 'phaser';
import { audio } from '../audio/Audio';
import { Enemy } from './Enemy';
import type { Fx } from '../systems/Fx';
import type { Blaster } from '../weapons/Blaster';
// Air Fortress units — art cut 1:1 from ref/fortress_sheet.png (tools/ft_parallax + en cuts).
export const FT_EN = ['drone', 'orb', 'heavy_d', 'wing', 'bip', 'tri', 'thrust', 'human', 'avian'] as const;
export function ftLoad(s: Phaser.Scene) {
  for (const k of FT_EN) if (!s.textures.exists('ft_en_' + k)) s.load.image('ft_en_' + k, `assets/ft/en/${k}.png`);
  if (!s.textures.exists('ft_boss_0')) s.load.image('ft_boss_0', 'assets/ft/boss/boss0.png');
  const PROP_KEYS = [
    'ring', 'hoop', 'ship0', 'portal0',
    'deco0', 'deco1', 'deco2', 'deco3', 'deco4', 'deco5', 'deco6', 'deco7', 'deco8', 'deco9', 'deco10', 'deco11', 'deco12', 'deco13', 'deco14',
    'gem0', 'gem1', 'gem2', 'gem3', 'gem4', 'gem5', 'gem6', 'gem7', 'gem8', 'gem9', 'gem10', 'gem11',
    // clean single props cropped from Dante's labeled sheet cards
    'airship_tower', 'airship_main', 'airship_ring', 'airship_fleet',
    'mech_portal', 'mech_console', 'hoop_ring', 'hoop_left', 'hoop_right',
    'banner_a', 'banner_b', 'banner_c', 'banner_d',
  ];
  for (const k of PROP_KEYS) if (!s.textures.exists('ft_' + k)) s.load.image('ft_' + k, `assets/ft/prop/${k}.png`);
}
type L = { groundAt(x: number, y: number): number; player: any; fx: Fx };
/** Hovering eye-drone: figure-8 near home, drifts toward Sakura, fires cyan orb fan. */
export class FtDrone extends Enemy {
  kind = 'drone'; home: Phaser.Math.Vector2; fireT = 1.4; shots = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster, tex = 'ft_en_drone') {
    super(s, x, y, tex, 2, fx); this.home = new Phaser.Math.Vector2(x, y); this.setOrigin(0.5, 0.5);
    this.b.setAllowGravity(false); this.b.setSize(Math.max(12, this.width * 0.7), Math.max(12, this.height * 0.7));
  }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return; this.aura.setPosition(this.x, this.y);
    const near = Math.abs(px - this.x) < 240 && Math.abs(py - this.y) < 160;
    const tx = this.home.x + Math.sin(this.t * 0.9) * 36 + (near ? Phaser.Math.Clamp(px - this.home.x, -70, 70) * 0.45 : 0);
    const ty = this.home.y + Math.sin(this.t * 1.7) * 12;
    if (this.hitT <= 0) this.b.setVelocity(Phaser.Math.Clamp((tx - this.x) * 2.2, -80, 80), Phaser.Math.Clamp((ty - this.y) * 2.2, -70, 70));
    this.face(Math.sign(px - this.x) || this.faceDir);
    if (!this.wob) this.setAngle(Phaser.Math.Clamp(this.b.velocity.x * 0.12, -12, 12));
    if (near && (this.fireT -= dt) <= 0.3 && this.teleT <= 0 && this.fireT + dt > 0.3) this.telegraph(0.3);
    if (near && this.fireT <= 0) {
      this.fireT = 2.0; this.shots++; const a = Math.atan2(py - this.y, px - this.x);
      for (const o of [-0.25, 0, 0.25]) this.gun.fireVel(this.x, this.y, Math.cos(a + o) * 130, Math.sin(a + o) * 130, { tex: 'ebolt', trail: 0x6fe8ff, life: 2.4, pulse: true });
      audio.sfx('eshot', { rate: 1.35 }); this.punch(1.15, 0.85);
    }
  }
  knock(dir: number) { this.b.setVelocity(dir * 110, -40); }
}
/** Rolling orb bot: patrols on ground, hops toward Sakura, fires short-range bolts. */
export class FtOrb extends Enemy {
  kind = 'bot'; minX: number; maxX: number; dir = 1; fireT = 1.2; shots = 0; speed = 38;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster, range = 70, tex = 'ft_en_orb') {
    super(s, x, y, tex, 3, fx); this.setOrigin(0.5, 1); this.minX = x - range; this.maxX = x + range;
    this.b.setSize(Math.max(14, this.width * 0.8), Math.max(14, this.height * 0.75)).setOffset((this.width - this.b.width) / 2, this.height - this.b.height);
  }
  get L() { return this.scene as unknown as L; }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return;
    this.b.setVelocityY(Math.min(500, this.b.velocity.y + 1100 * dt));
    const see = Math.abs(px - this.x) < 200 && Math.abs(py - this.y) < 80;
    if (see) this.face(Math.sign(px - this.x) || this.faceDir);
    if (see && (this.fireT -= dt) <= 0) {
      this.fireT = 1.6; this.shots++; const [mx, my] = [this.x + this.faceDir * 10, this.y - this.height * 0.5];
      this.gun.fireVel(mx, my, this.faceDir * 210, Phaser.Math.Clamp((py - 10 - my) * 0.5, -40, 40), { tex: 'ebolt', trail: 0xff4fd8, life: 1.8 });
      audio.sfx('eshot2', { rate: 1.5 }); this.punch(1.1, 0.9);
    }
    if (this.hitT > 0) return;
    if (this.x < this.minX) this.dir = 1; else if (this.x > this.maxX) this.dir = -1;
    const gnd = this.b.blocked.down || this.b.touching.down;
    if (gnd && (this.dir > 0 ? this.b.blocked.right : this.b.blocked.left)) this.dir *= -1;
    this.b.setVelocityX(this.dir * this.speed); if (!see) this.face(this.dir);
    this.setAngle(this.x * 4);
  }
}
/** Bipedal / heavy walkers: edge-aware patrol, burst fire. */
export class FtWalker extends Enemy {
  kind = 'bot'; minX: number; maxX: number; dir = 1; fireT = 1.5; shots = 0; speed = 28; sight = 210;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster, hp = 4, range = 80, tex = 'ft_en_human') {
    super(s, x, y, tex, hp, fx); this.setOrigin(0.5, 1); this.minX = x - range; this.maxX = x + range;
    this.b.setSize(Math.max(16, this.width * 0.55), Math.max(20, this.height * 0.85)).setOffset((this.width - this.b.width) / 2, this.height - this.b.height);
  }
  get L() { return this.scene as unknown as L; }
  edgeAhead(d: number) { const g = this.L.groundAt(this.x + d * (this.b.width / 2 + 4), this.y - 6); return g < 0 || Math.abs(g - this.y) > 8; }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return;
    this.b.setVelocityY(Math.min(520, this.b.velocity.y + 1100 * dt));
    const see = Math.abs(px - this.x) < this.sight && Math.abs(py - this.y) < 90;
    if (see) this.face(Math.sign(px - this.x) || this.faceDir);
    if (see && (this.fireT -= dt) <= 0.35 && this.teleT <= 0 && this.fireT + dt > 0.35) this.telegraph(0.35);
    if (see && this.fireT <= 0) {
      this.fireT = 1.9; this.shots++; const mx = this.x + this.faceDir * this.width * 0.4, my = this.y - this.height * 0.62;
      const a = Math.atan2(py - 12 - my, px - mx);
      for (const o of [-0.08, 0.08]) this.gun.fireVel(mx, my, Math.cos(a + o) * 240, Math.sin(a + o) * 240, { tex: 'ebolt', trail: 0xff3040, life: 2 });
      audio.sfx('eshot', { rate: 1.1 }); this.punch(1.12, 0.88);
    }
    if (this.hitT > 0 || this.turning) { this.b.setVelocityX(0); return; }
    if (see && Math.abs(px - this.x) < 70) { this.b.setVelocityX(0); return; }
    if (this.x < this.minX) this.dir = 1; else if (this.x > this.maxX) this.dir = -1;
    const gnd = this.b.blocked.down || this.b.touching.down;
    if (gnd && (this.edgeAhead(this.dir) || (this.dir > 0 ? this.b.blocked.right : this.b.blocked.left))) this.dir *= -1;
    this.b.setVelocityX(this.dir * this.speed); if (!see) this.face(this.dir);
  }
}
/** Winged avian interceptor: swoops in arcs, fires forward bolts. */
export class FtAvian extends Enemy {
  kind = 'drone'; home: Phaser.Math.Vector2; fireT = 1.1; shots = 0; swoop = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster) {
    super(s, x, y, 'ft_en_avian', 4, fx); this.home = new Phaser.Math.Vector2(x, y); this.setOrigin(0.5, 0.5);
    this.b.setAllowGravity(false); this.b.setSize(this.width * 0.7, this.height * 0.5);
  }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return; this.aura.setPosition(this.x, this.y);
    const near = Math.abs(px - this.x) < 280;
    if (this.swoop > 0) {
      this.swoop -= dt;
      this.b.setVelocity(this.faceDir * 220, Math.sin(this.t * 8) * 40);
      if (this.swoop <= 0) this.home.set(this.x, Math.min(this.home.y, py - 40));
    } else {
      const tx = this.home.x + Math.sin(this.t * 0.55) * 80, ty = this.home.y + Math.cos(this.t * 0.7) * 18;
      if (this.hitT <= 0) this.b.setVelocity(Phaser.Math.Clamp((tx - this.x) * 1.8, -110, 110), Phaser.Math.Clamp((ty - this.y) * 1.8, -80, 80));
      if (near && Math.abs(px - this.x) < 160 && (this.fireT -= dt) <= 0) {
        this.fireT = 2.4; this.swoop = 0.85; this.face(Math.sign(px - this.x) || this.faceDir); this.shots++;
        this.gun.fireVel(this.x, this.y, this.faceDir * 260, 20, { tex: 'ebolt', trail: 0xffd23f, life: 1.6 });
        audio.sfx('eshot', { rate: 0.9 }); this.punch(1.2, 0.8);
      }
    }
    this.face(Math.sign(px - this.x) || this.faceDir);
    this.setAngle(Phaser.Math.Clamp(this.b.velocity.y * 0.08 + this.b.velocity.x * 0.04, -18, 18));
    this.scaleY = 1 + 0.08 * Math.sin(this.t * (this.swoop > 0 ? 18 : 9));
  }
  knock(dir: number) { this.b.setVelocity(dir * 140, -50); }
}

const BOSS_HP = 48;
/** Winged Air-Fortress ship boss — 3-phase hover/fan/dive/rain/beam with sheet9 telegraphs + defeat. */
export class FtBoss extends Enemy {
  kind = 'boss'; maxHp = BOSS_HP; awake = false; st = 'sleep'; stT = 0; hx: number; hy: number; n = 0;
  dbg: Record<string, number> = { fan: 0, dive: 0, rain: 0, beam: 0, shift: 0 };
  onDead: () => void = () => {}; tx = 0; ty = 0; glowI: Phaser.GameObjects.Image;
  lastPhase = 1; shieldT = 0;
  // sheet9 burst/beam/bolt crops (tx2/fx atlas → ft_s9_XXX)
  static BURST = ['ft_s9_006', 'ft_s9_007', 'ft_s9_008', 'ft_s9_010', 'ft_s9_026', 'ft_s9_040', 'ft_s9_041', 'ft_s9_044'];
  static BEAM = ['ft_s9_000', 'ft_s9_001', 'ft_s9_002', 'ft_s9_003', 'ft_s9_004', 'ft_s9_005'];
  static BOLT = ['ft_s9_014', 'ft_s9_028', 'ft_s9_029', 'ft_s9_032', 'ft_s9_033', 'ft_s9_039'];
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster, public groundY: number) {
    super(s, x, y, 'ft_boss_0', BOSS_HP, fx); this.hx = x; this.hy = y; this.setOrigin(0.5, 0.5);
    this.setScale(1.85); this.b.setSize(this.width * 0.7, this.height * 0.55);
    this.setAlpha(0); this.setDepth(8.5);
    this.glowI = s.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xb04aff).setScale(6).setAlpha(0).setDepth(8.4);
  }
  get phase() { return this.hp > this.maxHp * 0.66 ? 1 : this.hp > this.maxHp * 0.33 ? 2 : 3; }
  get p2() { return this.phase >= 2; }
  s9(keys: string[], x: number, y: number, from = 0.5, to = 2.4, ms = 420, ang = 0) {
    const pool = keys.filter(k => this.scene.textures.exists(k)); if (!pool.length) { this.fx.explode(x, y, 0.5); return null; }
    const k = pool[Math.floor(Math.random() * pool.length)];
    const im = this.scene.add.image(x, y, k).setBlendMode(Phaser.BlendModes.ADD).setScale(from).setDepth(14).setAngle(ang).setAlpha(0.95);
    this.scene.tweens.add({ targets: im, scale: to, alpha: 0, angle: ang + 35, duration: ms, ease: 'Cubic.out', onComplete: () => im.destroy() }); return im;
  }
  hit(dmg: number, dir: number) {
    if (!this.awake || this.dead || this.st === 'dying' || this.shieldT > 0) return;
    super.hit(dmg, dir);
  }
  knock() {}
  punch(sx: number, sy: number, ms = 140) { if (this.turning || this.dead) return; this.scene.tweens.killTweensOf(this); this.setScale(1.85 * sx, 1.85 * sy); this.scene.tweens.add({ targets: this, scaleX: 1.85, scaleY: 1.85, duration: ms, ease: 'Quad.out' }); }
  phaseShift(ph: number) {
    const s: any = this.scene, cam = s.cameras.main; this.dbg.shift++; this.st = 'hover'; this.stT = 1.5; this.shieldT = 1.15; this.b.setVelocity(0, 0);
    cam.flash(240, ph === 3 ? 255 : 180, 100, 255, true); cam.shake(400, 0.011); audio.sfx('gate');
    s.toast?.show(ph === 2 ? 'WINGED FORTRESS — SHIELDS CRACK' : 'WINGED FORTRESS — CORE MELT', ph === 3 ? '#ffd23f' : '#ff4fd8');
    for (let i = 0; i < 5; i++) s.time.delayedCall(i * 80, () => this.s9(FtBoss.BURST, this.x + Phaser.Math.Between(-40, 40), this.y + Phaser.Math.Between(-20, 20), 0.5, 3 + i * 0.3, 560));
    this.s9(FtBoss.BEAM, this.x, this.y, 0.4, 2.8, 700, 90);
  }
  wake() {
    if (this.st !== 'sleep') return; this.st = 'intro'; this.stT = 2.1;
    this.setPosition(this.hx, this.hy - 200); this.setScale(1.85); this.glowI.setAlpha(0.55).setScale(9);
    this.scene.tweens.add({ targets: this, alpha: 1, y: this.hy, duration: 1800, ease: 'Sine.out' });
    this.scene.tweens.add({ targets: this.glowI, alpha: 0.38, scale: 6.5, duration: 1800, ease: 'Sine.out' });
    this.scene.cameras.main.shake(420, 0.009);
    this.scene.time.delayedCall(200, () => { try { (this.scene as any).toast?.show?.('WINGED FORTRESS', '#ff4fd8'); } catch {} });
    for (let i = 0; i < 4; i++) this.scene.time.delayedCall(i * 180, () => this.s9(FtBoss.BURST, this.hx + (i - 1.5) * 50, this.hy - 40, 0.4, 2.2, 500));
  }
  reset() {
    this.scene.tweens.killTweensOf(this); this.hp = this.maxHp; this.st = 'sleep'; this.awake = false; this.lastPhase = 1; this.shieldT = 0;
    this.setAlpha(0).setScale(1.85).setAngle(0); this.setPosition(this.hx, this.hy); this.b.setVelocity(0, 0); this.glowI.setAlpha(0);
  }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return;
    this.glowI.setPosition(this.x, this.y).setAlpha(this.alpha * (0.22 + 0.1 * Math.sin(this.t * 3.5)));
    if (this.st === 'sleep' || this.st === 'dying') { this.b.setVelocity(0, 0); return; }
    this.stT -= dt;
    if (this.shieldT > 0) { this.shieldT -= dt; this.setTint(Math.floor(this.shieldT * 14) % 2 ? 0xffffff : 0xff4fd8); if (this.shieldT <= 0) this.clearTint(); }
    if (this.awake && this.phase > this.lastPhase) { this.lastPhase = this.phase; this.phaseShift(this.phase); }
    if (this.st === 'intro') { this.b.setVelocity(0, 0); if (this.stT <= 0) { this.st = 'hover'; this.stT = 1.0; this.awake = true; } return; }
    this.face(Math.sign(px - this.x) || this.faceDir);
    const mv = (x: number, y: number, k: number, m: number) => this.b.setVelocity(Phaser.Math.Clamp((x - this.x) * k, -m, m), Phaser.Math.Clamp((y - this.y) * k, -m, m));
    const spd = this.phase === 3 ? 150 : this.phase === 2 ? 130 : 95;
    if (this.st === 'hover') {
      mv(px + Math.sin(this.t * 0.7) * 100, this.groundY - 130 + Math.sin(this.t * 1.4) * 16, 1.5, spd);
      this.setAngle(Phaser.Math.Clamp(this.b.velocity.x * 0.06, -6, 6));
      if (this.stT <= 0) {
        this.n++; const cycle = this.phase === 3 ? 5 : this.phase === 2 ? 4 : 3; const ph = this.n % cycle;
        if (ph === 0) { this.st = 'aim'; this.stT = this.phase === 3 ? 0.45 : 0.65; this.telegraph(this.stT); this.tx = px; this.ty = Math.min(py - 10, this.groundY - 40); this.s9(FtBoss.BOLT, this.x, this.y + 10, 0.4, 1.6, this.stT * 1000); }
        else if (this.phase >= 2 && ph === cycle - 1) { this.st = 'rainTele'; this.stT = 0.7; this.telegraph(0.7); this.s9(FtBoss.BURST, this.x, this.y - 20, 0.5, 2.0, 550); }
        else if (ph === 2 || (this.phase === 3 && ph === 3)) {
          this.st = 'beamTele'; this.stT = 0.65; this.telegraph(0.65); this.tx = px; this.ty = py;
          const a = Math.atan2(py - this.y, px - this.x);
          this.s9(FtBoss.BEAM, this.x + Math.cos(a) * 40, this.y + Math.sin(a) * 40, 0.35, 1.8, 500, Phaser.Math.RadToDeg(a) + 90);
        } else {
          this.st = 'fanTele'; this.stT = 0.6; this.telegraph(0.6); this.tx = px; this.ty = py - 10;
          this.s9(FtBoss.BURST, this.x, this.y + 8, 0.35, 1.5, 450);
        }
      }
      return;
    }
    if (this.st === 'fanTele') { this.b.setVelocity(0, 0); if (this.stT <= 0) {
      this.dbg.fan++; const a = Math.atan2(this.ty - this.y, this.tx - this.x); const n = this.phase === 3 ? 9 : 7;
      for (let i = -(n - 1) / 2; i <= (n - 1) / 2; i++) this.gun.fireVel(this.x, this.y + 8, Math.cos(a + i * 0.18) * 150, Math.sin(a + i * 0.18) * 150, { tex: 'ebolt', trail: 0xff4fd8, life: 2.5, pulse: true });
      audio.sfx('eshot', { rate: 0.85 }); this.punch(1.18, 0.82); this.s9(FtBoss.BURST, this.x, this.y + 8, 0.5, 1.8, 300);
      this.st = 'hover'; this.stT = this.phase === 3 ? 0.9 : this.phase === 2 ? 1.1 : 1.5;
    } return; }
    if (this.st === 'beamTele') { this.b.setVelocity(0, 0); if (this.stT <= 0) {
      this.dbg.beam++; const a = Math.atan2(this.ty - this.y, this.tx - this.x);
      for (let i = -1; i <= 1; i++) this.gun.fireVel(this.x, this.y + 10, Math.cos(a) * 200, Math.sin(a) * 200 + i * 30, { tex: 'ebolt', trail: 0x6fe8ff, life: 2.2 });
      if (this.phase >= 3) for (const o of [-0.35, 0.35]) this.gun.fireVel(this.x, this.y + 10, Math.cos(a + o) * 180, Math.sin(a + o) * 180, { tex: 'ebolt', trail: 0xffd23f, life: 2.2 });
      audio.sfx('eshot', { rate: 0.7 }); this.punch(1.2, 0.8); this.s9(FtBoss.BEAM, this.x, this.y, 0.5, 2.2, 360, Phaser.Math.RadToDeg(a) + 90);
      this.st = 'hover'; this.stT = this.phase === 3 ? 0.85 : 1.2;
    } return; }
    if (this.st === 'rainTele') { this.b.setVelocity(0, 0); if (this.stT <= 0) { this.st = 'rain'; this.stT = this.phase === 3 ? 2.8 : 2.4; } return; }
    if (this.st === 'aim') { this.b.setVelocity(0, 0); this.setAngle(Math.sin(this.t * 40) * 2); if (this.stT <= 0) { this.st = 'dive'; this.stT = 0.85; this.dbg.dive++; audio.sfx('dash'); this.s9(FtBoss.BOLT, this.x, this.y, 0.5, 1.8, 280); } return; }
    if (this.st === 'dive') {
      mv(this.tx, this.ty, 5.5, 340);
      if (this.stT <= 0 || Math.hypot(this.tx - this.x, this.ty - this.y) < 10) {
        this.st = 'hover'; this.stT = 1; this.scene.cameras.main.shake(160, 0.007); this.fx.explode(this.x, this.y + 24, 0.7);
        this.s9(FtBoss.BURST, this.x, this.y + 24, 0.6, 2.6, 420);
      }
      return;
    }
    if (this.st === 'rain') {
      mv(this.scene.cameras.main.worldView.centerX, this.groundY - 150, 2, 110); this.setAngle(0);
      if (Math.floor((this.stT + dt) * 4) !== Math.floor(this.stT * 4)) {
        this.dbg.rain++;
        for (let i = 0; i < (this.phase === 3 ? 7 : 5); i++) {
          const sx = this.x + (i - 2) * 36 + Phaser.Math.Between(-8, 8);
          this.gun.fireVel(sx, this.y + 20, (Math.random() - 0.5) * 40, 160 + Math.random() * 40, { tex: 'ebolt', trail: 0xffd23f, life: 2.8 });
        }
        this.s9(FtBoss.BOLT, this.x + Phaser.Math.Between(-60, 60), this.y + 16, 0.35, 1.4, 280);
        audio.sfx('eshot', { rate: 1.5, vol: 0.45 });
      }
      if (this.stT <= 0) { this.st = 'hover'; this.stT = 1; }
    }
  }
  die() {
    if (this.st === 'dying' || this.dead) return; this.st = 'dying'; this.awake = false; this.dead = true;
    this.b.setVelocity(0, 0); this.b.enable = false; this.scene.tweens.killTweensOf(this);
    const s = this.scene; audio.sfx('explode');
    for (let i = 0; i < 14; i++) s.time.delayedCall(i * 120, () => { if (!this.active) return;
      const ex = this.x + Phaser.Math.Between(-90, 90), ey = this.y + Phaser.Math.Between(-40, 40);
      this.fx.explode(ex, ey, 0.95); this.s9(FtBoss.BURST, ex, ey, 0.55, 3.0, 520);
      if (i % 3 === 0) this.s9(FtBoss.BEAM, ex, ey, 0.4, 2.2, 480, Phaser.Math.Between(0, 180));
      audio.sfx('explode', { rate: 0.75 + Math.random() * 0.35, vol: 0.5 }); this.setTintFill(i % 2 ? 0xffffff : 0xff4fd8);
    });
    s.time.delayedCall(500, () => { try { this.onDead(); } catch {} });
    s.tweens.add({
      targets: this, y: this.y + 90, alpha: 0, angle: 14, duration: 2000, ease: 'Quad.in',
      onComplete: () => {
        this.s9(FtBoss.BURST, this.x, this.y, 1, 6, 900); this.s9(FtBoss.BEAM, this.x, this.y, 0.8, 4, 800, 90);
        s.cameras.main.flash(340, 255, 220, 200); this.fx.shake(560, 0.018);
        try { this.glowI.destroy(); } catch {} try { this.aura.destroy(); } catch {} try { this.tele.destroy(); } catch {}
        this.emit('destroyed', this); this.destroy();
      },
    });
  }
}

/** Deck-mounted turret — aims at Sakura and fires when in range. Flush on platforms. */
export class FtTurret extends Enemy {
  kind = 'turret'; fireT = 1.2; shots = 0; range = 260;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster, tex: string, hp = 3) {
    super(s, x, y, tex, hp, fx); this.setOrigin(0.5, 1);
    this.b.setAllowGravity(false); this.b.setImmovable(true);
    this.b.setSize(Math.max(14, this.width * 0.7), Math.max(14, this.height * 0.7))
      .setOffset((this.width - this.b.width) / 2, this.height - this.b.height);
    this.setDepth(3.25);
  }
  knock() { /* bolted down */ }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return;
    this.b.setVelocity(0, 0);
    const dx = px - this.x, dy = py - (this.y - this.height * 0.55);
    const dist = Math.hypot(dx, dy);
    this.face(Math.sign(dx) || this.faceDir);
    const ang = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
    this.setAngle(Phaser.Math.Clamp(ang * 0.15, -18, 18));
    if (dist < this.range && dist > 20) {
      if ((this.fireT -= dt) <= 0.35 && this.teleT <= 0 && this.fireT + dt > 0.35) this.telegraph(0.3);
      if (this.fireT <= 0) {
        this.fireT = 1.55; this.shots++;
        const a = Math.atan2(dy, dx);
        const mx = this.x + Math.cos(a) * 10, my = this.y - this.height * 0.55 + Math.sin(a) * 6;
        this.gun.fireVel(mx, my, Math.cos(a) * 200, Math.sin(a) * 200, { tex: 'ebolt', trail: 0xff6a3c, life: 2.2 });
        audio.sfx('eshot', { rate: 0.85, vol: 0.5 }); this.punch(1.08, 0.92);
      }
    } else this.fireT = Math.min(this.fireT, 0.6);
  }
}
