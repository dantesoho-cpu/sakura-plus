"""v14 Abyss Warden: GenerateImage redraw of the sheet's boss crop (ref = exact crop, assets_src/v14/ref/boss_ref.png)
-> magenta key -> crop -> nearest-neighbour down to W px -> palette snap to the sheet crop's own colours -> 3 frames."""
from PIL import Image; import numpy as np; from scipy import ndimage as nd
W=300
g=np.array(Image.open('assets_src/v14/gen/boss_gen.jpg').convert('RGB')).astype(int)
key=(g[...,0]>150)&(g[...,2]>150)&(g[...,1]<110)&(np.abs(g[...,0]-g[...,2])<90)
a=~key; a=nd.binary_opening(a,iterations=2); lab,n=nd.label(a); ar=nd.sum(a,lab,range(1,n+1)); a=np.isin(lab,1+np.where(ar>ar.max()*0.01)[0]); a=nd.binary_fill_holes(a)
ys,xs=np.where(a); g=g[ys.min():ys.max()+1,xs.min():xs.max()+1]; a=a[ys.min():ys.max()+1,xs.min():xs.max()+1]
h=round(W*g.shape[0]/g.shape[1])
# nearest-neighbour (sample pixel centres) keeps hard pixel edges
yi=((np.arange(h)+0.5)*g.shape[0]/h).astype(int); xi=((np.arange(W)+0.5)*g.shape[1]/W).astype(int)
rgb=g[yi][:,xi]; al=a[yi][:,xi]
# despill magenta on the rim
rim=al&~nd.binary_erosion(al); rgb[rim]=np.minimum(rgb[rim],[255,200,255]); rgb[rim&(rgb[...,1]<80)&(rgb[...,0]>140)]=[40,20,60]
S=np.array(Image.open('ref/shrine_sheet.png').convert('RGB').crop((900,830,1039,888))).astype(int).reshape(-1,3)
S=S[np.abs(S-[1,8,23]).max(1)>30]; pal=np.unique((S//6)*6,axis=0)
from scipy.spatial import cKDTree; t=cKDTree(pal); _,ix=t.query(rgb.reshape(-1,3)); rgb=pal[ix].reshape(rgb.shape)
im=np.dstack([rgb,al*255]).astype(np.uint8); base=Image.fromarray(im)
base.save('public/assets/sh/s/boss_0.png')
w,hh=base.size; base.resize((int(w*1.04),int(hh*0.94)),Image.NEAREST).save('public/assets/sh/s/boss_1.png')
base.transform((w+12,hh),Image.AFFINE,(1,0.04,-6,0,1,0),Image.NEAREST).save('public/assets/sh/s/boss_2.png')
print(base.size, len(pal))
