# Waterfall source + basin pieces built from the user's sakuratileset cuts (deco d13/d17/d39 stone+moss+blossom, d67 pool water, d82 rocks).
# Output: props2/wf_lip{0,1,2}.png (small/med/big spout outcrops), props2/wf_basin{0,1,2}.png (stone-rimmed pools, 4 ripple frames, spritesheet),
#         props2/wf_rocks.png (splash rocks). Binary alpha, dark outline, tileset palette only.
import numpy as np
from PIL import Image
from scipy import ndimage
P='public/assets/'; A=lambda f: np.asarray(Image.open(P+f).convert('RGBA')).astype(int)
d13,d17,d39,d67,d82=A('deco/d13.png'),A('deco/d17.png'),A('deco/d39.png'),A('deco/d67.png'),A('deco/d82.png')
rng=np.random.default_rng(7)
OUT=(26,15,46)
def patch_fill(mask,src,srcmask,ps=6):
    o=np.zeros(mask.shape+(4,),int); ys,xs=np.nonzero(srcmask); H,W=mask.shape
    while True:
        cand=[(y,x) for y in range(0,src.shape[0]-ps+1) for x in range(0,src.shape[1]-ps+1) if srcmask[y:y+ps,x:x+ps].all()]
        if cand or ps==1: break
        ps-=1
    for y in range(0,H,ps):
        for x in range(0,W,ps):
            sy,sx=cand[rng.integers(len(cand))]; blk=src[sy:sy+ps,sx:sx+ps]
            h=min(ps,H-y); w=min(ps,W-x); o[y:y+h,x:x+w]=blk[:h,:w]
    o[~mask]=0; return o
def opaque(a): return a[...,3]>200
# stone texture: brick body of d17 (below the blossom row)
stone_src=d17[10:,:]; stone_m=opaque(stone_src)&(stone_src[...,0]<200)
moss_src=d39[:12]; moss_m=opaque(moss_src)&(moss_src[...,1]>moss_src[...,0])
bl_src=d13[:9]; bl_m=opaque(bl_src)&(bl_src[...,0]>bl_src[...,1]+30)
def lip(W,H,notch):
    yy,xx=np.mgrid[0:H,0:W]
    # overhanging rock: wide top, tapering lumpy underside, central notch (spout channel)
    under=H-3-np.abs((xx-W/2)/(W/2))**1.6*(H*0.38)+rng.normal(0,1.0,W)[None,:].repeat(H,0)
    m=yy<under; m=ndimage.binary_opening(m,iterations=1)
    o=patch_fill(m,stone_src,stone_m)
    # shade: darker toward underside
    k=np.clip((yy/np.maximum(under,1)),0,1)[...,None]; o[...,:3]=(o[...,:3]*(1-0.35*k)).astype(int)
    # moss band on top 5px + blossom clumps
    top=m&(yy<6); mo=patch_fill(top,moss_src,moss_m,4); o[top]=mo[top]
    for cx in rng.choice(np.arange(4,W-8),size=max(2,W//14),replace=False):
        bm=((xx-cx)/rng.uniform(4,7))**2+((yy-2)/3.2)**2<1; bb=patch_fill(bm,bl_src,bl_m,3); o[bm]=bb[bm]; m|=bm
    # spout channel: dark wet notch in the middle of the underside + glossy edge
    nx0,nx1=int(W/2-notch/2),int(W/2+notch/2)
    ch=(xx>=nx0)&(xx<nx1)&(yy>H*0.35)&m; o[ch]=(*np.array((40,52,86)),255); o[ch&((xx==nx0)|(xx==nx1-1))]=(120,190,230,255)
    # hanging moss strands
    for sx in rng.choice(np.arange(2,W-2),size=W//6,replace=False):
        if nx0-1<=sx<=nx1: continue
        col=np.nonzero(m[:,sx])[0]
        if not len(col): continue
        y0=col.max(); L=rng.integers(2,7)
        for y in range(y0,min(H,y0+L)): o[y,sx]=(78,126,60,255) if y<y0+L-1 else (122,170,82,255); m[y,sx]=True
    out=ndimage.binary_dilation(m)&~m; o[out]=(*OUT,255)
    o[...,3]=np.where(o[...,3]>127,255,0); return o.astype(np.uint8)
def pad(o,p=1):
    return np.pad(o,((p,p),(p,p),(0,0)))
for i,(W,H,n) in enumerate([(52,22,20),(76,26,32),(152,34,112)]):
    Image.fromarray(lip(W,H,n)).save(P+f'props2/wf_lip{i}.png')
# basin: water from d67 top (rows 2..20), stone rim from d67 bottom rows
water=d67[3:22,3:-3]; rim=d67[24:,:]; rim_m=opaque(rim)
def basin(W,frames=4):
    H=22; sheet=[]
    yy,xx=np.mgrid[0:H,0:W]
    bowl=(yy>=5)&(yy<H-2)&(np.abs(xx-W/2)<W/2-1-np.maximum(0,(yy-H+8))*1.2)
    rimm=(yy>=H-8)&(np.abs(xx-W/2)<W/2-((yy-(H-8))*0.6))|((np.abs(xx-W/2)>W/2-6)&(yy>=4)&(yy<H-2))
    rimm&=~((yy<H-7)&(np.abs(xx-W/2)<W/2-6))
    rimtex=patch_fill(rimm,rim,rim_m,6)
    for f in range(frames):
        o=np.zeros((H,W,4),int)
        wm=bowl&~rimm
        for y,x in zip(*np.nonzero(wm)): o[y,x]=water[(y-5)%water.shape[0],(x+f*3)%water.shape[1]]
        o[wm,3]=255
        # ripple highlight rings scrolling outward from center
        rr=np.random.default_rng(11)
        pts=[(rr.integers(7,H-3),rr.uniform(0,W/2),rr.integers(2,5)) for _ in range(W//5)]
        for y,x in zip(*np.nonzero(wm)):
            if y==5: o[y,x,:3]=(198,240,255)
            elif y==6: o[y,x,:3]=(120,200,240)
        for (py,d,L) in pts:   # glints drift outward from the plunge point frame by frame
            for sgn in (-1,1):
                x0=int(W/2+sgn*((d+f*2.5)%(W/2-6)))
                for k in range(L):
                    x=x0+sgn*k
                    if 0<=x<W and wm[py,x]: o[py,x,:3]=(198,240,255) if k<L-1 else (150,215,250)
        o[rimm]=rimtex[rimm]; o[rimm,3]=255
        m=o[...,3]>0; out=ndimage.binary_dilation(m)&~m; o[out]=(*OUT,255)
        o[...,3]=np.where(o[...,3]>127,255,0); sheet.append(o.astype(np.uint8))
    return np.concatenate(sheet,1)
for i,W in enumerate([56,88,176]): Image.fromarray(basin(W)).save(P+f'props2/wf_basin{i}.png')
Image.fromarray(d82.astype(np.uint8)).save(P+'props2/wf_rocks.png')
print('ok')
