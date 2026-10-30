# Sheet-faithful regen: GenerateImage reproductions (magenta key) of Dante's sheet sections -> keyed, split,
# nearest-downscaled to the sheet's 1x scale, palette-snapped to the sheet's own colors, dark outline.
import numpy as np, json, os, sys; from PIL import Image; from scipy import ndimage as nd
from scipy.cluster.vq import kmeans2
SHEET=np.asarray(Image.open('ref/neokyo_sheet.png').convert('RGB')).astype(float)
def palette(box,k=40):
  x0,y0,x1,y1=box; a=SHEET[y0:y1,x0:x1].reshape(-1,3); a=a[a.sum(1)>60]
  np.random.seed(1); c,_=kmeans2(a[np.random.choice(len(a),min(20000,len(a)),0)],k,minit='++',seed=1); return c
def process(src,sheet_box,out,prefix,minarea=1500,skip=()):
  im=np.asarray(Image.open(src).convert('RGB')).astype(float); H,W,_=im.shape
  key=np.median(np.concatenate([im[:8,:8],im[:8,-8:],im[-8:,:8],im[-8:,-8:]]).reshape(-1,3),0)
  d=np.sqrt(((im-key)**2).sum(2)); r,g,b=im[...,0],im[...,1],im[...,2]
  bg=(d<70)|((r>150)&(g<60)&(b>70)&(r>b+20))   # magenta-ish, but keep light-pink blossoms (g high)
  bg=nd.binary_opening(bg,iterations=2); lab,_=nd.label(bg); edge=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]))-{0}
  bg=np.isin(lab,list(edge))|(bg&(nd.binary_erosion(bg,iterations=1)))
  fg=nd.binary_fill_holes(nd.binary_opening(~bg,iterations=2))
  sc=(sheet_box[2]-sheet_box[0])/W; pal=palette(sheet_box)
  lab,n=nd.label(nd.binary_dilation(fg,iterations=3)); os.makedirs(out,exist_ok=True); meta=[]
  objs=sorted([(s,i+1) for i,s in enumerate(nd.find_objects(lab)) if (lab==i+1).sum()>minarea],key=lambda t:(round(t[0][0].start/90),t[0][1].start))
  for j,(s,li) in enumerate(objs):
    if j in skip: continue
    m=fg[s]&(lab[s]==li); a=im[s]; h,w=m.shape; tw,th=max(4,round(w*sc)),max(4,round(h*sc))
    sm=np.asarray(Image.fromarray(a.astype(np.uint8)).filter(__import__('PIL.ImageFilter',fromlist=['x']).BoxBlur(1/sc*0.35)).resize((tw,th),Image.NEAREST)).astype(float)
    mm=np.asarray(Image.fromarray((m*255).astype(np.uint8)).resize((tw,th),Image.BOX))>140
    idx=((sm[:,:,None,:]-pal[None,None])**2).sum(3).argmin(2); rgb=pal[idx].astype(np.uint8)
    o=np.zeros((th,tw,4),np.uint8); o[...,:3]=rgb; o[...,3]=mm*255
    ring=nd.binary_dilation(mm)&~mm; o[ring]=(14,10,34,255)
    nm=f'{prefix}_{j:02d}'; Image.fromarray(o,'RGBA').save(out+nm+'.png'); meta.append(dict(k=nm,w=tw,h=th,src=[int(s[1].start*sc+sheet_box[0]),int(s[0].start*sc+sheet_box[1]),int(s[1].stop*sc+sheet_box[0]),int(s[0].stop*sc+sheet_box[1])]))
  return meta
if __name__=='__main__':
  out='public/assets/l2/rg/'; M=process('assets_src/l2gen/plat_L.jpg',(10,85,400,416),out,'pl')
  M+=process('assets_src/l2gen/plat_R.jpg',(400,85,785,416),out,'pr')
  json.dump(M,open(out+'rg.json','w'),indent=0); print(len(M)); [print(q['k'],q['w'],q['h']) for q in M]
