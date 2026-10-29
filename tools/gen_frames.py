"""Process generated strips -> 64x64 cells, 48px tall, shared baseline, palette-reduced, 1px cyan rim."""
from PIL import Image;import numpy as np;from scipy import ndimage as nd;import os
O='public/assets/player2/';os.makedirs(O,exist_ok=True)
def segment(path):
    a=np.array(Image.open(path).convert('RGB')).astype(int);fg=(a.min(-1)<215)
    fg=nd.binary_opening(fg,iterations=1);m=nd.binary_closing(fg,iterations=6)
    lab,n=nd.label(m);out=[]
    for i,sl in enumerate(nd.find_objects(lab)):
        if (lab[sl]==i+1).sum()<3000:continue
        keep=(lab==i+1)&fg;keep=nd.binary_fill_holes(nd.binary_closing(keep,iterations=1))
        ys,xs=sl;rgba=np.dstack([a,np.where(keep,255,0)])[ys,xs]
        out.append((xs.start,Image.fromarray(rgba.astype('uint8'))))
    return [im for _,im in sorted(out,key=lambda t:t[0])]
def rim(im):
    a=np.array(im);al=a[...,3]>0;ring=nd.binary_dilation(al)&~al
    a[ring]=[120,220,255,150];return Image.fromarray(a)
def pack(frames,name,ref_h,C=64,H=48):
    s=H/ref_h;cells=[]
    for f in frames:
        f=f.resize((max(1,round(f.width*s)),max(1,round(f.height*s))),Image.BOX)
        from PIL import ImageEnhance as E;al=f.split()[3];f=E.Brightness(E.Color(E.Contrast(f.convert('RGB')).enhance(1.25)).enhance(1.5)).enhance(1.35);f.putalpha(al)
        a=np.array(f);a[...,3]=np.where(a[...,3]>128,255,0);f=Image.fromarray(a)
        q=f.convert('RGB').quantize(40,method=Image.Quantize.MAXCOVERAGE).convert('RGB');f=Image.merge('RGBA',(*q.split(),f.split()[3]))
        f=rim(f);c=Image.new('RGBA',(C,C));c.alpha_composite(f,((C-f.width)//2,C-2-f.height));cells.append(c)
    st=Image.new('RGBA',(C*len(cells),C))
    for i,c in enumerate(cells):st.alpha_composite(c,(i*C,0))
    st.save(O+name+'.png');return len(cells)
run=segment('assets_src/gen_run.jpg');misc=segment('assets_src/gen_misc.jpg')
print('run',len(run),[f.size for f in run]);print('misc',len(misc),[f.size for f in misc])
H=np.median([f.height for f in misc[:3]])
print(pack(run,'run',np.median([f.height for f in run])*1.0), pack(misc[:3]+[misc[4]],'idle',H),
 pack([misc[3]],'jump',H),pack([misc[5]],'apex',H),pack([misc[5]],'fall',H),pack([misc[7]],'dash',H))
# run strip: frames touch, split at column-density minima near even spacing
a=np.array(Image.open('assets_src/gen_run.jpg').convert('RGB')).astype(int);fg=nd.binary_opening(a.min(-1)<215,iterations=1)
col=fg.sum(0);xs=np.where(col>0)[0];x0,x1=xs[0],xs[-1];step=(x1-x0)/8;cuts=[x0]
for k in range(1,8):
    c=int(x0+k*step);w=int(step*0.3);cuts.append(c-w+int(np.argmin(col[c-w:c+w])))
cuts.append(x1+1);fr=[]
for l,r in zip(cuts[:-1],cuts[1:]):
    m=fg[:,l:r];lab,n=nd.label(nd.binary_closing(m,iterations=4));sz=nd.sum(m,lab,range(1,n+1));k=lab==(np.argmax(sz)+1)
    keep=nd.binary_fill_holes(k&m|nd.binary_closing(k&m,iterations=1));ys=np.where(keep.any(1))[0];xx=np.where(keep.any(0))[0]
    rgba=np.dstack([a[:,l:r],np.where(keep,255,0)])[ys[0]:ys[-1]+1,xx[0]:xx[-1]+1];fr.append(Image.fromarray(rgba.astype('uint8')))
print('run split',[f.size for f in fr]);print(pack(fr,'run',H))
# preview old vs new
from PIL import ImageDraw
rows=[('OLD run','public/assets/player/run.png'),('NEW run','public/assets/player2/run.png'),('OLD idle','public/assets/player/idle.png'),('NEW idle','public/assets/player2/idle.png'),
('NEW jump/apex/fall/dash',None)]
pv=Image.new('RGBA',(130+64*8,64*5),(45,40,70,255));d=ImageDraw.Draw(pv)
for i,(t,p) in enumerate(rows):
    d.text((4,i*64+28),t,fill='white')
    ims=[Image.open(p)] if p else [Image.open(O+k+'.png') for k in ['jump','apex','fall','dash']]
    x=130
    for im in ims: pv.alpha_composite(im,(x,i*64));x+=im.width
    d.line([(130,i*64+62),(130+512,i*64+62)],fill=(255,80,80))
pv=pv.resize((pv.width*2,pv.height*2),Image.NEAREST);pv.save('audit/M1b_sprites_compare.png')
