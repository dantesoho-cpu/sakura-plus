import numpy as np, json
from PIL import Image
from scipy import ndimage
def key(path,y0,y1,scale=0.5,colors=48):
    im=Image.open(path).convert('RGB').crop((0,y0,1024,y1))
    w,h=int(1024*scale),int((y1-y0)*scale); im=im.resize((w,h),Image.BOX)
    a=np.array(im).astype(int); r,g,b=a[...,0],a[...,1],a[...,2]
    bg=(g>140)&(g>r+50)&(g>b+50)
    bg=ndimage.binary_opening(bg) | bg
    al=~bg; al=ndimage.binary_opening(al,iterations=1)
    # despill green on edges
    edge=ndimage.binary_dilation(bg)&al; a[edge,1]=np.minimum(a[edge,1],(a[edge,0]+a[edge,2])//2)
    q=np.array(Image.fromarray(a.astype(np.uint8)).quantize(colors,method=Image.MAXCOVERAGE).convert('RGB'))
    out=np.dstack([q,al*255]).astype(np.uint8)
    # seamless loop: mirror
    out=np.concatenate([out,out[:,::-1]],1)
    return Image.fromarray(out)
L={'far':key('assets_src/bg_far.jpg',300,476,0.5,32),'mid':key('assets_src/bg_mid.jpg',236,576,0.5,64),'near':key('assets_src/bg_near.jpg',316,560,0.5,40)}
meta={}
for k,v in L.items(): v.save(f'public/assets/bg/L_{k}.png'); meta[k]=v.size
# water sparkle candidates in mid layer (bright-ish blue pixels)
a=np.array(L['mid']).astype(int); blue=(a[...,2]>170)&(a[...,2]>a[...,0]+60)&(a[...,3]>0)
ys,xs=np.where(blue); idx=np.random.RandomState(1).choice(len(xs),min(120,len(xs)),replace=False)
meta['water']=[[int(xs[i]),int(ys[i])] for i in idx]
json.dump(meta,open('public/assets/bg/parallax.json','w')); print({k:v for k,v in meta.items() if k!='water'}, len(meta['water']))
# seam check: last column vs first column identical by construction
for k,v in L.items():
    x=np.array(v).astype(int); print(k,'seam diff',int(np.abs(x[:,0]-x[:,-1]).sum()))
