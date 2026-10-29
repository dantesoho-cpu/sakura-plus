# Akari Valley Zone — large Sonic-style multi-tier zone generator -> src/scenes/level1Map.ts
# Tiers (surface rows): T0 ground 88 · T1 62 · T2 36 · T3 sky islands 14.  Route L->R, branches climb/drop and rejoin.
# chars: # solid  = one-way stone ledge  H bridge deck (one-way, bridge art)  w waterfall top  f flower  J jet pickup  P start
#        d b t enemies  K boss  S shrine  T torii  C car  G gate  R r trees  L lantern  B bush  A arch  F fence
import json
W, H = 480, 96
g = [['.'] * W for _ in range(H)]
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H: g[y][x] = c
def box(x0, x1, y0, y1, c='#'):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1): put(x, y, c)
def clear(x0, x1, y0, y1): box(x0, x1, y0, y1, '.')
def ledge(x, y, n=4, c='='):
    for i in range(n): put(x + i, y, c)
on = lambda x, y, c: put(x, y - 1, c)          # place entity standing on surface row y
JET, DBL = [], []
# ---------- T0 ground: organic profile with 45° (/ \) and 22.5° (u U rising, n N falling) slopes ----------
def fill(x, top):
    for y in range(top, H): put(x, y, '#')
PITS = []; PITX = set()
def terrain(spec, cur=88):
    x = 0
    for kind, n in spec:
        for _ in range(n):
            if kind == 'flat': fill(x, cur); x += 1
            elif kind == 'pit': PITS.append(x) if not PITS or PITS[-1] != x - 1 else None; PITX.add(x); x += 1
            elif kind == 'up45': cur -= 1; put(x, cur, '/'); fill(x, cur + 1); x += 1
            elif kind == 'dn45': put(x, cur, '\\'); fill(x, cur + 1); cur += 1; x += 1
            elif kind == 'up22': cur -= 1; put(x, cur, 'u'); put(x + 1, cur, 'U'); fill(x, cur + 1); fill(x + 1, cur + 1); x += 2
            elif kind == 'dn22': put(x, cur, 'n'); put(x + 1, cur, 'N'); fill(x, cur + 1); fill(x + 1, cur + 1); cur += 1; x += 2
    assert x == W and cur == 88, (x, cur)
terrain([('flat', 30), ('up22', 2), ('flat', 4), ('dn45', 2), ('flat', 20), ('pit', 9), ('flat', 15), ('up45', 3), ('flat', 6), ('dn22', 1), ('flat', 3), ('dn45', 2),
         ('flat', 46), ('pit', 11), ('flat', 15), ('up22', 2), ('flat', 6), ('dn22', 2), ('flat', 6), ('up45', 2), ('up22', 3), ('flat', 8), ('dn45', 2), ('dn22', 3),
         ('flat', 32), ('pit', 10), ('flat', 10), ('up45', 1), ('flat', 2), ('up45', 1), ('flat', 8), ('dn22', 2), ('flat', 8), ('up22', 4), ('flat', 4), ('dn45', 4),
         ('flat', 18), ('pit', 9), ('flat', 21), ('up45', 2), ('flat', 2), ('dn22', 1), ('dn45', 1), ('flat', 3), ('up22', 4), ('flat', 6), ('dn45', 4), ('flat', 96)])
box(0, 1, 0, H - 1); box(W - 1, W, 0, H - 1)       # edge walls
ledge(60, 88, 9, 'H')                               # bridge over the first lake
ledge(150, 86, 3); ledge(251, 85, 3); ledge(329, 86, 3)
# secret pockets inside hills (drop in through a gap in the cap), each with a memory flower
def top(x): return next(y for y in range(H) if g[y][x] != '.')
def pocket(x0, x1):
    t = min(top(x) for x in range(x0, x1)); cols = [x for x in range(x0, x1) if top(x) == t and g[t][x] == '#']
    p0, p1 = cols[0], cols[-1]; d = min(3, 87 - t - 1)
    clear(p0 + 1, p1, t + 1, t + d); clear(p1 - 2, p1, t, t); put(p0 + 2, t + d, 'f')
pocket(190, 222); pocket(366, 392)
# ---------- T1 slab (rows 62-64) ----------
T1 = [(20, 56), (74, 140), (172, 240), (266, 322), (346, 404)]
for a, b in T1: box(a, b, 62, 64)
# ---------- T2 slab (rows 36-38) ----------
T2 = [(44, 100), (120, 196), (222, 298), (324, 392)]
for a, b in T2: box(a, b, 36, 38)
ledge(100, 36, 20, 'H')                             # sky bridge between T2 spans
ledge(298, 36, 26, 'H')
ledge(140, 62, 32, 'H')                             # mid bridge across waterfall gorge
# ---------- T3 sky islands ----------
T3 = [(66, 78), (146, 158), (240, 252), (352, 364)]
for a, b in T3: box(a, b, 14, 15)
# ---------- connectors ----------
def ladder(x, y_from, y_to, side=1, last='dbl'):
    """one-way ledges zig-zagging up from surface y_from; top ledge exactly GAP rows below y_to. returns (top_row, top_x)"""
    gap = 10 if last == 'jet' else 5; ys = []; y = y_to + gap
    while y < y_from - 2: ys.append(y); y += 4
    tx = x
    for i, y in enumerate(reversed(ys)):
        lx = x + (3 if (len(ys) - 1 - i) % 2 == 0 else 0) * side; ledge(lx, y, 4)
        if y == ys[0]: tx = lx
    return ys[0], tx
LADX = []
def climb(edge_x, y_low, y_high, last, side=-1):
    # ladder hugging the left edge of an upper slab (side=-1 -> ledges left of edge)
    x = edge_x - (5 if last == 'dbl' else 7) if side < 0 else edge_x + 1
    LADX.append(x)
    top, tx = ladder(x, y_low, y_high, 1, last)
    (JET if last == 'jet' else DBL).append([tx + 1, top, edge_x + (1 if side < 0 else -2), y_high])
climb(20, 88, 62, 'dbl')        # intro: easy climb to T1
climb(44, 62, 36, 'jet')        # first jet shaft (right after pickup) -> T2
climb(172, 88, 62, 'dbl'); climb(120, 62, 36, 'dbl'); climb(222, 62, 36, 'jet')
climb(266, 88, 62, 'jet'); climb(346, 88, 62, 'dbl'); climb(324, 62, 36, 'jet')
# sky islands: from T2 a ladder then jet
for a, b in T3:
    x = a - 7; LADX.append(x); top, tx = ladder(x, 36, 14, 1, 'jet'); JET.append([tx + 1, top, a + 1, 14])
# jet-only shafts inside T1->T2 (pure vertical, two walls)
box(110, 111, 39, 61); ledge(106, 46, 4); JET.append([107, 46, 112, 36])
# ---------- maze fill: floating stone islands, hanging chunks, pillars (seeded, keeps ladders/shafts clear) ----------
import random; R = random.Random(7)
def free(x0, x1, y0, y1):
    if any(abs(x0 - lx) < 12 or abs(x1 - lx) < 6 for lx in LADX): return False
    return all(g[y][x] == '.' for y in range(max(0, y0 - 3), min(H, y1 + 4)) for x in range(max(0, x0 - 2), min(W, x1 + 2)))
for band in [(70, 80), (44, 54), (20, 28)]:
    x = 8
    while x < 400:
        w = R.randint(5, 10); y = R.randint(*band)
        if free(x, x + w, y, y + 1):
            if R.random() < 0.55: box(x, x + w, y, y + 1)
            else: ledge(x, y, w)
            if R.random() < 0.3: put(x + w // 2, y - 1, 'B' if R.random() < .5 else 'L')
        x += w + R.randint(6, 14)
# slab undersides: stepped hanging chunks under T1/T2
for segs, y in [(T1, 65), (T2, 39)]:
    for a, b in segs:
        for x in range(a + 3, b - 6, R.randint(9, 13)):
            if free(x, x + 3, y + 1, y + 2): box(x, x + R.randint(2, 4), y, y + R.randint(0, 2))
# support pillars from ground to T1 at a few spans
for x in [84, 228, 320, 392]:
    if all(g[y][x] == '.' for y in range(65, 88)): box(x, x + 2, 65, 87)
# ---------- waterfalls (drops between tiers) ----------
for x in [58, 64, 142, 164, 244, 330, 336]: put(x, 30 if x in (142, 244) else 50, 'w')
for x in [58, 64]: pass
# ---------- landmarks / props ----------
on(4, 88, 'P'); on(22, 88, 'J'); on(10, 88, 'R'); on(48, 88, 'L'); on(16, 88, 'B'); on(80, 88, 'F'); on(112, 88, 'A')
on(230, 88, 'S'); on(226, 88, 'L'); on(236, 88, 'L')
on(452, 88, 'T'); on(462, 88, 'G'); on(472, 88, 'C')
box(404, 470, 62, 64)                         # arena ceiling
on(440, 83, 'K')
for x, y, c in [(90, 62, 'r'), (130, 62, 'R'), (190, 62, 'B'), (280, 62, 'A'), (360, 62, 'F'), (60, 36, 'R'), (170, 36, 'L'), (250, 36, 'B'), (380, 36, 'r'), (140, 88, 'B'), (290, 88, 'R'), (316, 88, 'F'), (400, 88, 'L')]: on(x, y, c)
# ---------- flowers (10 memory fragments) ----------
for x, y in [(40, 62), (70, 14), (96, 36), (150, 14), (246, 14), (300, 62), (358, 14), (388, 36)]: on(x, y, 'f')
# 2 placed in alcoves above
# ---------- Kurogen forces: quiet start, rising pressure ----------
ens = [(102, 88, 'b'), (120, 80, 'd'), (165, 88, 'b'), (200, 58, 'd'), (215, 62, 'b'), (186, 86, 't'),
       (245, 80, 'd'), (280, 86, 'b'), (285, 56, 'd'), (305, 84, 't'), (316, 88, 'b'), (340, 30, 'd'), (350, 62, 'b'), (362, 86, 't'),
       (380, 56, 'd'), (392, 88, 'b'), (396, 78, 'd'), (160, 36, 'b'), (270, 36, 'b'), (360, 36, 't'), (130, 30, 'd')]
for x, y, c in ens:
    if c == 'd': put(x, y, 'd')
    else: on(x, y, c)
rows = [''.join(r) for r in g]
assert sum(r.count('f') for r in rows) == 10, sum(r.count('f') for r in rows)
open('src/scenes/level1Map.ts', 'w').write('// generated by tools/build_level.py — do not hand edit\n'
    '// reach checks [fromCol, fromRow(surface), toCol, toRow(surface)]\n'
    f'export const JET_CHECKS = {json.dumps(JET)};\nexport const DBL_CHECKS = {json.dumps(DBL)};\n'
    'export const LEVEL1 = [\n' + ''.join(f"  {json.dumps(r)},\n" for r in rows) + '];\n')
# overview png
from PIL import Image
col = {'/': (120, 90, 120), '\\': (120, 90, 120), 'u': (120, 90, 120), 'U': (120, 90, 120), 'n': (120, 90, 120), 'N': (120, 90, 120), '#': (70, 60, 90), '=': (200, 170, 140), 'H': (160, 110, 70), 'f': (255, 90, 200), 'w': (90, 200, 255), '.': (150, 200, 235)}
im = Image.new('RGB', (W, H))
for y, r in enumerate(rows):
    for x, c in enumerate(r): im.putpixel((x, y), col.get(c, (255, 220, 0)))
im.resize((W * 3, H * 3), Image.NEAREST).save('audit/_map_schematic.png'); print('ok', len(JET), len(DBL))
