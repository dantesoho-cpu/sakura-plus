import Phaser from 'phaser';
import { Beam } from '../weapons/Beam';
import { Player, HP_MAX, JET } from '../player/Player';
import { Fx } from '../systems/Fx';
import { Blaster } from '../weapons/Blaster';
import { Enemy } from '../entities/Enemy';
import { ScoutDrone, GroundBot, Turret } from '../entities/Kurogen';
import { Enforcer } from '../entities/Enforcer';
import { Petals } from '../systems/Petals';
import { Hud } from '../systems/Hud';
import { Toast } from '../systems/Toast';
import { Car } from '../systems/Car';
import { Parallax } from '../systems/Parallax';
import { LEVEL1 } from './level1Map';
import { DECO, DECO_SIZE } from '../decoList';
// Akari Valley Zone (chapter 1: 2023). Tilemap layers (GPU-culled) for solids + one-way ledges; decor culled manually.
export const TS = 16;
export const MEMORIES = [
  'Memory: Mom humming by the lake while the blossoms fell.',
  'Memory: Racing Kenji up the shrine steps — he always let me win.',
  'Memory: The valley lanterns lit for the first night of spring.',
  'Memory: Dad\'s hands, grease-black, fixing the old car.',
  'Memory: "Wherever you go, Akari Valley will remember you."',
  'Memory: Paper cranes on the bridge rail, one for every wish.',
  'Memory: The waterfall roar, and falling asleep on warm stone.',
  'Memory: The day the Kurogen ships first darkened the sky.',
  'Memory: Promising to come home once the war was over.',
  'Memory: 2023 — the last spring before everything changed.',
];
// slope tiles: frame index + surface height (px from tile top) at local x 0..15
export const SLOPES: Record<string, number> = { '/': 0, '\\': 1, u: 2, U: 3, n: 4, N: 5 };
export const slopeH = (f: number, c: number) => [15 - c, c, 16 - (c + 1) / 2, 8 - (c + 1) / 2, c / 2, 8 + c / 2][f];
const ARENA = { x0: 404, x1: 470 };
export class Level1 extends Phaser.Scene {
  player!: Player; fx!: Fx; gun!: Blaster; egun!: Blaster; enemies: Enemy[] = []; petals!: Petals; hud!: Hud; toast!: Toast; bg!: Parallax;
  solid!: Phaser.Tilemaps.TilemapLayer; oneway!: Phaser.Tilemaps.TilemapLayer; enemyGroup!: Phaser.Physics.Arcade.Group;
  flowers!: Phaser.Physics.Arcade.StaticGroup; got = 0; kills = 0; deaths = 0; time_ = 0; spawn = { x: 0, y: 0 }; safe = { x: 0, y: 0 };
  boss!: Enforcer; bossDead = false; arena = false; walls!: Phaser.Physics.Arcade.StaticGroup; gate!: Phaser.Physics.Arcade.Image; gateFx!: Phaser.GameObjects.TileSprite;
  gateOpen = false; ending = false; shrineX = 0; shrineLit = false; jetPick!: Phaser.Physics.Arcade.Image; carX = 0; car!: Car;
  falls: Phaser.GameObjects.TileSprite[] = []; waters: Phaser.GameObjects.TileSprite[] = []; deco: Phaser.GameObjects.Image[] = []; cullT = 0; gateToastT = 0;
  constructor() { super('Level1'); }
  falls2: { t: Phaser.GameObjects.TileSprite; v: number }[] = [];
  /** Lush waterfall: two scrolling sheets at different speeds, lip foam, plunge foam, rising mist, splash droplets and glints. */
  waterfall(x: number, y: number, w: number, h: number, big = false) {
    const back = this.add.tileSprite(x - 2, y, w + 4, h, 'waterfall').setOrigin(0).setDepth(big ? -6 : 0.9).setAlpha(0.55).setTint(0x8fd8ff).setTileScale(big ? 1 : 1, 1);
    const front = this.add.tileSprite(x, y, w, h, 'waterfall').setOrigin(0).setDepth(big ? -5.9 : 1).setAlpha(0.92);
    const hi = this.add.tileSprite(x + w * 0.2, y, w * 0.6, h, 'waterfall').setOrigin(0).setDepth(big ? -5.8 : 1.1).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    // shaded edges + streaks so the sheet reads as falling water, not a flat stripe
    const ew = big ? 10 : 5; for (const ex of [x, x + w - ew]) this.add.tileSprite(ex, y, ew, h, 'waterfall').setOrigin(0).setDepth(front.depth + 0.05).setTint(0x2a68a8).setAlpha(0.6);
    if (big) for (let i = 0; i < 4; i++) { const st = this.add.tileSprite(x + 14 + i * 24, y, 6, h, 'waterfall').setOrigin(0).setDepth(front.depth + 0.06).setTint(i % 2 ? 0x5aa0e0 : 0xffffff).setAlpha(0.3).setBlendMode(i % 2 ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD); this.falls2.push({ t: st, v: 90 + i * 25 }); }
    this.falls.push(front); this.falls2.push({ t: back, v: 45 }, { t: hi, v: 120 });
    const bot = y + h - 6, cx = x + w / 2, d = big ? -5.7 : 4;
    this.add.ellipse(cx, y + 2, w + 6, 6, 0xeaffff, 0.85).setDepth(d);   // lip foam
    const foam = this.add.ellipse(cx, bot + 2, w * 1.5, big ? 14 : 9, 0xffffff, 0.8).setDepth(d); this.tweens.add({ targets: foam, scaleX: 1.12, scaleY: 0.85, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.inOut' });
    this.add.particles(0, 0, 'glow', { x: { min: x - 6, max: x + w + 6 }, y: bot, speedY: { min: -14, max: -30 }, speedX: { min: -12, max: 12 }, scale: { start: big ? 0.9 : 0.5, end: big ? 1.8 : 1.1 }, alpha: { start: 0.28, end: 0 }, tint: 0xe8f8ff, lifespan: 1600, frequency: big ? 60 : 160 }).setDepth(d + 0.1);
    this.add.particles(0, 0, 'pip', { x: { min: x, max: x + w }, y: bot, speedY: { min: -60, max: -120 }, speedX: { min: -50, max: 50 }, gravityY: 300, scale: { min: 0.3, max: 0.6 }, tint: [0xffffff, 0xbff0ff], lifespan: 700, frequency: big ? 40 : 110 }).setDepth(d + 0.2);
    this.add.particles(0, 0, 'spark', { x: { min: x, max: x + w }, y: { min: y, max: y + h }, scale: { start: 0.5, end: 0 }, alpha: { start: 0.9, end: 0 }, lifespan: 500, frequency: big ? 90 : 300, blendMode: 'ADD' }).setDepth(d + 0.3);
  }
  /** Modular wooden bridge: varied planks (knots / mossy / broken), posts at uneven spacing, sagging double rope, stone end caps. */
  bridge(x0: number, x1: number, yt: number, seed: number) {
    const tx = this.textures.get('pr_bridge_parts');
    if (!tx.has('p0')) { for (let i = 0; i < 5; i++) tx.add('p' + i, 0, i * 16, 0, 16, 7); tx.add('post', 0, 80, 0, 4, 20); tx.add('capL', 0, 88, 0, 10, 34); tx.add('capR', 0, 102, 0, 10, 34); }
    let h = (seed * 7919) % 233280; const r = () => (h = (h * 9301 + 49297) % 233280) / 233280;
    const n = Math.ceil((x1 - x0) / 16), V = Phaser.Math.Vector2;
    this.add.rectangle(x0, yt + 6, x1 - x0, 2, 0x2c1a1e).setOrigin(0).setDepth(2.9);
    let last = -1;
    for (let i = 0; i < n; i++) { const v = r(); let f = v < 0.09 && i > 1 && i < n - 2 && last !== 4 ? 4 : v < 0.24 ? 3 : Math.floor(r() * 3); if (f === last && f < 3) f = (f + 1) % 3; last = f;
      const im = this.add.image(x0 + i * 16, yt - 1 + (r() < 0.3 ? 1 : 0), 'pr_bridge_parts', 'p' + f).setOrigin(0).setDepth(3); if (r() < 0.4) im.setFlipX(true); }
    const posts = [x0 + 1]; for (let px = x0 + 44 + Math.floor(r() * 20); px < x1 - 30; px += 44 + Math.floor(r() * 28)) posts.push(px); posts.push(x1 - 5);
    posts.forEach(px => this.add.image(px, yt + 4, 'pr_bridge_parts', 'post').setOrigin(0, 1).setDepth(3.2));
    const g = this.add.graphics().setDepth(3.1);
    for (const [dy, sag] of [[-14, 4], [-8, 2]]) for (let i = 0; i < posts.length - 1; i++) { const a = posts[i] + 2, b = posts[i + 1] + 2, sg = sag + (b - a) / 30;
      const pts = new Phaser.Curves.QuadraticBezier(new V(a, yt + dy), new V((a + b) / 2, yt + dy + sg * 2), new V(b, yt + dy)).getPoints(Math.max(8, Math.round((b - a) / 4)));
      g.lineStyle(2, 0x2c1a1e).strokePoints(pts); g.lineStyle(1, 0xba9668).strokePoints(pts); }
    this.add.image(x0 - 8, yt + 20, 'pr_bridge_parts', 'capL').setOrigin(0, 1).setDepth(3.3); this.add.image(x1 - 2, yt + 20, 'pr_bridge_parts', 'capR').setOrigin(0, 1).setDepth(3.3);
  }
  create() {
    const M = LEVEL1, MW = M[0].length, MH = M.length, worldW = MW * TS, worldH = MH * TS;
    Object.assign(this, { enemies: [], got: 0, kills: 0, deaths: 0, time_: 0, bossDead: false, arena: false, gateOpen: false, ending: false, shrineLit: false, falls: [], falls2: [], waters: [], deco: [] });
    this.bg = new Parallax(this);
    const at = (x: number, y: number) => (x < 0 || x >= MW) ? '#' : (y < 0 ? '.' : y >= MH ? (M[MH - 1][x] === '#' ? '#' : '.') : M[y][x]);
    const S = (x: number, y: number) => at(x, y) === '#' || at(x, y) in SLOPES; this.at = at;
    // --- tile layers ---
    const sd: number[][] = [], od: number[][] = [];
    for (let y = 0; y < MH; y++) { sd.push([]); od.push([]); for (let x = 0; x < MW; x++) {
      const c = M[y][x]; let f = -1, o = -1;
      if (c === '#') { const u = S(x, y - 1), l = S(x - 1, y), r = S(x + 1, y), d = S(x, y + 1);
        if (!u) f = !l ? 6 : !r ? 7 : (x % 2 ? 3 : 2);
        else if (!S(x, y - 2) && !l && d) f = 22; else if (!S(x, y - 2) && !r && d) f = 23;
        else if (!l) f = d ? 4 : 18; else if (!r) f = d ? 5 : 19; else if (!d) f = 10;
        else if (!S(x, y - 2) && d) f = (x % 2 ? 21 : 20);
        else if (!S(x + 1, y - 1)) f = 8; else if (!S(x - 1, y - 1)) f = 9; else f = this.fillTile(x, y); }
      else if (c === '=') o = at(x - 1, y) !== '=' ? 6 : at(x + 1, y) !== '=' ? 7 : (x % 2 ? 3 : 2);
      else if (c === 'H') o = -2;
      else if (c in SLOPES) this.add.image(x * TS, y * TS, 'slopes', SLOPES[c]).setOrigin(0).setDepth(2);
      sd[y].push(f); od[y].push(o === -2 ? -1 : o);
    } }
    const mk = (data: number[][], depth: number) => { const map = this.make.tilemap({ data, tileWidth: TS, tileHeight: TS });
      const ts = map.addTilesetImage('tiles', 'tiles', TS, TS, 0, 0)!; return map.createLayer(0, ts, 0, 0)!.setDepth(depth); };
    this.solid = mk(sd, 2); this.solid.setCollisionByExclusion([-1]);
    // ground directly under a slope tile is handled by the slope probe (avoids corner snags on the slope seam)
    this.solid.forEachTile(t => { if (t.index >= 0 && at(t.x, t.y - 1) in SLOPES) t.setCollision(false, false, false, false); });
    this.oneway = mk(od, 2); this.oneway.setCollisionByExclusion([-1]);
    this.oneway.forEachTile(t => { if (t.index >= 0) t.setCollision(false, false, true, false); });
    // bridge decks (H): invisible one-way tiles + bridge art
    const deck = this.make.tilemap({ width: MW, height: MH, tileWidth: TS, tileHeight: TS }); const dts = deck.addTilesetImage('tiles', 'tiles', TS, TS, 0, 0)!;
    const deckL = deck.createBlankLayer('deck', dts)!.setVisible(false);
    for (let y = 0; y < MH; y++) { let x = 0; while (x < MW) { if (M[y][x] !== 'H') { x++; continue; } let e = x; while (M[y][e] === 'H') e++;
      for (let i = x; i < e; i++) deckL.putTileAt(2, i, y).setCollision(false, false, true, false);
      this.bridge(x * TS, e * TS, y * TS, x * 31 + y);
      x = e; } }
    // setpiece: the great gorge falls pouring from under the T2 shelf, behind the long gorge bridge (row 62)
    this.waterfall(152 * TS - 56, 39 * TS, 112, 49 * TS + 10, true);
    // --- systems ---
    this.flowers = this.physics.add.staticGroup(); this.walls = this.physics.add.staticGroup();
    this.fx = new Fx(this); this.gun = new Blaster(this, 'p', 'shot'); this.egun = new Blaster(this, 'e', 'ebolt', { cooldown: 0, speed: 150, life: 3 });
    this.enemyGroup = this.physics.add.group({ allowGravity: false });
    const prop = (k: string, x: number, y: number, d = -10) => this.cull(this.add.image(x, y, k).setOrigin(0.5, 1).setDepth(d));
    let bushN = 0, mem = 0;
    M.forEach((row, y) => [...row].forEach((c, x) => {
      const px = x * TS, cx = px + 8, gy = (y + 1) * TS;
      if (c === 'w') { let e = y; while (e < MH && !S(x, e) && at(x, e) !== '=') e++;
        this.waterfall(px - 8, y * TS, 32, (e - y) * TS + 8); }
      else if (c === 'f') { const fl = this.flowers.create(cx, gy - 8, 'pr_flower').setDepth(6) as any; fl.mem = mem++;
        this.tweens.add({ targets: fl, y: gy - 11, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' }); }
      else if (c === 'b') this.addE(new GroundBot(this, cx, gy, this.fx));
      else if (c === 'd') this.addE(new ScoutDrone(this, cx, gy, this.fx));
      else if (c === 't') this.addE(new Turret(this, cx, gy, this.fx, this.egun));
      else if (c === 'K') { this.boss = new Enforcer(this, cx, gy - 30, this.fx, this.egun); this.enemyGroup.add(this.boss); this.boss.b.setAllowGravity(false);
        const bg = this.rawGround(cx, gy - 8); if (bg > 0) { this.boss.gy = bg - 36; this.boss.y = this.boss.gy; } }
      else if (c === 'P') { this.spawn = { x: cx, y: gy }; }
      else if (c === 'J') { this.jetPick = this.physics.add.staticImage(cx, gy - 12, 'pr_jetboots').setDepth(6);
        this.tweens.add({ targets: this.jetPick, y: gy - 16, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' }); }
      else if (c === 'R') prop('pr_tree', cx, gy, -12); else if (c === 'r') prop('pr_tree2', cx, gy, -12);
      else if (c === 'L') prop('pr_lantern2', cx, gy, -5); else if (c === 'B') prop(bushN++ % 2 ? 'pr_bush2' : 'pr_bush', cx, gy, -4);
      else if (c === 'A') prop('pr_arch', cx, gy, -6); else if (c === 'F') prop('pr_fence', cx, gy, -4);
      else if (c === 'S') { prop('pr_shrine', cx, gy, -5); this.shrineX = cx; }
      else if (c === 'T') prop('pr_torii', cx, gy, -6);
      else if (c === 'C') { this.car = new Car(this, cx, gy + 1).setDepth(5); this.carX = cx; }
      else if (c === 'G') { this.gate = this.physics.add.staticImage(cx, gy - 40, 'px').setVisible(false); (this.gate.body as any).setSize(16, 80);
        this.add.image(cx, gy, 'pr_arch').setOrigin(0.5, 1).setDepth(-3).setScale(1.2, 1.6);
        this.gateFx = this.add.tileSprite(cx - 8, gy - 52, 16, 52, 'waterfall').setOrigin(0).setTint(0x66e0ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(7); }
    }));
    // water in pits (lakes)
    for (let x = 0; x < MW; x++) if (!S(x, MH - 1) && M[MH - 1][x] !== '#') { let e = x; while (e < MW && !S(e, MH - 1)) e++;
      this.waters.push(this.add.tileSprite(x * TS, (MH - 4) * TS + 6, (e - x) * TS, 4 * TS, 'water').setOrigin(0).setDepth(3).setAlpha(0.9)); x = e; }
    this.buildSurfaceSkin(at, MW);
    this.placeDeco(at, S);
    this.placeGen2(at, S);
    this.anchorProps();
    this.animateProps();
    // --- player + colliders ---
    this.physics.world.setBounds(0, 0, worldW, worldH + 400);
    this.player = new Player(this, this.spawn.x, this.spawn.y); this.player.gun = this.gun;
    this.player.beam = new Beam(this, this.fx, () => this.enemyGroup.getChildren() as any, (x, y) => !!this.solid.getTileAtWorldXY(x, y)?.collides); this.player.beam.owner = this.player; this.safe = { ...this.spawn };
    this.physics.add.collider(this.player, this.solid); this.physics.add.collider(this.player, this.oneway); this.physics.add.collider(this.player, deckL);
    this.physics.world.on('worldstep', () => this.slopeSnap());
    this.physics.add.collider(this.player, this.walls); this.physics.add.collider(this.player, this.gate);
    this.physics.add.collider(this.enemyGroup, this.solid, undefined, (e: any) => e.kind === 'bot');
    this.physics.add.collider(this.gun.shots, this.solid, (s: any) => { this.fx.spark(s.x, s.y); this.gun.kill(s); });
    this.physics.add.collider(this.egun.shots, this.solid, (s: any) => this.egun.kill(s));
    this.physics.add.overlap(this.gun.shots, this.enemyGroup, (s: any, e: any) => { if (!s.active || e.dead) return; this.gun.kill(s); e.hit(s.damage, s.body.velocity.x > 0 ? 1 : -1); });
    const hurt = () => { this.fx.hitStop(60); this.fx.shake(140, 0.005); };
    this.physics.add.overlap(this.player, this.enemyGroup, (_p, e: any) => { if (!e.dead && (e.kind !== 'boss' || e.awake) && this.player.damage(e.x)) hurt(); });
    this.physics.add.overlap(this.player, this.egun.shots, (_p, s: any) => { if (s.active && this.player.damage(s.x)) { this.egun.kill(s); hurt(); } });
    this.physics.add.overlap(this.player, this.flowers, (_p, f: any) => this.collect(f));
    this.physics.add.overlap(this.player, this.jetPick, () => this.pickJet());
    this.hud = new Hud(this, HP_MAX, true); this.hud.setHp(this.player.hp); this.player.on('hurt', (hp: number) => this.hud.setHp(hp));
    this.toast = new Toast(this); this.petals = new Petals(this);
    const cam = this.cameras.main; cam.setBounds(0, 0, worldW, worldH); cam.startFollow(this.player, true, 0.15, 0.15, 0, 30); cam.setDeadzone(40, 40); cam.setRoundPixels(true);
    cam.fadeIn(400);
    // boss wiring
    this.boss.summon = (x, y) => { if (this.enemies.filter(e => e.kind === 'drone' && e.active && Math.abs(e.x - this.boss.x) < 600).length < 2) this.addE(new ScoutDrone(this, x, y, this.fx)); };
    this.boss.on('dying', () => { this.hud.draw(-1, 0); }); this.boss.on('destroyed', () => this.onBossDead());
    const kb = this.input.keyboard!;
    const pause = () => { if (this.ending) return; this.scene.launch('Pause'); this.scene.pause(); };
    kb.on('keydown-P', pause); kb.on('keydown-ESC', pause);
    this.toast.show('Akari Valley. Home — after all these years.');
    (window as any).__lvl = this;
  }
  at!: (x: number, y: number) => string; onSlope = false; slopeLog: { x: number; y: number; g: boolean }[] = [];
  // Sonic-style two-sensor ground probe: surface under the body's left/right foot; snaps onto slopes, keeps contact downhill.
  surface(x: number, feet: number): number {
    const cx = Math.floor(x / TS), r0 = Math.floor(feet / TS); let best = Infinity;
    for (let ry = r0 - 1; ry <= r0 + 1; ry++) { const c = this.at(cx, ry), up = this.at(cx, ry - 1);
      let sy = Infinity; if (c in SLOPES) sy = ry * TS + slopeH(SLOPES[c], Phaser.Math.Clamp(x - cx * TS, 0, 15));
      else if (c === '#' && up !== '#' && !(up in SLOPES)) sy = ry * TS;
      if (sy >= feet - 10 && sy < best) best = sy; }
    const k = this.skinY.get(Math.round(x)); if (k !== undefined && best !== Infinity && Math.abs(k - best) < 8) best = Math.min(best, k);
    return best;
  }
  slopeSnap() {
    const p = this.player, b = p?.body_; if (!b || !b.enable) return; const was = this.onSlope; this.onSlope = false;
    if (b.velocity.y < 0) return;
    const feet = b.bottom, lead = 3, xs = [b.left - (b.velocity.x < 0 ? lead : 0), b.right - 0.01 + (b.velocity.x > 0 ? lead : 0)]; let sy = Infinity, slope = false;
    for (const x of xs) { const v = this.surface(x, feet); if (v < sy) sy = v; const cx = Math.floor(x / TS), c = this.at(cx, Math.floor((v - 0.01) / TS)), c2 = this.at(cx, Math.floor(v / TS)); if (c in SLOPES || c2 in SLOPES) slope = true; }
    if ((!slope && !was) || sy === Infinity) return;
    const tol = was ? 9 : 1;
    if (feet >= sy - tol && feet <= sy + 12) { const dy = Math.floor(sy) - feet; b.y += dy; b.velocity.y = 0; b.blocked.down = true; b.touching.down = true; this.onSlope = true; }
  }
  // ---- continuous blossom skin over slope zones: smoothed surface => rounded crests / soft toes, cap wraps without stair-steps ----
  skinY = new Map<number, number>();
  rawGround(px: number, y0: number): number { // first walkable surface at/under pixel row y0
    const cx = Math.floor(px / TS);
    for (let ry = Math.max(0, Math.floor(y0 / TS)); ry < LEVEL1.length; ry++) { const c = this.at(cx, ry), up = this.at(cx, ry - 1);
      if (c in SLOPES) return ry * TS + slopeH(SLOPES[c], Phaser.Math.Clamp(px - cx * TS, 0, 15));
      if ((c === '#' || c === '=' || c === 'H') && up !== '#' && !(up in SLOPES)) return ry * TS; }
    return -1;
  }
  groundAt(px: number, y0: number) { const r = this.rawGround(Math.round(px), y0), k = this.skinY.get(Math.round(px)); return k !== undefined && r >= 0 && Math.abs(k - r) < 8 ? k : r; }
  buildSurfaceSkin(at: (x: number, y: number) => string, MW: number) {
    const mark = new Uint8Array(MW);
    for (let y = 0; y < LEVEL1.length; y++) for (let x = 0; x < MW; x++) if (at(x, y) in SLOPES) for (let d = -2; d <= 2; d++) if (x + d >= 0 && x + d < MW) mark[x + d] = 1;
    const src = this.textures.get('tiles').getSourceImage() as HTMLImageElement;
    for (let x = 0; x < MW; x++) { if (!mark[x]) continue; let e = x; while (e < MW && mark[e]) e++;
      // slope rows of this cluster
      let top = 1e9; for (let cx = x; cx < e; cx++) for (let y = 0; y < LEVEL1.length; y++) if (at(cx, y) in SLOPES) top = Math.min(top, y);
      const x0 = x * TS, w = (e - x) * TS, raw: number[] = [];
      for (let px = 0; px < w; px++) raw.push(this.rawGround(x0 + px, (top - 2) * TS));
      let sm = raw.slice(); for (let pass = 0; pass < 3; pass++) { const n = sm.slice(); for (let i = 0; i < w; i++) { let a = 0, k = 0; for (let j = -4; j <= 4; j++) { const v = sm[Phaser.Math.Clamp(i + j, 0, w - 1)]; if (v >= 0) { a += v; k++; } } n[i] = k ? a / k : sm[i]; } sm = n; }
      // keep the ends pinned to the flat tiles so the skin meets the normal caps seamlessly
      for (let i = 0; i < w; i++) { const t = Math.min(i, w - 1 - i) / 12; if (t < 1) sm[i] = raw[i] + (sm[i] - raw[i]) * t; if (raw[i] >= 0) sm[i] = Math.min(sm[i], raw[i]); }
      const ymin = Math.floor(Math.min(...sm.filter(v => v >= 0))) - 2, ymax = Math.ceil(Math.max(...sm)) + 20;
      const key = 'skin' + x; if (this.textures.exists(key)) this.textures.remove(key); const ct = this.textures.createCanvas(key, w, ymax - ymin)!; const ctx = ct.getContext();
      for (let i = 0; i < w; i++) { if (raw[i] < 0) continue; const y = Math.round(sm[i]); this.skinY.set(x0 + i, y);
        const col = 32 + ((x0 + i) & 15);
        // stone under the cap where smoothing lifted the surface above the tile art, then the blossom column
        if (y < raw[i]) ctx.drawImage(src, (x0 + i) & 15, 4, 1, 12, i, y - ymin + 6, 1, raw[i] - y + 4);
        ctx.drawImage(src, col, 0, 1, 16, i, y - ymin - 1, 1, 16); }
      ct.refresh(); this.add.image(x0, ymin, key).setOrigin(0).setDepth(2.5); x = e; }
  }
  // ---- seat every grounded prop into the terrain: trim transparent padding, follow slope height, bury 3px under the cap ----
  padCache: Record<string, number> = {};
  anchorProps() {
    const pad = (img: Phaser.GameObjects.Image) => { const k = img.texture.key + ':' + img.frame.name; if (this.padCache[k] !== undefined) return this.padCache[k];
      const w = img.frame.width, h = img.frame.height; let p = 0;
      outer: for (let y = h - 1; y >= 0; y--) { let n = 0; for (let x = 0; x < w; x++) if (this.textures.getPixelAlpha(x, y, img.texture.key, img.frame.name)! > 40) n++; if (n >= Math.max(2, w * 0.08)) break outer; p++; }
      return this.padCache[k] = p; };
    const list: Phaser.GameObjects.Image[] = [...this.deco.filter(o => (o as any).originY === 1 && o.depth !== -16 && !(o.texture.key.startsWith('skin'))) as any];
    if (this.car) { const g = this.groundAt(this.car.x, this.car.y - 18); if (g >= 0) this.car.y = g + 1; }
    this.children.list.forEach(o => { const i = o as any; if (i.texture?.key === 'pr_arch') list.push(i); });
    this.anchored = 0;
    for (const img of list) { const hw = img.displayWidth / 2, near = img.y - 18;
      const g = [img.x, img.x - hw * 0.4, img.x + hw * 0.4].map(x => this.groundAt(x, near)).filter(v => v >= 0); if (!g.length) continue;
      const c = this.groundAt(img.x, near), gy = Math.min(Math.max(...g), (c >= 0 ? c : g[0]) + 6);
      const p = pad(img) * img.scaleY; img.y = gy + p + 3; this.anchored++; }
  }
  anchored = 0; crystals: [number, number][] = [];
  // ground fill variety: 2x2 metablocks from tileset2 (mossy / cracked / rooty / crystal), region-weighted noise so no visible repeats
  fillTile(x: number, y: number) {
    const h = (a: number, b: number) => { let n = (a * 374761393 + b * 668265263) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0); };
    const bx = x >> 1, by = y >> 1, r = h(bx >> 3, by >> 2) % 100, hb = h(bx, by);
    let kind = r < 40 ? 0 : r < 75 ? 1 : 2; if (hb % 19 === 0) kind = 3; if (hb % 7 === 0) kind = (kind + 1) % 3;
    if (kind === 3 && (x & 1) === 0 && (y & 1) === 0) this.crystals.push([x * 16 + 16, y * 16 + 16]);
    return 24 + (kind * 4 + (hb >>> 5) % 4) * 4 + (x & 1) + (y & 1) * 2;
  }
  addE(e: Enemy) { this.enemies.push(e); this.enemyGroup.add(e); e.b.setAllowGravity(false);
    if (e.kind === 'turret') { e.b.moves = false; e.b.setImmovable(true); }
    e.on('destroyed', (x: Enemy) => { if (x.kind !== 'boss') this.kills++; }); }
  cull<T extends Phaser.GameObjects.Image>(o: T) { this.deco.push(o); return o; }
  placeDeco(at: (x: number, y: number) => string, S: (x: number, y: number) => boolean) {
    // seeded, non-repeating placement of every cut piece from sakuratileset across all walkable surfaces
    let seed = 1234; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const recent: string[] = []; const pick = (list: string[], maxW: number) => {
      const ok = list.filter(k => !recent.includes(k) && DECO_SIZE[k][0] <= maxW); if (!ok.length) return null;
      const k = ok[Math.floor(rnd() * ok.length)]; recent.push(k); if (recent.length > 10) recent.shift(); return k; };
    const M = LEVEL1, busy = (x: number, y: number) => { for (let i = -2; i <= 2; i++) if (/[A-Za-z]/.test(at(x + i, y - 1))) return true; return false; };
    for (let y = 1; y < M.length; y++) {
      let x = 2; while (x < M[0].length - 2) {
        if (!(S(x, y) && !S(x, y - 1) && at(x, y - 1) === '.')) { x++; continue; }
        let e = x; while (S(e, y) && !S(e, y - 1)) e++; const run = e - x; const px = x * TS, top = y * TS;
        // background ruins chunk behind long runs
        if (run >= 10 && rnd() < 0.5) { const k = pick(DECO.chunk, run * TS - 20); if (k) this.cull(this.add.image(px + rnd() * (run * TS - DECO_SIZE[k][0]) + DECO_SIZE[k][0] / 2, top + 6, 'dc_' + k).setOrigin(0.5, 1).setDepth(-16).setTint(0xc9c0dd)); }
        // trees on wide runs
        if (run >= 6 && rnd() < 0.6) { const k = pick(DECO.tree, 60); const tx = px + 24 + rnd() * (run * TS - 48); if (k && !busy(Math.floor(tx / TS), y)) this.cull(this.add.image(tx, top + 2, 'dc_' + k).setOrigin(0.5, 1).setDepth(-13).setScale(rnd() < 0.5 ? 1 : 0.8)); }
        // regenerated cherry trees (from the tileset trees): big landmark trees on long runs, saplings sprinkled in
        if (run >= 14 && rnd() < 0.55) { const tx = px + 70 + rnd() * (run * TS - 140); if (!busy(Math.floor(tx / TS), y)) this.cull(this.add.image(tx, top + 3, 'pr_tree_big' + (rnd() < 0.5 ? 0 : 1)).setOrigin(0.5, 1).setDepth(-14).setFlipX(rnd() < 0.5)); }
        if (run >= 4) for (let i = 0, m = run >= 12 ? 2 : 1; i < m; i++) if (rnd() < 0.5) { const tx = px + 14 + rnd() * (run * TS - 28); if (!busy(Math.floor(tx / TS), y)) this.cull(this.add.image(tx, top + 2, 'pr_tree_s' + Math.floor(rnd() * 3)).setOrigin(0.5, 1).setDepth(-12).setFlipX(rnd() < 0.5)); }
        // small ground props every 2-6 tiles
        for (let cx = x + 1; cx < e - 1; cx += 2 + Math.floor(rnd() * 5)) { if (busy(cx, y)) continue;
          const k = pick(DECO.ground, 40); if (!k) continue; const front = rnd() < 0.12 && DECO_SIZE[k][1] < 14;
          this.cull(this.add.image(cx * TS + 8, top + 2, 'dc_' + k).setOrigin(0.5, 1).setDepth(front ? 11 : -4)); }
        x = e;
      }
    }
    // landmarks & water pieces from the sheet near pits / waterfalls
    const lm = DECO.landmark; let li = 0;
    for (let x = 6; x < M[0].length - 6; x += 37) { const y = this.surfaceBelow(x, 80, S); if (y > 0 && !busy(x, y)) this.cull(this.add.image(x * TS, y * TS + 2, 'dc_' + lm[li++ % lm.length]).setOrigin(0.5, 1).setDepth(-7)); }
    const wl = DECO.water; let wi = 0;
    for (const f of this.falls) this.cull(this.add.image(f.x + 16, f.y + f.height - 2, 'dc_' + wl[wi++ % wl.length]).setOrigin(0.5, 1).setDepth(2).setAlpha(0.95));
  }
  // ---- second-gen pieces (regenerated in the sakuratileset style): ruins, pillars, walls, scaffolds, banners, lanterns, rocks, plants ----
  sway: Phaser.GameObjects.Image[] = []; lanterns: Phaser.GameObjects.Image[] = [];
  placeGen2(at: (x: number, y: number) => string, S: (x: number, y: number) => boolean) {
    let seed = 98765; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const BIG = [1, 5, 6, 9, 10, 19], MID = [0, 4, 7, 8, 13, 12, 23, 11], SMALL = [2, 3, 15, 16, 17, 20, 21], PLANT = [22, 24, 22, 24];
    const W = (i: number) => this.textures.get('pp' + i).getSourceImage().width as number;
    const bag: Record<string, number[]> = {}; const draw = (name: string, list: number[], maxW: number) => { // shuffle-bag so pieces cycle without repeats
      let b = bag[name]; if (!b || !b.length) b = bag[name] = [...list].sort(() => rnd() - 0.5); const i = b.findIndex(k => W(k) <= maxW); return i < 0 ? -1 : b.splice(i, 1)[0]; };
    const busy = (x: number, y: number) => { for (let i = -1; i <= 1; i++) if (/[A-Za-z]/.test(at(x + i, y - 1))) return true; return false; };
    const M = LEVEL1;
    for (let y = 1; y < M.length; y++) { let x = 2; while (x < M[0].length - 2) {
      if (!(S(x, y) && !S(x, y - 1) && at(x, y - 1) === '.')) { x++; continue; }
      let e = x; while (S(e, y) && !S(e, y - 1)) e++; const run = e - x, top = y * TS;
      if (run >= 12 && rnd() < 0.45) { const k = draw('big', BIG, run * TS - 40); if (k >= 0) this.cull(this.add.image(x * TS + 20 + rnd() * (run * TS - 40 - W(k)) + W(k) / 2, top + 4, 'pp' + k).setOrigin(0.5, 1).setDepth(-15).setTint(0xd8d0e8)); }
      if (run >= 5 && rnd() < 0.55) { const k = draw('mid', MID, run * TS - 16); const cx = Math.floor(x + 1 + rnd() * (run - 2)); if (k >= 0 && !busy(cx, y)) { const o = this.cull(this.add.image(cx * TS + 8, top + 2, 'pp' + k).setOrigin(0.5, 1).setDepth(-9)); if (k === 12) this.lanterns.push(o); } }
      for (let cx = x + 1; cx < e - 1; cx += 3 + Math.floor(rnd() * 6)) { if (busy(cx, y)) continue; const plant = rnd() < 0.6;
        const k = plant ? draw('plant', PLANT, 60) : draw('small', SMALL, 70); if (k < 0) continue;
        const o = this.cull(this.add.image(cx * TS + 8, top + 2, 'pp' + k).setOrigin(0.5, 1).setDepth(plant && rnd() < 0.25 ? 11 : -5).setScale(plant ? 0.7 + rnd() * 0.3 : 0.8)); if (plant) this.sway.push(o); }
      x = e; } }
  }
  animateProps() {
    // grass & flower clumps sway from their base; lanterns flicker with an additive glow; crystal veins in the ground pulse
    this.sway.forEach((o, i) => this.tweens.add({ targets: o, angle: { from: -2.5, to: 2.5 }, duration: 1400 + (i * 137) % 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: (i * 211) % 1200 }));
    for (const l of this.lanterns) { const g = this.cull(this.add.image(l.x, l.y - l.displayHeight * 0.55, 'glow').setTint(0xffb347).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setDepth(l.depth + 0.1));
      this.tweens.add({ targets: g, alpha: { from: 0.45, to: 0.95 }, scale: { from: 1.4, to: 1.8 }, duration: 90, yoyo: true, repeat: -1, repeatDelay: 140, ease: 'Stepped' }); }
    this.crystals.forEach(([cx, cy], i) => { const g = this.cull(this.add.image(cx, cy, 'glow').setTint(0xff7ad9).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9).setDepth(2.2).setAlpha(0.2));
      this.tweens.add({ targets: g, alpha: 0.75, duration: 900 + (i * 97) % 700, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: (i * 173) % 1500 }); });
  }
  surfaceBelow(x: number, y0: number, S: (x: number, y: number) => boolean) { for (let y = y0; y < LEVEL1.length; y++) if (S(x, y) && !S(x, y - 1)) return y; return -1; }
  collect(f: any) {
    if (!f.active) return; f.destroy(); this.got++; this.hud.setMem(this.got); this.fx.spark(f.x, f.y); this.player.trail.explode(14, f.x, f.y);
    this.toast.show(MEMORIES[this.got - 1] + `  (${this.got}/10)`, '#ffd6f0');
  }
  pickJet() {
    if (this.player.hasJet) return; this.player.hasJet = true; this.fx.explode(this.jetPick.x, this.jetPick.y, 0.6); this.jetPick.destroy();
    this.toast.show('KUROGEN-TECH JET BOOTS — salvaged from a downed scout.', '#7fe9ff');
    this.toast.show('After a double jump, HOLD SPACE to thrust. Fuel refills on landing.', '#7fe9ff');
  }
  onBossDead() {
    this.bossDead = true; this.arena = false; this.walls.clear(true, true); this.hud.draw(this.player.hasJet ? 1 : -1, -1);
    this.cameras.main.setBounds(0, 0, LEVEL1[0].length * TS, LEVEL1.length * TS); this.toast.show('The Enforcer falls. The torii path is clear.', '#ffd23f');
    if (this.got >= 10) this.openGate();
  }
  openGate() { if (this.gateOpen) return; this.gateOpen = true; (this.gate.body as any).enable = false; this.tweens.add({ targets: this.gateFx, alpha: 0, duration: 600 }); this.toast.show('All ten memories. The gate remembers you.', '#ffd6f0'); }
  respawn(full: boolean) {
    const p = this.player, b = p.body_;
    if (full) { this.deaths++; p.hp = HP_MAX; this.hud.setHp(p.hp); this.cameras.main.flash(250, 255, 200, 230);
      if (this.arena) { this.arena = false; this.walls.clear(true, true); this.boss.reset(); this.hud.draw(-1, -1); this.cameras.main.setBounds(0, 0, LEVEL1[0].length * TS, LEVEL1.length * TS); }
      p.setPosition(this.spawn.x, this.spawn.y); } else p.setPosition(this.safe.x, this.safe.y);
    b.setVelocity(0, 0); p.iT = 1;
  }
  lockArena() {
    this.arena = true; const top = 64 * TS, h = 32 * TS;
    for (const c of [ARENA.x0 + 1, ARENA.x1 - 1]) { const w = this.walls.create(c * TS + 8, top + h / 2, 'px').setVisible(false) as any; w.body.setSize(16, h); w.refreshBody?.(); w.body.setSize(16, h); }
    this.cameras.main.setBounds(ARENA.x0 * TS, top - 40, (ARENA.x1 - ARENA.x0) * TS, LEVEL1.length * TS - top + 40);
    this.boss.awake = true; this.toast.show('KUROGEN ENFORCER — "Kael Veyron sends his regards."', '#ff8a8a'); this.fx.shake(300, 0.006);
  }
  update(_t: number, dms: number) {
    const dt = Math.min(dms, 50) / 1000; this.petals.update(dt); this.bg.update(dt);
    for (const w of this.falls) w.tilePositionY -= dt * 70; for (const f of this.falls2) f.t.tilePositionY -= dt * f.v; for (const w of this.waters) w.tilePositionX += dt * 8; if (this.gateFx) this.gateFx.tilePositionY += dt * 40;
    const cam = this.cameras.main; if ((this.cullT -= dt) <= 0) { this.cullT = 0.2; const vx = cam.scrollX - 120, vy = cam.scrollY - 120;
      for (const o of this.deco) o.setVisible(o.x > vx && o.x < vx + 720 && o.y > vy && o.y - o.displayHeight < vy + 510); }
    if (this.ending || this.fx.stopped) return;
    const p = this.player; this.time_ += dt; this.hud.setTime(this.time_);
    p.update(dt); p.pfx.update(dt); p.beam.update(dt, p.x + p.facing * 16, p.y - (p.poseLock ? 16 : 19), p.facing); this.gun.update(dt); this.egun.update(dt);
    this.enemies = this.enemies.filter(e => e.active);
    for (const e of this.enemies) { const near = Math.abs(e.x - p.x) < 560 && Math.abs(e.y - p.y) < 340; e.b.enable = near && !e.dead; if (near) e.tick(dt, p.x, p.y - 14); else e.b.setVelocity(0, 0); }
    if (this.boss.active && !this.boss.dead) this.boss.tick(dt, p.x, p.y - 14);
    this.hud.draw(p.hasJet ? p.fuel / JET.fuel : -1, this.arena && this.boss.active ? Math.max(0, this.boss.hp / this.boss.maxHp) : (this.boss.dead && this.boss.active ? 0 : -1));
    if (p.body_.blocked.down) this.safe = { x: p.x - p.facing * 6, y: p.y };
    if (!this.shrineLit && this.shrineX && p.x > this.shrineX) { this.shrineLit = true; this.spawn = { x: this.shrineX, y: p.y }; this.fx.explode(this.shrineX, p.y - 20, 0.5); this.toast.show('Lantern shrine lit — checkpoint.', '#ffd23f'); }
    if (!this.arena && !this.bossDead && p.x > (ARENA.x0 + 3) * TS && p.y > 64 * TS) this.lockArena();
    if (this.gate && !this.gateOpen && Math.abs(p.x - this.gate.x) < 24 && (this.gateToastT -= dt) <= 0) {
      this.gateToastT = 3; if (this.bossDead && this.got >= 10) this.openGate(); else this.toast.show(this.bossDead ? `The gate is sealed. Memories ${this.got}/10.` : 'Defeat the Enforcer first.', '#ff8a8a'); }
    if (p.y > LEVEL1.length * TS + 40) { p.hp -= 1; this.hud.setHp(p.hp); this.fx.shake(120, 0.004); this.respawn(p.hp <= 0); }
    else if (p.hp <= 0) this.respawn(true);
    if (this.gateOpen && Math.abs(p.x - this.carX) < 30 && p.body_.blocked.down) this.endChapter();
  }
  endChapter() {
    this.ending = true; const p = this.player; p.body_.setVelocity(0, 0); p.body_.enable = false;
    this.tweens.add({ targets: p, alpha: 0, x: this.carX, duration: 300 });
    const cam = this.cameras.main; cam.stopFollow();
    this.time.delayedCall(450, () => { this.fx.shake(200, 0.003);
      this.tweens.add({ targets: this.car, x: this.carX + 600, duration: 2200, ease: 'Quad.in' });
      this.car.startTrail(5); const dust = { stop: () => this.car.stopTrail() };
      this.time.delayedCall(1700, () => { cam.fadeOut(600, 255, 230, 240); dust.stop(); });
      this.time.delayedCall(2400, () => this.scene.start('Victory', { time: this.time_, got: this.got, kills: this.kills, deaths: this.deaths })); });
  }
}
