import Phaser from 'phaser';
import { audio } from '../audio/Audio';
import { Petals } from '../systems/Petals';
// Short skippable lore intro (LORE_NOTES.md) — pixel text panels over the sheet's two valley panoramas.
// ENTER/SPACE/tap: finish typing, then next panel. ESC or the SKIP tag: straight to the level.
const PANELS: { img: string; tint?: number; lines: string[] }[] = [
  { img: 'intro_p1', lines: ['YEAR 5842.', 'The Orion Collapse War is over.'] },
  { img: 'intro_p1', lines: ['Sakura Akarin comes home to Akari Valley,', 'after all these years.'] },
  { img: 'intro_p2', tint: 0xb8a8d8, lines: ['But Kurogen Systems drones patrol the valley now —', 'the machines of Kael Veyron.'] },
  { img: 'intro_p2', lines: ['Ten sakura flowers hold what she lost.', 'Each one is a memory. Find them.'] },
];
export class Intro extends Phaser.Scene {
  i = -1; typed = 0; full = ''; txt!: Phaser.GameObjects.Text; bgA!: Phaser.GameObjects.Image; petals!: Petals; done = false; hint!: Phaser.GameObjects.Text; pan = 0; chap!: Phaser.GameObjects.Text;
  constructor() { super('Intro'); }
  create() {
    const W = this.scale.width, H = this.scale.height; this.i = -1; this.done = false;
    this.bgA = this.add.image(0, 0, 'intro_p1').setOrigin(0, 0);
    this.petals = new Petals(this);
    this.add.rectangle(0, H - 62, W, 62, 0x1a0f2e, 0.78).setOrigin(0).setDepth(40);
    this.add.rectangle(0, H - 62, W, 1, 0xffd23f, 0.8).setOrigin(0).setDepth(40);
    const st = { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '10px', color: '#ffe6f4', stroke: '#1a0f2e', strokeThickness: 3, lineSpacing: 4 };
    this.txt = this.add.text(18, H - 52, '', st).setDepth(41);
    this.chap = this.add.text(W / 2, 22, 'CHAPTER "2023"', { ...st, color: '#ffd23f', fontSize: '12px' }).setOrigin(0.5).setDepth(41).setAlpha(0);
    this.hint = this.add.text(W - 8, H - 10, 'ENTER ▸  ·  ESC skip', { ...st, fontSize: '8px', fontStyle: 'normal', strokeThickness: 2, color: '#fff' }).setOrigin(1, 1).setDepth(41);
    const skip = this.add.text(W - 8, 8, 'SKIP ▸▸', { ...st, fontSize: '8px', color: '#ffd23f' }).setOrigin(1, 0).setDepth(41).setInteractive();
    skip.on('pointerdown', (_p: any, _x: any, _y: any, e: any) => { e?.stopPropagation?.(); this.finish(); });
    const adv = () => { if (this.typed < this.full.length) this.typed = this.full.length; else this.next(); };
    this.input.keyboard!.on('keydown-ENTER', adv); this.input.keyboard!.on('keydown-SPACE', adv); this.input.keyboard!.on('keydown-ESC', () => this.finish());
    this.input.on('pointerdown', (_p: any, over: any[]) => { if (!over.includes(skip)) adv(); });
    this.cameras.main.fadeIn(400); this.next(); (window as any).__intro = this;
  }
  next() {
    if (this.done) return; this.i++; if (this.i >= PANELS.length) return this.finish();
    const P = PANELS[this.i], W = this.scale.width, H = this.scale.height;
    if (this.bgA.texture.key !== P.img || this.i === 0) { const sc = Math.max(H / this.textures.get(P.img).getSourceImage().height, W / this.textures.get(P.img).getSourceImage().width); this.bgA.setTexture(P.img).setScale(sc); this.pan = 0; this.cameras.main.flash(250, 26, 15, 46); }
    this.bgA.setTint(P.tint ?? 0xffffff); this.full = P.lines.join('\n'); this.typed = 0; audio.sfx('menu');
    this.tweens.add({ targets: this.chap, alpha: this.i === 0 ? 1 : 0, duration: 500 });
  }
  finish() { if (this.done) return; this.done = true; this.cameras.main.fadeOut(400); this.time.delayedCall(420, () => this.scene.start('Level1')); }
  update(_t: number, d: number) {
    const dt = d / 1000; this.petals.update(dt); this.typed = Math.min(this.full.length, this.typed + dt * 38);
    this.txt.setText(this.full.slice(0, Math.floor(this.typed))); this.hint.setAlpha(this.typed >= this.full.length ? 0.6 + 0.4 * Math.sin(_t / 200) : 0.3);
    const maxPan = this.bgA.displayWidth - this.scale.width; this.pan = Math.min(maxPan, this.pan + dt * 9); this.bgA.x = -Math.round(this.pan);
    this.bgA.y = Math.round(Math.min(0, this.scale.height - 62 - this.bgA.displayHeight + 40));
  }
}
