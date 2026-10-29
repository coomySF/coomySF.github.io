# usage: paint2.py body.glb design.png out.glb palette.json
# Per-row silhouette-aligned front projection of the faceless design:
#  - TEXCOORD_0 = where each vertex lands on the design image (shader samples the flat-paint PNG on the front)
#  - COLOR_0    = flat palette class (used on the back / sides), back rules keep trim & inner ears on the front
# Output mesh is placed in the shared design frame (700 px per unit, ground at 966 px, x centred).
import sys, json, struct, colorsys, numpy as np, trimesh
from PIL import Image
from scipy import ndimage
body, img_path, out, pal_path = sys.argv[1:5]
pal = json.load(open(pal_path))
m = trimesh.load(body).to_geometry()
img = np.asarray(Image.open(img_path).convert('RGB')).astype(np.float32) / 255
H, W, _ = img.shape
from pal import classmap, colour
names, CLS, mask = classmap(img, pal)
ys, xs = np.where(mask); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
rowL = np.array([np.argmax(mask[r]) if mask[r].any() else W // 2 for r in range(H)])
rowR = np.array([W - 1 - np.argmax(mask[r][::-1]) if mask[r].any() else W // 2 for r in range(H)])
row_dark = np.array([(CLS[r, rowL[r]:rowR[r] + 1] == names.index('dark')).any() if ('dark' in names and mask[r].any()) else False for r in range(H)])
V, N = m.vertices.copy(), m.vertex_normals.copy()
lo, hi = V.min(0), V.max(0)
# mesh silhouette per height band
B = 160
band = np.clip(((V[:, 1] - lo[1]) / (hi[1] - lo[1]) * B).astype(int), 0, B - 1)
bl = np.array([V[band == b, 0].min() if (band == b).any() else 0 for b in range(B)])
br = np.array([V[band == b, 0].max() if (band == b).any() else 0 for b in range(B)])
vrow = np.clip(np.round(y1 - (V[:, 1] - lo[1]) / (hi[1] - lo[1]) * (y1 - y0)).astype(int), 0, H - 1)
t = (V[:, 0] - bl[band]) / np.maximum(br[band] - bl[band], 1e-6)
ucol = rowL[vrow] + t * (rowR[vrow] - rowL[vrow])
ui = np.clip(np.round(ucol).astype(int), 0, W - 1)
uv = np.stack([ucol / W, 1 - vrow / H], 1).astype(np.float32)
klass = []
for i in range(len(V)):
    k = names[CLS[vrow[i], ui[i]]]
    if N[i, 2] < pal.get('backZ', -0.15):
        if k == 'pink': k = pal.get('backPink', 'base')
        elif k == 'base' and pal.get('hood') and row_dark[vrow[i]]: k = 'dark'
    klass.append(k)
klass = np.array(klass)
K, GROUND = 700.0, 966.0
sc = ((y1 - y0) / K) / (hi[1] - lo[1])
V = (V - np.array([(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2])) * sc + np.array([((x0 + x1) / 2 - W / 2) / K, (GROUND - y1) / K, 0.0])
V[:, 2] *= pal.get('zScale', 1.0)
for sp in pal.get('spots', []):
    d = np.hypot(V[:, 0] - sp['x'], V[:, 1] - sp['y'])
    klass[(d < sp['r']) & (N[:, 2] > sp.get('minZ', 0.3))] = sp['k']
cols = np.zeros((len(V), 3), np.float32)
for n in set(klass):
    sel = klass == n; cols[sel] = colour(pal, n, V[sel, 1])
counts = {n: int((klass == n).sum()) for n in set(klass)}
# --- minimal GLB writer: POSITION, NORMAL, TEXCOORD_0, COLOR_0, indices ---
V = V.astype(np.float32); Nn = N.astype(np.float32); F = m.faces.astype(np.uint32).ravel()
blobs = [V.tobytes(), Nn.tobytes(), uv.tobytes(), cols.tobytes(), F.tobytes()]
views, acc, off = [], [], 0
bin_ = b''
for i, b in enumerate(blobs):
    views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b), **({'target': 34963} if i == 4 else {'target': 34962})})
    bin_ += b; pad = (-len(bin_)) % 4; bin_ += b'\0' * pad; off = len(bin_)
acc = [
    {'bufferView': 0, 'componentType': 5126, 'count': len(V), 'type': 'VEC3', 'min': V.min(0).tolist(), 'max': V.max(0).tolist()},
    {'bufferView': 1, 'componentType': 5126, 'count': len(V), 'type': 'VEC3'},
    {'bufferView': 2, 'componentType': 5126, 'count': len(V), 'type': 'VEC2'},
    {'bufferView': 3, 'componentType': 5126, 'count': len(V), 'type': 'VEC3'},
    {'bufferView': 4, 'componentType': 5125, 'count': len(F), 'type': 'SCALAR'}]
gltf = {'asset': {'version': '2.0', 'generator': 'secret-base paint2.py'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0}],
        'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2, 'COLOR_0': 3}, 'indices': 4}]}],
        'buffers': [{'byteLength': len(bin_)}], 'bufferViews': views, 'accessors': acc}
js = json.dumps(gltf).encode(); js += b' ' * ((-len(js)) % 4)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(bin_), 0x004E4942) + bin_
open(out, 'wb').write(glb)
print('painted', out, counts, 'bytes', len(glb))
