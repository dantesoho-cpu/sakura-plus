#!/usr/bin/env python3
"""Rebuild Fortress atlases from sheet source crops with HQ downscale.

ROOT FIX: replace NEAREST×0.40 + hard alpha with:
  premultiplied-alpha Lanczos (or BOX/area) → soft edges → exact game size → runtime scale 1.0

Does NOT touch Sakura / L1–L3 assets.
"""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'ref' / 'fortress_tx'
OUT_TX = ROOT / 'public' / 'assets' / 'ft' / 'tx'
OUT_TX2 = ROOT / 'public' / 'assets' / 'ft' / 'tx2'
AUD = ROOT / 'audit' / 'v26' / 'choppy'
AUD.mkdir(parents=True, exist_ok=True)

# Slightly higher than old 0.40 so painterly detail survives; still fits tier spacing.
SCALE = 0.48
BOSS_DISPLAY_SCALE = 1.35  # bake boss at former runtime size so setScale=1.0

SHEET_FILES = {
  1: 'sheet1.png', 2: 'sheet2.png', 3: 'sheet3.png', 4: 'sheet4.png',
  5: 'sheet5_collectibles.png', 6: 'sheet6_interactables.png',
  7: 'sheet7_enemies1.png', 8: 'sheet8_enemies2_turrets.png', 9: 'sheet9_fx.png',
}

def load_sheet(n: int) -> Image.Image:
  return Image.open(SRC / SHEET_FILES[n]).convert('RGBA')

def hq_downscale(im: Image.Image, tw: int, th: int) -> Image.Image:
  """Premultiplied-alpha Lanczos resize — no dark halos, soft painterly edges."""
  if tw < 1: tw = 1
  if th < 1: th = 1
  arr = np.array(im, dtype=np.float32)
  a = arr[..., 3:4] / 255.0
  arr[..., :3] *= a  # premultiply
  # pad 1px transparent to reduce edge clamp artifacts
  pad = np.zeros((arr.shape[0] + 2, arr.shape[1] + 2, 4), dtype=np.float32)
  pad[1:-1, 1:-1] = arr
  pim = Image.fromarray(np.clip(pad, 0, 255).astype(np.uint8), 'RGBA')
  # Lanczos on premultiplied
  r = pim.resize((tw + 2, th + 2), Image.Resampling.LANCZOS)
  out = np.array(r, dtype=np.float32)[1:-1, 1:-1]
  a2 = out[..., 3:4]
  # unpremultiply where alpha > 0
  mask = a2[..., 0] > 1e-3
  out[mask, :3] = np.clip(out[mask, :3] / (a2[mask, 0:1] / 255.0), 0, 255)
  out[~mask, :3] = 0
  # Soft alpha: keep Lanczos alpha (anti-aliased). Light cleanup of near-zero dust.
  out[..., 3] = np.where(out[..., 3] < 8, 0, out[..., 3])
  return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')

def content_bbox(im: Image.Image, thr=8):
  a = np.array(im)[..., 3]
  ys, xs = np.where(a > thr)
  if len(xs) == 0:
    return im
  return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

def walk_meta(im: Image.Image):
  a = (np.array(im)[..., 3] > 32).astype(np.float32)
  h, w = a.shape
  c0, c1 = max(1, w // 8), w - max(1, w // 8)
  cols = a[:, c0:c1]
  rows = cols.mean(1) if cols.size else a.mean(1)
  top = int(np.argmax(rows > 0.35)) if rows.any() else 0
  r = a.mean(1)
  foot = int(len(r) - 1 - np.argmax(r[::-1] > 0.12)) if r.any() else h - 1
  return dict(w=int(w), h=int(h), top=int(top), foot=int(foot))

def rebuild_from_atlas(atlas_path: Path, out_dir: Path, sheet_map: dict, scale: float = SCALE):
  data = json.loads(atlas_path.read_text())
  frames = data['frames']
  sheets_cache = {}
  n_ok = 0
  for key, fr in frames.items():
    src = fr.get('src')
    sheet_n = fr.get('sheet')
    if not src or sheet_n is None:
      continue
    if sheet_n not in sheets_cache:
      sheets_cache[sheet_n] = load_sheet(int(sheet_n))
    sh = sheets_cache[sheet_n]
    x0, y0, x1, y1 = src
    crop = sh.crop((x0, y0, x1, y1))
    crop = content_bbox(crop)
    nw = max(1, int(round(crop.width * scale)))
    nh = max(1, int(round(crop.height * scale)))
    hq = hq_downscale(crop, nw, nh)
    hq = content_bbox(hq)
    out_path = out_dir / f'{key}.png'
    hq.save(out_path)
    meta = walk_meta(hq)
    fr.update(meta)
    fr['native'] = [crop.width, crop.height]
    fr['scale_hq'] = scale
    fr['filter'] = 'lanczos_premul'
    n_ok += 1
  data['meta'] = data.get('meta') or {}
  data['meta']['scale'] = scale
  data['meta']['filter'] = 'lanczos_premul'
  data['meta']['rebuild'] = 'v26_hq'
  atlas_path.write_text(json.dumps(data, indent=2))
  return n_ok

def rebuild_boss():
  """Bake boss composite at former on-screen size so runtime scale is 1.0."""
  # Prefer recomposing from HQ turret/en parts after they're rebuilt
  from PIL import ImageOps
  def load(folder, k):
    return Image.open(OUT_TX2 / folder / f'{k}.png').convert('RGBA')
  def paste(canvas, spr, cx, cy, sc=1.0, flip=False):
    if sc != 1.0:
      spr = spr.resize((max(1, int(spr.width * sc)), max(1, int(spr.height * sc))), Image.Resampling.LANCZOS)
    if flip:
      spr = ImageOps.mirror(spr)
    canvas.alpha_composite(spr, (int(cx - spr.width / 2), int(cy - spr.height / 2)))

  # Compose at a generous size then HQ-scale to display size
  W, H = 320, 180
  canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
  body, wing, pod, pod2, avian, saucer = (
    load('turret', 's8_061'), load('en', 's7_008'), load('turret', 's8_025'),
    load('turret', 's8_024'), load('en', 's7_042'), load('turret', 's8_026'),
  )
  paste(canvas, wing, 80, 90, 1.2, True)
  paste(canvas, wing, 240, 90, 1.2, False)
  paste(canvas, pod, 55, 125, 0.9, True)
  paste(canvas, pod, 265, 125, 0.9, False)
  paste(canvas, body, 160, 95, 1.1)
  paste(canvas, saucer, 160, 78, 0.6)
  paste(canvas, avian, 110, 45, 0.6, True)
  paste(canvas, avian, 210, 45, 0.6, False)
  paste(canvas, pod2, 125, 40, 0.5)
  paste(canvas, pod2, 195, 40, 0.5)
  canvas = content_bbox(canvas)
  # Bake to previous on-screen size (~276*1.35 ≈ 372)
  tw = max(1, int(round(canvas.width * BOSS_DISPLAY_SCALE)))
  th = max(1, int(round(canvas.height * BOSS_DISPLAY_SCALE)))
  # If canvas already ~ game size from HQ parts, just ensure ~360-400 wide
  if canvas.width < 300:
    canvas = hq_downscale(canvas, tw, th)
  else:
    # already large enough from 0.48 parts — mild adjust to ~380 wide
    target_w = 380
    sc = target_w / canvas.width
    canvas = hq_downscale(canvas, target_w, max(1, int(round(canvas.height * sc))))
  canvas = content_bbox(canvas)
  boss_dir = ROOT / 'public' / 'assets' / 'ft' / 'boss'
  canvas.save(boss_dir / 'boss0.png')
  canvas.save(boss_dir / 'boss_0.png')
  # phase tints
  def tint(im, rgb, amt):
    out = np.array(im)
    m = out[..., 3] > 0
    t = np.array(rgb, dtype=np.float32)
    o = out.astype(np.float32)
    o[m, :3] = o[m, :3] * (1 - amt) + t * amt
    out[m, :3] = np.clip(o[m, :3], 0, 255).astype(np.uint8)
    return Image.fromarray(out)
  tint(canvas, (255, 100, 180), 0.28).save(boss_dir / 'boss_p2.png')
  tint(canvas, (255, 200, 80), 0.32).save(boss_dir / 'boss_p3.png')
  canvas.resize((canvas.width * 2, canvas.height * 2), Image.Resampling.NEAREST).save(AUD / 'boss_hq_x2.png')
  return canvas.size

def rebuild_deck_lip():
  """HQ deck lip from fill_lip / crops — soft brass band, no white fringe scrub."""
  deck = ROOT / 'public' / 'assets' / 'ft' / 'deck'
  # Prefer hi-res fill_lip if present; else regenerate from sheet fill crops
  src = deck / 'fill_lip.png'
  if src.exists():
    im = Image.open(src).convert('RGBA')
    # Take top brass rows (~24 native of fill_lip) and HQ scale to ~14px tall walk lip
    top = im.crop((0, 0, im.width, min(28, im.height)))
    for i, name in enumerate(['deck_mid_00', 'deck_mid_01', 'deck_mid_02']):
      # slight x-offset variants
      shift = (i * 17) % max(1, top.width - 64)
      tile = Image.new('RGBA', (64, top.height), (0, 0, 0, 0))
      tile.paste(top.crop((shift, 0, min(shift + 64, top.width), top.height)), (0, 0))
      if tile.width < 64:
        tile.paste(top.crop((0, 0, 64 - tile.width, top.height)), (tile.width, 0))
      hq = hq_downscale(tile, 64, 14)
      hq.save(deck / f'{name}.png')
  # fill_lip_top
  if src.exists():
    im = Image.open(src).convert('RGBA')
    top = im.crop((0, 0, im.width, 16))
    hq_downscale(top, 96, 14).save(deck / 'fill_lip_top.png')
  print('deck lips rebuilt HQ')

def main():
  print('Rebuild TX sheets 1-4…')
  n1 = rebuild_from_atlas(OUT_TX / 'atlas.json', OUT_TX, SHEET_FILES, SCALE)
  print(f'  tx: {n1} frames')
  for cat, sheet in [('collect', 5), ('interact', 6), ('en', 7), ('turret', 8), ('fx', 9)]:
    ap = OUT_TX2 / cat / 'atlas.json'
    if not ap.exists():
      continue
    n = rebuild_from_atlas(ap, OUT_TX2 / cat, SHEET_FILES, SCALE if cat != 'fx' else 0.50)
    print(f'  tx2/{cat}: {n} frames')
  rebuild_deck_lip()
  bw = rebuild_boss()
  print('boss baked', bw)
  print('DONE v26 HQ rebuild')

if __name__ == '__main__':
  main()
