# Round 11 FX sprites: crisp hi-bit pixel shapes, hard edges, no soft white fringe.
from PIL import Image
import math
O='/workspace/sakura/public/assets/fx/'
def H(c,a=255): c=c.lstrip('#'); return tuple(int(c[i:i+2],16) for i in (0,2,4))+(a,)
def img(w,h): return Image.new('RGBA',(w,h),(0,0,0,0))
def ell(im,cx,cy,rx,ry,col):
    w,h=im.size
    for y in range(h):
        for x in range(w):
            if ((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2<=1: im.putpixel((x,y),col)
# shot1: slim cyan dart with dark-teal tail
def shot1():
    im=img(16,6)
    ell(im,9,3,7,2.2,H('#1f8fb8')); ell(im,10,3,5.5,1.5,H('#3ff3ff')); ell(im,11.5,3,3,1,H('#e8ffff'))
    for x in range(0,4): im.putpixel((x,3),H('#1f6f9a',160-x*0))
    im.save(O+'shot1.png')
# shot2: twin helix bolt pink/cyan
def shot2():
    im=img(22,10)
    ell(im,12,5,10,3.4,H('#7a1f6a')); ell(im,13,5,8,2.4,H('#ff4fd8')); ell(im,14.5,5,5,1.4,H('#ffd0f4'))
    for x in range(1,20):
        y=5+round(3.2*math.sin(x*0.55)); im.putpixel((x,max(0,min(9,y))),H('#3ff3ff'))
        y2=5-round(3.2*math.sin(x*0.55)); im.putpixel((x,max(0,min(9,y2))),H('#9ff3ff'))
    im.save(O+'shot2.png')
# shot3: heavy plasma lance with forward chevron + ring
def shot3():
    im=img(30,16)
    ell(im,17,8,12,5,H('#3a1a7a')); ell(im,18,8,10,4,H('#7f4fff')); ell(im,19,8,8,3,H('#ff4fd8')); ell(im,21,8,5,2,H('#ffd23f')); ell(im,22,8,2.6,1.2,H('#fff6d0'))
    for i in range(6):  # chevron
        for (x,y) in ((27-i,8-i//1.5),(27-i,8+i//1.5)):
            x=int(x);y=int(y)
            if 0<=y<16: im.putpixel((x,y),H('#ffd23f'))
    for y in range(2,14): im.putpixel((6,y),H('#3ff3ff') if 3<y<12 else H('#1f8fb8'))
    for y in range(4,12): im.putpixel((3,y),H('#1f8fb8'))
    im.save(O+'shot3.png')
# enemy orb: hot red core, violet rim, ring ticks
def eorb():
    im=img(18,18); ell(im,9,9,7.5,7.5,H('#8a0f2a')); ell(im,9,9,6.2,6.2,H('#ff2f4f')); ell(im,9,9,4.4,4.4,H('#ff8f3f')); ell(im,9,9,2.6,2.6,H('#ffe08f')); ell(im,8,8,1.2,1.2,H('#ffffff'))
    for x,y in((9,0),(9,17),(0,9),(17,9)): im.putpixel((x,y),H('#ff5f6f'))
    outline_later.append((im,'eorb'))
def eneedle():
    im=img(24,9); ell(im,12,4.5,11,3.2,H('#8a1f0f')); ell(im,13,4.5,9.5,2.2,H('#ff5f2f')); ell(im,15,4.5,6.5,1.3,H('#ffd23f')); ell(im,18,4.5,3,0.7,H('#ffffff'))
    outline_later.append((im,'eneedle'))
def eplasma():
    im=img(24,24); ell(im,12,12,10,10,H('#4a0f7a')); ell(im,12,12,8.6,8.6,H('#9f2fe8')); ell(im,12,12,6.5,6.5,H('#ff3f9f')); ell(im,12,12,4,4,H('#ffb08f')); ell(im,11,11,1.8,1.8,H('#ffffff'))
    for a in range(8):
        x=12+round(10.6*math.cos(a*math.pi/4)); y=12+round(10.6*math.sin(a*math.pi/4))
        if 0<=x<24 and 0<=y<24: im.putpixel((x,y),H('#ff9fe0'))
    outline_later.append((im,'eplasma'))
outline_later=[]
# pickups (normal blend, dark outline like the tiles)
def outline(im,col=H('#1a0f2e')):
    w,h=im.size; src=im.copy()
    for y in range(h):
        for x in range(w):
            if src.getpixel((x,y))[3]==0 and any(0<=x+dx<w and 0<=y+dy<h and src.getpixel((x+dx,y+dy))[3]>0 for dx,dy in((1,0),(-1,0),(0,1),(0,-1))): im.putpixel((x,y),col)
    return im
def heart():
    im=img(14,13)
    for y in range(13):
        for x in range(14):
            X=(x+.5-7)/5.2; Y=(6.0-(y+.5))/5.2
            if (X*X+Y*Y-1)**3-X*X*Y**3<=0: im.putpixel((x,y),H('#d81f5f'))
    for (x,y) in ((4,3),(5,3),(4,4),(3,4),(9,3),(9,4)): im.putpixel((x,y),H('#ff8fb8'))
    for (x,y) in ((4,4),(4,5)): im.putpixel((x,y),H('#ffe0ec'))
    for y in range(13):
        for x in range(14):
            p=im.getpixel((x,y))
            if p[3] and y>=8 and p[:3]==(0xd8,0x1f,0x5f): im.putpixel((x,y),H('#9a0f3f'))
    outline(im).save(O+'pk_heart.png')
def core(name,c1,c2,c3):
    im=img(14,14)
    for y in range(14):
        for x in range(14):
            if abs(x+.5-7)+abs(y+.5-7)<=6.2: im.putpixel((x,y),H(c1))
            if abs(x+.5-7)+abs(y+.5-7)<=4.2: im.putpixel((x,y),H(c2))
            if abs(x+.5-7)+abs(y+.5-7)<=2: im.putpixel((x,y),H(c3))
    im.putpixel((5,5),H('#ffffff')); im.putpixel((6,4),H('#ffffff'))
    outline(im).save(O+name)
for f in (shot1,shot2,shot3,eorb,eneedle,eplasma,heart): f()
for im,n in outline_later: outline(im).save(O+n+'.png')
core('pk_rapid.png','#1f6fb8','#3ff3ff','#e8ffff')
core('pk_power.png','#8f4f0f','#ffd23f','#fff6d0')
print('ok')
