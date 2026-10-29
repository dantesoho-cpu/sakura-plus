import Phaser from 'phaser';
import { Car } from '../systems/Car';
import { Parallax } from '../systems/Parallax';
import { Petals } from '../systems/Petals';
// Chapter-complete cinematic: car drives across the valley, petals fall, title card + stats.
export class Victory extends Phaser.Scene {
  bg!: Parallax; petals!: Petals; t = 0; prompt!: Phaser.GameObjects.Text;
  constructor() { super('Victory'); }
  create(d: { time: number; got: number; kills: number; deaths: number }) {
    this.bg = new Parallax(this); this.petals = new Petals(this); this.t = 0;
    // blossom road from tileset2: cap row + varied fill blocks, scrolls with the camera
    for (let i = 0; i < 64; i++) { this.add.image(i * 16, 238, 'tiles', 1).setOrigin(0, 0).setDepth(30);
      for (let r = 1; r < 3; r++) this.add.image(i * 16, 238 + r * 16, 'tiles', 24 + ((i >> 1) * 7 % 12) * 4 + (i & 1) + ((r + 1) & 1) * 2).setOrigin(0, 0).setDepth(30); }
    const car = new Car(this, -100, 244, 1.5).setDepth(40).setScrollFactor(0); car.startTrail(40); (window as any).__car = car;
    this.tweens.add({ targets: car, x: 600, duration: 5600, ease: 'Sine.inOut' });
    const st = { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '16px', color: '#ffd23f', stroke: '#1a0f2e', strokeThickness: 4 };
    const title = this.add.text(240, 60, 'CHAPTER 1: 2023 COMPLETE', st).setOrigin(0.5).setDepth(50).setAlpha(0);
    const m = Math.floor(d.time / 60), s = String(Math.floor(d.time % 60)).padStart(2, '0');
    const stats = this.add.text(240, 112, `TIME ${m}:${s}\nMEMORIES ${d.got}/10\nKUROGEN DOWNED ${d.kills}\nFALLS ${d.deaths}`, { ...st, fontSize: '10px', color: '#fff', align: 'center', lineSpacing: 4 }).setOrigin(0.5).setDepth(50).setAlpha(0);
    this.prompt = this.add.text(240, 180, 'ENTER restart   ·   T title', { ...st, fontSize: '10px' }).setOrigin(0.5).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 800, delay: 600 }); this.tweens.add({ targets: stats, alpha: 1, duration: 800, delay: 1400 });
    this.time.delayedCall(2200, () => { this.ready = true;
      this.input.keyboard!.once('keydown-ENTER', () => this.scene.start('Level1')); this.input.keyboard!.once('keydown-T', () => this.scene.start('Title')); this.input.once('pointerdown', () => this.scene.start('Level1')); });
    (window as any).__victory = { ...d };
    this.cameras.main.fadeIn(600, 255, 230, 240);
  }
  ready = false;
  update(_t: number, dms: number) { const dt = dms / 1000; this.t += dt; this.cameras.main.scrollX += 30 * dt; this.bg.update(dt); this.petals.update(dt); if (this.ready) this.prompt.setAlpha(0.5 + 0.5 * Math.sin(this.t * 4)); }
}
