(() => {
  'use strict';

  const SVG_NS_READY = typeof window.SVG === 'function';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const storageKeys = { collection: 'coomy-top-collection-v1', wishes: 'coomy-top-wishes-v2', scores: 'coomy-top-scores-v1', profile: 'coomy-top-profile-v1' };
  const wishEndpoint = window.BATTLE_TOP_WISH_ENDPOINT || '';
  const scoreEndpoint = window.BATTLE_TOP_SCORE_ENDPOINT || '';

  const productCatalog = [
    { id: 'BX-01', name: 'Dran Sword 3-60F', type: '攻擊型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX01_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx01.html', parts: 'Dran Sword · 3-60 · Flat', skill: '高衝刺力的 Flat 軸尖，鎖定 Xtreme Dash 發動強攻。', color: '#258dff', accent: '#ff334f', stats: { attack: 110, defense: 49, stamina: 36, burst: 80, xdash: 35 }, teeth: 3, core: 3 },
    { id: 'BX-02', name: 'Hells Scythe 4-60T', type: '平衡型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX02_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx02.html', parts: 'Hells Scythe · 4-60 · Taper', skill: '攻防兼備的鐮刀刃與 Taper 軸尖，能依碰撞改變節奏。', color: '#e33a32', accent: '#ffb128', stats: { attack: 76, defense: 68, stamina: 61, burst: 80, xdash: 25 }, teeth: 4, core: 4 },
    { id: 'BX-03', name: 'Wizard Arrow 4-80B', type: '持久型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX03_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx03.html', parts: 'Wizard Arrow · 4-80 · Ball', skill: '離心力刃搭配 Ball 軸尖，靠穩定旋轉把戰局拖進終盤。', color: '#f2c31b', accent: '#59d36c', stats: { attack: 41, defense: 66, stamina: 113, burst: 30, xdash: 10 }, teeth: 4, core: 5 },
    { id: 'BX-04', name: 'Knight Shield 3-80N', type: '防禦型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX04_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx04.html', parts: 'Knight Shield · 3-80 · Needle', skill: '吸收衝擊的盾形刃與 Needle 軸尖，專門抵抗場外擊飛。', color: '#4c63c7', accent: '#e9b339', stats: { attack: 45, defense: 112, stamina: 63, burst: 30, xdash: 10 }, teeth: 3, core: 6 }
  ];

  const state = { player: null, enemy: null, opponent: { id: 'demon-boss', name: '魔王', avatar: '👹', top: 'Hells Scythe 4-60T', score: 1000, bot: true }, ranked: [], draw: null, scene: null, battling: false, raf: 0, sound: false, audio: null, spinAudio: null, lastBattleModel: null };
  const els = {
    game: document.querySelector('#top-game'), joinButton: document.querySelector('#join-arena-button'),
    joinModal: document.querySelector('#join-modal'), joinClose: document.querySelector('#join-modal-close'),
    enterArena: document.querySelector('#enter-arena-button'), joinRivals: document.querySelector('#join-rival-list'),
    changeRival: document.querySelector('#change-rival-button'), leaderboardModal: document.querySelector('#leaderboard-modal'),
    leaderboardClose: document.querySelector('#leaderboard-modal-close'),
    stage: document.querySelector('#arena-stage'), status: document.querySelector('#arena-status'),
    result: document.querySelector('#battle-result'), resultTitle: document.querySelector('#battle-result-title'),
    resultCopy: document.querySelector('#battle-result-copy'), name: document.querySelector('#top-name'),
    className: document.querySelector('#top-class'), rarity: document.querySelector('#top-rarity'),
    code: document.querySelector('#top-code'), skill: document.querySelector('#top-skill'),
    stats: document.querySelector('#stat-grid'), summon: document.querySelector('#summon-button'),
    battle: document.querySelector('#battle-button'), save: document.querySelector('#save-button'),
    collection: document.querySelector('#core-collection'), leaderboard: document.querySelector('#leaderboard-list'),
    collectionPickerButton: document.querySelector('#collection-picker-button'), collectionPicker: document.querySelector('#battle-collection-picker'),
    collectionPickerClose: document.querySelector('#collection-picker-close'), collectionPickerList: document.querySelector('#battle-collection-picker-list'),
    countdown: document.querySelector('#launch-countdown'), stageWrap: document.querySelector('.arena-stage-wrap'),
    avatarPicker: document.querySelector('#avatar-picker'), pilotName: document.querySelector('#pilot-name'),
    productImage: document.querySelector('#top-product-image'), productLink: document.querySelector('#top-product-link'), parts: document.querySelector('#top-parts'),
    opponentAvatar: document.querySelector('#opponent-avatar'), opponentName: document.querySelector('#opponent-name'), opponentTop: document.querySelector('#opponent-top'), opponentScore: document.querySelector('#opponent-score'), opponentImage: document.querySelector('#opponent-product-image')
  };

  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(list) { return list[randomInt(0, list.length - 1)]; }
  function makeId() { return `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase(); }

  function getAudio() {
    if (!state.sound) return null;
    if (!state.audio) state.audio = new (window.AudioContext || window.webkitAudioContext)();
    if (state.audio.state === 'suspended') state.audio.resume();
    return state.audio;
  }

  function tone(frequency, duration = .1, type = 'square', volume = .055, endFrequency = frequency) {
    const audio = getAudio(); if (!audio) return;
    const now = audio.currentTime, oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now); oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration);
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(volume, now + .012); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(audio.destination); oscillator.start(now); oscillator.stop(now + duration + .02);
  }

  function noise(duration = .18, volume = .08) {
    const audio = getAudio(); if (!audio) return;
    const length = Math.floor(audio.sampleRate * duration), buffer = audio.createBuffer(1, length, audio.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
    const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
    source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = 820; gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(audio.destination); source.start();
  }

  function metalImpact(intensity = 1) {
    const audio = getAudio(); if (!audio) return;
    const now = audio.currentTime;
    const master = audio.createGain();
    const compressor = audio.createDynamicsCompressor();
    master.gain.setValueAtTime(.0001, now);
    master.gain.exponentialRampToValueAtTime(.18 * intensity, now + .004);
    master.gain.exponentialRampToValueAtTime(.0001, now + .72);
    compressor.threshold.value = -18;
    compressor.knee.value = 8;
    compressor.ratio.value = 6;
    master.connect(compressor).connect(audio.destination);

    [173, 287, 419, 673, 947].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const partial = audio.createGain();
      oscillator.type = index < 2 ? 'square' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * .72, now + .55);
      partial.gain.setValueAtTime(.12 / (index + 1), now);
      partial.gain.exponentialRampToValueAtTime(.0001, now + .18 + index * .1);
      oscillator.connect(partial).connect(master);
      oscillator.start(now + index * .002);
      oscillator.stop(now + .75);
    });

    const length = Math.floor(audio.sampleRate * .16);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 4);
    const strike = audio.createBufferSource();
    const highpass = audio.createBiquadFilter();
    strike.buffer = buffer;
    highpass.type = 'highpass';
    highpass.frequency.value = 1450;
    strike.connect(highpass).connect(master);
    strike.start(now);

    const screech = audio.createOscillator();
    const screechGain = audio.createGain();
    screech.type = 'sine';
    screech.frequency.setValueAtTime(1850, now);
    screech.frequency.exponentialRampToValueAtTime(3450, now + .065);
    screech.frequency.exponentialRampToValueAtTime(1280, now + .34);
    screechGain.gain.setValueAtTime(.0001, now);
    screechGain.gain.exponentialRampToValueAtTime(.075 * intensity, now + .008);
    screechGain.gain.exponentialRampToValueAtTime(.0001, now + .36);
    screech.connect(screechGain).connect(compressor);
    screech.start(now); screech.stop(now + .38);

    const rumble = audio.createOscillator();
    const rumbleGain = audio.createGain();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(62, now);
    rumble.frequency.exponentialRampToValueAtTime(34, now + .92);
    rumbleGain.gain.setValueAtTime(.07 * intensity, now);
    rumbleGain.gain.exponentialRampToValueAtTime(.0001, now + .95);
    rumble.connect(rumbleGain).connect(compressor);
    rumble.start(now); rumble.stop(now + .98);
  }

  function fireWhoosh() {
    const audio = getAudio(); if (!audio) return;
    const now = audio.currentTime;
    const length = Math.floor(audio.sampleRate * .7);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / length);
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    source.buffer = buffer; filter.type = 'bandpass';
    filter.frequency.setValueAtTime(260, now);
    filter.frequency.exponentialRampToValueAtTime(1350, now + .18);
    filter.frequency.exponentialRampToValueAtTime(190, now + .7);
    filter.Q.value = .7;
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.12, now + .06);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .7);
    source.connect(filter).connect(gain).connect(audio.destination); source.start(now);
  }

  function electricZap() {
    [2100, 2850, 3600, 2450].forEach((frequency, index) => setTimeout(() => tone(frequency, .055, 'square', .025, frequency * .58), index * 32));
  }

  function playCue(name) {
    if (!state.sound) return;
    if (name === 'tap') tone(520, .06, 'square', .035, 720);
    if (name === 'summon') { tone(170, .32, 'sawtooth', .06, 880); setTimeout(() => tone(920, .16, 'square', .04, 1320), 170); }
    if (name === 'count') tone(260, .1, 'square', .055, 220);
    if (name === 'shoot') { noise(.22, .09); tone(110, .38, 'sawtooth', .08, 520); }
    if (name === 'impact') metalImpact(1);
    if (name === 'fire') fireWhoosh();
    if (name === 'zap') electricZap();
    if (name === 'win') { [523,659,784,1047].forEach((f,i) => setTimeout(() => tone(f,.22,'triangle',.055,f*1.04),i*105)); }
    if (name === 'lose') { tone(240,.42,'sawtooth',.045,70); }
  }

  function startSpinSound() {
    const audio = getAudio(); if (!audio) return;
    const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
    oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(105, now); oscillator.frequency.linearRampToValueAtTime(72, now + 5.2);
    gain.gain.setValueAtTime(.018, now); gain.gain.linearRampToValueAtTime(.008, now + 5.2);
    oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(now + 5.25); state.spinAudio = oscillator;
  }

  function initTabletActionDock() {
    const hero = document.querySelector('.arena-hero');
    const game = document.querySelector('.top-game');
    if (!hero || !game || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(([entry]) => {
      game.classList.toggle('is-arena-active', entry.isIntersecting);
    }, { threshold: .08 });
    observer.observe(hero);
  }

  function cloneProduct(product) { return { ...product, stats: { ...product.stats } }; }
  function findProduct(name) { return productCatalog.find(product => product.name === name) || null; }
  function createTop(isEnemy = false) {
    const choices = !isEnemy && state.player && productCatalog.length > 1
      ? productCatalog.filter(product => product.id !== state.player.id)
      : productCatalog;
    const product = isEnemy ? (findProduct(state.opponent.top) || productCatalog[1]) : pick(choices);
    return cloneProduct(product);
  }

  function score(top) {
    const s = top.stats;
    return s.attack * .28 + s.defense * .22 + s.stamina * .25 + s.burst * .13 + s.xdash * .12 + Math.random() * 22;
  }

  function clamp(min, max, value) { return Math.max(min, Math.min(max, value)); }

  function ringOutResistance(top) {
    return top.stats.defense * .85 + top.stats.stamina * .1 + top.stats.burst * .05;
  }

  function ringOutChance(attacker, defender) {
    const impactForce = attacker.stats.attack * .55 + attacker.stats.xdash * .3 + attacker.stats.burst * .15;
    return clamp(.06, .76, .26 + (impactForce - ringOutResistance(defender)) / 150);
  }

  function simulateKnockoutBattle(player, enemy) {
    const playerRingOutChance = ringOutChance(enemy, player);
    const enemyRingOutChance = ringOutChance(player, enemy);
    let playerWon = false, decided = false, decidingImpact = 3;
    for (let impact = 1; impact <= 3; impact += 1) {
      const enemyOutMargin = enemyRingOutChance - Math.random();
      const playerOutMargin = playerRingOutChance - Math.random();
      if (enemyOutMargin > 0 || playerOutMargin > 0) {
        playerWon = enemyOutMargin > playerOutMargin;
        decided = true; decidingImpact = impact; break;
      }
    }
    if (!decided) {
      const playerResistance = ringOutResistance(player);
      const enemyResistance = ringOutResistance(enemy);
      const playerEnduranceChance = clamp(.15, .85, playerResistance / (playerResistance + enemyResistance));
      playerWon = Math.random() < playerEnduranceChance;
    }
    return { playerWon, playerRingOutChance, enemyRingOutChance, decidingImpact };
  }

  function polarPoints(count, outer, inner) {
    const points = [];
    for (let i = 0; i < count * 2; i += 1) {
      const a = -Math.PI / 2 + (Math.PI * i) / count;
      const r = i % 2 ? inner : outer;
      points.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return points;
  }

  function createRotor(root, top, label) {
    const stage = root.group().attr({ id: `${label}-stage` });
    const tilt = stage.group().attr({ id: `${label}-tilt` });
    const spin = tilt.group().attr({ id: `${label}-rotor` });
    const shadow = stage.ellipse(160, 32).center(0, 60).fill('#000').opacity(.48);
    shadow.attr({ filter: 'blur(8px)' });

    spin.circle(178).center(0, 0).fill(top.color).opacity(.1).attr({ filter: 'url(#speedGlow)' });
    spin.circle(154).center(0, 0).fill('none').stroke({ color: top.color, width: 5, opacity: .48, dasharray: '36 12' }).attr({ filter: 'url(#coreGlow)' });
    spin.circle(137).center(0, 0).fill('none').stroke({ color: '#ffffff', width: 2, opacity: .42, dasharray: '8 18' });
    spin.polygon(polarPoints(top.teeth, 83, 61)).fill(top.color).stroke({ color: '#eaffff', width: 2, opacity: .78 }).attr({ filter: 'url(#rotorShine)' });
    spin.polygon(polarPoints(top.teeth, 67, 48)).fill('#0c1720').stroke({ color: top.accent, width: 5, opacity: .88 }).rotate(180 / top.teeth);
    for (let i = 0; i < top.teeth; i += 1) {
      const angle = (360 / top.teeth) * i;
      const blade = spin.path('M 0 -56 C 15 -58 28 -49 36 -34 L 25 -27 C 17 -38 10 -42 0 -42 Z')
        .fill(top.accent).opacity(i % 2 ? .5 : .82).rotate(angle, 0, 0);
      blade.stroke({ color: '#fff', width: .7, opacity: .35 });
    }
    spin.circle(82).center(0, 0).fill('#081016').stroke({ color: top.color, width: 4 });
    spin.circle(56).center(0, 0).fill(top.color).opacity(.22).stroke({ color: top.accent, width: 2 });
    spin.polygon(polarPoints(top.core, 24, 12)).fill(top.accent).stroke({ color: '#efffff', width: 1.5 });
    spin.circle(8).center(0, 0).fill('#efffff').attr({ filter: 'url(#coreGlow)' });
    spin.circle(11).center(43, -13).fill('#ffffff').opacity(.95).attr({ filter: 'url(#coreGlow)' });
    spin.circle(120).center(0, 0).fill('none').stroke({ color: top.color, width: 2, opacity: .25, dasharray: '4 8' });

    stage.attr({ style: `filter:drop-shadow(0 0 8px ${top.color}) drop-shadow(0 0 20px ${top.color}88)` });
    return { stage, tilt, spin, shadow, top, x: 0, y: 0, rotation: 0, speed: 0, wobble: 0 };
  }

  function buildScene() {
    if (!SVG_NS_READY || !els.stage) return;
    els.stage.innerHTML = '';
    const draw = window.SVG().addTo(els.stage).size('100%', '100%').viewbox(0, 0, 960, 650);
    draw.attr({ preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true' });
    state.draw = draw;

    const defs = draw.defs();
    defs.node.innerHTML += `
      <filter id="coreGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="speedGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="16"/></filter>
      <filter id="rotorShine" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="soft"/><feMerge><feMergeNode in="soft"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="arenaBlur"><feGaussianBlur stdDeviation="12"/></filter>
      <radialGradient id="floorGlow"><stop offset="0" stop-color="#28f4e8" stop-opacity=".16"/><stop offset=".5" stop-color="#123343" stop-opacity=".12"/><stop offset="1" stop-color="#020407" stop-opacity="0"/></radialGradient>`;

    draw.ellipse(860, 430).center(480, 365).fill('url(#floorGlow)');
    draw.ellipse(750, 360).center(480, 365).fill('#071018').stroke({ color: '#28f4e8', width: 3, opacity: .36 });
    draw.ellipse(650, 295).center(480, 365).fill('#05090d').stroke({ color: '#28f4e8', width: 1, opacity: .2, dasharray: '8 14' });
    draw.ellipse(450, 205).center(480, 365).fill('none').stroke({ color: '#caff3d', width: 1, opacity: .15 });
    for (let i = 0; i < 20; i += 1) {
      const a = (Math.PI * 2 * i) / 20;
      const x1 = 480 + Math.cos(a) * 326, y1 = 365 + Math.sin(a) * 148;
      const x2 = 480 + Math.cos(a) * 372, y2 = 365 + Math.sin(a) * 178;
      draw.line(x1, y1, x2, y2).stroke({ color: '#28f4e8', width: i % 5 ? 1 : 3, opacity: i % 5 ? .16 : .48 });
    }
    const core = draw.group().attr({ id: 'arena-core' });
    core.circle(68).center(480, 365).fill('none').stroke({ color: '#28f4e8', width: 1, opacity: .18, dasharray: '3 7' });
    core.line(438, 365, 522, 365).stroke({ color: '#28f4e8', width: 1, opacity: .14 });
    core.line(480, 323, 480, 407).stroke({ color: '#28f4e8', width: 1, opacity: .14 });
    const impact = draw.group().attr({ id: 'impact-layer' });
    const players = draw.group();
    const player = createRotor(players, state.player || createTop(), 'player');
    const enemy = createRotor(players, state.enemy || createTop(true), 'enemy');
    player.x = 325; player.y = 365; enemy.x = 635; enemy.y = 365;
    player.stage.translate(player.x, player.y); enemy.stage.translate(enemy.x, enemy.y);
    const labels = draw.group().attr({ id: 'fighter-labels' });
    labels.text('YOU').font({ family: 'IBM Plex Mono', size: 12, weight: 700 }).fill(state.player?.color || '#28f4e8').center(325, 492).attr({ 'letter-spacing': 3 });
    labels.text('RIVAL').font({ family: 'IBM Plex Mono', size: 12, weight: 700 }).fill(state.enemy?.color || '#ff4d67').center(635, 492).attr({ 'letter-spacing': 3 });
    state.scene = { player, enemy, core, impact };
    renderPose();
    startIdleLoop();
  }

  function renderPose() {
    const scene = state.scene;
    if (!scene) return;
    ['player', 'enemy'].forEach(key => {
      const actor = scene[key];
      actor.stage.transform({ translateX: actor.x, translateY: actor.y });
      actor.tilt.transform({ rotate: Math.sin(actor.rotation * .035) * actor.wobble, origin: [0, 0], scaleX: 1 + actor.wobble * .004, scaleY: 1 - actor.wobble * .002 });
      actor.spin.transform({ rotate: actor.rotation, origin: [0, 0] });
    });
  }

  function startIdleLoop() {
    cancelAnimationFrame(state.raf);
    let previous = performance.now();
    const tick = now => {
      const dt = Math.min(32, now - previous); previous = now;
      if (!state.battling && state.scene) {
        state.scene.player.rotation += .58 * dt;
        state.scene.enemy.rotation -= .53 * dt;
        state.scene.player.wobble *= .96;
        state.scene.enemy.wobble *= .96;
        renderPose();
      }
      state.raf = requestAnimationFrame(tick);
    };
    state.raf = requestAnimationFrame(tick);
  }

  function burst(x, y, color, power = 1) {
    if (!state.scene) return;
    const group = state.scene.impact.group();
    const ring = group.circle(20).center(x, y).fill('none').stroke({ color, width: 5, opacity: .9 });
    ring.animate(420).ease('>').size(150 * power, 150 * power).center(x, y).opacity(0).after(() => ring.remove());
    for (let i = 0; i < 15; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const length = randomInt(35, 100) * power;
      const spark = group.line(x, y, x + Math.cos(angle) * 8, y + Math.sin(angle) * 8)
        .stroke({ color: i % 3 ? color : '#ffffff', width: randomInt(2, 5), opacity: .95, linecap: 'round' });
      spark.animate(randomInt(260, 520)).ease('>').plot(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length).opacity(0).after(() => spark.remove());
    }
    const flash = state.scene.impact.polygon(polarPoints(12, 55 * power, 10)).center(x, y).fill('#ffffff').opacity(.85);
    flash.animate(180).ease('>').size(190 * power, 190 * power).center(x, y).rotate(35).opacity(0).after(() => flash.remove());
  }

  function spinHalo(x, y, color) {
    if (!state.scene || reducedMotion) return;
    const group = state.scene.impact.group().attr({ id: `fx-spin-halo-${makeId()}` });
    [0, 1, 2].forEach(index => {
      const ring = group.circle(120 + index * 24).center(x, y).fill('none').stroke({ color: index === 1 ? '#ffffff' : color, width: 3 - index * .6, opacity: .7 - index * .14, dasharray: `${18 + index * 6} ${9 + index * 5}` });
      ring.animate(720 + index * 130).ease('>').rotate(index % 2 ? -210 : 240, x, y).size(220 + index * 38, 220 + index * 38).center(x, y).opacity(0);
    });
    setTimeout(() => group.remove(), 1200);
  }

  function defenseShield(actor) {
    if (!state.scene || reducedMotion || !actor) return;
    const group = state.scene.impact.group().attr({ id: `fx-defense-${makeId()}` });
    const strength = clamp(.45, 1, actor.top.stats.defense / 120);
    const shield = group.polygon(polarPoints(8, 105 + strength * 28, 96 + strength * 24)).center(actor.x, actor.y)
      .fill(actor.top.color).opacity(.12).stroke({ color: '#bffff8', width: 5, opacity: .9 }).attr({ filter: 'url(#coreGlow)' });
    const ring = group.circle(185 + strength * 45).center(actor.x, actor.y).fill('none').stroke({ color: actor.top.color, width: 7, opacity: .72, dasharray: '24 11' });
    shield.transform({ scale: .55, origin: [actor.x, actor.y] }).animate(150).ease('>').opacity(.7).transform({ scale: 1.08, origin: [actor.x, actor.y] }).animate(420).ease('>').opacity(0).transform({ scale: 1.28, origin: [actor.x, actor.y] });
    ring.animate(620).ease('>').rotate(230, actor.x, actor.y).size(280, 280).center(actor.x, actor.y).opacity(0);
    setTimeout(() => group.remove(), 760);
  }

  function lightningStrike(x, y, color = '#82f7ff') {
    if (!state.scene || reducedMotion) return;
    const group = state.scene.impact.group().attr({ id: `fx-lightning-${makeId()}` });
    for (let branch = 0; branch < 4; branch += 1) {
      const points = [[x + randomInt(-35, 35), y - 175]];
      for (let step = 1; step <= 7; step += 1) points.push([x + randomInt(-62, 62), y - 175 + step * 27]);
      const glow = group.polyline(points).fill('none').stroke({ color, width: branch ? 4 : 8, opacity: branch ? .9 : .42, linecap: 'round', linejoin: 'round' });
      glow.attr({ filter: 'url(#coreGlow)' });
      glow.animate(90 + branch * 20).ease('-').opacity(1).animate(240).ease('>').opacity(0);
    }
    const core = group.circle(34).center(x, y).fill('#ffffff').opacity(.95).attr({ filter: 'url(#coreGlow)' });
    core.animate(260).ease('>').size(180, 180).center(x, y).opacity(0);
    setTimeout(() => group.remove(), 520);
  }

  function flameBurst(x, y, direction = 1) {
    if (!state.scene || reducedMotion) return;
    const group = state.scene.impact.group().attr({ id: `fx-fire-${makeId()}` });
    const colors = ['#fff4a8', '#ffd23f', '#ff8a18', '#ff3b18'];
    for (let i = 0; i < 24; i += 1) {
      const size = randomInt(18, 48);
      const startX = x + randomInt(-35, 35), startY = y + randomInt(-20, 30);
      const travelX = direction * randomInt(55, 185) + randomInt(-35, 35);
      const travelY = -randomInt(45, 145);
      const flame = group.ellipse(size * .58, size).center(startX, startY).fill(colors[i % colors.length]).opacity(.92);
      if (i % 3 === 0) flame.attr({ filter: 'url(#coreGlow)' });
      flame.rotate(randomInt(-35, 35));
      flame.animate(randomInt(360, 680), i * 7, 'now').ease('>').dmove(travelX, travelY).size(2, 2).opacity(0);
    }
    const wave = group.path(`M ${x - 22} ${y + 25} C ${x - 5} ${y - 95}, ${x + direction * 90} ${y - 125}, ${x + direction * 175} ${y - 35} C ${x + direction * 92} ${y - 55}, ${x + 20} ${y + 5}, ${x - 22} ${y + 25} Z`).fill('#ff6a18').opacity(.68).attr({ filter: 'url(#coreGlow)' });
    wave.animate(480).ease('>').dmove(direction * 48, -28).opacity(0);
    setTimeout(() => group.remove(), 900);
  }

  function elementalClash(x, y, winnerColor, direction) {
    burst(x, y, winnerColor, 1.55);
    lightningStrike(x, y - 10, '#78f8ff');
    flameBurst(x, y + 24, direction);
    spinHalo(x, y, winnerColor);
  }

  function runCountdown() {
    if (reducedMotion) { els.countdown.textContent = 'SHOOT!'; playCue('shoot'); return new Promise(resolve => setTimeout(() => { els.countdown.textContent = ''; resolve(); }, 180)); }
    const beats = ['3', '2', '1', 'SHOOT!'];
    return new Promise(resolve => {
      let index = 0;
      const next = () => {
        const beat = beats[index]; els.countdown.textContent = beat; els.countdown.classList.remove('is-beat'); void els.countdown.offsetWidth; els.countdown.classList.add('is-beat');
        if (beat === 'SHOOT!') { playCue('shoot'); els.stageWrap.classList.add('is-launching'); } else playCue('count');
        index += 1;
        if (index < beats.length) setTimeout(next, beat === 'SHOOT!' ? 350 : 520);
        else setTimeout(() => { els.countdown.textContent = ''; els.countdown.classList.remove('is-beat'); els.stageWrap.classList.remove('is-launching'); resolve(); }, 420);
      };
      next();
    });
  }

  function summon() {
    if (state.battling) return;
    playCue('summon');
    state.player = createTop(false);
    state.enemy = createTop(true);
    hideResult();
    const card = els.productImage?.closest('.core-card');
    card?.classList.remove('is-summoning');
    void card?.offsetWidth;
    card?.classList.add('is-summoning');
    updateCard();
    renderCollection();
    buildScene();
    const actor = state.scene.player;
    els.status.textContent = 'CORE SYNCHRONIZED';
    actor.stage.opacity(0).transform({ translateX: 480, translateY: 220, scale: .15 });
    actor.stage.animate(reducedMotion ? 1 : 760).ease('>')
      .opacity(1).transform({ translateX: 325, translateY: 365, scale: 1 });
    burst(325, 365, state.player.color, .8);
    setTimeout(() => card?.classList.remove('is-summoning'), 760);
    els.battle.disabled = false; els.save.disabled = false;
    els.summon.textContent = '抽陀螺';
  }

  function updateCard() {
    const top = state.player;
    if (!top) return;
    els.name.textContent = top.name;
    els.className.textContent = `${top.type} · BEYBLADE X 完整商品組合`;
    els.rarity.textContent = 'BX SERIES';
    els.rarity.style.color = top.color;
    els.code.textContent = `PRODUCT // ${top.id}`;
    els.skill.textContent = top.skill;
    els.parts.textContent = top.parts;
    els.productImage.src = top.image; els.productImage.alt = `${top.name} 官方商品圖`; els.productLink.href = top.source;
    const labels = { attack: '攻擊', defense: '防禦', stamina: '持久', burst: '防爆', xdash: 'X衝刺' };
    els.stats.innerHTML = Object.entries(top.stats).map(([key, value]) => `<div class="stat-row"><span>${labels[key]}</span><div class="stat-track"><div class="stat-fill" data-value="${value}"></div></div><strong>${value}</strong></div>`).join('');
    requestAnimationFrame(() => els.stats.querySelectorAll('.stat-fill').forEach(bar => { bar.style.width = `${Math.min(100, Number(bar.dataset.value) / 120 * 100)}%`; }));
    syncSaveButton();
  }

  function hideResult() { els.result.classList.remove('is-visible'); }
  function showResult(playerWon) {
    els.resultTitle.textContent = playerWon ? `擊破 ${state.opponent.name}` : `${state.opponent.name} 守住紀錄`;
    const model = state.lastBattleModel;
    const playerRisk = model ? Math.round(model.playerRingOutChance * 100) : 0;
    const enemyRisk = model ? Math.round(model.enemyRingOutChance * 100) : 0;
    els.resultCopy.textContent = `${playerWon ? '對手被撞出場！' : '你被撞出場！'} 本場擊飛風險：你 ${playerRisk}% ／ 對手 ${enemyRisk}%。`;
    els.result.classList.add('is-visible');
  }

  async function battle() {
    if (!state.player || state.battling) return;
    state.enemy = cloneProduct(findProduct(state.opponent.top) || state.enemy || productCatalog[1]);
    buildScene();
    if (!state.scene) return;
    state.scene.player.stage.opacity(1);
    state.scene.enemy.stage.opacity(1);
    state.scene.player.x = 325; state.scene.player.y = 365;
    state.scene.enemy.x = 635; state.scene.enemy.y = 365;
    renderPose();
    state.battling = true; hideResult(); els.status.textContent = 'LAUNCH SEQUENCE';
    els.battle.disabled = true; els.summon.disabled = true;
    await runCountdown();
    startSpinSound();
    spinHalo(325, 365, state.player.color);
    setTimeout(() => spinHalo(635, 365, state.enemy.color), 130);
    els.status.textContent = 'BATTLE IN PROGRESS';
    const model = simulateKnockoutBattle(state.player, state.enemy);
    state.lastBattleModel = model;
    const playerWon = model.playerWon;
    const survivalEdge = model.enemyRingOutChance - model.playerRingOutChance;
    const recordScore = Math.max(100, Math.round(1000 + survivalEdge * 900 + (playerWon ? 180 : 0) + Math.random() * 45));
    if (reducedMotion) {
      burst(480, 365, playerWon ? state.player.color : state.enemy.color, 1.1);
      setTimeout(() => finishBattle(playerWon, recordScore), 180);
      return;
    }

    const start = performance.now();
    const duration = 5000;
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    let impactOne = false, impactTwo = false, previousFrame = start;
    const frame = now => {
      const t = Math.min(1, (now - start) / duration);
      const dt = Math.min(32, now - previousFrame); previousFrame = now;
      const p = state.scene.player, e = state.scene.enemy;
      p.rotation += (1.12 + t * .38) * dt; e.rotation -= (1.04 + t * .35) * dt;
      if (t < .3) {
        const k = easeInOut(t / .3);
        p.x = 325 + 132 * k; e.x = 635 - 132 * k;
        p.y = 365 - Math.sin(k * Math.PI) * 36; e.y = 365 + Math.sin(k * Math.PI) * 28;
      } else if (t < .46) {
        if (!impactOne) { burst(480, 362, '#ffffff', 1.15); lightningStrike(480, 350); defenseShield(state.player.stats.defense >= state.enemy.stats.defense ? p : e); playCue('impact'); playCue('zap'); els.stageWrap.classList.add('is-impacting'); setTimeout(() => els.stageWrap.classList.remove('is-impacting'), 260); impactOne = true; }
        const k = easeOut((t - .3) / .16);
        p.x = 457 - 92 * k; e.x = 503 + 96 * k; p.y = 329 + 54 * k; e.y = 393 - 45 * k;
        p.wobble = 4 * (1 - k); e.wobble = 5 * (1 - k);
      } else if (t < .76) {
        const k = easeInOut((t - .46) / .3);
        const winner = playerWon ? p : e, loser = playerWon ? e : p;
        const direction = playerWon ? 1 : -1;
        winner.x = (playerWon ? 365 : 599) + direction * 95 * k;
        winner.y = 383 - Math.sin(k * Math.PI) * 100;
        loser.x = (playerWon ? 599 : 365) - direction * 72 * k;
        loser.y = 348 + Math.sin(k * Math.PI) * 65;
        loser.wobble = 3 + k * 5;
      } else {
        if (!impactTwo) { elementalClash(480, 360, playerWon ? state.player.color : state.enemy.color, playerWon ? 1 : -1); playCue('impact'); playCue('fire'); setTimeout(() => playCue('zap'), 80); els.stageWrap.classList.add('is-impacting'); setTimeout(() => els.stageWrap.classList.remove('is-impacting'), 320); impactTwo = true; }
        const k = easeOut((t - .76) / .24);
        const winner = playerWon ? p : e, loser = playerWon ? e : p;
        winner.x = (playerWon ? 460 : 500) + Math.sin(k * Math.PI * 2) * 18 * (1 - k);
        winner.y = 365 + Math.sin(k * Math.PI) * 18;
        const loserStartX = playerWon ? 527 : 433;
        loser.x = loserStartX + (playerWon ? 1 : -1) * 365 * k;
        loser.y = 365 - 155 * Math.sin(k * Math.PI) + 54 * k;
        loser.wobble = 10 + k * 14;
        loser.stage.opacity(Math.max(.04, 1 - k * .96));
      }
      renderPose();
      if (t < 1) requestAnimationFrame(frame); else finishBattle(playerWon, recordScore);
    };
    requestAnimationFrame(frame);
  }

  function finishBattle(playerWon, recordScore) {
    state.battling = false; els.status.textContent = 'BATTLE COMPLETE';
    els.battle.disabled = false; els.summon.disabled = false;
    els.battle.textContent = '戰鬥開始'; showResult(playerWon); playCue(playerWon ? 'win' : 'lose');
    submitScore(recordScore, playerWon);
    if (state.scene) {
      const winner = playerWon ? state.scene.player : state.scene.enemy;
      winner.x = playerWon ? 460 : 500; winner.y = 365; winner.wobble = 0;
      winner.stage.opacity(1); renderPose();
    }
  }

  function readStorage(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (_) { return fallback; }
  }
  function writeStorage(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* storage can be unavailable */ } }

  function readProfile() {
    const saved = readStorage(storageKeys.profile, {});
    return { avatar: saved.avatar || '⚡', name: String(saved.name || '').trim().slice(0, 10) };
  }

  function initProfile() {
    const profile = readProfile();
    els.pilotName.value = profile.name;
    const paint = () => {
      const selected = readProfile().avatar;
      els.avatarPicker.querySelectorAll('[data-avatar]').forEach(button => {
        const active = button.dataset.avatar === selected;
        button.classList.toggle('is-selected', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    };
    els.avatarPicker.querySelectorAll('[data-avatar]').forEach(button => button.addEventListener('click', () => {
      writeStorage(storageKeys.profile, { ...readProfile(), avatar: button.dataset.avatar });
      paint(); renderLeaderboard();
    }));
    els.pilotName.addEventListener('input', () => {
      writeStorage(storageKeys.profile, { ...readProfile(), name: els.pilotName.value.trim().slice(0, 10) });
    });
    paint();
  }

  function openJoinSetup() {
    els.game.dataset.phase = 'setup';
    els.joinModal.hidden = false;
    renderJoinRivals();
    els.joinModal.querySelector('[data-avatar].is-selected')?.focus();
  }

  function closeJoinSetup() {
    els.joinModal.hidden = true;
    els.game.dataset.phase = 'intro';
    els.joinButton?.focus();
  }

  function enterArena() {
    els.joinModal.hidden = true;
    els.game.dataset.phase = 'game';
    document.querySelector('.arena-hero')?.scrollIntoView({ block: 'start' });
    requestAnimationFrame(() => buildScene());
  }

  function renderJoinRivals() {
    if (!els.joinRivals) return;
    const rivals = state.ranked.length ? state.ranked.slice(0, 3) : [state.opponent];
    els.joinRivals.innerHTML = rivals.map((entry, index) => `<button type="button" class="join-rival${state.opponent.id === entry.id ? ' is-selected' : ''}" data-join-rival="${index}"><span><i>${escapeHTML(entry.avatar || '⚡')}</i><strong>${escapeHTML(entry.name)}</strong></span><b>${Number(entry.score).toLocaleString('zh-TW')} PTS</b></button>`).join('');
    els.joinRivals.querySelectorAll('[data-join-rival]').forEach(button => button.addEventListener('click', () => {
      setOpponent(rivals[Number(button.dataset.joinRival)]);
      renderJoinRivals();
    }));
  }

  function openLeaderboard() {
    els.leaderboardModal.hidden = false;
    els.leaderboardClose.focus();
  }

  function closeLeaderboard() {
    els.leaderboardModal.hidden = true;
    els.changeRival.focus();
  }

  function syncSaveButton() {
    if (!els.save || !state.player) return;
    const isSaved = readCollection().some(item => item.id === state.player.id);
    els.save.disabled = false;
    els.save.textContent = isSaved ? '已收藏 ✓' : '收藏這顆';
    els.save.classList.toggle('is-saved', isSaved);
  }

  function saveTop() {
    if (!state.player) return;
    const collection = readCollection();
    if (collection.some(item => item.id === state.player.id)) { syncSaveButton(); openCollectionPicker(); return; }
    collection.unshift(state.player); writeStorage(storageKeys.collection, collection.slice(0, 5));
    syncSaveButton(); renderCollection(); openCollectionPicker();
  }

  function equipTop(productId) {
    if (state.battling) return;
    const saved = readCollection().find(item => item.id === productId);
    const product = findProduct(saved?.name) || productCatalog.find(item => item.id === productId);
    if (!product) return;
    state.player = cloneProduct(product);
    hideResult(); updateCard(); buildScene(); renderCollection();
    els.status.textContent = 'COLLECTION CORE EQUIPPED';
    els.battle.disabled = false; els.save.disabled = false;
    syncSaveButton();
    els.summon.textContent = '抽陀螺';
    closeCollectionPicker();
    document.querySelector('.arena-hero')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function renderBattleCollectionPicker() {
    const products = readCollection()
      .map(saved => findProduct(saved.name) || productCatalog.find(item => item.id === saved.id))
      .filter(Boolean);
    if (!products.length) {
      els.collectionPickerList.innerHTML = '<p class="battle-collection-picker__empty">還沒有收藏。先關閉這裡，再按「收藏這顆」。</p>';
      return;
    }
    els.collectionPickerList.innerHTML = products.map(top => {
      const equipped = state.player?.id === top.id;
      return `<article class="battle-collection-choice-row"><button type="button" class="battle-collection-choice${equipped ? ' is-equipped' : ''}" data-picker-equip="${top.id}" ${equipped ? 'disabled' : ''}><img src="${top.image}" alt=""><span><small>${top.id} · ${escapeHTML(top.type)}</small><strong>${escapeHTML(top.name)}</strong><em>${equipped ? '目前出戰中' : '選這顆出戰 →'}</em></span></button><a class="battle-collection-buy" href="${top.source}" target="_blank" rel="noopener">商品／購買資訊 ↗</a></article>`;
    }).join('');
    els.collectionPickerList.querySelectorAll('[data-picker-equip]').forEach(button => button.addEventListener('click', () => equipTop(button.dataset.pickerEquip)));
  }

  function openCollectionPicker() {
    renderBattleCollectionPicker();
    els.collectionPicker.hidden = false;
    els.collectionPicker.classList.add('is-open');
    els.collectionPickerClose.focus();
  }

  function closeCollectionPicker() {
    els.collectionPicker.classList.remove('is-open');
    els.collectionPicker.hidden = true;
  }

  function renderCollection() {
    const collection = readCollection();
    if (!collection.length) { els.collection.innerHTML = '<p class="collection-empty">還沒有收藏。先回競技場召喚第一顆吧。</p>'; return; }
    els.collection.innerHTML = collection.map(saved => {
      const top = findProduct(saved.name) || saved;
      const equipped = state.player?.id === top.id;
      return `<article class="saved-core${equipped ? ' is-equipped' : ''}" style="--core-color:${top.color}"><button class="saved-core__remove" type="button" data-remove="${top.id}" aria-label="移除 ${top.name}">×</button><span>BX SERIES // ${top.id}</span><img src="${top.image || ''}" alt="${escapeHTML(top.name)} 商品圖"><h3>${escapeHTML(top.name)}</h3><p>${escapeHTML(top.type)} · 戰力 ${Math.round(scoreWithoutLuck(top))}</p><button class="saved-core__equip" type="button" data-equip="${top.id}" ${equipped ? 'disabled' : ''}>${equipped ? '出戰中 ✓' : '選這顆出戰'}</button></article>`;
    }).join('');
    els.collection.querySelectorAll('[data-equip]').forEach(button => button.addEventListener('click', () => equipTop(button.dataset.equip)));
    els.collection.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => {
      const next = readCollection().filter(top => top.id !== button.dataset.remove);
      writeStorage(storageKeys.collection, next); renderCollection(); syncSaveButton();
    }));
  }

  function scoreWithoutLuck(top) {
    const s = top.stats; return s.attack * .28 + s.defense * .22 + s.stamina * .25 + s.burst * .13 + s.xdash * .12;
  }

  function readCollection() {
    const raw = readStorage(storageKeys.collection, []);
    let migrated = false;
    const normalized = raw.map((saved, index) => {
      const current = findProduct(saved?.name) || productCatalog.find(product => product.id === saved?.id);
      if (current) return cloneProduct(current);
      migrated = true;
      return cloneProduct(productCatalog[index % productCatalog.length]);
    }).filter((product, index, list) => list.findIndex(item => item.id === product.id) === index).slice(0, 5);
    if (migrated || normalized.length !== raw.length) writeStorage(storageKeys.collection, normalized);
    return normalized;
  }

  function submitScore(points, won) {
    const profile = readProfile();
    const entry = { id: makeId(), name: profile.name || `旋核手${randomInt(100, 999)}`, avatar: profile.avatar, top: state.player.name, score: points, won, createdAt: Date.now() };
    const scores = readStorage(storageKeys.scores, []);
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    writeStorage(storageKeys.scores, scores.slice(0, 20));
    renderLeaderboard();
    const model = state.lastBattleModel;
    const riskCopy = model ? `擊飛風險：你 ${Math.round(model.playerRingOutChance * 100)}% ／ 對手 ${Math.round(model.enemyRingOutChance * 100)}%。` : '';
    els.resultCopy.textContent = `${won ? '對手被撞出場！' : '你被撞出場！'} ${riskCopy} 本場 ${points.toLocaleString('zh-TW')} 分。`;
    if (scoreEndpoint) {
      fetch(scoreEndpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry) })
        .then(response => response.ok ? response.json() : Promise.reject(new Error('score request failed')))
        .then(data => { if (Array.isArray(data.scores)) renderLeaderboard(data.scores); })
        .catch(() => { /* local record remains available when the backend is unavailable */ });
    }
    if (window.dataLayer) window.dataLayer.push({ event: 'battle_top_score', battle_score: points, battle_won: won });
  }

  function renderLeaderboard(serverScores) {
    if (!els.leaderboard) return;
    const bot = { id: 'demon-boss', name: '魔王', avatar: '👹', top: 'Hells Scythe 4-60T', score: 1000, bot: true };
    const scores = Array.isArray(serverScores) ? serverScores : readStorage(storageKeys.scores, []);
    const ranked = [bot, ...scores].sort((a, b) => b.score - a.score).slice(0, 5);
    state.ranked = ranked;
    els.leaderboard.innerHTML = ranked.map((entry, index) => `<li class="${entry.bot ? 'is-bot' : ''}${state.opponent.id === entry.id ? ' is-target' : ''}"><span>${String(index + 1).padStart(2, '0')}</span><i>${escapeHTML(entry.avatar || '⚡')}</i><div><strong>${escapeHTML(entry.name)}</strong><small>${escapeHTML(entry.top)}</small></div><b>${Number(entry.score).toLocaleString('zh-TW')}</b><button type="button" data-challenge="${index}">PK</button></li>`).join('');
    els.leaderboard.querySelectorAll('[data-challenge]').forEach(button => button.addEventListener('click', () => {
      setOpponent(ranked[Number(button.dataset.challenge)]);
      closeLeaderboard();
    }));
    renderJoinRivals();
  }

  function loadLeaderboard() {
    if (!scoreEndpoint) return;
    fetch(scoreEndpoint)
      .then(response => response.ok ? response.json() : Promise.reject(new Error('leaderboard request failed')))
      .then(data => { if (Array.isArray(data.scores)) renderLeaderboard(data.scores); })
      .catch(() => { /* local leaderboard remains available when the backend is unavailable */ });
  }

  function setOpponent(entry) {
    if (!entry || state.battling) return;
    state.opponent = { ...entry, score: Number(entry.score) || 1000 };
    state.enemy = cloneProduct(findProduct(entry.top) || productCatalog[1]);
    els.opponentAvatar.textContent = entry.avatar || '⚡';
    els.opponentName.textContent = entry.name;
    els.opponentTop.textContent = state.enemy.name;
    els.opponentImage.src = state.enemy.image;
    els.opponentImage.alt = `${state.enemy.name} 官方商品圖`;
    els.opponentScore.textContent = `${state.opponent.score.toLocaleString('zh-TW')} PTS`;
    els.status.textContent = 'TARGET LOCKED';
    hideResult(); buildScene(); renderLeaderboard();
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function initWishes() {
    const wished = readStorage(storageKeys.wishes, []);
    document.querySelectorAll('.wish-card').forEach(card => {
      const id = card.dataset.wish, target = Number(card.dataset.target);
      let count = Number(card.dataset.count) + (wished.includes(id) ? 1 : 0);
      const countEl = card.querySelector('.wish-count strong'), progress = card.querySelector('.wish-progress span'), button = card.querySelector('.wish-button');
      const paint = () => { countEl.textContent = count.toLocaleString('zh-TW'); progress.style.width = `${Math.min(100, count / target * 100)}%`; };
      if (wished.includes(id)) { button.textContent = '願望已送出 ✓'; button.classList.add('is-wished'); }
      paint();
      button.addEventListener('click', () => {
        const current = readStorage(storageKeys.wishes, []);
        if (current.includes(id)) return;
        current.push(id); writeStorage(storageKeys.wishes, current); count += 1; paint();
        button.textContent = '願望已送出 ✓'; button.classList.add('is-wished');
        if (wishEndpoint) {
          fetch(wishEndpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ feature: id }) })
            .then(response => response.ok ? response.json() : Promise.reject(new Error('wish request failed')))
            .then(data => { if (Number.isFinite(data.count)) { count = data.count; paint(); } })
            .catch(() => { /* keep the optimistic local vote when the backend is unavailable */ });
        }
        if (window.dataLayer) window.dataLayer.push({ event: 'battle_top_wish', wish_feature: id });
      });
    });
    if (wishEndpoint) {
      fetch(wishEndpoint)
        .then(response => response.ok ? response.json() : Promise.reject(new Error('wish counts failed')))
        .then(data => {
          document.querySelectorAll('.wish-card').forEach(card => {
            const serverCount = data.counts?.[card.dataset.wish];
            if (!Number.isFinite(serverCount)) return;
            card.dataset.count = String(serverCount - (wished.includes(card.dataset.wish) ? 1 : 0));
            const target = Number(card.dataset.target);
            card.querySelector('.wish-count strong').textContent = serverCount.toLocaleString('zh-TW');
            card.querySelector('.wish-progress span').style.width = `${Math.min(100, serverCount / target * 100)}%`;
          });
        })
        .catch(() => { /* seeded counts remain visible */ });
    }
  }

  els.summon?.addEventListener('click', summon);
  els.battle?.addEventListener('click', () => { state.sound = true; getAudio(); battle(); });
  els.joinButton?.addEventListener('click', openJoinSetup);
  els.joinClose?.addEventListener('click', closeJoinSetup);
  els.enterArena?.addEventListener('click', enterArena);
  els.changeRival?.addEventListener('click', openLeaderboard);
  els.leaderboardClose?.addEventListener('click', closeLeaderboard);
  els.save?.addEventListener('click', saveTop);
  els.collectionPickerButton?.addEventListener('click', openCollectionPicker);
  els.collectionPickerClose?.addEventListener('click', closeCollectionPicker);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !els.joinModal.hidden) closeJoinSetup();
    else if (event.key === 'Escape' && !els.leaderboardModal.hidden) closeLeaderboard();
  });
  renderCollection(); initProfile(); renderLeaderboard(); loadLeaderboard(); initWishes(); initTabletActionDock();
  state.player = createTop(false); state.enemy = createTop(true); updateCard(); buildScene(); renderCollection();
  els.battle.disabled = false; els.save.disabled = false; els.summon.textContent = '抽陀螺';
  els.status.textContent = 'CORE SYNCHRONIZED';
})();
