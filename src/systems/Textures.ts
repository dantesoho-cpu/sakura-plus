import Phaser from 'phaser';
// All visible art is loaded PNGs (see Boot). This only builds the 2px invisible helper and the animations.
export function makeCombatTextures(s: Phaser.Scene) {
  if (!s.textures.exists('glow')) { const c = s.textures.createCanvas('glow', 32, 32)!, x = c.getContext(); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); c.refresh(); }
  if (!s.textures.exists('px')) { const g = s.add.graphics(); g.fillStyle(0xffffff).fillRect(0, 0, 2, 2); g.generateTexture('px', 2, 2); g.destroy(); }
  const A = s.anims, mk = (k: string, t: string, f: number[], r: number, rep = -1) => A.create({ key: k, frames: A.generateFrameNumbers(t, { frames: f }), frameRate: r, repeat: rep });
  mk('drone_idle', 'e_drone', [0, 1, 2, 3, 4, 5, 6, 7], 18); mk('drone_attack', 'e_drone', [8, 9, 10, 11, 12, 13, 14, 15], 30);
  mk('bot_idle', 'e_bot', [0, 1, 2, 3, 4, 5, 6, 7], 10); mk('bot_attack', 'e_bot', [8, 9, 10, 11, 12, 13, 14, 15], 18);
  mk('turret_idle', 'e_turret', [0, 1, 2, 3, 4, 5, 6, 7], 8); mk('turret_attack', 'e_turret', [8, 9, 10, 11, 12, 13, 14, 15], 14, 0);
  mk('wasp_fly', 'e_wasp', [0, 1, 2, 3], 16); mk('wasp_drop', 'e_wasp', [4, 5], 12);
  mk('sentry_idle', 'e_sentry', [0, 1, 2, 3, 2, 1], 5); mk('sentry_charge', 'e_sentry', [4, 5], 14);
  mk('trooper_walk', 'e_trooper', [0, 1, 2, 3], 7); mk('trooper_idle', 'e_trooper', [4, 5], 3);
  mk('e_destroy', 'e_boom', [0, 1, 2, 3], 10, 0); mk('fx_boom', 'fx_boom', [0, 1, 2, 3, 4], 16, 0);
}
