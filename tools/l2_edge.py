import numpy as np, glob, sys; from PIL import Image; from scipy import ndimage as nd
fix='--fix' in sys.argv; rep=[]
for p in sorted(glob.glob('public/assets/l2/veh/*.png')+glob.glob('public/assets/l2/tiles/*.png')+glob.glob('public/assets/l2/props/*.png')):
  if fix and 'tiles_40' in p: continue
  a=np.array(Image.open(p).convert('RGBA')); al=a[...,3]>0
  semi=((a[...,3]>0)&(a[...,3]<255)).sum()
  lab,n=nd.label(al,structure=np.ones((3,3))); sz=np.bincount(lab.ravel())[1:]; specks=(sz<8).sum() if n>1 else 0
  # navy fringe: opaque edge pixels that are dark & bluish like sheet bg
  edge=al&~nd.binary_erosion(al); c=a[...,:3].astype(int); navy=(c.max(2)<60)&(c[...,2]>=c[...,0])&(c[...,2]-c[...,1]<40)
  fr=(edge&navy).sum()/max(1,edge.sum())
  rep.append((p.split('l2/')[1],a.shape[1],a.shape[0],semi,specks,round(fr,2)))
  if fix:
    c0=a[...,:3].astype(int).max(2); small=[i+1 for i in np.where(sz<8)[0] if c0[lab==i+1].mean()<70]; a[np.isin(lab,small)]=0; a[...,3]=np.where(a[...,3]>0,255,0)
    # peel one ring of navy fringe where it is outer edge but not the deliberate outline color
    al=a[...,3]>0; edge=al&~nd.binary_erosion(al); c=a[...,:3].astype(int)
    navy=(c.max(2)<60)&(c[...,2]>=c[...,0])&(c[...,2]-c[...,1]<40)&~((c[...,0]==14)&(c[...,1]==10)&(c[...,2]==34))
    if (edge&navy).sum()/max(1,edge.sum())>0.25: a[edge&navy]=0
    al=a[...,3]>0; ring=nd.binary_dilation(al)&~al
    Image.fromarray(a).save(p)
for r in rep:
  if r[3] or r[4] or r[5]>0.25: print(r)
print(len(rep),'files')
