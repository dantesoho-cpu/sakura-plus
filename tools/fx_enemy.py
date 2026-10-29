import numpy as np, os
from PIL import Image
from scipy import ndimage
exec(open('tools/cutout.py').read().split("os.makedirs")[0])
os.makedirs('public/assets/fx',exist_ok=True)
def fit(fr,target,dim=0):
    return target/max(m.shape[dim] for s,m in fr)
def strip(fr,sc,name,cw=None,ch=None,align='bottom',colors=24):
    ims=[make(im,a,s,m,sc,colors) for s,m in fr]
    cw=cw or max(i.width for i in ims); ch=ch or max(i.height for i in ims); S=Image.new('RGBA',(cw*len(ims),ch))
    for k,i in enumerate(ims): S.paste(i,(k*cw+(cw-i.width)//2,(ch-i.height) if align=='bottom' else (ch-i.height)//2),i)
    S.save(name); print(name,cw,ch,len(ims)); return cw,ch
# enemies: 4x4 grid
im=Image.open('assets_src/art_enemy_hibit.jpg').convert('RGB'); a=np.array(im).astype(int); H,W=a.shape[:2]
r,g,b=a[...,0],a[...,1],a[...,2]; fg=~((g>130)&(g>r+45)&(g>b+45)); fg=ndimage.binary_opening(fg,iterations=1)
def cell(R,C):
    ys,ye,xs,xe=R*H//4,(R+1)*H//4,C*W//4,(C+1)*W//4; m=np.zeros_like(fg); m[ys:ye,xs:xe]=fg[ys:ye,xs:xe]
    lab,n=ndimage.label(m); sz=ndimage.sum(m,lab,range(1,n+1)); keep=np.isin(lab,[i+1 for i in range(n) if sz[i]>=40]); yy,xx=np.where(keep)
    sl=(slice(yy.min(),yy.max()+1),slice(xx.min(),xx.max()+1)); return sl,keep[sl]
out={}
for R,(nm,t) in enumerate([('drone',22),('bot',30),('turret',28),('boom',30)]):
    fr=[cell(R,C) for C in range(4)]; out[nm]=strip(fr,fit(fr,t),f'public/assets/enemies/{nm}4.png',align='center' if nm=='drone' else 'bottom')
# fx
im,a,o=objs('assets_src/art_fx.jpg',minarea=300)
rows={}
for s,m in o: rows.setdefault(0 if s[0].start<a.shape[0]*0.33 else 1 if s[0].start<a.shape[0]*0.66 else 2,[]).append((s,m))
for k in rows: rows[k].sort(key=lambda x:x[0][1].start)
print({k:len(v) for k,v in rows.items()})
r_,g_,b_=a[...,0],a[...,1],a[...,2]; FG=~((g_>130)&(g_>r_+45)&(g_>b_+45)); FG=ndimage.binary_opening(FG,iterations=1)
def band(y0,y1,gap=14):
    m=FG[y0:y1]; col=m.sum(0)>0; runs=[]; x=0; Wd=len(col)
    while x<Wd:
        if col[x]:
            s=x; last=x
            while x<Wd and (col[x] or x-last<gap):
                if col[x]: last=x
                x+=1
            runs.append((s,last+1))
        x+=1
    res=[]
    for s,e in runs:
        mm=m[:,s:e]; ys=np.where(mm.any(1))[0]
        if mm.sum()<300: continue
        res.append(((slice(y0+ys.min(),y0+ys.max()+1),slice(s,e)),mm[ys.min():ys.max()+1]))
    return res
H3=a.shape[0]
r0=band(0,int(H3*0.4)); r1=band(int(H3*0.4),int(H3*0.66)); r2=band(int(H3*0.66),H3)
print(len(r0),len(r1),len(r2))
strip(r0[1:],fit(r0[1:],40),'public/assets/fx/boom.png',align='center')
for i,(s,m) in enumerate(r1): make(im,a,s,m,96/m.shape[1] if i!=1 else 80/m.shape[1],colors=12).save(f'public/assets/fx/cloud{i}.png')
for (s,m),(n,w) in zip(r2,[('shot',16),('ebolt',14),('flash',16),('pip',11),('pip_e',11),('spark',9)]):
    make(im,a,s,m,w/m.shape[1],colors=12,outline=n not in('flash','spark')).save(f'public/assets/fx/{n}.png')
make(im,a,*r0[0],9/r0[0][1].shape[1],colors=8,outline=False).save('public/assets/fx/spark2.png')
for f in sorted(os.listdir('public/assets/fx')): print(f,Image.open('public/assets/fx/'+f).size)
