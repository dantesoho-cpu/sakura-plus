import Phaser from 'phaser';
// Memory/tutorial toasts: queued, fade in at top-centre, hold, fade out.
export class Toast {
  q: { t: string; c: string }[] = []; busy = false; txt: Phaser.GameObjects.Text; bg: Phaser.GameObjects.Graphics; shown: string[] = [];
  constructor(public scene: Phaser.Scene) {
    this.txt = scene.add.text(240, 52, '', { fontFamily: 'monospace', fontSize: '9px', color: '#fff4fb', stroke: '#2a1238', strokeThickness: 3, align: 'center', wordWrap: { width: 380 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(110).setAlpha(0);
    this.bg = scene.add.graphics().setScrollFactor(0).setDepth(109).setAlpha(0);
  }
  /** hi-bit dialogue plate: dark plum fill, 1px rim + inner shade, notched (not rounded) corners */
  plate() { const g = this.bg, w = Math.ceil(this.txt.width / 2) * 2 + 16, h = Math.ceil(this.txt.height) + 6, x = 240 - w / 2, y = -h / 2; g.clear();
    g.fillStyle(0x1a0b24, 0.82).fillRect(x + 1, y, w - 2, h).fillRect(x, y + 1, w, h - 2);
    g.fillStyle(0xf3a6cf, 0.75).fillRect(x + 2, y, w - 4, 1).fillRect(x + 2, y + h - 1, w - 4, 1).fillRect(x, y + 2, 1, h - 4).fillRect(x + w - 1, y + 2, 1, h - 4)
     .fillRect(x + 1, y + 1, 1, 1).fillRect(x + w - 2, y + 1, 1, 1).fillRect(x + 1, y + h - 2, 1, 1).fillRect(x + w - 2, y + h - 2, 1, 1);
    g.fillStyle(0x6b2f5c, 0.9).fillRect(x + 2, y + h - 2, w - 4, 1); }
  show(t: string, c = '#fff4fb') { this.shown.push(t); this.q.push({ t, c }); if (!this.busy) this.nextT(); }
  nextT() {
    const m = this.q.shift(); if (!m) { this.busy = false; return; } this.busy = true;
    this.txt.setText(m.t).setColor(m.c).setAlpha(0).setY(58); this.plate(); this.bg.setAlpha(0).setY(58);
    this.scene.tweens.add({ targets: [this.txt, this.bg], alpha: 1, y: 52, duration: 250, hold: 2300, yoyo: true, onComplete: () => this.nextT() });
  }
}
