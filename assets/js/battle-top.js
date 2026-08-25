(() => {
  'use strict';

  const SVG_NS_READY = typeof window.SVG === 'function';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const storageKeys = { collection: 'coomy-top-collection-v1', equipment: 'coomy-top-equipment-v2', legacyEquipment: 'coomy-top-equipment-v1', wishes: 'coomy-top-wishes-v2', scores: 'coomy-top-scores-v1', profile: 'coomy-top-profile-v1', presence: 'coomy-top-presence-v1' };
  const wishEndpoint = window.BATTLE_TOP_WISH_ENDPOINT || '';
  const scoreEndpoint = window.BATTLE_TOP_SCORE_ENDPOINT || '';
  const supabaseUrl = window.BATTLE_TOP_SUPABASE_URL || '';
  const supabasePublishableKey = window.BATTLE_TOP_SUPABASE_PUBLISHABLE_KEY || '';
  const avatarNames = new Set(['nova', 'kai', 'rin', 'leo', 'mika', 'zane', 'astra', 'jett', 'luna', 'onyx', 'skye', 'blaze']);
  const avatarAssets = new Set([...avatarNames].map(name => `/assets/images/battle-top/avatars/${name}.svg`));
  const legacyAvatarMap = { '⚡': 'nova', '🔥': 'blaze', '🐉': 'kai', '🦈': 'skye', '🦁': 'leo', '🌙': 'luna' };

  function trackEvent(name, parameters = {}) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag('event', name, { send_to: 'G-6MLTVNFYPV', ...parameters });
  }

  const productCatalog = [
    { id: 'BX-01', name: 'Dran Sword 3-60F', type: '攻擊型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX01_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx01.html', parts: 'Dran Sword · 3-60 · Flat', skill: '高衝刺力的 Flat 軸尖，鎖定 Xtreme Dash 發動強攻。', color: '#258dff', accent: '#ff334f', stats: { attack: 110, defense: 49, stamina: 36, burst: 80, xdash: 35 }, teeth: 3, core: 3 },
    { id: 'BX-02', name: 'Hells Scythe 4-60T', type: '平衡型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX02_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx02.html', parts: 'Hells Scythe · 4-60 · Taper', skill: '攻防兼備的鐮刀刃與 Taper 軸尖，能依碰撞改變節奏。', color: '#e33a32', accent: '#ffb128', stats: { attack: 76, defense: 68, stamina: 61, burst: 80, xdash: 25 }, teeth: 4, core: 4 },
    { id: 'BX-03', name: 'Wizard Arrow 4-80B', type: '持久型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX03_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx03.html', parts: 'Wizard Arrow · 4-80 · Ball', skill: '離心力刃搭配 Ball 軸尖，靠穩定旋轉把戰局拖進終盤。', color: '#f2c31b', accent: '#59d36c', stats: { attack: 41, defense: 66, stamina: 113, burst: 30, xdash: 10 }, teeth: 4, core: 5 },
    { id: 'BX-04', name: 'Knight Shield 3-80N', type: '防禦型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX04_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx04.html', parts: 'Knight Shield · 3-80 · Needle', skill: '吸收衝擊的盾形刃與 Needle 軸尖，專門抵抗場外擊飛。', color: '#4c63c7', accent: '#e9b339', stats: { attack: 45, defense: 112, stamina: 63, burst: 30, xdash: 10 }, teeth: 3, core: 6 },
    { id: 'BX-23', name: 'Phoenix Wing 9-60GF', type: '攻擊型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/BX23_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/bx23.html', parts: 'Phoenix Wing · 9-60 · Gear Flat', skill: '塗裝金屬重型三枚刃搭配 Gear Flat，以重量與高速 X Dash 強烈彈飛對手。', color: '#d92f36', accent: '#f2b729', stats: { attack: 116, defense: 76, stamina: 48, burst: 82, xdash: 50 }, teeth: 3, core: 5 },
    { id: 'UX-01', name: 'Dran Buster 1-60A', type: '攻擊型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX01_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux01.html', parts: 'Dran Buster · 1-60 · Accel', skill: '大型攻擊刃追求瞬間重擊，Accel 大型齒輪把 X Dash 加速到極限。', color: '#2f72e8', accent: '#ff3358', stats: { attack: 120, defense: 42, stamina: 32, burst: 88, xdash: 58 }, teeth: 2, core: 4 },
    { id: 'UX-02', name: 'Hells Hammer 3-70H', type: '平衡型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX02_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux02.html', parts: 'Hells Hammer · 3-70 · Hexa', skill: '厚重槌刃施加向下衝擊，Hexa 軸尖在攻擊與穩定防守間切換。', color: '#cf3034', accent: '#ff9c2a', stats: { attack: 83, defense: 82, stamina: 64, burst: 72, xdash: 24 }, teeth: 6, core: 5 },
    { id: 'UX-03', name: 'Wizard Rod 5-70DB', type: '持久型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX03_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux03.html', parts: 'Wizard Rod · 5-70 · Disc Ball', skill: '外周金屬配置提高離心力，Disc Ball 擴大穩定面積，擅長長時間旋轉。', color: '#d9b423', accent: '#6cd7ef', stats: { attack: 38, defense: 84, stamina: 120, burst: 68, xdash: 8 }, teeth: 8, core: 7 },
    { id: 'UX-06', name: 'Leon Crest 7-60GN', type: '防禦型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX06_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux06.html', parts: 'Leon Crest · 7-60 · Gear Needle', skill: '厚實外周與多重防禦刃承受撞擊，Gear Needle 守住場地中央。', color: '#2eaa78', accent: '#e1c64b', stats: { attack: 52, defense: 120, stamina: 72, burst: 76, xdash: 14 }, teeth: 7, core: 6 },
    { id: 'UX-08', name: 'Silver Wolf 3-80FB', type: '持久型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX08_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux08.html', parts: 'Silver Wolf · 3-80 · Free Ball', skill: '自由旋轉結構卸除碰撞力，Free Ball 軸尖維持穩定並拖長戰局。', color: '#aab8c8', accent: '#67c8dc', stats: { attack: 42, defense: 94, stamina: 115, burst: 62, xdash: 7 }, teeth: 5, core: 8 },
    { id: 'UX-09', name: 'Samurai Saber 2-70L', type: '攻擊型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX09_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux09.html', parts: 'Samurai Saber · 2-70 · Level', skill: '刀刃造型集中斬擊，Level 軸尖讓移動節奏改變後再切入攻擊。', color: '#38a86b', accent: '#f0d5a1', stats: { attack: 102, defense: 58, stamina: 54, burst: 74, xdash: 43 }, teeth: 4, core: 6 },
    { id: 'UX-11', name: 'Impact Drake 9-60LR', type: '攻擊型', image: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/UX11_list.png', source: 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/ux11.html', parts: 'Impact Drake · 9-60 · Low Rush', skill: '厚重四枚刃加入高反發橡膠，Low Rush 從低位發動猛烈上勾攻擊。', color: '#733aa9', accent: '#e54e63', stats: { attack: 118, defense: 69, stamina: 38, burst: 86, xdash: 48 }, teeth: 4, core: 7 }
  ];

  const customizationParts = {
    blade: [
      { id: 'dran', name: 'Dran Sword', productId: 'BX-01', stats: { attack: 73, defense: 27, stamina: 23, burst: 48, xdash: 22 } },
      { id: 'hells', name: 'Hells Scythe', productId: 'BX-02', stats: { attack: 48, defense: 48, stamina: 43, burst: 48, xdash: 14 } },
      { id: 'wizard', name: 'Wizard Arrow', productId: 'BX-03', stats: { attack: 24, defense: 42, stamina: 76, burst: 21, xdash: 6 } },
      { id: 'knight', name: 'Knight Shield', productId: 'BX-04', stats: { attack: 26, defense: 77, stamina: 42, burst: 21, xdash: 6 } },
      { id: 'phoenix', name: 'Phoenix Wing', productId: 'BX-23', stats: { attack: 78, defense: 48, stamina: 31, burst: 52, xdash: 27 } },
      { id: 'leon', name: 'Leon Crest', productId: 'UX-06', stats: { attack: 31, defense: 82, stamina: 48, burst: 48, xdash: 8 } }
    ],
    ratchet: [
      { id: '3-60', name: '3-60', delta: { attack: 9, defense: 4, stamina: 1, burst: 25, xdash: 5 }, teeth: 3 },
      { id: '4-60', name: '4-60', delta: { attack: 4, defense: 8, stamina: 6, burst: 25, xdash: 2 }, teeth: 4 },
      { id: '5-70', name: '5-70', delta: { attack: 1, defense: 13, stamina: 12, burst: 17, xdash: 0 }, teeth: 5 },
      { id: '7-60', name: '7-60', delta: { attack: 3, defense: 18, stamina: 7, burst: 24, xdash: 1 }, teeth: 7 },
      { id: '9-60', name: '9-60', delta: { attack: 12, defense: 8, stamina: 4, burst: 27, xdash: 5 }, teeth: 9 },
      { id: '3-80', name: '3-80', delta: { attack: 0, defense: 10, stamina: 13, burst: 9, xdash: 0 }, teeth: 3 }
    ],
    bit: [
      { id: 'flat', name: 'Flat', code: 'F', delta: { attack: 28, defense: 8, stamina: 5, burst: 7, xdash: 18 } },
      { id: 'taper', name: 'Taper', code: 'T', delta: { attack: 16, defense: 12, stamina: 12, burst: 7, xdash: 9 } },
      { id: 'ball', name: 'Ball', code: 'B', delta: { attack: 5, defense: 14, stamina: 29, burst: 0, xdash: 2 } },
      { id: 'needle', name: 'Needle', code: 'N', delta: { attack: 4, defense: 27, stamina: 8, burst: 0, xdash: 2 } },
      { id: 'gear-flat', name: 'Gear Flat', code: 'GF', delta: { attack: 27, defense: 13, stamina: 6, burst: 7, xdash: 23 } },
      { id: 'disc-ball', name: 'Disc Ball', code: 'DB', delta: { attack: 4, defense: 18, stamina: 31, burst: 3, xdash: 1 } }
    ]
  };
  const refineEffects = [
    { id: 'fire', name: '烈焰', icon: '🔥', color: '#ff6a18' },
    { id: 'lightning', name: '雷霆', icon: '⚡', color: '#78f8ff' },
    { id: 'ice', name: '冰晶', icon: '❄', color: '#8fe9ff' },
    { id: 'tornado', name: '龍捲', icon: '🌀', color: '#b6fff0' },
    { id: 'dragon', name: '龍魂', icon: '🐉', color: '#caFF3d' }
  ];
  const equipmentCatalog = [
    { id: 'power-gear', name: '猛攻齒輪', icon: '✹', stat: 'attack', label: '攻擊', amount: 8, color: '#ff6847' },
    { id: 'steel-armor', name: '鋼鐵護甲', icon: '⬢', stat: 'defense', label: '防禦', amount: 10, color: '#61e9ff' },
    { id: 'eternal-core', name: '永動軸心', icon: '◎', stat: 'stamina', label: '持久', amount: 9, color: '#caFF3d' },
    { id: 'burst-lock', name: '防爆扣環', icon: '◇', stat: 'burst', label: '防爆', amount: 8, color: '#b781ff' },
    { id: 'dash-engine', name: '衝刺引擎', icon: 'ϟ', stat: 'xdash', label: 'X 衝刺', amount: 10, color: '#ffe25c' }
  ];

  const state = { player: null, enemy: null, opponent: { id: 'demon-boss', name: '魔王', avatar: '👹', top: 'Hells Scythe 4-60T', score: 1000, bot: true }, ranked: [], globalScores: [], battleHistory: [], historyLoaded: false, historyLoading: false, leaderboardQuery: '', leaderboardLoaded: false, leaderboardTotal: 0, leaderboardFilteredTotal: 0, leaderboardHasMore: false, leaderboardSearchTimer: 0, leaderboardRequestId: 0, setupReturnPhase: 'intro', draw: null, scene: null, battling: false, raf: 0, sound: false, audio: null, spinAudio: null, lastBattleModel: null, lastScoreEntry: null, lastLoot: null, requestedChallengeId: new URLSearchParams(window.location.search).get('challenge') || '', customDraft: null, customizingId: '', customNameTimer: 0 };
  const els = {
    game: document.querySelector('#top-game'), joinButton: document.querySelector('#join-arena-button'),
    joinModal: document.querySelector('#join-modal'), joinClose: document.querySelector('#join-modal-close'),
    enterArena: document.querySelector('#enter-arena-button'), joinRivals: document.querySelector('#join-rival-list'),
    changeRival: document.querySelector('#change-rival-button'), onlineCount: document.querySelector('#arena-online-count'), leaderboardModal: document.querySelector('#leaderboard-modal'),
    leaderboardClose: document.querySelector('#leaderboard-modal-close'), leaderboardRefresh: document.querySelector('#leaderboard-refresh'), leaderboardRefreshStatus: document.querySelector('#leaderboard-refresh-status'), leaderboardSearch: document.querySelector('#leaderboard-search'), leaderboardSearchStatus: document.querySelector('#leaderboard-search-status'), leaderboardLoadMore: document.querySelector('#leaderboard-load-more'),
    leaderboardRivalsTab: document.querySelector('#leaderboard-rivals-tab'), leaderboardHistoryTab: document.querySelector('#leaderboard-history-tab'), leaderboardRivalsPanel: document.querySelector('#leaderboard-rivals-panel'), leaderboardHistoryPanel: document.querySelector('#leaderboard-history-panel'), battleHistoryList: document.querySelector('#battle-history-list'), battleHistoryCount: document.querySelector('#battle-history-count'), battleHistoryNote: document.querySelector('#battle-history-note'),
    stage: document.querySelector('#arena-stage'), status: document.querySelector('#arena-status'), battleEffectBanner: document.querySelector('#battle-effect-banner'), battleEffectIcon: document.querySelector('#battle-effect-icon'), battleEffectName: document.querySelector('#battle-effect-name'),
    result: document.querySelector('#battle-result'), resultTitle: document.querySelector('#battle-result-title'),
    resultCopy: document.querySelector('#battle-result-copy'), resultOutcome: document.querySelector('#battle-result-outcome'),
    rankUp: document.querySelector('#battle-rank-up'), rankHeadline: document.querySelector('#battle-rank-headline'), rankChange: document.querySelector('#battle-rank-change'),
    resultRetry: document.querySelector('#battle-result-retry'), resultShare: document.querySelector('#battle-result-share'), resultShareComposer: document.querySelector('#battle-share-composer'), resultShareMessage: document.querySelector('#battle-share-message'), resultShareCopy: document.querySelector('#battle-share-copy'), resultShareStatus: document.querySelector('#battle-result-share-status'), battleLoot: document.querySelector('#battle-loot'), battleLootImage: document.querySelector('#battle-loot-image'), battleLootName: document.querySelector('#battle-loot-name'), battleLootStat: document.querySelector('#battle-loot-stat'), battleLootCount: document.querySelector('#battle-loot-count'), name: document.querySelector('#top-name'),
    className: document.querySelector('#top-class'), rarity: document.querySelector('#top-rarity'),
    code: document.querySelector('#top-code'), skill: document.querySelector('#top-skill'),
    stats: document.querySelector('#stat-grid'), summon: document.querySelector('#summon-button'),
    battle: document.querySelector('#battle-button'), save: document.querySelector('#save-button'),
    collection: document.querySelector('#core-collection'), leaderboard: document.querySelector('#leaderboard-list'),
    collectionPickerButton: document.querySelector('#collection-picker-button'), collectionPicker: document.querySelector('#battle-collection-picker'),
    collectionPickerClose: document.querySelector('#collection-picker-close'), collectionPickerList: document.querySelector('#battle-collection-picker-list'),
    collectionSavedTab: document.querySelector('#collection-tab-saved'), collectionCustomTab: document.querySelector('#collection-tab-custom'), collectionSavedPanel: document.querySelector('#collection-saved-panel'), collectionCustomPanel: document.querySelector('#collection-custom-panel'), collectionSlotCount: document.querySelector('#collection-slot-count'), collectionSlotVisual: document.querySelector('#collection-slot-visual'),
    customPreview: document.querySelector('#custom-top-preview'), customRefineStage: document.querySelector('#custom-refine-stage'), customEffectReveal: document.querySelector('#custom-effect-reveal'), customName: document.querySelector('#custom-top-name'), customStats: document.querySelector('#custom-stat-preview'), customEquipmentOptions: document.querySelector('#custom-equipment-options'), customEquipmentSlots: document.querySelector('#custom-equipment-slots'), customSave: document.querySelector('#custom-save-button'), customBattle: document.querySelector('#custom-battle-button'), customStatus: document.querySelector('#custom-top-status'),
    countdown: document.querySelector('#launch-countdown'), stageWrap: document.querySelector('.arena-stage-wrap'),
    avatarPicker: document.querySelector('#avatar-picker'), pilotName: document.querySelector('#pilot-name'),
    playerIdentity: document.querySelector('#player-identity-badge'), playerIdentityAvatar: document.querySelector('#player-identity-avatar'), playerIdentityName: document.querySelector('#player-identity-name'),
    productImage: document.querySelector('#top-product-image'), productLink: document.querySelector('#top-product-link'), parts: document.querySelector('#top-parts'),
    opponentBadge: document.querySelector('#opponent-badge'), opponentAvatar: document.querySelector('#opponent-avatar'), opponentName: document.querySelector('#opponent-name'), opponentTop: document.querySelector('#opponent-top'), opponentScore: document.querySelector('#opponent-score'), opponentImage: document.querySelector('#opponent-product-image'),
    opponentDetail: document.querySelector('#opponent-detail-modal'), opponentDetailClose: document.querySelector('#opponent-detail-close'), opponentDetailAvatar: document.querySelector('#opponent-detail-avatar'), opponentDetailPlayer: document.querySelector('#opponent-detail-player'), opponentDetailScore: document.querySelector('#opponent-detail-score'), opponentDetailImage: document.querySelector('#opponent-detail-image'), opponentDetailName: document.querySelector('#opponent-detail-name'), opponentDetailType: document.querySelector('#opponent-detail-type'), opponentDetailStats: document.querySelector('#opponent-detail-stats')
  };

  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(list) { return list[randomInt(0, list.length - 1)]; }
  function makeId() { return `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase(); }
  function normalizeAvatar(value) {
    if (avatarAssets.has(value)) return value;
    if (avatarNames.has(value)) return `/assets/images/battle-top/avatars/${value}.svg`;
    const migrated = Object.prototype.hasOwnProperty.call(legacyAvatarMap, value) ? legacyAvatarMap[value] : '';
    return migrated ? `/assets/images/battle-top/avatars/${migrated}.svg` : value || '/assets/images/battle-top/avatars/nova.svg';
  }
  function avatarId(value) {
    const normalized = normalizeAvatar(value);
    const match = normalized.match(/\/([^/]+)\.svg$/);
    return match && avatarNames.has(match[1]) ? match[1] : 'nova';
  }
  function avatarMarkup(value) {
    const avatar = normalizeAvatar(value);
    return avatarAssets.has(avatar) ? `<img src="${avatar}" alt="">` : escapeHTML(avatar);
  }
  function paintAvatar(element, value) { if (element) element.innerHTML = avatarMarkup(value); }

  function presenceId() {
    let id = readStorage(storageKeys.presence, '');
    if (id) return id;
    id = window.crypto?.randomUUID?.() || `arena-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    writeStorage(storageKeys.presence, id);
    return id;
  }

  function initOnlinePresence() {
    if (!els.onlineCount || !supabaseUrl || !supabasePublishableKey || !window.supabase?.createClient) {
      if (els.onlineCount) els.onlineCount.hidden = true;
      return;
    }
    const client = window.supabase.createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const channel = client.channel('battle-top-online', { config: { presence: { key: presenceId() } } });
    const paint = () => {
      const online = Object.keys(channel.presenceState()).length;
      els.onlineCount.hidden = online === 0;
      els.onlineCount.innerHTML = online ? `<span aria-hidden="true"></span>目前 ${online.toLocaleString('zh-TW')} 人正在競技場` : '';
    };
    channel
      .on('presence', { event: 'sync' }, paint)
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') await channel.track({ joined_at: new Date().toISOString() });
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') els.onlineCount.hidden = true;
      });
  }

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
    oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(168, now); oscillator.frequency.linearRampToValueAtTime(104, now + 3.35);
    gain.gain.setValueAtTime(.022, now); gain.gain.linearRampToValueAtTime(.007, now + 3.35);
    oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(now + 3.4); state.spinAudio = oscillator;
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

  function cloneProduct(product) {
    return {
      ...product,
      stats: { ...product.stats },
      customParts: product.customParts ? { ...product.customParts } : undefined,
      equipment: Array.isArray(product.equipment) ? [...product.equipment] : undefined,
      effect: product.effect ? { ...product.effect } : undefined
    };
  }
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

  function typeEdge(attacker, defender) {
    const winsAgainst = { '攻擊型': '持久型', '持久型': '防禦型', '防禦型': '攻擊型' };
    if (winsAgainst[attacker.type] === defender.type) return .1;
    if (winsAgainst[defender.type] === attacker.type) return -.1;
    return 0;
  }

  function ringOutResistance(top) {
    return top.stats.defense * .7 + top.stats.stamina * .2 + top.stats.burst * .1;
  }

  function ringOutChance(attacker, defender) {
    const impactForce = (attacker.stats.attack * .62 + attacker.stats.xdash * .38) * (1 + typeEdge(attacker, defender));
    return clamp(.04, .68, .19 + (impactForce - ringOutResistance(defender)) / 165);
  }

  function burstChance(attacker, defender) {
    const burstPressure = (attacker.stats.attack * .48 + attacker.stats.xdash * .22) * (1 + typeEdge(attacker, defender) * .7);
    const burstResistance = defender.stats.burst * .72 + defender.stats.defense * .18 + defender.stats.stamina * .1;
    return clamp(.015, .34, .08 + (burstPressure - burstResistance) / 230);
  }

  function spinScore(top, rival) {
    return (top.stats.stamina * .7 + top.stats.defense * .18 + top.stats.burst * .12) * (1 + typeEdge(top, rival) * .45);
  }

  function simulateKnockoutBattle(player, enemy) {
    const playerRingOutChance = ringOutChance(enemy, player);
    const enemyRingOutChance = ringOutChance(player, enemy);
    const playerBurstChance = burstChance(enemy, player);
    const enemyBurstChance = burstChance(player, enemy);
    const playerSpin = spinScore(player, enemy);
    const enemySpin = spinScore(enemy, player);
    const playerWinChance = clamp(.12, .88, (1 + enemyRingOutChance + enemyBurstChance + playerSpin / 120) / (2 + playerRingOutChance + enemyRingOutChance + playerBurstChance + enemyBurstChance + (playerSpin + enemySpin) / 120));
    let playerWon = false, outcome = 'spin', decidingImpact = 3;
    for (let impact = 1; impact <= 3; impact += 1) {
      const events = [
        { margin: enemyRingOutChance - Math.random(), playerWon: true, outcome: 'over' },
        { margin: playerRingOutChance - Math.random(), playerWon: false, outcome: 'over' },
        { margin: enemyBurstChance - Math.random(), playerWon: true, outcome: 'burst' },
        { margin: playerBurstChance - Math.random(), playerWon: false, outcome: 'burst' }
      ].filter(event => event.margin > 0).sort((a, b) => b.margin - a.margin);
      if (events.length) {
        ({ playerWon, outcome } = events[0]);
        decidingImpact = impact;
        break;
      }
    }
    if (outcome === 'spin') playerWon = Math.random() < clamp(.12, .88, playerSpin / (playerSpin + enemySpin));
    return { playerWon, outcome, playerRingOutChance, enemyRingOutChance, playerBurstChance, enemyBurstChance, playerWinChance, decidingImpact, typeEdge: typeEdge(player, enemy) };
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
    const shadow = stage.ellipse(172, 38).center(0, 66).fill('#000').opacity(.58);
    shadow.attr({ filter: 'blur(9px)' });
    const tilt = stage.group().attr({ id: `${label}-tilt` });
    const spin = tilt.group().attr({ id: `${label}-rotor` });

    const depth = spin.group().addClass('rotor-depth');
    depth.polygon(polarPoints(top.teeth, 84, 61)).fill('#020407').stroke({ color: '#010203', width: 11, linejoin: 'round' }).translate(0, 14).addClass('rotor-depth-outline');
    depth.polygon(polarPoints(top.teeth, 82, 60)).fill('#09131a').stroke({ color: top.color, width: 5, opacity: .72, linejoin: 'round' }).translate(0, 11).addClass('rotor-depth-side');
    depth.polygon(polarPoints(top.teeth, 70, 51)).fill(top.accent).opacity(.32).translate(0, 8);
    depth.ellipse(74, 34).center(0, 21).fill('#020609').stroke({ color: '#aee7e5', width: 2, opacity: .35 });
    depth.ellipse(42, 21).center(0, 27).fill('#010305').stroke({ color: top.color, width: 3, opacity: .58 });

    spin.circle(178).center(0, 0).fill(top.color).opacity(.06).attr({ filter: 'url(#speedGlow)' });
    spin.circle(166).center(0, 0).fill(top.color).opacity(.035).addClass('rotor-speed-disc');
    spin.circle(148).center(0, 0).fill('none').stroke({ color: '#ffffff', width: 12, opacity: .08 }).addClass('rotor-speed-ring');
    spin.circle(132).center(0, 0).fill('none').stroke({ color: top.accent, width: 16, opacity: .06, dasharray: '28 5' }).addClass('rotor-speed-band');
    spin.circle(104).center(0, 0).fill('none').stroke({ color: '#ffffff', width: 9, opacity: .05, dasharray: '14 4' }).addClass('rotor-speed-band').addClass('rotor-speed-band--inner');
    const echoes = spin.group().addClass('rotor-motion-echoes');
    [-18, 14, 31].forEach((offset, index) => {
      echoes.polygon(polarPoints(top.teeth, 84 - index * 2, 58 - index)).fill(index === 1 ? top.accent : top.color).opacity(.045).rotate(offset, 0, 0).addClass('rotor-motion-echo');
    });
    const details = spin.group().addClass('rotor-details');
    details.circle(154).center(0, 0).fill('none').stroke({ color: top.color, width: 5, opacity: .48, dasharray: '36 12' }).attr({ filter: 'url(#coreGlow)' });
    details.circle(137).center(0, 0).fill('none').stroke({ color: '#ffffff', width: 2, opacity: .42, dasharray: '8 18' });
    details.polygon(polarPoints(top.teeth, 85, 62)).fill('#020406').stroke({ color: '#010203', width: 9, opacity: .96, linejoin: 'round' }).addClass('rotor-cartoon-outline');
    details.polygon(polarPoints(top.teeth, 83, 61)).fill(top.color).stroke({ color: '#eaffff', width: 2, opacity: .78 }).attr({ filter: 'url(#rotorShine)' });
    details.polygon(polarPoints(top.teeth, 76, 57)).fill('none').stroke({ color: '#ffffff', width: 5, opacity: .18 }).rotate(7, 0, 0);
    details.polygon(polarPoints(top.teeth, 67, 48)).fill('#0c1720').stroke({ color: top.accent, width: 5, opacity: .88 }).rotate(180 / top.teeth);
    for (let i = 0; i < top.teeth; i += 1) {
      const angle = (360 / top.teeth) * i;
      const blade = details.path('M 0 -56 C 15 -58 28 -49 36 -34 L 25 -27 C 17 -38 10 -42 0 -42 Z')
        .fill(top.accent).opacity(i % 2 ? .5 : .82).rotate(angle, 0, 0);
      blade.stroke({ color: '#fff', width: .7, opacity: .35 });
      details.path('M 2 -52 C 12 -52 21 -47 28 -39').fill('none').stroke({ color: '#ffffff', width: 2.2, opacity: .42, linecap: 'round' }).rotate(angle, 0, 0);
    }
    details.circle(82).center(0, 0).fill('#081016').stroke({ color: top.color, width: 4 });
    details.circle(72).center(0, 0).fill('none').stroke({ color: '#ffffff', width: 1.5, opacity: .24, dasharray: '3 5' });
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      details.circle(7).center(Math.cos(angle) * 34, Math.sin(angle) * 34).fill('#cfe4e7').stroke({ color: '#071017', width: 1.2 }).opacity(.78);
    }
    details.circle(56).center(0, 0).fill(top.color).opacity(.22).stroke({ color: top.accent, width: 2 });
    details.circle(42).center(0, 0).fill('#101c25').stroke({ color: '#ffffff', width: 1.5, opacity: .52 });
    details.polygon(polarPoints(top.core, 24, 12)).fill(top.accent).stroke({ color: '#efffff', width: 1.5 });
    details.circle(8).center(0, 0).fill('#efffff').attr({ filter: 'url(#coreGlow)' });
    details.circle(11).center(43, -13).fill('#ffffff').opacity(.95).attr({ filter: 'url(#coreGlow)' });
    details.circle(120).center(0, 0).fill('none').stroke({ color: top.color, width: 2, opacity: .25, dasharray: '4 8' });
    details.path('M -55 -42 C -25 -70 24 -70 54 -42 C 22 -54 -20 -54 -55 -42 Z').fill('#ffffff').opacity(.32).addClass('rotor-cel-highlight');
    details.path('M -62 35 C -25 62 27 62 64 32 C 28 47 -27 48 -62 35 Z').fill('#000000').opacity(.3).addClass('rotor-cel-shadow');

    stage.attr({ style: `filter:drop-shadow(0 0 8px ${top.color}) drop-shadow(0 0 20px ${top.color}88)` });
    return { stage, tilt, spin, shadow, top, x: 0, y: 0, rotation: 0, speed: 0, wobble: 0 };
  }

  function buildScene() {
    if (!SVG_NS_READY || !els.stage) return;
    els.stage.innerHTML = '';
    const mobileArena = window.matchMedia('(max-width: 520px)').matches;
    const draw = window.SVG().addTo(els.stage).size('100%', '100%').viewbox(mobileArena ? -48 : 0, 0, mobileArena ? 1056 : 960, 650);
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
      actor.tilt.transform({ rotate: Math.sin(actor.rotation * .035) * actor.wobble, origin: [0, 0], scaleX: 1.04 + actor.wobble * .004, scaleY: .82 - actor.wobble * .002 });
      actor.spin.transform({ rotate: actor.rotation, origin: [0, 0] });
    });
  }

  function startIdleLoop() {
    cancelAnimationFrame(state.raf);
    let previous = performance.now();
    const tick = now => {
      const dt = Math.min(32, now - previous); previous = now;
      if (!state.battling && state.scene) {
        state.scene.player.rotation = (state.scene.player.rotation + 10.8 * dt) % 360;
        state.scene.enemy.rotation = (state.scene.enemy.rotation - 10.1 * dt) % 360;
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
    const comicBack = group.polygon(polarPoints(12, 72 * power, 31 * power)).center(x + 7, y + 8).fill('#020305').stroke({ color: '#020305', width: 10, linejoin: 'round' }).opacity(.88);
    const comicHit = group.polygon(polarPoints(12, 66 * power, 27 * power)).center(x, y).fill('#fff23d').stroke({ color: '#ffffff', width: 4, linejoin: 'round' }).opacity(.92);
    comicBack.animate(240).ease('>').size(220 * power, 220 * power).center(x + 8, y + 10).rotate(-24).opacity(0).after(() => comicBack.remove());
    comicHit.animate(210).ease('>').size(195 * power, 195 * power).center(x, y).rotate(28).opacity(0).after(() => comicHit.remove());
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

  function speedTrail(actor) {
    if (!state.scene || reducedMotion || !actor) return;
    const trail = state.scene.impact.ellipse(128, 42).center(actor.x, actor.y + 24).fill(actor.top.color).opacity(.2).attr({ filter: 'url(#speedGlow)' });
    trail.animate(190).ease('>').size(72, 24).center(actor.x, actor.y + 24).opacity(0).after(() => trail.remove());
    for (let i = 0; i < 3; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const start = 72 + i * 13;
      const line = state.scene.impact.line(actor.x + Math.cos(angle) * start, actor.y + Math.sin(angle) * start * .55, actor.x + Math.cos(angle) * (start + 24), actor.y + Math.sin(angle) * (start + 24) * .55)
        .stroke({ color: i === 0 ? '#ffffff' : actor.top.color, width: i === 0 ? 4 : 2, opacity: .72, linecap: 'round' });
      line.animate(150).ease('>').dmove(Math.cos(angle) * 45, Math.sin(angle) * 25).opacity(0).after(() => line.remove());
    }
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

  function showBattleEffect(effect, impact = false) {
    if (!effect || !els.battleEffectBanner) return;
    els.battleEffectIcon.textContent = effect.icon;
    els.battleEffectName.textContent = `${effect.name}強化`;
    els.battleEffectBanner.style.setProperty('--battle-effect-color', effect.color);
    els.battleEffectBanner.hidden = false;
    els.battleEffectBanner.classList.remove('is-visible', 'is-impact');
    void els.battleEffectBanner.offsetWidth;
    els.battleEffectBanner.classList.add('is-visible');
    if (impact) els.battleEffectBanner.classList.add('is-impact');
    window.clearTimeout(els.battleEffectBanner.hideTimer);
    els.battleEffectBanner.hideTimer = window.setTimeout(() => {
      els.battleEffectBanner.classList.remove('is-visible', 'is-impact');
      window.setTimeout(() => { els.battleEffectBanner.hidden = true; }, reducedMotion ? 0 : 220);
    }, impact ? 1250 : 950);
  }

  function refinedClash(effect, x, y, direction) {
    if (!effect) return;
    showBattleEffect(effect, true);
    burst(x, y, effect.color, 1.25);
    if (effect.id === 'fire') {
      flameBurst(x - 20, y + 28, direction);
      window.setTimeout(() => flameBurst(x + 30, y + 10, -direction), 90);
    }
    if (effect.id === 'lightning') {
      lightningStrike(x - 44, y - 24, effect.color);
      window.setTimeout(() => lightningStrike(x + 18, y - 42, '#ffffff'), 75);
      window.setTimeout(() => lightningStrike(x + 62, y - 12, effect.color), 145);
    }
    if (effect.id === 'ice' && state.scene && !reducedMotion) {
      const group = state.scene.impact.group().attr({ id: `fx-ice-${makeId()}` });
      group.circle(155).center(x, y).fill('none').stroke({ color: '#d9fbff', width: 8 }).opacity(.9).attr({ filter: 'url(#coreGlow)' })
        .animate(760).ease('>').scale(1.85).opacity(0);
      for (let i = 0; i < 24; i += 1) {
        const angle = i / 24 * Math.PI * 2, distance = randomInt(75, 190);
        const shard = group.polygon('0,-30 10,10 0,26 -10,10').center(x, y).fill(i % 2 ? '#eaffff' : '#52cfff').opacity(.96);
        shard.rotate(angle * 180 / Math.PI).animate(760, i * 8, 'now').ease('>').dmove(Math.cos(angle) * distance, Math.sin(angle) * distance).opacity(0);
      }
      setTimeout(() => group.remove(), 1150);
    }
    if (effect.id === 'tornado' && state.scene && !reducedMotion) {
      const group = state.scene.impact.group().attr({ id: `fx-wind-${makeId()}` });
      for (let i = 0; i < 10; i += 1) {
        group.ellipse(70 + i * 30, 22 + i * 8).center(x, y - i * 10).fill('none').stroke({ color: i % 2 ? effect.color : '#ffffff', width: Math.max(1.5, 6 - i * .42) }).opacity(.9)
          .animate(900, i * 24, 'now').ease('<>').rotate(direction * (230 + i * 28), x, y).scale(1.55).opacity(0);
      }
      setTimeout(() => group.remove(), 1250);
    }
    if (effect.id === 'dragon') {
      flameBurst(x, y + 24, direction);
      lightningStrike(x - 38, y - 28, effect.color);
      window.setTimeout(() => flameBurst(x + 54, y - 8, -direction), 100);
      window.setTimeout(() => lightningStrike(x + 52, y - 45, '#ffffff'), 150);
      spinHalo(x, y, effect.color);
    }
  }

  function attachEnhancedAura(actor, effect) {
    if (!actor?.stage || !effect) return;
    actor.stage.findOne('#player-enhanced-aura')?.remove();
    const aura = actor.stage.group().attr({ id: 'player-enhanced-aura', class: `enhanced-aura enhanced-aura--${effect.id}` });
    aura.polygon(polarPoints(effect.id === 'ice' ? 8 : 12, 94, 76)).center(0, 0).fill('none').stroke({ color: effect.color, width: 5, opacity: .72, linejoin: 'round' }).attr({ filter: 'url(#coreGlow)' });
    aura.circle(174).center(0, 0).fill('none').stroke({ color: '#ffffff', width: 2, opacity: .38, dasharray: effect.id === 'tornado' ? '28 8' : '7 13' });
    aura.circle(42).center(67, -63).fill('#05090d').stroke({ color: effect.color, width: 3, opacity: .95 }).attr({ filter: 'url(#coreGlow)' });
    aura.text(effect.icon).font({ family: 'system-ui', size: 25, anchor: 'middle' }).center(67, -66);
    if (!reducedMotion) {
      aura.animate(720).ease('-').rotate(120, 0, 0).animate(720).ease('-').rotate(240, 0, 0).animate(720).ease('-').rotate(360, 0, 0).loop();
    }
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
    trackEvent('battle_top_summon', { top_id: state.player.id, top_name: state.player.name, top_type: state.player.type });
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

  function openOpponentDetail() {
    const top = state.enemy || findProduct(state.opponent.top) || productCatalog[1];
    const labels = { attack: '攻擊', defense: '防禦', stamina: '持久', burst: '防爆', xdash: 'X 衝刺' };
    paintAvatar(els.opponentDetailAvatar, state.opponent.avatar);
    els.opponentDetailPlayer.textContent = state.opponent.name;
    els.opponentDetailScore.textContent = `${Number(state.opponent.score).toLocaleString('zh-TW')} PTS`;
    els.opponentDetailImage.src = top.image;
    els.opponentDetailImage.alt = `${top.name} 官方商品圖`;
    els.opponentDetailName.textContent = top.name;
    els.opponentDetailType.textContent = `${top.type} · ${top.parts}`;
    els.opponentDetailStats.innerHTML = Object.entries(top.stats).map(([key, value]) => `<div><span>${labels[key]}</span><b>${value}</b><i><em style="width:${Math.min(100, value / 120 * 100)}%"></em></i></div>`).join('');
    els.opponentDetail.hidden = false;
    els.opponentDetailClose.focus({ preventScroll: true });
  }

  function closeOpponentDetail() {
    els.opponentDetail.hidden = true;
    els.opponentBadge.focus({ preventScroll: true });
  }

  function hideResult() { els.result.classList.remove('is-visible', 'is-win', 'is-lose'); }
  function showResult(playerWon) {
    els.rankUp.hidden = true;
    els.resultShareComposer.hidden = true;
    els.resultShareStatus.textContent = '';
    els.result.classList.toggle('is-win', playerWon);
    els.result.classList.toggle('is-lose', !playerWon);
    els.resultOutcome.textContent = playerWon ? '🏆' : '💥';
    els.resultTitle.textContent = playerWon ? '你贏了！' : '你輸了！';
    const model = state.lastBattleModel;
    const outcomeCopy = model?.outcome === 'burst'
      ? (playerWon ? '對手爆裂了！' : '你的陀螺爆裂了！')
      : model?.outcome === 'spin'
        ? (playerWon ? '對手先停止旋轉！' : '你的陀螺先停止旋轉！')
        : (playerWon ? '對手被撞出場！' : '你被撞出場！');
    const typeCopy = model?.typeEdge > 0 ? '你克制對手！' : model?.typeEdge < 0 ? '對手克制你！' : '沒有類型克制。';
    const rankBonusCopy = model?.rankBonus > 0 ? ` 擊敗高分對手，排名加成 +${model.rankBonus}！` : '';
    els.resultCopy.textContent = `${outcomeCopy} ${typeCopy} 六項因素均已換算。${rankBonusCopy}`;
    els.battleLoot.hidden = !playerWon || !state.lastLoot;
    if (playerWon && state.lastLoot) {
      els.battleLootImage.innerHTML = equipmentImage(state.lastLoot);
      els.battleLootName.textContent = state.lastLoot.name;
      els.battleLootStat.textContent = `${state.lastLoot.label} +${state.lastLoot.amount}`;
      els.battleLootCount.textContent = `獨立裝備 ${state.lastLoot.instanceId.slice(-6)} · 出戰時鑑定專屬特效`;
    }
    els.result.classList.add('is-visible');
    setTimeout(() => els.resultRetry.focus({ preventScroll: true }), 320);
  }

  function challengeURL() {
    const base = window.location.origin && window.location.origin !== 'null'
      ? new URL('/battle-top/', window.location.origin)
      : new URL('https://coomysf.github.io/battle-top/');
    if (state.lastScoreEntry?.id) base.searchParams.set('challenge', state.lastScoreEntry.id);
    return base.toString();
  }

  function challengeMessage() {
    const profile = readProfile();
    const entry = state.lastScoreEntry;
    return entry
      ? `我用 ${entry.top} 打上 ${Number(entry.score).toLocaleString('zh-TW')} 分！\n敢不敢來挑戰 ${profile.name || '旋核手'}？\n${challengeURL()}\n\n#戰鬥陀螺 #旋核競技場`
      : `敢不敢來挑戰我的戰鬥陀螺？\n${challengeURL()}\n\n#戰鬥陀螺 #旋核競技場`;
  }

  function openShareComposer() {
    els.resultShareMessage.value = challengeMessage();
    els.resultShareStatus.textContent = '';
    els.resultShareComposer.hidden = false;
    requestAnimationFrame(() => {
      els.resultShareMessage.focus({ preventScroll: true });
      els.resultShareMessage.select();
    });
  }

  async function copyChallengePost() {
    const message = els.resultShareMessage.value;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        copied = true;
      }
    } catch (error) { /* Fall through to selection copy. */ }
    if (!copied) {
      els.resultShareMessage.focus();
      els.resultShareMessage.select();
      copied = document.execCommand('copy');
    }
    if (copied) {
      els.resultShareStatus.textContent = '貼文複製好了，去 Threads 貼上吧！';
      els.resultShareCopy.textContent = '已複製 ✓';
      setTimeout(() => { els.resultShareCopy.textContent = '複製貼文'; }, 1800);
      trackEvent('battle_top_challenge_share', {
        top_name: state.lastScoreEntry?.top || state.player?.name || '',
        battle_score: Number(state.lastScoreEntry?.score) || 0
      });
    } else {
      els.resultShareStatus.textContent = '沒有自動複製，請長按上面的文字複製。';
    }
  }

  async function battle() {
    if (!state.player || state.battling) return;
    state.lastLoot = null;
    state.enemy = cloneProduct(findProduct(state.opponent.top) || state.enemy || productCatalog[1]);
    trackEvent('battle_top_battle_start', {
      player_top: state.player.name,
      opponent_top: state.enemy.name,
      opponent_type: state.opponent.bot ? 'bot' : 'player'
    });
    buildScene();
    if (!state.scene) return;
    attachEnhancedAura(state.scene.player, state.player.effect);
    state.scene.player.stage.opacity(1);
    state.scene.enemy.stage.opacity(1);
    state.scene.player.x = 325; state.scene.player.y = 365;
    state.scene.enemy.x = 635; state.scene.enemy.y = 365;
    renderPose();
    state.battling = true; hideResult(); els.status.textContent = 'LAUNCH SEQUENCE';
    els.battle.disabled = true; els.summon.disabled = true;
    await runCountdown();
    startSpinSound();
    if (state.player.effect) showBattleEffect(state.player.effect);
    spinHalo(325, 365, state.player.color);
    setTimeout(() => spinHalo(635, 365, state.enemy.color), 130);
    els.status.textContent = 'BATTLE IN PROGRESS';
    els.stageWrap.classList.add('is-high-speed');
    const model = simulateKnockoutBattle(state.player, state.enemy);
    state.lastBattleModel = model;
    const playerWon = model.playerWon;
    const modelScore = Math.max(100, Math.round(820 + model.playerWinChance * 420 + (playerWon ? 180 : 0) + Math.random() * 45));
    const opponentScore = Number(state.opponent.score) || 1000;
    const challengeScore = playerWon && !state.opponent.bot && !isCurrentPlayer(state.opponent)
      ? opponentScore + randomInt(6, 18)
      : 0;
    const recordScore = Math.max(modelScore, challengeScore);
    model.rankBonus = Math.max(0, recordScore - modelScore);
    if (reducedMotion) {
      if (state.player.effect) refinedClash(state.player.effect, 456, 365, 1);
      else burst(480, 365, playerWon ? state.player.color : state.enemy.color, 1.1);
      setTimeout(() => finishBattle(playerWon, recordScore), 180);
      return;
    }

    const start = performance.now();
    const duration = 4200;
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    let impactOne = false, impactTwo = false, previousFrame = start, trailFrame = 0;
    const frame = now => {
      const t = Math.min(1, (now - start) / duration);
      const dt = Math.min(32, now - previousFrame); previousFrame = now;
      const p = state.scene.player, e = state.scene.enemy;
      const stopFactor = model.outcome === 'spin' && t > .78 ? Math.max(.025, 1 - (t - .78) / .22) : 1;
      const playerSpinFactor = !playerWon ? stopFactor : 1;
      const enemySpinFactor = playerWon ? stopFactor : 1;
      p.rotation = (p.rotation + (28.8 + t * 5.4) * dt * playerSpinFactor) % 360;
      e.rotation = (e.rotation - (27.4 + t * 5) * dt * enemySpinFactor) % 360;
      trailFrame += 1;
      if (trailFrame % 3 === 0) { speedTrail(p); speedTrail(e); }
      if (t >= .32 && !impactOne) { burst(480, 365, '#ffffff', 1.2); lightningStrike(480, 350); playCue('impact'); playCue('zap'); els.stageWrap.classList.add('is-impacting'); setTimeout(() => els.stageWrap.classList.remove('is-impacting'), 260); impactOne = true; }
      if (t >= .62 && !impactTwo) { if (state.player.effect) refinedClash(state.player.effect, 456, 360, 1); else elementalClash(480, 360, playerWon ? state.player.color : state.enemy.color, playerWon ? 1 : -1); defenseShield(state.player.stats.defense >= state.enemy.stats.defense ? p : e); playCue('impact'); playCue(state.player.effect?.id === 'lightning' ? 'zap' : 'fire'); setTimeout(() => playCue('zap'), 80); els.stageWrap.classList.add('is-impacting'); setTimeout(() => els.stageWrap.classList.remove('is-impacting'), 420); impactTwo = true; }
      if (t < .78) {
        const phase = t * Math.PI * 12;
        const collisionPulse = mark => Math.exp(-Math.pow((t - mark) / .026, 2));
        const collision = Math.max(collisionPulse(.32), collisionPulse(.62));
        const px = 480 + 205 * Math.sin(phase) + 35 * Math.sin(phase * 2.73 + .4);
        const py = 365 + 112 * Math.sin(phase * 1.57 + .55) + 18 * Math.cos(phase * 3.1);
        const ex = 480 + 210 * Math.sin(phase * 1.13 + Math.PI) + 32 * Math.cos(phase * 2.41);
        const ey = 365 + 108 * Math.sin(phase * 1.71 + 2.2) + 20 * Math.sin(phase * 2.9);
        p.x = px * (1 - collision) + 468 * collision;
        p.y = py * (1 - collision) + 360 * collision;
        e.x = ex * (1 - collision) + 492 * collision;
        e.y = ey * (1 - collision) + 370 * collision;
        p.wobble = collision * 5;
        e.wobble = collision * 6;
      } else {
        const k = easeOut((t - .78) / .22);
        const winner = playerWon ? p : e, loser = playerWon ? e : p;
        winner.x = (playerWon ? 460 : 500) + Math.sin(k * Math.PI * 2) * 18 * (1 - k);
        winner.y = 365 + Math.sin(k * Math.PI) * 18;
        if (model.outcome === 'over') {
          const loserStartX = playerWon ? 527 : 433;
          loser.x = loserStartX + (playerWon ? 1 : -1) * 365 * k;
          loser.y = 365 - 155 * Math.sin(k * Math.PI) + 54 * k;
          loser.wobble = 10 + k * 14;
          loser.stage.opacity(Math.max(.04, 1 - k * .96));
        } else if (model.outcome === 'burst') {
          loser.x = (playerWon ? 535 : 425) + Math.sin(k * Math.PI * 12) * 26 * (1 - k);
          loser.y = 378 + Math.cos(k * Math.PI * 10) * 18 * (1 - k);
          loser.wobble = 12 + k * 18;
          loser.stage.opacity(Math.max(.08, 1 - k * .92));
        } else {
          loser.x = playerWon ? 555 : 405;
          loser.y = 382 + Math.sin(k * Math.PI * 8) * 8 * (1 - k);
          loser.wobble = 5 + k * 19;
          loser.stage.opacity(1);
        }
      }
      renderPose();
      if (t < 1) requestAnimationFrame(frame); else finishBattle(playerWon, recordScore);
    };
    requestAnimationFrame(frame);
  }

  function finishBattle(playerWon, recordScore) {
    state.battling = false; els.status.textContent = 'BATTLE COMPLETE';
    els.stageWrap.classList.remove('is-high-speed');
    els.battle.disabled = false; els.summon.disabled = false;
    if (playerWon) grantEquipment();
    els.battle.textContent = '揍他'; showResult(playerWon); playCue(playerWon ? 'win' : 'lose');
    submitScore(recordScore, playerWon);
    if (state.scene) {
      const winner = playerWon ? state.scene.player : state.scene.enemy;
      winner.x = playerWon ? 460 : 500; winner.y = 365; winner.wobble = 0;
      winner.stage.opacity(1); renderPose();
    }
  }

  function returnToArena() {
    hideResult();
    buildScene();
    els.status.textContent = 'READY TO BATTLE';
    els.battle.disabled = false;
    els.summon.disabled = false;
    els.summon.focus({ preventScroll: true });
  }

  function readStorage(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (_) { return fallback; }
  }
  function writeStorage(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* storage can be unavailable */ } }

  function readProfile() {
    const saved = readStorage(storageKeys.profile, {});
    const playerId = /^[A-Z0-9]{16,40}$/.test(String(saved.playerId || '').toUpperCase())
      ? String(saved.playerId).toUpperCase()
      : `P${(window.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/[^a-z0-9]/gi, '').slice(0, 24)}`.toUpperCase();
    const profile = { playerId, avatar: normalizeAvatar(saved.avatar), name: String(saved.name || '').trim().slice(0, 10) };
    if (saved.playerId !== playerId) writeStorage(storageKeys.profile, profile);
    return profile;
  }

  function initProfile() {
    const profile = readProfile();
    els.pilotName.value = profile.name;
    const paintIdentity = () => {
      const current = readProfile();
      paintAvatar(els.playerIdentityAvatar, current.avatar);
      els.playerIdentityName.textContent = current.name || '旋核手';
    };
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
      paint(); paintIdentity(); renderLeaderboard();
    }));
    els.pilotName.addEventListener('input', () => {
      writeStorage(storageKeys.profile, { ...readProfile(), name: els.pilotName.value.trim().slice(0, 10) });
      paintIdentity();
    });
    paint(); paintIdentity();
  }

  function openJoinSetup() {
    state.setupReturnPhase = els.game.dataset.phase === 'game' ? 'game' : 'intro';
    els.game.dataset.phase = 'setup';
    els.joinModal.hidden = false;
    renderJoinRivals();
    els.joinModal.querySelector('[data-avatar].is-selected')?.focus();
  }

  function closeJoinSetup() {
    els.joinModal.hidden = true;
    els.game.dataset.phase = state.setupReturnPhase;
    (state.setupReturnPhase === 'game' ? els.playerIdentity : els.joinButton)?.focus();
  }

  function enterArena() {
    els.joinModal.hidden = true;
    els.game.dataset.phase = 'game';
    document.querySelector('.arena-hero')?.scrollIntoView({ block: 'start' });
    requestAnimationFrame(() => buildScene());
    trackEvent('battle_top_enter_arena', { opponent_type: state.opponent.bot ? 'bot' : 'player' });
  }

  function renderJoinRivals() {
    if (!els.joinRivals) return;
    const rivals = state.ranked.length ? state.ranked.slice(0, 3) : [state.opponent];
    els.joinRivals.innerHTML = rivals.map((entry, index) => `<button type="button" class="join-rival${state.opponent.id === entry.id ? ' is-selected' : ''}" data-join-rival="${index}"><span><i>${avatarMarkup(entry.avatar)}</i><strong>${escapeHTML(entry.name)}</strong></span><b>${Number(entry.score).toLocaleString('zh-TW')} PTS</b></button>`).join('');
    els.joinRivals.querySelectorAll('[data-join-rival]').forEach(button => button.addEventListener('click', () => {
      setOpponent(rivals[Number(button.dataset.joinRival)]);
      renderJoinRivals();
    }));
  }

  function openLeaderboard() {
    els.leaderboardModal.hidden = false;
    showLeaderboardPanel('rivals');
    loadLeaderboard(true);
    els.leaderboardClose.focus();
  }

  function showLeaderboardPanel(panel) {
    const showHistory = panel === 'history';
    els.leaderboardRivalsPanel.hidden = showHistory;
    els.leaderboardHistoryPanel.hidden = !showHistory;
    els.leaderboardRivalsTab.setAttribute('aria-selected', String(!showHistory));
    els.leaderboardHistoryTab.setAttribute('aria-selected', String(showHistory));
    els.leaderboardRefresh.hidden = showHistory;
    if (showHistory) loadBattleHistory();
  }

  function renderBattleHistory() {
    const history = state.battleHistory;
    els.battleHistoryCount.textContent = history.length;
    els.battleHistoryCount.hidden = history.length === 0;
    els.battleHistoryNote.textContent = history.length ? `最近 ${history.length} 次有人挑戰你` : '還沒有人來揍你。先把分數打上排行榜吧！';
    els.battleHistoryList.innerHTML = history.map((entry, index) => `<li><i class="battle-history__avatar">${avatarMarkup(entry.avatar)}</i><span class="battle-history__copy"><strong>${escapeHTML(entry.name)}</strong><small>${escapeHTML(entry.top)} · ${formatHistoryTime(entry.createdAt)}</small><b class="${entry.defended ? '' : 'is-defeated'}">${entry.defended ? '你守住了！' : '你被擊敗'}</b></span><button type="button" data-revenge="${index}">揍回去</button></li>`).join('');
    els.battleHistoryList.querySelectorAll('[data-revenge]').forEach(button => button.addEventListener('click', () => {
      const entry = history[Number(button.dataset.revenge)];
      setOpponent(entry);
      closeLeaderboard();
    }));
  }

  function loadBattleHistory(force = false) {
    if (state.historyLoading || (state.historyLoaded && !force)) return;
    if (!scoreEndpoint) { els.battleHistoryNote.textContent = '挑戰紀錄目前沒有連上。'; return; }
    state.historyLoading = true;
    els.battleHistoryNote.textContent = '正在讀取挑戰紀錄…';
    const profile = readProfile();
    fetch(`${scoreEndpoint}?history=${encodeURIComponent(profile.playerId)}&limit=30`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('history request failed')))
      .then(data => {
        state.battleHistory = Array.isArray(data.history) ? data.history : [];
        state.historyLoaded = true;
        renderBattleHistory();
      })
      .catch(() => { els.battleHistoryNote.textContent = '紀錄讀取失敗，關掉再試一次。'; })
      .finally(() => { state.historyLoading = false; });
  }

  function formatHistoryTime(value) {
    const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes} 分鐘前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小時前`;
    return `${Math.floor(hours / 24)} 天前`;
  }

  function closeLeaderboard() {
    els.leaderboardModal.hidden = true;
    els.changeRival.focus();
  }

  function syncSaveButton() {
    if (!els.save || !state.player) return;
    const isSaved = readCollection().some(item => item.id === state.player.id);
    els.save.disabled = false;
    els.save.textContent = isSaved ? '已經有了 ✓' : '我要這顆';
    els.save.classList.toggle('is-saved', isSaved);
  }

  function saveTop() {
    if (!state.player) return;
    const collection = readCollection();
    if (collection.some(item => item.id === state.player.id)) { syncSaveButton(); openCollectionPicker(); return; }
    if (state.player.isCustom) assignEquipmentToTop(state.player.id, state.player.equipment || []);
    collection.unshift(state.player); writeStorage(storageKeys.collection, collection.slice(0, 5));
    trackEvent('battle_top_collection_save', { top_id: state.player.id, top_name: state.player.name, top_type: state.player.type });
    syncSaveButton(); renderCollection(); openCollectionPicker();
  }

  function equipTop(productId) {
    if (state.battling) return;
    const saved = readCollection().find(item => item.id === productId);
    const product = saved || productCatalog.find(item => item.id === productId);
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
    const products = readCollection();
    if (els.collectionSlotCount) els.collectionSlotCount.textContent = `${products.length} / 5 格`;
    if (els.collectionSlotVisual) els.collectionSlotVisual.innerHTML = Array.from({ length: 5 }, (_, index) => `<i class="${index < products.length ? 'is-filled' : ''}"></i>`).join('');
    if (!products.length) {
      els.collectionPickerList.innerHTML = '<p class="battle-collection-picker__empty">還沒有陀螺。先關閉這裡，再按「我要這顆」。</p>';
      return;
    }
    els.collectionPickerList.innerHTML = products.map(top => {
      const equipped = state.player?.id === top.id;
      return `<article class="battle-collection-choice-row"><button type="button" class="battle-collection-choice${equipped ? ' is-equipped' : ''}" data-picker-equip="${top.id}" ${equipped ? 'disabled' : ''}><img src="${top.image}" alt=""><span><small>${top.isCustom ? `${top.effect?.icon || '✦'} 強化核心` : `${top.id} · ${escapeHTML(top.type)}`}</small><strong>${escapeHTML(top.name)}</strong><em>${equipped ? '目前出戰中' : '選這顆出戰 →'}</em></span></button><div class="battle-collection-choice-actions"><button type="button" data-customize="${top.id}">強化</button><button type="button" data-picker-remove="${top.id}">刪除</button>${top.source ? `<a href="${top.source}" target="_blank" rel="noopener">商品資訊 ↗</a>` : ''}</div></article>`;
    }).join('');
    els.collectionPickerList.querySelectorAll('[data-picker-equip]').forEach(button => button.addEventListener('click', () => equipTop(button.dataset.pickerEquip)));
    els.collectionPickerList.querySelectorAll('[data-customize]').forEach(button => button.addEventListener('click', () => startCustomizing(button.dataset.customize)));
    els.collectionPickerList.querySelectorAll('[data-picker-remove]').forEach(button => button.addEventListener('click', () => {
      const next = readCollection().filter(top => top.id !== button.dataset.pickerRemove);
      writeStorage(storageKeys.collection, next); releaseEquipmentFromTop(button.dataset.pickerRemove); renderBattleCollectionPicker(); renderCollection(); syncSaveButton();
    }));
  }

  function showCollectionPanel(panel) {
    const custom = panel === 'custom';
    els.collectionSavedPanel.hidden = custom;
    els.collectionCustomPanel.hidden = !custom;
    els.collectionSavedTab.setAttribute('aria-selected', String(!custom));
    els.collectionCustomTab.setAttribute('aria-selected', String(custom));
    if (custom && !state.customDraft) startCustomizing('');
  }

  function openCollectionPicker(panel = 'auto') {
    const collection = readCollection();
    renderBattleCollectionPicker();
    els.collectionPicker.hidden = false;
    els.collectionPicker.classList.add('is-open');
    if (panel === 'custom') startCustomizing(state.player?.id || '');
    else showCollectionPanel(collection.length ? 'saved' : 'custom');
    els.collectionPickerClose.focus();
  }

  function closeCollectionPicker() {
    els.collectionPicker.classList.remove('is-open');
    els.collectionPicker.hidden = true;
  }

  function deriveCustomType(stats) {
    if (stats.attack >= stats.defense && stats.attack >= stats.stamina) return '攻擊型';
    if (stats.defense >= stats.stamina) return '防禦型';
    return '持久型';
  }

  function readEquipmentInventory() {
    const saved = readStorage(storageKeys.equipment, null);
    if (Array.isArray(saved)) {
      return saved.map(instance => ({
        id: String(instance.id || `GEAR-${makeId()}`),
        itemId: equipmentCatalog.some(item => item.id === instance.itemId) ? instance.itemId : equipmentCatalog[0].id,
        effectId: refineEffects.some(effect => effect.id === instance.effectId) ? instance.effectId : '',
        ownerTopId: String(instance.ownerTopId || '')
      }));
    }
    const legacy = readStorage(storageKeys.legacyEquipment, {});
    const migrated = [];
    equipmentCatalog.forEach(item => {
      const entry = legacy[item.id];
      const count = Math.max(0, Number(entry?.count ?? entry) || 0);
      for (let index = 0; index < count; index += 1) {
        migrated.push({ id: `GEAR-${makeId()}`, itemId: item.id, effectId: index === 0 && refineEffects.some(effect => effect.id === entry?.effectId) ? entry.effectId : '', ownerTopId: '' });
      }
    });
    writeStorage(storageKeys.equipment, migrated);
    return migrated;
  }

  function writeEquipmentInventory(inventory) { writeStorage(storageKeys.equipment, inventory); }

  function equipmentEffect(entry) {
    return refineEffects.find(effect => effect.id === entry?.effectId) || null;
  }

  function equipmentImage(item) {
    return `<svg viewBox="0 0 120 120" role="img" aria-label="${escapeHTML(item.name)}"><defs><radialGradient id="g-${item.id}"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="${item.color}"/><stop offset="1" stop-color="#071017"/></radialGradient></defs><circle cx="60" cy="60" r="48" fill="url(#g-${item.id})" opacity=".32"/><path d="M60 10 77 27 101 32 106 56 96 79 75 91 52 108 32 92 12 78 17 53 22 29 47 25Z" fill="#071017" stroke="${item.color}" stroke-width="4"/><circle cx="60" cy="60" r="27" fill="none" stroke="${item.color}" stroke-width="3" stroke-dasharray="8 5"/><text x="60" y="70" text-anchor="middle" font-size="34" font-weight="900" fill="#fff">${item.icon}</text></svg>`;
  }

  function grantEquipment() {
    const item = pick(equipmentCatalog);
    const inventory = readEquipmentInventory();
    const instance = { id: `GEAR-${makeId()}`, itemId: item.id, effectId: '', ownerTopId: '' };
    inventory.push(instance);
    writeEquipmentInventory(inventory);
    state.lastLoot = { ...item, instanceId: instance.id };
    trackEvent('battle_top_equipment_drop', { equipment_id: item.id, equipment_stat: item.stat, equipment_instance_id: instance.id });
    return state.lastLoot;
  }

  function makeCustomDraft(seed) {
    const base = productCatalog.find(product => product.id === seed?.baseProductId)
      || productCatalog.find(product => product.id === seed?.id)
      || productCatalog.find(product => product.image === seed?.image)
      || productCatalog[0];
    const inventory = readEquipmentInventory();
    const used = new Set();
    const equipment = (Array.isArray(seed?.equipment) ? seed.equipment : []).map(reference => {
      const exact = inventory.find(instance => instance.id === reference && (!instance.ownerTopId || instance.ownerTopId === seed?.id));
      const legacy = exact || inventory.find(instance => instance.itemId === reference && !used.has(instance.id) && (!instance.ownerTopId || instance.ownerTopId === seed?.id));
      if (legacy) used.add(legacy.id);
      return legacy?.id || '';
    }).filter(Boolean).slice(0, 3);
    return {
      baseProductId: base.id,
      equipment,
      name: seed?.isCustom ? seed.name : ''
    };
  }

  function buildCustomTop() {
    const draft = state.customDraft;
    const base = productCatalog.find(product => product.id === draft.baseProductId) || productCatalog[0];
    const inventory = readEquipmentInventory();
    const equipped = draft.equipment.map(id => {
      const instance = inventory.find(candidate => candidate.id === id);
      const item = equipmentCatalog.find(candidate => candidate.id === instance?.itemId);
      return item ? { ...item, instance, effect: equipmentEffect(instance) } : null;
    }).filter(Boolean);
    const stats = { ...base.stats };
    equipped.forEach(item => { stats[item.stat] = clamp(8, 150, stats[item.stat] + item.amount); });
    const effect = [...equipped].reverse().find(item => item.effect)?.effect || null;
    return {
      ...cloneProduct(base), id: state.customizingId || `CUSTOM-${makeId()}`, baseProductId: base.id, name: draft.name.trim() || `我的${base.name.split(' ')[0]}`,
      type: deriveCustomType(stats), stats, isCustom: true, equipment: [...draft.equipment],
      effect: effect ? { ...effect } : null,
      skill: equipped.length ? `已裝備：${equipped.map(item => `${item.label}+${item.amount}`).join('、')}。` : '打贏對手取得裝備，再回來強化。'
    };
  }

  function renderEquipmentOptions() {
    const inventory = readEquipmentInventory();
    const available = inventory.filter(instance => !instance.ownerTopId || instance.ownerTopId === state.customizingId);
    els.customEquipmentSlots.textContent = `${state.customDraft.equipment.length} / 3`;
    if (!available.length) {
      els.customEquipmentOptions.innerHTML = '<p class="custom-equipment-empty">沒有可用裝備。打贏對手取得新裝備，或從其他收藏陀螺卸下。</p>';
      return;
    }
    els.customEquipmentOptions.innerHTML = available.map(instance => {
      const item = equipmentCatalog.find(candidate => candidate.id === instance.itemId) || equipmentCatalog[0];
      const equipped = state.customDraft.equipment.includes(instance.id);
      const effect = equipmentEffect(instance);
      return `<button type="button" class="custom-equipment-card${equipped ? ' is-equipped' : ''}" data-equipment="${instance.id}" style="--equipment-color:${effect?.color || item.color}" aria-pressed="${equipped}"><span>${equipmentImage(item)}<i>#${instance.id.slice(-4)}</i></span><strong>${escapeHTML(item.name)}</strong><b>${item.label} +${item.amount}</b><small>${effect ? `${effect.icon} ${effect.name}特效` : equipped ? '出戰時鑑定特效' : '尚未鑑定'}</small></button>`;
    }).join('');
    els.customEquipmentOptions.querySelectorAll('[data-equipment]').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.equipment;
      const index = state.customDraft.equipment.indexOf(id);
      if (index >= 0) state.customDraft.equipment.splice(index, 1);
      else if (state.customDraft.equipment.length < 3) state.customDraft.equipment.push(id);
      else { els.customStatus.textContent = '最多裝 3 件，先拿掉一件。'; return; }
      els.customStatus.textContent = index >= 0 ? '裝備已卸下。' : '裝備完成！能力已增加。';
      persistCustomName(false);
      renderCustomPreview();
    }));
  }

  function renderCustomPreview() {
    const top = buildCustomTop();
    const isSaved = Boolean(state.customizingId && readCollection().some(item => item.id === state.customizingId));
    renderEquipmentOptions();
    els.customPreview.innerHTML = `<span style="--custom-color:${top.color}"></span><img src="${top.image}" alt="${escapeHTML(top.name)}"><small>${escapeHTML(top.parts)}</small>`;
    const labels = { attack: '攻擊', defense: '防禦', stamina: '持久', burst: '防爆', xdash: 'X 衝刺' };
    els.customStats.innerHTML = Object.entries(top.stats).map(([key, value]) => `<div><span>${labels[key]}</span><i><b style="width:${value / 1.2}%"></b></i><strong>${value}</strong></div>`).join('');
    els.customEffectReveal.innerHTML = top.effect ? `<span>${top.effect.icon}</span> ${top.effect.name}特效` : top.equipment.length ? '特效等待出戰鑑定' : '尚未裝備';
    els.customEffectReveal.style.setProperty('--effect-color', top.effect?.color || '#789096');
    els.customSave.disabled = !isSaved && !top.equipment.length;
    els.customSave.textContent = isSaved ? '取消收藏' : '加到收藏';
    els.customSave.classList.toggle('is-remove', isSaved);
    els.customName.value = state.customDraft.name;
  }

  function startCustomizing(productId = '') {
    const seed = readCollection().find(top => top.id === productId) || state.player || productCatalog[0];
    state.customizingId = seed.isCustom ? seed.id : '';
    state.customDraft = makeCustomDraft(seed);
    els.customStatus.textContent = seed.isCustom ? '點裝備圖片就能更換。改名字會自動儲存。' : '選擇打贏後取得的裝備。';
    showCollectionPanel('custom');
    renderCustomPreview();
  }

  function animateRefinement(effect) {
    els.customRefineStage.innerHTML = '';
    if (!SVG_NS_READY || reducedMotion) return;
    const draw = window.SVG().addTo(els.customRefineStage).size('100%', '100%').viewbox(0, 0, 360, 260);
    const group = draw.group();
    group.circle(50).center(180, 130).fill('none').stroke({ color: effect.color, width: 3 }).opacity(.9)
      .animate(800).ease('>').scale(5).opacity(0);
    for (let i = 0; i < 18; i += 1) {
      const angle = i / 18 * Math.PI * 2, length = 45 + (i % 4) * 16;
      group.line(180, 130, 180 + Math.cos(angle) * length, 130 + Math.sin(angle) * length)
        .stroke({ color: i % 2 ? effect.color : '#fff', width: 2 + i % 3 }).opacity(0)
        .animate(180, i * 14, 'now').opacity(1).animate(520).ease('>').scale(1.8, 1.8, 180, 130).opacity(0);
    }
    group.text(effect.icon).font({ size: 68, anchor: 'middle' }).center(180, 126).opacity(0).scale(.2)
      .animate(420, 160, 'now').ease('>').opacity(1).scale(1.15).animate(360).scale(1);
    setTimeout(() => { els.customRefineStage.innerHTML = ''; }, 1250);
  }

  function assignEquipmentToTop(topId, equipmentIds) {
    const selected = new Set(equipmentIds);
    const inventory = readEquipmentInventory();
    inventory.forEach(instance => {
      if (instance.ownerTopId === topId && !selected.has(instance.id)) instance.ownerTopId = '';
      if (selected.has(instance.id) && (!instance.ownerTopId || instance.ownerTopId === topId)) instance.ownerTopId = topId;
    });
    writeEquipmentInventory(inventory);
  }

  function releaseEquipmentFromTop(topId) {
    const inventory = readEquipmentInventory();
    let changed = false;
    inventory.forEach(instance => {
      if (instance.ownerTopId === topId) { instance.ownerTopId = ''; changed = true; }
    });
    if (changed) writeEquipmentInventory(inventory);
  }

  function saveCustomTop() {
    const collection = readCollection();
    const savedIndex = state.customizingId ? collection.findIndex(item => item.id === state.customizingId) : -1;
    if (savedIndex >= 0) {
      const removed = collection[savedIndex];
      collection.splice(savedIndex, 1);
      writeStorage(storageKeys.collection, collection);
      releaseEquipmentFromTop(removed.id);
      state.customizingId = '';
      renderCollection(); renderBattleCollectionPicker(); renderCustomPreview(); syncSaveButton();
      els.customStatus.textContent = `「${removed.name}」已取消收藏，仍可直接出戰。`;
      return;
    }
    if (!state.customDraft?.equipment.length) return;
    const top = buildCustomTop();
    const existingIndex = collection.findIndex(item => item.id === top.id);
    if (existingIndex < 0 && collection.length >= 5) { els.customStatus.textContent = '收藏已滿 5 顆，先回「我的收藏」刪掉一顆。'; return; }
    assignEquipmentToTop(top.id, top.equipment);
    if (existingIndex >= 0) collection[existingIndex] = top; else collection.unshift(top);
    writeStorage(storageKeys.collection, collection.slice(0, 5));
    state.customizingId = top.id;
    state.customDraft.name = top.name;
    trackEvent('battle_top_custom_save', { top_name: top.name, equipment_count: top.equipment.length });
    renderCollection(); renderBattleCollectionPicker(); renderCustomPreview();
    els.customStatus.textContent = `「${top.name}」已存進收藏！`;
  }

  function persistCustomName(showStatus = true) {
    window.clearTimeout(state.customNameTimer);
    if (!state.customDraft || !state.customizingId) return;
    const collection = readCollection(), index = collection.findIndex(item => item.id === state.customizingId);
    if (index < 0) return;
    const top = buildCustomTop();
    assignEquipmentToTop(top.id, top.equipment);
    collection[index] = top;
    writeStorage(storageKeys.collection, collection);
    if (state.player?.id === top.id) {
      state.player = cloneProduct(top);
      updateCard(); buildScene();
    }
    renderCollection(); renderBattleCollectionPicker();
    if (showStatus) els.customStatus.textContent = `名字已自動儲存：${top.name}`;
  }

  async function battleWithCustomTop() {
    if (state.battling || !state.customDraft) return;
    const inventory = readEquipmentInventory();
    const unidentifiedId = [...state.customDraft.equipment].reverse().find(id => {
      const instance = inventory.find(candidate => candidate.id === id);
      return instance && !instance.effectId;
    });
    if (unidentifiedId) {
      const instance = inventory.find(candidate => candidate.id === unidentifiedId);
      const item = equipmentCatalog.find(candidate => candidate.id === instance.itemId);
      const effect = pick(refineEffects);
      instance.effectId = effect.id;
      writeEquipmentInventory(inventory);
      els.customStatus.textContent = `${effect.icon} 意外獲得「${effect.name}特效」！已綁定 ${item.name}`;
      els.customEffectReveal.innerHTML = `<span>${effect.icon}</span> ${effect.name}特效！`;
      els.customEffectReveal.style.setProperty('--effect-color', effect.color);
      animateRefinement(effect);
      state.sound = true; getAudio(); playCue(effect.id === 'lightning' ? 'zap' : effect.id === 'fire' || effect.id === 'dragon' ? 'fire' : 'summon');
      trackEvent('battle_top_equipment_effect_reveal', { equipment_id: unidentifiedId, effect_id: effect.id });
      await new Promise(resolve => window.setTimeout(resolve, reducedMotion ? 500 : 1450));
    }
    const top = buildCustomTop();
    if (state.customizingId) persistCustomName();
    state.player = cloneProduct(top);
    hideResult(); updateCard(); buildScene(); renderCollection(); syncSaveButton();
    els.status.textContent = top.effect ? `${top.effect.icon} ENHANCED CORE READY` : 'CUSTOM CORE READY';
    els.battle.disabled = false; els.save.disabled = false;
    closeCollectionPicker();
    document.querySelector('.arena-hero')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    state.sound = true; getAudio();
    window.setTimeout(() => battle(), reducedMotion ? 40 : 260);
  }

  function renderCollection() {
    const collection = readCollection();
    if (!collection.length) { els.collection.innerHTML = '<p class="collection-empty">還沒有收藏。先回競技場召喚第一顆吧。</p>'; return; }
    els.collection.innerHTML = collection.map(saved => {
      const top = saved;
      const equipped = state.player?.id === top.id;
      return `<article class="saved-core${equipped ? ' is-equipped' : ''}" style="--core-color:${top.color}"><button class="saved-core__remove" type="button" data-remove="${top.id}" aria-label="移除 ${top.name}">×</button><span>${top.isCustom ? `${top.effect?.icon || '✦'} CUSTOM CORE` : `BX SERIES // ${top.id}`}</span><img src="${top.image || ''}" alt="${escapeHTML(top.name)} 商品圖"><h3>${escapeHTML(top.name)}</h3><p>${escapeHTML(top.type)} · 戰力 ${Math.round(scoreWithoutLuck(top))}</p><button class="saved-core__customize" type="button" data-card-customize="${top.id}">強化</button><button class="saved-core__equip" type="button" data-equip="${top.id}" ${equipped ? 'disabled' : ''}>${equipped ? '出戰中 ✓' : '選這顆出戰'}</button></article>`;
    }).join('');
    els.collection.querySelectorAll('[data-equip]').forEach(button => button.addEventListener('click', () => equipTop(button.dataset.equip)));
    els.collection.querySelectorAll('[data-card-customize]').forEach(button => button.addEventListener('click', () => { openCollectionPicker(); startCustomizing(button.dataset.cardCustomize); }));
    els.collection.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => {
      const next = readCollection().filter(top => top.id !== button.dataset.remove);
      writeStorage(storageKeys.collection, next); releaseEquipmentFromTop(button.dataset.remove); renderCollection(); syncSaveButton();
    }));
  }

  function scoreWithoutLuck(top) {
    const s = top.stats; return s.attack * .28 + s.defense * .22 + s.stamina * .25 + s.burst * .13 + s.xdash * .12;
  }

  function readCollection() {
    const raw = readStorage(storageKeys.collection, []);
    let migrated = false;
    const normalized = raw.map((saved, index) => {
      if (saved?.isCustom && saved?.stats && (saved?.customParts || Array.isArray(saved?.equipment))) return cloneProduct(saved);
      const current = findProduct(saved?.name) || productCatalog.find(product => product.id === saved?.id);
      if (current) return cloneProduct(current);
      migrated = true;
      return cloneProduct(productCatalog[index % productCatalog.length]);
    }).filter((product, index, list) => list.findIndex(item => item.id === product.id) === index).slice(0, 5);
    const inventory = readEquipmentInventory();
    const collectionIds = new Set(normalized.map(top => top.id));
    const claimed = new Set();
    inventory.forEach(instance => {
      if (instance.ownerTopId && !collectionIds.has(instance.ownerTopId)) { instance.ownerTopId = ''; migrated = true; }
    });
    normalized.forEach(top => {
      if (!top.isCustom || !Array.isArray(top.equipment)) return;
      const resolved = top.equipment.map(reference => {
        const exact = inventory.find(instance => instance.id === reference && !claimed.has(instance.id) && (!instance.ownerTopId || instance.ownerTopId === top.id));
        const legacy = exact || inventory.find(instance => instance.itemId === reference && !claimed.has(instance.id) && (!instance.ownerTopId || instance.ownerTopId === top.id));
        if (!legacy) return '';
        if (legacy.ownerTopId !== top.id) migrated = true;
        legacy.ownerTopId = top.id;
        claimed.add(legacy.id);
        return legacy.id;
      }).filter(Boolean).slice(0, 3);
      if (resolved.join('|') !== top.equipment.join('|')) migrated = true;
      top.equipment = resolved;
    });
    inventory.forEach(instance => {
      if (instance.ownerTopId && !claimed.has(instance.id)) { instance.ownerTopId = ''; migrated = true; }
    });
    if (migrated || normalized.length !== raw.length) {
      writeStorage(storageKeys.collection, normalized);
      writeEquipmentInventory(inventory);
    }
    return normalized;
  }

  function submitScore(points, won) {
    const profile = readProfile();
    const playerName = profile.name || `旋核手${randomInt(100, 999)}`;
    const playerKey = `${playerName.trim().toLocaleLowerCase()}::${avatarId(profile.avatar)}`;
    const previousRankIndex = state.ranked.findIndex(entry => `${String(entry.name || '').trim().toLocaleLowerCase()}::${entry.avatar}` === playerKey);
    const previousRank = previousRankIndex >= 0 ? previousRankIndex + 1 : null;
    const entry = { id: makeId(), playerId: profile.playerId, name: playerName, avatar: avatarId(profile.avatar), top: state.player.name, score: points, won, createdAt: Date.now() };
    const match = !state.opponent.bot ? { id: makeId(), defenderEventId: state.opponent.id, defenderPlayerId: state.opponent.playerId || '' } : null;
    state.lastScoreEntry = entry;
    const scores = readStorage(storageKeys.scores, []);
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    writeStorage(storageKeys.scores, scores);
    els.resultCopy.textContent += ` 本場 ${points.toLocaleString('zh-TW')} 分。`;
    if (scoreEndpoint) {
      fetch(scoreEndpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...entry, match }) })
        .then(response => response.ok ? response.json() : Promise.reject(new Error('score request failed')))
        .then(data => {
          if (!Array.isArray(data.scores)) return;
          updateLeaderboard(data);
          const ownRecord = data.scores.find(score => identityKey(score.name, score.avatar) === playerKey);
          if (ownRecord) state.lastScoreEntry = ownRecord;
          showRankProgress(previousRank, playerKey);
        })
        .catch(() => { els.resultCopy.textContent += ' 全站排行榜暫時無法更新。'; });
    }
    trackEvent('battle_top_score', {
      battle_score: points,
      battle_result: won ? 'win' : 'loss',
      battle_outcome: state.lastBattleModel?.outcome || 'unknown',
      player_top: state.player.name,
      opponent_top: state.enemy?.name || '',
      opponent_type: state.opponent.bot ? 'bot' : 'player'
    });
  }

  function showRankProgress(previousRank, playerKey) {
    const currentRankIndex = state.ranked.findIndex(entry => `${String(entry.name || '').trim().toLocaleLowerCase()}::${entry.avatar}` === playerKey);
    if (currentRankIndex < 0) return;
    const currentRank = currentRankIndex + 1;
    if (previousRank !== null && currentRank >= previousRank) return;
    els.rankUp.hidden = false;
    if (currentRank === 1) {
      els.rankHeadline.textContent = '👑 新王者！';
    } else if (previousRank === null) {
      els.rankHeadline.textContent = '初次上榜！';
    } else {
      els.rankHeadline.textContent = `上升 ${previousRank - currentRank} 名！`;
    }
    els.rankChange.innerHTML = previousRank === null
      ? `<b>NEW</b><i>→</i><b>#${currentRank}</b>`
      : `<b>#${previousRank}</b><i>→</i><b>#${currentRank}</b>`;
    playCue('win');
  }

  function identityKey(name, avatar) {
    return `${String(name || '').trim().toLocaleLowerCase()}::${avatarId(avatar)}`;
  }

  function isCurrentPlayer(entry) {
    const profile = readProfile();
    return Boolean(profile.name) && identityKey(entry?.name, entry?.avatar) === identityKey(profile.name, profile.avatar);
  }

  function updateLeaderboard(data, append = false) {
    const incoming = Array.isArray(data?.scores) ? data.scores : [];
    state.globalScores = append
      ? [...state.globalScores, ...incoming].filter((entry, index, list) => list.findIndex(item => item.id === entry.id) === index)
      : incoming;
    state.leaderboardLoaded = true;
    state.leaderboardTotal = Number(data?.totalPlayers) || state.globalScores.length;
    state.leaderboardFilteredTotal = Number(data?.filteredPlayers) || state.globalScores.length;
    state.leaderboardHasMore = data?.hasMore === true;
    renderLeaderboard();
  }

  function renderLeaderboard(serverScores) {
    if (!els.leaderboard) return;
    const bot = { id: 'demon-boss', name: '魔王', avatar: '👹', top: 'Hells Scythe 4-60T', score: 1000, bot: true };
    if (Array.isArray(serverScores)) {
      state.globalScores = serverScores;
      state.leaderboardLoaded = true;
    }
    const scores = state.globalScores;
    const ranked = [bot, ...scores].sort((a, b) => b.score - a.score);
    state.ranked = ranked;
    const query = state.leaderboardQuery.trim().toLocaleLowerCase();
    const visibleEntries = ranked
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => !query || `${entry.name || ''} ${entry.top || ''}`.toLocaleLowerCase().includes(query));
    const playerCount = state.leaderboardTotal || scores.length;
    if (state.leaderboardLoaded) els.changeRival.textContent = `換對手（${playerCount.toLocaleString('zh-TW')}）`;
    els.leaderboardSearchStatus.textContent = !state.leaderboardLoaded
      ? '正在讀取全站玩家…'
      : query
        ? `找到 ${state.leaderboardFilteredTotal.toLocaleString('zh-TW')} 位玩家 · 全站 ${playerCount.toLocaleString('zh-TW')} 位玩家`
        : `全站共 ${playerCount.toLocaleString('zh-TW')} 位玩家`;
    if (els.leaderboardLoadMore) els.leaderboardLoadMore.hidden = !state.leaderboardHasMore;
    if (!visibleEntries.length) {
      els.leaderboard.innerHTML = '<li class="leaderboard-empty"><strong>找不到。</strong><small>換個名字或陀螺試試！</small></li>';
      renderJoinRivals();
      return;
    }
    els.leaderboard.innerHTML = visibleEntries.map(({ entry, index }) => {
      const ownRecord = isCurrentPlayer(entry);
      return `<li class="${entry.bot ? 'is-bot' : ''}${state.opponent.id === entry.id ? ' is-target' : ''}${ownRecord ? ' is-player' : ''}"><span>${String(index + 1).padStart(2, '0')}</span><i>${avatarMarkup(entry.avatar)}</i><div><strong>${escapeHTML(entry.name)}</strong><small>${escapeHTML(entry.top)}</small></div><b>${Number(entry.score).toLocaleString('zh-TW')}</b><button type="button" data-challenge="${index}" ${ownRecord ? 'disabled' : ''}>${ownRecord ? '你' : 'PK'}</button></li>`;
    }).join('');
    els.leaderboard.querySelectorAll('[data-challenge]').forEach(button => button.addEventListener('click', () => {
      setOpponent(ranked[Number(button.dataset.challenge)]);
      closeLeaderboard();
    }));
    renderJoinRivals();
  }

  function loadLeaderboard(manual = false, append = false) {
    if (!scoreEndpoint) {
      if (manual) els.leaderboardRefreshStatus.textContent = '排行榜目前沒有連上。';
      return Promise.resolve(false);
    }
    if (manual) {
      els.leaderboardRefresh.disabled = true;
      els.leaderboardRefresh.classList.add('is-loading');
      els.leaderboardRefreshStatus.textContent = '正在抓最新排名…';
    }
    const requestId = ++state.leaderboardRequestId;
    const params = new URLSearchParams({ limit: '50', offset: String(append ? state.globalScores.length : 0), _: String(Date.now()) });
    if (state.leaderboardQuery.trim()) params.set('q', state.leaderboardQuery.trim());
    return fetch(`${scoreEndpoint}?${params}`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('leaderboard request failed')))
      .then(data => {
        if (requestId !== state.leaderboardRequestId) return false;
        if (!Array.isArray(data.scores)) return;
        updateLeaderboard(data, append);
        if (state.requestedChallengeId) {
          const challengedPlayer = data.scores.find(entry => String(entry.id) === state.requestedChallengeId);
          if (challengedPlayer) {
            setOpponent(challengedPlayer);
            state.requestedChallengeId = '';
          } else {
            const challengeId = state.requestedChallengeId;
            state.requestedChallengeId = '';
            fetch(`${scoreEndpoint}?id=${encodeURIComponent(challengeId)}`, { cache: 'no-store' })
              .then(response => response.ok ? response.json() : Promise.reject(new Error('challenge request failed')))
              .then(challengeData => { if (challengeData.scores?.[0]) setOpponent(challengeData.scores[0]); })
              .catch(() => {});
          }
        }
        if (manual) els.leaderboardRefreshStatus.textContent = `刷新完成，全站 ${state.leaderboardTotal.toLocaleString('zh-TW')} 位玩家。`;
        return true;
      })
      .catch(() => {
        if (requestId !== state.leaderboardRequestId) return false;
        if (manual) els.leaderboardRefreshStatus.textContent = '刷新失敗，請再按一次。';
        return false;
      })
      .finally(() => {
        if (!manual || requestId !== state.leaderboardRequestId) return;
        els.leaderboardRefresh.disabled = false;
        els.leaderboardRefresh.classList.remove('is-loading');
      });
  }

  function setOpponent(entry) {
    if (!entry || state.battling || isCurrentPlayer(entry)) return;
    state.opponent = { ...entry, score: Number(entry.score) || 1000 };
    state.enemy = cloneProduct(findProduct(entry.top) || productCatalog[1]);
    paintAvatar(els.opponentAvatar, entry.avatar);
    els.opponentName.textContent = entry.name;
    els.opponentTop.textContent = state.enemy.name;
    els.opponentImage.src = state.enemy.image;
    els.opponentImage.alt = `${state.enemy.name} 官方商品圖`;
    els.opponentScore.textContent = `${state.opponent.score.toLocaleString('zh-TW')} PTS`;
    els.status.textContent = 'TARGET LOCKED';
    hideResult(); buildScene(); renderLeaderboard();
    trackEvent('battle_top_rival_select', {
      opponent_type: state.opponent.bot ? 'bot' : 'player',
      opponent_top: state.enemy.name,
      opponent_score: state.opponent.score
    });
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
        trackEvent('battle_top_wish', { wish_feature: id });
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
  els.resultRetry?.addEventListener('click', returnToArena);
  els.resultShare?.addEventListener('click', openShareComposer);
  els.resultShareCopy?.addEventListener('click', copyChallengePost);
  els.joinButton?.addEventListener('click', openJoinSetup);
  els.playerIdentity?.addEventListener('click', openJoinSetup);
  els.joinClose?.addEventListener('click', closeJoinSetup);
  els.enterArena?.addEventListener('click', enterArena);
  els.changeRival?.addEventListener('click', openLeaderboard);
  els.opponentBadge?.addEventListener('click', openOpponentDetail);
  els.opponentDetailClose?.addEventListener('click', closeOpponentDetail);
  els.opponentDetail?.addEventListener('click', event => { if (event.target === els.opponentDetail) closeOpponentDetail(); });
  els.leaderboardClose?.addEventListener('click', closeLeaderboard);
  els.leaderboardRefresh?.addEventListener('click', () => loadLeaderboard(true));
  els.leaderboardRivalsTab?.addEventListener('click', () => showLeaderboardPanel('rivals'));
  els.leaderboardHistoryTab?.addEventListener('click', () => showLeaderboardPanel('history'));
  els.leaderboardLoadMore?.addEventListener('click', () => loadLeaderboard(false, true));
  els.leaderboardSearch?.addEventListener('input', event => {
    state.leaderboardQuery = event.target.value;
    window.clearTimeout(state.leaderboardSearchTimer);
    els.leaderboardSearchStatus.textContent = '正在搜尋全站玩家…';
    state.leaderboardSearchTimer = window.setTimeout(() => loadLeaderboard(false), 280);
  });
  els.save?.addEventListener('click', saveTop);
  els.collectionPickerButton?.addEventListener('click', () => openCollectionPicker('custom'));
  els.collectionPickerClose?.addEventListener('click', closeCollectionPicker);
  els.collectionSavedTab?.addEventListener('click', () => showCollectionPanel('saved'));
  els.collectionCustomTab?.addEventListener('click', () => showCollectionPanel('custom'));
  els.customSave?.addEventListener('click', saveCustomTop);
  els.customBattle?.addEventListener('click', battleWithCustomTop);
  els.customName?.addEventListener('input', event => {
    if (!state.customDraft) return;
    state.customDraft.name = event.target.value;
    window.clearTimeout(state.customNameTimer);
    state.customNameTimer = window.setTimeout(persistCustomName, 500);
  });
  els.customName?.addEventListener('blur', persistCustomName);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !els.joinModal.hidden) closeJoinSetup();
    else if (event.key === 'Escape' && !els.leaderboardModal.hidden) closeLeaderboard();
    else if (event.key === 'Escape' && !els.opponentDetail.hidden) closeOpponentDetail();
    else if (event.key === 'Escape' && !els.collectionPicker.hidden) closeCollectionPicker();
  });
  renderCollection(); initProfile(); renderLeaderboard(); loadLeaderboard(); initWishes(); initOnlinePresence(); initTabletActionDock();
  state.player = createTop(false); state.enemy = createTop(true); updateCard(); buildScene(); renderCollection();
  els.battle.disabled = false; els.save.disabled = false; els.summon.textContent = '抽陀螺';
  els.status.textContent = 'CORE SYNCHRONIZED';
})();
