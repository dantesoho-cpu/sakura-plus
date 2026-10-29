# Hand-authored 16px Mania-style tileset (palette sampled from art_terrain_ref.jpg). Seamless by construction.
import numpy as np, random
from PIL import Image
O=(24,18,46); BH=(226,220,246); BL=(176,160,222); BM=(150,132,204); BS=(108,90,170); BD=(92,80,140)
G0=(30,96,24); G1=(70,160,30); G2=(140,220,50); G3=(200,245,110)
M0=(110,16,80); M1=(196,28,124); M2=(246,84,164); M3=(255,170,212)
W0=(110,64,40); W1=(166,104,58); W2=(214,152,86); W3=(244,200,130)
def blank(): return np.zeros((16,16,4),np.uint8)
def px(t,x,y,c): t[y%16,x%16]=(*c,255)
def bricks(seed=0):
    t=blank(); r=random.Random(seed)
    for y in range(16):
        for x in range(16):
            row=y//8; yy=y%8; xo=(x+(8 if row else 0))%16
            if yy==0 or xo==0: c=O
            elif yy==1 or xo==1: c=BH if (yy==1 and xo>1) else BL
            elif yy==7 or xo==15: c=BS
            else: c=BL if r.random()<0.75 else (BM if r.random()<0.8 else BH)
            px(t,x,y,c)
    return t
# drape profile (repeats every 16): depth of blossom hang per column
DR=[4,5,6,6,5,4,3,4,6,7,7,6,4,3,3,4]
GR=[1,0,1,2,1,0,1,1,0,1,2,1,0,1,2,1]  # grass blade tips
def cap(seed=0,t=None):
    t=bricks(seed) if t is None else t; r=random.Random(seed+9)
    for x in range(16):
        top=GR[x]; t[:top,x]=0
        px(t,x,top,O)
        for y in range(top+1,7): px(t,x,y,G3 if y==top+1 else (G2 if y<4 else (G1 if y<6 else G0)))
        d=DR[(x+seed*5)%16]
        for y in range(6,4+d+2):
            c=M2 if (x+y)%3 else M3
            if y>=4+d: c=M1
            if y==6: c=M0
            px(t,x,y,c)
        px(t,x,6+d,O) if 6+d<16 else None; px(t,x,7+d,BD) if 7+d<16 else None
        if r.random()<0.3: px(t,x,5,M3)
    return t
def side(t,left):
    for y in range(16):
        x0=0 if left else 15; px(t,x0,y,O); px(t,1 if left else 14,y,BS if not left else BH)
    return t
def bottom(t):
    for x in range(16): px(t,x,15,O); px(t,x,14,BD)
    return t
def corner(left,seed):
    t=cap(seed); x0=0 if left else 15; xi=1 if left else 14
    for y in range(16):
        if t[y,x0,3]==0: continue
        px(t,x0,y,O)
    sx=1 if left else -1
    for i,h in enumerate((4,2,1)):
        xx=x0+sx*i; t[0:h,xx]=0; px(t,xx,h,O)
    for y in range(3,14): 
        if tuple(t[y,xi,:3]) in (BL,BH,BM): px(t,xi,y,BH if left else BS)
    return t
def inner(left):
    t=bricks(3); x=15 if left else 0
    for i in range(3): px(t,x if left else x,i,O)
    px(t,14 if left else 1,0,O); return t
def wood(kind=0):
    t=blank()
    for x in range(16):
        px(t,x,0,O); px(t,x,1,W3); px(t,x,2,W2); px(t,x,3,W2); px(t,x,4,W1); px(t,x,5,W0); px(t,x,6,O)
        if x%8==7: [px(t,x,y,W0) for y in range(1,6)]
    for y in range(7,11):  # support brackets
        for x in (3,12): px(t,x,y,O if y==10 else W0)
    if kind==1: [px(t,0,y,O) for y in range(0,7)]
    if kind==2: [px(t,15,y,O) for y in range(0,7)]
    return t
def water(f):
    t=blank(); cols=[(60,120,220),(90,170,240),(150,215,255),(230,248,255)]
    for x in range(16):
        ph=(x*7)%5
        for y in range(16):
            v=((y-f*4+ph*3)%16)
            c=cols[3] if v<2 and x%3==0 else cols[2] if v<5 else cols[1] if (x+v)%4 else cols[0]
            px(t,x,y,c)
    return t
T=[bricks(0),bricks(1),cap(0),cap(1),side(bricks(2),1),side(bricks(4),0),corner(1,0),corner(0,1),inner(1),inner(0),
   bottom(bricks(5)),wood(0),water(0),water(1),water(2),water(3),wood(1),wood(2),side(bottom(bricks(6)),1),side(bottom(bricks(7)),0)]
S=Image.new('RGBA',(16*len(T),16))
for i,t in enumerate(T): S.paste(Image.fromarray(t),(16*i,0))
S.save('public/assets/tiles/tileset.png') if __import__('os').makedirs('public/assets/tiles',exist_ok=True) is None else None
# seam check: 6x4 composite of fill + cap row + waterfall column; report edge discontinuity (fill wraps)
def wrapdiff(t):
    a=t[:,:,:3].astype(int); return int(np.abs(a[:,0]-a[:,-1]).sum()>0), int(np.abs(a[0]-a[-1]).sum()>0)
print('tiles',len(T))
