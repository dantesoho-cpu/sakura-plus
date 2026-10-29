import Phaser from 'phaser';
export class Pause extends Phaser.Scene {
  constructor() { super('Pause'); }
  create() {
    const st = { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '14px', color: '#ffd23f', stroke: '#1a0f2e', strokeThickness: 3 };
    this.add.rectangle(240, 135, 480, 270, 0x140a24, 0.55);
    this.add.text(240, 110, 'PAUSED', st).setOrigin(0.5);
    this.add.text(240, 140, 'P / ESC resume   ·   R restart   ·   T title', { ...st, fontSize: '9px', color: '#fff' }).setOrigin(0.5);
    const kb = this.input.keyboard!;
    const resume = () => { this.scene.resume('Level1'); this.scene.stop(); };
    kb.on('keydown-P', resume); kb.on('keydown-ESC', resume);
    kb.on('keydown-R', () => { this.scene.stop('Level1'); this.scene.start('Level1'); });
    kb.on('keydown-T', () => { this.scene.stop('Level1'); this.scene.start('Title'); });
  }
}
