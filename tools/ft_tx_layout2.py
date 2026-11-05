#!/usr/bin/env python3
"""Layout v2: continuous deck tiles for T1 ground + place EVERY sheet5-9 piece.
Keeps sheet1-4 set/shelf/decor placements; replaces ground runs with ft/deck tiles.
Writes layout.json, usage.json (s1-4), tx2/usage.json, audit/usage_all.json.
"""
from __future__ import annotations
import json, random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TX = ROOT / 'public' / 'assets' / 'ft' / 'tx'
TX2 = ROOT / 'public' / 'assets' / 'ft' / 'tx2'
DECK = ROOT / 'public' / 'assets' / 'ft' / 'deck'
AUD = ROOT / 'audit' / 'v15' / 'fort' / 'tx'

T1, T2, T3, T4, T5 = 760, 620, 480, 340, 200
WW, AX0 = 7200, 6400
TIERS = [T1, T2, T3, T4, T5]

def main():
    layout = json.load(open(TX / 'layout.json'))
    atlas = json.load(open(TX / 'atlas.json'))
    frames1 = atlas['frames']
    deck = json.load(open(DECK / 'deck.json'))['frames']
    a5 = json.load(open(TX2 / 'collect' / 'atlas.json'))['frames']
    a6 = json.load(open(TX2 / 'interact' / 'atlas.json'))['frames']
    a7 = json.load(open(TX2 / 'en' / 'atlas.json'))['frames']
    a8 = json.load(open(TX2 / 'turret' / 'atlas.json'))['frames']
    a9 = json.load(open(TX2 / 'fx' / 'atlas.json'))['frames']

    # usage trackers
    u1 = {k: {'kind': frames1[k]['kind'], 'sheet': int(k.split('_')[0][1:]), 'used': 0, 'at': []} for k in frames1}
    u2 = {}
    for cat, fr in [('collect', a5), ('interact', a6), ('en', a7), ('turret', a8), ('fx', a9)]:
        for k, v in fr.items():
            u2[k] = {'kind': v['kind'], 'cat': cat, 'sheet': v['sheet'], 'used': 0, 'at': []}

    def place(placements, key, x, y, *, depth=2.0, flip=False, origin='tl_walk', solid=None, role='decor', src='tx'):
        if src == 'tx':
            u1[key]['used'] += 1
            u1[key]['at'].append({'x': round(x,1), 'y': round(y,1), 'role': role})
        elif src == 'tx2':
            u2[key]['used'] += 1
            u2[key]['at'].append({'x': round(x,1), 'y': round(y,1), 'role': role})
        elif src == 'deck':
            pass
        placements.append({
            'key': key, 'x': round(x,1), 'y': round(y,1), 'depth': depth,
            'flip': bool(flip), 'origin': origin, 'solid': solid, 'role': role, 'src': src,
        })

    # Keep non-ground placements from prior layout (shelves, sets, pillars, decor, ramps, pads)
    keep_roles = {
        'shelf_T2','shelf_T3','shelf_T4','shelf_T5','shelf_pad','set','pillar','pillar_extra',
        'banner','decor','ramp','ramp_extra','arch','sweep','vault_pad','secret_pad'
    }
    placements = []
    # re-count kept sheet1-4 pieces into usage
    for p in layout['placements']:
        if p.get('role') in ('ground',) or p.get('role') == 'ground':
            continue
        if p.get('role') not in keep_roles and p.get('solid') == 'ground':
            continue
        # skip old ground-solid pads that were land pads on T1 only? keep shelf pads
        key = p['key']
        if key not in frames1:
            continue
        place(placements, key, p['x'], p['y'], depth=p.get('depth',2), flip=p.get('flip',False),
              origin=p.get('origin','tl_walk'), solid=p.get('solid'), role=p.get('role','decor'), src='tx')

    # --- Continuous DECK ground on T1 bands ---
    bands = layout.get('ground_bands') or [[40,1000],[1180,2000],[2200,3200],[3400,4475],[4700,5600],[5800,6360],[6380,7159]]
    mids = sorted([k for k in deck if k.startswith('deck_mid')])
    caps = sorted([k for k in deck if k.startswith('deck_cap')])
    ramps = sorted([k for k in deck if k.startswith('deck_ramp')])
    ground_bands = []
    mi = 0
    for bi, (a0, b0) in enumerate(bands):
        x = a0
        # left cap
        if caps:
            ck = caps[bi % len(caps)]
            place(placements, ck, x, T1, depth=2.0, origin='tl_walk', solid='ground', role='deck_cap', src='deck')
            x += max(24, deck[ck]['w'] - 4)
        while x < b0 - 40 and mids:
            mk = mids[mi % len(mids)]; mi += 1
            place(placements, mk, x, T1, depth=2.0, origin='tl_walk', solid='ground', role='deck_mid', src='deck')
            x += deck[mk]['w'] - 1  # 1px overlap for seam
        # right cap
        if caps and x < b0 + 20:
            ck = caps[(bi + 1) % len(caps)]
            place(placements, ck, min(x, b0 - deck[ck]['w']), T1, depth=2.0, origin='tl_walk', solid='ground', role='deck_cap', src='deck')
            x = max(x, min(x, b0 - deck[ck]['w']) + deck[ck]['w'])
        ground_bands.append([a0, max(a0 + 64, min(b0, x))])

    # Major upper decks also get short continuous deck runs (not scraps)
    for ty, xs in [
        (T2, [(200, 900), (1400, 2100), (3000, 3600), (5000, 5600)]),
        (T3, [(600, 1200), (2200, 2800), (4000, 4600)]),
        (T4, [(1000, 1600), (3200, 3800), (5200, 5700)]),
        (T5, [(800, 1400), (2600, 3200), (4800, 5300)]),
    ]:
        for a0, b0 in xs:
            x = a0
            if caps:
                ck = caps[0]
                place(placements, ck, x, ty, depth=2.05, origin='tl_walk', solid='ground', role='deck_shelf', src='deck')
                x += deck[ck]['w'] - 4
            while x < b0 - 20:
                mk = mids[mi % len(mids)]; mi += 1
                place(placements, mk, x, ty, depth=2.05, origin='tl_walk', solid='ground', role='deck_shelf', src='deck')
                x += deck[mk]['w'] - 1

    # Deck ramps near connectors
    for i, (x, ty) in enumerate([(900, T1), (1500, T2), (2100, T2), (2800, T3), (3600, T3), (4500, T2), (5400, T1)]):
        if not ramps: break
        rk = ramps[i % len(ramps)]
        place(placements, rk, x, ty, depth=2.3, flip=(i % 2 == 1), origin='ramp', solid='ramp', role='deck_ramp', src='deck')

    # Guaranteed land pads using deck_mid (wide continuous)
    for cx, ty in [(400,T1),(800,T2),(1600,T3),(2800,T4),(3600,T5),(5600,T1),(3200,T2),(2400,T5)]:
        mk = mids[0]
        w = deck[mk]['w']
        x = max(20, cx - w)
        for j in range(3):
            place(placements, mids[(j) % len(mids)], x + j * (w - 1), ty, depth=2.08, origin='tl_walk', solid='ground', role='deck_pad', src='deck')

    # --- Sheet5 collectibles along routes ---
    collect_spots = []
    for a, b in ground_bands:
        for x in range(int(a) + 60, int(b) - 40, 140):
            collect_spots.append((x, T1 - 18))
    for ty in [T2, T3, T4, T5]:
        for x in range(120, 6200, 280):
            collect_spots.append((x + (ty % 97), ty - 18))
    random.seed(7)
    random.shuffle(collect_spots)
    for i, k in enumerate(sorted(a5.keys())):
        x, y = collect_spots[i % len(collect_spots)]
        place(placements, k, x, y, depth=6.2, origin='foot', solid=None, role='collect', src='tx2')
        # second use for small ones
        if a5[k]['w'] * a5[k]['h'] < 4000 and i + 50 < len(collect_spots):
            x2, y2 = collect_spots[(i + 50) % len(collect_spots)]
            place(placements, k, x2, y2, depth=6.2, origin='foot', solid=None, role='collect', src='tx2')

    # --- Sheet6 interactables: gates, doors, buttons, terminals ---
    gates = [k for k, v in a6.items() if v['kind'] in ('gate', 'door')]
    buttons = [k for k, v in a6.items() if v['kind'] == 'button']
    inter = [k for k, v in a6.items() if v['kind'] == 'interact']
    # pair button+gate along docks
    gate_sites = [(700,T1),(1600,T1),(2600,T2),(3600,T1),(4600,T1),(5600,T2),(1200,T3),(3000,T4),(4200,T3),(5200,T4)]
    for i, (x, ty) in enumerate(gate_sites):
        if i < len(gates):
            place(placements, gates[i], x + 40, ty, depth=2.7, origin='foot', solid=None, role='gate', src='tx2')
        if i < len(buttons):
            place(placements, buttons[i % len(buttons)], x - 30, ty, depth=3.0, origin='foot', solid=None, role='button', src='tx2')
        elif buttons:
            place(placements, buttons[i % len(buttons)], x - 30, ty, depth=3.0, origin='foot', solid=None, role='button', src='tx2')
    # remaining interact as terminals/crates on surfaces
    surf = collect_spots[:]
    random.seed(11); random.shuffle(surf)
    si = 0
    for k in sorted(a6.keys()):
        if u2[k]['used']: continue
        x, y = surf[si % len(surf)]; si += 1
        # sit on deck: foot origin at walk Y
        place(placements, k, x, y + 18, depth=2.6, origin='foot', solid=None, role='interact', src='tx2')

    # --- Sheet7 enemies as spawn markers (role=en_spawn) — Fortress will instantiate ---
    en_sites = [
        (500,T1-8,'trooper'),(900,T2-8,'trooper'),(1300,T1-8,'heavy'),(1800,T3-40,'flyer'),
        (2200,T2-8,'trooper'),(2700,T1-8,'heavy'),(3100,T4-40,'flyer'),(3500,T2-8,'trooper'),
        (3900,T1-8,'heavy'),(4300,T3-40,'flyer'),(4700,T2-8,'trooper'),(5100,T1-8,'heavy'),
        (5500,T4-40,'flyer'),(5900,T2-8,'trooper'),(1500,T5-40,'flyer'),(2500,T5-40,'flyer'),
        (4500,T5-40,'flyer'),(3300,T3-8,'trooper'),(4100,T4-8,'heavy'),(2000,T4-8,'trooper'),
    ]
    en_keys = sorted(a7.keys(), key=lambda k: -a7[k]['w']*a7[k]['h'])
    for i, k in enumerate(en_keys):
        if i < len(en_sites):
            x, y, _ = en_sites[i]
        else:
            x = 180 + (i * 173) % 6000
            y = TIERS[i % 5] - (40 if a7[k]['kind'] == 'flyer' else 8)
        role = 'en_flyer' if a7[k]['kind'] == 'flyer' else ('en_heavy' if a7[k]['kind'] == 'heavy' else 'en_spawn')
        place(placements, k, x, y, depth=5.5, origin='foot' if 'flyer' not in role else 'foot', solid=None, role=role, src='tx2')

    # --- Sheet8 turrets flush on decks + mechs ---
    turrets = [k for k, v in a8.items() if v['kind'] in ('turret', 'saucer') or (v['h'] <= 70 and v['w'] <= 80)]
    mechs = [k for k, v in a8.items() if k not in turrets]
    turret_sites = [
        (450,T1),(1100,T1),(1900,T2),(2500,T1),(3300,T3),(3700,T1),(4400,T2),
        (4900,T1),(5300,T3),(5800,T1),(800,T3),(1600,T4),(2800,T5),(4000,T4),(5000,T5),
        (2200,T3),(3400,T2),(4600,T4),(600,T2),(3000,T1),
    ]
    for i, k in enumerate(sorted(turrets, key=lambda k: -a8[k]['w']*a8[k]['h'])):
        if i < len(turret_sites):
            x, ty = turret_sites[i]
        else:
            x = 100 + (i * 211) % 6100; ty = TIERS[i % 5]
        place(placements, k, x, ty, depth=3.2, origin='foot', solid=None, role='turret', src='tx2')
    for i, k in enumerate(sorted(mechs, key=lambda k: -a8[k]['w']*a8[k]['h'])):
        x = 300 + (i * 257) % 6000
        ty = TIERS[(i * 2) % 5]
        y = ty - (30 if a8[k]['kind'] in ('saucer',) else 8)
        place(placements, k, x, y, depth=5.4, origin='foot', solid=None, role='en_mech' if a8[k]['h'] > 50 else 'turret', src='tx2')

    # --- Sheet9 FX: decorate + pool keys for runtime ---
    beams = [k for k, v in a9.items() if v['kind'] == 'beam']
    bursts = [k for k, v in a9.items() if v['kind'] == 'burst']
    bolts = [k for k, v in a9.items() if v['kind'] == 'bolt']
    fxrest = [k for k in a9 if k not in beams + bursts + bolts]
    # place thruster plumes under decks
    for i, k in enumerate(beams + fxrest[:40]):
        x = 80 + (i * 149) % 7000
        ty = T1 + 20 + (i % 3) * 8
        place(placements, k, x, ty, depth=1.7, origin='foot', solid=None, role='fx_ambient', src='tx2')
    for i, k in enumerate(bursts + bolts + fxrest[40:]):
        if u2[k]['used']: continue
        x = 120 + (i * 167) % 6800
        ty = TIERS[i % 5] - 40
        place(placements, k, x, ty, depth=7.5, origin='foot', solid=None, role='fx_pool', src='tx2')

    # Final sweep unused tx2
    for k, u in list(u2.items()):
        if u['used']: continue
        x = 50 + (hash(k) % 7000)
        ty = TIERS[hash(k) % 5]
        place(placements, k, x, ty - 10, depth=2.4, origin='foot', solid=None, role='sweep2', src='tx2')

    # also ensure any unused sheet1-4 still placed
    for k, u in u1.items():
        if u['used']: continue
        x = 100 + (hash(k) % 6000)
        ty = TIERS[hash(k) % 5]
        kind = frames1[k]['kind']
        origin = 'tl_walk' if kind == 'plat' else ('ramp' if kind in ('slope','stair') else 'foot')
        solid = 'one' if kind == 'plat' else ('ramp' if kind in ('slope','stair') else None)
        place(placements, k, x, ty, depth=2.1, origin=origin, solid=solid, role='sweep', src='tx')

    used1 = sum(1 for u in u1.values() if u['used'] > 0)
    used2 = sum(1 for u in u2.values() if u['used'] > 0)
    total = len(u1) + len(u2)
    used = used1 + used2

    layout_out = {
        'ww': WW, 'wh': 900,
        'tiers': {'T1': T1, 'T2': T2, 'T3': T3, 'T4': T4, 'T5': T5, 'AX0': AX0},
        'ground_bands': ground_bands,
        'placements': placements,
        'stats': {
            'total_pieces': total,
            'used_pieces': used,
            'used_s1_4': used1,
            'used_s5_9': used2,
            'total_s1_4': len(u1),
            'total_s5_9': len(u2),
            'placements': len(placements),
            'deck_tiles': len(deck),
        },
        'fx_keys': {'beams': beams[:12], 'bursts': bursts[:16], 'bolts': bolts[:12]},
    }
    with open(TX / 'layout.json', 'w') as f:
        json.dump(layout_out, f, indent=1)

    usage1 = {'total': len(u1), 'used': used1, 'placements': sum(u['used'] for u in u1.values()), 'pieces': u1,
              'by_kind': {}}
    for u in u1.values():
        usage1['by_kind'][u['kind']] = usage1['by_kind'].get(u['kind'], 0) + 1
    with open(TX / 'usage.json', 'w') as f:
        json.dump(usage1, f, indent=1)

    usage2 = {'total': len(u2), 'used': used2, 'pieces': u2}
    with open(TX2 / 'usage.json', 'w') as f:
        json.dump(usage2, f, indent=1)

    by_sheet = {}
    for src in (u1, u2):
        for k, v in src.items():
            s = str(v['sheet'])
            by_sheet.setdefault(s, {'total': 0, 'used': 0})
            by_sheet[s]['total'] += 1
            if v['used'] > 0:
                by_sheet[s]['used'] += 1
    summary = {
        'total': total, 'used': used,
        's1_4': {'total': len(u1), 'used': used1},
        's5_9': {'total': len(u2), 'used': used2},
        'deck_tiles': len(deck),
        'placements': len(placements),
        'by_sheet': by_sheet,
    }
    with open(AUD / 'usage_all.json', 'w') as f:
        json.dump(summary, f, indent=2)
    with open(AUD / 'usage_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    print('USED', used, '/', total, 'placements', len(placements))
    print('by_sheet', by_sheet)
    print('deck ground bands', ground_bands)

if __name__ == '__main__':
    main()
