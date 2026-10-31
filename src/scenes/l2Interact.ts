import Phaser from 'phaser';
import { audio } from '../audio/Audio';
// Neo-Kyo interactables + prop dressing, all art = props/plat cut from ref/neokyo_sheet.png.
// springs (launch pads 27/28/29), breakables (hazard panels 16/17, capsules 07/18: shoot or dash through),
// moving shuttle decks over pits, crumbling vent decks, and seeded prop dressing with animated glows.
const A = 'assets/l2/';
export const PROP_N = 50;
const DECOR = [0, 1, 2, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 19, 20, 21, 22, 23, 25, 26, 32, 33, 34, 35];
const GLOWC: Record<number, number> = { 0: 0x3ff3ff, 4: 0x3ff3ff, 14: 0x3ff3ff, 20: 0x8f7bff, 21: 0xb07bff, 10: 0xff4fd8, 9: 0x3ff3ff, 2: 0xffd23f, 27: 0xff4fd8, 28: 0x6bff8f, 29: 0xff5f3f };
export function preloadInteract(s: Phaser.Scene) { for (let i = 0; i < PROP_N; i++) { const k = String(i).padStart(2, '0'); s.load.image('l2pr_' + k, `${A}props/props_${k}.png`); } }
type Spring = { im: Phaser.GameObjects.Image; x: number; y: number; cd: number; c: number; gl: Phaser.GameObjects.Image };
type Brk = { im: Phaser.GameObjects.Image; hp: number; gl?: Phaser.GameObjects.Image };
type Mov = { im: Phaser.Physics.Arcade.Image; x0: number; x1: number; t: number; sp: number; px: number; kind: 'move' | 'fall'; st: number; y0: number };
export class Interact {
  springs: Spring[] = []; brk: Brk[] = []; mov: Mov[] = []; glows: { o: Phaser.GameObjects.Image; t: number; b: number }[] = []; dbg = { launches: 0, broke: 0, rides: 0, falls: 0, decor: 0 };
  movGroup: Phaser.Physics.Arcade.Group;
  constructor(public s: any, GY: number, WW: number) {
    const s_ = s as Phaser.Scene; let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const solidAt = (x: number) => s.groundAt(x, GY - 2) === GY;
    const clear = (x: number, r: number) => solidAt(x - r) && solidAt(x) && solidAt(x + r);
    // pits
    const pits: [number, number][] = []; let a = -1; for (let x = 0; x < WW; x += 8) { const g = solidAt(x); if (!g && a < 0) a = x; if (g && a >= 0) { pits.push([a, x]); a = -1; } }
    // prop dressing: back layer (depth 1.6) every ~70-130px, varied, some flipped, lit ones get a breathing glow
    const used: number[] = [];
    for (let x = 160; x < WW - 120; x += 70 + Math.floor(rnd() * 60)) { if (!clear(x, 18)) continue; const id = DECOR[Math.floor(rnd() * DECOR.length)], k = 'l2pr_' + String(id).padStart(2, '0');
      const im = s_.add.image(x, GY + 1, k).setOrigin(0.5, 1).setDepth(1.6).setFlipX(rnd() < 0.3); if (im.height > 90) im.setScale(0.8); used.push(x); this.dbg.decor++;
      if (GLOWC[id]) { const gl = s_.add.image(x, GY - im.displayHeight / 2, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(GLOWC[id]).setScale(Math.max(im.displayWidth, im.displayHeight) / 70).setAlpha(0.3).setDepth(1.55); this.glows.push({ o: gl, t: rnd() * 6, b: 0.3 }); } }
    // springs
    let si = 0; for (const x of [520, 1100, 1700, 2300, 3000, 3500]) { let px = x; while (px < x + 200 && !clear(px, 26)) px += 8; if (!clear(px, 26)) continue; const id = 27 + (si++ % 3);
      const im = s_.add.image(px, GY + 1, 'l2pr_' + id).setOrigin(0.5, 1).setDepth(5).setScale(0.55);
      const gl = s_.add.image(px, GY - 10, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(GLOWC[id]).setScale(0.45).setAlpha(0.4).setDepth(5.1);
      this.springs.push({ im, x: px, y: GY, cd: 0, c: GLOWC[id], gl }); }
    // breakables
    for (const [x, id] of [[860, 16], [1250, 18], [1620, 17], [2240, 7], [2850, 16], [3150, 18], [3400, 17]] as [number, number][]) { let px = x; while (px < x + 200 && !clear(px, 20)) px += 8; if (!clear(px, 20)) continue;
      const im = s_.add.image(px, GY + 1, 'l2pr_' + String(id).padStart(2, '0')).setOrigin(0.5, 1).setDepth(5.5); if (im.height > 60) im.setScale(0.7);
      this.brk.push({ im, hp: 3 }); }
    // moving / falling decks over pits
    this.movGroup = s_.physics.add.group({ allowGravity: false, immovable: true });
    pits.forEach(([p0, p1], i) => { if (p1 - p0 < 56) return; const kind = i % 2 ? 'fall' : 'move';
      const key = kind === 'move' ? 'l2p_deck_neon_3' : 'l2p_deck_vent_3', y = GY - 26;
      const im = this.movGroup.create(kind === 'move' ? p0 + 24 : (p0 + p1) / 2, y, key) as Phaser.Physics.Arcade.Image; im.setOrigin(0.5, 0).setDepth(4);
      (im.body as Phaser.Physics.Arcade.Body).setSize(44, 10).setOffset(2, 1); (im.body as any).checkCollision.down = false; (im.body as any).checkCollision.left = false; (im.body as any).checkCollision.right = false;
      this.mov.push({ im, x0: p0 - 8, x1: p1 + 8, t: 0, sp: 0.6, px: im.x, kind, st: 0, y0: y }); });
    s_.physics.add.collider(s.player, this.movGroup);
  }
  hitShot(x: number, y: number, dmg = 1) { for (const b of this.brk) { if (!b.im.active) continue; const im = b.im; if (Math.abs(x - im.x) < im.displayWidth / 2 + 3 && y > im.y - im.displayHeight && y < im.y + 2) { b.hp -= dmg; im.setTintFill(0xffffff); this.s.time.delayedCall(60, () => im.active && im.clearTint()); if (b.hp <= 0) this.shatter(b); return true; } } return false; }
  shatter(b: Brk) { const im = b.im, s = this.s as Phaser.Scene; this.dbg.broke++; audio.sfx('explode', { vol: 0.6 }); this.s.fx.explode(im.x, im.y - im.displayHeight / 2, 0.6); s.cameras.main.shake(120, 0.004);
    const tex = im.texture.key, w = im.width, h = im.height; for (let i = 0; i < 8; i++) { const cw = Math.ceil(w / 4), ch = Math.ceil(h / 2), cx = (i % 4) * cw, cy = Math.floor(i / 4) * ch;
      const sh = s.add.image(im.x - im.displayWidth / 2 + (cx + cw / 2) * im.scaleX, im.y - im.displayHeight + (cy + ch / 2) * im.scaleY, tex).setCrop(cx, cy, cw, ch).setScale(im.scaleX).setDepth(6).setDisplayOrigin(cx + cw / 2, cy + ch / 2);
      s.tweens.add({ targets: sh, x: sh.x + (i % 4 - 1.5) * 30 + Math.random() * 10, y: sh.y + 40 + Math.random() * 30, angle: (Math.random() - 0.5) * 540, alpha: 0, duration: 700 + Math.random() * 300, ease: 'Quad.easeIn', onComplete: () => sh.destroy() }); }
    if (Math.random() < 0.35 && this.s.pk) this.s.pk.add('heart', im.x, im.y - 10, true);
    im.destroy(); }
  update(dt: number) {
    const p = this.s.player, b = p.body as Phaser.Physics.Arcade.Body;
    for (const g of this.glows) { g.t += dt; g.o.setAlpha(g.b + 0.12 * Math.sin(g.t * 2.2) + (Math.random() < 0.01 ? 0.25 : 0)); }
    for (const sp of this.springs) { sp.cd -= dt; sp.gl.setAlpha(0.3 + 0.15 * Math.sin(this.s.time.now / 200 + sp.x));
      if (sp.cd <= 0 && Math.abs(p.x - sp.x) < 16 && p.y >= sp.y - 16 && p.y <= sp.y + 2 && b.velocity.y >= 0 && !p.locked) {
        sp.cd = 0.35; this.dbg.launches++; b.setVelocityY(-560); p.boostT = 0.45; p.y = sp.y - 14; p.airJumps = 1; p.canAirDash = true; p.setAnimState?.('jump', true); audio.sfx('power', { rate: 1.6, vol: 0.6 });
        this.s.tweens.add({ targets: sp.im, scaleY: 0.3, duration: 60, yoyo: true, ease: 'Quad.easeOut' });
        const r = this.s.add.ellipse(sp.x, sp.y - 6, 20, 6).setStrokeStyle(2, sp.c).setDepth(12).setBlendMode(Phaser.BlendModes.ADD); this.s.tweens.add({ targets: r, scaleX: 3, scaleY: 3, alpha: 0, duration: 350, onComplete: () => r.destroy() });
        this.s.fx?.spark(sp.x, sp.y - 8); } }
    if (p.dashing) for (const k of this.brk) if (k.im.active && Math.abs(p.x - k.im.x) < k.im.displayWidth / 2 + 6 && p.y > k.im.y - k.im.displayHeight && p.y - 28 < k.im.y) this.shatter(k);
    for (const m of this.mov) { const im = m.im, mb = im.body as Phaser.Physics.Arcade.Body; const riding = (b.blocked.down || b.touching.down) && Math.abs(p.x - im.x) < mb.width / 2 + 6 && Math.abs(b.bottom - mb.top) < 4;
      if (m.kind === 'move') { m.t += dt * m.sp; const nx = m.x0 + (m.x1 - m.x0) * (0.5 - 0.5 * Math.cos(m.t)); const dx = nx - im.x; mb.reset(nx, m.y0); if (riding) { p.x += dx; if (!m.st) { m.st = 1; this.dbg.rides++; } } else m.st = 0; }
      else { if (m.st === 0 && riding) m.st = 0.0001;
        if (m.st > 0 && m.st < 0.5) { m.st += dt; mb.reset(m.px + (Math.random() - 0.5) * 2, m.y0); }
        else if (m.st >= 0.5 && m.st < 3.5) { if (m.st < 0.52) this.dbg.falls++; m.st += dt; mb.reset(m.px, im.y + (m.st - 0.5) * 220 * dt * 3); im.setAlpha(Math.max(0, 1 - (m.st - 0.5) / 1.5)); mb.enable = m.st < 1.2; }
        else if (m.st >= 3.5) { m.st = 0; mb.enable = true; im.setAlpha(0); mb.reset(m.px, m.y0); this.s.tweens.add({ targets: im, alpha: 1, duration: 300 }); } } }
  }
}
