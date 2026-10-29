from PIL import Image, ImageDraw;import numpy as np;from scipy import ndimage as nd
S='assets_src/';A='audit/'
def comps(mask,minarea=150):
    lab,n=nd.label(nd.binary_closing(mask,iterations=2));out=[]
    for i,sl in enumerate(nd.find_objects(lab)):
        y,x=sl;area=(lab[sl]==i+1).sum()
        if area>=minarea: out.append((x.start,y.start,x.stop,y.stop,area))
    return out
def overlay(img,boxes,path):
    im=img.convert('RGB').copy();d=ImageDraw.Draw(im)
    for b in boxes:d.rectangle(b[:4],outline=(0,255,0))
    im.save(path)
# sprite sheet: alpha mask
sp=Image.open(S+'SakuraEnemySprite.png');a=np.array(sp)
m=a[...,3]>170
for thr in [120,170,210]:
    print('alpha thr',thr,len(comps(a[...,3]>thr)))
b=comps(m);overlay(sp,b,A+'sprite_bboxes.png')
# player band rows (approx y 200-525)
pl=[x for x in b if 200<x[1]<520 and x[3]-x[1]>30]
pl.sort(key=lambda t:(t[3]));rows=[]
for t in pl:
    if rows and abs(rows[-1][-1][3]-t[3])<25: rows[-1].append(t)
    else: rows.append([t])
for r in rows:
    r.sort();h=[t[3]-t[1] for t in r];w=[t[2]-t[0] for t in r];bl=[t[3] for t in r]
    print(f'row baseline~{int(np.median(bl))}: n={len(r)} w {min(w)}-{max(w)} h {min(h)}-{max(h)} baseline spread {max(bl)-min(bl)}')
# contact sheet of player candidates
cells=[];C=96
for r in rows:
    for t in r:
        cr=sp.crop(t[:4]);cr.thumbnail((C,C));cells.append(cr)
cols=16;sh=Image.new('RGBA',(cols*C,((len(cells)+cols-1)//cols)*C),(40,40,60,255))
for i,c in enumerate(cells):sh.alpha_composite(c,((i%cols)*C+(C-c.width)//2,(i//cols)*C+C-c.height))
sh.save(A+'player_frames_contact.png');print('player cands',len(cells))
# tileset: flood from bg color
ts=Image.open(S+'sakuratileset.png').convert('RGB');t=np.array(ts).astype(int)
bg=np.array([251,240,229]);dm=np.abs(t-bg).sum(-1)>40
tb=comps(dm,400);print('tileset elems',len(tb));overlay(ts,tb,A+'tileset_bboxes.png')
open(A+'tileset_bboxes.txt','w').write('\n'.join(map(str,sorted(tb,key=lambda z:(z[1]//60,z[0])))))
open(A+'sprite_bboxes.txt','w').write('\n'.join(map(str,b)))
