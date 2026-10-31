import Phaser from 'phaser';
import { audio } from '../audio/Audio';
// Neo-Kyo dressing pass 2 — every image here is a tiles/env/props/fx crop cut from ref/neokyo_sheet.png.
// far-street parallax silhouettes, holo billboards (shoot = glitch), lantern strings (shoot = spin), vending kiosks (shoot/dash = gem burst),
// arcade cabinets + holo tubes (proximity glow/bubbles), floor light strips (step = ripple), data terminals (stand = sync ring + gems),
// hanging sakura branches under platforms, steam vents that puff when walked over.
const A = 'assets/l2/', pad = (i: number) => String(i).padStart(2, '0');
const FAR = [9, 18, 20, 29, 1, 4, 11, 19, 22, 6, 14, 37, 27, 17, 2, 24, 26, 36, 44, 45, 46, 34, 30, 32, 12];
const ADS = [15, 21, 25, 35, 39, 41, 10, 38, 40, 51, 53, 52];
const ADC = [0xff4fd8, 0x3ff3ff, 0xffd23f, 0x8f7bff];
export function preloadDress(s: Phaser.Scene) { for (let i = 0; i < 54; i++) s.load.image('l2t_' + pad(i), `${A}tiles/tiles_${pad(i)}.png`); }
export class Dress {
  far: { o: Phaser.GameObjects.Image; x0: number }[] = []; ads: any[] = []; lan: any[] = []; vend: any[] = []; cab: any[] = []; tubes: any[] = []; strips: any[] = []; terms: any[] = []; vents: any[] = []; bubbles: any[] = []; wires!: Phaser.GameObjects.Graphics;
  dbg = { far: 0, ads: 0, glitch: 0, lanterns: 0, spins: 0, vend: 0, vended: 0, cab: 0, tubes: 0, strips: 0, steps: 0, terms: 0, synced: 0, vents: 0, puffs: 0, branches: 0 };
  constructor(public s: any, public GY: number, public X1: number, plats: [string, number, number][]) {
    const sc = s as Phaser.Scene; let seed = 97; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const solidAt = (x: number) => s.groundAt(x, GY - 2) === GY; const clear = (x: number, r: number) => solidAt(x - r) && solidAt(x) && solidAt(x + r);
    const glow = (x: number, y: number, c: number, sc_: number, a: number, d: number) => sc.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(c).setScale(sc_).setAlpha(a).setDepth(d);
    // 1) far-street silhouettes: a dim mid-parallax row of sheet tiles (scroll 0.82) between the city bg and the play layer
    for (let x = -40, i = 0; x < X1 * 0.82 + 600; x += 46 + Math.floor(rnd() * 70), i++) { const id = FAR[Math.floor(rnd() * FAR.length)];
      const o = sc.add.image(x, GY - 6 - Math.floor(rnd() * 26), 'l2t_' + pad(id)).setOrigin(0.5, 1).setDepth(0.4 + rnd() * 0.2).setTint(0x4a4488).setAlpha(0.72).setScrollFactor(0.82, 1).setScale(0.7 + rnd() * 0.25).setFlipX(rnd() < 0.4);
      this.far.push({ o, x0: x }); this.dbg.far++; }
    // 2) holo billboards hovering over the street, bobbing; shots glitch them
    for (let x = 180, i = 0; x < X1 - 80; x += 260 + Math.floor(rnd() * 160), i++) { const id = ADS[i % ADS.length], c = ADC[i % ADC.length], y = GY - 122 - Math.floor(rnd() * 34);
      const im = sc.add.image(x, y, 'l2t_' + pad(id)).setDepth(1.2).setScale(0.75).setAlpha(0.92); const gl = glow(x, y, c, Math.max(im.displayWidth, im.displayHeight) / 55, 0.3, 1.15);
      this.ads.push({ im, gl, x, y, t: rnd() * 9, g: 0, c }); this.dbg.ads++; }
    // 3) lantern strings: cable between two posts, 3-5 sheet lanterns (env_05 / env_17 / env_14 / env_22) hanging + swaying
    this.wires = sc.add.graphics().setDepth(1.47);
    for (let x = 330; x < X1 - 200; x += 520 + Math.floor(rnd() * 200)) { const w = 140 + Math.floor(rnd() * 60), y = GY - 108; const n = 3 + Math.floor(rnd() * 3), L: any[] = [];
      for (let i = 0; i < n; i++) { const f = (i + 1) / (n + 1), lx = x + w * f, ly = y + Math.sin(f * Math.PI) * 18; const id = [5, 17, 14, 22][Math.floor(rnd() * 4)];
        const im = sc.add.image(lx, ly, 'l2e_' + pad(id)).setOrigin(0.5, 0).setDepth(1.48).setScale(id === 5 || id === 17 ? 0.6 : 0.8); const gl = glow(lx, ly + im.displayHeight * 0.6, [0xffd23f, 0xff4fd8, 0x3ff3ff][i % 3], 0.35, 0.4, 1.47);
        L.push({ im, gl, x: lx, y: ly, t: rnd() * 6, spin: 0 }); this.dbg.lanterns++; }
      this.lan.push({ x0: x, x1: x + w, y, L }); }
    // 4) vending kiosks / arcade cabinets / holo tubes / terminals on the street
    const put = (x0: number, step: number, fn: (x: number) => void) => { for (let x = x0; x < X1 - 120; x += step + Math.floor(rnd() * step * 0.6)) { let px = x; while (px < x + 160 && !clear(px, 22)) px += 8; if (clear(px, 22)) fn(px); } };
    put(260, 620, x => { const id = [1, 7, 9][this.vend.length % 3]; const im = sc.add.image(x, GY + 1, 'l2pr_' + pad(id)).setOrigin(0.5, 1).setDepth(1.62);
      const gl = glow(x, GY - im.height * 0.55, 0x3ff3ff, im.height / 50, 0.35, 1.61); this.vend.push({ im, gl, x, hp: 2, used: false, t: 0 }); this.dbg.vend++; });
    put(470, 700, x => { const im = sc.add.image(x, GY + 1, 'l2pr_10').setOrigin(0.5, 1).setDepth(1.62); const gl = glow(x, GY - 44, 0xff4fd8, 0.7, 0.2, 1.63); this.cab.push({ im, gl, x, t: 0, on: 0 }); this.dbg.cab++; });
    put(640, 560, x => { const id = rnd() < 0.5 ? 20 : 21; const im = sc.add.image(x, GY + 1, 'l2pr_' + id).setOrigin(0.5, 1).setDepth(1.62).setScale(0.8); const gl = glow(x, GY - 30, id === 20 ? 0x8f7bff : 0xb07bff, 0.8, 0.3, 1.61); this.tubes.push({ im, gl, x, t: rnd() * 6, cd: 0 }); this.dbg.tubes++; });
    put(900, 900, x => { const id = 37 + (this.terms.length % 3); const im = sc.add.image(x, GY + 1, 'l2pr_' + id).setOrigin(0.5, 1).setDepth(1.62).setScale(0.8);
      const ring = sc.add.image(x, GY - im.displayHeight * 0.55, 'l2f_22').setBlendMode(Phaser.BlendModes.ADD).setDepth(1.64).setScale(0.35).setAlpha(0.25); this.terms.push({ im, ring, x, prog: 0, done: false }); this.dbg.terms++; });
    // 5) floor light strips (env_21/35/36) and steam vents (env_25 grate + fx_13 puff)
    put(200, 330, x => { const id = [21, 35, 36][this.strips.length % 3]; const im = sc.add.image(x, GY + 2, 'l2e_' + pad(id)).setOrigin(0.5, 1).setDepth(2.2); const gl = glow(x, GY - 2, ADC[this.strips.length % 4], 0.5, 0.15, 2.15).setScale(0.8, 0.3);
      this.strips.push({ im, gl, x, w: im.width / 2 + 4, on: 0 }); this.dbg.strips++; });
    put(560, 760, x => { const im = sc.add.image(x, GY + 2, 'l2e_25').setOrigin(0.5, 1).setDepth(2.2).setScale(0.8); this.vents.push({ im, x, cd: 0, t: rnd() * 3 }); this.dbg.vents++; });
    // 6) sakura branches (env_09) hanging under floating platforms, shedding petals
    for (const [k, x, y] of plats) { if (!y || x > X1 || rnd() < 0.35) continue; const tex = sc.textures.get('l2r_' + k).getSourceImage() as any; const bx = x + 10 + rnd() * Math.max(0, tex.width - 40);
      const b = sc.add.image(bx, y + 14, 'l2e_09').setOrigin(0.5, 0).setDepth(2.05).setScale(0.7).setFlipX(rnd() < 0.5); sc.tweens.add({ targets: b, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 1600 + rnd() * 800, ease: 'Sine.inOut' });
      this.dbg.branches++; s.env?.trees?.push({ im: b, x: bx, cd: 0 }); }
  }
  pop(id: string, x: number, y: number, c: number, s0: number, s1: number, ms: number, d = 12) { const sc = this.s as Phaser.Scene; const o = sc.add.image(x, y, 'l2f_' + id).setBlendMode(Phaser.BlendModes.ADD).setTint(c).setScale(s0).setDepth(d);
    sc.tweens.add({ targets: o, scale: s1, alpha: 0, angle: 60, duration: ms, onComplete: () => o.destroy() }); }
  gemBurst(x: number, y: number, n: number) { const env = this.s.env; if (!env) return; const sc = this.s as Phaser.Scene; const ids = [27, 28, 29, 31, 32, 33], C = [0xff4f6f, 0xff6fd8, 0x4fbfff, 0xffa03f, 0x5fff7f, 0x3f8fff];
    for (let i = 0; i < n; i++) { const j = i % ids.length, gx = x + (i - (n - 1) / 2) * 16, gy = y - 30 - Math.abs(i - (n - 1) / 2) * -4;
      const gl = sc.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(C[j]).setScale(0.32).setAlpha(0.45).setDepth(7.9); const im = sc.add.image(x, y, 'l2e_' + ids[j]).setDepth(8).setScale(0.62);
      const g = { im, gl, y0: gy, t: i * 0.4, c: C[j] }; sc.tweens.add({ targets: [im, gl], x: gx, y: gy, duration: 380, ease: 'Back.easeOut', onComplete: () => env.gems.push(g) }); env.dbg.gems++; } }
  hitShot(x: number, y: number) {
    for (const v of this.vend) if (!v.used && Math.abs(x - v.x) < v.im.width / 2 + 2 && y > GYc(this) - v.im.height && y < GYc(this)) { this.hitVend(v); return true; }
    for (const a of this.ads) if (Math.abs(x - a.x) < a.im.displayWidth / 2 && Math.abs(y - a.im.y) < a.im.displayHeight / 2) { if (a.g <= 0) { a.g = 0.5; this.dbg.glitch++; audio.sfx('hit', { rate: 1.8, vol: 0.25 }); this.pop('06', x, y, a.c, 0.3, 0.9, 260); } return true; }
    for (const l of this.lan) for (const q of l.L) if (Math.abs(x - q.x) < 8 && y > q.y && y < q.y + q.im.displayHeight + 4) { q.spin = 1; this.dbg.spins++; audio.sfx('flower', { rate: 2.2, vol: 0.25 }); this.s.fx?.spark(q.x, q.y + 10); return true; }
    return false; }
  hitVend(v: any) { v.hp--; v.im.setTintFill(0xffffff); this.s.time.delayedCall(60, () => v.im.active && v.im.clearTint()); if (v.hp > 0) return; v.used = true; this.dbg.vended++;
    audio.sfx('power', { rate: 1.3, vol: 0.5 }); this.pop('16', v.x, this.GY - v.im.height * 0.5, 0x3ff3ff, 0.3, 1.1, 320); this.gemBurst(v.x, this.GY - v.im.height * 0.6, 5);
    this.s.tweens.add({ targets: v.im, x: { from: v.x - 2, to: v.x + 2 }, duration: 40, yoyo: true, repeat: 4, onComplete: () => { v.im.x = v.x; v.im.setTint(0x8080a0); } }); v.gl.setTint(0x664466); }
  update(dt: number) {
    const s = this.s, p = s.player, b = p.body as Phaser.Physics.Arcade.Body, cam = s.cameras.main.worldView, onG = b.blocked.down, t = s.time.now / 1000; const vis = (x: number) => x > cam.x - 120 && x < cam.right + 120;
    for (const a of this.ads) { a.t += dt; if (!vis(a.x)) continue; a.g = Math.max(0, a.g - dt); a.im.y = a.y + Math.sin(a.t * 1.3) * 3; a.gl.y = a.im.y;
      if (a.g > 0) { a.im.x = a.x + (Math.random() - 0.5) * 8; a.im.setTint(Math.random() < 0.5 ? 0x3ff3ff : 0xff4fd8).setAlpha(0.5 + Math.random() * 0.5); a.im.scaleX = 0.75 * (1 + (Math.random() - 0.5) * 0.2); }
      else { a.im.x = a.x; a.im.clearTint(); a.im.scaleX = 0.75; const ph = a.t % 5.1; a.im.setAlpha(ph > 4.6 && ph < 4.7 ? 0.35 : 0.92); }
      a.gl.setAlpha(0.22 + 0.08 * Math.sin(a.t * 4) + (a.g > 0 ? 0.3 : 0)); }
    this.wires.clear(); this.wires.lineStyle(1, 0x1a1238, 1);
    for (const l of this.lan) { if (!vis(l.x0) && !vis(l.x1)) continue; this.wires.beginPath(); this.wires.moveTo(l.x0, l.y);
      for (const q of l.L) { q.t += dt; q.spin = Math.max(0, q.spin - dt * 0.7); const near = Math.abs(p.x - q.x) < 20 && p.y - 30 < q.y + 30 && Math.abs(b.velocity.x) > 150 ? 1 : 0; if (near && q.spin < 0.3) q.spin = 0.5;
        q.im.angle = Math.sin(q.t * 1.6) * 5 + Math.sin(q.t * 11) * 40 * q.spin; q.im.scaleX = (q.im.scaleY) * Math.cos(q.spin * q.t * 14); q.gl.setAlpha(0.35 + 0.1 * Math.sin(q.t * 5) + q.spin * 0.5).setPosition(q.x + Math.sin(q.im.angle * Math.PI / 180) * -8, q.y + q.im.displayHeight * 0.6); this.wires.lineTo(q.x, q.y); }
      this.wires.lineTo(l.x1, l.y); this.wires.strokePath(); }
    if (p.dashing) for (const v of this.vend) if (!v.used && Math.abs(p.x - v.x) < v.im.width / 2 + 6) { v.hp = 1; this.hitVend(v); }
    for (const v of this.vend) { v.t += dt; if (!v.used) v.gl.setAlpha(0.3 + 0.1 * Math.sin(v.t * 3) + (Math.random() < 0.01 ? 0.3 : 0)); }
    for (const c of this.cab) { c.t += dt; const near = Math.abs(p.x - c.x) < 40 ? 1 : 0; if (near && !c.on) audio.sfx('menu', { rate: 1.6, vol: 0.2 }); c.on = near;
      c.gl.setTint([0xff4fd8, 0x3ff3ff, 0xffd23f, 0x6bff8f][Math.floor(c.t * (near ? 8 : 1.5)) % 4]).setAlpha((near ? 0.55 : 0.18) + 0.06 * Math.sin(c.t * 9)); }
    for (const u of this.tubes) { u.t += dt; u.cd -= dt; if (!vis(u.x)) continue; const near = Math.max(0, 1 - Math.abs(p.x - u.x) / 60); u.gl.setAlpha(0.25 + 0.1 * Math.sin(u.t * 2) + near * 0.4); u.im.scaleX = 0.8 + near * 0.04 * Math.sin(u.t * 20);
      if (u.cd <= 0) { u.cd = 0.25 - near * 0.18; const r = (s as Phaser.Scene).add.rectangle(u.x + (Math.random() - 0.5) * 10, this.GY - 6, 2, 2, 0xe0c8ff, 0.9).setDepth(1.63).setBlendMode(Phaser.BlendModes.ADD);
        this.bubbles.push({ o: r, vy: -20 - Math.random() * 20 - near * 30, t: 0, top: this.GY - u.im.displayHeight + 6, x0: r.x }); } }
    for (let i = this.bubbles.length - 1; i >= 0; i--) { const q = this.bubbles[i]; q.t += dt; q.o.y += q.vy * dt; q.o.x = q.x0 + Math.sin(q.t * 7) * 1.5; if (q.o.y < q.top) { q.o.destroy(); this.bubbles.splice(i, 1); } }
    for (const st of this.strips) { const on = onG && Math.abs(p.x - st.x) < st.w; if (on && st.on < 0.5) { this.dbg.steps++; this.pop('15', st.x, this.GY - 2, st.gl.tintTopLeft, 0.2, 0.8, 300, 2.3); audio.sfx('flower', { rate: 2.6, vol: 0.15 }); }
      st.on = on ? 1 : Math.max(0, st.on - dt * 2); st.gl.setAlpha(0.15 + st.on * 0.5); st.im.setTint(st.on > 0.5 ? 0xffffff : 0xc0c0e0); }
    for (const tm of this.terms) { if (tm.done) { tm.ring.angle += 40 * dt; continue; } const near = onG && Math.abs(p.x - tm.x) < 20; tm.prog = near ? tm.prog + dt : Math.max(0, tm.prog - dt * 2);
      tm.ring.setAlpha(0.25 + tm.prog * 0.6).setScale(0.35 + tm.prog * 0.25); tm.ring.angle += (40 + tm.prog * 400) * dt;
      if (tm.prog > 0.9) { tm.done = true; this.dbg.synced++; audio.sfx('checkpoint', { rate: 1.4, vol: 0.5 }); this.pop('19', tm.x, tm.ring.y, 0x3ff3ff, 0.4, 1.6, 420); this.gemBurst(tm.x, tm.ring.y, 3); s.toast?.show('DATA SYNC — shards released', '#3ff3ff'); tm.ring.setAlpha(0.5); } }
    for (const v of this.vents) { v.cd -= dt; v.t += dt; if (!vis(v.x)) continue; const step = onG && Math.abs(p.x - v.x) < 12;
      if ((step && v.cd <= 0) || (v.t % 3.2 < dt)) { v.cd = 0.6; if (step) this.dbg.puffs++; const o = (s as Phaser.Scene).add.image(v.x, this.GY - 6, 'l2f_13').setDepth(2.3).setAlpha(step ? 0.7 : 0.35).setScale(0.4);
        (s as Phaser.Scene).tweens.add({ targets: o, y: this.GY - 40 - (step ? 20 : 0), scale: step ? 1.3 : 0.9, alpha: 0, duration: 900, onComplete: () => o.destroy() }); } }
  }
}
const GYc = (d: Dress) => d.GY;
