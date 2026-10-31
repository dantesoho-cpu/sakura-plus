import Phaser from 'phaser';
import { audio } from '../audio/Audio';
// Neo-Kyo street dressing, all art = env/items/fx crops cut from ref/neokyo_sheet.png.
// lamps w/ flickering light cones, swaying banners (react to Sakura), sakura trees shedding petals,
// planters, spinning data-shard gems (collectible), drifting vent smoke.
const A = 'assets/l2/';
const pad = (i: number) => String(i).padStart(2, '0');
const LAMPS = [0, 1, 7, 8, 13, 20], BANNERS = [2, 3, 6, 17], TREES = [11, 12], PLANTERS = [10, 15, 18, 19, 26], GEMS = [16, 27, 28, 29, 30, 31, 32, 33, 34];
const GEMC: Record<number, number> = { 16: 0xff5f8f, 27: 0xff4f6f, 28: 0xff6fd8, 29: 0x4fbfff, 30: 0xffe0c0, 31: 0xffa03f, 32: 0x5fff7f, 33: 0x3f8fff, 34: 0x5fff7f };
const LAMPC = [0x3ff3ff, 0xffd23f, 0x8f7bff, 0xff4fd8];
export function preloadEnv(s: Phaser.Scene) {
  for (let i = 0; i <= 36; i++) s.load.image('l2e_' + pad(i), `${A}env/env_${pad(i)}.png`);
  for (let i = 0; i <= 9; i++) s.load.image('l2i_' + pad(i), `${A}items/items_${pad(i)}.png`);
  for (let i = 1; i <= 28; i++) s.load.image('l2f_' + pad(i), `${A}fx/fx_${pad(i)}.png`);
}
type Lamp = { cone: Phaser.GameObjects.Image; x: number; t: number; fl: number };
type Ban = { im: Phaser.GameObjects.Image; t: number; kick: number; x: number };
type Tree = { im: Phaser.GameObjects.Image; x: number; cd: number };
type Gem = { im: Phaser.GameObjects.Image; gl: Phaser.GameObjects.Image; y0: number; t: number; c: number };
export class Env {
  lamps: Lamp[] = []; bans: Ban[] = []; trees: Tree[] = []; gems: Gem[] = []; petals: any[] = []; smoke: any[] = [];
  dbg = { lamps: 0, banners: 0, trees: 0, planters: 0, gems: 0, got: 0, petals: 0, kicks: 0 };
  constructor(public s: any, public GY: number, WW: number) {
    const sc = s as Phaser.Scene; let seed = 31; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const solidAt = (x: number) => s.groundAt(x, GY - 2) === GY; const clear = (x: number, r: number) => solidAt(x - r) && solidAt(x) && solidAt(x + r);
    // lamps + banners on them
    let li = 0; for (let x = 240; x < WW - 100; x += 230 + Math.floor(rnd() * 90)) { if (!clear(x, 10)) continue; const id = LAMPS[li % LAMPS.length], c = LAMPC[li % LAMPC.length]; li++;
      const im = sc.add.image(x, GY + 1, 'l2e_' + pad(id)).setOrigin(0.5, 1).setDepth(1.45); const top = GY - im.height + 6;
      const cone = sc.add.image(x, top + 4, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(c).setScale(1.3, 2.4).setOrigin(0.5, 0.15).setAlpha(0.28).setDepth(1.44);
      this.lamps.push({ cone, x, t: rnd() * 9, fl: 0 }); this.dbg.lamps++;
      if (rnd() < 0.6) { const b = sc.add.image(x + 4, top + 14, 'l2e_' + pad(BANNERS[Math.floor(rnd() * BANNERS.length)])).setOrigin(0, 0).setDepth(1.46).setScale(0.8); this.bans.push({ im: b, t: rnd() * 6, kick: 0, x }); this.dbg.banners++; } }
    // trees + planters (between lamps)
    for (let x = 380; x < WW - 120; x += 380 + Math.floor(rnd() * 220)) { if (!clear(x, 30)) continue; const im = sc.add.image(x, GY + 2, 'l2e_' + pad(TREES[Math.floor(rnd() * 2)])).setOrigin(0.5, 1).setDepth(1.35).setFlipX(rnd() < 0.5);
      this.trees.push({ im, x, cd: 0 }); this.dbg.trees++; }
    for (let x = 300; x < WW - 120; x += 300 + Math.floor(rnd() * 200)) { if (!clear(x, 30)) continue; sc.add.image(x, GY + 1, 'l2e_' + pad(PLANTERS[Math.floor(rnd() * PLANTERS.length)])).setOrigin(0.5, 1).setDepth(1.5).setScale(0.85); this.dbg.planters++; }
    // gems: arcs of 3-5 above ground or over pits
    for (let x = 420; x < WW - 200; x += 260 + Math.floor(rnd() * 160)) { const n = 3 + Math.floor(rnd() * 3), id = GEMS[Math.floor(rnd() * GEMS.length)], base = solidAt(x) ? GY - 46 : GY - 70;
      for (let i = 0; i < n; i++) { const gx = x + i * 22, gy = base - Math.sin((i / (n - 1)) * Math.PI) * 26;
        const gl = sc.add.image(gx, gy, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(GEMC[id]).setScale(0.32).setAlpha(0.45).setDepth(7.9);
        const im = sc.add.image(gx, gy, 'l2e_' + pad(id)).setDepth(8).setScale(0.62); this.gems.push({ im, gl, y0: gy, t: i * 0.5 + rnd(), c: GEMC[id] }); this.dbg.gems++; } }
    // vent smoke (fx_13/fx_24) drifting near ground every so often
    for (let x = 600; x < WW; x += 700 + Math.floor(rnd() * 300)) { const o = sc.add.image(x, GY - 6, 'l2f_' + (rnd() < 0.5 ? '13' : '24')).setDepth(1.7).setAlpha(0.35).setScale(1.2); this.smoke.push({ o, x0: x, t: rnd() * 10 }); }
  }
  arc(x: number, base: number, n: number) { const sc = this.s as Phaser.Scene; const ids = [27, 28, 29, 31, 32, 33, 16];
    for (let i = 0; i < n; i++) { const id = ids[(Math.floor(x / 100) + i) % ids.length], gx = x + i * 22, gy = base - Math.sin((i / Math.max(1, n - 1)) * Math.PI) * 26;
      const gl = sc.add.image(gx, gy, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(GEMC[id]).setScale(0.32).setAlpha(0.45).setDepth(7.9);
      const im = sc.add.image(gx, gy, 'l2e_' + pad(id)).setDepth(8).setScale(0.62); this.gems.push({ im, gl, y0: gy, t: i * 0.5, c: GEMC[id] }); this.dbg.gems++; } }
  petal(x: number, y: number, vx = 0) { const sc = this.s as Phaser.Scene; const p = sc.add.rectangle(x, y, 3, 2, Math.random() < 0.5 ? 0xff9fd0 : 0xffd0e8).setDepth(9).setAngle(Math.random() * 90);
    this.petals.push({ o: p, vx: vx + (Math.random() - 0.5) * 30, vy: 10 + Math.random() * 20, t: 0, w: Math.random() * 6 }); this.dbg.petals++; }
  update(dt: number) {
    const p = this.s.player, pb = p.body as Phaser.Physics.Arcade.Body, spd = Math.abs(pb.velocity.x), now = this.s.time.now / 1000, cam = this.s.cameras.main.worldView;
    for (const l of this.lamps) { l.t += dt; if (Math.random() < 0.004) l.fl = 0.25; l.fl = Math.max(0, l.fl - dt); const near = Math.max(0, 1 - Math.abs(p.x - l.x) / 90);
      l.cone.setAlpha((l.fl > 0 && Math.sin(l.t * 60) > 0 ? 0.08 : 0.24 + 0.05 * Math.sin(l.t * 3)) + near * 0.18); }
    for (const b of this.bans) { b.t += dt; if (Math.abs(p.x - b.x) < 24 && spd > 200 && b.kick < 0.2) { b.kick = 1; this.dbg.kicks++; } b.kick = Math.max(0, b.kick - dt * 0.9);
      b.im.setAngle(Math.sin(b.t * 1.7) * 3 + Math.sin(b.t * 9) * 14 * b.kick * Math.sign(pb.velocity.x || 1)); }
    for (const t of this.trees) { t.cd -= dt; if (t.im.x < cam.x - 60 || t.im.x > cam.right + 60) continue; if (Math.random() < dt * 1.2) this.petal(t.x + (Math.random() - 0.5) * t.im.width * 0.8, t.im.y - t.im.height * 0.7);
      if (t.cd <= 0 && Math.abs(p.x - t.x) < 30 && (spd > 200 || pb.velocity.y < -150)) { t.cd = 1.2; for (let i = 0; i < 14; i++) this.petal(t.x + (Math.random() - 0.5) * 40, t.im.y - t.im.height * (0.4 + Math.random() * 0.5), pb.velocity.x * 0.2);
        this.s.tweens.add({ targets: t.im, angle: { from: 0, to: 2 * Math.sign(pb.velocity.x || 1) }, duration: 120, yoyo: true, repeat: 1 }); } }
    for (let i = this.petals.length - 1; i >= 0; i--) { const q = this.petals[i]; q.t += dt; q.o.x += (q.vx + Math.sin(q.t * 3 + q.w) * 18) * dt; q.o.y += q.vy * dt; q.o.angle += 120 * dt; q.vx *= 0.99;
      if (q.t > 4 || q.o.y > this.GY + 2) { q.o.destroy(); this.petals.splice(i, 1); } }
    for (const sm of this.smoke) { sm.t += dt; sm.o.x = sm.x0 + Math.sin(sm.t * 0.4) * 30; sm.o.setAlpha(0.22 + 0.12 * Math.sin(sm.t * 0.7)).setScale(1.1 + 0.15 * Math.sin(sm.t * 0.5)); }
    for (let i = this.gems.length - 1; i >= 0; i--) { const g = this.gems[i]; g.t += dt; g.im.y = g.y0 + Math.sin(g.t * 3) * 3; g.gl.y = g.im.y; g.im.scaleX = 0.62 * Math.cos(g.t * 2.4); g.gl.setAlpha(0.35 + 0.15 * Math.sin(g.t * 5));
      if (Math.abs(p.x - g.im.x) < 14 && Math.abs(p.y - 18 - g.im.y) < 24) { this.collectGem(g); this.gems.splice(i, 1); } }
  }
  collectGem(g: Gem) { const sc = this.s as Phaser.Scene; this.dbg.got++; audio.sfx('flower', { rate: 1.5 + (this.dbg.got % 5) * 0.08, vol: 0.4 });
    const r = sc.add.image(g.im.x, g.im.y, 'l2f_' + (Math.random() < 0.5 ? '15' : '19')).setBlendMode(Phaser.BlendModes.ADD).setDepth(12).setTint(g.c).setScale(0.5);
    sc.tweens.add({ targets: r, scale: 1.4, alpha: 0, angle: 90, duration: 300, onComplete: () => r.destroy() });
    sc.tweens.add({ targets: [g.im, g.gl], y: g.im.y - 20, alpha: 0, duration: 220, onComplete: () => { g.im.destroy(); g.gl.destroy(); } });
    this.s.hud?.setGems?.(this.dbg.got); }
}
