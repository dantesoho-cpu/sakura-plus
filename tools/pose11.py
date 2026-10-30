"""Round-11 idle/shoot/charge redraw: segment generated strip (assets_src/gen_pose11.jpg), scale to run8 figure height, snap to run8 palette, pack 64x48 cells on run8's baseline."""
from PIL import Image; import numpy as np; from scipy import ndimage as nd
S='public/assets/sakura/'
run=np.array(Image.open(S+'run8.png').convert('RGBA'))
def bbox(c): ys,xs=np.where(c[...,3]>0); return ys.min(),ys.max(),xs.min(),xs.max()
cells=[run[:,i*64:(i+1)*64] for i in range(8)]
bb=[bbox(c) for c in cells]; H=int(np.median([b[1]-b[0]+1 for b in bb])); base=int(np.median([b[1] for b in bb]))
pal=np.unique(run[run[...,3]>0][:,:3].reshape(-1,3),axis=0).astype(int)
a=np.array(Image.open('assets_src/gen_pose11.jpg').convert('RGB')).astype(int)
fg=(a.min(-1)<200)|((a.max(-1)-a.min(-1))>60); fg=nd.binary_opening(fg,iterations=1)
lab,n=nd.label(nd.binary_closing(fg,iterations=4)); objs=[(sl,i+1) for i,sl in enumerate(nd.find_objects(lab)) if (lab[sl]==i+1).sum()>2000]
objs.sort(key=lambda t:t[0][1].start); print('figs',len(objs))
hs=[sl[0].stop-sl[0].start for sl,_ in objs[:2]]; s=(H+2)/np.median(hs)  # idle height drives scale (standing ~ run height +2)
fr=[]
for sl,i in objs:
    m=(lab[sl]==i)&fg[sl]; m=nd.binary_fill_holes(m); rgb=a[sl]
    im=Image.fromarray(np.dstack([rgb,m*255]).astype('uint8')); w,h=round(im.width*s),round(im.height*s)
    im=im.resize((w,h),Image.BOX); x=np.array(im).astype(int); al=x[...,3]>160
    al=nd.binary_erosion(al,iterations=0) if False else al
    px=(x[...,:3][al]*0.78).astype(int); d=((px[:,None,:]-pal[None])**2).sum(-1); q=pal[d.argmin(1)]
    out=np.zeros((h,w,4),np.uint8); out[al,:3]=q; out[al,3]=255
    c=np.zeros((48,64,4),np.uint8); ox=(64-w)//2-2; oy=base+1-h
    ys,xs=np.where(out[...,3]>0); 
    for yy,xx in zip(ys,xs):
        Y,X=yy+oy,xx+ox
        if 0<=Y<48 and 0<=X<64: c[Y,X]=out[yy,xx]
    A=c[...,3]>0; ring=nd.binary_dilation(A)&~A; dk=pal[pal.sum(1).argmin()]; c[ring,:3]=dk; c[ring,3]=255
    fr.append(c)
def save(name,idx): Image.fromarray(np.concatenate([fr[i] for i in idx],1)).save(S+name+'.png')
save('idle',[0,1]); save('shoot',[2,3]); save('charge',[4,5,4,5,4,5])
