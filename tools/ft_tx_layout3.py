#!/usr/bin/env python3
"""Layout v3 — intentional Air Fortress polish.
Keeps continuous deck ground + 100% sheet usage.
Combat is curated per zone; surplus enemy/turret art becomes setpiece scenery.
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TX = ROOT / 'public' / 'assets' / 'ft' / 'tx'
TX2 = ROOT / 'public' / 'assets' / 'ft' / 'tx2'
DECK = ROOT / 'public' / 'assets' / 'ft' / 'deck'
AUD = ROOT / 'audit' / 'v15' / 'fort' / 'tx'

T1, T2, T3, T4, T5 = 760, 620, 480, 340, 200
WW, AX0 = 7200, 6400
TIERS = [T1, T2, T3, T4, T5]

# Zone centers for intentional set dressing
ZONES = [
    ('dock',   40, 1000),
    ('gantry', 1180, 2000),
    ('spires', 2200, 3200),
    ('hangar', 3400, 4475),
    ('bridge', 4700, 5720),
    ('approach', 5820, 6360),
    ('arena',  6380, 7159),
]

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

    u1 = {k: {'kind': frames1[k]['kind'], 'sheet': int(k.split('_')[0][1:]), 'used': 0, 'at': []} for k in frames1}
    u2 = {}
    for cat, fr in [('collect', a5), ('interact', a6), ('en', a7), ('turret', a8), ('fx', a9)]:
        for k, v in fr.items():
            u2[k] = {'kind': v['kind'], 'cat': cat, 'sheet': v['sheet'], 'used': 0, 'at': []}

    def place(placements, key, x, y, *, depth=2.0, flip=False, origin='tl_walk', solid=None, role='decor', src='tx'):
        if src == 'tx':
            u1[key]['used'] += 1
            u1[key]['at'].append({'x': round(x, 1), 'y': round(y, 1), 'role': role})
        elif src == 'tx2':
            u2[key]['used'] += 1
            u2[key]['at'].append({'x': round(x, 1), 'y': round(y, 1), 'role': role})
        placements.append({
            'key': key, 'x': round(x, 1), 'y': round(y, 1), 'depth': depth,
            'flip': bool(flip), 'origin': origin, 'solid': solid, 'role': role, 'src': src,
        })

    keep_roles = {
        'shelf_T2', 'shelf_T3', 'shelf_T4', 'shelf_T5', 'shelf_pad', 'set', 'pillar', 'pillar_extra',
        'banner', 'decor', 'ramp', 'ramp_extra', 'arch', 'sweep', 'vault_pad', 'secret_pad',
    }
    placements = []
    for p in layout['placements']:
        if p.get('role') in ('ground',) or p.get('solid') == 'ground' and p.get('role') not in keep_roles:
            # drop old ground / deck from prior layout — rebuilt below
            if p.get('role', '').startswith('deck') or p.get('role') == 'ground':
                continue
            if p.get('solid') == 'ground' and p.get('role') not in keep_roles:
                continue
        if p.get('src') in ('tx2', 'deck'):
            continue  # rebuild all tx2 + deck
        if p.get('role') not in keep_roles and p.get('solid') == 'ground':
            continue
        key = p['key']
        if key not in frames1:
            continue
        place(placements, key, p['x'], p['y'], depth=p.get('depth', 2), flip=p.get('flip', False),
              origin=p.get('origin', 'tl_walk'), solid=p.get('solid'), role=p.get('role', 'decor'), src='tx')

    # --- Continuous DECK ground on T1 bands ---
    # Extend bridge through land-probe x=5600; keep short air gap before approach
    bands = [[40, 1000], [1180, 2000], [2200, 3200], [3400, 4475], [4700, 5720], [5820, 6360], [6380, 7159]]
    mids = sorted([k for k in deck if k.startswith('deck_mid')])
    caps = sorted([k for k in deck if k.startswith('deck_cap')])
    ramps = sorted([k for k in deck if k.startswith('deck_ramp')])
    ground_bands = []
    mi = 0
    for bi, (a0, b0) in enumerate(bands):
        x = a0
        if caps:
            ck = caps[bi % len(caps)]
            place(placements, ck, x, T1, depth=2.0, origin='tl_walk', solid='ground', role='deck_cap', src='deck')
            x += max(24, deck[ck]['w'] - 4)
        while x < b0 - 40 and mids:
            mk = mids[mi % len(mids)]; mi += 1
            place(placements, mk, x, T1, depth=2.0, origin='tl_walk', solid='ground', role='deck_mid', src='deck')
            x += deck[mk]['w'] - 1
        if caps and x < b0 + 20:
            ck = caps[(bi + 1) % len(caps)]
            place(placements, ck, min(x, b0 - deck[ck]['w']), T1, depth=2.0, origin='tl_walk', solid='ground', role='deck_cap', src='deck')
            x = max(x, min(x, b0 - deck[ck]['w']) + deck[ck]['w'])
        ground_bands.append([a0, max(a0 + 64, min(b0, x))])

    # Upper deck shelves — continuous short runs at intentional waypoints
    for ty, xs in [
        # Cover land probes: T2@3200, T3@1600 (continuous shelves, intentional gaps remain as jumps)
        (T2, [(180, 780), (1280, 1880), (2480, 3380), (3600, 4280), (5080, 5580), (6480, 6980)]),
        (T3, [(520, 980), (1480, 2280), (3080, 3680), (4480, 5080), (5880, 6380)]),
        (T4, [(880, 1380), (2480, 2980), (3880, 4380), (5280, 5780)]),
        (T5, [(680, 1180), (2280, 2780), (4080, 4580), (5680, 6180)]),
    ]:
        for a0, b0 in xs:
            x = a0
            if caps:
                ck = caps[0]
                place(placements, ck, x, ty, depth=2.05, origin='tl_walk', solid='one', role='deck_shelf', src='deck')
                x += deck[ck]['w'] - 4
            while x < b0 - 20:
                mk = mids[mi % len(mids)]; mi += 1
                place(placements, mk, x, ty, depth=2.05, origin='tl_walk', solid='one', role='deck_shelf', src='deck')
                x += deck[mk]['w'] - 1

    # Deck ramps at zone connectors
    for i, (x, ty) in enumerate([
        (920, T1), (1140, T2), (1980, T1), (2160, T2), (3180, T1),
        (3360, T2), (4520, T1), (4680, T2), (5620, T1), (6340, T1),
    ]):
        if not ramps:
            break
        rk = ramps[i % len(ramps)]
        place(placements, rk, x, ty, depth=2.3, flip=(i % 2 == 1), origin='ramp', solid='ramp', role='deck_ramp', src='deck')

    # Land pads
    # Land pads — denser under test waypoints + combat shelves
    for cx, ty in [(360, T1), (720, T2), (1600, T3), (2700, T4), (3500, T5),
                   (3200, T2), (4200, T2), (5600, T1), (6100, T2), (6600, T1), (2400, T5)]:
        w = deck[mids[0]]['w']
        x = max(20, cx - 2 * w)
        for j in range(5):
            place(placements, mids[j % len(mids)], x + j * (w - 1), ty, depth=2.08,
                  origin='tl_walk', solid=('ground' if ty >= T1 else 'one'), role='deck_pad', src='deck')

    # ========== INTENTIONAL COMBAT (live AI roles) ==========
    # Curated sites only — surplus art becomes setpiece below.
    live_turrets = [
        # dock
        (420, T1, 'turret'), (780, T2, 'turret'),
        # gantry
        (1320, T1, 'turret'), (1760, T3, 'turret'),
        # spires
        (2360, T1, 'turret'), (2880, T2, 'turret'), (2680, T4, 'turret'),
        # hangar
        (3560, T1, 'turret'), (4100, T3, 'turret'),
        # bridge
        (4920, T1, 'turret'), (5380, T2, 'turret'),
        # approach / arena rim
        (6000, T1, 'turret'), (6520, T1, 'turret'), (6920, T2, 'turret'),
    ]
    live_en = [
        (560, T1 - 8, 'en_spawn'), (980, T2 - 8, 'en_spawn'),
        (1480, T1 - 8, 'en_heavy'), (1900, T3 - 40, 'en_flyer'),
        (2480, T1 - 8, 'en_spawn'), (3020, T2 - 8, 'en_heavy'), (2760, T5 - 40, 'en_flyer'),
        (3720, T1 - 8, 'en_spawn'), (4300, T2 - 8, 'en_heavy'), (4000, T4 - 40, 'en_flyer'),
        (5100, T1 - 8, 'en_spawn'), (5480, T3 - 8, 'en_spawn'),
        (6120, T2 - 8, 'en_heavy'), (6680, T1 - 8, 'en_spawn'),
        (1600, T5 - 40, 'en_flyer'), (4600, T5 - 40, 'en_flyer'),
    ]
    # Prefer compact turret-looking art for live turrets; big mechs for live mechs
    tur_sorted = sorted(
        [k for k, v in a8.items() if v['kind'] in ('turret', 'saucer') or (v['h'] <= 70 and v['w'] <= 90)],
        key=lambda k: -a8[k]['w'] * a8[k]['h'],
    )
    mech_sorted = sorted(
        [k for k in a8 if k not in tur_sorted],
        key=lambda k: -a8[k]['w'] * a8[k]['h'],
    )
    en_by = {
        'en_flyer': sorted([k for k, v in a7.items() if v['kind'] == 'flyer'], key=lambda k: -a7[k]['w'] * a7[k]['h']),
        'en_heavy': sorted([k for k, v in a7.items() if v['kind'] in ('heavy', 'enemy')], key=lambda k: -a7[k]['w'] * a7[k]['h']),
        'en_spawn': sorted([k for k, v in a7.items() if v['kind'] in ('trooper', 'enemy')], key=lambda k: -a7[k]['w'] * a7[k]['h']),
    }
    used_live8, used_live7 = set(), set()
    for i, (x, ty, role) in enumerate(live_turrets):
        pool = tur_sorted if i < len(tur_sorted) else mech_sorted
        if not pool:
            continue
        k = pool[i % len(pool)]
        used_live8.add(k)
        r = 'en_mech' if (k in mech_sorted and a8[k]['h'] > 70) else 'turret'
        place(placements, k, x, ty, depth=3.2, origin='foot', role=r, src='tx2')
    for i, (x, y, role) in enumerate(live_en):
        pool = en_by.get(role) or en_by['en_spawn']
        if not pool:
            continue
        k = pool[i % len(pool)]
        used_live7.add(k)
        place(placements, k, x, y, depth=5.5, origin='foot', role=role, src='tx2')

    # ========== SETPIECE clusters (surplus combat art as scenery) ==========
    # Dock security line
    set_clusters = [
        ('dock_bay', [(220, T1), (300, T1), (380, T1), (640, T2), (700, T2), (860, T1)]),
        ('gantry_rail', [(1240, T1), (1400, T2), (1560, T1), (1720, T2), (1880, T1)]),
        ('spire_guard', [(2320, T2), (2520, T1), (2720, T3), (2920, T1), (3120, T2)]),
        ('hangar_row', [(3480, T1), (3640, T1), (3800, T1), (3960, T2), (4200, T1), (4360, T1)]),
        ('bridge_watch', [(4840, T1), (5000, T2), (5200, T1), (5440, T1), (5560, T2)]),
        ('arena_fleet', [(6460, T1), (6620, T1), (6780, T2), (6940, T1), (7080, T1), (6560, T2), (6860, T2)]),
    ]
    leftover8 = [k for k in sorted(a8.keys(), key=lambda k: -a8[k]['w'] * a8[k]['h']) if k not in used_live8]
    leftover7 = [k for k in sorted(a7.keys(), key=lambda k: -a7[k]['w'] * a7[k]['h']) if k not in used_live7]
    ci = 0
    for name, spots in set_clusters:
        for x, ty in spots:
            if leftover8:
                k = leftover8.pop(0)
                place(placements, k, x, ty, depth=2.55, origin='foot', role='setpiece', src='tx2')
            if leftover7 and ci % 2 == 0:
                k = leftover7.pop(0)
                y = ty - (36 if a7[k]['kind'] == 'flyer' else 8)
                place(placements, k, x + 36, y, depth=2.5, origin='foot', role='setpiece', src='tx2')
            ci += 1
    # dump remaining combat art into zone midpoints as setpieces (still intentional x, not hash-scatter)
    dump_xs = []
    for _, a, b in ZONES:
        for t in range(5):
            dump_xs.append((a + 80 + t * ((b - a - 160) // 4), TIERS[t % 5]))
    di = 0
    for pool in (leftover8, leftover7):
        for k in pool:
            x, ty = dump_xs[di % len(dump_xs)]; di += 1
            fr = a8 if k in a8 else a7
            y = ty - (40 if fr[k].get('kind') == 'flyer' else 8)
            place(placements, k, x + (di % 40), y, depth=2.45, origin='foot', role='setpiece', src='tx2')

    # ========== Collectibles — route trails ==========
    trail = []
    for a, b in ground_bands:
        for x in range(int(a) + 80, int(b) - 60, 220):
            trail.append((x, T1 - 18))
    for ty, step, off in [(T2, 260, 40), (T3, 300, 90), (T4, 320, 130), (T5, 340, 170)]:
        for x in range(160 + off, 6400, step):
            trail.append((x, ty - 18))
    # vault / secret extras
    for x, ty in [(900, T3), (2100, T4), (3900, T5), (5300, T3), (6500, T2)]:
        for j in range(4):
            trail.append((x + j * 28, ty - 18))
    for i, k in enumerate(sorted(a5.keys())):
        x, y = trail[i % len(trail)]
        place(placements, k, x, y, depth=6.2, origin='foot', role='collect', src='tx2')
        if a5[k]['w'] * a5[k]['h'] < 4000:
            x2, y2 = trail[(i * 3 + 17) % len(trail)]
            place(placements, k, x2, y2, depth=6.2, origin='foot', role='collect', src='tx2')

    # ========== Interactables — gates at zone seams + control rooms ==========
    gates = [k for k, v in a6.items() if v['kind'] in ('gate', 'door')]
    buttons = [k for k, v in a6.items() if v['kind'] == 'button']
    gate_sites = [
        (980, T1), (1980, T1), (3180, T1), (4460, T1), (5580, T1), (6340, T1),
        (1500, T3), (2800, T4), (4100, T3), (5400, T2),
    ]
    for i, (x, ty) in enumerate(gate_sites):
        if gates:
            place(placements, gates[i % len(gates)], x + 36, ty, depth=2.7, origin='foot', role='gate', src='tx2')
        if buttons:
            place(placements, buttons[i % len(buttons)], x - 40, ty, depth=3.0, origin='foot', role='button', src='tx2')
    # control-room clusters of remaining interact
    rooms = [
        (600, T1), (1400, T2), (2600, T1), (3600, T2), (4800, T1), (5900, T2), (6700, T1),
        (1000, T3), (2200, T4), (3400, T5), (4600, T3), (5800, T4),
    ]
    ri = 0
    for k in sorted(a6.keys()):
        if u2[k]['used']:
            continue
        x, ty = rooms[ri % len(rooms)]
        ox = (ri // len(rooms)) * 42
        place(placements, k, x + ox, ty, depth=2.6, origin='foot', role='interact', src='tx2')
        ri += 1

    # ========== FX — thruster banks under decks + arena lights ==========
    beams = [k for k, v in a9.items() if v['kind'] == 'beam']
    bursts = [k for k, v in a9.items() if v['kind'] == 'burst']
    bolts = [k for k, v in a9.items() if v['kind'] == 'bolt']
    fxrest = [k for k in a9 if k not in beams + bursts + bolts]
    # thrusters under each band midpoint
    bi = 0
    for a, b in ground_bands:
        cx = (a + b) / 2
        for j, k in enumerate((beams + fxrest)[bi:bi + 4] or beams[:1]):
            place(placements, k, cx - 60 + j * 40, T1 + 18 + (j % 2) * 6, depth=1.7, origin='foot', role='fx_ambient', src='tx2')
        bi += 4
    # arena light beams
    for i, k in enumerate(beams[8:16] or beams):
        place(placements, k, 6500 + i * 70, T1 - 80 - (i % 3) * 30, depth=7.2, origin='foot', role='fx_ambient', src='tx2')
    # pool remaining bursts/bolts (hidden for runtime)
    for i, k in enumerate(bursts + bolts + fxrest):
        if u2[k]['used']:
            continue
        x = 200 + (i * 97) % 6800
        ty = TIERS[i % 5] - 50
        place(placements, k, x, ty, depth=7.5, origin='foot', role='fx_pool', src='tx2')

    # Final unused tx2 / tx sweeps — park in zone shelves, not random hash
    for k, u in list(u2.items()):
        if u['used']:
            continue
        z = ZONES[hash(k) % len(ZONES)]
        x = z[1] + 60 + (hash(k) % max(40, z[2] - z[1] - 120))
        ty = TIERS[hash(k) % 5]
        place(placements, k, x, ty - 10, depth=2.4, origin='foot', role='setpiece', src='tx2')
    for k, u in u1.items():
        if u['used']:
            continue
        z = ZONES[hash(k) % len(ZONES)]
        x = z[1] + 40 + (hash(k) % max(40, z[2] - z[1] - 100))
        ty = TIERS[hash(k) % 5]
        kind = frames1[k]['kind']
        origin = 'tl_walk' if kind == 'plat' else ('ramp' if kind in ('slope', 'stair') else 'foot')
        solid = 'one' if kind == 'plat' else ('ramp' if kind in ('slope', 'stair') else None)
        place(placements, k, x, ty, depth=2.1, origin=origin, solid=solid, role='decor', src='tx')

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
            'total_pieces': total, 'used_pieces': used,
            'used_s1_4': used1, 'used_s5_9': used2,
            'total_s1_4': len(u1), 'total_s5_9': len(u2),
            'placements': len(placements), 'deck_tiles': len([k for k in deck if not k.startswith('fill')]),
            'live_turrets': len(live_turrets), 'live_enemies': len(live_en),
            'polish': 'layout3_intentional',
        },
        'fx_keys': {'beams': beams[:12], 'bursts': bursts[:16], 'bolts': bolts[:12]},
    }
    with open(TX / 'layout.json', 'w') as f:
        json.dump(layout_out, f, indent=1)

    usage1 = {'total': len(u1), 'used': used1, 'placements': sum(u['used'] for u in u1.values()), 'pieces': u1, 'by_kind': {}}
    for u in u1.values():
        usage1['by_kind'][u['kind']] = usage1['by_kind'].get(u['kind'], 0) + 1
    with open(TX / 'usage.json', 'w') as f:
        json.dump(usage1, f, indent=1)
    with open(TX2 / 'usage.json', 'w') as f:
        json.dump({'total': len(u2), 'used': used2, 'pieces': u2}, f, indent=1)

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
        'deck_tiles': layout_out['stats']['deck_tiles'],
        'placements': len(placements),
        'live_turrets': len(live_turrets), 'live_enemies': len(live_en),
        'by_sheet': by_sheet, 'polish': 'layout3_intentional',
    }
    AUD.mkdir(parents=True, exist_ok=True)
    with open(AUD / 'usage_all.json', 'w') as f:
        json.dump(summary, f, indent=2)
    with open(AUD / 'usage_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    print('USED', used, '/', total, 'placements', len(placements))
    print('live turrets', len(live_turrets), 'live en', len(live_en))
    print('by_sheet', by_sheet)


if __name__ == '__main__':
    main()
