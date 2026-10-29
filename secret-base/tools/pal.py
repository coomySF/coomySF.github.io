# shared palette rules: classify every pixel of a faceless design image into flat colour classes
import colorsys, numpy as np
from scipy import ndimage
K, GROUND = 700.0, 966.0
DEFAULT_RULES = [
    {"k": "dark", "v": [0, 0.5]},
    {"k": "dark", "h": [0.55, 0.85], "s": [0.08, 1], "v": [0, 0.8]},
    {"k": "pink", "h": [0.83, 0.04], "s": [0.2, 1], "v": [0.5, 1]},
]
def hexlin(x):
    c = np.array([int(x[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def classmap(img, pal):
    """img float RGB HxWx3 → (names, class index map HxW, mask, core-nearest indices)"""
    H, W, _ = img.shape
    hsv = np.array([colorsys.rgb_to_hsv(*c) for c in img.reshape(-1, 3)]).reshape(H, W, 3)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    y = (GROUND - np.arange(H)[:, None]) / K + np.zeros((1, W))
    names = list(pal['colors'].keys())
    cls = np.full((H, W), names.index('base'), np.int16)
    done = np.zeros((H, W), bool)
    for r in pal.get('rules', DEFAULT_RULES):
        if r['k'] not in names: continue
        sel = ~done
        if 'h' in r:
            a, b = r['h']; sel &= ((h >= a) & (h <= b)) if a <= b else ((h >= a) | (h <= b))
        for key, arr in (('s', s), ('v', v), ('y', y)):
            if key in r: sel &= (arr >= r[key][0]) & (arr <= r[key][1])
        cls[sel] = names.index(r['k']); done |= sel
    if pal.get('hoodFill') and 'dark' in names and 'pink' in names:
        # above the bottom of the face trim, only the face itself stays body colour: every other
        # base pixel (wool peeking out around the hood) becomes hood fabric
        D, Pk, Bs = names.index('dark'), names.index('pink'), names.index('base')
        cls[ndimage.binary_fill_holes(cls == Pk)] = Pk  # highlight dots inside the heart badge stay pink
        bot = max(r for r in range(H) if (cls[r] == Pk).sum() > 6)
        upper = np.zeros((H, W), bool); upper[:bot] = True
        lab, _ = ndimage.label((cls == Bs) & upper)
        fy, fx = pal.get('faceAt', [650, W // 2])
        face = ndimage.binary_fill_holes(lab == lab[fy, fx])
        cls[upper & (cls == Bs) & ~face] = D
    # majority smoothing: blur each class indicator and keep the strongest (removes speckled borders)
    stack = np.stack([ndimage.gaussian_filter((cls == i).astype(np.float32), 2.5) for i in range(len(names))])
    cls = stack.argmax(0).astype(np.int16)
    mask = ndimage.binary_fill_holes(img.min(axis=2) < 0.95)
    if pal.get('mirror') == 'left':  # design is symmetric except the tail side: copy the clean left half
        cls[:, W // 2:] = cls[:, :W - W // 2][:, ::-1]; mask[:, W // 2:] = mask[:, :W - W // 2][:, ::-1]
    core = ndimage.binary_erosion(mask, iterations=4)
    _, (NY, NX) = ndimage.distance_transform_edt(~core, return_indices=True)
    return names, cls[NY, NX], mask
def colour(pal, name, y):
    """linear RGB for a class at design-frame height y (base may carry a vertical gradient)"""
    c = hexlin(pal['colors'][name])
    if name == 'base' and 'baseLow' in pal:
        a, b = pal.get('gradY', [0.05, 0.45])
        t = np.clip((np.asarray(y) - a) / (b - a), 0, 1); t = t * t * (3 - 2 * t)
        return hexlin(pal['baseLow'])[None, :] * (1 - t)[:, None] + c[None, :] * t[:, None]
    return np.tile(c, (np.size(y), 1))
