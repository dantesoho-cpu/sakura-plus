import Phaser from 'phaser';
// Recycles short-lived FX images per scene instead of add/destroy each time (cuts GC churn on TV browsers).
const pools = new WeakMap<Phaser.Scene, Phaser.GameObjects.Image[]>();
export function pooledImage(s: Phaser.Scene, x: number, y: number, key: string): Phaser.GameObjects.Image {
  let a = pools.get(s); if (!a) { a = []; pools.set(s, a); s.events.once('shutdown', () => pools.delete(s)); }
  const im = a.pop(); if (im && im.scene) { s.tweens.killTweensOf(im); return im.setTexture(key).setPosition(x, y).setActive(true).setVisible(true).setAlpha(1).setScale(1).setRotation(0).clearTint().setBlendMode(0); }
  return s.add.image(x, y, key);
}
export function releaseImage(s: Phaser.Scene, im: Phaser.GameObjects.Image) { const a = pools.get(s); if (!a || a.length > 64) { im.destroy(); return; } im.setActive(false).setVisible(false); a.push(im); }
