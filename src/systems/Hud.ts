import Phaser from 'phaser';
// Mania-style HUD: HP pips, memories, jet fuel, timer; boss bar at the bottom during the fight.
export class Hud {
  pips: Phaser.GameObjects.Image[] = []; flowers: Phaser.GameObjects.Text; timer?: Phaser.GameObjects.Text; g: Phaser.GameObjects.Graphics;
  fuelLbl?: Phaser.GameObjects.Text; boot?: Phaser.GameObjects.Image; fuel = -1; boss = -1; bossLbl?: Phaser.GameObjects.Text;
  constructor(public scene: Phaser.Scene, public max = 5, full = false) {
    const st = { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '10px', color: '#ffd23f', stroke: '#1a0f2e', strokeThickness: 3 };
    scene.add.text(6, 4, 'HP', st).setScrollFactor(0).setDepth(100);
    for (let i = 0; i < max; i++) this.pips.push(scene.add.image(28 + i * 14, 11, 'pip').setScrollFactor(0).setDepth(100));
    this.flowers = scene.add.text(6, 18, 'FLOWERS  0/10', st).setScrollFactor(0).setDepth(100);
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(100);
    if (full) {
      this.flowers.setText('MEMORIES 0/10');
      this.timer = scene.add.text(474, 4, 'TIME 0:00', st).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
      this.boot = scene.add.image(12, 39, 'pr_jetboots').setScrollFactor(0).setDepth(100).setScale(0.6).setVisible(false);
      this.fuelLbl = scene.add.text(22, 33, 'JET', { ...st, color: '#7fe9ff' }).setScrollFactor(0).setDepth(100).setVisible(false);
      this.bossLbl = scene.add.text(240, 244, 'KUROGEN ENFORCER', { ...st, color: '#ff8a8a' }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(100).setVisible(false);
    }
  }
  setHp(hp: number) { this.pips.forEach((p, i) => p.setTexture(i < hp ? 'pip' : 'pip_e')); }
  setMem(n: number) { this.flowers.setText(`MEMORIES ${n}/10`); }
  setTime(s: number) { this.timer?.setText(`TIME ${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`); }
  draw(fuel: number, boss: number) { // fuel 0..1 or -1 hidden; boss 0..1 or -1 hidden
    if (fuel === this.fuel && boss === this.boss) return; this.fuel = fuel; this.boss = boss; const g = this.g; g.clear();
    this.boot?.setVisible(fuel >= 0); this.fuelLbl?.setVisible(fuel >= 0); this.bossLbl?.setVisible(boss >= 0);
    if (fuel >= 0) { g.fillStyle(0x1a0f2e).fillRect(46, 35, 52, 8); g.fillStyle(0x0d3550).fillRect(47, 36, 50, 6);
      g.fillStyle(fuel > 0.3 ? 0x5fe4ff : 0xff9a3d).fillRect(47, 36, Math.round(50 * fuel), 6); g.fillStyle(0xd8fbff).fillRect(47, 36, Math.round(50 * fuel), 1); }
    if (boss >= 0) { g.fillStyle(0x1a0f2e).fillRect(118, 246, 244, 12); g.fillStyle(0x3a1020).fillRect(120, 248, 240, 8);
      g.fillStyle(0xff3f6c).fillRect(120, 248, Math.round(240 * boss), 8); g.fillStyle(0xffb0c4).fillRect(120, 248, Math.round(240 * boss), 2);
      for (const f of [0.33, 0.66]) g.fillStyle(0x1a0f2e).fillRect(120 + Math.round(240 * f), 248, 1, 8); }
  }
}
