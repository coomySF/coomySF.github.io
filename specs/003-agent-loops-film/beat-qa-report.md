# Beat QA Report — 領導者的四種 Loop・動畫版本（v2 editorial 線稿）

- Beat sheet: `specs/003-agent-loops-film/beat-sheet.md`（v2）
- 截圖目錄: 未落檔（Chrome MCP 即時截圖判定；桌機 1280×800、手機 390×844 各一輪，皆以同源 iframe + CSS `zoom` 固定尺寸；reduced-motion 靜態版手機一輪）
- 日期: 2026-08-26
- Commit: 見 `git log -1 -- specs/003-agent-loops-film/`
- 版本說明: v1（粉彩 Three.js）使用者回饋「太兒童」→ v2 改為 editorial 視覺語域：深墨綠底、Noto Serif TC 大標、SVG 單線線稿描線、銅色 accent；SVG.js 3.2.4 Timeline 依 scroll 進度 seek，無 Three.js。
- 測試環境: Jekyll 本機無法跑（Ruby 2.6），以 `render_preview.py` 拼 layout 產靜態預覽 + `python3 -m http.server`；svg.js 由 jsDelivr 載入。

| Beat | 標題可讀 1280×800 | 標題可讀 390×844 | 畫面對應論點 | 文字不壓關鍵區 | reduced-motion 可讀 | 判定 |
|---|---|---|---|---|---|---|
| B1 | PASS | PASS | PASS（第一輪：第四環在停留點未畫完 → 描線提前至 q 0.445） | PASS | PASS | PASS |
| B2 | PASS | PASS | PASS | PASS | PASS | PASS |
| B3 | PASS | PASS | PASS | PASS | PASS | PASS |
| B4 | PASS | PASS | PASS（第二輪：第五個方框「回看時機」停留點未畫完 → 序列提前至 q 0.55 完成） | PASS | PASS | PASS |
| B5 | PASS | PASS | PASS（第一輪：pan 0→200 裁到「警戒線」→ 限 0→100） | PASS | PASS | PASS |
| B6 | PASS | PASS | PASS（第一輪：cross-fade 後畫面近乎空白 → 保留 25% 軌跡 + 衝出直線） | PASS | PASS | PASS |
| B7 | PASS | PASS | PASS | PASS | PASS | PASS |
| B8 | PASS | PASS | PASS（第二輪：刻度盤「目標」標籤掉出 viewBox → 盤心 (600,400) R 170） | PASS | PASS | PASS |
| B9 | PASS | PASS | PASS（第一輪：zoom 裁到環；第二輪：環 r 280 仍被裁、標籤壓環線 → r 200、標籤移到 y 560） | PASS | PASS | PASS |
| B10 | PASS | PASS | PASS | PASS | PASS | PASS |

## 不通過項目
- 全部已修正並重驗通過。全域性修正一項：第一輪所有場景都畫在 viewBox 底部 1/4、標籤 11px、線 1.5px → 場景重構成填滿 viewBox（y 40–560）、標籤 22–24px、線 2.5/3.5px、`#al2-svg` 改 `top: 40vh; height: 56vh; xMidYMin meet`。

## Recap 檢查
- Recap beat 列出全部標題: PASS（桌機 3 行、手機 3 行、靜態版 1 段；逐字 = beat-sheet 九條 headline）

## 效能
- 首屏傳輸量: 0.28 MB（上限 4）— 文件 31 KB + svg.js ESM + 字型；`performance.getEntriesByType('resource')` 實測
- 桌機 fps: 未實測（QA 分頁在背景，rAF 停止；依規則 4 不標 PASS）／手機 fps: 未實測。純 SVG 描線 + viewBox 動畫，負載遠低於 v1 的 WebGL。
- 降級: `prefers-reduced-motion` 或 SVG.js 載入失敗 → `html.al2-static` 靜態十段
- 待辦: 部署後真機前景量一次 fps

---

# Beat QA Report — 領導者的四種 Loop・圖表版本（corporate）

- 貼文: `_posts/2026-08-27-leadership-agent-loops-diagram.html`（與 editorial 版並列，同 10 beat、同論點）
- Beat sheet: `specs/003-agent-loops-film/beat-sheet-corporate.md`
- 日期: 2026-08-27
- 視覺語域: `corporate`——米白底 `#f4f1ea`、40px 淡格線、填色幾何色塊 + 1px 邊框、org-chart 頭像、↻ loop 節點、Plex Mono 大寫標籤 / 無襯線中文；動效只有位移、淡入、線段延伸；zoom ≤ 0.85×、pan ≤ 80。
- 判定方式: 同 editorial 版（iframe 固定尺寸 1280×800 / 390×844，`__al3Seek` 跳停留點）

| Beat | 標題可讀 1280×800 | 標題可讀 390×844 | 畫面對應論點 | 文字不壓關鍵區 | reduced-motion 可讀 | 判定 |
|---|---|---|---|---|---|---|
| B1 | PASS | PASS | PASS | PASS | PASS | PASS |
| B2 | PASS | PASS | PASS | PASS | PASS | PASS |
| B3 | PASS | PASS | PASS | PASS | PASS | PASS |
| B4 | PASS | PASS | PASS | PASS（首輪：頭像壓到 GOAL 卡 → 走位提前一階停下） | PASS | PASS |
| B5 | PASS | PASS | PASS | PASS | PASS | PASS |
| B6 | PASS | PASS | PASS | PASS | PASS | PASS |
| B7 | PASS | PASS | PASS | PASS | PASS | PASS |
| B8 | PASS | PASS | PASS | PASS | PASS | PASS |
| B9 | PASS | PASS | PASS | PASS | PASS | PASS |
| B10 | PASS | PASS | PASS | PASS | PASS | PASS |

## 不通過項目
- 首輪：格線只鋪在 SVG 區，舞台上下兩帶 → 格線改為 `.al3-stage` 的 CSS background，整個舞台一致。

## Recap 檢查
- Recap beat 列出全部標題: PASS（逐字 = beat-sheet 九條 headline）

## 效能
- 首屏傳輸量: 0.28 MB（上限 4）
- fps: 未實測（背景分頁）；純 SVG 位移 / 淡入

---

# Beat QA Report — 領導者的四種 Loop・發表會版本（keynote）

- 貼文: `_posts/2026-08-27-leadership-agent-loops-keynote.html`（第三種風格，同 10 beat、同論點）
- Beat sheet: `specs/003-agent-loops-film/beat-sheet-keynote.md`
- 日期: 2026-08-27
- 視覺語域: `keynote`——深藍黑固定漸層、假玻璃卡片（7% 白填色 + 22% 白邊 + 45% 白頂高光，無 blur filter）、單一柔光只跟著焦點元素（`--sx/--sy` 每 beat 設定）、12 顆固定位置遠景點微視差、動效只有位移 / 淡入 / 縮放 .96→1；唯一 wall-clock 動作是 B2 虛線卡呼吸。
- 判定方式: 同前兩版（iframe 1280×800 全 10 beat；390×844 抽 B1/B4/B8/B10；靜態版手機）

| Beat | 標題可讀 1280×800 | 標題可讀 390×844 | 畫面對應論點 | 文字不壓關鍵區 | reduced-motion 可讀 | 判定 |
|---|---|---|---|---|---|---|
| B1–B10 | PASS | PASS（抽驗 B1/B4/B8/B10） | PASS | PASS | PASS | PASS |

## 不通過項目
- 無。B4 團員頭像在停留點貼著第五張卡右緣但不蓋字，判 PASS。

## Recap 檢查
- Recap beat 列出全部標題: PASS

## 效能
- 首屏傳輸量: 0.28 MB（上限 4）；fps 未實測（背景分頁）

---

# Beat QA Report — 領導者的四種 Loop・SpecFormula 版本

- 貼文: `_posts/2026-08-27-leadership-agent-loops-specformula.html`（第四種風格，同 10 beat、同論點）
- Beat sheet: `specs/003-agent-loops-film/beat-sheet-specformula.md`
- 日期: 2026-08-27
- 視覺語域: `specformula`——依 `specformula-vibe/DESIGN.md`「希卡石板」：冷石近黑（色相 237）、青綠 hsl(174 58% 57%) 只作刻進去的光（掃描帶 + 節點圓點 + 焦點卡邊光）、橘色只給 INCIDENT / RISK / Turn 邊條、One Voice Rule（青綠 < 一成）、Stone Face Rule（面是平的，無漸層 / 格線 / 玻璃 / 陰影）、Inscription Rule（DM Mono 大寫只給 eyebrow / tag）、DM Serif Display 大標一個青綠關鍵詞、右下 Sf. 浮水印。
- 判定方式: 同前（iframe 1280×800 全 10 beat；390×844 抽 B1/B8/B10；靜態版手機）

| Beat | 標題可讀 1280×800 | 標題可讀 390×844 | 畫面對應論點 | 文字不壓關鍵區 | reduced-motion 可讀 | 判定 |
|---|---|---|---|---|---|---|
| B1–B10 | PASS | PASS（抽驗） | PASS | PASS | PASS | PASS |

## 不通過項目
- 首輪：掃描帶的「停駐邊光」套在整個焦點 bbox，B4 / B6 出現莫名青綠外框 → 邊光只留在卡片類元素（B1/B2/B7/B8/B9/B10），B3–B6 只掃不停駐。已重驗通過。

## Recap 檢查
- Recap beat 列出全部標題: PASS

## 效能
- 首屏傳輸量: 0.37 MB（上限 4；多載 DM Sans / DM Mono / DM Serif Display）；fps 未實測（背景分頁）
