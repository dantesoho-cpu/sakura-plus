# Derive Sakura move frames from her own sheet frames (no new art):
#  ledgeh.png : ledge.png with the hang-bar pixels removed (hands kept)  -> ledge hang
#  roll4.png  : land.png (crouch) rotated 0/90/180/270 deg, bottom-flush -> high-speed landing roll
from PIL import Image
D='public/assets/sakura/'
im=Image.open(D+'ledge.png').convert('RGBA'); px=im.load()
hand=set(x for x in range(64) if any(px[x,y][2]>90 and px[x,y][3] for y in range(2,8)))
keep=set(x+d for x in hand for d in (-1,0,1))
for y in range(0,8):
  for x in range(64):
    if x not in keep: px[x,y]=(0,0,0,0)
im.save(D+'ledgeh.png')
L=Image.open(D+'land.png').convert('RGBA'); bb=L.getbbox(); c=L.crop(bb)
out=Image.new('RGBA',(64*4,48))
for i,a in enumerate((0,-90,-180,-270)):
  r=c.rotate(a,expand=True,resample=Image.NEAREST); out.alpha_composite(r,(64*i+32-r.width//2, bb[3]-r.height))
out.save(D+'roll4.png'); print('hands',sorted(hand),'bb',bb)
