import Phaser from 'phaser';
import { audio } from '../audio/Audio';
import { touch, showRespawnBtn } from '../systems/Touch';
import { Beam } from '../weapons/Beam';
import { Player, HP_MAX, JET } from '../player/Player';
import { Pickups, type PK } from '../systems/Pickups';
import { Fx } from '../systems/Fx';
import { Blaster } from '../weapons/Blaster';
import { Hud } from '../systems/Hud';
import { Toast } from '../systems/Toast';
import { FEEL } from '../tuning';
import { SpeedCam } from '../systems/SpeedCam';
import { PanoramaBg, loadFortressPano } from '../render/PanoramaBg';
import { FtDrone, FtOrb, FtWalker, FtAvian, FtBoss, ftLoad } from '../entities/Fortress';
import type { Enemy } from '../entities/Enemy';
// AIR FORTRESS (chapter 4) — after Neo-Kyo. Sheet art via public/assets/ft/*. Sonic-Mania-style 5-tier sky docks.
const WW = 7200, WH = 900;
const T1 = 760, T2 = 620, T3 = 480, T4 = 340, T5 = 200;
const GY = T1, AX0 = 6400, AX1 = 7180;
const PLAT_KEYS = [
  'p_left', 'p_mid', 'p_center', 'p_right', 'p_long', 'p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8',
  'p_block', 'p_crystal', 'p_mural', 'p_tl', 'p_rail', 'p_rail2', 'p_thin', 'p_tiny', 'p_hang',
  'p_slope', 'p_slope_a', 'p_slope_b', 'p_step', 'p_step2', 'p_low', 'p_low2', 'p_low3', 'col_a', 'col_b', 'banner',
];
/** Continuous dock bands on T1 — tiled with p_long; gaps are open air channels. */
const GROUND: [number, number][] = [
  [0, 980], [1120, 1980], [2140, 3180], [3340, 4480], [4640, 5580], [5740, 6380], [AX0 - 40, WW],
];
/** Floating shelves: [a, b, walkY] — LMR modular strips (staggered lengths for curves). */
const SHELVES: [number, number, number][] = [
  // T2 gantries — staggered docks
  [260, 500, T2], [640, 1120, T2], [1280, 1760, T2], [1960, 2520, T2], [2720, 3380, T2],
  [3600, 4280, T2], [4520, 5180, T2], [5420, 6080, T2], [6280, 6520, T2],
  // T3 spires
  [160, 400, T3], [520, 1040, T3], [1220, 1780, T3], [1980, 2680, T3], [2880, 3560, T3],
  [3780, 4480, T3], [4680, 5380, T3], [5580, 6180, T3],
  // T4 hangar rails
  [140, 460, T4], [640, 1220, T4], [1420, 2180, T4], [2400, 3180, T4], [3400, 4180, T4],
  [4400, 5180, T4], [5400, 6120, T4],
  // T5 canopy
  [100, 400, T5], [520, 1140, T5], [1340, 2100, T5], [2320, 3080, T5], [3300, 4180, T5],
  [4400, 5280, T5], [5500, 6240, T5],
];
/** Isolated vignette platforms: [piece, x, walkY] */
const PLATS: [string, number, number][] = [
  ['p_crystal', 1020, T1 - 40], ['p_mural', 2040, T1 - 36], ['p_block', 3260, T1 - 36],
  ['p_crystal', 4500, T1 - 40], ['p_mural', 5900, T1 - 36],
  ['p_tl', 1020, T2 - 60], ['p0', 2680, T3 - 20], ['p1', 3580, T4 - 20],
  ['p_hang', 1800, T5 + 40], ['p_hang', 4200, T4 + 36], ['p_hang', 5600, T3 + 30],
  ['p_rail', 640, T3 - 50], ['p_rail2', 2400, T2 - 48], ['p_rail', 4100, T5 - 40],
  ['p_rail2', 5100, T3 - 48], ['p_tiny', 900, T4 - 10], ['p_tiny', 3100, T5 - 8],
  ['p_step', 1600, T1 - 20], ['p_step2', 4000, T2 - 16], ['p_thin', 520, T5 - 8],
  ['p_block', 700, T5 - 20], ['p_crystal', 2000, T4 - 36], ['p_mural', 4800, T2 - 36],
];
/** Sheet ramps: [key, x, lowWalkY, flip] — lowWalkY is the lower end walk height. */
const RAMPS: [string, number, number, boolean][] = [
  ['p_slope_a', 980, T1, false], ['p_slope_b', 1980, T1, false],
  ['p_slope_a', 1180, T2, true], ['p_slope_b', 1860, T3, false],
  ['p_slope_a', 2680, T2, false], ['p_slope_b', 3180, T3, true],
  ['p_slope_a', 4380, T2, false], ['p_slope_b', 5180, T3, false],
  ['p_slope_a', 1080, T4, true], ['p_slope_b', 2200, T4, false],
  ['p_slope_a', 3100, T5, false], ['p_slope_b', 4200, T5, true],
  ['p_slope_a', 1500, T1, true], ['p_slope_b', 3500, T2, false],
  ['p_slope_a', 5000, T1, false], ['p_slope_b', 5800, T2, true],
];
/** Stepping arcs between tiers: [x0, y0, n, dy, dx, flip] — climb with p_step pieces. */
const STEPS: [number, number, number, number, number, boolean][] = [
  [920, T1 - 18, 5, -22, 28, false],
  [1520, T2 - 18, 5, -22, 30, false],
  [2320, T3 - 18, 5, -22, 28, true],
  [2920, T4 - 18, 5, -22, 28, false],
  [3720, T1 - 18, 4, -24, 32, false],
  [4520, T2 - 18, 5, -22, 28, true],
  [5320, T3 - 18, 5, -22, 30, false],
  [600, T3 - 18, 4, -24, 30, true],
];
/** Wind lifts (jet assist columns): [x0, x1, topY, botY] */
const WINDS: [number, number, number, number][] = [
  [1000, 1060, T5 - 20, T1 - 10],
  [2600, 2660, T5 - 20, T2 - 10],
  [3900, 3960, T4 - 20, T1 - 10],
  [5100, 5160, T5 - 20, T2 - 10],
];
/** Hangar vaults: [leverX, leverY, vaultX, vaultY, side] */
const VAULTS: [number, number, number, number, number][] = [
  [1760, T3, 1880, T3, 1],
  [4120, T4, 4240, T4, -1],
];
/** Secret alcoves: [x, walkY, side] */
const SECRETS: [number, number, number][] = [
  [3050, T1, 1],
  [5450, T2, -1],
];
/** Decor props sit flush on walkY: [key, x, walkY, depth, flip?] */
const PROPS: [string, number, number, number, boolean?][] = [
  ['banner', 400, T1, 1.8], ['banner', 1500, T2, 1.8], ['banner', 2600, T3, 1.8, true],
  ['banner', 3700, T1, 1.8], ['banner', 4900, T4, 1.8], ['banner', 5800, T2, 1.8, true],
  ['banner', 2200, T5, 1.8], ['banner', 6200, T1, 1.8, true],
  ['col_a', 860, T1, 1.7], ['col_b', 1900, T1, 1.7], ['col_a', 3100, T1, 1.7],
  ['col_b', 4300, T1, 1.7], ['col_a', 5400, T1, 1.7], ['col_b', 6100, T1, 1.7],
  ['col_b', 1000, T2, 1.7], ['col_a', 2500, T3, 1.7], ['col_b', 4000, T4, 1.7],
  ['col_a', 1700, T5, 1.7], ['col_b', 3400, T5, 1.7],
  ['p_low', 200, T1 + 4, 1.5], ['p_low2', 1200, T1 + 4, 1.5], ['p_low3', 2400, T1 + 4, 1.5],
  ['p_low', 3600, T1 + 4, 1.5], ['p_low2', 4800, T1 + 4, 1.5], ['p_low', 6000, T1 + 4, 1.5],
];
// [kind, x, y] — kinds: drone|orb|heavy|wing|bip|tri|thrust|human|avian
const FOES: [string, number, number][] = [
  ['drone', 420, T2 - 40], ['orb', 780, T1], ['bip', 980, T1], ['drone', 1200, T3 - 30],
  ['human', 1500, T1], ['wing', 1600, T4 - 20], ['tri', 1800, T2], ['avian', 2000, T5 - 30],
  ['orb', 2200, T1], ['thrust', 2400, T1], ['drone', 2600, T3 - 40], ['human', 2900, T2],
  ['bip', 3100, T1], ['avian', 3300, T4 - 20], ['heavy', 3500, T1], ['drone', 3700, T5 - 40],
  ['orb', 4000, T2], ['human', 4200, T1], ['wing', 4400, T3 - 30], ['tri', 4600, T1],
  ['avian', 4800, T5 - 20], ['drone', 5000, T2 - 40], ['thrust', 5200, T1], ['human', 5500, T2],
  ['bip', 5700, T1], ['drone', 5900, T4 - 30], ['orb', 6100, T1], ['avian', 6200, T3 - 20],
];
const FLOWERS: [number, number][] = [
  [340, T1 - 8], [900, T2 - 8], [1400, T1 - 8], [1900, T3 - 8], [2500, T1 - 8],
  [3000, T4 - 8], [3600, T2 - 8], [4200, T1 - 8], [4900, T5 - 8], [5600, T1 - 8],
];
const GEMS: [number, number, number][] = [
  [600, T2 - 30, 5], [1600, T3 - 30, 4], [2800, T4 - 30, 6], [4000, T5 - 30, 5], [5200, T3 - 30, 4],
];
export class Fortress extends Phaser.Scene {
  player!: Player; fx!: Fx; gun!: Blaster; egun!: Blaster; enemies: Enemy[] = []; hud!: Hud; toast!: Toast; pk!: Pickups;
  solids!: Phaser.Physics.Arcade.StaticGroup; ones!: Phaser.Physics.Arcade.StaticGroup; flowers!: Phaser.Physics.Arcade.StaticGroup;
  bg!: PanoramaBg; enemyGroup!: Phaser.Physics.Arcade.Group; scam!: SpeedCam;
  got = 0; gems = 0; kills = 0; deaths = 0; time_ = 0; spawn = { x: 100, y: T1 - 4 }; safe = { x: 100, y: T1 - 4 };
  lookX = 0; lookY = 0; rapT = 0; powT = 0; ending = false; cpLit = false; cpI = 0;
  boss!: FtBoss; arena = false; won = false; walls: Phaser.GameObjects.Zone[] = [];
  rects: Phaser.Geom.Rectangle[] = [];
  solid = { getTileAtWorldXY: (x: number, y: number) => (this.rects.some(r => r.contains(x, y)) ? { collides: true } : null) };
  dbg: any = { tiers: [] as number[], zones: [] as string[], portal: 0, ai: 0 }; portalUsed = false;
  cps: [number, number][] = [[1800, T1], [3600, T1], [5200, T1]];
  cpLamps: Phaser.GameObjects.Image[] = [];
  man: Record<string, { w: number; h: number; top: number; foot?: number; prof?: number[] }> = {};
  surf: { x: number; y: number; prof: number[]; w: number; flip: boolean }[] = [];
  onSlope = false; glows: { o: Phaser.GameObjects.Image; base: number; t: number; sp: number }[] = [];
  winds: { a: number; b: number; t: number; bt: number; fx: Phaser.GameObjects.Rectangle }[] = [];
  vaults: { lever: Phaser.GameObjects.Image; gate: Phaser.GameObjects.Rectangle; gateZ: any; chest: Phaser.GameObjects.Image; on: boolean; open: boolean; ly: number; sy: number }[] = [];
  secrets: { wall: Phaser.GameObjects.Image[]; chest: Phaser.GameObjects.Image; sy: number; found: boolean; open: boolean; ex: number }[] = [];
  arenaFx: Phaser.GameObjects.Rectangle[] = [];
  constructor() { super('Fortress'); }
  preload() {
    loadFortressPano(this); ftLoad(this);
    this.load.json('ft_plat', 'assets/ft/plat/plat.json');
    for (const n of PLAT_KEYS) this.load.image('ft_' + n, `assets/ft/plat/${n}.png`);
  }
  m(k: string) { return this.man[k] || { w: 64, h: 32, top: 0, foot: 31 }; }
  addRect(x: number, y: number, w: number, h: number, one: boolean) {
    const z = this.add.zone(x + w / 2, y + h / 2, w, h); (one ? this.ones : this.solids).add(z);
    const b = z.body as Phaser.Physics.Arcade.StaticBody;
    if (one) { b.checkCollision.down = false; b.checkCollision.left = false; b.checkCollision.right = false; }
    else this.rects.push(new Phaser.Geom.Rectangle(x, y, w, h));
  }
  /** Continuous ground: tile p_long with slight overlap + flipX for seamless docks. */
  tileTop(a: number, b: number, y: number, d = 2) {
    const gm = this.m('p_long'), gw = gm.w - 8;
    for (let x = a - 4, j = 0; x < b - 4; x += gw, j++) {
      const w = Math.min(gw + 8, b + 4 - x);
      const key = 'ft_p_long'; if (!this.textures.exists(key)) continue;
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.add.image(Math.round(x), Math.round(y - (gm.top || 0)), key).setOrigin(0, 0).setDepth(d)
        .setFlipX(!!(j & 1) && w > gw).setCrop(0, 0, w, gm.h);
    }
  }
  /** Left–mid*–right modular floating strip. */
  stripLMR(a: number, b: number, y: number, d = 2.1) {
    const L = this.m('p_left'), R = this.m('p_right'), M = this.m('p_mid');
    const place = (k: string, x: number, sy: number) => {
      const m = this.m(k), key = 'ft_' + k; if (!this.textures.exists(key)) return m.w;
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.add.image(Math.round(x), Math.round(sy - (m.top || 0)), key).setOrigin(0, 0).setDepth(d);
      return m.w;
    };
    let x = a;
    x += place('p_left', x, y) - 2;
    const midW = Math.max(8, b - a - L.w - R.w + 8);
    for (let i = 0, cx = x; cx < a + L.w - 2 + midW - 4; i++, cx += M.w - 2) {
      const key = 'ft_p_mid'; if (!this.textures.exists(key)) break;
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      const im = this.add.image(Math.round(cx), Math.round(y - (M.top || 0)), key).setOrigin(0, 0).setDepth(d);
      if (i & 1) im.setFlipX(true);
    }
    place('p_right', b - R.w, y);
    this.addRect(a + 2, y, Math.max(8, b - a - 4), 10, true);
  }
  place(k: string, x: number, sy: number, d = 2) {
    const m = this.m(k); const key = 'ft_' + k; if (!this.textures.exists(key)) return;
    this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(Math.round(x), Math.round(sy - (m.top || 0)), key).setOrigin(0, 0).setDepth(d);
    this.addRect(x + 2, sy, Math.max(8, (m.w || 64) - 4), 10, true);
  }
  prop(k: string, x: number, sy: number, d: number, flip = false) {
    const m = this.m(k); const key = 'ft_' + k; if (!this.textures.exists(key)) return null;
    this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    const foot = (m.foot ?? m.h - 1);
    return this.add.image(x, sy + (m.h - 1 - foot), key).setOrigin(0.5, 1).setDepth(d).setFlipX(flip);
  }
  rampY(x: number) {
    for (const r of this.surf) {
      if (x < r.x || x > r.x + r.w) continue;
      let u = x - r.x; if (r.flip) u = r.w - u;
      const i = Math.min(r.prof.length - 1, Math.max(0, Math.round(u / 4)));
      return r.y + r.prof[i];
    }
    return Infinity;
  }
  slopeSnap() {
    const p = this.player, b = p?.body_; this.onSlope = false;
    if (!b || !b.enable || b.velocity.y < 0) return;
    const feet = b.bottom; let sy = Infinity;
    for (const x of [b.left + 2, b.right - 2, b.center.x]) sy = Math.min(sy, this.rampY(x));
    if (sy === Infinity) return;
    const dy = sy - feet;
    if (dy > -12 && dy < 6) { b.y += dy; b.velocity.y = 0; b.blocked.down = b.touching.down = true; this.onSlope = true; }
  }
  groundAt(x: number, y: number): number {
    let best = -1;
    for (const r of this.ones.getChildren() as Phaser.GameObjects.Zone[]) {
      const b = r.body as Phaser.Physics.Arcade.StaticBody;
      if (x >= b.x && x <= b.right && Math.abs(b.y - y) < 80 && b.y >= y - 4) {
        if (best < 0 || b.y < best) best = b.y;
      }
    }
    const ry = this.rampY(x); if (ry !== Infinity && Math.abs(ry - y) < 80 && ry >= y - 4) {
      if (best < 0 || ry < best) best = ry;
    }
    for (const [a, b] of GROUND) {
      if (x >= a && x < b && y <= T1 + 20) { if (best < 0 || T1 < best) best = T1; }
    }
    return best;
  }
  create() {
    this.got = 0; this.gems = 0; this.kills = 0; this.deaths = 0; this.time_ = 0; this.ending = false;
    this.arena = false; this.won = false; this.cpLit = false; this.cpI = 0; this.rects = []; this.enemies = []; this.walls = [];
    this.dbg = { tiers: [], zones: ['dock', 'gantry', 'spires', 'hangar', 'bridge', 'arena'], portal: 0, ai: 0, wind: 0, vault: 0, secret: 0, ramp: 0 };
    this.man = (this.cache.json.get('ft_plat') as any) || {};
    this.physics.world.setBounds(0, 0, WW, WH + 80); this.physics.world.setBoundsCollision(true, true, false, false);
    this.cameras.main.setBackgroundColor(0x1a0a3a);
    this.bg = new PanoramaBg(this);
    this.surf = []; this.glows = []; this.onSlope = false; this.winds = []; this.vaults = []; this.secrets = []; this.arenaFx = [];
    // deep void under docks (only bands get solid floor)
    this.add.rectangle(0, T1 + 48, WW, WH - T1, 0x0c0618).setOrigin(0, 0).setDepth(0.5);
    this.solids = this.physics.add.staticGroup(); this.ones = this.physics.add.staticGroup(); this.flowers = this.physics.add.staticGroup();
    this.enemyGroup = this.physics.add.group();
    // T1 continuous docks with open air channels between
    for (const [a, b] of GROUND) {
      this.add.rectangle(a, T1 + 10, b - a, WH - T1 + 40, 0x1a1030).setOrigin(0, 0).setDepth(1.9);
      this.tileTop(a, b, T1);
      this.addRect(a, T1, b - a, 48, false);
    }
    for (let i = 0; i < GROUND.length - 1; i++) {
      const a = GROUND[i][1], b = GROUND[i + 1][0];
      // neon channel glow between docks
      const ch = this.add.rectangle(a, T1 + 6, b - a, 3, 0x6fe8ff, 0.25).setOrigin(0, 0).setDepth(1.95).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: ch, alpha: { from: 0.15, to: 0.4 }, yoyo: true, repeat: -1, duration: 900 + i * 70, ease: 'Sine.inOut' });
    }
    // floating modular shelves
    for (const [a, b, y] of SHELVES) this.stripLMR(a, b, y, y === T2 ? 2.05 : y === T3 ? 2.1 : y === T4 ? 2.15 : 2.2);
    // sheet ramps
    for (const [k, x, low, flip] of RAMPS) {
      const m = this.m(k); if (!m.prof || !this.textures.exists('ft_' + k)) continue;
      const pr = m.prof, lo = Math.max(...pr.slice(flip ? -4 : 0, flip ? undefined : 4));
      const y = low - lo;
      this.add.image(x, y, 'ft_' + k).setOrigin(0, 0).setFlipX(flip).setDepth(2.3);
      this.textures.get('ft_' + k).setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.surf.push({ x, y, prof: pr, w: m.w, flip });
    }
    // stepping arcs (tier connectors)
    for (const [x0, y0, n, dy, dx, flip] of STEPS) {
      for (let i = 0; i < n; i++) {
        const x = x0 + i * dx * (flip ? -1 : 1), y = y0 + i * dy;
        this.place(i & 1 ? 'p_step2' : 'p_step', x, y, 2.35);
      }
      this.dbg.ramp++;
    }
    // vignette plats
    for (const [k, x, y] of PLATS) {
      this.place(k, x, y, 2.4);
      if (k === 'p_crystal' && this.textures.exists('glow')) {
        const g = this.add.image(x + 40, y - 28, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff6fd8).setScale(0.7).setAlpha(0.35).setDepth(2.45);
        this.glows.push({ o: g, base: 0.32, t: x, sp: 1.8 });
        this.tweens.add({ targets: g, scale: { from: 0.55, to: 0.85 }, yoyo: true, repeat: -1, duration: 1100 + (x % 400), ease: 'Sine.inOut' });
      }
    }
    // wind lifts
    for (const [a, b, top, bot] of WINDS) {
      const col = this.add.rectangle(a, top, b - a, bot - top, 0x6fe8ff, 0.07).setOrigin(0, 0).setDepth(1.75).setBlendMode(Phaser.BlendModes.ADD);
      this.glows.push({ o: col as any, base: 0.08, t: a, sp: 2.4 });
      for (let y = bot - 20; y > top; y -= 48) {
        const puf = this.add.image((a + b) / 2, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x9af0ff).setScale(0.35, 0.9).setAlpha(0.25).setDepth(1.76);
        this.tweens.add({ targets: puf, y: y - 40, alpha: { from: 0.3, to: 0.05 }, duration: 900 + (y % 200), repeat: -1, ease: 'Sine.out' });
      }
      this.winds.push({ a, b, t: top, bt: bot, fx: col });
    }
    // hangar vaults (lever → gate → chest)
    for (const [lx, ly, vx, vy, side] of VAULTS) {
      const W = 110, H = 56;
      this.stripLMR(vx, vx + W, vy, 2.5);
      const lever = this.textures.exists('ft_deco3')
        ? this.add.image(lx, ly, 'ft_deco3').setOrigin(0.5, 1).setDepth(3).setScale(0.55)
        : this.add.image(lx, ly, 'ft_p_tiny').setOrigin(0.5, 1).setDepth(3);
      const chest = this.textures.exists('ft_gem5')
        ? this.add.image(vx + W / 2 - side * 16, vy + 1, 'ft_gem5').setOrigin(0.5, 1).setDepth(2.6).setScale(0.7)
        : this.add.image(vx + W / 2, vy + 1, 'ft_gem0').setOrigin(0.5, 1).setDepth(2.6);
      const gx = side < 0 ? vx - 6 : vx + W + 6;
      const gate = this.add.rectangle(gx, vy - H / 2, 10, H, 0x6a3cff, 0.85).setDepth(2.7);
      const gateZ = this.add.zone(gx, vy - H / 2, 14, H); this.solids.add(gateZ);
      const lg = this.add.image(lx, ly - 28, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd27a).setScale(0.4).setAlpha(0.25).setDepth(2.9);
      this.glows.push({ o: lg, base: 0.22, t: lx, sp: 2 });
      this.vaults.push({ lever, gate, gateZ, chest, on: false, open: false, ly, sy: vy });
    }
    // secret alcoves behind false walls
    for (const [x, sy, side] of SECRETS) {
      const W = 90;
      this.stripLMR(x, x + W, sy, 2.55);
      const chest = this.textures.exists('ft_gem3')
        ? this.add.image(x + W / 2, sy + 1, 'ft_gem3').setOrigin(0.5, 1).setDepth(2.6).setScale(0.65)
        : this.add.image(x + W / 2, sy + 1, 'ft_gem0').setOrigin(0.5, 1).setDepth(2.6);
      const gx = side < 0 ? x - 4 : x + W + 4;
      const ws: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < 2; i++) {
        const w = this.add.image(gx + side * 4, sy + 1 - i * 34, 'ft_p_left').setOrigin(0.5, 1).setScale(0.7).setFlipX(side > 0).setTint(0xb8a0e8).setDepth(9.2);
        ws.push(w);
      }
      this.secrets.push({ wall: ws, chest, sy, found: false, open: false, ex: gx });
    }

    // sheet decor flush on walk surfaces
    for (const row of PROPS) {
      const [k, x, y, d, f] = row as [string, number, number, number, boolean?];
      const im = this.prop(k, x, y, d, !!f);
      if (!im) continue;
      if (k === 'banner') {
        this.tweens.add({ targets: im, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 1600 + (x % 500), ease: 'Sine.inOut' });
        this.tweens.add({ targets: im, scaleX: { from: 1, to: 0.94 }, yoyo: true, repeat: -1, duration: 1100 + (x % 300), ease: 'Sine.inOut' });
      }
      if (k.startsWith('col')) {
        const g = this.add.image(x, im.y - im.displayHeight * 0.55, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x9a7aff).setScale(0.45).setAlpha(0.3).setDepth(d + 0.05);
        this.glows.push({ o: g, base: 0.28, t: x, sp: 1.6 });
      }
    }
    // set pieces: airships, ring portals, sheet deco vignettes
    if (this.textures.exists('ft_ship0')) {
      const s0 = this.add.image(2400, T5 - 40, 'ft_ship0').setOrigin(0.5, 1).setDepth(1.5).setScale(0.55).setAlpha(0.9);
      this.tweens.add({ targets: s0, y: s0.y - 6, yoyo: true, repeat: -1, duration: 2200, ease: 'Sine.inOut' });
      const s1 = this.add.image(4800, T4 - 20, 'ft_ship0').setOrigin(0.5, 1).setDepth(1.5).setScale(0.4).setFlipX(true).setAlpha(0.85);
      this.tweens.add({ targets: s1, y: s1.y - 5, yoyo: true, repeat: -1, duration: 2600, ease: 'Sine.inOut' });
    }
    if (this.textures.exists('ft_ring')) {
      const ring = this.add.image(AX0 - 200, T2 - 40, 'ft_ring').setDepth(3).setScale(0.7);
      this.tweens.add({ targets: ring, angle: 360, duration: 12000, repeat: -1, ease: 'Linear' });
      const rg = this.add.image(AX0 - 200, T2 - 40, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xb04aff).setScale(1.6).setAlpha(0.35).setDepth(2.9);
      this.glows.push({ o: rg, base: 0.3, t: AX0, sp: 2.2 });
    }
    if (this.textures.exists('ft_portal0')) {
      const mid = this.add.image(3000, T3 - 50, 'ft_portal0').setDepth(2.8).setScale(0.55).setAlpha(0.9);
      this.tweens.add({ targets: mid, angle: -360, duration: 16000, repeat: -1, ease: 'Linear' });
      (this as any)._midPortal = { x: 3000, y: T3 - 50 };
    }
    if (this.textures.exists('ft_hoop')) {
      const hp = this.add.image(3600, T5 + 20, 'ft_hoop').setDepth(1.4).setScale(0.6).setAlpha(0.8);
      this.tweens.add({ targets: hp, angle: { from: -8, to: 8 }, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.inOut' });
    }
    for (const [k, x, y, sc] of [['deco0', 800, T1, 0.5], ['deco1', 3000, T1, 0.7], ['deco2', 1700, T2, 0.55], ['deco4', 4200, T3, 0.5], ['deco5', 5500, T1, 0.6], ['deco6', 2300, T4, 0.45], ['deco7', 4700, T5, 0.5], ['deco8', 1200, T5, 0.4]] as [string, number, number, number][]) {
      if (!this.textures.exists('ft_' + k)) continue;
      const im = this.add.image(x, y, 'ft_' + k).setOrigin(0.5, 1).setDepth(2.2).setScale(sc);
      this.tweens.add({ targets: im, y: y - 3, yoyo: true, repeat: -1, duration: 1400 + (x % 500), ease: 'Sine.inOut' });
    }
    // checkpoints
    this.cpLamps = [];
    for (const [x, y] of this.cps) {
      this.add.rectangle(x, y - 30, 4, 50, 0x2a2060).setDepth(1.5);
      this.cpLamps.push(this.add.image(x, y - 58, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x666688).setScale(0.4).setDepth(1.6));
    }
    // systems
    this.fx = new Fx(this); this.gun = new Blaster(this, 'p', 'shot'); this.egun = new Blaster(this, 'e', 'ebolt', { cooldown: 0, speed: 150, life: 3 });
    for (const [x, y] of FLOWERS) {
      const f = this.flowers.create(x, y, 'petal') as any; f.setScale(2).setDepth(6); f.refreshBody();
      this.tweens.add({ targets: f, y: y - 4, yoyo: true, repeat: -1, duration: 900 + Math.random() * 400, ease: 'Sine.inOut' });
    }
    this.pk = new Pickups(this, (x, y) => this.groundAt(x, y));
    this.pk.add('heart', 2100, T2 - 8); this.pk.add('rapid', 3400, T3 - 8); this.pk.add('power', 4800, T4 - 8);
    // gem arcs
    for (const [x0, y0, n] of GEMS) for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) : 0.5;
      const g = this.physics.add.staticImage(x0 + i * 18, y0 - Math.sin(u * Math.PI) * 22, this.textures.exists('ft_gem0') ? 'ft_gem0' : 'petal') as any;
      g.setDepth(6).setScale(this.textures.exists('ft_gem0') ? 0.5 : 1.5); g.refreshBody(); g.kind = 'gem';
      (this as any)._gems = (this as any)._gems || []; (this as any)._gems.push(g);
    }
    this.player = new Player(this, this.spawn.x, this.spawn.y); this.player.gun = this.gun; this.player.hasJet = true;
    this.player.beam = new Beam(this, this.fx, () => this.enemies, (x, y) => !!this.solid.getTileAtWorldXY(x, y));
    this.player.beam.owner = this.player; this.safe = { ...this.spawn };
    this.hud = new Hud(this, HP_MAX, true); this.hud.setBossName("WINGED FORTRESS"); this.toast = new Toast(this); this.hud.setHp(this.player.hp);
    // enemies
    for (const [k, x, y] of FOES) this.spawnFoe(k, x, y);
    // boss
    this.boss = new FtBoss(this, (AX0 + AX1) / 2, T1 - 100, this.fx, this.egun, T1);
    this.enemies.push(this.boss); this.enemyGroup.add(this.boss);
    this.boss.onDead = () => this.win();
    // gem overlap
    for (const g of ((this as any)._gems || [])) this.physics.add.overlap(this.player, g, () => {
      if (!g.active) return; g.destroy(); this.gems++; audio.sfx('flower', { rate: 1.2 }); this.fx.explode(g.x, g.y, 0.3);
    });
    this.physics.add.collider(this.player, this.solids); this.physics.add.collider(this.player, this.ones);
    this.physics.add.collider(this.enemyGroup, this.solids, undefined, (e: any) => e.kind === 'bot');
    this.physics.add.collider(this.enemyGroup, this.ones, undefined, (e: any) => e.kind === 'bot');
    this.physics.add.collider(this.gun.shots, this.solids, (s: any) => { this.fx.spark(s.x, s.y); this.gun.kill(s); });
    this.physics.add.collider(this.egun.shots, this.solids, (s: any) => this.egun.kill(s));
    this.physics.add.overlap(this.gun.shots, this.enemyGroup, (s: any, e: any) => {
      if (!e.active || e.dead) return; const dir = Math.sign(e.x - this.player.x) || 1; e.hit(s.damage || 1, dir); this.gun.kill(s);
    });
    const hurt = () => this.hud.setHp(this.player.hp);
    this.physics.add.overlap(this.player, this.egun.shots, (_p, s: any) => { if (s.active && this.player.damage(s.x)) { this.egun.kill(s); hurt(); } });
    this.physics.add.overlap(this.player, this.enemyGroup, (_p, e: any) => {
      if (!e.active || e.dead || (e.kind === 'boss' && !e.awake)) return;
      if (this.player.body_.velocity.y > 80 && this.player.y < e.y - 8) { e.hit(2, Math.sign(e.x - this.player.x) || 1); this.player.body_.setVelocityY(-220); return; }
      if (this.player.damage(e.x)) hurt();
    });
    this.physics.add.overlap(this.player, this.flowers, (_p, f: any) => {
      if (!f.active) return; f.destroy(); this.got++; audio.sfx('flower'); this.fx.explode(f.x, f.y, 0.4); this.hud.setMem(this.got);
      });
    const cam = this.cameras.main; cam.setBounds(0, 0, WW, WH); cam.startFollow(this.player, true, FEEL.cam.lerp, FEEL.cam.lerp, 0, 30);
    this.scam = new SpeedCam(this, this.player, FEEL.cam.lerp); cam.setDeadzone(FEEL.cam.deadW, FEEL.cam.deadH); cam.setRoundPixels(true);
    showRespawnBtn(true);
    this.events.once('shutdown', () => { audio.stopLoops(); showRespawnBtn(false); });
    this.toast.show('AIR FORTRESS — reach the winged ship.', '#ffd23f');
    (window as any).__lvl = this; (window as any).__fortress = this;
    this.cameras.main.fadeIn(400);
  }
  take(k: PK) {
    if (k === 'heart') { this.player.hp = Math.min(HP_MAX, this.player.hp + 1); this.hud.setHp(this.player.hp); return true; }
    if (k === 'rapid') { this.rapT = 8; return true; }
    if (k === 'power') { this.powT = 8; return true; }
    return false;
  }
  spawnFoe(k: string, x: number, y: number) {
    let e: Enemy;
    if (k === 'drone' || k === 'wing') e = new FtDrone(this, x, y, this.fx, this.egun, k === 'wing' ? 'ft_en_wing' : 'ft_en_drone');
    else if (k === 'avian') e = new FtAvian(this, x, y, this.fx, this.egun);
    else if (k === 'orb' || k === 'tri') e = new FtOrb(this, x, y, this.fx, this.egun, 70, k === 'tri' ? 'ft_en_tri' : 'ft_en_orb');
    else if (k === 'heavy' || k === 'thrust') e = new FtWalker(this, x, y, this.fx, this.egun, 5, 70, k === 'thrust' ? 'ft_en_thrust' : 'ft_en_heavy_d');
    else e = new FtWalker(this, x, y, this.fx, this.egun, 4, 80, k === 'bip' ? 'ft_en_bip' : 'ft_en_human');
    e.on('destroyed', () => { this.kills++; });
    this.enemies.push(e); this.enemyGroup.add(e); return e;
  }
  lockArena() {
    if (this.arena) return; this.arena = true;
    const z0 = this.add.zone(AX0 - 10, T1 - 200, 20, 400); this.solids.add(z0); this.walls.push(z0);
    const z1 = this.add.zone(AX1 + 10, T1 - 200, 20, 400); this.solids.add(z1); this.walls.push(z1);
    this.rects.push(new Phaser.Geom.Rectangle(AX0 - 20, T1 - 400, 20, 500));
    this.rects.push(new Phaser.Geom.Rectangle(AX1, T1 - 400, 20, 500));
    // presentation rails + warning bars
    for (const x of [AX0 + 40, AX1 - 40]) {
      const bar = this.add.rectangle(x, T1 - 120, 6, 200, 0xff4fd8, 0.55).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
      this.arenaFx.push(bar);
      this.tweens.add({ targets: bar, alpha: { from: 0.25, to: 0.75 }, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.inOut' });
    }
    const warn = this.add.rectangle((AX0 + AX1) / 2, T1 - 180, AX1 - AX0 - 80, 8, 0xffd23f, 0.5).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    this.arenaFx.push(warn);
    this.tweens.add({ targets: warn, alpha: { from: 0.2, to: 0.7 }, yoyo: true, repeat: 6, duration: 180 });
    audio.sfx('gate'); this.cameras.main.flash(320, 180, 100, 255); this.cameras.main.shake(280, 0.01);
    this.toast.show('The fortress awakens!', '#ff4fd8');
    this.boss.wake();
  }
  unlockArena() { this.walls.forEach(z => z.destroy()); this.walls = []; this.arenaFx.forEach(r => r.destroy()); this.arenaFx = []; this.arena = false; }
  win() {
    if (this.won) return; this.won = true; this.ending = true; this.unlockArena();
    this.toast.show('Winged Fortress down!', '#ffd23f'); audio.sfx('gate');
    this.time.delayedCall(2600, () => {
      this.cameras.main.fadeOut(800, 200, 180, 255);
      this.time.delayedCall(850, () => this.scene.start('Victory', { time: this.time_, got: this.got, kills: this.kills, deaths: this.deaths, ch: 4, gems: this.gems }));
    });
  }
  respawn(full: boolean) {
    const p = this.player, b = p.body_;
    if (full) {
      this.deaths++;
      if (this.arena) { this.unlockArena(); this.boss.reset(); }
      p.hp = HP_MAX; this.hud.setHp(p.hp); this.cameras.main.flash(250, 200, 240, 255);
      p.setPosition(this.spawn.x, this.spawn.y);
    } else p.setPosition(this.safe.x, this.safe.y);
    b.reset(p.x, p.y); b.setVelocity(0, 0); p.iT = 1;
  }
  checkpoint() {
    if (this.ending) return; audio.sfx('respawn'); const p = this.player; p.resetInput(); p.hurtT = 0; p.dashing = false; p.dashT = 0;
    p.setPosition(this.spawn.x, this.spawn.y); p.body_.setVelocity(0, 0); p.iT = 1;
    this.cameras.main.flash(200, 200, 240, 255); this.toast.show('Back to the last checkpoint.', '#ffd6f0');
  }
  update(_t: number, dms: number) {
    const dt = dms / 1000; this.time_ += dt; this.bg.update(dt);
    this.slopeSnap();
    for (const g of this.glows) g.o.setAlpha(g.base + 0.12 * Math.sin(this.time_ * g.sp + g.t * 0.01));
    if (touch.respawnP) { touch.respawnP = false; this.checkpoint(); }
    const p = this.player; if (!p || this.ending) return;
    p.update(dt); this.gun.update(dt); this.egun.update(dt);
    this.pk.update(dt, p, k => this.take(k)); this.rapT = Math.max(0, this.rapT - dt); this.powT = Math.max(0, this.powT - dt); this.gun.rapid = this.rapT; if (p.beam) { p.beam.boost = this.powT > 0 ? 1.8 : 1; p.beam.update(dt, p.x + p.facing * 16, p.y - 19, p.facing); }
    for (const e of this.enemies) if (e.active && !e.dead) e.tick(dt, p.x, p.y - 16);
    this.scam?.update(dt); this.hud.setTime(this.time_); this.hud.setGems(this.gems);
    this.hud.draw(p.hasJet ? p.fuel / JET.fuel : -1, this.arena && this.boss && !this.boss.dead ? this.boss.hp / this.boss.maxHp : -1);
    // snap player to integer for nearest
    p.x = Math.round(p.x); p.y = Math.round(p.y);
    // tiers dbg
    const tier = p.y > T1 - 40 ? 1 : p.y > T2 - 40 ? 2 : p.y > T3 - 40 ? 3 : p.y > T4 - 40 ? 4 : 5;
    if (!this.dbg.tiers.includes(tier)) this.dbg.tiers.push(tier);
    // zones by x
    const zx = p.x < 1200 ? 'dock' : p.x < 2400 ? 'gantry' : p.x < 3600 ? 'spires' : p.x < 4800 ? 'hangar' : p.x < AX0 ? 'bridge' : 'arena';
    if (!this.dbg.zones.includes(zx)) this.dbg.zones.push(zx);
    // checkpoint
    if (this.cpI < this.cps.length && p.x > this.cps[this.cpI][0] && Math.abs(p.y - this.cps[this.cpI][1]) < 140) {
      const [x, y] = this.cps[this.cpI]; this.cpLit = true; audio.sfx('checkpoint'); this.spawn = { x, y };
      this.cpLamps[this.cpI].setTint(0x6fe8ff); this.fx.explode(x, y - 40, 0.5);
      this.toast.show('Beacon lit — checkpoint.', '#6fe8ff'); this.cpI++;
    }
    // wind lifts — jet assist
    for (const w of this.winds) {
      if (p.x > w.a && p.x < w.b && p.y < w.bt && p.y > w.t) {
        p.body_.setVelocityY(Math.min(p.body_.velocity.y, -170));
        if (p.hasJet && typeof p.fuel === 'number') p.fuel = Math.min(JET.fuel, p.fuel + dt * 10);
        this.dbg.wind++;
      }
    }
    // vault levers / chests
    for (const v of this.vaults) {
      if (!v.on && Math.abs(p.x - v.lever.x) < 28 && Math.abs(p.y - v.ly) < 40) {
        v.on = true; this.dbg.vault++; audio.sfx('gate'); this.fx.explode(v.lever.x, v.lever.y - 20, 0.4);
        this.tweens.add({ targets: v.gate, y: v.gate.y - 70, alpha: 0, duration: 500, onComplete: () => { try { v.gateZ.destroy(); } catch {} } });
        this.tweens.add({ targets: v.lever, angle: -40, duration: 200 });
        this.toast.show('Hangar lock released.', '#ffd23f');
      }
      if (v.on && !v.open && Math.abs(p.x - v.chest.x) < 28 && Math.abs(p.y - v.sy) < 40) {
        v.open = true; this.gems += 5; this.hud.setGems(this.gems); audio.sfx('flower', { rate: 1.3 });
        this.fx.explode(v.chest.x, v.chest.y - 10, 0.55); v.chest.setTint(0x666666);
        this.toast.show('+5 shards from the vault.', '#6fe8ff');
      }
    }
    // secrets — dash through false wall
    for (const s of this.secrets) {
      if (!s.found && Math.abs(p.x - s.ex) < 36 && Math.abs(p.y - s.sy) < 55 && (p.dashing || Math.abs(p.body_.velocity.x) > 90 || Math.abs(p.x - s.chest.x) < 70)) {
        s.found = true; this.dbg.secret++; audio.sfx('explode');
        s.wall.forEach(w => this.tweens.add({ targets: w, alpha: 0, x: w.x + (s.ex > s.chest.x ? 20 : -20), duration: 280, onComplete: () => w.destroy() }));
        this.toast.show('Hidden hangar bay!', '#ff6fd8');
      }
      if (s.found && !s.open && Math.abs(p.x - s.chest.x) < 28 && Math.abs(p.y - s.sy) < 40) {
        s.open = true; this.gems += 8; this.hud.setGems(this.gems); audio.sfx('flower', { rate: 1.4 });
        this.fx.explode(s.chest.x, s.chest.y - 10, 0.6); s.chest.setTint(0x666666);
      }
    }
    // ring portal near arena
    if (!this.portalUsed && Math.abs(p.x - (AX0 - 200)) < 40 && Math.abs(p.y - (T2 - 40)) < 50) {
      this.portalUsed = true; this.dbg.portal++; audio.sfx('respawn'); this.fx.explode(p.x, p.y - 16, 0.5);
      p.setPosition(AX0 - 150, T1 - 4); p.body_.reset(AX0 - 150, T1 - 4);
    }
    // mid-map portal shortcut → hangar T4
    const mp = (this as any)._midPortal as { x: number; y: number } | undefined;
    if (mp && !(this as any)._midUsed && Math.abs(p.x - mp.x) < 36 && Math.abs(p.y - mp.y) < 40) {
      (this as any)._midUsed = true; this.dbg.portal++; audio.sfx('respawn'); this.fx.explode(p.x, p.y - 16, 0.5);
      p.setPosition(4500, T4 - 4); p.body_.reset(4500, T4 - 4);
    }
    // arena trigger
    if (!this.arena && !this.won && p.x > AX0 - 40) this.lockArena();
    if (p.y > WH + 40) { p.hp -= 1; this.hud.setHp(p.hp); this.fx.shake(120, 0.004); this.respawn(p.hp <= 0); }
    else if (p.hp <= 0) this.respawn(true);
  }
}
