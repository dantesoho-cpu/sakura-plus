# NEO/KYO sign (tiles_40) regenerated from the sheet design (blank bands), keyed off navy, NN-downscaled, palette-snapped, text stamped.
import numpy as np, sys; from PIL import Image, ImageFilter; from scipy import ndimage as nd
sys.path.insert(0,'tools'); from l2_regen import palette; from l2_parallax import F3
im=np.asarray(Image.open('assets_src/l2gen/sign40.jpg').convert('RGB')).astype(float); Hs,Ws=im.shape[:2]
key=np.median(im[:20,:20].reshape(-1,3),0); d=np.sqrt(((im-key)**2).sum(2))
fg=nd.binary_fill_holes(nd.binary_opening(d>45,iterations=3)); lab,n=nd.label(fg); sz=nd.sum(fg,lab,range(1,n+1))
fg=np.isin(lab,np.argsort(sz)[::-1][:2]+1)
ys,xs=np.where(fg); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
sc=90.0/float(y1-y0); y0,y1,x0,x1=int(y0),int(y1),int(x0),int(x1); tw,th=round((x1-x0)*sc),90
sm=np.asarray(Image.fromarray(im[y0:y1,x0:x1].astype(np.uint8)).filter(ImageFilter.BoxBlur(float(0.35/sc))).resize((tw,th),Image.NEAREST)).astype(float)
mm=np.asarray(Image.fromarray((fg[y0:y1,x0:x1]*255).astype(np.uint8)).resize((tw,th),Image.BOX))>140
PAL=palette((661,295,727,385),24)
rgb=PAL[((sm[:,:,None]-PAL[None,None])**2).sum(3).argmin(2)].astype(np.uint8); hot=sm.max(2)>230; rgb[hot]=sm[hot].astype(np.uint8)
a=np.zeros((th,tw,4),np.uint8); a[...,:3]=rgb; a[...,3]=mm*255; ring=nd.binary_dilation(mm)&~mm
a=np.pad(a,((1,1),(1,1),(0,0))); ring=np.pad(ring,1); a[ring]=(14,10,34,255)
# find bands: columns of panel/strip, magenta rows
mag=(a[...,0]>170)&(a[...,2]>150)&(a[...,1]<120)&(a[...,3]>0)
cols=np.where(mm.any(0))[0]+1; gaps=np.where(np.diff(cols)>1)[0]; px1=cols[gaps[0]]; sx0=cols[gaps[0]+1]
def stamp(cx,cy,txt,s,vert=False):
  m=[]
  for i,ch in enumerate(txt):
    for r,row in enumerate(F3[ch]):
      for k,b in enumerate(row):
        if b=='1':
          for dy in range(s):
            for dx in range(s):
              m.append(((i*6 if vert else 0)*s//2+r*s+dy if vert else r*s+dy, (k*s+dx) if vert else (i*4+k)*s+dx))
  m=np.array(m); h=m[:,0].max()+1; w=m[:,1].max()+1; M=np.zeros((h,w),bool); M[m[:,0],m[:,1]]=True
  oy,ox=cy-h//2,cx-w//2; sub=a[oy:oy+h+2,ox-1:ox+w+1]; G=nd.binary_dilation(np.pad(M,1))[:sub.shape[0],:sub.shape[1]]
  sub[G&(sub[...,3]>0),:3]=(255,90,215); sub[1:h+1,1:w+1][M,:3]=(255,240,252)
pr=np.where(mag[:,2:px1].mean(1)>0.6)[0]; top=pr[pr<th*0.4]; bot=pr[pr>th*0.6]
stamp((1+px1)//2+1,(top.min()+top.max())//2+1,'NEO',2); stamp((1+px1)//2+1,(bot.min()+bot.max())//2+1,'KYO',2)
sr=np.where(mm[:,sx0-1:].any(1))[0]; cx=(sx0+a.shape[1]-2)//2; txt='NEO-KYO'; tot=len(txt)*6-1; oy=(sr.min()+sr.max())//2+3-tot//2
for i,ch in enumerate(txt):
  for r,row in enumerate(F3[ch]):
    for k,bb in enumerate(row):
      if bb=='1':
        Y,X=oy+i*6+r,cx-1+k
        for dy in(-1,0,1):
          for dx in(-1,0,1):
            if a[Y+dy,X+dx,3]>0 and tuple(a[Y+dy,X+dx,:3])!=(255,240,252): a[Y+dy,X+dx,:3]=(255,90,215)
  for r,row in enumerate(F3[ch]):
    for k,bb in enumerate(row):
      if bb=='1': a[oy+i*6+r,cx-1+k,:3]=(255,240,252)
Image.fromarray(a,'RGBA').save('public/assets/l2/tiles/tiles_40.png'); print(a.shape,top.min(),top.max(),bot.min(),bot.max())
