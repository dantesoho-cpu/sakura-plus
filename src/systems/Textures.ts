import Phaser from 'phaser';
// All visible art is loaded PNGs (see Boot). This only builds the 2px invisible helper and the animations.
export function makeCombatTextures(s: Phaser.Scene) {
  if (!s.textures.exists('px')) { const g = s.add.graphics(); g.fillStyle(0xffffff).fillRect(0, 0, 2, 2); g.generateTexture('px', 2, 2); g.destroy(); }
  const A = s.anims, mk = (k: string, t: string, f: number[], r: number, rep = -1) => A.create({ key: k, frames: A.generateFrameNumbers(t, { frames: f }), frameRate: r, repeat: rep });
  mk('drone_idle', 'e_drone', [0, 1, 2, 3], 14); mk('drone_attack', 'e_drone', [0, 1, 2, 3], 24);
  mk('bot_idle', 'e_bot', [0, 1, 2, 3], 6); mk('bot_attack', 'e_bot', [0, 1, 2, 3], 12);
  mk('turret_idle', 'e_turret', [0, 1, 2, 3, 2, 1], 6); mk('turret_attack', 'e_turret', [0, 1, 2, 3, 2, 1], 14);
  mk('e_destroy', 'e_boom', [0, 1, 2, 3], 10, 0); mk('fx_boom', 'fx_boom', [0, 1, 2, 3, 4], 16, 0);
}
