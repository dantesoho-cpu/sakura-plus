// DOM touch overlay: shared state read by Player. Shown only on touch devices.
export const touch = { left: false, right: false, jump: false, dash: false, shoot: false, jumpP: false, dashP: false, shootP: false, respawnP: false };
export const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
type K = 'left' | 'right' | 'jump' | 'dash' | 'shoot';
export function setupTouch() {
  const css = document.createElement('style');
  css.textContent = `
  #tc{position:fixed;inset:0;pointer-events:none;z-index:10;display:none;touch-action:none;user-select:none;-webkit-user-select:none}
  #tc.on{display:block}
  .tb{position:absolute;pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center;
   font:bold 13px monospace;color:rgba(255,230,244,.55);letter-spacing:1px;text-shadow:0 2px 0 #1a0f2e;
   background:rgba(58,26,90,.18);border:3px solid rgba(255,143,208,.3);opacity:.85;box-shadow:inset 0 -5px 0 rgba(26,15,46,.55),0 0 0 2px rgba(26,15,46,.6);
   image-rendering:pixelated;-webkit-tap-highlight-color:transparent}
  .tb.dn{opacity:1;background:rgba(255,95,176,.55);border-color:rgba(255,200,235,.9);box-shadow:inset 0 3px 0 rgba(26,15,46,.55),0 0 0 2px rgba(26,15,46,.6);color:#fff}
  .dp{width:72px;height:72px;bottom:22px;border-radius:10px;font-size:26px}
  .ab{width:74px;height:74px;border-radius:50%}
  #rot{position:fixed;inset:0;z-index:20;display:none;align-items:center;justify-content:center;flex-direction:column;gap:12px;
   background:#1a1030;color:#ffd23f;font:bold 16px monospace;text-align:center}
  @media (orientation:portrait){#rot.on{display:flex}}`;
  document.head.appendChild(css);
  const tc = document.createElement('div'); tc.id = 'tc'; document.body.appendChild(tc);
  const mk = (k: K, label: string, cls: string, st: string) => {
    const b = document.createElement('div'); b.className = 'tb ' + cls; b.textContent = label; b.setAttribute('style', st); b.dataset.k = k; tc.appendChild(b);
    const ids = new Set<number>();
    const dn = (e: PointerEvent) => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); if (!ids.size) { (touch as any)[k + 'P'] = true; } ids.add(e.pointerId); touch[k] = true; b.classList.add('dn'); };
    const up = (e: PointerEvent) => { e.preventDefault(); ids.delete(e.pointerId); if (!ids.size) { touch[k] = false; b.classList.remove('dn'); } };
    b.addEventListener('pointerdown', dn);
    // safety: a finger released anywhere (capture lost, slid off, OS gesture) must release the button
    const anyUp = (e: PointerEvent) => { if (ids.has(e.pointerId)) up(e); };
    ['pointerup', 'pointercancel'].forEach(t => document.addEventListener(t, anyUp as any, true)); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => b.addEventListener(t, up as any));
  };
  const sb = 'env(safe-area-inset-bottom,0px)';
  mk('left', '◀', 'dp', `left:calc(18px + env(safe-area-inset-left,0px));bottom:calc(22px + ${sb})`);
  mk('right', '▶', 'dp', `left:calc(100px + env(safe-area-inset-left,0px));bottom:calc(22px + ${sb})`);
  const r = 'env(safe-area-inset-right,0px)';
  mk('shoot', 'SHOOT', 'ab', `right:calc(176px + ${r});bottom:calc(18px + ${sb})`);
  mk('dash', 'DASH', 'ab', `right:calc(96px + ${r});bottom:calc(66px + ${sb})`);
  mk('jump', 'JUMP', 'ab', `right:calc(16px + ${r});bottom:calc(18px + ${sb})`);
  // respawn-at-checkpoint button: small, very transparent, same style family as the pads; shown only in-level (all devices)
  const rs = document.createElement('div'); rs.id = 'rsp'; rs.className = 'tb'; rs.textContent = '⟲'; rs.title = 'Respawn at last checkpoint (R)';
  rs.setAttribute('style', 'width:34px;height:34px;border-radius:8px;font-size:18px;top:calc(8px + env(safe-area-inset-top,0px));right:calc(8px + env(safe-area-inset-right,0px));opacity:.35;display:none;position:fixed;z-index:11;cursor:pointer');
  rs.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); touch.respawnP = true; rs.classList.add('dn'); setTimeout(() => rs.classList.remove('dn'), 150); });
  document.body.appendChild(rs);
  const rot = document.createElement('div'); rot.id = 'rot'; rot.innerHTML = '<div style="font-size:42px">⟳</div>ROTATE YOUR PHONE<br><span style="color:#ffe6f4;font-size:12px">SAKURA+ plays in landscape</span>'; document.body.appendChild(rot);
  const show = () => { const on = isTouch(); tc.classList.toggle('on', on); rot.classList.toggle('on', on); };
  show(); addEventListener('resize', show);
  // no scroll / pinch / double-tap zoom
  const stop = (e: Event) => e.preventDefault();
  document.addEventListener('touchmove', stop, { passive: false }); document.addEventListener('gesturestart', stop);
  let last = 0; document.addEventListener('touchend', e => { const n = Date.now(); if (n - last < 300) e.preventDefault(); last = n; }, { passive: false });
  try { (screen.orientation as any)?.lock?.('landscape').catch(() => {}); } catch {}
}

export const showRespawnBtn = (on: boolean) => { const e = document.getElementById('rsp'); if (e) e.style.display = on ? 'flex' : 'none'; };
