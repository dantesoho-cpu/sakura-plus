import Phaser from 'phaser';
import { HI } from './HiRes';
const q = (v: number) => Math.round(v * HI) / HI;
// Animated background life + sub-zone grading, positioned on camera prerender (same frame as the world, HiRes-quantised).
// L1: petals at three depths, drifting mist banks, a far waterfall shimmer. L2: two extra flying-craft
// lanes, blinking tower beacons, flickering holo-ad panels (no text), haze bands between skyline layers.
export type Zone = { name: string; at: number; tint: number; mist: number };
export const L1_ZONES: Zone[] = [{ name: 'Lakeside Dawn', at: 0, tint: 0xdfe6ff, mist: 0.55 }, { name: 'Blossom Heights', at: 0.33, tint: 0xffffff, mist: 0.3 }, { name: 'Maple Dusk', at: 0.62, tint: 0xffd2b4, mist: 0.42 }];
export const L2_ZONES: Zone[] = [{ name: 'Market Street', at: 0, tint: 0xffd8f4, mist: 0.35 }, { name: 'Transit Core', at: 0.36, tint: 0xc8ecff, mist: 0.45 }, { name: 'Spire Ward', at: 0.7, tint: 0xe2c8ff, mist: 0.55 }];
const lerpC = (a: number, b: number, k: number) => { const A = Phaser.Display.Color.IntegerToColor(a), B = Phaser.Display.Color.IntegerToColor(b); const c = Phaser.Display.Color.Interpolate.ColorWithColor(A, B, 100, Math.round(k * 100)); return Phaser.Display.Color.GetColor(c.r, c.g, c.b); };
function tex(S: Phaser.Scene, key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) { if (S.textures.exists(key)) return; const t = S.textures.createCanvas(key, w, h)!; draw(t.getContext()); t.refresh(); }
type Item = { o: any; x: number; y: number; f: number; v: number; vy?: number; ph: number; span: number; kind: string };
export class Life {
  items: Item[] = []; t = 0; dt = 0; zone = 0; zk = 0; tint = 0xffffff; graded: any[] = []; hooked = false; mist: Item[] = [];
  stats = { petals: 0, mist: 0, falls: 0, craft: 0, beacons: 0, ads: 0, haze: 0 };
  constructor(public S: Phaser.Scene, public lv: 1 | 2, public worldW: number, public prog: () => number, public onZone?: (z: Zone) => void) {
    (window as any).__life = this; if (location.search.includes("nolife")) return; if (lv === 1) this.l1(); else this.l2(); }
  add(o: any, x: number, y: number, f: number, v: number, kind: string, span = 560, ph = Math.random() * 6, vy = 0) { const it = { o, x, y, f, v, vy, ph, span, kind }; this.items.push(it); (this.stats as any)[kind]++; return it; }
  l1() { const S = this.S;
    tex(S, 'lf_mist', 256, 22, c => { for (let i = 0; i < 6; i++) { c.fillStyle = `rgba(236,226,250,${0.07 + i * 0.03})`; const h = 22 - i * 3.4; c.beginPath(); c.ellipse(128, 11, 128 - i * 16, h / 2, 0, 0, 7); c.fill(); } });
    tex(S, 'lf_fall', 10, 46, c => { for (let y = 0; y < 46; y++) for (let x = 0; x < 10; x++) { const e = Math.min(x, 9 - x); c.fillStyle = (y + x * 3) % 7 < 3 ? `rgba(240,248,255,${0.35 + e * 0.12})` : `rgba(170,200,245,${0.25 + e * 0.1})`; c.fillRect(x, y, 1, 1); } });
    // far waterfall shimmer on the far range (two cascades), scrolling texture down
    for (const [x, y] of [[150, 100], [410, 92]] as const) { const ts = S.add.tileSprite(0, 0, 6, 40, 'lf_fall').setOrigin(0.5, 0).setScrollFactor(0).setDepth(-94.5).setAlpha(0.8); this.add(ts, x, y, 0.04, 0, 'falls', 900); }
    // mist banks: lower lake mist and mid-valley mist, slow drift with the wind
    for (let i = 0; i < 5; i++) this.mist.push(this.add(S.add.image(0, 0, 'lf_mist').setOrigin(0.5).setScrollFactor(0).setDepth(i < 3 ? -91.5 : -87.5).setScale(i < 3 ? 1.2 : 1.6, 1).setAlpha(0.5), i * 190, i < 3 ? 172 + i * 4 : 198 + i * 3, i < 3 ? 0.1 : 0.2, i < 3 ? 4 : 7, 'mist', 900));
    // petals: far (tiny, slow), mid, near-front (big, fast, few)
    const P = (n: number, f: number, d: number, sc: number, a: number, v: number) => { for (let i = 0; i < n; i++) { const o = S.add.image(0, 0, i % 3 ? 'petal' : 'petal_soft').setScrollFactor(0).setDepth(d).setScale(sc).setAlpha(a); this.add(o, Math.random() * 560, Math.random() * 270, f, v, 'petals', 560, Math.random() * 6, 8 + v * 0.6); } };
    P(14, 0.12, -90.5, 0.35, 0.55, 10); P(12, 0.35, -85.5, 0.6, 0.8, 18); P(5, 1.25, 58, 1.0, 0.75, 34); }
  l2() { const S = this.S;
    tex(S, 'lf_haze', 64, 30, c => { for (let y = 0; y < 30; y++) { const a = Math.sin(y / 29 * Math.PI) * 0.22; c.fillStyle = `rgba(200,140,255,${a.toFixed(3)})`; c.fillRect(0, y, 64, 1); } });
    tex(S, 'lf_beacon', 3, 3, c => { c.fillStyle = '#ff4a6a'; c.fillRect(1, 0, 1, 3); c.fillRect(0, 1, 3, 1); c.fillStyle = '#ffd0d8'; c.fillRect(1, 1, 1, 1); });
    const cols = ['#ff3fc8', '#3ff3ff', '#ffd23f', '#9a6bff'];
    cols.forEach((col, i) => tex(S, 'lf_ad' + i, 14, 20, c => { c.fillStyle = 'rgba(20,10,40,0.85)'; c.fillRect(0, 0, 14, 20); c.fillStyle = col; c.fillRect(0, 0, 14, 1); c.fillRect(0, 19, 14, 1); c.fillRect(0, 0, 1, 20); c.fillRect(13, 0, 1, 20);
      c.globalAlpha = 0.85; for (let k = 0; k < 4; k++) c.fillRect(3 + (k % 2) * 2, 4 + k * 3, 6 - (k % 2) * 2, 2); c.globalAlpha = 0.35; c.fillRect(1, 1, 12, 18); }));
    // haze bands between skyline layers (atmospheric perspective)
    for (const [y, d, f, a] of [[96, -14.5, 0.1, 0.9], [150, -13.5, 0.2, 0.75], [186, -12.6, 0.34, 0.55]] as const) { const ts = S.add.tileSprite(0, y, 480, 30, 'lf_haze').setOrigin(0).setScrollFactor(0).setDepth(d).setAlpha(a); this.add(ts, 0, y, f, 3, 'haze', 0); }
    // blinking beacons on far towers
    for (let i = 0; i < 14; i++) this.add(S.add.image(0, 0, 'lf_beacon').setScrollFactor(0).setDepth(-14.8), i * 61 + Math.random() * 30, 18 + Math.random() * 60, 0.06, 0, 'beacons', 900);
    // holo-ad panels on mid towers (flicker + slow colour cycle, no text)
    for (let i = 0; i < 9; i++) this.add(S.add.image(0, 0, 'lf_ad' + (i % 4)).setScrollFactor(0).setDepth(-13.7).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8), i * 107 + Math.random() * 40, 92 + Math.random() * 40, 0.14, 0, 'ads', 960);
    // flying craft: a far lane (small, slow, dim) and a near lane (bigger, fast) crossing both ways
    const ck = ['l2_veh_02', 'l2_veh_03', 'l2_veh_06', 'l2_veh_09', 'l2_veh_10'];
    for (let i = 0; i < 5; i++) { const k = ck[i % ck.length]; if (!S.textures.exists(k)) continue; const dir = i % 2 ? 1 : -1;
      this.add(S.add.image(0, 0, k).setScrollFactor(0).setDepth(-14.6).setScale(0.22).setFlipX(dir < 0).setTint(0x8a78c8).setAlpha(0.85), Math.random() * 900, 40 + i * 9, 0.08, dir * (22 + i * 4), 'craft', 900); }
    for (let i = 0; i < 3; i++) { const k = ck[(i + 2) % ck.length]; if (!S.textures.exists(k)) continue; const dir = i % 2 ? -1 : 1;
      this.add(S.add.image(0, 0, k).setScrollFactor(0).setDepth(-11.4).setScale(0.5).setFlipX(dir < 0).setTint(0xe0d8ff), Math.random() * 1200, 120 + i * 16, 0.5, dir * (90 + i * 25), 'craft', 1200); } }
  /** layers to colour-grade by sub-zone */
  grade(objs: any[]) { this.graded.push(...objs); }
  update(dt: number) { this.t += dt; this.dt += dt; if (!this.hooked) { this.hooked = true; const cam = this.S.cameras.main; cam.on('prerender', this.sync, this); this.S.events.once('shutdown', () => cam.off('prerender', this.sync, this)); } }
  sync() { const dt = this.dt; this.dt = 0; const t = this.t, sx = this.S.cameras.main.scrollX;
    // sub-zone: blend tints over a 6% band around each boundary
    const Z = this.lv === 1 ? L1_ZONES : L2_ZONES, p = Phaser.Math.Clamp(this.prog(), 0, 1); let zi = 0; for (let i = 0; i < Z.length; i++) if (p >= Z[i].at) zi = i;
    if (zi !== this.zone) { this.zone = zi; this.onZone?.(Z[zi]); }
    const nz = Z[zi + 1], k = nz ? Phaser.Math.Clamp((p - (nz.at - 0.06)) / 0.06, 0, 1) : 0; this.zk = k;
    const tint = nz ? lerpC(Z[zi].tint, nz.tint, k) : Z[zi].tint, mistA = nz ? Z[zi].mist + (nz.mist - Z[zi].mist) * k : Z[zi].mist;
    if (tint !== this.tint) { this.tint = tint; for (const o of this.graded) o.setTint?.(tint); }
    for (const it of this.items) { const o = it.o;
      if (it.kind === 'haze') { o.tilePositionX = q(sx * it.f + t * it.v); continue; }
      if (it.kind === 'falls') { o.tilePositionY = q(-t * 26); }
      it.x += it.v * dt; const sp = it.span; let x = it.x - sx * it.f; x = ((x % sp) + sp) % sp - 40;
      let y = it.y;
      if (it.kind === 'petals') { it.y += it.vy! * dt; if (it.y > 280) it.y = -10; y = it.y + Math.sin(t * 1.6 + it.ph) * 6; x += Math.sin(t * 0.9 + it.ph) * 10; o.rotation = Math.sin(t * 2 + it.ph) * 1.2; }
      if (it.kind === 'mist') { o.setAlpha(mistA * (0.75 + 0.25 * Math.sin(t * 0.4 + it.ph))); y = it.y + Math.sin(t * 0.3 + it.ph) * 2; }
      if (it.kind === 'beacons') o.setAlpha(0.15 + 0.85 * Math.max(0, Math.sin(t * 2.2 + it.ph)) ** 3);
      if (it.kind === 'ads') { const fl = Math.sin(t * 17 + it.ph * 9) > 0.93 ? 0.25 : 0.72 + 0.12 * Math.sin(t * 1.3 + it.ph); o.setAlpha(fl); }
      if (it.kind === 'craft') y = it.y + Math.sin(t * 1.4 + it.ph) * 1.5;
      o.x = q(x); o.y = q(y); }
  }
}
