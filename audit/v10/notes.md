# v10 animation round
- Sakura: new GenerateImage frames (tools/gen_sakura_a/b.jpg -> tools/gen_cut.py): run 8f @15fps, rise/apex/fall/land, dash start/burst + end (dashend state on ground), hurt recoil/stagger. wall/sit/win registered but unused (no wall-slide mechanic).
- Bots: walk legs speed-matched (holds a frame when stopped), landing squash, turn = existing squash-flip.
- Drone hurt = spin-wobble, turret hurt = recoil shake.
- Boss: per-attack windups (spread aim lines, charge red streak + rear-back, ring converging ring + spin, summon portal glows); death = flash, 1.2s slow-mo, chain booms, tilt/sink collapse, final flash.
- Intro: lake sparkle layers (tools/intro_layers.py), drifting clouds, petals.
- Victory: Sakura runs in, hops into car, car dips, drives off with exhaust/petals/tail-light streak.
- Tests: tests/anim.mjs, tests/cine.mjs.
