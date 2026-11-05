"""Underwater Shrine Cave asset cutter: lifts sprites straight off Dante's ref/shrine_sheet.png (no redraw).
Mask = distance from the navy sheet background (1,8,23); keep components >=4% of the largest; fill holes; 1px dark
fringe pass; crop. Platforms get a measured walk-surface row (`top`). Waterfalls also get 4 flowing frames
(water pixels rolled down inside their own silhouette). Writes public/assets/sh/*.png + manifest.json."""
from PIL import Image; import numpy as np, json, os; from scipy import ndimage as nd
S=np.array(Image.open('ref/shrine_sheet.png').convert('RGB')).astype(int); BG=np.array([1,8,23]); D=np.abs(S-BG).max(2)
O='public/assets/sh/'; os.makedirs(O,exist_ok=True)
B={ # platforms (p_), props, waterfalls (wf_), enemies (e_), boss, items (i_), interactables (x_), fx (fx_)
 'p_long':(298,166,578,244),'p_mid':(170,197,274,234),'p_shrine':(320,68,447,154),'p_moss':(196,394,410,462),'p_left':(14,150,130,206),
 'p_arch1':(238,698,387,802),'p_arch2':(398,698,502,802),'p_arch3':(513,698,607,802),'p_slab1':(228,596,327,652),'p_slab2':(333,596,437,652),'p_bridge':(684,553,802,602),
 'tree':(652,38,822,192),'pillar':(724,190,792,332),'banner_r':(778,226,817,312),'banner_a':(810,596,847,662),'banner_b':(858,596,897,662),'banner_gate':(941,563,1100,702),
 'torii_red':(328,423,484,578),'torii_big':(668,372,817,548),'lantern_a':(551,462,602,548),'lantern_b':(723,478,767,548),'lantern_post':(608,596,647,692),
 'fence':(648,618,802,697),'pagoda':(1096,568,1160,802),'shrine_s':(193,133,274,192),'shrine_orb':(748,718,822,802),'shrine_mini':(828,738,892,802),
 'cr_a':(516,133,562,170),'cr_b':(293,663,337,702),'cr_c':(363,668,397,702),'cr_ped':(266,458,324,594),'cr_pillar':(663,718,737,797),'cr_tall':(618,740,662,794),
 'wf_a':(580,200,652,322),'wf_b':(661,200,702,322),'wf_wide':(13,596,222,802),'pool':(13,460,130,592),
 'e_orb':(582,832,640,894),'e_orb_s':(636,846,688,889),'e_crab':(693,833,755,900),'e_jelly':(762,824,819,916),'e_crab_s':(824,847,888,887),
 'e_crab_l':(586,904,671,988),'e_mech_s':(678,907,738,988),'e_crab2':(746,928,821,988),'e_mech':(828,896,884,988),'e_mech_l':(895,886,963,988),'e_mech2':(971,895,1031,988),
 'e_jelly_b':(1252,620,1322,762),'e_jelly_p':(1328,702,1382,792),'boss':(900,830,1039,888),
 'i_gem_b':(1058,828,1092,877),'i_gem_p':(1132,833,1162,872),'i_coin':(1058,878,1092,912),'i_orb':(1093,876,1127,914),'i_ring':(1058,918,1092,950),'i_flower':(1093,916,1167,982),
 'x_switch':(1176,826,1222,907),'x_chest':(1230,858,1302,908),'x_lantern':(1303,828,1352,907),'x_portal_ped':(1176,913,1242,987),'x_portal':(1393,678,1522,812),'x_gate2':(1383,573,1522,682),
 'fx_splash':(13,828,62,877),'fx_burst':(13,878,62,922),'fx_ring':(253,833,347,877),'fx_ring_l':(243,878,347,937),'fx_geyser':(398,828,452,882),'fx_star':(163,878,197,917),'fx_bub':(205,878,243,917),
 'fish':(1228,708,1292,748),
}
def cut(k,b):
  x0,y0,x1,y1=b; rgb=S[y0:y1,x0:x1]; d=D[y0:y1,x0:x1]; m=d>26
  lab,n=nd.label(nd.binary_dilation(m,iterations=2)); 
  if n==0: return None
  ar=nd.sum(m,lab,range(1,n+1)); keep=np.isin(lab,1+np.where(ar>=ar.max()*0.04)[0])&m
  a=nd.binary_closing(np.pad(keep,3),iterations=1)[3:-3,3:-3]
  if not any(t in k for t in ('torii','gate','arch','fence','portal','banner','pagoda')): a=nd.binary_fill_holes(a)
  else: a=a|(nd.binary_fill_holes(a)&(rgb.max(2)>40))
  for _ in range(2):
    e=a&~nd.binary_erosion(a); dark=(rgb.max(2)<40); a[e&dark]=0
  if k.startswith('fx_') or k.startswith('e_jelly'):  # glows: soft alpha from brightness
    al=np.clip((d-20)/60,0,1)*255; al[~nd.binary_dilation(a,iterations=1)]=0
  else: al=a*255
  ys,xs=np.where(al>0); im=np.dstack([rgb,al]).astype(np.uint8)[ys.min():ys.max()+1,xs.min():xs.max()+1]
  return im
M={}
for k,b in B.items():
  im=cut(k,b); h,w=im.shape[:2]; a=im[...,3]>0; info=dict(w=w,h=h)
  if k.startswith('p_') or k in('torii_red','torii_big','fence'):
    cols=a[:,w//6:w-w//6]; rows=cols.mean(1); top=int(np.argmax(rows>0.6)); info['top']=top
  # feet row: last row with >=20% coverage (props stand flush on that row)
  r=a.mean(1); info['foot']=int(len(r)-1-np.argmax(r[::-1]>0.2))
  Image.fromarray(im).save(O+k+'.png'); M[k]=info
  if k.startswith('wf_') or k=='pool':
    rgb=im[...,:3].astype(int); water=(rgb[...,2]>140)&(rgb[...,2]>rgb[...,0]+40)&a
    for f in range(4):
      sh=int(round(f*h/16)); r2=np.roll(im,sh,axis=0); fr=im.copy(); fr[water]=r2[water]; fr[water&(r2[...,3]==0)]=im[water&(r2[...,3]==0)]
      Image.fromarray(fr).save(O+f'{k}_f{f}.png')
    M[k]['frames']=4
json.dump(M,open(O+'manifest.json','w'),indent=0); print(len(M))
# contact sheet
from PIL import ImageDraw
cs=Image.new('RGB',(1600,1400),(40,40,60)); x=y=0; rh=0; dr=ImageDraw.Draw(cs)
for k in M:
  im=Image.open(O+k+'.png')
  if x+im.width>1600: x=0; y+=rh+14; rh=0
  cs.paste(im,(x,y+12),im); dr.text((x,y),k,fill=(255,255,0)); 
  if 'top' in M[k]: dr.line([x,y+12+M[k]['top'],x+im.width,y+12+M[k]['top']],fill=(255,0,0))
  x+=im.width+8; rh=max(rh,im.height+12)
cs.crop((0,0,1600,y+rh+14)).save('assets_src/v13/shrine/contact.png')
