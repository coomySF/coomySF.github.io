(() => {
  'use strict';

  const SVG_NS_READY = typeof window.SVG === 'function';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const storageKeys = { collection: 'coomy-top-collection-v1', parts: 'coomy-top-parts-v3', equipment: 'coomy-top-equipment-v2', legacyEquipment: 'coomy-top-equipment-v1', wishes: 'coomy-top-wishes-v2', scores: 'coomy-top-scores-v1', profile: 'coomy-top-profile-v1', presence: 'coomy-top-presence-v1' };
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
    { id: 'eternal-core', name: '永動軸承', icon: '◎', stat: 'stamina', label: '持久', amount: 9, color: '#caFF3d' },
    { id: 'burst-lock', name: '防爆扣環', icon: '◇', stat: 'burst', label: '防爆', amount: 8, color: '#b781ff' },
    { id: 'dash-engine', name: '衝刺引擎', icon: 'ϟ', stat: 'xdash', label: 'X 衝刺', amount: 10, color: '#ffe25c' }
  ];


  // ---------- 零件系統（v3）：獎勵是真的零件——上蓋 / 軸心 / 固鎖，每層只能裝一個 ----------
  const partSlots = [
    { key: 'blade', label: '上蓋', english: 'Blade', rate: .30 },
    { key: 'ratchet', label: '軸心', english: 'Ratchet', rate: .35 },
    { key: 'bit', label: '固鎖', english: 'Bit', rate: .35 }
  ];
  // 舊的數值道具 → 零件（v2 → v3 遷移，保留 instance id，收藏陀螺的參照不會斷）
  const legacyEquipmentToPart = { 'power-gear': ['blade', 'dran'], 'steel-armor': ['blade', 'knight'], 'eternal-core': ['ratchet', '5-70'], 'burst-lock': ['ratchet', '4-60'], 'dash-engine': ['bit', 'flat'] };
  const STAT_LABELS = { attack: '攻擊', defense: '防禦', stamina: '持久', burst: '防爆', xdash: 'X 衝刺' };
  const slotMeta = key => partSlots.find(slot => slot.key === key) || partSlots[0];
  const partDelta = part => part?.delta || part?.stats || {};
  const findPart = (slot, partId) => (customizationParts[slot] || []).find(part => part.id === partId) || null;
  const findPartByName = (slot, name) => (customizationParts[slot] || []).find(part => part.name.toLowerCase() === String(name || '').trim().toLowerCase()) || null;
  function averageDelta(slot) {
    const list = customizationParts[slot], sum = {};
    list.forEach(part => Object.entries(partDelta(part)).forEach(([key, value]) => { sum[key] = (sum[key] || 0) + value; }));
    Object.keys(sum).forEach(key => { sum[key] = sum[key] / list.length; });
    return sum;
  }
  // 原廠三件：從商品的 parts 字串比對零件表；比不到的（例如 Hexa、1-60）視為「未知原廠」，用該層平均值當基準
  function stockPartsOf(product) {
    const pieces = String(product.parts || '').split('·').map(part => part.trim());
    return { blade: findPartByName('blade', pieces[0]), ratchet: findPartByName('ratchet', pieces[1]), bit: findPartByName('bit', pieces[2]) };
  }
  function deltaText(part) {
    return Object.entries(partDelta(part)).filter(([, value]) => value).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([key, value]) => `${STAT_LABELS[key]} +${Math.round(value)}`).join(' · ');
  }
  // 三種零件各自長得不一樣：上蓋 = 官方商品圖（上蓋就是陀螺的外觀）；軸心 = 有棘齒環的塑膠齒輪，齒數 = 名字前面的數字、高度 = 後面的數字；固鎖 = 側視的底座 + 軸尖形狀
  function partGlyph(slot, part, color = '#28f4e8', image = '') {
    const label = slotMeta(slot).label;
    if (slot === 'blade') {
      const product = productCatalog.find(item => item.id === part.productId);
      const src = image || product?.image || '';
      if (src) return `<span class="part-blade-img"><img src="${src}" alt="${escapeHTML(label)} ${escapeHTML(part.name)}"><b style="color:${color}">${escapeHTML(label)}</b></span>`;
      return `<svg viewBox="0 0 120 120" role="img" aria-label="${escapeHTML(label)} ${escapeHTML(part.name)}"><circle cx="60" cy="60" r="44" fill="#1a232c" stroke="${color}" stroke-width="4"/><path d="M60 16 84 40 60 64 36 40Z M60 56 84 80 60 104 36 80Z" fill="${color}" opacity=".35"/><circle cx="60" cy="60" r="12" fill="#071017" stroke="${color}" stroke-width="3"/><text x="60" y="114" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="${color}">${escapeHTML(label)}</text></svg>`;
    }
    if (slot === 'ratchet') {
      const [prongs, height] = String(part.name).split('-').map(Number);
      const n = Math.max(2, prongs || 3);
      const teeth = [...Array(20)].map((_, i) => { const a = i / 20 * Math.PI * 2, a2 = (i + .5) / 20 * Math.PI * 2; return `${(60 + Math.cos(a) * 48).toFixed(1)} ${(58 + Math.sin(a) * 48).toFixed(1)} ${(60 + Math.cos(a2) * 42).toFixed(1)} ${(58 + Math.sin(a2) * 42).toFixed(1)}`; }).join(' ');
      const prongPaths = [...Array(n)].map((_, i) => { const a = i / n * Math.PI * 2 - Math.PI / 2, w = .42; const p1 = [60 + Math.cos(a - w) * 18, 58 + Math.sin(a - w) * 18], p2 = [60 + Math.cos(a - w * .55) * 40, 58 + Math.sin(a - w * .55) * 40], p3 = [60 + Math.cos(a + w * .55) * 40, 58 + Math.sin(a + w * .55) * 40], p4 = [60 + Math.cos(a + w) * 18, 58 + Math.sin(a + w) * 18]; return `M${p1.map(v => v.toFixed(1)).join(' ')} L${p2.map(v => v.toFixed(1)).join(' ')} L${p3.map(v => v.toFixed(1)).join(' ')} L${p4.map(v => v.toFixed(1)).join(' ')}Z`; }).join(' ');
      return `<svg viewBox="0 0 120 120" role="img" aria-label="${escapeHTML(label)} ${escapeHTML(part.name)}"><polygon points="${teeth}" fill="#1c2a36" stroke="${color}" stroke-width="2"/><circle cx="60" cy="58" r="40" fill="#0f1a24" stroke="${color}" stroke-width="2" opacity=".9"/><path d="${prongPaths}" fill="${color}" opacity=".9" stroke="#071017" stroke-width="1.5"/><circle cx="60" cy="58" r="17" fill="#071017" stroke="${color}" stroke-width="3"/><circle cx="60" cy="58" r="6" fill="${color}"/><text x="60" y="114" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="12" font-weight="700" fill="${color}">${escapeHTML(label)} ${n}齒 · 高${height || '?'}</text></svg>`;
    }
    const name = String(part.name);
    const gear = /gear|accel/i.test(name);
    const family = /ball/i.test(name) ? 'ball' : /needle/i.test(name) ? 'needle' : /taper/i.test(name) ? 'taper' : /hexa/i.test(name) ? 'hexa' : 'flat';
    const tip = family === 'ball' ? `<circle cx="60" cy="86" r="13" fill="${color}"/>`
      : family === 'needle' ? `<path d="M52 74 60 100 68 74Z" fill="${color}"/>`
      : family === 'taper' ? `<path d="M46 74 74 74 66 96 54 96Z" fill="${color}"/>`
      : family === 'hexa' ? `<path d="M48 74 72 74 78 84 72 94 48 94 42 84Z" fill="${color}"/>`
      : `<rect x="38" y="76" width="44" height="14" rx="4" fill="${color}"/>`;
    const gearRing = gear ? `<path d="${[...Array(14)].map((_, i) => { const x = 24 + i * 5.5; return `M${x} 50 l2.5 -6 l2.5 6`; }).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/>` : '';
    return `<svg viewBox="0 0 120 120" role="img" aria-label="${escapeHTML(label)} ${escapeHTML(part.name)}"><rect x="26" y="26" width="68" height="14" rx="4" fill="#1c2a36" stroke="${color}" stroke-width="2"/><path d="M30 40 90 40 82 76 38 76Z" fill="#0f1a24" stroke="${color}" stroke-width="2.5"/>${gearRing}${tip}<text x="60" y="114" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="${color}">${escapeHTML(label)} ${escapeHTML(part.code || '')}</text></svg>`;
  }

  const state = { arena: null, pockets: [], railRing: null, railGlow: null, railTrail: null, radial: null, bowlPoint: null, bowlPath: null, player: null, enemy: null, opponent: { id: 'demon-boss', name: '魔王', avatar: '👹', top: 'Hells Scythe 4-60T', score: 1000, bot: true }, ranked: [], globalScores: [], battleHistory: [], historyLoaded: false, historyLoading: false, leaderboardQuery: '', leaderboardLoaded: false, leaderboardTotal: 0, leaderboardFilteredTotal: 0, leaderboardHasMore: false, leaderboardSearchTimer: 0, leaderboardRequestId: 0, setupReturnPhase: 'intro', draw: null, scene: null, battling: false, raf: 0, sound: false, audio: null, spinAudio: null, lastBattleModel: null, lastScoreEntry: null, lastLoot: null, requestedChallengeId: new URLSearchParams(window.location.search).get('challenge') || '', customDraft: null, customizingId: '', customNameTimer: 0 };
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
    customPreview: document.querySelector('#custom-top-preview'), customRefineStage: document.querySelector('#custom-refine-stage'), customEffectReveal: document.querySelector('#custom-effect-reveal'), customName: document.querySelector('#custom-top-name'), customStats: document.querySelector('#custom-stat-preview'), customEquipmentOptions: document.querySelector('#custom-equipment-options'), customSlotTabs: document.querySelector('#custom-slot-tabs'), customPartStack: document.querySelector('#custom-part-stack'), customEquipmentSlots: document.querySelector('#custom-equipment-slots'), customSave: document.querySelector('#custom-save-button'), customBattle: document.querySelector('#custom-battle-button'), customStatus: document.querySelector('#custom-top-status'),
    countdown: document.querySelector('#launch-countdown'), stageWrap: document.querySelector('.arena-stage-wrap'), scoreboard: document.querySelector('#arena-scoreboard'), scorePlayer: document.querySelector('#score-player'), scoreEnemy: document.querySelector('#score-enemy'),
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
  // 配件固定三段：上蓋（Blade）· 軸心（Ratchet）· 固鎖（Bit），來源是 product.parts 的「A · B · C」字串
  const PART_LABELS = [['上蓋', 'Blade'], ['軸心', 'Ratchet'], ['固鎖', 'Bit']];
  function partsOf(top) {
    const pieces = String(top?.parts || '').split('·').map(part => part.trim());
    return PART_LABELS.map(([label, english], index) => ({ label, english, name: pieces[index] || '—' }));
  }
  function partsText(top) { return partsOf(top).map(part => `${part.label} ${part.name}`).join(' · '); }
  function partsMarkup(top) { return partsOf(top).map(part => `<span class="part-chip"><small>${part.label}<i>${part.english}</i></small><strong>${escapeHTML(part.name)}</strong></span>`).join(''); }
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
  const lerp = (a, b, t) => a + (b - a) * t;

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

  function spinScore(top, rival) {
    return (top.stats.stamina * .7 + top.stats.defense * .18 + top.stats.burst * .12) * (1 + typeEdge(top, rival) * .45);
  }

  // 場地規則：撞進左下 / 右下洞 2 分、底部長洞 3 分、爆裂 3 分、把對手撞停 1 分；外圍透明盒會把陀螺彈回來，沒有「撞出場」
  // 一場是一連串事件：被撞進洞的還有機會彈回場內，所以分數會累加；有齒輪固鎖的可以咬上藍色齒緣（X 軌道）衝刺再撞
  const FINISH_POINTS = { 'pocket-left': 2, 'pocket-mid': 3, 'pocket-right': 2, burst: 3, spin: 1 };
  const FINISH_LABELS = { 'pocket-left': '左下洞', 'pocket-mid': '底部長洞', 'pocket-right': '右下洞', burst: '爆裂', spin: '撞停' };
  // 爆裂：攻擊 + X 衝刺壓過對方的防爆，陀螺當場散開，+3 且比賽結束
  function burstChance(attacker, defender) {
    const pressure = (attacker.stats.attack * .48 + attacker.stats.xdash * .22) * (1 + typeEdge(attacker, defender) * .7);
    const resistance = defender.stats.burst * .72 + defender.stats.defense * .18 + defender.stats.stamina * .1;
    return clamp(.015, .3, .06 + (pressure - resistance) / 230);
  }
  const SIDE_POCKETS = ['pocket-left', 'pocket-right'];
  function pickPocket(attacker) {
    const midWeight = clamp(.12, .4, .16 + attacker.stats.xdash / 300);
    const roll = Math.random();
    if (roll < midWeight) return 'pocket-mid';
    return SIDE_POCKETS[Math.min(1, Math.floor((roll - midWeight) / (1 - midWeight) * 2))];
  }
  // 齒輪固鎖（Gear / Accel / Rush，或 X 衝刺 ≥ 40）才咬得上藍色齒緣
  function hasRailGear(top) {
    return /gear|accel|rush/i.test(partsOf(top)[2].name) || top.stats.xdash >= 40;
  }
  function simulateKnockoutBattle(player, enemy) {
    const sides = { player, enemy };
    const chance = { player: ringOutChance(enemy, player), enemy: ringOutChance(player, enemy) };   // key = 被撞進洞的一方
    const spin = { player: spinScore(player, enemy), enemy: spinScore(enemy, player) };
    // 復活：進洞後在洞裡滾一滾還有機會跑出來，看防禦與持久；底部長洞比較深，較難出來
    const escapeChance = (top, pocket) => clamp(.25, .7, .3 + (top.stats.defense * .3 + top.stats.stamina * .3) / 260) * (pocket === 'pocket-mid' ? .6 : 1);
    const events = [];
    const points = { player: 0, enemy: 0 };
    const TARGET = 4;   // 先累積到 4 分的贏；每回合一個結局，回合之間重新發射
    let round = 0;
    while (points.player < TARGET && points.enemy < TARGET && round < 8) {
      round += 1;
      // 齒輪固鎖幾乎每回合都會上軌道；沒人擲中的話，第一回合由 X 衝刺較高的一方上，保證每場至少看得到一次
      let railSide = ['player', 'enemy']
        .filter(key => hasRailGear(sides[key]))
        .sort((a, b) => sides[b].stats.xdash - sides[a].stats.xdash)
        .find(key => Math.random() < clamp(.7, .97, .5 + sides[key].stats.xdash / 60)) || '';
      if (!railSide && round === 1) railSide = sides.player.stats.xdash >= sides.enemy.stats.xdash ? 'player' : 'enemy';
      const railImpact = railSide ? randomInt(1, 2) : 0;
      let ended = false;
    for (let impact = 1; impact <= 4 && !ended; impact += 1) {
      const onRail = railSide && railImpact === impact;
      if (onRail) events.push({ type: 'rail', rider: railSide, impact, round });
      const boost = victim => (onRail && victim !== railSide ? 1.6 : 1);
      const rolls = [
        { victim: 'enemy', kind: 'pocket', margin: chance.enemy * boost('enemy') - Math.random() },
        { victim: 'player', kind: 'pocket', margin: chance.player * boost('player') - Math.random() },
        { victim: 'enemy', kind: 'burst', margin: burstChance(player, enemy) * boost('enemy') - Math.random() },
        { victim: 'player', kind: 'burst', margin: burstChance(enemy, player) * boost('player') - Math.random() }
      ].filter(item => item.margin > 0).sort((a, b) => b.margin - a.margin);
      if (!rolls.length) { events.push({ type: 'clash', impact, round }); continue; }
      const victim = rolls[0].victim, attacker = victim === 'player' ? 'enemy' : 'player';
      if (rolls[0].kind === 'burst') {
        points[attacker] += FINISH_POINTS.burst;
        events.push({ type: 'burst', victim, attacker, points: FINISH_POINTS.burst, label: FINISH_LABELS.burst, impact, round });
        ended = true;
        continue;
      }
      const pocket = pickPocket(sides[attacker]);
      const escaped = Math.random() < escapeChance(sides[victim], pocket);
      points[attacker] += FINISH_POINTS[pocket];
      events.push({ type: 'pocket', victim, attacker, pocket, points: FINISH_POINTS[pocket], label: FINISH_LABELS[pocket], escaped, impact, round });
      if (!escaped) ended = true;
    }
    if (!ended) {
      const playerSpinWins = Math.random() < clamp(.12, .88, spin.player / (spin.player + spin.enemy));
      const victim = playerSpinWins ? 'enemy' : 'player', attacker = playerSpinWins ? 'player' : 'enemy';
      points[attacker] += 1;
      events.push({ type: 'spin', victim, attacker, points: 1, label: '撞停', round });
    }
    }
    const last = events[events.length - 1];
    const playerWon = points.player !== points.enemy ? points.player > points.enemy : last.attacker === 'player';
    const playerWinChance = clamp(.12, .88, (1 + chance.enemy + spin.player / 120) / (2 + chance.player + chance.enemy + (spin.player + spin.enemy) / 120));
    return { playerWon, events, rounds: round, target: TARGET, playerPoints: points.player, enemyPoints: points.enemy, outcome: last.type === 'pocket' ? last.pocket : last.type, finishPoints: last.points, finishLabel: last.label, playerWinChance, typeEdge: typeEdge(player, enemy) };
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
    return { stage, tilt, spin, shadow, top, x: 0, y: 0, rotation: 0, speed: 0, wobble: 0, scale: 1, pocketed: false };
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

    // BEYBLADE X 式場地：外圍透明盒（撞到會彈回）→ 藍齒緣的碗 → 左上 / 左中 / 左下三個洞 → 中央橙環
    const ARENA = { cx: 480, cy: 332, rx: 300, ry: 224 };
    state.arena = ARENA;
    draw.ellipse(860, 430).center(ARENA.cx, ARENA.cy).fill('url(#floorGlow)');
    draw.rect(820, 612).radius(48).center(ARENA.cx, ARENA.cy + 14).fill({ color: '#9fd8ff', opacity: .045 }).stroke({ color: '#bfe9ff', width: 2.5, opacity: .32 });
    draw.rect(792, 584).radius(42).center(ARENA.cx, ARENA.cy + 14).fill('none').stroke({ color: '#ffffff', width: 1, opacity: .1 });
    // 藍線輪廓：從實物正上方照片一度一度量出內緣、再平滑處理的表（0° = 右、90° = 下，值 = 相對大圓的半徑）
    // 讀起來是：大圓 → 圓順的肩膀 → 上緣兩段弧 → 中間方形缺口（直壁、平底）。缺口壁與平底保留量測值，其餘平滑
    const RAIL_PROFILE = [
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
      1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 0.998, 0.997, 0.995,
      0.986, 0.982, 0.979, 0.975, 0.970, 0.966, 0.961, 0.957, 0.952, 0.948, 0.944, 0.940,
      0.937, 0.933, 0.930, 0.928, 0.925, 0.923, 0.921, 0.920, 0.918, 0.917, 0.916, 0.915,
      0.914, 0.912, 0.911, 0.910, 0.908, 0.907, 0.905, 0.904, 0.903, 0.901, 0.900, 0.899,
      0.898, 0.897, 0.896, 0.896, 0.895, 0.895, 0.894, 0.894, 0.893, 0.892, 0.891, 0.889,
      0.887, 0.885, 0.881, 0.878, 0.874, 0.870, 0.866, 0.862, 0.854, 0.851, 0.848, 0.845,
      0.832, 0.818, 0.804, 0.791, 0.756, 0.713, 0.663, 0.608, 0.608, 0.608, 0.608, 0.608,
      0.608, 0.608, 0.608, 0.608, 0.608, 0.608, 0.608, 0.608, 0.608, 0.608, 0.608, 0.608,
      0.608, 0.608, 0.608, 0.608, 0.608, 0.633, 0.645, 0.701, 0.748, 0.769, 0.790, 0.811,
      0.833, 0.836, 0.840, 0.843, 0.852, 0.857, 0.863, 0.868, 0.873, 0.878, 0.883, 0.886,
      0.890, 0.892, 0.894, 0.896, 0.897, 0.898, 0.898, 0.898, 0.898, 0.898, 0.898, 0.898,
      0.898, 0.898, 0.898, 0.899, 0.899, 0.900, 0.901, 0.902, 0.903, 0.904, 0.905, 0.907,
      0.908, 0.910, 0.911, 0.913, 0.915, 0.917, 0.919, 0.922, 0.924, 0.927, 0.930, 0.933,
      0.937, 0.941, 0.945, 0.949, 0.953, 0.957, 0.962, 0.966, 0.971, 0.975, 0.979, 0.983,
      0.986, 0.995, 0.997, 0.999, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000,
    ];
    const rad = deg => deg * Math.PI / 180;
    const norm = deg => ((deg + 540) % 360) - 180;
    const radial = theta => {
      const t = ((theta % 360) + 360) % 360, i = Math.floor(t), f = t - i;
      const p0 = RAIL_PROFILE[(i + 359) % 360], p1 = RAIL_PROFILE[i], p2 = RAIL_PROFILE[(i + 1) % 360], p3 = RAIL_PROFILE[(i + 2) % 360];
      return .5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    };
    const bowlPoint = (theta, factor = 1) => [ARENA.cx + ARENA.rx * radial(theta) * factor * Math.cos(rad(theta)), ARENA.cy + ARENA.ry * radial(theta) * factor * Math.sin(rad(theta))];
    const bowlPath = (factor, from = 0, to = 360) => { const pts = []; for (let theta = from; theta <= to; theta += .5) pts.push(bowlPoint(theta, factor)); return 'M' + pts.map(pt => pt.map(v => v.toFixed(1)).join(' ')).join(' L') + (to - from >= 360 ? ' Z' : ''); };
    state.radial = radial; state.bowlPoint = bowlPoint; state.bowlPath = bowlPath;
    // 軌道外的平台（藍線與透明盒之間）
    draw.path(bowlPath(1.2)).fill('#0c1826').stroke({ color: '#173a5a', width: 2, opacity: .8, linejoin: 'round' });
    const pockets = [
      { id: 'pocket-left', angle: 122, factor: 1.115, points: 2, label: '+2', w: 74, h: 46 },
      { id: 'pocket-mid', angle: 90, factor: 1.105, points: 3, label: '+3', w: 176, h: 36, slot: true },
      { id: 'pocket-right', angle: 58, factor: 1.115, points: 2, label: '+2', w: 74, h: 46 }
    ];
    const pocketLayer = draw.group().attr({ id: 'arena-pockets' });
    pockets.forEach(pocket => {
      [pocket.x, pocket.y] = bowlPoint(pocket.angle, pocket.factor);
      const g = pocketLayer.group().attr({ id: `arena-${pocket.id}` });
      pocket.ring = pocket.slot
        ? g.rect(pocket.w, pocket.h).radius(pocket.h / 2).center(pocket.x, pocket.y).fill('#03080d').stroke({ color: '#2f8fd6', width: 4 })
        : g.ellipse(pocket.w, pocket.h).center(pocket.x, pocket.y).fill('#03080d').stroke({ color: '#2f8fd6', width: 4 });
      const [lx, ly] = bowlPoint(pocket.angle, pocket.factor + .1);
      g.text(pocket.label).font({ family: 'IBM Plex Mono', size: 20, weight: 700 }).fill(pocket.points === 3 ? '#ff8a3d' : '#7fd3ff').center(lx, ly).attr({ 'paint-order': 'stroke', stroke: '#03080d', 'stroke-width': 4 });
    });
    state.pockets = pockets;
    // 碗底 + 藍色齒緣（軌道）
    draw.path(bowlPath(1)).fill('#0b1218').stroke({ color: '#2f8fd6', width: 7, linejoin: 'round' });
    state.railRing = draw.path(bowlPath(.982)).fill('none').stroke({ color: '#7fd3ff', width: 2, opacity: .55, dasharray: '3 5' });
    // X 軌道衝刺時的閃白：整條線的白光層 + 跟著陀螺跑的亮白光帶
    state.railGlow = draw.path(bowlPath(1)).fill('none').stroke({ color: '#ffffff', width: 10, opacity: 0, linejoin: 'round' }).attr({ filter: 'url(#speedGlow)' });
    state.railTrail = draw.path('M0 0').fill('none').stroke({ color: '#ffffff', width: 7, opacity: 0, linecap: 'round' });
    // 凹槽前的低矮閘口：藍線在這裡比較低，陀螺容易出軌
    pockets.forEach(pocket => {
      const span = pocket.slot ? 17 : 9;
      draw.path(bowlPath(1, pocket.angle - span, pocket.angle + span)).fill('none').stroke({ color: '#0b1218', width: 7 });
      draw.path(bowlPath(1, pocket.angle - span, pocket.angle + span)).fill('none').stroke({ color: '#7fd3ff', width: 2.5, dasharray: '6 6', opacity: .9 });
    });
    draw.ellipse(300, 226).center(ARENA.cx, ARENA.cy).fill('#101820').stroke({ color: '#1f2a33', width: 2 });
    draw.ellipse(214, 162).center(ARENA.cx, ARENA.cy).fill('none').stroke({ color: '#ff5a2a', width: 4, opacity: .85 });
    draw.ellipse(190, 143).center(ARENA.cx, ARENA.cy).fill('#0a1015');
    const core = draw.group().attr({ id: 'arena-core' });
    core.circle(68).center(ARENA.cx, ARENA.cy).fill('none').stroke({ color: '#7fd3ff', width: 1, opacity: .18, dasharray: '3 7' });
    core.line(ARENA.cx - 42, ARENA.cy, ARENA.cx + 42, ARENA.cy).stroke({ color: '#7fd3ff', width: 1, opacity: .14 });
    core.line(ARENA.cx, ARENA.cy - 42, ARENA.cx, ARENA.cy + 42).stroke({ color: '#7fd3ff', width: 1, opacity: .14 });
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
      actor.stage.transform({ translateX: actor.x, translateY: actor.y, scale: actor.scale || 1 });
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
    if (reducedMotion) { els.countdown.textContent = 'GO SHOOT!'; playCue('shoot'); return new Promise(resolve => setTimeout(() => { els.countdown.textContent = ''; resolve(); }, 180)); }
    const beats = ['3', '2', '1', 'GO SHOOT!'];
    return new Promise(resolve => {
      let index = 0;
      const next = () => {
        const beat = beats[index]; els.countdown.textContent = beat; els.countdown.classList.remove('is-beat'); void els.countdown.offsetWidth; els.countdown.classList.add('is-beat');
        if (beat === 'GO SHOOT!') { playCue('shoot'); els.stageWrap.classList.add('is-launching'); } else playCue('count');
        index += 1;
        if (index < beats.length) setTimeout(next, beat === 'GO SHOOT!' ? 350 : 520);
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
    els.parts.innerHTML = partsMarkup(top);
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
    els.opponentDetailType.textContent = `${top.type} · ${partsText(top)}`;
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
    const who = key => (key === 'player' ? '你' : '對手');
    const tell = event => {
      if (event.type === 'rail') return `${who(event.rider)}咬上藍色齒緣沿軌道衝刺`;
      if (event.type === 'pocket') return `${who(event.attacker)}把${who(event.victim)}撞進${event.label} +${event.points}${event.escaped ? `，${who(event.victim)}又彈了出來` : ''}`;
      if (event.type === 'burst') return `${who(event.attacker)}把${who(event.victim)}撞到爆裂 +${event.points}`;
      return `${who(event.victim)}被撞停，${who(event.attacker)} +${event.points}`;
    };
    const rounds = [];
    (model?.events || []).filter(event => event.type !== 'clash').forEach(event => { (rounds[event.round - 1] ||= []).push(tell(event)); });
    const story = rounds.map((lines, index) => `第 ${index + 1} 回合：${lines.join('；')}`).join('。');
    const outcomeCopy = `${story}。你 ${model?.playerPoints ?? 0}：對手 ${model?.enemyPoints ?? 0}，先到 ${model?.target || 4} 分的贏。`;
    const typeCopy = model?.typeEdge > 0 ? '你克制對手！' : model?.typeEdge < 0 ? '對手克制你！' : '沒有類型克制。';
    const rankBonusCopy = model?.rankBonus > 0 ? ` 擊敗高分對手，排名加成 +${model.rankBonus}！` : '';
    els.resultCopy.textContent = `${outcomeCopy} ${typeCopy}${rankBonusCopy}`;
    els.battleLoot.hidden = !playerWon || !state.lastLoot;
    if (playerWon && state.lastLoot) {
      els.battleLootImage.innerHTML = partGlyph(state.lastLoot.slot, state.lastLoot.part, '#caff3d');
      els.battleLootName.textContent = state.lastLoot.name;
      els.battleLootStat.textContent = deltaText(state.lastLoot.part);
      els.battleLootCount.textContent = `${state.lastLoot.english.toUpperCase()} · #${state.lastLoot.instanceId.slice(-4)} · 到「強化陀螺」換上去`;
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

  // 場上即時計分：每次得分當下跳出「+3 左中洞」，YOU : RIVAL 跟著跳
  const liveScore = { player: 0, enemy: 0 };
  function resetLiveScore() {
    liveScore.player = 0; liveScore.enemy = 0;
    if (els.scorePlayer) els.scorePlayer.textContent = '0';
    if (els.scoreEnemy) els.scoreEnemy.textContent = '0';
    els.scoreboard?.classList.remove('is-lead-player', 'is-lead-enemy');
    els.stageWrap?.querySelectorAll('.score-toast').forEach(node => node.remove());
  }
  function scorePop(attacker, points, label, note = '') {
    liveScore[attacker] += points;
    const counter = attacker === 'player' ? els.scorePlayer : els.scoreEnemy;
    if (counter) {
      counter.textContent = String(liveScore[attacker]);
      counter.classList.remove('is-bump'); void counter.offsetWidth; counter.classList.add('is-bump');
    }
    els.scoreboard?.classList.toggle('is-lead-player', liveScore.player > liveScore.enemy);
    els.scoreboard?.classList.toggle('is-lead-enemy', liveScore.enemy > liveScore.player);
    if (!els.stageWrap) return;
    const toast = document.createElement('div');
    toast.className = `score-toast score-toast--${attacker}`;
    toast.innerHTML = `<b>+${points}</b><span>${escapeHTML(label)}</span>${note ? `<small>${escapeHTML(note)}</small>` : ''}`;
    els.stageWrap.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);
  }
  function noteToast(text) {
    if (!els.stageWrap) return;
    const toast = document.createElement('div');
    toast.className = 'score-toast score-toast--note';
    toast.innerHTML = `<span>${escapeHTML(text)}</span>`;
    els.stageWrap.appendChild(toast);
    setTimeout(() => toast.remove(), 1200);
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
    state.battling = true; hideResult(); resetLiveScore(); els.scoreboard?.removeAttribute('hidden'); els.status.textContent = 'LAUNCH SEQUENCE';
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
    const modelScore = Math.max(100, Math.round(820 + model.playerWinChance * 420 + (playerWon ? 120 + model.playerPoints * 40 : 0) + Math.random() * 45));
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
    const p = state.scene.player, e = state.scene.enemy;
    const actorOf = key => (key === 'player' ? p : e);
    const otherOf = key => (key === 'player' ? e : p);
    const A = state.arena;
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeInOut = t => -Math.cos(clamp(0, 1, t) * Math.PI) / 2 + .5;
    // 依事件排段落：chaos（混戰，結尾撞一下）→ rail（咬上齒緣衝刺，結尾撞人）→ pocket（被撞進洞）→ escape（彈出來）→ spin（撞停）
    const phases = [];
    let chaosCount = 0, seenRound = 1;
    model.events.forEach(event => {
      if (event.round > seenRound) { seenRound = event.round; phases.push({ kind: 'relaunch', dur: 2100, round: event.round }); }
      const last = phases[phases.length - 1];
      if (event.type === 'rail') { phases.push({ kind: 'chaos', dur: 900, index: chaosCount++ }); phases.push({ kind: 'rail', dur: 1500, rider: event.rider }); return; }
      if (event.type === 'clash') { if (last?.kind !== 'rail') phases.push({ kind: 'chaos', dur: 1250, index: chaosCount++, clash: true }); return; }
      if (event.type === 'pocket') {
        if (last?.kind !== 'rail') phases.push({ kind: 'chaos', dur: 1250, index: chaosCount++, clash: true });
        phases.push({ kind: 'pocket', dur: event.escaped ? 1700 : 1500, event });
        if (event.escaped) phases.push({ kind: 'escape', dur: 700, event });
        return;
      }
      if (event.type === 'burst') {
        if (last?.kind !== 'rail') phases.push({ kind: 'chaos', dur: 1250, index: chaosCount++, clash: true });
        phases.push({ kind: 'burst', dur: 1200, event });
        return;
      }
      if (event.type === 'spin') { phases.push({ kind: 'chaos', dur: 1000, index: chaosCount++ }); phases.push({ kind: 'spin', dur: 1100, event }); }
    });
    phases.push({ kind: 'settle', dur: 350 });
    const spinFactor = { player: 1, enemy: 1 };
    let phaseIndex = -1, phaseStart = start, current = null, from = null, previousFrame = start, trailFrame = 0, lastWallHit = 0, lastRailSpark = 0;
    // 外圍透明盒：跑出碗緣就彈回來，並在盒子上閃一下火花
    const bounceOffBox = (actor, now) => {
      const dx = (actor.x - A.cx) / A.rx, dy = (actor.y - A.cy) / A.ry, d = Math.hypot(dx, dy);
      const limit = (state.radial ? state.radial(Math.atan2(dy, dx) * 180 / Math.PI) : 1) - .19;
      if (d <= limit) return;
      actor.x = A.cx + dx / d * limit * A.rx; actor.y = A.cy + dy / d * limit * A.ry;
      actor.wobble = Math.max(actor.wobble, 4);
      if (now - lastWallHit > 240) {
        lastWallHit = now; burst(actor.x + dx / d * 52, actor.y + dy / d * 40, '#bfe9ff', .55); playCue('impact');
        // 撞到藍線：那一段閃白
        if (state.railTrail && state.bowlPath) { const deg = Math.atan2(dy, dx) * 180 / Math.PI; state.railTrail.plot(state.bowlPath(1, deg - 14, deg + 14)).stroke({ opacity: 1 }).animate(320).ease('>').stroke({ opacity: 0 }); }
      }
    };
    const shake = ms => { els.stageWrap.classList.add('is-impacting'); setTimeout(() => els.stageWrap.classList.remove('is-impacting'), ms); };
    const clashBurst = big => {
      const cx = (p.x + e.x) / 2, cy = (p.y + e.y) / 2;
      if (big && state.player.effect) refinedClash(state.player.effect, cx - 24, cy, 1);
      else if (big) elementalClash(cx, cy, playerWon ? state.player.color : state.enemy.color, playerWon ? 1 : -1);
      else { burst(cx, cy, '#ffffff', 1.2); lightningStrike(cx, cy - 15); }
      playCue('impact'); playCue(big ? 'fire' : 'zap');
      shake(big ? 420 : 260);
    };
    const pocketOf = event => state.pockets.find(item => item.id === event.pocket) || state.pockets[1];
    const startPhase = now => {
      phaseIndex += 1; current = phases[phaseIndex]; phaseStart = now;
      if (!current) return;
      from = { px: p.x, py: p.y, ex: e.x, ey: e.y };
      if (current.kind === 'chaos') els.status.textContent = 'BATTLE IN PROGRESS';
      if (current.kind === 'relaunch') {
        current.beat = -1;
        spinFactor.player = 1; spinFactor.enemy = 1;
        p.pocketed = false; e.pocketed = false;
        els.status.textContent = `ROUND ${current.round}`;
        noteToast(`第 ${current.round} 回合！你 ${liveScore.player}：對手 ${liveScore.enemy}`);
      }
      if (current.kind === 'rail') {
        const rider = actorOf(current.rider);
        current.a0 = Math.atan2((rider.y - A.cy) / A.ry, (rider.x - A.cx) / A.rx);
        state.railRing?.stroke({ color: '#ffffff', opacity: 1, width: 3.5 });
        state.railGlow?.opacity(1).animate(260).ease('>').opacity(.35);
        playCue('summon'); playCue('zap'); els.status.textContent = 'XTREME DASH';
        noteToast(`${current.rider === 'player' ? '你' : '對手'}咬上藍線 XTREME DASH！`);
      }
      if (current.kind === 'pocket') { current.sunk = false; els.status.textContent = 'POCKET!'; }
      if (current.kind === 'escape') {
        const victim = actorOf(current.event.victim), pocket = pocketOf(current.event);
        burst(pocket.x, pocket.y, '#ffffff', 1.1); playCue('impact'); shake(240);
        victim.pocketed = false; els.status.textContent = 'BOUNCED BACK';
        noteToast(`${current.event.victim === 'player' ? '你' : '對手'}彈回場內！繼續打`);
      }
      if (current.kind === 'spin') { els.status.textContent = 'SPIN FINISH'; scorePop(current.event.attacker, current.event.points, `${current.event.attacker === 'player' ? '對手' : '你'}被撞停`); }
      if (current.kind === 'burst') { current.blown = false; els.status.textContent = 'BURST FINISH'; }
    };
    const endPhase = () => {
      if (!current) return;
      if (current.kind === 'chaos' && current.clash) clashBurst(current.index > 0);
      if (current.kind === 'rail') { clashBurst(true); state.railRing?.stroke({ color: '#7fd3ff', opacity: .55, width: 2 }); state.railGlow?.opacity(0); state.railTrail?.plot('M0 0').stroke({ opacity: 0 }); }
    };
    const frame = now => {
      const dt = Math.min(32, now - previousFrame); previousFrame = now;
      if (!current || now - phaseStart >= current.dur) {
        endPhase();
        startPhase(now);
        if (!current) { finishBattle(playerWon, recordScore); return; }
      }
      const k = clamp(0, 1, (now - phaseStart) / current.dur);
      const tt = (now - start) / 1000;
      p.rotation = (p.rotation + (28.8 + Math.min(tt, 4) * 1.3) * dt * spinFactor.player) % 360;
      e.rotation = (e.rotation - (27.4 + Math.min(tt, 4) * 1.2) * dt * spinFactor.enemy) % 360;
      trailFrame += 1;
      if (trailFrame % 3 === 0) { speedTrail(p); speedTrail(e); }

      if (current.kind === 'relaunch') {
        // 回合之間：兩顆陀螺回到發射位置，重新倒數 3、2、1、GO SHOOT！
        const back = easeInOut(k / .3);
        p.x = lerp(from.px, 325, back); p.y = lerp(from.py, 365, back);
        e.x = lerp(from.ex, 635, back); e.y = lerp(from.ey, 365, back);
        p.scale = lerp(p.scale, 1, back); e.scale = lerp(e.scale, 1, back);
        p.stage.opacity(1); e.stage.opacity(1); p.wobble = 0; e.wobble = 0;
        const beats = ['3', '2', '1', 'GO SHOOT!'];
        const beatIndex = Math.min(3, Math.floor(Math.max(0, k - .3) / .7 * 4));
        if (k >= .3 && beatIndex !== current.beat) {
          current.beat = beatIndex;
          const beat = beats[beatIndex];
          els.countdown.textContent = beat; els.countdown.classList.remove('is-beat'); void els.countdown.offsetWidth; els.countdown.classList.add('is-beat');
          if (beat === 'GO SHOOT!') { playCue('shoot'); els.stageWrap.classList.add('is-launching'); } else playCue('count');
        }
        if (k >= .98 && current.beat !== 4) { current.beat = 4; els.countdown.textContent = ''; els.countdown.classList.remove('is-beat'); els.stageWrap.classList.remove('is-launching'); }
      } else if (current.kind === 'chaos') {
        const phase = tt * Math.PI * 2.7;
        const mix = easeInOut(k / .3);
        const collision = current.clash ? Math.max(0, (k - .85) / .15) : 0;
        const px = 480 + 262 * Math.sin(phase) + 44 * Math.sin(phase * 2.73 + .4);
        const py = 365 + 170 * Math.sin(phase * 1.57 + .55) + 26 * Math.cos(phase * 3.1);
        const ex = 480 + 268 * Math.sin(phase * 1.13 + Math.PI) + 40 * Math.cos(phase * 2.41);
        const ey = 365 + 166 * Math.sin(phase * 1.71 + 2.2) + 28 * Math.sin(phase * 2.9);
        p.x = lerp(from.px, px, mix) * (1 - collision) + 468 * collision;
        p.y = lerp(from.py, py, mix) * (1 - collision) + 360 * collision;
        e.x = lerp(from.ex, ex, mix) * (1 - collision) + 492 * collision;
        e.y = lerp(from.ey, ey, mix) * (1 - collision) + 370 * collision;
        p.wobble = collision * 5; e.wobble = collision * 6;
        p.scale = 1; e.scale = 1; p.stage.opacity(1); e.stage.opacity(1);
        bounceOffBox(p, now); bounceOffBox(e, now);
      } else if (current.kind === 'rail') {
        // 咬上齒緣：先滑到藍線，沿線衝 1.3 圈，最後從線上射向對手
        const rider = actorOf(current.rider), other = otherOf(current.rider);
        const snap = easeInOut(k / .18), ride = easeInOut((k - .18) / .64), launch = easeOut(clamp(0, 1, (k - .84) / .16));
        const angle = current.a0 + ride * Math.PI * 2 * 1.3;
        const [railX, railY] = state.bowlPoint ? state.bowlPoint(angle * 180 / Math.PI, .89) : [A.cx + Math.cos(angle) * (A.rx - 34), A.cy + Math.sin(angle) * (A.ry - 26)];
        const fromX = current.rider === 'player' ? from.px : from.ex, fromY = current.rider === 'player' ? from.py : from.ey;
        const onRailX = lerp(fromX, railX, snap), onRailY = lerp(fromY, railY, snap);
        other.x = A.cx + (current.rider === 'player' ? 40 : -40) + Math.sin(tt * 5) * 22;
        other.y = A.cy + 10 + Math.cos(tt * 4) * 16;
        rider.x = lerp(onRailX, other.x + (current.rider === 'player' ? -34 : 34), launch);
        rider.y = lerp(onRailY, other.y, launch);
        rider.wobble = 2 + ride * 3; other.wobble = launch * 8;
        const riding = k > .18 && k < .84;
        const pulse = .3 + .35 * (0.5 + 0.5 * Math.sin(now / 45));
        state.railGlow?.opacity(riding ? pulse : Math.max(0, .35 - launch));
        state.railRing?.stroke({ opacity: riding ? .6 + .4 * Math.sin(now / 30) ** 2 : 1 });
        if (state.railTrail && state.bowlPath) {
          const deg = angle * 180 / Math.PI;
          state.railTrail.plot(riding ? state.bowlPath(.89, deg - 42, deg) : 'M0 0').stroke({ opacity: riding ? .9 : 0 });
        }
        if (riding && now - lastRailSpark > 70) { lastRailSpark = now; burst(railX, railY, '#ffffff', .35); speedTrail(rider); }
      } else if (current.kind === 'pocket') {
        const event = current.event, victim = actorOf(event.victim), attacker = actorOf(event.attacker), pocket = pocketOf(event);
        const vx0 = event.victim === 'player' ? from.px : from.ex, vy0 = event.victim === 'player' ? from.py : from.ey;
        const ax0 = event.attacker === 'player' ? from.px : from.ex, ay0 = event.attacker === 'player' ? from.py : from.ey;
        // 0–.4 被撞飛進洞；.4 之後在洞裡滾（繞圈 + 火花）；跑不出來的最後 25% 沉下去
        const travel = clamp(0, 1, k / .4);
        const roll = clamp(0, 1, (k - .4) / (event.escaped ? .6 : .35));
        const sink = event.escaped ? 0 : clamp(0, 1, (k - .75) / .25);
        const glide = 1 - Math.pow(1 - travel, 2);
        const inHole = travel >= 1;
        const rollAngle = roll * Math.PI * (event.escaped ? 5 : 3);
        const rollRadius = 20 * (1 - sink);
        victim.x = lerp(vx0, pocket.x, glide) + (inHole ? Math.cos(rollAngle) * rollRadius : 0);
        victim.y = lerp(vy0, pocket.y, glide) - 80 * Math.sin(travel * Math.PI) + (inHole ? Math.sin(rollAngle) * rollRadius * .6 : 0);
        victim.wobble = inHole ? 18 : 10 + travel * 16;
        victim.scale = inHole ? lerp(.8, .42, sink) : 1;
        victim.stage.opacity(inHole ? lerp(.9, .2, sink * sink) : 1);
        attacker.x = lerp(ax0, A.cx + (event.attacker === 'player' ? -30 : 30), easeOut(k));
        attacker.y = lerp(ay0, A.cy, easeOut(k)) + Math.sin(k * Math.PI) * 14;
        attacker.wobble = 0;
        if (inHole && roll < 1 && now - lastRailSpark > 110) { lastRailSpark = now; burst(victim.x + 10, victim.y + 6, '#7fd3ff', .3); }
        if (inHole && !current.sunk) {
          current.sunk = true; victim.pocketed = true;
          const color = pocket.points === 3 ? '#ff8a3d' : '#7fd3ff';
          burst(pocket.x, pocket.y, color, 1.2);
          pocket.ring.animate(160).stroke({ color: '#ffffff', width: 9 }).animate(620).stroke({ color: '#2f8fd6', width: 5 });
          const floatText = state.scene.impact.text(`+${pocket.points}`).font({ family: 'IBM Plex Mono', size: 34, weight: 700 }).fill(color).center(pocket.x, pocket.y - 30).attr({ 'paint-order': 'stroke', stroke: '#03080d', 'stroke-width': 6 });
          floatText.animate(1100).ease('>').dy(-70).opacity(0).after(() => floatText.remove());
          playCue('impact'); setTimeout(() => playCue('zap'), 90); shake(300);
          scorePop(event.attacker, pocket.points, `${event.attacker === 'player' ? '對手' : '你'}被撞進${event.label}`);
        }
      } else if (current.kind === 'escape') {
        // 從洞裡彈回場內：沿弧線跳回碗裡，恢復大小
        const event = current.event, victim = actorOf(event.victim), pocket = pocketOf(event);
        const vx0 = event.victim === 'player' ? from.px : from.ex, vy0 = event.victim === 'player' ? from.py : from.ey;
        const targetX = A.cx + (pocket.x - A.cx) * .4, targetY = A.cy + (pocket.y - A.cy) * .4;
        const w = easeOut(k);
        victim.x = lerp(vx0, targetX, w);
        victim.y = lerp(vy0, targetY, w) - 70 * Math.sin(k * Math.PI);
        victim.scale = lerp(.8, 1, w);
        victim.stage.opacity(lerp(.9, 1, w));
        victim.wobble = 12 * (1 - k);
      } else if (current.kind === 'burst') {
        // 爆裂：受害者狂抖、瞬間脹大，然後零件散開（火花四射）、縮小變暗留在原地
        const event = current.event, victim = actorOf(event.victim), attacker = actorOf(event.attacker);
        const vx0 = event.victim === 'player' ? from.px : from.ex, vy0 = event.victim === 'player' ? from.py : from.ey;
        const ax0 = event.attacker === 'player' ? from.px : from.ex, ay0 = event.attacker === 'player' ? from.py : from.ey;
        const shakePhase = clamp(0, 1, k / .35), blow = clamp(0, 1, (k - .35) / .65);
        victim.x = vx0 + Math.sin(k * Math.PI * 22) * 9 * (1 - blow);
        victim.y = vy0 + Math.cos(k * Math.PI * 18) * 6 * (1 - blow);
        victim.wobble = 14 + shakePhase * 16;
        victim.scale = blow ? lerp(1.18, .55, easeOut(blow)) : lerp(1, 1.18, shakePhase);
        victim.stage.opacity(1 - .7 * blow * blow);
        attacker.x = lerp(ax0, A.cx + (event.attacker === 'player' ? -40 : 40), easeOut(k));
        attacker.y = lerp(ay0, A.cy, easeOut(k)) + Math.sin(k * Math.PI) * 12;
        attacker.wobble = 0;
        if (blow > 0 && !current.blown) {
          current.blown = true;
          burst(victim.x, victim.y, '#ffffff', 1.7); burst(victim.x, victim.y, attacker.top.color, 1.3);
          lightningStrike(victim.x, victim.y - 10, '#ff8a3d');
          const floatText = state.scene.impact.text('+3 BURST').font({ family: 'IBM Plex Mono', size: 30, weight: 700 }).fill('#ff8a3d').center(victim.x, victim.y - 40).attr({ 'paint-order': 'stroke', stroke: '#03080d', 'stroke-width': 6 });
          floatText.animate(1100).ease('>').dy(-70).opacity(0).after(() => floatText.remove());
          playCue('impact'); playCue('fire'); setTimeout(() => playCue('zap'), 90); shake(420);
          scorePop(event.attacker, event.points, `${event.attacker === 'player' ? '對手' : '你'}爆裂`);
        }
      } else if (current.kind === 'spin') {
        const event = current.event, loser = actorOf(event.victim), winner = actorOf(event.attacker);
        spinFactor[event.victim] = Math.max(.025, 1 - k);
        const lx0 = event.victim === 'player' ? from.px : from.ex, ly0 = event.victim === 'player' ? from.py : from.ey;
        loser.x = lerp(lx0, event.victim === 'player' ? 405 : 555, easeOut(k)) + Math.sin(k * Math.PI * 8) * 6 * (1 - k);
        loser.y = lerp(ly0, 382, easeOut(k));
        loser.wobble = 5 + k * 19; loser.scale = 1; loser.stage.opacity(1);
        const wx0 = event.attacker === 'player' ? from.px : from.ex, wy0 = event.attacker === 'player' ? from.py : from.ey;
        winner.x = lerp(wx0, event.attacker === 'player' ? 460 : 500, easeOut(k)) + Math.sin(k * Math.PI * 2) * 18 * (1 - k);
        winner.y = lerp(wy0, 365, easeOut(k)) + Math.sin(k * Math.PI) * 18;
        winner.wobble = 0;
      }
      renderPose();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  function finishBattle(playerWon, recordScore) {
    state.battling = false; els.status.textContent = 'BATTLE COMPLETE';
    const model = state.lastBattleModel;
    if (model && els.scorePlayer && els.scoreEnemy) { liveScore.player = model.playerPoints; liveScore.enemy = model.enemyPoints; els.scorePlayer.textContent = String(model.playerPoints); els.scoreEnemy.textContent = String(model.enemyPoints); els.scoreboard?.classList.toggle('is-lead-player', model.playerPoints > model.enemyPoints); els.scoreboard?.classList.toggle('is-lead-enemy', model.enemyPoints > model.playerPoints); }
    els.stageWrap.classList.remove('is-high-speed');
    els.battle.disabled = false; els.summon.disabled = false;
    if (playerWon) grantEquipment();
    els.battle.textContent = '揍他'; showResult(playerWon); playCue(playerWon ? 'win' : 'lose');
    submitScore(recordScore, playerWon);
    if (state.scene) {
      const winner = playerWon ? state.scene.player : state.scene.enemy;
      winner.wobble = 0; winner.scale = 1;
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
    const saved = readStorage(storageKeys.parts, null);
    if (Array.isArray(saved)) {
      return saved.filter(instance => findPart(instance.slot, instance.partId)).map(instance => ({
        id: String(instance.id || `PART-${makeId()}`), slot: instance.slot, partId: instance.partId,
        effectId: refineEffects.some(effect => effect.id === instance.effectId) ? instance.effectId : '',
        ownerTopId: String(instance.ownerTopId || '')
      }));
    }
    const migrated = [];
    const v2 = readStorage(storageKeys.equipment, null);
    if (Array.isArray(v2)) {
      v2.forEach(instance => {
        const mapped = legacyEquipmentToPart[instance.itemId] || legacyEquipmentToPart['power-gear'];
        migrated.push({ id: String(instance.id || `PART-${makeId()}`), slot: mapped[0], partId: mapped[1], effectId: refineEffects.some(effect => effect.id === instance.effectId) ? instance.effectId : '', ownerTopId: String(instance.ownerTopId || '') });
      });
    } else {
      const v1 = readStorage(storageKeys.legacyEquipment, {});
      Object.entries(legacyEquipmentToPart).forEach(([itemId, mapped]) => {
        const entry = v1[itemId];
        const count = Math.max(0, Number(entry?.count ?? entry) || 0);
        for (let index = 0; index < count; index += 1) migrated.push({ id: `PART-${makeId()}`, slot: mapped[0], partId: mapped[1], effectId: index === 0 && refineEffects.some(effect => effect.id === entry?.effectId) ? entry.effectId : '', ownerTopId: '' });
      });
    }
    writeEquipmentInventory(migrated);
    return migrated;
  }

  function writeEquipmentInventory(inventory) { writeStorage(storageKeys.parts, inventory); }

  function equipmentEffect(entry) {
    return refineEffects.find(effect => effect.id === entry?.effectId) || null;
  }

  function grantEquipment() {
    const roll = Math.random();
    let acc = 0;
    const slot = partSlots.find(item => { acc += item.rate; return roll < acc; }) || partSlots[partSlots.length - 1];
    const part = pick(customizationParts[slot.key]);
    const inventory = readEquipmentInventory();
    const instance = { id: `PART-${makeId()}`, slot: slot.key, partId: part.id, effectId: '', ownerTopId: '' };
    inventory.push(instance);
    writeEquipmentInventory(inventory);
    state.lastLoot = { slot: slot.key, part, instanceId: instance.id, name: `${slot.label} ${part.name}`, label: slot.label, english: slot.english };
    trackEvent('battle_top_part_drop', { part_slot: slot.key, part_id: part.id, part_instance_id: instance.id });
    return state.lastLoot;
  }

  function makeCustomDraft(seed) {
    const base = productCatalog.find(product => product.id === seed?.baseProductId)
      || productCatalog.find(product => product.id === seed?.id)
      || productCatalog.find(product => product.image === seed?.image)
      || productCatalog[0];
    const inventory = readEquipmentInventory();
    const parts = { blade: '', ratchet: '', bit: '' };
    const wanted = seed?.partSlots ? Object.values(seed.partSlots) : (Array.isArray(seed?.equipment) ? seed.equipment : []);
    wanted.forEach(reference => {
      const instance = inventory.find(candidate => candidate.id === reference && (!candidate.ownerTopId || candidate.ownerTopId === seed?.id));
      if (instance && !parts[instance.slot]) parts[instance.slot] = instance.id;
    });
    return { baseProductId: base.id, parts, activeSlot: 'ratchet', slotChosen: false, name: seed?.isCustom ? seed.name : '' };
  }

  function buildCustomTop() {
    const draft = state.customDraft;
    const base = productCatalog.find(product => product.id === draft.baseProductId) || productCatalog[0];
    const inventory = readEquipmentInventory();
    const stock = stockPartsOf(base);
    const stats = { ...base.stats };
    const installed = {};
    partSlots.forEach(({ key }) => {
      const instance = inventory.find(candidate => candidate.id === draft.parts[key]);
      const part = instance ? findPart(key, instance.partId) : null;
      if (!part) return;
      installed[key] = { instance, part };
      const remove = stock[key] ? partDelta(stock[key]) : averageDelta(key);
      const add = partDelta(part);
      Object.keys(stats).forEach(stat => { stats[stat] = clamp(8, 150, Math.round(stats[stat] - (remove[stat] || 0) + (add[stat] || 0))); });
    });
    const equipped = Object.values(installed);
    const effect = [...equipped].reverse().map(item => equipmentEffect(item.instance)).find(Boolean) || null;
    const pieces = String(base.parts).split('·').map(part => part.trim());
    const names = { blade: installed.blade?.part.name || pieces[0], ratchet: installed.ratchet?.part.name || pieces[1], bit: installed.bit?.part.name || pieces[2] };
    const bladeProduct = installed.blade ? productCatalog.find(product => product.id === installed.blade.part.productId) : null;
    const bitCode = installed.bit ? installed.bit.part.code : ((base.name.match(/\d+-\d+([A-Z]+)$/) || [])[1] || '');
    const autoName = equipped.length ? `${names.blade} ${names.ratchet}${bitCode}` : base.name;
    return {
      ...cloneProduct(base), id: state.customizingId || `CUSTOM-${makeId()}`, baseProductId: base.id,
      name: draft.name.trim() || autoName,
      image: bladeProduct?.image || base.image, color: bladeProduct?.color || base.color, accent: bladeProduct?.accent || base.accent, source: bladeProduct?.source || base.source,
      parts: `${names.blade} · ${names.ratchet} · ${names.bit}`,
      type: deriveCustomType(stats), stats, isCustom: true,
      equipment: Object.values(draft.parts).filter(Boolean), partSlots: { ...draft.parts },
      effect: effect ? { ...effect } : null,
      skill: equipped.length ? `已換裝：${equipped.map(item => `${slotMeta(item.instance.slot).label} ${item.part.name}`).join('、')}。` : '打贏對手會掉零件，再回來換上蓋、軸心或固鎖。'
    };
  }

  function renderEquipmentOptions() {
    const draft = state.customDraft;
    const inventory = readEquipmentInventory();
    const base = productCatalog.find(product => product.id === draft.baseProductId) || productCatalog[0];
    const stock = stockPartsOf(base);
    const pieces = String(base.parts).split('·').map(part => part.trim());
    const owned = key => inventory.filter(instance => instance.slot === key && (!instance.ownerTopId || instance.ownerTopId === state.customizingId));
    // 只在第一次打開時自動選到有零件的分層；使用者點過分層後就照使用者的
    if (!draft.slotChosen && !owned(draft.activeSlot).length && !draft.parts[draft.activeSlot]) {
      const first = partSlots.find(({ key }) => owned(key).length || draft.parts[key]);
      if (first) draft.activeSlot = first.key;
    }
    const active = draft.activeSlot;
    const meta = slotMeta(active);
    els.customEquipmentSlots.textContent = `${Object.values(draft.parts).filter(Boolean).length} / 3`;
    els.customSlotTabs.innerHTML = partSlots.map(slot => `<button type="button" role="tab" data-slot="${slot.key}" aria-selected="${slot.key === active}"${draft.parts[slot.key] ? ' class="has-part"' : ''}>${slot.label}<span>${slot.english} · ${owned(slot.key).length}</span></button>`).join('');
    els.customSlotTabs.querySelectorAll('[data-slot]').forEach(button => button.addEventListener('click', () => { draft.activeSlot = button.dataset.slot; draft.slotChosen = true; renderCustomPreview(); }));
    const stockName = pieces[partSlots.findIndex(slot => slot.key === active)] || '原廠';
    const list = owned(active);
    const stockCard = `<button type="button" class="custom-part-card is-stock${draft.parts[active] ? '' : ' is-equipped'}" data-part="" aria-pressed="${!draft.parts[active]}"><span>${partGlyph(active, { name: stockName, code: stock[active]?.code }, '#7f959b', active === 'blade' ? base.image : '')}</span><strong>${escapeHTML(stockName)}</strong><b>原廠${meta.label}</b><small>隨時可以換回來</small></button>`;
    els.customEquipmentOptions.innerHTML = stockCard + list.map(instance => {
      const part = findPart(active, instance.partId);
      const equipped = draft.parts[active] === instance.id;
      const effect = equipmentEffect(instance);
      const color = effect?.color || '#28f4e8';
      return `<button type="button" class="custom-part-card${equipped ? ' is-equipped' : ''}" data-part="${instance.id}" style="--equipment-color:${color}" aria-pressed="${equipped}"><span>${partGlyph(active, part, color)}<i>#${instance.id.slice(-4)}</i></span><strong>${escapeHTML(part.name)}</strong><b>${deltaText(part)}</b><small>${effect ? `${effect.icon} ${effect.name}特效` : equipped ? '出戰時鑑定特效' : '尚未鑑定'}</small></button>`;
    }).join('') + (list.length ? '' : `<p class="custom-equipment-empty">還沒有可以換的${meta.label}。打贏對手有 ${Math.round(meta.rate * 100)}% 機率掉${meta.label}。</p>`);
    els.customEquipmentOptions.querySelectorAll('[data-part]').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.part;
      draft.parts[active] = id;
      const chosen = id ? findPart(active, inventory.find(instance => instance.id === id)?.partId) : null;
      els.customStatus.textContent = chosen ? `${meta.label}已換成 ${chosen.name}。` : `${meta.label}換回原廠。`;
      persistCustomName(false);
      renderCustomPreview();
    }));
  }

  function renderCustomPreview() {
    const top = buildCustomTop();
    const base = productCatalog.find(product => product.id === state.customDraft.baseProductId) || productCatalog[0];
    const isSaved = Boolean(state.customizingId && readCollection().some(item => item.id === state.customizingId));
    renderEquipmentOptions();
    els.customPreview.innerHTML = `<span style="--custom-color:${top.color}"></span><img src="${top.image}" alt="${escapeHTML(top.name)}">`;
    const names = partsOf(top);
    els.customPartStack.innerHTML = partSlots.map((slot, index) => {
      const id = state.customDraft.parts[slot.key];
      const instance = id ? readEquipmentInventory().find(item => item.id === id) : null;
      const glyphPart = instance ? findPart(slot.key, instance.partId) : { name: names[index].name, code: stockPartsOf(base)[slot.key]?.code };
      return `<button type="button" class="custom-part-slab${slot.key === state.customDraft.activeSlot ? ' is-active' : ''}" data-stack-slot="${slot.key}" aria-pressed="${slot.key === state.customDraft.activeSlot}"><span class="slab-glyph">${partGlyph(slot.key, glyphPart, id ? '#caff3d' : '#7f959b', slot.key === 'blade' && !instance ? base.image : '')}</span><small>${slot.label}<i>${slot.english}</i></small><strong>${escapeHTML(names[index].name)}</strong><b class="${id ? '' : 'is-stock'}">${id ? '換裝' : '原廠'}</b></button>`;
    }).join('');
    els.customPartStack.querySelectorAll('[data-stack-slot]').forEach(button => button.addEventListener('click', () => { state.customDraft.activeSlot = button.dataset.stackSlot; state.customDraft.slotChosen = true; renderCustomPreview(); }));
    els.customStats.innerHTML = Object.entries(top.stats).map(([key, value]) => {
      const diff = value - base.stats[key];
      return `<div><span>${STAT_LABELS[key]}</span><i><b style="width:${value / 1.2}%"></b></i><strong>${value}${diff ? ` <em class="${diff > 0 ? '' : 'down'}">${diff > 0 ? '+' : ''}${diff}</em>` : ''}</strong></div>`;
    }).join('');
    els.customEffectReveal.innerHTML = top.effect ? `<span>${top.effect.icon}</span> ${top.effect.name}特效` : top.equipment.length ? '特效等待出戰鑑定' : '尚未換零件';
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
    els.customStatus.textContent = seed.isCustom ? '點左邊的上蓋 / 軸心 / 固鎖，右邊挑零件換上去。改名字會自動儲存。' : '打贏拿到的零件在這裡換上去：上蓋、軸心、固鎖各一個。';
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
    if (!Object.values(state.customDraft?.parts || {}).some(Boolean)) return;
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
    const unidentifiedId = Object.values(state.customDraft.parts).filter(Boolean).reverse().find(id => {
      const instance = inventory.find(candidate => candidate.id === id);
      return instance && !instance.effectId;
    });
    if (unidentifiedId) {
      const instance = inventory.find(candidate => candidate.id === unidentifiedId);
      const item = { name: `${slotMeta(instance.slot).label} ${findPart(instance.slot, instance.partId)?.name || ''}` };
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
        const mapped = legacyEquipmentToPart[reference];
        const legacy = exact || (mapped ? inventory.find(instance => instance.slot === mapped[0] && instance.partId === mapped[1] && !claimed.has(instance.id) && (!instance.ownerTopId || instance.ownerTopId === top.id)) : null);
        if (!legacy) return '';
        if (legacy.ownerTopId !== top.id) migrated = true;
        legacy.ownerTopId = top.id;
        claimed.add(legacy.id);
        return legacy.id;
      }).filter(Boolean).slice(0, 3);
      // 每層只留一個零件；多出來的釋放回庫存
      const perSlot = {};
      const kept = resolved.filter(id => {
        const instance = inventory.find(candidate => candidate.id === id);
        if (!instance || perSlot[instance.slot]) { if (instance) { instance.ownerTopId = ''; claimed.delete(instance.id); } migrated = true; return false; }
        perSlot[instance.slot] = id;
        return true;
      });
      if (kept.join('|') !== top.equipment.join('|')) migrated = true;
      top.equipment = kept;
      const nextSlots = { blade: perSlot.blade || '', ratchet: perSlot.ratchet || '', bit: perSlot.bit || '' };
      if (JSON.stringify(top.partSlots || null) !== JSON.stringify(nextSlots)) { top.partSlots = nextSlots; migrated = true; }
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
