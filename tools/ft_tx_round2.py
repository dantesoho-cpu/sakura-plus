#!/usr/bin/env python3
"""Round 2: modular deck tileset from gen+palette + extract sheets 5-9.
Sheets 5-8: hard alpha threshold + fringe strip (like sheets 1-4).
Sheet 9 FX: soft-glow preserving extract (keep alpha falloff, strip dark boxes).
Writes:
  public/assets/ft/deck/*  + deck.json
  public/assets/ft/tx2/{collect,interact,en,turret,fx}/* + atlases
  audit contact sheets + usage_all.json covering sheets 1-9
"""
from __future__ import annotations
import json, math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'ref' / 'fortress_tx'
AUD = ROOT / 'audit' / 'v15' / 'fort' / 'tx'
DECK = ROOT / 'public' / 'assets' / 'ft' / 'deck'
TX2 = ROOT / 'public' / 'assets' / 'ft' / 'tx2'
TX1 = ROOT / 'public' / 'assets' / 'ft' / 'tx'
GEN = AUD / 'gen'
SCALE = 0.40
SCALE_FX = 0.45

SHEETS = [
    (5, 'sheet5_collectibles.png', 'collect', 'hard'),
    (6, 'sheet6_interactables.png', 'interact', 'hard'),
    (7, 'sheet7_enemies1.png', 'en', 'hard'),
    (8, 'sheet8_enemies2_turrets.png', 'turret', 'hard'),
    (9, 'sheet9_fx.png', 'fx', 'soft'),
]

def load_palette():
    p = np.load(AUD / 'deck_palette.npy')
    # also pull golds/ambers from refs more aggressively
    extras = []
    for i in range(6):
        im = np.array(Image.open(AUD / f'deck_ref_{i}.png').convert('RGB'))
        # sample bright pixels (lights/gold)
        lum = im.astype(np.int16).sum(2)
        bright = im.reshape(-1, 3)[lum.reshape(-1) > 280]
        if len(bright):
            q = (bright // 12) * 12
            from collections import Counter
            for c, _ in Counter(map(tuple, q)).most_common(20):
                extras.append(c)
    pal = np.unique(np.vstack([p, np.array(extras, dtype=np.uint8)]), axis=0)
    return pal.astype(np.int16)

def remap_palette(rgb: np.ndarray, pal: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    flat = rgb.reshape(-1, 3).astype(np.int16)
    out = np.zeros_like(flat)
    # chunk to avoid huge memory
    step = 50000
    for i0 in range(0, len(flat), step):
        chunk = flat[i0:i0+step]
        # distances to palette
        d = ((chunk[:, None, :] - pal[None, :, :]) ** 2).sum(2)
        out[i0:i0+step] = pal[d.argmin(1)]
    return out.reshape(h, w, 3).astype(np.uint8)

def matte_from_bg(rgb: np.ndarray) -> np.ndarray:
    """Remove near-white / near-black studio backgrounds from gens."""
    r, g, b = rgb[..., 0].astype(np.int16), rgb[..., 1].astype(np.int16), rgb[..., 2].astype(np.int16)
    # white-ish bg
    white = (r > 230) & (g > 230) & (b > 230)
    # pure black corners sometimes
    black = (r < 8) & (g < 8) & (b < 8)
    # also very light gray
    light = (r > 210) & (g > 210) & (b > 210) & (np.abs(r.astype(int)-g) < 12) & (np.abs(g.astype(int)-b) < 12)
    mask = ~(white | light)
    # keep dark steel that isn't pure black edge void: if surrounded by content, keep
    # drop isolated black only if near image border OR large void
    # For mid tile on black bg: black IS background
    # Detect dominant bg by corners
    corners = [rgb[0,0], rgb[0,-1], rgb[-1,0], rgb[-1,-1]]
    bg = np.median(corners, axis=0)
    if bg.mean() < 40:
        # black background — mask near-black far from colored steel
        sat = np.max(rgb,2).astype(int) - np.min(rgb,2).astype(int)
        mask = ~((r < 18) & (g < 18) & (b < 22) & (sat < 10))
    return mask

def hard_alpha(rgba: np.ndarray) -> np.ndarray:
    a = rgba[..., 3]
    hard = a >= 128
    for _ in range(2):
        nb = nd.convolve(hard.astype(np.uint8), np.ones((3, 3), np.uint8), mode='constant')
        hard = hard & (nb >= 3)
    nb = nd.convolve(hard.astype(np.uint8), np.ones((3, 3), np.uint8), mode='constant') - hard.astype(np.uint8)
    hard = hard & (nb >= 2)
    hard = nd.binary_fill_holes(hard)
    return hard

def soft_alpha_mask(rgba: np.ndarray) -> np.ndarray:
    """FX: keep luminous soft glow; strip dark rectangular fringes."""
    a = rgba[..., 3]
    rgb = rgba[..., :3].astype(np.int16)
    lum = rgb.sum(2)
    # keep pixels with meaningful alpha OR bright glow
    keep = (a >= 24) | ((a >= 8) & (lum > 80))
    # remove dark near-opaque fringe (soft dark boxes around FX)
    dark_fringe = (a >= 40) & (a < 200) & (lum < 60)
    keep = keep & ~dark_fringe
    # morphological open tiny speckles
    keep = nd.binary_opening(keep, iterations=1)
    keep = nd.binary_dilation(keep, iterations=1)  # preserve glow halo a bit
    return keep

def downscale_nn(im: Image.Image, scale: float) -> Image.Image:
    w, h = im.size
    nw, nh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
    return im.resize((nw, nh), Image.Resampling.NEAREST)

def extract_components(path: Path, mode: str, min_px=100, min_box=10, scale=SCALE):
    rgba = np.array(Image.open(path).convert('RGBA'))
    if mode == 'soft':
        mask = soft_alpha_mask(rgba)
        lab, n = nd.label(mask)
    else:
        hard = hard_alpha(rgba)
        lab, n = nd.label(hard)
    pieces = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if ys.size < min_px:
            continue
        x0, x1 = int(xs.min()), int(xs.max())
        y0, y1 = int(ys.min()), int(ys.max())
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        if bw < min_box or bh < min_box:
            continue
        crop = rgba[y0:y1 + 1, x0:x1 + 1].copy()
        m = lab[y0:y1 + 1, x0:x1 + 1] == i
        out = crop.copy()
        if mode == 'soft':
            # preserve original alpha inside mask; zero outside
            out[~m, 3] = 0
            out[~m, :3] = 0
            # boost visibility slightly on mid alphas
            aa = out[..., 3].astype(np.float32)
            aa = np.clip(aa * 1.15, 0, 255)
            out[..., 3] = aa.astype(np.uint8)
        else:
            out[..., 3] = np.where(m, 255, 0).astype(np.uint8)
            out[~m, :3] = 0
        im = Image.fromarray(out, 'RGBA')
        im_s = downscale_nn(im, scale)
        a = np.array(im_s)[..., 3] > 0
        if a.sum() < 16:
            continue
        ys2, xs2 = np.where(a)
        im_s = im_s.crop((xs2.min(), ys2.min(), xs2.max() + 1, ys2.max() + 1))
        arr = np.array(im_s)
        info = {
            'w': im_s.width, 'h': im_s.height,
            'src': [x0, y0, x1 + 1, y1 + 1],
            'native': [bw, bh],
            'mode': mode,
        }
        # foot/top for standing
        aa = arr[..., 3] > (20 if mode == 'soft' else 0)
        if aa.any():
            rows = aa.mean(1)
            info['top'] = int(np.argmax(rows > 0.2))
            info['foot'] = int(len(rows) - 1 - np.argmax(rows[::-1] > 0.15))
        pieces.append((im_s, info))
    pieces.sort(key=lambda t: (t[1]['src'][1] // 40, t[1]['src'][0]))
    return pieces

def classify_cat(cat: str, w, h, info):
    ar = w / max(1, h)
    area = w * h
    if cat == 'collect':
        if area < 400: return 'shard'
        if ar > 1.2 and h < 40: return 'ring'
        if 'heart' in '' : pass
        return 'collect'
    if cat == 'interact':
        if h > w * 1.4 and h >= 50: return 'door'
        if area >= 5000: return 'gate'
        if w < 40 and h < 40: return 'button'
        return 'interact'
    if cat == 'en':
        if area >= 8000: return 'heavy'
        if ar >= 1.3 and h <= 50: return 'flyer'
        if h > w: return 'trooper'
        return 'enemy'
    if cat == 'turret':
        if area >= 10000: return 'mech'
        if ar < 1.1 and h < 80: return 'turret'
        if ar >= 1.4: return 'saucer'
        return 'enemy'
    if cat == 'fx':
        if h > w * 2 and h >= 60: return 'beam'
        if ar > 1.5 and h < 40: return 'bolt'
        if area >= 6000: return 'burst'
        return 'fx'
    return cat

def contact(keys_imgs, out_path: Path, cols=10, label=''):
    if not keys_imgs:
        return
    cell_w = min(160, max(40, max(im.width for _, im in keys_imgs) + 8))
    cell_h = min(160, max(40, max(im.height for _, im in keys_imgs) + 16))
    n = len(keys_imgs)
    cols = max(4, min(cols, int(math.ceil(math.sqrt(n * cell_h / max(1, cell_w))))))
    rows = int(math.ceil(n / cols))
    cs = Image.new('RGBA', (cols * cell_w, rows * cell_h), (8, 6, 18, 255))
    dr = ImageDraw.Draw(cs)
    for i, (k, im) in enumerate(keys_imgs):
        r, c = i // cols, i % cols
        x, y = c * cell_w, r * cell_h
        sc = min((cell_w - 6) / im.width, (cell_h - 14) / im.height, 1.0)
        if sc < 1:
            im2 = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.Resampling.NEAREST)
        else:
            im2 = im
        px = x + (cell_w - im2.width) // 2
        py = y + 12 + (cell_h - 14 - im2.height) // 2
        cs.alpha_composite(im2.convert('RGBA'), (px, py))
        dr.text((x + 2, y + 1), k[:18], fill=(255, 230, 120, 255))
    cs.convert('RGB').save(out_path, quality=90)

def process_deck(pal):
    DECK.mkdir(parents=True, exist_ok=True)
    frames = {}
    # Mid strip: matte, remap, cut into repeatable tiles
    mid = np.array(Image.open(GEN / 'mid_raw.jpg').convert('RGB'))
    mask = matte_from_bg(mid)
    # crop to content bbox
    ys, xs = np.where(mask)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    mid_c = mid[y0:y1+1, x0:x1+1]
    mask_c = mask[y0:y1+1, x0:x1+1]
    rem = remap_palette(mid_c, pal)
    rgba = np.dstack([rem, np.where(mask_c, 255, 0).astype(np.uint8)])
    im = Image.fromarray(rgba, 'RGBA')
    # game scale: want deck height ~56-72px thick
    target_h = 64
    sc = target_h / im.height
    # but width for seamless tile ~64-96
    im_s = im.resize((max(32, int(round(im.width * sc))), target_h), Image.Resampling.NEAREST)
    # slice into ~64px wide tiles from mid body (skip ragged ends a bit)
    tw = 64
    margin = max(8, im_s.width // 10)
    usable = im_s.crop((margin, 0, im_s.width - margin, im_s.height))
    tiles = []
    for i, x in enumerate(range(0, max(1, usable.width - tw), tw)):
        tile = usable.crop((x, 0, x + tw, usable.height))
        key = f'deck_mid_{i:02d}'
        tile.save(DECK / f'{key}.png')
        frames[key] = {'w': tile.width, 'h': tile.height, 'top': 0, 'foot': tile.height - 1, 'kind': 'deck_mid', 'role': 'ground'}
        tiles.append((key, tile))
        if i >= 5:
            break
    # also save a long seamless strip for preview (3 tiles)
    if tiles:
        strip = Image.new('RGBA', (tw * 3, target_h), (0, 0, 0, 0))
        for j in range(3):
            strip.paste(tiles[j % len(tiles)][1], (j * tw, 0))
        strip.save(AUD / 'deck_test_strip.png')

    # Caps / ramps from gens
    for name, kind_prefix in [('caps_raw.jpg', 'cap'), ('ramps_raw.jpg', 'ramp')]:
        rgb = np.array(Image.open(GEN / name).convert('RGB'))
        mask = matte_from_bg(rgb)
        rgba = np.dstack([remap_palette(rgb, pal), np.where(mask, 255, 0).astype(np.uint8)])
        # extract CCs
        lab, n = nd.label(mask)
        parts = []
        for i in range(1, n + 1):
            ys, xs = np.where(lab == i)
            if ys.size < 800:
                continue
            x0, x1 = int(xs.min()), int(xs.max())
            y0, y1 = int(ys.min()), int(ys.max())
            if (x1 - x0) < 40 or (y1 - y0) < 30:
                continue
            crop = rgba[y0:y1+1, x0:x1+1].copy()
            m = lab[y0:y1+1, x0:x1+1] == i
            crop[~m, 3] = 0
            parts.append((ys.size, Image.fromarray(crop, 'RGBA')))
        parts.sort(reverse=True)
        for i, (_, im) in enumerate(parts[:6]):
            sc = 64 / im.height
            nw, nh = max(16, int(round(im.width * sc))), 64
            im2 = im.resize((nw, nh), Image.Resampling.NEAREST)
            # trim
            a = np.array(im2)[..., 3] > 0
            if not a.any():
                continue
            ys, xs = np.where(a)
            im2 = im2.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
            key = f'deck_{kind_prefix}_{i:02d}'
            im2.save(DECK / f'{key}.png')
            frames[key] = {'w': im2.width, 'h': im2.height, 'top': 0, 'foot': im2.height - 1,
                           'kind': f'deck_{kind_prefix}', 'role': 'ground' if 'cap' in kind_prefix or kind_prefix=='cap' else 'ramp'}
    with open(DECK / 'deck.json', 'w') as f:
        json.dump({'meta': {'source': 'gen+palette', 'target_h': 64}, 'frames': frames}, f, indent=1)
    contact([(k, Image.open(DECK / f'{k}.png')) for k in frames], AUD / 'deck_contact.jpg', cols=6)
    print('DECK tiles', len(frames), list(frames)[:8])
    return frames

def extract_all_new():
    TX2.mkdir(parents=True, exist_ok=True)
    all_frames = {}
    usage = {}
    for si, fname, cat, mode in SHEETS:
        out_dir = TX2 / cat
        out_dir.mkdir(parents=True, exist_ok=True)
        path = SRC / fname
        scale = SCALE_FX if mode == 'soft' else SCALE
        pieces = extract_components(path, mode, min_px=(60 if mode=='soft' else 100), scale=scale)
        print(f'{fname}: {len(pieces)} pieces ({mode})')
        keys_imgs = []
        cat_frames = {}
        for i, (im, info) in enumerate(pieces):
            key = f's{si}_{i:03d}'
            kind = classify_cat(cat, info['w'], info['h'], info)
            info.update({'key': key, 'sheet': si, 'cat': cat, 'kind': kind})
            im.save(out_dir / f'{key}.png')
            cat_frames[key] = info
            all_frames[key] = info
            usage[key] = {'kind': kind, 'cat': cat, 'sheet': si, 'used': 0, 'at': []}
            keys_imgs.append((key, im))
        with open(out_dir / 'atlas.json', 'w') as f:
            json.dump({'meta': {'sheet': si, 'file': fname, 'mode': mode, 'total': len(cat_frames)}, 'frames': cat_frames}, f, indent=1)
        contact(keys_imgs, AUD / f'atlas_s{si}_{cat}.jpg', cols=10)
    with open(TX2 / 'atlas_all.json', 'w') as f:
        json.dump({'meta': {'sheets': [5,6,7,8,9], 'total': len(all_frames)}, 'frames': all_frames}, f, indent=1)
    with open(TX2 / 'usage.json', 'w') as f:
        json.dump({'total': len(usage), 'used': 0, 'pieces': usage}, f, indent=1)
    print('TX2 TOTAL', len(all_frames))
    return all_frames, usage

def merge_usage():
    """Combine sheet1-4 usage with sheet5-9 stub into usage_all.json."""
    u1 = json.load(open(TX1 / 'usage.json'))
    u2 = json.load(open(TX2 / 'usage.json'))
    pieces = {}
    for k, v in u1.get('pieces', u1).items() if 'pieces' in u1 else u1.items():
        if k in ('total', 'used', 'placements', 'by_kind'):
            continue
        pieces[k] = {**v, 'sheet': v.get('sheet') or int(k.split('_')[0][1:])}
    for k, v in u2['pieces'].items():
        pieces[k] = v
    used = sum(1 for v in pieces.values() if v.get('used', 0) > 0)
    out = {
        'total': len(pieces),
        'used': used,
        'by_sheet': {},
        'pieces': pieces,
    }
    for k, v in pieces.items():
        s = v.get('sheet', 0)
        out['by_sheet'].setdefault(str(s), {'total': 0, 'used': 0})
        out['by_sheet'][str(s)]['total'] += 1
        if v.get('used', 0) > 0:
            out['by_sheet'][str(s)]['used'] += 1
    with open(AUD / 'usage_all.json', 'w') as f:
        json.dump(out, f, indent=1)
    print('USAGE_ALL', out['total'], 'used', out['used'], 'by_sheet', out['by_sheet'])
    return out

def main():
    pal = load_palette()
    print('palette', len(pal))
    process_deck(pal)
    extract_all_new()
    merge_usage()

if __name__ == '__main__':
    main()
