import json,re,sys; from PIL import Image, ImageDraw
src=open('src/scenes/platPieces.ts').read(); P=json.loads(src[src.index('[] = ')+5:src.rindex(';')])
W=900; x=y=8; rowh=0; pos=[]
for q in P:
    if x+q['w']>W-8: x=8; y+=rowh+18; rowh=0
    pos.append((x,y)); x+=q['w']+10; rowh=max(rowh,q['h'])
H=y+rowh+16; o=Image.new('RGBA',(W,H),(58,78,120,255)); d=ImageDraw.Draw(o)
for q,(x,y) in zip(P,pos):
    o.alpha_composite(Image.open(f"public/assets/plat/{q['k']}.png"),(x,y))
    pts=[(x+i,y+v) for i,v in enumerate(q['p']) if v>=0]
    for p in pts: d.point(p,fill=(80,255,120,255))
    d.text((x,y+q['h']+2),q['k'],fill=(255,255,255,255))
o=o.resize((W*2,H*2),Image.NEAREST); o.save(sys.argv[1])
