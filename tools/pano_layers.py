# Parallax layers from the user's panorama (assets_src/background.png): far (sky+mountains, clouds removed), mid (valley/lake),
# painted clouds cut out as separate drifting sprites. Each layer mirror-looped -> seamless.
import numpy as np, json, random
from PIL import Image
from scipy import ndimage
P=np.array(Image.open('assets_src/background.png').convert('RGB')).astype(int); H,W=P.shape[:2]; S=0.42
mn,mx=P.min(2),P.max(2)
cl=(mn>170)&(mx-mn<75); cl[205:]=False
cl=ndimage.binary_closing(cl,iterations=2); lab,n=ndimage.label(cl); sz=ndimage.sum(cl,lab,range(1,n+1))
objs_=ndimage.find_objects(lab); keep=[i+1 for i in range(n) if sz[i]>600 and objs_[i][0].stop<200]; cl=np.isin(lab,keep); cl=ndimage.binary_fill_holes(cl)
clouds=[]
for i,s in enumerate(ndimage.find_objects(np.where(cl,lab,0))):
    if s is None or (i+1) not in keep: continue
    m=(lab[s]==i+1); m=ndimage.binary_fill_holes(m); rgb=P[s].copy()
    w,h=m.shape[1],m.shape[0]; Wc,Hc=max(1,round(w*S)),max(1,round(h*S))
    img=np.dstack([np.array(Image.fromarray(rgb.astype(np.uint8)).resize((Wc,Hc),Image.BOX)),(np.array(Image.fromarray((m*255).astype(np.uint8)).resize((Wc,Hc),Image.BOX))>110)*255]).astype(np.uint8)
    if Wc>=20: clouds.append((s[0].start,img))
clouds.sort(key=lambda c:-c[1].shape[1]); clouds=clouds[:8]
for k,(y,img) in enumerate(clouds): Image.fromarray(img).save(f'public/assets/bg/cloud{k}.png')
print('clouds',len(clouds),[c[1].shape[:2] for c in clouds])
# far: rows 0..340, inpaint clouds with per-row sky median (from non-cloud, bluish pixels)
far=P[:340].copy(); fm=ndimage.binary_dilation(cl[:340],iterations=4)
for y in range(340):
    row=far[y]; ok=~fm[y]&(row[:,2]>row[:,0]+30)
    pass  # painted clouds stay in the far layer; cut copies drift above as a separate layer
mid=P[285:].copy()
def out(arr,name,alpha=None):
    h,w=arr.shape[:2]; im=Image.fromarray(arr.astype(np.uint8)).resize((round(w*S),round(h*S)),Image.BOX).convert('RGBA')
    if alpha is not None: im.putalpha(Image.fromarray(alpha).resize(im.size,Image.BOX))
    a=np.array(im); loop=np.concatenate([a,a[:,::-1]],1); Image.fromarray(loop).save(f'public/assets/bg/{name}.png')
    print(name,loop.shape, 'seam', int(np.abs(loop[:,0].astype(int)-loop[:,-1].astype(int)).sum())); return loop
out(far,'P_far')
al=np.full(mid.shape[:2],255,np.uint8); al[:40]=(np.linspace(0,255,40)[:,None]).astype(np.uint8)
ml=out(mid,'P_mid',al)
# water sparkle points on the lake (mid layer coords)
wt=(ml[...,2]>150)&(ml[...,2]>ml[...,0]+70)&(ml[...,3]>200); ys,xs=np.where(wt); random.seed(3); idx=random.sample(range(len(ys)),min(120,len(ys)))
json.dump({'water':[[int(xs[i]),int(ys[i])] for i in idx],'far':list(ml.shape[:2]),'sky':[int(v) for v in P[2,W//2]]},open('public/assets/bg/pano.json','w'))
print('sky',P[2,W//2])
