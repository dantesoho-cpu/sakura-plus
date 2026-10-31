# Level 2 in-use texture audit: game texture next to its neokyo_sheet.png source crop.
import json, os, re
from PIL import Image, ImageDraw
SH = Image.open('ref/neokyo_sheet.png').convert('RGBA'); M = json.load(open('public/assets/l2/manifest.json'))
T = json.load(open('audit/v12/assets/tex.json'))['m']; L2 = 'public/assets/l2/'
EN = {'drone': (795, 752, 870, 800), 'sentry': (870, 752, 935, 850), 'assault': (935, 752, 1000, 850), 'shield': (1000, 752, 1070, 850), 'heavy': (1070, 752, 1140, 850)}
def resolve(k):
  for pre, d, mk in [('l2t_', 'tiles/tiles_', 'tiles_'), ('l2_tiles_', 'tiles/tiles_', 'tiles_'), ('l2e_', 'env/env_', 'env_'), ('l2f_', 'fx/fx_', 'fx_'), ('l2i_', 'items/items_', 'items_'), ('l2pr_', 'props/props_', 'props_'), ('l2_veh_', 'veh/veh_', 'veh_'), ('l2_boss_', 'boss/boss_', 'boss_')]:
    if k.startswith(pre): n = k[len(pre):]; return L2 + d + n + '.png', M.get(mk + n), 'sheet crop'
  if k.startswith('l2r_'): return L2 + 'rg/' + k[4:] + '.png', None, 'sheet regen (rg)'
  if k.startswith('l2p_'): return L2 + 'plat/' + k[4:] + '.png', M.get('tiles_44'), 'assembled from sheet deck crops'
  if k.startswith('l2c_'): return L2 + 'curve/' + k[4:] + '.png', M.get('tiles_16'), 'regen from sheet ramp/deck crops'
  if k.startswith('nk_'): u = k.split('_')[1]; e = EN[u]; return L2 + f'en/{u}_0.png', [e[0], e[1], e[2] - e[0], e[3] - e[1]], 'regen from sheet robot'
  if k in ('flash', 'spark', 'spark2', 'pk_rapid', 'pk_power'): return L2 + 'swap/' + k + '.png', None, 'L2 swap -> sheet fx/items crop'
  if k == 'pk_cannon': return 'public/assets/fx/pk_cannon.png', None, 'sheet cannon icon'
  if k == 'p_idle6': return 'public/assets/sakura/idle6.png', None, 'Sakura (shared with L1)'
  if k in ('petal', 'pip', 'pk_heart', 'pr_jetboots'): return f'public/assets/fx/{k}.png' if k != 'pr_jetboots' else None, None, 'L1 art (kept: Sakura/HUD identity)'
  if k in ('glow', 'px'): return None, None, 'procedural (soft light / particle dot)'
  return None, None, 'procedural / runtime (' + k[:12] + ')'
rows = []
for k, n in sorted(T.items(), key=lambda t: t[0]):
  if re.match(r'^[0-9a-f]{8}-', k): continue  # runtime canvases (text)
  f, crop, cls = resolve(k); rows.append((k, n, f, crop, cls))
cw, ch, cols = 150, 92, 6; H = ((len(rows) + cols - 1) // cols) * ch
g = Image.new('RGBA', (cw * cols, H), (24, 16, 44, 255)); d = ImageDraw.Draw(g)
for i, (k, n, f, crop, cls) in enumerate(rows):
  x, y = (i % cols) * cw, (i // cols) * ch
  if f and os.path.exists(f):
    im = Image.open(f).convert('RGBA'); im.thumbnail((70, 62)); g.alpha_composite(im, (x + 2, y + 2))
  if crop:
    c = SH.crop((crop[0], crop[1], crop[0] + crop[2], crop[1] + crop[3])); c.thumbnail((70, 62)); g.alpha_composite(c, (x + 76, y + 2))
  col = (255, 120, 120) if cls.startswith('procedural') else (255, 230, 120)
  d.text((x + 2, y + 66), f'{k} x{n}', fill=(255, 255, 255)); d.text((x + 2, y + 78), cls[:24], fill=col)
g.save('audit/v12/assets/contact_sheet.png')
json.dump([dict(key=k, uses=n, file=f, sheet_crop=crop, cls=cls) for k, n, f, crop, cls in rows], open('audit/v12/assets/contact_sheet.json', 'w'), indent=1)
print(len(rows), g.size, sum(r[4].startswith('procedural') for r in rows))
