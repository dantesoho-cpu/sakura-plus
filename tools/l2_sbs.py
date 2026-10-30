import json,sys; from PIL import Image, ImageDraw
S=Image.open('ref/neokyo_sheet.png').convert('RGBA'); d='public/assets/l2/rg/'; M=json.load(open(d+'rg.json'))
sel=[q for q in M if q['k'].startswith(sys.argv[1])]; Z=3; pad=8; cols=int(sys.argv[3]) if len(sys.argv)>3 else 4
cells=[]
for q in sel:
  a=S.crop(tuple(q['src'])); b=Image.open(d+q['k']+'.png'); w=(a.width+b.width)*Z+pad*3; h=max(a.height,b.height)*Z+pad*2+12; cells.append((q['k'],a,b,w,h))
cw=max(c[3] for c in cells); ch=max(c[4] for c in cells); rows=(len(cells)+cols-1)//cols
o=Image.new('RGBA',(cw*cols,ch*rows),(40,40,56,255)); D=ImageDraw.Draw(o)
for i,(k,a,b,w,h) in enumerate(cells):
  x=(i%cols)*cw; y=(i//cols)*ch; o.paste(a.resize((a.width*Z,a.height*Z),Image.NEAREST),(x+pad,y+pad+12))
  o.alpha_composite(b.resize((b.width*Z,b.height*Z),Image.NEAREST),(x+pad*2+a.width*Z,y+pad+12)); D.text((x+pad,y+2),k+'  sheet | new',fill=(255,255,255,255))
o.save(sys.argv[2]); print(o.size)
