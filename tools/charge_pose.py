# Derive charge-up (6f) and beam-recoil (3f) poses from Sakura's own shoot frame: braced crouch, hair whipping in the aura wind, recoil lean.
import numpy as np, math
from PIL import Image
S='public/assets/sakura/'
src=np.asarray(Image.open(S+'shoot.png').convert('RGBA'))[:, :64].copy()
def hairmask(a): return (a[...,3]>0)&(a[...,0]>140)&(a[...,2]<100)
def crouch(a,drop=3,lean=0):
    o=np.zeros_like(a); up=a[:34]; legs=a[34:45]
    # upper body down by `drop`, sheared back by `lean` px at the top
    for y in range(34):
        dx=int(round(lean*(34-y)/34)); row=np.roll(up[y],-dx,axis=0)
        if 0<=y+drop<48: o[y+drop]=np.where(row[:,3:4]>0,row,o[y+drop])
    n=45-(34+drop)  # squash legs into the remaining rows, stance slightly wider
    for i in range(n):
        sy=34+int(i*legs.shape[0]/n); row=legs[sy-34].copy()
        k=i/n; L=row.copy(); L[:,:]=0
        for x in range(64):
            if row[x,3]==0: continue
            nx=x+(-1 if x<26 else 1)*int(round(k*1.5))
            if 0<=nx<64: L[nx]=row[x]
        o[34+drop+i]=np.where(L[:,3:4]>0,L,o[34+drop+i])
    return o
def whip(a,f,amp=2.0):
    o=a.copy(); m=hairmask(a); m[30:]=False; ys,xs=np.nonzero(m)
    o[m]=0
    # re-seat head pixels the hair covered with a dark outline so no holes
    for y,x in zip(ys,xs):
        dx=-int(round(1+amp*(0.5+0.5*math.sin(f*1.3+y*0.55)))) if x<30 else -int(round(amp*0.5*(0.5+0.5*math.sin(f*1.3+y*0.55))))
        dy=-int(round(0.6*math.sin(f*1.7+x*0.4)))
        ny,nx=y+dy,x+dx
        if 0<=ny<48 and 0<=nx<64: o[ny,nx]=a[y,x]
    holes=m&(o[...,3]==0)
    o[holes]=[26,20,48,255]
    return o
charge=[whip(crouch(src,3),f,1.5+0.3*f) for f in range(6)]
fire=[whip(crouch(src,3,lean=l),f,3.0) for f,l in enumerate([3,2,1])]
Image.fromarray(np.concatenate(charge,1)).save(S+'charge.png'); Image.fromarray(np.concatenate(fire,1)).save(S+'fire.png')
