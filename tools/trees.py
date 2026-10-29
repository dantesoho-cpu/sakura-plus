# Big / small cherry trees composed purely from the user's tileset trees (props2 tree/tree2 + deco d56-58): canopy blobs, trunk, grass mound.
import numpy as np, random
from PIL import Image
P='public/assets/'; random.seed(7)
A=lambda f: Image.open(P+f).convert('RGBA')
t1,t2,t3=A('props2/tree.png'),A('props2/tree2.png'),A('deco/d56.png')
def canopy(im,rows):
    a=np.asarray(im).copy(); a[rows:]=0; return Image.fromarray(a)
def band(im,y0,y1): return im.crop((0,y0,im.width,y1))
pal=np.concatenate([np.asarray(t)[...,:3][np.asarray(t)[...,3]>200] for t in (t1,t2,t3)])
pal=np.unique(pal,axis=0)
def quant(im):
    a=np.asarray(im).astype(int); rgb=a[...,:3].reshape(-1,1,3); d=((rgb-pal[None])**2).sum(-1); q=pal[d.argmin(1)].reshape(a.shape[0],a.shape[1],3)
    o=np.zeros_like(a); o[...,:3]=q; o[...,3]=np.where(a[...,3]>120,255,0); return Image.fromarray(o.astype(np.uint8))
def big(seed,W=150,H=130):
    random.seed(seed); o=Image.new('RGBA',(W,H)); cx=W//2
    mound=band(t1,62,77)
    for dx in (-48,-8,30): o.alpha_composite(mound if dx%2 else mound.transpose(Image.FLIP_LEFT_RIGHT),(cx+dx-25,H-15))
    a=np.asarray(t1.crop((10,38,42,66))); r,g,b=[a[...,i].astype(int) for i in range(3)]
    bark=a[(r-b>12)&(r>g+12)&(r<170)&(a[...,3]>0)][:,:3]; L=bark.sum(1); bark=bark[np.argsort(L)]
    dk,md,lt=(52,28,32),(98,58,44),(146,94,64); rng=np.random.default_rng(seed)
    A=np.asarray(o).copy(); top,bot=56,H-12
    for y in range(top,bot):
        k=(y-top)/(bot-top); w=5+4*k+ (7*(k-.8)/.2 if k>.8 else 0); ccx=cx-4+int(2*np.sin(y*.09))
        for x in range(int(ccx-w),int(ccx+w)+1):
            u=(x-(ccx-w))/(2*w); n=rng.random()>.22
            c=dk if u<.14 or u>.86 else (lt if .5<u<.7 and n else md if n else dk)
            A[y,x,:3]=c; A[y,x,3]=255
    o=Image.fromarray(A)
    blobs=[(t1,44),(t2,46),(t3,38)]
    spots=[(-62,46),(8,48),(-28,20),(-64,16),(12,18),(-34,0),(-26,46)]
    for i,(dx,dy) in enumerate(spots):
        im,r=blobs[(i+seed)%3]; c=canopy(im,r)
        if random.random()<.5: c=c.transpose(Image.FLIP_LEFT_RIGHT)
        o.alpha_composite(c,(cx+dx,max(0,dy+6)))
    return quant(o.crop(o.getbbox()))
def small(im,s):
    w,h=im.size; return quant(im.resize((round(w*s),round(h*s)),Image.LANCZOS))
for i,s in enumerate([3,11]): big(s).save(P+f'props2/tree_big{i}.png')
small(t1,.6).save(P+'props2/tree_s0.png'); small(t2.transpose(Image.FLIP_LEFT_RIGHT),.5).save(P+'props2/tree_s1.png'); small(t3,.55).save(P+'props2/tree_s2.png')
