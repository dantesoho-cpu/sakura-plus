# Repaint the SEGA marks on cut signs with invented Neo-Kyo branding; strip the divider line from boss_00. Run after l2_cut.py.
from PIL import Image; import numpy as np, scipy.ndimage as nd, sys
sys.path.insert(0,'tools'); from l2_parallax import F3
def letter(a,x0,y0,x1,y1,txt,sc,fill,core,glow):
  a[y0:y1,x0:x1,:3]=fill; a[y0:y1,x0:x1,3]=255
  w=len(txt)*4*sc-sc; h=5*sc; ox=(x1-x0-w)//2; oy=(y1-y0-h)//2; m=np.zeros((y1-y0,x1-x0),bool)
  for i,ch in enumerate(txt):
    for r,row in enumerate(F3[ch]):
      for k,b in enumerate(row):
        if b=='1': m[oy+r*sc:oy+(r+1)*sc, ox+(i*4+k)*sc:ox+(i*4+k+1)*sc]=True
  g=nd.binary_dilation(m)&~m; sub=a[y0:y1,x0:x1]; sub[g,:3]=glow; sub[m,:3]=core
p='public/assets/l2/tiles/'
a=np.array(Image.open(p+'tiles_10.png').convert('RGBA')).astype(int)
letter(a,3,2,a.shape[1]-3,15,'SAKURA',2,(0,22,230),(225,250,255),(70,140,255))
Image.fromarray(a.astype(np.uint8)).save(p+'tiles_10.png')
a=np.array(Image.open(p+'tiles_40.png').convert('RGBA')).astype(int)
letter(a,4,72,40,86,'KYO',2,(150,30,190),(255,235,250),(255,90,215))
Image.fromarray(a.astype(np.uint8)).save(p+'tiles_40.png')
b='public/assets/l2/boss/boss_00.png'; a=np.array(Image.open(b).convert('RGBA'))
al=a[...,3]>0; core=nd.binary_opening(al,iterations=1); lab,n=nd.label(core); big=np.argmax(np.bincount(lab.ravel())[1:])+1
keep=nd.binary_dilation(lab==big,iterations=1)&al; a[~keep]=0
ys,xs=np.where(keep); a=a[ys.min():ys.max()+1,xs.min():xs.max()+1]; Image.fromarray(a).save(b); print('boss',a.shape)
# tiles_40: top gibberish -> 'KYO'; side strip sign -> vertical 'NEOKYO'
a=np.array(Image.open(p+'tiles_40.png').convert('RGBA')).astype(int)
letter(a,4,3,40,15,'NEO',2,(150,30,190),(255,235,250),(255,90,215))
x0,x1,y0,y1=54,63,6,86; a[y0:y1,x0:x1,:3]=(120,25,170); a[y0:y1,x0:x1,3]=255
txt='NEO-KYO'; tot=len(txt)*8-2; oy=y0+(y1-y0-tot)//2
for i,ch in enumerate(txt):
  m=np.zeros((5,3),bool)
  for r,row in enumerate(F3[ch]):
    for k,bb in enumerate(row): m[r,k]=bb=='1'
  ys,xs=np.where(np.kron(m,np.ones((1,1),bool))); 
  for yy,xx in zip(ys,xs):
    Y=oy+i*8+yy+1; X=x0+3+xx
    for dy in(-1,0,1):
      for dx in(-1,0,1):
        if a[Y+dy,X+dx,0]==120: a[Y+dy,X+dx,:3]=(255,90,215)
  for yy,xx in zip(ys,xs): a[oy+i*8+yy+1,x0+3+xx,:3]=(255,235,250)
Image.fromarray(a.astype(np.uint8)).save(p+'tiles_40.png')
