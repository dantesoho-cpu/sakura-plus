from PIL import Image, ImageDraw; import json, sys
man=json.load(open('public/assets/l2/manifest.json')); secs=sys.argv[1].split(','); out=sys.argv[2]; sc=int(sys.argv[3]) if len(sys.argv)>3 else 2
items=[k for k in man if k.split('_')[0] in secs]; W=1500; x=y=8; rowh=0; pos=[]
for k in items:
  w,h=man[k][2]*sc,man[k][3]*sc
  if x+w>W: x=8; y+=rowh+16; rowh=0
  pos.append((k,x,y)); x+=w+10; rowh=max(rowh,h)
H=y+rowh+20; img=Image.new('RGBA',(W,H),(200,170,200,255)); d=ImageDraw.Draw(img)
for k,x,y in pos:
  im=Image.open(f"public/assets/l2/{k.split('_')[0]}/{k}.png"); im=im.resize((im.width*sc,im.height*sc),Image.NEAREST); img.alpha_composite(im,(x,y)); d.text((x,y+im.height+1),k.split('_')[1],fill=(0,0,0,255))
img.save(out); print(out,img.size)
