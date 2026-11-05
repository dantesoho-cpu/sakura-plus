# v13 true regen: GenerateImage redraws (sheet crop as hard reference) -> key bg -> nearest downscale to the
# in-game size (bottom-flush, centred) -> palette-snap to the sheet crop's own colours -> 1px dark outline.
import numpy as np, json, os, glob; from PIL import Image, ImageFilter; from scipy import ndimage as nd
from scipy.cluster.vq import kmeans2
def find(k):
  c=glob.glob(f'public/assets/**/{k}.png',recursive=True); c=[p for p in c if '/rg/' not in p]; assert len(c)==1,(k,c); return c[0]
def palette(k,n=32):
  a=np.asarray(Image.open(f'assets_src/v13/ref/{k}.png').convert('RGB')).astype(float)
  bgc=np.median(np.concatenate([a[:6,:6],a[:6,-6:],a[-6:,:6],a[-6:,-6:]]).reshape(-1,3),0)
  p=a.reshape(-1,3); p=p[np.sqrt(((p-bgc)**2).sum(1))>40]; p=np.unique(p,axis=0)
  np.random.seed(1); c,_=kmeans2(p[np.random.choice(len(p),min(8000,len(p)),0)],min(n,len(p)),minit='++',seed=1); return c
def process(k):
  dst=find(k); old=Image.open(dst).convert('RGBA'); W,H=old.size
  im=np.asarray(Image.open(f'assets_src/v13/gen/{k}.jpg').convert('RGB')).astype(float)
  key=np.median(np.concatenate([im[:8,:8],im[:8,-8:],im[-8:,:8],im[-8:,-8:]]).reshape(-1,3),0)
  d=np.sqrt(((im-key)**2).sum(2)); bg=nd.binary_opening(d<75,iterations=2)
  if k!='stone_gate':
    lab,_=nd.label(bg); e=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]))-{0}; bg=np.isin(lab,list(e))
  fg=nd.binary_opening(~bg,iterations=2)
  if k!='stone_gate': fg=nd.binary_fill_holes(fg)
  lab,n=nd.label(nd.binary_dilation(fg,iterations=4)); sz=nd.sum(np.ones_like(lab),lab,range(1,n+1))
  keep=[i+1 for i,s in enumerate(sz) if s>0.08*sz.max()]; fg&=np.isin(lab,keep)
  ys,xs=np.where(fg); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
  a=im[y0:y1,x0:x1]; m=fg[y0:y1,x0:x1]; h,w=m.shape
  s=min((W-2)/w,(H-1)/h); tw,th=max(3,round(w*s)),max(3,round(h*s))
  sm=np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.BoxBlur(max(0.5,0.35/s))).resize((tw,th),Image.NEAREST)).astype(float)
  mm=np.asarray(Image.fromarray((m*255).astype(np.uint8)).resize((tw,th),Image.BOX))>128
  pal=palette(k); idx=((sm[:,:,None,:]-pal[None,None])**2).sum(3).argmin(2)
  o=np.zeros((H,W,4),np.uint8); ox=(W-tw)//2; oy=H-th
  o[oy:,ox:ox+tw,:3]=pal[idx].astype(np.uint8); o[oy:,ox:ox+tw,3]=mm*255
  al=o[...,3]>0; ring=nd.binary_dilation(al)&~al; ring[-1]&=False; o[ring]=(14,10,34,255)
  # bottom flush: last row must be opaque under the object footprint
  if not o[-1,:,3].any(): o=np.roll(o,1,0)
  os.path.exists(f'assets_src/v13/old/{k}.png') or old.save(f'assets_src/v13/old/{k}.png'); Image.fromarray(o,'RGBA').save(dst); return dst,W,H
if __name__=='__main__':
  os.makedirs('assets_src/v13/old',exist_ok=True)
  for k in json.load(open('assets_src/v13/ref/boxes.json')): print(k,*process(k))
