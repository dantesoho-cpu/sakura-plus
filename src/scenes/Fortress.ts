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
const PLAT_KEYS = ['p_left', 'p_mid', 'p_center', 'p_right', 'p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
// Modular strip placements: [piece, x, walkY]
const STRIPS: [string, number, number][] = [
  // T1 ground docks
  ['p_left', 80, T1], ['p_mid', 228, T1], ['p_center', 464, T1], ['p_mid', 674, T1], ['p_right', 910, T1],
  ['p0', 1100, T1], ['p1', 1340, T1], ['p2', 1560, T1], ['p3', 1720, T1], ['p4', 1920, T1],
  ['p_mid', 2100, T1], ['p_center', 2340, T1], ['p_mid', 2550, T1], ['p0', 2780, T1], ['p1', 3020, T1],
  ['p2', 3240, T1], ['p_mid', 3420, T1], ['p_center', 3660, T1], ['p3', 3880, T1], ['p4', 4080, T1],
  ['p_mid', 4260, T1], ['p0', 4500, T1], ['p1', 4740, T1], ['p_mid', 4960, T1], ['p_center', 5200, T1],
  ['p2', 5420, T1], ['p3', 5600, T1], ['p_mid', 5800, T1], ['p0', 6040, T1], ['p_center', 6280, T1],
  // T2 mid shelves
  ['p5', 320, T2], ['p6', 400, T2], ['p7', 480, T2], ['p8', 560, T2],
  ['p_left', 700, T2], ['p_mid', 848, T2], ['p_right', 1084, T2],
  ['p1', 1300, T2], ['p2', 1520, T2], ['p3', 1700, T2],
  ['p_mid', 2000, T2], ['p_center', 2240, T2], ['p0', 2500, T2],
  ['p4', 2800, T2], ['p5', 2980, T2], ['p_mid', 3200, T2], ['p1', 3440, T2],
  ['p2', 3700, T2], ['p_center', 3900, T2], ['p3', 4200, T2], ['p_mid', 4400, T2],
  ['p0', 4700, T2], ['p4', 4940, T2], ['p_mid', 5200, T2], ['p1', 5500, T2],
  ['p2', 5800, T2], ['p_center', 6000, T2],
  // T3
  ['p8', 200, T3], ['p7', 300, T3], ['p6', 400, T3], ['p_left', 520, T3], ['p_mid', 668, T3], ['p_right', 904, T3],
  ['p0', 1100, T3], ['p1', 1340, T3], ['p_center', 1600, T3], ['p2', 1900, T3],
  ['p3', 2200, T3], ['p_mid', 2450, T3], ['p4', 2700, T3], ['p0', 2950, T3],
  ['p1', 3200, T3], ['p_center', 3450, T3], ['p_mid', 3700, T3], ['p2', 4000, T3],
  ['p3', 4300, T3], ['p_mid', 4550, T3], ['p0', 4850, T3], ['p_center', 5100, T3],
  ['p1', 5400, T3], ['p_mid', 5650, T3], ['p4', 5900, T3],
  // T4 upper
  ['p5', 180, T4], ['p6', 260, T4], ['p_left', 400, T4], ['p_mid', 548, T4], ['p_right', 784, T4],
  ['p0', 1000, T4], ['p1', 1240, T4], ['p2', 1500, T4], ['p_center', 1750, T4],
  ['p3', 2050, T4], ['p_mid', 2300, T4], ['p4', 2550, T4], ['p0', 2800, T4],
  ['p1', 3100, T4], ['p_center', 3350, T4], ['p2', 3650, T4], ['p_mid', 3900, T4],
  ['p3', 4200, T4], ['p0', 4500, T4], ['p_center', 4750, T4], ['p1', 5050, T4],
  ['p_mid', 5300, T4], ['p4', 5550, T4], ['p2', 5800, T4],
  // T5 canopy routes
  ['p8', 150, T5], ['p7', 250, T5], ['p_left', 400, T5], ['p_mid', 548, T5], ['p_center', 784, T5],
  ['p0', 1100, T5], ['p1', 1350, T5], ['p2', 1600, T5], ['p_mid', 1850, T5],
  ['p3', 2150, T5], ['p_center', 2400, T5], ['p4', 2700, T5], ['p0', 2950, T5],
  ['p1', 3250, T5], ['p_mid', 3500, T5], ['p2', 3800, T5], ['p_center', 4050, T5],
  ['p3', 4350, T5], ['p0', 4600, T5], ['p_mid', 4850, T5], ['p1', 5150, T5],
  ['p_center', 5400, T5], ['p4', 5700, T5],
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
  man: Record<string, { w: number; h: number; top: number }> = {};
  constructor() { super('Fortress'); }
  preload() {
    loadFortressPano(this); ftLoad(this);
    this.load.json('ft_plat', 'assets/ft/plat/plat.json');
    for (const n of PLAT_KEYS) this.load.image('ft_' + n, `assets/ft/plat/${n}.png`);
  }
  addRect(x: number, y: number, w: number, h: number, one: boolean) {
    const z = this.add.zone(x + w / 2, y + h / 2, w, h); (one ? this.ones : this.solids).add(z);
    const b = z.body as Phaser.Physics.Arcade.StaticBody;
    if (one) { b.checkCollision.down = false; b.checkCollision.left = false; b.checkCollision.right = false; }
    else this.rects.push(new Phaser.Geom.Rectangle(x, y, w, h));
  }
  place(k: string, x: number, sy: number) {
    const m = this.man[k] || { w: 64, h: 32, top: 0 };
    const key = 'ft_' + k; if (!this.textures.exists(key)) return;
    this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(Math.round(x), Math.round(sy - (m.top || 0)), key).setOrigin(0, 0).setDepth(2);
    this.addRect(x + 2, sy, Math.max(8, (m.w || 64) - 4), 10, true);
  }
  groundAt(x: number, y: number): number {
    // one-way tops near y
    let best = -1;
    for (const r of this.ones.getChildren() as Phaser.GameObjects.Zone[]) {
      const b = r.body as Phaser.Physics.Arcade.StaticBody;
      if (x >= b.x && x <= b.right && Math.abs(b.y - y) < 80 && b.y >= y - 4) {
        if (best < 0 || b.y < best) best = b.y;
      }
    }
    // solid ground band
    if (y <= T1 + 20 && x >= 0 && x < WW) { if (best < 0 || T1 < best) best = T1; }
    return best;
  }
  create() {
    this.got = 0; this.gems = 0; this.kills = 0; this.deaths = 0; this.time_ = 0; this.ending = false;
    this.arena = false; this.won = false; this.cpLit = false; this.cpI = 0; this.rects = []; this.enemies = []; this.walls = [];
    this.dbg = { tiers: [], zones: ['dock', 'gantry', 'spires', 'hangar', 'bridge', 'arena'], portal: 0, ai: 0 };
    this.man = (this.cache.json.get('ft_plat') as any) || {};
    this.physics.world.setBounds(0, 0, WW, WH + 80); this.physics.world.setBoundsCollision(true, true, false, false);
    this.cameras.main.setBackgroundColor(0x1a0a3a);
    this.bg = new PanoramaBg(this);
    // ground band under T1 so voids don't read empty
    this.add.rectangle(0, T1, WW, WH - T1 + 40, 0x1a1030).setOrigin(0, 0).setDepth(1);
    this.add.rectangle(0, T1 - 2, WW, 3, 0x6fe8ff, 0.35).setOrigin(0, 0).setDepth(1.1);
    this.solids = this.physics.add.staticGroup(); this.ones = this.physics.add.staticGroup(); this.flowers = this.physics.add.staticGroup();
    this.enemyGroup = this.physics.add.group();
    // solid floor under entire T1
    this.addRect(0, T1, WW, 48, false);
    for (const [k, x, sy] of STRIPS) this.place(k, x, sy);
    // set pieces: airships, ring portal, banners
    if (this.textures.exists('ft_ship0')) this.add.image(2400, T5 - 40, 'ft_ship0').setOrigin(0.5, 1).setDepth(1.5).setScale(0.55).setAlpha(0.9);
    if (this.textures.exists('ft_ship0')) this.add.image(4800, T4 - 20, 'ft_ship0').setOrigin(0.5, 1).setDepth(1.5).setScale(0.4).setFlipX(true).setAlpha(0.85);
    if (this.textures.exists('ft_ring')) {
      const ring = this.add.image(AX0 - 200, T2 - 40, 'ft_ring').setDepth(3).setScale(0.7);
      this.tweens.add({ targets: ring, angle: 360, duration: 12000, repeat: -1, ease: 'Linear' });
    }
    if (this.textures.exists('ft_hoop')) this.add.image(3600, T5 + 20, 'ft_hoop').setDepth(1.4).setScale(0.6).setAlpha(0.8);
    if (this.textures.exists('ft_deco0')) this.add.image(800, T1, 'ft_deco0').setOrigin(0.5, 1).setDepth(2.2).setScale(0.5);
    if (this.textures.exists('ft_deco1')) this.add.image(3000, T1, 'ft_deco1').setOrigin(0.5, 1).setDepth(2.2).setScale(0.7);
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
    audio.sfx('gate'); this.cameras.main.flash(200, 180, 100, 255); this.toast.show('The fortress awakens!', '#ff4fd8');
    this.boss.wake();
  }
  unlockArena() { this.walls.forEach(z => z.destroy()); this.walls = []; this.arena = false; }
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
    // ring portal mid-level shortcut
    if (!this.portalUsed && Math.abs(p.x - (AX0 - 200)) < 40 && Math.abs(p.y - (T2 - 40)) < 50) {
      this.portalUsed = true; this.dbg.portal++; audio.sfx('respawn'); this.fx.explode(p.x, p.y - 16, 0.5);
      p.setPosition(AX0 - 150, T1 - 4); p.body_.reset(AX0 - 150, T1 - 4);
    }
    // arena trigger
    if (!this.arena && !this.won && p.x > AX0 - 40) this.lockArena();
    if (p.y > WH + 40) { p.hp -= 1; this.hud.setHp(p.hp); this.fx.shake(120, 0.004); this.respawn(p.hp <= 0); }
    else if (p.hp <= 0) this.respawn(true);
  }
}
