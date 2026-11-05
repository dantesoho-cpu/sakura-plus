import Phaser from 'phaser';
import { audio } from '../audio/Audio';
import { Enemy } from './Enemy';
import { Walker } from './NeoKyo';
import type { Fx } from '../systems/Fx';
import type { Blaster } from '../weapons/Blaster';
// Underwater Shrine Cave enemies — every texture is a crop of ref/shrine_sheet.png (tools/sh_cut.py -> tools/sh_half.py):
// 3 frames per unit: rest, squash, lean. Walker units reuse the Neo-Kyo walker AI via the `nk_<u>_*` key convention.
export const SH_UNITS: Record<string, string> = { jelly: 'e_jelly', jellyp: 'e_jelly_p', jellyb: 'e_jelly_b', orb: 'e_orb', orbs: 'e_orb_s', crab: 'e_crab', crabl: 'e_crab_l', crab2: 'e_crab2', crabs: 'e_crab_s', mech: 'e_mech', mechl: 'e_mech_l', mech2: 'e_mech2', mechs: 'e_mech_s', boss: 'boss' };
export function shLoad(s: Phaser.Scene) { for (const [u, k] of Object.entries(SH_UNITS)) for (let i = 0; i < 3; i++) s.load.image(`nk_sh${u}_${i}`, `assets/sh/s/${k}_${i}.png`);
  for (const k of ['fx_star', 'fx_bub', 'fx_burst', 'fx_ring', 'fx_ring_l', 'fx_splash', 'fx_geyser', 'i_gem_b', 'i_gem_p', 'i_coin', 'i_orb', 'i_ring', 'x_chest', 'x_gate2', 'x_lantern', 'x_portal', 'x_portal_ped', 'x_switch']) s.load.image('sh_' + k, `assets/sh/s/${k}_0.png`); }
export function shAnims(s: Phaser.Scene) { const A = s.anims; for (const u of Object.keys(SH_UNITS)) { if (A.exists(`nk_sh${u}_walk`)) continue;
  const f = (ix: number[]) => ix.map(i => ({ key: `nk_sh${u}_${i}` })); const fl = u.startsWith('jelly') || u.startsWith('orb') || u === 'boss';
  A.create({ key: `nk_sh${u}_walk`, frames: f(fl ? [0, 1] : [0, 1, 0, 2]), frameRate: fl ? 3 : 7, repeat: -1, yoyo: fl }); } }
const bolt = (g: Blaster, x: number, y: number, a: number, v: number, c = 0x6fe8ff) => g.fireVel(x, y, Math.cos(a) * v, Math.sin(a) * v, { tex: 'sh_fx_star', trail: c, life: 3, pulse: true });
/** Jellyfish: drifts on a slow current near home; senses Sakura (220px) and glides after her, pulsing (squash anim);
 *  close in it charges (telegraph) and discharges a ring of slow sparks. Big jellies split into two small ones. */
export class ShJelly extends Enemy {
  kind = 'drone'; home: Phaser.Math.Vector2; zapT = 2; zaps = 0; chase = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster, public u = 'jelly') { super(s, x, y, `nk_sh${u}_0`, u === 'jellyb' ? 5 : 2, fx);
    this.home = new Phaser.Math.Vector2(x, y); this.setOrigin(0.5, 0.5); this.b.setSize(this.width * 0.7, this.height * 0.6); this.play(`nk_sh${u}_walk`); this.eyeY = 0.1; this.aura.setTint(0x6fe8ff); this.setAlpha(0.92); this.t = Math.random() * 6; }
  tick(dt: number, px: number, py: number) { super.tick(dt, px, py); if (this.dead) return;
    const dx = px - this.x, dy = py - this.y, d = Math.hypot(dx, dy), sees = d < 220; this.chase = Phaser.Math.Linear(this.chase, sees ? 1 : 0, dt * 1.5);
    const pulse = Math.max(0, Math.sin(this.t * 2.6)); // thrust on each bell contraction
    const tx = this.home.x + Math.sin(this.t * 0.5) * 30, ty = this.home.y + Math.sin(this.t * 0.9) * 12;
    const gx = Phaser.Math.Linear(tx, px, this.chase * 0.9), gy = Phaser.Math.Linear(ty, py - 30, this.chase * 0.9);
    if (this.hitT <= 0) this.b.setVelocity(Phaser.Math.Clamp((gx - this.x) * 1.2, -45, 45) * (0.4 + pulse), Phaser.Math.Clamp((gy - this.y) * 1.2, -40, 40) * (0.4 + pulse) - pulse * 6);
    this.face(Math.sign(dx) || this.faceDir); this.setAngle(Phaser.Math.Clamp(this.b.velocity.x * 0.25, -12, 12));
    if (sees && d < 90 && (this.zapT -= dt) <= 0.5 && this.teleT <= 0 && this.zapT + dt > 0.5) this.telegraph(0.5);
    if (this.zapT <= 0) { this.zapT = 2.6; this.zaps++; for (let i = 0; i < 6; i++) bolt(this.gun, this.x, this.y, i / 6 * Math.PI * 2 + this.t, 70, 0xb48cff); audio.sfx('eshot', { rate: 1.6, vol: 0.4 }); this.punch(1.3, 0.7, 260); }
    if (!sees) this.zapT = Math.max(this.zapT, 1.2); }
  knock(dir: number) { this.b.setVelocity(dir * 90, -20); }
}
/** Sentinel orb: hovers at a stand-off distance from Sakura (keeps ~110px, flanks above), aims single shots, retreats when she closes. */
export class ShOrb extends Enemy {
  kind = 'drone'; home: Phaser.Math.Vector2; fireT = 1.8; shots = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster, u = 'orb') { super(s, x, y, `nk_sh${u}_0`, 2, fx); this.home = new Phaser.Math.Vector2(x, y); this.setOrigin(0.5, 0.5); this.b.setSize(18, 18); this.play(`nk_sh${u}_walk`); this.eyeY = 0; }
  tick(dt: number, px: number, py: number) { super.tick(dt, px, py); if (this.dead) return; const dx = px - this.x, near = Math.abs(dx) < 240 && Math.abs(py - this.y) < 170;
    const want = near ? px - Math.sign(dx || 1) * 110 : this.home.x + Math.sin(this.t * 0.7) * 40, wy = near ? py - 60 + Math.sin(this.t * 2) * 8 : this.home.y + Math.sin(this.t * 1.3) * 8;
    const tx = Phaser.Math.Clamp(want, this.home.x - 160, this.home.x + 160);
    if (this.hitT <= 0) this.b.setVelocity(Phaser.Math.Clamp((tx - this.x) * 2, -80, 80), Phaser.Math.Clamp((wy - this.y) * 2, -60, 60));
    this.face(Math.sign(dx) || this.faceDir); this.setAngle(Phaser.Math.Clamp(this.b.velocity.x * 0.12, -9, 9));
    if (near && (this.fireT -= dt) <= 0.3 && this.teleT <= 0 && this.fireT + dt > 0.3) this.telegraph(0.3);
    if (near && this.fireT <= 0) { this.fireT = 2.4; this.shots++; bolt(this.gun, this.x, this.y, Math.atan2(py - this.y, dx), 130); audio.sfx('eshot', { rate: 1.3 }); this.punch(1.2, 0.8); } }
  knock(dir: number) { this.b.setVelocity(dir * 120, -30); }
}
/** Crab bot: patrols its ledge (turns at edges/walls), spots Sakura, plants, telegraphs, then skims a low bolt along the floor. */
export class ShCrab extends Walker {
  kind = 'assault'; fireT = 1; shots = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, gun: Blaster, u = 'crab') { const t = s.textures.get(`nk_sh${u}_0`).getSourceImage() as any; super(s, x, y, 'sh' + u, u === 'crabl' ? 4 : 3, fx, gun, Math.min(26, t.width - 6), Math.min(24, t.height - 4), 80); this.speed = 34; this.sight = 170; this.bobA = 2; }
  tick(dt: number, px: number, py: number) { super.tick(dt, px, py); if (this.dead) return; const see = this.sees(px, py); if (see) this.face(Math.sign(px - this.x) || this.faceDir);
    if (see && (this.fireT -= dt) <= 0.4 && this.teleT <= 0 && this.fireT + dt > 0.4) this.telegraph(0.4);
    if (see && this.fireT <= 0) { this.fireT = 2; this.shots++; const [mx] = this.muzzle(); this.gun.fireVel(mx, this.y - 8, this.faceDir * 150, 0, { tex: 'sh_fx_star', trail: 0xff9a5a, life: 2.4 }); audio.sfx('eshot'); this.punch(1.15, 0.85); this.flash(mx, this.y - 8, 0xff9a5a); }
    if (this.grounded() && this.hitT <= 0) this.walk(dt, px, py, see && this.fireT < 0.6); }
}
/** Shrine mech: advances on Sakura when it sees her (holds at ~70px), fires 3-round bursts, backs off if she is on top of it. */
export class ShMech extends Walker {
  kind = 'heavy'; fireT = 1.5; burst = 0; bT = 0; shots = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, gun: Blaster, u = 'mech') { super(s, x, y, 'sh' + u, u === 'mechl' ? 7 : 5, fx, gun, 16, 34, 90); this.speed = 28; this.sight = 210; this.bobA = 1.5; }
  tick(dt: number, px: number, py: number) { super.tick(dt, px, py); if (this.dead) return; const see = this.sees(px, py), dx = px - this.x; if (see) this.face(Math.sign(dx) || this.faceDir);
    if (see && this.grounded() && this.hitT <= 0 && !this.turning) { const ad = Math.abs(dx), v = ad > 80 ? Math.sign(dx) * this.speed * 1.4 : ad < 40 ? -Math.sign(dx) * this.speed : 0;
      if (v && !this.edgeAhead(Math.sign(v))) this.b.setVelocityX(v); else this.b.setVelocityX(0); this.stepT += dt * 8; this.setAngle(Math.sin(this.stepT) * this.bobA); }
    else if (this.grounded() && this.hitT <= 0) this.walk(dt, px, py, false);
    if (see && this.burst === 0 && (this.fireT -= dt) <= 0.45 && this.teleT <= 0 && this.fireT + dt > 0.45) this.telegraph(0.45);
    if (see && this.burst === 0 && this.fireT <= 0) { this.burst = 3; this.bT = 0; this.fireT = 2.6; }
    if (this.burst > 0 && (this.bT -= dt) <= 0) { this.burst--; this.bT = 0.14; this.shots++; const [mx, my] = this.muzzle(); bolt(this.gun, mx, my, Math.atan2(py - my, dx), 160, 0xff6a8a); audio.sfx('eshot', { rate: 1.1, vol: 0.5 }); this.flash(mx, my, 0xff6a8a); } }
}
const BOSS_HP = 46;
/** Abyss Warden: the sheet's largest mech (wide flying eye-hull). States: sleep → intro → hover (tracks Sakura, 5-fan) → dive
 *  (telegraph, rams her lane, recovers) → [phase 2 <50%] spiral (rotating 12-burst) + summons jellies (max 3). */
export class ShBoss extends Enemy {
  kind = 'boss'; maxHp = BOSS_HP; awake = false; st = 'sleep'; stT = 0; hx: number; hy: number; n = 0; dbg: Record<string, number> = { fan: 0, dive: 0, spiral: 0, summon: 0 };
  summon: (x: number, y: number) => void = () => {}; escorts = () => 0; onDead: () => void = () => {}; tx = 0; ty = 0; glowI: Phaser.GameObjects.Image;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster, public groundY: number) { super(s, x, y, 'nk_shboss_0', BOSS_HP, fx); this.hx = x; this.hy = y; this.setOrigin(0.5, 0.5); this.b.setSize(this.width * 0.8, this.height * 0.7); this.play('nk_shboss_walk');
    this.setAlpha(0); this.setDepth(8.5); this.glowI = s.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x6fe8ff).setScale(5).setAlpha(0).setDepth(8.4); }
  get p2() { return this.hp <= this.maxHp / 2; }
  hit(dmg: number, dir: number) { if (!this.awake || this.dead || this.st === 'dying') return; const was = this.p2; super.hit(dmg, dir); if (!was && this.p2 && !this.dead) { this.st = 'spiral'; this.stT = 2.4; this.scene.cameras.main.flash(200, 120, 230, 255); audio.sfx('gate'); } }
  knock() {}
  wake() { if (this.st !== 'sleep') return; this.st = 'intro'; this.stT = 1.6; this.setPosition(this.hx, this.hy - 140); this.scene.tweens.add({ targets: this, alpha: 1, y: this.hy, duration: 1500, ease: 'Sine.out' }); }
  reset() { this.scene.tweens.killTweensOf(this); this.hp = this.maxHp; this.st = 'sleep'; this.awake = false; this.setAlpha(0).setScale(1).setAngle(0); this.setPosition(this.hx, this.hy); this.b.setVelocity(0, 0); this.glowI.setAlpha(0); }
  tick(dt: number, px: number, py: number) { super.tick(dt, px, py); if (this.dead) return; this.glowI.setPosition(this.x, this.y).setAlpha(this.alpha * (0.25 + 0.1 * Math.sin(this.t * 4)));
    if (this.st === 'sleep' || this.st === 'dying') { this.b.setVelocity(0, 0); return; } this.stT -= dt;
    if (this.st === 'intro') { this.b.setVelocity(0, 0); if (this.stT <= 0) { this.st = 'hover'; this.stT = 1.2; this.awake = true; } return; }
    this.face(Math.sign(px - this.x) || this.faceDir); const mv = (x: number, y: number, k: number, m: number) => this.b.setVelocity(Phaser.Math.Clamp((x - this.x) * k, -m, m), Phaser.Math.Clamp((y - this.y) * k, -m, m));
    if (this.st === 'hover') { mv(px + Math.sin(this.t * 0.9) * 90, this.groundY - 120 + Math.sin(this.t * 1.7) * 14, 1.6, this.p2 ? 120 : 90); this.setAngle(Phaser.Math.Clamp(this.b.velocity.x * 0.08, -8, 8));
      if (this.stT <= 0) { this.n++; const ph = this.n % (this.p2 ? 4 : 3);
        if (ph === 0) { this.st = 'aim'; this.stT = 0.6; this.telegraph(0.6); this.tx = px; this.ty = Math.min(py - 16, this.groundY - 30); }
        else if (this.p2 && ph === 3) { this.st = 'spiral'; this.stT = 2.4; }
        else { this.dbg.fan++; const a = Math.atan2(py - 14 - this.y, px - this.x); for (let i = -2; i <= 2; i++) bolt(this.gun, this.x, this.y + 8, a + i * 0.2, 135); audio.sfx('eshot', { rate: 0.8 }); this.punch(1.15, 0.85); this.stT = this.p2 ? 1.1 : 1.5;
          if (this.p2 && this.escorts() < 3 && this.n % 2) { this.dbg.summon++; this.summon(this.x + Phaser.Math.Between(-60, 60), this.y + 20); } } } return; }
    if (this.st === 'aim') { this.b.setVelocity(0, 0); this.setAngle(Math.sin(this.t * 50) * 3); if (this.stT <= 0) { this.st = 'dive'; this.stT = 0.9; this.dbg.dive++; audio.sfx('dash'); } return; }
    if (this.st === 'dive') { mv(this.tx, this.ty, 6, 320); if (this.stT <= 0 || Math.hypot(this.tx - this.x, this.ty - this.y) < 6) { this.st = 'hover'; this.stT = 1; this.scene.cameras.main.shake(140, 0.006); this.fx.explode(this.x, this.y + 20, 0.6); } return; }
    if (this.st === 'spiral') { mv((this.scene.cameras.main.worldView.centerX), this.groundY - 140, 2, 100); this.setAngle(0);
      if (Math.floor((this.stT + dt) * 5) !== Math.floor(this.stT * 5)) { this.dbg.spiral++; for (let i = 0; i < 12; i += 3) bolt(this.gun, this.x, this.y, i / 12 * Math.PI * 2 + this.t * 2.2, 95, 0xb48cff); audio.sfx('eshot', { rate: 1.4, vol: 0.4 }); }
      if (this.stT <= 0) { this.st = 'hover'; this.stT = 1; } } }
  die() { if (this.st === 'dying') return; this.st = 'dying'; this.awake = false; this.b.setVelocity(0, 0); this.b.enable = false; const s = this.scene; audio.sfx('explode');
    for (let i = 0; i < 8; i++) s.time.delayedCall(i * 160, () => this.fx.explode(this.x + Phaser.Math.Between(-60, 60), this.y + Phaser.Math.Between(-20, 20), 0.8));
    s.tweens.add({ targets: this, y: this.y + 60, alpha: 0, angle: 18, duration: 1500, ease: 'Quad.in', onComplete: () => { this.glowI.destroy(); this.aura.destroy(); this.tele.destroy(); this.dead = true; this.emit('destroyed', this); this.onDead(); this.destroy(); } }); }
}
