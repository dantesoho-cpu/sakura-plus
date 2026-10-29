# Audit / clean white fringe: opaque near-white low-saturation pixels touching transparency (matte leftovers from white-bg cutouts).
import numpy as np, glob, sys
from PIL import Image
from scipy import ndimage
def mask_fringe(a):
    rgb=a[...,:3].astype(int); al=a[...,3]
    mx,mn=rgb.max(-1),rgb.min(-1); whitish=(mn>185)&(mx-mn<45)
    semi=(al>0)&(al<200)&(mn>150)
    edge=ndimage.binary_dilation(al<40, iterations=1)&(al>=40)
    return (whitish&edge)|semi
def clean(a,rounds=3):
    a=a.copy()
    for _ in range(rounds):
        m=mask_fringe(a)
        if not m.any(): break
        a[m,3]=0
    a[a[...,3]<128,3]=0; a[a[...,3]>=128,3]=255
    return a
if __name__=='__main__':
    skip=('fx/','bg/cloud','gen2/cloud','ui_logo','sakura/','player','enemies/','bg/','gen2/L_','panorama','tiles/')
    fix='--fix' in sys.argv
    for f in sorted(glob.glob('public/assets/**/*.png',recursive=True)):
        if any(s in f for s in skip): continue
        a=np.asarray(Image.open(f).convert('RGBA')); n=int(mask_fringe(a).sum())
        if n>4:
            print(n,f)
            if fix: Image.fromarray(clean(a)).save(f)
