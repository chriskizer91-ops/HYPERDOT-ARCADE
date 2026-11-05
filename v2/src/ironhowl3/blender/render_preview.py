"""Quick look at a model from four sides (Blender workbench render). python render_preview.py build_howler OUT.png"""
import sys, os, math, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
modname, out = sys.argv[-2], sys.argv[-1]
m = importlib.import_module(modname); m.build()
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'
sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_shadows = True; sh.show_cavity = True; sh.cavity_type = 'BOTH'
sc.render.resolution_x, sc.render.resolution_y = 520, 620; sc.render.film_transparent = False
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 50
H = float(os.environ.get('H', '2.4'))
imgs = []
for i, a in enumerate([25, 155, 270, 0]):
    r = math.radians(a); d = float(os.environ.get('D', '13'))
    cam.location = (math.sin(r) * d, math.cos(r) * d, H + 1.6)
    dvec = Vector((0, 0, H)) - cam.location; cam.rotation_euler = dvec.to_track_quat('-Z', 'Y').to_euler()
    p = '/tmp/_v%d.png' % i; sc.render.filepath = p; bpy.ops.render.render(write_still=True); imgs.append(p)
os.system('python3 -c "from PIL import Image;ims=[Image.open(p) for p in %r];w=sum(i.size[0] for i in ims);o=Image.new(\'RGB\',(w,ims[0].size[1]));x=0\nfor i in ims: o.paste(i,(x,0));x+=i.size[0]\no.save(%r)"' % (imgs, out))
