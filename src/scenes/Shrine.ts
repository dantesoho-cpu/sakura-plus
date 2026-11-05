import Phaser from 'phaser';
import { audio } from '../audio/Audio';
import { touch, showRespawnBtn } from '../systems/Touch';
import { Beam } from '../weapons/Beam';
import { Player, HP_MAX, JET } from '../player/Player';
import { Pickups, type PK } from '../systems/Pickups';
import { Cannon } from '../systems/Cannon';
import { SheetParallax, loadPx } from '../systems/SheetParallax';
import { SpeedCam } from '../systems/SpeedCam';
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
// Layout: lower lane (ground + flooded channels), mid terraces and upper ledges, arranged on rising/falling arcs.
const S = 0.5; // sheet pieces are drawn at half size (sheet px -> logical px)
const GY = 480, WW = 5000, WH = 560, TOP = 200, AX0 = 4240, AX1 = 4990, LW = 4200;
type M = { w: number; h: number; foot: number; top?: number; frames?: number };
const GROUND: [number, number][] = [[0, 560], [660, 1180], [1290, 1900], [2000, 2600], [2720, 3300], [3400, 5000]];
// [platform piece, x (left), walk-surface y]  — mid tier ~360-420, upper tier ~300-340
const PLATS: [string, number, number][] = [
  ['p_moss', 280, 412], ['p_mid', 440, 378], ['p_slab1', 540, 350], ['p_slab2', 630, 334], ['p_slab1', 724, 350], ['p_mid', 820, 380], ['p_shrine', 960, 328],
  ['p_arch1', 1300, 332], ['p_bridge', 1470, 388], ['p_left', 1600, 350], ['p_arch2', 1760, 318], ['p_slab2', 1920, 362], ['p_bridge', 2060, 404], ['p_moss', 2200, 362],
  ['p_mid', 2440, 420], ['p_mid', 2530, 392], ['p_mid', 2620, 364], ['p_long', 2710, 334], ['p_mid', 2890, 360], ['p_mid', 2980, 390], ['p_arch3', 3090, 344], ['p_shrine', 3220, 312],
  ['p_moss', 3420, 404], ['p_slab1', 3570, 362], ['p_long', 3640, 322], ['p_bridge', 3820, 382], ['p_mid', 3960, 414]];
// [prop, x (centre), surface y, depth, flip]
const PROPS: [string, number, number, number, boolean?][] = [
  ['torii_red', 120, GY, 1.4], ['lantern_post', 236, GY, 1.6], ['lantern_a', 520, GY, 1.6], ['tree', 880, GY, 1.3], ['shrine_s', 991, 328, 1.6], ['pillar', 1160, GY, 1.3],
  ['lantern_b', 1500, GY, 1.6], ['pagoda', 1700, GY, 1.2], ['banner_r', 1890, GY, 1.5], ['lantern_b', 2240, 362, 1.6], ['shrine_orb', 2400, GY, 1.5],
  ['lantern_b', 2790, 334, 1.6], ['fence', 2900, GY, 1.6], ['lantern_post', 3060, GY, 1.6], ['shrine_mini', 3251, 312, 1.6], ['torii_big', 3470, GY, 1.3],
  ['cr_ped', 3500, GY, 1.4], ['cr_b', 3460, 404, 1.7], ['cr_pillar', 3720, GY, 1.4], ['cr_tall', 3900, GY, 1.6], ['cr_a', 3990, 414, 1.7], ['cr_c', 3600, 362, 1.7], ['cr_a', 3150, GY, 1.7, true],
  ['torii_big', AX0 + 10, GY, 1.3], ['banner_gate', (AX0 + AX1) / 2, GY, 1.1], ['lantern_a', AX0 + 150, GY, 1.6], ['lantern_a', AX1 - 150, GY, 1.6, true], ['cr_pillar', AX1 - 60, GY, 1.4], ['pagoda', AX0 + 90, GY, 1.15]];
// [waterfall, x centre, top y, bottom y]
const FALLS: [string, number, number, number][] = [['wf_a', 610, 236, GY + 6], ['wf_wide', 1336, 336, GY + 6], ['wf_b', 1792, 322, GY + 6], ['wf_a', 3125, 348, GY + 6], ['wf_b', 3260, 220, 312], ['wf_wide', (AX0 + AX1) / 2, 214, GY + 6]];
const FLOWERS: [number, number][] = [[480, 356], [670, 310], [990, 300], [1340, 306], [1790, 296], [2300, 340], [2780, 310], [3250, 290], [3700, 300], [3990, 392]];
// gem arcs [x0, y0, n, kind] — collectible curves following the jump arcs
const ARCS: [number, number, number, string][] = [[330, 390, 5, 'i_coin'], [560, 324, 6, 'i_gem_b'], [1480, 366, 5, 'i_coin'], [1940, 340, 4, 'i_gem_p'], [2450, 400, 7, 'i_coin'], [2900, 336, 5, 'i_gem_b'], [3440, 380, 5, 'i_gem_p'], [3830, 358, 5, 'i_coin']];
const FOES: [string, number, number][] = [
  ['crab', 420, GY], ['jelly', 610, 430], ['orb', 760, 300], ['mech', 1000, GY], ['jellyp', 1235, 440], ['crabl', 1560, GY], ['jelly', 1350, 380], ['orbs', 1700, 290],
  ['mech2', 2100, GY], ['jellyb', 2660, 430], ['crab2', 2300, 362], ['mechl', 2830, GY], ['orb', 2780, 290], ['jellyp', 3350, 430], ['crabs', 3180, GY], ['mech', 3600, GY],
  ['jelly', 3740, 280], ['crab', 3460, 404], ['mechs', 3960, GY], ['jellyb', 3880, 330]];
const ZONES: [number, string, number][] = [[0, 'Moss Gate', 0x1a5a6a], [1200, 'Falls of Ame', 0x1a4a8a], [2400, 'Lantern Terraces', 0x5a2a6a], [3300, 'Crystal Deep', 0x2a3a9a], [AX0 - 200, "Warden's Hollow", 0x1a2a5a]];
export class Shrine extends Phaser.Scene {
  player!: Player; fx!: Fx; gun!: Blaster; egun!: Blaster; enemies: Enemy[] = []; hud!: Hud; toast!: Toast; pk!: Pickups; cannon!: Cannon; scam!: SpeedCam; bgp!: SheetParallax;
  solids!: Phaser.Physics.Arcade.StaticGroup; ones!: Phaser.Physics.Arcade.StaticGroup; flowers!: Phaser.Physics.Arcade.StaticGroup; gemsG!: Phaser.Physics.Arcade.StaticGroup; enemyGroup!: Phaser.Physics.Arcade.Group;
  got = 0; gems = 0; kills = 0; deaths = 0; time_ = 0; spawn = { x: 70, y: GY }; safe = { x: 70, y: GY }; lookX = 0; lookY = 0; ending = false; cpX = 2400; cpLit = false;
  rects: Phaser.Geom.Rectangle[] = []; onSlope = false; man: Record<string, M> = {}; anim: { im: Phaser.GameObjects.Image; k: string; n: number; t: number; fps: number }[] = [];
  glows: { o: Phaser.GameObjects.Image; base: number; t: number; sp: number }[] = []; chans: [number, number][] = []; bubbles: Phaser.GameObjects.Image[] = []; bubT = 0; zone = -1; grade!: Phaser.GameObjects.Rectangle;
  boss!: ShBoss; arena = false; won = false; walls: Phaser.GameObjects.Zone[] = []; arenaFx: Phaser.GameObjects.Rectangle[] = []; AX0 = AX0; AX1 = AX1; inWater = false; dbg = { water: 0, lever: 0, chest: 0, portal: 0, zones: [] as string[] };
  lever!: Phaser.GameObjects.Image; gate!: Phaser.GameObjects.Image; gateZ!: Phaser.GameObjects.Zone; chest!: Phaser.GameObjects.Image; portal!: Phaser.GameObjects.Image; portalB!: Phaser.GameObjects.Image; leverOn = false; chestOpen = false; portT = 0;
  solid = { getTileAtWorldXY: (x: number, y: number) => (this.rects.some(r => r.contains(x, y)) ? { collides: true } : null) };
  constructor() { super('Shrine'); }
  preload() { loadPx(this, 'sh'); this.load.json('sh_man', 'assets/sh/manifest.json'); shLoad(this);
    for (const k of ['p_long', 'p_mid', 'p_shrine', 'p_moss', 'p_left', 'p_arch1', 'p_arch2', 'p_arch3', 'p_slab1', 'p_slab2', 'p_bridge', 'tree', 'pillar', 'banner_r', 'banner_a', 'banner_b', 'banner_gate', 'torii_red', 'torii_big', 'lantern_a', 'lantern_b', 'lantern_post', 'fence', 'pagoda', 'shrine_s', 'shrine_orb', 'shrine_mini', 'cr_a', 'cr_b', 'cr_c', 'cr_ped', 'cr_pillar', 'cr_tall'])
      this.load.image('sh_' + k, `assets/sh/${k}.png`);
    for (const k of ['wf_a', 'wf_b', 'wf_wide', 'pool']) for (let i = 0; i < 4; i++) this.load.image(`sh_${k}_f${i}`, `assets/sh/${k}_f${i}.png`); }
  addRect(x: number, y: number, w: number, h: number, one: boolean) { const z = this.add.zone(x + w / 2, y + h / 2, w, h); (one ? this.ones : this.solids).add(z);
    const b = z.body as Phaser.Physics.Arcade.StaticBody; if (one) { b.checkCollision.down = false; b.checkCollision.left = false; b.checkCollision.right = false; } else this.rects.push(new Phaser.Geom.Rectangle(x, y, w, h)); return z; }
  m(k: string) { return this.man[k]; }
  /** prop with its sheet foot row exactly on the surface */
  prop(k: string, x: number, sy: number, d: number, flip = false) { const m = this.m(k); return this.add.image(x, sy + (m.h - 1 - m.foot) * S, 'sh_' + k).setOrigin(0.5, 1).setScale(S).setDepth(d).setFlipX(flip); }
  plat(k: string, x: number, sy: number) { const m = this.m(k); const im = this.add.image(x, sy - (m.top || 0) * S, 'sh_' + k).setOrigin(0, 0).setScale(S).setDepth(2); this.addRect(x + 3, sy, m.w * S - 6, 10, true); return im; }
  create() {
    this.man = this.cache.json.get('sh_man'); this.got = 0; this.gems = 0; this.kills = 0; this.deaths = 0; this.time_ = 0; this.ending = false; this.cpLit = false; this.rects = []; this.anim = []; this.glows = []; this.chans = []; this.bubbles = []; this.zone = -1;
    this.enemies = []; this.arena = false; this.won = false; this.walls = []; this.arenaFx = []; this.leverOn = false; this.chestOpen = false; this.spawn = { x: 70, y: GY }; this.dbg = { water: 0, lever: 0, chest: 0, portal: 0, zones: [] };
    this.physics.world.setBounds(0, TOP, WW, WH + 200 - TOP); this.physics.world.setBoundsCollision(true, true, false, false);
    this.add.rectangle(240, 135, 480, 270, 0x06142a).setScrollFactor(0).setDepth(-100);
    this.bgp = new SheetParallax(this, 'sh', -95, () => { const c = this.cameras.main, b = c.getBounds(); return b.height > 270 ? Phaser.Math.Clamp((c.scrollY - b.y) / (b.height - 270), 0, 1) - 0.5 : 0; });
    // water-zone grade over the parallax (per sub-zone colour, eased) + drifting caustic light shafts
    this.grade = this.add.rectangle(240, 135, 480, 270, ZONES[0][2], 0.16).setScrollFactor(0).setDepth(-80);
    for (let i = 0; i < 5; i++) { const r = this.add.image(60 + i * 100, 40, 'glow').setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD).setTint(0x7fe8ff).setScale(0.5, 6).setAngle(14).setAlpha(0.06).setDepth(-79); this.glows.push({ o: r, base: 0.06, t: i * 1.7, sp: 0.6 + i * 0.13 }); }
    this.solids = this.physics.add.staticGroup(); this.ones = this.physics.add.staticGroup(); this.flowers = this.physics.add.staticGroup(); this.gemsG = this.physics.add.staticGroup();
    // lower lane: the sheet's long mossy slab tiled along each ground run (alternate flips hide repeats), dark rock below
    const gm = this.m('p_long'), gw = gm.w * S - 8;
    for (const [a, b] of GROUND) { this.add.rectangle(a, GY + 10, b - a, WH - GY + 60, 0x06101e).setOrigin(0, 0).setDepth(1.9);
      for (let x = a - 4, j = 0; x < b - 4; x += gw, j++) { const w = Math.min(gw + 8, b + 4 - x); this.add.image(x, GY - (gm.top || 0) * S, 'sh_p_long').setOrigin(0, 0).setScale(S).setDepth(2).setFlipX(!!(j & 1) && w > gw).setCrop(0, 0, w / S, gm.h); }
      this.addRect(a, GY, b - a, WH - GY + 60, false); }
    // flooded channels between runs: submerged floor, animated surface, Sakura wades (slowed, bubbles)
    for (let i = 0; i < GROUND.length - 1; i++) { const a = GROUND[i][1], b = GROUND[i + 1][0]; this.chans.push([a, b]); this.addRect(a, GY + 34, b - a, 80, false);
      this.add.rectangle(a, GY + 4, b - a, 80, 0x0e4a7a, 0.62).setOrigin(0, 0).setDepth(7.5); const sf = this.add.rectangle(a, GY + 3, b - a, 2, 0x9ff4ff, 0.7).setOrigin(0, 0).setDepth(7.6).setBlendMode(Phaser.BlendModes.ADD); this.glows.push({ o: sf as any, base: 0.55, t: i, sp: 3 });
      const pl = this.add.image((a + b) / 2, GY + 40, 'sh_pool_f0').setOrigin(0.5, 1).setScale(((b - a) + 16) / this.m('pool').w, 0.35).setDepth(7.4).setAlpha(0.55); this.anim.push({ im: pl, k: 'sh_pool_f', n: 4, t: i * 0.1, fps: 6 }); }
    for (const [k, x, y] of PLATS) this.plat(k, x, y);
    for (const [k, x, y, d, f] of PROPS) { const im = this.prop(k, x, y, d, f); if (k.startsWith('lantern') || k === 'shrine_orb' || k.startsWith('cr_')) {
      const g = this.add.image(x, im.y - im.displayHeight * (k.startsWith('cr_') ? 0.5 : 0.62), 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(k.startsWith('cr_') ? 0x9a7aff : k === 'shrine_orb' ? 0x6fe8ff : 0xffb25a).setScale(k.startsWith('cr_') ? 0.9 : 0.6).setAlpha(0.35).setDepth(d + 0.05); this.glows.push({ o: g, base: 0.35, t: x, sp: k.startsWith('cr_') ? 1.3 : 4 }); } }
    // banners hung beneath the arches / ledges (cloth sways)
    for (const [k, x, y] of [['banner_a', 1340, 336], ['banner_b', 1800, 322], ['banner_a', 3130, 348], ['banner_b', 2770, 338]] as [string, number, number][]) { const im = this.add.image(x, y, 'sh_' + k).setOrigin(0.5, 0).setScale(S).setDepth(1.8); this.tweens.add({ targets: im, angle: { from: -2.5, to: 2.5 }, yoyo: true, repeat: -1, duration: 1800 + x % 500, ease: 'Sine.inOut' }); }
    for (const [k, x, t, b] of FALLS) { const m = this.m(k), im = this.add.image(x, t, `sh_${k}_f0`).setOrigin(0.5, 0).setScale(S, (b - t) / m.h).setDepth(1.7).setAlpha(0.9); this.anim.push({ im, k: `sh_${k}_f`, n: 4, t: x * 0.01, fps: 9 });
      const sp = this.add.image(x, b - 2, 'sh_fx_splash').setOrigin(0.5, 1).setDepth(7.7).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7); this.tweens.add({ targets: sp, scaleX: { from: 0.8, to: 1.25 }, scaleY: { from: 1.1, to: 0.7 }, alpha: { from: 0.75, to: 0.35 }, yoyo: true, repeat: -1, duration: 260 + x % 120 }); }
    // checkpoint: the shrine orb lights
    this.cpLamp = this.add.image(this.cpX, GY - 30, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x445566).setScale(0.9).setDepth(1.7);
    this.fx = new Fx(this); this.gun = new Blaster(this, 'p', 'shot'); this.egun = new Blaster(this, 'e', 'ebolt', { cooldown: 0, speed: 150, life: 3 });
    for (const [x, y] of FLOWERS) { const f = this.flowers.create(x, y, 'petal') as any; f.setScale(2).setDepth(6); f.refreshBody(); this.tweens.add({ targets: f, y: y - 4, yoyo: true, repeat: -1, duration: 900 + Math.random() * 400, ease: 'Sine.inOut' });
      this.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff8fd0).setScale(0.3).setAlpha(0.4).setDepth(5.9); }
    for (const [x0, y0, n, k] of ARCS) for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) : 0.5, g = this.gemsG.create(x0 + i * 18, y0 - Math.sin(u * Math.PI) * 26, 'sh_' + k) as any; g.setDepth(6); g.refreshBody(); g.kind = k;
      this.tweens.add({ targets: g, scaleX: { from: 1, to: k === 'i_coin' ? 0.25 : 0.85 }, yoyo: true, repeat: -1, duration: 500 + i * 30, ease: 'Sine.inOut' }); }
    this.pk = new Pickups(this, (x, y) => this.groundAt(x, y)); this.pk.add('heart', 1600, 330); this.pk.add('rapid', 960, 300); this.pk.add('power', 3220, 290); this.pk.add('heart', AX0 - 60, GY - 10);
    this.player = new Player(this, this.spawn.x, this.spawn.y); this.player.gun = this.gun; this.player.hasJet = true;
    this.cannon = new Cannon(this, this.player, () => this.enemies, () => this.egun.shots.getChildren().forEach((o: any) => { if (o.active) this.egun.kill(o); })); this.pk.add('cannon', 2000, GY - 8);
    this.player.beam = new Beam(this, this.fx, () => this.enemies, (x, y) => !!this.solid.getTileAtWorldXY(x, y)); this.player.beam.owner = this.player; this.safe = { ...this.spawn };
    this.physics.add.collider(this.player, this.solids); this.physics.add.collider(this.player, this.ones);
    this.physics.add.overlap(this.player, this.flowers, (_p, f: any) => this.collect(f));
    this.physics.add.overlap(this.player, this.gemsG, (_p, g: any) => this.gem(g));
    this.physics.add.collider(this.gun.shots, this.solids, (s: any) => { this.fx.spark(s.x, s.y); this.gun.kill(s); });
    this.interactables();
    shAnims(this); this.enemyGroup = this.physics.add.group({ allowGravity: false });
    for (const [k, x, y] of FOES) this.spawnFoe(k, x, y);
    this.boss = new ShBoss(this, (AX0 + AX1) / 2, GY - 120, this.fx, this.egun, GY); this.enemies.push(this.boss); this.enemyGroup.add(this.boss); this.boss.b.setAllowGravity(false);
    this.boss.escorts = () => this.enemies.filter(e => (e as any).escort && e.active && !e.dead).length;
    this.boss.summon = (x, y) => { const e = this.spawnFoe('jellyp', x, y); (e as any).escort = true; e.setAlpha(0); this.tweens.add({ targets: e, alpha: 0.92, duration: 400 }); };
    this.boss.onDead = () => this.win();
    for (const gx of [AX0, AX1]) this.arenaFx.push(this.add.rectangle(gx, GY - 135, 6, 270, 0x6fe8ff, 0).setDepth(9).setBlendMode(Phaser.BlendModes.ADD));
    const walk = (e: any) => e.kind !== 'drone' && e.kind !== 'boss';
    this.physics.add.collider(this.enemyGroup, this.solids, undefined, walk); this.physics.add.collider(this.enemyGroup, this.ones, undefined, walk);
    this.physics.add.overlap(this.gun.shots, this.enemyGroup, (s: any, e: any) => { if (!s.active || e.dead || s.lastE === e) return; s.lastE = e; const d = s.body.velocity.x > 0 ? 1 : -1;
      this.fx.spark(s.x, s.y); if (s.pierce > 0) s.pierce--; else this.gun.kill(s); e.hit((s.damage || 1) * (this.powT > 0 ? 2 : 1), d); });
    const hurt = () => { this.fx.hitStop(FEEL.hurt.stop); this.fx.shake(FEEL.hurt.shakeMs, FEEL.hurt.shakeI); };
    this.physics.add.overlap(this.player, this.enemyGroup, (_p, e: any) => { if (!e.dead && (e.kind !== 'boss' || e.awake) && this.player.damage(e.x)) hurt(); });
    this.physics.add.overlap(this.player, this.egun.shots, (_p, s: any) => { if (s.active && this.player.damage(s.x)) { this.egun.kill(s); hurt(); } });
    this.physics.add.collider(this.egun.shots, this.solids, (s: any) => { this.fx.spark(s.x, s.y); this.egun.kill(s); });
    this.hud = new Hud(this, HP_MAX, true); this.hud.setHp(this.player.hp); this.player.on('hurt', (hp: number) => this.hud.setHp(hp)); this.toast = new Toast(this);
    // edge vignette (code-drawn radial falloff) — deepens in the Crystal Deep and the Warden's hollow
    { const key = 'sh_vig'; if (!this.textures.exists(key)) { const c = this.textures.createCanvas(key, 240, 135)!, x = c.getContext(), g = x.createRadialGradient(120, 68, 40, 120, 68, 150); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(2,6,20,1)'); x.fillStyle = g; x.fillRect(0, 0, 240, 135); c.refresh(); }
      this.vig = this.add.image(240, 135, key).setScrollFactor(0).setDisplaySize(480, 270).setDepth(40).setAlpha(0.45); }
    const cam = this.cameras.main; cam.setBounds(0, TOP, WW, WH - TOP); cam.startFollow(this.player, true, FEEL.cam.lerp, FEEL.cam.lerp, 0, 30); this.scam = new SpeedCam(this, this.player, FEEL.cam.lerp);
    cam.setDeadzone(FEEL.cam.deadW, FEEL.cam.deadH); cam.setRoundPixels(true); cam.fadeIn(450);
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
    // lever on the upper slab of the Lantern Terraces opens the sealed gate over the lower-lane treasure chest
    const lm = this.m('x_switch'); this.lever = this.add.image(2760, 334 + 1, 'sh_x_switch').setOrigin(0.5, 1).setDepth(2.5);
    this.chest = this.add.image(2560, GY + 1, 'sh_x_chest').setOrigin(0.5, 1).setDepth(2.5);
    this.gate = this.add.image(2560, GY + 2, 'sh_x_gate2').setOrigin(0.5, 1).setDepth(6.5); this.gateZ = this.addRect(2560 - 30, GY - 46, 60, 46, false) as any; void lm;
    // portal on the Crystal Deep upper ledge: a rift straight to the Warden's hollow
    this.add.image(3720, 322 + 1, 'sh_x_portal_ped').setOrigin(0.5, 1).setDepth(2.4);
    this.portal = this.add.image(3720, 322 - 52, 'sh_x_portal').setDepth(2.3).setBlendMode(Phaser.BlendModes.ADD); this.tweens.add({ targets: this.portal, angle: 360, repeat: -1, duration: 6000 });
    this.portalB = this.add.image(3720, 270, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x9a7aff).setScale(1.6).setAlpha(0.4).setDepth(2.2);
    this.add.image(AX0 - 110, GY + 1, 'sh_x_lantern').setOrigin(0.5, 1).setDepth(1.6); }
  pull() { if (this.leverOn) return; this.leverOn = true; this.dbg.lever++; audio.sfx('gate'); this.lever.setFlipX(true); this.tweens.add({ targets: this.lever, scaleY: { from: 0.8, to: 1 }, duration: 200, ease: 'Back.out' });
    this.toast.show('Somewhere below, a gate grinds open.', '#bff4ff'); this.cameras.main.shake(160, 0.003);
    this.tweens.add({ targets: this.gate, y: GY - 60, alpha: 0, duration: 900, ease: 'Quad.in' }); this.solids.remove(this.gateZ, true, true); this.rects = this.rects.filter(r => !(r.x === 2530 && r.y === GY - 46)); }
  open() { if (this.chestOpen || !this.leverOn) return; this.chestOpen = true; this.dbg.chest++; audio.sfx('flower'); this.tweens.add({ targets: this.chest, scaleY: { from: 1.3, to: 1 }, scaleX: { from: 0.8, to: 1 }, duration: 260, ease: 'Back.out' });
    this.fx.explode(this.chest.x, this.chest.y - 12, 0.5); this.pk.add('heart', this.chest.x - 14, GY - 24, true);
    for (let i = 0; i < 8; i++) { const a = -Math.PI * (0.15 + 0.7 * i / 7), g = this.gemsG.create(this.chest.x, GY - 14, 'sh_i_gem_p') as any; g.kind = 'i_gem_p'; g.setDepth(6);
      this.tweens.add({ targets: g, x: this.chest.x + Math.cos(a) * 46, y: GY - 14 + Math.sin(a) * 40, duration: 420, ease: 'Quad.out', onComplete: () => { if (g.body) g.refreshBody(); } }); }
    this.toast.show('Shrine offering: +8 shards', '#d8b4ff'); }
  warp() { const p = this.player; this.dbg.portal++; audio.sfx('respawn'); this.fx.explode(p.x, p.y - 16, 0.6); p.setPosition(AX0 - 150, GY); p.body_.reset(AX0 - 150, GY); p.body_.setVelocity(0, 0); p.iT = 0.6;
    this.cameras.main.flash(260, 150, 120, 255); this.toast.show('The rift carries you to the Warden.', '#d8b4ff'); }
  gem(g: any) { if (!g.active || !g.body) return; this.gems += g.kind === 'i_gem_b' ? 3 : g.kind === 'i_gem_p' ? 1 : 1; audio.sfx('flower', { rate: 1.6, vol: 0.4 }); this.fx.spark(g.x, g.y);
    const r = this.add.image(g.x, g.y, 'sh_fx_ring').setBlendMode(Phaser.BlendModes.ADD).setDepth(12).setScale(0.4); this.tweens.add({ targets: r, scale: 1.2, alpha: 0, duration: 280, onComplete: () => r.destroy() }); g.destroy(); }
  lockArena() { this.arena = true; for (const x of [AX0 - 8, AX1]) { const z = this.add.zone(x + 4, GY - 300, 8, 600); this.physics.add.existing(z, true); this.physics.add.collider(this.player, z); this.walls.push(z); }
    this.cameras.main.setBounds(AX0 - 10, GY + 70 - 270, AX1 - AX0 + 20, 270); this.arenaFx.forEach(r => r.setFillStyle(0x6fe8ff, 0.5)); this.hud.setBossName('ABYSS WARDEN'); this.boss.wake(); audio.sfx('gate');
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
    p.update(dt); this.bgp.update(dt);
    for (const a of this.anim) { a.t += dt; a.im.setTexture(a.k + (Math.floor(a.t * a.fps) % a.n)); }
    for (const g of this.glows) { g.t += dt; g.o.setAlpha(g.base * (0.75 + 0.25 * Math.sin(g.t * g.sp))); }
    // sub-zones: name card + colour grade + vignette depth
    { let zi = 0; for (let i = 0; i < ZONES.length; i++) if (p.x >= ZONES[i][0]) zi = i; if (zi !== this.zone) { this.zone = zi; const [, n, c] = ZONES[zi]; this.dbg.zones.push(n); if (zi > 0) this.toast.show(n, '#bff4ff');
      const from = Phaser.Display.Color.ValueToColor(this.grade.fillColor), to = Phaser.Display.Color.ValueToColor(c); this.tweens.addCounter({ from: 0, to: 100, duration: 1200, onUpdate: tw => { const o = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, tw.getValue() as number); this.grade.setFillStyle(Phaser.Display.Color.GetColor(o.r, o.g, o.b), 0.16); } });
      this.tweens.add({ targets: this.vig, alpha: zi >= 3 ? 0.7 : 0.45, duration: 1200 }); } }
    // water: wading slows Sakura and streams bubbles; ambient bubbles rise everywhere in view
    { const b = p.body_, w = p.y > GY + 2 && this.chans.some(([a, c]) => p.x > a && p.x < c); if (w && !this.inWater) { this.dbg.water++; this.fx.spark(p.x, GY + 2); audio.sfx('jump', { rate: 0.6, vol: 0.3 }); } this.inWater = w;
      if (w) { b.velocity.x *= 0.9; if (b.velocity.y > 90) b.velocity.y = 90; }
      if ((this.bubT -= dt) <= 0) { this.bubT = w ? 0.06 : 0.35; const wv = cam.worldView, bx = w ? p.x + Phaser.Math.Between(-6, 6) : Phaser.Math.Between(wv.x, wv.right), by = w ? p.y - 10 : wv.bottom;
        const bb = this.add.image(bx, by, 'sh_fx_bub').setScale(0.25 + Math.random() * 0.35).setAlpha(0.7).setDepth(w ? 7.8 : -60).setBlendMode(Phaser.BlendModes.ADD); const life = w ? 600 : 4000 + Math.random() * 2000;
        this.tweens.add({ targets: bb, y: by - (w ? 40 : 220), x: bx + Phaser.Math.Between(-12, 12), alpha: 0, duration: life, ease: 'Sine.out', onComplete: () => bb.destroy() }); } }
    for (const g of this.glows.slice(0, 5)) { (g.o as any).x = ((g.t * 8 + (g.o as any).__x0 || 0) % 520) - 20; if ((g.o as any).__x0 === undefined) (g.o as any).__x0 = g.o.x; }
    // interactables: touch (or shoot) the lever, touch the chest, step into the portal
    if (!this.leverOn && Math.abs(p.x - this.lever.x) < 14 && Math.abs(p.y - this.lever.y) < 30) this.pull();
    if (this.leverOn && !this.chestOpen && Math.abs(p.x - this.chest.x) < 20 && Math.abs(p.y - GY) < 20) this.open();
    this.portT -= dt; if (this.portT <= 0 && Math.abs(p.x - this.portal.x) < 16 && Math.abs(p.y - 322) < 20) { this.portT = 2; this.warp(); }
    this.portalB.setScale(1.5 + 0.2 * Math.sin(this.time_ * 3));
    this.cannon.update(dt); this.pk.update(dt, p, k => this.take(k)); this.rapT = Math.max(0, this.rapT - dt); this.powT = Math.max(0, this.powT - dt); this.gun.rapid = this.rapT; p.beam.boost = this.powT > 0 ? 1.8 : 1;
    { const C = FEEL.cam, b = p.body_; this.lookX = Phaser.Math.Linear(this.lookX, p.facing * C.lookX * (Math.abs(b.velocity.x) > 40 ? 1 : 0.4), C.lookLerp); this.lookY = Phaser.Math.Linear(this.lookY, b.velocity.y > 300 ? C.lookFallY : 0, 0.06); cam.setFollowOffset(-this.lookX, 30 - this.lookY); } this.scam.update(dt);
    p.pfx.update(dt); p.beam.update(dt, p.x + p.facing * 16, p.y - (p.poseLock ? 16 : 19), p.facing); this.gun.update(dt); this.egun.update(dt);
    this.gun.shots.getChildren().forEach((o: any) => { if (o.active && !this.leverOn && Math.abs(o.x - this.lever.x) < 10 && Math.abs(o.y - (this.lever.y - 20)) < 22) { this.fx.spark(o.x, o.y); this.gun.kill(o); this.pull(); } });
    this.enemies = this.enemies.filter(e => e.active);
    for (const e of this.enemies) { const near = Math.abs(e.x - p.x) < 520 && Math.abs(e.y - p.y) < 320; e.b.enable = near && !e.dead && (e.kind !== 'boss' || (e as any).st !== 'dying'); if (near) e.tick(dt, p.x, p.y - 14); else e.b.setVelocity(0, 0); }
    this.hud.draw(p.hasJet ? p.fuel / JET.fuel : -1, -1);
    if (p.body_.blocked.down && !this.inWater) this.safe = { x: p.x - p.facing * 6, y: p.y };
    if (!this.arena && !this.won && p.x > AX0 + 40) this.lockArena();
    if (this.arena) { this.hud.draw(p.hasJet ? p.fuel / JET.fuel : -1, Math.max(0, this.boss.hp / this.boss.maxHp)); const a = 0.35 + 0.25 * Math.sin(this.time_ * 8); this.arenaFx.forEach(r => r.setAlpha(a)); }
    if (!this.cpLit && p.x > this.cpX) { this.cpLit = true; audio.sfx('checkpoint'); this.spawn = { x: this.cpX, y: GY }; this.cpLamp.setTint(0x6fe8ff); this.fx.explode(this.cpX, GY - 40, 0.5); this.toast.show('The shrine orb wakes — checkpoint.', '#6fe8ff'); }
    if (p.y > WH + 40) { p.hp -= 1; this.hud.setHp(p.hp); this.fx.shake(120, 0.004); this.respawn(p.hp <= 0); } else if (p.hp <= 0) this.respawn(true);
  }
}
