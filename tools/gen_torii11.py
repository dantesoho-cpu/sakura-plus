# hi-bit vermilion torii for the end gate (in front of the car). 104x112, hard pixel shading, dark outline, no AA fringe.
from PIL import Image
W,H=104,112; im=Image.new('RGBA',(W,H),(0,0,0,0)); px=im.load()
OUT=(26,15,46,255); V=[(122,22,30),(178,36,38),(222,62,46),(246,108,70)]; BK=[(20,16,28),(40,32,50),(64,54,76)]; GO=[(150,104,30),(214,160,52),(250,214,110)]
def put(x,y,c):
    if 0<=x<W and 0<=y<H: px[x,y]=c+(255,) if len(c)==3 else c
def rect(x0,y0,x1,y1,shade):  # shade fn(x,y)->color
    for y in range(y0,y1):
        for x in range(x0,x1): put(x,y,shade(x,y))
import math
# kasagi (top beam), upswept ends: y offset by curve
for x in range(0,W):
    t=abs(x-W/2)/(W/2); lift=int(round(7*t**2.4))
    top=8-lift; 
    for y in range(top,top+5): put(x,y,BK[0] if y==top else BK[1] if y<top+3 else BK[2])
    for y in range(top+5,top+11): put(x,y,V[3] if y==top+5 else V[2] if y<top+9 else V[1])
# shimaki under kasagi
for x in range(6,W-6):
    for y in range(19,23): put(x,y,V[2] if y==17 else V[1] if y<20 else V[0])
# nuki (lower tie beam) extends past pillars
for x in range(4,W-4):
    for y in range(34,40): put(x,y,V[3] if y==34 else V[2] if y<37 else V[1] if y<39 else V[0])
# pillars, slight inward lean (hashira)
for side in (0,1):
    for y in range(23,H-12):
        k=(y-23)/(H-35); cxp=(19 if side==0 else W-20)+(int(round(-2*k)) if side==0 else int(round(2*k)))
        for x in range(cxp-5,cxp+6):
            d=x-cxp; c=V[3] if d<=-4 else V[2] if d<=0 else V[1] if d<4 else V[0]
            if 34<=y<40: continue
            put(x,y,c)
    # kamaki (black base) + stone
    cxb=(17 if side==0 else W-18)
    for y in range(H-12,H-3):
        for x in range(cxb-7,cxb+8): put(x,y,BK[2] if x<cxb-4 else BK[1] if x<cxb+3 else BK[0])
    for y in range(H-3,H):
        for x in range(cxb-9,cxb+10): put(x,y,(96,90,100) if y==H-3 else (66,60,74))
# gakuzuka + gold plaque
for y in range(22,34):
    for x in range(W//2-3,W//2+3): put(x,y,V[1])
for y in range(22,33):
    for x in range(W//2-8,W//2+8):
        e=(x in (W//2-8,W//2+7) or y in (22,32)); put(x,y,GO[1] if e else BK[1])
for y,x0,x1 in [(24,-4,4),(26,-3,3),(28,-4,4),(30,-3,3)]:
    for x in range(W//2+x0,W//2+x1): put(x,y,GO[2])
for y in range(24,31): put(W//2,y,GO[2])
# outline
a=im.copy(); ap=a.load()
for y in range(H):
    for x in range(W):
        if ap[x,y][3]==0 and any(0<=x+dx<W and 0<=y+dy<H and ap[x+dx,y+dy][3]>0 for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))): px[x,y]=OUT
im.save('public/assets/props2/torii11.png'); im.resize((W*4,H*4),Image.NEAREST).save('audit/v11/torii11_x4.png')
