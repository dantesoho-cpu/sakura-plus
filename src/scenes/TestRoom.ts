import Phaser from 'phaser';
import { Player } from '../player/Player';
import { Fx } from '../systems/Fx';
import { Blaster } from '../weapons/Blaster';
import { Enemy } from '../entities/Enemy';
import { ScoutDrone, GroundBot, Turret } from '../entities/Kurogen';
import { Petals } from '../systems/Petals';
import { Hud } from '../systems/Hud';
import { Parallax } from '../systems/Parallax';
// Test room, 16px tiles. # solid  = one-way wood  w waterfall  b bot  d drone  t turret  f flower
// props (placed on the ground below the char): R tree  r small tree  L lantern  S lantern-shrine  T torii  C car
const RAW = [
  '.........................................................................................................................',
  '.........................................................................................................................',
  '.........................................................................................................................',
  '...........................................................f.............................................................',
  '..........................................................====.......................d...................................',
  '...........................f.........................................................................f...................',
  '.........................=====......................................f..............................#####.................',
  '..............f......................d.......................#####...............=====...................................',
  '...........======..............................f...........................................................f.............',
  '....................######....................=====...........................................................####.......',
  '.........................................................................................................................',
  '.....f.......L............#####.....................####...................L..........####...................##..........',
  '..R.........########...b..#####..S.......w..######r.####.t..........w.....######......####.T..b.#####.......###..C.......',
  '#####################################.....#######################......##################################################',
  '#####################################.....#######################......##################################################',
  '#####################################.....#######################......##################################################',
  '#####################################.....#######################......##################################################',
];
const MAP = RAW.map(r => r.padEnd(121, r[r.length - 1]));
const TS = 16;
export class TestRoom extends Phaser.Scene {
  player!: Player; solids!: Phaser.Physics.Arcade.StaticGroup; oneway!: Phaser.Physics.Arcade.StaticGroup;
  fx!: Fx; gun!: Blaster; egun!: Blaster; enemies: Enemy[] = []; petals!: Petals; hud!: Hud; kills: string[] = []; bg!: Parallax;
  flowers!: Phaser.Physics.Arcade.StaticGroup; got = 0; waterTiles: Phaser.GameObjects.Image[] = []; wt = 0; spawn = { x: 40, y: 13 * TS };
  constructor() { super('TestRoom'); }
  create() {
    const worldW = MAP[0].length * TS, worldH = MAP.length * TS; this.enemies = []; this.kills = []; this.got = 0;
    this.bg = new Parallax(this);
    const at = (x: number, y: number) => (y < 0 || y >= MAP.length || x < 0 || x >= MAP[0].length) ? (y >= MAP.length ? '#' : '.') : MAP[y][x];
    const S = (x: number, y: number) => at(x, y) === '#';
    this.solids = this.physics.add.staticGroup(); this.oneway = this.physics.add.staticGroup(); this.flowers = this.physics.add.staticGroup();
    this.fx = new Fx(this); this.gun = new Blaster(this, 'p', 'shot'); this.egun = new Blaster(this, 'e', 'ebolt', { cooldown: 0, speed: 150, life: 2.5 });
    const enemyGroup = this.physics.add.group({ allowGravity: false });
    const addE = (e: Enemy) => { this.enemies.push(e); enemyGroup.add(e); e.on('destroyed', (x: Enemy) => this.kills.push(x.kind)); };
    const prop = (k: string, x: number, y: number, d = -10, sf = 1) => this.add.image(x, y, 'pr_' + k).setOrigin(0.5, 1).setDepth(d).setScrollFactor(sf);
    MAP.forEach((row, y) => [...row].forEach((c, x) => {
      const px = x * TS, py = y * TS, gy = (y + 1) * TS;
      if (c === '#') {
        const u = S(x, y - 1), l = S(x - 1, y), r = S(x + 1, y), d = S(x, y + 1); let f: number;
        if (!u) f = !l ? 6 : !r ? 7 : (x % 2 ? 3 : 2);
        else if (!S(x, y - 2) && !l && d) f = 22; else if (!S(x, y - 2) && !r && d) f = 23;
        else if (!l) f = d ? 4 : 18; else if (!r) f = d ? 5 : 19; else if (!d) f = 10;
        else if (!S(x, y - 2) && d) f = !l ? 22 : !r ? 23 : (x % 2 ? 21 : 20);
        else if (!S(x + 1, y - 1)) f = 8; else if (!S(x - 1, y - 1)) f = 9; else f = (x + y) % 3 ? 0 : 1;
        this.solids.create(px + 8, py + 8, 'tiles', f).setDepth(2);
      } else if (c === '=') {
        const f = at(x - 1, y) !== '=' ? 16 : at(x + 1, y) !== '=' ? 17 : 11;
        const o = this.oneway.create(px + 8, py + 8, 'tiles', f).setDepth(2); const b = o.body as Phaser.Physics.Arcade.StaticBody;
        b.setSize(16, 6).setOffset(0, 0); b.checkCollision.down = b.checkCollision.left = b.checkCollision.right = false;
      } else if (c === 'w') { this.falls.push(this.add.tileSprite(px, py, 16, (MAP.length - y) * TS + 40, 'waterfall').setOrigin(0).setDepth(1)); }
      else if (c === 'f') { const fl = this.flowers.create(px + 8, py + 8, 'pr_flower').setDepth(6); this.tweens.add({ targets: fl, y: py + 5, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' }); }
      else if (c === 'b') addE(new GroundBot(this, px + 8, gy, this.fx));
      else if (c === 'd') addE(new ScoutDrone(this, px + 8, gy, this.fx));
      else if (c === 't') addE(new Turret(this, px + 8, gy, this.fx, this.egun));
      else if (c === 'R') prop('tree', px, gy, -12); else if (c === 'r') prop('tree2', px, gy, -12);
      else if (c === 'L') prop('lantern2', px, gy, -5);
      else if (c === 'S') { const s = prop('shrine', px, gy, -5); this.shrineX = px; void s; }
      else if (c === 'T') prop('torii', px, gy, -6); else if (c === 'C') prop('car', px, gy, -4);
    }));
    // bridge over the first pit
    this.add.image(39.5 * TS, 13 * TS + 6, 'pr_bridge').setOrigin(0.5, 1).setDepth(-3);
    for (let bx = 36; bx <= 42; bx++) { const deck = this.oneway.create(bx * TS + 8, 13 * TS - 14, 'px').setVisible(false) as any; deck.body.setSize(16, 4); deck.body.checkCollision.down = deck.body.checkCollision.left = deck.body.checkCollision.right = false; }
    this.physics.world.setBounds(0, 0, worldW, worldH + 200);
    this.player = new Player(this, this.spawn.x, this.spawn.y); this.player.gun = this.gun;
    this.physics.add.collider(this.player, this.solids); this.physics.add.collider(this.player, this.oneway);
    this.enemies.forEach(e => { e.b.setAllowGravity(false); if (e.kind === 'turret') { e.b.moves = false; e.b.setImmovable(true); } });
    this.physics.add.collider(enemyGroup, this.solids);
    this.physics.add.collider(this.gun.shots, this.solids, (s: any) => { this.fx.spark(s.x, s.y); this.gun.kill(s); });
    this.physics.add.collider(this.egun.shots, this.solids, (s: any) => this.egun.kill(s));
    this.physics.add.overlap(this.gun.shots, enemyGroup, (s: any, e: any) => { if (!s.active || e.dead) return; this.gun.kill(s); e.hit(s.damage, s.body.velocity.x > 0 ? 1 : -1); });
    const hurt = () => { this.fx.hitStop(60); this.fx.shake(140, 0.005); };
    this.physics.add.overlap(this.player, enemyGroup, (_p, e: any) => { if (!e.dead && this.player.damage(e.x)) hurt(); });
    this.physics.add.overlap(this.player, this.egun.shots, (_p, s: any) => { if (s.active && this.player.damage(s.x)) { this.egun.kill(s); hurt(); } });
    this.physics.add.overlap(this.player, this.flowers, (_p, f: any) => { f.destroy(); this.got++; this.hud.flowers.setText(`FLOWERS  ${this.got}/10`); this.fx.spark(f.x, f.y); this.player.trail.explode(8, f.x, f.y); });
    this.hud = new Hud(this); this.hud.setHp(this.player.hp); this.player.on('hurt', (hp: number) => this.hud.setHp(hp));
    this.petals = new Petals(this);
    const cam = this.cameras.main; cam.setBounds(0, 0, worldW, worldH); cam.startFollow(this.player, true, 0.15, 0.15, 0, 20); cam.setDeadzone(40, 30); cam.setRoundPixels(true);
    this.add.text(4, 258, '←→ move  SPACE jump(x2)  SHIFT petal dash  J/X shoot', { fontFamily: 'monospace', fontSize: '8px', color: '#fff', stroke: '#1a0f2e', strokeThickness: 2 }).setScrollFactor(0).setDepth(100);
  }
  shrineX = 0; falls: Phaser.GameObjects.TileSprite[] = [];
  update(_t: number, dms: number) {
    const dt = Math.min(dms, 50) / 1000; this.petals.update(dt); this.bg.update(dt);
    this.falls.forEach(w => (w.tilePositionY -= dt * 60));
    this.fx.tick();
    if (this.fx.stopped) return;
    this.player.update(dt); this.gun.update(dt); this.egun.update(dt);
    this.enemies = this.enemies.filter(e => e.active); this.enemies.forEach(e => e.tick(dt, this.player.x, this.player.y - 14));
    if (this.player.x > this.shrineX && this.shrineX) this.spawn = { x: this.shrineX, y: 13 * TS };
    if (this.player.y > MAP.length * 16 + 100 || this.player.hp <= 0) { this.player.hp = 5; this.hud.setHp(5); this.player.setPosition(this.spawn.x, this.spawn.y); this.player.body_.setVelocity(0, 0); }
  }
}
