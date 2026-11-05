import Phaser from 'phaser';
import { ParallaxStack, loadFortressParallax } from '../render/ParallaxStack';
// Controlled parallax + platform-assembly test at ?lvl=pxtest.
// Verifies: independent layers, transparency, seamless scroll, alignment, no gaps, clean platform joins.
// Does NOT change existing levels.
export class PxTest extends Phaser.Scene {
  bg!: ParallaxStack;
  dbg: any = { scroll: 0, planes: 0 };
  platStrip: Phaser.GameObjects.Image[] = [];
  constructor() { super('PxTest'); }
  preload() {
    loadFortressParallax(this);
    this.load.json('ft_plat', 'assets/ft/plat/plat.json');
    for (const n of ['p_left', 'p_mid', 'p_center', 'p_right', 'p0', 'p1', 'p2', 'p3', 'p4']) this.load.image('ft_' + n, `assets/ft/plat/${n}.png`);
  }
  create() {
    this.cameras.main.setBackgroundColor(0x1a0a3a);
    this.physics.world.setBounds(0, 0, 4800, 540);
    this.cameras.main.setBounds(0, 0, 4800, 540);
    this.bg = new ParallaxStack(this);
    this.dbg.planes = this.bg.layers.length;
    // ground band so scenery bottoms have something to sit against (no empty void under platforms)
    this.add.rectangle(0, 232, 4800, 40, 0x2a1a4a).setOrigin(0, 0).setDepth(1);
    this.add.rectangle(0, 230, 4800, 2, 0x6fe8ff).setOrigin(0, 0).setDepth(1).setAlpha(0.5);
    // assemble a modular platform strip if pieces loaded
    const man = this.cache.json.get('ft_plat') as Record<string, { w: number; h: number; top: number }> | undefined;
    if (man) {
      let x = 40; const y = 230;
      const order = ['p_left', 'p_mid', 'p_mid', 'p_center', 'p_mid', 'p_right'].filter(k => man[k] || this.textures.exists('ft_' + k));
      // fall back to any available pieces
      const keys = order.length ? order : Object.keys(man).slice(0, 6).map(k => k);
      for (const k of keys) {
        if (!this.textures.exists('ft_' + k)) continue;
        const im = this.add.image(x, y, 'ft_' + k).setOrigin(0, 1).setDepth(2);
        this.textures.get('ft_' + k).setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.platStrip.push(im); x += im.displayWidth;
      }
      this.add.text(40, 210, 'platform strip (native joins)', { fontFamily: 'monospace', fontSize: '8px', color: '#c9b8e8' }).setDepth(5);
    }
    // HUD labels for each plane
    const names = ['sky 0.05', 'L1 0.15', 'L2 0.30', 'L3 0.50', 'L4 0.80'];
    names.forEach((n, i) => this.add.text(8, 8 + i * 12, n, { fontFamily: 'monospace', fontSize: '9px', color: '#ffd23f', stroke: '#1a0f2e', strokeThickness: 3 }).setScrollFactor(0).setDepth(50));
    this.add.text(240, 8, 'PXTEST · ←→ scroll · ESC title', { fontFamily: 'monospace', fontSize: '9px', color: '#fff', stroke: '#1a0f2e', strokeThickness: 3 }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(50);
    const K = this.input.keyboard!;
    K.on('keydown-ESC', () => this.scene.start('Title'));
    K.on('keydown-LEFT', () => { this.cameras.main.scrollX = Math.max(0, this.cameras.main.scrollX - 40); });
    K.on('keydown-RIGHT', () => { this.cameras.main.scrollX = Math.min(4800 - 480, this.cameras.main.scrollX + 40); });
    // auto-scroll for GIF capture
    this.tweens.add({ targets: this.cameras.main, scrollX: 2400, duration: 12000, ease: 'Linear' });
    (window as any).__lvl = this; (window as any).__pxtest = this;
  }
  update(_t: number, d: number) {
    this.bg.update(d / 1000);
    this.dbg.scroll = Math.round(this.cameras.main.scrollX);
  }
}
