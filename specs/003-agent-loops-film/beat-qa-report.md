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
