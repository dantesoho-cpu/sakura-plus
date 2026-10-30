import { PLAYLIST, DEFAULTS } from './config';
import { GEN } from './Sfx2';
// Global audio: one continuous album playlist (survives every scene change) + synthesized 8-bit SFX with pitch variance and voice limits.
type Wave = 'sq' | 'saw' | 'tri' | 'noise';
interface P { w: Wave; f0: number; f1?: number; dur: number; att?: number; duty?: number; arp?: number[]; arpT?: number; vib?: [number, number]; vol?: number; crush?: number; loop?: boolean }
const DEF: Record<string, P> = {
  jump: { w: 'sq', f0: 280, f1: 620, dur: 0.12, duty: 0.5, vol: 0.35 },
  djump: { w: 'sq', f0: 420, f1: 900, dur: 0.14, duty: 0.25, arp: [1, 1.5], arpT: 0.04, vol: 0.32 },
  dash: { w: 'noise', f0: 9000, f1: 900, dur: 0.18, vol: 0.4 },
  jet: { w: 'noise', f0: 2400, dur: 0.5, vol: 0.22, loop: true },
  blaster: { w: 'sq', f0: 1100, f1: 240, dur: 0.09, duty: 0.25, vol: 0.28 },
  charge: { w: 'sq', f0: 180, dur: 0.4, duty: 0.125, vib: [14, 8], vol: 0.18, loop: true },
  ping: { w: 'tri', f0: 1320, dur: 0.16, arp: [1, 1.5, 2], arpT: 0.04, vol: 0.4 },
  beam: { w: 'saw', f0: 160, f1: 70, dur: 0.6, vib: [18, 10], vol: 0.32, crush: 6 },
  ehit: { w: 'noise', f0: 6000, f1: 2000, dur: 0.07, vol: 0.35 },
  explode: { w: 'noise', f0: 3000, f1: 120, dur: 0.55, vol: 0.5 },
  hurt: { w: 'sq', f0: 440, f1: 110, dur: 0.26, duty: 0.5, vib: [30, 20], vol: 0.4 },
  flower: { w: 'sq', f0: 784, dur: 0.36, duty: 0.25, arp: [1, 1.26, 1.5, 2], arpT: 0.07, vol: 0.3 },
  checkpoint: { w: 'tri', f0: 523, dur: 0.5, arp: [1, 1.26, 1.5, 2, 2.52], arpT: 0.08, vol: 0.45 },
  gate: { w: 'sq', f0: 262, dur: 0.9, duty: 0.5, arp: [1, 1.5, 2, 2.5, 3, 4], arpT: 0.12, vol: 0.3 },
  respawn: { w: 'tri', f0: 900, f1: 300, dur: 0.3, arp: [1, 2], arpT: 0.05, vol: 0.45 },
  menu: { w: 'sq', f0: 880, dur: 0.05, duty: 0.5, vol: 0.25 },
};
const LIMIT: Record<string, number> = { blaster1: 3, blaster2: 3, blaster3: 2, eshot: 3, eshot2: 2, elaser: 2, blaster: 4, ehit: 3, explode: 3 };
class AudioMgr {
  ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); master = this.ctx.createGain(); mus = this.ctx.createGain(); fx = this.ctx.createGain(); trim = this.ctx.createGain();
  set = { ...DEFAULTS }; log: string[] = []; unlocked = false; buf: Record<string, AudioBuffer> = {}; voices: Record<string, number> = {}; active = 0;
  track = -1; src: AudioBufferSourceNode | null = null; startedAt = 0; offset = 0; cache = new Map<number, Promise<AudioBuffer>>(); started = false;
  onTrack: ((t: string) => void) | null = null; ext = new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'mp3';
  constructor() {
    this.mus.connect(this.master); const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.12; this.trim.gain.value = 0.62; this.fx.connect(this.trim).connect(comp).connect(this.master); this.master.connect(this.ctx.destination);
    try { Object.assign(this.set, JSON.parse(localStorage.getItem('sakura.audio') || '{}')); } catch { /* defaults */ }
    this.apply(); for (const k in DEF) this.buf[k] = this.synth(DEF[k]);
    const sr = this.ctx.sampleRate; for (const k in GEN) { const d = GEN[k](sr), b = this.ctx.createBuffer(1, d.length, sr); b.getChannelData(0).set(d); this.buf[k] = b; }
    const unlock = () => { this.ctx.resume().then(() => { if (!this.unlocked) { this.unlocked = true; this.log.push('unlock:' + this.ctx.state); this.start(); } }); };
    for (const e of ['pointerdown', 'touchstart', 'touchend', 'keydown', 'mousedown']) window.addEventListener(e, unlock, { capture: true });
  }
  apply() { const t = this.ctx.currentTime, m = this.set.mute ? 0 : 1; this.mus.gain.setTargetAtTime(this.set.music * m, t, 0.05); this.fx.gain.setTargetAtTime(this.set.sfx * m, t, 0.02);
    try { localStorage.setItem('sakura.audio', JSON.stringify(this.set)); } catch { /* private mode */ } }
  load(i: number) { i = (i + PLAYLIST.length) % PLAYLIST.length; let p = this.cache.get(i);
    if (!p) { p = fetch(`assets/music/${PLAYLIST[i].file}.${this.ext}`).then(r => r.arrayBuffer()).then(a => this.ctx.decodeAudioData(a)); this.cache.set(i, p); p.catch(() => this.cache.delete(i)); }
    return p; }
  start() { if (this.started) return; this.started = true; this.play(0); }
  async play(i: number, at = 0) {
    i = i % PLAYLIST.length; const b = await this.load(i); if (this.src) { this.src.onended = null; try { this.src.stop(); } catch { /* */ } }
    const s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.mus); s.onended = () => this.play(i + 1); s.start(0, at);
    this.src = s; this.track = i; this.startedAt = this.ctx.currentTime - at; this.log.push('track:' + PLAYLIST[i].file);
    if (at === 0) this.onTrack?.(PLAYLIST[i].title);
    for (const [k] of this.cache) if (k !== i && k !== (i + 1) % PLAYLIST.length) this.cache.delete(k); // keep memory to current + next
    this.load(i + 1); // preload the next track while this one plays
  }
  get pos() { return this.ctx.currentTime - this.startedAt; }
  seek(sec: number) { if (this.track >= 0) this.play(this.track, sec); }
  get duration() { return this.src?.buffer?.duration ?? 0; }
  synth(p: P) {
    const sr = this.ctx.sampleRate, n = Math.floor(sr * p.dur), b = this.ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    let ph = 0, hold = 0, hc = 0; const crush = p.crush ?? 4, att = p.att ?? 0.005;
    for (let i = 0; i < n; i++) {
      const t = i / sr, k = t / p.dur; let f = p.f0 + ((p.f1 ?? p.f0) - p.f0) * k;
      if (p.arp) f *= p.arp[Math.min(p.arp.length - 1, Math.floor(t / (p.arpT || 0.05)))];
      if (p.vib) f *= 1 + Math.sin(t * Math.PI * 2 * p.vib[1]) * p.vib[0] / 400;
      ph = (ph + f / sr) % 1; let v: number;
      if (p.w === 'sq') v = ph < (p.duty ?? 0.5) ? 1 : -1; else if (p.w === 'saw') v = ph * 2 - 1; else if (p.w === 'tri') v = 1 - 4 * Math.abs(ph - 0.5);
      else { hc += f / sr; if (hc >= 1) { hc %= 1; hold = Math.random() * 2 - 1; } v = hold; }
      v = Math.round(v * crush) / crush; // NES-ish amplitude steps
      const env = p.loop ? Math.min(1, t / 0.01, (p.dur - t) / 0.01 + 1) : Math.min(1, t / att) * Math.pow(1 - k, 1.6);
      d[i] = v * env * (p.vol ?? 0.3);
    }
    return b;
  }
  sfx(name: string, o: { rate?: number; vary?: number; vol?: number } = {}) {
    const b = this.buf[name]; if (!b || this.ctx.state !== 'running') return; const lim = LIMIT[name] ?? 2;
    if ((this.voices[name] || 0) >= lim || this.active >= 14) return;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = b; const v = o.vary ?? 0.06;
    s.playbackRate.value = (o.rate ?? 1) * (1 + (Math.random() * 2 - 1) * v); g.gain.value = o.vol ?? 1; s.connect(g).connect(this.fx);
    this.voices[name] = (this.voices[name] || 0) + 1; this.active++; s.onended = () => { this.voices[name]--; this.active--; }; s.start(); this.log.push('sfx:' + name);
  }
  loops: Record<string, AudioBufferSourceNode> = {}; loopG: Record<string, GainNode> = {};
  loop(name: string, on: boolean, rate = 1, vol = 1) {
    const cur = this.loops[name], t = this.ctx.currentTime;
    if (!on) { if (cur) { const g = this.loopG[name]; g.gain.setTargetAtTime(0, t, 0.03); try { cur.stop(t + 0.15); } catch { /* */ } delete this.loops[name]; } return; }
    if (cur) { cur.playbackRate.setTargetAtTime(rate, t, 0.03); this.loopG[name].gain.setTargetAtTime(vol, t, 0.08); return; }
    if (this.ctx.state !== 'running') return; const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(vol, t, 0.03);
    s.buffer = this.buf[name]; s.loop = true; s.playbackRate.value = rate; s.connect(g).connect(this.fx); s.start(); this.loops[name] = s; this.loopG[name] = g; this.log.push('loop:' + name);
  }
  stopLoops() { for (const k in this.loops) this.loop(k, false); }
}
function nowPlaying(t: string) {
  let el = document.getElementById('np'); if (!el) { el = document.createElement('div'); el.id = 'np';
    el.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:30;pointer-events:none;font:bold 12px monospace;color:#ffd23f;text-shadow:-1px -1px 0 #1a0f2e,1px -1px 0 #1a0f2e,-1px 1px 0 #1a0f2e,1px 1px 0 #1a0f2e,0 0 6px #1a0f2e;transition:opacity .6s;opacity:0';
    document.body.appendChild(el); }
  el.textContent = '\u266A Now playing: ' + t; el.style.opacity = '1'; clearTimeout((el as any)._t); (el as any)._t = setTimeout(() => { el!.style.opacity = '0'; }, 3500); }
export const audio = new AudioMgr(); audio.onTrack = nowPlaying; (window as any).__audio = audio;
