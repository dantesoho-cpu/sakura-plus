"""M0 asset pipeline: cut out backgrounds, extract player frames to uniform 64x64 cells with a shared foot baseline, extract props, prep parallax."""
from PIL import Image;import numpy as np,json,os;from scipy import ndimage as nd
S='assets_src/';O='public/assets/';P='audit/'
os.makedirs(O+'player',exist_ok=True);os.makedirs(O+'props',exist_ok=True);os.makedirs(O+'bg',exist_ok=True)
K=1536/819
sp=Image.open(S+'SakuraEnemySprite.png');a=np.array(sp)
mask=a[...,3]>170
lab,n=nd.label(nd.binary_closing(mask,iterations=2));objs=nd.find_objects(lab)
boxes=[(s[1].start,s[0].start,s[1].stop,s[0].stop,i+1) for i,s in enumerate(objs) if (lab[s]==i+1).sum()>150]
ROWS={ # (ymin,ymax) in full res, list of (name, label_x in 819 preview)
 'r1':((200,330),[('idle',15),('lookup',65),('lookdown',125),('walk',170),('run',240),('sprint',320),('jump',460),('doublejump',515),('fall',632),('land',680),('end',819)]),
 'r2':((330,420),[('dash',15),('airdash',100),('wallslide',213),('walljump',287),('ledgegrab',358),('ledgeclimb',476),('crouch',523),('end',819)]),
 'r3':((420,530),[('shoot',15),('shootup',92),('shootdown',148),('shootdiag',210),('chargeshot',275),('fullcharge',340),('melee',432),('hurt',527),('death',583),('checkpoint',698),('victory',762),('end',819)]),
}
C=64;anims={}
for r,((y0,y1),labs) in ROWS.items():
    bs=[b for b in boxes if y0<b[1]<y1 and b[3]-b[1]>30]
    for (nm,x),(_,xn) in zip(labs[:-1],labs[1:]):
        fr=sorted([b for b in bs if x*K-10<=b[0]<xn*K-10])
        anims[nm]=fr
meta={};sheets={}
for nm,fr in anims.items():
    cells=[]
    for (x0,y0,x1,y1,l) in fr:
        cr=a[y0:y1,x0:x1].copy();keep=(lab[y0:y1,x0:x1]==l)&mask[y0:y1,x0:x1]
        cr[...,3]=np.where(keep,255,0);im=Image.fromarray(cr)
        if im.height>C-2 or im.width>C: im.thumbnail((C,C-2),Image.NEAREST)
        cell=Image.new('RGBA',(C,C));cell.alpha_composite(im,((C-im.width)//2,C-2-im.height));cells.append(cell)
    if not cells: continue
    st=Image.new('RGBA',(C*len(cells),C))
    for i,c in enumerate(cells): st.alpha_composite(c,(i*C,0))
    st.save(O+f'player/{nm}.png');meta[nm]={'frames':len(cells),'src_boxes':[b[:4] for b in fr],'heights':[b[3]-b[1] for b in fr]}
json.dump(meta,open(O+'player/player_meta.json','w'),indent=1)
# preview sheet
rowsimg=[Image.open(O+f'player/{k}.png') for k in meta];W=max(i.width for i in rowsimg)
pv=Image.new('RGBA',(W+120,C*len(rowsimg)),(30,30,50,255))
from PIL import ImageDraw;d=ImageDraw.Draw(pv)
for i,(k,im) in enumerate(zip(meta,rowsimg)):
    d.text((2,i*C+26),k,fill='white');pv.alpha_composite(im,(120,i*C));d.line([(120,i*C+C-2),(120+W,i*C+C-2)],fill=(255,80,80))
pv.save(P+'M0_player_preview.png')
# props from tileset
ts=np.array(Image.open(S+'sakuratileset.png').convert('RGBA')).astype(int);T=1536/655
bg=np.array([251,240,229])
PROPS={'car':(488,372,625,432),'torii':(510,252,580,328),'lantern_stone':(578,272,604,328),'lantern_small':(412,333,438,378),
'tree1':(343,248,402,330),'tree2':(403,248,458,328),'tree3':(458,248,512,318),'tree4':(598,248,648,322),'bridge':(438,348,522,392),
'flowers_rings':(85,332,405,402),'waterfalls':(3,232,92,312),'waterfall_tall':(138,228,172,302),'stone_gate':(568,330,640,380),'logo':(3,335,85,372)}
for k,(x0,y0,x1,y1) in PROPS.items():
    c=ts[int(y0*T):int(y1*T),int(x0*T):int(x1*T)].copy()
    fg=np.abs(c[...,:3]-bg).sum(-1)>45;fg=nd.binary_opening(fg,iterations=1)
    c[...,3]=np.where(fg,255,0);im=Image.fromarray(c.astype('uint8'));bb=im.getbbox();im=im.crop(bb);im.save(O+f'props/{k}.png')
ims=[Image.open(O+f'props/{k}.png') for k in PROPS];W=sum(i.width for i in ims)+10*len(ims);H=max(i.height for i in ims)
pv=Image.new('RGBA',(min(W,2400),H*3),(60,70,90,255));x=y=0
for im in ims:
    if x+im.width>2400:x=0;y+=H
    pv.alpha_composite(im,(x,y));x+=im.width+10
pv.save(P+'M0_props_preview.png')
# parallax: panorama + tileset strips
bgim=Image.open(S+'background.png').convert('RGB');bgim.save(O+'bg/panorama_full.png')
w,h=bgim.size;bgim.crop((0,0,w,h*45//100)).save(O+'bg/layer_sky.png')
for i,(y0,y1) in enumerate([(0,140),(150,245)]):
    Image.fromarray(ts[int(y0*T):int(y1*T),int(348*T):int(655*T)].astype('uint8')).convert('RGB').save(O+f'bg/strip{i+1}.png')
print({k:v['frames'] for k,v in meta.items()})
