# usage: flatpaint.py design.png palette.json out.png — flat palette paint (front texture), every pixel filled
import sys, json, numpy as np
from PIL import Image
from pal import classmap, colour, K, GROUND
img = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32) / 255
pal = json.load(open(sys.argv[2]))
names, cls, mask = classmap(img, pal)
H, W = cls.shape
out = np.zeros((H, W, 3))
rows_y = (GROUND - np.arange(H)) / K
for i, n in enumerate(names):
    sel = cls == i
    if not sel.any(): continue
    rr = np.where(sel)[0]
    out[sel] = colour(pal, n, rows_y[rr])
srgb = np.where(out <= 0.0031308, out * 12.92, 1.055 * np.power(out, 1 / 2.4) - 0.055)
Image.fromarray((np.clip(srgb, 0, 1) * 255).round().astype(np.uint8)).save(sys.argv[3]); print('saved', sys.argv[3])
