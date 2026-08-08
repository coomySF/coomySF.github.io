/* Homepage film v5 — the rescue voyage.
   Wild AIs chase the crew on their planets; the rocket rescues RD, PM, QA;
   the AI swarm boards the hull; SpecFormula streaks in, the rocket
   super-evolves, and the wild AIs become cute pets everyone walks off with.
   Scroll drives everything; the title screen holds still until START. */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const docEl = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 640px)').matches || new URLSearchParams(location.search).has('mobile');

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

if (reduced || !webglOK() || typeof gsap === 'undefined') {
  docEl.classList.add('film-static');
} else {
  boot();
}

function ss(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function lerp(a, b, t) { return a + (b - a) * t; }

function boot() {
  gsap.registerPlugin(ScrollTrigger);
  docEl.style.scrollBehavior = 'auto';  // site smooth-scroll fights Lenis

  const lenis = typeof Lenis !== 'undefined' ? new Lenis({ lerp: 0.1 }) : null;
  if (lenis) {
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const canvas = document.getElementById('film-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const DPR = Math.min(devicePixelRatio, small ? 1.2 : 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b100e');
  scene.fog = new THREE.FogExp2('#0b100e', 0.02);

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 120);
  camera.position.set(0, 0, 10);

  // the story owns the first stretch of scroll; the epilogue (orbit →
  // triumph → cinematic close) owns the rest
  const EPI_S = 0.78;
  const STORY_CAP = 0.968;

  const rng = mulberry32(20260806);

  // ---------- dust ----------
  const DUST = small ? 2400 : 9000;
  const dustPos = new Float32Array(DUST * 3);
  const dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    const r = 7 + 14 * Math.cbrt(rng());
    const th = rng() * Math.PI * 2;
    const ph = Math.acos(2 * rng() - 1);
    dustPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    dustPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7;
    dustPos[i * 3 + 2] = r * Math.cos(ph) - 6;
    dustSeed[i] = rng();
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(dustSeed, 1));
  const dustUniforms = {
    uTime: { value: 0 },
    uSize: { value: DPR * 2.2 },
    uDim: { value: 0.55 },
    uWarm: { value: 0.35 },
    uTurb: { value: 0.5 },
    uColorA: { value: new THREE.Color('#9db8c8') },
    uColorB: { value: new THREE.Color('#dc947c') },
  };
  const dustMat = new THREE.ShaderMaterial({
    uniforms: dustUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aSeed;
      uniform float uTime, uSize, uTurb;
      varying float vSeed, vDepth;
      void main() {
        vec3 p = position;
        float t = uTime * 0.3 + aSeed * 43.0;
        p += vec3(sin(t + p.y * 0.6), sin(t * 1.3 + p.z * 0.5), cos(t * 0.8 + p.x * 0.4)) * (0.1 + 0.25 * aSeed) * uTurb;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = -mv.z;
        gl_PointSize = uSize * (10.0 / dist) * (0.6 + aSeed * 0.8);
        vSeed = aSeed;
        vDepth = dist;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColorA, uColorB;
      uniform float uDim, uWarm;
      varying float vSeed, vDepth;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float glow = smoothstep(0.5, 0.0, d);
        vec3 col = mix(uColorA, uColorB, smoothstep(0.35, 0.95, vSeed * (0.4 + uWarm)));
        float alpha = glow * glow * uDim * clamp(3.0 / vDepth + 0.2, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  scene.add(new THREE.Points(dustGeo, dustMat));

  // ---------- the ship (wireframe, with hidden evolution parts) ----------
  const shipMat = new THREE.LineBasicMaterial({ color: '#e2ddcf', transparent: true, opacity: 0 });
  const ship = new THREE.Group();
  const edgeOf = (geo, mat = shipMat, thresholdAngle = 20) => {
    const seg = new THREE.LineSegments(new THREE.EdgesGeometry(geo, thresholdAngle), mat);
    geo.dispose();
    return seg;
  };
  const body = edgeOf(new THREE.CylinderGeometry(0.34, 0.5, 1.9, 6));
  const nose = edgeOf(new THREE.ConeGeometry(0.5, 0.85, 6));
  nose.rotation.x = Math.PI;
  nose.position.y = -1.35;
  const windowRing = edgeOf(new THREE.CircleGeometry(0.17, 12));
  windowRing.position.set(0, 0.25, 0.51);
  const finShape = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.85, 0), new THREE.Vector3(0.55, 1.05, 0), new THREE.Vector3(0, 0, 0)];
  const finGeo = new THREE.BufferGeometry().setFromPoints(finShape);
  const finL = new THREE.Line(finGeo, shipMat);
  finL.position.set(0.42, 0.35, 0);
  const finR = new THREE.Line(finGeo.clone(), shipMat);
  finR.scale.x = -1;
  finR.position.set(-0.42, 0.35, 0);
  const thrustGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.16, 1.05, 0), new THREE.Vector3(-0.16, 1.45, 0),
    new THREE.Vector3(0, 1.1, 0), new THREE.Vector3(0, 1.7, 0),
    new THREE.Vector3(0.16, 1.05, 0), new THREE.Vector3(0.16, 1.45, 0),
  ]);
  const thrust = new THREE.LineSegments(thrustGeo, shipMat);
  ship.add(body, nose, windowRing, finL, finR, thrust);

  // evolution parts: grand swept wings, an orbit ring, extra thrusters
  const evoGroup = new THREE.Group();
  const bigWing = [new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(0.2, 1.0, 0), new THREE.Vector3(1.35, 1.55, 0), new THREE.Vector3(0.55, 0.1, 0), new THREE.Vector3(0, -0.2, 0)];
  const bigWingGeo = new THREE.BufferGeometry().setFromPoints(bigWing);
  const wingL = new THREE.Line(bigWingGeo, shipMat);
  wingL.position.set(0.4, -0.1, -0.05);
  const wingR = new THREE.Line(bigWingGeo.clone(), shipMat);
  wingR.scale.x = -1;
  wingR.position.set(-0.4, -0.1, -0.05);
  const haloRing = edgeOf(new THREE.TorusGeometry(0.95, 0.02, 3, 28));
  haloRing.rotation.x = Math.PI / 2;
  haloRing.position.y = 0.1;
  const evoThrust = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.3, 1.1, 0), new THREE.Vector3(-0.3, 1.9, 0),
    new THREE.Vector3(0.3, 1.1, 0), new THREE.Vector3(0.3, 1.9, 0),
  ]), shipMat);
  evoGroup.add(wingL, wingR, haloRing, evoThrust);
  evoGroup.scale.setScalar(0.001);
  ship.add(evoGroup);

  ship.position.set(0, 0.4, 0);
  ship.visible = false;
  scene.add(ship);

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

  // ---------- crew stations (RD / PM / QA): chased on their planets ----------
  const STATION_COLORS = ['#8fb8e8', '#7ee0a8', '#ffd479', '#ff8d7a'];
  const labels = [...document.querySelectorAll('.planet-label')];
  const cryLabels = [...document.querySelectorAll('.cry-label')];
  const planetMatBase = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

  const makePlanet = (colorIdx, radius = 1.5) => {
    const group = new THREE.Group();
    const PTS = small ? 280 : 650;
    const geo = new THREE.IcosahedronGeometry(radius, 1);
    const pos = geo.getAttribute('position');
    const triCount = pos.count / 3;
    const pts = new Float32Array(PTS * 3);
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), P = new THREE.Vector3();
    for (let k = 0; k < PTS; k++) {
      const t = Math.floor(rng() * triCount);
      A.fromBufferAttribute(pos, t * 3); B.fromBufferAttribute(pos, t * 3 + 1); C.fromBufferAttribute(pos, t * 3 + 2);
      let u = rng(), v = rng();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      P.copy(A).addScaledVector(B.sub(A), u).addScaledVector(C.sub(A), v);
      const shell = rng() < 0.85 ? 1 : 0.55 + rng() * 0.35;
      pts[k * 3] = P.x * shell; pts[k * 3 + 1] = P.y * shell; pts[k * 3 + 2] = P.z * shell;
    }
    geo.dispose();
    const ballGeo = new THREE.BufferGeometry();
    ballGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const ballMat = new THREE.PointsMaterial({ ...planetMatBase, size: 0.05, color: STATION_COLORS[colorIdx], opacity: 0.9, sizeAttenuation: true });
    const ball = new THREE.Points(ballGeo, ballMat);
    group.add(ball);
    const haloMat = new THREE.SpriteMaterial({ map: glowTex, color: STATION_COLORS[colorIdx], transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(radius * 3.7);
    group.add(halo);
    group.visible = false;
    scene.add(group);
    return { group, ball, ballMat, haloMat };
  };

  const CREW_SEGMENT = 0.16;
  const crewStations = ['RD', 'PM', 'QA'].map((name, i) => {
    const planet = makePlanet(i);
    const bodyMat = new THREE.LineBasicMaterial({ color: STATION_COLORS[i], transparent: true, opacity: 1 });
    const propMat = new THREE.LineBasicMaterial({ color: '#f2efe6', transparent: true, opacity: 1 });

    // the chase happens ON the planet: crew runs, a wild AI chases
    const chaseCrew = makeCrew(i, bodyMat, propMat);
    chaseCrew.scale.setScalar(0.85);
    planet.group.add(chaseCrew);
    const chaserMat = new THREE.LineBasicMaterial({ color: '#ff5348', transparent: true, opacity: 1 });
    const chaser = makeWildAI(chaserMat, rng);
    chaser.scale.setScalar(0.8);
    planet.group.add(chaser);

    // the escape ride happens in world space
    const rideCrew = makeCrew(i, bodyMat, propMat);
    rideCrew.visible = false;
    scene.add(rideCrew);

    const side = i % 2 === 0 ? 1 : -1;
    return { name, ...planet, chaseCrew, chaser, chaserMat, rideCrew, figMats: [bodyMat, propMat], side, label: labels[i], s: 0.115 + i * CREW_SEGMENT };
  });

  // ---------- the AI planet and its swarm ----------
  const aiPlanet = makePlanet(3, 1.7);
  const aiLabel = labels[3];
  const AI_S = 0.60, AI_E = 0.74;
  const SWARM = 4;
  const HULL_OFFSETS = [
    new THREE.Vector3(-0.62, 0.35, 0.25),
    new THREE.Vector3(0.58, 0.05, 0.25),
    new THREE.Vector3(-0.35, -0.7, 0.25),
    new THREE.Vector3(0.5, -0.55, 0.25),
  ];
  const PET_COLORS = ['#ff8d7a', '#8fb8e8', '#7ee0a8', '#ffd479'];
  const PAIR_X = [-2.35, 0, 2.35];  // the three crew+pet pairs stand centered
  const swarm = Array.from({ length: SWARM }, (_, i) => {
    const wildMat = new THREE.LineBasicMaterial({ color: '#ff5348', transparent: true, opacity: 1 });
    const wild = makeWildAI(wildMat, rng);
    wild.visible = false;
    scene.add(wild);
    const petMat = new THREE.LineBasicMaterial({ color: PET_COLORS[i], transparent: true, opacity: 1 });
    const pet = makePet(petMat);
    pet.visible = false;
    scene.add(pet);
    return { wild, wildMat, pet, petMat, phase: rng() * Math.PI * 2 };
  });

  // leashes for the ending walk — sampled quadratic curves so they sag like rope
  const LEASH_PTS = 12;
  const leashes = crewStations.map(() => {
    const mat = new THREE.LineBasicMaterial({ color: '#e2ddcf', transparent: true, opacity: 0 });
    const geo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: LEASH_PTS }, () => new THREE.Vector3()));
    const line = new THREE.Line(geo, mat);
    line.visible = false;
    scene.add(line);
    return { line, mat, geo };
  });

  // SpecFormula streaks in as a comet
  const cometMat = new THREE.SpriteMaterial({ map: glowTex, color: '#fff3d6', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const comet = new THREE.Sprite(cometMat);
  comet.scale.setScalar(1.6);
  scene.add(comet);

  // fireworks for the triumph beat
  const FW_N = small ? 60 : 110;
  const FW_COLORS = ['#ffd479', '#ff8d7a', '#8fb8e8', '#7ee0a8', '#fff3d6'];
  const fwColor = new THREE.Color();
  const fireworks = [
    { at: 0.42, pos: [-3.6, 1.6, 0.5] },
    { at: 0.52, pos: [3.4, 2.3, -0.5] },
    { at: 0.62, pos: [0, 3.1, 1] },
  ].map((f) => {
    const dirs = new Float32Array(FW_N * 3);
    const cols = new Float32Array(FW_N * 3);
    for (let i = 0; i < FW_N; i++) {
      const th = rng() * Math.PI * 2, ph = Math.acos(2 * rng() - 1), r = 0.55 + rng() * 0.45;
      dirs[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      dirs[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * r;
      dirs[i * 3 + 2] = Math.cos(ph) * r * 0.6;
      fwColor.set(FW_COLORS[Math.floor(rng() * FW_COLORS.length)]);
      cols[i * 3] = fwColor.r; cols[i * 3 + 1] = fwColor.g; cols[i * 3 + 2] = fwColor.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FW_N * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const mat = new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat);
    pts.visible = false;
    scene.add(pts);
    return { ...f, dirs, geo, mat, pts };
  });

  // gold sparks for the moment the comet strikes the ship
  const IMP_N = small ? 50 : 90;
  const impDirs = new Float32Array(IMP_N * 3);
  const impCols = new Float32Array(IMP_N * 3);
  const impGold = new THREE.Color('#ffd479'), impWhite = new THREE.Color('#fff3d6');
  for (let i = 0; i < IMP_N; i++) {
    const th = rng() * Math.PI * 2, ph = Math.acos(2 * rng() - 1), r = 0.5 + rng() * 0.5;
    impDirs[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    impDirs[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * r;
    impDirs[i * 3 + 2] = Math.cos(ph) * r * 0.6;
    fwColor.copy(impGold).lerp(impWhite, rng());
    impCols[i * 3] = fwColor.r; impCols[i * 3 + 1] = fwColor.g; impCols[i * 3 + 2] = fwColor.b;
  }
  const impGeo = new THREE.BufferGeometry();
  impGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(IMP_N * 3), 3));
  impGeo.setAttribute('color', new THREE.BufferAttribute(impCols, 3));
  const impMat = new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const impPts = new THREE.Points(impGeo, impMat);
  impPts.visible = false;
  scene.add(impPts);

  // shooting stars — the title screen's quiet promise that this is a film
  const shooters = Array.from({ length: 3 }, (_, k) => {
    const mat = new THREE.LineBasicMaterial({ color: '#ffe9c9', transparent: true, opacity: 0 });
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.3, 0, 0)]);
    const line = new THREE.Line(geo, mat);
    const dx = 7 + k * 1.2, dy = -2.4 - k * 0.5;
    line.rotation.z = Math.atan2(dy, dx);
    line.visible = false;
    scene.add(line);
    return { line, mat, period: 5.5 + k * 2.7, phase: k * 2.9, x0: -7 + k * 3.6, y0: 3.6 - k * 0.9, dx, dy };
  });

  // a soft shaft of light for the cinematic close
  const rayMat = new THREE.SpriteMaterial({ map: glowTex, color: '#fff8e2', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const godRay = new THREE.Sprite(rayMat);
  godRay.scale.set(2.6, 13, 1);
  godRay.position.set(0, 2.4, 2.2);
  scene.add(godRay);

  // ---------- post ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // small screens run bloom at reduced res — keep the blur tight and the
  // threshold high there, or big glow sprites smear across the whole frame
  const bloom = new UnrealBloomPass(small ? new THREE.Vector2(384, 384) : new THREE.Vector2(innerWidth, innerHeight), 0.55, small ? 0.45 : 0.85, small ? 0.24 : 0.12);
  composer.addPass(bloom);
  const grain = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uT: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uT; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + uT) * 43758.5453); }
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        float g = (hash(vUv * 900.0) - 0.5) * 0.05;
        float vig = smoothstep(1.05, 0.35, distance(vUv, vec2(0.5)));
        gl_FragColor = vec4((c.rgb + g) * mix(0.74, 1.0, vig), c.a);
      }
    `,
  });
  if (!small) composer.addPass(grain);

  // ---------- HTML overlays ----------
  const titleEl = document.querySelector('.film-title');
  const hintEl = document.querySelector('.scroll-hint');
  const wordEl = document.querySelector('.sf-word');
  const waterballEl = document.querySelector('.waterball');
  const waterballHi = document.querySelector('.waterball-hi');
  const lbTop = document.querySelector('.letterbox-top');
  const lbBot = document.querySelector('.letterbox-bottom');
  const finEl = document.querySelector('.fin-mark');
  const teaserEl = document.querySelector('.film-teaser');

  // ---------- sound: synthesized, button reflects actual state ----------
  const soundBtn = document.querySelector('.sound-toggle');
  const sound = makeSound();
  let soundOn = false;
  let muted = localStorage.getItem('coomy-sound') === 'off';
  const setSoundUI = () => {
    soundBtn.textContent = soundOn ? 'SOUND · ON' : 'SOUND · OFF';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
  };
  const startSound = () => { sound.start(); soundOn = true; setSoundUI(); };
  soundBtn.addEventListener('click', () => {
    if (soundOn) {
      sound.stop();
      soundOn = false;
      muted = true;
      localStorage.setItem('coomy-sound', 'off');
    } else {
      muted = false;
      localStorage.setItem('coomy-sound', 'on');
      startSound();
    }
    setSoundUI();
  });
  setSoundUI();

  // START: turn on the sound (unless muted) and glide into the voyage
  const keepScrollingEl = document.querySelector('.keep-scrolling');
  let scrollPrompt = 0;
  hintEl.addEventListener('click', () => {
    if (!muted && !soundOn) startSound();
    const target = (document.getElementById('film').offsetHeight - innerHeight) * (0.115 / STORY_CAP * EPI_S);
    if (lenis) lenis.scrollTo(target, { duration: 2.4, easing: (x) => 1 - Math.pow(1 - x, 3) });
    else scrollTo({ top: target, behavior: 'smooth' });
    setTimeout(() => { scrollPrompt = 1; }, 1100);
  });

  // one-shot sound triggers on upward crossings
  const fired = { ship: false, escapes: [false, false, false], swarm: false, evolve: false, pops: [false, false, false, false], fly: false, fws: [false, false, false] };

  // camera impact impulses: set on a crossing, decay per frame — a real
  // thump no matter how fast the visitor scrolls through the moment
  let kick = 0;
  const kicked = [false, false, false, false];  // 3 boardings + the comet impact

  // ---------- scroll progress (critically damped) ----------
  let P = 0, Psm = 0, vel = 0;
  ScrollTrigger.create({
    trigger: '#film',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => { P = self.progress; },
  });
  window.__filmSeek = (p) => { P = p; Psm = p; renderFrame(); };  // QA hook

  const mouse = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / innerWidth - 0.5);
    mouse.y = (e.clientY / innerHeight - 0.5);
  }, { passive: true });

  const shipBase = new THREE.Color('#e2ddcf');
  const flareWhite = new THREE.Color('#fffdf2');
  const tmpV = new THREE.Vector3();
  const clock = new THREE.Clock();

  // per-act color grade: each planet tints the whole scene
  const baseBg = new THREE.Color('#0b100e');
  const gradeCol = new THREE.Color();
  const stationBgCols = STATION_COLORS.map((c) => new THREE.Color(c).multiplyScalar(0.22));

  function updateScene(pRaw, t, v = 0) {
    // epilogue progress: orbit → triumph → cinematic close
    const ep = Math.min(1, Math.max(0, (pRaw - EPI_S) / (1 - EPI_S)));
    // the story itself, same pacing as before, held at the tableau
    const p = Math.min(1, pRaw / EPI_S) * STORY_CAP;
    // everything softly yields to the cards at the very end
    const endFade = 1 - ss(0.94, 1, ep);
    // everyone celebrates while the camera circles them
    const cheer = Math.sin(ss(0.04, 0.36, ep) * Math.PI);

    const speed = Math.min(0.02, Math.abs(v));

    // title + hint
    const titleOp = 1 - ss(0.015, 0.06, p);
    titleEl.style.opacity = String(titleOp);
    titleEl.style.transform = `translate(-50%, -50%) translateY(${(1 - titleOp) * -42}px)`;
    titleEl.style.filter = `blur(${(1 - titleOp) * 7}px)`;
    hintEl.style.opacity = String(Math.min(1, titleOp));
    hintEl.style.pointerEvents = titleOp > 0.3 ? 'auto' : 'none';
    keepScrollingEl.style.opacity = String(scrollPrompt * ss(0.06, 0.09, p) * (1 - ss(0.135, 0.18, p)));
    if (teaserEl) teaserEl.style.opacity = String(titleOp * (0.5 + 0.14 * Math.sin(t * 1.6)));

    // shooting stars: bright over the title, subtle during the voyage
    const shootAmp = 0.25 + 0.75 * titleOp;
    shooters.forEach((s) => {
      const u = ((t + s.phase) % s.period) / 1.1;
      const on = u < 1;
      s.line.visible = on;
      if (!on) return;
      s.line.position.set(s.x0 + s.dx * u, s.y0 + s.dy * u, -2.5);
      s.mat.opacity = Math.sin(u * Math.PI) * 0.75 * shootAmp;
    });

    // ship — a small cameo drifting through the title screen, then the hero
    const sa = ss(0.045, 0.1, p);
    const flare = Math.sin(sa * Math.PI);
    const hero = ss(0.03, 0.09, p);
    ship.visible = sa > 0.01 || titleOp > 0.01;
    ship.position.y = lerp(2.0 + Math.sin(t * 0.5) * 0.18, 0.4 + Math.sin(t * 0.9) * 0.09, hero);
    ship.rotation.z = lerp(-0.5 + Math.sin(t * 0.3) * 0.06, mouse.x * 0.1 + Math.sin(t * 0.55) * 0.04, hero);
    thrust.scale.y = 0.85 + 0.3 * Math.abs(Math.sin(t * 7));

    // evolution + rainbow
    const evo = ss(0.82, 0.865, p);
    evoGroup.scale.setScalar(Math.max(0.001, evo));
    const f = ss(0.84, 0.885, p);
    const cometQ = ss(0.76, 0.82, p);
    const evoFlash = Math.sin(ss(0.815, 0.85, p) * Math.PI);
    if (f > 0.001) {
      const hue = (t * 0.45) % 1;
      const rainbow = new THREE.Color().setHSL(hue, 0.8, 0.62);
      shipMat.color.copy(shipBase).lerp(rainbow, f);
    } else {
      shipMat.color.copy(shipBase).lerp(flareWhite, Math.max(flare * 0.85, evoFlash));
    }
    ship.scale.setScalar(lerp(0.34, (0.5 + 0.5 * sa) * (1 + 0.18 * evo + 0.04 * Math.sin(t * 6) * f), hero));
    shipMat.opacity = Math.max(sa, titleOp * 0.6) * endFade;
    bloom.strength = 0.55 + f * 0.9 + flare * 0.75 + evoFlash * 1.1;
    dustUniforms.uWarm.value = 0.35 + f * 0.65;
    dustUniforms.uTurb.value = 0.5 + f * 0.9 + speed * 26;

    // SpecFormula comet
    cometMat.opacity = Math.sin(cometQ * Math.PI) * endFade;
    comet.position.set(lerp(-9, ship.position.x, cometQ), lerp(5.5, ship.position.y, cometQ), 1.5);

    // gold sparks fly on impact
    const iq = Math.min(1, Math.max(0, (p - 0.818) / 0.07));
    const impOn = iq > 0 && iq < 1;
    impPts.visible = impOn;
    if (impOn) {
      const ir = 1 - Math.pow(1 - iq, 3);
      const posAttr = impGeo.getAttribute('position');
      for (let i = 0; i < IMP_N; i++) {
        posAttr.setXYZ(
          i,
          ship.position.x + impDirs[i * 3] * ir * 1.9,
          ship.position.y + impDirs[i * 3 + 1] * ir * 1.9 - iq * iq * 0.4,
          impDirs[i * 3 + 2] * ir * 1.9
        );
      }
      posAttr.needsUpdate = true;
      impMat.opacity = Math.sin(iq * Math.PI);
    }

    // the wordmark — it steps aside while the camera circles the crew
    const dip = 1 - cheer * 0.9;
    const wordOp = ss(0.88, 0.93, p) * endFade * dip;
    wordEl.style.opacity = String(wordOp);
    wordEl.style.transform = `translate(-50%, -78%) translateY(${(1 - wordOp) * 20}px) scale(${0.92 + 0.08 * wordOp})`;
    wordEl.style.letterSpacing = `${lerp(0.14, 0.02, wordOp)}em`;
    wordEl.style.filter = `blur(${(1 - wordOp) * 9}px) drop-shadow(0 0 34px rgba(255, 200, 150, .35))`;

    // the waterball crawls out from behind the S to say hi
    const wbQ = ss(0.93, 0.958, p);
    const wbOp = wbQ * endFade * dip;
    waterballEl.style.opacity = String(wbOp);
    if (wbOp > 0.01) {
      const r = wordEl.getBoundingClientRect();
      const sx = r.left + r.width * 0.052;              // the S
      const k = wbQ;
      const overshoot = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);  // ease-out-back
      const y = r.top + r.height * lerp(0.6, 0.2, overshoot);  // climbs from behind the glyph to perch on the S
      waterballEl.style.transform = `translate(-50%, -96%) translate(${sx}px, ${y}px) rotate(${Math.sin(t * 3.1) * 9 * wbQ}deg) scale(${0.5 + 0.5 * wbQ})`;
      waterballHi.style.opacity = String(ss(0.952, 0.962, p) * endFade * dip * (0.75 + 0.25 * Math.sin(t * 2.4)));
    } else {
      waterballHi.style.opacity = '0';
    }

    // ---- crew stations: chase, then escape ----
    const w = innerWidth, h = innerHeight;
    let lean = 0, env = 0, gradeIdx = -1, gradeAmt = 0;
    crewStations.forEach((st, i) => {
      const q = (p - st.s) / CREW_SEGMENT;
      const active = q > 0 && q < 1.05;
      st.group.visible = active;
      st.rideCrew.visible = false;
      if (st.label) st.label.style.opacity = '0';
      if (cryLabels[i]) cryLabels[i].style.opacity = '0';
      if (!active) return;

      const enter = ss(0, 0.22, q);
      const exit = ss(0.85, 1, q);
      const y = lerp(-16, -3.1, enter) + exit * 18;
      const x = st.side * lerp(4.2, 3.1, enter);
      st.group.position.set(x, y, -1.2);
      st.group.rotation.z = 0;

      // the planet lives: slow spin, halo breathing with the visit
      const stay = Math.sin(Math.min(1, Math.max(0, q)) * Math.PI);
      st.ball.rotation.y = t * 0.16 + i * 2;
      st.haloMat.opacity = 0.14 + stay * 0.1;
      env = Math.max(env, stay);
      if (stay > gradeAmt) { gradeAmt = stay; gradeIdx = i; }

      // the chase: crew flees along the surface, wild AI right behind
      // (held long — this beat is the heart of the act)
      // each station is more dangerous: faster chase, smaller gap
      const escaped = q > 0.62;
      const chaseAngle = t * (1.5 + i * 0.35) + i * 2;
      st.chaseCrew.visible = !escaped;
      if (!escaped) {
        st.chaseCrew.position.set(Math.cos(chaseAngle) * 1.75, Math.sin(chaseAngle) * 1.75, 0.15);
        st.chaseCrew.rotation.z = chaseAngle - Math.PI / 2;
      }

      // the cry for help, bobbing above the fleeing crew member
      const cry = cryLabels[i];
      if (cry) {
        const cryOp = escaped ? 0 : ss(0.14, 0.24, q) * (1 - ss(0.57, 0.62, q));
        if (cryOp > 0.01) {
          const wx = x + st.chaseCrew.position.x;
          const wy = y + st.chaseCrew.position.y + 0.85;
          tmpV.set(wx, wy, -1.05).project(camera);
          cry.style.transform = `translate(-50%, -100%) translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h}px) rotate(${Math.sin(t * (9 + i * 3) + i) * (4 + i * 3.5)}deg) scale(${1 + i * 0.09})`;
        }
        cry.style.opacity = String(cryOp);
      }
      const chaserAngle = chaseAngle - (0.62 - i * 0.16) - (escaped ? Math.sin(t * 9) * 0.06 : 0);
      st.chaser.position.set(Math.cos(chaserAngle) * 1.78, Math.sin(chaserAngle) * 1.78, 0.15);
      st.chaser.rotation.z = chaserAngle - Math.PI / 2 + Math.sin(t * 12) * 0.14;
      st.chaser.scale.setScalar(0.8 + (escaped ? Math.abs(Math.sin(t * 10)) * 0.12 : Math.abs(Math.sin(t * 6 + i)) * 0.05));  // menace pulse; fumes when the meal escapes

      // the escape: crew leaps off the planet into the ship
      if (q > 0.62 && q < 0.9) {
        const born = ss(0.62, 0.66, q);
        const ride = ss(0.64, 0.8, q);
        const gone = ss(0.8, 0.86, q);
        const fromX = x, fromY = y + 1.9;
        const arc = Math.sin(ride * Math.PI) * 1.3;
        st.rideCrew.visible = true;
        st.rideCrew.scale.setScalar(0.9 * born * (1 - gone * 0.6));
        st.figMats.forEach((m) => { m.opacity = born * (1 - gone); });
        st.rideCrew.position.set(
          lerp(fromX, ship.position.x, ride) + st.side * arc * 0.3,
          lerp(fromY, ship.position.y - 0.3, ride) + arc,
          lerp(-1.2, 0, ride)
        );
        st.rideCrew.rotation.z = ride * st.side * -0.7;
      } else {
        st.figMats.forEach((m) => { m.opacity = 1; });
      }

      lean += st.side * Math.sin(Math.min(1, Math.max(0, q)) * Math.PI);

      if (st.label) {
        const op = ss(0.12, 0.24, q) * (1 - ss(0.74, 0.84, q));
        tmpV.copy(st.group.position).project(camera);
        st.label.style.transform = `translate(-50%, -50%) translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h}px)`;
        st.label.style.opacity = String(op);
      }
    });

    // ---- the AI planet: the swarm notices, leaps, and clings ----
    const aq = (p - AI_S) / (AI_E - AI_S);
    const aiActive = aq > 0 && aq < 1.05;
    let aiEnv = 0;
    aiPlanet.group.visible = aiActive;
    if (aiLabel) aiLabel.style.opacity = '0';
    if (cryLabels[3]) cryLabels[3].style.opacity = '0';
    if (aiActive) {
      const enter = ss(0, 0.3, aq);
      const exit = ss(0.82, 1, aq);
      const y = lerp(-16, -3.0, enter) + exit * 18;
      const x = -3.2;
      aiPlanet.group.position.set(x, y, -1.2);
      aiEnv = Math.sin(Math.min(1, Math.max(0, aq)) * Math.PI);
      aiPlanet.ball.rotation.y = t * 0.12;
      aiPlanet.haloMat.opacity = 0.14 + aiEnv * 0.1;
      env = Math.max(env, aiEnv);
      if (aiEnv > gradeAmt) { gradeAmt = aiEnv; gradeIdx = 3; }
      if (aiLabel) {
        const op = ss(0.12, 0.24, aq) * (1 - ss(0.7, 0.8, aq));
        tmpV.copy(aiPlanet.group.position).project(camera);
        aiLabel.style.transform = `translate(-50%, -50%) translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h}px)`;
        aiLabel.style.opacity = String(op);
      }
      // the swarm spots its favorite species
      const aiCry = cryLabels[3];
      if (aiCry) {
        const op = ss(0.2, 0.28, aq) * (1 - ss(0.5, 0.58, aq));
        if (op > 0.01) {
          tmpV.set(x + 0.4, y + 2.4, -1.05).project(camera);
          aiCry.style.transform = `translate(-50%, -100%) translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h}px) rotate(${Math.sin(t * 11) * 3}deg)`;
        }
        aiCry.style.opacity = String(op);
      }
    }

    // swarm lifecycle: on planet → leap to hull → cling → become pets → walk off
    const petQ = ss(0.86, 0.9, p);          // transformation window
    const walkQ = ss(0.9, 0.955, p);        // disembark and walk
    if (cryLabels[4]) cryLabels[4].style.opacity = '0';
    swarm.forEach((sw, i) => {
      const leap = ss(0.35 + i * 0.05, 0.55 + i * 0.05, aq);
      const onPlanet = aiActive && leap < 0.02;
      const clinging = (aiActive && leap >= 0.02) || (p > AI_E && petQ < 1 && walkQ < 0.01);

      sw.wild.visible = false;
      sw.pet.visible = false;

      if (onPlanet) {
        const ang = t * 0.9 + sw.phase;
        sw.wild.visible = true;
        sw.wild.position.set(
          aiPlanet.group.position.x + Math.cos(ang) * 1.95,
          aiPlanet.group.position.y + Math.sin(ang) * 1.95,
          -1.05
        );
        sw.wild.rotation.z = ang - Math.PI / 2 + Math.sin(t * 10 + i) * 0.2;
        sw.wild.scale.setScalar(0.7);
      } else if (clinging && petQ < 0.99) {
        // mid-leap or clinging to the hull, shivering with excitement
        const from = aiActive
          ? tmpV.set(aiPlanet.group.position.x, aiPlanet.group.position.y + 1.9, -1.05)
          : tmpV.set(ship.position.x, ship.position.y, 0);
        const hull = HULL_OFFSETS[i];
        const hx = ship.position.x + hull.x * ship.scale.x;
        const hy = ship.position.y + hull.y * ship.scale.y;
        const k = aiActive ? leap : 1;
        const arc = Math.sin(k * Math.PI) * 1.6;
        if (petQ < 0.02) {
          sw.wild.visible = true;
          sw.wild.position.set(lerp(from.x, hx, k), lerp(from.y, hy, k) + arc * (aiActive ? 1 : 0), hull.z);
          sw.wild.rotation.z = Math.sin(t * 11 + sw.phase) * 0.22;
          sw.wild.scale.setScalar(0.7);
        } else {
          // pop! the wild AI becomes a cute pet on the hull
          const pop = Math.sin(Math.min(1, petQ * 1.6 - i * 0.12) * Math.PI);
          sw.pet.visible = true;
          sw.pet.position.set(hx, hy, hull.z);
          sw.pet.rotation.z = Math.sin(t * 3 + i) * 0.08;
          sw.pet.scale.setScalar(0.7 + Math.max(0, pop) * 0.25);
          sw.petMat.opacity = endFade;
        }
      } else if (walkQ > 0.01) {
        sw.pet.visible = true;
        sw.petMat.opacity = endFade;
        if (i < 3) {
          // leashed pets: bouncy, counter-phased to their humans
          const gx = PAIR_X[i] + 0.52;
          const gy = -2.62;
          const hop = Math.abs(Math.sin(t * 3.6 + i * 1.7 + Math.PI)) * 0.2 * walkQ
            + Math.abs(Math.sin(t * 4.2)) * 0.34 * cheer;
          sw.pet.position.set(
            lerp(ship.position.x + HULL_OFFSETS[i].x, gx, walkQ),
            lerp(ship.position.y + HULL_OFFSETS[i].y, gy, walkQ) + Math.sin(walkQ * Math.PI) * 1.2 + hop,
            lerp(HULL_OFFSETS[i].z, 3, walkQ)
          );
          sw.pet.rotation.z = Math.sin(t * 5.2 + i * 2) * 0.22 * walkQ;
          const squash = Math.sin(t * 7.2 + i * 1.7) * 0.08 * walkQ;
          sw.pet.scale.set(0.75 * (1 - squash * 0.7), 0.75 * (1 + squash), 0.75);
        } else {
          // the free spirit: drifting and tumbling around everyone
          const fx = Math.cos(t * 0.45) * 3.6;
          const fy = -1.65 + Math.sin(t * 0.9) * 0.85;
          const fz = 3 + Math.sin(t * 0.45) * 0.9;
          sw.pet.position.set(
            lerp(ship.position.x + HULL_OFFSETS[i].x, fx, walkQ),
            lerp(ship.position.y + HULL_OFFSETS[i].y, fy, walkQ),
            lerp(HULL_OFFSETS[i].z, fz, walkQ)
          );
          sw.pet.rotation.z = t * 2.2;  // rolling, always rolling — at a lazy pace
          sw.pet.scale.setScalar(0.72 + Math.sin(t * 2.2) * 0.05);

          // the proud declaration, tumbling along with it
          const petCry = cryLabels[4];
          if (petCry && walkQ > 0.6) {
            tmpV.copy(sw.pet.position).project(camera);
            petCry.style.transform = `translate(-50%, -100%) translate(${(tmpV.x * 0.5 + 0.5) * innerWidth}px, ${(-tmpV.y * 0.5 + 0.5) * innerHeight - 26}px) rotate(${Math.sin(t * 4.2) * 8}deg)`;
            petCry.style.opacity = String(ss(0.6, 0.8, walkQ) * endFade);
          }
        }
      }
    });

    // ---- the ending walk: crew steps off, each leading a pet, centered ----
    crewStations.forEach((st, i) => {
      const gx = PAIR_X[i] - 0.45;
      const gy = -2.5;
      if (walkQ > 0.01) {
        st.rideCrew.visible = true;
        st.figMats.forEach((m) => { m.opacity = endFade; });
        const hop = Math.abs(Math.sin(t * 3.6 + i * 1.7)) * 0.16 * walkQ
          + Math.abs(Math.sin(t * 4.2)) * 0.26 * cheer;
        st.rideCrew.position.set(
          lerp(ship.position.x, gx, walkQ) + Math.sin(t * 1.3 + i * 2.4) * 0.07 * walkQ,
          lerp(ship.position.y - 0.3, gy, walkQ) + Math.sin(walkQ * Math.PI) * 0.9 + hop,
          lerp(0, 3, walkQ)
        );
        st.rideCrew.rotation.z = Math.sin(t * 3.6 + i * 1.7) * 0.11 * walkQ;
        const squash = Math.sin(t * 7.2 + i * 1.2) * 0.06 * walkQ;
        st.rideCrew.scale.set(1.05 * (1 - squash * 0.7), 1.05 * (1 + squash), 1.05);
      }
      // leash from crew hand to pet
      const le = leashes[i];
      const sw = swarm[i];
      const show = walkQ > 0.6 && sw.pet.visible;
      le.line.visible = show;
      if (show) {
        const a = st.rideCrew.position, b = sw.pet.position;
        const ax = a.x + 0.2, ay = a.y + 0.1, az = a.z;
        const bx = b.x, by = b.y + 0.3, bz = b.z;
        const cx = (ax + bx) / 2, cy = Math.min(ay, by) - 0.38 + Math.sin(t * 2.2 + i) * 0.03, cz = (az + bz) / 2;
        const posAttr = le.geo.getAttribute('position');
        for (let k = 0; k < LEASH_PTS; k++) {
          const u = k / (LEASH_PTS - 1);
          const iu = 1 - u;
          posAttr.setXYZ(
            k,
            iu * iu * ax + 2 * iu * u * cx + u * u * bx,
            iu * iu * ay + 2 * iu * u * cy + u * u * by,
            iu * iu * az + 2 * iu * u * cz + u * u * bz
          );
        }
        posAttr.needsUpdate = true;
        le.mat.opacity = ss(0.6, 0.85, walkQ) * 0.6 * endFade;
      }
    });

    // piloted feel (the cameo waits off to the side during the title)
    ship.rotation.z += lean * -0.13;
    ship.position.x = lean * 0.5 + (1 - hero) * (3.3 + Math.sin(t * 0.4) * 0.2);

    // ---- epilogue beat 2: the victory lap ----
    const fb = ss(0.4, 0.64, ep);
    const fly = Math.sin(fb * Math.PI);
    ship.position.z = fly * 2.2;   // absolute — never accumulate across frames
    if (fly > 0.001) {
      ship.position.x += Math.sin(fb * Math.PI * 2) * 4.8 * fly;
      ship.position.y += fly * 2.7;
      ship.rotation.z += -Math.cos(fb * Math.PI * 2) * 0.8 * fly;  // banking
      thrust.scale.y = 1.2 + fly * 1.6;
      comet.position.copy(ship.position);
      comet.scale.setScalar(1.2 + fly * 1.6);
      cometMat.opacity = Math.max(cometMat.opacity, fly * 0.85 * endFade);
    }
    bloom.strength += fly * 0.4;
    dustUniforms.uTurb.value += fly * 1.4;

    fireworks.forEach((fw) => {
      const q = Math.min(1, Math.max(0, (ep - fw.at) / 0.2));
      const on = q > 0 && q < 1;
      fw.pts.visible = on;
      if (!on) return;
      const r = 1 - Math.pow(1 - q, 3);   // ease-out expansion
      const drop = q * q * 0.55;          // gravity pulls the sparks down
      const posAttr = fw.geo.getAttribute('position');
      for (let i = 0; i < FW_N; i++) {
        posAttr.setXYZ(
          i,
          fw.pos[0] + fw.dirs[i * 3] * r * 2.6,
          fw.pos[1] + fw.dirs[i * 3 + 1] * r * 2.6 - drop,
          fw.pos[2] + fw.dirs[i * 3 + 2] * r * 2.6
        );
      }
      posAttr.needsUpdate = true;
      fw.mat.opacity = Math.sin(q * Math.PI) * endFade;
    });

    // ---- epilogue beat 3: the cinematic close ----
    const rayQ = ss(0.7, 0.86, ep);
    rayMat.opacity = rayQ * 0.16 * endFade;
    dustUniforms.uDim.value = 0.55 * (1 - rayQ * 0.55);

    const lb = ss(0.68, 0.85, ep);
    lbTop.style.height = lbBot.style.height = `${lb * 9}vh`;
    lbTop.style.opacity = lbBot.style.opacity = String(Math.min(1, lb * 2) * endFade);

    // a metallic glint sweeps once across the wordmark
    const glint = ss(0.78, 0.96, ep);
    if (glint > 0.001 && glint < 0.999) {
      const gx = -30 + glint * 160;
      wordEl.style.backgroundImage =
        `linear-gradient(100deg, rgba(255,255,255,0) ${gx - 12}%, rgba(255,255,255,.95) ${gx}%, rgba(255,255,255,0) ${gx + 12}%),` +
        ' linear-gradient(100deg, #ff8d7a, #ffd479, #7ee0a8, #7ab8ff, #c98bff, #ff8d7a)';
      wordEl.style.backgroundSize = '100% 100%, 400% 100%';
    } else {
      wordEl.style.backgroundImage = '';
      wordEl.style.backgroundSize = '';
    }

    finEl.style.opacity = String(ss(0.88, 0.97, ep) * endFade);

    // ---- the scene breathes with each act ----
    const act = Math.max(env, aiEnv);
    // color grade: station acts tint the night; the AI act is a red alert
    // (small screens skip the grain pass and render hotter — tint gently there)
    const gradeMix = (gradeIdx === 3 ? gradeAmt * (0.5 + Math.sin(t * 3.2) * 0.1) : gradeAmt * 0.3) * (small ? 0.4 : 1);
    gradeCol.copy(baseBg);
    if (gradeIdx >= 0) gradeCol.lerp(stationBgCols[gradeIdx], gradeMix);
    scene.background.copy(gradeCol);
    scene.fog.color.copy(gradeCol);
    bloom.strength += act * 0.22;

    // warp cruise between stops: wide lens, rushing dust, a longer flame
    const travel = (1 - act) * ss(0.115, 0.16, p) * (1 - ss(0.74, 0.79, p));
    dustUniforms.uTurb.value += travel * 2.2;
    dustUniforms.uSize.value = DPR * 2.2 * (1 + travel * 0.8);
    thrust.scale.y *= 1 + travel * 1.3;

    // camera: dolly INTO each act so the chase fills the frame, drift toward
    // the planet, impact impulses — then the epilogue's orbit + dolly-in
    const driftX = lean * 0.7 - aiEnv * 0.6;
    const driftY = -Math.abs(lean) * 0.22 - aiEnv * 0.2;
    camera.position.x += (mouse.x * 1.3 + driftX - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y * 0.8 + driftY - camera.position.y) * 0.05;
    camera.position.x += Math.sin(t * 49) * 0.26 * kick;
    camera.position.y += Math.cos(t * 57) * 0.2 * kick;
    let lz = 10 - act * 2.6, lookY = -act * 1.15, lookZ = 0;
    let lookX = lean * 0.9 - aiEnv * 1.3;
    if (ep > 0.001) {
      const camE = ss(0.0, 0.07, ep);
      const swing = Math.sin(ss(0.0, 0.38, ep) * Math.PI) * 0.85;  // out and back around the tableau
      const push = ss(0.68, 0.97, ep);                              // final slow dolly-in
      const R = 8.6 - push * 2.1;
      const ox = Math.sin(swing) * R;
      const oz = 1.4 + Math.cos(swing) * R;
      const oy = -0.55 - push * 0.35;
      camera.position.x = lerp(camera.position.x, ox + mouse.x * 0.5, camE);
      camera.position.y = lerp(camera.position.y, oy - mouse.y * 0.35, camE);
      lz = lerp(lz, oz, camE);
      lookX = lerp(lookX, 0, camE);
      lookY = lerp(lookY, -0.9, camE);
      lookZ = lerp(lookZ, 1.4, camE);
    }
    camera.position.z = lz - evoFlash * 0.9;  // the evolution punch-in
    camera.lookAt(lookX, lookY, lookZ);
    camera.rotation.z += lean * 0.045 - aiEnv * 0.03 + evoFlash * 0.03 + Math.sin(t * 43) * 0.014 * kick;  // dutch angle + impact roll
    const targetFov = 50 + speed * 240 + travel * 16 - evoFlash * 4 - act * 4;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }
  }

  function renderFrame() {
    const t = clock.getElapsedTime();
    const dp = P - Psm;
    Psm += dp * 0.14;
    vel = lerp(vel, dp, 0.2);
    dustUniforms.uTime.value = t;
    grain.uniforms.uT.value = t;

    const spsK = Math.min(1, Psm / EPI_S) * STORY_CAP;
    for (let i = 0; i < 3; i++) {
      const bp = 0.115 + i * CREW_SEGMENT + CREW_SEGMENT * 0.8;  // the landing
      if (!kicked[i] && spsK > bp) { kicked[i] = true; kick = Math.max(kick, 1); }
      if (kicked[i] && spsK < bp - 0.05) kicked[i] = false;
    }
    if (!kicked[3] && spsK > 0.822) { kicked[3] = true; kick = Math.max(kick, 1.35); }
    if (kicked[3] && spsK < 0.78) kicked[3] = false;
    kick *= 0.9;
    if (kick < 0.001) kick = 0;

    updateScene(Psm, t, vel);

    if (soundOn) {
      const sps = Math.min(1, Psm / EPI_S) * STORY_CAP;
      const eps = Math.min(1, Math.max(0, (Psm - EPI_S) / (1 - EPI_S)));
      if (!fired.ship && sps > 0.075) { fired.ship = true; sound.flare(); }
      if (fired.ship && sps < 0.03) fired.ship = false;
      for (let i = 0; i < 3; i++) {
        const bp = 0.115 + i * CREW_SEGMENT + CREW_SEGMENT * 0.66;
        if (!fired.escapes[i] && sps > bp) { fired.escapes[i] = true; sound.board(i); }
        if (fired.escapes[i] && sps < bp - 0.08) fired.escapes[i] = false;
      }
      if (!fired.swarm && sps > AI_S + 0.06) { fired.swarm = true; sound.swarm(); }
      if (fired.swarm && sps < AI_S) fired.swarm = false;
      if (!fired.evolve && sps > 0.825) { fired.evolve = true; sound.finale(); }
      if (fired.evolve && sps < 0.78) fired.evolve = false;
      for (let i = 0; i < 4; i++) {
        const pp = 0.865 + i * 0.012;
        if (!fired.pops[i] && sps > pp) { fired.pops[i] = true; sound.pop(i); }
        if (fired.pops[i] && sps < 0.84) fired.pops[i] = false;
      }
      if (!fired.fly && eps > 0.42) { fired.fly = true; sound.flare(); }
      if (fired.fly && eps < 0.36) fired.fly = false;
      for (let i = 0; i < 3; i++) {
        const fp = 0.45 + i * 0.1;
        if (!fired.fws[i] && eps > fp) { fired.fws[i] = true; sound.pop(i + 1); }
        if (fired.fws[i] && eps < fp - 0.08) fired.fws[i] = false;
      }
    }

    composer.render();
  }

  let frameFlip = false;
  const tick = () => {
    requestAnimationFrame(tick);
    if (small) { frameFlip = !frameFlip; if (frameFlip) return; }  // ~30fps is plenty on phones
    renderFrame();
  };
  tick();

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });
}

/* Synthesized sound design — no audio files, all Web Audio. */
function makeSound() {
  let ctx = null, master, windGain, windFilter;

  const ensure = () => {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    const noise = ctx.createBufferSource();
    noise.buffer = buf; noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass'; nf.frequency.value = 180;
    const ag = ctx.createGain(); ag.gain.value = 0.05;
    noise.connect(nf); nf.connect(ag); ag.connect(master); noise.start();
    const drone = ctx.createOscillator();
    drone.frequency.value = 55;
    const dg = ctx.createGain(); dg.gain.value = 0.016;
    drone.connect(dg); dg.connect(master); drone.start();

    const wind = ctx.createBufferSource();
    wind.buffer = buf; wind.loop = true; wind.playbackRate.value = 1.8;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass'; windFilter.frequency.value = 520; windFilter.Q.value = 0.6;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    wind.connect(windFilter); windFilter.connect(windGain); windGain.connect(master); wind.start();
  };

  const blip = (f, delay = 0, dur = 0.18, type = 'triangle', vol = 0.1) => {
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = f;
    const g = ctx.createGain();
    const now = ctx.currentTime + delay;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(master);
    o.start(now); o.stop(now + dur + 0.05);
  };

  return {
    start() { ensure(); ctx.resume(); master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.4); },
    stop() { if (ctx) master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5); },
    flare() {
      if (!ctx) return;
      const o = ctx.createOscillator();
      const now = ctx.currentTime;
      o.type = 'sine';
      o.frequency.setValueAtTime(220, now);
      o.frequency.exponentialRampToValueAtTime(880, now + 0.7);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.09, now + 0.15);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      o.connect(g); g.connect(master);
      o.start(now); o.stop(now + 1);
    },
    board(i) {
      const roots = [660, 587, 740];
      blip(roots[i], 0, 0.16, 'triangle', 0.09);
      blip(roots[i] * 1.5, 0.09, 0.22, 'triangle', 0.07);
    },
    swarm() {
      blip(130, 0, 0.5, 'sawtooth', 0.05);
      blip(98, 0.12, 0.6, 'sawtooth', 0.05);
      blip(147, 0.24, 0.5, 'sawtooth', 0.04);
    },
    pop(i) {
      blip(880 + i * 140, 0, 0.12, 'sine', 0.08);
      blip((880 + i * 140) * 1.35, 0.06, 0.16, 'sine', 0.06);
    },
    finale() {
      if (!ctx) return;
      [262, 330, 392, 494].forEach((f) => {
        const o = ctx.createOscillator();
        o.type = 'sine'; o.frequency.value = f * 2;
        const g = ctx.createGain();
        const now = ctx.currentTime;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.045, now + 1.2);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);
        o.connect(g); g.connect(master);
        o.start(now); o.stop(now + 3.6);
      });
      for (let k = 0; k < 7; k++) blip(1100 + Math.random() * 1500, 0.4 + k * 0.22, 0.3, 'sine', 0.04);
    },
    wind(v) {
      if (!windGain) return;
      windGain.gain.value += (Math.min(0.13, v * 9) - windGain.gain.value) * 0.1;
    },
  };
}

/* Cute crew: big geodesic head, round little body, stubby cheering limbs.
   kind 0 = RD (glasses), 1 = PM (tie), 2 = QA (magnifier). */
function makeCrew(kind, bodyMat, propMat) {
  const fig = new THREE.Group();
  const head = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.17, 0), 10), bodyMat);
  head.position.y = 0.44;
  const belly = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.12, 0), 10), bodyMat);
  belly.position.y = 0.14;
  const limbs = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.1, 0.2, 0), new THREE.Vector3(-0.22, 0.34, 0),
    new THREE.Vector3(0.1, 0.2, 0), new THREE.Vector3(0.22, 0.34, 0),
    new THREE.Vector3(-0.06, 0.02, 0), new THREE.Vector3(-0.09, -0.14, 0),
    new THREE.Vector3(0.06, 0.02, 0), new THREE.Vector3(0.09, -0.14, 0),
  ]), bodyMat);
  fig.add(head, belly, limbs);

  if (kind === 0) {
    const lensL = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CircleGeometry(0.08, 10)), propMat);
    lensL.position.set(-0.09, 0.44, 0.21);
    const lensR = lensL.clone();
    lensR.position.set(0.09, 0.44, 0.21);
    const bridge = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.015, 0.44, 0.21), new THREE.Vector3(0.015, 0.44, 0.21),
    ]), propMat);
    fig.add(lensL, lensR, bridge);
  } else if (kind === 1) {
    const tie = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.06, 0.27, 0.17), new THREE.Vector3(0.06, 0.27, 0.17),
      new THREE.Vector3(0, 0.02, 0.17), new THREE.Vector3(-0.06, 0.27, 0.17),
    ]), propMat);
    fig.add(tie);
  } else {
    const lens = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CircleGeometry(0.07, 10)), propMat);
    lens.position.set(0.3, 0.42, 0.05);
    const handle = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.26, 0.36, 0.05), new THREE.Vector3(0.22, 0.33, 0.05),
    ]), propMat);
    fig.add(lens, handle);
  }
  return fig;
}

/* A wild AI: spiky, jittery, a little menacing. */
function makeWildAI(mat, rng) {
  const fig = new THREE.Group();
  const core = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.16, 0), 10), mat);
  core.position.y = 0.22;
  const spikes = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + rng() * 0.3;
    const r1 = 0.17, r2 = 0.3 + rng() * 0.1;
    spikes.push(new THREE.Vector3(Math.cos(a) * r1, 0.22 + Math.sin(a) * r1, 0));
    spikes.push(new THREE.Vector3(Math.cos(a) * r2, 0.22 + Math.sin(a) * r2, 0));
  }
  const spikeLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(spikes), mat);
  const eye = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CircleGeometry(0.05, 6)), mat);
  eye.position.set(0, 0.22, 0.17);
  fig.add(core, spikeLines, eye);
  return fig;
}

/* A tamed AI: round, big-eyed, antennae — the cute after picture. */
function makePet(mat) {
  const fig = new THREE.Group();
  const body = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.2, 0), 10), mat);
  body.position.y = 0.22;
  const limbs = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.08, 0.4, 0), new THREE.Vector3(-0.15, 0.56, 0),
    new THREE.Vector3(0.08, 0.4, 0), new THREE.Vector3(0.15, 0.56, 0),
    new THREE.Vector3(-0.1, 0.05, 0), new THREE.Vector3(-0.13, -0.1, 0),
    new THREE.Vector3(0.1, 0.05, 0), new THREE.Vector3(0.13, -0.1, 0),
  ]), mat);
  const bobL = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CircleGeometry(0.035, 6)), mat);
  bobL.position.set(-0.15, 0.6, 0);
  const bobR = bobL.clone();
  bobR.position.set(0.15, 0.6, 0);
  const eyeL = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CircleGeometry(0.045, 8)), mat);
  eyeL.position.set(-0.075, 0.26, 0.18);
  const eyeR = eyeL.clone();
  eyeR.position.set(0.075, 0.26, 0.18);
  fig.add(body, limbs, bobL, bobR, eyeL, eyeR);
  return fig;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
