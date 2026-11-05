// Seam check for the v13 continuous parallax tiers: the wrap column pair (last -> first) must be no harsher than the
// harshest ordinary neighbouring-column step inside the same image (alpha-premultiplied), and every tier must be hi-res.
import { execSync } from 'child_process';
const py = `
import numpy as np,json; from PIL import Image
R=[]
for L in ['sh']:
  for n in (1,2,3):
    k=f'{L}_L{n}'; im=np.asarray(Image.open(f'public/assets/px/{k}.png').convert('RGBA')).astype(float); c=im[...,:3]*im[...,3:]/255
    d=np.abs(np.diff(c,axis=1)).mean((0,2)); w=np.abs(c[:,0]-c[:,-1]).mean()
    R.append(dict(k=k,w=im.shape[1],h=im.shape[0],wrap=round(w,2),maxcol=round(d.max(),2),ok=bool(w<=d.max()*1.05 and im.shape[0]>=400)))
print(json.dumps(R))`;
const R = JSON.parse(execSync('python3 -', { input: py }).toString()); R.forEach(r => console.log(JSON.stringify(r)));
const fails = R.filter(r => !r.ok).map(r => r.k); console.log(JSON.stringify({ fails, result: fails.length ? 'FAIL' : 'PASS' })); process.exit(fails.length ? 1 : 0);
