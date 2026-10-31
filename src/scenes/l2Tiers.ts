import Phaser from 'phaser';
import { audio } from '../audio/Audio';
import PROF from './l2CurveProf.json';
// Neo-Kyo vertical tiers (layout after Dante's two reference maps; all art = sheet crops):
// LOWER street (y 440) · MID skyway (y 210) · UPPER rooftops (y -20) · SKY spire (y -250, right-side loop tower).
// Routes link via mega springs, vertical lifts, ledge-stacked climb towers (wall-jumpable) and drop gaps.
export const MID = 210, UP = -20, SKY = -250, TOP = -440;
// [x0, x1, y] runs of deck pieces (one-way), auto-tiled from sheet deck/bridge crops
export const RUNS: [number, number, number][] = [
  [560, 1180, MID], [1400, 2160, MID], [2380, 3080, MID], [3300, 4080, MID], [4300, 4560, MID],
  [1180, 1880, UP], [2240, 2900, UP], [3160, 3940, UP], [4140, 4480, UP],
  [4600, 4990, SKY]];
// climb towers: [x, yTop, yBot] solid columns with alternating ledges on both sides
export const TOWERS: [number, number, number][] = [[1280, UP, 300], [2270, UP, 330], [3190, UP, 300], [4580, SKY, 330], [5010, SKY, 330]];
// lifts: [x, yLow, yHigh]
export const LIFTS: [number, number, number][] = [[4270, 404, MID + 4], [1905, MID + 4, UP + 4], [4510, UP + 4, SKY + 4]];
// mega springs on lower street launching to mid, and on mid launching to upper: [x, y, power]
export const MEGA: [number, number, number][] = [[600, 440, 820], [1340, 440, 820], [2440, 440, 820], [3340, 440, 820], [4200, 440, 820], [3040, MID, 820], [4060, MID, 820], [1150, MID, 820]];
export const TIER_FLOWERS: [number, number][] = [[700, MID - 20], [1800, MID - 20], [2700, MID - 20], [3700, MID - 20], [1500, UP - 20], [2600, UP - 20], [3600, UP - 20], [4800, SKY - 20], [4300, 404], [4700, 404]];
export const TIER_GEMS: [number, number, number][] = [[800, MID - 40, 5], [1600, MID - 40, 4], [2500, MID - 40, 5], [3500, MID - 40, 5], [1300, UP - 60, 4], [1650, UP - 40, 5], [2450, UP - 40, 5], [3400, UP - 40, 5], [3800, UP - 40, 4], [4700, SKY - 40, 6], [4850, SKY - 60, 5], [4400, 400, 5], [4900, 400, 5]];
export const TIER_FOES: [string, number, number][] = [['assault', 900, MID], ['drone', 1100, MID - 90], ['shield', 1700, MID], ['assault', 2000, MID], ['heavy', 2700, MID], ['sentry', 3000, MID], ['assault', 3600, MID], ['drone', 3800, MID - 90],
  ['assault', 1500, UP], ['drone', 1700, UP - 90], ['sentry', 2500, UP], ['assault', 2800, UP], ['shield', 3500, UP], ['drone', 3900, UP - 100], ['heavy', 4800, SKY], ['drone', 4700, SKY - 80],
  ['assault', 4400, 440], ['shield', 4700, 440], ['drone', 4950, 330],
  // sheet-robot variety per tier: scouts low/rooftop, mines on skyways/spire, lancers on skyway/rooftop
  ['scout', 1150, 440], ['scout', 2550, 440], ['scout', 3700, 440], ['mine', 1300, MID - 70], ['lancer', 2450, MID], ['mine', 3250, MID - 70],
  ['scout', 1760, UP], ['mine', 2400, UP - 70], ['lancer', 3700, UP], ['mine', 4850, SKY - 70]];
// curved / sloped sheet-style pieces: [key, left x, surface y (bottom for ground pieces, top for 'overhang')]; walkable via fine one-way step strips following the art's top silhouette
export const CURVES: [string, number, number][] = [['qramp', 990, 440], ['arch', 1960, 440], ['hill', 3870, 440], ['pipe', 2960, 440], ['slope', 3560, 440], ['overhang', 2160, MID], ['hill', 4700, 440]];
const DECKS = ['deck_glass_12', 'bridge_16', 'deck_neon_12', 'deck_vent_12'];
export class Tiers {
  lifts: { im: Phaser.Physics.Arcade.Image; y0: number; y1: number; t: number; gl: Phaser.GameObjects.Image }[] = []; megas: any[] = []; liftGroup: Phaser.Physics.Arcade.Group;
  curves: { k: string; x: number; y: number; w: number; top: number[] }[] = [];
  dbg = { curveSteps: 0, runs: 0, towers: 0, ledges: 0, lifts: 0, megas: 0, launches: 0, rides: 0, maxTier: 0 };
  constructor(public s: any, GY: number) {
    const sc = s as Phaser.Scene; let seed = 4242; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // skyway runs: tile decks/bridges; support pylons (sheet tiles_09/20/29, dim, behind) drop toward the tier below
    RUNS.forEach(([x0, x1, y], ri) => { let x = x0; const below = y === MID ? GY : y === UP ? MID : UP;
      while (x < x1 - 40) { const k = DECKS[(ri + Math.floor(rnd() * 4)) % DECKS.length]; const w = k.startsWith('bridge') ? 256 : 192, ww = Math.min(w, x1 - x);
        const im = sc.add.image(x, y - 1, 'l2p_' + k).setOrigin(0, 0).setDepth(2); if (ww < w) im.setCrop(0, 0, ww, im.height); x += ww; }
      s.addRect(x0 + 2, y, x1 - x0 - 4, 10, true); this.dbg.runs++;
      for (let px = x0 + 60; px < x1 - 40; px += 200 + Math.floor(rnd() * 80)) { const h = below - y - 20; if (h < 40) continue; const id = ['09', '20', '29'][Math.floor(rnd() * 3)];
        sc.add.tileSprite(px, y + 18, id === '09' ? 51 : 40, h, 'l2t_' + id).setOrigin(0.5, 0).setDepth(0.9).setTint(0x4a4490).setAlpha(1); }
      // edge neon trims
      for (const ex of [x0 + 4, x1 - 4]) { const g = sc.add.image(ex, y + 4, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(ri % 2 ? 0xff4fd8 : 0x3ff3ff).setScale(0.3).setAlpha(0.6).setDepth(2.1); s.neon.push({ o: g, base: 0.55, t: rnd() * 9 }); } });
    for (const [k, x, sy] of CURVES) { const P: any = (PROF as any)[k]; const y0 = k === 'overhang' ? sy - P.top[Math.floor(P.w / 2)] : sy - P.h + 2;
      sc.add.image(x, y0, 'l2c_' + k).setOrigin(0, 0).setDepth(2.2);
      const raw: number[] = P.top; const sm: number[] = raw.map((_: number, i: number) => { const w = raw.slice(Math.max(0, i - 5), i + 6).filter((v: number) => v >= 0).sort((a: number, b: number) => a - b); return w.length ? w[Math.floor(w.length / 2)] : -1; });
      for (let i = 1; i < sm.length; i++) if (sm[i] >= 0 && sm[i - 1] >= 0) sm[i] = Math.max(sm[i], sm[i - 1] - 2); for (let i = sm.length - 2; i >= 0; i--) if (sm[i] >= 0 && sm[i + 1] >= 0) sm[i] = Math.max(sm[i], sm[i + 1] - 2);
      const top = sm.map((v: number) => (v < 0 ? -1 : y0 + v + 3)); this.curves.push({ k, x, y: y0, w: P.w, top });
      if (k !== 'overhang') { const f = top.findIndex((v: number) => v > 0); const lip = sy - top[f]; if (lip > 3 && lip < 30) for (let d = 3; d < lip * 1.4; d += 3) { s.addRect(x + f - d, top[f] + (d / (lip * 1.4)) * lip, 3, 6, true); this.dbg.curveSteps++; } }
      for (let i = 0, st = 3; i < P.w; i += st) { st = Math.abs((top[Math.min(i + 3, P.w - 1)] || 0) - (top[i] || 0)) > 3 ? 1 : 3; const t = top[i]; if (t < 0) continue; const tt = k === 'overhang' ? t : Math.min(t, sy); if (k !== 'overhang' && tt >= sy) continue; s.addRect(x + i, tt, st, 6, true); this.dbg.curveSteps++; } }
    // climb towers: solid column (sheet pylon crop tiled), ledges alternating left/right every 64px — wall-jump or ledge-hop up
    TOWERS.forEach(([x, yt, yb], ti) => { const w = 40; sc.add.tileSprite(x, yt, 51, yb - yt, 'l2t_09').setOrigin(0.5, 0).setDepth(2.4);
      const cap = sc.add.image(x, yt + 2, 'l2p_deck_neon_3').setOrigin(0.5, 1).setDepth(2.5); s.addRect(x - w / 2, yt + 10, w, yb - yt - 10, false); s.addRect(x - 24, yt, 48, 10, true); this.dbg.towers++; void cap;
      let side = ti % 2 ? 1 : -1; for (let y = yb - 50; y > yt + 30; y -= 62) { const lx = x + side * (w / 2 + 22); sc.add.image(lx, y - 1, 'l2p_deck_glass_3').setOrigin(0.5, 0).setDepth(2.45); s.addRect(lx - 22, y, 44, 10, true); side *= -1; this.dbg.ledges++; }
      const lamp = sc.add.image(x, yt - 10, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff4fd8).setScale(0.5).setAlpha(0.5).setDepth(2.6); s.neon.push({ o: lamp, base: 0.5, t: ti }); });
    // vertical lifts (sheet neon deck crop) with a beam rail
    this.liftGroup = sc.physics.add.group({ allowGravity: false, immovable: true });
    for (const [x, y0, y1] of LIFTS) { sc.add.rectangle(x, (y0 + y1) / 2 + 6, 2, y0 - y1, 0x3ff3ff, 0.25).setDepth(1.95).setBlendMode(Phaser.BlendModes.ADD);
      const im = this.liftGroup.create(x, y0, 'l2p_deck_neon_3') as Phaser.Physics.Arcade.Image; im.setOrigin(0.5, 0).setDepth(4); const b = im.body as Phaser.Physics.Arcade.Body; b.setSize(44, 10).setOffset(2, 1); b.checkCollision.down = false; b.checkCollision.left = false; b.checkCollision.right = false;
      const gl = sc.add.image(x, y0 + 14, 'l2f_25').setBlendMode(Phaser.BlendModes.ADD).setTint(0x3ff3ff).setOrigin(0.5, 0).setScale(0.5, 0.35).setAlpha(0.5).setDepth(3.9);
      this.lifts.push({ im, y0, y1, t: rnd() * 6, gl }); this.dbg.lifts++; }
    // mega springs (sheet launch-pad crops 27/28/29, bigger, with an up-arrow light column fx_26)
    MEGA.forEach(([x, y, pw], i) => { const id = 27 + (i % 3); const im = sc.add.image(x, y + 1, 'l2pr_' + id).setOrigin(0.5, 1).setDepth(5).setScale(0.75);
      const col = sc.add.image(x, y - 4, 'l2f_26').setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setTint(0x6bff8f).setAlpha(0.3).setScale(0.5, 1.2).setDepth(4.9);
      this.megas.push({ im, col, x, y, pw, cd: 0 }); this.dbg.megas++; });
  }
  maxFall = 440;
  bind() { this.maxFall = (this.s.player.body as Phaser.Physics.Arcade.Body).maxVelocity.y; (this.s as Phaser.Scene).physics.add.collider(this.s.player, this.liftGroup); }
  tierOf(y: number) { return y > 330 ? 0 : y > 100 ? 1 : y > -140 ? 2 : 3; }
  capT = 0;
  update(dt: number) { const s = this.s, p = s.player, b = p.body as Phaser.Physics.Arcade.Body, t = s.time.now / 1000;
    if (this.capT > 0) { this.capT -= dt; if (this.capT <= 0 || b.velocity.y > 0) { this.capT = 0; b.setMaxVelocityY(this.maxFall); } }
    this.dbg.maxTier = Math.max(this.dbg.maxTier, b.blocked.down || b.touching.down ? this.tierOf(p.y) : 0);
    for (const l of this.lifts) { l.t += dt * 0.45; const y = l.y1 + (l.y0 - l.y1) * (0.5 + 0.5 * Math.cos(l.t)); const mb = l.im.body as Phaser.Physics.Arcade.Body;
      const riding = (b.touching.down || b.blocked.down) && Math.abs(p.x - l.im.x) < 28 && Math.abs(b.bottom - mb.top) < 6; const dy = y - l.im.y; mb.reset(l.im.x, y);
      if (riding) { if (dy > 0) { p.y += dy; } this.dbg.rides++; } l.gl.setPosition(l.im.x, y + 14).setAlpha(0.35 + 0.2 * Math.sin(t * 8)); }
    for (const m of this.megas) { m.cd -= dt; m.col.setAlpha(0.22 + 0.15 * Math.sin(t * 6 + m.x));
      if (m.cd <= 0 && Math.abs(p.x - m.x) < 18 && p.y >= m.y - 16 && p.y <= m.y + 2 && b.velocity.y >= 0 && !p.locked) { m.cd = 0.4; this.dbg.launches++; b.setMaxVelocityY(m.pw + 20); this.capT = 0.8; b.setVelocityY(-m.pw); p.boostT = 0.6; p.y = m.y - 14; p.airJumps = 1; p.canAirDash = true; p.setAnimState?.('jump', true);
        audio.sfx('power', { rate: 1.2, vol: 0.7 }); s.tweens.add({ targets: m.im, scaleY: 0.4, duration: 70, yoyo: true }); s.fx?.spark(m.x, m.y - 8); s.cameras.main.shake(80, 0.003);
        const r = s.add.image(m.x, m.y - 6, 'l2f_15').setBlendMode(Phaser.BlendModes.ADD).setTint(0x6bff8f).setScale(0.3).setDepth(12); s.tweens.add({ targets: r, scale: 1.4, alpha: 0, duration: 380, onComplete: () => r.destroy() }); } } }
}
