# tileset2 = original 24 tiles + 64 generated fill tiles (16 2x2 metablocks: mossy, cracked, rooty, crystal) + 4 ledge underside tiles
from PIL import Image
G='public/assets/gen2/'; base=Image.open('public/assets/tiles/tileset.png').convert('RGBA'); N=base.width//16
blocks=[Image.open(G+f'tg{i}.png').convert('RGBA').resize((32,32),Image.BOX) for i in range(16)]
out=Image.new('RGBA',((N+64)*16,16)); out.paste(base,(0,0))
for b,im in enumerate(blocks):
    # force opaque (fill tiles must never show holes)
    bg=Image.new('RGBA',(32,32),(74,58,60,255)); bg.alpha_composite(im); im=bg
    for s in range(4): out.paste(im.crop(((s%2)*16,(s//2)*16,(s%2)*16+16,(s//2)*16+16)),((N+b*4+s)*16,0))
out.save('public/assets/tiles/tileset2.png'); print('base tiles',N,'total',out.width//16)
