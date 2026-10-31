import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { TestRoom } from './scenes/TestRoom';
import { Intro } from './scenes/Intro';
import { Title } from './scenes/Title';
import { Level1 } from './scenes/Level1';
import { Level2 } from './scenes/Level2';
import { Pause } from './scenes/Pause';
import { Victory } from './scenes/Victory';
import { setupTouch } from './systems/Touch';
import { setupPad } from './systems/Pad';
export const W = 480, H = 270;
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: W, height: H, pixelArt: true, roundPixels: true,
  backgroundColor: '#1a1030',
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  fps: { target: 60, smoothStep: true },
  scene: [Boot, TestRoom, Title, Intro, Level1, Level2, Pause, Victory],
});
setupTouch(); setupPad();
(window as any).__game = game;
