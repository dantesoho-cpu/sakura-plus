# Air Fortress parallax cut. Sheet panels (right stack): L1 distant, L2 mid, L3 foreground, L4 detail.
# Sky keyed; edge-blend seam from panel pixels only. Outputs public/assets/ft/bg/ft_{sky,L1..L4}.png
from PIL import Image
import numpy as np, scipy.ndimage as nd, json, os
S=np.array(Image.open('ref/fortress_sheet.png').convert('RGB')).astype(np.float32)
BOX={1:(816,66,1516,222),2:(816,226,1516,347),3:(816,352,1516,459),4:(816,463,1516,568)}
os.makedirs('public/assets/ft/bg',exist_ok=True); os.makedirs('assets_src/v15/fort',exist_ok=True); os.makedirs('audit/v15/fort',exist_ok=True)
def paint_label(a):
  h,w,_=a.shape; a[h-20:h-2,w-150:w-4]=a[h-20:h-2,w-200:w-154].mean(1,keepdims=True)
def key_sky(a, frac=0.30, thr=40):
  h,w,_=a.shape; ref=np.zeros((h,3)); k=max(6,int(h*frac))
  for y in range(h): ref[y]=np.median(a[min(y,k)],0)
  ref=nd.uniform_filter1d(ref,5,axis=0); d=np.abs(a-ref[:,None,:]).max(2); st=d>thr
  st=st&np.roll(st,-1,0)&np.roll(st,-2,0); st[:4]=False
  top=np.where(st.any(0),st.argmax(0),h); top=nd.minimum_filter1d(nd.median_filter(top,5),3)
  m=np.arange(h)[:,None]>=top[None,:]; skyl=(d<thr*0.9)|~m; lab,_=nd.label(skyl); ids=np.unique(lab[~m])
  clr=nd.binary_opening(np.isin(lab,ids[ids>0]),iterations=1)|~m; op=~clr
  lab,_=nd.label(op); sz=np.bincount(lab.ravel()); small=(sz<18); small[0]=False; op[small[lab]]=False; return op
def edge_blend_seam(rgba, blend=40):
  a=rgba.astype(np.float32); h,w,_=a.shape; out=a.copy()
  for i in range(blend):
    t=(i+1)/(blend+1); out[:,w-blend+i]=a[:,w-blend+i]*(1-t)+a[:,i]*t
  return out.clip(0,255).astype(np.uint8)
meta={}
L1=S[BOX[1][1]:BOX[1][3],BOX[1][0]:BOX[1][2]].copy(); paint_label(L1)
sky=np.zeros((270,96,4),np.uint8)
for y in range(270):
  sy=int(y/270*(L1.shape[0]*0.55)); sky[y,:,:3]=np.median(L1[sy],0).astype(np.uint8); sky[y,:,3]=255
Image.fromarray(sky,'RGBA').save('public/assets/ft/bg/ft_sky.png'); Image.fromarray(sky,'RGBA').save('assets_src/v15/fort/ft_sky.png'); meta['sky']=[96,270]
for L,(x0,y0,x1,y1) in BOX.items():
  a=S[y0:y1,x0:x1].copy(); paint_label(a)
  Image.fromarray(a.astype(np.uint8),'RGB').save(f'assets_src/v15/fort/panel_L{L}_raw.png')
  op=key_sky(a, frac=0.28 if L==1 else 0.30, thr=38 if L==1 else 40)
  rgba=np.dstack([a,op.astype(np.float32)*255]); rgba[...,3]=np.where(rgba[...,3]>127,255,0)
  out=edge_blend_seam(rgba); Image.fromarray(out,'RGBA').save(f'public/assets/ft/bg/ft_L{L}.png')
  Image.fromarray(out,'RGBA').save(f'assets_src/v15/fort/ft_L{L}.png'); meta[f'L{L}']=[int(out.shape[1]),int(out.shape[0])]
  wrap=np.concatenate([out[:,-80:],out[:,:80]],1); Image.fromarray(wrap).save(f'audit/v15/fort/L{L}_seam.png')
  print(f'L{L}', meta[f'L{L}'], 'opaque%', int(100*op.mean()))
json.dump(meta,open('public/assets/ft/bg/parallax.json','w'),indent=2); print(meta)
