"""Level 2 (NEO-KYO) asset cutter: segments Dante's ref/neokyo_sheet.png into sprites.
mask = colour distance from the navy sheet background; components grouped with a small dilation;
alpha from a stricter mask; 1px fringe pass removes dark-navy edge pixels (no background leftovers)."""
from PIL import Image; import numpy as np, json, os, sys
from scipy import ndimage as nd
S=np.array(Image.open('ref/neokyo_sheet.png').convert('RGB')).astype(int)
BG=np.array([1,14,37])
dist=np.abs(S-BG).max(2)
lum=S.mean(2)
SECT={ # name: (x0,y0,x1,y1) in sheet px; filled by --probe
}
def comps(box,grow=3,thr=30,minA=60):
  x0,y0,x1,y1=box; m=dist[y0:y1,x0:x1]>thr
  g=nd.binary_dilation(m,iterations=grow); lab,n=nd.label(g); out=[]
  for i,sl in enumerate(nd.find_objects(lab)):
    if sl is None: continue
    h=sl[0].stop-sl[0].start; w=sl[1].stop-sl[1].start
    if (m[sl]&(lab[sl]==i+1)).sum()<minA: continue
    out.append((x0+sl[1].start,y0+sl[0].start,x0+sl[1].stop,y0+sl[0].stop,lab[sl]==i+1))
  return out
def cut(b,keep):
  x0,y0,x1,y1=b; rgb=S[y0:y1,x0:x1]; d=dist[y0:y1,x0:x1]
  st=(d>34)&keep
  # solid silhouette: close small gaps then fill interior holes (dark girder interiors stay opaque)
  a=(nd.binary_fill_holes(nd.binary_closing(np.pad(st,3),iterations=2))[3:-3,3:-3]&nd.binary_dilation(keep,iterations=1)).astype(np.uint8)
  # fringe: edge pixels that are dark & navy-ish -> transparent (2 passes)
  for _ in range(2):
    edge=a.astype(bool)&~nd.binary_erosion(a.astype(bool))
    dark=(rgb.max(2)<70)&(rgb[...,2]>=rgb[...,0])
    a[edge&dark]=0
  a=nd.binary_opening(a.astype(bool),structure=np.ones((1,1)))  # no-op hook
  im=np.dstack([rgb,a*255]).astype(np.uint8)
  ys,xs=np.where(a)
  if not len(ys): return None
  return Image.fromarray(im[ys.min():ys.max()+1,xs.min():xs.max()+1])
if __name__=='__main__':
  cfg=json.load(open('tools/l2_sections.json'))
  man={}
  for name,box in cfg['sections'].items():
    os.makedirs(f'public/assets/l2/{name}',exist_ok=True)
    cs=sorted(comps(box,cfg.get('grow',{}).get(name,3)),key=lambda c:(c[1]//40,c[0]))
    k=0
    for (a,b,c,d,keep) in cs:
      key=f'{name}_{k:02d}'
      if key in cfg.get('drop',[]): k+=1; continue
      im=cut((a,b,c,d),keep)
      if im is None or im.width<6 or im.height<6: continue
      im.save(f'public/assets/l2/{name}/{key}.png'); man[key]=[a,b,im.width,im.height]; k+=1
  json.dump(man,open('public/assets/l2/manifest.json','w'))
  print(len(man))
