"""Round-11 idle/shoot/charge redraw: segment generated strips (assets_src/gen_pose11.jpg, gen_charge11.jpg),
scale to run8 figure height, snap to run8 palette, 1px dark outline, pack 64x48 cells on run8's baseline."""
from PIL import Image; import numpy as np; from scipy import ndimage as nd
S='public/assets/sakura/'
run=np.array(Image.open(S+'run8.png').convert('RGBA'))
def bbox(c): ys,xs=np.where(c[...,3]>0); return ys.min(),ys.max(),xs.min(),xs.max()
bb=[bbox(run[:,i*64:(i+1)*64]) for i in range(8)]; H=int(np.median([b[1]-b[0]+1 for b in bb])); base=int(np.median([b[1] for b in bb]))
pal=np.unique(run[run[...,3]>0][:,:3].reshape(-1,3),axis=0).astype(int); dk=pal[pal.sum(1).argmin()]
def cut(src,tgt=None,anchor=False):
    a=np.array(Image.open(src).convert('RGB')).astype(int)
    fg=(a.min(-1)<200)|((a.max(-1)-a.min(-1))>60); fg=nd.binary_opening(fg,iterations=1)
    lab,n=nd.label(nd.binary_closing(fg,iterations=4)); objs=[(sl,i+1) for i,sl in enumerate(nd.find_objects(lab)) if (lab[sl]==i+1).sum()>2000]
    objs.sort(key=lambda t:t[0][1].start); hs=[sl[0].stop-sl[0].start for sl,_ in objs]
    s=(H+2)/np.median(hs[:2]) if tgt is None else tgt/np.median(hs); fr=[]
    for sl,i in objs:
        m=nd.binary_fill_holes((lab[sl]==i)&fg[sl]); im=Image.fromarray(np.dstack([a[sl],m*255]).astype('uint8'))
        w,h=round(im.width*s),round(im.height*s); x=np.array(im.resize((w,h),Image.BOX)).astype(int); al=x[...,3]>160
        px=(x[...,:3][al]*0.78).astype(int); q=pal[((px[:,None,:]-pal[None])**2).sum(-1).argmin(1)]
        c=np.zeros((48,64,4),np.uint8); fx=np.where(al[-3:].any(0))[0]
        ox=(30-int(fx.mean())) if anchor else (64-w)//2-2; oy=base+1-h
        for yy,xx in zip(*np.where(al)):
            Y,X=yy+oy,xx+ox
            if 0<=Y<48 and 0<=X<64: c[Y,X,:3]=q[0]*0+x[yy,xx,:3]*0+pal[((x[yy,xx,:3]*0.78-pal)**2).sum(1).argmin()]; c[Y,X,3]=255
        A=c[...,3]>0; ring=nd.binary_dilation(A)&~A; c[ring,:3]=dk; c[ring,3]=255; fr.append(c)
    return fr
save=lambda name,fr: Image.fromarray(np.concatenate(fr,1)).save(S+name+'.png')
p=cut('assets_src/gen_pose11.jpg'); save('idle',p[0:2]); save('shoot',p[2:4])
ys=np.where(p[4][...,3]>0)[0]; ch=cut('assets_src/gen_charge11.jpg',tgt=ys.max()-ys.min()-1,anchor=True); print('charge',len(ch)); save('charge',ch[:6])
