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
import { Cull } from '../systems/Cull';
import { CanvasLite } from '../systems/CanvasLite';
import { PanoramaBg, loadFortressPano } from '../render/PanoramaBg';
import { FtDrone, FtOrb, FtWalker, FtAvian, FtBoss, FtTurret, ftLoad } from '../entities/Fortress';
import type { Enemy } from '../entities/Enemy';
// AIR FORTRESS (ch4) — terrain/arch/decor from transparent sheets (assets/ft/tx), single panorama bg.
const WW = 7200, WH = 900;
const T1 = 760, T2 = 620, T3 = 480, T4 = 340, T5 = 200;
const AX0 = 6400, AX1 = 7180;

/** Wind lifts: [x0, x1, topY, botY] */
const WINDS: [number, number, number, number][] = [
  [1000, 1060, T5 - 20, T1 - 10],
  [2600, 2660, T5 - 20, T2 - 10],
  [3900, 3960, T4 - 20, T1 - 10],
  [5100, 5160, T5 - 20, T2 - 10],
  [1800, 1855, T5 - 20, T3 - 10],
  [4400, 4455, T4 - 20, T2 - 10],
];
/** Hangar vaults: [leverX, leverY, vaultX, vaultY, side] */
const VAULTS: [number, number, number, number, number][] = [
  [1760, T3, 1880, T3, 1],
  [4120, T4, 4240, T4, -1],
  [5280, T2, 5400, T2, 1],
];
/** Secret alcoves: [x, walkY, side] */
const SECRETS: [number, number, number][] = [
  [3050, T1, 1],
  [5450, T2, -1],
  [1680, T3, 1],
  [4800, T4, -1],
  [900, T5, 1],
  [5800, T5, -1],
];
const FOES: [string, number, number][] = [
  ['drone', 420, T2 - 40], ['orb', 780, T1], ['bip', 980, T1], ['drone', 1200, T3 - 30],
  ['human', 1500, T1], ['wing', 1600, T4 - 20], ['tri', 1800, T2], ['avian', 2000, T5 - 30],
  ['orb', 2200, T1], ['thrust', 2400, T1], ['drone', 2600, T3 - 40], ['human', 2900, T2],
  ['bip', 3100, T1], ['avian', 3300, T4 - 20], ['heavy', 3500, T1], ['drone', 3700, T5 - 40],
  ['orb', 4000, T2], ['human', 4200, T1], ['wing', 4400, T3 - 30], ['tri', 4600, T1],
  ['avian', 4800, T5 - 20], ['drone', 5000, T2 - 40], ['thrust', 5200, T1], ['human', 5500, T2],
  ['bip', 5700, T1], ['drone', 5900, T4 - 30], ['orb', 6100, T1], ['avian', 6200, T3 - 20],
  // approach pacing before arena lock
  ['human', 6350, T1], ['drone', 6480, T2 - 40], ['tri', 6550, T1], ['wing', 6300, T3 - 20],
];
const FLOWERS: [number, number][] = [
  [340, T1 - 8], [900, T2 - 8], [1400, T1 - 8], [1900, T3 - 8], [2500, T1 - 8],
  [3000, T4 - 8], [3600, T2 - 8], [4200, T1 - 8], [4900, T5 - 8], [5600, T1 - 8],
  [720, T1 - 8], [2100, T2 - 8], [3300, T1 - 8], [4500, T3 - 8], [5300, T2 - 8],
  [6100, T1 - 8], [6700, T2 - 8], [1600, T5 - 8], [4000, T4 - 8],
  [480, T5 - 8], [1360, T5 - 8], [3180, T5 - 8], [5400, T5 - 8], [780, T3 - 8], [2920, T3 - 8], [2160, T4 - 8],
];
const GEMS: [number, number, number][] = [
  [600, T2 - 30, 5], [1600, T3 - 30, 4], [2800, T4 - 30, 6], [4000, T5 - 30, 5], [5200, T3 - 30, 4],
  [1100, T1 - 28, 5], [2400, T2 - 28, 4], [4700, T1 - 28, 6], [6000, T2 - 28, 5], [6800, T1 - 28, 4],
  // route arcs
  [450, T5 - 28, 5], [1400, T5 - 28, 5], [3200, T5 - 28, 6], [5300, T5 - 28, 5],
  [800, T3 - 28, 5], [2800, T3 - 28, 5], [4400, T3 - 28, 5], [2100, T4 - 28, 5], [5000, T4 - 28, 5],
];
/** Landmark set dressing from Dante's prop sheet — foot-planted on decks, no AI. */
const PROP_DRESS: [string, number, number, number][] = [
  // dock — banners + one airship (no sheet-label cards)
  ['banner_a', 240, T1, 0.7], ['banner_b', 420, T1, 0.7], ['deco4', 560, T1, 0.5], ['airship_main', 900, T2, 0.5],
  // gantry
  ['deco1', 1360, T1, 0.55], ['banner_c', 1520, T2, 0.65], ['deco10', 1820, T1, 0.48], ['airship_tower', 1680, T1, 0.55],
  // spires
  ['deco2', 2400, T1, 0.55], ['hoop_ring', 2680, T4 - 30, 0.7], ['banner_d', 2860, T1, 0.65], ['mech_console', 3050, T2, 0.45],
  // hangar
  ['airship_fleet', 3520, T1, 0.48], ['deco5', 3880, T1, 0.52], ['mech_portal', 4120, T2 - 10, 0.5], ['deco9', 4400, T1, 0.5],
  // bridge
  ['deco3', 4960, T1, 0.55], ['banner_a', 5180, T2, 0.65], ['deco13', 5500, T1, 0.48], ['airship_ring', 5340, T3 - 20, 0.42],
  // approach + arena rim (leave boss center clear)
  ['deco14', 5900, T1, 0.5], ['airship_main', 6280, T1, 0.42], ['banner_b', 7050, T1, 0.65],
  ['deco4', 6540, T2, 0.45], ['hoop_left', 6680, T3 - 20, 0.55],
  // Mania route landmarks on new connectors
  ['banner_c', 1040, T3, 0.6], ['deco10', 2140, T4, 0.48], ['banner_d', 3700, T5, 0.6],
  ['deco5', 4560, T3, 0.5], ['banner_a', 5520, T5, 0.6], ['deco9', 3180, T3, 0.48],
];
/** Mania-style tiered route steppers: [key, x, walkY] — short sheet plats bridging shelf gaps */
const ROUTE_STEPS: [string, number, number][] = [
  // mid T3 bridges
  ['s1_002', 320, T3], ['s1_009', 760, T3], ['s1_001', 1120, T3], ['s1_035', 1680, T3],
  ['s1_002', 2700, T3], ['s1_009', 3200, T3], ['s1_001', 3900, T3], ['s1_035', 4300, T3],
  ['s1_002', 5500, T3], ['s1_009', 5900, T3],
  // high T4 / canopy T5 routes
  ['s1_003', 360, T4], ['s1_005', 720, T4], ['s1_029', 1600, T4], ['s1_003', 2060, T4],
  ['s1_005', 2500, T4], ['s1_029', 3300, T4], ['s1_003', 3700, T4], ['s1_005', 4560, T4],
  ['s1_029', 5000, T4], ['s1_003', 5600, T4],
  ['s1_009', 440, T5], ['s1_002', 900, T5], ['s1_001', 1340, T5], ['s1_035', 1740, T5],
  ['s1_009', 2500, T5], ['s1_002', 3100, T5], ['s1_001', 3920, T5], ['s1_035', 4840, T5],
  ['s1_009', 5260, T5],
  // T2 gap fillers + vertical stairs between tiers
  ['s1_001', 1000, T2], ['s1_035', 2160, T2], ['s1_002', 4480, T2], ['s1_009', 4860, T2],
  ['s1_003', 1040, T2 - 70], ['s1_005', 1040, T3 - 70], ['s1_003', 2620, T2 - 70], ['s1_005', 2620, T3 - 70],
  ['s1_003', 3920, T2 - 70], ['s1_005', 3920, T3 - 70], ['s1_003', 5120, T2 - 70], ['s1_005', 5120, T3 - 70],
];

type Frame = { w: number; h: number; top: number; foot: number; prof?: number[]; kind: string };
type Place = {
  key: string; x: number; y: number; depth: number; flip: boolean;
  origin: string; solid: null | 'ground' | 'one' | 'ramp'; role: string;
  src?: 'tx' | 'tx2' | 'deck';
};

export class Fortress extends Phaser.Scene {
  player!: Player; fx!: Fx; gun!: Blaster; egun!: Blaster; enemies: Enemy[] = []; hud!: Hud; toast!: Toast; pk!: Pickups;
  solids!: Phaser.Physics.Arcade.StaticGroup; ones!: Phaser.Physics.Arcade.StaticGroup; flowers!: Phaser.Physics.Arcade.StaticGroup;
  bg!: PanoramaBg; enemyGroup!: Phaser.Physics.Arcade.Group; scam!: SpeedCam; culler!: Cull; clite!: CanvasLite;
  got = 0; gems = 0; kills = 0; deaths = 0; time_ = 0; spawn = { x: 100, y: T1 - 4 }; safe = { x: 100, y: T1 - 4 };
  lookX = 0; lookY = 0; rapT = 0; powT = 0; ending = false; cpLit = false; cpI = 0;
  boss!: FtBoss; arena = false; won = false; walls: Phaser.GameObjects.Zone[] = [];
  rects: Phaser.Geom.Rectangle[] = [];
  solid = { getTileAtWorldXY: (x: number, y: number) => (this.rects.some(r => r.contains(x, y)) ? { collides: true } : null) };
  dbg: any = { tiers: [] as number[], zones: [] as string[], portal: 0, ai: 0 }; portalUsed = false;
  cps: [number, number][] = [[1800, T1], [3600, T1], [5200, T1]];
  cpLamps: Phaser.GameObjects.Image[] = [];
  man: Record<string, Frame> = {};
  surf: { x: number; y: number; prof: number[]; w: number; flip: boolean }[] = [];
  onSlope = false; glows: { o: Phaser.GameObjects.Image; base: number; t: number; sp: number }[] = [];
  winds: { a: number; b: number; t: number; bt: number; fx: Phaser.GameObjects.Rectangle }[] = [];
  vaults: { lever: Phaser.GameObjects.Image; gate: Phaser.GameObjects.Rectangle; gateZ: any; chest: Phaser.GameObjects.Image; on: boolean; open: boolean; ly: number; sy: number }[] = [];
  secrets: { wall: Phaser.GameObjects.Image[]; chest: Phaser.GameObjects.Image; sy: number; found: boolean; open: boolean; ex: number }[] = [];
  arenaFx: Phaser.GameObjects.Rectangle[] = [];
  txKeys: string[] = [];
  groundBands: [number, number][] = [];
  gates: { btn: Phaser.GameObjects.Image; gate: Phaser.GameObjects.Image; zone?: Phaser.GameObjects.Zone; open: boolean }[] = [];
  collects: Phaser.GameObjects.Image[] = [];
  fxPool: string[] = [];
  liveEn = 0; liveTur = 0;
  constructor() { super('Fortress'); }

  preload() {
    loadFortressPano(this); ftLoad(this);
    this.load.json('ft_atlas', 'assets/ft/tx/atlas.json');
    this.load.json('ft_layout', 'assets/ft/tx/layout.json');
    // keys listed in atlas meta — also accept directory listing via layout placements after atlas loads in create;
    // preload every sN_XXX by probing atlas file names from a baked key list packed beside atlas.
    this.load.json('ft_usage', 'assets/ft/tx/usage.json');
    this.load.json('ft_deck', 'assets/ft/deck/deck.json');
    this.load.json('ft_tx2_collect', 'assets/ft/tx2/collect/atlas.json');
    this.load.json('ft_tx2_interact', 'assets/ft/tx2/interact/atlas.json');
    this.load.json('ft_tx2_en', 'assets/ft/tx2/en/atlas.json');
    this.load.json('ft_tx2_turret', 'assets/ft/tx2/turret/atlas.json');
    this.load.json('ft_tx2_fx', 'assets/ft/tx2/fx/atlas.json');
  }

  /** After atlas JSON arrives, queue image loads (tx + deck + tx2) then continue create. */
  bootTx(done: () => void) {
    const atlas = this.cache.json.get('ft_atlas') as { meta: { keys: string[] }; frames: Record<string, Frame> };
    const keys = atlas?.meta?.keys || Object.keys(atlas?.frames || {});
    this.txKeys = keys;
    this.man = {};
    for (const k of keys) {
      const f = atlas.frames[k];
      this.man[k] = f;
      if (!this.textures.exists('ft_' + k)) this.load.image('ft_' + k, `assets/ft/tx/${k}.png`);
    }
    const deck = this.cache.json.get('ft_deck') as { frames: Record<string, Frame> };
    for (const k of Object.keys(deck?.frames || {})) {
      this.man[k] = deck.frames[k];
      if (!this.textures.exists('ft_' + k)) this.load.image('ft_' + k, `assets/ft/deck/${k}.png`);
    }
    const catPath: Record<string, string> = {
      collect: 'collect', interact: 'interact', en: 'en', turret: 'turret', fx: 'fx',
    };
    for (const [jk, cat] of Object.entries({
      ft_tx2_collect: 'collect', ft_tx2_interact: 'interact', ft_tx2_en: 'en',
      ft_tx2_turret: 'turret', ft_tx2_fx: 'fx',
    })) {
      const a = this.cache.json.get(jk) as { frames: Record<string, Frame & { cat?: string; kind?: string }> };
      for (const k of Object.keys(a?.frames || {})) {
        this.man[k] = a.frames[k];
        if (!this.textures.exists('ft_' + k)) this.load.image('ft_' + k, `assets/ft/tx2/${catPath[cat]}/${k}.png`);
      }
    }
    if (this.load.list.size === 0) { done(); return; }
    this.load.once(Phaser.Loader.Events.COMPLETE, done);
    this.load.start();
  }

  m(k: string) { return this.man[k] || { w: 64, h: 32, top: 0, foot: 31, kind: 'decor' }; }

  addRect(x: number, y: number, w: number, h: number, one: boolean) {
    const z = this.add.zone(x + w / 2, y + h / 2, w, h); (one ? this.ones : this.solids).add(z);
    const b = z.body as Phaser.Physics.Arcade.StaticBody;
    if (one) { b.checkCollision.down = false; b.checkCollision.left = false; b.checkCollision.right = false; }
    else this.rects.push(new Phaser.Geom.Rectangle(x, y, w, h));
  }

  placeLayout(p: Place) {
    const k = p.key, m = this.m(k), key = 'ft_' + k;
    if (!this.textures.exists(key)) return;
    this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    let im: Phaser.GameObjects.Image | null = null;
    const role = p.role || '';
    // live gameplay roles: spawn entities, skip decorative duplicate for enemies/turrets when AI spawned
    if (role === 'turret' || role === 'en_mech') {
      if (this.liveTur < 14 && this.egun) {
        // seat on nearest one-way / solid top (Arcade body.y/top is the top edge, not center)
        let sy = p.y, best = 1e9;
        const seatOf = (g: Phaser.Physics.Arcade.StaticGroup) => {
          for (const z of g.getChildren() as Phaser.GameObjects.Zone[]) {
            const b = z.body as Phaser.Physics.Arcade.StaticBody; if (!b) continue;
            if (p.x < b.left - 10 || p.x > b.right + 10) continue;
            const top = b.top, d = Math.abs(top - p.y);
            if (d < best && d < 60) { best = d; sy = top; }
          }
        };
        seatOf(this.ones); seatOf(this.solids);
        if (best > 59) return null; // no deck under feet — skip floating AI + scenery
        this.liveTur++;
        const e = new FtTurret(this, p.x, sy, this.fx, this.egun, key, role === 'en_mech' ? 7 : 3);
        e.on('destroyed', () => { this.kills++; });
        this.enemies.push(e); this.enemyGroup.add(e);
        return e as any;
      }
      // overflow turrets become inert setpiece scenery
    }
    if (role === 'en_spawn' || role === 'en_heavy' || role === 'en_flyer') {
      if (this.liveEn < 18 && this.egun) {
        this.liveEn++;
        const kind = role === 'en_flyer' ? 'flyer' : (role === 'en_heavy' ? 'heavy' : 'trooper');
        this.spawnFoeTx(kind, p.x, p.y, key);
        return null;
      }
    }
    if (p.origin === 'tl_walk') {
      im = this.add.image(Math.round(p.x), Math.round(p.y - (m.top || 0)), key).setOrigin(0, 0).setDepth(p.depth).setFlipX(p.flip);
      if (p.solid === 'ground') this.addRect(p.x, p.y, m.w, Math.max(20, Math.min(56, m.h || 48)), false);
      else if (p.solid === 'one') this.addRect(p.x + 2, p.y, Math.max(8, m.w - 4), 10, true);
    } else if (p.origin === 'ramp' && m.prof) {
      const pr = m.prof;
      const lo = Math.max(...pr.slice(p.flip ? -4 : 0, p.flip ? undefined : 4));
      const y = p.y - lo;
      im = this.add.image(Math.round(p.x), Math.round(y), key).setOrigin(0, 0).setFlipX(p.flip).setDepth(p.depth);
      this.surf.push({ x: p.x, y, prof: pr, w: m.w, flip: p.flip });
      this.dbg.ramp = (this.dbg.ramp || 0) + 1;
    } else if (p.origin === 'ramp') {
      im = this.add.image(Math.round(p.x), Math.round(p.y - (m.top || 0)), key).setOrigin(0, 0).setFlipX(p.flip).setDepth(p.depth);
      this.addRect(p.x + 2, p.y, Math.max(8, m.w - 4), 10, true);
      this.dbg.ramp = (this.dbg.ramp || 0) + 1;
    } else {
      const foot = (m.foot ?? m.h - 1);
      im = this.add.image(p.x, p.y + (m.h - 1 - foot), key).setOrigin(0.5, 1).setDepth(p.depth).setFlipX(p.flip);
      if (role === 'banner' || m.kind === 'banner') {
        this.tweens.add({ targets: im, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 1600 + (p.x % 500), ease: 'Sine.inOut' });
        this.tweens.add({ targets: im, scaleX: { from: 1, to: 0.94 }, yoyo: true, repeat: -1, duration: 1100 + (p.x % 300), ease: 'Sine.inOut' });
      }
      if (role === 'set' || m.kind === 'set') {
        this.tweens.add({ targets: im, y: im.y - 2, yoyo: true, repeat: -1, duration: 2200 + (p.x % 400), ease: 'Sine.inOut' });
      }
      if (m.kind === 'pillar' || role.startsWith('pillar')) {
        const g = this.add.image(p.x, im.y - im.displayHeight * 0.55, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x9a7aff).setScale(0.4).setAlpha(0.28).setDepth(p.depth + 0.05);
        this.glows.push({ o: g, base: 0.26, t: p.x, sp: 1.5 });
      }
      if ((m.kind === 'decor' || role === 'decor') && m.h >= 18 && m.h <= 70 && this.textures.exists('glow')) {
        const g = this.add.image(p.x, im.y - im.displayHeight * 0.6, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd27a).setScale(0.28).setAlpha(0.22).setDepth(p.depth + 0.04);
        this.glows.push({ o: g, base: 0.2, t: p.x, sp: 2.2 });
      }
      if (role === 'setpiece') {
        // parked sheet art — intentional scenery, soft idle bob, no AI
        im.setAlpha(0.88 + (p.x % 7) * 0.015);
        if ((p.x + p.y) % 3 === 0) im.setTint(0xd8d0ff);
        this.tweens.add({ targets: im, y: im.y - 2, yoyo: true, repeat: -1, duration: 2400 + (p.x % 500), ease: 'Sine.inOut' });
        if (m.h >= 40 && this.textures.exists('glow')) {
          const g = this.add.image(p.x, im.y - im.displayHeight * 0.55, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x8a7cff).setScale(0.32).setAlpha(0.16).setDepth(p.depth - 0.02);
          this.glows.push({ o: g, base: 0.14, t: p.x, sp: 1.4 });
        }
      }
      if (role === 'collect') {
        this.collects.push(im);
        // gentle hover without floating clear of the deck
        this.tweens.add({ targets: im, y: im.y - 1.5, yoyo: true, repeat: -1, duration: 900 + (p.x % 400), ease: 'Sine.inOut' });
        const g = this.add.image(p.x, im.y - im.displayHeight * 0.5, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff9ad8).setScale(0.35).setAlpha(0.3).setDepth(p.depth - 0.01);
        this.glows.push({ o: g, base: 0.25, t: p.x, sp: 2.8 });
      }
      if (role === 'gate' || m.kind === 'gate' || m.kind === 'door') {
        const zone = this.add.zone(p.x, p.y - m.h * 0.45, Math.max(12, m.w * 0.6), Math.max(24, m.h * 0.85));
        this.solids.add(zone);
        this.gates.push({ btn: null as any, gate: im, zone, open: false });
        im.setTint(0xc8b0ff);
      }
      if (role === 'button') {
        // pair with nearest unpaired gate
        let best: typeof this.gates[0] | null = null; let bd = 1e9;
        for (const g of this.gates) {
          if (g.btn || g.open) continue;
          const d = Math.abs(g.gate.x - p.x) + Math.abs(g.gate.y - p.y) * 0.5;
          if (d < bd) { bd = d; best = g; }
        }
        if (best) best.btn = im;
        this.tweens.add({ targets: im, scaleY: { from: 1, to: 0.92 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
      }
      if (role === 'interact') {
        if (this.textures.exists('glow')) {
          const g = this.add.image(p.x, im.y - im.displayHeight * 0.55, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x6fe8ff).setScale(0.3).setAlpha(0.22).setDepth(p.depth + 0.02);
          this.glows.push({ o: g, base: 0.18, t: p.x, sp: 2.0 });
        }
        // medkit-ish tall red/white interactables heal on touch via update scan of name
        (im as any)._ftInteract = true;
      }
      if (role === 'fx_ambient' || role === 'fx_pool' || (m.kind && ['beam', 'burst', 'bolt', 'fx'].includes(m.kind))) {
        im.setBlendMode(Phaser.BlendModes.ADD);
        if (role === 'fx_pool') { im.setAlpha(0.0).setVisible(false); this.fxPool.push(key); }
        else {
          im.setAlpha(0.55);
          this.tweens.add({ targets: im, alpha: { from: 0.35, to: 0.75 }, yoyo: true, repeat: -1, duration: 800 + (p.x % 500), ease: 'Sine.inOut' });
        }
      }
    }
    return im;
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
    const p = this.player, b = p?.body_; const was = this.onSlope; this.onSlope = false;
    if (!b || !b.enable || b.velocity.y < 0) return;
    const feet = b.bottom, lead = Math.min(10, 4 + Math.abs(b.velocity.x) * 0.04);
    const xs = [b.left + 2 - (b.velocity.x < 0 ? lead : 0), b.center.x, b.right - 2 + (b.velocity.x > 0 ? lead : 0)];
    let sy = Infinity; for (const x of xs) sy = Math.min(sy, this.rampY(x));
    if (sy === Infinity) return;
    const lo = was ? -14 : -12, hi = was ? 8 : 6; const dy = sy - feet;
    if (dy > lo && dy < hi) { b.y += dy; b.velocity.y = 0; b.blocked.down = b.touching.down = true; this.onSlope = true; }
  }
  /** Settle onto nearby deck tops when Arcade misses a one-frame contact (land-probe stability). */
  shelfSnap() {
    const p = this.player, b = p?.body_;
    if (!b || !b.enable || b.velocity.y < -20 || this.onSlope) return;
    if (b.blocked.down || b.touching.down) return;
    const feet = b.bottom; let best = Infinity;
    const consider = (top: number) => {
      const dy = top - feet;
      if (dy > -10 && dy < 8 && Math.abs(dy) < Math.abs(best - feet)) best = top;
    };
    for (const z of this.ones.getChildren() as Phaser.GameObjects.Zone[]) {
      const sb = z.body as Phaser.Physics.Arcade.StaticBody;
      if (b.right < sb.left + 1 || b.left > sb.right - 1) continue;
      consider(sb.top);
    }
    for (const z of this.solids.getChildren() as Phaser.GameObjects.Zone[]) {
      const sb = z.body as Phaser.Physics.Arcade.StaticBody;
      if (sb.height > 64) continue; // skip tall gates/walls
      if (b.right < sb.left + 1 || b.left > sb.right - 1) continue;
      consider(sb.top);
    }
    if (best === Infinity) return;
    const dy = best - feet;
    if (dy > -10 && dy < 8) { b.y += dy; b.velocity.y = 0; b.blocked.down = b.touching.down = true; }
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
    for (const [a, b] of this.groundBands) {
      if (x >= a && x < b && y <= T1 + 20) { if (best < 0 || T1 < best) best = T1; }
    }
    return best;
  }

  create() {
    this.got = 0; this.gems = 0; this.kills = 0; this.deaths = 0; this.time_ = 0; this.ending = false;
    this.arena = false; this.won = false; this.cpLit = false; this.cpI = 0; this.rects = []; this.enemies = []; this.walls = [];
    this.gates = []; this.collects = []; this.fxPool = []; this.liveEn = 0; this.liveTur = 0;
    this.dbg = { tiers: [], zones: ['dock', 'gantry', 'spires', 'hangar', 'bridge', 'arena'], portal: 0, ai: 0, wind: 0, vault: 0, secret: 0, ramp: 0 };
    this.physics.world.setBounds(0, 0, WW, WH + 80); this.physics.world.setBoundsCollision(true, true, false, false);
    // steel under-deck fallback (never flat purple void if a fill tile fails)
    this.cameras.main.setBackgroundColor(0x1a1828);
    this.bg = new PanoramaBg(this);
    this.surf = []; this.glows = []; this.onSlope = false; this.winds = []; this.vaults = []; this.secrets = []; this.arenaFx = [];
    this.solids = this.physics.add.staticGroup(); this.ones = this.physics.add.staticGroup(); this.flowers = this.physics.add.staticGroup();
    this.enemyGroup = this.physics.add.group();

    this.bootTx(() => this.buildWorld());
  }

  buildWorld() {
    const layout = this.cache.json.get('ft_layout') as {
      ground_bands: [number, number][]; placements: Place[];
      stats?: { total_pieces: number; used_pieces: number };
    };
    this.groundBands = (layout?.ground_bands || []) as [number, number][];
    // FULL-HEIGHT under-deck fill: seamless bulkhead/truss from walk surface to past world/camera bottom.
    // Floating upper-tier shelves stay floating; only T1 ground_bands get solid bodies.
    const fillKeys = ['ft_fill_00', 'ft_fill_01', 'ft_fill_02'];
    const deepKeys = ['ft_fill_deep_00', 'ft_fill_deep_01', 'ft_fill_deep_02'];
    const FILL_TOP = T1 + 4;                 // tuck tight under deck gold lip
    const FILL_BOT = WH + 280;               // past camera lowest extent + extra margin
    const FILL_H = FILL_BOT - FILL_TOP;
    const LIP_H = 36;                        // thin gold-rim under-deck band
    const DEEP_Y = FILL_TOP + LIP_H + 160;   // mid steel then darker deep
    for (let bi = 0; bi < this.groundBands.length; bi++) {
      const [a, b] = this.groundBands[bi];
      const w = Math.max(8, b - a);
      // band solid walk surface (reliable T1 landing; deck tiles dress the top)
      this.addRect(a, T1, w, 56, false);
      const fk = fillKeys[bi % fillKeys.length];
      const dk = deepKeys[bi % deepKeys.length];
      // full-height underpaint first so no purple peek between tile seams
      if (this.textures.exists(dk)) {
        const under = this.add.tileSprite(a, FILL_TOP, w, FILL_H, dk).setOrigin(0, 0).setDepth(1.88);
        under.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      } else {
        this.add.rectangle(a + w / 2, FILL_TOP + FILL_H / 2, w, FILL_H, 0x1a1828, 1).setDepth(1.87);
      }
      if (this.textures.exists('ft_fill_lip')) {
        const lip = this.add.tileSprite(a, FILL_TOP, w, LIP_H, 'ft_fill_lip').setOrigin(0, 0).setDepth(1.93);
        lip.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      if (this.textures.exists(fk)) {
        const bodyH = Math.max(64, DEEP_Y - (FILL_TOP + LIP_H));
        const body = this.add.tileSprite(a, FILL_TOP + LIP_H, w, bodyH, fk).setOrigin(0, 0).setDepth(1.91);
        body.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      if (this.textures.exists(dk) && FILL_BOT > DEEP_Y) {
        const deep = this.add.tileSprite(a, DEEP_Y, w, FILL_BOT - DEEP_Y, dk).setOrigin(0, 0).setDepth(1.90);
        deep.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      // pit side walls / edges where ground ends
      if (this.textures.exists('ft_fill_edge_L')) {
        const el = this.add.tileSprite(a - 6, FILL_TOP, 28, FILL_H, 'ft_fill_edge_L').setOrigin(0, 0).setDepth(1.94);
        el.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      if (this.textures.exists('ft_fill_edge_R')) {
        const er = this.add.tileSprite(b - 22, FILL_TOP, 28, FILL_H, 'ft_fill_edge_R').setOrigin(0, 0).setDepth(1.94);
        er.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
    // neon air-channel glow across pits (sky still visible between bands)
    for (let i = 0; i < this.groundBands.length - 1; i++) {
      const a = this.groundBands[i][1], b = this.groundBands[i + 1][0];
      if (b - a < 8) continue;
      const ch = this.add.rectangle(a, T1 + 6, b - a, 3, 0x6fe8ff, 0.25).setOrigin(0, 0).setDepth(1.95).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: ch, alpha: { from: 0.15, to: 0.4 }, yoyo: true, repeat: -1, duration: 900 + i * 70, ease: 'Sine.inOut' });
    }
    // Pass 1: place terrain/decor/collect/fx (skip live AI roles until guns exist)
    const pendingAI: Place[] = [];
    for (const p of (layout?.placements || [])) {
      const r = p.role || '';
      if (r === 'turret' || r === 'en_mech' || r === 'en_spawn' || r === 'en_heavy' || r === 'en_flyer') pendingAI.push(p);
      else this.placeLayout(p);
    }
    (this as any)._pendingAI = pendingAI;
    const st = layout?.stats;
    if (st) this.dbg.tx = `${st.used_pieces}/${st.total_pieces}`;
    this.dbg.deck = !!(layout?.placements || []).some((p: Place) => (p.role || '').startsWith('deck'));
    (this.solids as any).refresh?.(); (this.ones as any).refresh?.();

    // Mania-style tiered route steppers (sheet plats bridging shelf gaps)
    for (const [k, x, y] of ROUTE_STEPS) {
      if (!this.man[k] && !this.textures.exists('ft_' + k)) continue;
      this.placeLayout({ key: k, x, y, depth: 2.08, flip: false, origin: 'tl_walk', solid: 'one', role: 'route_step' });
    }
    (this.ones as any).refresh?.();

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
    // hangar vaults
    for (const [lx, ly, vx, vy, side] of VAULTS) {
      const W = 110, H = 56;
      // floor pad from a short plat if available
      const pad = this.txKeys.find(k => this.m(k).kind === 'plat' && this.m(k).w >= 80 && this.m(k).w <= 140) || this.txKeys[0];
      if (pad) this.placeLayout({ key: pad, x: vx, y: vy, depth: 2.5, flip: false, origin: 'tl_walk', solid: 'one', role: 'vault_pad' });
      const lever = this.textures.exists('ft_deco3')
        ? this.add.image(lx, ly, 'ft_deco3').setOrigin(0.5, 1).setDepth(3).setScale(0.55)
        : this.add.image(lx, ly, 'glow').setOrigin(0.5, 1).setDepth(3).setTint(0xffd27a).setScale(0.5);
      const chest = this.textures.exists('ft_gem5')
        ? this.add.image(vx + W / 2 - side * 16, vy + 1, 'ft_gem5').setOrigin(0.5, 1).setDepth(2.6).setScale(0.7)
        : this.add.image(vx + W / 2, vy + 1, 'glow').setOrigin(0.5, 1).setDepth(2.6).setTint(0x6fe8ff);
      const gx = side < 0 ? vx - 6 : vx + W + 6;
      const gate = this.add.rectangle(gx, vy - H / 2, 10, H, 0x6a3cff, 0.85).setDepth(2.7);
      const gateZ = this.add.zone(gx, vy - H / 2, 14, H); this.solids.add(gateZ);
      const lg = this.add.image(lx, ly - 28, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd27a).setScale(0.4).setAlpha(0.25).setDepth(2.9);
      this.glows.push({ o: lg, base: 0.22, t: lx, sp: 2 });
      this.vaults.push({ lever, gate, gateZ, chest, on: false, open: false, ly, sy: vy });
    }
    // secrets
    for (const [x, sy, side] of SECRETS) {
      const W = 90;
      const pad = this.txKeys.find(k => this.m(k).kind === 'plat' && this.m(k).w >= 70) || this.txKeys[0];
      if (pad) this.placeLayout({ key: pad, x, y: sy, depth: 2.55, flip: false, origin: 'tl_walk', solid: 'one', role: 'secret_pad' });
      const chest = this.textures.exists('ft_gem3')
        ? this.add.image(x + W / 2, sy + 1, 'ft_gem3').setOrigin(0.5, 1).setDepth(2.6).setScale(0.65)
        : this.add.image(x + W / 2, sy + 1, 'glow').setOrigin(0.5, 1).setDepth(2.6).setTint(0xff6fd8);
      const gx = side < 0 ? x - 4 : x + W + 4;
      const ws: Phaser.GameObjects.Image[] = [];
      const wallKey = this.txKeys.find(k => this.m(k).kind === 'plat') || this.txKeys[0];
      for (let i = 0; i < 2; i++) {
        const w = this.add.image(gx + side * 4, sy + 1 - i * 34, wallKey ? 'ft_' + wallKey : 'glow').setOrigin(0.5, 1).setScale(0.55).setFlipX(side > 0).setTint(0xb8a0e8).setDepth(9.2);
        ws.push(w);
      }
      this.secrets.push({ wall: ws, chest, sy, found: false, open: false, ex: gx });
    }

    // floating landmarks — clean crops only (no sheet titles)
    const floatShip = this.textures.exists('ft_airship_main') ? 'ft_airship_main' : (this.textures.exists('ft_ship0') ? 'ft_ship0' : null);
    if (floatShip) {
      const s0 = this.add.image(2400, T5 - 40, floatShip).setOrigin(0.5, 1).setDepth(1.45).setScale(0.6).setAlpha(0.92);
      this.tweens.add({ targets: s0, y: s0.y - 6, yoyo: true, repeat: -1, duration: 2200, ease: 'Sine.inOut' });
      const s1 = this.add.image(4800, T4 - 20, floatShip).setOrigin(0.5, 1).setDepth(1.45).setScale(0.45).setFlipX(true).setAlpha(0.88);
      this.tweens.add({ targets: s1, y: s1.y - 5, yoyo: true, repeat: -1, duration: 2600, ease: 'Sine.inOut' });
    }
    if (this.textures.exists('ft_ring')) {
      const ring = this.add.image(AX0 - 200, T2 - 40, 'ft_ring').setDepth(3).setScale(0.75);
      this.tweens.add({ targets: ring, angle: 360, duration: 12000, repeat: -1, ease: 'Linear' });
      const rg = this.add.image(AX0 - 200, T2 - 40, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xb04aff).setScale(1.6).setAlpha(0.35).setDepth(2.9);
      this.glows.push({ o: rg, base: 0.3, t: AX0, sp: 2.2 });
    }
    const portalKey = this.textures.exists('ft_mech_portal') ? 'ft_mech_portal' : (this.textures.exists('ft_portal0') ? 'ft_portal0' : null);
    if (portalKey) {
      const mid = this.add.image(3000, T3 - 50, portalKey).setDepth(2.8).setScale(0.6).setAlpha(0.92);
      this.tweens.add({ targets: mid, angle: -360, duration: 16000, repeat: -1, ease: 'Linear' });
      (this as any)._midPortal = { x: 3000, y: T3 - 50 };
    }
    // intentional prop landmarks (sheet-only, title-free crops)
    for (const [k, x, y, sc] of PROP_DRESS) {
      const key = 'ft_' + k;
      if (!this.textures.exists(key)) continue;
      const mm = this.m(k); const foot = (mm.foot ?? mm.h - 1);
      const im = this.add.image(x, y + (mm.h - 1 - foot) * sc, key).setOrigin(0.5, 1).setDepth(2.65).setScale(sc);
      if (k.includes('airship') || k.includes('hoop') || k === 'ship0') {
        this.tweens.add({ targets: im, y: im.y - 3, yoyo: true, repeat: -1, duration: 2600 + (x % 400), ease: 'Sine.inOut' });
      } else if (k.startsWith('deco') || k.startsWith('banner')) {
        this.tweens.add({ targets: im, alpha: { from: 0.92, to: 1 }, yoyo: true, repeat: -1, duration: 1800 + (x % 500), ease: 'Sine.inOut' });
      }
      if (this.textures.exists('glow') && (k.includes('airship') || k.includes('hoop') || k.includes('mech') || k.startsWith('deco') || k.startsWith('banner'))) {
        const g = this.add.image(x, y - 20, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x9a7aff).setScale(0.35).setAlpha(0.18).setDepth(2.6);
        this.glows.push({ o: g, base: 0.15, t: x, sp: 1.6 });
      }
    }

    this.cpLamps = [];
    for (const [x, y] of this.cps) {
      this.add.rectangle(x, y - 30, 4, 50, 0x2a2060).setDepth(1.5);
      this.cpLamps.push(this.add.image(x, y - 58, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x666688).setScale(0.4).setDepth(1.6));
    }
    this.fx = new Fx(this); this.gun = new Blaster(this, 'p', 'shot'); this.egun = new Blaster(this, 'e', 'ebolt', { cooldown: 0, speed: 150, life: 3 });
    for (const [x, y] of FLOWERS) {
      const f = this.flowers.create(x, y, 'petal') as any; f.setScale(2).setDepth(6); f.refreshBody();
      this.tweens.add({ targets: f, y: y - 4, yoyo: true, repeat: -1, duration: 900 + Math.random() * 400, ease: 'Sine.inOut' });
    }
    this.pk = new Pickups(this, (x, y) => this.groundAt(x, y));
    this.pk.add('heart', 2100, T2 - 8); this.pk.add('rapid', 3400, T3 - 8); this.pk.add('power', 4800, T4 - 8);
    for (const [x0, y0, n] of GEMS) for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) : 0.5;
      const g = this.physics.add.staticImage(x0 + i * 18, y0 - Math.sin(u * Math.PI) * 22, this.textures.exists('ft_gem0') ? 'ft_gem0' : 'petal') as any;
      g.setDepth(6).setScale(this.textures.exists('ft_gem0') ? 0.5 : 1.5); g.refreshBody(); g.kind = 'gem';
      (this as any)._gems = (this as any)._gems || []; (this as any)._gems.push(g);
    }
    this.player = new Player(this, this.spawn.x, this.spawn.y); this.player.gun = this.gun; this.player.hasJet = true;
    this.player.beam = new Beam(this, this.fx, () => this.enemies, (x, y) => !!this.solid.getTileAtWorldXY(x, y));
    this.player.beam.owner = this.player; this.safe = { ...this.spawn };
    this.hud = new Hud(this, HP_MAX, true); this.hud.setBossName('WINGED FORTRESS'); this.toast = new Toast(this); this.hud.setHp(this.player.hp);
    // Sheet7/8 AI from layout (capped inside placeLayout)
    for (const p of ((this as any)._pendingAI || []) as Place[]) this.placeLayout(p);
    // Keep a few classic FOES as backup diversity if layout AI sparse
    if (this.liveEn < 10) for (const [k, x, y] of FOES) this.spawnFoe(k, x, y);
    this.boss = new FtBoss(this, (AX0 + AX1) / 2, T1 - 100, this.fx, this.egun, T1);
    this.enemies.push(this.boss); this.enemyGroup.add(this.boss);
    this.boss.onDead = () => this.win();
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
    const hurt = () => { this.hud.setHp(this.player.hp); this.fx.hitStop(FEEL.hurt.stop); this.fx.shake(FEEL.hurt.shakeMs, FEEL.hurt.shakeI); };
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
    this.scam = new SpeedCam(this, this.player, FEEL.cam.lerp); this.culler = new Cull(this);
    this.time.delayedCall(0, () => { const P: any = this.player; this.clite = new CanvasLite(this, [P.trail, P.jetFx, P.jetPetals, P.pfx?.shimmer]); });
    cam.setDeadzone(FEEL.cam.deadW, FEEL.cam.deadH); cam.setRoundPixels(false);
    const kb = this.input.keyboard!;
    const pause = () => { if (this.ending) return; audio.stopLoops(); audio.sfx('menu'); this.scene.launch('Pause', { lvl: 'Fortress' }); this.scene.pause(); };
    kb.on('keydown-P', pause); kb.on('keydown-ESC', pause); kb.on('keydown-R', () => this.checkpoint()); kb.on('keydown-BACKSPACE', () => this.checkpoint());
    const clear = () => this.player?.resetInput();
    this.events.on('resume', clear); this.events.on('pause', clear); this.game.events.on('blur', clear); this.game.events.on('hidden', clear);
    showRespawnBtn(true);
    this.events.once('shutdown', () => { audio.stopLoops(); showRespawnBtn(false); this.game.events.off('blur', clear); this.game.events.off('hidden', clear); });
    this.toast.show('AIR FORTRESS', '#ffd23f');
    this.dbg.liveEn = this.liveEn; this.dbg.liveTur = this.liveTur; this.dbg.collects = this.collects.length; this.dbg.gates = this.gates.length;
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
  /** Spawn foe using a transparent-sheet texture key (sheet7 / sheet8). */
  spawnFoeTx(kind: string, x: number, y: number, tex: string) {
    let e: Enemy;
    if (kind === 'flyer') e = new FtDrone(this, x, y, this.fx, this.egun, tex);
    else if (kind === 'heavy') e = new FtWalker(this, x, y, this.fx, this.egun, 6, 90, tex);
    else e = new FtWalker(this, x, y, this.fx, this.egun, 4, 80, tex);
    e.on('destroyed', () => { this.kills++; });
    this.enemies.push(e); this.enemyGroup.add(e); return e;
  }
  burstFx(x: number, y: number) {
    if (!this.fxPool.length) { this.fx.explode(x, y, 0.5); return; }
    const key = this.fxPool[Math.floor(Math.random() * this.fxPool.length)];
    const im = this.add.image(x, y, key).setBlendMode(Phaser.BlendModes.ADD).setDepth(9).setAlpha(0.95);
    this.tweens.add({ targets: im, alpha: 0, scale: 1.4, duration: 380, onComplete: () => im.destroy() });
  }
  lockArena() {
    if (this.arena) return; this.arena = true;
    const z0 = this.add.zone(AX0 - 10, T1 - 200, 20, 400); this.solids.add(z0); this.walls.push(z0);
    const z1 = this.add.zone(AX1 + 10, T1 - 200, 20, 400); this.solids.add(z1); this.walls.push(z1);
    this.rects.push(new Phaser.Geom.Rectangle(AX0 - 20, T1 - 400, 20, 500));
    this.rects.push(new Phaser.Geom.Rectangle(AX1, T1 - 400, 20, 500));
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
    this.boss.wake(); audio.sfx('bossw', { vol: 0.55 });
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
    if (!this.player) return;
    const dt = dms / 1000; this.time_ += dt; this.bg.update(dt);
    this.slopeSnap(); this.shelfSnap();
    { const cx = this.cameras.main.scrollX + 240; let gi = 0;
      for (const g of this.glows) { const near = Math.abs(g.t - cx) < 700 || g.t < 200; // t often stores x
        if (!near) { if (g.o.alpha) g.o.setAlpha(0); continue; }
        if ((gi++ & 1) === 1) continue;
        g.o.setAlpha(g.base + 0.12 * Math.sin(this.time_ * g.sp + g.t * 0.01)); } }
    if (touch.respawnP) { touch.respawnP = false; this.checkpoint(); }
    const p = this.player; if (!p || this.ending) return;
    p.update(dt); this.gun.update(dt); this.egun.update(dt);
    this.pk.update(dt, p, k => this.take(k)); this.rapT = Math.max(0, this.rapT - dt); this.powT = Math.max(0, this.powT - dt); this.gun.rapid = this.rapT; if (p.beam) { p.beam.boost = this.powT > 0 ? 1.8 : 1; p.beam.update(dt, p.x + p.facing * 16, p.y - 19, p.facing); }
    for (const e of this.enemies) if (e.active && !e.dead) e.tick(dt, p.x, p.y - 16);
    this.scam?.update(dt); this.culler?.update(); this.clite?.update(dt); this.hud.setTime(this.time_); this.hud.setGems(this.gems);
    this.hud.draw(p.hasJet ? p.fuel / JET.fuel : -1, this.arena && this.boss && !this.boss.dead ? this.boss.hp / this.boss.maxHp : -1);
    const tier = p.y > T1 - 40 ? 1 : p.y > T2 - 40 ? 2 : p.y > T3 - 40 ? 3 : p.y > T4 - 40 ? 4 : 5;
    if (!this.dbg.tiers.includes(tier)) this.dbg.tiers.push(tier);
    const zx = p.x < 1200 ? 'dock' : p.x < 2400 ? 'gantry' : p.x < 3600 ? 'spires' : p.x < 4800 ? 'hangar' : p.x < AX0 ? 'bridge' : 'arena';
    if (!this.dbg.zones.includes(zx)) this.dbg.zones.push(zx);
    if (this.cpI < this.cps.length && p.x > this.cps[this.cpI][0] && Math.abs(p.y - this.cps[this.cpI][1]) < 140) {
      const [x, y] = this.cps[this.cpI]; this.cpLit = true; audio.sfx('checkpoint'); this.spawn = { x, y };
      this.cpLamps[this.cpI].setTint(0x6fe8ff); this.fx.explode(x, y - 40, 0.5);
      this.toast.show('Beacon lit — checkpoint.', '#6fe8ff'); this.cpI++;
    }
    for (const w of this.winds) {
      if (p.x > w.a && p.x < w.b && p.y < w.bt && p.y > w.t) {
        p.body_.setVelocityY(Math.min(p.body_.velocity.y, -170));
        if (p.hasJet && typeof p.fuel === 'number') p.fuel = Math.min(JET.fuel, p.fuel + dt * 10);
        this.dbg.wind++;
      }
    }
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
    // sheet5 collectibles
    for (let i = this.collects.length - 1; i >= 0; i--) {
      const c = this.collects[i]; if (!c.active) { this.collects.splice(i, 1); continue; }
      if (Math.abs(p.x - c.x) < 22 && Math.abs(p.y - c.y) < 28) {
        c.destroy(); this.collects.splice(i, 1); this.gems++; this.got++;
        audio.sfx('flower', { rate: 1.25 }); this.burstFx(c.x, c.y - 8); this.hud.setGems(this.gems); this.hud.setMem(this.got);
      }
    }
    // sheet6 buttons open paired energy gates
    for (const g of this.gates) {
      if (g.open || !g.btn || !g.btn.active) continue;
      if (Math.abs(p.x - g.btn.x) < 26 && Math.abs(p.y - g.btn.y) < 40) {
        g.open = true; audio.sfx('gate'); this.burstFx(g.gate.x, g.gate.y - 20);
        this.tweens.add({ targets: g.gate, alpha: 0, y: g.gate.y - 50, duration: 420, onComplete: () => { try { g.zone?.destroy(); } catch {} try { g.gate.destroy(); } catch {} } });
        this.tweens.add({ targets: g.btn, scaleY: 0.7, duration: 120 });
        this.dbg.gatesOpened = (this.dbg.gatesOpened || 0) + 1;
        this.toast.show('Energy gate unlocked.', '#6fe8ff');
      }
    }
    if (!this.portalUsed && Math.abs(p.x - (AX0 - 200)) < 40 && Math.abs(p.y - (T2 - 40)) < 50) {
      this.portalUsed = true; this.dbg.portal++; audio.sfx('respawn'); this.fx.explode(p.x, p.y - 16, 0.5);
      p.setPosition(AX0 - 150, T1 - 4); p.body_.reset(AX0 - 150, T1 - 4);
    }
    const mp = (this as any)._midPortal as { x: number; y: number } | undefined;
    if (mp && !(this as any)._midUsed && Math.abs(p.x - mp.x) < 36 && Math.abs(p.y - mp.y) < 40) {
      (this as any)._midUsed = true; this.dbg.portal++; audio.sfx('respawn'); this.fx.explode(p.x, p.y - 16, 0.5);
      p.setPosition(4500, T4 - 4); p.body_.reset(4500, T4 - 4);
    }
    if (!this.arena && !this.won && p.x > AX0 - 40) this.lockArena();
    if (p.y > WH + 40) { p.hp -= 1; this.hud.setHp(p.hp); this.fx.shake(120, 0.004); this.respawn(p.hp <= 0); }
    else if (p.hp <= 0) this.respawn(true);
  }
}
