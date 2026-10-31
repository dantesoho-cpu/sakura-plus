# Enemy regen: GenerateImage 4-frame strips of each sheet-labelled unit -> key, split, common scale, feet baseline, palette snap.
import numpy as np, os, sys; from PIL import Image, ImageFilter; from scipy import ndimage as nd
sys.path.insert(0,'tools'); from l2_regen import palette
PAL=palette((795,750,1140,950),36)
_sh=np.asarray(Image.open('ref/neokyo_sheet.png').convert('RGB')).astype(float)[752:850,795:1140]; _k=np.median(_sh.reshape(-1,3),0); _m=np.abs(_sh-_k).sum(-1)>60
LUM=lambda a:0.3*a[...,0]+0.59*a[...,1]+0.11*a[...,2]; _mb=_m&(LUM(_sh)<120)&(_sh[...,2]>_sh[...,0]); REFM=np.median(_sh[_mb],0); print('sheet robot median',REFM)
O='public/assets/l2/en/'
H=dict(drone=30,sentry=36,assault=50,shield=54,heavy=62)
for u,th in H.items():
  im=np.asarray(Image.open(f'assets_src/l2gen/en_{u}.jpg').convert('RGB')).astype(float)
  key=np.median(np.concatenate([im[:10,:10],im[:10,-10:],im[-10:,:10],im[-10:,-10:]]).reshape(-1,3),0)
  d=np.sqrt(((im-key)**2).sum(2)); r,g,b=im[...,0],im[...,1],im[...,2]
  bg=(d<90)|((g>150)&(g>r+60)&(g>b+60)); bg=nd.binary_opening(bg,iterations=1)
  fg0=nd.binary_fill_holes(nd.binary_opening(~bg,iterations=2)); mg=fg0&((d<90)|((r>120)&(g<70)&(r-g>90)&(b>50)&(r>b+10))); fg=fg0; lab,n=nd.label(nd.binary_dilation(fg,iterations=6))
  sz=nd.sum(fg,lab,range(1,n+1)); ids=np.argsort(sz)[::-1][:4]+1; sl=nd.find_objects(lab)
  fr=sorted([(sl[i-1],i) for i in ids],key=lambda t:t[0][1].start)
  # common scale from frame-0 height; feet baseline = each frame bottom
  hs=[s[0].stop-s[0].start for s,_ in fr]; sc=th/max(hs); outs=[]
  for s,i in fr:
    m=fg[s]&(lab[s]==i); a=im[s]; h,w=m.shape; tw,tH=max(2,round(w*sc)),max(2,round(h*sc))
    sm=np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.BoxBlur(0.35/sc)).resize((tw,tH),Image.NEAREST)).astype(float)
    mm=np.asarray(Image.fromarray((m*255).astype(np.uint8)).resize((tw,tH),Image.BOX))>130
    sm[...,1]=np.minimum(sm[...,1],np.maximum(sm[...,0],sm[...,2])); _bb=mm&(LUM(sm)<120)&(sm[...,2]>=sm[...,0]); _md=np.median(sm[_bb] if _bb.sum()>20 else sm[mm],0); _w=(1-LUM(sm)/255.)[...,None]; sm=np.clip(sm+(REFM-_md)[None,None]*_w*1.6,0,255); sm=np.clip(REFM[None,None]+(sm-REFM[None,None])*1.45,0,255); rgb=np.asarray(Image.fromarray(sm.astype(np.uint8)).quantize(40,method=Image.MEDIANCUT).convert('RGB')).copy()
    # keep hot glow pixels (eye/core/flash) vivid rather than snapped
    hot=(sm.max(2)>225); rgb[hot]=sm[hot].astype(np.uint8)
    o=np.zeros((tH,tw,4),np.uint8); o[...,:3]=rgb; o[...,3]=mm*255; ring=nd.binary_dilation(mm)&~mm; o[ring]=(14,10,34,255); outs.append(o)
  W=max(o.shape[1] for o in outs)+2; Hh=max(o.shape[0] for o in outs)+1
  # anchor: align body center of frame0-like mass (column centroid) so frames don't jitter
  for k,o in enumerate(outs):
    c=np.zeros((Hh,W,4),np.uint8); cx=int(round(np.mean(np.where(o[...,3]>0)[1]))); x0=W//2-cx; x0=max(0,min(W-o.shape[1],x0))
    c[Hh-o.shape[0]:,x0:x0+o.shape[1]]=o; Image.fromarray(c,'RGBA').save(f'{O}{u}_{k}.png')
  for k in range(4,6):
    p=f'{O}{u}_{k}.png'
    if os.path.exists(p): os.remove(p)
  print(u,W,Hh,sc)

# shield/sentry: generated walk frames lost the shield -> derive steps from frame 0 (leg lift), fire = hot-eye brighten
def legs(img,dy):
  a=np.array(img); h,w=a.shape[:2]; y0=int(h*0.66); b=a.copy(); L=a[y0:,:w//2].copy(); b[y0:,:w//2]=0; b[y0:h-dy,:w//2]=L[dy:]; return Image.fromarray(b)
def eye(img):
  a=np.array(img).astype(int); hot=(a[...,0]>150)&(a[...,0]>a[...,1]+50)&(a[...,3]>0); a[hot,0]=255; a[hot,1]=np.minimum(255,a[hot,1]+90); a[hot,2]=np.minimum(255,a[hot,2]+90); return Image.fromarray(a.astype(np.uint8))
F=Image.FLIP_LEFT_RIGHT
for u in ['shield','sentry']:
  s0=Image.open(O+u+'_0.png'); legs(s0,2).save(O+u+'_1.png'); legs(s0.transpose(F),2).transpose(F).save(O+u+'_2.png')
  if u=='shield': eye(s0).save(O+u+'_3.png')
