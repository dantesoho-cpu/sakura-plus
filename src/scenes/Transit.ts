import Phaser from 'phaser';
import { Car } from '../systems/Car';
// Chapter 1 -> 2 cutscene: the valley fades to Neo-Kyo's skyline (Dante's nk_L1..L5 sheet layers), Sakura's car
// cruises the elevated highway, traffic (sheet vehicles) streams past, title card, then Level2. ENTER/SPACE/click skips.
export class Transit extends Phaser.Scene {
  L: Phaser.GameObjects.TileSprite[] = []; car!: Car; t = 0; done = false; traffic: Phaser.GameObjects.Image[] = []; vt = 0;
  constructor() { super('Transit'); }
  preload() { const A = 'assets/l2/'; for (let i = 1; i <= 5; i++) if (!this.textures.exists('tr_L' + i)) this.load.image('tr_L' + i, `${A}bg/nk_L${i}.png`);
    for (const v of [2, 3, 4, 6]) if (!this.textures.exists('tr_v' + v)) this.load.image('tr_v' + v, `${A}veh/veh_0${v}.png`); }
  create() {
    this.t = 0; this.done = false; this.traffic = []; const W = 480, H = 270;
    const g = this.add.graphics(); g.fillGradientStyle(0x1a0f3e, 0x1a0f3e, 0xff6aa8, 0xff6aa8, 1); g.fillRect(0, 0, W, H); // dusk -> neon night
    const night = this.add.rectangle(0, 0, W, H, 0x0a0620).setOrigin(0).setAlpha(0); this.tweens.add({ targets: night, alpha: 0.25, duration: 3500 });
    const ys = [0, 82, 132, 166, 197], sp = [0.06, 0.14, 0.26, 0.42, 0.6]; // same layout as Level2's parallax
    this.L = ys.map((y, i) => this.add.tileSprite(0, y, W, this.textures.get('tr_L' + (i + 1)).getSourceImage().height, 'tr_L' + (i + 1)).setOrigin(0, 0).setScrollFactor(0).setData('s', sp[i]).setData('k', 'tr_L' + (i + 1)));
    // elevated highway deck + lane dashes + neon rail
    this.add.rectangle(0, 234, W, 36, 0x141026).setOrigin(0); this.add.rectangle(0, 234, W, 2, 0xff4fd8).setOrigin(0).setAlpha(0.8);
    this.dash = this.add.tileSprite(0, 252, W, 1, '__WHITE').setOrigin(0).setTint(0xffd23f).setAlpha(0.6);
    for (let i = 0; i < 40; i++) { const s = this.add.rectangle(Math.random() * W, 20 + Math.random() * 110, 1, 1, 0xffffff).setAlpha(0.3 + Math.random() * 0.6); this.tweens.add({ targets: s, alpha: 0.1, duration: 600 + Math.random() * 900, yoyo: true, repeat: -1 }); }
    this.car = new Car(this, -80, 268, 1.3).setDepth(40).setScrollFactor(0); this.car.startTrail(40);
    this.tweens.add({ targets: this.car, x: 210, duration: 2200, ease: 'Cubic.out' });
    const st = { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '10px', color: '#9af0ff', stroke: '#1a0f2e', strokeThickness: 4 };
    const c = this.add.text(240, 58, 'CHAPTER 2', st).setOrigin(0.5).setDepth(50).setAlpha(0);
    const n = this.add.text(240, 80, 'NEO-KYO', { ...st, fontSize: '24px', color: '#ff7ad9' }).setOrigin(0.5).setDepth(50).setAlpha(0).setScale(1.4);
    const sub = this.add.text(240, 104, 'the neon city never sleeps', { ...st, fontSize: '9px', color: '#fff' }).setOrigin(0.5).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 500, delay: 1100 }); this.tweens.add({ targets: n, alpha: 1, scale: 1, duration: 600, delay: 1500, ease: 'Back.out' });
    this.tweens.add({ targets: sub, alpha: 1, duration: 500, delay: 2200 });
    this.time.delayedCall(4600, () => this.tweens.add({ targets: this.car, x: 620, duration: 1200, ease: 'Quad.in' }));
    this.time.delayedCall(5400, () => this.go());
    this.time.delayedCall(400, () => { const K = this.input.keyboard!; K.once('keydown-ENTER', () => this.go()); K.once('keydown-SPACE', () => this.go()); this.input.once('pointerdown', () => this.go()); });
    this.cameras.main.fadeIn(700, 10, 6, 32); (window as any).__transit = this;
  }
  dash!: Phaser.GameObjects.TileSprite;
  go() { if (this.done) return; this.done = true; this.cameras.main.fadeOut(500, 10, 6, 32); this.time.delayedCall(520, () => this.scene.start('Level2')); }
  update(_t: number, dms: number) { const dt = dms / 1000; this.t += dt; const v = 260;
    for (const l of this.L) l.tilePositionX += v * l.getData('s') * dt; this.dash.tilePositionX += v * dt * 1.2;
    if ((this.vt -= dt) <= 0) { this.vt = 0.7 + Math.random() * 0.8; const k = 'tr_v' + [2, 3, 4, 6][Math.floor(Math.random() * 4)];
      const im = this.add.image(520, 248, k).setOrigin(0.5, 1).setDepth(35).setFlipX(true).setTint(0xc8b8ff); this.traffic.push(im);
      this.tweens.add({ targets: im, x: -60, duration: 1100 + Math.random() * 400, onComplete: () => im.destroy() }); } }
}
