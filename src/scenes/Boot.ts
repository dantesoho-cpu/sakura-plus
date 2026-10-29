import Phaser from 'phaser';
import { makeCombatTextures } from '../systems/Textures';
import { DECO_SIZE } from '../decoList';
// src: sheet key, frames. Core cycles from player2 (generated + processed, tools/gen_frames.py)
export const ANIMS: Record<string, { src: string; frames: number[]; rate: number; repeat: number }> = {
  idle: { src: 'idle', frames: [0, 1], rate: 2, repeat: -1 }, run: { src: 'run', frames: [0, 1, 2, 3, 4, 5], rate: 12, repeat: -1 },
  jump: { src: 'jump', frames: [0], rate: 1, repeat: 0 }, doublejump: { src: 'jump', frames: [0], rate: 1, repeat: 0 },
  fall: { src: 'fall', frames: [0], rate: 1, repeat: -1 }, apex: { src: 'apex', frames: [0], rate: 1, repeat: 0 },
  land: { src: 'dash', frames: [2], rate: 1, repeat: 0 }, dash: { src: 'dash', frames: [0, 1], rate: 20, repeat: 0 },
  shoot: { src: 'shoot', frames: [1, 0], rate: 12, repeat: 0 }, runshoot: { src: 'runshoot', frames: [0], rate: 1, repeat: 0 }, hurt: { src: 'hurt', frames: [0, 1], rate: 8, repeat: 0 },
  charge: { src: 'charge', frames: [0, 1, 2, 3, 4, 5], rate: 14, repeat: -1 }, beamfire: { src: 'fire', frames: [0, 1, 0, 1, 2], rate: 18, repeat: -1 },
};
const SHEETS = ['idle', 'run', 'jump', 'apex', 'fall', 'dash', 'shoot', 'runshoot', 'hurt', 'charge', 'fire'];
export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    for (const k of SHEETS) this.load.spritesheet('p_' + k, `assets/sakura/${k}.png`, { frameWidth: 64, frameHeight: 48 });
    for (const k of ['far', 'mid', 'near']) this.load.image('L_' + k, `assets/bg/L_${k}.png`);
    this.load.json('parallax', 'assets/bg/parallax.json');
    this.load.spritesheet('tiles', 'assets/tiles/tileset2.png', { frameWidth: 16, frameHeight: 16 });
    for (const k of ['torii', 'lantern', 'shrine', 'tree', 'tree2', 'bridge', 'flower', 'car']) this.load.image('pr_' + k, `assets/props2/${k}.png`);
    this.load.spritesheet('e_drone', 'assets/enemies/drone8.png', { frameWidth: 37, frameHeight: 24 });
    this.load.spritesheet('e_bot', 'assets/enemies/bot8.png', { frameWidth: 23, frameHeight: 32 });
    this.load.spritesheet('e_turret', 'assets/enemies/turret8.png', { frameWidth: 27, frameHeight: 30 });
    this.load.spritesheet('e_boom', 'assets/enemies/boom4.png', { frameWidth: 43, frameHeight: 32 });
    this.load.spritesheet('fx_boom', 'assets/fx/boom.png', { frameWidth: 50, frameHeight: 42 });
    for (const k of ['shot', 'ebolt', 'flash', 'pip', 'pip_e', 'spark', 'spark2', 'petal', 'waterfall']) this.load.image(k, `assets/fx/${k}.png`);
    this.load.image('petal_soft', 'assets/fx/petal.png');
    for (let i = 0; i < 3; i++) this.load.image('cloud' + i, `assets/bg/cloud${i}.png`);
    this.load.image('P_far', 'assets/bg/P_far.png'); this.load.image('P_mid', 'assets/bg/P_mid.png'); this.load.json('pano', 'assets/bg/pano.json');
    for (const k of ['lantern2', 'arch', 'fence']) this.load.image('pr_' + k, `assets/props2/${k}.png`);
    this.load.image('panorama', 'assets/bg/panorama_full.png');
    for (const k of ['bush', 'bush2', 'jetboots', 'bridge_parts', 'tree_big0', 'tree_big1', 'tree_s0', 'tree_s1', 'tree_s2']) this.load.image('pr_' + k, `assets/props2/${k}.png`);
    for (const k of Object.keys(DECO_SIZE)) this.load.image('dc_' + k, `assets/deco/${k}.png`);
    this.load.spritesheet('boss', 'assets/enemies/boss.png', { frameWidth: 60, frameHeight: 45 });
    this.load.spritesheet('slopes', 'assets/tiles/slopes.png', { frameWidth: 16, frameHeight: 16 });
    this.load.image('ui_logo', 'assets/ui_logo.png'); this.load.image('water', 'assets/fx/water.png');
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
    this.anims.create({ key: 'boss_idle', frames: this.anims.generateFrameNumbers('boss', { frames: [0, 1, 2, 1] }), frameRate: 8, repeat: -1 });
    this.scene.start(location.search.includes('test') ? 'TestRoom' : 'Title');
  }
}
