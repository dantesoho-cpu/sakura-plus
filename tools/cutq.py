# Cut-quality audit: per used prop PNG, score crude-cut artefacts:
#  speck = opaque pixels in tiny detached components; fringe = edge pixels close to sheet bg (navy) or white matte;
#  semi = partial-alpha pixels (soft matte halos in a hard-pixel art style).
import numpy as np, glob, json, sys, re, os
from PIL import Image; from scipy import ndimage as nd
BG = np.array([[255, 255, 255], [236, 236, 236]], float)
def score(p):
    a = np.asarray(Image.open(p).convert('RGBA')).astype(float); al = a[..., 3]; op = al > 40
    if op.sum() < 30: return None
    lab, n = nd.label(op, structure=np.ones((3, 3))); sz = nd.sum(op, lab, range(1, n + 1)); big = sz.max()
    speck = float(sz[sz < max(6, big * 0.01)].sum()) / op.sum()
    edge = op & ~nd.binary_erosion(op); rgb = a[..., :3][edge]
    d = np.min(np.linalg.norm(rgb[:, None, :] - BG[None], axis=2), axis=1); fringe = float((d < 22).mean()) if len(d) else 0
    semi = float(((al > 10) & (al < 200)).sum()) / op.sum()
    return dict(speck=round(speck, 4), fringe=round(fringe, 4), semi=round(semi, 4), score=round(speck * 4 + fringe + semi, 4))
if __name__ == '__main__':
    src = open('src/scenes/Level2.ts').read() + open('src/scenes/l2Tiers.ts').read() + open('src/scenes/Level1.ts').read() + ''.join(open(f).read() for f in glob.glob('src/scenes/l1*.ts'))
    res = {}
    for p in glob.glob('public/assets/**/*.png', recursive=True):
        if re.search(r'/(bg|music|ui|fx|player|player2|sakura|intro|tiles)/', p): continue
        s = score(p)
        if s: res[p] = s
    w = sorted(res.items(), key=lambda kv: -kv[1]['score'])
    json.dump(dict(w), open(sys.argv[1] if len(sys.argv) > 1 else '/tmp/cutq.json', 'w'), indent=0)
    for k, v in w[:30]: print(v, k)
    print('n', len(res), 'bad(score>0.25)', sum(1 for _, v in w if v['score'] > 0.25))
