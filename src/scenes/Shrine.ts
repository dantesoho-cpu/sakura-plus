import Phaser from 'phaser';
import { audio } from '../audio/Audio';
import { touch, showRespawnBtn } from '../systems/Touch';
import { Beam } from '../weapons/Beam';
import { Player, HP_MAX, JET } from '../player/Player';
import { Pickups, type PK } from '../systems/Pickups';
import { Cannon } from '../systems/Cannon';
import { SheetParallax, loadPx } from '../systems/SheetParallax';
import { SpeedCam } from '../systems/SpeedCam';
import { Cull } from '../systems/Cull';
import { CanvasLite } from '../systems/CanvasLite';
import { Fx } from '../systems/Fx';
import { Blaster } from '../weapons/Blaster';
import { Hud } from '../systems/Hud';
import { Toast } from '../systems/Toast';
import { FEEL } from '../tuning';
import { ShJelly, ShOrb, ShCrab, ShMech, ShBoss, shLoad, shAnims } from '../entities/Shrine';
import type { Enemy } from '../entities/Enemy';
// UNDERWATER SHRINE CAVE (chapter 2, between Akari Valley and Neo-Kyo). Every piece of art is cut from ref/shrine_sheet.png
// (tools/sh_cut.py: platforms, torii, lanterns, banners, pagoda, crystals, waterfalls, portal, chest, lever; tools/sh_half.py:
// enemies, boss, pickups, fx) and the 3 parallax tiers are regenerated from the sheet's right-hand panels (tools/v13_px.py).
// v14 layout: 5 tiers (cave floor T1, ground shelves T2, mid T3, upper ledges T4, canopy T5 under the cave ceiling) across six
// sub-zones, joined by stepping arcs, sheet ramps (walk-surface profiles), bubble lifts in waterfall shafts, a deep flooded hall
// with currents and a current loop, lever-sealed vaults and two secret alcoves behind crumbling false walls.
const S = 0.5; // sheet pieces are drawn at half size (sheet px -> logical px)
const T1 = 1180, T2 = 1000, T3 = 830, T4 = 660, T5 = 490, GY = T1;
const WW = 9600, WH = 1240, TOP = 300, AX0 = 8840, AX1 = 9580, GA = T1;
type M = { w: number; h: number; foot: number; top?: number; frames?: number; prof?: number[] };
// cave floor runs (shallow wading pools between them) — T1
const GROUND: [number, number][] = [[0, 2480], [2700, 2990], [3160, 9600]];
// deep flooded hall (swim): [x0, x1, surface y, floor y]
const DEEP: [number, number, number, number][] = [[5760, 7360, 1012, T1]];
// one-way rock shelves (sheet mossy slab tiled): [x0, x1, y]
const SHELVES: [number, number, number][] = [
  [0, 760, T2], [900, 1340, T2], [1700, 2180, T2], [2320, 3240, T2], [3240, 3900, T2], [3900, 4300, T2], [4300, 5740, T2], [7400, 8800, T2],
  [760, 1500, T3], [2320, 2800, T3], [4560, 4700, T3], [5000, 5240, T3], [7300, 7900, T3], [7900, 8500, T3],
  [1550, 2080, T4], [2600, 3300, T4], [4900, 5600, T4], [6300, 7000, T4], [8100, 8640, T4],
  [1200, 1700, T5], [2300, 2720, T5], [5200, 5650, T5], [6600, 7000, T5]];
// sheet ramps: [piece, x (left), surface y at the low end, flip]  (walk surface follows the piece's top profile)
const RAMPS: [string, number, number, boolean][] = [['p_slope_b', 1340, T2, false], ['p_slope_b', 1610, T2, true], ['p_slope_b', 4700, T3, false], ['p_slope_b', 4910, T3, true]];
// raised walk shelves the ramps lead onto: [x0, x1, y]
const RAISED: [number, number, number][] = [[1368, 1620, T2 - 30], [4728, 4920, T3 - 30]];
// stepping platforms (sheet pieces): [piece, x (left), walk-surface y]
const PLATS: [string, number, number][] = [
  // Moss Gate: T1 -> T2 steps, T2 -> T3 arc, T3 -> T4, T4 -> T5 canopy
  ['p_slab1', 800, 1110], ['p_mid', 770, 1050], ['p_mid', 600, 935], ['p_slab2', 690, 875], ['p_shrine', 1000, T3 - 2], ['p_float', 1430, 770], ['p_small', 1520, 715],
  ['p_float', 1990, 600], ['p_float', 1880, 548], ['p_hang', 1200, T5], ['p_hang', 1500, T5],
  // Falls of Ame
  ['p_mid', 2000, 930], ['p_arch1', 2420, T3 - 60], ['p_bridge', 2860, 760], ['p_slab1', 3000, 720], ['p_mid2', 3330, 600], ['p_float', 3500, 548], ['p_mid', 2520, 590], ['p_slab2', 2420, 545],
  ['p_slab1', 2560, 1120], ['p_slab1', 3000, 1060], ['p_mid', 3700, 940], ['p_mid', 3780, 880],
  // Lantern Terraces: stair arc up to T3, ramp, T4, canopy
  ['p_mid', 4300, 960], ['p_mid', 4400, 920], ['p_mid', 4490, 880], ['p_slab1', 4790, 760], ['p_slab2', 4880, 710], ['p_float', 5650, 600], ['p_float', 5560, 548], ['p_hang', 5200, T5], ['p_hang', 5420, T5],
  ['p_mid', 4160, 1120], ['p_mid', 4060, 1060], ['p_shrine', 5260, T3 - 2], ['p_arch2', 5330, T4 - 70],
  // Sunken Halls: floating stones over the flooded hall
  ['p_float', 5900, 950], ['p_float', 6080, 900], ['p_float', 6260, 840], ['p_slab1', 6200, 760], ['p_mid', 6300, 700], ['p_float', 7000, 600], ['p_float', 6900, 548], ['p_hang', 6600, T5], ['p_hang', 6810, T5],
  ['p_float', 6700, 960], ['p_float', 7120, 940],
  // Crystal Deep
  ['p_arch3', 7600, T3 - 70], ['p_slab2', 8000, 760], ['p_slab1', 8080, 710], ['p_mid', 8640, 940], ['p_mid2', 8300, 1110], ['p_slab2', 7700, 1080],
  // polish: intentional stepping stones
  ['p_float', 2150, 700], ['p_small', 3280, 650], ['p_mid', 5550, 940], ['p_float', 7250, 860], ['p_slab1', 8750, 1060],
  ['p_float', 1050, 1000], ['p_small', 2750, 820], ['p_mid', 4650, 1000], ['p_float', 6450, 780], ['p_slab2', 7900, 1000]];
// [prop, x (centre), surface y, depth, flip]
const PROPS: [string, number, number, number, boolean?][] = [
  // Moss Gate
  ['torii_red', 150, T2, 1.4], ['lantern_post', 300, T2, 1.6], ['tree', 520, T2, 1.3], ['fence', 690, T2, 1.6], ['lantern_a', 1000, T2, 1.6], ['pillar', 1220, T2, 1.3], ['banner_r', 1480, T2 - 30, 1.5],
  ['shrine_s', 1031, T3 - 2, 1.6], ['lantern_b', 860, T3, 1.6], ['tree', 1300, T3, 1.3, true], ['lantern_b', 1700, T4, 1.6], ['shrine_mini', 1900, T4, 1.6], ['cr_a', 2040, T4, 1.7],
  ['pillar', 300, T1, 1.3], ['cr_b', 470, T1, 1.7], ['shrine_orb', 1100, T1, 1.5], ['cr_ped', 1600, T1, 1.4], ['lantern_post', 1950, T1, 1.6], ['cr_a', 2350, T1, 1.7, true],
  // Falls of Ame
  ['lantern_a', 1800, T2, 1.6], ['pagoda', 2600, T2, 1.2], ['banner_r', 2950, T2, 1.5], ['lantern_b', 3100, T2, 1.6], ['torii_red', 3700, T2, 1.4], ['fence', 3560, T2, 1.6, true],
  ['lantern_b', 2400, T3, 1.6], ['shrine_orb', 2700, T3, 1.5], ['lantern_a', 2700, T4, 1.6], ['cr_c', 3200, T4, 1.7], ['lantern_b', 2400, T5, 1.6],
  ['cr_pillar', 3300, T1, 1.4], ['pillar', 2900, T1, 1.3], ['lantern_a', 3500, T1, 1.6],
  // Lantern Terraces
  ['torii_big', 4000, T2, 1.3], ['lantern_a', 4200, T2, 1.6], ['lantern_post', 4620, T2, 1.6], ['banner_r', 4880, T2, 1.5], ['lantern_b', 5150, T2, 1.6], ['pagoda', 5420, T2, 1.2], ['lantern_a', 5640, T2, 1.6, true],
  ['lantern_b', 4600, T3, 1.6], ['shrine_mini', 5120, T3, 1.6], ['shrine_s', 5291, T3 - 2, 1.6], ['lantern_post', 5000, T4, 1.6], ['tree', 5200, T4, 1.3], ['lantern_b', 5300, T5, 1.6],
  ['lantern_post', 3900, T1, 1.6], ['cr_ped', 4400, T1, 1.4], ['pillar', 4900, T1, 1.3], ['lantern_a', 5300, T1, 1.6],
  // Sunken Halls (sunken shrine on the hall floor)
  ['torii_red', 5900, T1, 1.4], ['pillar', 6150, T1, 1.3], ['shrine_orb', 6380, T1, 1.5], ['cr_tall', 6800, T1, 1.6], ['cr_b', 7220, T1, 1.7], ['lantern_b', 6400, T4, 1.6], ['lantern_a', 6900, T4, 1.6], ['cr_a', 6700, T5, 1.7],
  // Crystal Deep
  ['cr_ped', 7480, T2, 1.4], ['cr_tall', 7700, T2, 1.6], ['cr_b', 8200, T2, 1.7], ['cr_pillar', 8500, T2, 1.4], ['cr_c', 8700, T2, 1.7], ['cr_a', 7500, T3, 1.7], ['cr_tall', 8350, T3, 1.6], ['cr_c', 8200, T4, 1.7],
  ['cr_tall', 7600, T1, 1.6], ['cr_ped', 8100, T1, 1.4], ['cr_a', 8600, T1, 1.7, true],
  // Warden's Hollow
  ['torii_big', AX0 + 10, GA, 1.3], ['banner_gate', (AX0 + AX1) / 2, GA, 1.1], ['lantern_a', AX0 + 150, GA, 1.6], ['lantern_a', AX1 - 150, GA, 1.6, true], ['cr_pillar', AX1 - 60, GA, 1.4], ['pagoda', AX0 + 90, GA, 1.15],
  // polish: intentional set dressing on existing shelves / floor (flush-safe)
  ['lantern_b', 1400, T5, 1.6], ['lantern_a', 2500, T5, 1.6], ['fence', 2100, T2, 1.6], ['banner_r', 2460, T3, 1.5],
  ['lantern_post', 2650, T3, 1.6], ['tree', 4550, T2, 1.3, true], ['lantern_b', 5100, T3, 1.6], ['shrine_mini', 5450, T4, 1.6],
  ['cr_a', 6800, T5, 1.7], ['cr_b', 7600, T3, 1.7], ['lantern_a', 8300, T4, 1.6], ['fence', 7900, T2, 1.6],
  ['cr_c', 8200, T3, 1.7], ['lantern_post', 8720, T2, 1.6], ['pillar', 8600, T2, 1.3], ['banner_r', 8780, T1, 1.5],
  // round: denser shelves + ground landmarks
  ['lantern_a', 750, T2, 1.6], ['banner_r', 1100, T2, 1.5], ['fence', 1500, T1, 1.6], ['lantern_b', 2050, T4, 1.6],
  ['pagoda', 3400, T1, 1.15], ['lantern_post', 3850, T2, 1.6], ['tree', 4800, T1, 1.3], ['cr_ped', 5600, T1, 1.4],
  ['lantern_a', 6050, T1, 1.6], ['banner_r', 6500, T4, 1.5], ['shrine_mini', 7200, T1, 1.6], ['lantern_b', 8450, T1, 1.6],
  // round4 intentional dress (flush on T1/T2 shelves)
  ['lantern_a', 2180, T2, 1.55], ['banner_r', 3350, T1, 1.45], ['shrine_mini', 4750, T2, 1.5],
  ['lantern_a', 6280, T1, 1.55], ['cr_a', 7420, T1, 1.6], ['banner_r', 8920, T1, 1.45]];
// waterfalls [piece, x centre, top y, bottom y]; shafts carry bubble lifts
const FALLS: [string, number, number, number][] = [['wf_a', 840, 860, T1 + 6], ['wf_wide', 2250, 400, T1 + 6], ['wf_b', 3620, 680, T2 + 6], ['wf_a', 4520, 860, T1 + 6], ['wf_wide', 5720, 500, 1016],
  ['wf_b', 7330, 640, 1016], ['wf_a', 8020, 700, T1 + 6], ['wf_wide', (AX0 + AX1) / 2, 720, GA + 6]];
// bubble lifts [x0, x1, top y, bottom y]
const LIFTS: [number, number, number, number][] = [[2215, 2285, 440, T1], [7300, 7360, 780, T1], [8000, 8045, 610, T1]];
// currents [x0, x1, y0, y1, push]
const CURRENTS: [number, number, number, number, number][] = [[5800, 6460, 1080, 1176, 240], [6640, 7280, 1080, 1176, 220]];
const LOOP = { cx: 6560, cy: 1080, r: 74, x0: 6470, x1: 6492 };
// lever -> gate vaults [lever x, lever surface y, vault x (left), vault surface y, gate side (-1 left / 1 right)]
const VAULTS: [number, number, number, number, number][] = [[2640, T5, 3350, T2, -1], [6200, T1, 7000, T1, -1], [4500, T2, 5050, T2, 1]];
// secret alcoves behind false walls [x (left), surface y, entrance side]
const SECRETS: [number, number, number][] = [[30, T1, 1], [5480, T4, -1], [3480, T2, 1], [8120, T2, -1]];
const FLOWERS: [number, number][] = [[480, T2 - 24], [1450, T5 - 22], [2250, 470], [2700, T4 - 26], [4100, T1 - 24], [5400, T5 - 24], [6560, 1000], [7180, T1 - 24], [8400, T4 - 26], [8300, T1 - 30],
  [980, T4 - 24], [3200, T3 - 24], [5000, T2 - 24], [7800, T5 - 22], [8700, T2 - 24],
  [700, T1 - 24], [1900, T2 - 24], [3500, T1 - 24], [4600, T3 - 24], [6100, T1 - 24], [7600, T2 - 24], [8500, T3 - 24]];
// gem arcs [x0, y0, n, kind] — collectible curves following the jump arcs
const ARCS: [number, number, number, string][] = [[330, 980, 5, 'i_coin'], [600, 900, 6, 'i_gem_b'], [1440, 740, 5, 'i_coin'], [1880, 520, 4, 'i_gem_p'], [2900, 730, 7, 'i_coin'], [3440, 570, 5, 'i_gem_b'],
  [4300, 930, 8, 'i_coin'], [4800, 730, 5, 'i_gem_p'], [5900, 920, 7, 'i_gem_b'], [6300, 1120, 6, 'i_coin'], [7500, 980, 6, 'i_coin'], [8050, 690, 5, 'i_gem_p'], [1100, T1 - 30, 6, 'i_coin'], [5100, T1 - 30, 6, 'i_coin']];
const FOES: [string, number, number][] = [
  // Moss Gate — opening combat + vertical pressure
  ['crab', 420, T2], ['jelly', 860, 980], ['orb', 760, 880], ['mech', 1100, T2], ['crabl', 600, T1], ['jellyp', 1300, 1120], ['mech2', 1800, T1], ['orbs', 1200, 790], ['crab2', 1100, T3], ['jelly', 1800, 610], ['orb', 1450, 450],
  // Falls of Ame — shaft guards + bridge watch
  ['mech', 2000, T2], ['jellyb', 2250, 900], ['crab', 2700, T2], ['crabs', 2600, T3], ['orb', 2900, 620], ['jellyp', 2600, 1120], ['mechl', 3000, T1], ['mech2', 2900, T4], ['jelly', 3500, 800],
  ['orbs', 2450, 560], ['crab2', 3350, T2], ['jelly', 3100, 700],
  // Lantern Terraces — stair ambush + canopy snipers
  ['crab', 4100, T2], ['orbs', 4450, 840], ['mech', 4900, T2], ['crab2', 5100, T3], ['jellyp', 4900, 600], ['mechs', 5300, T4], ['orb', 5400, 450], ['crabl', 4600, T1], ['mech2', 5400, T1],
  ['jellyb', 4350, 980], ['mechs', 5600, T3],
  // Sunken Halls — submerged jellies + floating shelf
  ['jelly', 6000, 1100], ['jellyb', 6400, 1060], ['jellyp', 6900, 1120], ['jelly', 6700, 900], ['orb', 6600, 620], ['crabs', 6800, T4], ['orbs', 7100, 470],
  ['jellyp', 6150, 980], ['crab', 7050, T1],
  // Crystal Deep — crystal corridor pressure
  ['mech', 7700, T2], ['crab', 8100, T2], ['jellyb', 7900, 900], ['orb', 8300, 620], ['crab2', 7800, T3], ['mechl', 8400, T1], ['mechs', 8500, T4], ['jellyp', 8650, 880],
  ['orbs', 8000, 540], ['jelly', 8550, 1050],
  // Warden approach (pre-arena, outside hollow)
  ['mech2', 8750, T2], ['crab2', 8680, T1],
  // polish: fill sparse shelves / shafts
  ['jelly', 950, 700], ['orb', 2100, 750], ['crab', 3550, T1], ['jellyp', 4800, 1050],
  ['orbs', 5800, 700], ['mech', 7350, T1], ['jellyb', 8150, 780],
  // pacing: Falls→Terraces bridge + Crystal approach
  ['orb', 3750, 720], ['mech', 3900, T2], ['jelly', 4000, 900], ['crabl', 3820, T1],
  ['orbs', 7500, 540], ['crab', 7600, T2], ['jellyp', 8450, 1000]];
const ZONES: [number, string, number][] = [[0, 'Moss Gate', 0x1a5a6a], [1900, 'Falls of Ame', 0x1a4a8a], [3900, 'Lantern Terraces', 0x5a2a6a], [5700, 'Sunken Halls', 0x0a3a7a], [7400, 'Crystal Deep', 0x2a3a9a], [AX0 - 200, "Warden's Hollow", 0x1a2a5a]];
export class Shrine extends Phaser.Scene {
  player!: Player; fx!: Fx; gun!: Blaster; egun!: Blaster; enemies: Enemy[] = []; hud!: Hud; toast!: Toast; pk!: Pickups; cannon!: Cannon; scam!: SpeedCam; culler!: Cull; clite!: CanvasLite; bgp!: SheetParallax;
  solids!: Phaser.Physics.Arcade.StaticGroup; ones!: Phaser.Physics.Arcade.StaticGroup; flowers!: Phaser.Physics.Arcade.StaticGroup; gemsG!: Phaser.Physics.Arcade.StaticGroup; enemyGroup!: Phaser.Physics.Arcade.Group;
  got = 0; gems = 0; kills = 0; deaths = 0; time_ = 0; spawn = { x: 70, y: GY }; safe = { x: 70, y: GY }; lookX = 0; lookY = 0; ending = false; cpX = 2400; cpLit = false;
  rects: Phaser.Geom.Rectangle[] = []; onSlope = false; man: Record<string, M> = {}; anim: { im: Phaser.GameObjects.Image; k: string; n: number; t: number; fps: number }[] = [];
  glows: { o: Phaser.GameObjects.Image; base: number; t: number; sp: number }[] = []; chans: [number, number][] = []; bubbles: Phaser.GameObjects.Image[] = []; bubT = 0; zone = -1; grade!: Phaser.GameObjects.Rectangle;
  boss!: ShBoss; arena = false; won = false; walls: Phaser.GameObjects.Zone[] = []; arenaFx: Phaser.GameObjects.Rectangle[] = []; AX0 = AX0; AX1 = AX1; inWater = false; dbg: any = { water: 0, lever: 0, chest: 0, portal: 0, zones: [] as string[], lift: 0, current: 0, loop: 0, swim: 0, secret: 0, ramp: 0, tiers: [] as number[] };
  vaults: { lever: Phaser.GameObjects.Image; gate: Phaser.GameObjects.Image; gateZ: any; chest: Phaser.GameObjects.Image; on: boolean; open: boolean; ly: number; sy: number }[] = [];
  secrets: { wall: Phaser.GameObjects.Image[]; chest: Phaser.GameObjects.Image; sy: number; found: boolean; open: boolean; ex: number }[] = []; surf: { x: number; y: number; prof: number[]; w: number; flip: boolean }[] = [];
  deep = false; looping = -1; liftFx = 0; cps: [number, number][] = [[3800, T2], [7450, T2]]; cpI = 0; cpLamps: Phaser.GameObjects.Image[] = [];
  get lever() { return this.vaults[0].lever; } get chest() { return this.vaults[0].chest; } get leverOn() { return this.vaults[0].on; } get chestOpen() { return this.vaults[0].open; }
  portal!: Phaser.GameObjects.Image; portalB!: Phaser.GameObjects.Image; portT = 0;
  solid = { getTileAtWorldXY: (x: number, y: number) => (this.rects.some(r => r.contains(x, y)) ? { collides: true } : null) };
  constructor() { super('Shrine'); }
  preload() { loadPx(this, 'sh'); this.load.json('sh_man', 'assets/sh/manifest.json'); shLoad(this);
    for (const k of ['p_long', 'p_mid', 'p_shrine', 'p_moss', 'p_left', 'p_arch1', 'p_arch2', 'p_arch3', 'p_slab1', 'p_slab2', 'p_bridge', 'tree', 'pillar', 'banner_r', 'banner_a', 'banner_b', 'banner_gate', 'torii_red', 'torii_big', 'lantern_a', 'lantern_b', 'lantern_post', 'fence', 'pagoda', 'shrine_s', 'shrine_orb', 'shrine_mini', 'cr_a', 'cr_b', 'cr_c', 'cr_ped', 'cr_pillar', 'cr_tall', 'p_slope_a', 'p_slope_b', 'p_hang', 'p_small', 'p_arch_top', 'col', 'p_mid2', 'p_float'])
      this.load.image('sh_' + k, `assets/sh/${k}.png`);
    for (const k of ['wf_a', 'wf_b', 'wf_wide', 'pool']) for (let i = 0; i < 4; i++) this.load.image(`sh_${k}_f${i}`, `assets/sh/${k}_f${i}.png`); }
  addRect(x: number, y: number, w: number, h: number, one: boolean) { const z = this.add.zone(x + w / 2, y + h / 2, w, h); (one ? this.ones : this.solids).add(z);
    const b = z.body as Phaser.Physics.Arcade.StaticBody; if (one) { b.checkCollision.down = false; b.checkCollision.left = false; b.checkCollision.right = false; } else this.rects.push(new Phaser.Geom.Rectangle(x, y, w, h)); return z; }
  m(k: string) { return this.man[k]; }
  /** prop with its sheet foot row exactly on the surface */
  prop(k: string, x: number, sy: number, d: number, flip = false) { const m = this.m(k); return this.add.image(x, sy + (m.h - 1 - m.foot) * S, 'sh_' + k).setOrigin(0.5, 1).setScale(S).setDepth(d).setFlipX(flip); }
  plat(k: string, x: number, sy: number, d = 2) { const m = this.m(k); const im = this.add.image(x, sy - (m.top || 0) * S, 'sh_' + k).setOrigin(0, 0).setScale(S).setDepth(d); this.addRect(x + 3, sy, m.w * S - 6, 10, true); return im; }
  /** the sheet's mossy slab tiled along [a,b] at y (alternate flips hide the repeat) */
  tileTop(a: number, b: number, y: number, d = 2) { const gm = this.m('p_long'), gw = gm.w * S - 8;
    for (let x = a - 4, j = 0; x < b - 4; x += gw, j++) { const w = Math.min(gw + 8, b + 4 - x); this.add.image(x, y - (gm.top || 0) * S, 'sh_p_long').setOrigin(0, 0).setScale(S).setDepth(d).setFlipX(!!(j & 1) && w > gw).setCrop(0, 0, w / S, gm.h); }
    // sheet end-caps hide the cut edges of the tiled moss slab
    if (this.textures.exists('sh_p_left')) {
      const lm = this.m('p_left');
      this.add.image(a - 2, y + (lm.h - 1 - lm.foot) * S, 'sh_p_left').setOrigin(0.5, 1).setScale(S * 0.85).setDepth(d + 0.05);
      this.add.image(b + 2, y + (lm.h - 1 - lm.foot) * S, 'sh_p_left').setOrigin(0.5, 1).setScale(S * 0.85).setFlipX(true).setDepth(d + 0.05);
    } }
  /** walk-surface y of the sheet ramps at x (or Infinity) */
  rampY(x: number) { for (const r of this.surf) { if (x < r.x || x > r.x + r.w) continue; let u = (x - r.x) / S; if (r.flip) u = r.w / S - u; const i = Math.min(r.prof.length - 1, Math.max(0, Math.round(u / 4))); return r.y + r.prof[i] * S; } return Infinity; }
  slopeSnap() { const p = this.player, b = p?.body_; this.onSlope = false; if (!b || !b.enable || b.velocity.y < 0 || this.looping >= 0) return;
    const feet = b.bottom; let sy = Infinity; for (const x of [b.left + 2, b.right - 2, b.center.x]) sy = Math.min(sy, this.rampY(x)); if (sy === Infinity) return;
    const dy = sy - feet; if (dy > -12 && dy < 6) { b.y += dy; b.velocity.y = 0; b.blocked.down = b.touching.down = true; this.onSlope = true; } }
  /** vault: arch lintel + sheet columns; a lever-raised gate (or a false wall) seals one side; chest inside */
  vault(x: number, sy: number, side: number, secret: boolean) { const W = 96, H = 64, colM = this.m('col'), am = this.m('p_arch_top');
    this.addRect(x - 10, sy - H - 14, W + 20, 16, false); this.add.image(x + W / 2, sy - H - 18, 'sh_p_arch_top').setOrigin(0.5, 0).setScale((W + 24) / am.w, S).setDepth(6.6);
    this.add.rectangle(x, sy - H, W, H, 0x050c18, 0.88).setOrigin(0, 0).setDepth(1.8);
    const cs = H / (colM.h * S); for (const [cx, sd] of [[x - 4, -1], [x + W + 4, 1]] as [number, number][]) { if (sd === side) continue; this.addRect(cx - 8, sy - H, 16, H, false); this.add.image(cx, sy + 1, 'sh_col').setOrigin(0.5, 1).setScale(S, S * cs).setDepth(6.5); }
    const chest = this.add.image(x + W / 2 - side * 16, sy + 1, 'sh_x_chest').setOrigin(0.5, 1).setDepth(2.5); const gx = side < 0 ? x - 4 : x + W + 4;
    const g = this.add.image(chest.x, sy - 30, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd27a).setScale(0.6).setAlpha(0.3).setDepth(2.4); this.glows.push({ o: g, base: 0.3, t: x, sp: 2 });
    if (secret) { const ws: Phaser.GameObjects.Image[] = [];       for (let i = 0; i < 2; i++) ws.push(this.add.image(gx + side * 4, sy + 1 - i * 31, 'sh_p_left').setOrigin(0.5, 1).setScale(S * 0.62, S * 0.62).setFlipX(side > 0).setTint(0xb8c4d8).setDepth(9.2));
      ws.push(this.add.image(gx + side * 10, sy - H / 2, 'sh_col').setScale(S * 1.6, S * cs).setTint(0x7a88a8).setDepth(9.1));
      this.secrets.push({ wall: ws, chest, sy, found: false, open: false, ex: gx }); return; }
    const gate = this.add.image(gx, sy + 2, 'sh_x_gate2').setOrigin(0.5, 1).setScale(0.7, H / 46).setDepth(6.5); const gateZ = this.addRect(gx - 8, sy - H, 16, H, false);
    this.vaults.push({ lever: null as any, gate, gateZ, chest, on: false, open: false, ly: 0, sy }); }
  create() {
    this.man = this.cache.json.get('sh_man'); this.got = 0; this.gems = 0; this.kills = 0; this.deaths = 0; this.time_ = 0; this.ending = false; this.cpLit = false; this.rects = []; this.anim = []; this.glows = []; this.chans = []; this.bubbles = []; this.zone = -1;
    this.enemies = []; this.arena = false; this.won = false; this.walls = []; this.arenaFx = []; this.vaults = []; this.secrets = []; this.surf = []; this.cpI = 0; this.cpLamps = []; this.looping = -1; this.deep = false;
    this.spawn = { x: 80, y: T2 }; this.dbg = { water: 0, lever: 0, chest: 0, portal: 0, zones: [], lift: 0, current: 0, loop: 0, swim: 0, secret: 0, ramp: 0, tiers: [] as number[] } as any;
    this.physics.world.setBounds(0, TOP - 200, WW, WH + 200 - TOP + 200); this.physics.world.setBoundsCollision(true, true, false, false);
    this.add.rectangle(240, 135, 480, 270, 0x06142a).setScrollFactor(0).setDepth(-100);
    this.bgp = new SheetParallax(this, 'sh', -95, () => { const c = this.cameras.main, b = c.getBounds(); return b.height > 270 ? Phaser.Math.Clamp((c.scrollY - b.y) / (b.height - 270), 0, 1) - 0.5 : 0; });
    this.grade = this.add.rectangle(240, 135, 480, 270, ZONES[0][2], 0.16).setScrollFactor(0).setDepth(-80);
    for (let i = 0; i < 5; i++) { const r = this.add.image(60 + i * 100, 40, 'glow').setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD).setTint(0x7fe8ff).setScale(0.5, 6).setAngle(14).setAlpha(0.06).setDepth(-79); this.glows.push({ o: r, base: 0.06, t: i * 1.7, sp: 0.6 + i * 0.13 }); }
    this.solids = this.physics.add.staticGroup(); this.ones = this.physics.add.staticGroup(); this.flowers = this.physics.add.staticGroup(); this.gemsG = this.physics.add.staticGroup();
    // cave ceiling: dark rock band with the sheet's hanging-moss ledge as its underside
    this.add.rectangle(0, TOP - 200, WW, 140 + 200, 0x040a16).setOrigin(0, 0).setDepth(1.5); const hm = this.m('p_hang');
    for (let x = -20, j = 0; x < WW; x += hm.w * S - 6, j++) this.add.image(x, TOP + 134 - hm.h * S, 'sh_p_hang').setOrigin(0, 0).setScale(S).setFlipY(true).setFlipX(!!(j & 1)).setTint(0x8a98b8).setDepth(1.55);
    // T1 cave floor + shallow wading pools
    for (const [a, b] of GROUND) { this.add.rectangle(a, T1 + 10, b - a, WH - T1 + 60, 0x06101e).setOrigin(0, 0).setDepth(1.9); this.tileTop(a, b, T1); this.addRect(a, T1, b - a, WH - T1 + 60, false); }
    for (let i = 0; i < GROUND.length - 1; i++) { const a = GROUND[i][1], b = GROUND[i + 1][0]; this.chans.push([a, b]); this.addRect(a, T1 + 34, b - a, 80, false);
      this.add.rectangle(a, T1 + 4, b - a, 80, 0x0e4a7a, 0.62).setOrigin(0, 0).setDepth(7.5); const sf = this.add.rectangle(a, T1 + 3, b - a, 2, 0x9ff4ff, 0.7).setOrigin(0, 0).setDepth(7.6).setBlendMode(Phaser.BlendModes.ADD); this.glows.push({ o: sf as any, base: 0.55, t: i, sp: 3 });
      const pl = this.add.image((a + b) / 2, T1 + 40, 'sh_pool_f0').setOrigin(0.5, 1).setScale(((b - a) + 16) / this.m('pool').w, 0.35).setDepth(7.4).setAlpha(0.55); this.anim.push({ im: pl, k: 'sh_pool_f', n: 4, t: i * 0.1, fps: 6 }); }
    // rock shelves (T2..T5): mossy slab tops, hanging moss beneath
    for (const [a, b, y] of SHELVES) { this.tileTop(a, b, y, y === T2 ? 2 : 2.1); this.addRect(a, y, b - a, 10, true); }
    for (const [a, b, y] of RAISED) { this.tileTop(a, b, y, 2.2); this.addRect(a, y, b - a, 10, true); }
    // sheet ramps: drawn from the sheet piece, walked on its own top profile
    for (const [k, x, low, flip] of RAMPS) { const m = this.m(k), pr = m.prof!, hi = Math.min(...pr), lo = Math.max(...pr.slice(flip ? -4 : 0, flip ? undefined : 4)); const y = low - lo * S;
      this.add.image(x, y, 'sh_' + k).setOrigin(0, 0).setScale(S).setFlipX(flip).setDepth(2.3); this.surf.push({ x, y, prof: pr, w: m.w * S, flip }); void hi; }
    // flooded hall: deep water body, rippling surface, caustic floor light; basin walls
    for (const [a, b, sy, fy] of DEEP) { this.add.rectangle(a, sy, b - a, fy - sy + 40, 0x0a3a6e, 0.55).setOrigin(0, 0).setDepth(7.45);
      for (let x = a, i = 0; x < b; x += 40, i++) { const w = this.add.rectangle(x, sy, 40, 2, 0x9ff4ff, 0.6).setOrigin(0, 0).setDepth(7.6).setBlendMode(Phaser.BlendModes.ADD); this.tweens.add({ targets: w, y: sy + 2, alpha: 0.25, yoyo: true, repeat: -1, duration: 700 + (i % 5) * 90, delay: i * 60, ease: 'Sine.inOut' }); }
      for (let x = a + 30; x < b; x += 90) { const c = this.add.image(x, fy - 6, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x6fe8ff).setScale(1.4, 0.25).setAlpha(0.2).setDepth(7.42); this.glows.push({ o: c, base: 0.22, t: x, sp: 1.7 }); }
      this.addRect(a - 20, sy - 12, 20, fy - sy + 12, false); this.addRect(b, T2, 40, fy - T2, false); }
    for (const [k, x, y] of PLATS) this.plat(k, x, y);
    for (const [k, x, y, d, f] of PROPS) { const im = this.prop(k, x, y, d, f); if (k.startsWith('lantern') || k === 'shrine_orb' || k.startsWith('cr_')) {
      const cr = k.startsWith('cr_'), g = this.add.image(x, im.y - im.displayHeight * (cr ? 0.5 : 0.62), 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(cr ? 0x9a7aff : k === 'shrine_orb' ? 0x6fe8ff : 0xffb25a).setScale(cr ? 0.9 : 0.6).setAlpha(0.35).setDepth(d + 0.05);
      if (cr) { this.glows.push({ o: g, base: 0.38, t: x, sp: 1.3 }); this.tweens.add({ targets: g, scale: { from: 0.8, to: 1.05 }, yoyo: true, repeat: -1, duration: 1400 + x % 600, ease: 'Sine.inOut' }); this.tweens.add({ targets: im, alpha: { from: 1, to: 0.86 }, yoyo: true, repeat: -1, duration: 1400 + x % 600, ease: 'Sine.inOut' }); }
      else (g as any).__flick = 1, this.glows.push({ o: g, base: 0.36, t: x, sp: 4 }); }
      if (k.startsWith('torii') || k === 'pagoda' || k.startsWith('shrine_')) {
        this.tweens.add({ targets: im, y: im.y - 1.5, yoyo: true, repeat: -1, duration: 2200 + (x % 500), ease: 'Sine.inOut' });
      } }
    for (const [k, x, y] of [['banner_a', 1350, T3 + 6], ['banner_b', 2440, T3 + 6], ['banner_a', 2720, T4 + 6], ['banner_b', 4620, T3 + 6], ['banner_a', 5100, T4 + 6], ['banner_b', 5560, T4 + 6], ['banner_a', 6450, T4 + 6], ['banner_b', 7700, T3 + 6], ['banner_a', 1700, T4 + 6]] as [string, number, number][]) {
      const im = this.add.image(x, y, 'sh_' + k).setOrigin(0.5, 0).setScale(S).setDepth(1.8); this.tweens.add({ targets: im, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 1700 + x % 500, ease: 'Sine.inOut' }); this.tweens.add({ targets: im, scaleX: { from: S, to: S * 0.94 }, yoyo: true, repeat: -1, duration: 1100 + x % 300, ease: 'Sine.inOut' }); }
    for (const [k, x, t, b] of FALLS) { const m = this.m(k), seg = m.h * S - 2; // tiled at native scale (no stretch); each segment animates out of phase
      for (let y = t, j = 0; y < b; y += seg, j++) { const hh = Math.min(seg + 2, b - y), im = this.add.image(x, y, `sh_${k}_f0`).setOrigin(0.5, 0).setScale(S).setCrop(0, 0, m.w, hh / S).setDepth(1.7).setAlpha(0.9); this.anim.push({ im, k: `sh_${k}_f`, n: 4, t: x * 0.01 + j * 0.37, fps: 9 }); }
      const sp = this.add.image(x, b - 2, 'sh_fx_splash').setOrigin(0.5, 1).setDepth(7.7).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7); this.tweens.add({ targets: sp, scaleX: { from: 0.8, to: 1.25 }, scaleY: { from: 1.1, to: 0.7 }, alpha: { from: 0.75, to: 0.35 }, yoyo: true, repeat: -1, duration: 260 + x % 120 }); }
    // bubble lifts: glowing column; currents: drifting streaks; loop: ring of bubbles
    for (const [a, b, t, bt] of LIFTS) { const c = this.add.rectangle(a, t, b - a, bt - t, 0x6fe8ff, 0.07).setOrigin(0, 0).setDepth(1.75).setBlendMode(Phaser.BlendModes.ADD); this.glows.push({ o: c as any, base: 0.08, t: a, sp: 2.5 }); }
    { const ring = this.add.container(LOOP.cx, LOOP.cy).setDepth(7.7); for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; ring.add(this.add.image(Math.sin(a) * LOOP.r, Math.cos(a) * LOOP.r, 'sh_fx_bub').setScale(0.45).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD)); }
      this.tweens.add({ targets: ring, angle: -360, repeat: -1, duration: 3000 }); }
    this.fx = new Fx(this); this.gun = new Blaster(this, 'p', 'shot'); this.egun = new Blaster(this, 'e', 'ebolt', { cooldown: 0, speed: 150, life: 3 });
    for (const [x, y] of this.cps) this.cpLamps.push(this.add.image(x, y - 30, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x445566).setScale(0.9).setDepth(1.7)); this.cpLamp = this.cpLamps[0];
    for (const [x, y] of FLOWERS) { const f = this.flowers.create(x, y, 'petal') as any; f.setScale(2).setDepth(6); f.refreshBody(); this.tweens.add({ targets: f, y: y - 4, yoyo: true, repeat: -1, duration: 900 + Math.random() * 400, ease: 'Sine.inOut' });
      this.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff8fd0).setScale(0.3).setAlpha(0.4).setDepth(5.9); }
    for (const [x0, y0, n, k] of ARCS) for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) : 0.5, g = this.gemsG.create(x0 + i * 18, y0 - Math.sin(u * Math.PI) * 26, 'sh_' + k) as any; g.setDepth(6); g.refreshBody(); g.kind = k;
      this.tweens.add({ targets: g, scaleX: { from: 1, to: k === 'i_coin' ? 0.25 : 0.85 }, yoyo: true, repeat: -1, duration: 500 + i * 30, ease: 'Sine.inOut' }); }
    this.pk = new Pickups(this, (x, y) => this.groundAt(x, y)); this.pk.add('heart', 1700, T4 - 20); this.pk.add('rapid', 1040, T3 - 40); this.pk.add('power', 5300, T5 - 20); this.pk.add('heart', AX0 - 60, GA - 10); this.pk.add('heart', 7450, T2 - 12); this.pk.add('rapid', 2500, T5 - 20);
    this.player = new Player(this, this.spawn.x, this.spawn.y); this.player.gun = this.gun; this.player.hasJet = true;
    this.cannon = new Cannon(this, this.player, () => this.enemies, () => this.egun.shots.getChildren().forEach((o: any) => { if (o.active) this.egun.kill(o); })); this.pk.add('cannon', 4400, T1 - 8);
    this.player.beam = new Beam(this, this.fx, () => this.enemies, (x, y) => !!this.solid.getTileAtWorldXY(x, y)); this.player.beam.owner = this.player; this.safe = { ...this.spawn };
    this.physics.add.collider(this.player, this.solids); this.physics.add.collider(this.player, this.ones);
    this.physics.world.on('worldstep', () => this.slopeSnap());
    this.physics.add.overlap(this.player, this.flowers, (_p, f: any) => this.collect(f));
    this.physics.add.overlap(this.player, this.gemsG, (_p, g: any) => this.gem(g));
    this.physics.add.collider(this.gun.shots, this.solids, (s: any) => { this.fx.spark(s.x, s.y); this.gun.kill(s); });
    this.interactables();
    shAnims(this); this.enemyGroup = this.physics.add.group({ allowGravity: false });
    for (const [k, x, y] of FOES) this.spawnFoe(k, x, y);
    this.boss = new ShBoss(this, (AX0 + AX1) / 2, GA - 130, this.fx, this.egun, GA); this.enemies.push(this.boss); this.enemyGroup.add(this.boss); this.boss.b.setAllowGravity(false);
    this.boss.escorts = () => this.enemies.filter(e => (e as any).escort && e.active && !e.dead).length;
    this.boss.summon = (x, y) => { const e = this.spawnFoe('jellyp', x, y); (e as any).escort = true; e.setAlpha(0); this.tweens.add({ targets: e, alpha: 0.92, duration: 400 }); };
    this.boss.onDead = () => this.win();
    for (const gx of [AX0, AX1]) this.arenaFx.push(this.add.rectangle(gx, GA - 135, 6, 270, 0x6fe8ff, 0).setDepth(9).setBlendMode(Phaser.BlendModes.ADD));
    const walk = (e: any) => e.kind !== 'drone' && e.kind !== 'boss';
    this.physics.add.collider(this.enemyGroup, this.solids, undefined, walk); this.physics.add.collider(this.enemyGroup, this.ones, undefined, walk);
    this.physics.add.overlap(this.gun.shots, this.enemyGroup, (s: any, e: any) => { if (!s.active || e.dead || s.lastE === e) return; s.lastE = e; const d = s.body.velocity.x > 0 ? 1 : -1;
      this.fx.spark(s.x, s.y); if (s.pierce > 0) s.pierce--; else this.gun.kill(s); e.hit((s.damage || 1) * (this.powT > 0 ? 2 : 1), d); });
    const hurt = () => { this.fx.hitStop(FEEL.hurt.stop); this.fx.shake(FEEL.hurt.shakeMs, FEEL.hurt.shakeI); };
    this.physics.add.overlap(this.player, this.enemyGroup, (_p, e: any) => { if (!e.dead && (e.kind !== 'boss' || e.awake) && this.player.damage(e.x)) hurt(); });
    this.physics.add.overlap(this.player, this.egun.shots, (_p, s: any) => { if (s.active && this.player.damage(s.x)) { this.egun.kill(s); hurt(); } });
    this.physics.add.collider(this.egun.shots, this.solids, (s: any) => { this.fx.spark(s.x, s.y); this.egun.kill(s); });
    this.hud = new Hud(this, HP_MAX, true); this.hud.setHp(this.player.hp); this.player.on('hurt', (hp: number) => this.hud.setHp(hp)); this.toast = new Toast(this);
    { const key = 'sh_vig'; if (!this.textures.exists(key)) { const c = this.textures.createCanvas(key, 240, 135)!, x = c.getContext(), g = x.createRadialGradient(120, 68, 40, 120, 68, 150); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(2,6,20,1)'); x.fillStyle = g; x.fillRect(0, 0, 240, 135); c.refresh(); }
      this.vig = this.add.image(240, 135, key).setScrollFactor(0).setDisplaySize(480, 270).setDepth(40).setAlpha(0.45); }
    const cam = this.cameras.main; cam.setBounds(0, TOP, WW, WH - TOP); cam.startFollow(this.player, true, FEEL.cam.lerp, FEEL.cam.lerp, 0, 30); this.scam = new SpeedCam(this, this.player, FEEL.cam.lerp); this.culler = new Cull(this);
    this.time.delayedCall(0, () => { const P: any = this.player; this.clite = new CanvasLite(this, [P.trail, P.jetFx, P.jetPetals, P.pfx?.shimmer]); });
    cam.setDeadzone(FEEL.cam.deadW, FEEL.cam.deadH); cam.setRoundPixels(false); cam.fadeIn(450);
    const kb = this.input.keyboard!;
    const pause = () => { if (this.ending) return; audio.stopLoops(); audio.sfx('menu'); this.scene.launch('Pause', { lvl: 'Shrine' }); this.scene.pause(); };
    kb.on('keydown-P', pause); kb.on('keydown-ESC', pause); kb.on('keydown-R', () => this.checkpoint()); kb.on('keydown-BACKSPACE', () => this.checkpoint());
    const clear = () => this.player?.resetInput();
    this.events.on('resume', clear); this.events.on('pause', clear); this.game.events.on('blur', clear); this.game.events.on('hidden', clear);
    showRespawnBtn(true); this.events.once('shutdown', () => { audio.stopLoops(); showRespawnBtn(false); this.game.events.off('blur', clear); this.game.events.off('hidden', clear); });
    this.toast.show('The Shrine Cave. The old gods sleep under the water.', '#bff4ff');
    (window as any).__lvl = this;
  }
  vig!: Phaser.GameObjects.Image; cpLamp!: Phaser.GameObjects.Image; rapT = 0; powT = 0;
  spawnFoe(k: string, x: number, y: number) { const C: any = k.startsWith('jelly') ? ShJelly : k.startsWith('orb') ? ShOrb : k.startsWith('crab') ? ShCrab : ShMech;
    const e: Enemy = new C(this, x, y, this.fx, this.egun, k); this.enemies.push(e); this.enemyGroup.add(e); e.b.setAllowGravity(false); if (e instanceof ShCrab || e instanceof ShMech) e.b.setMaxVelocityY?.(600);
    e.on('destroyed', (z: Enemy) => { this.kills++; if (k === 'jellyb' && !(z as any).escort) for (const d of [-1, 1]) this.time.delayedCall(0, () => this.spawnFoe('jelly', z.x + d * 14, z.y));
      if (this.kills % 4 === 0 || this.player.hp <= 2 && Math.random() < 0.5) this.pk.add(this.kills % 12 === 0 ? 'power' : 'heart', z.x, z.y - 10, true); }); return e; }
  interactables() {
    for (const [lx, ly, vx, vy, side] of VAULTS) { this.vault(vx, vy, side, false); const v = this.vaults[this.vaults.length - 1]; v.ly = ly; v.lever = this.add.image(lx, ly + 1, 'sh_x_switch').setOrigin(0.5, 1).setDepth(2.5);
      const g = this.add.image(lx, ly - 20, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xc89aff).setScale(0.5).setAlpha(0.4).setDepth(2.4); this.glows.push({ o: g, base: 0.4, t: lx, sp: 3 }); }
    for (const [x, y, side] of SECRETS) this.vault(x, y, side, true);
    // portal on the Crystal Deep upper ledge: a rift straight to the Warden's hollow
    this.add.image(8450, T4 + 1, 'sh_x_portal_ped').setOrigin(0.5, 1).setDepth(2.4);
    this.portal = this.add.image(8450, T4 - 52, 'sh_x_portal').setDepth(2.3).setBlendMode(Phaser.BlendModes.ADD); this.tweens.add({ targets: this.portal, angle: 360, repeat: -1, duration: 6000 });
    this.portalB = this.add.image(8450, T4 - 52, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x9a7aff).setScale(1.6).setAlpha(0.4).setDepth(2.2);
    this.add.image(AX0 - 110, GA + 1, 'sh_x_lantern').setOrigin(0.5, 1).setDepth(1.6); }
  pull(i = 0) { const v = this.vaults[i]; if (v.on) return; v.on = true; this.dbg.lever++; audio.sfx('gate'); v.lever.setFlipX(true); this.tweens.add({ targets: v.lever, scaleY: { from: 0.8, to: 1 }, duration: 200, ease: 'Back.out' });
    this.toast.show(i ? 'Deep in the hall, a vault seal lifts.' : 'Somewhere below, a gate grinds open.', '#bff4ff'); this.cameras.main.shake(160, 0.003);
    this.tweens.add({ targets: v.gate, y: v.sy - 70, alpha: 0, duration: 900, ease: 'Quad.in' }); const r = v.gateZ.body; this.rects = this.rects.filter(q => !(q.x === r.x && q.y === r.y)); this.solids.remove(v.gateZ, true, true); }
  loot(x: number, sy: number, n: number) { audio.sfx('flower'); this.fx.explode(x, sy - 12, 0.5); this.pk.add('heart', x - 14, sy - 24, true);
    for (let i = 0; i < n; i++) { const a = -Math.PI * (0.15 + 0.7 * i / (n - 1)), g = this.gemsG.create(x, sy - 14, 'sh_i_gem_p') as any; g.kind = 'i_gem_p'; g.setDepth(6);
      this.tweens.add({ targets: g, x: x + Math.cos(a) * 40, y: sy - 14 + Math.sin(a) * 34, duration: 420, ease: 'Quad.out', onComplete: () => { if (g.body) g.refreshBody(); } }); } }
  open(i = 0) { const v = this.vaults[i]; if (v.open || !v.on) return; v.open = true; this.dbg.chest++; this.tweens.add({ targets: v.chest, scaleY: { from: 1.3, to: 1 }, scaleX: { from: 0.8, to: 1 }, duration: 260, ease: 'Back.out' });
    this.loot(v.chest.x, v.sy, 8); this.toast.show('Shrine offering: +8 shards', '#d8b4ff'); }
  warp() { const p = this.player; this.dbg.portal++; audio.sfx('respawn'); this.fx.explode(p.x, p.y - 16, 0.6); p.setPosition(AX0 - 150, GA); p.body_.reset(AX0 - 150, GA); p.body_.setVelocity(0, 0); p.iT = 0.6;
    this.cameras.main.flash(260, 150, 120, 255); this.toast.show('The rift carries you to the Warden.', '#d8b4ff'); }
  bubble(x: number, y: number, near: boolean, rise = 60) { const bb = this.add.image(x, y, 'sh_fx_bub').setScale(0.25 + Math.random() * 0.35).setAlpha(0.75).setDepth(near ? 7.8 : 1.76).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: bb, y: y - rise, x: x + Phaser.Math.Between(-6, 6), alpha: near ? 0 : 0.2, duration: near ? 600 : rise * 7, ease: 'Sine.out', onComplete: () => bb.destroy() }); }
  /** current loop: the flow carries Sakura once around the ring (bottom -> right -> top -> left -> bottom) and flings her on */
  loopStep(dt: number) { const p = this.player, b = p.body_; this.looping += dt / 1.1; const a = Math.min(1, this.looping) * Math.PI * 2;
    const x = LOOP.cx + Math.sin(a) * LOOP.r, y = LOOP.cy + Math.cos(a) * LOOP.r + 12; b.reset(x, y); p.setAngle(-a * 180 / Math.PI); p.setFlipX(false);
    if (Math.random() < 0.5) this.bubble(x, y - 8, true);
    if (this.looping >= 1) { this.looping = -1; p.locked = false; p.setAngle(0); p.setPosition(LOOP.cx + 4, LOOP.cy + LOOP.r + 12); b.reset(LOOP.cx + 4, LOOP.cy + LOOP.r + 12); b.setVelocity(320, -40); p.facing = 1; } }
  gem(g: any) { if (!g.active || !g.body) return; this.gems += g.kind === 'i_gem_b' ? 3 : g.kind === 'i_gem_p' ? 1 : 1; audio.sfx('flower', { rate: 1.6, vol: 0.4 }); this.fx.spark(g.x, g.y);
    const r = this.add.image(g.x, g.y, 'sh_fx_ring').setBlendMode(Phaser.BlendModes.ADD).setDepth(12).setScale(0.4); this.tweens.add({ targets: r, scale: 1.2, alpha: 0, duration: 280, onComplete: () => r.destroy() }); g.destroy(); }
  lockArena() { this.arena = true; for (const x of [AX0 - 8, AX1]) { const z = this.add.zone(x + 4, GA - 300, 8, 600); this.physics.add.existing(z, true); this.physics.add.collider(this.player, z); this.walls.push(z); }
    this.cameras.main.setBounds(AX0 - 10, GA + 60 - 270, AX1 - AX0 + 20, 270); this.arenaFx.forEach(r => r.setFillStyle(0x6fe8ff, 0.5)); this.hud.setBossName('ABYSS WARDEN'); this.boss.wake(); audio.sfx('gate');
    this.toast.show('ABYSS WARDEN — keeper of the sunken shrine.', '#6fe8ff'); }
  unlockArena() { this.arena = false; for (const z of this.walls) z.destroy(); this.walls = []; this.cameras.main.setBounds(0, TOP, WW, WH - TOP); this.arenaFx.forEach(r => r.setFillStyle(0x6fe8ff, 0)); this.hud.draw(-1, -1); }
  win() { if (this.won) return; this.won = true; this.unlockArena(); this.enemies.filter(e => (e as any).escort).forEach(e => e.active && !e.dead && e.die()); this.egun.shots.getChildren().forEach((o: any) => o.active && this.egun.kill(o));
    this.toast.show('The Warden sinks. The shrine lanterns relight.', '#ffd23f'); this.ending = true; this.player.resetInput();
    this.time.delayedCall(2600, () => { this.cameras.main.fadeOut(800, 200, 240, 255); this.time.delayedCall(850, () => this.scene.start('Victory', { time: this.time_, got: this.got, kills: this.kills, deaths: this.deaths, ch: 2, gems: this.gems })); }); }
  groundAt(x: number, y0: number) { let best = -1; for (const b of [...this.solids.getChildren(), ...this.ones.getChildren()] as any[]) { const r = b.body; if (x >= r.x && x <= r.right && r.y >= y0 && (best < 0 || r.y < best)) best = r.y; } return best; }
  collect(f: any) { if (!f.active) return; audio.sfx('flower'); f.destroy(); this.got++; this.hud.setMem(this.got); this.fx.spark(f.x, f.y); this.player.trail?.explode?.(14, f.x, f.y); if (this.got === 10) this.toast.show('All ten petals of the Shrine Cave.', '#ffd6f0'); }
  take(k: PK) { const p = this.player; if (k === 'heart') { if (p.hp >= HP_MAX) return false; p.hp = Math.min(HP_MAX, p.hp + 1); this.hud.setHp(p.hp); this.toast.show('+1 HP', '#ff8fb8'); return true; }
    if (k === 'cannon') { this.cannon.give(); this.toast.show('MEGA CANNON — press C', '#ff9a3f'); return true; }
    this.toast.show(k === 'rapid' ? 'RAPID FIRE' : 'POWER BEAM', k === 'rapid' ? '#3ff3ff' : '#ffd23f'); if (k === 'rapid') this.rapT = 12; else this.powT = 12; return true; }
  respawn(full: boolean) { const p = this.player, b = p.body_;
    if (full) { this.deaths++; if (this.arena) { this.unlockArena(); this.boss.reset(); this.enemies.filter(e => (e as any).escort).forEach(e => e.active && e.destroy()); } p.hp = HP_MAX; this.hud.setHp(p.hp); this.cameras.main.flash(250, 200, 240, 255); p.setPosition(this.spawn.x, this.spawn.y); } else p.setPosition(this.safe.x, this.safe.y);
    b.setVelocity(0, 0); p.iT = 1; this.cameras.main.centerOn(p.x, p.y - 30); this.cameras.main.fadeIn(full ? 320 : 200, 200, 240, 255); p.burst(); }
  checkpoint() { if (this.ending) return; audio.sfx('respawn'); const p = this.player; p.resetInput(); p.hurtT = 0; p.dashing = false; p.dashT = 0;
    p.setPosition(this.spawn.x, this.spawn.y); p.body_.setVelocity(0, 0); p.iT = 1; this.cameras.main.flash(200, 200, 240, 255); this.toast.show('Back to the last checkpoint.', '#ffd6f0'); }
  update(_t: number, dms: number) { this.fx.tick(); const dt = Math.min(dms, 50) / 1000, p = this.player, cam = this.cameras.main; this.time_ += dt; this.hud.setTime(this.time_);
    if (touch.respawnP) { touch.respawnP = false; this.checkpoint(); }
    // deep water: swim strokes on jump (consumed before the player's own jump logic), slow sink
    { const b = p.body_; const d = DEEP.some(([a, c, sy, fy]) => p.x > a && p.x < c && p.y > sy + 6 && p.y < fy + 4); if (d && !this.deep) { this.dbg.water++; this.fx.spark(p.x, p.y - 8); audio.sfx('jump', { rate: 0.5, vol: 0.35 }); } this.deep = d;
      if (d && p.jumpPressed && this.looping < 0) { p.jumpPressed = false; b.setVelocityY(-215); this.dbg.swim++; for (let i = 0; i < 3; i++) this.bubble(p.x + Phaser.Math.Between(-5, 5), p.y - 8, true); } }
    if (this.looping >= 0) this.loopStep(dt); else p.update(dt);
    if (this.deep && this.looping < 0) { const b = p.body_; b.velocity.x *= 0.94; b.velocity.y = Phaser.Math.Clamp(b.velocity.y * 0.9, -240, 60); }
    // bubble lifts + currents + the current loop
    { const b = p.body_; let inLift = false; for (const [a, c, t, bt] of LIFTS) if (p.x > a && p.x < c && p.y > t && p.y < bt + 4) { b.setVelocityY(Math.max(b.velocity.y - 1700 * dt, -250)); if (p.y < t + 30) b.setVelocityY(Math.min(b.velocity.y, -160)); p.y -= (p.y < t + 30 ? 90 : 170) * dt; this.dbg.lift++; inLift = true; }
      b.checkCollision.up = !inLift;
      let inCur = false; for (const [a, c, t, bt, f] of CURRENTS) if (this.looping < 0 && p.x > a && p.x < c && p.y > t && p.y < bt + 4) { p.x += f * 0.6 * dt; b.velocity.x = Phaser.Math.Clamp(b.velocity.x + f * 3 * dt, -200, f * 1.2); inCur = true; this.dbg.current++; }
      if (this.looping < 0 && p.x > LOOP.x0 && p.x < LOOP.x1 && p.y > LOOP.cy + LOOP.r - 30 && p.y < LOOP.cy + LOOP.r + 36 && (b.velocity.x > 10 || inCur)) { this.looping = 0; this.dbg.loop++; p.locked = true; audio.sfx('dash'); } }
    if ((this.liftFx -= dt) <= 0) { this.liftFx = 0.09; const wv = cam.worldView; for (const [a, c, t, bt] of LIFTS) if (a < wv.right + 20 && c > wv.x - 20) this.bubble(Phaser.Math.Between(a, c), Math.min(bt, wv.bottom + 10), false, bt - Math.max(t, wv.y - 40));
      for (const [a, c, t, bt] of CURRENTS) if (a < wv.right && c > wv.x) { const y = Phaser.Math.Between(t, bt), x = Phaser.Math.Between(Math.max(a, wv.x), Math.min(c, wv.right)), st = this.add.image(x, y, 'glow').setTint(0x9ff4ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6, 0.06).setAlpha(0.5).setDepth(7.7);
        this.tweens.add({ targets: st, x: x + 90, alpha: 0, duration: 700, onComplete: () => st.destroy() }); } }
    this.bgp.update(dt);
    for (const a of this.anim) { a.t += dt; a.im.setTexture(a.k + (Math.floor(a.t * a.fps) % a.n)); }
    for (const g of this.glows) { g.t += dt; g.o.setAlpha(g.base * (0.75 + 0.25 * Math.sin(g.t * g.sp))); }
    // sub-zones: name card + colour grade + vignette depth
    { let zi = 0; for (let i = 0; i < ZONES.length; i++) if (p.x >= ZONES[i][0]) zi = i; if (zi !== this.zone) { this.zone = zi; const [, n, c] = ZONES[zi]; this.dbg.zones.push(n); if (zi > 0) this.toast.show(n, '#bff4ff');
      const from = Phaser.Display.Color.ValueToColor(this.grade.fillColor), to = Phaser.Display.Color.ValueToColor(c); this.tweens.addCounter({ from: 0, to: 100, duration: 1200, onUpdate: tw => { const o = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, tw.getValue() as number); this.grade.setFillStyle(Phaser.Display.Color.GetColor(o.r, o.g, o.b), 0.16); } });
      this.tweens.add({ targets: this.vig, alpha: zi >= 3 ? 0.7 : 0.45, duration: 1200 }); } }
    // water: wading slows Sakura and streams bubbles; ambient bubbles rise everywhere in view
    { const b = p.body_, w = p.y > T1 + 2 && this.chans.some(([a, c]) => p.x > a && p.x < c); if (w && !this.inWater) { this.dbg.water++; this.fx.spark(p.x, T1 + 2); audio.sfx('jump', { rate: 0.6, vol: 0.3 }); } this.inWater = w;
      if (w) { b.velocity.x *= 0.9; if (b.velocity.y > 90) b.velocity.y = 90; }
      if ((this.bubT -= dt) <= 0) { const lite = this.clite?.on; this.bubT = w ? (lite ? 0.12 : 0.06) : (lite ? 0.7 : 0.35); const wv = cam.worldView, bx = w ? p.x + Phaser.Math.Between(-6, 6) : Phaser.Math.Between(wv.x, wv.right), by = w ? p.y - 10 : wv.bottom;
        const bb = this.add.image(bx, by, 'sh_fx_bub').setScale(0.25 + Math.random() * 0.35).setAlpha(0.7).setDepth(w ? 7.8 : -60).setBlendMode(Phaser.BlendModes.ADD); const life = w ? 600 : 4000 + Math.random() * 2000;
        this.tweens.add({ targets: bb, y: by - (w ? 40 : 220), x: bx + Phaser.Math.Between(-12, 12), alpha: 0, duration: life, ease: 'Sine.out', onComplete: () => bb.destroy() }); } }
    for (const g of this.glows.slice(0, 5)) { (g.o as any).x = ((g.t * 8 + (g.o as any).__x0 || 0) % 520) - 20; if ((g.o as any).__x0 === undefined) (g.o as any).__x0 = g.o.x; }
    // interactables: touch (or shoot) the lever, touch the chest, step into the portal
    this.vaults.forEach((v, i) => { if (!v.on && Math.abs(p.x - v.lever.x) < 14 && Math.abs(p.y - v.ly) < 30) this.pull(i); if (v.on && !v.open && Math.abs(p.x - v.chest.x) < 20 && Math.abs(p.y - v.sy) < 20) this.open(i); });
    for (const s of this.secrets) { const near = Math.abs(p.x - s.ex) < 34 && Math.abs(p.y - s.sy) < 40; if (near && !s.found) { s.found = true; this.dbg.secret++; audio.sfx('checkpoint', { rate: 1.4, vol: 0.5 }); this.toast.show('A hidden alcove!', '#ffd27a'); }
      for (const w of s.wall) w.setAlpha(Phaser.Math.Linear(w.alpha, near ? 0.18 : 1, 0.15)); if (!s.open && Math.abs(p.x - s.chest.x) < 18 && Math.abs(p.y - s.sy) < 20) { s.open = true; this.dbg.chest++; this.tweens.add({ targets: s.chest, scaleY: { from: 1.3, to: 1 }, duration: 260, ease: 'Back.out' }); this.loot(s.chest.x, s.sy, 6); this.toast.show('Secret offering: +6 shards', '#ffd27a'); } }
    this.portT -= dt; if (this.portT <= 0 && Math.abs(p.x - this.portal.x) < 16 && Math.abs(p.y - T4) < 20) { this.portT = 2; this.warp(); }
    this.portalB.setScale(1.5 + 0.2 * Math.sin(this.time_ * 3));
    this.cannon.update(dt); this.pk.update(dt, p, k => this.take(k)); this.rapT = Math.max(0, this.rapT - dt); this.powT = Math.max(0, this.powT - dt); this.gun.rapid = this.rapT; p.beam.boost = this.powT > 0 ? 1.8 : 1;
    { const C = FEEL.cam, b = p.body_; this.lookX = Phaser.Math.Linear(this.lookX, p.facing * C.lookX * (Math.abs(b.velocity.x) > 40 ? 1 : 0.4), C.lookLerp); this.lookY = Phaser.Math.Linear(this.lookY, b.velocity.y > 300 ? C.lookFallY : 0, 0.06); cam.setFollowOffset(-this.lookX, 30 - this.lookY); } this.scam.update(dt); this.culler.update(); this.clite?.update(dt);
    p.pfx.update(dt); p.beam.update(dt, p.x + p.facing * 16, p.y - (p.poseLock ? 16 : 19), p.facing); this.gun.update(dt); this.egun.update(dt);
    this.gun.shots.getChildren().forEach((o: any) => this.vaults.forEach((v, i) => { if (o.active && !v.on && Math.abs(o.x - v.lever.x) < 10 && Math.abs(o.y - (v.lever.y - 20)) < 22) { this.fx.spark(o.x, o.y); this.gun.kill(o); this.pull(i); } }));
    this.enemies = this.enemies.filter(e => e.active);
    for (const e of this.enemies) { const near = Math.abs(e.x - p.x) < 520 && Math.abs(e.y - p.y) < 320; e.b.enable = near && !e.dead && (e.kind !== 'boss' || (e as any).st !== 'dying'); if (near) e.tick(dt, p.x, p.y - 14); else e.b.setVelocity(0, 0); }
    this.hud.draw(p.hasJet ? p.fuel / JET.fuel : -1, -1);
    if (p.body_.blocked.down && !this.inWater) this.safe = { x: p.x - p.facing * 6, y: p.y };
    if (!this.arena && !this.won && p.x > AX0 + 40) this.lockArena();
    if (this.arena) { this.hud.draw(p.hasJet ? p.fuel / JET.fuel : -1, Math.max(0, this.boss.hp / this.boss.maxHp)); const a = 0.35 + 0.25 * Math.sin(this.time_ * 8); this.arenaFx.forEach(r => r.setAlpha(a)); }
    if (this.cpI < this.cps.length && p.x > this.cps[this.cpI][0] && Math.abs(p.y - this.cps[this.cpI][1]) < 140) { const [x, y] = this.cps[this.cpI]; this.cpLit = true; audio.sfx('checkpoint'); this.spawn = { x, y }; this.cpLamps[this.cpI].setTint(0x6fe8ff); this.fx.explode(x, y - 40, 0.5); this.toast.show('The shrine orb wakes — checkpoint.', '#6fe8ff'); this.cpI++; }
    { const t = p.y > 1090 ? 1 : p.y > 915 ? 2 : p.y > 745 ? 3 : p.y > 575 ? 4 : 5; if (!this.dbg.tiers.includes(t)) this.dbg.tiers.push(t); if (this.onSlope) this.dbg.ramp++; }
    if (p.y > WH + 40) { p.hp -= 1; this.hud.setHp(p.hp); this.fx.shake(120, 0.004); this.respawn(p.hp <= 0); } else if (p.hp <= 0) this.respawn(true);
  }
}
