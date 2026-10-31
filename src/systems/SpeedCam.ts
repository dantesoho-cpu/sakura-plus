import Phaser from 'phaser';
// "Outrun the camera" feature: the camera keeps its normal lerp (it falls behind at speed on purpose).
// While Sakura is faster than the camera: speed lines, a slight zoom-out punch and chromatic afterimages.
// When she slows, a quick catch-up snap. She is always clamped inside ~90% of the viewport. All objects pooled.
const LINES = 14, GHOSTS = 8;
export class SpeedCam {
  heat = 0; snapT = 0; peak = 0; ghostT = 0; gi = 0; lines: Phaser.GameObjects.Image[] = []; ghosts: Phaser.GameObjects.Image[] = [];
  dbg = { maxHeat: 0, snaps: 0, clamps: 0, ghosts: 0, maxOff: 0 };
  constructor(public s: Phaser.Scene, public p: any, public lerp: number) {
    for (let i = 0; i < LINES; i++) this.lines.push(s.add.image(0, 0, 'px').setScrollFactor(0).setDepth(88).setOrigin(0, 0.5).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setVisible(false));
    for (let i = 0; i < GHOSTS; i++) this.ghosts.push(s.add.image(0, 0, 'px').setDepth(9.5).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setVisible(false));
    (window as any).__speedcam = this;
  }
  update(dt: number) {
    const p = this.p, b = p.body as Phaser.Physics.Arcade.Body, cam = this.s.cameras.main, W = cam.width, H = cam.height;
    const v = Math.hypot(b.velocity.x, b.velocity.y * 0.6), tgt = Phaser.Math.Clamp((v - 140) / 260, 0, 1);
    this.heat += (tgt - this.heat) * Math.min(1, dt * (tgt > this.heat ? 6 : 2.5)); this.dbg.maxHeat = Math.max(this.dbg.maxHeat, this.heat);
    this.peak = Math.max(this.peak * (1 - dt * 0.3), this.heat);
    // catch-up snap once she slows after a fast stretch
    if (this.snapT <= 0 && this.peak > 0.5 && this.heat < 0.25) { this.snapT = 0.22; this.peak = 0; this.dbg.snaps++; cam.shake(60, 0.0018); }
    if (this.snapT > 0) { this.snapT -= dt; const k = this.snapT > 0 ? 0.34 : this.lerp; cam.setLerp(k, k); }
    // (zoom-out punch dropped: HUD + screen-space parallax are drawn by the same camera, so zoom <1 exposed borders)
    // clamp: never beyond 90% of the viewport edge (cam.midPoint is last frame's view centre)
    const hw = W / cam.zoom / 2, hh = H / cam.zoom / 2, mx = hw * 0.8, my = hh * 0.8, dx = p.x - cam.midPoint.x, dy = (p.y - 16) - cam.midPoint.y;
    this.dbg.maxOff = Math.max(this.dbg.maxOff, Math.abs(dx) / hw);
    if (dx > mx) { cam.scrollX += dx - mx; this.dbg.clamps++; } else if (dx < -mx) { cam.scrollX += dx + mx; this.dbg.clamps++; }
    if (dy > my) cam.scrollY += dy - my; else if (dy < -my) cam.scrollY += dy + my;
    // speed lines: screen-space streaks running against her direction
    const dir = Math.sign(b.velocity.x) || p.facing || 1, show = this.heat > 0.08;
    for (let i = 0; i < LINES; i++) { const l = this.lines[i] as any; if (!show) { if (l.visible) l.setVisible(false); continue; }
      if (!l.visible || l.x < -80 || l.x > W + 80) { l.setVisible(true); l.y = 20 + ((i * 37 + Math.random() * 30) % (H - 40)); l.x = dir > 0 ? W + Math.random() * 60 : -Math.random() * 60; l.len = 30 + Math.random() * 70; l.setTint(i % 3 ? 0xffffff : (i % 2 ? 0xff4fd8 : 0x3ff3ff)); }
      l.x -= dir * (900 + i * 37) * dt; l.setDisplaySize(l.len * (0.5 + this.heat), 2).setFlipX(dir < 0).setAlpha(0.9 * this.heat * (Math.abs(l.y - H / 2) / (H / 2) * 0.7 + 0.3)); }
    // chromatic afterimages while she is outrunning the camera
    this.ghostT -= dt;
    if (this.heat > 0.3 && this.ghostT <= 0 && p.frame) { this.ghostT = 0.045; const g = this.ghosts[this.gi++ % GHOSTS]; this.dbg.ghosts++;
      g.setTexture(p.texture.key, p.frame.name).setPosition(p.x - dir * 2, p.y).setOrigin(p.originX, p.originY).setFlipX(p.flipX).setScale(p.scaleX, p.scaleY).setTint(this.gi % 2 ? 0xff4fd8 : 0x3ff3ff).setAlpha(0.5 * this.heat).setVisible(true); }
    for (const g of this.ghosts) if (g.visible) { g.alpha -= dt * 2.6; g.x += (this.gi % 2 ? 1 : -1) * 6 * dt; if (g.alpha <= 0.02) g.setVisible(false); }
  }
}
