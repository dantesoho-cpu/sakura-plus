# Cut the cherry trees straight from Dante's tilesheet at 1x, with clean binary alpha (no cream halos), + shade variants.
import numpy as np; from PIL import Image; from scipy import ndimage as nd
SHEET='/tmp/sheet.png'; OUT='public/assets/props2/'
im=np.asarray(Image.open(SHEET).convert('RGB')).astype(int); BG=np.array([252,241,233])
CUTS={'ts0':(810,585,131,187),'ts1':(950,587,131,185),'ts2':(1088,585,118,157),'ts3':(1413,587,111,182),'ts_sap':(926,701,47,68),'ts_bush':(1073,691,58,44)}
def cut(x,y,w,h):
    a=im[y:y+h,x:x+w].copy(); d=np.abs(a-BG).sum(2); m=d>26
    lab,n=nd.label(nd.binary_dilation(m,iterations=2)); sizes=nd.sum(m,lab,range(1,n+1)); m&=(lab==1+int(np.argmax(sizes)))  # main object only
    lab,n=nd.label(m); sizes=nd.sum(m,lab,range(1,n+1)); m&=np.isin(lab,1+np.nonzero(sizes>=6)[0])
    lum=a.mean(2); sat=a.max(2)-a.min(2)
    for _ in range(3):  # peel light, desaturated, cream-blended edge pixels
        edge=m & ~nd.binary_erosion(m)
        bad=edge & (((lum>200)&(sat<70)) | (np.abs(a-BG).sum(2)<70)); m&=~bad
    # remaining edge pixels: pull toward their darkest interior neighbour colour if they are noticeably lighter (kills residual halo tint)
    edge=m & ~nd.binary_erosion(m); inner=m&~edge
    for yy,xx in zip(*np.nonzero(edge)):
        ys,xs=slice(max(0,yy-1),yy+2),slice(max(0,xx-1),xx+2); nb=inner[ys,xs]
        if nb.any():
            c=a[ys,xs][nb]; dark=c[c.mean(1).argmin()]
            if a[yy,xx].mean()>dark.mean()+40: a[yy,xx]=(a[yy,xx]+dark*2)//3
    out=np.zeros((h,w,4),np.uint8); out[...,:3]=a; out[...,3]=m*255
    ys,xs=np.nonzero(m); return out[ys.min():ys.max()+1, xs.min():xs.max()+1]
def shade(o,k):
    o=o.copy(); r,g,b=[o[...,i].astype(int) for i in range(3)]; pink=(r>g+25)&(r>=b-10)&(o[...,3]>0)
    if k=='dk': nr,ng,nb=r*0.88,g*0.78,b*0.86
    else: nr,ng,nb=np.minimum(255,r*1.03+6),np.minimum(255,g*1.08+12),np.minimum(255,b*1.04+8)
    for i,c in enumerate((nr,ng,nb)): o[...,i]=np.where(pink,np.clip(c,0,255),o[...,i])
    return o
for k,(x,y,w,h) in CUTS.items():
    o=cut(x,y,w,h); Image.fromarray(o).save(OUT+k+'.png'); print(k,o.shape[1],o.shape[0])
    if k.startswith('ts') and k[2:].isdigit():
        for v in ('dk','lt'): Image.fromarray(shade(o,v)).save(OUT+k+v+'.png')
