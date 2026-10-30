# Neo-Kyo parallax: cut 5 bands from the sheet, paint out labels + SEGA, key sky (L2-5), make seamless.
from PIL import Image, ImageDraw; import numpy as np, scipy.ndimage as nd, json
S=np.array(Image.open('ref/neokyo_sheet.png').convert('RGB')).astype(int)
BOX={1:(799,89,1516,214),2:(799,241,1516,352),3:(799,379,1516,489),4:(799,516,1516,624),5:(799,651,1516,724)}
LABEL=(0,0,152,20)  # 'LAYER N - ...' plate, relative
F3={'N':["101","111","111","111","101"],'E':["111","100","110","100","111"],'O':["111","101","101","101","111"],'S':["111","100","111","001","111"],
'A':["010","101","111","101","101"],'K':["101","110","100","110","101"],'U':["101","101","101","101","111"],'R':["110","101","110","101","101"],'+':["000","010","111","010","000"],
'Y':["101","101","010","010","010"],'-':["000","000","111","000","000"]}
def sign(a,x0,y0,x1,y1,txt,sc):
  # repaint panel: fill with panel's own dark tone, re-letter with neon pixel font (core+glow), same cyan/blue as sheet
  pan=a[y0:y1,x0:x1]; lum=pan.sum(2); base=np.median(pan[lum<np.percentile(lum,40)],0).astype(int)
  a[y0:y1,x0:x1]=base
  w=len(txt)*4*sc-sc; h=5*sc; ox=x0+(x1-x0-w)//2; oy=y0+(y1-y0-h)//2
  m=np.zeros((y1-y0,x1-x0),bool)
  for i,c in enumerate(txt):
    for r,row in enumerate(F3[c]):
      for k,b in enumerate(row):
        if b=='1': yy=oy-y0+r*sc; xx=ox-x0+(i*4+k)*sc; m[yy:yy+sc,xx:xx+sc]=True
  g=nd.binary_dilation(m,iterations=1)&~m; sub=a[y0:y1,x0:x1]
  sub[g]=(sub[g]*0.3+np.array([40,110,255])*0.7).astype(int); sub[m]=[170,235,255]
def key_sky(a, frac=0.35, thr=48):
  # per-row sky reference (row median, upper rows only, held below); structure = far from ref; per-column skyline, opaque below
  h,w,_=a.shape; ref=np.zeros((h,3)); k=max(6,int(h*frac))
  for y in range(h): ref[y]=np.median(a[min(y,k)],0)
  ref=nd.uniform_filter1d(ref,5,axis=0)
  d=np.abs(a-ref[:,None,:]).max(2); st=d>thr
  st=st&np.roll(st,-1,0)&np.roll(st,-2,0); st[:5]=False
  top=np.where(st.any(0),st.argmax(0),h); top=nd.minimum_filter1d(nd.median_filter(top,3),2)
  m=np.arange(h)[:,None]>=top[None,:]
  # second pass: sky-toned pixels connected to the cleared sky also clear (no rectangular sky blocks under hover cars)
  skyl=(d<thr*0.85)|~m; lab,_=nd.label(skyl); ids=np.unique(lab[~m]); clr=np.isin(lab,ids[ids>0])
  clr=nd.binary_opening(clr,iterations=1)|~m
  op=~clr; lab,n=nd.label(op); sz=np.bincount(lab.ravel()); small=(sz<14); small[0]=False; op[small[lab]]=False
  return op
def seam(img,lo=520):
  # wrap without ghosting: pick the period whose wrap column best matches column 0 (3-col window), hard crop there
  a=img.astype(float); w=a.shape[1]; ref=a[:,:3,:3]
  best=min(range(lo,w-3),key=lambda p:np.abs(a[:,p:p+3,:3]-ref).mean()+np.abs(a[:,p:p+3,3]-a[:,:3,3]).mean()*0.5)
  return a[:,:best]
if __name__=='__main__':
 meta={}
 for L,(x0,y0,x1,y1) in BOX.items():
   a=S[y0:y1,x0:x1].copy()
   # label plate -> copy sky/skyline from just right of it
   lx,ly,lw,lh=LABEL; a[ly:lh,lx:lw]=a[ly:lh,lw:lw+lw][:, :lw-lx]
   if L==3: sign(a,1330-x0,407-y0,1363-x0,423-y0,'NEO',2)
   if L==4: sign(a,1129-x0,522-y0,1191-x0,545-y0,'SAKURA+',2)
   al=np.full(a.shape[:2],255) if L==1 else key_sky(a).astype(int)*255
   rgba=np.dstack([a,al]); out=seam(rgba).clip(0,255).astype(np.uint8)
   if L>1: out[...,3]=np.where(out[...,3]>127,255,0)
   Image.fromarray(out,'RGBA').save(f'public/assets/l2/bg/nk_L{L}.png'); meta[f'L{L}']=out.shape[1::-1]
 json.dump(meta,open('public/assets/l2/bg/parallax.json','w')); print(meta)
