import Phaser from 'phaser';
import { audio } from '../audio/Audio';
// Akari Valley interactive pass, all art from the L1 sheet props (pr_lantern2 stone lantern, pr_bridge plank bridge, petal fx):
//  - spirit lanterns in groups of 3: touch or shoot one and its flame kindles (warm glow + fireflies)
//  - a fully lit group completes a "lantern circuit": even groups raise a hidden spirit bridge (one-way, petal arc of
//    memories-free sparkles), odd groups drop a reward (heart / power alternating)
type Lan = { im: Phaser.GameObjects.Image; gl: Phaser.GameObjects.Image; x: number; y: number; lit: number; g: number; t: number; ff: Phaser.GameObjects.Image[] };
export class L1Extra {
  lans: Lan[] = []; groups: { x: number; y: number; n: Lan[]; done: boolean }[] = []; dbg = { lans: 0, lit: 0, groups: 0, done: 0, bridges: 0, drops: 0 }; lastBridge: any = null; bodies: Phaser.GameObjects.Zone[] = [];
  constructor(public s: any, x0: number, x1: number) {
    const sc = s as Phaser.Scene, so = s.solid as Phaser.Tilemaps.TilemapLayer; const sol = (x: number, y: number) => !!so.getTileAtWorldXY(x, y)?.collides;
    const clearBox = (L: number, T: number, R: number, B: number) => { for (let x = L; x <= R; x += 8) for (let y = T; y <= B; y += 8) if (sol(x, y)) return false; return true; };
    for (let x = x0; x < x1; ) { const g = s.groundAt(x, 0); let ok = g > 40; if (ok) for (let dx = -40; dx <= 110; dx += 6) if (Math.abs(s.groundAt(x + dx, 0) - g) > 1) { ok = false; break; }
      if (ok && clearBox(x - 40, g - 130, x + 110, g - 10)) { const G = { x: x + 34, y: g, n: [] as Lan[], done: false }; this.groups.push(G); this.dbg.groups++;
        for (let i = 0; i < 3; i++) { const lx = x + i * 34; const im = sc.add.image(lx, g, 'pr_lantern2').setOrigin(0.5, 1).setDepth(4.6).setTint(0x6a6a7a);
          const gl = sc.add.image(lx, g - 22, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffb050).setScale(0.3).setAlpha(0).setDepth(4.7);
          const l = { im, gl, x: lx, y: g, lit: 0, g: this.groups.length - 1, t: Math.random() * 6, ff: [] as Phaser.GameObjects.Image[] }; this.lans.push(l); G.n.push(l); this.dbg.lans++; }
        x += 400; } else x += 24; }
    // intentional alternate-route circuits on quieter shelves (skip if no clear ground)
    const place = (x: number, g: number) => { if (!(g > 40) || !clearBox(x - 40, g - 130, x + 110, g - 10)) return;
      const G = { x: x + 34, y: g, n: [] as Lan[], done: false }; this.groups.push(G); this.dbg.groups++;
      for (let i = 0; i < 3; i++) { const lx = x + i * 34; const im = sc.add.image(lx, g, 'pr_lantern2').setOrigin(0.5, 1).setDepth(4.6).setTint(0x6a6a7a);
        const gl = sc.add.image(lx, g - 22, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffb050).setScale(0.3).setAlpha(0).setDepth(4.7);
        const l = { im, gl, x: lx, y: g, lit: 0, g: this.groups.length - 1, t: Math.random() * 6, ff: [] as Phaser.GameObjects.Image[] }; this.lans.push(l); G.n.push(l); this.dbg.lans++; } };
    for (const sx of [980, 2100, 3500, 4700, 5900]) {
      const g = s.groundAt(sx, 0); let ok = g > 40; if (ok) for (let dx = -40; dx <= 110; dx += 6) if (Math.abs(s.groundAt(sx + dx, 0) - g) > 1) { ok = false; break; }
      if (ok) place(sx, g);
      // high shelf alternate: probe a bit above ground via platY if present
      if (typeof s.platY === 'function') { const py = s.platY(sx + 40, g - 80); if (py > 40 && py < g - 40) place(sx + 40, py); }
    }
  }
  light(l: Lan) { if (l.lit) return; l.lit = 1; this.dbg.lit++; const sc = this.s as Phaser.Scene; l.im.clearTint(); audio.sfx('flower', { rate: 1.2 + (this.dbg.lit % 3) * 0.15, vol: 0.45 }); this.s.fx?.spark(l.x, l.y - 22);
    sc.tweens.add({ targets: l.im, scaleY: 1.08, yoyo: true, duration: 120 });
    for (let i = 0; i < 3; i++) l.ff.push(sc.add.image(l.x, l.y - 24, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0a0).setScale(0.08).setDepth(4.8));
    const G = this.groups[l.g]; if (!G.done && G.n.every(m => m.lit)) this.complete(G, l.g); }
  complete(G: { x: number; y: number; n: Lan[]; done: boolean }, gi: number) { G.done = true; this.dbg.done++; const sc = this.s as Phaser.Scene; audio.sfx('checkpoint', { rate: 1.3, vol: 0.5 });
    const e = sc.add.particles(G.x, G.y - 30, 'petal', { speed: { min: 30, max: 110 }, lifespan: 900, scale: { start: 1.6, end: 0.4 }, alpha: { start: 1, end: 0 }, tint: [0xff8fd0, 0xffd0e8, 0xffb050], emitting: false }).setDepth(9); e.explode(24); sc.time.delayedCall(1000, () => e.destroy());
    if (gi % 2 === 0) { const by = G.y - 78, bx = G.x - 47; const im = sc.add.image(bx, by - 4, 'pr_bridge').setOrigin(0, 0).setDepth(4.4).setAlpha(0); sc.tweens.add({ targets: im, alpha: 1, duration: 500 });
      const z = sc.add.zone(bx + 47, by + 4, 90, 8); sc.physics.add.existing(z, true); const b = z.body as Phaser.Physics.Arcade.StaticBody; b.checkCollision.down = b.checkCollision.left = b.checkCollision.right = false; sc.physics.add.collider(this.s.player, z); this.bodies.push(z);
      this.lastBridge = { x: bx, y: by }; this.dbg.bridges++; this.s.toast?.show('Lantern circuit: a spirit bridge rises', '#ffd23f'); }
    else { this.s.pk?.add(this.dbg.drops % 2 ? 'power' : 'heart', G.x, G.y - 40, true); this.dbg.drops++; this.s.toast?.show('Lantern circuit: the spirits leave a gift', '#ffd23f'); } }
  update(dt: number) { const p = this.s.player, cam = this.s.cameras.main.worldView;
    for (const l of this.lans) { if (l.x < cam.x - 60 || l.x > cam.right + 60) continue; l.t += dt;
      if (l.lit) { l.gl.setAlpha(0.5 + 0.15 * Math.sin(l.t * 9) + 0.08 * Math.sin(l.t * 23)).setScale(0.32 + 0.03 * Math.sin(l.t * 7)); l.ff.forEach((f, i) => f.setPosition(l.x + Math.cos(l.t * 1.3 + i * 2.1) * 14, l.y - 30 + Math.sin(l.t * 2.1 + i) * 9).setAlpha(0.5 + 0.5 * Math.sin(l.t * 5 + i))); }
      else if (Math.abs(p.x - l.x) < 12 && p.y > l.y - 44 && p.y < l.y + 6) this.light(l); }
    for (const sh of this.s.gun.shots.getChildren() as any[]) if (sh.active) for (const l of this.lans) if (!l.lit && Math.abs(sh.x - l.x) < 9 && sh.y > l.y - 34 && sh.y < l.y) { this.light(l); this.s.gun.kill(sh); break; } }
}
