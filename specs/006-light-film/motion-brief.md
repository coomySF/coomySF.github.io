# Motion brief — 留下來的光

Purpose: 讀者看完記得 Coomy 做過什麼（Frontend → 人與 AI 的團隊 → 和水球打造 AllWill），也感覺到她在意的那件事：做過的事會留下來，變成下一次的起點。
Context: 部落格影片文章，film 版型（scroll 驅動；沿用 kids-ai-mister-film shell：scroll 進度 → 每 beat 的 q，`update(q)` 可 seek）
Personality: 安靜、溫暖、有重量（慢進場、長停留、沒有彈跳）
Display: viewBox 1200×600，桌機 1440×900 與手機 390×844；輸入 = scroll / ▶ 播放自動續播；one-shot，可 seek 重播
Duration: 9 beats，停留總和 16.6 viewport + 1 進場 viewport = 1760vh；自動播放約 60 秒

## Actors

- `ember` — 全片唯一主角（暖色光點：核心 r6 + 漸層光暈 r46）— 全域層，位置由每 beat 的 keyframe 決定；beat N 的終點 = beat N+1 的起點（shared element）
- `sky.star[0..7]` — 每拍結束時留下的星 — 全域底層；B7 調暗、B9 移到畫面中央連成星座
- `sky.link[0..8]` — 星座連線；最後一條（星 8 → 光點）是虛線，表示「下一次」
- 各 beat 場景群組 `scene[i]`：monitor / wireframe / team / door+note / leader+follower / two+rocket / cake+silhouettes / ship+crew / constellation

## Beat sheet（動作層）

| q（beat 內） | Beat | Focal actor | Action | Principle | Exit |
|---|---|---|---|---|---|
| .02–.20 / .18–.31 / .32–.45 | B1 | monitor → cursor → ember | 螢幕描線 → 游標閃兩下 → 光從游標浮出；鏡頭推近 | staging、slow in | 光點停在畫面中央 |
| .00–.22 / .24–.46 | B2 | wireframe → ember | 介面描出 → 光點依序掃過三張卡、落在按鈕，按鈕亮 | arcs、staging | 按鈕亮 |
| .02–.14 / .06–.24 / .14–.44 | B3 | team → ember | 隊伍線與成員進場 → 光沿線跑，經過誰誰亮 | stagger、follow-through | 七位全亮 |
| .05–.30 / .12–.24 / .30–.46 | B4 | team → door → ember | 燈一盞盞暗 → 門描出 → 光點穿門而出、地上留一張發光紙條 | timing（停頓） | 只剩紙條亮 |
| .06–.30 / .30–.36 / .34–.46 | B5 | leader → follower → spark | 指一步、走一步 ×3 → 箭頭散去 → 光分一顆給對方，對方亮起自己的光 | anticipation、staging | 兩顆光 |
| .04+k·.09（k=0..3） | B6 | idea → part → ember | 水球冒點子 → 點子飛到藍圖 → 火箭多一塊、我手上的光閃一下 | overlap、stagger | 火箭完成 |
| .02–.14 / .08–.16 / .14–.36 | B7 | cake → flame → silhouettes | 世界熄燈、蛋糕描出 → 光落成燭火 → 兩個剪影靠近；鏡頭推近 | staging、slow in | 燭火照兩張臉 |
| .00–.18 / .16–.40 / .40–.46 | B8 | ship → crew → sail | 船描出 → 五位船員一個個上船各帶一顆光 → 帆上浮出 AllWill；鏡頭由船尾橫移 | stagger、pan | 七顆光在船上 |
| .05–.30 / .30–.50 / .48–.56 | B9 | lights → stars → link | 船上的光升空、八顆星移到中央 → 星座連線 → 最後一條虛線接到光點 | arcs、settle | 星座靜止 |

## Motion tokens

- 時鐘：scroll 進度；每 beat 動作在 q ≤ .50 完成，文字 q .48–.58 進場，.90 後淡出（B9 不淡出）
- easing：整頁單一正弦家族——EIO（in-out）與 EO（out）
- stagger：.025–.09（依 beat）
- 鏡頭：zoom-in 到 0.36× 視窗（B1、B7）；pan ≤ 160 viewBox 單位（B2、B3、B8）
- 線寬三層：主線 1.5、次線 1、輔助 .75（@viewBox）

## Final-state contract

- B9 q=1：八顆星在 y 123–266 間成星座、連線全亮，虛線連到光點 (600,430)；船已淡出；key「把做過的事留下來」與回顧 8 行可讀

## Reduced motion

`prefers-reduced-motion: reduce` → `html.ab-static`：舞台隱藏，10 個里程碑以靜態清單堆疊（headline + 論點）。

## Risk windows

- B1 / B7 鏡頭推近時光點與畫面元素同一座標系，不可脫位
- beat 交界：光點全域層連續，場景交叉淡化不可跳格
- 描線起點：dash 起始 t=0 時元素 opacity 0，避免圓頭殘點
- B9 星點移動時連線端點跟著星點更新，不可留在舊位置
