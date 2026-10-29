# Modular wooden bridge parts in the palette of the user's bridge (props2/bridge.png): plank variants, post, stone end caps.
import numpy as np
from PIL import Image
P='public/assets/props2/'; src=np.asarray(Image.open(P+'bridge.png').convert('RGBA'))
rng=np.random.default_rng(5)
DK,MD,LT,HL=(44,26,30),(92,54,46),(128,80,58),(168,112,78); MOSS=(86,120,52); MOSS2=(126,160,70); ROPE=(186,150,104)
W=16; sheet=np.zeros((40,16*6+8+28),np.uint8).reshape(40,-1,1).repeat(4,2)
def plank(i):
    a=np.zeros((7,W,4),np.uint8)
    for x in range(W):
        for y in range(7):
            c=MD if 1<=y<=4 else DK
            if y==1: c=HL if rng.random()>.3 else LT
            if y==2 and rng.random()>.6: c=LT
            if x in (0,7+i%3,15) and y<6: c=DK  # plank seams vary
            a[y,x,:3]=c; a[y,x,3]=255
    if i==1:  # knots
        a[3,4,:3]=DK; a[2,11,:3]=DK
    if i==3:  # mossy
        for x in range(W):
            if rng.random()>.35: a[0,x,:3]=MOSS2; a[0,x,3]=255
            if rng.random()>.6: a[1,x,:3]=MOSS
        for x in (3,9,13): a[5:7,x,:3]=MOSS; a[6,x,3]=255
    if i==4:  # broken: missing chunk, splintered edge
        a[:,9:14,3]=0; a[4:7,8:15,3]=0; a[0:4,14,3]=0; a[1,8,:3]=DK; a[2:4,13,3]=255; a[2:4,13,:3]=DK; a[0,9,3]=255; a[0,9,:3]=LT
    return a
for i in range(5): sheet[0:7,i*W:(i+1)*W]=plank(i)
# post (4x20) at x=80
for y in range(20):
    for x in range(4): sheet[y,80+x,:3]=DK if x in (0,3) else (LT if x==1 else MD); sheet[y,80+x,3]=255
sheet[0,80:84,:3]=HL; sheet[19,80:84,:3]=DK
# stone end caps cropped from the original bridge pillars (14x34) at x=88 (L) and x=102 (R)
sheet[0:34,88:98]=src[0:34,0:10]; sheet[0:34,102:112]=src[0:34,84:94]
Image.fromarray(sheet[:, :116]).save(P+'bridge_parts.png')
