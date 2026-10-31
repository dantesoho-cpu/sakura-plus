import Phaser from 'phaser';
// Canvas-renderer budget (TV browsers without WebGL): halves ambient particle emission, caps alive particles,
// and culls ambient emitters whose learned home box is off-screen. WebGL is untouched.
export class CanvasLite {
  on: boolean; t = 0; homes: { e: any; x0: number; x1: number; y0: number; y1: number }[] = []; learned = false; age = 0;
  dbg = { emitters: 0, culled: 0, alive: 0, on: false };
  constructor(public s: Phaser.Scene, public skip: any[] = []) {
    this.on = s.game.renderer.type === Phaser.CANVAS; this.dbg.on = this.on; (window as any).__clite = this;
    if (!this.on) return;
    { let n = 0; for (const o of s.children.list as any[]) if (o instanceof Phaser.GameObjects.Image && o.blendMode === Phaser.BlendModes.ADD && o.alpha <= 0.3 && o.alpha > 0 && !s.tweens.isTweening(o)) { o.setAlpha(0); n++; } (window as any).__cliteGlows = n; }
    for (const o of s.children.list as any[]) if (o instanceof Phaser.GameObjects.Particles.ParticleEmitter && !skip.includes(o) && o.emitting && !o.follow && o.frequency >= 0) {
      if (o.frequency > 0) o.frequency *= 3;
      o.maxAliveParticles = Math.min(o.maxAliveParticles || 24, 24);
      this.homes.push({ e: o, x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
    }
    this.dbg.emitters = this.homes.length;
  }
  update(dt: number) {
    if (!this.on) return;
    this.age += dt;
    if (!this.learned) { // learn each emitter's spatial footprint from its live particles during the first 2.5s
      for (const h of this.homes) h.e.forEachAlive((p: any) => { if (p.x < h.x0) h.x0 = p.x; if (p.x > h.x1) h.x1 = p.x; if (p.y < h.y0) h.y0 = p.y; if (p.y > h.y1) h.y1 = p.y; }, null);
      if (this.age > 2.5) { this.learned = true; this.homes = this.homes.filter(h => h.x1 >= h.x0 && h.x1 - h.x0 < 1400); }
      return;
    }
    if ((this.t = (this.t + 1) % 4) !== 0) return;
    const cam = this.s.cameras.main, m = 200, l = cam.scrollX - m, r = cam.scrollX + cam.width / cam.zoom + m, tp = cam.scrollY - m, b = cam.scrollY + cam.height / cam.zoom + m;
    let c = 0, a = 0;
    for (const h of this.homes) { const off = h.x0 > r || h.x1 < l || h.y0 > b || h.y1 < tp; const e = h.e;
      if (off) { if (e.visible) { e.setVisible(false); e.emitting && (e.__wasEmit = true, e.stop()); } c++; }
      else { if (!e.visible) { e.setVisible(true); if (e.__wasEmit) { e.__wasEmit = false; e.start(); } } a += e.getAliveParticleCount(); } }
    this.dbg.culled = c; this.dbg.alive = a;
  }
}

/** Canvas mode only: bake static tilemap layers into 1024x512 chunk images (≈1000 drawImage/frame -> ≈4). Collision data stays on the hidden layers. */
export function bakeTiles(s: Phaser.Scene, layers: Phaser.Tilemaps.TilemapLayer[], depth: number) {
  if (s.game.renderer.type !== Phaser.CANVAS || !layers.length) return 0;
  const CW = 1024, CH = 512, L0 = layers[0], W = L0.layer.widthInPixels, H = L0.layer.heightInPixels; let n = 0;
  for (let cy = 0; cy < H; cy += CH) for (let cx = 0; cx < W; cx += CW) {
    const key = 'tbake_' + s.scene.key + '_' + cx + '_' + cy; if (s.textures.exists(key)) s.textures.remove(key);
    const ct = s.textures.createCanvas(key, Math.min(CW, W - cx), Math.min(CH, H - cy))!; const ctx = ct.context; ctx.imageSmoothingEnabled = false; let any = false;
    for (const ly of layers) { const tw = ly.layer.tileWidth, th = ly.layer.tileHeight;
      ly.forEachTile(t => { if (t.index < 0 || !t.visible) return; const ts = t.tileset!; const c = ts.getTileTextureCoordinates(t.index) as any; if (!c) return;
        const src = ts.image!.getSourceImage() as any; ctx.globalAlpha = t.alpha * ly.alpha;
        ctx.save(); ctx.translate(t.pixelX - cx + tw / 2, t.pixelY - cy + th / 2); if (t.rotation) ctx.rotate(t.rotation); ctx.scale(t.flipX ? -1 : 1, t.flipY ? -1 : 1);
        ctx.drawImage(src, c.x, c.y, tw, th, -tw / 2, -th / 2, tw, th); ctx.restore(); any = true; }, undefined, Math.floor(cx / tw), Math.floor(cy / th), Math.ceil(CW / tw), Math.ceil(CH / th));
    }
    ct.refresh(); if (!any) { s.textures.remove(key); continue; }
    s.add.image(cx, cy, key).setOrigin(0).setDepth(depth); n++;
  }
  for (const ly of layers) ly.setVisible(false); (window as any).__tbake = n; return n;
}
