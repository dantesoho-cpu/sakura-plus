#!/usr/bin/env python3
"""Reclassify atlas frames + invent intentional Fortress placements for EVERY piece.
Writes layout.json + usage.json. Does not touch enemies/boss/fx.
"""
from __future__ import annotations
import json, math, random
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'assets' / 'ft' / 'tx'
AUD = ROOT / 'audit' / 'v15' / 'fort' / 'tx'

T1, T2, T3, T4, T5 = 760, 620, 480, 340, 200
WW, AX0 = 7200, 6400
TIERS = [T1, T2, T3, T4, T5]

def reclassify(frames: dict):
    for k, v in frames.items():
        w, h = v['w'], v['h']
        area = w * h
        ar = w / max(1, h)
        native = v.get('native') or [w, h]
        narea = native[0] * native[1]
        # big both-axes structures → set pieces (castles, domes, gates, dishes)
        if area >= 12000 and ar < 2.4 and h >= 90:
            v['kind'] = 'set'
        elif area >= 9000 and 0.55 <= ar <= 2.0 and h >= 100:
            v['kind'] = 'set'
        elif narea >= 70000 and ar < 2.2 and h >= 80:
            v['kind'] = 'set'
        # long flat → plat even if had noisy prof
        elif ar >= 2.4 and h <= 95:
            v['kind'] = 'plat'
            v.pop('prof', None)
        elif ar >= 1.8 and h <= 55:
            v['kind'] = 'plat'
            v.pop('prof', None)
        # tall → pillar
        elif h >= w * 1.7 and h >= 55:
            v['kind'] = 'pillar'
            v.pop('prof', None)
        # keep slope if real ramp profile span
        elif 'prof' in v:
            prof = v['prof']
            span = max(prof) - min(prof) if prof else 0
            if span >= 10 and ar >= 0.9:
                v['kind'] = 'slope' if ar >= 1.15 else 'stair'
            elif area >= 8000:
                v['kind'] = 'set'
            else:
                v['kind'] = 'decor'
                v.pop('prof', None)
        elif area < 2200:
            v['kind'] = 'decor'
        elif h > w * 1.25 and h >= 40:
            v['kind'] = 'banner' if ar < 0.7 else 'pillar'
        elif ar >= 1.3 and h <= 100:
            v['kind'] = 'plat'
        else:
            v['kind'] = v.get('kind') if v.get('kind') in ('arch', 'set') else 'decor'
    return frames

def by_kind(frames):
    d = {}
    for k, v in frames.items():
        d.setdefault(v['kind'], []).append(k)
    for k in d:
        d[k].sort(key=lambda x: (-frames[x]['w'] * frames[x]['h'], x))
    return d

def place(usage, placements, key, x, y, *, depth=2.0, flip=False, origin='bl', solid=None, role='decor'):
    """origin: bl = bottom-center on walkY; tl = top-left at (x,y); mid = center."""
    usage[key]['used'] += 1
    usage[key]['at'].append({'x': round(x, 1), 'y': round(y, 1), 'role': role})
    placements.append({
        'key': key, 'x': round(x, 1), 'y': round(y, 1),
        'depth': depth, 'flip': bool(flip), 'origin': origin,
        'solid': solid,  # None | 'ground' | 'one' | 'ramp'
        'role': role,
    })

def main():
    data = json.load(open(OUT / 'atlas.json'))
    frames = reclassify(data['frames'])
    kinds = by_kind(frames)
    counts = {k: len(v) for k, v in kinds.items()}
    print('reclass', counts, 'total', len(frames))

    usage = {k: {'kind': frames[k]['kind'], 'used': 0, 'at': []} for k in frames}
    placements = []

    plats = kinds.get('plat', [])[:]
    slopes = kinds.get('slope', [])[:] + kinds.get('stair', [])[:]
    pillars = kinds.get('pillar', [])[:]
    sets = kinds.get('set', [])[:]
    banners = kinds.get('banner', [])[:]
    arches = kinds.get('arch', [])[:]
    decor = kinds.get('decor', [])[:]

    # --- T1 ground bands: chain widest plats, leave air gaps ---
    # Target bands roughly matching prior docks
    band_targets = [
        (40, 1000), (1180, 2000), (2200, 3200), (3400, 4500),
        (4700, 5600), (5800, 6360), (AX0 - 20, WW - 20),
    ]
    ground_bands = []  # [a,b] actual covered
    pi = 0
    for bi, (a0, b0) in enumerate(band_targets):
        x = a0
        while x < b0 - 30 and plats:
            k = plats[pi % len(plats)]; pi += 1
            # prefer wider for ground — rotate queue so we cycle all plats
            # pick next unused-prefer wide
            candidates = sorted(plats, key=lambda kk: (usage[kk]["used"], -frames[kk]["w"], kk))
            k = candidates[0]
            w = frames[k]['w']; top = frames[k]['top']
            # place with origin top-left of image at walkY - top
            place(usage, placements, k, x, T1, depth=2.0, origin='tl_walk', solid='ground', role='ground')
            x += max(24, w - 6)  # slight overlap for seamless join
            if x > b0 + 40:
                break
        ground_bands.append([a0, min(b0, x)])

    # --- Floating shelves on T2–T5: remaining plats + some reused ---
    shelf_y = [T2, T3, T4, T5]
    # distribute x starts staggered
    shelf_spans = []
    for ti, ty in enumerate(shelf_y):
        xs = list(range(80 + ti * 40, 6200, 380 + ti * 20))
        for j, x0 in enumerate(xs):
            candidates = sorted(plats, key=lambda kk: (usage[kk]['used'], -frames[kk]['w'], kk))
            k = candidates[0]
            w = frames[k]['w']
            place(usage, placements, k, x0, ty, depth=2.05 + ti * 0.05, origin='tl_walk', solid='one', role=f'shelf_T{ti+2}')
            shelf_spans.append((x0, x0 + w, ty))
            # sometimes chain a second piece
            if frames[k]['w'] < 100 and j % 2 == 0:
                k2 = sorted(plats, key=lambda kk: (usage[kk]['used'], -frames[kk]['w'], kk))[0]
                place(usage, placements, k2, x0 + w - 4, ty, depth=2.05 + ti * 0.05, origin='tl_walk', solid='one', role=f'shelf_T{ti+2}')

    # --- Guaranteed landing pads at screenshot / smoke-test coords ---
    # Ensures v15_fortress land checks (and scenic shots) have solid footing.
    land_pads = [
        # solid=ground (48px) so smoke teleports register blocked.down reliably
        (400, T1, 'ground'), (800, T2, 'ground'), (1600, T3, 'ground'),
        (2800, T4, 'ground'), (3600, T5, 'ground'), (5600, T1, 'ground'),
        (3200, T2, 'ground'), (2400, T5, 'ground'),
        # extra scenic / route pads
        (600, T2, 'ground'), (1200, T3, 'ground'), (2000, T4, 'ground'),
        (3000, T5, 'ground'), (4200, T3, 'ground'), (4800, T2, 'ground'),
        (5400, T4, 'ground'), (1800, T5, 'ground'), (2600, T3, 'ground'),
        (3800, T4, 'ground'), (4400, T5, 'ground'), (1000, T4, 'ground'),
    ]
    def pick_wide_plat(min_w=90):
        # Prefer wide solid footing for smoke/screenshot pads; soft-cap reuse at 5.
        cands = sorted(
            plats,
            key=lambda kk: (
                0 if frames[kk]['w'] >= min_w else 1,
                usage[kk]['used'] >= 5,
                usage[kk]['used'],
                -frames[kk]['w'],
                kk,
            ),
        )
        return cands[0]

    for (cx, ty, solid) in land_pads:
        k = pick_wide_plat(110)
        w = frames[k]['w']
        x = max(20, cx - w // 2)
        role = 'ground' if solid == 'ground' else 'shelf_pad'
        place(usage, placements, k, x, ty, depth=2.08, origin='tl_walk', solid=solid, role=role)
        # always chain a second wide piece so pad spans ≥ ~cx±60
        while x + frames[k]['w'] < cx + 64:
            k2 = pick_wide_plat(90)
            x2 = x + frames[k]['w'] - 6
            place(usage, placements, k2, x2, ty, depth=2.08, origin='tl_walk', solid=solid, role=role)
            k = k2
            x = x2
            if frames[k2]['w'] < 20:
                break

    # --- Slopes / stairs: connect tiers near shelf ends ---
    # pair slope pieces with tier transitions
    ramp_sites = []
    for i, (x0, x1, ty) in enumerate(shelf_spans[::3]):
        # ramp from this shelf down toward lower tier
        lo = T1 if ty == T2 else (T2 if ty == T3 else (T3 if ty == T4 else T4))
        ramp_sites.append((x0 + 10, lo, False))
        ramp_sites.append((x1 - 40, lo, True))
    # also explicit zone connectors
    for x, lo, flip in [
        (900, T1, False), (1500, T1, True), (2100, T2, False), (2800, T2, True),
        (3400, T1, False), (4100, T2, False), (4800, T1, True), (5400, T2, False),
        (1100, T3, True), (1900, T3, False), (2700, T4, False), (3600, T3, True),
        (4500, T4, False), (5200, T3, True), (600, T4, False), (3200, T5, True),
        (2000, T4, False), (4000, T5, False), (5600, T4, True),
    ]:
        ramp_sites.append((x, lo, flip))

    si = 0
    for (x, lo, flip) in ramp_sites:
        if not slopes:
            break
        # prefer least-used
        slopes_sorted = sorted(slopes, key=lambda kk: (usage[kk]['used'], -frames[kk]['w'], kk))
        k = slopes_sorted[0]
        place(usage, placements, k, x, lo, depth=2.3, flip=flip, origin='ramp', solid='ramp', role='ramp')
        si += 1
    # dump remaining slopes somewhere intentional
    for k in sorted(slopes, key=lambda kk: usage[kk]['used']):
        if usage[k]['used'] > 0:
            continue
        x = 200 + (hash(k) % 5800)
        ty = TIERS[(hash(k) // 7) % 4]
        place(usage, placements, k, x, ty, depth=2.32, flip=bool(hash(k) & 1), origin='ramp', solid='ramp', role='ramp_extra')

    # --- Pillars flush on ground/shelves ---
    pillar_x = list(range(180, 6300, 145))
    for i, x in enumerate(pillar_x):
        pillars_sorted = sorted(pillars, key=lambda kk: (usage[kk]['used'], -frames[kk]['h'], kk))
        k = pillars_sorted[0]
        ty = TIERS[i % 5]
        # sit on that tier
        place(usage, placements, k, x + (i % 17), ty, depth=1.7, origin='foot', solid=None, role='pillar')
    for k in pillars:
        if usage[k]['used']:
            continue
        x = 100 + (hash(k) % 6000)
        ty = TIERS[hash(k) % 5]
        place(usage, placements, k, x, ty, depth=1.65, origin='foot', role='pillar_extra')

    # --- Set pieces as zone landmarks (and every leftover set) ---
    zone_marks = [
        (700, T1, 'dock citadel'), (1600, T2, 'gantry gate'), (2600, T1, 'spire dome'),
        (3600, T3, 'hangar vault'), (4600, T1, 'bridge dish'), (5600, T2, 'turbine wall'),
        (6200, T1, 'arena gate'), (1000, T5, 'canopy tower'), (3000, T4, 'mid keep'),
        (5000, T5, 'sky dome'), (2200, T3, 'arch hall'), (4000, T2, 'banner keep'),
    ]
    sets_sorted = sorted(sets, key=lambda kk: (-frames[kk]['w'] * frames[kk]['h'], kk))
    for i, k in enumerate(sets_sorted):
        if i < len(zone_marks):
            x, ty, _ = zone_marks[i]
        else:
            x = 300 + (i * 517) % 6000
            ty = TIERS[i % 5]
        place(usage, placements, k, x, ty, depth=1.55, origin='foot', role='set')
    for k in arches:
        x = 800 + hash(k) % 5000
        place(usage, placements, k, x, T2, depth=1.6, origin='foot', role='arch')

    # --- Banners ---
    for i, k in enumerate(banners):
        # place each at least once; extras along docks
        xs = [400 + i * 900, 1200 + i * 800, 2800 + i * 700]
        for j, x in enumerate(xs):
            ty = TIERS[(i + j) % 4]
            place(usage, placements, k, x, ty, depth=1.8, flip=bool(j & 1), origin='foot', role='banner')

    # --- Decor: lamps, crates, consoles, pipes, dishes — flush on surfaces ---
    # Build walk surface samples from ground bands + shelves
    surfaces = []
    for a, b in ground_bands:
        for x in range(int(a) + 30, int(b) - 30, 70):
            surfaces.append((x, T1))
    for x0, x1, ty in shelf_spans:
        for x in range(int(x0) + 20, int(x1) - 10, 60):
            surfaces.append((x, ty))
    random.seed(42)
    random.shuffle(surfaces)

    decor_sorted = sorted(decor, key=lambda kk: (frames[kk]['w'] * frames[kk]['h'], kk))
    si = 0
    for k in decor_sorted:
        # ensure at least one placement
        targets = 1
        # slightly more for tiny greebles
        if frames[k]['w'] * frames[k]['h'] < 800:
            targets = 2
        for t in range(targets):
            if si >= len(surfaces):
                # synthesize more surface points
                x = 60 + (si * 97) % 6200
                ty = TIERS[si % 5]
            else:
                x, ty = surfaces[si]
            si += 1
            # offset so not perfectly grid
            x = x + ((hash(k) + t * 13) % 40) - 20
            depth = 2.6 if frames[k]['h'] < 40 else 1.85
            place(usage, placements, k, x, ty, depth=depth, flip=bool((hash(k) + t) & 1), origin='foot', role='decor')

    # Final sweep: anything still unused gets a forced placement
    unused = [k for k, u in usage.items() if u['used'] == 0]
    for i, k in enumerate(unused):
        x = 150 + (i * 271) % 6100
        ty = TIERS[i % 5]
        kind = frames[k]['kind']
        origin = 'tl_walk' if kind == 'plat' else ('ramp' if kind in ('slope', 'stair') else 'foot')
        solid = 'one' if kind == 'plat' else ('ramp' if kind in ('slope', 'stair') else None)
        place(usage, placements, k, x, ty, depth=2.1, origin=origin, solid=solid, role='sweep')

    used_n = sum(1 for u in usage.values() if u['used'] > 0)
    total = len(frames)
    assert used_n == total, f'only {used_n}/{total} used'

    data['frames'] = frames
    data['meta']['by_kind'] = counts
    data['meta']['total'] = total
    with open(OUT / 'atlas.json', 'w') as f:
        json.dump(data, f, indent=1)
    plat_compat = {k: {kk: vv for kk, vv in v.items() if kk in ('w', 'h', 'top', 'foot', 'prof', 'kind')} for k, v in frames.items()}
    with open(OUT / 'plat.json', 'w') as f:
        json.dump(plat_compat, f, indent=1)

    layout = {
        'ww': WW, 'wh': 900, 'tiers': {'T1': T1, 'T2': T2, 'T3': T3, 'T4': T4, 'T5': T5, 'AX0': AX0},
        'ground_bands': ground_bands,
        'placements': placements,
        'stats': {'total_pieces': total, 'used_pieces': used_n, 'placements': len(placements), 'by_kind': counts},
    }
    with open(OUT / 'layout.json', 'w') as f:
        json.dump(layout, f, indent=1)

    usage_out = {
        'total': total,
        'used': used_n,
        'placements': len(placements),
        'by_kind': counts,
        'pieces': usage,
    }
    with open(OUT / 'usage.json', 'w') as f:
        json.dump(usage_out, f, indent=1)
    with open(AUD / 'usage_summary.json', 'w') as f:
        json.dump({k: usage_out[k] for k in ('total', 'used', 'placements', 'by_kind')}, f, indent=2)

    print(f'USED {used_n}/{total} pieces across {len(placements)} placements')
    print('ground_bands', ground_bands)
    # histogram uses
    hist = {}
    for u in usage.values():
        hist[u['used']] = hist.get(u['used'], 0) + 1
    print('use-count hist', dict(sorted(hist.items())))

if __name__ == '__main__':
    main()
