---
layout: film
title: 主管嘴上要 ownership，卻只允許團隊用 Turn-Based Loop 工作
description: 從四種 Agent Loop 看 AI 團隊管理——領導者如何依照人、任務與風險，選擇介入、同步與授權的方式。
date: 2026-08-05 21:00:00 +0800
image: /assets/og-post-loops.jpg
tags: [領導, Agent, 團隊]
seo:
  type: BlogPosting
---
<style>
  #al-film { position: relative; margin: 0 calc(50% - 50vw); width: 100vw; height: 620vh; }
  .al-stage { position: sticky; top: 0; height: 100vh; overflow: hidden; }
  #al-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .al-ui { position: absolute; inset: 0; pointer-events: none; }
  .al-cap {
    position: absolute; left: 50%; top: 12vh; transform: translateX(-50%);
    width: max-content; max-width: min(30em, calc(100vw - 48px));
    text-align: center; font-family: var(--serif); font-size: clamp(15px, 1.9vw, 20px);
    line-height: 1.9; color: var(--life-ink); opacity: 0;
    text-shadow: 0 2px 30px rgba(11, 16, 14, .9);
  }
  .al-cap small { display: block; font-size: .78em; color: var(--life-muted); margin-top: 6px; }
  .al-say {
    position: absolute; left: 0; top: 0; font-family: var(--mono); font-size: 13px;
    opacity: 0; white-space: nowrap;
  }
  .al-say-boss { color: var(--life-ink); text-shadow: 0 0 14px rgba(242, 238, 229, .4); }
  .al-say-m { color: #a5dbff; text-shadow: 0 0 14px rgba(165, 219, 255, .5); }
  .al-tag {
    position: absolute; left: 0; top: 0; font-family: var(--mono); font-size: 11px;
    letter-spacing: .14em; color: var(--life-muted); opacity: 0; white-space: nowrap;
  }
  .al-end {
    position: absolute; left: 50%; bottom: 11vh; transform: translateX(-50%);
    width: max-content; max-width: min(26em, calc(100vw - 48px));
    text-align: center; font-family: var(--serif); font-size: clamp(16px, 2vw, 21px);
    line-height: 2; color: var(--life-ink); opacity: 0;
    text-shadow: 0 2px 30px rgba(11, 16, 14, .9);
  }
  .al-start-wrap { text-align: center; margin: 6px 0 46px; }
  .al-start {
    cursor: pointer; background: none;
    border: 1px solid rgba(220, 148, 124, .4); border-radius: 999px;
    padding: 13px 30px; font-family: var(--mono); font-size: 12px;
    letter-spacing: .34em; text-indent: .34em; color: var(--life-clay);
    animation: al-drift 2.4s ease-in-out infinite, al-glow 2.4s ease-in-out infinite;
    transition: background .3s ease, border-color .3s ease;
  }
  .al-start:hover { background: rgba(220, 148, 124, .12); border-color: var(--life-clay); }
  @keyframes al-drift {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(8px); }
  }
  .al-sound {
    position: absolute; right: 26px; bottom: 24px; pointer-events: auto; cursor: pointer;
    background: none; border: 1px solid rgba(220, 148, 124, .45); border-radius: 999px;
    padding: 10px 20px; font-family: var(--mono); font-size: 11px; letter-spacing: .26em;
    color: var(--life-clay); transition: color .3s ease, border-color .3s ease;
    animation: al-glow 2.2s ease-in-out infinite;
  }
  .al-sound[aria-pressed="true"] { color: var(--life-muted); border-color: rgba(226, 221, 207, .25); animation: none; }
  .al-sound:hover { color: var(--life-clay); border-color: var(--life-clay); }
  @keyframes al-glow {
    0%, 100% { box-shadow: 0 0 0 rgba(220, 148, 124, 0); }
    50% { box-shadow: 0 0 22px rgba(220, 148, 124, .3); }
  }
</style>

<p class="al-start-wrap"><button class="al-start" type="button">▶ PLAY</button></p>

<div id="al-film">
  <div class="al-stage">
    <canvas id="al-canvas" aria-hidden="true"></canvas>
    <div class="al-ui">
      <p class="al-cap" data-cap="0">主管在管理專案時，其實一直在替每個人選 Loop。<small>只是我們平常不會這樣說。</small></p>
      <p class="al-cap" data-cap="1">Turn-Based——我說一步，你做一步。<small>偏差看得早；但如果永遠不結束，等待就成了最合理的選擇。</small></p>
      <p class="al-cap" data-cap="2">Goal-Based——給出結果，讓他自己選路。<small>前提是資訊、權限、求援訊號都給齊，否則只是把風險丟出去。</small></p>
      <p class="al-cap" data-cap="3">Time-Based——固定節奏，一起校準。<small>重點不是幾天開一次會，而是有沒有更早看見問題。</small></p>
      <p class="al-cap" data-cap="4">Proactive——看到問題，自己啟動。<small>不是不等指令，而是知道哪裡不必等。</small></p>
      <p class="al-cap" data-cap="5">四種 Loop 不是能力等級，也不是排行榜。<small>領導者真正要設計的，是切換的條件。</small></p>
      <p class="al-say al-say-boss" aria-hidden="true">下一步，做這個</p>
      <p class="al-say al-say-m" aria-hidden="true">我來！</p>
      <p class="al-end">你不能把一個人關在 Turn-Based 裡，<br>再用他不夠 Proactive，當作不授權的證據。</p>
      <button class="al-sound" type="button" aria-pressed="false">SOUND · OFF</button>
    </div>
  </div>
</div>

<script type="module">
import * as THREE from 'three';

const docEl = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 640px)').matches;
const canvas = document.getElementById('al-canvas');

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch { return false; }
}
if (!reduced && webglOK()) boot();

function ss(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }
function kf(p, pts) {
  if (p <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (p <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], ss(pts[i - 1][0], pts[i][0], p));
  }
  return pts[pts.length - 1][1];
}

function boot() {
  docEl.style.scrollBehavior = 'auto';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b100e');
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 10);

  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.45, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const sprite = (color, scale) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(scale);
    scene.add(s);
    return s;
  };

  // dust
  const DUST = small ? 300 : 700;
  const dp = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dp[i * 3] = (Math.random() - 0.5) * 30; dp[i * 3 + 1] = (Math.random() - 0.5) * 18; dp[i * 3 + 2] = -3 - Math.random() * 12;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dustMat = new THREE.PointsMaterial({ color: '#d8c8a8', size: 0.035, transparent: true, opacity: 0.5, depthWrite: false });
  scene.add(new THREE.Points(dustGeo, dustMat));

  const arcPts = (cx, cy, r, a0, a1, n, z = 0.03) => {
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z)); }
    return pts;
  };
  const lineOf = (pts, mat) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
  const segsOf = (pts, mat) => new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mat);

  // ---------- 主管 ----------
  const bossMat = new THREE.LineBasicMaterial({ color: '#e2ddcf', transparent: true, opacity: 1 });
  const bossSoft = new THREE.LineBasicMaterial({ color: '#dc947c', transparent: true, opacity: 0.85 });
  const boss = new THREE.Group();
  {
    boss.add(lineOf(arcPts(0, 0.55, 0.3, 0, Math.PI * 2, 26), bossMat));                       // head
    boss.add(lineOf([
      new THREE.Vector3(-0.26, 0.24, 0), new THREE.Vector3(-0.36, -0.55, 0),
      new THREE.Vector3(0.36, -0.55, 0), new THREE.Vector3(0.26, 0.24, 0), new THREE.Vector3(-0.26, 0.24, 0),
    ], bossMat));                                                                              // jacket
    boss.add(lineOf([
      new THREE.Vector3(0, 0.22, 0.02), new THREE.Vector3(-0.07, 0.04, 0.02),
      new THREE.Vector3(0, -0.14, 0.02), new THREE.Vector3(0.07, 0.04, 0.02), new THREE.Vector3(0, 0.22, 0.02),
    ], bossSoft));                                                                             // tie
    boss.add(segsOf([
      new THREE.Vector3(-0.3, 0.1, 0), new THREE.Vector3(-0.52, -0.12, 0),
      new THREE.Vector3(0.3, 0.1, 0), new THREE.Vector3(0.52, -0.12, 0),
    ], bossMat));                                                                              // arms
    boss.add(segsOf([
      new THREE.Vector3(-0.1, 0.62, 0.03), new THREE.Vector3(-0.16, 0.6, 0.03),
      new THREE.Vector3(0.1, 0.62, 0.03), new THREE.Vector3(0.16, 0.6, 0.03),
    ], bossMat));                                                                              // eyes
    boss.add(lineOf(arcPts(0, 0.47, 0.09, Math.PI * 1.2, Math.PI * 1.8, 8, 0.03), bossMat));   // smile
  }
  boss.position.set(0, -0.9, 0.3);
  scene.add(boss);

  // ---------- 團員（帶著 agent 小光球）----------
  const mkMember = (color) => {
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0 });
    const g = new THREE.Group();
    g.add(lineOf(arcPts(0, 0.36, 0.24, 0, Math.PI * 2, 22), mat));                             // head
    g.add(lineOf([
      new THREE.Vector3(-0.18, 0.14, 0), new THREE.Vector3(-0.22, -0.42, 0),
      new THREE.Vector3(0.22, -0.42, 0), new THREE.Vector3(0.18, 0.14, 0), new THREE.Vector3(-0.18, 0.14, 0),
    ], mat));                                                                                  // body
    g.add(segsOf([
      new THREE.Vector3(-0.09, 0.42, 0.03), new THREE.Vector3(-0.13, 0.41, 0.03),
      new THREE.Vector3(0.09, 0.42, 0.03), new THREE.Vector3(0.13, 0.41, 0.03),
    ], mat));                                                                                  // eyes
    g.add(lineOf(arcPts(0, 0.3, 0.07, Math.PI * 1.2, Math.PI * 1.8, 8, 0.03), mat));           // smile
    scene.add(g);
    return { g, mat };
  };
  const m1 = mkMember('#a5dbff');
  const m2 = mkMember('#7ee0a8');
  const m3 = mkMember('#c98bff');

  // agent orb: rides with its member
  const agentMat = new THREE.LineBasicMaterial({ color: '#ffd479', transparent: true, opacity: 0 });
  const agent = new THREE.Group();
  agent.add(lineOf(arcPts(0, 0, 0.13, 0, Math.PI * 2, 16), agentMat));
  {
    const s = 0.055, w = 0.02;
    agent.add(lineOf([
      new THREE.Vector3(0, s, 0.01), new THREE.Vector3(w, 0.018, 0.01), new THREE.Vector3(s, 0, 0.01),
      new THREE.Vector3(w, -0.018, 0.01), new THREE.Vector3(0, -s, 0.01), new THREE.Vector3(-w, -0.018, 0.01),
      new THREE.Vector3(-s, 0, 0.01), new THREE.Vector3(-w, 0.018, 0.01), new THREE.Vector3(0, s, 0.01),
    ], agentMat));
  }
  scene.add(agent);
  const agentGlow = sprite('#ffd479', 0.9);

  // ---------- 開場：環繞主管的四個幽靈迴圈 ----------
  const ringMat = new THREE.LineBasicMaterial({ color: '#8b877b', transparent: true, opacity: 0 });
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const r = lineOf(arcPts(0, 0, 1.1 + i * 0.42, 0, Math.PI * 2, 40), ringMat);
    r.rotation.x = 0.9 + i * 0.12;
    scene.add(r);
    rings.push(r);
  }

  // ---------- Turn-Based：指令點與回報點 ----------
  const cmdDot = sprite('#e2ddcf', 0.42);
  const repDot = sprite('#a5dbff', 0.34);
  const stepMat = new THREE.LineBasicMaterial({ color: '#a5dbff', transparent: true, opacity: 0 });
  const stepTrail = segsOf((() => {
    const pts = [];
    for (let i = 0; i < 12; i++) pts.push(new THREE.Vector3(0.3 + i * 0.16, -1.5, 0), new THREE.Vector3(0.38 + i * 0.16, -1.5, 0));
    return pts;
  })(), stepMat);
  scene.add(stepTrail);

  // ---------- Goal-Based：山丘、旗子、彎路 ----------
  const goalMat = new THREE.LineBasicMaterial({ color: '#e2ddcf', transparent: true, opacity: 0 });
  const flagMat = new THREE.LineBasicMaterial({ color: '#dc947c', transparent: true, opacity: 0 });
  const hill = lineOf(arcPts(2.2, -3.1, 2.45, Math.PI * 0.28, Math.PI * 0.72, 24), goalMat);
  scene.add(hill);
  const flag = new THREE.Group();
  flag.add(lineOf([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.75, 0)], flagMat));
  flag.add(lineOf([new THREE.Vector3(0, 0.75, 0), new THREE.Vector3(0.42, 0.62, 0), new THREE.Vector3(0, 0.5, 0)], flagMat));
  flag.position.set(2.2, -0.68, 0.1);
  scene.add(flag);
  const flagGlow = sprite('#dc947c', 1.2);
  const PATH_N = 70;
  const pathPts = [];
  for (let i = 0; i <= PATH_N; i++) {
    const u = i / PATH_N;
    const x = lerp(-1.6, 2.14, u);
    const y = lerp(-1.35, -0.62, u * u) + Math.sin(u * Math.PI * 2.4) * 0.34 * (1 - u * 0.5);
    pathPts.push(new THREE.Vector3(x, y, 0.05));
  }
  const pathMat = new THREE.LineBasicMaterial({ color: '#a5dbff', transparent: true, opacity: 0 });
  const pathLine = lineOf(pathPts, pathMat);
  pathLine.geometry.setDrawRange(0, 0);
  scene.add(pathLine);

  // ---------- Time-Based：大時鐘 ----------
  const clockMat = new THREE.LineBasicMaterial({ color: '#e2ddcf', transparent: true, opacity: 0 });
  const handMat = new THREE.LineBasicMaterial({ color: '#ffd479', transparent: true, opacity: 0 });
  const clockG = new THREE.Group();
  clockG.add(lineOf(arcPts(0, 0, 0.9, 0, Math.PI * 2, 40), clockMat));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    clockG.add(lineOf([
      new THREE.Vector3(Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0),
      new THREE.Vector3(Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0),
    ], clockMat));
  }
  const hand = lineOf([new THREE.Vector3(0, 0, 0.02), new THREE.Vector3(0, 0.68, 0.02)], handMat);
  clockG.add(hand);
  clockG.position.set(0, 1.15, -0.5);
  scene.add(clockG);
  const syncGlow = sprite('#ffd479', 2.2);

  // ---------- Proactive：警示火花與授權邊界 ----------
  const sparkMat = new THREE.LineBasicMaterial({ color: '#ff8d7a', transparent: true, opacity: 0 });
  const spark = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    spark.add(lineOf([
      new THREE.Vector3(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0),
      new THREE.Vector3(Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0),
    ], sparkMat));
  }
  spark.position.set(2.35, 0.5, 0.1);
  scene.add(spark);
  const sparkGlow = sprite('#ff8d7a', 1.3);
  const boundMat = new THREE.LineBasicMaterial({ color: '#8b877b', transparent: true, opacity: 0 });
  const bound = segsOf((() => {
    const pts = [];
    const seg = (x0, y0, x1, y1, n) => {
      for (let i = 0; i < n; i++) {
        const u0 = i / n, u1 = u0 + 0.55 / n;
        pts.push(new THREE.Vector3(lerp(x0, x1, u0), lerp(y0, y1, u0), 0), new THREE.Vector3(lerp(x0, x1, u1), lerp(y0, y1, u1), 0));
      }
    };
    seg(0.1, 1.3, 3.6, 1.3, 9); seg(3.6, 1.3, 3.6, -2, 8);
    seg(3.6, -2, 0.1, -2, 9); seg(0.1, -2, 0.1, 1.3, 8);
    return pts;
  })(), boundMat);
  scene.add(bound);

  // ---------- 結尾：四個 Loop 圖示 + 儀表盤 ----------
  const iconMats = [];
  const icons = [];
  const ICON_POS = [[-2.5, 0.7], [-0.95, 1.5], [0.95, 1.5], [2.5, 0.7]];
  const ICON_LABEL = ['TURN-BASED', 'GOAL-BASED', 'TIME-BASED', 'PROACTIVE'];
  for (let i = 0; i < 4; i++) {
    const mat = new THREE.LineBasicMaterial({ color: '#e2ddcf', transparent: true, opacity: 0 });
    const g = new THREE.Group();
    g.add(lineOf(arcPts(0, 0, 0.3, Math.PI * 0.2, Math.PI * 1.9, 20), mat));
    g.add(lineOf([new THREE.Vector3(0.24, 0.22, 0), new THREE.Vector3(0.31, 0.14, 0), new THREE.Vector3(0.2, 0.1, 0)], mat)); // arrowhead
    g.position.set(ICON_POS[i][0], ICON_POS[i][1], 0);
    scene.add(g);
    icons.push(g);
    iconMats.push(mat);
  }
  const dialMat = new THREE.LineBasicMaterial({ color: '#8b877b', transparent: true, opacity: 0 });
  const needleMat = new THREE.LineBasicMaterial({ color: '#ffd479', transparent: true, opacity: 0 });
  const dial = lineOf(arcPts(0, -2.05, 0.75, Math.PI * 0.12, Math.PI * 0.88, 20), dialMat);
  scene.add(dial);
  const needle = lineOf([new THREE.Vector3(0, 0, 0.05), new THREE.Vector3(0, 0.65, 0.05)], needleMat);
  needle.position.set(0, -2.05, 0);
  scene.add(needle);

  // ---------- DOM ----------
  const caps = [...document.querySelectorAll('.al-cap')];
  const sayBoss = document.querySelector('.al-say-boss');
  const sayM = document.querySelector('.al-say-m');
  const endEl = document.querySelector('.al-end');
  const tags = ICON_LABEL.map((label, i) => {
    const el = document.createElement('p');
    el.className = 'al-tag';
    el.textContent = label;
    document.querySelector('.al-ui').appendChild(el);
    return { el, x: ICON_POS[i][0], y: ICON_POS[i][1] - 0.55 };
  });

  // ---------- sound ----------
  const sound = makeSound();
  const soundBtn = document.querySelector('.al-sound');
  let soundOn = false;
  const setSoundUI = () => {
    soundBtn.textContent = soundOn ? 'SOUND · ON' : 'SOUND · OFF';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
  };
  soundBtn.addEventListener('click', () => {
    if (soundOn) { sound.stop(); soundOn = false; localStorage.setItem('coomy-sound', 'off'); }
    else { sound.start(); soundOn = true; localStorage.setItem('coomy-sound', 'on'); }
    setSoundUI();
  });
  setSoundUI();
  const CUES = [
    { at: 0.17, fn: () => sound.tick() },
    { at: 0.21, fn: () => sound.tick() },
    { at: 0.25, fn: () => sound.tick() },
    { at: 0.35, fn: () => sound.pop() },
    { at: 0.44, fn: () => sound.chime() },
    { at: 0.56, fn: () => sound.tock() },
    { at: 0.6, fn: () => sound.chord() },
    { at: 0.7, fn: () => sound.alarm() },
    { at: 0.79, fn: () => sound.chime() },
    { at: 0.9, fn: () => sound.finale() },
  ].map((c) => ({ ...c, fired: false }));

  // ---------- scroll + autoplay ----------
  const film = document.getElementById('al-film');
  let P = 0, Psm = 0;
  const readScroll = () => {
    const max = film.offsetHeight - innerHeight;
    const y = Math.min(Math.max(scrollY - film.offsetTop, 0), max);
    P = max > 0 ? y / max : 0;
  };
  addEventListener('scroll', readScroll, { passive: true });
  readScroll();
  window.__loopSeek = (p) => { P = p; Psm = p; render(); };

  let autoScroll = null;
  const glideTo = (targetY, dur = 3000) => { autoScroll = { from: scrollY, to: targetY, t0: performance.now(), dur }; };
  const cancelGlide = () => { autoScroll = null; };
  addEventListener('wheel', cancelGlide, { passive: true });
  addEventListener('touchstart', cancelGlide, { passive: true });
  addEventListener('keydown', cancelGlide, { passive: true });
  const startEl = document.querySelector('.al-start');
  if (startEl) startEl.addEventListener('click', () => {
    if (localStorage.getItem('coomy-sound') !== 'off' && !soundOn) { sound.start(); soundOn = true; setSoundUI(); }
    glideTo(film.offsetTop + (film.offsetHeight - innerHeight) * 0.06, 2600);
  });
  const CH = [0.08, 0.2, 0.38, 0.56, 0.74, 0.92, 1];
  let lastYs = 0, lastMoveTs = 0, endSeen = false;

  const tmpV = new THREE.Vector3();
  const clock = new THREE.Clock();
  const qq = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));

  function update(p, t) {
    const w = innerWidth, h = innerHeight;
    const introQ = ss(0.02, 0.07, p) * (1 - ss(0.12, 0.16, p));
    const turnQ = ss(0.13, 0.16, p) * (1 - ss(0.29, 0.33, p));
    const goalQ = ss(0.31, 0.35, p) * (1 - ss(0.47, 0.51, p));
    const timeQ = ss(0.49, 0.53, p) * (1 - ss(0.65, 0.69, p));
    const proQ = ss(0.67, 0.71, p) * (1 - ss(0.83, 0.87, p));
    const endQ = ss(0.87, 0.91, p);
    const q1 = qq(p, 0.14, 0.3);
    const q2 = qq(p, 0.33, 0.49);
    const q3 = qq(p, 0.51, 0.67);
    const q4 = qq(p, 0.69, 0.85);
    const q5 = qq(p, 0.89, 1);

    // captions
    const capW = [
      ss(0.025, 0.055, p) * (1 - ss(0.11, 0.14, p)),
      ss(0.15, 0.18, p) * (1 - ss(0.28, 0.31, p)),
      ss(0.33, 0.36, p) * (1 - ss(0.46, 0.49, p)),
      ss(0.51, 0.54, p) * (1 - ss(0.64, 0.67, p)),
      ss(0.69, 0.72, p) * (1 - ss(0.82, 0.85, p)),
      ss(0.88, 0.91, p) * (1 - ss(0.955, 0.975, p)),
    ];
    caps.forEach((c, i) => { c.style.opacity = String(capW[i] || 0); });
    endEl.style.opacity = String(ss(0.96, 0.99, p));

    // intro rings
    rings.forEach((r, i) => {
      r.position.copy(boss.position);
      r.rotation.z = t * (0.14 + i * 0.05) * (i % 2 ? 1 : -1);
      r.material = ringMat;
    });
    ringMat.opacity = introQ * 0.4;

    // boss walks: center → left → back to center
    const bossX = kf(p, [[0, 0], [0.13, -2.45], [0.49, -2.45], [0.53, -2.55], [0.67, -2.55], [0.71, -2.75], [0.87, 0], [1, 0]]);
    boss.position.set(bossX, -0.9 + Math.sin(t * 1.1) * 0.05, 0.3);
    boss.rotation.z = Math.sin(t * 0.9) * 0.03;

    // ---- Turn-Based ----
    stepMat.opacity = turnQ * 0.5;
    const m1TurnX = kf(q1, [[0, 0.35], [0.18, 0.35], [0.26, 0.95], [0.42, 0.95], [0.5, 1.55], [0.66, 1.55], [0.74, 2.15], [1, 2.15]]);
    const cmdU = (q1 * 3) % 1;
    const cmdGo = Math.min(1, cmdU * 2.2);
    cmdDot.position.set(lerp(-2.1, m1TurnX, cmdGo), lerp(-0.6, -0.9, cmdGo), 0.4);
    cmdDot.material.opacity = turnQ * (cmdU < 0.46 ? 0.8 : 0);
    const repU = Math.max(0, (cmdU - 0.55) * 2.2);
    repDot.position.set(lerp(m1TurnX, -2.1, repU), lerp(-1.1, -0.75, repU), 0.4);
    repDot.material.opacity = turnQ * (cmdU > 0.55 && repU < 1 ? 0.7 : 0);

    // ---- Goal-Based ----
    goalMat.opacity = goalQ;
    const flagPop = ss(0.06, 0.16, q2);
    flagMat.opacity = goalQ * flagPop;
    flag.scale.setScalar(0.5 + flagPop * 0.5);
    flagGlow.position.set(2.2, -0.2, 0.1);
    flagGlow.material.opacity = goalQ * flagPop * 0.25;
    const walkQ = ss(0.2, 0.88, q2);
    pathMat.opacity = goalQ * 0.55;
    pathLine.geometry.setDrawRange(0, Math.floor(walkQ * PATH_N) + 1);
    const pathIdx = Math.min(PATH_N, Math.floor(walkQ * PATH_N));
    const arrived = ss(0.9, 0.97, q2);

    // ---- Time-Based ----
    clockMat.opacity = timeQ;
    handMat.opacity = timeQ;
    hand.rotation.z = -q3 * Math.PI * 4;
    const syncPulse = ss(0.42, 0.5, q3) * (1 - ss(0.6, 0.68, q3));
    syncGlow.position.copy(clockG.position);
    syncGlow.material.opacity = timeQ * syncPulse * 0.35;

    // ---- Proactive ----
    boundMat.opacity = proQ * 0.5;
    const flick = 0.55 + 0.45 * Math.abs(Math.sin(t * 6));
    const resolved = ss(0.62, 0.75, q4);
    sparkMat.opacity = proQ * (1 - resolved) * flick;
    sparkMat.color.setStyle(resolved > 0.5 ? '#ffd479' : '#ff8d7a');
    spark.rotation.z = t * 0.8;
    sparkGlow.position.copy(spark.position);
    sparkGlow.material.opacity = proQ * lerp(flick * 0.4, 0.25, resolved);
    sparkGlow.material.color.setStyle(resolved > 0.5 ? '#ffd479' : '#ff8d7a');
    const m1ProX = lerp(0.8, 2.0, ss(0.18, 0.45, q4));
    const m1ProY = lerp(-1.3, -0.1, ss(0.18, 0.45, q4));
    const m2ProX = lerp(-0.7, 1.45, ss(0.5, 0.75, q4));
    const m2ProY = lerp(-1.5, -0.55, ss(0.5, 0.75, q4));

    // ---- members: 位置與出場，依幕切換 ----
    m1.mat.opacity = Math.max(turnQ, goalQ, timeQ, proQ);
    const m1Pos = [
      [turnQ, m1TurnX, -1.05 + Math.abs(Math.sin(q1 * 26)) * turnQ * 0.05],
      [goalQ, pathPts[pathIdx].x, pathPts[pathIdx].y + 0.35 + arrived * Math.abs(Math.sin(t * 5)) * 0.14],
      [timeQ, lerp(-1.7, -0.55, syncPulse), lerp(-1.25, -0.85, syncPulse)],
      [proQ, m1ProX, m1ProY],
    ];
    let mx = 0, my = -1.1, mw = 0;
    m1Pos.forEach(([wt, x, y]) => { if (wt > mw) { mw = wt; mx = x; my = y; } });
    m1.g.position.set(mx, my + Math.sin(t * 1.3) * 0.04, 0.4);
    m2.mat.opacity = Math.max(timeQ, proQ);
    m2.g.position.set(
      timeQ > proQ ? lerp(0.6, 0.2, syncPulse) : m2ProX,
      (timeQ > proQ ? lerp(-1.35, -0.9, syncPulse) : m2ProY) + Math.sin(t * 1.1 + 1) * 0.04,
      0.4
    );
    m3.mat.opacity = timeQ;
    m3.g.position.set(lerp(2.0, 0.95, syncPulse), lerp(-1.2, -0.9, syncPulse) + Math.sin(t * 1.2 + 2) * 0.04, 0.4);

    // agent orb follows m1
    agentMat.opacity = Math.max(turnQ, goalQ, proQ) * 0.95;
    const orbSpin = proQ > 0.3 ? t * 4 : t * 1.6;
    agent.position.set(m1.g.position.x + Math.cos(orbSpin) * 0.5, m1.g.position.y + 0.55 + Math.sin(orbSpin) * 0.16, 0.45);
    agentGlow.position.copy(agent.position);
    agentGlow.material.opacity = agentMat.opacity * 0.3;

    // ---- ending ----
    dialMat.opacity = endQ * 0.7;
    needleMat.opacity = endQ;
    const needleA = kf(q5, [[0.05, 0.62], [0.3, 0.24], [0.55, -0.24], [0.8, -0.62], [1, 0]]);
    needle.rotation.z = needleA;
    const hot = [ss(0.0, 0.1, q5) * (1 - ss(0.25, 0.32, q5)), ss(0.25, 0.32, q5) * (1 - ss(0.5, 0.57, q5)), ss(0.5, 0.57, q5) * (1 - ss(0.75, 0.82, q5)), ss(0.75, 0.82, q5) * (1 - ss(0.93, 0.98, q5))];
    icons.forEach((ic, i) => {
      iconMats[i].opacity = endQ * (0.4 + hot[i] * 0.6);
      iconMats[i].color.setStyle(hot[i] > 0.5 ? '#ffd479' : '#e2ddcf');
      ic.scale.setScalar(1 + hot[i] * 0.22);
      ic.rotation.z = -t * 0.7;
    });
    tags.forEach((tg, i) => {
      tmpV.set(tg.x, tg.y, 0).project(camera);
      tg.el.style.transform = `translate(-50%, -100%) translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h}px)`;
      tg.el.style.opacity = String(endQ * (0.5 + hot[i] * 0.5));
    });

    // says
    const sb = Math.max(
      ss(0.16, 0.18, p) * (1 - ss(0.21, 0.23, p)),
      ss(0.23, 0.25, p) * (1 - ss(0.27, 0.29, p))
    );
    const sm = ss(0.7, 0.73, p) * (1 - ss(0.77, 0.8, p));
    const proj = (obj, el, dy) => {
      tmpV.copy(obj.position); tmpV.y += dy; tmpV.project(camera);
      el.style.transform = `translate(-50%, -100%) translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h}px)`;
    };
    proj(boss, sayBoss, 1.15);
    proj(m1.g, sayM, 0.95);
    sayBoss.style.opacity = String(sb);
    sayM.style.opacity = String(sm);

    camera.position.x = Math.sin(t * 0.25) * 0.12;
    camera.position.y = Math.sin(t * 0.3) * 0.08;
    camera.position.z = (10 - p * 1.2) * Math.max(1, 4.0 / (0.4663 * camera.aspect) / 10);
    camera.lookAt(0, -0.2, 0);
  }

  function render() {
    const t = clock.getElapsedTime();
    Psm += (P - Psm) * 0.12;
    if (autoScroll) {
      const u = Math.min(1, (performance.now() - autoScroll.t0) / autoScroll.dur);
      scrollTo(0, lerp(autoScroll.from, autoScroll.to, 1 - Math.pow(1 - u, 3)));
      if (u >= 1) autoScroll = null;
    }
    const nowY = scrollY;
    if (Math.abs(nowY - lastYs) > 2) { lastYs = nowY; lastMoveTs = t; }
    if (!autoScroll && P > 0.005 && P < 0.995 && !endSeen && t - lastMoveTs > 1.5) {
      const next = CH.find((c) => c > P + 0.01);
      if (next) { lastMoveTs = t; glideTo(film.offsetTop + (film.offsetHeight - innerHeight) * next, 3200); }
    }
    if (P > 0.995) endSeen = true;
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

/* tiny synthesized soundtrack */
function makeSound() {
  let ctx = null, master, twinkleTimer = null;
  const ensure = () => {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const wn = Math.random() * 2 - 1; last = (last + 0.02 * wn) / 1.02; d[i] = last * 3.2; }
    const noise = ctx.createBufferSource();
    noise.buffer = buf; noise.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 220;
    const ng = ctx.createGain(); ng.gain.value = 0.025;
    noise.connect(nf); nf.connect(ng); ng.connect(master); noise.start();
  };
  const blip = (f, delay = 0, dur = 0.2, type = 'sine', vol = 0.06) => {
    if (!ctx) return;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
    const g = ctx.createGain();
    const now = ctx.currentTime + delay;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(master);
    o.start(now); o.stop(now + dur + 0.05);
  };
  const twinkle = () => {
    if (!ctx) return;
    const notes = [1046.5, 1174.7, 1318.5, 1568];
    blip(notes[Math.floor(Math.random() * notes.length)], 0, 1.4, 'sine', 0.014 + Math.random() * 0.008);
  };
  const schedule = () => { twinkleTimer = setTimeout(() => { twinkle(); schedule(); }, 2600 + Math.random() * 3400); };
  return {
    start() { ensure(); ctx.resume(); master.gain.linearRampToValueAtTime(1, ctx.currentTime + 1); clearTimeout(twinkleTimer); schedule(); },
    stop() { if (ctx) master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4); clearTimeout(twinkleTimer); },
    tick() { blip(520, 0, 0.1, 'square', 0.02); },
    tock() { blip(660, 0, 0.12, 'sine', 0.04); blip(440, 0.5, 0.12, 'sine', 0.04); blip(660, 1, 0.12, 'sine', 0.04); },
    pop() { blip(740, 0, 0.14, 'sine', 0.06); blip(1100, 0.08, 0.16, 'sine', 0.05); },
    chime() { [660, 830, 990].forEach((f, i) => blip(f, i * 0.09, 0.4, 'triangle', 0.045)); },
    chord() { [262, 330, 392, 523].forEach((f, i) => blip(f * 1.5, i * 0.06, 1.2, 'sine', 0.03)); },
    alarm() { blip(880, 0, 0.09, 'square', 0.025); blip(880, 0.18, 0.09, 'square', 0.025); },
    finale() { [523, 659, 784, 1047].forEach((f, i) => blip(f, i * 0.12, 1.8, 'sine', 0.03)); },
  };
}
</script>

<div class="film-prose" markdown="1">

我最近看到一個把 Agent Loop 分成四類的框架：Turn-Based、Goal-Based、Time-Based 和 Proactive。

<figure class="article-figure">
  <img src="{{ '/assets/images/agent-loop-types-jiang-zhongqiao.gif' | relative_url }}" alt="四種 Agent Loop：回合制、目標制、時間制與主動式的流程圖">
  <figcaption>四種 Agent Loop 中文版圖表。來源：<a href="https://www.linkedin.com/feed/update/urn:li:activity:7490224753459417088/">江中喬的 LinkedIn 貼文</a>；圖中原始署名為 DailyDoseofDS.com。</figcaption>
</figure>

原本我想的是，當 Agent 可以長時間工作後，要怎麼決定它何時被喚醒、可以自己跑多久、什麼時候應該停下，以及失控前要在哪裡把人拉回來。

下面不是把這套分類當成管理理論。我只是借它的兩個問題：工作怎麼開始，以及做到哪裡應該停，重新看主管和團員的互動。

但看著這四種 Loop，我突然想到一件事：

**領導者在管理專案時，其實也一直在替不同的人選擇 Loop。只是我們平常不會這樣說。**

有些主管習慣下一個指令，等團員做完，再決定下一步。有些主管只給結果，讓團員自己找路。有些團隊靠固定會議維持節奏。也有些人不需要被提醒，看到問題就會自己往前推。

真正有趣的地方不是哪一種最好，而是很多主管嘴上希望團隊有 ownership，實際上卻只允許團員用 Turn-Based Loop 工作：

> 我說一步，你做一步；但最後我又怪你為什麼不主動。

## 人不是 Agent，但這個類比可以照出管理問題

我不是要說人和 Agent 一樣，可以被拆成 prompt、context 和 tool call。

人有情緒、關係、動機與過去的經驗。當一個人沒有主動，不一定是流程設計造成的；也可能是能力、意願、生活狀態，甚至是他根本不同意這個目標。這些都不能被一張 Loop 表格消掉。

但 Agent Loop 提供了一個很好用的視角。它讓我不只問「這個人主不主動」，而是往前多問幾件事：

- 誰在喚醒這份工作？
- 成員被喚醒後，可以自己跑到哪裡？
- 哪些事情可以自行判斷，哪些需要回報？
- 什麼訊號代表應該停下或求援？

當這些問題沒有說清楚，「ownership」很容易變成領導者對團隊的性格要求，而不是一個可以被設計的工作環境。

## Turn-Based：我說一步，你做一步

Turn-Based 最直覺。

主管交代一件事，團員完成後回來，主管再給下一步。它的優點是控制直接，偏差也容易被提早看見。

所以 Turn-Based 並不是壞的管理方式。

當成員第一次接觸某類任務、事故正在擴大、決定不可逆，或團隊還沒有足夠資訊時，逐步確認可能就是正確的選擇。這時候硬要成員自己判斷，並不叫授權，只是在把風險丟出去。

問題出在 Turn-Based 變成預設，而且永遠不會結束。

如果一個人每做一步都要請示，第一次偏差就被接管，久了之後，他最合理的選擇就是等待。因為自行判斷沒有明確收益，判斷錯誤卻要承擔額外風險。

最後主管看到的，會是一個愈來愈不主動的團隊。接著他更確定「這群人果然不能放手」，於是給出更多逐步指令。

這也是上一篇文章談到的不信任循環。換成 Loop 的角度後，我們可以更具體地看見：**團隊從來沒有機會離開 Turn-Based。**

## Goal-Based：不是說一句「你負責」就算授權

Goal-Based 的做法是先定義結果，讓成員自己選擇路徑，在達成目標或遇到阻礙時回來。

它比 Turn-Based 多了判斷空間，也更接近許多主管口中的 ownership。

但 Goal-Based 最容易出現的誤會，就是主管只丟出一句「這件事你負責」，便以為自己完成授權。

如果成員不知道什麼結果算完成、手上沒有必要資訊、不能做關鍵決定，也不知道什麼情況應該求援，那只是一個目標，卻沒有讓人達成目標所需的條件。

Locke 與 Latham 回顧數十年的目標設定研究時，也沒有把「設定目標」寫成單一魔法。目標如何影響表現，還受到承諾、回饋、能力與任務複雜度影響。[Locke & Latham, 2002](https://doi.org/10.1037/0003-066X.57.9.705)

這和我看管理工作的感覺很接近。真正能運作的 Goal-Based，至少要讓團員知道：

- 我們要得到什麼結果？
- 哪些判斷你可以自己做？
- 你手上有哪些資訊、時間與權限？
- 看到什麼訊號時，不應該繼續自己扛？
- 我們會在什麼時候一起看結果與判斷過程？

這些條件不是為了把所有細節重新管回來，而是讓成員知道哪些地方真的可以自己決定。

## Time-Based：固定同步是節奏，不是等開會才准處理問題

Time-Based 是在固定時間檢查進度、風險與下一步。

長週期專案很需要這種節奏。主管不必每一步介入，團員也知道下一個共同檢查點在哪裡。

但 Time-Based 也很容易退化成固定報流水帳：每個人輪流說昨天做了什麼、今天要做什麼，說完之後，真正的阻礙仍然沒有人處理。

Scrum Guide 對 cadence 的描述其實很清楚。固定事件是為了 inspection 與 adaptation；當團隊看到新的偏差，就應該盡快調整，而不是等到下一場會議才被允許改變。[Scrum Guide, 2020](https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-US.pdf)

所以 Time-Based 的重點不是「幾天開一次會」，而是：

**每次同步是否真的讓團隊更早看見問題，並改變下一步？**

如果答案是否定的，會議只是在提供主管一種掌握感。團員仍然不確定哪些問題可以立即處理、哪些必須等主管拍板。

反過來說，固定同步也不等於不信任。當任務很長、依賴很多，或風險會慢慢累積時，一個好的檢查節奏可以讓成員擁有更大的日常自主，因為大家已經約好何時一起校準。

## Proactive：不是不等指令，而是知道哪裡不必等

Proactive 最吸引人。

成員自己發現問題、主動推進，需要時拉其他人進來，不必等主管逐項指示。這也是很多領導者理想中的團隊狀態。

但 Proactive 不是一句「你們要更主動」就會發生。

Gagné 與 Deci 在工作動機的自我決定理論回顧中，把支持自主的管理行為描述得很具體：理解並承認成員的觀點、鼓勵自我發起、減少不必要的壓力與控制，以及提供相關資訊與有意義的理由。[Gagné & Deci, 2005](https://selfdeterminationtheory.org/wp-content/uploads/2014/04/2005_GagneDeci_JOB_SDTtheory.pdf)

這裡的重點不是領導者消失，而是控制方式改變。

把這些原則套回本文的 Loop 視角，我會再把它具體化成幾個問題：哪些事件可以自行啟動工作、可以動用哪些資源、哪些決定不可逆，以及什麼時候一定要停下來找人。這是我對管理方式的延伸，不是該研究直接提出的 Loop 設計。

如果這些都沒有，Proactive 很容易變成兩種極端：

- 成員怕越權，所以依然什麼都等指令。
- 成員直接往前衝，直到成本、風險或方向已經難以回頭。

前者看起來沒有 ownership，後者看起來失控，但兩者可能來自同一個問題：**領導者要求主動，卻沒有提供主動所需的資訊與邊界。**

## 四種 Loop 不是能力等級，也不是升級排行榜

看到這裡，很容易把 Turn-Based 當初階，把 Proactive 當最高級。

但我不認為它們應該被排成一條單向的成熟度階梯。

同一位資深工程師，面對熟悉且可逆的產品決策時可以是 Proactive；遇到第一次處理的資安事故時，可能需要立刻切回 Turn-Based。相反地，一位新人也可能在自己熟悉、風險很低的範圍內主動推進。

工作自主的研究也提醒我們，自主不是單一開關。一項整合 319 項研究、151,134 位參與者的 meta-analysis，將工作自主分成決策、方法與時間安排等不同面向，並發現它們影響工作動機與心理負荷的方式並不完全相同。[Muecke & Iseke, 2019](https://doi.org/10.5465/AMBPP.2019.145)

這不能直接證明四種 Loop 是正確的管理模型，但它至少阻止我們把問題簡化成「給更多自由就會更好」。

我現在更傾向用三個問題描述一個人的工作 Loop：

1. **怎麼開始**：等主管指令、依固定時間，還是看到事件便能自行啟動？
2. **能持續多久**：只做一步、做到明確結果，還是持續維護一個責任範圍？
3. **能決定到哪裡**：哪些事情可以自行判斷，哪些風險必須升級？

同一個人、同一個專案，在不同階段可以有不同答案。

## 領導者真正要設計的，是 Loop 的切換條件

如果四種 Loop 不是排名，那領導者最重要的工作就不是把所有人推向 Proactive，而是知道什麼時候應該切換。

我目前會先看四件事：

| 判斷條件 | 較適合的管理方式 |
|---|---|
| 成員第一次處理、錯誤不可逆、事故正在擴大 | 先用 Turn-Based，縮短每次判斷距離 |
| 結果能說清楚、做法允許變動、成員已有基本能力 | 切到 Goal-Based，讓成員選擇路徑 |
| 任務週期長、依賴多，但不需要持續介入 | 加入 Time-Based 檢查點，定期看風險與調整 |
| 資訊、能力、權限與停止條件都清楚 | 允許 Proactive，在責任範圍內自行發現與推進工作 |

這張表目前只是我的觀察框架，不是已經通過團隊績效驗證的管理量表。真正要讓它成立，我還需要補上四種真實管理場景、至少一次從錯誤 Loop 切換後的結果，以及一個能推翻這個框架的反例。

但即使還在驗證，它已經改變了我看 ownership 的方式。

下次當主管說「這個人就是不夠主動」，我不會先把它當成人格判斷。我會先回頭看：

- 我們現在讓他用哪一種 Loop 工作？
- 他有沒有離開這個 Loop 的條件？
- 我們是在控制風險，還是只是習慣控制？
- 第一次判斷不完美後，我們是一起看他當時掌握的資訊，還是立刻把決定收回來？

好的領導力不是永遠放手，也不是永遠掌控。

它比較像是：知道現在需要哪一種 Loop，也願意在條件改變時，把團隊切換到更適合當下條件的工作方式。

因為你不能把一個人關在 Turn-Based 裡，再用他不夠 Proactive，當作不授權的證據。

## 參考資料

- [江中喬：四種 Agent Loop 中文版圖表](https://www.linkedin.com/feed/update/urn:li:activity:7490224753459417088/)（圖中原始署名：DailyDoseofDS.com）
- [Locke & Latham, 2002：Building a Practically Useful Theory of Goal Setting and Task Motivation](https://doi.org/10.1037/0003-066X.57.9.705)
- [Gagné & Deci, 2005：Self-determination theory and work motivation](https://selfdeterminationtheory.org/wp-content/uploads/2014/04/2005_GagneDeci_JOB_SDTtheory.pdf)
- [Muecke & Iseke, 2019：How Does Job Autonomy Influence Job Performance?](https://doi.org/10.5465/AMBPP.2019.145)
- [Schwaber & Sutherland, 2020：The Scrum Guide](https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-US.pdf)

</div>
