# Round 11 enemies, hi-bit gunmetal style matching bot/drone/turret sheets: dark outline, 4-tone shading, red optics. No white fringe.
from PIL import Image
import math
O='public/assets/enemies/'
OUT=(18,14,34,255); G=[(26,23,34,255),(59,48,74,255),(86,77,101,255),(120,104,125,255),(149,138,149,255)]
RED=[(67,28,36,255),(170,20,40,255),(255,48,64,255),(255,160,150,255)]
def px(im,x,y,c):
    if 0<=x<im.size[0] and 0<=y<im.size[1]: im.putpixel((int(x),int(y)),c)
def blob(im,cx,cy,rx,ry,pal=G):
    for y in range(int(cy-ry-1),int(cy+ry+2)):
        for x in range(int(cx-rx-1),int(cx+rx+2)):
            dx=(x+.5-cx)/rx; dy=(y+.5-cy)/ry; d=dx*dx+dy*dy
            if d<=1:
                l=(-dx*0.6-dy*0.8)*0.5+0.5*(1-d)  # light from top-left
                i=min(len(pal)-1,max(0,int(l*len(pal)*1.25)))
                px(im,x,y,pal[i])
def box(im,x0,y0,x1,y1,pal=G):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            i=2 if 0<x-x0<x1-x0 and 0<y-y0<y1-y0 else (3 if (y==y0 or x==x0) else 1)
            px(im,x,y,pal[i])
def outline(im):
    w,h=im.size; s=im.copy()
    for y in range(h):
        for x in range(w):
            if s.getpixel((x,y))[3]==0 and any(0<=x+a<w and 0<=y+b<h and s.getpixel((x+a,y+b))[3]>0 and s.getpixel((x+a,y+b))!=OUT for a,b in((1,0),(-1,0),(0,1),(0,-1))): im.putpixel((x,y),OUT)
    return im
def eye(im,x,y,r=1.6,on=True):
    blob(im,x,y,r+0.6,r+0.6,[OUT,G[0]]); blob(im,x,y,r,r,RED if on else [RED[0],RED[1]]); px(im,x-0.6,y-0.6,RED[3] if on else RED[1])
def sheet(frames,name):
    w,h=frames[0].size; s=Image.new('RGBA',(w*len(frames),h))
    for i,f in enumerate(frames): s.paste(outline(f),(i*w,0))
    s.save(O+name)
# --- Wasp bomber: capsule hull, underslung bomb bay, two side thrusters with flicker ---
fr=[]
for i in range(6):
    im=Image.new('RGBA',(34,22)); bob=[0,0,1,1,0,0][i]
    for sx in(4,29): box(im,sx-3,7+bob,sx+3,12+bob); [px(im,sx+a,13+bob+(i%2),(255,90,60,255) if a==0 else RED[1]) for a in(-1,0,1)]
    for sx in(4,29): [px(im,sx+a,4+bob,G[4] if (a+i)%3 else G[2]) for a in range(-4,5)]  # rotor blur
    blob(im,17,10+bob,10,6); box(im,13,14+bob,21,17+bob,G); px(im,17,18+bob,RED[2] if i>=4 else RED[1])
    eye(im,22,10+bob,1.8, True)
    for x in range(9,15): px(im,x,8+bob,G[4])
    fr.append(im)
sheet(fr,'wasp6.png')
# --- Sentry sniper: tripod mast, long rail barrel, scanning optic; frames 4-5 charge (barrel coils glow) ---
fr=[]
for i in range(6):
    im=Image.new('RGBA',(30,34)); ch=i>=4
    for lx,ex in((8,3),(14,14),(20,25)):
        for t in range(10): px(im,lx+(ex-lx)*t/9,24+t,G[2] if t<8 else G[1])
    box(im,12,14,17,25); blob(im,14.5,12,7,5.5)
    box(im,17,9,28,12); 
    for k in range(3): px(im,20+k*3,10,RED[2] if ch and (i+k)%2==0 else G[1]); px(im,20+k*3,11,RED[1] if ch else G[0])
    px(im,29,10,RED[3] if ch else RED[1]); px(im,29,11,RED[2] if ch else RED[0])
    eye(im,11+[0,1,2,1,2,2][i],11,1.7)
    fr.append(im)
sheet(fr,'sentry6.png')
# --- Shield trooper: squat walker with a hex energy shield plate held forward ---
fr=[]
for i in range(6):
    im=Image.new('RGBA',(30,32)); st=[0,1,2,1,0,0][i]
    for lx,ph in((9,0),(16,1)):
        o=[0,2,0,-2][(i+ph*2)%4] if i<4 else 0
        box(im,lx+o//2,22,lx+3+o//2,30); box(im,lx-1+o//2,29,lx+4+o//2,31,[G[0],G[1],G[2],G[3]])
    blob(im,13,15-st*0.3,9,8); box(im,8,8,18,12); eye(im,16,10,1.6)
    for y in range(10,30): px(im,7,y,G[1])
    # shield plate (front, right side)
    for y in range(6,30):
        wv=3 if 9<y<27 else 2
        for x in range(23,23+wv): px(im,x,y,(40,120,170,255) if x==23 else (90,200,240,255) if (y+i)%5 else (190,240,255,255))
    px(im,22,6,G[3]); px(im,22,29,G[3]); [px(im,21,y,G[2]) for y in range(8,28)]
    fr.append(im)
sheet(fr,'trooper6.png')
print('ok')
