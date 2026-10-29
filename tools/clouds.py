import numpy as np, glob, os
from PIL import Image
from scipy import ndimage
for f in glob.glob('public/assets/bg/cloud*.png'): os.remove(f)
def cut(path,box,S,out):
    P=np.array(Image.open(path).convert('RGB')).astype(int); y0,y1,x0,x1=box; a=P[y0:y1,x0:x1]
    r,g,b=a[...,0],a[...,1],a[...,2]; sky=((b-r>75)&(a.min(2)<175))|(r>g+35)
    m=~sky; m=ndimage.binary_opening(m); lab,n=ndimage.label(m); sz=ndimage.sum(m,lab,range(1,n+1)); m=lab==(np.argmax(sz)+1); m=ndimage.binary_fill_holes(m)
    h,w=m.shape; W,H=round(w*S),round(h*S)
    rgb=np.array(Image.fromarray(a.astype(np.uint8)).resize((W,H),Image.BOX)); al=np.array(Image.fromarray((m*255).astype(np.uint8)).resize((W,H),Image.BOX))
    al=np.where(al>200,255,np.where(al>90,170,0)).astype(np.uint8)
    Image.fromarray(np.dstack([rgb,al])).save(out); print(out,W,H)
cut('assets_src/background.png',(5,160,125,372),0.42,'public/assets/bg/cloud0.png')
cut('assets_src/background.png',(60,150,1712,1915),0.42,'public/assets/bg/cloud1.png')
cut('assets_src/background.png',(30,145,1490,1712),0.42,'public/assets/bg/cloud2.png')
