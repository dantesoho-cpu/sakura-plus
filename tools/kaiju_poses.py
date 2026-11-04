# Extra Kaiju poses regenerated from the sheet's boss_00 crop (no new art): the outer wing blades are cut out and
# re-hinged at the shoulders; the core is re-lit from its own pixels.
#  kpose_roar : wings swept up ~14deg      (roar / summon)
#  kpose_tuck : wings folded down ~18deg   (dive)
#  kpose_charge: core + eye pixels brightened toward white-pink (telegraph / laser)
from PIL import Image, ImageEnhance
D='public/assets/l2/boss/'; B=Image.open(D+'boss_00.png').convert('RGBA'); W,H=B.size; L,R,TOP,BOT=40,78,22,72
def pose(deg):
  body=B.copy(); bp=body.load(); out=Image.new('RGBA',(W,H))
  wl=Image.new('RGBA',(W,H)); wr=Image.new('RGBA',(W,H)); src=B.load(); a=wl.load(); c=wr.load()
  for y in range(TOP,BOT):
    for x in range(W):
      if x<L: a[x,y]=src[x,y]; bp[x,y]=(0,0,0,0)
      elif x>=R: c[x,y]=src[x,y]; bp[x,y]=(0,0,0,0)
  out.alpha_composite(wl.rotate(-deg,center=(L,TOP+20),resample=Image.NEAREST)); out.alpha_composite(wr.rotate(deg,center=(R,TOP+20),resample=Image.NEAREST)); out.alpha_composite(body); return out
pose(10).save(D+'kpose_roar.png'); pose(-12).save(D+'kpose_tuck.png')
C=B.copy(); p=C.load()
for y in range(H):
  for x in range(W):
    r,g,b,al=p[x,y]
    if al and r>110 and b>90 and r+b>260: k=0.6; p[x,y]=(int(r+(255-r)*k),int(g+(235-g)*k),int(b+(255-b)*k),al)
C.save(D+'kpose_charge.png'); print('ok')
