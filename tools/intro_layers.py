# split intro panoramas into: base (clouds painted out with row sky colour), cloud layer, 3 water-sparkle layers
import numpy as np; from PIL import Image; from scipy import ndimage
rng=np.random.default_rng(3)
for name,cy,wy in [('pano1',105,(255,310)),('pano2',45,(140,180))]:
    a=np.array(Image.open(f'public/assets/intro/{name}.png').convert('RGBA')).astype(int); H,W=a.shape[:2]
    r,g,b=a[...,0],a[...,1],a[...,2]; mx=np.maximum(np.maximum(r,g),b); mn=np.minimum(np.minimum(r,g),b)
    sky=(b>r+40)&(b>150)
    cloud=(mn>165)&(mx-mn<80)&(b>=r-5); cloud[cy:]=False
    cloud=ndimage.binary_dilation(cloud,iterations=1)&~sky|cloud; cloud[cy:]=False
    lab,n=ndimage.label(cloud); keep=np.zeros_like(cloud)
    for i,sl in enumerate(ndimage.find_objects(lab)):
        m=lab==i+1
        if m.sum()<6: continue
        ring=ndimage.binary_dilation(m,iterations=2)&~m
        if (sky[ring].mean() if ring.any() else 0)>0.55: keep|=ndimage.binary_dilation(m,iterations=1)&~(sky&~cloud)|m
    base=a.copy(); cl=np.zeros_like(a)
    cl[keep]=a[keep]
    for y in range(cy):
        row=sky[max(0,y-2):y+3]&~keep[max(0,y-2):y+3]
        if row.sum()<3: continue
        med=np.median(a[max(0,y-2):y+3][row][:,:3],0)
        base[y,keep[y],:3]=med
    Image.fromarray(base.astype(np.uint8)).save(f'public/assets/intro/{name}_base.png')
    Image.fromarray(cl.astype(np.uint8)).save(f'public/assets/intro/{name}_cloud.png')
    water=(b>r+50)&(b>140); water[:wy[0]]=False; water[wy[1]:]=False
    water=ndimage.binary_erosion(water,iterations=1)
    ys,xs=np.where(water)
    for k in range(3):
        sp=np.zeros((H,W,4),np.uint8); idx=rng.choice(len(ys),size=max(1,len(ys)//60),replace=False)
        for i in idx:
            y,x=ys[i],xs[i]; L=rng.integers(1,4)
            for dx in range(L):
                if x+dx<W and water[y,x+dx]: sp[y,x+dx]=(230,245,255,220 if dx==L//2 else 150)
        Image.fromarray(sp).save(f'public/assets/intro/{name}_spk{k}.png')
    print(name,'cloud px',keep.sum(),'water px',water.sum())
