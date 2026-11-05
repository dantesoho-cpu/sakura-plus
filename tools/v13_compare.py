import json; from PIL import Image, ImageDraw
import sys; sys.path.insert(0,'tools'); from v13_regen import find
ks=list(json.load(open('assets_src/v13/ref/boxes.json'))); S=4; cell=180; rows=[]
def bgfit(im,c=cell):
  im=im.convert('RGBA'); s=max(1,min(c//im.width,c//im.height)) if max(im.size)<c else None
  im=im.resize((im.width*s,im.height*s),Image.NEAREST) if s else im.resize((c,int(c*im.height/im.width)) if im.width>=im.height else (int(c*im.width/im.height),c),Image.NEAREST)
  b=Image.new('RGBA',(c,c),(40,40,60,255)); b.alpha_composite(im,((c-im.width)//2,(c-im.height)//2)); return b
for k in ks:
  r=Image.new('RGB',(cell*3+20,cell+20),(20,20,30)); d=ImageDraw.Draw(r)
  for i,p in enumerate([f'assets_src/v13/ref/{k}.png',f'assets_src/v13/old/{k}.png',find(k)]):
    r.paste(bgfit(Image.open(p)).convert('RGB'),(5+i*(cell+5),15))
  d.text((5,2),f'{k}: sheet | old cut | v13 regen',fill=(255,255,255)); r.save(f'audit/v12/regen/{k}.png'); rows.append(r)
G=Image.new('RGB',(rows[0].width*2,rows[0].height*((len(rows)+1)//2)))
for i,r in enumerate(rows): G.paste(r,((i%2)*r.width,(i//2)*r.height))
G.save('audit/v12/regen/before_after.png'); print(G.size)
