# Expand the 4-frame hi-bit enemy sheets into 8-frame (and attack) sets: spinning rotor blades, eye/core glow pulse, bob, lean, barrel recoil.
import numpy as np, math
from PIL import Image
E='public/assets/enemies/'
def frames(f,w): a=np.asarray(Image.open(E+f).convert('RGBA')).astype(int); return [a[:,i*w:(i+1)*w].copy() for i in range(a.shape[1]//w)]
def red(a): return (a[...,3]>0)&(a[...,0]>140)&(a[...,1]<90)&(a[...,0]-a[...,2]>60)
def glow(a,k):  # k 0..1: pulse red emissive pixels, add hot core at peak
    m=red(a); o=a.copy(); o[m,0]=np.clip(150+105*k,0,255); o[m,1]=np.clip(20+80*k*k,0,255); o[m,2]=np.clip(30+70*k*k,0,255)
    if k>0.8:
        ys,xs=np.nonzero(m)
        if len(ys): cy,cx=int(ys.mean()),int(xs.mean()); o[cy,cx,:3]=[255,230,230]
    return o
def shift(a,dx,dy):
    o=np.zeros_like(a); h,w=a.shape[:2]
    o[max(0,dy):h+min(0,dy),max(0,dx):w+min(0,dx)]=a[max(0,-dy):h-max(0,dy),max(0,-dx):w-max(0,dx)]; return o
def save(fr,name): Image.fromarray(np.concatenate(fr,1).astype(np.uint8),'RGBA').save(E+name); print(name,len(fr))
# --- drone: 8-phase rotor spin + eye pulse + 1px bob
D=frames('drone4.png',37); base=D[0]
def rotor(a,ph):
    o=a.copy(); o[0:5,:,3]=np.where(np.isin(np.arange(37),list(range(8,12))+list(range(27,31))),o[0:5,:,3],0)
    for hx in (9.5,28.5):
        th=ph*math.pi/4; L=9*abs(math.cos(th)); y=2
        for x in range(int(hx-9),int(hx+10)):  # motion blur disc
            if 0<=x<37 and abs(x-hx)<=9: o[y,x]=[200,215,225,70] if o[y,x,3]==0 else o[y,x]
        for x in range(int(round(hx-L)),int(round(hx+L))+1):
            if 0<=x<37: o[y-1,x]=[40,36,52,255]; o[y,x]=[225,232,240,255]; o[y+1,x]=[40,36,52,255]
        o[y,int(hx)]=[120,255,200,255]  # green hub light (matches sheet)
    return o
idle=[shift(glow(rotor(D[i%4],i),0.35+0.65*abs(math.sin(i*math.pi/8))),0,(1 if i in (2,3,4) else 0)) for i in range(8)]
att=[glow(rotor(D[(i+1)%4],i*2),1.0 if i%2 else 0.7) for i in range(8)]
save(idle+att,'drone8.png')
# --- bot: 8-frame walk (4 poses + in-between bobs), 8-frame attack (lean + eye flare)
B=frames('bot4.png',23)
walk=[shift(glow(B[i//2],0.5+0.5*math.sin(i*math.pi/4)),0,(1 if i%2 else 0)) for i in range(8)]
attack=[shift(glow(B[(i)%4],1.0),(-1 if i%2 else 0),0) for i in range(8)]
save(walk+attack,'bot8.png')
# --- turret: 8-frame idle (core pulse), 8-frame attack (charge -> recoil)
Tt=frames('turret4.png',27)
ti=[glow(Tt[[1,2,3,3,2,1,1,2][i]],0.3+0.5*abs(math.sin(i*math.pi/8))) for i in range(8)]
ta=[glow(Tt[3],0.6+0.05*i) for i in range(5)]+[shift(glow(Tt[3],1.0),-2,0),shift(glow(Tt[3],0.9),-1,0),glow(Tt[3],0.7)]
save(ti+ta,'turret8.png')
