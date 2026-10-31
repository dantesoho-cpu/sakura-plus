import { SpeedCam } from '../systems/SpeedCam';
import { Cull } from '../systems/Cull';
import { audio } from '../audio/Audio';
import { GIANT_DECKS } from './giantDecks';
import { WaspBomber, Sentry, ShieldTrooper } from '../entities/Kurogen2';
import { touch, showRespawnBtn } from '../systems/Touch';
import Phaser from 'phaser';
import { Beam } from '../weapons/Beam';
import { Player, HP_MAX, JET } from '../player/Player';
import { Pickups, POWER_T, type PK } from '../systems/Pickups';
import { Cannon } from '../systems/Cannon';
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
import { PLAT } from './platPieces';
import { FEEL } from '../tuning';
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
  scam!: SpeedCam; culler!: Cull;
  player!: Player; fx!: Fx; gun!: Blaster; egun!: Blaster; enemies: Enemy[] = []; petals!: Petals; giants: [number, number, string][] = []; treeTops: [number, number, number][] = []; hud!: Hud; toast!: Toast; bg!: Parallax;
  solid!: Phaser.Tilemaps.TilemapLayer; oneway!: Phaser.Tilemaps.TilemapLayer; enemyGroup!: Phaser.Physics.Arcade.Group;
  pk!: Pickups; cannon!: Cannon; powT = 0; rapT = 0; auraT2 = 0;
  flowers!: Phaser.Physics.Arcade.StaticGroup; got = 0; kills = 0; deaths = 0; time_ = 0; spawn = { x: 0, y: 0 }; safe = { x: 0, y: 0 };
  boss!: Enforcer; bossDead = false; arena = false; walls!: Phaser.Physics.Arcade.StaticGroup; gate!: Phaser.Physics.Arcade.Image; gateFx!: Phaser.GameObjects.TileSprite;
  gateOpen = false; ending = false; shrineX = 0; shrineLit = false; jetPick!: Phaser.Physics.Arcade.Image; carX = 0; car!: Car;
  falls: Phaser.GameObjects.TileSprite[] = []; waters: Phaser.GameObjects.TileSprite[] = []; deco: Phaser.GameObjects.Image[] = []; cullT = 0; gateToastT = 0;
  constructor() { super('Level1'); }
  falls2: { t: Phaser.GameObjects.TileSprite; v: number }[] = [];
  /** Lush waterfall: two scrolling sheets at different speeds, lip foam, plunge foam, rising mist, splash droplets and glints. */
  wfRects: { x: number; y: number; w: number; h: number; behind: boolean }[] = []; sil: Phaser.GameObjects.Sprite | null = null; fallVol = 0; behindNow = false;
  waterfall(x: number, y: number, w: number, h: number, big = false, lipFoam = true, behind = false) {
    this.wfRects.push({ x, y, w, h, behind }); const D = behind ? 9.5 : 0;
    const back = this.add.tileSprite(x - 2, y, w + 4, h, 'waterfall').setOrigin(0).setDepth(big ? -6 : 0.9 + D).setAlpha(0.55).setTint(0x8fd8ff).setTileScale(big ? 1 : 1, 1);
    const front = this.add.tileSprite(x, y, w, h, 'waterfall').setOrigin(0).setDepth(big ? -5.9 : 1 + D).setAlpha(0.92);
    const hi = this.add.tileSprite(x + w * 0.2, y, w * 0.6, h, 'waterfall').setOrigin(0).setDepth(big ? -5.8 : 1.1 + D).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    // shaded edges + streaks so the sheet reads as falling water, not a flat stripe
    const ew = big ? 10 : 5; for (const ex of [x, x + w - ew]) this.add.tileSprite(ex, y, ew, h, 'waterfall').setOrigin(0).setDepth(front.depth + 0.05).setTint(0x2a68a8).setAlpha(0.6);
    if (big) for (let i = 0; i < 4; i++) { const st = this.add.tileSprite(x + 14 + i * 24, y, 6, h, 'waterfall').setOrigin(0).setDepth(front.depth + 0.06).setTint(i % 2 ? 0x5aa0e0 : 0xffffff).setAlpha(0.3).setBlendMode(i % 2 ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD); this.falls2.push({ t: st, v: 90 + i * 25 }); }
    this.falls.push(front); this.falls2.push({ t: back, v: 45 }, { t: hi, v: 120 });
    const bot = y + h - 6, cx = x + w / 2, d = big ? -5.7 : behind ? 10.9 : 4;
    if (lipFoam) this.add.ellipse(cx, y + 2, w + 6, 6, 0xbfe8ff, 0.6).setDepth(d);   // lip foam (springs use their rock lip instead)
    const foam = this.add.ellipse(cx, bot + 2, w * 1.5, big ? 14 : 9, 0xffffff, 0.8).setDepth(d); this.tweens.add({ targets: foam, scaleX: 1.12, scaleY: 0.85, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.inOut' });
    this.add.particles(0, 0, 'glow', { x: { min: x - 6, max: x + w + 6 }, y: bot, speedY: { min: -14, max: -30 }, speedX: { min: -12, max: 12 }, scale: { start: big ? 0.9 : 0.5, end: big ? 1.8 : 1.1 }, alpha: { start: 0.28, end: 0 }, tint: 0xe8f8ff, lifespan: 1600, frequency: big ? 60 : 160 }).setDepth(d + 0.1);
    this.add.particles(0, 0, 'pip', { x: { min: x, max: x + w }, y: bot, speedY: { min: -60, max: -120 }, speedX: { min: -50, max: 50 }, gravityY: 300, scale: { min: 0.3, max: 0.6 }, tint: [0xffffff, 0xbff0ff], lifespan: 700, frequency: big ? 40 : 110 }).setDepth(d + 0.2);
    this.add.particles(0, 0, 'spark', { x: { min: x, max: x + w }, y: { min: y, max: y + h }, scale: { start: 0.5, end: 0 }, alpha: { start: 0.9, end: 0 }, lifespan: 500, frequency: big ? 90 : 300, blendMode: 'ADD' }).setDepth(d + 0.3);
  }
  fallCount = 0; fallPos: number[][] = [];
  /** A complete spring: mossy outcrop lip (source) -> falling sheet -> stone basin with animated ripples + splash rocks + foam. */
  fallUnit(cx: number, yTop: number, ySurf: number, size: number, r: number) {
    this.fallPos.push([cx, yTop, ySurf]); const w = size ? 32 : 22, lip = this.add.image(cx, yTop - 7, 'pr_wf_lip' + size).setOrigin(0.5, 0).setDepth(1.2);
    this.waterfall(cx - w / 2, yTop - 7 + lip.height * 0.5, w, ySurf - yTop + 7 - lip.height * 0.5 + 4, false, false, this.fallPos.length % 2 === 1);
    const bs = this.add.sprite(cx, ySurf + 9, 'wf_basin' + size, 0).setOrigin(0.5, 1).setDepth(4.5); bs.play('wf_basin' + size);
    bs.anims.setProgress(r);
    for (const sx of [-1, 1]) this.add.image(cx + sx * (bs.width / 2 - 4), ySurf + 2, 'pr_wf_rocks').setOrigin(0.5, 1).setDepth(4.6).setFlipX(sx > 0);
    // a few drips falling from the lip edge beside the sheet
    this.add.particles(0, 0, 'pip', { x: { min: cx - lip.width / 2 + 4, max: cx + lip.width / 2 - 4 }, y: yTop + lip.height - 4, speedY: { min: 20, max: 40 }, gravityY: 260, scale: 0.35, tint: 0xbff0ff, lifespan: 900, frequency: 520 }).setDepth(1.1);
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
    const M = LEVEL1.map((r, y) => y === 46 ? r.slice(0, 186) + r.slice(186, 200).replace(/=/g, '.') + r.slice(200) : r), MW = M[0].length, MH = M.length, worldW = MW * TS, worldH = MH * TS;
    Object.assign(this, { enemies: [], got: 0, kills: 0, deaths: 0, time_: 0, bossDead: false, arena: false, gateOpen: false, ending: false, shrineLit: false, falls: [], falls2: [], wfRects: [], sil: null, waters: [], deco: [] });
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
    // SUPER GIANT setpieces (user art at 2x): run-across one-way tops via the invisible deck layer
    const deckRun = (x0: number, x1: number, yPx: number) => { const r = Math.round(yPx / TS); for (let i = Math.floor(x0 / TS); i <= Math.floor(x1 / TS); i++) deckL.putTileAt(2, i, r).setCollision(false, false, true, false); };
    const giant = (k: string, cx: number, floor: number, sc: number, w: number, h: number, decks: [number, number, number][], d = -3) => {
      const L = cx - w * sc / 2, T = floor - h * sc; this.add.image(cx, floor + 2, k).setOrigin(0.5, 1).setScale(sc).setDepth(d);
      void decks; // pixel-exact top-edge profiles traced from the art (tools/giant_decks.py)
      for (const [a, prof] of GIANT_DECKS[k]) { const L0 = Math.round(L + a * sc), p: number[] = []; for (let i = 0; i < prof.length * sc; i++) p.push(prof[Math.floor(i / sc)] * sc);
        const id = this.plats.push({ L: L0, T: Math.round(T), w: p.length, p, k: 'g_' + k } as any) - 1;
        for (let bk = Math.floor(L0 / 128); bk <= Math.floor((L0 + p.length) / 128); bk++) { if (!this.platB.has(bk)) this.platB.set(bk, []); this.platB.get(bk)!.push(id); } }
      this.giants.push([cx, T, k]); return { L, T }; };
    const gLantern = (cx: number, floor: number) => { const { T } = giant('pr_lantern_stone', cx, floor, 2, 58, 122, [[12, 12, 46], [54, 12, 46], [78, 9, 49], [99, 2, 55]], -2.5);
      const g = this.add.image(cx, T + 54, 'glow').setTint(0xffb347).setBlendMode(Phaser.BlendModes.ADD).setScale(2.6).setDepth(-2.4);
      this.tweens.add({ targets: g, alpha: { from: 0.5, to: 1 }, scale: { from: 2.3, to: 3.0 }, duration: 110, yoyo: true, repeat: -1, repeatDelay: 180, ease: 'Stepped' });
      this.add.particles(0, 0, 'spark', { x: { min: cx - 8, max: cx + 8 }, y: T + 60, speedY: { min: -20, max: -40 }, scale: { start: 0.5, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: 0xffc070, lifespan: 900, frequency: 260 }).setDepth(-2.3); };
    { // giant torii over the row-62 meadow, flanked by a giant stone lantern you climb to reach the tie-beam
      const cx = 206 * TS + 8, fl = 62 * TS; const { L, T } = giant('pr_torii_big', cx, fl, 2, 165, 173, [[4, 12, 158], [36, 24, 146], [142, 27, 145], [153, 16, 164]]);
      gLantern(cx - 236, fl);
      for (const sx of [56, 84, 112]) { const st = this.add.rectangle(L + sx * 2, T + 40 * 2, 6, 26, 0xf4ecdc).setOrigin(0.5, 0).setDepth(-2.9).setStrokeStyle(1, 0x8a7a8a);
        this.tweens.add({ targets: st, angle: { from: -9, to: 9 }, duration: 1300 + sx * 7, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); }
      this.add.particles(0, 0, 'petal', { x: { min: L, max: L + 330 }, y: T + 6, speedX: { min: -30, max: -8 }, speedY: { min: 8, max: 22 }, rotate: { min: 0, max: 360 }, scale: { min: 0.6, max: 1 }, lifespan: 6000, frequency: 450 }).setDepth(-2.8); }
    { // colossal stone gate before the arena, a spring pouring from under its keystone
      const cx = 378 * TS + 8, fl = 62 * TS; const { T } = giant('pr_stone_gate', cx, fl, 2, 169, 106, [[11, 18, 168]]);
      gLantern(cx - 230, fl); this.fallUnit(cx, T + 40 * 2, fl, 1, 7);
      const rune = this.add.image(cx, T + 24 * 2, 'glow').setTint(0x7ad9ff).setBlendMode(Phaser.BlendModes.ADD).setScale(1.4).setDepth(-2.9).setAlpha(0.3);
      this.tweens.add({ targets: rune, alpha: 0.9, scale: 2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); }
    // setpiece: the great gorge falls pouring from under the T2 shelf, behind the long gorge bridge (row 62)
    this.waterfall(152 * TS - 56, 39 * TS, 112, 49 * TS + 10, true);
    this.add.image(152 * TS, 37 * TS + 4, 'pr_wf_lip2').setOrigin(0.5, 0.2).setDepth(-5.5);
    // ledge-edge springs: every waterfall pours from a mossy outcrop under a ledge lip and lands in an animated stone basin
    { const cands: [number, number, number][] = []; const used: number[] = [];
      for (let y = 4; y < MH - 6; y++) for (let x = 6; x < MW - 6; x++) {
        if (!(at(x, y) === '#' && !S(x, y + 1))) continue; const edge = !S(x + 1, y) ? 1 : !S(x - 1, y) ? -1 : 0; if (!edge) continue;
        let e = y + 1; while (e < MH && !S(x, e) && !S(x - 1, e) && !S(x + 1, e) && at(x, e) === '.') e++;
        const drop = e - y - 1; if (drop < 5 || drop > 20 || [1, 2, 3].some(i => !S(x - edge * i, y)) || [-2, -1, 0, 1, 2].some(i => !S(x + i, e)) || [...Array(drop)].some((_, k) => at(x - 1, y + 1 + k) !== '.' && !S(x - 1, y + 1 + k) || at(x + 1, y + 1 + k) !== '.' && !S(x + 1, y + 1 + k)) || e >= MH - 4 || !S(x, e) || !S(x - 1, e) || !S(x + 1, e)) continue;
        if ((x >= 138 && x <= 174) || (x >= ARENA.x0 - 4 && x <= ARENA.x1 + 4)) continue;
        cands.push([x, y, e]); }
      let seedW = 99; const r2 = () => ((seedW = (seedW * 16807) % 2147483647) / 2147483647);
      cands.sort((a, b) => (a[0] * 7 + a[1] * 13) % 17 - (b[0] * 7 + b[1] * 13) % 17);
      for (const [x, y, e] of cands) { if (used.some(u => Math.abs(u - x) < 22) || used.length >= 12) continue;
        if ([...Array(5)].some((_, i) => /[bdfJPRrLBAF]/.test(at(x - 2 + i, e - 1)))) continue;
        used.push(x); this.fallUnit(x * TS + 8, (y + 1) * TS, e * TS, (e - y) > 14 ? 1 : 0, r2()); }
      this.fallCount = used.length; }
    // --- systems ---
    this.flowers = this.physics.add.staticGroup(); this.walls = this.physics.add.staticGroup();
    this.fx = new Fx(this); this.gun = new Blaster(this, 'p', 'shot'); this.egun = new Blaster(this, 'e', 'ebolt', { cooldown: 0, speed: 150, life: 3 });
    this.enemyGroup = this.physics.add.group({ allowGravity: false });
    const prop = (k: string, x: number, y: number, d = -10) => this.cull(this.add.image(x, y, k).setOrigin(0.5, 1).setDepth(d));
    let bushN = 0, mem = 0, nB = 0, nD = 0, nT = 0;
    M.forEach((row, y) => [...row].forEach((c, x) => {
      const px = x * TS, cx = px + 8, gy = (y + 1) * TS;
      if (c === 'f') { const fl = this.flowers.create(cx, gy - 8, 'pr_flower').setDepth(6) as any; fl.mem = mem++;
        this.tweens.add({ targets: fl, y: gy - 11, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' }); }
      else if (c === 'b') this.addE(nB++ % 3 === 1 ? new ShieldTrooper(this, cx, gy, this.fx, this.egun) : new GroundBot(this, cx, gy, this.fx));
      else if (c === 'd') this.addE(nD++ % 3 === 1 ? new WaspBomber(this, cx, gy, this.fx, this.egun) : new ScoutDrone(this, cx, gy, this.fx));
      else if (c === 't') this.addE(nT++ % 4 === 2 ? new Sentry(this, cx, gy, this.fx, this.egun) : new Turret(this, cx, gy, this.fx, this.egun));
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
        this.add.image(cx, gy + 1, 'pr_torii11').setOrigin(0.5, 1).setDepth(-3);
        this.gateFx = this.add.tileSprite(cx - 8, gy - 52, 16, 52, 'waterfall').setOrigin(0).setTint(0x66e0ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(7); }
    }));
    // water in pits (lakes)
    for (let x = 0; x < MW; x++) if (!S(x, MH - 1) && M[MH - 1][x] !== '#') { let e = x; while (e < MW && !S(e, MH - 1)) e++;
      this.waters.push(this.add.tileSprite(x * TS, (MH - 4) * TS + 6, (e - x) * TS, 4 * TS, 'water').setOrigin(0).setDepth(3).setAlpha(0.9)); x = e; }
    this.buildSurfaceSkin(at, MW);
    this.placeDeco(at, S);
    this.placeGen2(at, S);
    this.placePlats(at, S);
    this.anchorProps();
    this.pk = new Pickups(this, (x, y) => this.groundAt(x, y));
    (this.flowers.getChildren() as any[]).forEach((f, i) => { if (i % 2 === 0) return; const kind: PK = (['heart', 'rapid', 'heart', 'power', 'heart'] as PK[])[(i - 1) / 2 % 5];
      let ok = false; for (const dx of [40, -40, 56, -56, 72, -72, 96, -96, 120, -120, 150, -150]) { if (ok) break; const x = f.x + dx, sy = f.y - (Math.abs(dx) > 56 ? 48 : 20), g = this.groundAt(x, sy); if (g > 0 && Math.abs(g - (f.y + 8)) < (Math.abs(dx) > 56 ? 40 : 6) && !this.solid.getTileAtWorldXY(x, g - 8)?.collides && Math.abs(this.groundAt(x - 6, sy) - g) < 4 && Math.abs(this.groundAt(x + 6, sy) - g) < 4) { this.pk.add(kind, x, g); ok = true; break; } }
      if (!ok) this.pk.add(kind, f.x, f.y - 16); });
    this.animateProps();
    // --- player + colliders ---
    this.physics.world.setBounds(0, 0, worldW, worldH + 400);
    this.player = new Player(this, this.spawn.x, this.spawn.y); this.player.gun = this.gun; this.cannon = new Cannon(this, this.player, () => [...new Set([...this.enemies, ...(this.boss ? [this.boss] : [])])], () => this.egun.shots.getChildren().forEach((o: any) => { if (o.active) this.egun.kill(o); }));
    for (const cx of [this.spawn.x + 900, this.spawn.x + 4200]) { for (let dx = 0; dx < 400; dx += 16) { const g = this.groundAt(cx + dx, 0), g2 = this.groundAt(cx + dx + 24, 0), g3 = this.groundAt(cx + dx - 24, 0); if (g > 0 && g === g2 && g === g3) { this.pk.add('cannon', cx + dx, g - 8); break; } } }
    this.player.beam = new Beam(this, this.fx, () => this.enemyGroup.getChildren() as any, (x, y) => !!this.solid.getTileAtWorldXY(x, y)?.collides); this.player.beam.owner = this.player; this.safe = { ...this.spawn };
    this.physics.add.collider(this.player, this.solid); this.physics.add.collider(this.player, this.oneway); this.physics.add.collider(this.player, deckL);
    this.physics.world.on('worldstep', () => { this.slopeSnap(); this.botPlats(); });
    this.physics.add.collider(this.player, this.walls); this.physics.add.collider(this.player, this.gate);
    this.physics.add.collider(this.enemyGroup, this.solid, undefined, (e: any) => e.kind === 'bot'); this.physics.add.collider(this.enemyGroup, this.walls, undefined, (e: any) => e.kind === 'bot');
    this.physics.add.collider(this.gun.shots, this.solid, (s: any) => { this.fx.spark(s.x, s.y); this.gun.kill(s); });
    this.physics.add.collider(this.egun.shots, this.solid, (s: any) => this.egun.kill(s));
    this.physics.add.overlap(this.gun.shots, this.enemyGroup, (s: any, e: any) => { if (!s.active || e.dead) return; if (s.lastE === e) return; s.lastE = e; const d = s.body.velocity.x > 0 ? 1 : -1;
      this.impact(s.x, s.y, s.tier || 1, d); if (s.pierce > 0) s.pierce--; else this.gun.kill(s); e.hit(s.damage * (this.powT > 0 ? 2 : 1), d); });
    const hurt = () => { this.fx.hitStop(FEEL.hurt.stop); this.fx.shake(FEEL.hurt.shakeMs, FEEL.hurt.shakeI); };
    this.physics.add.overlap(this.player, this.enemyGroup, (_p, e: any) => { if (!e.dead && (e.kind !== 'boss' || e.awake) && this.player.damage(e.x)) hurt(); });
    this.physics.add.overlap(this.player, this.egun.shots, (_p, s: any) => { if (s.active && this.player.damage(s.x)) { this.egun.kill(s); hurt(); } });
    this.physics.add.overlap(this.player, this.flowers, (_p, f: any) => this.collect(f));
    this.physics.add.overlap(this.player, this.jetPick, () => this.pickJet());
    this.hud = new Hud(this, HP_MAX, true); this.hud.setHp(this.player.hp); this.player.on('hurt', (hp: number) => this.hud.setHp(hp));
    this.toast = new Toast(this); this.petals = new Petals(this);
    const cam = this.cameras.main; cam.setBounds(0, 0, worldW, worldH); cam.startFollow(this.player, true, FEEL.cam.lerp, FEEL.cam.lerp, 0, 30); this.scam = new SpeedCam(this, this.player, FEEL.cam.lerp); this.culler = new Cull(this); cam.setDeadzone(FEEL.cam.deadW, FEEL.cam.deadH); cam.setRoundPixels(true);
    cam.fadeIn(400);
    // boss wiring
    this.boss.target = () => [this.player.x, this.player.y - 18];
    this.boss.zap = (x1, y1, x2, y2, w) => { const p = this.player, px = p.x, py = p.y - 18, dx = x2 - x1, dy = y2 - y1, t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1);
      if (Math.hypot(x1 + dx * t - px, y1 + dy * t - py) < w + 8 && p.damage(x1)) hurt(); };
    this.boss.summon = (x, y) => { if (this.enemies.filter(e => e.kind === 'drone' && e.active && Math.abs(e.x - this.boss.x) < 600).length < 2) this.addE(new ScoutDrone(this, x, y, this.fx)); };
    this.boss.on('dying', () => { this.hud.draw(-1, 0); }); this.boss.on('destroyed', () => this.onBossDead());
    const kb = this.input.keyboard!;
    const pause = () => { if (this.ending) return; audio.stopLoops(); audio.sfx('menu'); this.scene.launch('Pause'); this.scene.pause(); };
    kb.on('keydown-P', pause); kb.on('keydown-ESC', pause);
    kb.on('keydown-R', () => this.checkpoint()); kb.on('keydown-BACKSPACE', () => this.checkpoint());
    // never carry a held key/touch across pause, tab switch or focus loss (missed keyup = Sakura "stuck" charging/walking)
    const clear = () => this.player?.resetInput();
    this.events.on('resume', clear); this.events.on('pause', clear); this.game.events.on('blur', clear); this.game.events.on('hidden', clear);
    showRespawnBtn(true); this.events.once('shutdown', () => { audio.stopLoops(); showRespawnBtn(false); this.game.events.off('blur', clear); this.game.events.off('hidden', clear); });
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
    for (const x of xs) { const v = this.platY(x, feet); if (v < sy) { sy = v; slope = true; } }
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
    e.on('destroyed', (x: Enemy) => { if (x.kind !== 'boss') { this.kills++; if (this.kills % 4 === 0 || (this.player && this.player.hp <= 2 && Math.random() < 0.5)) this.pk?.add(this.kills % 12 === 0 ? 'power' : 'heart', x.x, x.y - 10, true); } }); }
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
        // cherry trees: ONE spaced pass of cohesive custom trees (no overlapping stacks)
        { const sizes: [string, number][] = [['pr_ts0', 129], ['pr_ts1', 126], ['pr_ts2', 114], ['pr_ts3', 107], ['pr_ts0dk', 129], ['pr_ts1lt', 126], ['pr_ts2dk', 114], ['pr_ts3lt', 107], ['pr_ts_sap', 41], ['pr_ts_bush', 54], ['pr_ts_sap', 41]];
          let cxp = px + 10 + rnd() * 30; const end = px + run * TS - 10;
          while (cxp < end) { const room = end - cxp; const fits = sizes.filter(([, w]) => w * 0.8 <= room && (w < 128 || run >= 16));
            if (!fits.length || rnd() < 0.3) { cxp += 40 + rnd() * 60; continue; }
            const [k, w] = fits[Math.floor(rnd() * fits.length)]; const tx = cxp + w * 0.4;
            const gc = Math.floor(tx / TS); if (!busy(gc, y) && !(y === 62 && ((gc > 188 && gc < 224) || (gc > 360 && gc < 392)))) (w > 70 && this.treeTops.push([tx, top + 3 - w * 0.75, w]), this.cull(this.add.image(tx, top + 3, k).setOrigin(0.5, 1).setDepth(w > 120 ? -14 : w > 70 ? -13 : -12).setFlipX(rnd() < 0.5)));
            cxp += w * 0.8 + 30 + rnd() * 80; } }
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
    // (old: sheet water pieces stamped at each fall foot — replaced by fallUnit lips/basins)
  }
  // ---- second-gen pieces (regenerated in the sakuratileset style): ruins, pillars, walls, scaffolds, banners, lanterns, rocks, plants ----
  sway: Phaser.GameObjects.Image[] = []; lanterns: Phaser.GameObjects.Image[] = [];
  // ---- sheet platforms: pieces cut 1:1 from the user's tilesheet; one-way pixel-profile tops (ramps = real slopes) ----
  plats: { L: number; T: number; w: number; p: number[]; k: string }[] = []; platB = new Map<number, number[]>();
  platY(x: number, feet: number): number { let best = Infinity; const ids = this.platB.get(Math.floor(x / 128)); if (!ids) return best;
    for (const i of ids) { const q = this.plats[i], c = Math.floor(x - q.L); if (c < 0 || c >= q.w) continue; const t = q.p[c]; if (t < 0) continue;
      const sy = q.T + t; if (sy >= feet - 10 && sy <= feet + 14 && sy < best) best = sy; } return best; }
  addPlat(k: string, cx: number, bottom: number, flip: boolean, d: number) { const q = PLAT.find(z => z.k === k)!; const L = Math.round(cx - q.w / 2), T = Math.round(bottom - q.h);
    this.cull(this.add.image(L, T, 'pl_' + k).setOrigin(0).setFlipX(flip).setDepth(d));
    const i = this.plats.push({ L, T, w: q.w, p: flip ? [...q.p].reverse() : q.p, k }) - 1;
    for (let b = Math.floor(L / 128); b <= Math.floor((L + q.w) / 128); b++) { if (!this.platB.has(b)) this.platB.set(b, []); this.platB.get(b)!.push(i); } }
  placePlats(at: (x: number, y: number) => string, S: (x: number, y: number) => boolean) {
    let seed = 4242; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const M = LEVEL1, MW = M[0].length;
    const toe = (q: typeof PLAT[0]) => { const v = q.p.filter(t => t >= 0); return q.h - Math.max(v[0], v[v.length - 1]); };
    const hill = (q: typeof PLAT[0]) => q.w >= 150 && toe(q) <= 90;
    // ground under the whole footprint must be solid down to the toe depth, so a sunk ramp never shows its base over a pit
    const deep = (q: typeof PLAT[0], cx: number, y: number) => { const n = Math.ceil((toe(q) + 3) / TS); /* buried toe inside solid ground, 3px margin; drawn behind tiles */ for (let x = Math.floor((cx - q.w / 2) / TS); x <= Math.floor((cx + q.w / 2) / TS); x++) for (let d = 0; d < n; d++) if (!S(x, y + d)) return false; return true; }; // walk-up ramps resting on the ground
    const tall = PLAT.filter(q => (q.h >= 100 && q.w <= 110) || hill(q)), float = PLAT.filter(q => q.w >= 30 && !tall.includes(q) && q.h < 145);
    // shuffled decks => every piece cycles through before any repeats, so no two runs look alike
    const deck = (a: typeof PLAT) => { let bag: typeof PLAT = []; return [() => { if (!bag.length) bag = [...a].sort(() => rnd() - 0.5); return bag.pop()!; }, (q: typeof PLAT[0]) => bag.unshift(q)] as const; };
    const [nextF, backF] = deck(float), [nextT, backT] = deck(tall);
    const clear = (x0: number, y0: number, x1: number, y1: number) => { if (nearFall(x0, x1)) return false; for (let y = Math.floor(y0 / TS) - 4; y <= Math.floor(y1 / TS); y++) for (let x = Math.floor(x0 / TS) - 1; x <= Math.floor(x1 / TS) + 1; x++) { const c = at(x, y); if (c !== '.' && c !== undefined) return false; } return true; };
    const nearFall = (x0: number, x1: number) => [...this.falls, ...this.falls2.map(f => f.t)].some(f => x1 > f.x - 24 && x0 < f.x + f.width + 24);
    const banned = (tx: number) => (tx > 186 && tx < 226) || (tx > 358 && tx < 394) || (tx >= ARENA.x0 - 6 && tx <= ARENA.x1 + 6) || (tx >= 138 && tx <= 174) || tx < 12;
    // dedicated spots: every sheet piece that the run pass could not fit gets placed somewhere it fits (relaxed lift/spacing)
    const occ = (x0: number, x1: number, y0: number, y1: number, m = 1) => this.plats.some(q => x1 > q.L - 12 * m && x0 < q.L + q.w + 12 * m && y1 > q.T - 90 * m && y0 < q.T + 150);
    const runs: [number, number, number][] = [];
    for (let y = 6; y < M.length - 2; y++) { let x = 2; while (x < MW - 2) { if (!(S(x, y) && !S(x, y - 1) && at(x, y - 1) === '.')) { x++; continue; } let e = x; while (S(e, y) && !S(e, y - 1)) e++; runs.push([x, e, y]); x = e; } }
    runs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
    const fill = (list: typeof PLAT, relax = 1, quiet = false) => { for (const q of list.sort((a, b) => b.w - a.w)) {
      let done = false; const isG = tall.includes(q);
      for (let tier = 0; tier < 4 && !done; tier++) { const ix = isG && q.w >= 150 ? 0 : tier === 3 ? q.w * 0.3 : tier ? q.w * 0.2 : 0, iy = tier === 3 ? 90 : tier ? 64 : 0;
        const lifts = isG ? [0] : tier === 3 ? [52, 70, 88, 40] : tier < 2 ? [52, 70, 88, 106, 40, 124, 64, 80] : [140, 160, 180, 34];
        for (const [x0, e, y] of runs) { const top = y * TS; if (done) break; if ((e - x0) * TS < q.w * (tier ? 0.6 : 1) + 16) continue;
          for (let cx = x0 * TS + q.w / 2 - ix + 8; cx <= e * TS - q.w / 2 + ix - 8 && !done; cx += 12) { if (banned(Math.floor(cx / TS))) continue;
            for (const lift of lifts) { const b = top - lift; if (!clear(cx - q.w / 2 + ix, b - q.h + iy, cx + q.w / 2 - ix, top - 1) || (isG && q.w >= 150 && !deep(q, cx, y)) || occ(cx - q.w / 2, cx + q.w / 2, b - q.h, b, (tier < 3 ? 1 : 0.7) * relax)) continue;
              if (isG) this.groundPlat(q, cx, top); else this.addPlat(q.k, cx, b, rnd() < 0.5, -2); done = true; break; } } } }
      if (!done && !quiet) console.warn('plat: no spot for', q.k); } };
    fill(PLAT.filter(hill)); // big walk-up ramps first: they need the long flat runs
    for (let y = 6; y < M.length - 2; y++) { let x = 2; while (x < MW - 2) {
      if (!(S(x, y) && !S(x, y - 1) && at(x, y - 1) === '.')) { x++; continue; }
      let e = x; while (S(e, y) && !S(e, y - 1)) e++; const run = e - x, top = y * TS;
      for (let cx = (x + 3) * TS + rnd() * 40; cx < (e - 3) * TS; ) {
        const t = Math.floor(cx / TS); if (run < 6 || banned(t)) { cx += 160; continue; }
        if (rnd() < 0.45) { let q = nextT(), ok = false; for (let k = 0; k < 6 && !(ok = cx + q.w / 2 < e * TS - 8 && clear(cx - q.w / 2, top - q.h, cx + q.w / 2, top - 1) && (q.w < 150 || deep(q, cx, y))); k++) { backT(q); q = nextT(); } if (ok) { this.groundPlat(q, cx, top); cx += q.w + 60 + rnd() * 90; continue; } }
        const lift = 52 + Math.floor(rnd() * 3) * 18; const b = top - lift; let q = nextF(), ok = false;
        for (let tries = 0; tries < 6 && !(ok = clear(cx - q.w / 2, b - q.h, cx + q.w / 2, top - 1) && cx + q.w / 2 < e * TS - 8); tries++) { backF(q); q = nextF(); }
        if (ok) { this.addPlat(q.k, cx, b, rnd() < 0.5, -2); cx += q.w + 50 + rnd() * 90; } else { const q2 = PLAT.filter(z => z.h < 40 && z.w >= 30 && z.w <= q.w); const s2 = q2[Math.floor(rnd() * q2.length)]; if (s2 && clear(cx - s2.w / 2, b - s2.h, cx + s2.w / 2, top - 1)) { this.addPlat(s2.k, cx, b, rnd() < 0.5, -2); cx += s2.w + 60; } else cx += 40; }
      }
      x = e; } }
    { const used = new Set(this.plats.map(q => q.k)); fill(PLAT.filter(z => !used.has(z.k) && !hill(z))); }
    // last chance for wide walk-up hills: tighter spacing, but still flush on deep ground
    for (const r of [0.5, 0.25]) { const used = new Set(this.plats.map(q => q.k)); const left = PLAT.filter(z => !used.has(z.k) && hill(z)); if (left.length) fill(left, r, r > 0.25); }
    (window as any).__plats = this.plats.length; (window as any).__platKinds = new Set(this.plats.map(q => q.k)).size;
  }
  // ground pieces: walk-up hills sit flush (their low-end walk line = the ground line, sprite base buried under the turf); pillars get solid sides
  groundPlat(q: typeof PLAT[0], cx: number, top: number) {
    const v = q.p.filter(t => t >= 0), toe = q.h - Math.max(v[0], v[v.length - 1]);
    if (q.w >= 150) { this.addPlat(q.k, cx, top + toe, Math.random() < 0.5, -3); return; }
    this.addPlat(q.k, cx, top + 3, Math.random() < 0.5, -3);
    const pi = this.plats[this.plats.length - 1], st = Math.max(...v) + 4, inset = 4;
    const w = this.add.rectangle(pi.L + pi.w / 2, pi.T + st + (top - pi.T - st) / 2, pi.w - inset * 2, top - pi.T - st).setVisible(false);
    this.physics.add.existing(w, true); this.walls.add(w); }
  platSolid(x: number, y: number) { const ids = this.platB.get(Math.floor(x / 128)); if (!ids) return false;
    for (const i of ids) { const q = this.plats[i], c = Math.floor(x - q.L); if (c < 0 || c >= q.w) continue; const t = q.p[c]; if (t >= 0 && y >= q.T + t && y <= q.T + t + 40) return true; } return false; }
  // Kurogen bots ride the sheet platforms too: snap on the profile (one-way), turn back at a piece's edge
  botPlats() { for (const e of this.enemies as any[]) { if (e.kind !== 'bot' || e.dead || !e.b.enable) continue; const b = e.b; e.onPlat = false; if (b.velocity.y < 0) continue;
      const sy = this.platY(b.center.x, b.bottom); if (sy === Infinity || b.bottom < sy - 2) continue;
      b.y += Math.floor(sy) - b.bottom; b.velocity.y = 0; b.blocked.down = b.touching.down = true; e.onPlat = true;
      const ahead = this.platY(b.center.x + e.faceDir * 12, sy); if (ahead === Infinity && !this.solid.getTileAtWorldXY(b.center.x + e.faceDir * 12, sy + 4)?.collides && e.mode === 'patrol') e.dir = -e.faceDir; } }
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
    // petals drift off the bigger cherry trees; the shrine breathes a soft pink glow
    this.treeTops.forEach(([x, y, w], i) => this.add.particles(0, 0, 'petal', { x: { min: x - w * 0.35, max: x + w * 0.35 }, y: { min: y, max: y + w * 0.3 }, speedX: { min: -26, max: -6 }, speedY: { min: 10, max: 24 }, rotate: { min: 0, max: 360 }, scale: { min: 0.5, max: 0.9 }, alpha: { start: 1, end: 0.2 }, lifespan: 4200, frequency: 700 + (i * 131) % 600 }).setDepth(-11));
    if (this.shrineX) { const sy = this.surfaceBelow(Math.floor(this.shrineX / TS), 0, (x, y) => /[#\/]/.test(LEVEL1[y]?.[x] ?? '')) * TS;
      const g = this.add.image(this.shrineX, sy - 16, 'glow').setTint(0xff8ad8).setBlendMode(Phaser.BlendModes.ADD).setScale(2).setAlpha(0.25).setDepth(-4.9);
      this.tweens.add({ targets: g, alpha: 0.8, scale: 2.6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); }
    // grass & flower clumps sway from their base; lanterns flicker with an additive glow; crystal veins in the ground pulse
    this.sway.forEach((o, i) => this.tweens.add({ targets: o, angle: { from: -2.5, to: 2.5 }, duration: 1400 + (i * 137) % 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: (i * 211) % 1200 }));
    for (const l of this.lanterns) { const g = this.cull(this.add.image(l.x, l.y - l.displayHeight * 0.55, 'glow').setTint(0xffb347).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setDepth(l.depth + 0.1));
      this.tweens.add({ targets: g, alpha: { from: 0.45, to: 0.95 }, scale: { from: 1.4, to: 1.8 }, duration: 90, yoyo: true, repeat: -1, repeatDelay: 140, ease: 'Stepped' }); }
    this.crystals.forEach(([cx, cy], i) => { const g = this.cull(this.add.image(cx, cy, 'glow').setTint(0xff7ad9).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9).setDepth(2.2).setAlpha(0.2));
      this.tweens.add({ targets: g, alpha: 0.75, duration: 900 + (i * 97) % 700, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: (i * 173) % 1500 }); });
  }
  surfaceBelow(x: number, y0: number, S: (x: number, y: number) => boolean) { for (let y = y0; y < LEVEL1.length; y++) if (S(x, y) && !S(x, y - 1)) return y; return -1; }
  collect(f: any) {
    if (!f.active) return; audio.sfx('flower'); f.destroy(); this.got++; this.hud.setMem(this.got); this.fx.spark(f.x, f.y); this.player.trail.explode(14, f.x, f.y);
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
  take(k: PK) { const p = this.player; if (k === 'cannon') { this.cannon.give(); this.toast.show('MEGA CANNON — press C', '#ff9a3f'); return true; }
    if (k === 'heart') { if (p.hp >= HP_MAX) return false; p.hp = Math.min(HP_MAX, p.hp + 1); this.hud.setHp(p.hp); this.toast.show('+1 HP', '#ff8fb8'); return true; }
    if (k === 'rapid') { this.rapT = POWER_T; this.toast.show('RAPID FIRE  12s', '#7fe9ff'); return true; }
    this.powT = POWER_T; this.toast.show('OVERDRIVE  2x damage + fast charge  12s', '#ffd23f'); return true; }
  /** tier-styled hit burst for the 3-tap combo */
  impact(x: number, y: number, tier: number, d: number) {
    const col = [0, 0x3ff3ff, 0xff4fd8, 0xffd23f][tier] || 0x3ff3ff; this.fx.spark(x, y);
    const r = this.add.ellipse(x, y, 3, 3).setStrokeStyle(1 + (tier > 2 ? 1 : 0), col).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: r, scale: 2 + tier * 1.5, alpha: 0, duration: 150 + tier * 40, onComplete: () => r.destroy() });
    for (let i = 0; i < tier * 3; i++) { const a = Math.PI + (Math.random() - 0.5) * 2.2, p = this.add.rectangle(x, y, tier > 2 ? 2 : 1, tier > 2 ? 2 : 1, i % 2 ? col : 0xffffff).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: p, x: x - d * Math.cos(a) * (8 + tier * 6) * Math.random(), y: y + Math.sin(a) * (6 + tier * 5), alpha: 0, duration: 220, onComplete: () => p.destroy() }); }
    if (tier === 3) this.cameras.main.shake(50, 0.003);
  }
  openGate() { if (this.gateOpen) return; audio.sfx('gate'); this.gateOpen = true; (this.gate.body as any).enable = false; this.tweens.add({ targets: this.gateFx, alpha: 0, duration: 600 }); this.toast.show('All ten memories. The gate remembers you.', '#ffd6f0'); }
  respawn(full: boolean) {
    const p = this.player, b = p.body_;
    if (full) { this.deaths++; p.hp = HP_MAX; this.hud.setHp(p.hp); this.cameras.main.flash(250, 255, 200, 230);
      if (this.arena) { this.arena = false; this.walls.clear(true, true); this.boss.reset(); this.hud.draw(-1, -1); this.cameras.main.setBounds(0, 0, LEVEL1[0].length * TS, LEVEL1.length * TS); }
      p.setPosition(this.spawn.x, this.spawn.y); } else p.setPosition(this.safe.x, this.safe.y);
    b.setVelocity(0, 0); p.iT = 1;
  }
  /** manual "respawn at last checkpoint" (HUD button / R / Backspace / Pause menu). No HP cost. */
  checkpoint() {
    if (this.ending) return; audio.sfx('respawn'); const p = this.player; p.resetInput(); p.hurtT = 0; p.dashing = false; p.dashT = 0;
    if (this.arena) { this.arena = false; this.walls.clear(true, true); this.boss.reset(); this.hud.draw(-1, -1); this.cameras.main.setBounds(0, 0, LEVEL1[0].length * TS, LEVEL1.length * TS); }
    p.setPosition(this.spawn.x, this.spawn.y); p.body_.setVelocity(0, 0); p.iT = 1; this.stuckT = 0; this.manualRespawns++;
    this.cameras.main.flash(200, 255, 200, 230); this.toast.show('Back to the last checkpoint.', '#ffd6f0');
  }
  stuckT = 0; embedT = 0; lastPx = 0; manualRespawns = 0; unsticks = 0;
  /** watchdog: un-embed from solid tiles, and if input says move but nothing moves for 0.6s with no wall contact, clear pose/input locks and nudge */
  watchdog(dt: number) {
    const p = this.player, b = p.body_; if (!b.enable || p.hurtT > 0) { this.stuckT = 0; return; }
    const solid = (x: number, y: number) => this.at(Math.floor(x / TS), Math.floor(y / TS)) === '#';
    const midY = b.y + b.height * 0.45;
    if (solid(b.x + 2, midY) && solid(b.x + b.width - 2, midY)) this.embedT += dt; else this.embedT = 0;
    if (this.embedT > 0.12) { this.embedT = 0; for (let i = 1; i <= 3; i++) if (!solid(b.x + b.width / 2, midY - i * TS)) { p.y -= i * TS; b.y -= i * TS; b.velocity.y = 0; this.unsticks++; break; } }
    const k = p.keys as any; const want = k.left.isDown || k.right.isDown || k.a.isDown || k.d.isDown || touch.left || touch.right;
    const walled = b.blocked.left || b.blocked.right;
    if (want && !walled && Math.abs(p.x - this.lastPx) < 0.05) this.stuckT += dt; else this.stuckT = 0;
    this.lastPx = p.x;
    if (this.stuckT > 0.6) { this.stuckT = 0; this.unsticks++; const held = k.j.isDown || k.x.isDown || touch.shoot; if (!held || p.poseLock) p.resetInput(); p.y -= 2; b.y -= 2; b.velocity.y = Math.min(b.velocity.y, -40); }
  }
  lockArena() {
    this.arena = true; const top = 64 * TS, h = 32 * TS;
    for (const c of [ARENA.x0 + 1, ARENA.x1 - 1]) { const w = this.walls.create(c * TS + 8, top + h / 2, 'px').setVisible(false) as any; w.body.setSize(16, h); w.refreshBody?.(); w.body.setSize(16, h); }
    this.cameras.main.setBounds(ARENA.x0 * TS, top - 40, (ARENA.x1 - ARENA.x0) * TS, LEVEL1.length * TS - top + 40);
    this.boss.awake = true; this.toast.show('KUROGEN ENFORCER — "Kael Veyron sends his regards."', '#ff8a8a'); this.fx.shake(300, 0.006);
  }
  lookX = 0; lookY = 0;
  update(_t: number, dms: number) {
    const dt = Math.min(dms, 50) / 1000; this.petals.update(dt); this.bg.update(dt);
    for (const w of this.falls) w.tilePositionY -= dt * 70; for (const f of this.falls2) f.t.tilePositionY -= dt * f.v; for (const w of this.waters) w.tilePositionX += dt * 8; if (this.gateFx) this.gateFx.tilePositionY += dt * 40;
    const cam = this.cameras.main; if ((this.cullT -= dt) <= 0) { this.cullT = 0.2; const vx = cam.scrollX - 120, vy = cam.scrollY - 120;
      for (const o of this.deco) o.setVisible(o.x > vx && o.x < vx + 720 && o.y > vy && o.y - o.displayHeight < vy + 510); }
    this.fx.tick();
    if (this.ending || this.fx.stopped) return;
    const p = this.player; this.time_ += dt; this.hud.setTime(this.time_);
    if (touch.respawnP) { touch.respawnP = false; this.checkpoint(); }
    p.update(dt); this.watchdog(dt);
    { // waterfalls: distance-scaled roar + dark silhouette while behind a run-behind sheet
      let dmin = 1e9, beh = false; const py = p.y - 16;
      for (const r of this.wfRects) { const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w)), dy = Math.max(r.y - py, 0, py - (r.y + r.h)), d = Math.hypot(dx, dy) - (r.w > 60 ? 40 : 0); if (d < dmin) dmin = d; if (r.behind && dx === 0 && dy === 0) beh = true; }
      this.fallVol = Math.pow(Phaser.Math.Clamp(1 - dmin / 380, 0, 1), 2) * 0.55; audio.loop('falls', this.fallVol > 0.01, 1, this.fallVol);
      if (!this.sil) this.sil = this.add.sprite(0, 0, p.texture.key).setDepth(10.8).setTintFill(0x101a30).setAlpha(0.74).setVisible(false);
      this.behindNow = beh; this.sil.setVisible(beh && p.visible);
      if (beh) this.sil.setTexture(p.texture.key, p.frame.name).setPosition(p.x, p.y).setOrigin(p.originX, p.originY).setFlipX(p.flipX).setScale(p.scaleX, p.scaleY).setRotation(p.rotation); }
    this.cannon.update(dt);
    this.pk.update(dt, p, k => this.take(k)); this.rapT = Math.max(0, this.rapT - dt); this.powT = Math.max(0, this.powT - dt); this.gun.rapid = this.rapT; p.beam.boost = this.powT > 0 ? 1.8 : 1;
    if (this.rapT > 0 || this.powT > 0) { if ((this.auraT2 -= dt) <= 0) { this.auraT2 = 0.12; const c = this.powT > 0 ? 0xffd23f : 0x3ff3ff, sp = this.add.rectangle(p.x + Phaser.Math.Between(-7, 7), p.y - Phaser.Math.Between(4, 30), 1, 3, c).setDepth(10).setBlendMode(Phaser.BlendModes.ADD); this.tweens.add({ targets: sp, y: sp.y - 14, alpha: 0, duration: 400, onComplete: () => sp.destroy() }); } }
    { const C = FEEL.cam, b = p.body_; this.lookX = Phaser.Math.Linear(this.lookX, p.facing * C.lookX * (Math.abs(b.velocity.x) > 40 ? 1 : 0.4), C.lookLerp); this.lookY = Phaser.Math.Linear(this.lookY, b.velocity.y > 300 ? C.lookFallY : 0, 0.06);
      cam.setFollowOffset(-this.lookX, 30 - this.lookY); } this.scam.update(dt); this.culler.update(); p.pfx.update(dt); p.beam.update(dt, p.x + p.facing * 16, p.y - (p.poseLock ? 16 : 19), p.facing); this.gun.update(dt); this.egun.update(dt);
    for (const g of [this.egun, this.gun]) for (const sh of g.shots.getChildren() as any[]) if (sh.active && this.platSolid(sh.x, sh.y)) { if (g === this.gun) this.fx.spark(sh.x, sh.y); g.kill(sh); }
    this.enemies = this.enemies.filter(e => e.active);
    for (const e of this.enemies) { const near = Math.abs(e.x - p.x) < 560 && Math.abs(e.y - p.y) < 340; e.b.enable = near && !e.dead; if (near) e.tick(dt, p.x, p.y - 14); else e.b.setVelocity(0, 0); }
    if (this.boss.active && !this.boss.dead) this.boss.tick(dt, p.x, p.y - 14);
    this.hud.draw(p.hasJet ? p.fuel / JET.fuel : -1, this.arena && this.boss.active ? Math.max(0, this.boss.hp / this.boss.maxHp) : (this.boss.dead && this.boss.active ? 0 : -1));
    if (p.body_.blocked.down) this.safe = { x: p.x - p.facing * 6, y: p.y };
    if (!this.shrineLit && this.shrineX && p.x > this.shrineX) { this.shrineLit = true; audio.sfx('checkpoint'); this.spawn = { x: this.shrineX, y: p.y }; this.fx.explode(this.shrineX, p.y - 20, 0.5); this.toast.show('Lantern shrine lit — checkpoint.', '#ffd23f'); }
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
