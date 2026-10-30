# Neo-Kyo platform redraw: crisp procedural pixel art in the sheet's design + palette (glass-panel decks, neon trim,
# blossom planters, lattice pylons, trusses, stairs). 16px grid. Writes public/assets/l2/plat/*.png + plat.json (walk-top y).
from PIL import Image; import numpy as np, json, os, random
O=(3,9,52); D1=(4,19,70); D2=(14,41,105); M=(32,69,145); M2=(36,97,178); L=(157,182,226); W=(232,220,245)
G=(70,150,235); G2=(170,220,255); P=(232,80,196); P2=(255,170,235); V=(94,37,114); V2=(168,93,171)
B0=(150,50,140); B1=(208,86,182); B2=(244,150,215); B3=(255,210,240); C=(80,230,255); LEAF=(40,110,90)
os.makedirs('public/assets/l2/plat',exist_ok=True); META={}
class Cv:
  def __init__(s,w,h): s.a=np.zeros((h,w,4),np.uint8); s.w=w; s.h=h
  def px(s,x,y,c):
    if 0<=x<s.w and 0<=y<s.h: s.a[y,x,:3]=c; s.a[y,x,3]=255
  def rect(s,x0,y0,x1,y1,c):
    for y in range(max(0,y0),min(s.h,y1)): 
      for x in range(max(0,x0),min(s.w,x1)): s.px(x,y,c)
  def hl(s,x0,x1,y,c): s.rect(x0,y,x1,y+1,c)
  def outline(s):
    al=np.pad(s.a[...,3]>0,1); e=np.zeros_like(al)
    for dy,dx in((1,0),(-1,0),(0,1),(0,-1)): e|=np.roll(np.roll(al,dy,0),dx,1)
    e=(e&~al)[1:-1,1:-1]; s.a[e]=(*O,255)
  def save(s,n,top,**k): Image.fromarray(s.a,'RGBA').save(f'public/assets/l2/plat/{n}.png'); META[n]=dict(w=s.w,h=s.h,top=top,**k)
def deck(c,x0,y0,w,style='glass',neon=P2):
  # 16-high deck body; walk surface at y0
  x1=x0+w; c.hl(x0,x1,y0,neon); c.hl(x0,x1,y0+1,L); c.rect(x0,y0+2,x1,y0+11,M); c.hl(x0,x1,y0+2,M2)
  if style=='glass':
    for px_ in range(x0+3,x1-3,16):
      pw=min(12,x1-3-px_); 
      if pw<5: continue
      c.rect(px_,y0+4,px_+pw,y0+10,G); c.hl(px_,px_+pw,y0+4,G2)
      for k in range(3): c.px(px_+2+k,y0+8-k,G2); c.px(px_+6+k,y0+8-k,W) if px_+6+k<px_+pw else None
      c.rect(px_-1,y0+3,px_,y0+11,D2)
  elif style=='vent':
    for x in range(x0+2,x1-2): 
      if x%3==0: c.rect(x,y0+4,x+1,y0+10,D1)
      c.hl(x0+2,x1-2,y0+4,D2)
  elif style=='neon':
    c.rect(x0+2,y0+5,x1-2,y0+8,V); c.hl(x0+2,x1-2,y0+6,P)
    for x in range(x0+4,x1-4,8): c.px(x,y0+6,P2)
  c.hl(x0,x1,y0+11,M2); c.rect(x0,y0+12,x1,y0+15,D2)
  for x in range(x0+4,x1-3,8): c.px(x,y0+13,L)
  c.hl(x0,x1,y0+15,D1)
  for ex in (x0,x1-3): c.rect(ex,y0+1,ex+3,y0+15,M); c.rect(ex+1,y0+3,ex+2,y0+12,D2); c.px(ex+1,y0+5,C); c.px(ex+1,y0+9,C)
def underglow(c,x0,y0,w,col=C):
  for x in range(x0+4,x1:=x0+w-4): c.px(x,y0,col) if (x//2)%2==0 else c.px(x,y0,(40,120,200))
def truss(c,x0,y0,w,h):
  c.rect(x0+2,y0,x0+w-2,y0+2,D2); c.rect(x0+2,y0+h-2,x0+w-2,y0+h,D2); c.hl(x0+2,x0+w-2,y0+h-2,M)
  for k in range(0,w-4,h):
    for t in range(h):
      c.px(x0+2+k+t,y0+t,M); c.px(x0+2+k+t+1,y0+t,D2); c.px(x0+2+k+h-t,y0+t,M2)
    c.rect(x0+2+k,y0,x0+4+k,y0+h,M)
def pylon(c,cx,y0,h,wd=14):
  x0=cx-wd//2; c.rect(x0,y0,x0+2,y0+h,M); c.rect(x0+wd-2,y0,x0+wd,y0+h,M); c.hl(x0,x0+2,y0,L)
  for y in range(y0,y0+h,wd):
    for t in range(wd-4):
      if y+t<y0+h: c.px(x0+2+t,y+t,D2); c.px(x0+wd-3-t,y+t,M2)
    c.hl(x0,x0+wd,y,M)
  c.rect(x0-3,y0+h-4,x0+wd+3,y0+h,D2); c.hl(x0-3,x0+wd+3,y0+h-4,M2)
  for y in range(y0+6,y0+h-6,18): c.px(cx,y,C); c.px(cx,y+1,(40,120,200))
def bush(c,cx,by,r,rng):
  # puffy sakura crown: overlapping lobes, shaded dark->light toward upper-left, sparkle petals
  lobes=[(cx+rng.randint(-r,r),by-r+rng.randint(-r//2,r//3),rng.randint(r//2+1,r)) for _ in range(5)]+[(cx,by-r,r)]
  for tone,dx,dy,sh in ((B0,1,1,0),(B1,0,0,1),(B2,-1,-1,3),(B3,-2,-2,6)):
    for (lx,ly,lr) in lobes:
      rr=lr-sh
      if rr<=0: continue
      for y in range(-rr,rr+1):
        for x in range(-rr-1,rr+2):
          if (x/(rr+0.6))**2+(y/(rr*0.8+0.4))**2<=1 and rng.random()>(0.12 if sh else 0): c.px(lx+x+dx,ly+y+dy,tone)
  for _ in range(r): c.px(cx+rng.randint(-2*r,2*r),by+rng.randint(-2*r,2)-r,B3)
def planter(c,x0,y0,w,rng):
  # low pot along the deck back; blossoms rise behind walk line (decor, no collision)
  for cx in range(x0+10,x0+w-6,rng.choice([18,22,26])):
    bush(c,cx+rng.randint(-3,3),y0-1,rng.randint(6,8),rng)
  for x in range(x0+3,x0+w-3,7): c.px(x,y0-1,LEAF)
rng=random.Random(7)
# 1) plain decks, several widths x styles
for st in ('glass','vent','neon'):
  for tw in (3,5,8,12):
    w=tw*16; c=Cv(w,22); deck(c,0,1,w,st); underglow(c,0,17,w, C if st!='neon' else P); c.outline(); c.save(f'deck_{st}_{tw}',top=1,solid=False)
# 2) planter decks
for tw in (4,6,10):
  w=tw*16; c=Cv(w,46); planter(c,0,24,w,rng); deck(c,0,24,w,'glass'); underglow(c,0,40,w); c.outline(); c.save(f'planter_{tw}',top=24,solid=False)
# 3) pylon platforms (giant, solid footing) heights
for tw,h in ((4,96),(6,160),(8,224)):
  w=tw*16; c=Cv(w+6,h+20); deck(c,3,1,w,'glass'); pylon(c,3+w//2,17,h,16 if tw>4 else 12); 
  if tw>=6: pylon(c,3+w//5,17,h,10); pylon(c,3+w-w//5,17,h,10)
  c.outline(); c.save(f'pylon_{tw}x{h}',top=1,solid=True)
# 4) truss bridges
for tw in (10,16):
  w=tw*16; c=Cv(w,42); deck(c,0,1,w,'neon'); truss(c,0,17,w,22); c.outline(); c.save(f'bridge_{tw}',top=1,solid=False)
# 5) stairs (4 steps, up-right)
c=Cv(96,70)
for i in range(4): deck(c,i*16,52-i*16,96-i*16 if i==3 else 32,'vent')
c.outline(); c.save('stairs_4',top=4,solid=True,slope='steps16')
# 6) solid ground block (tileable 64 wide) : deck on a building facade with windows
w=64; c=Cv(w,96); deck(c,0,1,w,'glass')
c.rect(0,17,w,96,D1)
for y in range(22,96,14):
  for x in range(4,w-4,12):
    lit=rng.random()<0.45; c.rect(x,y,x+7,y+8,D2); c.rect(x+1,y+1,x+6,y+7,(G if lit else M)); 
    if lit: c.hl(x+1,x+6,y+1,G2)
c.rect(0,17,2,96,M); c.rect(w-2,17,w,96,M); c.save('ground_64',top=1,solid=True,tile=True)
json.dump(META,open('public/assets/l2/plat/plat.json','w'),indent=0); print(len(META))
