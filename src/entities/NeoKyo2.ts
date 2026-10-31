import Phaser from 'phaser';
import { audio } from '../audio/Audio';
import { Enemy } from './Enemy';
import { Walker } from './NeoKyo';
import type { Fx } from '../systems/Fx';
import type { Blaster } from '../weapons/Blaster';
// More Neo-Kyo robots, every frame a crop from ref/neokyo_sheet.png (public/assets/l2/enemy/enemy_NN.png):
//  scout  (enemy_21/22/23) small fast biped that hops at Sakura       -> lower street + rooftops
//  mine   (enemy_05/06/12) floating eye-mine: blinks, then rams her     -> skyways + spire
//  lancer (enemy_13/15/16) tall blade trooper: telegraphs, then charges -> skyways + rooftops
export const NK2: Record<string, number[]> = { scout: [21, 22, 23], mine: [5, 6, 12], lancer: [13, 15, 16] };
const pad = (n: number) => String(n).padStart(2, '0');
export function nk2Load(s: Phaser.Scene, A: string) { for (const [u, ids] of Object.entries(NK2)) ids.forEach((id, i) => s.load.image(`nk_${u}_${i}`, `${A}enemy/enemy_${pad(id)}.png`)); }
export function nk2Anims(s: Phaser.Scene) {
  const A = s.anims, f = (u: string, ix: number[]) => ix.map(i => ({ key: `nk_${u}_${i}` })); if (A.exists('nk_scout_walk')) return;
  A.create({ key: 'nk_scout_walk', frames: f('scout', [0, 1, 0, 2]), frameRate: 10, repeat: -1 });
  A.create({ key: 'nk_mine_walk', frames: f('mine', [0, 1, 0, 2]), frameRate: 5, repeat: -1 });
  A.create({ key: 'nk_lancer_walk', frames: f('lancer', [0, 1, 0, 2]), frameRate: 6, repeat: -1 });
}
/** Scout: quick patrol; when Sakura is close and on its level it crouches (squash) and hops at her. */
export class NkScout extends Walker {
  kind = 'scout'; hopT = 1; hops = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, gun: Blaster) { super(s, x, y, 'scout', 2, fx, gun, 14, 28, 90); this.speed = 62; this.bobA = 3; this.eyeY = 0.8; this.sight = 150; }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return; const see = this.sees(px, py); if (see) this.face(Math.sign(px - this.x) || this.faceDir);
    this.hopT -= dt; if (see && this.hopT <= 0 && this.grounded() && Math.abs(px - this.x) < 120) { this.hopT = 1.6; this.hops++; this.punch(1.2, 0.75, 120); this.telegraph(0.2);
      this.scene.time.delayedCall(200, () => { if (this.dead || !this.active) return; this.b.setVelocity(this.faceDir * 120, -300); audio.sfx('jump', { rate: 1.8, vol: 0.4 }); }); return; }
    if (!this.grounded()) return; if (this.hitT <= 0) this.walk(dt, px, py, false);
  }
}
/** Mine: hovers and bobs; Sakura in range -> blinks red (telegraph) then rams toward where she was, drifts home. */
export class NkMine extends Enemy {
  kind = 'mine'; home: Phaser.Math.Vector2; st = 0; stT = 1; vx = 0; vy = 0; rams = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, public gun: Blaster) { super(s, x, y, 'nk_mine_0', 2, fx); this.home = new Phaser.Math.Vector2(x, y); this.setOrigin(0.5, 0.5); this.b.setSize(18, 18); this.play('nk_mine_walk'); this.eyeY = 0; }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return; this.aura.setPosition(this.x, this.y); const d = Math.hypot(px - this.x, py - 18 - this.y); this.stT -= dt; if (px !== this.x) this.face(Math.sign(px - this.x));
    if (this.st === 0) { this.b.setVelocity((this.home.x + Math.sin(this.t) * 20 - this.x) * 2, (this.home.y + Math.sin(this.t * 2.2) * 8 - this.y) * 2);
      if (d < 150 && this.stT <= 0) { this.st = 1; this.stT = 0.5; this.telegraph(0.5); this.b.setVelocity(0, 0); const a = Math.atan2(py - 18 - this.y, px - this.x); this.vx = Math.cos(a) * 230; this.vy = Math.sin(a) * 230; } }
    else if (this.st === 1) { this.setAngle(Math.sin(this.t * 60) * 8); if (this.stT <= 0) { this.st = 2; this.stT = 0.55; this.rams++; audio.sfx('dash', { rate: 1.6, vol: 0.35 }); this.setAngle(0); } }
    else if (this.st === 2) { this.b.setVelocity(this.vx, this.vy); this.setAngle(this.angle + dt * 900 * Math.sign(this.vx || 1)); if (this.stT <= 0) { this.st = 0; this.stT = 1.6; this.setAngle(0); } }
  }
  knock(dir: number) { this.b.setVelocity(dir * 100, -20); if (this.st === 2) { this.st = 0; this.stT = 1.2; this.setAngle(0); } }
}
/** Lancer: tall trooper; seeing Sakura it plants (telegraph 0.5s, forward lean) then charges ~200px/s along its ledge. */
export class NkLancer extends Walker {
  kind = 'lancer'; chT = 0; cdT = 1.2; charges = 0;
  constructor(s: Phaser.Scene, x: number, y: number, fx: Fx, gun: Blaster) { super(s, x, y, 'lancer', 5, fx, gun, 14, 60, 80); this.speed = 24; this.bobA = 1; this.eyeY = 0.88; this.sight = 190; }
  tick(dt: number, px: number, py: number) {
    super.tick(dt, px, py); if (this.dead) return; const see = this.sees(px, py);
    if (this.chT > 0) { this.chT -= dt; if (this.chT > 0.45) { this.b.setVelocityX(0); this.setAngle(this.faceDir * 8); return; }
      if (this.edgeAhead(this.faceDir) || (this.faceDir > 0 ? this.b.blocked.right : this.b.blocked.left)) this.chT = 0; this.b.setVelocityX(this.faceDir * 210); this.setAngle(this.faceDir * 12);
      if (this.chT <= 0) { this.setAngle(0); this.cdT = 1.8; } return; }
    if (see) this.face(Math.sign(px - this.x) || this.faceDir); this.cdT -= dt;
    if (see && this.cdT <= 0 && this.grounded() && !this.turning) { this.chT = 0.95; this.charges++; this.telegraph(0.5); audio.sfx('eshot2', { rate: 0.6, vol: 0.4 }); return; }
    if (this.hitT <= 0) this.walk(dt, px, py, see && Math.abs(px - this.x) < 50);
  }
  knock(dir: number) { if (this.chT <= 0) this.b.setVelocityX(dir * 50); }
}
