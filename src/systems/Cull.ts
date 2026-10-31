import Phaser from 'phaser';
// Off-screen culling for world-space display objects: toggles only the main camera's filter bit (logic-controlled `visible` untouched).
export class Cull {
  t = 0; dbg = { culled: 0, checked: 0 };
  constructor(public s: Phaser.Scene, public margin = 140) { (window as any).__cull = this; }
  update() {
    if ((this.t = (this.t + 1) % 3) !== 0) return;
    const cam = this.s.cameras.main, id = cam.id, m = this.margin, W = cam.width / cam.zoom, H = cam.height / cam.zoom, list = this.s.children.list;
    let c = 0, n = 0;
    for (let i = 0; i < list.length; i++) { const o: any = list[i]; const sf = o.scrollFactorX, sy = o.scrollFactorY; if (!sf || o.displayWidth === undefined || o.rotation || o.parentContainer) continue; n++;
      const l = cam.scrollX * sf - m, r = l + W + 2 * m, t = cam.scrollY * sy - m, bt = t + H + 2 * m;
      const w = o.displayWidth, h = o.displayHeight, x0 = o.x - o.originX * w, y0 = o.y - o.originY * h;
      const off = x0 > r || x0 + w < l || y0 > bt || y0 + h < t;
      if (off) { o.cameraFilter |= id; c++; } else if (o.cameraFilter & id) o.cameraFilter &= ~id; }
    this.dbg.culled = c; this.dbg.checked = n;
  }
}
