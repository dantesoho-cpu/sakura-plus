# Rank used world props/tiles by crude-cut artefacts: clipped edges, jagged alpha, pinholes, bg-colour halo, + cutq score.
import json, numpy as np; from PIL import Image; from scipy import ndimage as nd
U = json.load(open('audit/v12/used_files.json')); Q = json.load(open('audit/v12/cutq_after.json'))
SKIP = ('player', 'sakura/', '/en/', 'enemy', 'enemies', '/fx', 'ui', 'boss', 'items', 'intro', '/bg/', 'cloud', 'L_')
out = []
for f, e in U.items():
    if any(s in f for s in SKIP) or e['sf'] is None or e['sf'] < 0.95: continue
    a = np.asarray(Image.open(f).convert('RGBA')).astype(int); m = a[..., 3] > 127; A = m.sum()
    if A < 150: continue
    tile = '/tiles' in f or '/plat' in f
    clip = 0 if tile else max(m[0].mean(), m[:, 0].mean(), m[:, -1].mean())
    sm = nd.median_filter(m.astype(np.uint8), 5).astype(bool); jag = (sm ^ m).sum() / max(1, (m ^ nd.binary_erosion(m)).sum())
    holes = (nd.binary_fill_holes(m) & ~m).sum() / A
    edge = m & ~nd.binary_erosion(m); rgb = a[..., :3][edge]
    halo = (((np.abs(rgb - [1, 14, 37]).max(1) < 20) & (np.abs(rgb - [14, 10, 34]).max(1) > 3) | (rgb.min(1) > 225)).mean()) if len(rgb) else 0
    s = 1.5 * clip + 1.2 * jag + 3 * holes + halo + Q.get(f, {}).get('score', 0)
    out.append(dict(f=f, s=round(s, 3), clip=round(clip, 3), jag=round(jag, 3), holes=round(holes, 4), halo=round(halo, 3), lv=e['lv'], n=e['n'], wh=[a.shape[1], a.shape[0]]))
out.sort(key=lambda d: -d['s']); json.dump(out, open('audit/v12/crude_rank.json', 'w'), indent=0)
for d in out[:45]: print(d['s'], d['clip'], d['jag'], d['holes'], d['halo'], d['lv'], d['wh'], d['f'])
print(len(out))
