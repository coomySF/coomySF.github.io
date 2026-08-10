/* Life film — 同船共築, a three-beat miniature.
   水球 tosses idea-stars, Coomy catches them and a little rocket assembles;
   they launch it together; the scene settles into a desk with two coffees.
   Scroll drives everything; no sound, no external animation libs. */

import * as THREE from 'three';

const docEl = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 640px)').matches || new URLSearchParams(location.search).has('mobile');

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

if (reduced || !webglOK()) {
  docEl.classList.add('life-static');
} else {
  boot();
}

function ss(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function lerp(a, b, t) { return a + (b - a) * t; }
// piecewise choreography: [[p, value], ...] eased between keys
function kf(p, pts) {
  if (p <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (p <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], ss(pts[i - 1][0], pts[i][0], p));
  }
  return pts[pts.length - 1][1];
}

function boot() {
  docEl.style.scrollBehavior = 'auto';  // site smooth-scroll fights our glide tween
  const canvas = document.getElementById('life-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.2 : 2));
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#110e0b');  // warm night, not deep space

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 10);

  // ---------- glow texture ----------
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,.9)');
    grad.addColorStop(0.45, 'rgba(255,255,255,.28)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  // ---------- stars ----------
  const DUST = small ? 500 : 1200;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 30;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 18;
    dustPos[i * 3 + 2] = -3 - Math.random() * 12;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#d8c8a8', size: 0.035, transparent: true, opacity: 0.65, depthWrite: false })));

  // ---------- 水球（match her homepage look: round drop, big eyes, blush）----------
  const ballMat = new THREE.LineBasicMaterial({ color: '#a5dbff', transparent: true, opacity: 1 });
  const ballSoft = new THREE.LineBasicMaterial({ color: '#cfeaff', transparent: true, opacity: 0.75 });
  const ball = new THREE.Group();
  const arcLine = (cx, cy, r, a0, a1, n, mat, z = 0.03) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
  };
  // round jelly body — nearly a circle, softly flattened at the bottom
  const bodyPts = [];
  for (let i = 0; i <= 56; i++) {
    const a = (i / 56) * Math.PI * 2;
    const x = Math.sin(a) * 0.56;
    let y = -Math.cos(a) * 0.48 - 0.04;
    if (y < -0.3) y = -0.3 - (Math.abs(y) - 0.3) * 0.55;  // squish where she sits
    bodyPts.push(new THREE.Vector3(x, y, 0));
  }
  ball.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bodyPts), ballMat));
  // the little sprout knot on top
  ball.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.05, 0.42, 0), new THREE.Vector3(0.02, 0.56, 0),
  ]), ballMat));
  ball.add(arcLine(0.11, 0.6, 0.09, Math.PI * 1.15, Math.PI * 2.9, 12, ballMat, 0));
  // big round eyes, each holding a little star
  const starMat = new THREE.LineBasicMaterial({ color: '#ffd479', transparent: true, opacity: 0.95 });
  const eye = (x) => {
    const g = new THREE.Group();
    g.add(arcLine(0, 0, 0.115, 0, Math.PI * 2, 18, ballMat));
    const s = 0.052, w = 0.02;
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, s, 0.01), new THREE.Vector3(w, 0.018, 0.01), new THREE.Vector3(s, 0, 0.01),
      new THREE.Vector3(w, -0.018, 0.01), new THREE.Vector3(0, -s, 0.01), new THREE.Vector3(-w, -0.018, 0.01),
      new THREE.Vector3(-s, 0, 0.01), new THREE.Vector3(-w, 0.018, 0.01), new THREE.Vector3(0, s, 0.01),
    ]), starMat));
    g.position.set(x, -0.02, 0.03);
    return g;
  };
  ball.add(eye(-0.21), eye(0.21));
  // tiny ω mouth
  ball.add(arcLine(-0.038, -0.22, 0.038, Math.PI * 1.05, Math.PI * 1.95, 8, ballMat));
  ball.add(arcLine(0.038, -0.22, 0.038, Math.PI * 1.05, Math.PI * 1.95, 8, ballMat));
  // shine strokes, upper left
  ball.add(arcLine(-0.1, 0.02, 0.34, Math.PI * 0.58, Math.PI * 0.82, 8, ballSoft));
  ball.add(arcLine(-0.08, 0.02, 0.34, Math.PI * 0.88, Math.PI * 0.95, 4, ballSoft));
  const ballGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#a5dbff', transparent: true, opacity: 0.24, depthWrite: false, blending: THREE.AdditiveBlending }));
  ballGlow.scale.setScalar(2.2);
  ball.add(ballGlow);
  scene.add(ball);

  // ---------- Coomy（chibi: big head, round body, big glasses, a happy tuft）----------
  const manMat = new THREE.LineBasicMaterial({ color: '#e2ddcf', transparent: true, opacity: 1 });
  const manSoft = new THREE.LineBasicMaterial({ color: '#dc947c', transparent: true, opacity: 0.8 });
  const coomy = new THREE.Group();
  // a round soft face — she asked to be cuter, the ball approved this shape
  const head = new THREE.Group();
  head.add(arcLine(0, 0, 0.32, 0, Math.PI * 2, 28, manMat, 0));
  head.position.y = 0.5;
  // a little A-line dress with a gently scalloped hem
  const dressPts = [new THREE.Vector3(-0.11, 0.2, 0), new THREE.Vector3(-0.27, -0.18, 0)];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    dressPts.push(new THREE.Vector3(-0.27 + u * 0.54, -0.18 - Math.abs(Math.sin(u * Math.PI * 3)) * 0.035, 0));
  }
  dressPts.push(new THREE.Vector3(0.27, -0.18, 0), new THREE.Vector3(0.11, 0.2, 0), new THREE.Vector3(-0.11, 0.2, 0));
  const belly = new THREE.Line(new THREE.BufferGeometry().setFromPoints(dressPts), manMat);
  const limbs = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.13, 0.1, 0), new THREE.Vector3(-0.3, 0.26, 0),    // cheering arms
    new THREE.Vector3(0.13, 0.1, 0), new THREE.Vector3(0.3, 0.26, 0),
    new THREE.Vector3(-0.07, -0.2, 0), new THREE.Vector3(-0.09, -0.34, 0), // little legs under the hem
    new THREE.Vector3(0.07, -0.2, 0), new THREE.Vector3(0.09, -0.34, 0),
  ]), manMat);
  const lens = (x) => {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CircleGeometry(0.115, 12)), manMat);
    l.position.set(x, 0.52, 0.33);
    return l;
  };
  const bridge = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.02, 0.52, 0.33), new THREE.Vector3(0.02, 0.52, 0.33),
  ]), manMat);
  // starry eyes behind the glasses (a matching pair with the ball's)
  const cStarMat = new THREE.LineBasicMaterial({ color: '#ffd479', transparent: true, opacity: 0.95 });
  const dot = (x) => {
    const s = 0.045, w = 0.017;
    const st = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, s, 0), new THREE.Vector3(w, 0.015, 0), new THREE.Vector3(s, 0, 0),
      new THREE.Vector3(w, -0.015, 0), new THREE.Vector3(0, -s, 0), new THREE.Vector3(-w, -0.015, 0),
      new THREE.Vector3(-s, 0, 0), new THREE.Vector3(-w, 0.015, 0), new THREE.Vector3(0, s, 0),
    ]), cStarMat);
    st.position.set(x, 0.51, 0.34);
    return st;
  };
  const cSmile = arcLine(0, 0.4, 0.1, Math.PI * 1.15, Math.PI * 1.85, 10, manMat, 0.34);
  const cBlush = (x) => {
    const b = arcLine(0, 0, 0.04, 0, Math.PI * 2, 10, manSoft, 0);
    b.position.set(x, 0.41, 0.33);
    return b;
  };
  // the tuft on top
  const tuft = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.02, 0.8, 0), new THREE.Vector3(0.09, 0.96, 0), new THREE.Vector3(0.16, 0.9, 0),
  ]), manMat);
  // long hair — she asked for it herself
  const strand = (side) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(side * 0.16, 0.82, -0.02),
    new THREE.Vector3(side * 0.34, 0.6, -0.02),
    new THREE.Vector3(side * 0.4, 0.3, -0.02),
    new THREE.Vector3(side * 0.35, 0.0, -0.02),
    new THREE.Vector3(side * 0.42, -0.24, -0.02),
    new THREE.Vector3(side * 0.34, -0.34, -0.02),
  ]), manMat);
  // proper bangs: a scalloped fringe across the forehead
  const fringe = new THREE.Group();
  fringe.add(arcLine(0, 0.52, 0.34, Math.PI * 0.15, Math.PI * 0.85, 14, manMat, 0.3));
  for (let k = 0; k < 4; k++) {
    fringe.add(arcLine(-0.24 + k * 0.16, 0.73, 0.082, Math.PI, Math.PI * 2, 8, manMat, 0.33));
  }
  coomy.add(head, belly, limbs, lens(-0.13), lens(0.13), bridge, dot(-0.13), dot(0.13), cSmile, cBlush(-0.26), cBlush(0.26), tuft, strand(-1), strand(1), fringe);
  scene.add(coomy);

  // ---------- idea stars ----------
  const STAR_COLORS = ['#ffd479', '#ff8d7a', '#7ee0a8', '#8fb8e8', '#c98bff'];
  const stars = STAR_COLORS.map((col, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(0.5);
    scene.add(s);
    return { s, t0: 0.05 + i * 0.03, phase: i * 1.3 };
  });

  // ---------- the little rocket (assembles from parts) ----------
  const rocketMat = new THREE.LineBasicMaterial({ color: '#e2ddcf', transparent: true, opacity: 0 });
  const rocket = new THREE.Group();
  const mkPart = (geo) => new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), rocketMat);
  const rBody = mkPart(new THREE.CylinderGeometry(0.22, 0.32, 1.1, 6));
  const rNose = mkPart(new THREE.ConeGeometry(0.32, 0.5, 6));
  rNose.position.y = 0.8;
  const finPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0.33, -0.62, 0), new THREE.Vector3(0, 0, 0)];
  const rFinL = new THREE.Line(new THREE.BufferGeometry().setFromPoints(finPts), rocketMat);
  rFinL.position.set(0.26, -0.2, 0);
  const rFinR = new THREE.Line(new THREE.BufferGeometry().setFromPoints(finPts), rocketMat);
  rFinR.scale.x = -1;
  rFinR.position.set(-0.26, -0.2, 0);
  const flame = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.1, -0.62, 0), new THREE.Vector3(-0.1, -0.95, 0),
    new THREE.Vector3(0, -0.66, 0), new THREE.Vector3(0, -1.1, 0),
    new THREE.Vector3(0.1, -0.62, 0), new THREE.Vector3(0.1, -0.95, 0),
  ]), rocketMat);
  const parts = [
    { obj: rBody, from: new THREE.Vector3(-1.4, -1.2, 0), rot: -1.2 },
    { obj: rNose, from: new THREE.Vector3(1.2, -1.6, 0), rot: 0.9 },
    { obj: rFinL, from: new THREE.Vector3(1.6, 0.6, 0), rot: 1.6 },
    { obj: rFinR, from: new THREE.Vector3(-1.7, 0.4, 0), rot: -1.8 },
  ];
  parts.forEach((p) => { p.home = p.obj.position.clone(); });
  // the halo that lights up when it becomes SpecFormula
  const halo = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.TorusGeometry(0.55, 0.015, 3, 26), 20), rocketMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = -0.15;
  halo.scale.setScalar(0.001);
  rocket.add(rBody, rNose, rFinL, rFinR, flame, halo);
  rocket.position.set(0, -1.1, 0);
  scene.add(rocket);

  // hammer-impact sparks, one per part
  const sparks = parts.map(() => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffd479', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.scale.setScalar(0.55);
    scene.add(sp);
    return sp;
  });

  // ---------- the crew that joins along the way ----------
  const FRIENDS = [
    { name: 'Raymond', color: '#7ee0a8', enter: 0.4, from: [6.2, -0.5], spot: [2.15, -0.5] },
    { name: 'Richard', color: '#ffd479', enter: 0.43, from: [6.8, -0.3], spot: [1.1, 0.2] },
    { name: 'Fish', color: '#8fb8e8', enter: 0.56, from: [-6.2, -0.7], spot: [-1.15, -1.5] },
    { name: 'Ben', color: '#ff8d7a', enter: 0.59, from: [-6.8, -1.3], spot: [-0.4, -1.62] },
    { name: 'ccza', color: '#c98bff', enter: 0.62, from: [-7.2, -0.2], spot: [0.55, -1.62] },
  ];
  const uiEl = document.querySelector('.life-ui');
  const friends = FRIENDS.map((f, i) => {
    const mat = new THREE.LineBasicMaterial({ color: f.color, transparent: true, opacity: 1 });
    const g = new THREE.Group();
    const h = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.2, 0), 10), mat);
    h.position.y = 0.36;
    const b = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.12, 0), 10), mat);
    b.position.y = 0.02;
    const lm = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.1, 0.08, 0), new THREE.Vector3(-0.24, 0.2, 0),
      new THREE.Vector3(0.1, 0.08, 0), new THREE.Vector3(0.24, 0.2, 0),
      new THREE.Vector3(-0.06, -0.08, 0), new THREE.Vector3(-0.08, -0.22, 0),
      new THREE.Vector3(0.06, -0.08, 0), new THREE.Vector3(0.08, -0.22, 0),
    ]), mat);
    g.add(h, b, lm);
    if (f.name === 'Richard') {
      // the painter's brush for the hull
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0.24, 0.2, 0), new THREE.Vector3(0.4, 0.42, 0),
        new THREE.Vector3(0.34, 0.47, 0), new THREE.Vector3(0.46, 0.47, 0), new THREE.Vector3(0.4, 0.42, 0),
      ]), mat));
    }
    g.visible = false;
    scene.add(g);
    const tag = document.createElement('p');
    tag.className = 'life-tag';
    tag.textContent = f.name;
    tag.style.color = f.color;
    if (uiEl) uiEl.appendChild(tag);
    return { ...f, g, mat, tag, phase: i * 1.4 };
  });

  // the engine the trio tunes, the panels Richard paints, the finale wings
  const engineGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffb36a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  engineGlow.scale.setScalar(1.1);
  scene.add(engineGlow);
  const panelMat = new THREE.LineBasicMaterial({ color: '#ffd479', transparent: true, opacity: 0 });
  const panelRing = (y, r) => {
    const ring = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CircleGeometry(r, 6)), panelMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    return ring;
  };
  const panels = new THREE.Group();
  panels.add(panelRing(0.28, 0.24), panelRing(-0.2, 0.3));
  rocket.add(panels);
  const wingShape = [new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(0.12, 0.55, 0), new THREE.Vector3(0.8, 0.9, 0), new THREE.Vector3(0.33, 0.05, 0), new THREE.Vector3(0, -0.1, 0)];
  const wingGeo = new THREE.BufferGeometry().setFromPoints(wingShape);
  const wingL = new THREE.Line(wingGeo, rocketMat);
  wingL.position.set(0.24, -0.25, -0.03);
  const wingR = new THREE.Line(wingGeo.clone(), rocketMat);
  wingR.scale.x = -1;
  wingR.position.set(-0.24, -0.25, -0.03);
  const wings = new THREE.Group();
  wings.add(wingL, wingR);
  wings.scale.setScalar(0.001);
  rocket.add(wings);

  // ---------- SUM, the sun that rises after liftoff ----------
  const sunMat = new THREE.LineBasicMaterial({ color: '#ffcf6a', transparent: true, opacity: 0 });
  const sun = new THREE.Group();
  const sunArc = (cx, cy, r, a0, a1, n) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), sunMat);
  };
  sun.add(sunArc(0, 0, 0.6, 0, Math.PI * 2, 40));
  const rayPts = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const r1 = 0.74, r2 = k % 2 === 0 ? 1.0 : 0.88;
    rayPts.push(new THREE.Vector3(Math.cos(a) * r1, Math.sin(a) * r1, 0));
    rayPts.push(new THREE.Vector3(Math.cos(a) * r2, Math.sin(a) * r2, 0));
  }
  // rays spin on their own so her face stays upright
  const sunRays = new THREE.Group();
  sunRays.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rayPts), sunMat));
  sun.add(sunRays);
  // a gentle sleeping-happy face
  sun.add(sunArc(-0.2, 0.08, 0.09, Math.PI * 1.15, Math.PI * 1.85, 8));
  sun.add(sunArc(0.2, 0.08, 0.09, Math.PI * 1.15, Math.PI * 1.85, 8));
  sun.add(sunArc(0, -0.14, 0.14, Math.PI * 1.1, Math.PI * 1.9, 10));
  const sunGlowIn = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffcf6a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  sunGlowIn.scale.setScalar(3.2);
  const sunGlowOut = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ff9d5c', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  sunGlowOut.scale.setScalar(7.5);
  sun.add(sunGlowIn, sunGlowOut);
  sun.position.set(0, -4.5, -1.8);
  scene.add(sun);
  const sunTag = document.createElement('p');
  sunTag.className = 'life-tag';
  sunTag.textContent = 'SUM';
  sunTag.style.color = '#ffcf6a';
  if (uiEl) uiEl.appendChild(sunTag);

  // ---------- the desk (beat 3) ----------
  const deskMat = new THREE.LineBasicMaterial({ color: '#dc947c', transparent: true, opacity: 0 });
  const desk = new THREE.Group();
  const top = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.4, 0.12, 1.2)), deskMat);
  const leg = (x) => {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.1, 1.1, 0.1)), deskMat);
    l.position.set(x, -0.6, 0);
    return l;
  };
  const mug = (x) => {
    const m = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.13, 0.13, 0.22, 8), 25), deskMat);
    m.position.set(x, 0.18, 0.1);
    return m;
  };
  desk.add(top, leg(-1.5), leg(1.5), mug(-0.4), mug(0.4));
  // steam: rising dots above the mugs
  const steam = [];
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#f2eee5', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    p.scale.setScalar(0.12);
    desk.add(p);
    steam.push({ p, mx: i < 3 ? -0.4 : 0.4, phase: i * 1.1 });
  }
  // a little heart drifts up between the two of them
  const heartMat = new THREE.LineBasicMaterial({ color: '#ff9d9d', transparent: true, opacity: 0 });
  const heartPts = [];
  for (let i = 0; i <= 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    heartPts.push(new THREE.Vector3(
      0.013 * 16 * Math.pow(Math.sin(a), 3),
      0.013 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)),
      0.2
    ));
  }
  const heart = new THREE.Line(new THREE.BufferGeometry().setFromPoints(heartPts), heartMat);
  desk.add(heart);

  desk.position.set(0, -0.7, 1);
  scene.add(desk);

  // ---------- DOM ----------
  const titleEl = document.querySelector('.life-title');
  const startEl = document.querySelector('.life-start');
  const keepEl = document.querySelector('.life-keep');
  const sayBall = document.querySelector('.life-say-ball');
  const sayCoomy = document.querySelector('.life-say-coomy');
  const captionEl = document.querySelector('.life-caption');
  const sfEl = document.querySelector('.life-sf');
  const capA = document.querySelector('.life-cap-a');
  const capB = document.querySelector('.life-cap-b');
  const capC = document.querySelector('.life-cap-c');

  // ---------- sound: synthesized, the toggle is the browser gesture ----------
  const sound = makeLifeSound();
  const soundBtn = document.querySelector('.life-sound');
  let soundOn = false;
  let muted = localStorage.getItem('coomy-sound') === 'off';
  const setSoundUI = () => {
    if (!soundBtn) return;
    soundBtn.textContent = soundOn ? 'SOUND · ON' : 'SOUND · OFF';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
  };
  if (soundBtn) soundBtn.addEventListener('click', () => {
    if (soundOn) {
      sound.stop();
      soundOn = false;
      muted = true;
      localStorage.setItem('coomy-sound', 'off');
    } else {
      muted = false;
      localStorage.setItem('coomy-sound', 'on');
      sound.start();
      soundOn = true;
    }
    setSoundUI();
  });
  setSoundUI();

  // one-shot cues on upward crossings, rearmed on scroll-back
  const CUES = [
    ...[0, 1, 2, 3, 4].map((i) => ({ at: 0.05 + i * 0.03 + 0.085, fn: () => sound.pop(i) })),
    ...[0.17, 0.21, 0.25, 0.29].map((at) => ({ at, fn: () => sound.tap() })),
    { at: 0.355, fn: () => sound.thunk() },
    ...FRIENDS.map((f, i) => ({ at: f.enter + 0.055, fn: () => sound.hello(i) })),
    { at: 0.63, fn: () => sound.engine() },
    { at: 0.765, fn: () => sound.ignite() },
    { at: 0.825, fn: () => sound.whoosh() },
    { at: 0.855, fn: () => sound.sunrise() },
    { at: 0.94, fn: () => sound.clink() },
  ].map((c) => ({ ...c, fired: false }));

  // ---------- scroll ----------
  const film = document.getElementById('life-film');
  let P = 0, Psm = 0;
  const readScroll = () => {
    const max = film.offsetHeight - innerHeight;
    const y = Math.min(Math.max(scrollY - film.offsetTop, 0), max);
    P = max > 0 ? y / max : 0;
  };
  addEventListener('scroll', readScroll, { passive: true });
  readScroll();
  window.__lifeSeek = (p) => { P = p; Psm = p; render(); };  // QA hook

  // gentle auto-glide the visitor can take back at any time
  let autoScroll = null;
  const glideTo = (targetY, dur = 3000) => { autoScroll = { from: scrollY, to: targetY, t0: performance.now(), dur }; };
  const cancelGlide = () => { autoScroll = null; };
  addEventListener('wheel', cancelGlide, { passive: true });
  addEventListener('touchstart', cancelGlide, { passive: true });
  addEventListener('keydown', cancelGlide, { passive: true });
  const filmMax = () => film.offsetHeight - innerHeight;
  const pToY = (p) => film.offsetTop + filmMax() * p;

  // START: sound (unless muted) + glide into the first beat
  let scrollPrompt = 0;
  if (startEl) startEl.addEventListener('click', () => {
    track('life_film_start');
    if (!muted && !soundOn) { sound.start(); soundOn = true; setSoundUI(); }
    glideTo(pToY(0.12), 2600);
    setTimeout(() => { scrollPrompt = 1; }, 1100);
  });

  // stall watch: like the homepage's variant B — the film plays itself
  const LIFE_CHAPTERS = [0.12, 0.3, 0.44, 0.58, 0.74, 0.84, 0.97];
  let lastYs = 0, lastMoveTs = 0;

  // funnel events for GTM, and the final glide into the log list
  const tracked = {};
  const track = (ev) => {
    if (tracked[ev]) return;
    tracked[ev] = true;
    try { (window.dataLayer = window.dataLayer || []).push({ event: ev }); } catch (_) {}
  };
  let logsSeen = false;
  const listEl = document.querySelector('.life-list');
  if (listEl && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) { logsSeen = true; track('life_reach_logs'); obs.disconnect(); }
    }, { threshold: 0.25 }).observe(listEl);
  }

  const tmpV = new THREE.Vector3();
  const clock = new THREE.Clock();

  function update(p, t) {
    // title
    const titleOp = 1 - ss(0.02, 0.08, p);
    titleEl.style.opacity = String(titleOp);
    if (startEl) startEl.style.pointerEvents = titleOp > 0.3 ? 'auto' : 'none';
    if (keepEl) {
      keepEl.style.opacity = String(scrollPrompt * ss(0.08, 0.1, p) * (1 - ss(0.16, 0.2, p)));
    }

    // ---- beat windows ----
    // act 1 兩個人: toss 0.05-0.25, hammer 0.12-0.32, 推正 0.3-0.36
    // act 2 找朋友: Raymond/Richard 0.4-, 引擎三人組 0.56-, 打磨 0.6-0.7
    // act 3 合力: 靠攏推 0.72-0.8, 點燃 0.745-0.785, 發射 0.8-0.9, 書桌 0.88-
    const toss = (x) => ss(x, x + 0.1, p);
    const hammerEnv = ss(0.12, 0.15, p) * (1 - ss(0.3, 0.33, p));
    const pushEnvA = ss(0.29, 0.31, p) * (1 - ss(0.35, 0.38, p));   // 夫妻推正
    const pushQ = ss(0.3, 0.35, p);
    const allPush = ss(0.72, 0.745, p) * (1 - ss(0.79, 0.82, p));   // 全員合力
    const ignite = ss(0.745, 0.785, p);                              // 光環+字樣點燃
    const launch = ss(0.8, 0.9, p);
    const deskQ = ss(0.88, 0.96, p);
    const together = ss(0.9, 0.98, p);
    const pushEnv = Math.max(pushEnvA, allPush);

    // 水球：出主意 → 加油 → 推正 → 看夥伴工作 → 全員合力 → 仰望 → 桌邊
    const bxp = kf(p, [[0, -2.6], [0.08, -2.6], [0.28, -2.6], [0.31, -0.6], [0.36, -0.6], [0.42, -2.0], [0.7, -2.0], [0.745, -1.0], [0.8, -1.0], [0.85, -2.1], [0.9, -2.1], [0.97, -0.75]]);
    const byp = kf(p, [[0, 0.35], [0.28, 0.35], [0.31, -0.8], [0.36, -0.8], [0.42, -0.5], [0.7, -0.5], [0.745, -1.1], [0.8, -1.1], [0.85, -0.2], [0.9, -0.2], [0.97, -1.05]]);
    const cheerBob = hammerEnv * Math.abs(Math.sin(t * 5)) * 0.18;
    ball.position.set(bxp, byp + Math.sin(t * 1.2) * 0.1 * (1 - pushEnv) + cheerBob, lerp(0, 1.6, together));
    ball.rotation.z = Math.sin(t * 0.9) * 0.07 + pushEnv * 0.3;
    ball.scale.setScalar(lerp(1, 0.72, together));
    ballMat.opacity = 1;

    // Coomy：接點子 → 敲敲打打 → 推正 → 與水球並肩看 → 全員合力 → 桌邊
    let catchHop = 0;
    stars.forEach((st) => { catchHop = Math.max(catchHop, Math.sin(ss(st.t0 + 0.07, st.t0 + 0.1, p) * Math.PI)); });
    const cxp = kf(p, [[0, 2.6], [0.08, 2.6], [0.1, 2.6], [0.14, 1.0], [0.28, 1.0], [0.31, 0.6], [0.36, 0.6], [0.42, -1.45], [0.7, -1.45], [0.745, 0.95], [0.8, 0.95], [0.85, 2.1], [0.9, 2.1], [0.97, 0.75]]);
    const cyp = kf(p, [[0, -0.35], [0.28, -0.35], [0.31, -0.85], [0.36, -0.85], [0.42, -0.5], [0.7, -0.5], [0.745, -1.15], [0.8, -1.15], [0.85, -0.25], [0.9, -0.25], [0.97, -1.35]]);
    const hammer = hammerEnv * Math.abs(Math.sin(t * 7)) * 0.14;
    coomy.position.set(cxp, cyp + catchHop * 0.22 + hammer + together * Math.sin(t * 1.4 + 1) * 0.05, lerp(0, 1.6, together));
    coomy.rotation.z = Math.sin(t * 0.7 + 2) * 0.04 - hammerEnv * (0.18 + Math.sin(t * 7) * 0.08) - pushEnv * 0.3;
    coomy.scale.setScalar(lerp(1, 0.8, together));

    // idea stars arc from 水球 to the rocket pile
    stars.forEach((st, i) => {
      const q = toss(st.t0);
      const on = q > 0.001 && q < 0.999 && p < 0.38;
      st.s.visible = on;
      if (!on) return;
      const x0 = ball.position.x + 0.4, y0 = ball.position.y + 0.2;
      const x1 = rocket.position.x + (i - 2) * 0.18, y1 = rocket.position.y + 0.4;
      const arc = Math.sin(q * Math.PI) * (1.6 + (i % 3) * 0.3);
      st.s.position.set(lerp(x0, x1, q), lerp(y0, y1, q) + arc, 0.3);
      st.s.material.opacity = Math.sin(q * Math.PI);
      st.s.scale.setScalar(0.35 + Math.sin(q * Math.PI + st.phase) * 0.12);
    });

    // speech bubbles ride the characters, lines change with the story
    sayBall.textContent = p < 0.14 ? '做這個！' : p < 0.26 ? '加油加油！' : p < 0.5 ? '一起推！' : '三、二、一——！';
    sayCoomy.textContent = p < 0.2 ? '好，我來做！' : p < 0.45 ? '……歪了 XD' : '引擎拜託了！';
    const sayQ1 = Math.max(
      ss(0.05, 0.075, p) * (1 - ss(0.11, 0.14, p)),
      ss(0.16, 0.19, p) * (1 - ss(0.24, 0.27, p)),
      ss(0.29, 0.31, p) * (1 - ss(0.345, 0.375, p)),
      ss(0.74, 0.765, p) * (1 - ss(0.79, 0.82, p))
    );
    const sayQ2 = Math.max(
      ss(0.08, 0.11, p) * (1 - ss(0.16, 0.2, p)),
      ss(0.24, 0.27, p) * (1 - ss(0.3, 0.33, p)),
      ss(0.6, 0.63, p) * (1 - ss(0.68, 0.72, p))
    );
    const w = innerWidth, h = innerHeight;
    const project = (obj, el, dy) => {
      tmpV.copy(obj.position); tmpV.y += dy; tmpV.project(camera);
      el.style.transform = `translate(-50%, -100%) translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h}px)`;
    };
    project(ball, sayBall, 0.85);
    project(coomy, sayCoomy, 1.05);
    sayBall.style.opacity = String(sayQ1);
    sayCoomy.style.opacity = String(sayQ2);

    // chapter cards carry the story
    if (capA) capA.style.opacity = String(ss(0.37, 0.4, p) * (1 - ss(0.46, 0.5, p)));
    if (capB) capB.style.opacity = String(ss(0.53, 0.56, p) * (1 - ss(0.63, 0.67, p)));
    if (capC) capC.style.opacity = String(ss(0.75, 0.78, p) * (1 - ss(0.86, 0.9, p)));

    // the crew walks in, works, gathers for the final push, then watches
    const gatherQ = ss(0.72, 0.755, p);
    const backQ = ss(0.8, 0.85, p);
    friends.forEach((f) => {
      const inQ = ss(f.enter, f.enter + 0.07, p);
      const show = inQ > 0.01 && p < 0.97;
      f.g.visible = show;
      if (!show) { f.tag.style.opacity = '0'; return; }
      let fx = lerp(f.from[0], f.spot[0], inQ);
      let fy = lerp(f.from[1], f.spot[1], inQ);
      fx = lerp(fx, fx * 0.72, gatherQ);
      fy = lerp(fy, fy - 0.08, gatherQ);
      fx = lerp(fx, fx * 1.5 + Math.sign(fx || 1) * 0.4, backQ);
      fy = lerp(fy, fy + 0.3, backQ);
      const working = inQ > 0.97 && p < 0.72 ? Math.abs(Math.sin(t * 6 + f.phase)) * 0.09 : 0;
      f.g.position.set(fx, fy + working + Math.sin(t * 1.3 + f.phase) * 0.04, 0.2);
      f.g.rotation.z = Math.sin(t * 0.8 + f.phase) * 0.05 - allPush * 0.25 * Math.sign(fx || 1);
      f.mat.opacity = 1 - ss(0.9, 0.96, p);
      tmpV.copy(f.g.position); tmpV.y += 0.72; tmpV.project(camera);
      f.tag.style.transform = `translate(-50%, -100%) translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h}px)`;
      f.tag.style.opacity = String(ss(f.enter + 0.03, f.enter + 0.07, p) * (1 - ss(f.enter + 0.18, f.enter + 0.24, p)));
    });

    // Coomy hammers each part in (crooked), the couple straightens it,
    // then the crew upgrades it: engine glow, hull panels, finale wings
    rocketMat.opacity = ss(0.1, 0.18, p) * (1 - ss(0.93, 0.99, p));
    parts.forEach((pt, i) => {
      const q = ss(0.12 + i * 0.04, 0.2 + i * 0.04, p);
      pt.obj.position.lerpVectors(pt.from, pt.home, q);
      pt.obj.rotation.z = pt.rot * (1 - q);
      const snap = 0.2 + i * 0.04;
      const sq = ss(snap - 0.012, snap + 0.015, p) * (1 - ss(snap + 0.015, snap + 0.04, p));
      const sp = sparks[i];
      sp.material.opacity = sq * 0.9;
      if (sq > 0.01) {
        tmpV.copy(pt.home).applyMatrix4(rocket.matrixWorld);
        sp.position.copy(tmpV);
        sp.scale.setScalar(0.3 + sq * 0.5);
      }
    });
    const scaleR = kf(p, [[0.36, 1], [0.5, 1.12], [0.72, 1.12], [0.77, 1.32]]);
    rocket.scale.setScalar(scaleR);
    // the trio's engine light warms up, Richard's panel lines appear
    engineGlow.position.set(rocket.position.x, rocket.position.y - 0.75 * scaleR, 0.25);
    engineGlow.material.opacity = ss(0.58, 0.68, p) * (1 - ss(0.8, 0.84, p)) * (0.45 + 0.35 * Math.abs(Math.sin(t * 6)));
    panelMat.opacity = ss(0.62, 0.7, p) * (1 - ss(0.93, 0.98, p));
    wings.scale.setScalar(Math.max(0.001, ignite));
    halo.scale.setScalar(Math.max(0.001, ignite));
    flame.visible = launch > 0.02;
    if (flame.visible) flame.scale.y = 0.8 + Math.abs(Math.sin(t * 9)) * 0.5 + launch;
    rocket.position.y = -1.1 + launch * launch * 10;
    rocket.position.x = Math.sin(t * 30) * 0.02 * Math.sin(launch * Math.PI);
    rocket.rotation.z = 0.13 * ss(0.14, 0.22, p) * (1 - pushQ) + Math.sin(t * 0.8) * 0.015;

    // the wordmark lights up over the ship they built together
    if (sfEl) {
      tmpV.copy(rocket.position); tmpV.y += 1.7 * scaleR; tmpV.project(camera);
      sfEl.style.transform = `translate(-50%, -100%) translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h}px)`;
      sfEl.style.opacity = String(ignite * (1 - ss(0.92, 0.96, p)));
    }

    // SUM rises from the east on a sunrise arc, face upright
    const sunQ = ss(0.83, 0.92, p);
    const sunA = lerp(-0.4, 1.25, sunQ);
    sun.position.x = 3.4 * Math.cos(sunA);
    sun.position.y = -2.2 + 3.4 * Math.sin(sunA);
    sunRays.rotation.z = t * 0.05;
    sunMat.opacity = sunQ;
    sunGlowIn.material.opacity = sunQ * (0.4 + 0.08 * Math.sin(t * 1.1));
    sunGlowOut.material.opacity = sunQ * 0.18;
    if (sunQ > 0.01) {
      tmpV.copy(sun.position); tmpV.y += 1.25; tmpV.project(camera);
      sunTag.style.transform = `translate(-50%, -100%) translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h}px)`;
      sunTag.style.opacity = String(ss(0.87, 0.91, p) * (1 - ss(0.96, 0.99, p)));
    } else {
      sunTag.style.opacity = '0';
    }

    // the desk scene
    deskMat.opacity = deskQ;
    desk.position.y = lerp(-2.6, -0.75, deskQ);
    steam.forEach((sm) => {
      const u = ((t * 0.25 + sm.phase) % 1);
      sm.p.position.set(sm.mx + Math.sin(u * 6 + sm.phase) * 0.08, 0.34 + u * 0.7, 0.1);
      sm.p.material.opacity = deskQ * Math.sin(u * Math.PI) * 0.5;
    });
    const hu = (t * 0.16) % 1;
    heart.position.set(Math.sin(hu * 5) * 0.06, 0.55 + hu * 0.75, 0.2);
    heart.scale.setScalar(0.8 + hu * 0.3);
    heartMat.opacity = deskQ * Math.sin(hu * Math.PI) * 0.85;
    captionEl.style.opacity = String(ss(0.92, 0.98, p));

    // camera: gentle push-in over the whole piece
    camera.position.z = (10 - p * 1.6) * Math.max(1, 3.5 / (0.4663 * camera.aspect) / 10);
    camera.position.y = Math.sin(t * 0.3) * 0.08;
    camera.lookAt(0, -0.2, 0);
  }

  function render() {
    const t = clock.getElapsedTime();
    Psm += (P - Psm) * 0.12;

    // drive the auto-glide
    if (autoScroll) {
      const u = Math.min(1, (performance.now() - autoScroll.t0) / autoScroll.dur);
      const e = 1 - Math.pow(1 - u, 3);
      scrollTo(0, lerp(autoScroll.from, autoScroll.to, e));
      if (u >= 1) autoScroll = null;
    }

    // stall watch: any pause mid-film → the film plays itself to the next
    // beat, and after the desk it carries the visitor into the log list
    if (Psm > 0.93) track('life_film_complete');
    const nowY = scrollY;
    if (Math.abs(nowY - lastYs) > 2) { lastYs = nowY; lastMoveTs = t; }
    if (!autoScroll && P > 0.005 && t - lastMoveTs > 1.5) {
      const next = P < 0.94 ? LIFE_CHAPTERS.find((c) => c > P + 0.01) : null;
      if (next) {
        lastMoveTs = t;
        glideTo(pToY(next), 3200);
      } else if (listEl && !logsSeen) {
        // keep offering the ride to the logs until they actually arrive
        lastMoveTs = t;
        glideTo(listEl.offsetTop - 60, 2800);
      }
    }

    update(Psm, t);
    if (soundOn) {
      CUES.forEach((c) => {
        if (!c.fired && Psm > c.at) { c.fired = true; c.fn(); }
        if (c.fired && Psm < c.at - 0.06) c.fired = false;
      });
    }
    renderer.render(scene, camera);
  }

  const tick = () => { requestAnimationFrame(tick); render(); };
  tick();

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    readScroll();
  });
}

/* Synthesized workshop sound — no audio files, warm and small. */
function makeLifeSound() {
  let ctx = null, master, noiseBuf;

  const ensure = () => {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // a soft warm bed: filtered noise + a low drone
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const wn = Math.random() * 2 - 1; last = (last + 0.02 * wn) / 1.02; d[i] = last * 3.2; }
    noiseBuf = buf;
    const noise = ctx.createBufferSource();
    noise.buffer = buf; noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass'; nf.frequency.value = 240;
    const ng = ctx.createGain(); ng.gain.value = 0.035;
    noise.connect(nf); nf.connect(ng); ng.connect(master); noise.start();
    const drone = ctx.createOscillator();
    drone.frequency.value = 65;
    const dg = ctx.createGain(); dg.gain.value = 0.012;
    drone.connect(dg); dg.connect(master); drone.start();
  };

  // fairy bells: tiny random chimes drifting across the stereo field
  let twinkleTimer = null;
  const twinkle = () => {
    if (!ctx) return;
    const notes = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093];
    const n = notes[Math.floor(Math.random() * notes.length)];
    const now = ctx.currentTime;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = (Math.random() * 2 - 1) * 0.7; pan.connect(master); }
    const out = pan || master;
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = n;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.02 + Math.random() * 0.012, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    o.connect(g); g.connect(out);
    o.start(now); o.stop(now + 1.8);
    if (Math.random() < 0.35) {
      // a second, higher fairy answers
      const o2 = ctx.createOscillator();
      o2.type = 'sine'; o2.frequency.value = n * 1.5;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0, now + 0.18);
      g2.gain.linearRampToValueAtTime(0.013, now + 0.21);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      o2.connect(g2); g2.connect(out);
      o2.start(now + 0.18); o2.stop(now + 1.6);
    }
  };
  const scheduleTwinkle = () => {
    twinkleTimer = setTimeout(() => { twinkle(); scheduleTwinkle(); }, 1800 + Math.random() * 3200);
  };

  const blip = (f, delay = 0, dur = 0.18, type = 'triangle', vol = 0.09) => {
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = f;
    const g = ctx.createGain();
    const now = ctx.currentTime + delay;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(master);
    o.start(now); o.stop(now + dur + 0.05);
  };

  return {
    start() {
      ensure(); ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
      clearTimeout(twinkleTimer);
      scheduleTwinkle();
    },
    stop() {
      if (ctx) master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      clearTimeout(twinkleTimer);
    },
    pop(i) { blip(620 + i * 75, 0, 0.14, 'sine', 0.08); blip((620 + i * 75) * 1.5, 0.05, 0.12, 'sine', 0.05); },
    tap() { blip(190, 0, 0.07, 'square', 0.05); blip(340, 0.015, 0.05, 'square', 0.03); },
    thunk() { blip(150, 0, 0.22, 'triangle', 0.1); blip(225, 0.08, 0.2, 'triangle', 0.07); },
    hello(i) {
      const roots = [523, 587, 659, 698, 784];
      blip(roots[i], 0, 0.18, 'triangle', 0.08);
      blip(roots[i] * 1.25, 0.1, 0.24, 'triangle', 0.06);
    },
    engine() {
      // a soft warm purr, not a buzz: two detuned triangles through a lowpass
      if (!ctx) return;
      const now = ctx.currentTime;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.028, now + 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 3);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 160;
      lp.connect(g); g.connect(master);
      [55, 55.8].forEach((f) => {
        const o = ctx.createOscillator();
        o.type = 'triangle'; o.frequency.value = f;
        o.connect(lp);
        o.start(now); o.stop(now + 3.2);
      });
    },
    ignite() {
      [262, 330, 392, 523].forEach((f, k) => blip(f * 2, k * 0.06, 1.4, 'sine', 0.04));
      for (let k = 0; k < 5; k++) blip(1200 + Math.random() * 1200, 0.3 + k * 0.16, 0.25, 'sine', 0.03);
    },
    whoosh() {
      // an airy shhh instead of a siren sweep
      if (!ctx || !noiseBuf) return;
      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(240, now);
      bp.frequency.exponentialRampToValueAtTime(1300, now + 1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.07, now + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
      src.connect(bp); bp.connect(g); g.connect(master);
      src.start(now); src.stop(now + 1.4);
    },
    sunrise() {
      if (!ctx) return;
      [131, 165, 196, 262].forEach((f) => {
        const o = ctx.createOscillator();
        o.type = 'sine'; o.frequency.value = f;
        const g = ctx.createGain();
        const now = ctx.currentTime;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.035, now + 1.6);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 4);
        o.connect(g); g.connect(master);
        o.start(now); o.stop(now + 4.2);
      });
    },
    clink() { blip(1560, 0, 0.12, 'sine', 0.05); blip(1710, 0.22, 0.14, 'sine', 0.045); blip(392, 0.4, 0.9, 'sine', 0.03); blip(494, 0.46, 0.9, 'sine', 0.025); },
  };
}
