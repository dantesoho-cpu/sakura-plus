import { audio } from '../audio/Audio';
import Phaser from 'phaser';
import { Parallax } from '../systems/Parallax';
import { Petals } from '../systems/Petals';
// Level select: two chapter cards with in-game preview art, best time / memories (saved by Victory), ←→ choose · ENTER play · ESC back.
export const LEVELS = [{ key: 'Level1', ch: 1, name: 'AKARI VALLEY', sub: 'blossom ruins · waterfalls', thumb: 'ui_thumb_l1', col: 0xff7ac8 },
  { key: 'Level2', ch: 2, name: 'NEO-KYO', sub: 'neon rooftops · KAIJU UNIT', thumb: 'ui_thumb_l2', col: 0x4fe3ff }];
export function bestOf(ch: number): { time: number; got: number } | null { try { return JSON.parse(localStorage.getItem('sakura.best.' + ch) || 'null'); } catch { return null; } }
export function saveBest(ch: number, time: number, got: number) { try { const b = bestOf(ch); if (!b || time < b.time || got > b.got) localStorage.setItem('sakura.best.' + ch, JSON.stringify({ time: b && b.time < time ? b.time : time, got: Math.max(got, b?.got || 0) })); } catch { /* private mode */ } }
export class LevelSelect extends Phaser.Scene {
  bg!: Parallax; petals!: Petals; sel = 0; cards: Phaser.GameObjects.Container[] = []; t = 0; gone = false; frames: Phaser.GameObjects.Rectangle[] = [];
  constructor() { super('LevelSelect'); }
  preload() { this.load.image('ui_thumb_l1', 'assets/ui/thumb_l1.png'); this.load.image('ui_thumb_l2', 'assets/ui/thumb_l2.png'); }
  create() {
    this.gone = false; this.cards = []; this.frames = []; this.t = 0;
    this.bg = new Parallax(this); this.petals = new Petals(this);
    this.add.rectangle(240, 135, 480, 270, 0x1a0f2e, 0.35).setScrollFactor(0).setDepth(45);
    const st = { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '14px', color: '#ffd23f', stroke: '#1a0f2e', strokeThickness: 4 };
    this.add.text(240, 26, 'SELECT CHAPTER', st).setOrigin(0.5).setScrollFactor(0).setDepth(50);
    LEVELS.forEach((L, i) => { const x = 128 + i * 224, b = bestOf(L.ch);
      const fr = this.add.rectangle(0, 0, 200, 150, 0x1a0f2e, 0.92).setStrokeStyle(2, L.col); this.frames.push(fr);
      const im = this.add.image(0, -24, L.thumb).setDisplaySize(184, 92);
      const t1 = this.add.text(-92, 26, `CHAPTER ${L.ch}`, { ...st, fontSize: '8px', color: '#c9b8e8', strokeThickness: 2 });
      const t2 = this.add.text(-92, 36, L.name, { ...st, fontSize: '12px', strokeThickness: 3 });
      const t3 = this.add.text(-92, 52, L.sub, { ...st, fontSize: '8px', fontStyle: 'normal', color: '#fff', strokeThickness: 2 });
      const bt = b ? `BEST ${Math.floor(b.time / 60)}:${String(Math.floor(b.time % 60)).padStart(2, '0')} · ✿ ${b.got}/10` : 'NOT CLEARED';
      const t4 = this.add.text(92, 26, bt, { ...st, fontSize: '8px', color: b ? '#ffd23f' : '#8a7aa8', strokeThickness: 2 }).setOrigin(1, 0);
      const c = this.add.container(x, 128, [fr, im, t1, t2, t3, t4]).setScrollFactor(0).setDepth(50).setSize(200, 150).setInteractive({ useHandCursor: true });
      c.on('pointerover', () => this.choose(i)); c.on('pointerdown', () => { this.choose(i); this.play(); });
      c.setAlpha(0).y += 20; this.tweens.add({ targets: c, alpha: 1, y: 128, duration: 380, delay: 80 + i * 110, ease: 'Back.out' }); this.cards.push(c); });
    this.add.text(240, 230, '←→ choose · ENTER play · ESC back', { ...st, fontSize: '8px', fontStyle: 'normal', color: '#fff', strokeThickness: 2 }).setOrigin(0.5).setScrollFactor(0).setDepth(50);
    const back = this.add.text(18, 14, '‹ BACK', { ...st, fontSize: '9px', strokeThickness: 2 }).setScrollFactor(0).setDepth(50).setInteractive({ useHandCursor: true }); back.on('pointerdown', () => this.back());
    const K = this.input.keyboard!;
    K.on('keydown-LEFT', () => this.choose(this.sel - 1)); K.on('keydown-RIGHT', () => this.choose(this.sel + 1)); K.on('keydown-A', () => this.choose(this.sel - 1)); K.on('keydown-D', () => this.choose(this.sel + 1));
    K.on('keydown-ENTER', () => this.play()); K.on('keydown-SPACE', () => this.play()); K.on('keydown-ESC', () => this.back()); K.on('keydown-BACKSPACE', () => this.back());
    this.choose(0, true); (window as any).__ls = this; this.cameras.main.fadeIn(260);
  }
  choose(i: number, quiet = false) { if (this.gone) return; const n = LEVELS.length; i = (i + n) % n; if (i !== this.sel && !quiet) audio.sfx('menu', { rate: 1.4, vol: 0.5 }); this.sel = i;
    this.cards.forEach((c, k) => { this.tweens.add({ targets: c, scale: k === i ? 1.06 : 0.92, duration: 140, ease: 'Quad.out' }); this.frames[k].setStrokeStyle(k === i ? 3 : 1, k === i ? LEVELS[k].col : 0x5a4a7a); }); }
  play() { if (this.gone) return; this.gone = true; audio.sfx('menu'); const k = LEVELS[this.sel].key; this.cameras.main.flash(120, 255, 220, 240); this.cameras.main.fadeOut(300); this.time.delayedCall(320, () => this.scene.start(k)); }
  back() { if (this.gone) return; this.gone = true; this.cameras.main.fadeOut(220); this.time.delayedCall(240, () => this.scene.start('Title')); }
  update(_t: number, d: number) { const dt = d / 1000; this.t += dt; this.cameras.main.scrollX += 14 * dt; this.bg.update(dt); this.petals.update(dt); this.frames[this.sel]?.setAlpha(0.85 + 0.15 * Math.sin(this.t * 5)); }
}
