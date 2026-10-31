import { SpeedCam } from '../systems/SpeedCam';
import { Cull } from '../systems/Cull';
import Phaser from 'phaser';
import { audio } from '../audio/Audio';
import { touch, showRespawnBtn } from '../systems/Touch';
import { Beam } from '../weapons/Beam';
import { Player, HP_MAX, JET } from '../player/Player';
import { Pickups, type PK } from '../systems/Pickups';
import { Cannon } from '../systems/Cannon';
import { Env, preloadEnv } from './l2Env';
import { Interact, preloadInteract } from './l2Interact';
import { Dress, preloadDress } from './l2Dress';
import { Tiers, TOP, TIER_FLOWERS, TIER_GEMS, TIER_FOES } from './l2Tiers';
import { Fx } from '../systems/Fx';
import { Blaster } from '../weapons/Blaster';
import { Hud } from '../systems/Hud';
import { Toast } from '../systems/Toast';
import { FEEL } from '../tuning';
import { NK_FRAMES, nkAnims, NkDrone, NkSentry, NkAssault, NkShield, NkHeavy } from '../entities/NeoKyo';
import { Kaiju, KaijuEscort } from '../entities/Kaiju';
import type { Enemy } from '../entities/Enemy';
// NEO-KYO (chapter 2). Hand-placed platform pieces from tools/l2_plat.py over a 5-layer parallax cut from Dante's sheet.
const A = 'assets/l2/';
const GY = 440, WW = 6080, WH = 540, AX0 = 5240, AX1 = 6070, LW = 5120;
const PL: Record<string, [number, number, number, boolean]> = { deck_glass_3: [48, 22, 1, false], deck_glass_5: [80, 22, 1, false], deck_glass_8: [128, 22, 1, false], deck_glass_12: [192, 22, 1, false], deck_vent_3: [48, 22, 1, false], deck_vent_5: [80, 22, 1, false], deck_vent_8: [128, 22, 1, false], deck_vent_12: [192, 22, 1, false], deck_neon_3: [48, 22, 1, false], deck_neon_5: [80, 22, 1, false], deck_neon_8: [128, 22, 1, false], deck_neon_12: [192, 22, 1, false], planter_4: [64, 46, 24, false], planter_6: [96, 46, 24, false], planter_10: [160, 46, 24, false], pylon_4x96: [70, 116, 1, true], pylon_6x160: [102, 180, 1, true], pylon_8x224: [134, 244, 1, true], bridge_10: [160, 42, 1, false], bridge_16: [256, 42, 1, false], stairs_4: [96, 70, 4, true], ground_64: [64, 96, 1, true] };
const RG: Record<string, [number, number, number, boolean]> = { pl_08: [71, 33, 2, false], pl_07: [79, 39, 4, false], pl_02: [70, 36, 10, false], pl_15: [128, 49, 0, false], pl_01: [106, 41, 1, false], pl_16: [57, 88, 0, true], pl_10: [49, 27, 0, false], pl_11: [89, 32, 0, false], pl_12: [94, 45, 2, false], pl_21: [82, 30, 0, false], pr_11: [50, 120, 0, true], pl_00: [76, 40, 0, false], pl_23: [89, 44, 0, false], pr_03: [54, 25, 2, false], pr_04: [47, 176, 0, true], pr_15: [70, 37, 12, false], pr_05: [48, 24, 1, false], pl_19: [79, 43, 11, false] };
const BG: [string, number, number][] = [['nk_L1', 0, 0.06], ['nk_L2', 82, 0.14], ['nk_L3', 132, 0.26], ['nk_L4', 166, 0.42], ['nk_L5', 197, 0.6]];
const GROUND: [number, number][] = [[0, 640], [704, 1280], [1408, 1920], [2048, 2560], [2688, 3200], [3264, 3840], [3840, 4480], [4608, 5120], [5120, 6080]];
// [piece, x, walk-surface y]
const PLATS: [string, number, number][] = [
  ['pl_08', 420, 404], ['pl_07', 560, 356], ['pl_02', 780, 392], ['pl_01', 1200, 404],
  ['pl_16', 1480, 0], ['pl_10', 1620, 330], ['pl_12', 1900, 392], ['pl_21', 1840, 404],
  ['pr_11', 2120, 0], ['pl_15', 2400, 340], ['pl_23', 2470, 404], ['pr_03', 2750, 340],
  ['pr_04', 2880, 0], ['pr_15', 3300, 392], ['pr_05', 3450, 330]];
const SIGNS: [string, number, number, number][] = [['tiles_10', 300, GY, 0xff4fd8], ['tiles_25', 1100, GY - 10, 0x3ff3ff], ['tiles_40', 1660, GY, 0xff4fd8], ['tiles_38', 2600, GY - 6, 0x3ff3ff], ['tiles_39', 3160, GY, 0xffd23f], ['tiles_41', 3700, GY, 0xff4fd8], ['tiles_21', 960, 320, 0x3ff3ff], ['tiles_35', 2600, 330, 0xff4fd8]];
const FLOWERS: [number, number][] = [...TIER_FLOWERS];
const FOES: [string, number, number][] = [['assault', 520, GY], ['drone', 700, 330], ['sentry', 828, 392], ['assault', 1040, GY], ['drone', 1300, 300], ['assault', 1620, GY], ['shield', 1780, GY],
  ['drone', 2000, 300], ['assault', 2300, GY], ['heavy', 2420, GY], ['drone', 2700, 300], ['shield', 2820, GY], ['assault', 3350, GY], ['drone', 3400, 320], ['heavy', 3520, GY], ...TIER_FOES];
export class Level2 extends Phaser.Scene {
  scam!: SpeedCam; culler!: Cull;
  player!: Player; fx!: Fx; gun!: Blaster; egun!: Blaster; enemies: Enemy[] = []; hud!: Hud; toast!: Toast; pk!: Pickups; cannon!: Cannon; ia!: Interact; env!: Env; dress!: Dress;
  solids!: Phaser.Physics.Arcade.StaticGroup; ones!: Phaser.Physics.Arcade.StaticGroup; flowers!: Phaser.Physics.Arcade.StaticGroup;
  bg: Phaser.GameObjects.TileSprite[] = []; cars: any[] = []; train!: Phaser.GameObjects.Image; neon: any[] = [];
  got = 0; kills = 0; deaths = 0; time_ = 0; spawn = { x: 80, y: GY }; safe = { x: 80, y: GY }; lookX = 0; lookY = 0; ending = false; cpX = 1960; cpLit = false;
  rail!: Phaser.GameObjects.Rectangle; trainX = 0; enemyGroup!: Phaser.Physics.Arcade.Group;
  onSlope = false; rects: Phaser.Geom.Rectangle[] = [];
  // Beam / enemy code asks `solid.getTileAtWorldXY(x,y)?.collides` — emulate over our solid rects.
  solid = { getTileAtWorldXY: (x: number, y: number) => (this.rects.some(r => r.contains(x, y)) ? { collides: true } : null) };
  constructor() { super('Level2'); }
  static SWAP = ['flash', 'spark', 'spark2', 'pk_rapid', 'pk_power'];
  preload() { for (const k of Level2.SWAP) this.load.image('l2s_' + k, `${A}swap/${k}.png`);
    preloadInteract(this); preloadEnv(this); preloadDress(this);
    for (let i = 1; i <= 5; i++) this.load.image('nk_L' + i, `${A}bg/nk_L${i}.png`);
    for (const k of Object.keys(PL)) this.load.image('l2p_' + k, `${A}plat/${k}.png`);
    this.load.image('l2r_ground', `${A}rg/ground.png`); for (const k of Object.keys(RG)) this.load.image('l2r_' + k, `${A}rg/${k}.png`);
    for (const [k] of SIGNS) this.load.image('l2_' + k, `${A}tiles/${k}.png`);
    for (const [u, n] of Object.entries(NK_FRAMES)) for (let i = 0; i < n; i++) this.load.image(`nk_${u}_${i}`, `${A}en/${u}_${i}.png`);
    for (const k of ['orb', 'tracer', 'bolt', 'mortar', 'disk', 'wave']) this.load.image('nk_s_' + k, `${A}en/s_${k}.png`);
    for (let i = 0; i < 4; i++) this.load.image('l2_boss_0' + i, `${A}boss/boss_0${i}.png`);
    for (const k of ['veh_01', 'veh_02', 'veh_03', 'veh_04', 'veh_06', 'veh_07', 'veh_09', 'veh_10', 'veh_13']) this.load.image('l2_' + k, `${A}veh/${k}.png`);
  }
  addRect(x: number, y: number, w: number, h: number, one: boolean) {
    const z = this.add.zone(x + w / 2, y + h / 2, w, h); (one ? this.ones : this.solids).add(z);
    const b = z.body as Phaser.Physics.Arcade.StaticBody; if (one) { b.checkCollision.down = false; b.checkCollision.left = false; b.checkCollision.right = false; } else this.rects.push(new Phaser.Geom.Rectangle(x, y, w, h));
  }
  place(k: string, x: number, sy: number) {
    if (RG[k]) { const [w, h, top, tall] = RG[k];
      if (tall) { this.add.image(x, GY, 'l2r_' + k).setOrigin(0, 1).setDepth(2); const s = GY - h + top; this.addRect(x, s, w, 12, false); this.addRect(x + w / 2 - 10, s + 12, 20, GY - s - 12, false); return; }
      this.add.image(x, sy - top, 'l2r_' + k).setOrigin(0, 0).setDepth(2); this.addRect(x + 2, sy, w - 4, 10, true); return; }
    const [w, h, top] = PL[k];
    if (k.startsWith('pylon')) { const im = this.add.image(x, GY + 3, 'l2p_' + k).setOrigin(0, 1).setDepth(2); const s = im.y - h + top;
      this.addRect(x, s, w, 14, false); this.addRect(x + w / 2 - 12, s + 14, 24, GY - s - 14, false); return; }
    if (k === 'stairs_4') { this.add.image(x, GY, 'l2p_' + k).setOrigin(0, 1).setDepth(2); const y0 = GY - h;
      for (let i = 0; i < 4; i++) this.addRect(x + i * 16, y0 + 52 - i * 16 + 4, i === 3 ? w - i * 16 : 32 + 0, GY - (y0 + 52 - i * 16 + 4), false); return; }
    this.add.image(x, sy - top, 'l2p_' + k).setOrigin(0, 0).setDepth(2); this.addRect(x + 2, sy, w - 4, 10, true);
    if (k.startsWith('deck_neon')) { const g = this.add.rectangle(x + w / 2, sy + 2, w - 6, 4, 0xff4fd8, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(2.1); this.neon.push({ o: g, base: 0.5, t: Math.random() * 9 }); }
  }
  create() {
    // L2 uses sheet-cropped FX/pickup art under the shared keys; restored for L1 on shutdown
    const tm = this.textures; for (const k of Level2.SWAP) if (tm.exists('l2s_' + k) && !tm.exists(k + '__l1')) { tm.renameTexture(k, k + '__l1'); tm.renameTexture('l2s_' + k, k); }
    this.events.once('shutdown', () => { for (const k of Level2.SWAP) if (tm.exists(k + '__l1')) { tm.renameTexture(k, 'l2s_' + k); tm.renameTexture(k + '__l1', k); } });
    this.got = 0; this.kills = 0; this.time_ = 0; this.ending = false; this.cpLit = false; this.rects = []; this.neon = []; this.cars = []; this.bg = [];
    this.physics.world.setBounds(0, TOP, WW, WH + 200 - TOP); this.physics.world.setBoundsCollision(true, true, false, false);
    this.add.rectangle(240, 135, 480, 270, 0x2a2a8a).setScrollFactor(0).setDepth(-20);
    BG.forEach(([k, y], i) => { const t = this.textures.get(k).getSourceImage(); this.bg.push(this.add.tileSprite(0, y, 480, t.height, k).setOrigin(0, 0).setScrollFactor(0).setDepth(-15 + i)); });
    this.bg[3].setTint(0xb4b0d0); this.bg[4].setTint(0x9c98c0); this.add.rectangle(240, 135, 480, 270, 0x1c1650, 0.16).setScrollFactor(0).setDepth(-10.5);
    this.solids = this.physics.add.staticGroup(); this.ones = this.physics.add.staticGroup(); this.flowers = this.physics.add.staticGroup();
    for (const [a, b] of GROUND) { for (let x = a; x < b; x += 140) this.add.image(x, GY - 1, "l2r_ground").setOrigin(0, 0).setDepth(2).setCrop(0, 0, Math.min(140, b - x), 96); this.addRect(a, GY, b - a, WH - GY + 60, false); }
    // signs behind platforms, flickering neon: base glow + random dropouts
    for (const [k, x, by, c] of SIGNS) { const im = this.add.image(x, by, 'l2_' + k).setOrigin(0.5, 1).setDepth(1);
      const gl = this.add.image(x, by - im.height / 2, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(c).setScale(Math.max(im.width, im.height) / 60).setAlpha(0.35).setDepth(1.1);
      this.neon.push({ o: gl, im, base: 0.35, t: Math.random() * 9, flick: true }); }
    for (const [k, x, y] of PLATS) this.place(k, x, y); this.tiers = new Tiers(this, GY);
    // train on an elevated rail behind the play layer (loops the whole street); hover cars cross at parallax depths
    this.rail = this.add.rectangle(0, 0, 480, 2, 0x3ff3ff, 0.45).setOrigin(0, 0).setScrollFactor(0).setDepth(-12.6).setBlendMode(Phaser.BlendModes.ADD);
    this.train = this.add.image(0, 0, 'l2_veh_01').setOrigin(0, 1).setScale(0.6).setScrollFactor(0).setDepth(-12.5).setTint(0xd8d0f0); this.trainX = 0;
    const ck = ['veh_02', 'veh_03', 'veh_04', 'veh_06', 'veh_07', 'veh_09', 'veh_10', 'veh_13'];
    for (let i = 0; i < 8; i++) { const dir = i % 2 ? -1 : 1, sf = [0.3, 0.5, 0.75][i % 3];
      const c = this.add.image(Phaser.Math.Between(0, 480), [70, 100, 140][i % 3] + Phaser.Math.Between(-10, 10), 'l2_' + ck[i]).setScrollFactor(0).setDepth(-12 + (i % 3) * 2 + 0.5).setFlipX(dir < 0).setScale(sf + 0.25) as any;
      c.dir = dir; c.sp = 30 + sf * 70 + Math.random() * 20; c.sf = sf; c.wx = Math.random() * 900; c.by = c.y; c.t = Math.random() * 6; this.cars.push(c);
      c.lt = this.add.image(c.x, c.y, 'glow').setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD).setTint(i % 2 ? 0xff4fd8 : 0x3ff3ff).setScale(0.25).setAlpha(0.5).setDepth(c.depth - 0.1); }
    // checkpoint beacon
    this.add.rectangle(this.cpX, GY - 30, 4, 60, 0x2a2060).setDepth(1.5); this.cpLamp = this.add.image(this.cpX, GY - 62, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x666688).setScale(0.4).setDepth(1.6);
    // systems
    this.fx = new Fx(this); this.gun = new Blaster(this, 'p', 'shot'); this.egun = new Blaster(this, 'e', 'ebolt', { cooldown: 0, speed: 150, life: 3 });
    for (const [x, y] of FLOWERS) { const f = this.flowers.create(x, y, 'petal') as any; f.setScale(2).setDepth(6); f.refreshBody(); this.tweens.add({ targets: f, y: y - 4, yoyo: true, repeat: -1, duration: 900 + Math.random() * 400, ease: 'Sine.inOut' });
      this.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff8fd0).setScale(0.3).setAlpha(0.4).setDepth(5.9); }
    this.pk = new Pickups(this, (x, y) => this.groundAt(x, y)); this.pk.add('heart', 2330, 330); this.pk.add('rapid', 1770, 250); this.pk.add('power', 3080, 236);
    this.player = new Player(this, this.spawn.x, this.spawn.y); this.player.gun = this.gun; this.player.hasJet = true; this.cannon = new Cannon(this, this.player, () => this.enemies, () => this.egun.shots.getChildren().forEach((o: any) => { if (o.active) this.egun.kill(o); })); this.pk.add('cannon', 1140, GY - 8); this.pk.add('cannon', 2900, GY - 8); this.ia = new Interact(this, GY, LW); this.env = new Env(this, GY, LW); this.tiers.bind(); this.dress = new Dress(this, GY, LW, PLATS); for (const [x, y, n] of TIER_GEMS) this.env.arc(x, y, n); this.cannon.onBlast = () => { const wv = this.cameras.main.worldView; for (const b of this.ia.brk) if (b.im.active && b.im.x > wv.x && b.im.x < wv.right) this.ia.shatter(b); };
    this.player.beam = new Beam(this, this.fx, () => this.enemies, (x, y) => !!this.solid.getTileAtWorldXY(x, y)); this.player.beam.owner = this.player; this.safe = { ...this.spawn };
    this.physics.add.collider(this.player, this.solids); this.physics.add.collider(this.player, this.ones);
    this.physics.add.overlap(this.player, this.flowers, (_p, f: any) => this.collect(f));
    this.physics.add.collider(this.gun.shots, this.solids, (s: any) => { this.fx.spark(s.x, s.y); this.gun.kill(s); });
    nkAnims(this); this.enemyGroup = this.physics.add.group({ allowGravity: false });
    for (const [k, x, y] of FOES) { const C: any = { drone: NkDrone, sentry: NkSentry, assault: NkAssault, shield: NkShield, heavy: NkHeavy }[k]; const e: Enemy = new C(this, x, k === 'drone' ? y : y - 1, this.fx, this.egun);
      this.enemies.push(e); this.enemyGroup.add(e); e.b.setAllowGravity(false); if (k !== 'drone') { e.b.setMaxVelocityY?.(600); }
      e.on('destroyed', (z: Enemy) => { this.kills++; if (this.kills % 4 === 0 || this.player.hp <= 2 && Math.random() < 0.5) this.pk.add(this.kills % 12 === 0 ? 'power' : 'heart', z.x, z.y - 10, true); }); }
    this.boss = new Kaiju(this, (AX0 + AX1) / 2 - 40, 330, this.fx, this.egun, GY); this.enemies.push(this.boss); this.enemyGroup.add(this.boss); this.boss.b.setAllowGravity(false);
    this.boss.escorts = () => this.enemies.filter(e => e.kind === 'escort' && e.active && !e.dead).length;
    this.boss.summon = (i, x, y) => { const e = new KaijuEscort(this, x, y, this.fx, this.egun, i); this.enemies.push(e); this.enemyGroup.add(e); e.b.setAllowGravity(false); };
    this.boss.onDead = () => this.win();
    this.arenaFx = this.add.rectangle(AX0, GY - 135, 6, 270, 0xff4fd8, 0).setDepth(9).setBlendMode(Phaser.BlendModes.ADD); this.arenaFx2 = this.add.rectangle(AX1, GY - 135, 6, 270, 0xff4fd8, 0).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    this.gateCols = []; for (const gx of [AX0, AX1]) for (let i = 0; i < 6; i++) { const c = this.add.image(gx, GY - i * 34, 'l2f_' + ['25', '26', '27'][i % 3]).setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(9).setTint(0xff9af0); this.gateCols.push(c); }
    for (const [k, x, sc] of [['07', AX0 + 30, 1], ['08', AX0 + 80, 1], ['05', AX1 - 70, 0.9], ['07', AX1 - 30, 1], ['08', AX0 + 290, 0.9], ['09', AX1 - 190, 1]] as [string, number, number][]) { const im = this.add.image(x, GY + 1, 'l2i_' + k).setOrigin(0.5, 1).setDepth(1.5).setScale(sc); if (k === '09') { im.y = GY - 90; this.tweens.add({ targets: im, y: GY - 100, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.inOut' }); }
      const gl = this.add.image(x, im.y - im.displayHeight / 2, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(k === '08' ? 0xff9a3f : 0x3ff3ff).setAlpha(0.3).setScale(0.6).setDepth(1.4); this.neon.push({ o: gl, base: 0.3, t: Math.random() * 9 }); }
    for (let x = AX0 + 40; x < AX1 - 10; x += 96) { const bar = this.add.image(x, GY - 150 - (x % 3) * 20, 'l2i_06').setDepth(1.3).setAlpha(0.85); this.neon.push({ o: bar, base: 0.85, t: x }); }
    const walk = (e: any) => e.kind !== 'drone' && e.kind !== 'boss' && e.kind !== 'escort';
    this.physics.add.collider(this.enemyGroup, this.solids, undefined, walk); this.physics.add.collider(this.enemyGroup, this.ones, undefined, walk);
    this.physics.add.overlap(this.gun.shots, this.enemyGroup, (s: any, e: any) => { if (!s.active || e.dead || s.lastE === e) return; s.lastE = e; const d = s.body.velocity.x > 0 ? 1 : -1;
      this.fx.spark(s.x, s.y); if (s.pierce > 0) s.pierce--; else this.gun.kill(s); e.hit((s.damage || 1) * (this.powT > 0 ? 2 : 1), d); });
    const hurt = () => { this.fx.hitStop(FEEL.hurt.stop); this.fx.shake(FEEL.hurt.shakeMs, FEEL.hurt.shakeI); };
    this.physics.add.overlap(this.player, this.enemyGroup, (_p, e: any) => { if (!e.dead && (e.kind !== 'boss' || e.awake) && this.player.damage(e.x)) hurt(); });
    this.physics.add.overlap(this.player, this.egun.shots, (_p, s: any) => { if (s.active && this.player.damage(s.x)) { this.egun.kill(s); hurt(); } });
    this.physics.add.collider(this.egun.shots, this.solids, (s: any) => { this.fx.spark(s.x, s.y); this.egun.kill(s); });
    this.hud = new Hud(this, HP_MAX, true); this.hud.setHp(this.player.hp); this.player.on('hurt', (hp: number) => this.hud.setHp(hp));
    this.toast = new Toast(this);
    const cam = this.cameras.main; cam.setBounds(0, TOP, WW, WH - TOP); cam.startFollow(this.player, true, FEEL.cam.lerp, FEEL.cam.lerp, 0, 30); this.scam = new SpeedCam(this, this.player, FEEL.cam.lerp); this.culler = new Cull(this); cam.setDeadzone(FEEL.cam.deadW, FEEL.cam.deadH); cam.setRoundPixels(true);
    const kb = this.input.keyboard!;
    const pause = () => { if (this.ending) return; audio.stopLoops(); audio.sfx('menu'); this.scene.launch('Pause', { lvl: 'Level2' }); this.scene.pause(); };
    kb.on('keydown-P', pause); kb.on('keydown-ESC', pause); kb.on('keydown-R', () => this.checkpoint()); kb.on('keydown-BACKSPACE', () => this.checkpoint());
    const clear = () => this.player?.resetInput();
    this.events.on('resume', clear); this.events.on('pause', clear); this.game.events.on('blur', clear); this.game.events.on('hidden', clear);
    showRespawnBtn(true); this.events.once('shutdown', () => { audio.stopLoops(); showRespawnBtn(false); this.game.events.off('blur', clear); this.game.events.off('hidden', clear); });
    this.toast.show('Neo-Kyo. The city that never powers down.');
    (window as any).__lvl = this;
  }
  cpLamp!: Phaser.GameObjects.Image; tiers!: Tiers; AX0 = AX0; AX1 = AX1; boss!: Kaiju; arena = false; won = false; arenaFx!: Phaser.GameObjects.Rectangle; arenaFx2!: Phaser.GameObjects.Rectangle; walls: Phaser.GameObjects.Zone[] = []; gateCols: Phaser.GameObjects.Image[] = [];
  lockArena() { this.arena = true; for (const x of [AX0 - 8, AX1]) { const z = this.add.zone(x + 4, GY - 300, 8, 600); this.physics.add.existing(z, true); this.physics.add.collider(this.player, z); this.walls.push(z); }
    this.cameras.main.setBounds(AX0 - 10, GY + 70 - 270, AX1 - AX0 + 20, 270); this.arenaFx.setFillStyle(0xff4fd8, 0.5); this.arenaFx2.setFillStyle(0xff4fd8, 0.5); this.hud.setBossName('KAIJU UNIT'); this.boss.wake(); audio.sfx('gate');
    this.toast.show('KAIJU UNIT — Neo-Kyo grid guardian.', '#ff4fd8'); }
  unlockArena() { this.arena = false; for (const z of this.walls) z.destroy(); this.walls = []; this.cameras.main.setBounds(0, TOP, WW, WH - TOP); this.arenaFx.setFillStyle(0xff4fd8, 0); this.arenaFx2.setFillStyle(0xff4fd8, 0); this.gateCols.forEach(c => c.setAlpha(0)); this.hud.draw(-1, -1); }
  win() { if (this.won) return; this.won = true; this.unlockArena(); this.enemies.filter(e => e.kind === 'escort').forEach(e => e.active && !e.dead && e.die()); this.egun.shots.getChildren().forEach((o: any) => o.active && this.egun.kill(o));
    this.toast.show('The Kaiju Unit falls. Neo-Kyo breathes again.', '#ffd23f'); this.ending = true; this.player.resetInput();
    this.time.delayedCall(2600, () => { this.cameras.main.fadeOut(800, 255, 230, 240); this.time.delayedCall(850, () => this.scene.start('Victory', { time: this.time_, got: this.got, kills: this.kills, deaths: this.deaths, ch: 2, gems: this.env.dbg.got })); }); }
  /** top surface y at/below (x, y0), -1 if none */
  groundAt(x: number, y0: number) { let best = -1;
    for (const b of [...this.solids.getChildren(), ...this.ones.getChildren()] as any[]) { const r = b.body; if (x >= r.x && x <= r.right && r.y >= y0 && (best < 0 || r.y < best)) best = r.y; }
    return best; }
  collect(f: any) { if (!f.active) return; audio.sfx('flower'); f.destroy(); this.got++; this.hud.setMem(this.got); this.fx.spark(f.x, f.y); this.player.trail?.explode?.(14, f.x, f.y);
    if (this.got === 10) this.toast.show('All ten petals of Neo-Kyo.', '#ffd6f0'); }
  take(k: PK) { const p = this.player; if (k === 'heart') { if (p.hp >= HP_MAX) return false; p.hp = Math.min(HP_MAX, p.hp + 1); this.hud.setHp(p.hp); this.toast.show('+1 HP', '#ff8fb8'); return true; }
    if (k === 'cannon') { this.cannon.give(); this.toast.show('MEGA CANNON — press C', '#ff9a3f'); return true; }
    this.toast.show(k === 'rapid' ? 'RAPID FIRE' : 'POWER BEAM', k === 'rapid' ? '#3ff3ff' : '#ffd23f'); if (k === 'rapid') this.rapT = 12; else this.powT = 12; return true; }
  rapT = 0; powT = 0;
  respawn(full: boolean) { const p = this.player, b = p.body_;
    if (full) { this.deaths++; if (this.arena) { this.unlockArena(); this.boss.reset(); this.enemies.filter(e => e.kind === 'escort').forEach(e => e.active && e.destroy()); } p.hp = HP_MAX; this.hud.setHp(p.hp); this.cameras.main.flash(250, 255, 200, 230); p.setPosition(this.spawn.x, this.spawn.y); } else p.setPosition(this.safe.x, this.safe.y);
    b.setVelocity(0, 0); p.iT = 1; }
  checkpoint() { if (this.ending) return; audio.sfx('respawn'); const p = this.player; p.resetInput(); p.hurtT = 0; p.dashing = false; p.dashT = 0;
    p.setPosition(this.spawn.x, this.spawn.y); p.body_.setVelocity(0, 0); p.iT = 1; this.cameras.main.flash(200, 255, 200, 230); this.toast.show('Back to the last checkpoint.', '#ffd6f0'); }
  update(_t: number, dms: number) { this.fx.tick();
    const dt = Math.min(dms, 50) / 1000, p = this.player, cam = this.cameras.main; this.time_ += dt; this.hud.setTime(this.time_);
    if (touch.respawnP) { touch.respawnP = false; this.checkpoint(); }
    p.update(dt);
    // parallax: horizontal by factor, slight vertical drift so layers don't feel pasted to the screen
    const vy = Math.min(260, WH - 270 - cam.scrollY);
    this.bg.forEach((s, i) => { s.tilePositionX = cam.scrollX * BG[i][2]; s.y = BG[i][1] + vy * BG[i][2] * 0.35; });
    for (const c of this.cars) { c.wx += c.dir * c.sp * dt; c.t += dt; const span = 480 + 260; let x = ((c.wx - cam.scrollX * c.sf) % span + span) % span - 130;
      c.x = x; c.y = c.by + Math.sin(c.t * 1.7) * 2 + vy * c.sf * 0.3; c.lt.setPosition(x + c.dir * c.displayWidth * 0.45, c.y); }
    { const f = BG[2][2], ly = BG[2][1] + vy * f * 0.35 + 52; this.trainX += 150 * dt; const span = 1500;
      this.train.x = ((this.trainX - cam.scrollX * f) % span + span) % span - 220; this.train.y = ly; this.rail.y = ly; }
    for (const n of this.neon) { n.t += dt; let a = n.base * (0.85 + 0.15 * Math.sin(n.t * 6));
      if (n.flick) { const ph = n.t % 4.3; if ((ph > 3.6 && ph < 3.7) || (ph > 3.78 && ph < 3.85)) a = 0.04; n.im.setAlpha(a < 0.1 ? 0.55 : 1); }
      n.o.setAlpha(a); }
    this.cannon.update(dt); this.ia.update(dt); this.env.update(dt); this.dress.update(dt); this.tiers.update(dt);
    this.pk.update(dt, p, k => this.take(k)); this.rapT = Math.max(0, this.rapT - dt); this.powT = Math.max(0, this.powT - dt); this.gun.rapid = this.rapT; p.beam.boost = this.powT > 0 ? 1.8 : 1;
    { const C = FEEL.cam, b = p.body_; this.lookX = Phaser.Math.Linear(this.lookX, p.facing * C.lookX * (Math.abs(b.velocity.x) > 40 ? 1 : 0.4), C.lookLerp); this.lookY = Phaser.Math.Linear(this.lookY, b.velocity.y > 300 ? C.lookFallY : 0, 0.06);
      cam.setFollowOffset(-this.lookX, 30 - this.lookY); } this.scam.update(dt); this.culler.update();
    p.pfx.update(dt); p.beam.update(dt, p.x + p.facing * 16, p.y - (p.poseLock ? 16 : 19), p.facing); this.gun.update(dt); this.egun.update(dt); this.gun.shots.getChildren().forEach((o: any) => { if (o.active && (this.ia.hitShot(o.x, o.y, o.damage || 1) || this.dress.hitShot(o.x, o.y))) { this.fx.spark(o.x, o.y); this.gun.kill(o); } });
    this.enemies = this.enemies.filter(e => e.active);
    for (const e of this.enemies) { const near = Math.abs(e.x - p.x) < 520 && Math.abs(e.y - p.y) < 320; e.b.enable = near && !e.dead; if (near) e.tick(dt, p.x, p.y - 14); else e.b.setVelocity(0, 0); }
    this.hud.draw(p.hasJet ? p.fuel / JET.fuel : -1, -1);
    if (p.body_.blocked.down) this.safe = { x: p.x - p.facing * 6, y: p.y };
    if (!this.arena && !this.won && p.x > AX0 + 40) this.lockArena();
    if (this.arena) { this.hud.draw(p.hasJet ? p.fuel / JET.fuel : -1, Math.max(0, this.boss.hp / this.boss.maxHp)); const a = 0.35 + 0.25 * Math.sin(this.time_ * 8); this.arenaFx.setAlpha(a); this.arenaFx2.setAlpha(a); this.gateCols.forEach((c, i) => c.setAlpha(0.28 + 0.18 * Math.sin(this.time_ * 10 + i))); }
    if (!this.cpLit && p.x > this.cpX) { this.cpLit = true; audio.sfx('checkpoint'); this.spawn = { x: this.cpX, y: GY }; this.cpLamp.setTint(0x3ff3ff); this.fx.explode(this.cpX, GY - 60, 0.5); this.toast.show('Transit beacon online — checkpoint.', '#3ff3ff'); }
    if (p.y > WH + 40) { p.hp -= 1; this.hud.setHp(p.hp); this.fx.shake(120, 0.004); this.respawn(p.hp <= 0); }
    else if (p.hp <= 0) this.respawn(true);
  }
}
