"""v15 Fortress asset cutter: clean flood-fill cuts from ref/fortress_sheet.png + seamless gen mid.
Writes public/assets/ft/plat/*.png + plat.json (w/h/top/foot/prof)."""
from PIL import Image
import numpy as np, json, os, shutil
from scipy import ndimage as nd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = np.array(Image.open(os.path.join(ROOT, 'ref/fortress_sheet.png')).convert('RGB'))
BG = np.array([1, 15, 45], dtype=np.int16)
D = np.abs(S.astype(np.int16) - BG).max(2)
O = os.path.join(ROOT, 'public/assets/ft/plat/')
os.makedirs(O, exist_ok=True)

# Hand-tuned boxes: (x0,y0,x1,y1), erode
BOXES = {
  'p_long':   ((15, 227, 162, 302), 0),
  'p_tl':     ((16, 82, 111, 168), 1),
  'p_block':  ((13, 156, 118, 219), 1),
  'p_crystal':((118, 156, 205, 219), 1),
  'p_mural':  ((200, 156, 310, 210), 1),
  'p0':       ((323, 149, 420, 206), 1),
  'p1':       ((420, 149, 547, 206), 1),
  'p_slope':  ((320, 202, 450, 302), 0),
  'p_rail':   ((16, 292, 100, 340), 0),
  'p_rail2':  ((100, 292, 208, 340), 0),
  'p_thin':   ((67, 57, 140, 73), 0),
  'p_tiny':   ((560, 260, 620, 292), 0),
  'col_a':    ((559, 67, 614, 180), 0),
  'col_b':    ((631, 66, 718, 181), 0),
  'p_low':    ((16, 340, 201, 374), 0),
  'p_low2':   ((223, 340, 364, 375), 0),
  'p_low3':   ((552, 340, 626, 378), 0),
  'banner':   ((540, 186, 626, 254), 1),
  'p_hang':   ((454, 186, 540, 254), 1),
  'p_step':   ((245, 593, 341, 620), 0),
  'p_step2':  ((350, 594, 445, 620), 0),
}

def flood_cut(box, erode=0, keep_frac=0.08):
  x0, y0, x1, y1 = box
  rgb = S[y0:y1, x0:x1]; d = D[y0:y1, x0:x1]
  bgish = d <= 14; lab, _ = nd.label(bgish)
  edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
  bg = np.isin(lab, list(edge)); a = ~bg
  a = nd.binary_opening(a, iterations=1) | (a & (d > 50)); a = nd.binary_fill_holes(a)
  if erode > 0:
    core = nd.binary_erosion(a, iterations=erode)
    lab, n = nd.label(core)
    if n == 0: return None
    ar = nd.sum(core, lab, range(1, n + 1))
    a = nd.binary_dilation(lab == (1 + int(np.argmax(ar))), iterations=erode + 1) & (~bg)
    a = nd.binary_fill_holes(a)
  else:
    lab, n = nd.label(a)
    if n == 0: return None
    ar = nd.sum(a, lab, range(1, n + 1))
    keep = 1 + np.where(ar >= ar.max() * keep_frac)[0]
    a = np.isin(lab, keep)
  for _ in range(2):
    e = a & ~nd.binary_erosion(a); a[e & (d <= 28)] = False
  nb = nd.convolve(a.astype(int), np.ones((3, 3)), mode='constant') - a
  a[a & (nb <= 1)] = False
  if a.sum() < 40: return None
  ys, xs = np.where(a)
  return np.dstack([rgb, a.astype(np.uint8) * 255]).astype(np.uint8)[ys.min():ys.max()+1, xs.min():xs.max()+1]

def meta_of(im, k):
  h, w = im.shape[:2]; a = im[..., 3] > 0
  cols = a[:, max(1, w // 6): w - max(1, w // 6)]
  rows = cols.mean(1) if cols.size else a.mean(1)
  top = int(np.argmax(rows > 0.55)) if rows.size else 0
  r = a.mean(1); foot = int(len(r) - 1 - np.argmax(r[::-1] > 0.2))
  info = dict(w=int(w), h=int(h), top=int(top), foot=int(foot))
  if 'slope' in k:
    tp = np.array([int(np.argmax(a[:, x])) if a[:, x].any() else h for x in range(w)])
    tp = nd.median_filter(tp, 9); tp = nd.uniform_filter1d(tp.astype(float), 7)
    info['prof'] = [int(round(v)) for v in tp[::4]]
  return info

M = {}
for k, (box, er) in BOXES.items():
  im = flood_cut(box, erode=er)
  if im is None:
    print('FAIL', k); continue
  Image.fromarray(im).save(os.path.join(O, f'{k}.png'))
  M[k] = meta_of(im, k)
  print(f'{k:12s} {M[k]["w"]:3d}x{M[k]["h"]:3d} top={M[k]["top"]}')

# Derive left / right from p_long; mid from seamless gen (fallback: derived mid)
plong = Image.open(os.path.join(O, 'p_long.png'))
W, H = plong.size
lw = max(28, W * 28 // 100)
left = plong.crop((0, 0, lw, H))
right = plong.crop((W - lw, 0, W, H))
left.save(os.path.join(O, 'p_left.png')); M['p_left'] = meta_of(np.array(left), 'p_left')
right.save(os.path.join(O, 'p_right.png')); M['p_right'] = meta_of(np.array(right), 'p_right')

gen_mid = os.path.join(ROOT, 'audit/v15/fort/gen/p_mid.png')
if os.path.isfile(gen_mid):
  mid = Image.open(gen_mid).convert('RGBA')
  mid.save(os.path.join(O, 'p_mid.png'))
  M['p_mid'] = meta_of(np.array(mid), 'p_mid')
  print(f'{"p_mid":12s} {M["p_mid"]["w"]:3d}x{M["p_mid"]["h"]:3d} top={M["p_mid"]["top"]} (gen seamless)')
else:
  mid = plong.crop((lw - 4, 0, W - lw + 4, H * 70 // 100))
  mid.save(os.path.join(O, 'p_mid.png')); M['p_mid'] = meta_of(np.array(mid), 'p_mid')

# Aliases used by existing Fortress / PxTest keys
aliases = {
  'p_center': 'p_long',
  'p2': 'p_block',
  'p3': 'p_mural',
  'p4': 'p_long',
  'p5': 'p_tiny',
  'p6': 'p_step',
  'p7': 'p_step2',
  'p8': 'p_thin',
  'p_slope_a': 'p_slope',
}
for dst, src in aliases.items():
  shutil.copy2(os.path.join(O, f'{src}.png'), os.path.join(O, f'{dst}.png'))
  M[dst] = dict(M[src])
  if dst == 'p_slope_a' and 'prof' in M[src]:
    M[dst]['prof'] = list(M[src]['prof'])
# Mirrored slope_b
slope = Image.open(os.path.join(O, 'p_slope.png')).transpose(Image.FLIP_LEFT_RIGHT)
slope.save(os.path.join(O, 'p_slope_b.png'))
info = meta_of(np.array(slope), 'p_slope_b')
# flip profile
if 'prof' in M.get('p_slope', {}):
  info['prof'] = list(reversed(M['p_slope']['prof']))
M['p_slope_b'] = info

# p_crystal also as prop alias
json.dump(M, open(os.path.join(O, 'plat.json'), 'w'), indent=2)
print('TOTAL', len(M), '->', O)

# contact sheet
from PIL import ImageDraw
cs = Image.new('RGBA', (1600, 1100), (24, 24, 40, 255)); x = y = rh = 0; dr = ImageDraw.Draw(cs)
for k in M:
  im = Image.open(os.path.join(O, f'{k}.png'))
  if x + im.width + 8 > 1600: x = 0; y += rh + 16; rh = 0
  cs.paste(im, (x, y + 12), im if im.mode == 'RGBA' else None)
  dr.text((x, y), k, fill=(255, 255, 0, 255))
  if 'top' in M[k]:
    dr.line([x, y + 12 + M[k]['top'], x + im.width, y + 12 + M[k]['top']], fill=(255, 0, 0, 255))
  x += im.width + 8; rh = max(rh, im.height + 12)
cs.crop((0, 0, 1600, y + rh + 20)).convert('RGB').save(os.path.join(ROOT, 'audit/v15/fort/plat_contact.png'))
print('contact ok')
