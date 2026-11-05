# half-scale game sprites for shrine enemies/boss/items/fx (premultiplied box downscale, alpha hard-thresholded so edges
# stay crisp) + 3 walk/float frames each: rest, squash (sheet sprite resampled 94% tall / 104% wide), lean (1px shear).
from PIL import Image; import numpy as np, os
I='public/assets/sh/'; O=I+'s/'; os.makedirs(O,exist_ok=True)
def half(im,s=0.5):
  a=np.asarray(im.convert('RGBA')).astype(float); pm=a.copy(); pm[...,:3]*=a[...,3:]/255
  w,h=max(1,round(im.width*s)),max(1,round(im.height*s)); r=np.asarray(Image.fromarray(pm.astype(np.uint8)).resize((w,h),Image.BOX)).astype(float)
  al=r[...,3:]; rgb=np.where(al>0,r[...,:3]*255/np.maximum(al,1),0); soft=None
  return rgb,al
def save(rgb,al,fn,glow=False):
  A=al if glow else np.where(al>110,255,0); Image.fromarray(np.dstack([np.clip(rgb,0,255),A]).astype(np.uint8)).save(fn)
for k in sorted(os.listdir(I)):
  if not k.endswith('.png') or '_f' in k: continue
  n=k[:-4]
  if not (n.startswith(('e_','i_','fx_','x_')) or n=='boss'): continue
  im=Image.open(I+k).convert('RGBA'); g=n.startswith(('fx_','e_jelly'))
  rgb,al=half(im, 1.2 if n=='boss' else 0.5); save(rgb,al,O+n+'_0.png',g)
  if n.startswith('e_') or n=='boss':
    W,H=im.size; sq=im.resize((round(W*1.04),round(H*0.94)),Image.LANCZOS); c=Image.new('RGBA',(sq.width,H)); c.paste(sq,(0,H-sq.height))
    rgb,al=half(c, 1.2 if n=='boss' else 0.5); save(rgb,al,O+n+'_1.png',g)
    sh=im.transform(im.size,Image.AFFINE,(1,0.04,-0.04*H,0,1,0),Image.BICUBIC); rgb,al=half(sh, 1.2 if n=='boss' else 0.5); save(rgb,al,O+n+'_2.png',g)
print(len(os.listdir(O)))
