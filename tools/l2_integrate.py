# L2 integration pass: consistent 1px dark outline, stray-pixel (halo speck) removal, bottom-slack trim so pieces sit flush.
# Originals are kept in assets_src/v12/integ_orig/ (idempotent: always processes from the originals).
import os, glob, shutil, numpy as np
from PIL import Image
OUT = (20, 12, 42, 255); ROOT = 'public/assets/l2/'; BK = 'assets_src/v12/integ_orig/'
GROUPS = {'props': True, 'env': True, 'items': False, 'fx': False, 'veh': False, 'swap': False}
SIGNS = ['tiles_10', 'tiles_21', 'tiles_25', 'tiles_35', 'tiles_38', 'tiles_39', 'tiles_40', 'tiles_41']
files = [(f, GROUPS[g]) for g in GROUPS for f in glob.glob(ROOT + g + '/*.png')] + [(ROOT + 'tiles/' + s + '.png', False) for s in SIGNS]
stats = []
for f, trim in files:
  bk = BK + f[len(ROOT):]; os.makedirs(os.path.dirname(bk), exist_ok=True)
  if not os.path.exists(bk): shutil.copy(f, bk)
  a = np.array(Image.open(bk).convert('RGBA')); op = a[..., 3] > 127
  a[..., 3] = np.where(op, 255, 0)  # no semi-transparent fringe
  P = np.pad(op, 1); nb = P[:-2, 1:-1].astype(int) + P[2:, 1:-1] + P[1:-1, :-2] + P[1:-1, 2:]
  sp = op & (nb <= 1); a[sp, 3] = 0; op &= ~sp  # isolated specks = cut-out halo noise
  P = np.pad(op, 1); ring = ~op & (P[:-2, 1:-1] | P[2:, 1:-1] | P[1:-1, :-2] | P[1:-1, 2:])
  if a.shape[0] * a.shape[1] > 120: a[ring] = OUT  # tiny sparks keep their glow shape
  if trim:
    rows = np.where(a[..., 3].any(1))[0]
    if len(rows): a = a[:rows[-1] + 1]
  Image.fromarray(a).save(f); stats.append((f, int(sp.sum()), int(ring.sum())))
print(len(stats), 'files; specks removed', sum(s[1] for s in stats), '; outline px', sum(s[2] for s in stats))
