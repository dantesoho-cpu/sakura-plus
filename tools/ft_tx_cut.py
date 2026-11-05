#!/usr/bin/env python3
"""Extract EVERY connected component from Dante's 4 transparent Fortress sheets.
Alpha threshold (>=128→255 else 0), strip soft fringes, nearest-neighbor downscale,
write public/assets/ft/tx/*.png + atlas.json + contact sheet + usage stub.
"""
from __future__ import annotations
import json, os, math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'ref' / 'fortress_tx'
OUT = ROOT / 'public' / 'assets' / 'ft' / 'tx'
AUD = ROOT / 'audit' / 'v15' / 'fort' / 'tx'
OUT.mkdir(parents=True, exist_ok=True)
AUD.mkdir(parents=True, exist_ok=True)

# Uniform game scale: sheet platforms ~100–120px thick → ~40–48px; pillars fit 1–2 tiers.
SCALE = 0.40
MIN_PX = 120          # native opaque pixels before keep
MIN_BOX = 12          # min side after crop (native)

def hard_alpha(rgba: np.ndarray) -> np.ndarray:
    a = rgba[..., 3]
    hard = a >= 128
    # strip soft semi-transparent fringe: drop border-ish sparse pixels twice
    for _ in range(2):
        nb = nd.convolve(hard.astype(np.uint8), np.ones((3, 3), dtype=np.uint8), mode='constant')
        hard = hard & (nb >= 3)
    # drop 1px spur tips
    nb = nd.convolve(hard.astype(np.uint8), np.ones((3, 3), dtype=np.uint8), mode='constant') - hard.astype(np.uint8)
    hard = hard & (nb >= 2)
    hard = nd.binary_fill_holes(hard)
    return hard

def downscale_nn(im: Image.Image, scale: float) -> Image.Image:
    w, h = im.size
    nw, nh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
    return im.resize((nw, nh), Image.Resampling.NEAREST)

def walk_meta(a: np.ndarray):
    """top/foot + optional slope profile from opaque mask (game-scale)."""
    h, w = a.shape
    # prefer central columns for walk top (avoids tall side towers)
    c0, c1 = max(1, w // 8), w - max(1, w // 8)
    cols = a[:, c0:c1]
    rows = cols.mean(1) if cols.size else a.mean(1)
    top = int(np.argmax(rows > 0.45)) if rows.any() else 0
    r = a.mean(1)
    foot = int(len(r) - 1 - np.argmax(r[::-1] > 0.15)) if r.any() else h - 1
    info = dict(w=int(w), h=int(h), top=int(top), foot=int(foot))
    # slope-ish if top varies a lot across width
    tp = np.array([int(np.argmax(a[:, x])) if a[:, x].any() else h for x in range(w)])
    if w >= 24:
        tp_s = nd.median_filter(tp, min(9, w | 1))
        span = int(tp_s.max() - tp_s.min())
        if span >= max(8, h * 0.18):
            tp_s = nd.uniform_filter1d(tp_s.astype(float), min(7, w))
            info['prof'] = [int(round(v)) for v in tp_s[:: max(1, w // 32)]]
            info['kind_hint'] = 'slope'
    return info

def classify(w: int, h: int, a: np.ndarray, info: dict) -> str:
    ar = w / max(1, h)
    fill = float(a.mean())
    # tall thin → pillar/spire
    if h >= w * 1.8 and h >= 60:
        return 'pillar'
    if 'prof' in info and ar >= 1.2:
        return 'slope'
    # short wide thin → platform / rail
    if ar >= 2.2 and h <= 90:
        return 'plat'
    if ar >= 1.6 and h <= 110 and fill > 0.35:
        return 'plat'
    # stair-like: medium, has stepped top
    if 'prof' in info and 0.7 <= ar <= 2.5:
        return 'stair'
    # large set piece
    if w * h >= 14000 or (w >= 160 and h >= 120):
        return 'set'
    if w * h >= 8000 and h >= 90:
        return 'set'
    # banner-ish tall thin-ish with low fill
    if h > w * 1.3 and h >= 40 and fill < 0.55:
        return 'banner'
    # small decor
    if w * h < 2500:
        return 'decor'
    if ar < 0.85 and h >= 50:
        return 'pillar'
    return 'arch' if ar >= 0.9 and h >= 70 else 'decor'

def extract_sheet(path: Path, sheet_i: int):
    rgba = np.array(Image.open(path).convert('RGBA'))
    hard = hard_alpha(rgba)
    lab, n = nd.label(hard)
    pieces = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if ys.size < MIN_PX:
            continue
        x0, x1 = int(xs.min()), int(xs.max())
        y0, y1 = int(ys.min()), int(ys.max())
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        if bw < MIN_BOX or bh < MIN_BOX:
            continue
        crop = rgba[y0:y1 + 1, x0:x1 + 1].copy()
        mask = lab[y0:y1 + 1, x0:x1 + 1] == i
        # hard alpha on this component only
        out = crop.copy()
        out[..., 3] = np.where(mask, 255, 0).astype(np.uint8)
        # zero RGB outside (cleaner atlas)
        out[~mask, :3] = 0
        im = Image.fromarray(out, 'RGBA')
        im_s = downscale_nn(im, SCALE)
        a = np.array(im_s)[..., 3] > 0
        if a.sum() < 20:
            continue
        # trim empty after scale
        ys2, xs2 = np.where(a)
        im_s = im_s.crop((xs2.min(), ys2.min(), xs2.max() + 1, ys2.max() + 1))
        a = np.array(im_s)[..., 3] > 0
        info = walk_meta(a)
        kind = classify(info['w'], info['h'], a, info)
        info['kind'] = kind
        info['sheet'] = sheet_i
        info['src'] = [x0, y0, x1 + 1, y1 + 1]
        info['native'] = [bw, bh]
        pieces.append((im_s, info))
    # sort reading order: top-to-bottom, left-to-right
    pieces.sort(key=lambda t: (t[1]['src'][1] // 40, t[1]['src'][0]))
    return pieces

def contact_sheet(atlas: dict, out_path: Path, cols=10):
    keys = sorted(atlas.keys(), key=lambda k: (atlas[k]['sheet'], int(k.split('_')[1])))
    # cell size from max piece (capped)
    cell_w = min(220, max(48, max(atlas[k]['w'] for k in keys) + 8))
    cell_h = min(200, max(48, max(atlas[k]['h'] for k in keys) + 18))
    # adaptive grid
    n = len(keys)
    cols = max(6, min(cols, int(math.ceil(math.sqrt(n * cell_h / cell_w)))))
    rows = int(math.ceil(n / cols))
    # shrink cells if canvas too huge
    max_w, max_h = 3600, 4800
    cell_w = min(cell_w, max_w // cols)
    cell_h = min(cell_h, max_h // rows)
    cs = Image.new('RGBA', (cols * cell_w, rows * cell_h), (10, 6, 22, 255))
    dr = ImageDraw.Draw(cs)
    for i, k in enumerate(keys):
        r, c = divmod(i, cols) if False else (i // cols, i % cols)
        x, y = c * cell_w, r * cell_h
        im = Image.open(OUT / f'{k}.png')
        # fit
        sc = min((cell_w - 6) / im.width, (cell_h - 16) / im.height, 1.0)
        if sc < 1:
            im = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.Resampling.NEAREST)
        px = x + (cell_w - im.width) // 2
        py = y + 14 + (cell_h - 16 - im.height) // 2
        cs.alpha_composite(im, (px, py))
        kind = atlas[k]['kind']
        dr.text((x + 2, y + 1), f'{k} {kind}', fill=(255, 230, 120, 255))
        if 'top' in atlas[k]:
            ty = py + int(atlas[k]['top'] * (im.height / atlas[k]['h']))
            dr.line([px, ty, px + im.width, ty], fill=(255, 60, 80, 200))
    cs.convert('RGB').save(out_path, quality=90)
    return out_path

def main():
    # clear previous tx pngs (keep dir)
    for p in OUT.glob('*.png'):
        p.unlink()
    atlas = {}
    counts = {'plat': 0, 'slope': 0, 'stair': 0, 'pillar': 0, 'set': 0, 'arch': 0, 'banner': 0, 'decor': 0}
    idx_global = 0
    for si in range(1, 5):
        path = SRC / f'sheet{si}.png'
        pieces = extract_sheet(path, si)
        print(f'sheet{si}: {len(pieces)} pieces')
        for local_i, (im, info) in enumerate(pieces):
            key = f's{si}_{local_i:03d}'
            im.save(OUT / f'{key}.png')
            info['key'] = key
            info['used'] = False
            info['placements'] = []
            atlas[key] = info
            counts[info['kind']] = counts.get(info['kind'], 0) + 1
            idx_global += 1
    meta = {
        'scale': SCALE,
        'alpha_threshold': 128,
        'sheets': 4,
        'total': len(atlas),
        'by_kind': counts,
        'keys': sorted(atlas.keys()),
    }
    with open(OUT / 'atlas.json', 'w') as f:
        json.dump({'meta': meta, 'frames': atlas}, f, indent=1)
    # also flat plat-compat mirror for walk pieces
    plat_compat = {k: {kk: vv for kk, vv in v.items() if kk in ('w', 'h', 'top', 'foot', 'prof', 'kind')} for k, v in atlas.items()}
    with open(OUT / 'plat.json', 'w') as f:
        json.dump(plat_compat, f, indent=1)
    cs = contact_sheet(atlas, AUD / 'atlas_contact.jpg')
    print('TOTAL', len(atlas), 'by_kind', counts)
    print('contact', cs)
    # write usage stub (all unused)
    usage = {k: {'kind': atlas[k]['kind'], 'used': 0, 'at': []} for k in atlas}
    with open(OUT / 'usage.json', 'w') as f:
        json.dump({'total': len(atlas), 'used': 0, 'pieces': usage}, f, indent=1)

if __name__ == '__main__':
    main()
