import Phaser from 'phaser';
// Canvas-renderer budget (TV browsers without WebGL): halves ambient particle emission, caps alive particles,
// and culls ambient emitters whose learned home box is off-screen. WebGL is untouched.
export class CanvasLite {
  on: boolean; t = 0; homes: { e: any; x0: number; x1: number; y0: number; y1: number }[] = []; learned = false; age = 0;
  dbg = { emitters: 0, culled: 0, alive: 0, on: false };
  constructor(public s: Phaser.Scene, public skip: any[] = []) {
    this.on = s.game.renderer.type === Phaser.CANVAS; this.dbg.on = this.on; (window as any).__clite = this;
    if (!this.on) return;
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
