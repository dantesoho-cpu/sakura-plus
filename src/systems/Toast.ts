import Phaser from 'phaser';
// Memory/tutorial toasts: queued, fade in at top-centre, hold, fade out.
export class Toast {
  q: { t: string; c: string }[] = []; busy = false; txt: Phaser.GameObjects.Text; shown: string[] = [];
  constructor(public scene: Phaser.Scene) {
    this.txt = scene.add.text(240, 52, '', { fontFamily: 'monospace', fontSize: '9px', color: '#fff4fb', stroke: '#2a1238', strokeThickness: 3, align: 'center', wordWrap: { width: 380 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(110).setAlpha(0);
  }
  show(t: string, c = '#fff4fb') { this.shown.push(t); this.q.push({ t, c }); if (!this.busy) this.nextT(); }
  nextT() {
    const m = this.q.shift(); if (!m) { this.busy = false; return; } this.busy = true;
    this.txt.setText(m.t).setColor(m.c).setAlpha(0).setY(58);
    this.scene.tweens.add({ targets: this.txt, alpha: 1, y: 52, duration: 250, hold: 2300, yoyo: true, onComplete: () => this.nextT() });
  }
}
