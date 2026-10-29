# v9 game-feel tuning (all values live in src/tuning.ts)
| Area | Key | Before | After |
|---|---|---|---|
| Run | accelGround / decelGround | 1400 / 1800 | 1500 / 1900 |
| Air | accelAir | 900 | 950 |
| Jump | gravity | 1100 | 1250 |
| Jump | fallGravityMult | 1.6 | 1.72 |
| Jump | maxFall | 420 | 460 |
| Jump | jumpVel / doubleJumpVel | 410 / 360 | 440 / 380 (peak height ≈ unchanged: v²/2g 76→77px) |
| Jump | apex hang (new) | – | |vy|<50 → gravity ×0.55 |
| Dash | dashSpeed / dashTime / cooldown | 400 / 0.16 / 0.2 | 440 / 0.15 / 0.18 |
| Dash | exit carry (new) | 0 (hard stop) | 45% of dash speed |
| Dash | screenshake | 60ms / 0.002 | 50ms / 0.0015 |
| Jet | fuel / vel / accel | 0.55 / 170 / 3000 | 0.6 / 185 / 2400 |
| Camera | follow lerp | 0.15 | 0.11 |
| Camera | deadzone | 40×40 | 28×36 |
| Camera | lookahead (new) | – | 36px toward facing (×0.4 standing), 24px down when falling fast |
| Hurt | hitstop / shake / intensity | 60 / 140 / 0.005 | 70 / 120 / 0.004 |
| Hurt | knockback x / y | 170 / 190 | 190 / 170 |
| Hurt | white flash (new) | – | 70ms |
| Enemy hit | hitstop / knock | 35 / 90 | 40 / 110 |
| Landing | squash | always 1.18/0.84 | hard (vy≥220) 1.24/0.78 + 6 dust puffs, soft 1.1/0.92 |
| Landing | landTime | 0.12 | 0.1 |
