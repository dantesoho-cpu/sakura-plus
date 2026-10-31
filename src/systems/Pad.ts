// Gamepad (PlayStation / standard mapping) -> shared `touch` input state + synthetic keys for menus.
// Cross jump · Square shoot (hold = charge) · Circle/R1 dash · Triangle/R2 cannon · Options pause/start · Touchpad fullscreen.
import { touch } from './Touch';
const DZ = 0.28;
export const pad = { connected: false, id: '', used: false, polls: 0, toasts: 0 };
let prev: boolean[] = [];
function key(code: number, name: string) {
  for (const t of ['keydown', 'keyup']) { const e = new KeyboardEvent(t, { key: name, code: name, bubbles: true }); Object.defineProperty(e, 'keyCode', { get: () => code }); Object.defineProperty(e, 'which', { get: () => code }); window.dispatchEvent(e); }
}
function toast(msg: string) {
  pad.toasts++; let d = document.getElementById('padtoast'); if (!d) { d = document.createElement('div'); d.id = 'padtoast'; d.setAttribute('style', 'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:30;padding:8px 16px;border-radius:8px;background:rgba(26,15,46,.88);border:2px solid #ff8fd0;color:#ffe6f4;font:bold 14px monospace;pointer-events:none;transition:opacity .4s'); document.body.appendChild(d); }
  d.textContent = msg; d.style.opacity = '1'; clearTimeout((d as any)._t); (d as any)._t = setTimeout(() => { d!.style.opacity = '0'; }, 2200);
}
export function toggleFullscreen() { const g: any = (window as any).__game; try { if (g?.scale) { g.scale.isFullscreen ? g.scale.stopFullscreen() : g.scale.startFullscreen(); } } catch { /* needs a user gesture on some browsers */ } }
function inLevel() { const g: any = (window as any).__game; return !!g && ['Level1', 'Level2', 'Pause'].some(k => g.scene.isActive(k) || g.scene.isPaused(k)); }
let held = { l: false, r: false, u: false, d: false };
function poll() {
  pad.polls++;
  const gps = (navigator.getGamepads ? navigator.getGamepads() : []) || []; let gp: Gamepad | null = null; for (const g of gps) if (g && g.connected) { gp = g; break; }
  if (!gp) { if (pad.connected) { pad.connected = false; toast('Controller disconnected'); if (pad.used) { touch.left = touch.right = touch.up = touch.down = touch.jump = touch.dash = touch.shoot = touch.cannon = false; touch.ax = touch.ay = 0; } } prev = []; requestAnimationFrame(poll); return; }
  if (!pad.connected) { pad.connected = true; pad.id = gp.id; toast('Controller connected'); }
  const B = (i: number) => !!gp!.buttons[i] && (gp!.buttons[i].pressed || gp!.buttons[i].value > 0.5); const now = gp.buttons.map((_, i) => B(i)); const P = (i: number) => now[i] && !prev[i];
  let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0; const m = Math.hypot(ax, ay); if (m < DZ) { ax = ay = 0; } else { const k = (m - DZ) / (1 - DZ) / m; ax *= k; ay *= k; }
  const l = ax < -0.3 || B(14), r = ax > 0.3 || B(15), u = ay < -0.45 || B(12), d = ay > 0.45 || B(13);
  const any = now.some(Boolean) || m >= DZ;
  if (any && !pad.used) { pad.used = true; document.getElementById('tc')?.classList.remove('on'); }
  if (pad.used) {
    // analog drives the 8-way dash direction; D-pad gives pure cardinal/diagonal
    touch.left = l; touch.right = r; touch.up = u; touch.down = d; touch.ax = B(14) ? -1 : B(15) ? 1 : ax; touch.ay = B(12) ? -1 : B(13) ? 1 : ay; void held;
    touch.jump = B(0); if (P(0)) touch.jumpP = true;
    touch.shoot = B(2); if (P(2)) touch.shootP = true;
    touch.dash = B(1) || B(5); if (P(1) || P(5)) touch.dashP = true;
    touch.cannon = B(3) || B(7); if (P(3) || P(7)) touch.cannonP = true;
  }
  if (P(9)) inLevel() ? key(27, 'Escape') : key(13, 'Enter');
  if (P(0) && !inLevel()) key(13, 'Enter');
  if (P(17)) toggleFullscreen();
  if (pad.used) document.getElementById('tc')?.classList.remove('on');
  prev = now; requestAnimationFrame(poll);
}
export function setupPad() {
  addEventListener('gamepadconnected', () => { /* poll() picks it up */ });
  addEventListener('keydown', e => { if ((e.key === 'f' || e.key === 'F') && !e.repeat) toggleFullscreen(); });
  (window as any).__pad = pad; requestAnimationFrame(poll);
}
