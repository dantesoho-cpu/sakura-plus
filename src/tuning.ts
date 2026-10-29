// ONE place for game-feel tuning. Values before round 9 are kept in the comments (was: ...).
// Movement (px, px/s, s). Jump heights preserved: full jump ~77px (was 76), double ~58px (was 59) so level reach is unchanged.
export const T = {
  maxRun: 150, accelGround: 1500 /*was 1400*/, decelGround: 1900 /*1800*/, accelAir: 950 /*900*/, decelAir: 500,
  gravity: 1250 /*1100: snappier rise*/, fallGravityMult: 1.72 /*1.6: faster fall*/, maxFall: 460 /*420*/,
  jumpVel: 440 /*410*/, doubleJumpVel: 380 /*360*/, jumpCutMult: 0.45,
  apexBand: 50 /*new: |vy| below this near the top...*/, apexGravMult: 0.55 /*new: ...uses this gravity => apex hang*/,
  coyote: 0.1, buffer: 0.12, dashSpeed: 440 /*400*/, dashTime: 0.15 /*0.16 => 70px (was 64)*/, dashCooldown: 0.18 /*0.2*/,
  dashEndCarry: 0.45 /*new: keep 45% of dash speed on exit instead of a dead stop*/, landTime: 0.1 /*0.12*/,
};
// Jet boots: hold jump after the double jump.
export const JET = { fuel: 0.6 /*0.55*/, vel: 185 /*170*/, accel: 2400 /*3000: softer spool-up*/ };
export const FEEL = {
  cam: { lerp: 0.11 /*0.15*/, lookX: 36 /*new: lookahead px in facing dir*/, lookLerp: 0.04, lookFallY: 24 /*new: peek down when falling fast*/, deadW: 28 /*40*/, deadH: 36 /*40*/ },
  hurt: { stop: 70 /*60*/, shakeMs: 120 /*140*/, shakeI: 0.004 /*0.005*/, knockX: 190 /*170*/, knockY: 170 /*190*/, flashMs: 70 /*new white flash*/ },
  ehit: { stop: 40 /*35*/, knock: 110 /*90*/, flash: 0.08 },
  land: { dustMinVy: 220 /*new*/, squashHard: [1.24, 0.78] as [number, number] /*was always 1.18,0.84*/, squashSoft: [1.1, 0.92] as [number, number] },
  dashShake: [50, 0.0015] as [number, number] /*was 60, 0.002*/,
};
