import numpy as np
from PIL import Image
from scipy import ndimage
idle=np.array(Image.open('public/assets/sakura/idle.png').convert('RGBA'))[:,:64]
ys=np.where(idle[...,3].max(1)>0)[0]; H=ys.max()-ys.min()+1
pal=idle[idle[...,3]>0][:,:3]; pal=np.unique(pal,axis=0).astype(int)
def objs(p):
    a=np.array(Image.open(p).convert('RGB')).astype(int)
    r,g,b=a[...,0],a[...,1],a[...,2]
    m=~((r>170)&(b>170)&(g<110)); m=ndimage.binary_opening(m,iterations=2)
    lab,n=ndimage.label(m); sl=ndimage.find_objects(lab)
    out=[(s,lab[s]==i+1) for i,s in enumerate(sl) if (lab[s]==i+1).sum()>4000]
    return a,sorted(out,key=lambda x:x[0][1].start)
def make(a,s,mask,h):
    c=a[s].copy(); al=(mask*255).astype(np.uint8)
    im=Image.fromarray(np.dstack([c,al]).astype(np.uint8),'RGBA')
    sc=h/c.shape[0]; w=max(1,round(c.shape[1]*sc))
    im=im.resize((w,h),Image.NEAREST); x=np.array(im).astype(int)
    rgb=x[...,:3]; d=((rgb[:,:,None,:]-pal[None,None])**2).sum(-1); x[...,:3]=pal[d.argmin(-1)]
    x[...,3]=np.where(x[...,3]>127,255,0); return x.astype(np.uint8)
a1,o1=objs('assets_src/v12/dash_up.jpg'); a2,o2=objs('assets_src/v12/dash_down.jpg')
print(len(o1),len(o2))
# height normalised vs standing idle (gen: pose1 up ~ standing+arm)
hs=[o[0][0].stop-o[0][0].start for o in o1]; ref=hs[0]/1.15  # up pose ~1.15x body
fr=[make(a1,*o1[0],round(H*hs[0]/ref)), make(a1,*o1[1],round(H*hs[1]/ref)),
    make(a2,*o2[0],round(H*(o2[0][0][0].stop-o2[0][0][0].start)/ref*0.95)), make(a2,*o2[1],min(46,round(H*(o2[1][0][0].stop-o2[1][0][0].start)/ref*0.9)))]
S=Image.new('RGBA',(256,48))
for i,f in enumerate(fr):
    f=Image.fromarray(f); f=f.crop((0,max(0,f.height-47),min(64,f.width),f.height))
    S.paste(f,(i*64+(64-f.width)//2,46-f.height),f)
S.save('public/assets/sakura/dash8.png'); print([f.shape for f in fr],H)
