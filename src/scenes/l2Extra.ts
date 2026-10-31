import Phaser from 'phaser';
import { audio } from '../audio/Audio';
// Extra Neo-Kyo life, all art cut from ref/neokyo_sheet.png (props_40-45, fx_11/fx_24):
//  - charge nodes: floating sheet lantern-crystals that bob; touch or shoot one and it lights up, spins and sparks
//  - steam vents: periodic sheet smoke bursts that give an updraft when Sakura is airborne over them
//  - holo signs: sheet neon signs hung high in the back, flickering with the odd glitch jump
const pad = (n: number) => String(n).padStart(2, '0');
type Node = { im: Phaser.GameObjects.Image; gl: Phaser.GameObjects.Image; x: number; y0: number; t: number; lit: number; c: number };
type Vent = { im: Phaser.GameObjects.Image; x: number; t: number; per: number };
type Sign = { im: Phaser.GameObjects.Image; t: number; g: number; x0: number };
const NC = [0x3ff3ff, 0xff4fd8, 0xb07bff, 0x6bff8f];
export class Extra {
  nodes: Node[] = []; vents: Vent[] = []; signs: Sign[] = []; dbg = { nodes: 0, lit: 0, vents: 0, lifts: 0, signs: 0 };
  constructor(public s: any, public GY: number, WW: number) {
    const sc = s as Phaser.Scene; let seed = 913; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const solidAt = (x: number) => s.groundAt(x, GY - 2) === GY; const clear = (x: number, r: number) => solidAt(x - r) && solidAt(x) && solidAt(x + r);
    for (let x = 700; x < WW - 300; x += 560 + Math.floor(rnd() * 240)) { const n = 3, base = GY - 64 - Math.floor(rnd() * 24);
      for (let i = 0; i < n; i++) { const id = 40 + Math.floor(rnd() * 4), c = NC[id - 40], nx = x + i * 34, ny = base - (i === 1 ? 14 : 0);
        const gl = sc.add.image(nx, ny, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(c).setScale(0.35).setAlpha(0.18).setDepth(7.4);
        const im = sc.add.image(nx, ny, 'l2pr_' + pad(id)).setDepth(7.5).setScale(0.8).setTint(0x8a8aa8);
        this.nodes.push({ im, gl, x: nx, y0: ny, t: rnd() * 6, lit: 0, c }); this.dbg.nodes++; } }
    for (let x = 1000; x < WW - 200; x += 820 + Math.floor(rnd() * 300)) { let px = x; while (px < x + 240 && !clear(px, 24)) px += 8; if (!clear(px, 24)) continue;
      const im = sc.add.image(px, GY, 'l2f_' + (rnd() < 0.5 ? '11' : '24')).setOrigin(0.5, 1).setDepth(1.8).setAlpha(0); this.vents.push({ im, x: px, t: rnd() * 3, per: 3.2 + rnd() }); this.dbg.vents++; }
    for (let x = 500; x < WW - 200; x += 640 + Math.floor(rnd() * 260)) { const im = sc.add.image(x, GY - 150 - Math.floor(rnd() * 30), 'l2pr_' + (rnd() < 0.5 ? '44' : '45')).setDepth(1.3).setScale(1.2).setAlpha(0.8);
      this.signs.push({ im, t: rnd() * 9, g: 0, x0: x }); this.dbg.signs++; }
  }
  light(n: Node) { if (n.lit) return; n.lit = 1; this.dbg.lit++; n.im.clearTint(); audio.sfx('flower', { rate: 1.7 + (this.dbg.lit % 4) * 0.1, vol: 0.4 }); this.s.fx?.spark(n.x, n.im.y);
    (this.s as Phaser.Scene).tweens.add({ targets: n.im, angle: 360, duration: 380, ease: 'Quad.easeOut', onComplete: () => n.im.setAngle(0) }); }
  hitShot(x: number, y: number) { for (const n of this.nodes) if (!n.lit && Math.abs(x - n.x) < 10 && Math.abs(y - n.im.y) < 14) { this.light(n); return true; } return false; }
  update(dt: number) {
    const p = this.s.player, b = p.body as Phaser.Physics.Arcade.Body, cam = this.s.cameras.main.worldView;
    for (const n of this.nodes) { if (n.x < cam.x - 60 || n.x > cam.right + 60) continue; n.t += dt; n.im.y = n.y0 + Math.sin(n.t * 2) * 3; n.gl.y = n.im.y;
      n.gl.setAlpha(n.lit ? 0.45 + 0.12 * Math.sin(n.t * 5) : 0.14).setScale(n.lit ? 0.5 : 0.35);
      if (!n.lit && Math.abs(p.x - n.x) < 14 && Math.abs(p.y - 18 - n.im.y) < 22) this.light(n); }
    for (const v of this.vents) { v.t += dt; const k = (v.t % v.per) / 1.1; if (v.x < cam.x - 120 || v.x > cam.right + 120) continue;
      if (k < 1) { v.im.setAlpha(0.55 * Math.sin(k * Math.PI)).setScale(0.6 + k * 0.9, 0.5 + k * 1.3); if (!b.blocked.down && Math.abs(p.x - v.x) < 26 && p.y < this.GY && p.y > this.GY - 150) { b.velocity.y = Math.min(b.velocity.y, b.velocity.y - 1400 * dt); if (b.velocity.y < -380) b.velocity.y = -380; if (!(v as any).lifted) { (v as any).lifted = 1; this.dbg.lifts++; } } }
      else { v.im.setAlpha(0); (v as any).lifted = 0; } }
    for (const g of this.signs) { if (g.x0 < cam.x - 80 || g.x0 > cam.right + 80) continue; g.t += dt; if (Math.random() < dt * 0.4) g.g = 0.18; g.g = Math.max(0, g.g - dt);
      g.im.setAlpha(g.g > 0 ? (Math.sin(g.t * 70) > 0 ? 0.25 : 0.9) : 0.78 + 0.06 * Math.sin(g.t * 4)); g.im.x = g.x0 + (g.g > 0.1 ? 2 : 0); }
  }
}
