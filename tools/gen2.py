# Process GenerateImage outputs (magenta chroma) into game-ready RGBA assets.
import numpy as np, json
from PIL import Image
from scipy import ndimage
S='/workspace/sakura/assets_src/gen2/'; O='/workspace/sakura/public/assets/gen2/'
def key(name):
    a=np.asarray(Image.open(S+name+'.jpg').convert('RGB')).astype(int)
    c=np.median(np.concatenate([a[:6,:6].reshape(-1,3),a[:6,-6:].reshape(-1,3)]),0)
    d=np.sqrt(((a-c)**2).sum(-1)); r,g,b=a[...,0],a[...,1],a[...,2]
    bg=(d<75)|((g<70)&(r>150)&(r-g>130)&(b>60)&(b<200)&(r>b))
    bg=ndimage.binary_opening(bg,iterations=1)
    lab,_=ndimage.label(bg); bl=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    hole=ndimage.binary_opening(d<45,iterations=2); hl,hn=ndimage.label(hole); sz=ndimage.sum(hole,hl,range(1,hn+1))
    big=np.isin(hl,[i+1 for i in range(hn) if sz[i]>300])   # enclosed pure-backdrop holes (scaffold/bridge interiors)
    bg=np.isin(lab,list(bl))|big  # only background connected to the border; interior magenta-ish pixels (purple blossoms) stay
    al=np.where(bg,0,255).astype(np.uint8)
    # despill: fringe pixels adjacent to bg pulled toward neighbour colours
    edge=ndimage.binary_dilation(bg,iterations=2)&~bg
    al[edge&(d<150)]=0
    return np.dstack([a.clip(0,255).astype(np.uint8),al])
def down(rgba,f):
    im=Image.fromarray(rgba,'RGBA'); w,h=int(im.width*f),int(im.height*f)
    rgb=im.convert('RGB').resize((w,h),Image.BOX); al=im.getchannel('A').resize((w,h),Image.BOX)
    al=al.point(lambda v:255 if v>140 else 0); o=rgb.convert('RGBA'); o.putalpha(al); return o
def trim(im):
    bb=im.getbbox(); return im.crop(bb) if bb else im
def seam(im,ov):
    a=np.asarray(im).astype(float); w=a.shape[1]; L=a[:,:ov]; R=a[:,w-ov:]
    t=np.linspace(0,1,ov)[None,:,None]; a=a[:,:w-ov].copy(); a[:,:ov]=R*(1-t)+L*t
    a[...,3]=np.where(a[...,3]>127,255,0); return Image.fromarray(a.astype(np.uint8),'RGBA')
def comps(rgba,minpx,pad=3):
    m=rgba[...,3]>0; m2=ndimage.binary_dilation(m,iterations=pad); lab,n=ndimage.label(m2); out=[]
    for sl in ndimage.find_objects(lab):
        sub=rgba[sl].copy(); mm=(lab[sl]>0)&m[sl]; sub[~mm,3]=0
        if mm.sum()>=minpx: out.append((sl[1].start,sl[0].start,sub))
    return out
meta={}
# layers
for name,f,ov in [('far_mtn',0.5,60),('mid_hills',0.5,70),('near_forest',0.5,70),('fg',0.5,60)]:
    im=down(key(name),f); bb=im.getbbox(); im=im.crop((0,bb[1],im.width,im.height))
    im=seam(im,ov); im.save(O+'L_'+name+'.png'); meta[name]=im.size
lk=Image.open(S+'lake.jpg').convert('RGB').resize((640,360),Image.BOX).crop((0,120,640,360)); lk=seam(lk.convert('RGBA'),80); lk.save(O+'L_lake.png'); meta['lake']=lk.size
# clouds
cl=[]
for i,(x,y,sub) in enumerate(sorted(comps(key('clouds'),400,6),key=lambda c:(c[1]//150,c[0]))):
    im=trim(down(sub,0.5)); im.save(O+f'cloud{i}.png'); cl.append(im.size)
meta['clouds']=cl
# props + ground tiles: individual cutouts, list sizes
for sheet,f,tag in [('props',0.5,'pp'),('tiles_ground',0.25,'tg')]:
    lst=[]
    for i,(x,y,sub) in enumerate(sorted(comps(key(sheet),1500,4 if sheet=='props' else 8),key=lambda c:(c[1]//90,c[0]))):
        im=trim(down(sub,f)); im.save(O+f'{tag}{i}.png'); lst.append([im.size[0],im.size[1],x,y])
    meta[tag]=lst
car=trim(down(key('car'),0.25)); car.save(O+'car_full.png'); meta['car']=car.size
json.dump(meta,open(O+'meta.json','w'),indent=0); print(json.dumps(meta))
# --- car rig: body + separate wheel + light glows (scaled so body is ~124px wide)
a=key('car'); lab,n=ndimage.label(a[...,3]>0); big=np.argmax(np.bincount(lab.ravel())[1:])+1; a[lab!=big,3]=0; m=a[...,3]>0; ys,xs=np.where(m); x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
f=124/(x1-x0+1); body=down(a[y0:y1+1,x0:x1+1],f); body.save(O+'car_body.png')
# wheels: find dark circular blobs in the lower part
W=[(369,429),(944,429)]; R=68
wa=a.copy(); yy,xx=np.mgrid[:a.shape[0],:a.shape[1]]
cx,cy=W[0]; wm=(xx-cx)**2+(yy-cy)**2<=R*R; wheel=a[cy-R:cy+R+1,cx-R:cx+R+1].copy(); wheel[...,3]=np.where(wm[cy-R:cy+R+1,cx-R:cx+R+1],255,0)
down(wheel,f).save(O+'car_wheel.png')
rig={'w':body.size[0],'h':body.size[1],'wheels':[[ (x-x0)*f,(y-y0)*f] for x,y in W],'r':R*f,'head':[(1131-x0)*f,(369-y0)*f],'tail':[(190-x0)*f,(350-y0)*f],'exhaust':[(206-x0)*f,(435-y0)*f]}
rig={k:(float(v) if not isinstance(v,list) else [[float(t) for t in q] if isinstance(q,list) else float(q) for q in v]) for k,v in rig.items()}
json.dump(rig,open(O+'car_rig.json','w')); print(rig)
