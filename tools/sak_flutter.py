# Derives hair-flutter frames from Sakura's own fall2/rise frames: hair tips (red runs at the top silhouette) lift/droop by 1-2 px per column.
from PIL import Image
import sys
def hair(p): return p[3]>0 and p[0]>140 and p[1]<90 and p[2]<110
def flutter(src, dst, up):
    im=Image.open(src).convert('RGBA'); W,H=im.size; a=im.load(); o=im.copy(); b=o.load()
    for x in range(W):
        col=[a[x,y] for y in range(H)]; ys=[y for y in range(H) if col[y][3]>0]
        if not ys: continue
        t=ys[0]; hs=[y for y in range(t,min(H,t+4)) if hair(col[y])]
        if not hs: continue
        n=up if (x%3) else up+ (1 if up>0 else 0)
        end=t; 
        while end+1<H and (hair(col[end+1]) or col[end+1][3]>0 and end-t<3): end+=1
        for y in range(t,end+1):
            if 0<=y-n<H: b[x,y-n]=col[y]
        if n>0:
            for y in range(end-n+1,end+1): b[x,y]=col[min(H-1,end+1)] if col[min(H-1,end+1)][3]>0 else col[y]
    o.save(dst)
flutter('public/assets/sakura/fall2.png','public/assets/sakura/fall2b.png',1)
flutter('public/assets/sakura/rise.png','public/assets/sakura/riseb.png',1)
