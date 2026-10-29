import numpy as np, os
from PIL import Image, ImageEnhance
from scipy import ndimage
O=(18,14,34)
def objs(path,mode='green',minarea=1500):
    im=Image.open(path).convert('RGB'); a=np.array(im).astype(int); r,g,b=a[...,0],a[...,1],a[...,2]
    if mode=='green': bg=(g>130)&(g>r+45)&(g>b+45)
    else:
        near=a.min(2)>232; lab,_=ndimage.label(near); border=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]))-{0}
        bg=np.isin(lab,list(border))
    fg=~bg; fg=ndimage.binary_opening(fg,iterations=2)
    lab,n=ndimage.label(ndimage.binary_dilation(fg,iterations=6)); out=[]
    for i,s in enumerate(ndimage.find_objects(lab)):
        m=(lab[s]==i+1)&fg[s]
        if m.sum()<minarea: continue
        out.append((s,m))
    out.sort(key=lambda o:(o[0][0].start//120,o[0][1].start))
    return im,a,out
def make(im,a,s,m,scale,colors=32,outline=True,sat=1.15):
    crop=a[s].copy().astype(np.uint8); h,w=m.shape; W,H=max(1,round(w*scale)),max(1,round(h*scale))
    c=Image.fromarray(crop).resize((W,H),Image.BOX); c=ImageEnhance.Color(c).enhance(sat)
    al=np.array(Image.fromarray((m*255).astype(np.uint8)).resize((W,H),Image.BOX))>128
    q=np.array(c.quantize(colors,method=Image.MAXCOVERAGE).convert('RGB'))
    # despill green
    gs=(q[...,1].astype(int)>q[...,0]+30)&(q[...,1].astype(int)>q[...,2]+30)&ndimage.binary_dilation(~al,iterations=2)
    q[gs]=O
    rgba=np.dstack([q,al*255]).astype(np.uint8)
    if outline:
        rgba=np.pad(rgba,((1,1),(1,1),(0,0))); al2=rgba[...,3]>0
        ring=ndimage.binary_dilation(al2)&~al2; rgba[ring]=(*O,255)
    return Image.fromarray(rgba)
os.makedirs('public/assets/props2',exist_ok=True); os.makedirs('public/assets/enemies',exist_ok=True)
im,a,o=objs('assets_src/art_props2.jpg'); print('props',len(o),[ (x[0][1].start,x[0][0].start) for x in o])
names=[('torii',0.42),('lantern',0.2),('shrine',0.26),('tree',0.45),('bridge',0.34),('flower',0.1),('tree2',0.55)]
for (s,m),(n,sc) in zip(o,names): make(im,a,s,m,sc).save(f'public/assets/props2/{n}.png')
im,a,o=objs('assets_src/art_enemies.jpg'); print('enemies',len(o))
en=[('drone',0.11),('drone',0.11),('bot',0.14),('bot',0.14),('turret',0.14),('turret',0.14)]
fr={}
for (s,m),(n,sc) in zip(o,en): fr.setdefault(n,[]).append(make(im,a,s,m,sc))
for n,fs in fr.items():
    W=max(f.width for f in fs); H=max(f.height for f in fs); S=Image.new('RGBA',(W*len(fs),H))
    for i,f in enumerate(fs): S.paste(f,(i*W+(W-f.width)//2,H-f.height))
    S.save(f'public/assets/enemies/{n}.png'); print(n,W,H)
im,a,o=objs('assets_src/art_car.jpg','white'); print('car',len(o))
s,m=max(o,key=lambda x:x[1].sum()); m=ndimage.binary_fill_holes(m); make(im,a,s,m,0.15,40).save('public/assets/props2/car.png')
for n in os.listdir('public/assets/props2'): print(n,Image.open('public/assets/props2/'+n).size)
