// 留下來的光——3D 群島短片（specs/006-light-film）
// 角色與造型沿用 AllWill 官網（specformula.github.io/allwill）：Coomy、水球、船員、Agent 寵物、AllWill 號。
// 每一段劇情是一座島；畫面全由捲動進度 P 決定（可 seek），環境動態（海浪、眨眼、燭火）另用時間 t。
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const docEl = document.documentElement;
if (!docEl.classList.contains('ab-static')) boot();

function boot() {
// ───────────── 數學 ─────────────
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const EIO = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const seg = (a, b, x) => EIO((x - a) / (b - a));
const lin = (a, b, x) => clamp01((x - a) / (b - a));
const backOut = (t) => { t = clamp01(t); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const win = (a, b, x) => x >= a && x < b;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
let seed = 20261029;
const rand = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const MOBILE = matchMedia('(max-width: 640px)').matches || matchMedia('(pointer: coarse)').matches;

// ───────────── 節拍表 ─────────────
const DWELL = [2.3, 2.4, 2.5, 2.5, 2.7, 2.7, 2.5, 2.8, 2.2, 3.0];
const TOTAL = DWELL.reduce((a, b) => a + b, 0);
const BEATS = [];
{ let acc = 0; DWELL.forEach((d) => { BEATS.push({ s: acc / TOTAL, len: d / TOTAL }); acc += d; }); }
const LAST = BEATS.length - 1;
const TRAVEL = 0.13; // 每段開頭這一截是鏡頭從上一座島飛過來

// 每一段是一個里程碑；第 10 段是這個部落格的開張
const TXT = [
  { chip: '里程碑 01 · 深夜', c: '#ffd36b', big: '深夜，一個問題', small: '那些年，每個專案都從一張白紙開始：做完、交出去，下一次又從頭摸索。我一直在問——下一次，能不能不用從頭開始？' },
  { chip: '里程碑 02 · FRONTEND TECH LEAD', c: '#4f8fe0', big: '介面，是人與系統相遇處', small: '我在外商當 Frontend Tech Lead。後面的系統再複雜，人看得到的只有畫面；複雜系統要在介面上，才真正被人理解。' },
  { chip: '里程碑 03 · AUTOMATION TEAM', c: '#14b89c', big: '人和 AI，同一支隊伍', small: '後來我帶 Automation Team。人決定方向，Agent 接手跑——人和 AI 並肩，一個產品，一兩天就跑起來。' },
  { chip: '里程碑 04 · 離開', c: '#ff9a6a', big: '還沒來得及', small: '我剛開始懂怎麼讓它可以重複，還沒真正導入團隊，就離開了。那本做到一半的方法，留在了桌上。' },
  { chip: '里程碑 05 · 領導', c: '#8a7ae0', big: '我說一步，你做一步', small: '以前我習慣把每一步都指好。後來我才懂，好的領導不是替人判斷，是讓更多人能自己判斷——把燈交出去。' },
  { chip: '里程碑 06 · 水球 × Coomy', c: '#3aa8e0', big: '兩個人，一艘火箭', small: '水球一顆一顆冒出點子，我照著藍圖，把火箭一件一件敲出來。兩個人，就這樣把第一艘火箭送上了天。' },
  { chip: '里程碑 07 · 每一年', c: '#ff4f86', big: '每一年，都一起過', small: '燈暗了，蛋糕推進來。再忙，這一刻都要留著。未來每一年，我們都一起過。' },
  { chip: '里程碑 08 · ALLWILL', c: '#14b89c', big: '船上，有了更多人', small: '後來它不再是誰的火箭了。船上有了 Richard、Raymond、ben、ccza，還有一起出航的 Agent——是我們一起打造的 AllWill。' },
  { chip: '里程碑 09 · 回望', c: '#ffd36b', big: '把做過的事留下來', small: '回頭看，走過的每一座島都還亮著。做過的事留下來，下一次就不用從頭開始。' },
  { chip: '里程碑 10 · 開張', c: '#e0503c', big: '下一站，矽谷', small: '2027 年 3 月，我們要去矽谷創業。這一篇是開張——接下來，這個部落格會記錄我們在矽谷的每一天。' },
];

// ───────────── 渲染器 ─────────────
const host = document.getElementById('ab-canvas');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
host.appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer({ element: document.getElementById('ab-labels') });

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#1d3557', 60, 200);
const camera = new THREE.PerspectiveCamera(30, 1, 0.3, 1400);

const hemi = new THREE.HemisphereLight('#cfe8f5', '#7a6a55', 0.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffe2b8', 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 220 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

const skyU = { top: { value: new THREE.Color('#0b1a33') }, horizon: { value: new THREE.Color('#1d3557') } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 2.4, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.65)), 1.0);\n#include <colorspace_fragment>\n}',
}));
sky.renderOrder = -2;
scene.add(sky);

// 星空與月亮跟著鏡頭走（天幕）
const starGeo = new THREE.BufferGeometry();
{
  const a = [];
  for (let i = 0; i < 900; i++) {
    const th = rand() * Math.PI * 2, y = 0.06 + Math.pow(rand(), 0.8) * 0.94, r = Math.sqrt(1 - y * y);
    a.push(Math.cos(th) * r * 800, y * 800, Math.sin(th) * r * 800);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
}
const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
const stars = new THREE.Points(starGeo, starMat);
stars.renderOrder = -1;
scene.add(stars);

const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(255,255,255,.6)'); g.addColorStop(0.55, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const glow = (color, size, opacity = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.setScalar(size);
  return s;
};
const moon = new THREE.Group();
{
  const disc = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: '#fff6dc', fog: false, transparent: true }));
  const halo = glow('#cfe0ff', 110, 0.5);
  moon.add(halo, disc);
  moon.userData = { disc, halo };
  scene.add(moon);
}

// 海
const SEA_C = V(60, 0, 30);
const seaGeo = new THREE.PlaneGeometry(1600, 1600, MOBILE ? 70 : 120, MOBILE ? 70 : 120);
seaGeo.rotateX(-Math.PI / 2);
const seaBase = seaGeo.attributes.position.array.slice();
const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ color: '#3e9fc8', roughness: 0.3, metalness: 0.05, flatShading: true }));
sea.position.copy(SEA_C);
sea.receiveShadow = true;
scene.add(sea);
function waveSea(t) {
  const p = seaGeo.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) {
    const x = seaBase[i], z = seaBase[i + 2];
    p[i + 1] = Math.sin(x * 0.11 + t * 0.9) * 0.22 + Math.cos(z * 0.13 + t * 0.7) * 0.2 - 0.15;
  }
  seaGeo.attributes.position.needsUpdate = true;
  seaGeo.computeVertexNormals();
}

// ───────────── 材質 ─────────────
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
const sh = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
const M = {
  wall: mat('#f6efe3', { roughness: 0.9 }), wall2: mat('#efe3cf', { roughness: 0.9 }),
  roof: mat('#c0634a', { roughness: 0.7, flatShading: true }), roof2: mat('#5f6e7d', { roughness: 0.7, flatShading: true }),
  trim: mat('#5a4a3c'), wood: mat('#9a6d48', { roughness: 0.9 }), wood2: mat('#c99a6b'),
  stone: mat('#cfc6b6', { roughness: 1, flatShading: true }), rock: mat('#6b5d4f', { roughness: 1, flatShading: true }),
  sand: mat('#ead6aa', { roughness: 1 }), grass: mat('#6aa356', { roughness: 0.95, flatShading: true }),
  leaf: ['#5f9e4f', '#4f8d48', '#79ad55'].map((c) => mat(c, { roughness: 0.9, flatShading: true })),
  pine: mat('#3f7a4a', { roughness: 0.9, flatShading: true }), trunk: mat('#7a5136'),
  metal: mat('#5b636d', { roughness: 0.5, metalness: 0.4 }), dark: mat('#2b3340', { roughness: 0.6 }),
};
const EYE = new THREE.MeshBasicMaterial({ color: '#1d2433' });
const WHITE = new THREE.MeshBasicMaterial({ color: '#ffffff' });
const PINK = new THREE.MeshBasicMaterial({ color: '#ff9fb8', transparent: true, opacity: 0.8 });
// 夜裡才亮的東西：窗、路燈（亮度跟著天色）
const nightLit = [];
const nightMat = (color, base = 1.2) => { const m = mat(color, { emissive: color, emissiveIntensity: base, roughness: 0.5 }); nightLit.push({ m, base }); return m; };
const em = (c, i = 1.3) => mat(c, { emissive: c, emissiveIntensity: i, roughness: 0.4 });

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const api = { c, ctx, tex, key: null, draw(fn, key) { if (key !== undefined && key === api.key) return; api.key = key; fn(ctx, w, h); tex.needsUpdate = true; } };
  if (draw) api.draw(draw);
  return api;
}
const FONT = '"Noto Sans TC", "PingFang TC", system-ui, sans-serif';

// ───────────── 名牌與泡泡（CSS2D） ─────────────
const LABELS = [];
function label(parent, html, cls, pos) {
  // 外層給 CSS2DRenderer 定位，內層才做淡入與彈跳
  const wrap = document.createElement('div');
  const el = document.createElement('div');
  el.className = cls;
  el.innerHTML = html;
  wrap.appendChild(el);
  const o = new CSS2DObject(wrap);
  o.position.copy(pos);
  parent.add(o);
  const L = { o, el, want: false, show(on = true) { if (on) L.want = true; return L; } };
  LABELS.push(L);
  return L;
}
const tag = (parent, text, color, y) => label(parent, text, 'ab-tag', V(0, y, 0)).el.style.background = color;
const say = (parent, text, y, cls = '') => label(parent, text, `ab-say ${cls}`, V(0, y, 0));

// ───────────── 場景零件 ─────────────
const TOP = 0.85;
const ISL = [];
function island(cx, cz, r, opts = {}) {
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  const skirt = sh(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 1.12, 2.4, 26), M.rock)); skirt.position.y = -0.55;
  const sand = sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.01, 0.32, 40), M.sand)); sand.position.y = 0.54;
  const grass = sh(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r * 0.92, 0.3, 40), opts.grass ? mat(opts.grass, { flatShading: true }) : M.grass)); grass.position.y = 0.7;
  const foam = new THREE.Mesh(new THREE.RingGeometry(r * 1.06, r * 1.3, 48), new THREE.MeshBasicMaterial({ color: '#e8f6fb', transparent: true, opacity: 0.32, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2; foam.position.y = 0.12;
  g.add(skirt, sand, grass, foam);
  // 島邊的小花、草叢、石頭
  const flowerC = ['#ffd36b', '#ff9fb8', '#ffffff', '#c9a7ff'];
  for (let i = 0; i < Math.round(r * 2.6); i++) {
    const a = rand() * Math.PI * 2, rr = r * (0.62 + rand() * 0.22);
    const k = rand();
    let m;
    if (k < 0.45) { m = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 5), M.leaf[i % 3]); m.position.y = TOP + 0.2; }
    else if (k < 0.8) { m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), mat(flowerC[i % 4])); m.position.y = TOP + 0.1; }
    else { m = sh(new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + rand() * 0.2, 0), M.stone)); m.position.y = TOP + 0.08; }
    m.position.x = Math.cos(a) * rr; m.position.z = Math.sin(a) * rr;
    if (opts.clear && opts.clear.some(([x, z, d]) => Math.hypot(m.position.x - x, m.position.z - z) < d)) continue;
    g.add(m);
  }
  scene.add(g);
  const I = { g, c: V(cx, 0, cz), r };
  ISL.push(I);
  return I;
}
const put = (g, o, x, z, y = TOP, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o; };

function tree(kind = 'round', s = 1) {
  const g = new THREE.Group();
  if (kind === 'palm') {
    for (let i = 0; i < 6; i++) {
      const sgm = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.13 - i * 0.01, 0.15 - i * 0.01, 0.6, 7), M.trunk));
      sgm.position.set(i * i * 0.025, 0.3 + i * 0.56, 0); sgm.rotation.z = -i * 0.05; g.add(sgm);
    }
    for (let i = 0; i < 6; i++) {
      const lf = sh(new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.9, 4), M.leaf[i % 3]));
      const a = (i / 6) * Math.PI * 2;
      lf.position.set(0.62 + Math.cos(a) * 0.75, 3.35, Math.sin(a) * 0.75);
      lf.rotation.set(Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25 - 0.1);
      lf.scale.z = 0.3; g.add(lf);
    }
  } else if (kind === 'pine') {
    const tr = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 6), M.trunk)); tr.position.y = 0.4; g.add(tr);
    [[1.1, 1.6, 1.2], [0.85, 1.3, 2.0], [0.6, 1.0, 2.7]].forEach(([r, h, y]) => { const c = sh(new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), M.pine)); c.position.y = y; g.add(c); });
  } else {
    const tr = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.3, 7), M.trunk)); tr.position.y = 0.65; g.add(tr);
    [[0.95, 0, 1.9, 0], [0.7, 0.5, 1.6, 0.2], [0.65, -0.45, 1.75, -0.2], [0.6, 0.05, 2.5, 0.1]].forEach(([r, x, y, z], i) => {
      const b = sh(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), M.leaf[i % 3])); b.position.set(x, y, z); g.add(b);
    });
  }
  g.scale.setScalar(s);
  return g;
}
function house(w, d, h, { roof = M.roof, wall = M.wall, lit = '#ffd89a', door = '#7a5136' } = {}) {
  const g = new THREE.Group();
  const body = sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall)); body.position.y = h / 2; g.add(body);
  const rf = sh(new THREE.Mesh(new THREE.CylinderGeometry(d * 0.62, d * 0.62, w + 0.4, 3), roof));
  rf.rotation.z = Math.PI / 2; rf.rotation.x = Math.PI / 2 + Math.PI / 6; rf.scale.set(1, 1, 0.62); rf.position.y = h + d * 0.18; g.add(rf);
  const dr = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.25, 0.06), mat(door)); dr.position.set(-w * 0.22, 0.63, d / 2 + 0.02); g.add(dr);
  const winM = nightMat(lit, 1.1);
  const wins = [];
  [[w * 0.18, h * 0.55], [w * 0.36, h * 0.55]].forEach(([x, y]) => {
    const wi = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.6), winM); wi.position.set(x, y, d / 2 + 0.03); g.add(wi); wins.push(wi);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.08), M.trim); fr.position.set(x, y - 0.34, d / 2 + 0.05); g.add(fr);
  });
  const chim = sh(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.4), M.stone)); chim.position.set(w * 0.3, h + 0.6, -d * 0.15); g.add(chim);
  g.userData = { winM };
  return g;
}
function lamp(h = 2.6) {
  const g = new THREE.Group();
  const pole = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, h, 6), M.dark)); pole.position.y = h / 2; g.add(pole);
  const bulbM = em('#fff1c4', 1.6);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), bulbM); bulb.position.y = h + 0.1; g.add(bulb);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.24, 8), M.dark); cap.position.y = h + 0.34; g.add(cap);
  const halo = glow('#ffd36b', 2.6, 0.7); halo.position.y = h + 0.1; g.add(halo);
  g.userData = { bulbM, halo, set(k) { bulbM.emissiveIntensity = 0.05 + 1.6 * k; bulbM.color.set(k > 0.5 ? '#fff1c4' : '#8a8578'); halo.material.opacity = 0.75 * k; } };
  return g;
}
// 島上的燈標：這一段走完就亮，片尾連成航線
const BEACONS = [];
function beacon(I, x, z) {
  const g = lamp(3.4);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 6, 20), em('#ffd36b', 1.4)); ring.rotation.x = Math.PI / 2; ring.position.y = 3.5; g.add(ring);
  put(I.g, g, x, z);
  const B = { g, I, ring, k: 0, world: I.c.clone().add(V(x, TOP + 3.5, z)) };
  BEACONS.push(B);
  return B;
}

function burst(parent, color, n = 10, spread = 1, size = 0.45) {
  const g = new THREE.Group(); parent.add(g); g.visible = false;
  const ps = [];
  for (let i = 0; i < n; i++) {
    const s = glow(color, size); const a = rand() * Math.PI * 2;
    s.userData.v = V(Math.cos(a) * spread * (0.5 + rand()), 1.6 + rand() * 2.2, Math.sin(a) * spread * (0.5 + rand()));
    g.add(s); ps.push(s);
  }
  return {
    g,
    set(age) {
      g.visible = age > 0 && age < 1;
      if (!g.visible) return;
      ps.forEach((s) => { const v = s.userData.v; s.position.set(v.x * age, v.y * age - 2.4 * age * age, v.z * age); s.material.opacity = 1 - age; });
    },
  };
}

// 沿折線走：回傳位置、方向、走過距離
function along(pts, t) {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const d = clamp01(t) * L[L.length - 1];
  let i = 1; while (i < pts.length - 1 && L[i] < d) i++;
  const f = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
  const a = pts[i - 1], b = pts[i];
  return { x: lerp(a[0], b[0], f), z: lerp(a[1], b[1], f), dx: b[0] - a[0], dz: b[1] - a[1], dist: d };
}
function walk(A, pts, t, y = TOP, amp = 0.7) {
  const r = along(pts, t);
  A.g.position.set(r.x, y, r.z);
  const moving = t > 0 && t < 1;
  if (moving) A.g.rotation.y = Math.atan2(r.dx, r.dz);
  const ph = r.dist * 2.6;
  A.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(ph + i * Math.PI) * amp : 0; });
  if (A.swing) A.swing.forEach((a, i) => { a.rotation.x = moving ? -Math.sin(ph + i * Math.PI) * amp * 0.6 : 0; });
  return moving;
}
const angTo = (from, x, z) => Math.atan2(x - from.x, z - from.z);
const lerpAng = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
function arcPos(a, b, t, h) { return V(lerp(a.x, b.x, t), lerp(a.y, b.y, t) + Math.sin(Math.PI * clamp01(t)) * h, lerp(a.z, b.z, t)); }

// ───────────── 角色（造型取自 AllWill 官網） ─────────────
function makeCoomy() {
  const g = new THREE.Group();
  const skinM = mat('#f7d4ba'), hairM = mat('#e8c15a', { roughness: 0.55 }), dressM = mat('#f39ab6', { roughness: 0.7 });
  const dress = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.32, 0.55, 16), dressM)); dress.position.y = 0.62;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 8, 20), mat('#ffffff')); collar.rotation.x = Math.PI / 2; collar.position.y = 0.9;
  g.add(dress, collar);
  const headG = new THREE.Group(); headG.position.y = 0.92; g.add(headG);
  const add = (m, x, y, z) => { m.position.set(x, y - 0.92, z); headG.add(m); return m; };
  add(sh(new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 16), skinM)), 0, 1.15, 0);
  add(sh(new THREE.Mesh(new THREE.SphereGeometry(0.285, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM)), 0, 1.17, 0).rotation.x = -0.35;
  add(sh(new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), hairM)), 0, 1.53, -0.04);
  add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16), mat('#ff4f86')), 0, 1.39, -0.03).rotation.x = Math.PI / 2;
  for (const x of [-0.1, 0.1]) {
    add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), EYE), x, 1.14, 0.245).scale.set(1, 1.3, 0.6);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), WHITE), x + 0.015, 1.17, 0.272);
    add(new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), PINK), x * 1.6, 1.07, 0.235).rotation.y = x * 2.2;
  }
  add(new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI), EYE), 0, 1.07, 0.26).rotation.z = Math.PI;
  const legs = [];
  for (const x of [-0.1, 0.1]) {
    const legG = new THREE.Group(); legG.position.set(x * 0.8, 0.38, 0);
    const leg = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.26, 3, 6), skinM)); leg.position.y = -0.16;
    const shoe = sh(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat('#8c4a5a'))); shoe.scale.set(1, 0.6, 1.4); shoe.position.set(0, -0.33, 0.03);
    legG.add(leg, shoe); g.add(legG); legs.push(legG);
  }
  const arm = (x) => {
    const a = new THREE.Group();
    const m = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.24, 3, 6), skinM)); m.position.y = -0.16;
    const h = sh(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skinM)); h.position.y = -0.34;
    a.add(m, h); a.position.set(x, 0.86, 0); a.rotation.z = x < 0 ? -0.2 : 0.2; g.add(a);
    const hand = new THREE.Object3D(); hand.position.y = -0.36; a.add(hand); a.userData.hand = hand;
    return a;
  };
  const armL = arm(-0.2), armR = arm(0.2);
  g.scale.setScalar(2.2);
  return { g, headG, legs, armL, armR, swing: [armL, armR], H: 1.75 };
}
function makeWater() {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const blue = new THREE.MeshStandardMaterial({ color: '#7fd6ff', emissive: '#3aa8e0', emissiveIntensity: 0.3, roughness: 0.3 });
  const ball = sh(new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 24), blue)); ball.scale.set(1, 1.08, 1); ball.position.y = 0.8;
  const neck = sh(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 14), blue)); neck.position.y = 1.65; neck.rotation.x = Math.PI;
  const knot = sh(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.05, 8, 16), blue)); knot.position.y = 1.82;
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75 }));
  shine.scale.set(1, 1.6, 0.4); shine.position.set(-0.36, 1.12, 0.55);
  body.add(ball, neck, knot, shine);
  for (const x of [-0.22, 0.22]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), EYE); eye.scale.set(1, 1.15, 0.6); eye.position.set(x, 0.82, 0.69);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), WHITE); hi.position.set(x + 0.04, 0.88, 0.77);
    const hi2 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), WHITE); hi2.position.set(x - 0.04, 0.77, 0.77);
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), PINK); blush.position.set(x * 1.75, 0.66, 0.64); blush.rotation.y = x * 1.6;
    body.add(eye, hi, hi2, blush);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 6, 16, Math.PI), EYE); smile.position.set(0, 0.66, 0.74); smile.rotation.z = Math.PI;
  body.add(smile);
  g.scale.setScalar(1.55);
  return { g, body, legs: [], H: 2 };
}
const SKINS = ['#f5d2b6', '#eac0a0', '#f8dcc4', '#d9a882'];
function makeMate({ shirt = '#5fa0d0', hair = 'plain', glasses = false, skin = SKINS[0], hairC = '#33261f', pants = '#3a4152' } = {}) {
  const g = new THREE.Group();
  const skinM = mat(skin), hairM = mat(hair === 'curly' ? '#2a221f' : hairC, { roughness: 0.6 });
  const body = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.3, 4, 10), mat(shirt))); body.position.y = 0.68; g.add(body);
  const headG = new THREE.Group(); headG.position.y = 0.9; g.add(headG);
  const add = (m, x, y, z) => { m.position.set(x, y - 0.9, z); headG.add(m); return m; };
  add(sh(new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 16), skinM)), 0, 1.15, 0);
  const cap = (theta, tilt = -0.3) => { const m = add(sh(new THREE.Mesh(new THREE.SphereGeometry(0.275, 20, 14, 0, Math.PI * 2, 0, theta), hairM)), 0, 1.16, 0); m.rotation.x = tilt; return m; };
  if (hair === 'bowl') cap(Math.PI * 0.44, 0).scale.set(1.08, 1.02, 1.08);
  else if (hair === 'side') {
    cap(Math.PI * 0.5);
    const back = add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.32, 0.5, 18, 1, true, Math.PI / 2, Math.PI), hairM)), 0, 1.02, 0);
    back.material = hairM.clone(); back.material.side = THREE.DoubleSide;
    const bang = add(sh(new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), hairM)), 0.08, 1.29, 0.17); bang.scale.set(1.25, 0.45, 0.55); bang.rotation.z = 0.45;
  } else if (hair === 'curly') {
    cap(Math.PI * 0.5, -0.15);
    for (let i = 0; i < 30; i++) {
      const phi = Math.acos(1 - rand() * 0.95), th = rand() * Math.PI * 2;
      const x = Math.sin(phi) * Math.cos(th) * 0.29, y = 1.16 + Math.cos(phi) * 0.29, z = Math.sin(phi) * Math.sin(th) * 0.29 - 0.02;
      if (z > 0.12 && y < 1.3) continue;
      add(sh(new THREE.Mesh(new THREE.SphereGeometry(0.075 + rand() * 0.02, 8, 6), hairM)), x, y, z);
    }
  } else if (hair === 'pony') {
    cap(Math.PI * 0.52);
    const tail = add(sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 3, 8), hairM)), 0, 1.12, -0.3); tail.rotation.x = 0.5;
  } else {
    cap(Math.PI * 0.52);
    add(sh(new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), hairM)), 0, 1.3, 0.17).scale.set(1.2, 0.4, 0.5);
  }
  for (const x of [-0.09, 0.09]) {
    add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), EYE), x, 1.13, 0.24).scale.set(1, 1.25, 0.6);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), WHITE), x + 0.014, 1.16, 0.268);
  }
  add(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.011, 6, 12, Math.PI), EYE), 0, 1.05, 0.25).rotation.z = Math.PI;
  if (glasses) {
    const gm = mat('#2b2f3a', { roughness: 0.4 });
    for (const x of [-0.095, 0.095]) add(new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.012, 6, 18), gm), x, 1.13, 0.26);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.014), gm), 0, 1.14, 0.27);
  }
  const legs = [], arms = [];
  for (const x of [-0.09, 0.09]) {
    const leg = new THREE.Group();
    const m = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.26, 3, 6), mat(pants))); m.position.y = -0.18;
    leg.add(m); leg.position.set(x, 0.42, 0); legs.push(leg); g.add(leg);
    const arm = new THREE.Group();
    const a = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.22, 3, 6), body.material)); a.position.y = -0.15;
    const h = sh(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skinM)); h.position.y = -0.32;
    arm.add(a, h); arm.position.set(x * 2.6, 0.9, 0); arm.rotation.z = x < 0 ? -0.15 : 0.15; arms.push(arm); g.add(arm);
    const hand = new THREE.Object3D(); hand.position.y = -0.34; arm.add(hand); arm.userData.hand = hand;
  }
  g.scale.setScalar(2.3);
  return { g, headG, legs, arms, swing: arms, H: 1.7 };
}
function makePet(accent) {
  const g = new THREE.Group();
  const shell = mat('#eef3f6', { roughness: 0.35 }), acc = mat(accent, { roughness: 0.5 });
  const body = sh(new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), shell)); body.scale.set(1, 0.72, 1.25); body.position.y = 0.42;
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 6, 24), acc); stripe.position.y = 0.42; stripe.rotation.x = Math.PI / 2; stripe.scale.set(1, 1.25, 1);
  const headG = new THREE.Group(); headG.position.set(0, 0.72, 0.3);
  const head = sh(new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 14), shell));
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), mat('#1c2a33', { roughness: 0.2 })); face.scale.set(1, 0.72, 0.45); face.position.set(0, 0, 0.14);
  headG.add(head, face);
  const eyeM = new THREE.MeshBasicMaterial({ color: '#8ff5e4' });
  for (const x of [-0.07, 0.07]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeM); eye.scale.set(1, 1.3, 0.5); eye.position.set(x, 0.02, 0.225);
    const ear = sh(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 8), acc)); ear.position.set(x * 1.9, 0.22, -0.03); ear.rotation.z = -x * 2.5;
    headG.add(eye, ear);
  }
  g.add(body, stripe, headG);
  const legs = [];
  for (const [x, z] of [[-0.14, 0.2], [0.14, 0.2], [-0.14, -0.2], [0.14, -0.2]]) {
    const leg = new THREE.Group();
    const m = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 3, 6), mat('#9aa6b2'))); m.position.y = -0.1;
    leg.add(m); leg.position.set(x, 0.24, z); legs.push(leg); g.add(leg);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 5), mat('#9aa6b2')); tail.position.set(0, 0.62, -0.4); tail.rotation.x = -0.6;
  const tipM = mat(accent, { emissive: accent, emissiveIntensity: 0.8 });
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), tipM); tip.position.set(0, 0.74, -0.48);
  g.add(tail, tip);
  g.scale.setScalar(2.1);
  return { g, headG, legs, tipM, eyeM, H: 1.1 };
}
// AllWill 機器人頭（官網洞口那顆，縮小）
function makeRobot() {
  const head = new THREE.Group();
  const shell = mat('#e6edf1', { roughness: 0.45, flatShading: true });
  const skull = sh(new THREE.Mesh(new THREE.SphereGeometry(2.3, 12, 9), shell)); skull.scale.set(1.18, 0.95, 1.0);
  const band = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.13, 6, 28), mat('#14b89c')); band.rotation.x = Math.PI / 2; band.scale.set(1.19, 1.02, 1); band.position.y = -0.35;
  const face = new THREE.Mesh(new THREE.SphereGeometry(1.9, 16, 12), mat('#1c2a33', { roughness: 0.2 })); face.scale.set(1.08, 0.62, 0.42); face.position.set(0, 0.35, 1.72);
  head.add(skull, band, face);
  const eyeM = new THREE.MeshBasicMaterial({ color: '#8ff5e4' });
  const eyes = [-0.75, 0.75].map((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), eyeM); e.scale.set(1, 1.25, 0.4); e.position.set(x, 0.45, 2.45); head.add(e); return e; });
  for (const s of [-1, 1]) { const ear = sh(new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 6), mat('#14b89c', { flatShading: true }))); ear.position.set(s * 1.95, 1.85, 0.2); ear.rotation.z = -s * 0.5; head.add(ear); }
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 6), M.metal); ant.position.set(0, 2.6, 0);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), em('#ffb347', 1.4)); bulb.position.set(0, 3.25, 0);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 0.9), mat('#0d151b', { roughness: 1 })); mouth.position.set(0, -1.2, 1.6);
  const jaw = new THREE.Group(); jaw.position.set(0, -1.6, 0.6);
  const jawM = sh(new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.45, 2.0), shell)); jawM.position.set(0, -0.1, 0.9); jaw.add(jawM);
  head.add(ant, bulb, mouth, jaw);
  return { head, eyes, jaw, bulb };
}

// 全片的光點：從 B1 的筆電游標誕生，之後一直跟在 Coomy 身邊
const ember = new THREE.Group();
{
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ color: '#fff4e0', fog: false }));
  const halo = glow('#ffc070', 2.4, 0.95), halo2 = glow('#ff9a3a', 5.5, 0.35);
  ember.add(halo2, halo, core);
  ember.userData = { halo, halo2 };
  scene.add(ember);
}
const emberLight = new THREE.PointLight('#ffb870', 0, 9, 1.6);
ember.add(emberLight);

// 小船：B4 離開、B5 靠岸共用
const boat = new THREE.Group();
{
  const hull = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.8, 0.7, 12, 1, false, 0, Math.PI), mat('#b5764a')));
  hull.rotation.set(Math.PI / 2, 0, Math.PI / 2); hull.scale.set(1, 2.2, 1); hull.position.y = 0.35;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 6, 20), mat('#7a5136')); rim.rotation.x = Math.PI / 2; rim.scale.set(1, 2.4, 1); rim.position.y = 0.36;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.5), M.wood2); seat.position.set(0, 0.3, 0);
  const lantern = glow('#ffd36b', 1.6, 0.8); lantern.position.set(0, 1.2, -1.9);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 5), M.dark); pole.position.set(0, 0.7, -1.9);
  boat.add(hull, rim, seat, pole, lantern);
  const oars = [-1, 1].map((s) => { const o = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 2.4), M.wood2); m.position.z = -0.4; m.rotation.y = s * 0.2; o.add(m); o.position.set(s * 1.05, 0.5, 0.2); boat.add(o); return o; });
  boat.userData = { oars };
  scene.add(boat);
}

// ───────────── 九段劇情 ─────────────
const SC = [];

// ═════ B1 深夜，一個問題 ═════
{
  const I = island(0, 0, 8.5, { clear: [[1.4, 1.2, 3.4]] });
  const g = I.g;
  const hs = house(5, 4, 3.3); put(g, hs, -2.6, -3.2, TOP, 0.25);
  put(g, tree('round', 1.1), 4.6, -3.6); put(g, tree('pine', 1.0), -6, 1.2); put(g, tree('round', 0.8), 5.6, 2.4);
  const lp = lamp(2.4); put(g, lp, -1.2, 3.4);
  // 屋簷下的小燈串
  for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), nightMat(['#ffd36b', '#ff9fb8', '#8ff5e4'][i % 3], 1.5)); b.position.set(-2.6 - 2.3 + i * 0.58, TOP + 3.0 - Math.sin((i / 8) * Math.PI) * 0.35, -3.2 + 2.15); g.add(b); }
  const deck = sh(new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.14, 3.8), M.wood2)); deck.position.set(1.4, TOP + 0.07, 1.2); g.add(deck);
  // 書桌、椅子、筆電、馬克杯、紙堆
  const desk = new THREE.Group(); desk.position.set(1.4, TOP, 1.85); g.add(desk);
  const top = sh(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 1.2), M.wood)); top.position.y = 1.45; desk.add(top);
  for (const [x, z] of [[-1.2, -0.5], [1.2, -0.5], [-1.2, 0.5], [1.2, 0.5]]) { const l = sh(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.1), M.trim)); l.position.set(x, 0.7, z); desk.add(l); }
  const chair = new THREE.Group(); chair.position.set(1.4, TOP, 0.6); g.add(chair);
  const seat = sh(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.9), M.wood)); seat.position.y = 0.78; chair.add(seat);
  const back = sh(new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 0.1), M.wood)); back.position.set(0, 1.3, -0.45); chair.add(back);
  for (const [x, z] of [[-0.42, -0.38], [0.42, -0.38], [-0.42, 0.38], [0.42, 0.38]]) { const l = sh(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.08), M.trim)); l.position.set(x, 0.39, z); chair.add(l); }
  const lap = new THREE.Group(); lap.position.set(0, 1.5, 0.05); desk.add(lap);
  const base = sh(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.72), mat('#c8ccd2', { metalness: 0.5, roughness: 0.35 }))); lap.add(base);
  const lid = new THREE.Group(); lid.position.set(0, 0.02, 0.36); lid.rotation.x = -0.2; lap.add(lid);
  const lidM = sh(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.74, 0.04), mat('#c8ccd2', { metalness: 0.5, roughness: 0.35 }))); lidM.position.y = 0.37; lid.add(lidM);
  const screenM = em('#bfe3ff', 1.2);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.64), screenM); scr.position.set(0, 0.37, -0.025); scr.rotation.y = Math.PI; lid.add(scr);
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), em('#ffffff', 0.9)); logo.position.set(0, 0.4, 0.025); lid.add(logo);
  const scrGlow = glow('#9cc8ff', 3.2, 0.55); scrGlow.position.set(0, 0.5, -0.3); lid.add(scrGlow);
  const scrLight = new THREE.PointLight('#a8d0ff', 6, 5, 1.5); scrLight.position.set(0, 0.6, -0.6); lid.add(scrLight);
  const mug = new THREE.Group(); mug.position.set(0.95, 1.5, -0.1); desk.add(mug);
  mug.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.28, 12), mat('#ffffff'))));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 12), mat('#ffffff')); handle.position.x = 0.15; mug.add(handle);
  const steam = [0, 1, 2].map(() => { const s = glow('#ffffff', 0.35, 0.3); mug.add(s); return s; });
  for (let i = 0; i < 5; i++) { const p = sh(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.8), mat('#fbf7ee'))); p.position.set(-0.95, 1.52 + i * 0.025, 0.05); p.rotation.y = (rand() - 0.5) * 0.4; desk.add(p); }
  const C = makeCoomy(); put(g, C.g, 1.4, 0.6, TOP + 0.02);
  C.legs.forEach((l) => (l.rotation.x = -1.5));
  // 揉掉的紙團：一次又一次從頭開始
  const balls = [];
  const ballTo = [[-0.6, 2.8], [0.2, -0.4], [2.9, 0.4], [3.3, 2.6], [-0.4, 0.9], [2.4, -0.6], [0.4, 3.2]];
  ballTo.forEach(([x, z]) => { const b = sh(new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), mat('#fbf7ee', { flatShading: true }))); b.visible = false; g.add(b); balls.push({ b, to: V(x, TOP + 0.3, z) }); });
  const s1 = say(C.g, '又要從頭來一次……', 2.05);
  const s2 = say(C.g, '下一次，能不能不用從頭開始？', 2.05, 'big');
  const flies = [];
  for (let i = 0; i < 14; i++) { const f = glow('#e8ff9a', 0.45, 0.8); f.userData = { a: rand() * 6.28, r: 2 + rand() * 6, h: 1 + rand() * 2.5, s: 0.2 + rand() * 0.4 }; g.add(f); flies.push(f); }
  const B = beacon(I, -4.6, 5.4);
  const handW = V(1.4 + 0.5, TOP + 1.9, 1.3);
  SC.push({
    I, B,
    cam: [[0, [30, 22, 52], [0, 1.5, 0]], [0.32, [9, 7.6, 16.5], [1.4, 2.6, 1]], [0.66, [6.2, 5.8, 12.2], [1.4, 3.1, 1]], [1, [3.8, 6, 12.6], [1.5, 3.6, 1]]],
    sky: ['night', 'night'],
    update(q, t) {
      const typing = q < 0.12 || win(0.33, 0.37, q);
      const throwI = Math.floor((q - 0.12) / 0.03);
      C.armL.rotation.set(-1.15 + (typing ? Math.sin(t * 17) * 0.08 : 0), 0, -0.1);
      let ar = -1.15 + (typing ? Math.sin(t * 15 + 1) * 0.08 : 0);
      if (win(0.12, 0.33, q)) { const f = ((q - 0.12) / 0.03) % 1; ar = -1.15 - Math.sin(f * Math.PI) * 1.3; }
      C.armR.rotation.set(ar, 0, 0.1);
      const look = seg(0.36, 0.44, q);
      C.headG.rotation.x = lerp(0.28, -0.32, look) + (throwI >= 0 && q < 0.33 ? -0.08 : 0);
      C.headG.rotation.y = q > 0.44 ? Math.sin(t * 0.6) * 0.06 : 0;
      balls.forEach((B2, k) => {
        const t0 = 0.12 + k * 0.03, f = lin(t0 + 0.012, t0 + 0.03, q);
        B2.b.visible = q > t0 + 0.012;
        const from = g.worldToLocal(handW.clone());
        B2.b.position.copy(arcPos(from, B2.to, EIO(f), 1.2));
        B2.b.rotation.set(f * 5, f * 3, 0);
      });
      s1.show(win(0.15, 0.33, q));
      s2.show(q > 0.4);
      screenM.emissiveIntensity = 1.1 + Math.sin(t * 2) * 0.08;
      steam.forEach((s, i) => { const k = (t * 0.35 + i / 3) % 1; s.position.set(Math.sin(k * 6 + i) * 0.05, 0.2 + k * 0.7, 0); s.material.opacity = 0.3 * (1 - k); });
      flies.forEach((f) => { const u = f.userData, a = u.a + t * u.s; f.position.set(Math.cos(a) * u.r, TOP + u.h + Math.sin(t * 1.3 + u.a) * 0.4, Math.sin(a) * u.r); f.material.opacity = 0.5 + Math.sin(t * 3 + u.a) * 0.4; });
      lp.userData.set(1);
    },
    ember(q, t) {
      if (q < 0.5) return null;
      const from = I.c.clone().add(V(1.4, TOP + 2.1, 2.0));
      const to = I.c.clone().add(V(2.5, TOP + 4.5, 1.2));
      const f = seg(0.5, 0.66, q);
      return { p: arcPos(from, to, f, 0.6).add(V(0, Math.sin(t * 1.6) * 0.1 * f, 0)), s: lerp(0.2, 1, seg(0.5, 0.56, q)) };
    },
    actors: [C.g],
  });
}

// ═════ B2 介面，是人與系統相遇處 ═════
{
  const I = island(44, -16, 10, { clear: [[2, 2, 6]] });
  const g = I.g;
  // 外商辦公大樓：玻璃帷幕
  const tw = new THREE.Group(); put(g, tw, -6, -5.5);
  const winTex = canvasTex(256, 512, (x, w, h) => { x.fillStyle = '#7f9bb5'; x.fillRect(0, 0, w, h); for (let r = 0; r < 16; r++) for (let c = 0; c < 6; c++) { x.fillStyle = (r * 7 + c * 3) % 5 === 0 ? '#ffe9b0' : '#b9d6ea'; x.fillRect(10 + c * 41, 10 + r * 31, 34, 22); } });
  const towerM = new THREE.MeshStandardMaterial({ map: winTex.tex, roughness: 0.25, metalness: 0.3, emissive: '#ffe2a0', emissiveMap: winTex.tex, emissiveIntensity: 0.08 });
  nightLit.push({ m: towerM, base: 0.5 });
  const tb = sh(new THREE.Mesh(new THREE.BoxGeometry(4.6, 11, 4.6), towerM)); tb.position.y = 5.5; tw.add(tb);
  const crown = sh(new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 5), M.dark)); crown.position.y = 11.2; tw.add(crown);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 5), M.metal); ant.position.y = 12.4; tw.add(ant);
  const ab = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), em('#ff5a4a', 2)); ab.position.y = 13.4; tw.add(ab);
  put(g, tree('round', 1), -8.2, 1.5); put(g, tree('round', 0.8), 7.4, 3.6); put(g, tree('pine', 0.9), 7.8, -5);
  // 「複雜系統」：機櫃、齒輪、管線
  const sys = new THREE.Group(); put(g, sys, 2.4, -5.2);
  const leds = [];
  for (let i = 0; i < 3; i++) {
    const rack = sh(new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.8, 1.0), M.dark)); rack.position.set(-2.2 + i * 1.25, 1.4, 0); sys.add(rack);
    for (let j = 0; j < 7; j++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), new THREE.MeshBasicMaterial({ color: '#ff5a4a' })); l.position.set(-2.2 + i * 1.25 - 0.3 + (j % 3) * 0.3, 0.6 + j * 0.3, 0.52); sys.add(l); leds.push(l); }
  }
  const gears = [];
  [[2.4, 2.6, 1.1], [3.9, 1.6, 0.75], [3.5, 3.6, 0.6]].forEach(([x, y, r], i) => {
    const gg = new THREE.Group(); gg.position.set(x, y, 0.2);
    gg.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.25, 16), mat(['#d9a441', '#9aa6b2', '#c0634a'][i], { metalness: 0.4, roughness: 0.5 }))).rotateX(Math.PI / 2));
    for (let k = 0; k < 10; k++) { const tth = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.24), mat(['#d9a441', '#9aa6b2', '#c0634a'][i])); const a = (k / 10) * Math.PI * 2; tth.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); tth.rotation.z = a; gg.add(tth); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.3, 0.32, 10), M.dark); hub.rotation.x = Math.PI / 2; gg.add(hub);
    sys.add(gg); gears.push({ gg, d: i % 2 ? -1 : 1, s: 1.4 / r });
  });
  const pipeM = mat('#8fa3b8', { metalness: 0.4, roughness: 0.4 });
  [[[-2.2, 2.8, 0], [-1.5, 4.2, 1.5], [0.5, 3.8, 3.2], [-0.3, 3.4, 4.6]], [[0.3, 2.6, 0], [1.4, 4.6, 1.2], [1.2, 3.0, 3.6], [1.6, 3.6, 4.6]], [[1.6, 0.4, 0.2], [2.8, 0.3, 2.4], [3.6, 1.4, 4.4]]].forEach((pts) => {
    const tube = sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => V(...p))), 24, 0.12, 6), pipeM)); sys.add(tube);
  });
  // 大螢幕：先是一團亂的系統，再整理成介面
  const scrG = new THREE.Group(); put(g, scrG, 1.8, -0.6);
  for (const x of [-3.2, 3.2]) { const post = sh(new THREE.Mesh(new THREE.BoxGeometry(0.25, 5.4, 0.25), M.dark)); post.position.set(x, 2.7, -0.1); scrG.add(post); }
  const frame = sh(new THREE.Mesh(new THREE.BoxGeometry(7.4, 4.4, 0.3), M.dark)); frame.position.y = 3.4; scrG.add(frame);
  const ui = canvasTex(1024, 576);
  const uiM = new THREE.MeshBasicMaterial({ map: ui.tex, toneMapped: false });
  const uiP = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.94), uiM); uiP.position.set(0, 3.4, 0.16); scrG.add(uiP);
  const scrLight = new THREE.PointLight('#bfe3ff', 0, 10, 1.4); scrLight.position.set(0, 3.4, 2); scrG.add(scrLight);
  const mess = []; for (let i = 0; i < 46; i++) mess.push([rand() * 1024, rand() * 576, rand() * 1024, rand() * 576, rand()]);
  function drawUI(stage, press) {
    ui.draw((x, w, h) => {
      const clean = lin(0.3, 1, stage);
      x.fillStyle = '#101820'; x.fillRect(0, 0, w, h);
      if (stage > 0.02) {
        // 亂：錯誤訊息與糾纏的線
        x.globalAlpha = 1 - clean;
        x.lineWidth = 3;
        mess.slice(0, Math.ceil(mess.length * lin(0.02, 0.3, stage))).forEach(([a, b, c, d, k], i) => { x.strokeStyle = ['#ff5a4a', '#ffb347', '#8ff5e4', '#9aa6b2'][i % 4]; x.beginPath(); x.moveTo(a, b); x.bezierCurveTo(c, b, a, d, c, d); x.stroke(); if (k > 0.75) { x.fillStyle = '#ff5a4a'; x.font = `700 26px ${FONT}`; x.fillText(['ERR 0x3F', 'timeout', 'null ref', '503'][i % 4], c, d); } });
        x.globalAlpha = 1;
      }
      if (clean > 0) {
        x.globalAlpha = clean;
        x.fillStyle = '#f6f8fb'; x.fillRect(0, 0, w, h);
        const r = (X, Y, W, H, c, rad = 14) => { x.fillStyle = c; x.beginPath(); x.roundRect(X, Y, W, H, rad); x.fill(); };
        const k = (a, b) => lin(a, b, clean);
        r(0, 0, w * k(0, 0.2), 74, '#1e2a44', 0);
        if (k(0.1, 0.25) > 0) { x.globalAlpha = clean * k(0.1, 0.25); x.fillStyle = '#fff'; x.font = `800 30px ${FONT}`; x.fillText('Dashboard', 34, 48); ['總覽', '團隊', '設定'].forEach((s, i) => { x.font = `600 24px ${FONT}`; x.fillText(s, 640 + i * 110, 46); }); x.globalAlpha = clean; }
        [0, 1, 2].forEach((i) => {
          const a = k(0.22 + i * 0.16, 0.38 + i * 0.16); if (a <= 0) return;
          x.globalAlpha = clean * a;
          const X = 40 + i * 322, Y = 110 + (1 - a) * 30;
          r(X, Y, 296, 260, '#ffffff'); x.strokeStyle = '#e1e6ee'; x.lineWidth = 3; x.beginPath(); x.roundRect(X, Y, 296, 260, 14); x.stroke();
          r(X + 22, Y + 22, 120, 18, ['#4f8fe0', '#14b89c', '#ffb347'][i], 9);
          x.fillStyle = '#222a36'; x.font = `800 54px ${FONT}`; x.fillText(['128', '96%', '3.2s'][i], X + 22, Y + 112);
          [0, 1, 2, 3, 4, 5].forEach((j) => r(X + 22 + j * 42, Y + 236 - [40, 70, 55, 95, 80, 110][j], 28, [40, 70, 55, 95, 80, 110][j], ['#cfe0f5', '#bfeee6', '#ffe3bf'][i], 5));
          x.globalAlpha = clean;
        });
        const bA = k(0.78, 0.95);
        if (bA > 0) {
          x.globalAlpha = clean * bA;
          r(372, 410, 280, 92, press ? '#14b89c' : '#1f8f87', 46);
          if (press) { x.strokeStyle = 'rgba(20,184,156,.35)'; x.lineWidth = 16; x.beginPath(); x.roundRect(362, 400, 300, 112, 56); x.stroke(); }
          x.fillStyle = '#fff'; x.font = `800 36px ${FONT}`; x.textAlign = 'center'; x.fillText(press ? '完成 ✓' : '開始', 512, 470); x.textAlign = 'left';
        }
        x.globalAlpha = 1;
      }
    }, `${Math.round(stage * 60)}|${press}`);
  }
  const C = makeCoomy(); put(g, C.g, -2.6, 1.6, TOP, 0.75);
  const stand = new THREE.Group(); put(g, stand, -1.5, 2.6);
  stand.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), M.dark)).translateY(0.7));
  const sl = sh(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.7), mat('#c8ccd2', { metalness: 0.5 }))); sl.position.y = 1.42; stand.add(sl);
  const slid = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.66, 0.04), mat('#c8ccd2', { metalness: 0.5 })); slid.position.set(0, 1.76, -0.34); slid.rotation.x = -0.2; stand.add(slid);
  const co = makeMate({ shirt: '#7a8fd6', hair: 'pony', hairC: '#4a3426' }); put(g, co.g, -4.6, 3.6, TOP, 0.5);
  const desk2 = sh(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.8), M.wood)); desk2.position.set(-3.9, TOP + 1.9, 4.3); desk2.rotation.y = 0.5; g.add(desk2);
  const dl = sh(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.9, 0.1), M.trim)); dl.position.set(-3.9, TOP + 0.95, 4.3); g.add(dl);
  const users = [
    makeMate({ shirt: '#f2a65a', hair: 'side', skin: SKINS[1] }),
    makeMate({ shirt: '#3fae74', hair: 'bowl', skin: SKINS[2] }),
    makeMate({ shirt: '#e06a8a', hair: 'curly', glasses: true, skin: SKINS[3] }),
  ];
  const userPath = [[[-1.2, 11], [0.0, 4.6]], [[2.4, 12], [2.2, 4.2]], [[5.6, 11], [4.4, 4.8]]];
  users.forEach((u) => g.add(u.g));
  const qm = users.map((u) => say(u.g, '？', 1.75, 'mark'));
  const ok = users.map((u, i) => say(u.g, ['懂了！', '原來如此', '！'][i], 1.75, i === 2 ? 'mark' : ''));
  const sC = say(C.g, '看，這樣就懂了。', 2.05);
  const B = beacon(I, -7.4, 4.6);
  SC.push({
    I, B,
    cam: [[0.13, [-5, 10, 22.5], [1.5, 3.3, -1]], [0.55, [0.8, 10.2, 19.5], [1.6, 3.5, -1]], [1, [5, 10.4, 19], [2, 3.5, -1.5]]],
    sky: ['morning', 'day'],
    update(q, t) {
      const stage = lin(0.14, 0.58, q);
      const press = q > 0.66;
      drawUI(stage, press);
      scrLight.intensity = 4 * lin(0.3, 0.6, q);
      gears.forEach(({ gg, d, s }) => (gg.rotation.z = d * (t * 0.4 * s + q * 6 * s + (press ? q * 10 : 0))));
      leds.forEach((l, i) => { const on = Math.sin(t * 5 + i * 1.7) > 0; l.material.color.set(press ? (on ? '#3fe0cc' : '#1f8f87') : (on ? '#ff5a4a' : '#5a1f1a')); });
      // Coomy 指著螢幕講解
      const point = seg(0.32, 0.38, q) * (1 - seg(0.62, 0.68, q));
      C.armR.rotation.set(-lerp(0, 1.7, point), 0, 0.2 + point * 0.25);
      C.armL.rotation.set(-0.9 + Math.sin(t * 3) * 0.05, 0, -0.2);
      C.headG.rotation.y = lerp(0, -0.5, seg(0.4, 0.46, q) * (1 - seg(0.7, 0.76, q)));
      co.arms.forEach((a, i) => a.rotation.set(-1.1 + Math.sin(t * 16 + i) * 0.1, 0, 0));
      users.forEach((u, i) => {
        const tt = lin(0.16 + i * 0.04, 0.36 + i * 0.04, q);
        walk(u, userPath[i], tt);
        if (tt >= 1) u.g.rotation.y = lerpAng(u.g.rotation.y, Math.PI, 1);
        const tilt = q > 0.4 && q < 0.6 ? Math.sin(t * 2 + i) * 0.12 : 0;
        u.headG.rotation.z = tilt;
        u.arms[1].rotation.x = i === 1 && win(0.63, 0.7, q) ? -1.6 : (tt >= 1 ? 0 : u.arms[1].rotation.x);
        qm[i].show(win(0.4 + i * 0.02, 0.6, q));
        ok[i].show(q > 0.68 + i * 0.03 && q < 0.95);
      });
      // 使用者看懂之後，轉身對 Coomy 點頭
      sC.show(win(0.44, 0.62, q));
    },
    ember(q, t) { return { p: C.g.localToWorld(V(0.55, 2.0, 0.2)).add(V(0, Math.sin(t * 1.6) * 0.12, 0)), s: 1 }; },
    actors: [C.g, ...users.map((u) => u.g)],
  });
}

// ═════ B3 人和 AI，同一支隊伍 ═════
const W3 = {};
{
  const I = island(88, -4, 12, { clear: [[0, 0, 9]] });
  const g = I.g;
  put(g, tree('round', 1.1), -10, -4); put(g, tree('pine', 1.1), 9.4, -5.6); put(g, tree('round', 0.9), 10.4, 4.2);
  const shed = house(5.2, 3.6, 3.2, { roof: M.roof2, wall: M.wall2 }); put(g, shed, -4.5, -7.6);
  // 輸送帶
  const belt = new THREE.Group(); put(g, belt, 0, 0);
  const bb = sh(new THREE.Mesh(new THREE.BoxGeometry(16, 0.55, 1.5), M.dark)); bb.position.y = 0.95; belt.add(bb);
  const stripe = canvasTex(256, 32, (x, w, h) => { x.fillStyle = '#39424f'; x.fillRect(0, 0, w, h); x.fillStyle = '#56616f'; for (let i = 0; i < 8; i++) x.fillRect(i * 32, 0, 14, h); });
  stripe.tex.wrapS = THREE.RepeatWrapping; stripe.tex.repeat.set(8, 1);
  const bt = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.3), new THREE.MeshStandardMaterial({ map: stripe.tex, roughness: 0.6 })); bt.rotation.x = -Math.PI / 2; bt.position.y = 1.235; belt.add(bt);
  for (const x of [-8, 8]) { const r = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.55, 12), M.metal)); r.rotation.x = Math.PI / 2; r.position.set(x, 0.95, 0); belt.add(r); }
  for (let x = -7; x <= 7; x += 3.5) for (const z of [-0.6, 0.6]) { const l = sh(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.15), M.metal)); l.position.set(x, 0.35, z); belt.add(l); }
  // 工作站：人、Agent 交錯
  const SX = [-5.6, -3.35, -1.1, 1.15, 3.4, 5.65];
  const team = [];
  const shirts = ['#4f6fd1', '#9a6ad6', '#f2a65a'], hairs = ['bowl', 'side', 'curly'], accents = ['#14b89c', '#ffb347', '#e06a8a'];
  const lamps = [];
  SX.forEach((x, i) => {
    const A = i % 2 === 0 ? makeMate({ shirt: shirts[i / 2], hair: hairs[i / 2], glasses: i === 4, skin: SKINS[i / 2] }) : makePet(accents[(i - 1) / 2]);
    put(g, A.g, x, -1.7, TOP, 0); A.human = i % 2 === 0; team.push(A);
    const lp = lamp(2.9); put(g, lp, x + 0.85, -2.9); lamps.push(lp);
    const pb = burst(g, A.human ? '#ffd36b' : '#8ff5e4', 9, 0.8); pb.g.position.set(x, TOP + 1.2, -1.7); A.burst = pb;
  });
  // 產品：沿著輸送帶一站一站長出來
  const prods = [];
  for (let k = 0; k < 7; k++) {
    const pg = new THREE.Group(); g.add(pg);
    const boxM = mat('#d8b98a');
    const box = sh(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), boxM)); box.position.y = 0.3; pg.add(box);
    const lid = sh(new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.1, 0.76), mat('#1f8f87'))); lid.position.y = 0.64; pg.add(lid);
    const rb1 = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 0.12), mat('#ff4f86')); rb1.position.y = 0.7; pg.add(rb1);
    const rb2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.78), mat('#ff4f86')); rb2.position.y = 0.7; pg.add(rb2);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), em('#ffd36b', 1.6)); star.position.y = 0.95; pg.add(star);
    const hal = glow('#ffd36b', 1.3, 0.6); hal.position.y = 0.95; pg.add(hal);
    prods.push({ pg, boxM, lid, rbs: [rb1, rb2], star, hal });
  }
  const pile = [];
  for (let i = 0; i < 9; i++) {
    const pg = new THREE.Group(); const lv = i < 4 ? 0 : i < 7 ? 1 : 2, idx = i < 4 ? i : i < 7 ? i - 4 : i - 7;
    const n = [4, 3, 2][lv];
    pg.position.set(9.6 + (idx - (n - 1) / 2) * 0.8, TOP + lv * 0.72, 1.6);
    const b = sh(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.66, 0.7), mat('#1f8f87'))); b.position.y = 0.33; pg.add(b);
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.68, 0.12), mat('#ff4f86')); r.position.y = 0.33; pg.add(r);
    g.add(pg); pile.push(pg);
  }
  // 白板：Automation Team / Day 1 → Day 2
  const board = new THREE.Group(); put(g, board, -9.4, -1.2, TOP, 0.55);
  for (const x of [-1.2, 1.2]) { const l = sh(new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 0.1), M.trim)); l.position.set(x, 1.3, 0); board.add(l); }
  const bd = canvasTex(512, 300);
  const bdp = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.52), new THREE.MeshStandardMaterial({ map: bd.tex, roughness: 0.8 })); bdp.position.set(0, 2.1, 0.06); board.add(bdp);
  const bdb = sh(new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.62, 0.08), mat('#e9e4da'))); bdb.position.set(0, 2.1, 0); board.add(bdb);
  const drawBoard = (day, done) => bd.draw((x, w, h) => {
    x.fillStyle = '#fffdf8'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#1f8f87'; x.font = `800 40px ${FONT}`; x.fillText('Automation Team', 28, 62);
    x.fillStyle = '#222a36'; x.font = `900 92px ${FONT}`; x.fillText(`DAY ${day}`, 28, 180);
    x.strokeStyle = '#ff5a4a'; x.lineWidth = 6; for (let i = 0; i < (day === 1 ? 3 : 7); i++) { x.beginPath(); x.moveTo(330 + (i % 4) * 40, 120 + Math.floor(i / 4) * 50); x.lineTo(350 + (i % 4) * 40, 150 + Math.floor(i / 4) * 50); x.stroke(); }
    if (done) { x.fillStyle = '#14b89c'; x.font = `800 38px ${FONT}`; x.fillText('產品上線 ✓', 28, 262); }
  }, `${day}|${done}`);
  const C = makeCoomy(); put(g, C.g, -9.2, 2.2, TOP, 1.0);
  const clip = sh(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.04), mat('#c99a6b'))); clip.position.set(0, -0.05, 0.1); C.armL.userData.hand.add(clip);
  const sGo = say(C.g, '開工！', 2.05);
  const sPet = say(team[1].g, '交給我！', 1.4);
  const sMate = say(team[2].g, '下一個！', 1.75);
  const sPet2 = say(team[5].g, '測好了 ✓', 1.4);
  Object.assign(W3, { I, team, lamps, prods, C, belt, stripe });
  const B = beacon(I, -7.6, 7.4);
  SC.push({
    I, B,
    cam: [[0.13, [-14, 8.2, 16.5], [-5, 2.2, 0]], [0.55, [-1.5, 9, 19.5], [0, 2, 0]], [1, [8, 8.6, 17.5], [4, 2, 0]]],
    sky: ['day', 'afternoon'],
    update(q, t) {
      const run = lin(0.24, 0.96, q);
      const off = run * 34;
      stripe.tex.offset.x = -off / 2;
      team.forEach((A, i) => {
        const t0 = 0.12 + i * 0.022;
        A.g.scale.setScalar((A.human ? 2.3 : 2.1) * backOut(lin(t0, t0 + 0.05, q)));
        A.g.visible = q > t0;
        A.burst.set(lin(t0, t0 + 0.06, q));
        A.g.rotation.y = 0;
        if (A.human) A.arms.forEach((a, j) => a.rotation.set(run > 0 && run < 1 ? -1.0 + Math.sin(t * 14 + j * 2 + i) * 0.25 : 0, 0, j ? 0.15 : -0.15));
        else { A.tipM.emissiveIntensity = 0.6 + (run > 0 ? Math.sin(t * 8 + i) * 0.5 + 0.6 : 0); A.headG.rotation.x = run > 0 && run < 1 ? Math.sin(t * 6 + i) * 0.12 : 0; }
        if (A.headG && A.human) { A.headG.rotation.y = 0; A.headG.rotation.x = 0.15; }
      });
      lamps.forEach((l) => l.userData.set(1));
      prods.forEach((P, k) => {
        const x = -7.6 + ((off + k * (15.2 / 7)) % 15.2);
        P.pg.visible = run > 0 && q < 0.995;
        P.pg.position.set(x, TOP + 1.24, 0);
        const st = SX.filter((sx) => x > sx).length;
        P.boxM.color.set(st >= 1 ? '#1f8f87' : '#d8b98a');
        P.lid.visible = st >= 2; P.rbs.forEach((r) => (r.visible = st >= 3));
        P.star.visible = st >= 5; P.hal.visible = st >= 6;
        P.star.rotation.y = t * 2;
      });
      const nPile = Math.floor(lin(0.32, 0.92, q) * 9 + 0.001);
      pile.forEach((p, i) => (p.visible = i < nPile));
      drawBoard(q > 0.6 ? 2 : 1, q > 0.84);
      const go = seg(0.18, 0.22, q) * (1 - seg(0.28, 0.33, q));
      C.armR.rotation.set(0, 0, 0.2 + go * 2.6);
      C.armL.rotation.set(-0.9, 0, -0.2);
      C.g.rotation.y = 1.0;
      C.headG.rotation.y = q > 0.4 ? Math.sin(t * 0.8) * 0.25 : 0;
      sGo.show(win(0.18, 0.32, q));
      sPet.show(win(0.36, 0.5, q));
      sMate.show(win(0.5, 0.64, q));
      sPet2.show(win(0.7, 0.86, q));
    },
    ember(q, t) { return { p: C.g.localToWorld(V(0.55, 2.0, 0.2)).add(V(0, Math.sin(t * 1.6) * 0.12, 0)), s: 1 }; },
    actors: [C.g],
  });
}

// ═════ B4 還沒來得及 ═════
{
  const { I, team, lamps, C: C3 } = W3;
  const g = I.g;
  // 碼頭
  const dock = new THREE.Group(); put(g, dock, -6, 0, 0);
  const planks = sh(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 7.2), M.wood2)); planks.position.set(0, 0.62, 14.4); dock.add(planks);
  for (let z = 11.2; z <= 17.6; z += 2.1) for (const x of [-0.75, 0.75]) { const p = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 6), M.trim)); p.position.set(x, 0.1, z); dock.add(p); }
  // 留下來的筆記本：做到一半的方法
  const table = new THREE.Group(); put(g, table, -7.4, 4.2);
  const tt = sh(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.9), M.wood)); tt.position.y = 1.2; table.add(tt);
  for (const [x, z] of [[-0.6, -0.36], [0.6, -0.36], [-0.6, 0.36], [0.6, 0.36]]) { const l = sh(new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), M.trim)); l.position.set(x, 0.6, z); table.add(l); }
  const book = new THREE.Group(); book.position.set(0, 1.28, 0); table.add(book);
  const bookM = em('#ffb347', 0.2);
  book.add(sh(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.46), bookM)));
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.42), em('#fff6e0', 0.4)); pages.position.y = 0.06; book.add(pages);
  const bookGlow = glow('#ffc070', 2.6, 0); bookGlow.position.y = 0.3; book.add(bookGlow);
  const bookLight = new THREE.PointLight('#ffb870', 0, 7, 1.5); bookLight.position.y = 0.6; book.add(bookLight);
  const bookTag = label(book, '做到一半的方法', 'ab-tag', V(0, 0.9, 0)); bookTag.el.style.background = '#c27a2c';
  const C = makeCoomy(); g.add(C.g);
  const carry = new THREE.Group(); carry.add(sh(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.2), bookM))); carry.position.set(0, -0.02, 0.12); C.armR.userData.hand.add(carry);
  const pQ = say(team[3].g, '…？', 1.4, 'mark');
  const sBye = say(C.g, '這個，先留給你們。', 2.05);
  const path = [[-7.4, 3.0], [-6.0, 8.5], [-6.0, 16.6]];
  const BOAT_A = V(-6, 0.15, 18.6);
  const DIR = V(34, 0, 34).normalize();
  const boatAt = (q) => { const d = Math.pow(lin(0.66, 1, q), 1.25) * 15; return I.c.clone().add(BOAT_A).addScaledVector(DIR, d); };
  W3.boatEnd = boatAt(1);
  SC.push({
    I, B: null, sameIsland: true,
    cam: [[0.13, [-3, 9.6, 21.5], [-4.5, 2.2, 1.5]], [0.42, [-15, 7.4, 19.5], [-6.5, 2.2, 7]], [0.72, [-15, 8, 30], [-5, 1.2, 15.5]], [1, [-7, 10, 37], [2, 1, 23]]],
    sky: ['dusk', 'blue'],
    update(q, t) {
      C3.g.visible = false;
      lamps.forEach((l, i) => l.userData.set(1 - seg(0.1 + (5 - i) * 0.035, 0.13 + (5 - i) * 0.035, q)));
      team.forEach((A, i) => {
        A.g.visible = true; A.g.scale.setScalar(A.human ? 2.3 : 2.1);
        if (A.human) A.arms.forEach((a, j) => a.rotation.set(0, 0, j ? 0.15 : -0.15));
        // 她走的時候，大家轉頭看
        const look = seg(0.36 + i * 0.012, 0.44 + i * 0.012, q);
        A.g.rotation.y = look * lerp(-0.6, -1.0, i / 5);
        if (A.human) A.headG.rotation.x = 0;
      });
      // 走到桌邊放下筆記本 → 回頭 → 走上碼頭 → 上船
      let y = TOP;
      if (q < 0.14) { walk(C, [[-9.2, 2.2], [-7.4, 3.0]], lin(0.04, 0.13, q)); if (q < 0.04) C.g.rotation.y = 1.0; }
      else if (q < 0.38) { C.g.position.set(-7.4, TOP, 3.0); C.legs.forEach((l) => (l.rotation.x = 0)); C.g.rotation.y = lerpAng(0.0, Math.PI * 0.9, seg(0.27, 0.34, q)); }
      else if (q < 0.62) { walk(C, path, lin(0.38, 0.62, q), q > 0.5 ? 0.62 + 0.08 : TOP); }
      const placed = q > 0.2;
      carry.visible = !placed && q > 0.04;
      book.visible = placed;
      const reach = seg(0.15, 0.19, q) * (1 - seg(0.21, 0.25, q));
      C.armR.rotation.set(-reach * 1.4, 0, 0.2); C.armL.rotation.set(-reach * 1.2, 0, -0.2);
      C.headG.rotation.x = reach * 0.3;
      const glowK = seg(0.2, 0.3, q);
      bookM.emissiveIntensity = 0.2 + glowK * 1.1 + Math.sin(t * 2) * 0.08 * glowK;
      bookGlow.material.opacity = 0.85 * glowK; bookLight.intensity = 5 * glowK;
      bookTag.show(q > 0.3);
      pQ.show(win(0.44, 0.6, q));
      sBye.show(win(0.23, 0.37, q));
      // 船
      const bp = boatAt(q);
      boat.visible = true;
      boat.position.copy(bp).add(V(0, Math.sin(t * 1.4) * 0.06, 0));
      boat.rotation.y = Math.atan2(DIR.x, DIR.z);
      const row = q > 0.66 ? Math.sin(t * 3.2) : 0;
      boat.userData.oars.forEach((o, i) => { o.rotation.x = row * 0.4; o.rotation.z = (i ? 1 : -1) * (0.3 + Math.abs(row) * 0.1); });
      if (q >= 0.62) {
        const hop = lin(0.62, 0.66, q);
        const from = I.c.clone().add(V(-6, 0.7, 16.6));
        const to = bp.clone().add(V(0, 0.15, 0));
        const p = arcPos(from, to, EIO(hop), 1.0);
        C.g.position.copy(g.worldToLocal(p));
        C.g.rotation.y = Math.atan2(DIR.x, DIR.z) + (hop >= 1 ? 0 : 0);
        C.legs.forEach((l) => (l.rotation.x = hop >= 1 ? -1.4 : 0));
        if (hop >= 1) { C.g.position.y = g.worldToLocal(bp.clone()).y - 0.4; C.armL.rotation.set(-1.2 + row * 0.4, 0, -0.3); C.armR.rotation.set(-1.2 + row * 0.4, 0, 0.3); C.headG.rotation.y = q > 0.78 ? lerp(0, 2.4, seg(0.78, 0.86, q)) * (1 - seg(0.94, 1, q)) * 0.5 : 0; }
      }
    },
    ember(q, t) { return { p: C.g.localToWorld(V(0.55, 2.0, 0.2)).add(V(0, Math.sin(t * 1.6) * 0.12, 0)), s: 1 }; },
    actors: [C.g],
    after(q) { if (q < 0.0001) { boat.position.copy(I.c.clone().add(BOAT_A)); } },
  });
}

// ═════ B5 我說一步，你做一步 ═════
{
  const I = island(122, 30, 9, { clear: [[-1, 1, 6.5]] });
  const g = I.g;
  const stones = [[-4.6, 4.6], [-3.3, 3.2], [-2.0, 1.9], [-0.6, 0.7], [0.8, -0.5], [1.9, -1.8], [2.9, -3.0]];
  stones.forEach(([x, z]) => { const s = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.14, 9), M.stone)); s.position.set(x, TOP + 0.05, z); g.add(s); });
  // 燈塔
  const lh = new THREE.Group(); put(g, lh, 4.0, -4.6);
  for (let i = 0; i < 6; i++) { const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.15 - i * 0.07, 1.22 - i * 0.07, 1.25, 16), mat(i % 2 ? '#d9534a' : '#f6efe3'))); c.position.y = 0.62 + i * 1.25; lh.add(c); }
  const balc = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.16, 16), M.dark)); balc.position.y = 7.6; lh.add(balc);
  const lampM = em('#fff1c4', 0.05);
  const lroom = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.1, 12), lampM); lroom.position.y = 8.25; lh.add(lroom);
  const lroof = sh(new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.0, 12), mat('#d9534a'))); lroof.position.y = 9.3; lh.add(lroof);
  const ldoor = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.2), mat('#5a4a3c')); ldoor.position.set(-0.6, 0.6, 1.05); ldoor.rotation.y = -0.5; lh.add(ldoor);
  const lhGlow = glow('#ffe7a8', 7, 0); lhGlow.position.y = 8.25; lh.add(lhGlow);
  const beamM = new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const beam = new THREE.Group(); beam.position.y = 8.25; lh.add(beam);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 26, 20, 1, true), beamM); cone.rotation.z = Math.PI / 2; cone.position.x = 13; beam.add(cone);
  const lhLight = new THREE.PointLight('#ffe7a8', 0, 26, 1.2); lhLight.position.y = 8.25; lh.add(lhLight);
  // 其他小屋：之後每一戶都有自己的燈
  const homes = [[-5.6, -2.6, 0.7], [-1.6, -5.6, 0.2], [6.2, 2.6, -0.9]].map(([x, z, r]) => { const h = house(2.8, 2.4, 2.2, { lit: '#ffd89a' }); put(g, h, x, z, TOP, r); h.userData.winM = h.userData.winM; return h; });
  const homeLights = homes.map((h) => { const m = mat('#2a3550', { emissive: '#ffd36b', emissiveIntensity: 0 }); h.traverse((o) => { if (o.material === h.userData.winM) o.material = m; }); const gl = glow('#ffd36b', 2.2, 0); gl.position.set(1.2, 1.5, 1.6); h.add(gl); return { m, gl }; });
  put(g, tree('pine', 1), -6.8, 1.6); put(g, tree('pine', 0.8), 6.6, -2.4);
  // 地上的箭頭
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.45); arrowShape.lineTo(0.38, 0); arrowShape.lineTo(0.14, 0); arrowShape.lineTo(0.14, -0.4); arrowShape.lineTo(-0.14, -0.4); arrowShape.lineTo(-0.14, 0); arrowShape.lineTo(-0.38, 0);
  const arrows = [0, 1, 2].map((k) => {
    const a = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), new THREE.MeshBasicMaterial({ color: '#3fe0cc', transparent: true, opacity: 0, side: THREE.DoubleSide }));
    a.rotation.x = -Math.PI / 2; const [x, z] = stones[k]; a.position.set(x, TOP + 0.15, z);
    const [px, pz] = k ? stones[k - 1] : [-5.6, 6.0]; a.rotation.z = Math.atan2(x - px, -(z - pz)) * -1 + Math.PI;
    g.add(a); return a;
  });
  const C = makeCoomy(); g.add(C.g);
  const J = makeMate({ shirt: '#3fae74', hair: 'plain', skin: SKINS[2], hairC: '#2a221f' }); g.add(J.g);
  const lantern = new THREE.Group();
  { const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.36, 8), em('#ffd36b', 1.6)); const top = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.14, 8), M.dark); top.position.y = 0.25; const hl = glow('#ffc070', 2.2, 0.85); lantern.add(body, top, hl); }
  const lanternLight = new THREE.PointLight('#ffc070', 4, 6, 1.6); lantern.add(lanternLight);
  g.add(lantern);
  const sSteps = ['踩這裡。', '再一步。', '然後這裡。'].map((s) => say(C.g, s, 2.05));
  const sAsk = say(J.g, '那下一步呢？', 1.75);
  const sYou = say(C.g, '接下來，你決定。', 2.05, 'big');
  const sJ = say(J.g, '好，我來！', 1.75);
  const B = beacon(I, -6.2, 4.6);
  const LAND = V(-7.6, 0.15, 6.6);
  SC.push({
    I, B,
    cam: [[0.13, [-14.5, 7, 19.5], [-3.5, 2.2, 3.5]], [0.48, [-10.5, 8.2, 20], [-1.6, 2.6, 2]], [0.8, [-6.5, 12.5, 26], [1.4, 4.6, -2]], [1, [-1, 15, 30], [2.8, 6.2, -3]]],
    sky: ['blue', 'night'],
    update(q, t) {
      // 靠岸
      const arrive = seg(0, 0.12, q);
      const bp = W3.boatEnd.clone().lerp(I.c.clone().add(LAND), arrive);
      boat.position.copy(bp).add(V(0, Math.sin(t * 1.4) * 0.06, 0)); boat.rotation.y = lerpAng(Math.PI / 4, -Math.PI / 2 + 0.3, arrive);
      const boatLocal = g.worldToLocal(bp.clone());
      // Coomy 下船
      if (q < 0.12) { C.g.position.set(boatLocal.x, boatLocal.y - 0.4, boatLocal.z); C.legs.forEach((l) => (l.rotation.x = -1.4)); C.g.rotation.y = boat.rotation.y; }
      else { const h = lin(0.12, 0.16, q); const p = arcPos(V(boatLocal.x, boatLocal.y - 0.4, boatLocal.z), V(-6.0, TOP, 6.2), EIO(h), 0.8); C.g.position.copy(p); C.legs.forEach((l) => (l.rotation.x = 0)); C.g.rotation.y = lerpAng(boat.rotation.y, angTo(C.g.position, -3.0, 3.0), h); }
      // 三步：她指一下，他走一步，回頭看她
      let jp = [-5.5, 6.4], jy = TOP, jr = angTo(V(-5.5, 0, 6.4), -6.0, 6.2);
      let point = 0;
      for (let k = 0; k < 3; k++) {
        const a = 0.17 + k * 0.085;
        point = Math.max(point, seg(a, a + 0.015, q) * (1 - seg(a + 0.05, a + 0.065, q)));
        arrows[k].material.opacity = seg(a + 0.01, a + 0.025, q) * (1 - seg(a + 0.06, a + 0.075, q));
        sSteps[k].show(win(a, a + 0.06, q));
        const hop = lin(a + 0.03, a + 0.055, q);
        if (q > a + 0.03) {
          const from = k ? stones[k - 1] : [-5.5, 6.4], to = stones[k];
          jp = [lerp(from[0], to[0], EIO(hop)), lerp(from[1], to[1], EIO(hop))];
          jy = TOP + 0.12 + Math.sin(Math.PI * hop) * 0.5;
          jr = hop < 1 ? Math.atan2(to[0] - from[0], to[1] - from[1]) : angTo(V(to[0], 0, to[1]), C.g.position.x, C.g.position.z);
        }
      }
      C.armR.rotation.set(-point * 1.5, 0, 0.2 + point * 0.2);
      C.armL.rotation.set(0, 0, -0.2);
      sAsk.show(win(0.43, 0.5, q));
      // 把燈交給他
      const give = lin(0.5, 0.58, q);
      const handC = C.armR.userData.hand.getWorldPosition(V());
      const s2 = stones[2];
      if (q < 0.5) { lantern.visible = q > 0.46; lantern.position.copy(g.worldToLocal(handC.clone())); C.armR.rotation.set(q > 0.46 ? -1.2 : C.armR.rotation.x, 0, 0.2); }
      sYou.show(win(0.5, 0.64, q));
      // 他自己走完剩下的路
      const own = lin(0.6, 0.84, q);
      if (q >= 0.6) {
        const rest = [stones[2], ...stones.slice(3), [3.4, -3.5]];
        const r = along(rest, own);
        jp = [r.x, r.z]; jy = TOP + 0.12 + Math.abs(Math.sin(r.dist * 1.8)) * 0.25 * (own < 1 ? 1 : 0);
        if (own < 1) jr = Math.atan2(r.dx, r.dz); else jr = Math.PI * 0.8;
      }
      J.g.position.set(jp[0], jy, jp[1]); J.g.rotation.y = jr;
      J.legs.forEach((l, i) => (l.rotation.x = q > 0.6 && own < 1 ? Math.sin(own * 40 + i * Math.PI) * 0.6 : 0));
      J.arms[1].rotation.set(q > 0.56 ? -0.9 : 0, 0, 0.15);
      sJ.show(win(0.6, 0.72, q));
      if (q >= 0.5) {
        lantern.visible = q < 0.86;
        const jh = J.arms[1].userData.hand.getWorldPosition(V());
        const p = q < 0.58 ? arcPos(handC, jh, EIO(give), 1.2) : jh;
        lantern.position.copy(g.worldToLocal(p));
      }
      // 燈塔亮起、家家戶戶點燈
      const lit = seg(0.84, 0.88, q);
      lampM.emissiveIntensity = 0.05 + lit * 2.2;
      lhGlow.material.opacity = 0.9 * lit; lhLight.intensity = 30 * lit;
      beamM.opacity = 0.16 * lit; beam.rotation.y = t * 0.6;
      homeLights.forEach((h, i) => { const k = seg(0.88 + i * 0.03, 0.92 + i * 0.03, q); h.m.emissiveIntensity = 1.4 * k; h.m.color.set(k > 0.5 ? '#ffe2a0' : '#2a3550'); h.gl.material.opacity = 0.8 * k; });
      C.headG.rotation.x = q > 0.84 ? -0.3 * seg(0.84, 0.9, q) : 0;
    },
    ember(q, t) { return { p: C.g.localToWorld(V(0.55, 2.0, 0.2)).add(V(0, Math.sin(t * 1.6) * 0.12, 0)), s: 1 }; },
    actors: [C.g, J.g, lantern],
  });
}

// ═════ B6 兩個人，一艘火箭 ═════
const W6 = {};
{
  const I = island(90, 62, 10, { clear: [[0, 0.5, 7.5]] });
  const g = I.g;
  put(g, tree('palm', 1.1), -7.6, -2.6); put(g, tree('palm', 0.9), 7.6, 3.6); put(g, tree('palm', 1.0), -3.4, -6.8); put(g, tree('round', 0.9), 6.8, -5);
  const rock = sh(new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), M.stone)); rock.scale.set(1.3, 0.5, 1.1); rock.position.set(-5.2, TOP + 0.2, 0.6); g.add(rock);
  // 藍圖桌
  const tbl = new THREE.Group(); put(g, tbl, -1.2, 1.9, TOP, 0.15);
  for (const [x, z] of [[-1.0, -0.6], [1.0, -0.6], [-1.0, 0.6], [1.0, 0.6]]) { const l = sh(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), M.trim)); l.position.set(x, 0.6, z); tbl.add(l); }
  const bp = canvasTex(512, 340);
  const bpM = new THREE.MeshStandardMaterial({ map: bp.tex, roughness: 0.8, emissive: '#ffffff', emissiveMap: bp.tex, emissiveIntensity: 0.15 });
  const bpl = sh(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 1.6), bpM)); bpl.position.y = 1.3; bpl.rotation.x = 0.35; tbl.add(bpl);
  const drawBP = (hi, n) => bp.draw((x, w, h) => {
    x.fillStyle = '#1d4f8f'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(255,255,255,.15)'; x.lineWidth = 1; for (let i = 0; i < w; i += 24) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } for (let i = 0; i < h; i += 24) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
    const parts = [(c) => { c.strokeRect(226, 252, 60, 34); }, (c) => { c.strokeRect(216, 112, 80, 140); }, (c) => { c.beginPath(); c.moveTo(216, 210); c.lineTo(180, 270); c.lineTo(216, 252); c.moveTo(296, 210); c.lineTo(332, 270); c.lineTo(296, 252); c.stroke(); }, (c) => { c.beginPath(); c.arc(256, 160, 18, 0, 6.3); c.stroke(); }, (c) => { c.beginPath(); c.moveTo(216, 112); c.lineTo(256, 44); c.lineTo(296, 112); c.stroke(); }];
    parts.forEach((p, i) => { x.lineWidth = 4; x.strokeStyle = i === hi ? '#ffd36b' : i < n ? '#ffffff' : 'rgba(255,255,255,.4)'; x.setLineDash(i < n || i === hi ? [] : [8, 8]); p(x); });
    x.setLineDash([]); x.fillStyle = '#fff'; x.font = `800 26px ${FONT}`; x.fillText('ROCKET v1', 22, 40);
  }, `${hi}|${n}`);
  // 發射台與火箭（一塊一塊長出來）
  const pad = new THREE.Group(); put(g, pad, 3.4, 0.2);
  const padM = sh(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.8, 0.3, 20), M.stone)); padM.position.y = 0.15; pad.add(padM);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.06, 6, 30), em('#ffd36b', 0.8)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.31; pad.add(ring);
  const tower = new THREE.Group(); tower.position.set(-1.6, 0, -0.6); pad.add(tower);
  for (let i = 0; i < 4; i++) { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(0.08, 5.2, 0.08), mat('#d9534a'))); b.position.set((i % 2) * 0.6, 2.6, Math.floor(i / 2) * 0.6); tower.add(b); }
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.06), mat('#d9534a')); b.position.set(0.3, 0.8 + i * 1.0, 0); tower.add(b); }
  const rocket = new THREE.Group(); rocket.position.y = 0.3; pad.add(rocket);
  const rparts = [];
  { const p = new THREE.Group(); p.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.66, 0.6, 14), M.dark)).translateY(0.3)); rparts.push(p); }
  { const p = new THREE.Group(); p.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 2.6, 18), mat('#f6f4ef', { roughness: 0.5 }))).translateY(1.9)); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.18, 18), mat('#1f8f87')); band.position.y = 1.0; p.add(band); rparts.push(p); }
  { const p = new THREE.Group(); for (let i = 0; i < 3; i++) { const f = sh(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.7), mat('#d9534a'))); const a = (i / 3) * Math.PI * 2 + 0.5; f.position.set(Math.sin(a) * 0.82, 1.0, Math.cos(a) * 0.82); f.rotation.y = a; p.add(f); } rparts.push(p); }
  { const p = new THREE.Group(); const w = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 16), em('#8ff5e4', 0.6)); w.rotation.x = Math.PI / 2; w.position.set(0, 2.45, 0.71); const wr = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.05, 6, 18), M.metal); wr.position.set(0, 2.45, 0.73); p.add(w, wr); rparts.push(p); }
  { const p = new THREE.Group(); p.add(sh(new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.4, 18), mat('#d9534a'))).translateY(3.9)); rparts.push(p); }
  rparts.forEach((p) => rocket.add(p));
  const flame = new THREE.Group(); flame.position.y = -0.1; rocket.add(flame);
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.6, 12), em('#ffb347', 2.4)); fl.rotation.x = Math.PI; fl.position.y = -0.7; flame.add(fl);
  const fg = glow('#ff9a3a', 4.2, 0.9); fg.position.y = -0.6; flame.add(fg);
  const flameLight = new THREE.PointLight('#ffb347', 0, 14, 1.4); flameLight.position.y = -0.6; flame.add(flameLight);
  const smoke = [];
  for (let i = 0; i < 14; i++) { const s = sh(new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), mat('#f4f1ea', { transparent: true, opacity: 0.9, flatShading: true }))); s.userData.a = (i / 14) * Math.PI * 2; pad.add(s); smoke.push(s); }
  const partBursts = rparts.map(() => { const b = burst(pad, '#ffd36b', 10, 1.0); return b; });
  // 點子燈泡
  const bulbs = [0, 1, 2, 3, 4].map(() => {
    const b = new THREE.Group();
    b.add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), em('#ffe066', 1.8)));
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 10), M.metal); base.position.y = -0.27; b.add(base);
    b.add(glow('#ffd36b', 1.8, 0.8));
    g.add(b); return b;
  });
  const W = makeWater(); put(g, W.g, -5.2, 0.6, TOP + 0.38, 0.45);
  const C = makeCoomy(); put(g, C.g, 5.8, -1.6, TOP, -0.9);
  const hammer = new THREE.Group(); { const h1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), M.wood); h1.position.y = -0.1; const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.1), M.metal); h2.position.y = -0.33; hammer.add(h1, h2); hammer.rotation.x = Math.PI / 2; hammer.position.set(0, 0, 0.05); }
  C.armR.userData.hand.add(hammer);
  tag(W.g, '水球', '#3aa8e0', 2.25); tag(C.g, 'Coomy', '#e06a8a', 2.05);
  const tagW = LABELS[LABELS.length - 2], tagC = LABELS[LABELS.length - 1];
  const sW1 = say(W.g, '我有個點子！', 2.3);
  const sC1 = say(C.g, '藍圖給我。', 2.05);
  const sW2 = say(W.g, '還有這個！還有這個！', 2.3);
  const sC2 = say(C.g, '3、2、1——', 2.05, 'big');
  const sW3 = say(W.g, '飛起來了！', 2.3, 'big');
  const tblTop = I.c.clone().add(V(-1.2, TOP + 1.5, 1.9));
  const B = beacon(I, -6.4, 5.4);
  const LAUNCH = (q) => Math.pow(lin(0.66, 1, q), 2.2) * 24;
  Object.assign(W6, { I, rocket, pad, LAUNCH });
  SC.push({
    I, B,
    cam: [[0.13, [-2, 8.4, 21.5], [0, 2.6, 0.5]], [0.58, [0.2, 7.4, 19.5], [0.2, 2.9, 0]], [0.74, [1.2, 6, 21.5], [2.8, 6, -1]], [1, [1.6, 3.6, 25], [3.2, 8.5, -2]]],
    sky: ['day', 'day'],
    update(q, t) {
      // 水球一顆一顆冒點子，燈泡先飛到藍圖、再飛到火箭
      const wHead = W.g.localToWorld(V(0, 2.1, 0));
      let hi = -1, n = 0;
      const BW = 0.08;
      bulbs.forEach((b, k) => {
        const a = 0.15 + k * BW;
        const f = (q - a) / BW;
        b.visible = f > 0 && f < 0.92;
        const partW = I.c.clone().add(V(3.4, TOP + 0.3 + [0.3, 1.9, 1.0, 2.45, 3.9][k], 0.2 + (k === 3 ? 0.8 : 0)));
        let p;
        if (f < 0.25) p = wHead.clone().add(V(0, backOut(f / 0.25) * 0.8, 0));
        else if (f < 0.55) p = arcPos(wHead.clone().add(V(0, 0.8, 0)), tblTop, EIO((f - 0.25) / 0.3), 2);
        else p = arcPos(tblTop, partW, EIO((f - 0.55) / 0.3), 2.4);
        b.position.copy(g.worldToLocal(p));
        b.scale.setScalar(f < 0.25 ? backOut(f / 0.25) : 1);
        if (f > 0.3 && f < 0.85) hi = k;
        if (f >= 0.85) n = k + 1;
        rparts[k].visible = f >= 0.85;
        rparts[k].scale.setScalar(backOut(lin(0.85, 1.1, f)));
        partBursts[k].set(lin(0.85, 1.3, f));
      });
      drawBP(hi, n);
      // 水球彈跳：冒點子時跳得特別高
      const pop = bulbs.some((b, k) => win(0.15 + k * BW, 0.15 + k * BW + 0.03, q));
      const excited = q > 0.62;
      const bh = Math.abs(Math.sin(t * (pop || excited ? 7 : 2.5))) * (pop ? 0.45 : excited ? 0.6 : 0.12);
      W.g.position.y = TOP + 0.38 + bh;
      W.body.scale.set(1 + (0.06 - bh * 0.1), 1 - (0.06 - bh * 0.1), 1 + (0.06 - bh * 0.1));
      W.g.rotation.y = 0.45;
      // Coomy 敲火箭
      const hit = bulbs.some((b, k) => { const f = (q - 0.15 - k * BW) / BW; return f > 0.7 && f < 1.0; });
      C.armR.rotation.set(hit ? -1.4 - Math.abs(Math.sin(t * 12)) * 1.0 : -0.5, 0, 0.2);
      hammer.visible = q < 0.6;
      C.armL.rotation.set(0, 0, -0.2);
      // 發射
      const up = LAUNCH(q);
      rocket.position.y = 0.3 + up;
      rocket.rotation.z = up > 0 ? Math.sin(t * 30) * 0.01 : 0;
      const ign = lin(0.62, 0.66, q);
      flame.visible = q > 0.62;
      fl.scale.set(1, 0.8 + Math.sin(t * 40) * 0.15 + ign * 0.4, 1);
      flameLight.intensity = 30 * ign;
      smoke.forEach((s, i) => { const k = ((q - 0.62) * 3 + (i % 5) * 0.2) % 1; s.visible = q > 0.62 && q < 0.995; const a = s.userData.a; s.position.set(Math.cos(a) * (0.6 + k * 3.2), 0.4 + k * 0.6, Math.sin(a) * (0.6 + k * 3.2)); s.scale.setScalar(0.5 + k * 1.4); s.material.opacity = 0.85 * (1 - k); });
      const look = seg(0.66, 0.74, q);
      C.headG.rotation.x = -0.55 * look; W.g.rotation.x = -0.25 * look;
      C.g.rotation.y = lerpAng(-0.9, -0.5, look);
      tagW.show(win(0.13, 0.62, q)); tagC.show(win(0.13, 0.62, q));
      sW1.show(win(0.14, 0.26, q)); sC1.show(win(0.24, 0.36, q)); sW2.show(win(0.38, 0.52, q));
      sC2.show(win(0.56, 0.66, q)); sW3.show(win(0.72, 0.9, q));
    },
    ember(q, t) { return { p: C.g.localToWorld(V(0.55, 2.0, 0.2)).add(V(0, Math.sin(t * 1.6) * 0.12, 0)), s: 1 }; },
    actors: [C.g, W.g],
  });
}

// ═════ B7 每一年，都一起過 ═════
{
  const I = island(56, 84, 6.5, { clear: [[0, 2, 4.5]] });
  const g = I.g;
  const tr = tree('round', 1.2); put(g, tr, -3.4, -2.2);
  const pole = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.2, 6), M.trim)); pole.position.set(3.6, TOP + 1.6, -1.8); g.add(pole);
  const bulbs = [];
  for (let i = 0; i < 14; i++) { const f = i / 13; const m = em(['#ffd36b', '#ff9fb8', '#8ff5e4'][i % 3], 1.6); const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), m); b.position.set(lerp(-2.6, 3.6, f), TOP + 3.1 - Math.sin(f * Math.PI) * 0.9, lerp(-2.0, -1.8, f)); g.add(b); const gl = glow(m.color, 0.9, 0.6); gl.position.copy(b.position); g.add(gl); bulbs.push({ m, gl }); }
  const blTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#fff3e4'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff9fb8'; for (let i = 0; i < 8; i++) { x.fillRect(i * 32, 0, 14, h); x.fillRect(0, i * 32, w, 14); } });
  const blanket = sh(new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.05, 2.4), new THREE.MeshStandardMaterial({ map: blTex.tex, roughness: 1 }))); blanket.position.set(0, TOP + 0.03, 1.0); g.add(blanket);
  const W = makeWater(); put(g, W.g, -1.0, 0.9, TOP + 0.02, 0);
  W.g.scale.setScalar(1.3);
  const C = makeCoomy(); put(g, C.g, 1.0, 0.9, TOP - 0.6, 0);
  C.legs.forEach((l) => (l.rotation.x = -1.45));
  // 蛋糕車，由一隻 Agent 推進來
  const cart = new THREE.Group(); g.add(cart);
  const ct = sh(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.0), M.wood2)); ct.position.y = 0.95; cart.add(ct);
  for (const [x, z] of [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.06), M.trim); l.position.set(x, 0.55, z); cart.add(l); const wh = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 6, 12), M.dark); wh.position.set(x, 0.14, z); wh.rotation.y = Math.PI / 2; cart.add(wh); }
  const cake = new THREE.Group(); cake.position.y = 1.0; cart.add(cake);
  cake.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.36, 24), mat('#fff3e4'))).translateY(0.18));
  cake.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 24), mat('#ffb3c7'))).translateY(0.51));
  const drip = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 6, 30), mat('#ffffff')); drip.rotation.x = Math.PI / 2; drip.position.y = 0.36; cake.add(drip);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat('#e0304a')); s.position.set(Math.cos(a) * 0.43, 0.4, Math.sin(a) * 0.43); cake.add(s); }
  const candles = [-0.15, 0, 0.15].map((x, i) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 6), mat(['#8ff5e4', '#ffd36b', '#c9a7ff'][i])); c.position.set(x, 0.78, i === 1 ? -0.08 : 0.04); cake.add(c);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 8), em('#ffcf6b', 2.6)); f.position.set(x, 0.95, c.position.z); cake.add(f);
    const fg = glow('#ffb347', 0.8, 0.9); fg.position.copy(f.position); cake.add(fg);
    return { f, fg };
  });
  const cakeLight = new THREE.PointLight('#ffb870', 0, 7, 1.4); cakeLight.position.y = 1.4; cake.add(cakeLight);
  const pet = makePet('#ff4f86'); g.add(pet.g);
  const heart = label(g, '♥', 'ab-heart', V(0, TOP + 3.2, 1.0));
  // 天燈
  const lanterns = [];
  for (let i = 0; i < 7; i++) { const l = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 8), em('#ffb347', 1.4)); const gl = glow('#ffb347', 2.2, 0.75); l.add(b, gl); l.userData = { x: (rand() - 0.5) * 12, z: -2 - rand() * 8, d: rand() * 0.12, sw: rand() * 6 }; g.add(l); lanterns.push(l); }
  const shoot = new THREE.Group(); g.add(shoot);
  const shootTrail = [];
  for (let i = 0; i < 16; i++) { const s = glow(i ? '#cfe8ff' : '#ffffff', i ? 1.6 - i * 0.08 : 2.6, 1 - i / 16); shoot.add(s); shootTrail.push(s); }
  const sWish = say(W.g, '許願吧。', 2.0);
  const sYear = say(C.g, '以後每一年，都一起過。', 2.0, 'big');
  const B = beacon(I, -4.6, 3.4);
  SC.push({
    I, B,
    cam: [[0.13, [0, 3.0, 15.5], [0, 7.5, -3]], [0.34, [0.3, 6.2, 15], [0, 2.1, 1.4]], [0.68, [0.6, 5.2, 12.2], [0, 2.4, 1.6]], [1, [0, 4.6, 15], [0, 9.5, -4]]],
    sky: ['night', 'night'],
    update(q, t) {
      // 火箭化成流星劃過
      const sf = lin(0.1, 0.3, q);
      shoot.visible = sf > 0 && sf < 1;
      shootTrail.forEach((s, i) => { const f = Math.max(0, sf - i * 0.012); s.position.set(lerp(-26, 24, f), lerp(24, 15, f), lerp(-22, -16, f)); });
      // 燈暗了
      bulbs.forEach(({ m, gl }, i) => { const off = seg(0.3 + i * 0.006, 0.32 + i * 0.006, q); m.emissiveIntensity = 1.6 * (1 - off) + 0.02; gl.material.opacity = 0.6 * (1 - off); });
      // 蛋糕推進來
      const roll = seg(0.36, 0.5, q);
      cart.position.set(lerp(8, 0, roll), TOP, 3.3);
      const aside = roll >= 1 ? seg(0.5, 0.58, q) : 0;
      pet.g.position.set(cart.position.x + 1.25 + aside * 1.9, TOP, 3.3 - aside * 2.0);
      pet.g.rotation.y = roll < 1 ? -Math.PI / 2 : lerpAng(lerpAng(-Math.PI / 2, Math.PI * 0.8, seg(0.5, 0.52, q)), -0.6, seg(0.56, 0.6, q));
      pet.legs.forEach((l, i) => (l.rotation.x = (roll > 0 && roll < 1) || win(0.5, 0.58, q) ? Math.sin(t * 14 + i * 1.6) * 0.5 : 0));
      candles.forEach((c, i) => { const k = seg(0.52 + i * 0.025, 0.54 + i * 0.025, q); const fl = 1 + Math.sin(t * 22 + i * 2) * 0.12; c.f.scale.set(k, k * fl, k); c.fg.material.opacity = 0.9 * k; c.fg.scale.setScalar(0.8 * fl); });
      cakeLight.intensity = 7 * seg(0.52, 0.6, q) * (1 + Math.sin(t * 19) * 0.08);
      // 兩個人靠近一點
      const lean = seg(0.62, 0.7, q);
      W.g.rotation.y = 0.32 * lean; C.g.rotation.y = -0.32 * lean;
      W.g.position.x = -1.0 + 0.15 * lean; C.g.position.x = 1.0 - 0.15 * lean;
      W.g.position.y = TOP + 0.02 + Math.abs(Math.sin(t * 2)) * 0.05;
      C.armL.rotation.set(0, 0, -0.25 - lean * 0.2); C.armR.rotation.set(0, 0, 0.2);
      const up = seg(0.78, 0.86, q);
      C.headG.rotation.x = -0.4 * up; W.g.rotation.x = -0.18 * up;
      heart.show(win(0.66, 0.8, q));
      sWish.show(win(0.56, 0.66, q));
      sYear.show(win(0.68, 0.94, q));
      lanterns.forEach((l, i) => { const u = l.userData; const f = lin(0.72 + u.d, 1.0, q); l.visible = f > 0; l.position.set(u.x + Math.sin(t * 0.6 + u.sw) * 0.3, TOP + 0.5 + f * 24, u.z); });
    },
    ember(q, t) {
      const above = I.c.clone().add(V(0.05, TOP + 3.0, 3.3));
      const k = seg(0.5, 0.6, q);
      const hover = C.g.localToWorld(V(0.55, 2.0, 0.2));
      return { p: hover.lerp(above, k * 0.0).add(V(0, Math.sin(t * 1.6) * 0.1, 0)), s: 1 - 0.4 * seg(0.52, 0.6, q) };
    },
    actors: [C.g, W.g, pet.g, cart],
  });
}

// ═════ B8 船上，有了更多人 ═════
const W8 = {};
{
  const O = V(14, 0, 62);
  const yard = new THREE.Group(); yard.position.copy(O); scene.add(yard);
  const I = island(O.x - 12, O.z - 7, 6.5, { clear: [[0, 0, 4]] });
  const rb = makeRobot(); rb.head.position.set(0, TOP + 2.3, -0.6); rb.head.scale.setScalar(0.62); rb.head.rotation.y = 0.5; I.g.add(rb.head);
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.9) continue; const r = sh(new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 + rand() * 0.5, 0), M.stone)); r.position.set(Math.cos(a) * 2.1, TOP + 0.2, Math.sin(a) * 1.8 - 0.6); r.rotation.set(rand() * 3, rand() * 3, 0); I.g.add(r); }
  put(I.g, tree('pine', 0.9), -4, 2.4); put(I.g, tree('round', 0.8), 4.2, -2.4);
  // 船塢：兩條棧橋、鷹架
  const wood = mat('#b98a5e', { roughness: 0.9 }), dk = mat('#7a5a3e');
  for (const z of [-4.2, 4.2]) {
    const pier = sh(new THREE.Mesh(new THREE.BoxGeometry(22, 0.3, 1.4), wood)); pier.position.set(0, 0.5, z); yard.add(pier);
    for (let x = -10; x <= 10; x += 4) { const post = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.6, 6), dk)); post.position.set(x, 1.6, z); yard.add(post); }
    const rail = sh(new THREE.Mesh(new THREE.BoxGeometry(20.4, 0.14, 0.14), dk)); rail.position.set(0, 3.3, z); yard.add(rail);
  }
  const walkway = sh(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 6), wood)); walkway.position.set(-11.6, 0.5, 1.6); yard.add(walkway);
  for (let i = 0; i < 4; i++) { const c = sh(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), M.wood2)); c.position.set(-8 + i * 0.4, 1.0 + (i === 3 ? 0.7 : 0), 4.2 + (i % 2 ? 0.1 : -0.2) - (i === 3 ? 0.05 : 0)); if (i === 3) c.position.x = -7.6; yard.add(c); }
  const crane = new THREE.Group(); crane.position.set(9, 0.65, -4.2); yard.add(crane);
  crane.add(sh(new THREE.Mesh(new THREE.BoxGeometry(0.3, 7, 0.3), mat('#ffb347'))).translateY(3.5));
  const arm = sh(new THREE.Mesh(new THREE.BoxGeometry(6, 0.25, 0.25), mat('#ffb347'))); arm.position.set(-2.6, 7, 0); crane.add(arm);
  const hook = new THREE.Group(); hook.position.set(-5, 7, 0); crane.add(hook);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 4), M.dark); rope.position.y = -1.5; hook.add(rope);
  // AllWill 號：一塊一塊長出來
  const S = 0.62;
  const ship = new THREE.Group(); yard.add(ship);
  const big = new THREE.Group(); big.scale.setScalar(S); big.position.y = 0.3; ship.add(big);
  const bricks = [];
  {
    const steel = mat('#7d8a99', { metalness: 0.6, roughness: 0.35 }), navy = mat('#3d64a8', { metalness: 0.3, roughness: 0.45 }), wd = mat('#c99a6b');
    const glowM = em('#3fe0cc', 1.4);
    const sailMat = new THREE.MeshStandardMaterial({ color: '#d9fff8', emissive: '#3fe0cc', emissiveIntensity: 0.2, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    W8.sailMat = sailMat;
    const add = (geo, m, x, y, z, ry = 0) => { const o = sh(new THREE.Mesh(geo, m)); o.position.set(x, y, z); o.rotation.y = ry; big.add(o); bricks.push(o); return o; };
    const ST = 9, L = 16, dx = L / (ST - 1);
    for (let i = 0; i < ST; i++) add(new THREE.BoxGeometry(dx * 0.95, 0.4, 1.0), steel, -L / 2 + i * dx, 0.2, 0);
    for (let lv = 0; lv < 5; lv++) { const y = 0.55 + lv * 0.45, half = 0.9 + lv * 0.62; for (let i = 0; i < ST; i++) for (const sg of [-1, 1]) add(new THREE.BoxGeometry(dx * 0.98, 0.44, 0.3), navy, -L / 2 + i * dx, y, sg * half * (i === ST - 1 ? 0.6 : 1)); }
    for (let lv = 0; lv < 4; lv++) add(new THREE.ConeGeometry(1.2 + lv * 0.5, 1.6, 4), navy, L / 2 + 1.2, 0.7 + lv * 0.5, 0, Math.PI / 4);
    for (let i = 0; i < ST; i++) add(new THREE.BoxGeometry(dx * 0.98, 0.18, 6.0), wd, -L / 2 + i * dx, 2.75, 0);
    for (const sg of [-1, 1]) for (const y of [1.0, 2.0]) add(new THREE.BoxGeometry(L, 0.08, 0.08), glowM, 0, y, sg * (0.9 + ((y - 0.55) / 0.45) * 0.62 + 0.2));
    [-5, 0, 5].forEach((x, k) => { for (let j = 0; j < (k === 1 ? 5 : 4); j++) add(new THREE.CylinderGeometry(0.16, 0.2, 2.2, 10), mat('#f4f1ea'), x, 3.95 + j * 2.2, 0); });
    [-5, 0, 5].forEach((x, k) => { const h = (k === 1 ? 5 : 4) * 2.2 * 0.85; const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 3.6, 0, 0, 0, h, 0], 3)); tri.computeVertexNormals(); add(tri, sailMat, x + 0.2, 3.4, 0, Math.PI / 2); });
    for (let i = 0; i < 10; i++) add(new THREE.SphereGeometry(0.13, 8, 6), em('#fff3c4', 1.6), -L / 2 + i * (L / 9), 3.0, i % 2 ? 2.7 : -2.7);
    // 船身上的 AllWill 字樣
    const nm = canvasTex(512, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#ffffff'; x.font = `900 92px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('AllWill', w / 2, h / 2 + 4); });
    const name = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: nm.tex, transparent: true, depthWrite: false })); name.position.set(-1, 1.55, 3.45 + 0.05); big.add(name);
    W8.name = name;
  }
  const brickBursts = [0, 1, 2, 3].map(() => burst(yard, '#3fe0cc', 10, 1.4));
  const DECK = 0.3 + 2.84 * S;
  const crew = [
    { k: 'richard', A: makeMate({ shirt: '#f2a65a', hair: 'side' }), name: 'Richard・COO & Designer', c: '#e08a3c', spot: [-3.2, 0.7] },
    { k: 'raymond', A: makeMate({ shirt: '#4f6fd1', hair: 'bowl' }), name: 'Raymond・CTO', c: '#4f6fd1', spot: [-1.6, -0.6] },
    { k: 'ben', A: makeMate({ shirt: '#3fae74', hair: 'curly', glasses: true }), name: 'ben・導入', c: '#2f9a62', spot: [0.2, 0.7] },
    { k: 'ccza', A: makeMate({ shirt: '#9a6ad6', hair: 'plain', glasses: true }), name: 'ccza・主力工程師', c: '#8a5ac6', spot: [1.8, -0.6] },
  ];
  crew.forEach((m, i) => { yard.add(m.A.g); m.tag = label(m.A.g, m.name, 'ab-tag', V(0, 1.72 + (i % 2) * 0.26, 0)); m.tag.el.style.background = m.c; });
  const C = makeCoomy(); yard.add(C.g);
  const W = makeWater(); yard.add(W.g);
  const tagC = label(C.g, 'Coomy', 'ab-tag', V(0, 2.05, 0)); tagC.el.style.background = '#e06a8a';
  const tagW = label(W.g, '水球', 'ab-tag', V(0, 2.25, 0)); tagW.el.style.background = '#3aa8e0';
  const pets = ['#14b89c', '#ffb347', '#e06a8a'].map((c) => { const p = makePet(c); yard.add(p.g); return p; });
  const sRobot = say(rb.head, '出發！', 4.4, 'dark big');
  const sW = say(W.g, '人變多了耶！', 2.3);
  const wake = [];
  for (let i = 0; i < 14; i++) { const s = glow('#ffffff', 1.4, 0.5); yard.add(s); wake.push(s); }
  const B = beacon(I, 3.6, 3.6);
  const SAIL = (q) => Math.pow(lin(0.72, 1, q), 1.6) * 26;
  Object.assign(W8, { yard, ship, O, SAIL, C, W, crew, DECK, shift: V(), wake: true });
  // 走路動線：從機器人島沿走道上棧橋，到上船點跳上甲板
  const boardAt = (spot) => [[-11.6, -1.6], [-11.6, 4.2], [spot[0] - 0.6, 4.2]];
  SC.push({
    I, B,
    cam: [[0.13, [-4, 12.5, 31], [-1.5, 2.2, 1.5]], [0.48, [-13, 8.4, 22], [-5, 2.4, 2.4]], [0.72, [1, 9.4, 27], [1, 3.4, 0.5]], [1, [22, 10, 31], [22, 3.6, 0]]],
    origin: O,
    sky: ['dawn', 'morning'],
    update(q, t) {
      const N = bricks.length;
      bricks.forEach((b, k) => { const qk = 0.13 + 0.27 * (k / N); const f = lin(qk, qk + 0.02, q); b.visible = f > 0; b.scale.setScalar(Math.max(0.001, backOut(f))); });
      brickBursts.forEach((bb, i) => { const qk = 0.15 + i * 0.065; bb.g.position.set(-6 + i * 4, 2 + i * 0.6, 0); bb.set(lin(qk, qk + 0.05, q)); });
      hook.rotation.z = Math.sin(t * 0.8) * 0.08;
      const sx = SAIL(q) + W8.shift.x, sz = W8.shift.z;
      ship.position.set(sx, Math.sin(t * 1.2) * 0.05, sz);
      ship.rotation.x = Math.sin(t * 0.9) * 0.012;
      // 兩個人先在棧橋上，看著船長出來
      const startC = [-6.2, 4.2], startW = [-7.6, 4.2];
      const onDeck = (spot) => V(spot[0] + sx, DECK, spot[1] + sz);
      const board = (A, start, spot, a, y0 = TOP) => {
        const walkT = lin(a, a + 0.07, q);
        const hop = lin(a + 0.07, a + 0.095, q);
        if (q < a + 0.07) { const pts = start ? [start, [spot[0] - 0.6, 4.2]] : boardAt(spot); const mv = walk(A, pts, walkT, 0.65 + (y0 - TOP)); if (!mv && q < a) A.g.rotation.y = start ? 0 : Math.PI / 2; }
        else { const p = arcPos(V(spot[0] - 0.6, 0.65 + (y0 - TOP), 4.2), onDeck(spot).add(V(0, y0 - TOP, 0)), EIO(hop), 1.4); A.g.position.copy(p); A.legs.forEach((l) => (l.rotation.x = 0)); A.g.rotation.y = hop < 1 ? Math.PI : 0; if (A.swing) A.swing.forEach((s) => (s.rotation.x = 0)); }
      };
      crew.forEach((m, i) => { const a = 0.36 + i * 0.05; m.A.g.visible = q > a - 0.01; board(m.A, null, m.spot, a); m.tag.show(q > a && q < 0.95); });
      pets.forEach((p, i) => { const a = 0.4 + i * 0.05; p.g.visible = q > a - 0.01; board(p, null, [-4.4 + i * 1.6 + 0.8, i % 2 ? 1.3 : -1.3], a); });
      board(C, startC, [3.4, 0.7], 0.6);
      board(W, startW, [4.8, -0.4], 0.62, TOP + 0.05);
      if (q < 0.6) { C.g.rotation.y = q > 0.14 ? Math.PI * 0.85 : 0; C.headG.rotation.x = -0.15; }
      tagC.show(q > 0.13 && q < 0.95); tagW.show(q > 0.13 && q < 0.95);
      sW.show(win(0.52, 0.62, q));
      // 帆亮起、船名浮出、機器人喊出發
      const lit = seg(0.68, 0.74, q);
      W8.sailMat.emissiveIntensity = 0.2 + lit * 1.0;
      W8.name.material.opacity = seg(0.7, 0.76, q);
      W8.name.visible = q > 0.4;
      sRobot.show(win(0.7, 0.84, q));
      const blink = Math.sin(t * 0.9) > 0.97 ? 0.15 : 1;
      rb.eyes.forEach((e) => (e.scale.y = 1.25 * blink));
      rb.jaw.rotation.x = win(0.7, 0.84, q) ? Math.abs(Math.sin(t * 9)) * 0.25 : 0;
      // 開船：甲板上大家揮手
      if (q > 0.74) {
        [C, ...crew.map((m) => m.A)].forEach((A, i) => { const arm = A.armR || A.arms[1]; arm.rotation.set(0, 0, 2.4 + Math.sin(t * 6 + i) * 0.4); });
        W.g.position.y = DECK + 0.05 + Math.abs(Math.sin(t * 5)) * 0.35;
      }
      wake.forEach((s, i) => { const k = ((t * 0.5 + i / wake.length) % 1); s.visible = q > 0.72 && W8.wake; s.position.set(sx - 6 - k * 9, 0.2, sz + (i % 2 ? 1 : -1) * (1.6 + k * 2)); s.material.opacity = 0.45 * (1 - k); s.scale.setScalar(1 + k * 2); });
    },
    ember(q, t) { return { p: C.g.localToWorld(V(0.55, 2.0, 0.2)).add(V(0, Math.sin(t * 1.6) * 0.12, 0)), s: 1 }; },
    actors: [],
  });
}

// ═════ B9 把做過的事留下來 ═════
{
  const nodes = [V(0, 1.2, 0), V(44, 1.2, -16), V(88, 1.2, -4), V(122, 1.2, 30), V(90, 1.2, 62), V(56, 1.2, 84), V(14, 1.2, 62)];
  const shipEnd = W8.O.clone().add(V(W8.SAIL(1), 0, 0));
  const routePts = [...nodes, V(shipEnd.x - 4, 1.2, shipEnd.z + 3.2)];
  // 航線：每兩座島之間拉成一條弧線，片尾亮起
  const curve = new THREE.CatmullRomCurve3(routePts, false, 'centripetal', 0.5);
  const tube = new THREE.TubeGeometry(curve, 400, 0.38, 8, false);
  const routeM = new THREE.MeshBasicMaterial({ color: '#ffd36b', transparent: true, opacity: 0.95, fog: false, toneMapped: false });
  const route = new THREE.Mesh(tube, routeM); scene.add(route);
  const total = tube.index.count;
  const routeHalo = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 1.3, 8, false), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  scene.add(routeHalo);
  const nodeGlows = nodes.map((n) => { const s = glow('#ffd36b', 9, 0); s.position.copy(n).setY(4); scene.add(s); return s; });
  // 虛線：下一段還沒走的航程
  const dash = [];
  const SV = V(175, 0, 92);
  W8.SV = SV;
  for (let i = 0; i < 12; i++) { const f = (i + 1) / 14; const s = glow('#ffffff', 2.2, 0); s.position.set(lerp(shipEnd.x + 8, SV.x - 16, f), 1.4, lerp(shipEnd.z + 3, SV.z + 12, f) + Math.sin(f * Math.PI) * 6); scene.add(s); dash.push(s); }
  const names = ['深夜的書桌', '外商', 'Automation Team', '燈塔', '水球島', '星空下', 'AllWill 號'];
  const colors = ['#ffd36b', '#4f8fe0', '#14b89c', '#8a7ae0', '#3aa8e0', '#ff4f86', '#14b89c'];
  const islLabels = nodes.map((n, i) => { const L = label(scene, `<i style="background:${colors[i]}"></i>${names[i]}`, 'ab-tag isl', n.clone().setY(7)); return L; });
  const center = V(62, 0, 46);
  SC.push({
    I: null, B: null,
    cam: [[0.13, [shipEnd.x - 6, 11, shipEnd.z + 26], [shipEnd.x, 3.4, shipEnd.z]], [0.6, [center.x, 122, center.z + 142], [center.x, 0, center.z]], [1, [center.x, 128, center.z + 134], [center.x, 0, center.z + 2]]],
    sky: ['night', 'night'],
    update(q, t) {
      const d = seg(0.16, 0.62, q);
      route.visible = routeHalo.visible = d > 0;
      route.geometry.setDrawRange(0, Math.floor(total * d / 3) * 3);
      routeHalo.geometry.setDrawRange(0, Math.floor(routeHalo.geometry.index.count * d / 3) * 3);
      nodeGlows.forEach((s, i) => { const at = i / (routePts.length - 1); const k = d >= at ? 1 : 0; const pulse = seg(at, at + 0.06, d) * (1 - seg(at + 0.06, at + 0.16, d)); s.material.opacity = k * (0.55 + pulse * 0.45 + Math.sin(t * 2 + i) * 0.05); s.scale.setScalar(9 + pulse * 8); });
      islLabels.forEach((L, i) => L.show(d >= i / (routePts.length - 1) && q > 0.3));
      dash.forEach((s, i) => { const k = seg(0.64 + i * 0.022, 0.68 + i * 0.022, q); s.material.opacity = k * (0.55 + Math.sin(t * 3 - i * 0.6) * 0.3); });
    },
    ember(q, t) {
      const bow = W8.yard.localToWorld(V(W8.SAIL(1) + 6, 6.5, 0));
      const end = dash[dash.length - 1].position.clone().add(V(4, 4, 0));
      const f = seg(0.62, 0.95, q);
      return { p: arcPos(bow, end, f, 14).add(V(0, Math.sin(t * 1.6) * 0.2, 0)), s: 1 + f * 2.5 };
    },
    actors: [],
  });
}

// ═════ B10 下一站，矽谷（開張） ═════
{
  const SV = W8.SV;
  const I = island(SV.x, SV.z, 12, { grass: '#7fb65a', clear: [[-2, 4, 7]] });
  const g = I.g;
  // 車庫：很多公司都從一間車庫開始
  const gar = new THREE.Group(); put(g, gar, -3, -3.2);
  const gw = sh(new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.4, 4.6), mat('#f3ead8', { roughness: 0.9 }))); gw.position.y = 1.7; gar.add(gw);
  const groof = sh(new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.35, 5.1), mat('#5f6e7d'))); groof.position.y = 3.55; gar.add(groof);
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.5), em('#ffd89a', 0.05)); inside.position.set(-0.6, 1.25, 2.31); gar.add(inside);
  const insideGlow = glow('#ffd36b', 6, 0); insideGlow.position.set(-0.6, 1.4, 2.8); gar.add(insideGlow);
  const insideLight = new THREE.PointLight('#ffd08a', 0, 12, 1.4); insideLight.position.set(-0.6, 1.6, 3.4); gar.add(insideLight);
  // 車庫裡：一張桌子、兩台筆電、白板
  const desk = sh(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.8), M.wood)); desk.position.set(-0.6, 0.95, 1.6); gar.add(desk);
  for (const x of [-1.5, 0.3]) { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.08), M.trim); lg.position.set(x, 0.48, 1.6); gar.add(lg); }
  for (const x of [-1.1, -0.1]) { const lt = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.04), em('#bfe3ff', 0.8)); lt.position.set(x, 1.2, 1.4); lt.rotation.x = -0.2; gar.add(lt); }
  const doorTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#e6e1d6'; x.fillRect(0, 0, w, h); x.fillStyle = '#c9c2b4'; for (let i = 0; i < 8; i++) x.fillRect(0, i * 32 + 26, w, 5); });
  const door = sh(new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, 0.08), new THREE.MeshStandardMaterial({ map: doorTex.tex, roughness: 0.7 }))); door.position.set(-0.6, 1.3, 2.36); gar.add(door);
  const sign = canvasTex(512, 160, (x, w, h) => { x.fillStyle = '#1e2a44'; x.fillRect(0, 0, w, h); x.fillStyle = '#3fe0cc'; x.font = `900 64px ${FONT}`; x.textAlign = 'center'; x.fillText('AllWill', w / 2, 76); x.fillStyle = '#ffffff'; x.font = `700 30px ${FONT}`; x.fillText('SILICON VALLEY · 2027', w / 2, 126); });
  const signP = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshBasicMaterial({ map: sign.tex })); signP.position.set(-0.6, 3.05, 2.33); gar.add(signP);
  const flagPole = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), M.metal)); flagPole.position.set(2.8, 5.0, 1.6); gar.add(flagPole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.65, 6, 1), mat('#3fe0cc', { side: THREE.DoubleSide })); flag.position.set(3.35, 6.1, 1.6); gar.add(flag);
  put(g, tree('palm', 1.15), 5.6, -4.6); put(g, tree('palm', 1.0), -9, -1.4); put(g, tree('palm', 0.9), 7.6, 3.4); put(g, tree('round', 0.9), -7.4, -6);
  const lp = lamp(2.6); put(g, lp, 2.2, 6.2);
  // 路牌：Hello, Silicon Valley
  const post = new THREE.Group(); put(g, post, 3.6, 4.4, TOP, -0.35);
  const pp = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 6), M.trim)); pp.position.y = 1.2; post.add(pp);
  const pb = canvasTex(512, 200, (x, w, h) => { x.fillStyle = '#2f7d4f'; x.fillRect(0, 0, w, h); x.strokeStyle = '#fff'; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 20); x.fillStyle = '#fff'; x.font = `800 50px ${FONT}`; x.textAlign = 'center'; x.fillText('Hello,', w / 2, 86); x.fillText('Silicon Valley', w / 2, 150); });
  const pbm = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.8), new THREE.MeshStandardMaterial({ map: pb.tex })); pbm.position.y = 2.2; post.add(pbm);
  // 棧橋與剪綵
  // 船從島的東側靠岸：棧橋往東伸，彩帶橫在棧橋上岸處
  const pier = sh(new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.2, 2.6), M.wood2)); pier.position.set(13.0, 0.62, 4); g.add(pier);
  for (let x = 10.8; x <= 15.4; x += 2.3) for (const z of [2.9, 5.1]) { const pq = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 6), M.trim)); pq.position.set(x, 0.1, z); g.add(pq); }
  const RIB_X = 8.8;
  for (const z of [2.4, 5.6]) { const rp = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8), mat('#d4a24a', { metalness: 0.5, roughness: 0.4 }))); rp.position.set(RIB_X, TOP + 0.8, z); g.add(rp); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mat('#d4a24a', { metalness: 0.5 })); ball.position.set(RIB_X, TOP + 1.65, z); g.add(ball); }
  const ribM = mat('#e0303f', { roughness: 0.5 });
  const halves = [2.4, 5.6].map((z, i) => { const h = new THREE.Group(); h.position.set(RIB_X, TOP + 1.3, z); const r = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 1.6), ribM); r.position.z = i ? -0.8 : 0.8; h.add(r); g.add(h); return h; });
  const bow = new THREE.Group(); bow.position.set(RIB_X + 0.02, TOP + 1.3, 4); bow.rotation.y = Math.PI / 2; g.add(bow);
  for (const s2 of [-1, 1]) { const loop = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 12), ribM); loop.position.x = s2 * 0.17; loop.scale.set(1.3, 0.8, 1); bow.add(loop); }
  const confetti = ['#ffd36b', '#3fe0cc', '#ff4f86', '#ffffff'].map((c) => { const b = burst(g, c, 12, 2.2, 0.5); b.g.position.set(RIB_X, TOP + 1.4, 4); return b; });
  // 金門大橋般的紅色吊橋，在海灣那頭
  const br = new THREE.Group(); br.position.set(-26, 0, -30); br.rotation.y = -0.25; g.add(br);
  const red = mat('#c0362c', { roughness: 0.6 });
  for (const x of [-12, 12]) { for (const z of [-0.9, 0.9]) { const tw = sh(new THREE.Mesh(new THREE.BoxGeometry(0.7, 17, 0.7), red)); tw.position.set(x, 8.5, z); br.add(tw); } for (const y of [7, 12, 16.4]) { const cb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.2), red); cb.position.set(x, y, 0); br.add(cb); } }
  const bdeck = sh(new THREE.Mesh(new THREE.BoxGeometry(60, 0.5, 2.4), red)); bdeck.position.y = 5; br.add(bdeck);
  for (const z of [-0.9, 0.9]) {
    const pts = []; for (let i = 0; i <= 40; i++) { const x = -30 + i * 1.5; const yy = Math.abs(x) <= 12 ? 5.6 + 10.8 * Math.pow(x / 12, 2) : 16.4 - (Math.abs(x) - 12) * 0.6; pts.push(V(x, Math.max(5.2, yy), z)); }
    br.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.09, 5), red));
  }
  const sayC = label(W8.C.g, '開張！', 'ab-say big', V(0, 2.05, 0));
  const sayW = label(W8.W.g, 'Hello, Silicon Valley！', 'ab-say', V(0, 2.3, 0));
  const sayCrew = label(W8.crew[1].A.g, '到了！', 'ab-say', V(0, 1.75, 0));
  const B = beacon(I, 6.6, 7.4);
  // 船從回望那一段的終點開過來：先經過島的正前方，再繞到東側棧橋停靠
  const yl = (x, z) => W8.yard.worldToLocal(SV.clone().add(V(x, 0, z))).setY(0);
  const S0 = V(W8.SAIL(1), 0, 0), A = yl(-6, 30), D = yl(21.2, 4);
  const shipAt = (u) => S0.clone().multiplyScalar((1 - u) * (1 - u)).add(A.clone().multiplyScalar(2 * (1 - u) * u)).add(D.clone().multiplyScalar(u * u));
  SC.push({
    I, B,
    cam: [[0.13, [-10, 18, 58], [2, 2, 14]], [0.36, [6, 9.5, 31], [12, 2.4, 5]], [0.56, [1.5, 5.4, 15.5], [10, 2.6, 3.8]], [0.74, [9, 8.5, 27], [3, 3, 0]], [1, [0, 16, 48], [-6, 6, -8]]],
    sky: ['dawn', 'morning'],
    update(q, t) {
      const k = q < TRAVEL ? 0.8 * EIO(q / TRAVEL) : 0.8 + 0.2 * EIO(lin(TRAVEL, 0.34, q));
      W8.shift.copy(shipAt(k)).sub(S0);
      W8.wake = q < 0.32;
      SC[7].update(1, t);
      const { C, W, yard, DECK } = W8;
      const sp = W8.ship.position;
      const toYard = (x, y, z) => yard.worldToLocal(SV.clone().add(V(x, y, z)));
      // 先走到船尾，跳上棧橋，走到彩帶前
      const place = (A2, deck, sternZ, x0, pz, a, yOff = 0) => {
        if (q < a) return;
        const stern = V(sp.x - 4.2, DECK + yOff, sp.z + sternZ);
        const pEnd = toYard(15.4, 0.72 + yOff, pz), rib = toYard(x0, TOP + yOff, pz);
        const w1 = lin(a, a + 0.05, q), hop = lin(a + 0.05, a + 0.09, q), w2 = lin(a + 0.09, a + 0.18, q);
        let pos, moving = false, dir = -Math.PI / 2;
        if (w1 < 1) { pos = deck.clone().lerp(stern, EIO(w1)); moving = w1 > 0; dir = Math.atan2(stern.x - deck.x, stern.z - deck.z); }
        else if (hop < 1) pos = arcPos(stern, pEnd, EIO(hop), 1.2);
        else { pos = pEnd.clone().lerp(rib, EIO(w2)); moving = w2 < 1; if (pos.x < toYard(10.4, 0, 0).x) pos.y = rib.y; }
        A2.g.position.copy(pos);
        A2.g.rotation.y = q > 0.68 ? lerpAng(-Math.PI / 2, 0, seg(0.68, 0.74, q)) : dir;
        A2.legs.forEach((l, i) => (l.rotation.x = moving ? Math.sin(q * 900 + i * Math.PI) * 0.7 : 0));
      };
      const deckC = C.g.position.clone(), deckW = W.g.position.clone();
      place(C, deckC, 0.6, 9.4, 4.8, 0.33);
      place(W, deckW, -0.6, 10.7, 3.0, 0.35, 0.05);
      if (q > 0.33) {
        const snip = seg(0.52, 0.55, q) * (1 - seg(0.6, 0.64, q));
        C.armR.rotation.set(-1.3 * snip, 0, 0.2); C.armL.rotation.set(0, 0, -0.2);
        if (q > 0.66) C.armR.rotation.set(0, 0, 2.4 + Math.sin(t * 6) * 0.4);
        C.headG.rotation.x = 0;
        if (q > 0.53) W.g.position.y += Math.abs(Math.sin(t * 5)) * (q > 0.56 ? 0.4 : 0.08);
      }
      // 剪綵：彩帶斷成兩半垂下，彩紙噴出來
      const cut = seg(0.56, 0.62, q);
      halves.forEach((h, i) => (h.rotation.x = (i ? -1 : 1) * cut * 1.35));
      bow.visible = q < 0.56;
      confetti.forEach((c, i) => c.set(lin(0.56 + i * 0.012, 0.66 + i * 0.012, q)));
      // 車庫門捲起，燈亮
      const open = seg(0.62, 0.72, q);
      door.scale.y = Math.max(0.04, 1 - open); door.position.y = 1.3 + open * 1.25;
      inside.material.emissiveIntensity = 0.05 + open * 1.2;
      insideGlow.material.opacity = 0.75 * open; insideLight.intensity = 14 * open;
      flag.rotation.y = Math.sin(t * 2.2) * 0.25;
      lp.userData.set(1);
      sayC.show(win(0.55, 0.72, q));
      sayW.show(win(0.62, 0.8, q));
      sayCrew.show(win(0.26, 0.4, q));
    },
    ember(q, t) { return { p: W8.C.g.localToWorld(V(0.55, 2.0, 0.2)).add(V(0, Math.sin(t * 1.6) * 0.12, 0)), s: 1 }; },
    actors: [],
  });
}

// ───────────── 天色 ─────────────
const PAL = {
  night: { top: '#0b1a33', hz: '#1d3557', sea: '#12324f', sun: '#9fb6ff', sunI: 0.55, hemiI: 0.34, night: 1, dir: [-30, 40, 30] },
  morning: { top: '#86b9e2', hz: '#f6d2b0', sea: '#3f9cc6', sun: '#ffd9b0', sunI: 2.3, hemiI: 0.58, night: 0, dir: [-50, 30, 30] },
  day: { top: '#7fb8e0', hz: '#f4dcc0', sea: '#3e9fc8', sun: '#ffe2b8', sunI: 2.7, hemiI: 0.62, night: 0, dir: [-30, 45, 25] },
  afternoon: { top: '#7aa3d0', hz: '#f6c896', sea: '#3a8fba', sun: '#ffcf94', sunI: 2.4, hemiI: 0.55, night: 0.05, dir: [40, 28, 25] },
  dusk: { top: '#2f4475', hz: '#e88e70', sea: '#2a5f86', sun: '#ff9a6a', sunI: 1.4, hemiI: 0.42, night: 0.55, dir: [50, 12, 10] },
  blue: { top: '#15264a', hz: '#40598a', sea: '#183e60', sun: '#a8b8ff', sunI: 0.65, hemiI: 0.34, night: 0.88, dir: [30, 30, 20] },
  dawn: { top: '#6f8fc0', hz: '#f6c7a0', sea: '#3a7fa8', sun: '#ffc59a', sunI: 1.8, hemiI: 0.5, night: 0.22, dir: [60, 14, 20] },
};
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function mixPal(a, b, k) {
  const o = {};
  ['top', 'hz', 'sea', 'sun'].forEach((key) => { o[key] = _c1.set(a[key]).clone().lerp(_c2.set(b[key]), k); });
  ['sunI', 'hemiI', 'night'].forEach((key) => (o[key] = lerp(a[key], b[key], k)));
  o.dir = a.dir.map((v, i) => lerp(v, b.dir[i], k));
  return o;
}
function palAt(bi, q) {
  const [s, e] = SC[bi].sky;
  const inner = mixPal(PAL[s], PAL[e], seg(TRAVEL, 1, q));
  if (bi === 0 || q >= TRAVEL) return inner;
  const prev = PAL[SC[bi - 1].sky[1]];
  return mixPal(prev, inner, seg(0, TRAVEL, q));
}

// ───────────── 鏡頭 ─────────────
const camKeys = SC.map((S) => {
  const o = S.origin || (S.I ? S.I.c : V());
  return S.cam.map(([q, p, tg]) => ({ q, p: o.clone().add(V(...p)), t: o.clone().add(V(...tg)) }));
});
const CR = (p0, p1, p2, p3, f) => {
  const f2 = f * f, f3 = f2 * f;
  return V(
    0.5 * (2 * p1.x + (-p0.x + p2.x) * f + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * f2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * f3),
    0.5 * (2 * p1.y + (-p0.y + p2.y) * f + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * f2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * f3),
    0.5 * (2 * p1.z + (-p0.z + p2.z) * f + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * f2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * f3),
  );
};
function camInBeat(bi, q) {
  const K = camKeys[bi];
  if (q <= K[0].q) return { p: K[0].p.clone(), t: K[0].t.clone() };
  if (q >= K[K.length - 1].q) return { p: K[K.length - 1].p.clone(), t: K[K.length - 1].t.clone() };
  let i = 0; while (i < K.length - 2 && q > K[i + 1].q) i++;
  let f = (q - K[i].q) / (K[i + 1].q - K[i].q);
  f = lerp(f, EIO(f), 0.55);
  if (i === K.length - 2) f = lerp(f, EIO(f), 0.6);
  const g = (j, key) => K[Math.max(0, Math.min(K.length - 1, j))][key];
  return { p: CR(g(i - 1, 'p'), g(i, 'p'), g(i + 1, 'p'), g(i + 2, 'p'), f), t: CR(g(i - 1, 't'), g(i, 't'), g(i + 1, 't'), g(i + 2, 't'), f) };
}
function camAt(bi, q) {
  if (bi === 0 || q >= TRAVEL) return camInBeat(bi, q);
  const a = camInBeat(bi - 1, 1), b = camInBeat(bi, TRAVEL);
  const f = EIO(q / TRAVEL);
  const dist = a.t.distanceTo(b.t);
  const p = a.p.clone().lerp(b.p, f).add(V(0, Math.sin(Math.PI * f) * Math.min(26, dist * 0.32), 0));
  // 視線先轉向目的地，鏡頭再飛過去，飛行途中不會只看到一片海
  return { p, t: a.t.clone().lerp(b.t, EIO(Math.min(1, (q / TRAVEL) * 1.8))) };
}

// ───────────── DOM：劇情卡、進度 ─────────────
const card = document.querySelector('.ab-card');
const chipI = card.querySelector('.ab-chip i'), chipT = card.querySelector('.chip-t');
const countEl = card.querySelector('.count'), bigEl = card.querySelector('.big'), smallEl = card.querySelector('.small');
const dotsEl = document.querySelector('.ab-dots');
const dots = TXT.map(() => { const i = document.createElement('i'); dotsEl.appendChild(i); return i; });
let cardBeat = -1;
function setCard(bi, show) {
  if (bi !== cardBeat) {
    cardBeat = bi;
    const d = TXT[bi];
    chipI.style.background = d.c; chipT.textContent = d.chip;
    countEl.textContent = `${String(bi + 1).padStart(2, '0')} / ${String(TXT.length).padStart(2, '0')}`;
    bigEl.textContent = d.big; smallEl.textContent = d.small;
    card.style.setProperty('--bar', d.c);
    card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
  }
  card.classList.toggle('on', show);
  dots.forEach((el, i) => { el.classList.toggle('done', i < bi); el.classList.toggle('now', i === bi); });
}

// ───────────── 每一幀 ─────────────
const film = document.getElementById('ab-film');
let P = 0, Psm = 0, curBeat = -1;
const t0 = performance.now();
function resetOthers(bi) {
  // 換段時把其他段落設成「還沒開始／已經結束」，seek 到哪都一致
  for (let j = SC.length - 1; j > bi; j--) { SC[j].active = false; SC[j].update(0, 0); }
  for (let j = 0; j < bi; j++) { SC[j].active = false; SC[j].update(1, 0); }
}
function frame(p, t) {
  let bi = 0;
  for (let i = 0; i < BEATS.length; i++) if (p >= BEATS[i].s) bi = i;
  const q = clamp01((p - BEATS[bi].s) / BEATS[bi].len);
  LABELS.forEach((L) => (L.want = false));
  if (bi !== curBeat) { resetOthers(bi); curBeat = bi; }
  SC.forEach((S, j) => (S.active = j === bi));
  const S = SC[bi];
  // 船：B4 之前停在碼頭，B5 之後留在燈塔島
  if (bi < 3) boat.visible = false;
  S.update(q, t);
  if (bi < 3) { boat.visible = false; }
  if (bi > 4) boat.visible = true;
  // 只顯示這一段（和剛飛離的上一段）的角色
  SC.forEach((X, j) => X.actors.forEach((a) => (a.visible = j === bi || (j === bi - 1 && q < TRAVEL && !SC[bi].sameIsland))));
  if (bi === 4 && SC[3]) SC[3].actors.forEach((a) => (a.visible = false));
  // 燈標：走完一段就亮
  SC.forEach((X, j) => { if (!X.B) return; const k = j < bi ? 1 : j === bi ? seg(0.9, 0.97, q) : 0; X.B.g.userData.set(k); X.B.ring.material.emissiveIntensity = 0.2 + k * 1.6; });
  // 天色
  const pal = palAt(bi, q);
  skyU.top.value.copy(pal.top); skyU.horizon.value.copy(pal.hz);
  sea.material.color.copy(pal.sea);
  sun.color.copy(pal.sun); sun.intensity = pal.sunI;
  hemi.intensity = pal.hemiI;
  scene.fog.color.copy(pal.hz);
  starMat.opacity = clamp01((pal.night - 0.35) / 0.65);
  moon.userData.disc.material.opacity = clamp01((pal.night - 0.4) / 0.6);
  moon.userData.halo.material.opacity = 0.35 * clamp01((pal.night - 0.4) / 0.6);
  nightLit.forEach(({ m, base }) => (m.emissiveIntensity = base * (0.06 + 0.94 * pal.night)));
  // 鏡頭
  const c = camAt(bi, q);
  const asp = camera.aspect;
  // 直式螢幕：鏡頭往後退；回望那段的俯瞰要退更多，整條航線才裝得下
  const k = asp < 0.8 ? (bi === 8 ? lerp(1.9, 3.0, seg(0.2, 0.6, q)) : 1.9) : asp < 1.25 ? 1.35 : 1;
  const off = c.p.clone().sub(c.t).multiplyScalar(k);
  camera.position.copy(c.t).add(off);
  camera.lookAt(c.t);
  const dist = off.length();
  scene.fog.near = dist * 1.6; scene.fog.far = dist * 4.2 + 60;
  sky.position.copy(camera.position); stars.position.copy(camera.position);
  moon.position.copy(camera.position).add(V(-260, 330, -520)); moon.lookAt(camera.position);
  sun.position.copy(c.t).add(V(...pal.dir).normalize().multiplyScalar(90));
  sun.target.position.copy(c.t);
  const sh2 = Math.min(60, Math.max(22, dist * 0.9));
  if (sun.shadow.camera.right !== sh2) { Object.assign(sun.shadow.camera, { left: -sh2, right: sh2, top: sh2, bottom: -sh2 }); sun.shadow.camera.updateProjectionMatrix(); }
  // 光點
  scene.updateMatrixWorld();
  const now = S.ember(q, t);
  let e = now;
  if (bi > 0 && q < TRAVEL) {
    const prev = SC[bi - 1].ember(1, t);
    if (prev && now) e = { p: arcPos(prev.p, now.p, EIO(q / TRAVEL), Math.min(16, prev.p.distanceTo(now.p) * 0.25)), s: lerp(prev.s, now.s, q / TRAVEL) };
  }
  ember.visible = !!e;
  if (e) {
    ember.position.copy(e.p);
    const pulse = 1 + Math.sin(t * 2.4) * 0.08;
    ember.scale.setScalar(e.s * pulse);
    emberLight.intensity = 3 * pal.night * e.s;
  }
  // 劇情卡
  const showCard = bi === LAST ? q > 0.4 : q > 0.3 && q < 0.965;
  setCard(bi, showCard);
  LABELS.forEach((L) => { L.el.classList.toggle('on', L.want); });
  waveSea(t);
}

function resize() {
  const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 40 : 30;
  camera.updateProjectionMatrix();
}
resize();
addEventListener('resize', resize);

// ───────────── 捲動 + 自動播放 ─────────────
docEl.style.scrollBehavior = 'auto';
const readScroll = () => {
  const max = film.offsetHeight - innerHeight;
  const y = Math.min(Math.max(scrollY - film.offsetTop, 0), max);
  P = max > 0 ? y / max : 0;
};
addEventListener('scroll', readScroll, { passive: true });
readScroll();
Psm = P;
let seekT = null;
window.__abSeek = (p, t) => { P = Psm = p; seekT = t ?? null; render(); };

let autoScroll = null, playing = false, lastUserMs = performance.now();
const glideTo = (targetY, dur = 2400) => { autoScroll = { from: scrollY, to: targetY, t0: performance.now(), dur }; };
const cancel = () => { autoScroll = null; lastUserMs = performance.now(); };
addEventListener('wheel', cancel, { passive: true });
addEventListener('touchstart', cancel, { passive: true });
addEventListener('keydown', cancel, { passive: true });
document.querySelector('.ab-play').addEventListener('click', () => {
  playing = true;
  glideTo(film.offsetTop + (film.offsetHeight - innerHeight) * 0.004, 1800);
});
let visible = true;
new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { rootMargin: '200px' }).observe(film);

const PLAY_SEC = 150;
let prevMs = performance.now(), endSeen = false;
function render() {
  const now = performance.now();
  const dt = Math.min(0.05, Math.max(0, (now - prevMs) / 1000));
  prevMs = now;
  if (autoScroll) {
    const u = Math.min(1, (now - autoScroll.t0) / autoScroll.dur);
    scrollTo(0, lerp(autoScroll.from, autoScroll.to, EIO(u)));
    if (u >= 1) autoScroll = null;
  }
  // 按過 ▶ 且 0.8 秒沒有使用者操作，就以電影節奏續播（整片約 2 分半）
  if (playing && !autoScroll && !endSeen && P > 0.001 && P < 0.998 && now - lastUserMs > 800) {
    const max = film.offsetHeight - innerHeight;
    scrollTo(0, Math.min(film.offsetTop + max, scrollY + (max / PLAY_SEC) * dt));
  }
  if (P > 0.997) endSeen = true;
  Psm += (P - Psm) * Math.min(1, dt * 8);
  if (Math.abs(P - Psm) < 1e-5) Psm = P;
  const t = seekT ?? (now - t0) / 1000;
  frame(Psm, t);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
const tick = () => { requestAnimationFrame(tick); if (visible) render(); };
tick();
}
