import { audio } from '../audio/Audio';
import Phaser from 'phaser';
import { Parallax } from '../systems/Parallax';
import { Petals } from '../systems/Petals';
import { isTouch } from '../systems/Touch';
export class Title extends Phaser.Scene {
  bg!: Parallax; petals!: Petals; t = 0; prompt!: Phaser.GameObjects.Text;
  constructor() { super('Title'); }
  // automated runs (navigator.webdriver) skip the intro unless ?intro=1 asks for it
  static introOn() { const q = new URLSearchParams(location.search).get('intro'); return q === '1' || (q !== '0' && !navigator.webdriver); }
  create() {
    this.bg = new Parallax(this); this.petals = new Petals(this);
    const logo = this.add.image(240, 92, 'ui_logo').setScale(1).setDepth(50);
    this.tweens.add({ targets: logo, y: 86, yoyo: true, repeat: -1, duration: 1600, ease: 'Sine.inOut' });
    const st = { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '10px', color: '#ffd23f', stroke: '#1a0f2e', strokeThickness: 3 };
    this.add.text(240, 160, 'CHAPTER 1 · AKARI VALLEY', { ...st, color: '#ffe6f4' }).setOrigin(0.5).setDepth(50);
    this.prompt = this.add.text(240, 196, 'PRESS ENTER', { ...st, fontSize: '12px' }).setOrigin(0.5).setDepth(50);
    this.add.text(240, 252, '←→ move · SPACE jump (x2, hold = jet) · SHIFT dash · J/X shoot · R checkpoint · P pause', { ...st, fontSize: '8px', fontStyle: 'normal', color: '#fff', strokeThickness: 2 }).setOrigin(0.5).setDepth(50);
    const go = () => { audio.sfx('menu'); this.cameras.main.fadeOut(300); this.time.delayedCall(320, () => this.scene.start(Title.introOn() ? 'Intro' : 'Level1')); };
    let gone = false; const go1 = go; const goOnce = () => { if (!gone) { gone = true; go1(); } };
    this.input.keyboard!.once('keydown-ENTER', goOnce); this.input.on('pointerdown', goOnce); if (isTouch()) this.prompt.setText('TAP TO START'); this.input.keyboard!.once('keydown-SPACE', goOnce);
    this.cameras.main.fadeIn(300);
  }
  update(_t: number, d: number) { const dt = d / 1000; this.t += dt; this.cameras.main.scrollX += 20 * dt; this.bg.update(dt); this.petals.update(dt); this.prompt.setAlpha(0.5 + 0.5 * Math.sin(this.t * 4)); }
}
