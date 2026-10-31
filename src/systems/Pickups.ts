import Phaser from 'phaser';
import { audio } from '../audio/Audio';
// Health hearts + timed powerups. Placed ones bob in place; enemy drops pop up, fall and rest on the ground.
export type PK = 'heart' | 'rapid' | 'power' | 'cannon';
export const POWER_T = 12;
export class Pickups {
  list: (Phaser.GameObjects.Image & { kind: PK; vy: number; rest: number; base: number; t: number })[] = []; got: Record<string, number> = { heart: 0, rapid: 0, power: 0, cannon: 0 }; dropN = 0;
  constructor(public s: Phaser.Scene, public ground: (x: number, y: number) => number) {}
  add(kind: PK, x: number, y: number, drop = false) {
    const im = this.s.add.image(x, y, 'pk_' + kind).setOrigin(0.5, 1).setDepth(6) as any; im.kind = kind; im.t = Math.random() * 6; im.vy = drop ? -110 : 0;
    const g = this.ground(x, y - 4); im.rest = g > 0 && g - y < 200 ? g : y; im.base = drop ? im.rest : y; if (!drop) im.rest = -1;
    const halo = this.s.add.image(x, y - 6, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(kind === 'heart' ? 0xff4f8f : kind === 'rapid' ? 0x3ff3ff : kind === 'cannon' ? 0xff7a2f : 0xffd23f).setAlpha(0.35).setScale(0.28).setDepth(5.9);
    im.halo = halo; this.list.push(im); if (drop) this.dropN++; return im;
  }
  update(dt: number, p: { x: number; y: number }, take: (k: PK) => boolean) {
    for (const im of this.list as any[]) { if (!im.active) continue; im.t += dt;
      if (im.rest >= 0 && im.vy !== null) { im.vy += 600 * dt; im.y += im.vy * dt; if (im.y >= im.rest) { im.y = im.rest; im.vy = im.vy > 120 ? -im.vy * 0.3 : null; } }
      else { im.y = im.base - 3 - 2 * Math.sin(im.t * 3); }
      im.halo.setPosition(im.x, im.y - 6).setAlpha(0.25 + 0.12 * Math.sin(im.t * 6));
      if (Math.abs(p.x - im.x) < 12 && p.y > im.y - 30 && p.y < im.y + 22 && take(im.kind)) {
        this.got[im.kind]++; audio.sfx(im.kind === 'heart' ? 'heal' : 'power');
        const r = this.s.add.ellipse(im.x, im.y - 6, 6, 6).setStrokeStyle(2, im.kind === 'heart' ? 0xff4f8f : im.kind === 'rapid' ? 0x3ff3ff : 0xffd23f).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
        this.s.tweens.add({ targets: r, scale: 5, alpha: 0, duration: 300, onComplete: () => r.destroy() });
        im.halo.destroy(); im.destroy(); }
    }
    this.list = this.list.filter(i => i.active);
  }
}
