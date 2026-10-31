import { PLAT } from './platPieces';
import Phaser from 'phaser';
import { makeCombatTextures } from '../systems/Textures';
import { DECO_SIZE } from '../decoList';
// src: sheet key, frames. Core cycles from player2 (generated + processed, tools/gen_frames.py)
export const ANIMS: Record<string, { src: string; frames: number[]; rate: number; repeat: number }> = {
  idle: { src: 'idle', frames: [0, 1], rate: 2, repeat: -1 }, run: { src: 'run8', frames: [0, 1, 2, 3, 4, 5, 6, 7], rate: 15, repeat: -1 },
  jump: { src: 'rise', frames: [0], rate: 1, repeat: 0 }, doublejump: { src: 'rise', frames: [0], rate: 1, repeat: 0 },
  fall: { src: 'fall2', frames: [0], rate: 1, repeat: -1 }, apex: { src: 'apex2', frames: [0], rate: 1, repeat: 0 },
  land: { src: 'land', frames: [0], rate: 1, repeat: 0 }, dash: { src: 'dash4', frames: [0, 1], rate: 16, repeat: 0 }, dashend: { src: 'dash4', frames: [2, 3], rate: 14, repeat: 0 }, dash_u: { src: 'dash8', frames: [0], rate: 1, repeat: 0 }, dash_ud: { src: 'dash8', frames: [1], rate: 1, repeat: 0 }, dash_dd: { src: 'dash8', frames: [2], rate: 1, repeat: 0 }, dash_d: { src: 'dash8', frames: [3], rate: 1, repeat: 0 },
  shoot: { src: 'shoot', frames: [1, 0], rate: 12, repeat: 0 }, runshoot: { src: 'runshoot', frames: [0], rate: 1, repeat: 0 }, hurt: { src: 'hurt2', frames: [0, 1], rate: 6, repeat: 0 }, win: { src: 'win', frames: [0], rate: 1, repeat: 0 }, sit: { src: 'sit', frames: [0], rate: 1, repeat: 0 }, wall: { src: 'wall', frames: [0], rate: 1, repeat: 0 },
  charge: { src: 'charge', frames: [0, 1, 2, 3, 4, 5], rate: 14, repeat: -1 }, beamfire: { src: 'fire', frames: [0, 1, 0, 1, 2], rate: 18, repeat: -1 },
};
const SHEETS = ['idle', 'run', 'jump', 'apex', 'fall', 'dash', 'shoot', 'runshoot', 'hurt', 'charge', 'fire', 'run8', 'rise', 'apex2', 'fall2', 'land', 'dash4', 'hurt2', 'win', 'sit', 'wall', 'dash8'];
export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    for (const k of SHEETS) this.load.spritesheet('p_' + k, `assets/sakura/${k}.png`, { frameWidth: 64, frameHeight: 48 });
    for (const k of ['far', 'mid', 'near']) this.load.image('L_' + k, `assets/bg/L_${k}.png`);
    this.load.json('parallax', 'assets/bg/parallax.json');
    for (const [i, w] of [[0, 56], [1, 88], [2, 176]]) this.load.spritesheet('wf_basin' + i, `assets/props2/wf_basin${i}.png`, { frameWidth: w as number, frameHeight: 22 });
    this.load.spritesheet('tiles', 'assets/tiles/tileset2.png', { frameWidth: 16, frameHeight: 16 });
    for (const k of ['torii', 'lantern', 'shrine', 'tree', 'tree2', 'bridge', 'flower', 'car']) this.load.image('pr_' + k, `assets/props2/${k}.png`);
    this.load.spritesheet('e_drone', 'assets/enemies/drone8.png', { frameWidth: 37, frameHeight: 24 });
    this.load.spritesheet('e_bot', 'assets/enemies/bot8.png', { frameWidth: 23, frameHeight: 32 });
    this.load.spritesheet('e_wasp', 'assets/enemies/wasp6.png', { frameWidth: 34, frameHeight: 22 });
    this.load.spritesheet('e_sentry', 'assets/enemies/sentry6.png', { frameWidth: 30, frameHeight: 34 });
    this.load.spritesheet('e_trooper', 'assets/enemies/trooper6.png', { frameWidth: 30, frameHeight: 32 });
    this.load.spritesheet('e_turret', 'assets/enemies/turret8.png', { frameWidth: 27, frameHeight: 30 });
    this.load.spritesheet('e_boom', 'assets/enemies/boom4.png', { frameWidth: 43, frameHeight: 32 });
    this.load.spritesheet('fx_boom', 'assets/fx/boom.png', { frameWidth: 50, frameHeight: 42 });
    for (const k of ['shot', 'ebolt', 'flash', 'pip', 'pip_e', 'spark', 'spark2', 'petal', 'waterfall', 'shot1', 'shot2', 'shot3', 'eorb', 'eneedle', 'eplasma', 'pk_heart', 'pk_rapid', 'pk_power', 'pk_cannon']) this.load.image(k, `assets/fx/${k}.png`);
    this.load.image('pr_torii_big', 'assets/props/torii.png'); this.load.image('pr_stone_gate', 'assets/props/stone_gate.png'); this.load.image('pr_lantern_stone', 'assets/props/lantern_stone.png'); this.load.image('pr_torii11', 'assets/props2/torii11.png');
    this.load.image('petal_soft', 'assets/fx/petal.png');
    for (let i = 0; i < 3; i++) this.load.image('cloud' + i, `assets/bg/cloud${i}.png`);
    this.load.image('P_far', 'assets/bg/P_far.png'); this.load.image('P_mid', 'assets/bg/P_mid.png'); this.load.json('pano', 'assets/bg/pano.json');
    for (const k of ['lantern2', 'arch', 'fence']) this.load.image('pr_' + k, `assets/props2/${k}.png`);
    this.load.image('panorama', 'assets/bg/panorama_full.png');
    for (const q of PLAT) this.load.image('pl_' + q.k, `assets/plat/${q.k}.png`);
    for (const k of ['bush', 'bush2', 'jetboots', 'bridge_parts', 'tree_big0', 'tree_big1', 'tree_s0', 'tree_s1', 'tree_s2', 'tree_m0', 'tree_m1', ...['ts0','ts1','ts2','ts3'].flatMap(t => [t, t + 'dk', t + 'lt']), 'ts_sap', 'ts_bush', 'wf_lip0', 'wf_lip1', 'wf_lip2', 'wf_rocks']) this.load.image('pr_' + k, `assets/props2/${k}.png`);
    for (const k of Object.keys(DECO_SIZE)) this.load.image('dc_' + k, `assets/deco/${k}.png`);
    this.load.spritesheet('boss', 'assets/enemies/boss.png', { frameWidth: 60, frameHeight: 45 });
    this.load.spritesheet('slopes', 'assets/tiles/slopes.png', { frameWidth: 16, frameHeight: 16 });
    this.load.image('ui_logo', 'assets/ui_logo2.png'); this.load.image('intro_p1', 'assets/intro/pano1.png'); this.load.image('intro_p2', 'assets/intro/pano2.png'); for (const n of [1, 2]) for (let k = 0; k < 3; k++) this.load.image(`intro_p${n}_spk${k}`, `assets/intro/pano${n}_spk${k}.png`); this.load.image('water', 'assets/fx/water.png');
    this.load.image('strip2', 'assets/bg/strip2.png');
    for (const k of ['far_mtn', 'mid_hills', 'near_forest', 'fg', 'lake']) this.load.image('g2_' + k, `assets/gen2/L_${k}.png`);
    for (let i = 0; i < 17; i++) this.load.image('g2cloud' + i, `assets/gen2/cloud${i}.png`);
    for (let i = 0; i < 25; i++) this.load.image('pp' + i, `assets/gen2/pp${i}.png`);
    for (let i = 20; i < 24; i++) this.load.image('tg' + i, `assets/gen2/tg${i}.png`);
    this.load.image('car_body', 'assets/gen2/car_body.png'); this.load.image('car_wheel', 'assets/gen2/car_wheel.png'); this.load.json('car_rig', 'assets/gen2/car_rig.json');
    this.load.spritesheet('bird', 'assets/gen2/bird.png', { frameWidth: 9, frameHeight: 5 });
  }
  create() {
    for (const [k, a] of Object.entries(ANIMS))
      this.anims.create({ key: k, frames: this.anims.generateFrameNumbers('p_' + a.src, { frames: a.frames }), frameRate: a.rate, repeat: a.repeat });
    // generated test tiles (16x16): pink-capped stone + plain stone, petal particle
    makeCombatTextures(this);
    for (const i of [0, 1, 2]) this.anims.create({ key: 'wf_basin' + i, frames: this.anims.generateFrameNumbers('wf_basin' + i, {}), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'boss_idle', frames: this.anims.generateFrameNumbers('boss', { frames: [0, 1, 2, 1] }), frameRate: 8, repeat: -1 });
    this.scene.start(location.search.includes('test') ? 'TestRoom' : 'Title');
  }
}
