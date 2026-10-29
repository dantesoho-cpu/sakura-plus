# Clean SAKURA+ title logo: letterforms traced from the user's logo, rebuilt with clean alpha (no white matte):
# blossom-pink vertical gradient from the tileset trees, 1px plum outline, 2px deep shadow, top highlight, petal sparkle.
import numpy as np
from PIL import Image
from scipy import ndimage
a=np.asarray(Image.open('/tmp/logo_orig.png').convert('RGBA')).astype(int)[:66]
r,g,b,al=a[...,0],a[...,1],a[...,2],a[...,3]
pink=(al>100)&(r>g+35)&(r>120)
pink=ndimage.binary_closing(pink,iterations=1)
pink=ndimage.binary_opening(pink,structure=np.ones((2,2)))|ndimage.binary_erosion(pink,iterations=0)
H,W=pink.shape; pad=6; m=np.zeros((H+pad*2,W+pad*2),bool); m[pad:-pad,pad:-pad]=pink
o=np.zeros(m.shape+(4,),np.uint8)
out1=ndimage.binary_dilation(m)&~m; out2=ndimage.binary_dilation(m,iterations=2)&~m
shadow=np.roll(np.roll(ndimage.binary_dilation(m,iterations=1),2,0),1,1)&~m&~out1
PLUM=(46,16,44); DEEP=(24,8,30)
o[shadow]=(*DEEP,255); o[out2&~shadow]=(*PLUM,160)
o[out1]=(*PLUM,255)
# gradient by row within each glyph band
grad=[(255,214,232),(255,178,212),(246,132,184),(226,96,160),(186,62,130)]
ys,xs=np.nonzero(m)
top=ndimage.minimum(np.arange(m.shape[0])[:,None].repeat(m.shape[1],1),ndimage.label(m)[0],None)
lab,n=ndimage.label(m)
for i in range(1,n+1):
    yy,xx=np.nonzero(lab==i); y0,y1=yy.min(),yy.max()
    for y,x in zip(yy,xx):
        k=(y-y0)/max(1,y1-y0); c=grad[min(4,int(k*5))]
        o[y,x]=(*c,255)
# top-edge highlight and inner bottom shade
hi=m&~np.roll(m,1,0); o[hi]=(255,240,248,255)
lo=m&~np.roll(m,-1,0); o[lo]=(150,40,104,255)
o[(o[...,3]>0)&(o[...,3]<255),3]=0  # binary alpha only
Image.fromarray(o).save('public/assets/ui_logo2.png'); print(o.shape)
