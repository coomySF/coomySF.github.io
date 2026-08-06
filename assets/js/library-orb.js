/* The archive's ember orb — one crystal floating beside the hero.
   Idle: slow spin and bob. Hover: it blooms open. */

import * as THREE from 'three';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('library-orb-canvas');

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

if (canvas && !reduced && webglOK()) boot();

function boot() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
  camera.position.set(0, 0, 6.2);

  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,240,224,1)');
    grad.addColorStop(0.4, 'rgba(220,148,124,.55)');
    grad.addColorStop(1, 'rgba(220,148,124,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  const rng = mulberry32(20260808);
  const group = new THREE.Group();
  scene.add(group);

  // crystal shell sampled from an icosahedron, plus a faint inner core
  const PTS = 1600;
  const base = new Float32Array(PTS * 3);   // rest positions
  const dirs = new Float32Array(PTS * 3);   // unit directions for the bloom
  {
    const geo = new THREE.IcosahedronGeometry(1.5, 1);
    const pos = geo.getAttribute('position');
    const triCount = pos.count / 3;
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), P = new THREE.Vector3();
    for (let k = 0; k < PTS; k++) {
      const t = Math.floor(rng() * triCount);
      A.fromBufferAttribute(pos, t * 3); B.fromBufferAttribute(pos, t * 3 + 1); C.fromBufferAttribute(pos, t * 3 + 2);
      let u = rng(), v = rng();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      P.copy(A).addScaledVector(B.sub(A), u).addScaledVector(C.sub(A), v);
      const shell = rng() < 0.85 ? 1 : 0.5 + rng() * 0.35;
      base[k * 3] = P.x * shell; base[k * 3 + 1] = P.y * shell; base[k * 3 + 2] = P.z * shell;
      const len = P.length() || 1;
      dirs[k * 3] = P.x / len; dirs[k * 3 + 1] = P.y / len; dirs[k * 3 + 2] = P.z / len;
    }
    geo.dispose();
  }

  const positions = base.slice();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.075,
    map: glowTex,
    color: new THREE.Color('#e8a184'),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  group.add(new THREE.Points(geo, mat));

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex,
    color: new THREE.Color('#dc947c'),
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  halo.scale.setScalar(4.4);
  group.add(halo);

  // hover state: the orb blooms open
  let bloomT = 0, bloomTarget = 0;
  canvas.addEventListener('pointerenter', () => { bloomTarget = 1; });
  canvas.addEventListener('pointerleave', () => { bloomTarget = 0; });

  const size = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  size();
  addEventListener('resize', size);

  const clock = new THREE.Clock();
  const posAttr = geo.getAttribute('position');
  // plain rAF: setAnimationLoop proved unreliable for secondary renderers here
  const tick = () => {
    requestAnimationFrame(tick);  // rAF self-throttles in hidden tabs; no explicit gate needed
    const t = clock.getElapsedTime();

    bloomT += (bloomTarget - bloomT) * 0.07;
    const spread = 1 + bloomT * 0.55;
    for (let k = 0; k < PTS; k++) {
      const j = k * 3;
      const wob = Math.sin(t * 1.2 + k) * 0.012;
      positions[j] = base[j] * spread + dirs[j] * wob;
      positions[j + 1] = base[j + 1] * spread + dirs[j + 1] * wob;
      positions[j + 2] = base[j + 2] * spread + dirs[j + 2] * wob;
    }
    posAttr.needsUpdate = true;

    mat.opacity = 0.85 + bloomT * 0.15;
    mat.size = 0.075 * (1 + bloomT * 0.5);
    halo.material.opacity = 0.22 + bloomT * 0.3;
    group.rotation.y = t * 0.28;
    group.rotation.x = Math.sin(t * 0.2) * 0.12;
    group.position.y = Math.sin(t * 0.55) * 0.12;
    renderer.render(scene, camera);
  };
  tick();
}

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
