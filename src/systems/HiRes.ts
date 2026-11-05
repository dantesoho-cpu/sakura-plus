import Phaser from 'phaser';
/**
 * Hi-res rendering for the 480x270 logical game. All game code, camera math, bounds, follow, worldView, scrollFactor-0 UI
 * keep working in 480x270 logical pixels; only the final camera matrix + scissor/flash rects are scaled by HI. The camera
 * scroll is quantised to 1/HI logical px (one device pixel) instead of whole art pixels, which removes the 2-3-2-3 px
 * scroll cadence (the main source of the "choppy" scrolling) while sprites still snap to device pixels (crisp pixel art).
 */
export const HI = (() => { const q = new URLSearchParams(location.search).get('hi'); if (q) return Math.max(1, Math.min(4, +q | 0));
  const touchy = matchMedia?.('(pointer: coarse)').matches, dev = Math.max(screen.width, screen.height) * (devicePixelRatio || 1);
  return Math.max(2, Math.min(touchy ? 3 : 4, Math.floor(dev / 480))); })();
let done = false;
export function installHiRes() {
  if (done || HI === 1) return; done = true;
  const C: any = (Phaser.Cameras.Scene2D.Camera as any).prototype, M = new Phaser.GameObjects.Components.TransformMatrix();
  const pre = C.preRender;
  C.preRender = function () {
    const rp = this.roundPixels; this.roundPixels = false; pre.call(this); this.roundPixels = rp;
    if (rp) { this.scrollX = Math.round(this.scrollX * HI) / HI; this.scrollY = Math.round(this.scrollY * HI) / HI; }
    const ox = this.width * this.originX, oy = this.height * this.originY, zx = this.zoomX, zy = this.zoomY, m = this.matrix;
    // what the stock code produced (before shake) so the shake offset can be carried over at HI scale
    M.applyITRS(Math.floor(this.x + ox + 0.5), Math.floor(this.y + oy + 0.5), this.rotation, zx, zy); M.translate(-ox, -oy);
    const se = m.e - M.e, sf = m.f - M.f;
    m.applyITRS((this.x + ox) * HI, (this.y + oy) * HI, this.rotation, zx * HI, zy * HI); m.translate(-ox, -oy);
    m.e = Math.round(m.e + se * HI); m.f = Math.round(m.f + sf * HI);
    this.renderRoundPixels = rp && Number.isInteger(zx * HI) && Number.isInteger(zy * HI);
  };
  const R: any = (Phaser.Renderer.WebGL.WebGLRenderer as any).prototype;
  const scaled = (fn: any) => function (this: any, cam: any) { const x = cam.x, y = cam.y, w = cam.width, h = cam.height;
    cam._x = x * HI; cam._y = y * HI; cam._width = w * HI; cam._height = h * HI; try { return fn.call(this, cam); } finally { cam._x = x; cam._y = y; cam._width = w; cam._height = h; } };
  R.preRenderCamera = scaled(R.preRenderCamera); R.postRenderCamera = scaled(R.postRenderCamera);
  const CM: any = (Phaser.Cameras.Scene2D.CameraManager as any).prototype;
  const add = CM.add; CM.add = function (x?: number, y?: number, w?: number, h?: number, mm?: boolean, n?: string) { return add.call(this, x, y, w ?? this.scene.sys.scale.width / HI, h ?? this.scene.sys.scale.height / HI, mm, n); };
  CM.getCamerasBelowPointer = function (p: any) { const out: any[] = []; for (const c of this.cameras) if (c.visible && c.inputEnabled && p.x >= c.x * HI && p.y >= c.y * HI && p.x < (c.x + c.width) * HI && p.y < (c.y + c.height) * HI) out.unshift(c); return out; };
}
