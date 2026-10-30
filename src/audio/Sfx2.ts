// Futuristic SFX synthesized at boot: FM sweeps, filtered noise, sub-bass drops. Each returns mono samples.
type Gen = (sr: number) => Float32Array;
const TAU = Math.PI * 2;
const env = (t: number, a: number, d: number, p = 2) => (t < a ? t / a : Math.pow(Math.max(0, 1 - (t - a) / d), p));
function mk(dur: number, sr: number, f: (t: number, k: number, i: number) => number) { const n = Math.floor(dur * sr), o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = f(i / sr, i / n, i); return o; }
// one-pole lowpass / state-variable bandpass helpers
function lp() { let y = 0; return (x: number, a: number) => (y += a * (x - y)); }
function svf() { let l = 0, b = 0; return (x: number, f: number, q: number) => { const h = x - l - q * b; b += f * h; l += f * b; return { l, b, h }; }; }
const rnd = () => Math.random() * 2 - 1;
const soft = (x: number) => Math.tanh(x);
export const GEN: Record<string, Gen> = {
  // three escalating blaster taps
  blaster1: sr => { let ph = 0, ph2 = 0; return mk(0.13, sr, (t, k) => { const f = 2400 * Math.pow(0.18, k); ph += f / sr; ph2 += (f * 2.01) / sr;
    return soft(Math.sin(TAU * ph + 1.4 * Math.sin(TAU * ph2)) * 1.2) * env(t, 0.002, 0.128, 2.2) * 0.32; }); },
  blaster2: sr => { let a = 0, b = 0, c = 0; return mk(0.17, sr, (t, k) => { const f = 1700 * Math.pow(0.15, k); a += f / sr; b += (f * 1.012) / sr; c += (f * 0.5) / sr;
    return soft((Math.sin(TAU * a + Math.sin(TAU * c) * 2) + Math.sin(TAU * b)) * 0.9) * env(t, 0.002, 0.168, 1.8) * 0.3; }); },
  blaster3: sr => { let a = 0, s = 0; const bp = svf(), l = lp(); return mk(0.32, sr, (t, k) => { const f = 1300 * Math.pow(0.1, Math.min(1, k * 1.4)); a += f / sr; s += (110 * Math.pow(0.4, k)) / sr;
    const crack = bp(rnd(), 0.35 * (1 - k) + 0.04, 0.4).b * env(t, 0.001, 0.07, 2);
    return soft(Math.sin(TAU * a + 3 * Math.sin(TAU * a * 1.5)) * 0.7 + Math.sin(TAU * s) * 0.9 * env(t, 0.004, 0.3, 1.5) + crack * 1.4 + l(rnd(), 0.05) * 0.4 * env(t, 0, 0.2)) * env(t, 0.002, 0.318, 1.4) * 0.34; }); },
  // airy whoosh + laser zip + sub thump
  dash: sr => { const bp = svf(); let a = 0, s = 0; return mk(0.34, sr, (t, k) => { const fc = 0.02 + 0.32 * Math.pow(1 - k, 2); const n = bp(rnd(), fc, 0.5).b;
    a += (3200 * Math.pow(0.12, k)) / sr; s += (90 - 40 * k) / sr;
    return soft(n * 1.6 * env(t, 0.03, 0.3, 1.3) + Math.sin(TAU * a) * 0.35 * env(t, 0.001, 0.12, 2) + Math.sin(TAU * s) * 0.6 * env(t, 0.005, 0.18, 2)) * 0.36; }); },
  // seamless loop: turbine hum + shimmering filtered hiss (length 1s, fades matched)
  jet: sr => { const bp = svf(), l = lp(); let a = 0, b = 0; const D = 1; const o = mk(D, sr, (t) => { a += 92 / sr; b += 1230 / sr;
    const n = bp(rnd(), 0.18 + 0.05 * Math.sin(TAU * t * 6), 0.7).b, rum = l(rnd(), 0.02);
    return soft(n * 0.9 + rum * 1.2 + Math.sin(TAU * a) * 0.25 + Math.sin(TAU * b) * 0.05 * (1 + Math.sin(TAU * t * 12))) * 0.22; });
    const X = Math.floor(0.08 * sr); for (let i = 0; i < X; i++) { const w = i / X; o[i] = o[i] * w + o[o.length - X + i] * (1 - w); } return o.slice(0, o.length - X); },
  // rising charge loop (rate is raised by caller): detuned chorus + tremolo
  charge: sr => { let a = 0, b = 0, c = 0; return mk(0.5, sr, t => { a += 220 / sr; b += 222 / sr; c += 660 / sr;
    return (Math.sin(TAU * a) + Math.sin(TAU * b) + 0.4 * Math.sin(TAU * c + Math.sin(TAU * a))) * (0.6 + 0.4 * Math.sin(TAU * t * 16)) * 0.08; }); },
  ping: sr => { let a = 0; return mk(0.35, sr, (t, k) => { a += (1760 + 880 * Math.floor(t / 0.05) % 3) / sr; return Math.sin(TAU * a + Math.sin(TAU * a * 3) * env(t, 0, 0.3)) * env(t, 0.002, 0.34, 2) * 0.3; }); },
  // charge beam release: thunder crack + sub drop + resonant sweep tail
  beam: sr => { const bp = svf(), l = lp(); let s = 0, a = 0; return mk(1.3, sr, (t, k) => { s += (140 * Math.pow(0.25, k)) / sr; a += (900 * Math.pow(0.2, k)) / sr;
    const sw = bp(rnd(), 0.03 + 0.25 * Math.pow(1 - k, 3), 0.15).b;
    return soft(Math.sin(TAU * s) * 1.3 * env(t, 0.01, 1.2, 1.2) + sw * 0.9 * env(t, 0.005, 1, 1.5) + l(rnd(), 0.2) * env(t, 0, 0.12, 2) * 1.2 + Math.sin(TAU * a + 2 * Math.sin(TAU * a * 0.5)) * 0.3 * env(t, 0.02, 0.9)) * 0.42; }); },
  // enemy: pulsing plasma bolt
  eshot: sr => { let a = 0, m = 0; return mk(0.2, sr, (t, k) => { a += (640 - 380 * k) / sr; m += 55 / sr;
    return soft(Math.sin(TAU * a + 2.5 * Math.sin(TAU * m * 4)) * 1.4) * env(t, 0.004, 0.19, 1.6) * 0.2; }); },
  eshot2: sr => { let a = 0; const bp = svf(); return mk(0.36, sr, (t, k) => { a += (300 * Math.pow(0.4, k)) / sr; const n = bp(rnd(), 0.08, 0.3).b;
    return soft(Math.sin(TAU * a + 3 * Math.sin(TAU * a * 0.51)) + n * 0.6) * env(t, 0.01, 0.35, 1.4) * 0.26; }); },
  elaser: sr => { let a = 0; return mk(0.6, sr, (t, k) => { a += (180 + 40 * Math.sin(TAU * t * 30)) / sr; return soft(Math.sin(TAU * a) * 2 + Math.sin(TAU * a * 3.01) * 0.6) * env(t, 0.05, 0.55, 1) * 0.18; }); },
  ehit: sr => { const bp = svf(); let a = 0; return mk(0.09, sr, (t, k) => { a += (1800 - 1200 * k) / sr; return soft(bp(rnd(), 0.3, 0.3).b * 1.2 + Math.sin(TAU * a) * 0.5) * env(t, 0.001, 0.089, 2) * 0.3; }); },
  explode: sr => { const l = lp(), l2 = lp(); let s = 0; return mk(0.8, sr, (t, k) => { s += (70 * Math.pow(0.4, k)) / sr; const c = 0.25 * Math.pow(1 - k, 2) + 0.01;
    return soft(l(rnd(), c) * 2.2 + l2(rnd(), 0.004) * 6 * env(t, 0, 0.6) + Math.sin(TAU * s) * env(t, 0.002, 0.5, 1.5)) * env(t, 0.002, 0.79, 1.3) * 0.42; }); },
  hurt: sr => { let a = 0; const bp = svf(); return mk(0.32, sr, (t, k) => { a += (520 * Math.pow(0.3, k)) / sr; return soft(Math.sin(TAU * a + 4 * Math.sin(TAU * t * 38)) + bp(rnd(), 0.1, 0.4).b * env(t, 0, 0.1)) * env(t, 0.002, 0.31, 1.5) * 0.34; }); },
  pickup: sr => { let a = 0; return mk(0.32, sr, t => { const step = [1, 1.25, 1.5, 2][Math.min(3, Math.floor(t / 0.06))]; a += (988 * step) / sr; return Math.sin(TAU * a + Math.sin(TAU * a * 2) * 0.8) * env(t, 0.002, 0.31, 1.4) * 0.28; }); },
  heal: sr => { let a = 0, b = 0; return mk(0.6, sr, (t, k) => { a += (440 + 440 * k) / sr; b += (660 + 660 * k) / sr; return (Math.sin(TAU * a) + Math.sin(TAU * b) * 0.6) * (0.7 + 0.3 * Math.sin(TAU * t * 20)) * env(t, 0.03, 0.57, 1.3) * 0.2; }); },
  power: sr => { let a = 0, s = 0; return mk(1.0, sr, (t, k) => { a += (300 * Math.pow(6, k)) / sr; s += 60 / sr; return soft(Math.sin(TAU * a + Math.sin(TAU * a * 1.5) * 2) * 0.6 + Math.sin(TAU * s) * 0.5 * env(t, 0.01, 0.6)) * env(t, 0.02, 0.98, 1) * 0.3; }); },
  // waterfall: rushing brown-ish noise loop, 2s with crossfade
  falls: sr => { const l = lp(), l2 = lp(); const o = mk(2.2, sr, t => soft(l(rnd(), 0.12) * 1.6 + l2(rnd(), 0.02) * 3 * (0.8 + 0.2 * Math.sin(TAU * t * 1.3))) * 0.4);
    const X = Math.floor(0.2 * sr); for (let i = 0; i < X; i++) { const w = i / X; o[i] = o[i] * w + o[o.length - X + i] * (1 - w); } return o.slice(0, o.length - X); },
  bossw: sr => { let a = 0; return mk(0.7, sr, (t, k) => { a += (80 + 500 * k * k) / sr; return soft(Math.sin(TAU * a) * 2 + Math.sin(TAU * a * 1.5) * 0.5) * (0.5 + 0.5 * Math.sin(TAU * t * (8 + 30 * k))) * env(t, 0.3, 0.4, 1) * 0.18; }); },
};
export const LOOPS = new Set(['jet', 'charge', 'falls']);
