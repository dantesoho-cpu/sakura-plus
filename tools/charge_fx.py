"""Charge-pose FX pass (round 11c): on top of assets_src/charge_base.png (6 foot-anchored frames, 64x48),
add per-frame hi-bit build-up: hard-pixel muzzle glow growing, energy motes converging on the hands,
hair whipping back (row wave), coat hem sway, cyan rim light on the leading edge. No AA, palette pixels only."""
from PIL import Image; import numpy as np, math
src=np.array(Image.open('assets_src/charge_base.png').convert('RGBA')); out=src.copy(); N=6
OUT=(4,2,7,255); C=[(16,40,96,255),(36,110,200,255),(90,200,255,255),(190,245,255,255),(236,255,255,255)]  # ring->core
def put(f,x,y,c):
  if 0<=x<64 and 0<=y<48: f[y,x]=c
for i in range(N):
  f=src[:,i*64:(i+1)*64].copy(); al=f[...,3]>0; ys,xs=np.where(al); k=i/(N-1)
  # --- hair whip: red pixels left of the head shift back by a row wave that grows with k
  red=(f[...,0]>110)&(f[...,2]<90)&al; hy,hx=np.where(red); cxh=hx.mean()
  g=f.copy(); amp=[0,1,1,2,2,3][i]
  for y in range(hy.min(),hy.max()+1):
    d=int(round(amp*(0.6+0.4*math.sin(y*0.9+i*1.7))*((hy.max()-y+2)/(hy.max()-hy.min()+2))))
    if d<=0: continue
    row=np.where(red[y]&(np.arange(64)<cxh))[0]
    if not len(row): continue
    x0=row.min()
    for x in range(x0-d-1,x0): put(g,x,y,f[y,x0+1] if red[y,x0+1] else f[y,x0])
    put(g,x0-d-2,y,OUT)  # keep the 1px dark outline on the whipped tip
  f=g
  # --- coat hem sway: trailing (left) edge of rows below the hip pushed back 0/1/2 px
  sway=[0,1,0,1,2,1][i]; yh=ys.min()+int((ys.max()-ys.min())*0.62)
  for y in range(yh,yh+7):
    r=np.where(f[y,:,3]>0)[0]
    if len(r) and sway:
      x0=r.min(); fill=f[y,x0+1].copy()
      for x in range(x0-sway,x0): put(f,x,y,fill)
      put(f,x0-sway-1,y,OUT)
  # --- muzzle: rightmost opaque pixel in the arm band
  band=[(np.where(f[y,:,3]>0)[0].max(),y) for y in range(ys.min()+10,ys.min()+18) if (f[y,:,3]>0).any()]
  mx,my=max(band); mx+=2; R=[1,1,2,2,3,4][i]
  pulse=i>=4
  for dy in range(-R-1,R+2):
    for dx in range(-R-1,R+2):
      d=math.hypot(dx,dy*1.15)
      if d<=R+0.5: lvl=4 if d<=R*0.35 else 3 if d<=R*0.6 else 2 if d<=R*0.85 else 1
      elif d<=R+1.2 and (dx+dy+i)%2==0 and R>=2: lvl=0
      else: continue
      put(f,mx+dx,my+dy,C[lvl])
  if pulse:  # full charge: 4-point star flare
    for t in range(R+1,R+4): put(f,mx+t,my,C[3]); put(f,mx-t-1 if False else mx,my-t,C[2]); put(f,mx,my+t,C[2])
  # --- energy motes converging: 6 seeded rays, distance shrinking per frame, cycling
  rng=np.random.default_rng(7)
  for j in range(6):
    ang=rng.uniform(0,2*math.pi); ph=(j/6+ k*0.9)%1; dist=int(3+14*(1-ph))
    x=int(mx-3+math.cos(ang)*dist); y=int(my+math.sin(ang)*dist*0.8)
    if f[min(max(y,0),47),min(max(x,0),63),3]>0 and dist>5: continue  # don't sit on the body
    put(f,x,y,C[3 if dist<8 else 2])
    if dist>=9: put(f,x+(1 if math.cos(ang)<0 else -1),y,C[1])  # short trail toward the hand
  # --- rim light: leading-edge (right) body pixels in the torso, cyan, more rows as k grows
  for y in range(hy.max()+2,hy.max()+2+int(3+10*k)):
    r=np.where(src[y,i*64:(i+1)*64,3]>0)[0]
    if len(r)>2 and abs(y-my)>R+1: put(f,r.max()-1,y,C[2] if k>0.5 else C[1])
  out[:,i*64:(i+1)*64]=f
Image.fromarray(out).save('public/assets/sakura/charge.png')
big=Image.new('RGBA',(64*N*4,48*4),(58,86,140,255)); im=Image.fromarray(out).resize((64*N*4,48*4),Image.NEAREST); big.alpha_composite(im); big.save('audit/v11/charge6_fx.png')
