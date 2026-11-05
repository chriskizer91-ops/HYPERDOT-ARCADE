"""Turn the generated images into the game's art.

  python3 prep_art.py SRC_DIR      reads the original PNGs (any folder layout under SRC_DIR) and
                                   writes small WebP files into art/, which build.py packs into the game

Surfaces: flattened (no lighting drift), made to repeat without a seam, 512 x 512.
Backdrops: 1536 wide, softened a touch so they sit far behind the action.
The originals are not part of the repo; only the prepared files in art/ are.
"""
import sys,os,glob
import numpy as np
from PIL import Image,ImageFilter
here=os.path.dirname(os.path.abspath(__file__))
SRC=sys.argv[1]
OUT=os.path.join(here,'art');os.makedirs(OUT,exist_ok=True)
def find(num):
    hits=[f for f in glob.glob(os.path.join(SRC,'**','*.png'),recursive=True) if os.path.basename(f).startswith(num+'_')]
    return hits[0] if hits else None

# number -> name in the game, flatten strength (0 keeps the image's own light and shade)
SURF=[('1.1','basalt',.6),('1.2','strata',.5),('1.3','columns',.4),('1.4','frost',.5),('1.5','rubble',.5),('1.6','crystal',.3),
      ('2.1','iron',.6),('2.2','craze',.6),('2.3','crust',.2),('2.4','obsidian',.4),('2.5','plate',.3),('2.6','brick',.3),('2.7','hammered',.5),
      ('3.1','ice',.4),('3.2','rimeskin',.4),('3.3','snow',.6),('3.4','ripples',.3)]
FX=[('6.1','fx_steam'),('6.2','fx_smoke'),('6.3','fx_blast'),('6.4','fx_sparks'),('6.5','fx_shatter'),('6.6','fx_splash')]
CARD=[('7.1','card_title'),('7.2','card_anvil'),('7.3','card_queen'),('7.4','card_end')]
BACK=[('4.1','back1'),('4.2','back2'),('4.3','back3'),('4.4','back4'),('4.5','back5'),('4.6','back6'),('4.7','back7'),('4.8','back8'),('4.9','back0')]

def blur_wrap(a,r):
    """a wide Gaussian that wraps around the edges, so the tile stays a tile"""
    h,w=a.shape[:2];F=np.fft.fft2(a,axes=(0,1))
    fy=np.fft.fftfreq(h)[:,None];fx=np.fft.fftfreq(w)[None,:]
    g=np.exp(-2*(np.pi*r)**2*(fx*fx+fy*fy))
    if a.ndim==3:g=g[:,:,None]
    return np.real(np.fft.ifft2(F*g,axes=(0,1)))

def seamless(a):
    """take out what jumps at the wrap: a smooth correction spread over the whole tile (Poisson-style),
       so the left edge meets the right edge and the top meets the bottom"""
    h,w=a.shape[:2];out=a.copy()
    for axis in (1,0):
        n=out.shape[axis]
        first=np.take(out,[0],axis=axis);last=np.take(out,[n-1],axis=axis)
        jump=(last-first)          # what the wrap sees: last -> first
        t=(np.arange(n)/(n-1)-.5)  # -0.5 .. 0.5
        shape=[1,1,1];shape[axis]=n
        ramp=t.reshape(shape)
        # smooth the correction along the edge so features are not smeared
        jb=blur_wrap(jump,3)
        out=out-jb*ramp
    return out

def surf(num,name,flat):
    f=find(num)
    if not f:print('missing',num,name);return
    im=Image.open(f).convert('RGB').resize((512,512),Image.LANCZOS)
    a=np.asarray(im).astype(np.float32)/255.
    lin=a**2.2
    if flat>0:
        lo=blur_wrap(lin,64.)+1e-4;mean=lin.reshape(-1,3).mean(0)
        lin=lin*((mean/lo)**flat)
    lin=seamless(lin)
    a=np.clip(lin,0,1)**(1/2.2)
    Image.fromarray((a*255+.5).astype(np.uint8)).save(os.path.join(OUT,name+'.webp'),quality=84,method=6)

def back(num,name):
    f=find(num)
    if not f:print('missing',num,name);return
    im=Image.open(f).convert('RGB');w,h=im.size
    im=im.resize((1536,round(1536*h/w)),Image.LANCZOS).filter(ImageFilter.GaussianBlur(.6))
    im.save(os.path.join(OUT,name+'.webp'),quality=80,method=6)

def fx(num,name):
    """effects on black: 256 square, the black kept (the game reads brightness as how much is there)"""
    f=find(num)
    if not f:print('missing',num,name);return
    im=Image.open(f).convert('RGB').resize((256,256),Image.LANCZOS)
    a=np.asarray(im).astype(np.float32)/255.
    # fade to black at the border so no square edge can show
    y,x=np.mgrid[0:256,0:256]/255.;r=np.maximum(abs(x-.5),abs(y-.5))*2;a*=np.clip((1-r)/.12,0,1)[:,:,None]
    Image.fromarray((a*255+.5).astype(np.uint8)).save(os.path.join(OUT,name+'.webp'),quality=86,method=6)

def card(num,name):
    f=find(num)
    if not f:print('missing',num,name);return
    im=Image.open(f).convert('RGB');w,h=im.size
    im.resize((1280,round(1280*h/w)),Image.LANCZOS).save(os.path.join(OUT,name+'.webp'),quality=80,method=6)

for s in SURF:surf(*s)
for f_ in FX:fx(*f_)
for c in CARD:card(*c)
for b in BACK:back(*b)
tot=0
for f in sorted(glob.glob(os.path.join(OUT,'*.webp'))):
    n=os.path.getsize(f);tot+=n;print(f'{os.path.basename(f):16s}{n/1024:7.0f} KB')
print(f'total {tot/1024/1024:.2f} MB')
