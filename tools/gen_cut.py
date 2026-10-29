# Cut a GenerateImage 4x3 magenta sheet into 64x48 game frames (feet y=44, center x=31)
import sys, numpy as np
from PIL import Image
from scipy import ndimage
def bgmask(a):
    r,g,b=[a[...,i].astype(int) for i in range(3)]
    mag=(r>110)&(b>90)&(b>g+25)&(g<r-25)      # magenta + pink/purple props
    return mag
def pal():
    cols=set()
    for f in ['idle','run','jump','fall','dash','hurt','shoot','charge']:
        a=np.array(Image.open(f'public/assets/sakura/{f}.png').convert('RGBA')).reshape(-1,4)
        for c in a[a[:,3]>0][:,:3]: cols.add(tuple(c))
    return np.array(sorted(cols))
P=pal()
def cells(path):
    a=np.array(Image.open(path).convert('RGB'))
    H,W=a.shape[:2]; fg=~bgmask(a)
    out=[]
    for r in range(3):
        for c in range(4):
            y0,y1,x0,x1=r*H//3,(r+1)*H//3,c*W//4,(c+1)*W//4
            m=fg[y0:y1,x0:x1].copy()
            m=ndimage.binary_opening(m,iterations=1)
            lab,n=ndimage.label(ndimage.binary_dilation(m,iterations=3))
            if n==0: out.append(None); continue
            big=np.argmax(ndimage.sum(m,lab,range(1,n+1)))+1
            m&=lab==big
            ys,xs=np.where(m)
            out.append((a[y0:y1,x0:x1][ys.min():ys.max()+1,xs.min():xs.max()+1],m[ys.min():ys.max()+1,xs.min():xs.max()+1]))
    return out
def shrink(img,m,f):
    h,w=m.shape; th,tw=max(1,round(h/f)),max(1,round(w/f))
    o=np.zeros((th,tw,4),np.uint8)
    for y in range(th):
        for x in range(tw):
            ya,yb=int(y*f),max(int(y*f)+1,int((y+1)*f)); xa,xb=int(x*f),max(int(x*f)+1,int((x+1)*f))
            mm=m[ya:yb,xa:xb]
            if mm.mean()<0.45: continue
            px=img[ya:yb,xa:xb][mm].astype(int)
            # center-weighted pick: median color then palette snap
            c=np.median(px,0)
            d=((P-c)**2).sum(1); o[y,x,:3]=P[d.argmin()]; o[y,x,3]=255
    # dark outline where alpha edge touches nothing
    al=o[...,3]>0; edge=ndimage.binary_dilation(al)&~al
    dark=P[P.sum(1).argmin()]
    o[edge,:3]=dark; o[edge,3]=255
    return o
def place(s,anchor='feet'):
    fr=np.zeros((48,64,4),np.uint8); h,w=s.shape[:2]
    h=min(h,47); s=s[-h:]; w=min(w,64); s=s[:,:w]
    y=45-h if anchor=='feet' else 2
    x=31-w//2
    x=max(0,min(64-w,x)); y=max(0,y)
    fr[y:y+h,x:x+w]=s; return fr
if __name__=='__main__':
    import json
    spec=json.loads(sys.argv[1])   # {"src":..,"ref":idx,"refh":33,"out":{"name":[idx,...]},"anchor":{"name":"top"}}
    cs=cells(spec['src'])
    f=cs[spec['ref']][1].shape[0]/spec['refh']
    print('scale',f)
    for name,idxs in spec['out'].items():
        frames=[place(shrink(*cs[i],f),spec.get('anchor',{}).get(name,'feet')) for i in idxs]
        Image.fromarray(np.concatenate(frames,1)).save(f'public/assets/sakura/{name}.png')
        print(name,len(frames))
