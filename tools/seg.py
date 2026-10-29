import numpy as np, sys
from PIL import Image
from scipy import ndimage
def seg(path, thr=225, dil=6, minarea=800):
    im=np.array(Image.open(path).convert('RGB')).astype(int)
    fg=im.min(2)<thr
    lab,n=ndimage.label(ndimage.binary_dilation(fg,iterations=dil))
    out=[]
    for i,s in enumerate(ndimage.find_objects(lab)):
        m=(lab[s]==i+1)&fg[s]
        if m.sum()<minarea: continue
        out.append((s[1].start,s[0].start,s[1].stop,s[0].stop))
    return sorted(out)
if __name__=='__main__':
    for p in sys.argv[1:]:
        b=seg(p); print(p,len(b)); [print('  ',x,'h',x[3]-x[1],'w',x[2]-x[0]) for x in b]
