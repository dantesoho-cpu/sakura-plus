import Phaser from 'phaser';
// Dash / jet-boost light trail (additive pink ribbon) + cycling-spectrum afterimages + jet-boot ring pulses & heat shimmer.
const SPECTRUM = [0x3ff3ff, 0xff4fd8, 0x9a6bff, 0xffd23f];
// per-direction ribbon palettes [outer, mid] : horizontal pink, up cyan, diag-up violet-cyan, diag-down magenta-violet, down violet
const DIRPAL: Record<string, [number, number]> = { h: [0xff3fb8, 0xff8fe0], u: [0x3fd8ff, 0x9ff3ff], ud: [0x8f6bff, 0x9fe8ff], dd: [0xff3fd8, 0xc08fff], d: [0x9a4bff, 0xd09fff] };
export class PlayerFx {
  g: Phaser.GameObjects.Graphics; edge: Phaser.GameObjects.Graphics; wasOn = false; pts: { x: number; y: number; a: number }[] = []; ghostT = 0; ci = 0; ringT = 0; ghosts = 0; starts = 0; lines = 0; dirs: Record<string, number> = {};
  shimmer: Phaser.GameObjects.Particles.ParticleEmitter; flame: Phaser.GameObjects.Graphics; flameT = 0; jetOn = false; flames = 0; bursts = 0;
  constructor(public s: Phaser.Scene, public p: Phaser.Physics.Arcade.Sprite & { dashing: boolean; jetting: boolean }) {
    this.flame = s.add.graphics().setDepth(10.5).setBlendMode(Phaser.BlendModes.ADD); this.edge = s.add.graphics().setDepth(8.9); this.g = s.add.graphics().setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    this.shimmer = s.add.particles(0, 0, 'px', { lifespan: { min: 200, max: 420 }, speedY: { min: 20, max: 60 }, speedX: { min: -30, max: 30 }, scale: { start: 0.9, end: 0.2 },
      alpha: { start: 0.9, end: 0 }, tint: [0xffffff, 0xff9ff0, 0xb58cff, 0x9ff3ff], blendMode: 'ADD', frequency: 30, quantity: 1, emitting: false, follow: p, followOffset: { x: 0, y: 6 } }).setDepth(9);
  }
  update(dt: number) {
    const p = this.p, on = p.dashing || p.jetting, cy = p.y - 16;
    if (on) this.pts.unshift({ x: p.x, y: cy, a: 1 });
    for (const q of this.pts) q.a -= dt * 3.2; this.pts = this.pts.filter(q => q.a > 0).slice(0, 22);
    if (on && !this.wasOn) { this.ghostT = 0; this.starts++; } this.wasOn = on;
    const q: any = p, dd = p.dashing ? (q.dashDir || 'h') : 'h', pal = p.jetting && !p.dashing ? DIRPAL.u : DIRPAL[dd] || DIRPAL.h;
    if (p.dashing) { this.dirs[dd] = (this.dirs[dd] || 0) + 1; const vx = q.dashVx || 0, vy = q.dashVy || 0, m = Math.hypot(vx, vy) || 1, ux = vx / m, uy = vy / m;
      for (let i = 0; i < 2; i++) { const off = (Math.random() - 0.5) * 26, sx = p.x - ux * 14 - uy * off, sy = cy - uy * 14 + ux * off, L = 14 + Math.random() * 18;
        const ln = this.s.add.rectangle(sx, sy, L, 1, Math.random() < 0.5 ? 0xffffff : pal[1], 0.85).setRotation(Math.atan2(uy, ux)).setDepth(8.8).setBlendMode(Phaser.BlendModes.ADD); this.lines++;
        this.s.tweens.add({ targets: ln, x: sx - ux * 40, y: sy - uy * 40, scaleX: 0.2, alpha: 0, duration: 180, onComplete: () => ln.destroy() }); } }
    const g = this.g; g.clear(); const eg = this.edge; eg.clear();
    for (let i = 0; i < this.pts.length - 1; i++) {
      const a = this.pts[i], b = this.pts[i + 1], k = a.a * (1 - i / this.pts.length);
      eg.lineStyle(9 * k + 3, 0x2a0a40, 0.55 * k).lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(16 * k + 3, pal[0], 0.3 * k).lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(8 * k + 1, pal[1], 0.6 * k).lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(3 * k + 0.5, 0xffffff, 0.9 * k).lineBetween(a.x, a.y, b.x, b.y);
    }
    if (on && (this.ghostT -= dt) <= 0) { this.ghostT = p.dashing ? 0.025 : 0.06; this.ghost(); }
    // twin boot thrusters: layered flickering flame cones (pink sheath > cyan > white core) + glow halo
    const fg = this.flame; fg.clear();
    if (p.jetting) {
      if (!this.jetOn) this.burst(); this.flameT += dt; this.flames++;
      for (const side of [-1, 1]) {
        const bx = p.x + side * 3 - (p.flipX ? -1 : 1) * 1, by = p.y - 1, fl = Math.sin(this.flameT * 60 + side) * 2.5 + Math.random() * 3, L = 20 + fl;
        fg.fillStyle(0xff3fb8, 0.35).fillCircle(bx, by + 4, 7 + fl * 0.4);
        fg.fillStyle(0xff4fd8, 0.85).fillTriangle(bx - 4, by, bx + 4, by, bx + (Math.random() - 0.5) * 2, by + L);
        fg.fillStyle(0x7ff6ff, 0.95).fillTriangle(bx - 2.5, by, bx + 2.5, by, bx, by + L * 0.7);
        fg.fillStyle(0xffffff, 1).fillTriangle(bx - 1.2, by, bx + 1.2, by, bx, by + L * 0.4);
        fg.fillStyle(0xffffff, 0.9).fillRect(bx - 2, by - 1, 4, 2);
      }
    }
    this.jetOn = p.jetting;
    if (p.jetting) {
      if (!this.shimmer.emitting) this.shimmer.start();
      if ((this.ringT -= dt) <= 0) { this.ringT = 0.11; const r = this.s.add.ellipse(p.x, p.y + 4, 6, 2).setStrokeStyle(1, Math.random() < 0.5 ? 0x9ff3ff : 0xff8fe0).setFillStyle().setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
        this.s.tweens.add({ targets: r, scaleX: 2.6, scaleY: 2.6, y: p.y + 18, alpha: 0, duration: 260, onComplete: () => r.destroy() }); }
    } else if (this.shimmer.emitting) this.shimmer.stop();
  }
  burst() {
    // ignition: white flash ring + spark spray under the boots
    const p = this.p; this.bursts++;
    const r = this.s.add.circle(p.x, p.y, 4, 0xffffff, 0.9).setDepth(10.6).setBlendMode(Phaser.BlendModes.ADD);
    this.s.tweens.add({ targets: r, scale: 4, alpha: 0, duration: 220, onComplete: () => r.destroy() });
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (Math.random() - 0.5) * 1.8, v = 60 + Math.random() * 90;
      const d = this.s.add.rectangle(p.x, p.y, 2, 2, Math.random() < 0.5 ? 0x7ff6ff : 0xff8fe0).setDepth(10.6).setBlendMode(Phaser.BlendModes.ADD);
      this.s.tweens.add({ targets: d, x: p.x + Math.cos(a) * v * 0.3, y: p.y + Math.sin(a) * v * 0.3, alpha: 0, duration: 300, onComplete: () => d.destroy() }); }
  }
  ghost() {
    const p = this.p; const c = SPECTRUM[this.ci++ % SPECTRUM.length]; this.ghosts++;
    // crisp silhouette: 1px dark-violet outline (4 offset copies) + flat spectrum fill + faint detail pass
    const mk = (dx: number, dy: number) => this.s.add.image(dx, dy, p.texture.key, p.frame.name).setOrigin(p.originX, p.originY).setFlipX(p.flipX).setScale(p.scaleX, p.scaleY);
    const parts = [mk(-1, 0), mk(1, 0), mk(0, -1), mk(0, 1)].map(o => o.setTintFill(0x1a0630));
    parts.push(mk(0, 0).setTintFill(c), mk(0, 0).setTint(0xffffff).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD));
    const ct = this.s.add.container(Math.round(p.x), Math.round(p.y), parts).setDepth(9).setAlpha(0.8);
    const q: any = p, m = Math.hypot(q.dashVx || 0, q.dashVy || 0) || 1, dx = p.dashing ? -(q.dashVx || 0) / m * 10 : 0, dy = p.dashing ? -(q.dashVy || 0) / m * 10 : 0;
    this.s.tweens.add({ targets: ct, alpha: 0, x: ct.x + dx, y: ct.y + dy, duration: 360, onComplete: () => ct.destroy() });
  }
}
