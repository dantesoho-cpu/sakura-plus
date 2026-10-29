import Phaser from 'phaser';
export class Pause extends Phaser.Scene {
  constructor() { super('Pause'); }
  create() {
    const st = { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '14px', color: '#ffd23f', stroke: '#1a0f2e', strokeThickness: 3 };
    this.add.rectangle(240, 135, 480, 270, 0x140a24, 0.55);
    this.add.text(240, 96, 'PAUSED', st).setOrigin(0.5);
    const lvl = () => this.scene.get('Level1') as any;
    const resume = () => { this.scene.resume('Level1'); this.scene.stop(); };
    const cp = () => { resume(); lvl().checkpoint(); };
    const restart = () => { this.scene.stop('Level1'); this.scene.start('Level1'); };
    const title = () => { this.scene.stop('Level1'); this.scene.start('Title'); };
    const items: [string, () => void][] = [['RESUME  (P / ESC)', resume], ['RESPAWN AT CHECKPOINT  (R)', cp], ['RESTART LEVEL  (Q)', restart], ['TITLE  (T)', title]];
    items.forEach(([t, f], i) => { const tx = this.add.text(240, 124 + i * 18, t, { ...st, fontSize: '10px', color: i === 1 ? '#ffd6f0' : '#fff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      tx.on('pointerover', () => tx.setColor('#ffd23f')); tx.on('pointerout', () => tx.setColor(i === 1 ? '#ffd6f0' : '#fff')); tx.on('pointerdown', f); });
    const kb = this.input.keyboard!;
    kb.on('keydown-P', resume); kb.on('keydown-ESC', resume); kb.on('keydown-R', cp); kb.on('keydown-BACKSPACE', cp); kb.on('keydown-Q', restart); kb.on('keydown-T', title);
  }
}
