import { pooledImage, releaseImage } from '../systems/Pool';
import { audio } from '../audio/Audio';
import { touch } from '../systems/Touch';
import Phaser from 'phaser';
import { PlayerFx } from './PlayerFx';
import { T, JET, FEEL } from '../tuning';
export { T, JET };
const CHARGE_WALK = 34; // charging slows Sakura to a walk (was: vx*=0.25 every frame -> effectively frozen while held)
type State = 'skid' | 'idle' | 'run' | 'jump' | 'doublejump' | 'fall' | 'land' | 'dash' | 'dashend' | 'hurt';
export const HP_MAX = 5, IFRAMES = 1.0, HURT_TIME = 0.3;
export class Player extends Phaser.Physics.Arcade.Sprite {
  state_: State = 'idle'; facing = 1; coyoteT = 0; bufferT = 0; airJumps = 1; dashT = 0; dashCd = 0; canAirDash = true; landT = 0; dbg = { dashes: [] as {x0:number,x1:number,dur:number}[], jumps: 0, djumps: 0, coyoteJumps: 0, cur: null as any, lastDir: 'h', jetT: 0, wallJumps: 0, wallSlideT: 0, skids: 0 };
  jumpHeld = false; dashing = false; jumpPressed = false; dashPressed = false; keys: any; trail: Phaser.GameObjects.Particles.ParticleEmitter;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'p_idle', 0); scene.add.existing(this); scene.physics.add.existing(this);
    this.setOrigin(0.5, 1); const b = this.body as Phaser.Physics.Arcade.Body;
    b.setSize(10, 28).setOffset(27, 15); b.setMaxVelocityY(T.maxFall);
    this.keys = scene.input.keyboard!.addKeys({ left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D', jump: 'SPACE', dash: 'SHIFT', j: 'J', x: 'X', up: 'UP', w: 'W', down: 'DOWN', s: 'S' });
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
  locked = false; boostT = 0; skidT = 0; dashVx = 0; dashVy = 0; dashDir = 'h'; dashBuf = 0; poseLock = false; dashCount = 0; pfx: PlayerFx; beam: any = null; holdT = 0;
  hp = HP_MAX; iT = 0; sil = false; hurtT = 0; shootPressed = false; shootBuf = 0; shootAnimT = 0; gun: any = null; dbgHits = 0;
  /** hit shards: square palette pixels, gravity, no AA */
  shards(d: number) { const sc = this.scene; if (!sc.textures.exists('px2')) { const g = sc.add.graphics(); g.fillStyle(0xffffff).fillRect(0, 0, 2, 2); g.generateTexture('px2', 2, 2); g.destroy(); }
    const e = sc.add.particles(this.x, this.y - 20, 'px2', { speedX: { min: d * 40, max: d * 160 }, speedY: { min: -170, max: -40 }, gravityY: 520, lifespan: { min: 260, max: 480 }, tint: [0xff5c8a, 0xffd2e4, 0xff2e5a, 0xfff4fb], quantity: 9, emitting: false }).setDepth(this.depth + 1);
    e.explode(9); sc.time.delayedCall(600, () => e.destroy()); }
  damage(fromX: number, amt = 1): boolean {
    if (this.iT > 0 || this.hp <= 0) return false;
    audio.sfx('hurt'); this.hp = Math.max(0, this.hp - amt); this.dbgHits++; this.iT = IFRAMES; this.hurtT = HURT_TIME; this.dashing = false; this.dashT = 0; this.trail.stop(); this.jetting = false; this.jetFx.stop(); this.jetPetals.stop();
    const d = this.x < fromX ? -1 : 1; this.body_.setVelocity(d * FEEL.hurt.knockX, -FEEL.hurt.knockY); this.setTintFill(0xffffff); this.scene.time.delayedCall(FEEL.hurt.flashMs, () => this.clearTint()); this.facing = -d;
    this.shards(d); this.setAnimState('hurt', true); this.emit('hurt', this.hp); return true;
  }
  get body_() { return this.body as Phaser.Physics.Arcade.Body; }
  /** clears every held input + charge/pose state (used on blur, pause/resume, respawn, and by the stuck watchdog) */
  resetInput() {
    for (const k of Object.values(this.keys as any)) (k as any)?.reset?.();
    for (const k of Object.keys(touch)) (touch as any)[k] = false;
    document.querySelectorAll('#tc .tb.dn').forEach(e => e.classList.remove('dn'));
    this.jumpPressed = this.dashPressed = this.shootPressed = false; this.dashBuf = 0; this.holdT = 0; this.shootAnimT = 0;
    audio.stopLoops(); if (this.beam) this.beam.cancel(); if (this.poseLock) { this.poseLock = false; this.anims.timeScale = 1; this.play(this.state_, true); }
  }
  update(dt: number) {
    const k = this.keys, b = this.body_, onGround = b.blocked.down; if (!onGround) this.lastVy = b.velocity.y; if (this.locked) { this.setFlipX(this.facing < 0); this.jumpPressed = this.dashPressed = this.shootPressed = false; return; }
    if (touch.jumpP) { this.jumpPressed = true; touch.jumpP = false; } if (touch.dashP) { this.dashPressed = true; touch.dashP = false; } if (touch.shootP) { this.shootPressed = true; touch.shootP = false; }
    const dir = (k.right.isDown || k.d.isDown || touch.right ? 1 : 0) - (k.left.isDown || k.a.isDown || touch.left ? 1 : 0);
    if (this.iT > 0) { this.iT -= dt; const on = this.iT > 0 && this.iT < IFRAMES - FEEL.hurt.flashMs / 1000 && Math.floor(this.iT * 16) % 2 === 1; /* hi-bit i-frames: hard flicker to a solid plum silhouette, no translucency */
      if (on !== this.sil) { this.sil = on; if (on) this.setTintFill(0x2a1238); else this.clearTint(); } this.setAlpha(1); }
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
      this.dashBuf = 0; audio.sfx('dash'); if (dir) this.facing = dir; { const vy = (k.down.isDown || k.s.isDown || touch.down ? 1 : 0) - (k.up.isDown || k.w.isDown || touch.up ? 1 : 0); let dy = onGround && vy > 0 ? 0 : vy, dx = dir; if (!dx && !dy) dx = this.facing; const n = dx && dy ? Math.SQRT1_2 * 0.92 : (dy ? 0.85 : 1); this.dashVx = dx * T.dashSpeed * n; this.dashVy = dy * T.dashSpeed * n; this.dashDir = !dy ? 'h' : !dx ? (dy < 0 ? 'u' : 'd') : (dy < 0 ? 'ud' : 'dd'); this.dbg.lastDir = this.dashDir; if (dy < 0 && onGround) b.y -= 2; } this.dashing = true; this.dashCount++; this.dashT = T.dashTime; this.dashCd = T.dashCooldown + T.dashTime; if (!onGround) this.canAirDash = false;
      this.dbg.cur = { x0: this.x, t: 0 }; this.trail.start(); this.scene.cameras.main.shake(FEEL.dashShake[0], FEEL.dashShake[1]);
    }
    if (this.dashing && this.dashT <= 0) { // end dash one frame after the last dash-velocity frame was integrated
      this.dashing = false; b.setVelocity(this.dashVx * T.dashEndCarry, this.dashVy < 0 ? this.dashVy * 0.45 : b.velocity.y); if (onGround) { this.landT = 0.14; this.setAnimState('dashend'); } if (this.dbg.cur) { this.dbg.dashes.push({ x0: this.dbg.cur.x0, x1: this.x, dur: this.dbg.cur.t }); this.dbg.cur = null; }
      b.setVelocityX(this.facing * T.maxRun); this.trail.stop();
    }
    if (this.dashing) {
      if (this.bufferT > 0 && (onGround || this.coyoteT > 0)) { this.dashT = 0; this.dashing = false; this.dbg.cur = null; this.trail.stop(); }
      else { b.setVelocity(this.dashVx, this.dashVy); this.dashT -= dt; if (this.dbg.cur) this.dbg.cur.t += dt; this.setFlipX(this.facing < 0); this.setAnimState('dash'); if (this.dashDir !== 'h') { const key = 'dash_' + this.dashDir; if (this.anims.currentAnim?.key !== key) this.play(key, true); } return; }
    }
    // horizontal
    this.wjT -= dt; const wallDir = !onGround ? (b.blocked.left ? -1 : b.blocked.right ? 1 : 0) : 0;
    const target = (this.wjT > 0 ? 0 : dir) * T.maxRun, accel = dir ? (onGround ? T.accelGround : T.accelAir) : (onGround ? T.decelGround : T.decelAir);
    const vx = b.velocity.x; const turning = dir && Math.sign(vx) !== dir && vx !== 0;
    if (this.wjT <= 0) b.setVelocityX(Phaser.Math.Linear(vx, target, 0) + Phaser.Math.Clamp(target - vx, -accel * dt * (turning ? 1.5 : 1), accel * dt * (turning ? 1.5 : 1)));
    if (dir && this.wjT <= 0) this.facing = dir;
    // jump
    if (this.bufferT > 0) {
      if (onGround || this.coyoteT > 0) { this.dbg.jumps++; audio.sfx('jump'); if (!onGround) this.dbg.coyoteJumps++; b.setVelocityY(-T.jumpVel); this.bufferT = 0; this.coyoteT = 0; this.setAnimState('jump', true); this.squash(0.85, 1.15); }
      else if (wallDir && (this.wallSliding || dir === wallDir)) { b.setVelocity(-wallDir * T.maxRun * 1.15, -T.jumpVel * 0.92); this.wjT = 0.16; this.facing = -wallDir; this.bufferT = 0; this.wallSliding = false; this.dbg.wallJumps = (this.dbg.wallJumps || 0) + 1; audio.sfx('jump'); this.setAnimState('jump', true); this.squash(0.85, 1.15); }
      else if (this.airJumps > 0) { b.setVelocityY(-T.doubleJumpVel); this.airJumps--; this.dbg.djumps++; audio.sfx('djump'); this.bufferT = 0; this.setAnimState('doublejump', true); this.spin(); this.burst(); this.squash(0.8, 1.2); }
    }
    // gravity: variable height + heavier fall
    let g = T.gravity; if (b.velocity.y > 0) g *= T.fallGravityMult; if (this.jumpHeld && Math.abs(b.velocity.y) < T.apexBand && !this.jetting) g *= T.apexGravMult;
    b.setVelocityY(b.velocity.y + ((this.scene as any).onSlope && b.velocity.y >= 0 ? 0 : g) * dt);
    if (this.boostT > 0) this.boostT -= dt; else if (!this.jumpHeld && b.velocity.y < 0) b.setVelocityY(b.velocity.y * Math.pow(T.jumpCutMult, dt * 20));
    // wall slide: airborne, falling, pushing into a wall -> slow capped descent, refresh air dash
    this.wallSliding = !!wallDir && dir === wallDir && b.velocity.y > 0 && !this.dashing;
    if (this.wallSliding) { if (b.velocity.y > 95) b.setVelocityY(95); this.canAirDash = true; this.dbg.wallSlideT = (this.dbg.wallSlideT || 0) + dt; this.wsFx -= dt; if (this.wsFx <= 0) { this.wsFx = 0.08; const s = this.scene, q = s.add.image(this.x + wallDir * 6, this.y - 8, 'glow').setTint(0xe8dcc8).setAlpha(0.7).setScale(0.25).setDepth(this.depth - 0.1); s.tweens.add({ targets: q, y: q.y - 6, x: q.x - wallDir * 5, alpha: 0, duration: 240, onComplete: () => q.destroy() }); } }
    // jet boots
    const wasJet = this.jetting; this.jetting = false;
    if (onGround) this.fuel = JET.fuel;
    else if (this.hasJet && this.airJumps === 0 && (k.jump.isDown || touch.jump) && this.fuel > 0 && this.bufferT <= 0) {
      if (b.velocity.y > -JET.vel) b.setVelocityY(Math.max(-JET.vel, b.velocity.y - JET.accel * dt));
      this.fuel = Math.max(0, this.fuel - dt); this.jetting = true; this.dbg.jetT = (this.dbg.jetT || 0) + dt;
    }
    audio.loop('jet', this.jetting); if (this.jetting !== wasJet) { if (this.jetting) { this.jetFx.start(); this.jetPetals.start(); } else { this.jetFx.stop(); this.jetPetals.stop(); } }
    if (this.wallSliding && !this.poseLock) { this.play('wall', true); this.setFlipX(wallDir < 0); this.wasWall = true; } // wall art: hand braced on the wall in front
    else { if (this.wasWall) { this.wasWall = false; if (!this.poseLock) this.play(this.state_, true); } this.setFlipX(this.facing < 0); }
    // shoot (J / X; hold = auto-fire at cooldown rate)
    // tap = blaster shot; hold = charge; release a charged shot = beam
    const held = k.j.isDown || k.x.isDown || touch.shoot, mx = this.x + this.facing * 15, my = this.y - (this.poseLock ? 16 : 19);
    if (this.shootPressed) this.shootBuf = 0.16; this.shootBuf -= dt;
    if (this.shootBuf > 0 && this.gun && !(this.beam && this.beam.firing) && this.gun.tryFire(mx, my, this.facing, 0, true)) { const t = this.gun.tier; this.shootAnimT = 0.22; audio.sfx('blaster' + t); this.shootBuf = 0; (this.dbg as any).combo = ((this.dbg as any).combo || '') + t; if (t === 3 && b.blocked.down) b.setVelocityX(b.velocity.x - this.facing * 60); }
    this.shootPressed = false;
    if (this.beam) {
      if (held) { this.holdT += dt; if (this.holdT > 0.25) this.beam.charge(dt, mx, my); }
      else { if (this.beam.release(mx, my, this.facing)) { this.shootAnimT = 0; audio.sfx('beam'); } this.holdT = 0; }
      const charging = this.beam.chargeT > 0.25 && !this.beam.firing; audio.loop('charge', charging, 1 + Math.min(this.beam.chargeT, 2) * 0.6);
      if (this.beam.firing) { if (onGround) b.setVelocityX(-this.facing * 25); this.play('beamfire', true); this.poseLock = true; }
      else if (charging) { if (onGround) b.setVelocityX(Phaser.Math.Clamp(b.velocity.x, -CHARGE_WALK, CHARGE_WALK)); this.play('charge', true); this.anims.timeScale = this.beam.level === 2 ? 1.8 : this.beam.level === 1 ? 1.3 : 1; this.poseLock = true; }
      else if (this.poseLock) { this.poseLock = false; this.play(this.state_, true); }
    }
    if (this.poseLock) return;
    // animation state
    if (onGround) {
      if (this.state_ === 'fall' || this.state_ === 'doublejump' || this.state_ === 'jump') { if (b.velocity.y >= 0) { const hard = this.lastVy > FEEL.land.dustMinVy; this.landT = T.landTime; this.setAnimState('land'); const q = hard ? FEEL.land.squashHard : FEEL.land.squashSoft; this.squash(q[0], q[1]); if (hard) this.dust(); } }
      if (this.landT > 0) { this.landT -= dt; if (dir && this.state_ !== 'dashend') this.landT = 0; }
      this.skidT = Math.max(-1, this.skidT - dt);
      if (this.landT <= 0 && turning && Math.abs(vx) > 110 && this.skidT <= -0.2) { this.skidT = 0.16; this.dbg.skids = (this.dbg.skids || 0) + 1; this.setAnimState('skid', true); this.dust(); }
      if (this.skidT > 0) this.setFlipX(vx < 0);
      else if (this.landT <= 0) this.setAnimState(Math.abs(b.velocity.x) > 20 ? 'run' : 'idle');
      if (this.state_ === 'run') this.anims.timeScale = Phaser.Math.Clamp(Math.abs(b.velocity.x) / T.maxRun, 0.5, 1.2);
      else this.anims.timeScale = 1;
      if (this.shootAnimT > 0) { this.shootAnimT -= dt; const want = this.state_ === 'run' ? 'runshoot' : 'shoot';
        if (this.anims.currentAnim?.key !== want) this.play(want, true); if (this.shootAnimT <= 0) this.play(this.state_, true); }
    } else {
      this.shootAnimT = 0;
      this.anims.timeScale = 1;
      if (Math.abs(b.velocity.y) < 60 && (this.state_ === 'jump')) { this.play('apex', true); }
      if (b.velocity.y > 60 && this.state_ !== 'fall' && !(this.state_ === 'doublejump' && this.anims.isPlaying)) this.setAnimState('fall');
      else if (this.state_ === 'run' || this.state_ === 'idle' || this.state_ === 'hurt' || this.state_ === 'land' || this.state_ === 'dash' || this.state_ === 'dashend') this.setAnimState(b.velocity.y < 0 ? 'jump' : 'fall');
    }
  }
  squash(sx: number, sy: number) { this.scene.tweens.killTweensOf(this); this.setScale(sx, sy); this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 140, ease: 'Quad.out' }); }
  /** double-jump flip: one forward somersault of her rise pose (origin stays at the feet line only while grounded, so air-only) */
  spins = 0; spinTw: Phaser.Tweens.Tween | null = null; spin() { const sc = this.scene; this.spins++; this.spinTw?.stop(); const d = this.facing; this.spinTw = sc.tweens.addCounter({ from: 0, to: 1, duration: 360, ease: 'Cubic.easeOut', onUpdate: tw => { const b = this.body as Phaser.Physics.Arcade.Body; if (b.blocked.down || this.hurtT > 0) { tw.stop(); this.setAngle(0); return; } this.setAngle(d * 360 * (tw.getValue() as number)); }, onComplete: () => this.setAngle(0), onStop: () => this.setAngle(0) }); }
  burst() { this.trail.explode(10); }
  lastVy = 0; wjT = 0; wallSliding = false; wsFx = 0; wasWall = false;
  dust() { const s = this.scene; for (let i = 0; i < 6; i++) { const d = i < 3 ? -1 : 1; const p = pooledImage(s, this.x + d * (3 + Math.random() * 4), this.y - 2, 'glow').setTint(0xe8dcc8).setAlpha(0.8).setScale(0.35).setDepth(this.depth - 0.1);
    s.tweens.add({ targets: p, x: p.x + d * (14 + Math.random() * 14), y: p.y - 4 - Math.random() * 5, alpha: 0, scale: 0.12, duration: 260 + Math.random() * 120, ease: 'Quad.out', onComplete: () => releaseImage(s, p) }); } }
  setAnimState(s: State, force = false) { if (this.state_ === s && !force) return; this.state_ = s; this.play(s, true); }
}
