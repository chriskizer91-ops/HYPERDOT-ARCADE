"""Small modelling kit for Ironhowl 3 models, run inside Blender's Python (bpy).
Blender axes: x right, y forward, z up. The glTF export turns that into three.js axes (forward = -z).
Every part is a mesh parented to an empty; empties are the joints the game animates (keep their rotation zero at export).
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix, Euler

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()

MATS = {}
def mat(name, col=(.6, .6, .6), emit=0.0, metal=0.0, rough=.5):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*col, 1); b.inputs['Emission Strength'].default_value = emit
    MATS[name] = m; return m

def link(o):
    bpy.context.scene.collection.objects.link(o); return o

def node(name, loc=(0, 0, 0), parent=None, rot=(0, 0, 0)):
    o = link(bpy.data.objects.new(name, None)); o.empty_display_size = .2
    o.parent = parent; o.location = loc; o.rotation_euler = rot; return o

UVS = 1 / 2.2   # texture repeats once every 2.2 m

def boxuv(bm):
    """box projection: each face takes the two axes its normal is not pointing along"""
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        a, b = [(1, 2), (0, 2), (0, 1)][ax]
        for l in f.loops:
            co = l.vert.co; l[uv].uv = (co[a] * UVS + .5, co[b] * UVS + .5)

def finish(bm, name, m, parent, loc, rot, uv=True, smooth=35):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if uv: boxuv(bm)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new(name, me)); o.parent = parent; o.location = loc; o.rotation_euler = rot
    mod = o.modifiers.new('ws', 'WEIGHTED_NORMAL') if False else None
    try:
        me.set_sharp_from_angle(angle=math.radians(smooth))
    except Exception:
        pass
    return o

def bevel(bm, w, seg=2):
    if w > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges) + list(bm.verts), offset=w, segments=seg, profile=.5, affect='EDGES', clamp_overlap=True)

def box(name, size, loc, parent, m, bev=.05, seg=2, rot=(0, 0, 0), top=(1, 1), shift=(0, 0), bot=(1, 1)):
    """chamfered box. top/bot scale the top/bottom face (taper), shift moves the top face (x, y)"""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    sx, sy, sz = size
    for v in bm.verts:
        up = v.co.z > 0
        k = top if up else bot
        v.co.x *= sx * k[0]; v.co.y *= sy * k[1]; v.co.z *= sz
        if up: v.co.x += shift[0]; v.co.y += shift[1]
    bevel(bm, min(bev, min(size) * .45), seg)
    return finish(bm, name, m, parent, loc, rot)

def cyl(name, r, depth, loc, parent, m, seg=16, r2=None, rot=(0, 0, 0), bev=.02, axis='z', cap=True, thick=0):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    if thick:
        bmesh.ops.solidify(bm, geom=bm.faces, thickness=thick)
    elif bev and cap:
        caps = [e for e in bm.edges if all(abs(abs(v.co.z) - depth / 2) < 1e-4 for v in e.verts) and e.is_boundary is False]
        rim = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-5 and abs(abs(e.verts[0].co.z) - depth / 2) < 1e-4 and len(e.link_faces) == 2 and any(len(f.verts) > 4 for f in e.link_faces)]
        if rim: bmesh.ops.bevel(bm, geom=rim, offset=min(bev, depth * .3), segments=2, profile=.5, affect='EDGES', clamp_overlap=True)
    if axis == 'x': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'Y'))
    if axis == 'y': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
    return finish(bm, name, m, parent, loc, rot)

def strut(name, p0, p1, r, parent, m, seg=10, sq=False):
    """a rod (or square beam when sq) from p0 to p1 in the parent's space"""
    a, b = Vector(p0), Vector(p1); d = b - a; L = d.length; mid = (a + b) / 2
    rot = d.to_track_quat('Z', 'Y').to_euler()
    if sq: return box(name, (r * 2, r * 2, L), mid, parent, m, r * .4, 1, rot=rot)
    return cyl(name, r, L, mid, parent, m, seg=seg, rot=rot, bev=r * .3)

def ball(name, r, loc, parent, m, seg=16):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    return finish(bm, name, m, parent, loc, (0, 0, 0))

def slats(name, n, size, gap, loc, parent, m, axis='z', rot=(0, 0, 0)):
    """a row of thin plates (vents, fins). size is one slat; they step along axis"""
    bm = bmesh.new()
    for i in range(n):
        t = bmesh.ops.create_cube(bm, size=1)['verts']
        off = (i - (n - 1) / 2) * gap
        for v in t:
            v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
            if axis == 'x': v.co.x += off
            elif axis == 'y': v.co.y += off
            else: v.co.z += off
    bevel(bm, min(size) * .3, 1)
    return finish(bm, name, m, parent, loc, rot)

def hose(name, pts, r, parent, m, res=6):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 2; cu.resolution_u = res
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for p, c in zip(sp.bezier_points, pts):
        p.co = c; p.handle_left_type = p.handle_right_type = 'AUTO'
    co = link(bpy.data.objects.new(name + '_c', cu)); co.parent = parent
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(co.evaluated_get(dg))
    bpy.data.objects.remove(co)
    me.materials.clear(); me.materials.append(m)
    o = link(bpy.data.objects.new(name, me)); o.parent = parent
    return o

def decal(name, w, h, rect, loc, parent, m, rot):
    """flat quad showing rect (u0, v0, u1, v1) of the decal sheet"""
    bm = bmesh.new(); u0, v0, u1, v1 = rect
    vs = [bm.verts.new((x * w / 2, 0, z * h / 2)) for x, z in [(-1, -1), (1, -1), (1, 1), (-1, 1)]]
    f = bm.faces.new(vs); uv = bm.loops.layers.uv.verify()
    for l, (a, b) in zip(f.loops, [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]): l[uv].uv = (a, b)
    return finish(bm, name, m, parent, loc, rot, uv=False)

def mirror_x(fn, *args, **kw):
    """call fn for both sides: fn(sd) with sd = -1 (left) and +1 (right)"""
    return [fn(-1), fn(1)]

def bake_ao(distance=.6, samples=24):
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    if not sc.world: sc.world = bpy.data.worlds.new('w')
    sc.world.light_settings.distance = distance
    meshes = [o for o in sc.objects if o.type == 'MESH']
    for o in meshes:
        me = o.data
        if 'AO' not in me.color_attributes: me.color_attributes.new('AO', 'BYTE_COLOR', 'CORNER')
        me.color_attributes.active_color = me.color_attributes['AO']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    sc.render.bake.target = 'VERTEX_COLORS'
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')

def export(path):
    for o in bpy.context.scene.objects:
        if o.type == 'EMPTY': o.rotation_euler = (0, 0, 0)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_yup=True, export_apply=True,
                              export_vertex_color='ACTIVE', export_normals=True, export_texcoords=True, export_materials='EXPORT')

def stats():
    tris = 0
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
    return tris
