# v13 parallax: GenerateImage extensions of each level's sheet parallax panels -> keyed (magenta/green) ->
# seamless horizontal wrap (cross-faded ends) -> soft top edge for band layers -> hi-res PNG (4 texels / logical px).
import numpy as np, json, sys; from PIL import Image; from scipy import ndimage as nd
D='assets_src/v13/px/'; OUT='public/assets/px/'; import os; os.makedirs(OUT,exist_ok=True)
DENS=4  # texels per logical pixel
# key: logical display height, keyed?, extra soft top rows fraction
SPEC={'l1_L1':(270,0),'l1_L2':(140,1),'l1_L3':(100,1),'nk_L1':(270,0),'nk_L2':(160,1),'nk_L3':(100,1),'sh_L1':(270,0),'sh_L2':(160,1),'sh_L3':(110,1)}
def seam(a,O):
  W=a.shape[1]; t=np.linspace(0,1,O)[None,:,None]; o=a[:,:W-O].copy(); o[:,:O]=a[:,:O]*t+a[:,W-O:]*(1-t); return o
def run(k):
  H,keyed=SPEC[k]; im=np.asarray(Image.open(D+f'gen_{k}.jpg').convert('RGB')).astype(float); h,w,_=im.shape
  if k=='nk_L2': # kill the Latin-letter sign ('SERA') -> fill with the sign's own dark panel colour
    b=im[419:448,1008:1068]; dk=b[b.sum(2)<b.sum(2).mean()]; im[421:446,1010:1066]=np.median(dk,0)
  a=np.ones((h,w))
  if keyed:
    cor=im[:6].reshape(-1,3); key=np.median(cor,0); d=np.sqrt(((im-key)**2).sum(2))
    a=np.clip((d-60)/50,0,1); a=nd.binary_opening(a>0.5,iterations=1)*a
    rows=np.where((a>0.5).mean(1)>0.5)[0]; y0,y1=rows.min(),rows.max()+1
    y0+=int((y1-y0)*0.04); im=im[y0:y1]; a=a[y0:y1]
    # despill key colour on semi-transparent edge pixels
    im=np.where((a<1)[...,None],im*(1-0)+0,im)
    band=(a[:8]>0.5).mean()>0.6  # opaque rectangle top -> soft fade
    if band: f=int(len(a)*0.3); t=np.linspace(0,1,f)[:,None]; a[:f]*=t*t*(3-2*t)
  rgba=np.dstack([im,a*255]); O=int(rgba.shape[1]*0.14); rgba=seam(rgba,O)
  TH=H*DENS; TW=round(rgba.shape[1]*TH/rgba.shape[0])
  pm=rgba.copy(); pm[...,:3]*=pm[...,3:]/255  # premultiply for clean resize
  P=64; pw=np.concatenate([pm[:,-P:],pm,pm[:,:P]],1); sc=TW/pm.shape[1]; PW=round(P*sc)  # wrap-pad so the resize kernel sees the tile's own other end
  r=np.asarray(Image.fromarray(np.clip(pw,0,255).astype(np.uint8),'RGBA').resize((TW+2*PW,TH),Image.LANCZOS)).astype(float)[:,PW:PW+TW]
  al=np.clip(r[...,3:],1,255); r[...,:3]=np.where(r[...,3:]>0,r[...,:3]*255/al,0)
  Image.fromarray(np.clip(r,0,255).astype(np.uint8),'RGBA').save(OUT+k+'.png',optimize=True)
  # seam check: wrap column diff vs. mean neighbouring column diff
  c=r[...,:3]*r[...,3:]/255; ws=np.abs(c[:,0]-c[:,-1]).mean(); nb=np.abs(np.diff(c,axis=1)).mean()
  return dict(k=k,w=TW,h=TH,lw=TW/DENS,lh=H,seam=round(ws,2),col=round(nb,2))
if __name__=='__main__':
  M=[run(k) for k in (sys.argv[1:] or SPEC)]; [print(m) for m in M]; json.dump(M,open(OUT+'px.json','w'),indent=0)
