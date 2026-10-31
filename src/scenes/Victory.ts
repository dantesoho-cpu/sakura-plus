import Phaser from 'phaser';
import { Car } from '../systems/Car';
import { Parallax } from '../systems/Parallax';
import { Petals } from '../systems/Petals';
// Chapter-complete cinematic: car drives across the valley, petals fall, title card + stats.
export class Victory extends Phaser.Scene {
  bg!: Parallax; petals!: Petals; t = 0; prompt!: Phaser.GameObjects.Text;
  constructor() { super('Victory'); }
  create(d: { time: number; got: number; kills: number; deaths: number; ch?: number; gems?: number }) {
    this.bg = new Parallax(this); this.petals = new Petals(this); this.t = 0;
    // blossom road from tileset2: cap row + varied fill blocks, scrolls with the camera
    for (let i = 0; i < 64; i++) { this.add.image(i * 16, 238, 'tiles', 1).setOrigin(0, 0).setDepth(30);
      for (let r = 1; r < 3; r++) this.add.image(i * 16, 238 + r * 16, 'tiles', 24 + ((i >> 1) * 7 % 12) * 4 + (i & 1) + ((r + 1) & 1) * 2).setOrigin(0, 0).setDepth(30); }
    // Sakura runs in, hops into the parked car (it dips on its springs), then it pulls away: wheels spin, exhaust + petal + tail-light trail
    const car = new Car(this, 300, 244, 1.5).setDepth(40).setScrollFactor(0); (window as any).__car = car; this.car = car;
    const sak = this.add.sprite(-20, 240, 'p_idle', 0).setOrigin(0.5, 1).setScale(1.5).setDepth(41).setScrollFactor(0).play('run'); this.sak = sak;
    this.tweens.add({ targets: sak, x: 262, duration: 1300, ease: 'Linear', onComplete: () => {
      sak.play('jump'); this.tweens.add({ targets: sak, x: 292, duration: 380, ease: 'Linear' });
      this.tweens.add({ targets: sak, y: 206, duration: 190, ease: 'Quad.out', yoyo: true, onYoyo: () => { sak.play('fall'); this.tweens.add({ targets: sak, alpha: 0, duration: 170, ease: 'Quad.in' }); }, onComplete: () => {
        sak.setVisible(false); this.tweens.add({ targets: car, scaleY: 1.38, duration: 90, yoyo: true, ease: 'Quad.out' });
        this.time.delayedCall(350, () => { car.startTrail(40); this.driving = true; this.tweens.add({ targets: car, x: 720, duration: 3600, ease: 'Quad.in' }); });
      } });
    } });
    const st = { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '16px', color: '#ffd23f', stroke: '#1a0f2e', strokeThickness: 4 };
    const title = this.add.text(240, d.ch === 2 ? 44 : 60, `CHAPTER ${d.ch || 1} COMPLETE`, st).setOrigin(0.5).setDepth(50).setAlpha(0);
    const m = Math.floor(d.time / 60), s = String(Math.floor(d.time % 60)).padStart(2, '0');
    const stats = this.add.text(240, d.ch === 2 ? 116 : 112, `TIME ${m}:${s}\nMEMORIES ${d.got}/10\n${d.ch === 2 ? `SHARDS ${d.gems || 0}\nKAIJU UNIT DOWN\n` : ''}KUROGEN DOWNED ${d.kills}\nFALLS ${d.deaths}`, { ...st, fontSize: '10px', color: '#fff', align: 'center', lineSpacing: 4 }).setOrigin(0.5).setDepth(50).setAlpha(0);
    this.prompt = this.add.text(240, d.ch === 2 ? 200 : 180, 'ENTER restart   ·   T title', { ...st, fontSize: '10px' }).setOrigin(0.5).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 800, delay: 600 }); this.tweens.add({ targets: stats, alpha: 1, duration: 800, delay: 1400 });
    this.time.delayedCall(2200, () => { this.ready = true;
      this.input.keyboard!.once('keydown-ENTER', () => this.scene.start(d.ch === 2 ? 'Level2' : 'Level1')); this.input.keyboard!.once('keydown-T', () => this.scene.start('Title')); this.input.once('pointerdown', () => this.scene.start(d.ch === 2 ? 'Level2' : 'Level1')); });
    (window as any).__victory = { ...d };
    this.cameras.main.fadeIn(600, 255, 230, 240);
  }
  ready = false; car!: Car; sak!: Phaser.GameObjects.Sprite; driving = false; lt = 0;
  update(_t: number, dms: number) { const dt = dms / 1000; this.t += dt; this.cameras.main.scrollX += 30 * dt; this.bg.update(dt); this.petals.update(dt); if (this.ready) this.prompt.setAlpha(0.5 + 0.5 * Math.sin(this.t * 4));
    // tail-light streak: short-lived red glows left behind the moving car
    if (this.driving && (this.lt -= dt) <= 0 && this.car.active) { this.lt = 0.03; const r = this.car.rig, sc = this.car.scaleX;
      const g = this.add.image(this.car.x + (-r.w / 2 + r.tail[0]) * sc, this.car.y + (-r.h + r.tail[1]) * sc, 'glow').setTint(0xff3a6a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5, 0.25).setScrollFactor(0).setDepth(39);
      this.tweens.add({ targets: g, alpha: 0, scaleX: 1.6, duration: 380, onComplete: () => g.destroy() }); } }
}
