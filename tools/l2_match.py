import json,numpy as np; from PIL import Image
S=np.asarray(Image.open('ref/neokyo_sheet.png').convert('RGB')).astype(float); d='public/assets/l2/rg/'; M=json.load(open(d+'rg.json'))
for q in M:
  b=np.asarray(Image.open(d+q['k']+'.png').convert('RGBA')).astype(float); m=b[...,3]>0; h,w=m.shape; x0,y0=q['src'][:2]; best=(1e18,x0,y0)
  for dy in range(-45,46,1):
    for dx in range(-45,46,1):
      X,Y=x0+dx,y0+dy
      if X<0 or Y<0 or Y+h>S.shape[0] or X+w>S.shape[1]: continue
      e=(((S[Y:Y+h,X:X+w]-b[...,:3])**2).sum(2)*m).sum()
      if e<best[0]: best=(e,X,Y)
  q['src']=[best[1],best[2],best[1]+w,best[2]+h]; q['err']=round(best[0]/m.sum()**1)
json.dump(M,open(d+'rg.json','w'),indent=0); print([ (q['k'],q['err']) for q in M])
