import { touch } from '../systems/Touch';
import Phaser from 'phaser';
import { PlayerFx } from './PlayerFx';
// Tunables (px, px/s, s). 480x270 world; player ~40px tall.
export const T = {
  maxRun: 150, accelGround: 1400, decelGround: 1800, accelAir: 900, decelAir: 500,
  gravity: 1100, fallGravityMult: 1.6, maxFall: 420, jumpVel: 410, doubleJumpVel: 360, jumpCutMult: 0.45,
  coyote: 0.1, buffer: 0.12, dashSpeed: 400, dashTime: 0.16, dashCooldown: 0.2, landTime: 0.12,
};
// Jet boots (Kurogen-tech upgrade): hold jump after the double jump to thrust upward while fuel lasts; refills on landing.
export const JET = { fuel: 0.55, vel: 170, accel: 3000 };
type State = 'idle' | 'run' | 'jump' | 'doublejump' | 'fall' | 'land' | 'dash' | 'hurt';
export const HP_MAX = 5, IFRAMES = 1.0, HURT_TIME = 0.3;
export class Player extends Phaser.Physics.Arcade.Sprite {
  state_: State = 'idle'; facing = 1; coyoteT = 0; bufferT = 0; airJumps = 1; dashT = 0; dashCd = 0; canAirDash = true; landT = 0; dbg = { dashes: [] as {x0:number,x1:number,dur:number}[], jumps: 0, djumps: 0, coyoteJumps: 0, cur: null as any, jetT: 0 };
  jumpHeld = false; dashing = false; jumpPressed = false; dashPressed = false; keys: any; trail: Phaser.GameObjects.Particles.ParticleEmitter;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'p_idle', 0); scene.add.existing(this); scene.physics.add.existing(this);
    this.setOrigin(0.5, 1); const b = this.body as Phaser.Physics.Arcade.Body;
    b.setSize(10, 28).setOffset(27, 15); b.setMaxVelocityY(T.maxFall);
    this.keys = scene.input.keyboard!.addKeys({ left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D', jump: 'SPACE', dash: 'SHIFT', j: 'J', x: 'X' });
    scene.input.keyboard!.on('keydown-J', (e: KeyboardEvent) => { if (!e.repeat) this.shootPressed = true; });
    scene.input.keyboard!.on('keydown-X', (e: KeyboardEvent) => { if (!e.repeat) this.shootPressed = true; });
    this.trail = scene.add.particles(0, 0, 'petal', { lifespan: 450, speed: { min: 10, max: 40 }, angle: { min: 0, max: 360 }, rotate: { min: 0, max: 360 },
      alpha: { start: 1, end: 0 }, scale: { start: 1.6, end: 0.5 }, blendMode: 'ADD', tint: [0xff8fd0, 0xffc0e8, 0xff5fb0], gravityY: 60, frequency: 8, emitting: false, follow: this, followOffset: { x: 0, y: -20 } });
    scene.input.keyboard!.on('keydown-SPACE', (e: KeyboardEvent) => { if (!e.repeat) this.jumpPressed = true; });
    scene.input.keyboard!.on('keydown-SHIFT', (e: KeyboardEvent) => { if (!e.repeat) this.dashPressed = true; });
    this.setDepth(10); this.trail.setDepth(9); this.play('idle');
    // thruster plume: white-cyan core (tight, fast) inside a flickering pink/violet outer flame
    this.jetFx = scene.add.particles(0, 0, 'glow', { lifespan: { min: 90, max: 160 }, speedY: { min: 140, max: 220 }, speedX: { min: -6, max: 6 }, scaleX: { start: 0.22, end: 0.05 }, scaleY: { start: 0.4, end: 0.1 },
      alpha: { start: 1, end: 0.2 }, tint: [0xffffff, 0xe0ffff, 0x9ff3ff], blendMode: 'ADD', frequency: 8, quantity: 2, emitting: false, follow: this, followOffset: { x: 0, y: 0 } }).setDepth(10);
    this.jetPetals = scene.add.particles(0, 0, 'glow', { lifespan: { min: 160, max: 300 }, speedY: { min: 80, max: 150 }, speedX: { min: -20, max: 20 }, scale: { start: 0.45, end: 0.1 },
      alpha: { start: 0.75, end: 0 }, tint: [0xff4fd8, 0xff8fe0, 0xb58cff, 0x8a5cff], blendMode: 'ADD', frequency: 10, quantity: 2, emitting: false, follow: this, followOffset: { x: 0, y: 2 } }).setDepth(9);
    this.pfx = new PlayerFx(scene, this as any);
  }
  hasJet = false; fuel = JET.fuel; jetting = false; jetFx!: Phaser.GameObjects.Particles.ParticleEmitter; jetPetals!: Phaser.GameObjects.Particles.ParticleEmitter;
  dashBuf = 0; poseLock = false; dashCount = 0; pfx: PlayerFx; beam: any = null; holdT = 0;
  hp = HP_MAX; iT = 0; hurtT = 0; shootPressed = false; shootAnimT = 0; gun: any = null; dbgHits = 0;
  damage(fromX: number, amt = 1): boolean {
    if (this.iT > 0 || this.hp <= 0) return false;
    this.hp = Math.max(0, this.hp - amt); this.dbgHits++; this.iT = IFRAMES; this.hurtT = HURT_TIME; this.dashing = false; this.dashT = 0; this.trail.stop(); this.jetting = false; this.jetFx.stop(); this.jetPetals.stop();
    const d = this.x < fromX ? -1 : 1; this.body_.setVelocity(d * 170, -190); this.facing = -d;
    this.setAnimState('hurt', true); this.emit('hurt', this.hp); return true;
  }
  get body_() { return this.body as Phaser.Physics.Arcade.Body; }
  update(dt: number) {
    const k = this.keys, b = this.body_, onGround = b.blocked.down;
    if (touch.jumpP) { this.jumpPressed = true; touch.jumpP = false; } if (touch.dashP) { this.dashPressed = true; touch.dashP = false; } if (touch.shootP) { this.shootPressed = true; touch.shootP = false; }
    const dir = (k.right.isDown || k.d.isDown || touch.right ? 1 : 0) - (k.left.isDown || k.a.isDown || touch.left ? 1 : 0);
    if (this.iT > 0) { this.iT -= dt; this.setAlpha(this.iT > 0 && Math.floor(this.iT * 20) % 2 ? 0.25 : 1); }
    if (this.hurtT > 0) {
      this.hurtT -= dt; let gh = T.gravity * (b.velocity.y > 0 ? T.fallGravityMult : 1); b.setVelocityY(b.velocity.y + gh * dt);
      b.setVelocityX(b.velocity.x * Math.pow(0.05, dt)); this.jumpPressed = this.dashPressed = this.shootPressed = false; this.setFlipX(this.facing < 0);
      if (this.hurtT <= 0) this.setAnimState(onGround ? 'idle' : 'fall', true); return;
    }
    if (this.jumpPressed) this.bufferT = T.buffer; else this.bufferT -= dt;
    this.jumpHeld = k.jump.isDown || touch.jump || this.jumpPressed; this.jumpPressed = false; if (this.dashPressed) this.dashBuf = 0.25; this.dashPressed = false; this.dashBuf -= dt; const dashP = this.dashBuf > 0;
    if (onGround) { this.coyoteT = T.coyote; this.airJumps = 1; this.canAirDash = true; } else this.coyoteT -= dt;
    this.dashCd -= dt;
    // dash
    if (dashP && this.dashCd <= 0 && this.dashT <= 0 && (onGround || this.canAirDash)) {
      this.dashBuf = 0; if (dir) this.facing = dir; this.dashing = true; this.dashCount++; this.dashT = T.dashTime; this.dashCd = T.dashCooldown + T.dashTime; if (!onGround) this.canAirDash = false;
      this.dbg.cur = { x0: this.x, t: 0 }; this.trail.start(); this.scene.cameras.main.shake(60, 0.002);
    }
    if (this.dashing && this.dashT <= 0) { // end dash one frame after the last dash-velocity frame was integrated
      this.dashing = false; if (this.dbg.cur) { this.dbg.dashes.push({ x0: this.dbg.cur.x0, x1: this.x, dur: this.dbg.cur.t }); this.dbg.cur = null; }
      b.setVelocityX(this.facing * T.maxRun); this.trail.stop();
    }
    if (this.dashing) {
      if (this.bufferT > 0 && (onGround || this.coyoteT > 0)) { this.dashT = 0; this.dashing = false; this.dbg.cur = null; this.trail.stop(); }
      else { b.setVelocity(this.facing * T.dashSpeed, 0); this.dashT -= dt; if (this.dbg.cur) this.dbg.cur.t += dt; this.setFlipX(this.facing < 0); this.setAnimState('dash'); return; }
    }
    // horizontal
    const target = dir * T.maxRun, accel = dir ? (onGround ? T.accelGround : T.accelAir) : (onGround ? T.decelGround : T.decelAir);
    const vx = b.velocity.x; const turning = dir && Math.sign(vx) !== dir && vx !== 0;
    b.setVelocityX(Phaser.Math.Linear(vx, target, 0) + Phaser.Math.Clamp(target - vx, -accel * dt * (turning ? 1.5 : 1), accel * dt * (turning ? 1.5 : 1)));
    if (dir) this.facing = dir;
    // jump
    if (this.bufferT > 0) {
      if (onGround || this.coyoteT > 0) { this.dbg.jumps++; if (!onGround) this.dbg.coyoteJumps++; b.setVelocityY(-T.jumpVel); this.bufferT = 0; this.coyoteT = 0; this.setAnimState('jump', true); this.squash(0.85, 1.15); }
      else if (this.airJumps > 0) { b.setVelocityY(-T.doubleJumpVel); this.airJumps--; this.dbg.djumps++; this.bufferT = 0; this.setAnimState('doublejump', true); this.burst(); this.squash(0.8, 1.2); }
    }
    // gravity: variable height + heavier fall
    let g = T.gravity; if (b.velocity.y > 0) g *= T.fallGravityMult;
    b.setVelocityY(b.velocity.y + ((this.scene as any).onSlope && b.velocity.y >= 0 ? 0 : g) * dt);
    if (!this.jumpHeld && b.velocity.y < 0) b.setVelocityY(b.velocity.y * Math.pow(T.jumpCutMult, dt * 20));
    // jet boots
    const wasJet = this.jetting; this.jetting = false;
    if (onGround) this.fuel = JET.fuel;
    else if (this.hasJet && this.airJumps === 0 && (k.jump.isDown || touch.jump) && this.fuel > 0 && this.bufferT <= 0) {
      if (b.velocity.y > -JET.vel) b.setVelocityY(Math.max(-JET.vel, b.velocity.y - JET.accel * dt));
      this.fuel = Math.max(0, this.fuel - dt); this.jetting = true; this.dbg.jetT = (this.dbg.jetT || 0) + dt;
    }
    if (this.jetting !== wasJet) { if (this.jetting) { this.jetFx.start(); this.jetPetals.start(); } else { this.jetFx.stop(); this.jetPetals.stop(); } }
    this.setFlipX(this.facing < 0);
    // shoot (J / X; hold = auto-fire at cooldown rate)
    // tap = blaster shot; hold = charge; release a charged shot = beam
    const held = k.j.isDown || k.x.isDown || touch.shoot, mx = this.x + this.facing * 15, my = this.y - (this.poseLock ? 16 : 19);
    if (this.shootPressed && this.gun && !(this.beam && this.beam.firing) && this.gun.tryFire(mx, my, this.facing)) this.shootAnimT = 0.22;
    this.shootPressed = false;
    if (this.beam) {
      if (held) { this.holdT += dt; if (this.holdT > 0.25) this.beam.charge(dt, mx, my); }
      else { if (this.beam.release(mx, my, this.facing)) this.shootAnimT = 0; this.holdT = 0; }
      const charging = this.beam.chargeT > 0.25 && !this.beam.firing;
      if (this.beam.firing) { if (onGround) b.setVelocityX(-this.facing * 25); this.play('beamfire', true); this.poseLock = true; }
      else if (charging) { if (onGround) b.setVelocityX(b.velocity.x * 0.25); this.play('charge', true); this.anims.timeScale = this.beam.level === 2 ? 1.8 : this.beam.level === 1 ? 1.3 : 1; this.poseLock = true; }
      else if (this.poseLock) { this.poseLock = false; this.play(this.state_, true); }
    }
    if (this.poseLock) return;
    // animation state
    if (onGround) {
      if (this.state_ === 'fall' || this.state_ === 'doublejump' || this.state_ === 'jump') { if (b.velocity.y >= 0) { this.landT = T.landTime; this.setAnimState('land'); this.squash(1.18, 0.84); } }
      if (this.landT > 0) { this.landT -= dt; if (dir) this.landT = 0; }
      if (this.landT <= 0) this.setAnimState(Math.abs(b.velocity.x) > 20 ? 'run' : 'idle');
      if (this.state_ === 'run') this.anims.timeScale = Phaser.Math.Clamp(Math.abs(b.velocity.x) / T.maxRun, 0.5, 1.2);
      else this.anims.timeScale = 1;
      if (this.shootAnimT > 0) { this.shootAnimT -= dt; const want = this.state_ === 'run' ? 'runshoot' : 'shoot';
        if (this.anims.currentAnim?.key !== want) this.play(want, true); if (this.shootAnimT <= 0) this.play(this.state_, true); }
    } else {
      this.shootAnimT = 0;
      this.anims.timeScale = 1;
      if (Math.abs(b.velocity.y) < 60 && (this.state_ === 'jump')) { this.play('apex', true); }
      if (b.velocity.y > 60 && this.state_ !== 'fall' && !(this.state_ === 'doublejump' && this.anims.isPlaying)) this.setAnimState('fall');
      else if (this.state_ === 'run' || this.state_ === 'idle' || this.state_ === 'hurt' || this.state_ === 'land' || this.state_ === 'dash') this.setAnimState(b.velocity.y < 0 ? 'jump' : 'fall');
    }
  }
  squash(sx: number, sy: number) { this.scene.tweens.killTweensOf(this); this.setScale(sx, sy); this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 140, ease: 'Quad.out' }); }
  burst() { this.trail.explode(10); }
  setAnimState(s: State, force = false) { if (this.state_ === s && !force) return; this.state_ = s; this.play(s, true); }
}
