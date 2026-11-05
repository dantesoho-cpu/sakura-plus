import { FEEL } from '../tuning';
import { audio } from '../audio/Audio';
import Phaser from 'phaser';
import type { Fx } from '../systems/Fx';
// Base Kurogen unit: HP, hit-flash, knockback, destroy explosion.
export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number; flashT = 0; dead = false; kind = 'enemy'; contactDamage = 1; t = 0;
  constructor(scene: Phaser.Scene, x: number, y: number, tex: string, hp: number, public fx: Fx) {
    super(scene, x, y, tex, 0); scene.add.existing(this); scene.physics.add.existing(this); this.hp = hp; this.setDepth(8);
    this.aura = scene.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff2a3a).setDepth(9).setAlpha(0.4);
    this.tele = scene.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff3050).setDepth(9).setVisible(false);
    scene.time.delayedCall(0, () => { if (this.active && !this.eliteChk) this.checkElite(); }); // after the subclass set its texture + anim
  }
  aura: Phaser.GameObjects.Image; tele: Phaser.GameObjects.Image; teleT = 0; eyeY = 0.55; eyeX = 0;
  /** Attack telegraph: amber flash + expanding dual ring so windups stay readable at 150px/s. */
  telegraph(sec: number) {
    const hold = Math.max(sec, 0.28); this.teleT = hold;
    const cx = this.x, cy = this.y - this.height * this.eyeY, s = this.scene;
    const r = s.add.circle(cx, cy, 5).setStrokeStyle(2.5, 0xff4060).setFillStyle().setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    const r2 = s.add.circle(cx, cy, 3).setStrokeStyle(1.5, 0xffd23f).setFillStyle().setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: r, radius: 30, alpha: 0, duration: hold * 1000, ease: 'Cubic.out', onComplete: () => r.destroy() });
    s.tweens.add({ targets: r2, radius: 18, alpha: 0, duration: hold * 700, ease: 'Quad.out', onComplete: () => r2.destroy() });
    if (s.textures.exists('glow')) {
      const g = s.add.image(cx, cy, 'glow').setTint(0xff6030).setBlendMode(Phaser.BlendModes.ADD).setDepth(8.9).setAlpha(0.55).setScale(0.6);
      s.tweens.add({ targets: g, scale: 1.6, alpha: 0, duration: hold * 900, onComplete: () => g.destroy() });
    }
  }
  get b() { return this.body as Phaser.Physics.Arcade.Body; }
  hit(dmg: number, dir: number) {
    if (this.dead) return; audio.sfx('ehit'); this.hp -= dmg; this.flashT = FEEL.ehit.flash; this.setTintFill(0xffffff);
    this.fx.spark(this.x - dir * 4, this.y - this.height / 2); this.knock(dir); this.hitT = 0.18; this.punch(0.8, 1.18, 160); this.jolt(dir);
    this.impact(dir, dmg); this.dbgImpacts++;
    if (this.hp <= 0) this.die(); else {
      this.fx.hitStop(FEEL.ehit.stop + Math.min(48, (dmg - 1) * 14));
      const big = dmg >= 3; this.fx.shake(big ? FEEL.ehit.bigMs : FEEL.ehit.shakeMs, big ? FEEL.ehit.bigI : FEEL.ehit.shakeI);
    }
  }
  /** layered hit feedback: additive sheet flash (random angle/scale so repeats vary) + a short directional streak + ring */
  dbgImpacts = 0;
  impact(dir: number, dmg: number) { const s = this.scene, cx = this.x - dir * 3, cy = this.y - this.height * 0.5; const keys = ['spark2', 'spark', 'flash', 'glow'].filter(k => s.textures.exists(k)); if (!keys.length) return;
    const k = keys[(this.dbgImpacts + (Math.random() * 2 | 0)) % Math.min(2, keys.length)], sc = 0.5 + 0.18 * Math.min(4, dmg);
    const im = s.add.image(cx, cy, k).setBlendMode(Phaser.BlendModes.ADD).setDepth(12).setAngle(Math.random() * 360).setScale(sc * 0.5).setTint(dmg >= 3 ? 0xffd23f : 0xffffff);
    s.tweens.add({ targets: im, scale: sc * (1.1 + Math.random() * 0.3), alpha: 0, angle: im.angle + dir * 60, duration: 110 + dmg * 20, ease: 'Cubic.out', onComplete: () => im.destroy() });
    const st = s.add.rectangle(cx, cy, 2, 18 + dmg * 4, 0xffffff).setBlendMode(Phaser.BlendModes.ADD).setDepth(12).setAngle(90 + (Math.random() - 0.5) * 50);
    s.tweens.add({ targets: st, x: cx - dir * 20, scaleX: 0.2, alpha: 0, duration: 120, onComplete: () => st.destroy() });
    const r = s.add.circle(cx, cy, 3 + Math.min(2, dmg)).setStrokeStyle(dmg >= 2 ? 2 : 1.5, dmg >= 3 ? 0xffd23f : 0xff9af0).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: r, radius: 14 + dmg * 4, alpha: 0, duration: 180 + dmg * 20, onComplete: () => r.destroy() }); }
  /** hurt animation: drones spin-wobble, turrets recoil-shake (others: no-op besides flash/punch) */
  wob = 0; wobT = 0;
  jolt(dir: number) { if (this.dead || this.hp <= 0) return; const s = this.scene;
    if (this.kind === 'drone') { this.wob = dir * 45; this.wobT = 0; }
    else if (this.kind === 'turret') { const x0 = this.x; s.tweens.add({ targets: this, x: { from: x0 + dir * 3, to: x0 }, duration: 220, ease: 'Bounce.out' }); } }
  knock(dir: number) { if (this.b.moves) this.b.setVelocityX(dir * FEEL.ehit.knock); }
  /** Facing (+1 = right; sheets face right). Turning plays a quick squash-flip and blocks movement while it runs. */
  faceDir = 1; hitT = 0; turning = false; baseSX = 1;
  face(d: number) {
    if (d) (this as any).wantFace = d; if (this.turning && this.scene.time.now - ((this as any).turnAt || 0) > 320) { this.turning = false; this.setFlipX(this.faceDir < 0); this.setScale(1); } if (!d || d === this.faceDir || this.turning || this.dead) return; this.turning = true; (this as any).turnAt = this.scene.time.now; this.faceDir = d;
    this.scene.tweens.add({ targets: this, scaleX: 0.15, scaleY: 1.08, duration: 70, ease: 'Quad.in', onComplete: () => { if (this.dead || !this.scene) return; this.setFlipX(d < 0);
      this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 90, ease: 'Back.out', onComplete: () => { this.turning = false; const w = (this as any).wantFace; if (w && w !== this.faceDir) this.face(w); } }); } });
  }
  punch(sx: number, sy: number, ms = 140) { if (this.turning || this.dead) return; this.scene.tweens.killTweensOf(this); this.setScale(sx, sy); this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: ms, ease: 'Quad.out' }); }
  die() {
    this.dead = true; { const S: any = this.scene, now = S.time.now; S.__chain = S.__chain && now - S.__chain.t < 2000 ? { n: S.__chain.n + 1, t: now } : { n: 0, t: now }; audio.sfx('explode', { rate: 1 + 0.07 * Math.min(6, S.__chain.n) }); if (S.__chain.n >= 2) { const r = S.add.circle(this.x, this.y - this.height / 2, 6).setStrokeStyle(3, 0xffd23f).setDepth(12).setBlendMode(Phaser.BlendModes.ADD); S.tweens.add({ targets: r, radius: 30 + 6 * Math.min(6, S.__chain.n), alpha: 0, duration: 320, onComplete: () => r.destroy() }); } } this.aura.destroy(); this.tele.destroy(); this.debris(); this.fx.explode(this.x, this.y - this.height / 2, this.kind === 'turret' ? 1.3 : 1);
    this.b.enable = false; this.clearTint(); this.setAngle(0);
    const bv = ({ wasp: 'acid', mine: 'acid', sentry: 'plasma', nksentry: 'plasma', turret: 'plasma', drone: 'plasma', trooper: 'ember', heavy: 'ember', assault: 'ember', lancer: 'ember' } as any)[this.kind];
    const bk = bv && this.scene.anims.exists('e_destroy_' + bv) ? bv : ''; const S2: any = this.scene; (S2.__boomV ||= {})[bk || 'base'] = (S2.__boomV[bk || 'base'] || 0) + 1;
    const d = this.scene.add.sprite(this.x, this.y, bk ? 'e_boom_' + bk : 'e_boom', 0).setOrigin(0.5, 1).setDepth(9).setFlipX(this.flipX); d.play(bk ? 'e_destroy_' + bk : 'e_destroy');
    if (this.elite) { const sc0 = this.scene, cx = this.x, cy = this.y - this.height / 2; d.setTint(0xe0b0ff); (sc0 as any).__eliteBursts = ((sc0 as any).__eliteBursts || 0) + 1;
      const g = sc0.add.image(cx, cy, 'glow').setTint(0xb04aff).setBlendMode(Phaser.BlendModes.ADD).setDepth(11).setScale(1.5); sc0.tweens.add({ targets: g, scale: 5, alpha: 0, duration: 380, ease: 'Quad.out', onComplete: () => g.destroy() });
      for (let i = 0; i < 8; i++) { const a2 = i / 8 * Math.PI * 2 + Math.random() * 0.4, sp = sc0.add.image(cx, cy, 'spark2').setTint(i % 2 ? 0xd890ff : 0xffd23f).setBlendMode(Phaser.BlendModes.ADD).setDepth(12).setAngle(a2 * 57.3);
        sc0.tweens.add({ targets: sp, x: cx + Math.cos(a2) * (36 + Math.random() * 24), y: cy + Math.sin(a2) * (30 + Math.random() * 20), alpha: 0, scale: 0.3, duration: 420 + Math.random() * 160, ease: 'Quad.out', onComplete: () => sp.destroy() }); } }
    const sc = this.scene; d.once('animationcomplete', () => sc.tweens.add({ targets: d, alpha: 0, duration: 200, onComplete: () => d.destroy() })); this.emit('destroyed', this); this.destroy();
  }
  /** Hi-bit destruction: white flash, shockwave rings, tumbling hull debris, smoke puffs. */
  debris() {
    const s = this.scene, cx = this.x, cy = this.y - this.height / 2;
    const fl = s.add.image(cx, cy, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(2.2).setDepth(11);
    s.tweens.add({ targets: fl, scale: 0.2, alpha: 0, duration: 180, onComplete: () => fl.destroy() });
    [0xffffff, 0xff4fd8].forEach((c, i) => { const r = s.add.circle(cx, cy, 3).setStrokeStyle(2 - i * 0.5, c).setFillStyle().setDepth(11).setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: r, radius: 26 + i * 10, alpha: 0, duration: 320 + i * 120, ease: 'Cubic.easeOut', onComplete: () => r.destroy() }); });
    const cols = [0x3a3448, 0x5a5468, 0x8a8498, 0xff3040, 0x2a2436];
    for (let i = 0; i < 10; i++) { const d = s.add.rectangle(cx, cy, 2 + (i % 3), 2 + ((i + 1) % 2) * 2, cols[i % cols.length]).setDepth(10);
      const a = -Math.PI * (0.1 + 0.8 * Math.random()), v = 60 + Math.random() * 90, vx = Math.cos(a) * v, vy = Math.sin(a) * v;
      s.tweens.addCounter({ from: 0, to: 1, duration: 600 + Math.random() * 300, onUpdate: tw => { const t = tw.getValue() as number * 0.9; d.setPosition(cx + vx * t, cy + vy * t + 260 * t * t).setAngle(t * 720); d.setAlpha(1 - t); }, onComplete: () => d.destroy() }); }
    for (let i = 0; i < 4; i++) { const p = s.add.image(cx + (Math.random() - 0.5) * 14, cy, 'glow').setTint(0x403a50).setAlpha(0.7).setScale(0.5).setDepth(10);
      s.tweens.add({ targets: p, y: cy - 20 - Math.random() * 14, scale: 1.4, alpha: 0, duration: 700 + i * 120, delay: 80 + i * 40, onComplete: () => p.destroy() }); }
  }
  /** Elite: ~30% of drones/bots/wasps/sentries/troopers (seeded by spawn x) wear the regenerated violet sheet, +1 hp, violet aura. */
  elite = false; eliteChk = false;
  checkElite() { this.eliteChk = true; const k = this.texture.key; if (this.kind === 'boss' || !this.scene.textures.exists(k + '_v')) return; const h = ((Math.round(this.x) * 2654435761) >>> 0) % 10; if (h >= 3) return;
    this.elite = true; this.hp += 1; this.setTexture(k + '_v', this.frame.name); this.aura.setTint(0xb04aff); const S: any = this.scene; S.__elites = (S.__elites || 0) + 1;
    const cur = this.anims.currentAnim?.key; if (cur) this.play(cur, true); }
  /** variant anim on demand: same timing, every frame swapped to its regenerated `_v` texture (works for sheets and per-frame images) */
  static variantAnim(sc: Phaser.Scene, key: string) { const A = sc.anims; if (A.exists(key + '_v')) return true; const an = A.get(key); if (!an) return false;
    const fr = an.frames.map(f => ({ key: f.textureKey + '_v', frame: f.textureFrame })); if (!fr.every(f => sc.textures.exists(f.key))) return false;
    A.create({ key: key + '_v', frames: fr, frameRate: an.frameRate, repeat: an.repeat, yoyo: an.yoyo }); return true; }
  play(key: any, ignoreIfPlaying?: boolean) { if (this.elite && typeof key === 'string' && Enemy.variantAnim(this.scene, key)) key = key + '_v'; return super.play(key, ignoreIfPlaying); }
  tick(dt: number, _px: number, _py: number) {
    if (!this.eliteChk) this.checkElite();
    this.t += dt; if (this.wob) { this.wobT += dt; this.wob *= Math.pow(0.004, dt); if (Math.abs(this.wob) < 0.5) this.wob = 0; } if (this.hitT > 0) this.hitT -= dt; if (this.flashT > 0 && (this.flashT -= dt) <= 0) this.clearTint();
    const ex = this.x + (this.flipX ? -this.eyeX : this.eyeX), ey = this.y - this.height * this.eyeY;
    if (this.kind === 'boss') this.aura.setVisible(false);
    this.aura.setPosition(ex, ey).setScale(0.45 + 0.15 * Math.sin(this.t * 6)).setAlpha(0.3 + 0.2 * Math.sin(this.t * 6));
    if (this.teleT > 0) { this.teleT -= dt; const blink = Math.floor(this.teleT * 14) % 2 === 0; this.tele.setVisible(blink).setPosition(ex, ey).setScale(1.35).setTint(0xffd23f).setAlpha(0.95); this.setTint(blink ? 0xff8060 : 0xffe0a0); if (this.teleT <= 0) { this.tele.setVisible(false); this.clearTint(); } }
  }
}
