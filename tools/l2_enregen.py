# Enemy regen: GenerateImage 4-frame strips of each sheet-labelled unit -> key, split, common scale, feet baseline, palette snap.
import numpy as np, os, sys; from PIL import Image, ImageFilter; from scipy import ndimage as nd
sys.path.insert(0,'tools'); from l2_regen import palette
PAL=palette((795,750,1140,950),36); O='public/assets/l2/en/'
H=dict(drone=28,sentry=34,assault=48,shield=52,heavy=60)
for u,th in H.items():
  im=np.asarray(Image.open(f'assets_src/l2gen/en_{u}.jpg').convert('RGB')).astype(float)
  key=np.median(np.concatenate([im[:10,:10],im[:10,-10:],im[-10:,:10],im[-10:,-10:]]).reshape(-1,3),0)
  d=np.sqrt(((im-key)**2).sum(2)); r,g,b=im[...,0],im[...,1],im[...,2]
  bg=(d<80)|((r>140)&(g<50)&(b>60)&(r>b+25)&(r-g>120)); bg=nd.binary_opening(bg,iterations=2)
  fg0=nd.binary_fill_holes(nd.binary_opening(~bg,iterations=2)); mg=fg0&((d<90)|((r>120)&(g<70)&(r-g>90)&(b>50)&(r>b+10))); hl,hn=nd.label(mg); hs_=nd.sum(mg,hl,range(1,hn+1)); big=np.isin(hl,np.where(hs_>500)[0]+1); fg=fg0&~big; lab,n=nd.label(nd.binary_dilation(fg,iterations=6))
  sz=nd.sum(fg,lab,range(1,n+1)); ids=np.argsort(sz)[::-1][:4]+1; sl=nd.find_objects(lab)
  fr=sorted([(sl[i-1],i) for i in ids],key=lambda t:t[0][1].start)
  # common scale from frame-0 height; feet baseline = each frame bottom
  hs=[s[0].stop-s[0].start for s,_ in fr]; sc=th/max(hs); outs=[]
  for s,i in fr:
    m=fg[s]&(lab[s]==i); a=im[s]; h,w=m.shape; tw,tH=max(2,round(w*sc)),max(2,round(h*sc))
    sm=np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.BoxBlur(0.35/sc)).resize((tw,tH),Image.NEAREST)).astype(float)
    mm=np.asarray(Image.fromarray((m*255).astype(np.uint8)).resize((tw,tH),Image.BOX))>130
    rgb=PAL[((sm[:,:,None]-PAL[None,None])**2).sum(3).argmin(2)].astype(np.uint8)
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
