# Crisp hi-bit redraw of soft sheet cuts: 2x lanczos -> unsharp -> sheet palette (no dither) -> majority cleanup -> navy outline + neon rim.
from PIL import Image, ImageFilter; import numpy as np, scipy.ndimage as nd, glob, os, sys
SHEET=Image.open('ref/neokyo_sheet.png').convert('RGB')
def palette(n=48):
  reg=SHEET.crop((0,75,790,1000)); q=reg.quantize(n,method=Image.Quantize.MEDIANCUT); return q
PAL=palette()
OUT=np.array([10,12,40])
def repixel(src,sc=2,rim=True):
  im=Image.open(src).convert('RGBA'); w,h=im.size
  rgb=Image.new('RGB',im.size,(20,22,60)); rgb.paste(im,mask=im.split()[3])
  big=rgb.resize((w*sc,h*sc),Image.LANCZOS).filter(ImageFilter.UnsharpMask(2,160,2))
  q=np.array(big.quantize(palette=PAL,dither=Image.Dither.NONE).convert('RGB')).astype(int)
  al=np.array(im.split()[3].resize((w*sc,h*sc),Image.NEAREST))>127
  al=nd.binary_opening(al,iterations=1)|nd.binary_erosion(al,iterations=1)
  # majority cleanup: lone pixels take their most common neighbour colour
  key=q[...,0]*65536+q[...,1]*256+q[...,2]
  def mode(v):
    c=v[4]; u,n=np.unique(v,return_counts=True); return c if (v==c).sum()>=2 else u[n.argmax()]
  key=nd.generic_filter(key,mode,size=3,mode='nearest')
  q=np.dstack([key//65536,(key//256)%256,key%256])
  # outline: 1px deep navy at the silhouette border
  edge=al&~nd.binary_erosion(al); q[edge]=OUT
  if rim:
    # neon rim: top-facing interior pixels just under the outline get a bright highlight from their own hue
    top=al&~edge&np.roll(edge,1,0)&~np.roll(al,1,0)|(al&~edge&np.roll(edge&~np.roll(al,1,0),1,0))
    q[top]=np.clip(q[top]*0.5+np.array([255,170,240])*0.5,0,255)
  out=np.dstack([q,al*255]).astype(np.uint8); return Image.fromarray(out,'RGBA')
if __name__=='__main__':
  sec=sys.argv[1]; os.makedirs(f'public/assets/l2/{sec}_hd',exist_ok=True)
  for f in sorted(glob.glob(f'public/assets/l2/{sec}/*.png')):
    repixel(f).save(f.replace(f'/{sec}/',f'/{sec}_hd/'))
  print('ok')
