# Clean residual crude-cut artefacts in prop PNGs, sheet pixels untouched otherwise:
#  1) drop detached specks (components < 1.5% of the largest that sit > 2px from the main body)
#  2) strip a 1px white-matte fringe (near-white edge pixels touching transparency) on non-light props
#  3) snap partial alpha to hard 0/255 (hi-bit style)
import numpy as np, glob, sys, json
from PIL import Image; from scipy import ndimage as nd
DIRS = ['deco', 'props', 'props2', 'plat', 'l2/props', 'l2/rg', 'l2/veh', 'l2/plat', 'l2/env', 'l2/curve', 'l2/items']
log = {}
for d in DIRS:
    for p in glob.glob(f'public/assets/{d}/*.png'):
        im = Image.open(p).convert('RGBA'); a = np.asarray(im).copy(); al = a[..., 3]; op = al > 40
        if op.sum() < 40: continue
        ch = {}
        lab, n = nd.label(op, structure=np.ones((3, 3)))
        if n > 1:
            sz = nd.sum(op, lab, range(1, n + 1)); main = np.isin(lab, np.where(sz >= sz.max() * 0.05)[0] + 1)
            near = nd.binary_dilation(main, iterations=2); kill = op & ~main & ~near
            H, W = op.shape; border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
            for i in border:
                if sz[i - 1] < sz.max() * 0.05: kill |= lab == i
            near6 = nd.binary_dilation(main, iterations=6)
            for i in range(1, n + 1):
                if sz[i - 1] < sz.max() * 0.05 and not (near6 & (lab == i)).any(): kill |= lab == i
            # re-define main as the largest piece for the far test

            if kill.sum(): a[kill, 3] = 0; ch['speck'] = int(kill.sum())
        op = a[..., 3] > 40; edge = op & ~nd.binary_erosion(op); rgb = a[..., :3].astype(int)
        white = edge & (rgb.min(-1) > 225) & ((rgb.max(-1) - rgb.min(-1)) < 18)
        light = (rgb[op].mean() > 175)
        if white.sum() and not light and white.sum() < edge.sum() * 0.5: a[white, 3] = 0; ch['fringe'] = int(white.sum())
        semi = (a[..., 3] > 0) & (a[..., 3] < 255)
        if semi.sum() and 'veh' not in p: a[..., 3] = np.where(a[..., 3] > 110, 255, 0); ch['semi'] = int(semi.sum())
        if ch: Image.fromarray(a).save(p); log[p] = ch
json.dump(log, open('audit/v12/cutclean_log.json', 'w'), indent=0); print(len(log), 'files cleaned'); print(sorted(log.items(), key=lambda kv: -sum(kv[1].values()))[:12])
