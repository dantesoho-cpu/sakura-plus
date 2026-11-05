# Underwater Shrine Cave: segment Dante's ref/shrine_sheet.png into components (navy bg ~ (1,8,23)); writes a labelled
# contact sheet so pieces can be picked by id/bbox. Panels/labels handled by region masks.
from PIL import Image, ImageDraw; import numpy as np, json; from scipy import ndimage as nd
S=np.array(Image.open('ref/shrine_sheet.png').convert('RGB')).astype(int); BG=np.array([1,8,23])
d=np.abs(S-BG).max(2); m=d>26
m[:60]=0  # header
lab,n=nd.label(nd.binary_dilation(m,iterations=2)); objs=nd.find_objects(lab); R=[]
for i,sl in enumerate(objs):
  y0,y1,x0,x1=sl[0].start,sl[0].stop,sl[1].start,sl[1].stop
  if (m[sl]&(lab[sl]==i+1)).sum()<120: continue
  R.append(dict(id=len(R),b=[int(x0),int(y0),int(x1),int(y1)]))
json.dump(R,open('assets_src/v13/shrine/seg.json','w'))
im=Image.open('ref/shrine_sheet.png').convert('RGB'); dr=ImageDraw.Draw(im)
for r in R: x0,y0,x1,y1=r['b']; dr.rectangle([x0,y0,x1,y1],outline=(255,0,0)); dr.text((x0+1,y0+1),str(r['id']),fill=(255,255,0))
im.save('assets_src/v13/shrine/seg.png'); print(len(R))
