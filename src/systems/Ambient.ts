import Phaser from 'phaser';
// Ambient depth + life layered on top of the existing parallax (sheet fx only: petal / glow / spark):
//  fg  : out-of-focus foreground elements at scrollFactor 1.35 (L1 big drifting petals, L2 neon bokeh) -> depth in front of the play layer
//  far : slow light shafts (L1 sun god-rays, L2 sweeping searchlights) between the far bg layers
//  l2  : twinkling skyscraper windows on the distant skyline
const W = 480, H = 270, FG = 1.35;
type F = { im: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; t: number; s: number };
export class Ambient {
  fg: F[] = []; far: { im: Phaser.GameObjects.Image; t: number; base: number; x: number }[] = []; win: { r: Phaser.GameObjects.Rectangle; t: number; sp: number }[] = []; dbg = { fg: 0, far: 0, win: 0, frames: 0 };
  constructor(public s: Phaser.Scene, public mode: 'l1' | 'l2', farDepth: number) {
    const R = Math.random;
    for (let i = 0; i < (mode === 'l1' ? 6 : 5); i++) { const s0 = mode === 'l1' ? 2.4 + R() * 1.8 : 1.6 + R() * 2.2;
      const im = s.add.image(0, 0, mode === 'l1' ? 'petal_soft' : 'glow').setDepth(30).setScrollFactor(0).setScale(s0)
        .setTint(mode === 'l1' ? [0xffb8dc, 0xff9ccc, 0xffd6ea][i % 3] : [0xff4fd8, 0x3ff3ff, 0x9a6bff][i % 3]).setAlpha(mode === 'l1' ? 0.42 : 0.16);
      if (mode === 'l2') im.setBlendMode(Phaser.BlendModes.ADD);
      this.fg.push({ im, x: R() * W, y: R() * H, vx: mode === 'l1' ? 10 + R() * 14 : (R() - 0.5) * 6, vy: mode === 'l1' ? 14 + R() * 12 : (R() - 0.5) * 4, t: R() * 9, s: s0 }); this.dbg.fg++; }
    for (let i = 0; i < 3; i++) { const im = s.add.image(0, 0, 'glow').setScrollFactor(0).setDepth(farDepth).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0.5, mode === 'l1' ? 0 : 1)
        .setDisplaySize(mode === 'l1' ? 46 : 22, 320).setTint(mode === 'l1' ? 0xfff0c8 : 0x7ff6ff).setAlpha(0);
      this.far.push({ im, t: R() * 9, base: mode === 'l1' ? 0.09 : 0.11, x: 90 + i * 150 + R() * 40 }); this.dbg.far++; }
    if (mode === 'l2') for (let i = 0; i < 20; i++) { const r = s.add.rectangle(R() * W, 70 + R() * 90, 1, 1 + (R() * 2 | 0), [0xffe08a, 0x9ff0ff, 0xff9af0][i % 3]).setScrollFactor(0).setDepth(farDepth + 0.2).setAlpha(0);
      this.win.push({ r, t: R() * 20, sp: 0.4 + R() * 1.6 }); this.dbg.win++; }
  }
  update(dt: number) { const c = this.s.cameras.main; this.dbg.frames++;
    for (const f of this.fg) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt;
      let sx = ((f.x - c.scrollX * (FG - 1)) % (W + 120) + W + 120) % (W + 120) - 60, sy = ((f.y - c.scrollY * (FG - 1) * 0.5) % (H + 120) + H + 120) % (H + 120) - 60;
      f.im.setPosition(sx + Math.sin(f.t * 1.3) * 8, sy).setAngle(this.mode === 'l1' ? f.t * 40 : 0).setScale(f.s * (this.mode === 'l1' ? 0.75 + 0.25 * Math.abs(Math.sin(f.t * 1.1)) : 1)); }
    for (const l of this.far) { l.t += dt; const x = ((l.x - c.scrollX * 0.04) % (W + 80) + W + 80) % (W + 80) - 40;
      if (this.mode === 'l1') l.im.setPosition(x, -20).setAngle(-18 + Math.sin(l.t * 0.2) * 3).setAlpha(l.base * (0.6 + 0.4 * Math.sin(l.t * 0.5)));
      else l.im.setPosition(x, 200).setAngle(Math.sin(l.t * 0.35) * 28).setAlpha(l.base * (0.7 + 0.3 * Math.sin(l.t * 1.7))); }
    if ((this.dbg.frames & 1) === 0) for (const w of this.win) { w.t += dt * w.sp * 2; w.r.setAlpha(Math.sin(w.t) > 0.55 ? 0.85 : Math.sin(w.t) > 0.3 ? 0.35 : 0); }
  }
}
