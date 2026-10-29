import sys; sys.argv=['x']
import numpy as np
from PIL import Image
exec(open('tools/cutout.py').read().split("os.makedirs")[0])
im,a,o=objs('assets_src/art_sakura_v3.jpg',minarea=3000)
print(len(o),[(s[0].start,s[1].start,m.shape) for s,m in o])
top=[x for x in o if x[0][0].start<a.shape[0]*0.45]; bot=sorted([x for x in o if x[0][0].start>=a.shape[0]*0.45],key=lambda x:x[0][1].start); top=sorted(top,key=lambda x:x[0][1].start)
idle_h=bot[0][1].shape[0]; sc=34/idle_h; print('scale',sc)
F=lambda x: make(im,a,x[0],x[1],sc,colors=20,sat=1.2)
run=[F(x) for x in top]; b=[F(x) for x in bot]
CW,CH=64,48
def sheet(imgs,name,dy=None):
    S=Image.new('RGBA',(CW*len(imgs),CH))
    for i,f in enumerate(imgs):
        f=f.crop((max(0,f.width-CW)//2,max(0,f.height-(CH-1)),max(0,f.width-CW)//2+min(f.width,CW),f.height))
        oy=(dy[i] if dy else 0); S.paste(f,(i*CW+(CW-f.width)//2,CH-2-f.height+oy),f)
    S.save(f'public/assets/sakura/{name}.png')
sheet(run,'run'); sheet([b[0],b[0]],'idle',[0,1]); sheet([b[1]],'jump'); sheet([b[1]],'apex'); sheet([b[2]],'fall')
sheet([b[3],b[3],b[3]],'dash'); sheet([b[4],b[4]],'shoot'); sheet([b[4]],'runshoot'); sheet([b[5],b[5]],'hurt')
print([f.size for f in run+b])
