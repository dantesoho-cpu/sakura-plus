# SAKURA+ audit (visual) + plan
Stack: Phaser 3 + Vite + TS, 480x270 internal, integer scale, pixelArt:true, Arcade physics, Tiled JSON level.
Assets need: bg removal (sheets on off-white/near-white bg, not transparent), per-frame cleanup + re-registration to fixed 64x64 cells w/ common foot baseline, palette quantize, tiles re-cut to 16/32 grid + seam fixes.
Missing: audio (SFX/music), clean boss sprite frames, consistent run cycle, HUD art, font.
Victory: play car .mp4 via HTML5 <video> overlay after flowers+car trigger, skip button, fallback still.
Milestones: M0 asset pipeline (cleaned atlases, contact sheets) | M1 movement/feel test room (coyote, buffer, double jump, dash; 60fps) | M2 anim state machine + combat (shoot, drones, hit FX) | M3 level greybox->art, parallax, waterfalls, 10 flowers, checkpoint | M4 boss, HUD, title, death/restart, victory video | M5 polish/audio/perf.
Acceptance: each milestone run in browser, scripted playthrough reaches victory, no console errors, stable 60fps.
