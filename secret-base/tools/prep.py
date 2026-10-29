# usage: prep.py in.glb out.glb [faces]  — decimate, smooth, normalise (height 1, bottom y=0, front +z)
import sys, numpy as np, trimesh, fast_simplification
src, dst = sys.argv[1], sys.argv[2]; target = int(sys.argv[3]) if len(sys.argv) > 3 else 40000
m = trimesh.load(src).to_geometry()
# keep the largest connected piece (drops floating crumbs)
parts = m.split(only_watertight=False); m = max(parts, key=lambda p: len(p.faces))
v, f = fast_simplification.simplify(m.vertices.astype(np.float32), m.faces, target_reduction=1 - target / len(m.faces))
m = trimesh.Trimesh(v, f, process=True)
trimesh.smoothing.filter_taubin(m, lamb=0.5, nu=-0.53, iterations=12)
lo, hi = m.bounds
m.apply_translation([-(lo[0] + hi[0]) / 2, -lo[1], -(lo[2] + hi[2]) / 2])
m.apply_scale(1 / (hi[1] - lo[1]))
# front check: the lowest slice (feet) sits toward the front
low = m.vertices[m.vertices[:, 1] < 0.04]
print('low-slice z mean', low[:, 2].mean(), 'faces', len(m.faces), 'bounds', m.bounds.round(3).tolist())
if '--flip' in sys.argv: m.apply_transform(trimesh.transformations.rotation_matrix(np.pi, [0, 1, 0]))
m.export(dst)
print('saved', dst)
