import sys,glob
from PIL import Image
pat,out,dur=sys.argv[1],sys.argv[2],int(sys.argv[3]); crop=tuple(map(int,sys.argv[4].split(','))) if len(sys.argv)>4 else None
fr=[]
for f in sorted(glob.glob(pat)):
    im=Image.open(f).convert('RGB'); im=im.crop(crop) if crop else im; im=im.resize((im.width//2,im.height//2),Image.NEAREST); fr.append(im.quantize(colors=200,method=Image.Quantize.MEDIANCUT))
fr[0].save(out,save_all=True,append_images=fr[1:],duration=dur,loop=0,optimize=True); print(out,len(fr))
