import { audio } from '../audio/Audio';
import Phaser from 'phaser';
import { Parallax } from '../systems/Parallax';
import { Petals } from '../systems/Petals';
import { isTouch } from '../systems/Touch';
import { liveHint } from '../systems/Pad';
// Title: floating logo, Sakura idling on a blossom ledge, a 3-item menu (START / LEVEL SELECT / CONTROLS).
// ENTER / SPACE / Cross confirm the highlighted item (START by default, so the old "press enter to play" still works).
export class Title extends Phaser.Scene {
  bg!: Parallax; petals!: Petals; t = 0; prompt!: Phaser.GameObjects.Text; sel = 0; items: Phaser.GameObjects.Text[] = []; cur!: Phaser.GameObjects.Image; help!: Phaser.GameObjects.Text; gone = false;
  constructor() { super('Title'); }
  static introOn() { const q = new URLSearchParams(location.search).get('intro'); return q === '1' || (q !== '0' && !navigator.webdriver); }
  create() {
    this.gone = false; this.sel = 0; this.t = 0; this.items = [];
    this.bg = new Parallax(this); this.petals = new Petals(this);
    { const v = this.add.graphics().setScrollFactor(0).setDepth(48); v.fillStyle(0x0a0618, 0.35); v.fillRect(0, 0, 480, 270); v.fillStyle(0x0a0618, 0); /* plate behind menu */
      const g = this.add.graphics().setScrollFactor(0).setDepth(49); g.fillStyle(0x1a0f2e, 0.55).fillRoundedRect(150, 152, 180, 70, 6); g.lineStyle(1, 0xff7ac8, 0.4).strokeRoundedRect(150, 152, 180, 70, 6); }
    const glow = this.add.image(240, 88, 'glow').setScrollFactor(0).setDepth(49).setTint(0xff7ac8).setBlendMode(Phaser.BlendModes.ADD).setScale(5, 2.2).setAlpha(0.35);
    this.tweens.add({ targets: glow, alpha: 0.18, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.inOut' });
    const logo = this.add.image(240, 80, 'ui_logo').setScrollFactor(0).setDepth(50).setAlpha(0).setScale(0.9);
    this.tweens.add({ targets: logo, alpha: 1, scale: 1, duration: 700, ease: 'Back.out' });
    this.tweens.add({ targets: logo, y: 74, yoyo: true, repeat: -1, duration: 1600, ease: 'Sine.inOut', delay: 700 });
    // Sakura on a blossom ledge built from tileset2 caps (her own idle animation)
    for (let i = 0; i < 6; i++) this.add.image(26 + i * 16, 238, 'tiles', 1).setOrigin(0, 0).setScrollFactor(0).setDepth(48);
    const sak = this.add.sprite(74, 243, 'p_idle', 0).setOrigin(0.5, 1).setScrollFactor(0).setDepth(51).setScale(1.25).play('idle'); (window as any).__titleSak = sak;
    const st = { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '10px', color: '#ffd23f', stroke: '#1a0f2e', strokeThickness: 3 };
    this.add.text(240, 136, 'CHAPTER 1 · AKARI VALLEY', { ...st, color: '#ffe6f4' }).setOrigin(0.5).setScrollFactor(0).setDepth(50);
    ['START', 'LEVEL SELECT', 'CONTROLS'].forEach((s, i) => { const t = this.add.text(240, 162 + i * 18, s, { ...st, fontSize: '12px' }).setOrigin(0.5).setScrollFactor(0).setDepth(50).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => this.move(i - this.sel)); t.on('pointerdown', () => { this.sel = i; this.pick(); }); this.items.push(t); });
    this.prompt = this.items[0];
    this.cur = this.add.image(0, 0, 'petal_soft').setScrollFactor(0).setDepth(50).setScale(0.6).setTint(0xff8ad0);
    this.help = this.add.text(240, 252, isTouch() ? 'tap a menu item' : '↑↓ choose · ENTER confirm · 2 jump to Neo-Kyo', { ...st, fontSize: '8px', fontStyle: 'normal', color: '#fff', strokeThickness: 2 }).setOrigin(0.5).setScrollFactor(0).setDepth(50);
    liveHint(this, this.help, { kb: '↑↓ choose · ENTER confirm · 2 jump to Neo-Kyo', touch: 'tap a menu item', pad: 'stick / d-pad choose · ✕ confirm' }, isTouch);
    const K = this.input.keyboard!;
    K.on('keydown-UP', () => this.move(-1)); K.on('keydown-DOWN', () => this.move(1)); K.on('keydown-W', () => this.move(-1)); K.on('keydown-S', () => this.move(1));
    K.on('keydown-ENTER', () => this.pick()); K.on('keydown-SPACE', () => this.pick());
    K.once('keydown-TWO', () => this.goto('Level2')); K.once('keydown-THREE', () => this.goto('Shrine')); { const m = /[?&]lvl=(\w+)/.exec(location.search)?.[1]; const to = m === '2' || m === '3' || m === 'nk' ? 'Level2' : m === 'sh' || m === 'shrine' ? 'Shrine' : m === 'pxtest' || m === 'px' ? 'PxTest' : m === 'fortress' || m === 'ft' || m === '4' ? 'Fortress' : ''; if (to) this.time.delayedCall(50, () => this.scene.start(to)); }
    this.move(0); (window as any).__title = this; this.cameras.main.fadeIn(300);
  }
  move(d: number) { if (this.gone) return; const n = this.items.length, prev = this.sel; this.sel = (this.sel + d + n) % n; if (d && prev !== this.sel) audio.sfx('menu', { rate: 1.4, vol: 0.5 });
    this.items.forEach((t, i) => { t.setColor(i === this.sel ? '#ffd23f' : '#c9b8e8').setScale(i === this.sel ? 1.12 : 1); }); this.cur.setPosition(this.items[this.sel].x - this.items[this.sel].width / 2 * 1.12 - 10, this.items[this.sel].y); }
  pick() { if (this.gone) return; if (this.ctl) { this.controls(); return; } const i = this.sel;
    if (i === 0) this.goto(Title.introOn() ? 'Intro' : 'Level1'); else if (i === 1) this.goto('LevelSelect'); else this.controls(); }
  goto(k: string) { if (this.gone) return; this.gone = true; audio.sfx('menu'); this.cameras.main.fadeOut(300); this.time.delayedCall(320, () => this.scene.start(k)); }
  ctl?: Phaser.GameObjects.Container;
  controls() { if (this.ctl) { this.ctl.destroy(); this.ctl = undefined; return; } audio.sfx('menu');
    const st = { fontFamily: 'monospace', fontSize: '8px', color: '#fff', stroke: '#1a0f2e', strokeThickness: 2, lineSpacing: 3 };
    const bg = this.add.rectangle(0, 0, 300, 112, 0x1a0f2e, 0.9).setStrokeStyle(2, 0xff7ac8);
    const tx = this.add.text(0, 0, 'KEYBOARD                 CONTROLLER\n←→ move                  stick / d-pad\nSPACE jump ×2, hold jet  ✕\nSHIFT dash (8-way)       ○ / R1\nJ / X shoot, hold charge □\nC cannon                 △ / R2\nR checkpoint · P pause   OPTIONS\n\n           ENTER / ✕ to close', st).setOrigin(0.5);
    this.ctl = this.add.container(240, 150, [bg, tx]).setScrollFactor(0).setDepth(60).setScale(0.8).setAlpha(0); this.tweens.add({ targets: this.ctl, scale: 1, alpha: 1, duration: 160, ease: 'Back.out' }); }
  update(_t: number, d: number) { const dt = d / 1000; this.t += dt; this.cameras.main.scrollX += 20 * dt; this.bg.update(dt); this.petals.update(dt);
    if (this.cur) { this.cur.setAngle(this.t * 120); this.items[this.sel]?.setAlpha(0.75 + 0.25 * Math.sin(this.t * 5)); } }
}
