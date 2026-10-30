# Game-scale enemy frames from the sheet cuts: premultiplied Lanczos resize, hard alpha, 1px dark outline, light sharpen.
import numpy as np, json
from PIL import Image, ImageFilter
from scipy import ndimage as nd
S='public/assets/l2/enemy/'; O='public/assets/l2/en/'
def fit(k,h):
  im=Image.open(S+k+'.png').convert('RGBA'); a=np.array(im).astype(float); a[...,:3]*=a[...,3:]/255
  w=max(1,round(im.width*h/im.height)); r=np.array(Image.fromarray(a.clip(0,255).astype(np.uint8)).resize((w,h),Image.LANCZOS)).astype(float)
  al=r[...,3]; rgb=np.where(al[...,None]>0,r[...,:3]*255/np.maximum(al[...,None],1),0)
  m=al>110; m=nd.binary_opening(m,np.ones((1,1)))
  out=np.zeros((h+2,w+2,4)); out[1:-1,1:-1,:3]=rgb; out[1:-1,1:-1,3]=m*255
  mm=np.pad(m,1); ring=nd.binary_dilation(mm)&~mm; out[ring]=(14,10,34,255)
  img=Image.fromarray(out.clip(0,255).astype(np.uint8)); s=img.filter(ImageFilter.UnsharpMask(1,60,2)); s.putalpha(img.getchannel('A')); return s
def legs(img,dy):  # shift left/right halves of the bottom 38% vertically in opposite directions -> step frame
  a=np.array(img); h,w=a.shape[:2]; y0=int(h*0.62); b=a.copy(); b[y0:]=0
  L=a[y0:,:w//2]; R=a[y0:,w//2:]
  def sh(x,d): z=np.zeros_like(x); 
  def put(x,d,xs):
    hh=x.shape[0]; 
    if d>=0: b[y0+d:y0+hh,xs]=np.where(x[:hh-d,...,3:]>0,x[:hh-d],b[y0+d:y0+hh,xs])
    else: b[y0:y0+hh+d,xs]=np.where(x[-d:,...,3:]>0,x[-d:],b[y0:y0+hh+d,xs])
  put(L,-dy,slice(0,w//2)); put(R,0,slice(w//2,w))
  b[-1:]=np.where(a[-1:,...,3:]>0,a[-1:],b[-1:]); return Image.fromarray(b)
def eye(img,box=None):  # brightened-red frame for the blink / charge cycle
  a=np.array(img).astype(int); r,g,bb=a[...,0],a[...,1],a[...,2]; hot=(r>150)&(r>g+50)
  a[hot,0]=255; a[hot,1]=np.minimum(255,a[hot,1]+90); a[hot,2]=np.minimum(255,a[hot,2]+90); return Image.fromarray(a.astype(np.uint8))
meta={}
def save(n,im): im.save(O+n+'.png'); meta[n]=im.size
d=fit('enemy_03',24); save('drone_0',d); save('drone_1',eye(d))
s=fit('enemy_04',30); save('sentry_0',s); save('sentry_1',legs(s,1)); save('sentry_2',eye(s))
for i,k in enumerate(['enemy_13','enemy_15','enemy_16','enemy_15']): save(f'assault_{i}',fit(k,44))
save('assault_4',eye(fit('enemy_15',44)))
sh=fit('enemy_01',48); save('shield_0',sh); save('shield_1',legs(sh,1)); save('shield_2',eye(sh))
hv=fit('enemy_02',56); save('heavy_0',hv); save('heavy_1',legs(hv,2)); save('heavy_2',eye(hv))
# unify frame sizes per unit (pad to max, bottom-centre) so sprite sheets animate without jitter
for u in ['drone','sentry','assault','shield','heavy']:
  fs=sorted(k for k in meta if k.startswith(u+'_')); W=max(meta[k][0] for k in fs); H=max(meta[k][1] for k in fs)
  for k in fs:
    im=Image.open(O+k+'.png'); c=Image.new('RGBA',(W,H)); c.paste(im,((W-im.width)//2,H-im.height)); c.save(O+k+'.png'); meta[k]=(W,H)
# shots
def glowdot(w,h,core,edge,name,shape='orb'):
  yy,xx=np.mgrid[0:h,0:w]; cx,cy=(w-1)/2,(h-1)/2
  d=np.sqrt(((xx-cx)/(w/2))**2+((yy-cy)/(h/2))**2)
  a=np.zeros((h,w,4)); t=np.clip(1-d,0,1)
  for i in range(3): a[...,i]=edge[i]+(core[i]-edge[i])*np.clip(t*2.2,0,1)
  a[...,3]=np.where(d<1,255*np.clip(t*3,0,1),0); Image.fromarray(a.astype(np.uint8)).save(O+name+'.png')
glowdot(9,9,(255,240,255),(255,60,210),'s_orb'); glowdot(12,3,(255,255,255),(255,40,60),'s_tracer')
glowdot(10,4,(230,255,255),(40,220,255),'s_bolt'); glowdot(9,9,(255,250,210),(255,120,30),'s_mortar')
# hex disk
a=np.zeros((12,12,4),np.uint8); yy,xx=np.mgrid[0:12,0:12]; r=np.maximum(abs(xx-5.5)*1.15+abs(yy-5.5)*0.55,abs(yy-5.5)*1.1)
a[(r<5.6)&(r>3.4)]=(90,240,255,255); a[(r<=3.4)&(r>2)]=(220,255,255,200); Image.fromarray(a).save(O+'s_disk.png')
# shockwave
w,h=26,12; a=np.zeros((h,w,4)); yy,xx=np.mgrid[0:h,0:w]; d=np.sqrt(((xx-12.5)/13)**2+((yy-11.5)/12)**2); band=np.clip(1-abs(d-0.8)*5,0,1)*(yy<12)
a[...,0]=255; a[...,1]=150+105*band; a[...,2]=60+150*band; a[...,3]=255*band; Image.fromarray(a.astype(np.uint8)).save(O+'s_wave.png')
json.dump(meta,open(O+'en.json','w')); print(meta)
