# auto-cut every distinct piece from the user's sakuratileset.png -> public/assets/deco/dNN.png + deco.json
import numpy as np, json, os
from PIL import Image
from scipy import ndimage
SH=np.array(Image.open('assets_src/sakuratileset.png').convert('RGB')).astype(int)
fg=np.abs(SH-np.array([253,242,234])).sum(2)>=40; fg=ndimage.binary_opening(fg)
fg[:570,815:]=False   # landscape strips (used for parallax)
lab,n=ndimage.label(ndimage.binary_dilation(fg,iterations=4)); ob=ndimage.find_objects(lab)
os.makedirs('public/assets/deco',exist_ok=True); [os.remove('public/assets/deco/'+f) for f in os.listdir('public/assets/deco')]
out=[]; k=0
for i,sl in enumerate(ob):
    h=sl[0].stop-sl[0].start; w=sl[1].stop-sl[1].start
    if h*w<500 or h<18 or w<18: continue
    m=(lab[sl]==i+1)&fg[sl]; a=SH[sl]; sc=1/3
    W,H=max(1,round(w*sc)),max(1,round(h*sc))
    rgb=Image.fromarray(a.astype(np.uint8)).resize((W,H),Image.BOX); al=np.array(Image.fromarray((m*255).astype(np.uint8)).resize((W,H),Image.BOX))>110
    Image.fromarray(np.dstack([np.array(rgb),al*255]).astype(np.uint8)).save(f'public/assets/deco/d{k:02d}.png')
    out.append({'k':f'd{k:02d}','w':W,'h':H,'src':[sl[1].start,sl[0].start,w,h]}); k+=1
json.dump(out,open('tools/deco_raw.json','w')); print(k)
# contact sheet
ims=[Image.open(f'public/assets/deco/{o["k"]}.png') for o in out]; cols=12; cw=max(i.width for i in ims)+6; ch=max(i.height for i in ims)+14
S=Image.new('RGBA',(cols*cw,((len(ims)+cols-1)//cols)*ch),(40,70,140,255))
from PIL import ImageDraw; d=ImageDraw.Draw(S)
for j,im in enumerate(ims): x,y=(j%cols)*cw,(j//cols)*ch; S.paste(im,(x+3,y+12),im); d.text((x+2,y),out[j]['k'],fill=(255,255,0))
S.resize((S.width*2,S.height*2),Image.NEAREST).save('audit/_deco_all.png'); print(S.size)
