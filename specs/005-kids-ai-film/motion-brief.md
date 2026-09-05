# Motion brief — AI 先生，你好！

Purpose: 3–6 歲小朋友（爸媽陪讀）看完能複述五件事：AI 是住在電腦裡會聽會想的朋友／有問題可以問它、想做東西可以叫它／要說清楚它才懂／它也會說錯，要問大人／秘密不能告訴它。
Context: explainer（scroll 驅動的 beat 動畫，沿用 specformula 貼文 shell：每 beat 一條 SVG.js Timeline，由 scroll 進度 seek）
Personality: 蹦跳（bouncy）、清楚（one read per beat）、溫和（soft settle，不嚇小孩）
Display: viewBox 1200×600，桌機 1280×800 與手機 390×844；輸入 = scroll / ▶ PLAY 自動播放；one-shot，可 seek 重播
Duration: 10 beats，停留總和 18.2 viewport + 1 進場 viewport = 1920vh；每 beat 的動作在 q ≤ 0.55 完成，之後畫面靜止供閱讀

## Actors

- `mister` — 主角 AI 先生（使用者自繪：玻璃罩頭寫 AI、兩顆紅眼（原稿獨眼，小朋友看不懂而改）、白襯衫黑領帶、黃褲棕鞋、叉腰）— 每 beat 的焦點；子群組：`mister.armL / armR`（肩膀為 pivot）、`mister.head`（眼睛四種情緒層：open / smile / flat / x、嘴、汗滴、摀眼的手）、`mister.slot`（玻璃罩內部，放書）
- `kid` — 小豆（圓頭、綠上衣、藍褲）— 提問者 / 反應者；子群組：`armL / armR`、`head`（笑 / 皺眉層）
- `mom` — 媽媽（長裙、髮髻）— 大人角色，只在 B7 / B8 / B9 出現
- `monitor` — 電腦螢幕 — AI 先生的家（B1 出場、B9 回家）
- `bubble.*` — 對話泡泡 — 問題 / 回答 / 指令的載體
- `props.*` — 書、餅乾、故事書、圖畫紙、紅狗、積木、城堡、鎖頭、卡片、太陽、球、徽章 — 各 beat 的證據物件

## Beat sheet（動作層，對應 specs/005-kids-ai-film/beat-sheet.md）

| q（beat 內進度） | Beat | Focal actor | Action | Principle | Exit condition |
|---|---|---|---|---|---|
| .02–.22 / .22–.32 / .34–.42 | B1 | mister | 從螢幕裡長大跳出（scale .42→.85 + 下落）→ 右手抬起揮手 → 紅眼眨成笑眼 | anticipation（先縮）、squash（落地）、follow-through（揮手在落地後） | 站在螢幕前叉腰＋揮手定格、笑眼 |
| .10–.50 / .50–.58 | B2 | mister.slot | 10 本書一本一本落進玻璃罩（stagger .04）→ 罩子閃一下 | staging（只有書在動）、stagger | 罩內滿書、小豆餅乾缺一口 |
| .05–.15 / .18–.32 / .35–.45 | B3 | bubble.q → mister.eye → bubble.a | 問題泡泡 pop → 紅眼瞳孔繞兩圈（在想）→ 回答泡泡 pop（太陽藍天） | arcs（瞳孔繞圈）、staging（pan 跟著焦點） | 兩個泡泡都在、瞳孔回中 |
| .08–.20 / .22–.32 / .30–.40 / .42–.56 | B4 | mister.arms → props | 雙臂從叉腰舉起 → 左手冒故事書、右手冒小狗畫 → 小豆跳起拍手 | anticipation（手先舉）、secondary action（小豆跳） | 雙臂張開、兩件作品在手上、小豆落地 |
| .05–.15 / .30–.40 / .40–.55 | B5 | row1 → row2 | 上排「畫」→ 問號＋扁眼；下排「畫一隻紅色的小狗」→ 紅狗 pop → 綠勾 pop | staging（兩排對比）、exaggeration（大勾） | 兩排都在、下排紅狗＋勾 |
| .12–.22 / .28–.38 / .46–.54（走）；.22–.28 / .38–.46 / .54–.62（做） | B6 | mister（walk）→ blocks | 走到 1 拿積木 → 走到 2 疊起來 → 走到 3 城堡完成插旗；編號圓依序點亮 | timing（走－停－做的節奏）、stagger | 站在 3 旁邊、城堡完成、三個編號全亮 |
| .05–.12 / .12–.20 / .22–.30 / .32–.48 / .50–.58 | B7 | mister → kid → mom | 「2+2=5」泡泡 → 紅眼變叉叉 → 小豆皺眉冒問號 → 媽媽走進來給「2+2=4 ✓」→ AI 眼睛恢復、冒汗 | staging（三個角色依序接棒） | 三角色都在、媽媽泡泡有勾、AI 冒汗 |
| .10–.20 / .12 / .24 / .36（各 +.08） | B8 | props.lock ×3 → mister.hands | 三張卡依序蓋上鎖頭（從上落下＋小回彈）→ AI 先生雙手摀眼、紅光暗掉 | timing（落下＋settle）、stagger | 三鎖都在、AI 摀眼 |
| .05–.30 / .15–.40 / .35–.45 | B9 | mister（in screen）→ kid（run）→ monitor dim | AI 在螢幕裡揮手 → 小豆往右跑向太陽／朋友／媽媽 → 螢幕變暗 | arcs（跑步上下起伏）、staging（焦點從左移到右） | 螢幕暗、小豆站在朋友旁邊 |
| .08 + i×.045（每個 .06） | B10 | badges ×9 | 九個徽章繞著 AI 先生依序 pop | stagger、staging（recap 靜止） | 九徽章全亮、AI 先生叉腰笑 |

## Motion tokens

- durations（以 beat 內 q 計）：fast .06 / base .10 / slow .20
- easing：整頁單一家族——正弦：enter `'>'`（EO）、travel / settle `'<>'`（EIO）；pop = scale .6→1 走 EO
- stagger：.04（書、徽章、鎖）
- overshoot：pop 不過衝（小孩版避免彈跳過度）；落地 squash ≤ 8%；跑步起伏 ≤ 10 px
- 鏡頭：zoom-in ≤ 0.85×（B1）、pan ≤ ±60 viewBox 單位（B3 / B5 / B6 / B8 / B9）

## Final-state contract（每 beat q = 1 前 8% 淡出；停留點 q ≈ .6 的靜止構圖）

- B1：螢幕在 (600,260)，AI 先生站前方 feet (600,565) s .85，右臂舉起，笑眼
- B2：小豆 (300,545) 餅乾缺口，AI 先生 (820,565) 罩內 10 本書
- B3：問題泡泡 (440,120)、回答泡泡 (930,110)，AI 先生 (900,565) 瞳孔置中
- B4：AI 先生 (600,565) 雙臂張開，故事書 (470,350)、小狗畫 (730,350)，小豆 (250,545) 落地
- B5：上排 y 265（問號、扁眼），下排 y 580（紅狗 (800,555)、綠勾 (960,500)）
- B6：AI 先生 (960,565) s .7，城堡 (1060) 完成插旗，編號 1/2/3 全亮
- B7：AI (360,565) 汗滴＋正常眼，小豆 (640,545) 皺眉，媽媽 (920,565)，兩個泡泡
- B8：三卡 (290/540/790, 260) 各一鎖，AI (1030,565) 摀眼，媽媽 (110,565)
- B9：螢幕 (210,280) 變暗，小豆 (720,545)，太陽 (1080,110)，朋友 (900/1000)，媽媽 (1130,565)
- B10：AI 先生 (600,570) 笑眼叉腰，九徽章半圓（中心 (600,330) R 270）全亮

## Reduced motion

`prefers-reduced-motion: reduce` → `html.ka-static`：舞台隱藏，十個 beat 以靜態清單堆疊（編號 + headline + 論點），內容一個不少。

## Risk windows

- B1 q .02–.22：AI 先生從螢幕內 scale 放大時不可被螢幕框遮住（先畫螢幕、後畫角色）
- B3 pan：問題泡泡左緣 (250) 在 viewBox x +40 時仍在畫面內
- B5 pan y ±25：上排泡泡頂 (55) 與下排影子 (590) 不可被裁掉
- B6 走路：AI 先生 (s .7，寬 ≈ 105) 與積木堆 (640/850/1060) 不重疊
- B8 手摀眼：手圓要蓋住整顆紅眼與光暈
- B10 徽章：最低的兩顆 (339,400)/(861,400) 不可壓到 AI 先生的頭（x 536–664）
