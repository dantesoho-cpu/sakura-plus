# HI-BIT pass: props/checkpoint/flower/petal/waterfall cut from the user's sakuratileset.png,
# terrain tiles grid-snapped from the generated (sakuratileset-referenced) terrain strip.
import numpy as np, os, json
from PIL import Image
from scipy import ndimage
SH=np.array(Image.open('assets_src/sakuratileset.png').convert('RGB')).astype(int)
BG=np.array([253,242,234])
def cut(x0,y0,x1,y1,sc,thr=40,keep_largest=False):
    a=SH[y0:y1,x0:x1]; fg=np.abs(a-BG).sum(2)>=thr; fg=ndimage.binary_opening(fg)
    if keep_largest:
        lab,n=ndimage.label(ndimage.binary_dilation(fg,iterations=3)); sz=ndimage.sum(fg,lab,range(1,n+1)); fg&=lab==(np.argmax(sz)+1)
    ys,xs=np.where(fg); a=a[ys.min():ys.max()+1,xs.min():xs.max()+1]; fg=fg[ys.min():ys.max()+1,xs.min():xs.max()+1]
    h,w=fg.shape; W,H=max(1,round(w*sc)),max(1,round(h*sc))
    rgb=Image.fromarray(a.astype(np.uint8)).resize((W,H),Image.BOX); al=np.array(Image.fromarray((fg*255).astype(np.uint8)).resize((W,H),Image.BOX))>110
    return Image.fromarray(np.dstack([np.array(rgb),al*255]).astype(np.uint8))
P='public/assets/props2/'
cut(805,584,930,773,0.42,keep_largest=True).save(P+'tree.png')
cut(949,586,1082,773,0.42,keep_largest=True).save(P+'tree2.png')
cut(1205,593,1357,770,1/3,keep_largest=True).save(P+'torii.png')
cut(1357,593,1416,770,1/3,keep_largest=True).save(P+'lantern.png')
cut(961,785,1025,891,1/3).save(P+'lantern2.png')
cut(1027,826,1256,913,0.42).save(P+'bridge.png')
cut(1150,895,1517,1008,1/3).save(P+'car.png')
cut(1318,778,1535,890,1/3).save(P+'arch.png')
cut(1063,746,1214,811,1/3).save(P+'fence.png')
cut(10,850,80,940,1/3).save(P+'shrine.png')       # glowing lantern-shrine = checkpoint
cut(380,785,415,825,0.42).save(P+'flower.png')
cut(205,780,240,810,0.3).save('public/assets/fx/petal.png')
for f in sorted(os.listdir(P)): print(f,Image.open(P+f).size)
# ---------- terrain tiles ----------
a=np.array(Image.open('assets_src/art_terrain_hibit.jpg').convert('RGB')).astype(int); r,g,b=a[...,0],a[...,1],a[...,2]
fg=~((g>120)&(g>r+40)&(g>b+40)); fg=ndimage.binary_opening(fg,iterations=2)
y0,y1=255,456; x0,x1=60,1220; sc=8/30
crop=a[y0:y1,x0:x1].copy(); m=fg[y0:y1,x0:x1]
crop[~m]=0
W,H=round((x1-x0)*sc),round((y1-y0)*sc)
T=np.array(Image.fromarray(crop.astype(np.uint8)).resize((W,H),Image.BOX)).astype(int)
A=np.array(Image.fromarray((m*255).astype(np.uint8)).resize((W,H),Image.BOX))>120
# stone top ~ y=300 -> (300-255)*sc = 12 ; cap tile = rows [stoneTop-12, stoneTop+4)
st=round((300-y0)*sc); print('strip',W,H,'stoneTop',st)
lum=T[st:,40:W-40].mean(2).mean(1); morts=[i+st for i in range(1,len(lum)-1) if lum[i]<lum[i-1] and lum[i]<=lum[i+1] and lum[i]<lum.mean()-8]; print('mortars',morts)
def wrapx(tile):  # make 32-wide tile pair seamless horizontally by best period search done by caller
    return tile
def best_x(rows,period=32):
    best=None
    for x in range(20,W-period-20):
        d=np.abs(T[rows,x]-T[rows,x+period]).sum()
        if best is None or d<best[0]: best=(d,x)
    return best[1]
cy=st+4-16; capx=best_x(slice(cy,cy+16))
cap=np.zeros((16,32,4),np.uint8); cap[...,:3]=T[cy:cy+16,capx:capx+32]; cap[...,3]=A[cy:cy+16,capx:capx+32]*255
# vine row directly under cap
vy=cy+16; vinex=best_x(slice(vy,vy+16)); vine=np.dstack([T[vy:vy+16,vinex:vinex+32],np.full((16,32),255)]).astype(np.uint8)
# deep fill: 16-row window starting at a mortar line, choose window in lower stone (fewer vines), vertically wrap
fy=[mm for mm in morts if mm+16<=H-2]; fy=fy[-1] if fy else H-18
fill=T[fy:fy+16].copy()
# make vertically periodic: replace last row with first-row mortar
fx=best_x(slice(fy,fy+16)); fill=np.dstack([fill[:,fx:fx+32],np.full((16,32),255)]).astype(np.uint8)
fill[15,:,:3]=fill[0,:,:3]
def crossfade(t):  # 2px horizontal blend across wrap seam
    t=t.copy().astype(float)
    for i in range(2):
        w=(i+1)/3; t[:,i,:3]=t[:,i,:3]*w+t[:,-1-i,:3]*(1-w) if False else t[:,i,:3]*(1-0.5+i*0.25)+t[:,-1,:3]*(0.5-i*0.25)
    return t.astype(np.uint8)
cap,vine,fill=crossfade(cap),crossfade(vine),crossfade(fill)
DARK=np.array([34,24,30])
def edge(t,left,round_top=False):
    t=t.copy(); xo=0 if left else 15
    for y in range(16):
        if t[y,xo,3]: t[y,xo,:3]=DARK; xi=1 if left else 14; t[y,xi,:3]=np.clip(t[y,xi,:3]*(1.25 if left else 0.7),0,255)
    if round_top:  # round the blossom cap corner
        for i,h in enumerate((5,3,2,1)):
            xx=xo+(i if left else -i); t[:h,xx,3]=0
    return t
def bottom(t):
    t=t.copy(); t[15,:,:3]=DARK; t[14,:,:3]=(t[14,:,:3]*0.6).astype(np.uint8); return t
L=lambda t:t[:,:16]; R=lambda t:t[:,16:]
old=np.array(Image.open('assets_src/tileset_v1.png').convert('RGBA'))
o=lambda i: old[:,i*16:(i+1)*16]
tiles=[L(fill),R(fill),L(cap),R(cap),edge(L(fill),1),edge(R(fill),0),edge(L(cap),1,True),edge(R(cap),0,True),L(fill),R(fill),
       bottom(L(fill)),o(11),o(12),o(13),o(14),o(15),o(16),o(17),bottom(edge(L(fill),1)),bottom(edge(R(fill),0)),
       L(vine),R(vine),edge(L(vine),1),edge(R(vine),0)]
S=np.concatenate(tiles,1); Image.fromarray(S).save('public/assets/tiles/tileset.png'); print('tiles',len(tiles))
# seam check: 8x4 composite
comp=np.zeros((64,128,4),np.uint8)
for X in range(8):
    comp[0:16,X*16:X*16+16]=tiles[2+X%2]; comp[16:32,X*16:X*16+16]=tiles[20+X%2]
    for Y in (2,3): comp[Y*16:Y*16+16,X*16:X*16+16]=tiles[X%2]
im=Image.fromarray(comp); bgc=Image.new('RGBA',im.size,(110,150,220,255)); bgc.alpha_composite(im)
bgc.save('audit/B_tiles_seam_1x.png'); bgc.resize((128*4,64*4),Image.NEAREST).save('audit/B_tiles_seam_4x.png')
