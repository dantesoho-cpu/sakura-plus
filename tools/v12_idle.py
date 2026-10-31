import numpy as np
from PIL import Image
from scipy import ndimage
idle=np.array(Image.open('public/assets/sakura/idle.png').convert('RGBA'))[:,:64]
ys=np.where(idle[...,3].max(1)>0)[0]; H=ys.max()-ys.min()+1; FOOT=ys.max()
pal=np.unique(idle[idle[...,3]>0][:,:3],axis=0).astype(int)
a=np.array(Image.open('assets_src/v12/idle_turn.jpg').convert('RGB')).astype(int); r,g,b=a[...,0],a[...,1],a[...,2]
gray=(abs(r-g)<22)&(abs(g-b)<22)&(r>70)
m=~((r>170)&(b>170)&(g<110))&~gray; m=ndimage.binary_opening(m,iterations=2)
lab,n=ndimage.label(m); sl=ndimage.find_objects(lab)
objs=sorted([(s,lab[s]==i+1) for i,s in enumerate(sl) if (lab[s]==i+1).sum()>3000],key=lambda o:o[0][1].start); print(len(objs))
ref=objs[0][0][0].stop-objs[0][0][0].start
out=Image.new('RGBA',(64*8,48))
for i,(s,mask) in enumerate(objs[:8]):
    c=a[s]; im=Image.fromarray(np.dstack([c,mask*255]).astype(np.uint8),'RGBA'); sc=H/ref
    im=im.resize((max(1,round(im.width*sc)),max(1,round(im.height*sc))),Image.LANCZOS); x=np.array(im).astype(int)
    d=((x[...,:3][:,:,None,:]-pal[None,None])**2).sum(-1); x[...,:3]=pal[d.argmin(-1)]; x[...,3]=np.where(x[...,3]>140,255,0)
    f=Image.fromarray(x.astype(np.uint8)); f=f.crop((0,max(0,f.height-47),min(64,f.width),f.height))
    out.paste(f,(i*64+(64-f.width)//2,FOOT+1-f.height),f)
out.save('public/assets/sakura/idle6.png'); print(H,FOOT)
