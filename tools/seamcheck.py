from PIL import Image
S=Image.open('public/assets/tiles/tileset.png'); t=lambda i:S.crop((16*i,0,16*i+16,16))
# layout: block with corners, edges, fill variants, platform, waterfall column
L=["............",
   ".6223227....",
   ".4010105..bw",
   ".4101015..bw",
   ".4010105.KLM",
   ".IAAAAAJ...w"]
key={'6':6,'2':2,'3':3,'7':7,'4':4,'5':5,'0':0,'1':1,'A':10,'I':18,'J':19,'K':16,'L':11,'M':17,'w':12,'b':12}
C=Image.new('RGBA',(16*12,16*6),(120,170,230,255))
for y,r in enumerate(L):
    for x,c in enumerate(r):
        if c in key: tt=t(key[c]); C.paste(tt,(16*x,16*y),tt)
C.save('audit/A_tiles_seam_1x.png'); C.resize((C.width*3,C.height*3),Image.NEAREST).save('audit/A_tiles_seam_3x.png')
