#!/usr/bin/env python3
"""v20: regenerate Air Fortress under-deck fill tiles from Dante's fill_gen + crops_fill.
Strip studio wash, force seamless edges, darker deep variants, steel lip + pit edges.
Sources ONLY: ref/fortress_tx/fill_gen/*.jpg and crops_fill/*.png
"""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path('/workspace/sakura')
GEN = ROOT / 'ref/fortress_tx/fill_gen'
CROPS = ROOT / 'ref/fortress_tx/crops_fill'
DECK = ROOT / 'public/assets/ft/deck'
AUD = ROOT / 'audit/v20/fort'
AUD.mkdir(parents=True, exist_ok=True)

TW, TH = 96, 96  # larger than 64 → less obvious repeat when tileSprite'd


def to_rgb(im: Image.Image) -> Image.Image:
    if im.mode == 'RGBA':
        a = np.array(im)
        rgb = a[..., :3].astype(np.float32)
        alpha = a[..., 3:4].astype(np.float32) / 255.0
        # composite onto dark steel void (never purple studio)
        bg = np.array([28, 24, 36], dtype=np.float32)
        out = rgb * alpha + bg * (1 - alpha)
        return Image.fromarray(out.astype(np.uint8), 'RGB')
    return im.convert('RGB')


def make_seamless(tile: np.ndarray, blend: int = 16) -> np.ndarray:
    """Crossfade opposite edges so tileSprite repeats cleanly."""
    h, w = tile.shape[:2]
    b = min(blend, w // 4, h // 4)
    out = tile.astype(np.float32).copy()
    # horizontal
    for i in range(b):
        t = (i + 1) / (b + 1)
        left = out[:, i]
        right = out[:, w - b + i]
        # blend left edge toward right-edge content mirrored
        src = out[:, w - 1 - i]
        out[:, i] = left * (1 - t) + src * t
        out[:, w - 1 - i] = src * (1 - t) + left * t
    # vertical
    for i in range(b):
        t = (i + 1) / (b + 1)
        top = out[i].copy()
        bot = out[h - 1 - i].copy()
        out[i] = top * (1 - t) + bot * t
        out[h - 1 - i] = bot * (1 - t) + top * t
    return np.clip(out, 0, 255).astype(np.uint8)


def sample_patch(src: Image.Image, tw: int, th: int, ox: int, oy: int, scale: float = 0.35) -> Image.Image:
    """Crop a region from hi-res bulk and downscale for pixel density."""
    sw, sh = src.size
    cw, ch = int(tw / scale), int(th / scale)
    ox = max(0, min(ox, sw - cw))
    oy = max(0, min(oy, sh - ch))
    crop = src.crop((ox, oy, ox + cw, oy + ch))
    # slight contrast bump, then nearest for crunchy steel
    crop = ImageEnhance.Contrast(crop).enhance(1.15)
    crop = ImageEnhance.Color(crop).enhance(0.92)
    return crop.resize((tw, th), Image.Resampling.LANCZOS)


def darken(im: Image.Image, mul: float = 0.55, bias: int = -8) -> Image.Image:
    a = np.array(im).astype(np.float32) * mul + bias
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB')


def crush_purple_wash(im: Image.Image) -> Image.Image:
    """Pull mid lavender wash toward cool steel so fill reads as metal not void."""
    a = np.array(im).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # lavender-ish: B high, R~G mid
    lav = (b > r + 15) & (b > g + 10) & (b > 90) & (r > 60)
    # shift toward steel grey-blue
    a[lav, 0] = r[lav] * 0.55 + 40
    a[lav, 1] = g[lav] * 0.55 + 38
    a[lav, 2] = b[lav] * 0.7 + 30
    # crush near-white specular noise that made fill look "whitey"
    bright = (r > 200) & (g > 200) & (b > 200)
    a[bright] = a[bright] * 0.55 + np.array([70, 68, 78])
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB')


def lip_from_bulk(src: Image.Image) -> Image.Image:
    """Horizontal under-deck lip: dark plate + warm gold edge hint from bulk beams."""
    sw, sh = src.size
    # sample a horizontal band rich in beams (upper-mid of bulk a)
    band = src.crop((40, 80, sw - 40, 80 + 220)).resize((TW * 3, 72), Image.Resampling.LANCZOS)
    band = crush_purple_wash(band)
    # take one tile width, enhance top rim
    tile = band.crop((TW, 0, TW * 2, 64)).resize((TW, TH), Image.Resampling.NEAREST)
    a = np.array(tile).astype(np.float32)
    # paint a thin gold/amber lip on top rows (matches deck underglow)
    for y in range(0, 6):
        t = 1 - y / 6
        a[y] = a[y] * (1 - 0.55 * t) + np.array([210, 160, 60]) * (0.55 * t)
    # darken body below lip so it tucks under deck
    a[8:] *= 0.72
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB')


def edge_strip(src: Image.Image, side: str) -> Image.Image:
    sw, sh = src.size
    if side == 'L':
        crop = src.crop((0, 100, 180, sh - 100))
    else:
        crop = src.crop((sw - 180, 100, sw, sh - 100))
    crop = crop.resize((24, TH * 2), Image.Resampling.LANCZOS)
    crop = crush_purple_wash(crop)
    crop = darken(crop, 0.7, -5)
    # take TH tall seamless-ish slice
    a = np.array(crop.crop((0, 20, 24, 20 + TH)))
    a = make_seamless(a, blend=8)
    # darken outer pit-facing edge, keep inner denser
    if side == 'L':
        for x in range(8):
            a[:, x] = (a[:, x].astype(np.float32) * (0.45 + 0.55 * x / 8)).astype(np.uint8)
    else:
        for x in range(8):
            a[:, 23 - x] = (a[:, 23 - x].astype(np.float32) * (0.45 + 0.55 * x / 8)).astype(np.uint8)
    return Image.fromarray(a, 'RGB')


def main():
    bulks = [to_rgb(Image.open(GEN / f'ft_fill_bulk_{k}.jpg')) for k in 'abc']
    # also pull a denser crop from crops_fill mid structures if available
    extra = []
    for name in ['s1_c1.png', 's2_c1.png', 's3_c1.png', 's4_c1.png']:
        p = CROPS / name
        if p.exists():
            extra.append(to_rgb(Image.open(p)))

    offsets = [
        (80, 120, 0.32), (400, 200, 0.30), (200, 500, 0.34),
        (600, 80, 0.28), (100, 700, 0.33), (500, 450, 0.31),
    ]
    fills, deeps = [], []
    for i in range(3):
        src = bulks[i % len(bulks)]
        ox, oy, sc = offsets[i]
        patch = sample_patch(src, TW, TH, ox, oy, sc)
        # blend a bit of crop detail for sheet-derived identity
        if extra:
            ex = extra[i % len(extra)]
            ew, eh = ex.size
            ec = sample_patch(ex, TW, TH, ew // 4, eh // 5, 0.45)
            pa = np.array(patch).astype(np.float32)
            ea = np.array(ec).astype(np.float32)
            # keep bulk dominant; sprinkle crop structure
            mix = pa * 0.78 + ea * 0.22
            patch = Image.fromarray(np.clip(mix, 0, 255).astype(np.uint8), 'RGB')
        patch = crush_purple_wash(patch)
        arr = make_seamless(np.array(patch), blend=18)
        fill = Image.fromarray(arr, 'RGB')
        # slightly darken overall so sky purple doesn't compete
        fill = darken(fill, 0.88, -6)
        fills.append(fill)
        deep = darken(fill, 0.52, -18)
        # deepen further + cool cast
        da = np.array(deep).astype(np.float32)
        da[..., 0] *= 0.9
        da[..., 2] = np.clip(da[..., 2] * 1.05 + 4, 0, 255)
        deep = Image.fromarray(np.clip(da, 0, 255).astype(np.uint8), 'RGB')
        deeps.append(Image.fromarray(make_seamless(np.array(deep), blend=14), 'RGB'))

    # lip + edges from bulk a (richest beams)
    lip = lip_from_bulk(bulks[0])
    lip = Image.fromarray(make_seamless(np.array(lip), blend=12), 'RGB')
    edge_L = edge_strip(bulks[1], 'L')
    edge_R = edge_strip(bulks[1], 'R')

    # write
    DECK.mkdir(parents=True, exist_ok=True)
    out_files = {}
    for i, im in enumerate(fills):
        p = DECK / f'fill_{i:02d}.png'
        im.save(p); out_files[p.name] = im.size
    for i, im in enumerate(deeps):
        p = DECK / f'fill_deep_{i:02d}.png'
        im.save(p); out_files[p.name] = im.size
    lip.save(DECK / 'fill_lip.png'); out_files['fill_lip.png'] = lip.size
    edge_L.save(DECK / 'fill_edge_L.png'); out_files['fill_edge_L.png'] = edge_L.size
    edge_R.save(DECK / 'fill_edge_R.png'); out_files['fill_edge_R.png'] = edge_R.size

    # update deck.json frame sizes
    meta_path = DECK / 'deck.json'
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {'frames': {}}
    frames = meta.get('frames', meta)
    for key, kind in [
        ('fill_00', 'fill'), ('fill_01', 'fill'), ('fill_02', 'fill'),
        ('fill_deep_00', 'fill'), ('fill_deep_01', 'fill'), ('fill_deep_02', 'fill'),
        ('fill_lip', 'fill_lip'), ('fill_edge_L', 'fill_edge'), ('fill_edge_R', 'fill_edge'),
    ]:
        im = Image.open(DECK / f'{key}.png')
        frames[key] = {'w': im.width, 'h': im.height, 'top': 0, 'foot': im.height - 1, 'kind': kind, 'role': 'fill'}
    if 'frames' in meta:
        meta['frames'] = frames
    else:
        meta = {'frames': frames}
    meta_path.write_text(json.dumps(meta, indent=1))

    # contact sheet proof
    contact = Image.new('RGB', (TW * 6 + 40, TH * 2 + 60), (12, 10, 18))
    for i, im in enumerate(fills + deeps):
        contact.paste(im, (10 + (i % 6) * TW, 20 + (i // 6) * TH))
    # tiled preview strip
    strip = Image.new('RGB', (TW * 4, TH * 3), (12, 10, 18))
    for y in range(3):
        for x in range(4):
            strip.paste(fills[x % 3] if y < 2 else deeps[x % 3], (x * TW, y * TH))
    contact.save(AUD / 'fill_contact_v20.png')
    strip.save(AUD / 'fill_tile_preview_v20.png')
    lip.save(AUD / 'fill_lip_v20.png')
    print('Wrote', out_files)
    print('Preview', AUD / 'fill_contact_v20.png')


if __name__ == '__main__':
    main()
