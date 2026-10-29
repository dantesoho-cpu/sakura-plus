import numpy as np, json, os
from PIL import Image, ImageEnhance
from scipy import ndimage
CW,CH=96,64
def frames(path,thr=228):
    rgb=Image.open(path).convert('RGB'); im=np.array(rgb).astype(int)
    fg=im.min(2)<thr
    fg=ndimage.binary_opening(fg,iterations=1)
    lab,n=ndimage.label(ndimage.binary_dilation(fg,iterations=2))
    areas=ndimage.sum(fg,lab,range(1,n+1))
    cents=ndimage.center_of_mass(fg,lab,range(1,n+1))
    seeds=[i for i in range(n) if areas[i]>4000]
    owner={}
    for i in range(n):
        if areas[i]<15: continue
        if i in seeds: owner[i]=i; continue
        cy,cx=cents[i]
        owner[i]=min(seeds,key=lambda s:(cents[s][1]-cx)**2+((cents[s][0]-cy)*0.5)**2)
    out=[]
    for s in sorted(seeds,key=lambda s:cents[s][1]):
        m=np.zeros_like(fg)
        for i,o in owner.items():
            if o==s: m|=(lab==i+1)
        m&=fg|ndimage.binary_erosion(ndimage.binary_fill_holes(m))
        m&=fg
        out.append((rgb,m))
    return out
def pack(rgb,m,scale=0.19):
    ys,xs=np.where(m); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    a=np.array(rgb)[y0:y1,x0:x1].copy(); mm=m[y0:y1,x0:x1]
    w,h=max(1,round((x1-x0)*scale)),max(1,round((y1-y0)*scale))
    c=Image.fromarray(a).resize((w,h),Image.BOX)
    al=np.array(Image.fromarray((mm*255).astype(np.uint8)).resize((w,h),Image.BOX))>140
    c=ImageEnhance.Contrast(c).enhance(1.15); c=ImageEnhance.Color(c).enhance(1.3); c=ImageEnhance.Brightness(c).enhance(1.25)
    q=np.array(c.quantize(32,method=Image.MAXCOVERAGE).convert('RGB'))
    q=q.astype(float); r,g,b=q[...,0],q[...,1],q[...,2]; lum=(r+g+b)/3
    hair=(r>g+35)&(r>b+15)
    # brighten crimson ponytail/accents
    k=np.clip(lum/80,0.9,1.3)[...,None]; q[hair]=np.clip(np.array([235,45,80])*k[hair],0,255)
    # lift dark armour: raise shadows, push blue-cyan highlights
    dark=~hair&(lum<90); q[dark]=q[dark]*0.6+np.array([100,118,182])*0.55
    armour=~hair&(b>r+15)&(lum>=70); q[armour]=np.clip(q[armour]*1.25+np.array([10,30,40]),0,255)
    # light rim on up/left/right-facing silhouette edges
    up=np.zeros_like(al); up[1:]=al[:-1]; lf=np.zeros_like(al); lf[:,1:]=al[:,:-1]; rt=np.zeros_like(al); rt[:,:-1]=al[:,1:]
    rim=al&(~up|~lf); q[rim]=q[rim]*0.35+np.array([170,235,255])*0.65
    rim2=al&~rt&~rim; q[rim2]=q[rim2]*0.55+np.array([255,150,200])*0.45
    q=q.astype(np.uint8)
    rgba=np.dstack([q,al*255]).astype(np.uint8)
    # outline
    ring=ndimage.binary_dilation(al)&~al
    rgba[ring]=(14,12,28,255)
    return Image.fromarray(rgba)
def sheet(imgs,name):
    os.makedirs('public/assets/sakura',exist_ok=True)
    S=Image.new('RGBA',(CW*len(imgs),CH))
    for i,f in enumerate(imgs):
        f=f.crop((0,0,min(f.width,CW-2),min(f.height,CH-2))) if f.width>CW-2 or f.height>CH-2 else f
        S.paste(f,(i*CW+(CW-f.width)//2,CH-2-f.height),f)
    S.save(f'public/assets/sakura/{name}.png'); return S
r2=[pack(*f) for f in frames('assets_src/art_run2.jpg')]; print('run2',len(r2)); run=r2[2:8]
mv=[pack(*f) for f in frames('assets_src/art_move.jpg')]
cb=[pack(*f) for f in frames('assets_src/art_combat.jpg')]
print(len(run),len(mv),len(cb),[f.size for f in run+mv+cb])
sheet(run,'run'); sheet(mv[:2],'idle'); sheet([mv[2]],'jump'); sheet([mv[3]],'apex'); sheet([mv[4]],'fall')
sheet(mv[5:8],'dash'); sheet(cb[0:2],'shoot'); sheet([cb[2]],'runshoot'); sheet(cb[-2:],'hurt')
