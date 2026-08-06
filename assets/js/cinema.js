/* Homepage film v4 — the voyage.
   A wireframe ship appears on scroll, flies past four particle planets
   (RD → PM → QA → AI), picks up a little geometric crew member from each,
   then lights up in color as SpecFormula appears. Scroll drives everything;
   the title screen is still until the user starts. */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const docEl = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 640px)').matches;

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
  const DPR = Math.min(devicePixelRatio, small ? 1.5 : 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b100e');
  scene.fog = new THREE.FogExp2('#0b100e', 0.02);

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 120);
  camera.position.set(0, 0, 10);

  const rng = mulberry32(20260806);

  // ---------- dust ----------
  const DUST = small ? 4000 : 9000;
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

  // ---------- the ship (wireframe) ----------
  const shipMat = new THREE.LineBasicMaterial({ color: '#e2ddcf', transparent: true, opacity: 0 });
  const ship = new THREE.Group();
  const edgeOf = (geo, thresholdAngle = 20) => {
    const seg = new THREE.LineSegments(new THREE.EdgesGeometry(geo, thresholdAngle), shipMat);
    geo.dispose();
    return seg;
  };
  const body = edgeOf(new THREE.CylinderGeometry(0.34, 0.5, 1.9, 6));
  const nose = edgeOf(new THREE.ConeGeometry(0.5, 0.85, 6));
  nose.rotation.x = Math.PI;               // apex points down: direction of travel
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
  // thrust dashes above the tail (we fly downward)
  const thrustGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.16, 1.05, 0), new THREE.Vector3(-0.16, 1.45, 0),
    new THREE.Vector3(0, 1.1, 0), new THREE.Vector3(0, 1.7, 0),
    new THREE.Vector3(0.16, 1.05, 0), new THREE.Vector3(0.16, 1.45, 0),
  ]);
  const thrust = new THREE.LineSegments(thrustGeo, shipMat);
  ship.add(body, nose, windowRing, finL, finR, thrust);
  ship.position.set(0, 0.4, 0);
  ship.visible = false;
  scene.add(ship);

  // ---------- planets + pipes + crew ----------
  const STATIONS = ['RD', 'PM', 'QA', 'AI'];
  const labels = [...document.querySelectorAll('.planet-label')];
  const planetMatBase = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
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
  const stations = STATIONS.map((name, i) => {
    const group = new THREE.Group();
    // particle ball, like the archive orb
    const PTS = small ? 380 : 650;
    const geo = new THREE.IcosahedronGeometry(1.5, 1);
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
    // each planet wears its crew member's color — one world, one system
    const STATION_COLORS = ['#8fb8e8', '#7ee0a8', '#ffd479', '#ff8d7a'];
    const ballMat = new THREE.PointsMaterial({ ...planetMatBase, size: 0.05, color: STATION_COLORS[i], opacity: 0.9, sizeAttenuation: true });
    group.add(new THREE.Points(ballGeo, ballMat));
    const haloMat = new THREE.SpriteMaterial({ map: glowTex, color: STATION_COLORS[i], transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(5.6);
    group.add(halo);

    group.visible = false;
    scene.add(group);

    // a little geometric crew member (flies to the ship, so lives in world space);
    // each role gets its own look: RD glasses, PM tie, QA magnifier, AI monster
    const isMonster = i === 3;
    const BODY_COLORS = ['#8fb8e8', '#7ee0a8', '#ffd479', '#ff8d7a'];  // RD blue, PM green, QA gold, AI ember
    const bodyMat = new THREE.LineBasicMaterial({ color: BODY_COLORS[i], transparent: true, opacity: 1 });
    const propMat = isMonster ? bodyMat : new THREE.LineBasicMaterial({ color: '#f2efe6', transparent: true, opacity: 1 });
    const fig = isMonster ? makeMonster(bodyMat) : makeCrew(i, bodyMat, propMat);
    fig.visible = false;
    scene.add(fig);

    const side = i % 2 === 0 ? 1 : -1;  // RD right, PM left, QA right, AI left
    return { name, group, fig, figMats: [bodyMat, propMat], ballMat, haloMat, side, label: labels[i] };
  });

  // ---------- post ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.85, 0.12);
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
  composer.addPass(grain);

  // ---------- HTML overlays ----------
  const titleEl = document.querySelector('.film-title');
  const hintEl = document.querySelector('.scroll-hint');
  const wordEl = document.querySelector('.sf-word');

  // ---------- scroll progress (critically damped for weight) ----------
  let P = 0, Psm = 0, vel = 0;
  ScrollTrigger.create({
    trigger: '#film',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => { P = self.progress; },
  });
  window.__filmSeek = (p) => { P = p; Psm = p; renderFrame(); };  // QA hook

  // ---------- choreography: everything is a pure function of (P, t) ----------
  const mouse = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / innerWidth - 0.5);
    mouse.y = (e.clientY / innerHeight - 0.5);
  }, { passive: true });

  const shipBase = new THREE.Color('#e2ddcf');
  const flareWhite = new THREE.Color('#fffdf2');
  const tmpV = new THREE.Vector3();
  const clock = new THREE.Clock();

  function updateScene(p, t, v = 0) {
    // scroll velocity → subtle speed feel: FOV kick + livelier dust
    const speed = Math.min(0.02, Math.abs(v));
    camera.fov = 50 + speed * 240;
    camera.updateProjectionMatrix();

    // title + hint: still until the user starts, then it lifts away
    const titleOp = 1 - ss(0.015, 0.06, p);
    titleEl.style.opacity = String(titleOp);
    titleEl.style.transform = `translate(-50%, -50%) translateY(${(1 - titleOp) * -42}px)`;
    titleEl.style.filter = `blur(${(1 - titleOp) * 7}px)`;
    hintEl.style.opacity = String(Math.min(1, titleOp));

    // ship enters; at the very end it blasts off upward and out
    const sa = ss(0.045, 0.1, p);
    const leave = ss(0.955, 0.995, p);
    ship.visible = sa > 0.01 && leave < 0.999;
    shipMat.opacity = sa * (1 - leave);
    ship.scale.setScalar(0.5 + 0.5 * sa);
    ship.position.y = 0.4 + Math.sin(t * 0.9) * 0.09 + leave * leave * 14;
    ship.rotation.z = mouse.x * 0.1 + Math.sin(t * 0.55) * 0.04;
    thrust.scale.y = 0.85 + 0.3 * Math.abs(Math.sin(t * 7));

    // finale (settles back down as the page hands over to the cards)
    const f = ss(0.865, 0.925, p) * (1 - ss(0.96, 1, p) * 0.65);
    // the ship flares as it materializes, then settles
    const flare = Math.sin(sa * Math.PI);
    if (f > 0.001) {
      const hue = (t * 0.45) % 1;
      const rainbow = new THREE.Color().setHSL(hue, 0.8, 0.62);
      shipMat.color.copy(shipBase).lerp(rainbow, f);
      ship.scale.setScalar((0.5 + 0.5 * sa) * (1 + 0.05 * Math.sin(t * 6) * f));
    } else {
      shipMat.color.copy(shipBase).lerp(flareWhite, flare * 0.85);
    }
    bloom.strength = 0.55 + f * 1.05 + flare * 0.75;
    dustUniforms.uWarm.value = 0.35 + f * 0.65;
    dustUniforms.uTurb.value = 0.5 + f * 0.9 + speed * 26;
    const wordOp = ss(0.9, 0.955, p) * (1 - ss(0.985, 1.0, p));
    wordEl.style.opacity = String(wordOp);
    wordEl.style.transform = `translate(-50%, -50%) translateY(${(1 - wordOp) * 20}px) scale(${0.92 + 0.08 * wordOp})`;
    wordEl.style.letterSpacing = `${lerp(0.14, 0.02, wordOp)}em`;
    wordEl.style.filter = `blur(${(1 - wordOp) * 9}px) drop-shadow(0 0 34px rgba(255, 200, 150, .35))`;

    // stations
    const w = innerWidth, h = innerHeight;
    let lean = 0, boardPulse = 0;
    stations.forEach((st, i) => {
      const s = 0.115 + i * 0.185;
      const q = (p - s) / 0.185;
      const active = q > 0 && q < 1.05;
      st.group.visible = active;
      st.fig.visible = false;
      if (st.label) st.label.style.opacity = '0';
      if (!active) return;

      // planet path: rises from below, holds beside the ship, exits upward
      const enter = ss(0, 0.32, q);
      const exit = ss(0.78, 1, q);
      const y = lerp(-16, -3.1, enter) + exit * 18;
      const x = st.side * lerp(4.2, 3.1, enter);
      st.group.position.set(x, y, -1.2);
      st.group.rotation.y = t * 0.25 + i;

      // once its crew member has boarded, the planet quietly dims
      const picked = ss(0.72, 0.8, q);
      st.ballMat.opacity = 0.9 - picked * 0.5;
      st.haloMat.opacity = 0.14 - picked * 0.08;

      // the ship leans toward whichever planet it is meeting
      lean += st.side * Math.sin(Math.min(1, Math.max(0, q)) * Math.PI);
      // a small flash the moment someone boards
      boardPulse = Math.max(boardPulse, Math.sin(ss(0.66, 0.76, q) * Math.PI));

      // crew member: pops up from the planet's surface, then flies into the ship
      if (q > 0.36 && q < 0.78) {
        const born = ss(0.36, 0.44, q);
        const ride = ss(0.48, 0.7, q);
        const gone = ss(0.7, 0.76, q);
        const tipX = x, tipY = y + 1.5 + 0.15 + born * 0.4;
        st.fig.visible = true;
        st.fig.scale.setScalar(0.9 * born * (1 - gone * 0.6));
        st.figMats.forEach((m) => { m.opacity = born * (1 - gone); });
        const arc = Math.sin(ride * Math.PI) * 1.2;  // a little launch arc
        st.fig.position.set(
          lerp(tipX, ship.position.x, ride) + st.side * arc * 0.3,
          lerp(tipY, ship.position.y - 0.3, ride) + arc,
          lerp(-1.2, 0, ride)
        );
        st.fig.rotation.z = ride * st.side * -0.7;
      }

      // label at the planet's center
      if (st.label) {
        const op = ss(0.14, 0.26, q) * (1 - ss(0.74, 0.84, q));
        tmpV.copy(st.group.position).project(camera);
        st.label.style.transform = `translate(-50%, -50%) translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h}px)`;
        st.label.style.opacity = String(op);
      }
    });

    // piloted, not on rails: the ship leans and drifts toward each meeting,
    // and blinks the moment a crew member boards
    ship.rotation.z += lean * -0.13;
    ship.position.x = lean * 0.5;
    if (boardPulse > 0.001) {
      bloom.strength += boardPulse * 0.55;
      if (f <= 0.001) shipMat.color.copy(shipBase).lerp(flareWhite, Math.max(flare * 0.85, boardPulse * 0.75));
    }

    // finale dance: the whole crew jumps out front and celebrates
    const dance = ss(0.915, 0.955, p) * (1 - ss(0.985, 1.0, p));
    if (dance > 0.001) {
      stations.forEach((st, i) => {
        const phase = t * 5 + i * 1.4;
        const hop = Math.abs(Math.sin(phase)) * 0.45;
        st.fig.visible = true;
        st.figMats.forEach((m) => { m.opacity = dance; });
        st.fig.position.set(
          -2.1 + i * 1.4 + Math.sin(t * 1.1 + i * 2) * 0.14,
          -2.35 + hop * dance,
          3
        );
        st.fig.rotation.z = Math.sin(phase) * 0.3 * dance;
        st.fig.scale.setScalar(1.25 * dance + Math.sin(phase * 0.5) * 0.06);
      });
    }

    // camera parallax
    camera.position.x += (mouse.x * 1.3 - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y * 0.8 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
  }

  function renderFrame() {
    const t = clock.getElapsedTime();
    const dp = P - Psm;
    Psm += dp * 0.14;
    vel = lerp(vel, dp, 0.2);
    dustUniforms.uTime.value = t;
    grain.uniforms.uT.value = t;
    updateScene(Psm, t, vel);
    composer.render();
  }

  const tick = () => { requestAnimationFrame(tick); renderFrame(); };
  tick();

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });
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
    new THREE.Vector3(-0.1, 0.2, 0), new THREE.Vector3(-0.22, 0.34, 0),   // arms up, cheering
    new THREE.Vector3(0.1, 0.2, 0), new THREE.Vector3(0.22, 0.34, 0),
    new THREE.Vector3(-0.06, 0.02, 0), new THREE.Vector3(-0.09, -0.14, 0), // stubby legs
    new THREE.Vector3(0.06, 0.02, 0), new THREE.Vector3(0.09, -0.14, 0),
  ]), bodyMat);
  fig.add(head, belly, limbs);

  if (kind === 0) {
    // RD: chunky round glasses + a bridge
    const lensL = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CircleGeometry(0.08, 10)), propMat);
    lensL.position.set(-0.09, 0.44, 0.21);
    const lensR = lensL.clone();
    lensR.position.set(0.09, 0.44, 0.21);
    const bridge = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.015, 0.44, 0.21), new THREE.Vector3(0.015, 0.44, 0.21),
    ]), propMat);
    fig.add(lensL, lensR, bridge);
  } else if (kind === 1) {
    // PM: a proper tie
    const tie = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.06, 0.27, 0.17), new THREE.Vector3(0.06, 0.27, 0.17),
      new THREE.Vector3(0, 0.02, 0.17), new THREE.Vector3(-0.06, 0.27, 0.17),
    ]), propMat);
    fig.add(tie);
  } else {
    // QA: a magnifier in hand
    const lens = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CircleGeometry(0.07, 10)), propMat);
    lens.position.set(0.3, 0.42, 0.05);
    const handle = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.26, 0.36, 0.05), new THREE.Vector3(0.22, 0.33, 0.05),
    ]), propMat);
    fig.add(lens, handle);
  }
  return fig;
}

function makeMonster(mat) {
  const fig = new THREE.Group();
  const body = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.24, 0), 10), mat);
  body.position.y = 0.26;
  const limbs = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.1, 0.46, 0), new THREE.Vector3(-0.19, 0.66, 0),   // antennae
    new THREE.Vector3(0.1, 0.46, 0), new THREE.Vector3(0.19, 0.66, 0),
    new THREE.Vector3(-0.12, 0.05, 0), new THREE.Vector3(-0.17, -0.14, 0), // three stubby legs
    new THREE.Vector3(0, 0.03, 0), new THREE.Vector3(0, -0.16, 0),
    new THREE.Vector3(0.12, 0.05, 0), new THREE.Vector3(0.17, -0.14, 0),
  ]), mat);
  const bobL = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CircleGeometry(0.04, 6)), mat);
  bobL.position.set(-0.19, 0.7, 0);
  const bobR = bobL.clone();
  bobR.position.set(0.19, 0.7, 0);
  const eyeL = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CircleGeometry(0.05, 8)), mat);
  eyeL.position.set(-0.09, 0.3, 0.22);
  const eyeR = eyeL.clone();
  eyeR.position.set(0.09, 0.3, 0.22);
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
