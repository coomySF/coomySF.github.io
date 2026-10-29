#!/usr/bin/env python3
"""Image → 3D via the public Hunyuan3D-2 Hugging Face Space (tencent/Hunyuan3D-2).

Sends one reference image, gets a shape GLB and a textured GLB back, and records provenance
(space, endpoint, parameters, seed, mesh stats) next to the files. No credentials needed for the
anonymous ZeroGPU quota; it can queue for minutes or refuse when the quota is exhausted.

Usage: hunyuan3d_generate.py IMAGE OUT_DIR [--steps 30] [--seed 1234] [--octree 256] [--no-texture]
"""
import argparse
import json
import shutil
import time
from pathlib import Path

from gradio_client import Client, handle_file

ap = argparse.ArgumentParser()
ap.add_argument('image')
ap.add_argument('out_dir')
ap.add_argument('--steps', type=float, default=30)
ap.add_argument('--seed', type=float, default=1234)
ap.add_argument('--octree', type=float, default=256)
ap.add_argument('--guidance', type=float, default=5.0)
ap.add_argument('--no-texture', action='store_true')
ap.add_argument('--space', default='tencent/Hunyuan3D-2')
args = ap.parse_args()

out = Path(args.out_dir); out.mkdir(parents=True, exist_ok=True)
client = Client(args.space, verbose=False)
endpoint = '/shape_generation' if args.no_texture else '/generation_all'
params = dict(caption='', image=handle_file(args.image), mv_image_front=None, mv_image_back=None, mv_image_left=None, mv_image_right=None,
              steps=args.steps, guidance_scale=args.guidance, seed=args.seed, octree_resolution=args.octree,
              check_box_rembg=True, num_chunks=8000, randomize_seed=False)
t0 = time.time()
print(f'calling {args.space}{endpoint} …', flush=True)
result = client.predict(api_name=endpoint, **params)
elapsed = round(time.time() - t0, 1)
print('done in', elapsed, 's')
files = []
if args.no_texture:
    shape, html, stats, seed = result
    tex = None
else:
    shape, tex, html, stats, seed = result
def _p(v):
    return (v.get('value') or v.get('path') or v.get('url')) if isinstance(v, dict) else v

for label, src in (('shape', _p(shape)), ('textured', _p(tex))):
    if src:
        dst = out / f'hunyuan3d-{label}{Path(src).suffix or ".glb"}'
        shutil.copy(src, dst); files.append(str(dst)); print('saved', dst, dst.stat().st_size, 'bytes')
prov = {'space': args.space, 'endpoint': endpoint, 'image': args.image, 'steps': args.steps, 'guidance': args.guidance,
        'seed': seed, 'octreeResolution': args.octree, 'rembg': True, 'elapsedSeconds': elapsed, 'meshStats': stats, 'files': files,
        'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%S%z')}
(out / 'provenance.json').write_text(json.dumps(prov, indent=2, ensure_ascii=False))
print(json.dumps({k: v for k, v in prov.items() if k != 'meshStats'}, ensure_ascii=False))
