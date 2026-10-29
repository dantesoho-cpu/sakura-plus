exec(open('tools/hibit.py').read().split("P='public/assets/props2/'")[0])
P='public/assets/props2/'
cut(1075,680,1130,735,0.42,keep_largest=True).save(P+'bush.png')
cut(520,550,570,600,0.42,keep_largest=True).save(P+'bush2.png')
cut(5,785,205,870,0.5).save('public/assets/ui_logo.png')
for f in ['bush.png','bush2.png']: print(f,Image.open(P+f).size)
print(Image.open('public/assets/ui_logo.png').size)
