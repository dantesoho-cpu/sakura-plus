# Cohesive cherry trees as single custom pieces in the user's tileset style:
# one lumpy canopy silhouette (cauliflower bumps), textured with 4x4 blossom patches sampled from his tree canopies,
# shaded top-light/bottom-dark, plum outline, branch gaps, tapered bark trunk with roots, grass mound from his tree base. Binary alpha only.
import numpy as np, sys
from PIL import Image
from scipy import ndimage
P='public/assets/'; A=lambda f: np.asarray(Image.open(P+f).convert('RGBA')).astype(int)
srcs=[A('props2/tree.png'),A('props2/tree2.png')]
# blossom patch library: 4x4 fully-opaque pink blocks from his canopies, bucketed by brightness
patches=[]
for s in srcs:
    r,g,b,a=[s[...,i] for i in range(4)]; pk=(a>200)&(r>g+30)&(r>150)
    for y in range(0,s.shape[0]-4,2):
        for x in range(0,s.shape[1]-4,2):
            if pk[y:y+4,x:x+4].all(): patches.append(s[y:y+4,x:x+4,:3])
patches=np.array(patches); lum=patches.mean((1,2,3)); order=np.argsort(lum); patches=patches[order]; lum=lum[order]
mound=A('props2/tree.png')[62:77]
OUT=(70,20,58); BR_D=(52,28,32); BR_M=(98,58,44); BR_L=(146,94,64)
def tree(seed,W,H,cw,ch,trunk_h,tw):
    rng=np.random.default_rng(seed); o=np.zeros((H,W,4),int); cx=W//2
    # canopy mask: union of discs; core ellipse + rim bumps
    yy,xx=np.mgrid[0:H,0:W]; ccy=ch//2+2
    m=((xx-cx)/(cw/2-6))**2+((yy-ccy)/(ch/2-6))**2<1
    for t in np.linspace(0,2*np.pi,int(cw/5),endpoint=False):
        bx=cx+np.cos(t)*(cw/2-9); by=ccy+np.sin(t)*(ch/2-8)*(0.85 if np.sin(t)>0 else 1); rr=rng.uniform(5,9)
        m|=(xx-bx)**2+(yy-by)**2<rr*rr
    m&=yy<ch+4
    # branch gaps: a few holes in the lower half where branches show
    branches=np.zeros_like(m)
    base=(cx,ch-2)
    for k in range(5):
        ang=np.pi/2+rng.uniform(-1.1,1.1); L=rng.uniform(ch*.25,ch*.45)
        for s in np.linspace(0,1,40):
            x=int(base[0]+np.cos(ang)*L*s*(1 if k%2 else -1)); y=int(base[1]-np.sin(ang)*L*s)
            w=max(1,int(3*(1-s)))
            branches[max(0,y-w//2):y+w//2+1,max(0,x-w//2):x+w//2+1]=True
    holes=np.zeros_like(m)
    for k in range(4):
        hx=cx+rng.integers(-cw//4,cw//4); hy=int(ccy+rng.uniform(.05,.3)*ch); holes|=((xx-hx)/rng.uniform(3,6))**2+((yy-hy)/rng.uniform(2,4))**2<1
    # trunk
    tr=np.zeros_like(m); t0=ch-10
    for y in range(t0,H-10):
        k=(y-t0)/max(1,H-10-t0); w=tw/2+tw*0.15*k+(tw*0.7*(k-.75)/.25 if k>.75 else 0); c=cx+int(1.5*np.sin(y*.12))
        tr[y,int(c-w):int(c+w)+1]=True
    # paint trunk
    for y,x in zip(*np.nonzero(tr)):
        row=np.nonzero(tr[y])[0]; u=(x-row.min())/max(1,row.max()-row.min())
        c=BR_D if u<.15 or u>.85 else (BR_L if .5<u<.7 and rng.random()>.25 else BR_M if rng.random()>.2 else BR_D)
        o[y,x]=(*c,255)
    for y,x in zip(*np.nonzero(branches&~m | branches&holes)): o[y,x]=(*BR_D,255)
    holes[:]=False; cm=m
    # cauliflower clusters: discs drawn back-to-front (bottom first), each lit top-left, dark rim where overlapped
    ys,xs=np.nonzero(cm); y0,y1=ys.min(),ys.max(); x0,x1=xs.min(),xs.max()
    cl=[]
    for k in range(int(cw*ch/300)):
        px=rng.integers(x0,x1+1); py=rng.integers(y0,y1+1)
        if cm[py,px]: cl.append((py,px,rng.uniform(8,13)*(cw/140)**.5+3))
    cl.sort()  # top first
    idx=-np.ones(m.shape,int); 
    for i in range(len(cl)-1,-1,-1):  # bottom ones first, top overwrite? we want lower clusters in front -> draw top first then lower over
        pass
    for i,(py,px,rr) in enumerate(cl):
        d=((yy-py)**2+(xx-px)**2)<rr*rr
        idx[d&cm]=i
    idx[cm&(idx<0)]=len(cl); cl.append((y1,(x0+x1)//2,99))
    for y,x in zip(ys,xs):
        py,px,rr=cl[idx[y,x]]
        loc=np.clip(((y-py)+(x-px)*0.5)/(rr*1.2),-1,1)       # -1 top-left lit .. 1 bottom-right shade
        glob=(y-y0)/max(1,y1-y0)
        k=np.clip(0.55-0.4*loc-0.35*glob+0.2,0,1)
        i=int(k*(len(patches)-1)); p=patches[int(np.clip(i+rng.integers(-25,25),0,len(patches)-1))]
        o[y,x]=(*p[y%4,x%4],255)
    edge=(idx!=np.roll(idx,-1,0))|(idx!=np.roll(idx,-1,1))
    o[edge&cm&(np.roll(idx,-1,0)>idx)]=(196,84,146,255)
    lower=cm&~np.roll(cm,-1,0); o[lower]=(130,40,96,255)
    for y,x in zip(*np.nonzero(branches&cm&(yy>y1-(y1-y0)*0.35))):
        if rng.random()<.5: o[y,x]=(*BR_D,255)
    # outline around canopy only
    out=ndimage.binary_dilation(cm)&~cm&~tr&~branches; o[out]=(*OUT,255)
    # mound
    mh,mw=mound.shape[:2]
    for i,dx in enumerate(range(cx-int(tw*1.6)-mw//2, cx+int(tw*1.6)-mw//2+1, max(1,mw-10))):
        piece=mound if i%2==0 else mound[:,::-1]
        for y in range(mh):
            for x in range(mw):
                X=dx+x; Y=H-mh+y
                if 0<=X<W and piece[y,x,3]>200: o[Y,X]=piece[y,x]
    o=o.astype(np.uint8); o[...,3]=np.where(o[...,3]>127,255,0)
    im=Image.fromarray(o); return im.crop(im.getbbox())
for name,args in {'tree_big0':(1,150,140,140,96,0,14),'tree_big1':(2,170,150,160,104,0,16),'tree_s0':(3,48,56,44,32,0,5),'tree_s1':(4,56,62,52,36,0,6),'tree_s2':(5,64,74,60,42,0,7),'tree_m0':(6,96,100,90,64,0,9),'tree_m1':(7,110,108,104,70,0,10)}.items():
    tree(*args).save(P+'props2/'+name+'.png')
