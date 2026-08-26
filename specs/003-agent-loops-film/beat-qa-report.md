# Beat QA Report — 領導者的四種 Loop・動畫版本

- Beat sheet: `specs/003-agent-loops-film/beat-sheet.md`
- 截圖目錄: 未落檔（以 Chrome MCP 即時截圖判定；桌機 1280×800 兩輪、手機 390×844 一輪（同源 iframe 模擬）、reduced-motion 靜態版桌機 / 手機各一）
- 日期: 2026-08-26
- Commit: 見 `git log -1 -- specs/003-agent-loops-film/`（報告與貼文同一次提交）
- 測試環境: Jekyll 本機無法跑（系統 Ruby 2.6），改以 `render_preview.py` 拼 `_layouts/default.html` + `film.html` 產靜態預覽，`python3 -m http.server` 服務；Three.js 由 layout 的 importmap 自 CDN 載入。

| Beat | 標題可讀 1280×800 | 標題可讀 390×844 | 畫面對應論點 | 文字不壓關鍵區 | reduced-motion 可讀 | 判定 |
|---|---|---|---|---|---|---|
| B1 | PASS | PASS | PASS | PASS | PASS | PASS |
| B2 | PASS | PASS | PASS | PASS（第一輪 FAIL：牆頂碰到說明文字 → 牆高 2.6→2.0、整體相機抬高） | PASS | PASS |
| B3 | PASS | PASS | PASS | PASS | PASS | PASS |
| B4 | PASS | PASS | PASS | PASS | PASS | PASS |
| B5 | PASS | PASS | PASS | PASS | PASS | PASS |
| B6 | PASS | PASS | PASS（停留點為 cross-fade 後的「無邊界」狀態：一人縮成球、一人衝出） | PASS | PASS | PASS |
| B7 | PASS | PASS | PASS | PASS | PASS | PASS |
| B8 | PASS | PASS | PASS | PASS（第一輪 FAIL：卡片壓到說明文字、卡 1 被裁、卡 4 停留點還在翻 → 卡片下移、間距縮、翻面提前到 q≤0.68、旋鈕放大） | PASS | PASS |
| B9 | PASS | PASS | PASS（第一輪 FAIL：環 r 3.2 撐滿畫面、幽靈環干擾 → r 2.2、移除幽靈環；第二輪 FAIL：牆「沉到地下」但地板是透明 ShadowMaterial 仍露出 → 沉下後 `visible=false`） | PASS | PASS | PASS |
| B10 | PASS | PASS | PASS | PASS（第一輪 FAIL：回顧 4 行文字壓到環頂 → 環下移到 y −0.9、B10 說明字級縮到 clamp(13px,1.5vw,17px)，變 3 行） | PASS | PASS |

## 不通過項目
- 全部已修正並重驗通過。全域性修正兩項：
  - 相鄰房間露進畫面邊緣（B2/B3/B5/B10 都看得到隔壁 beat 的物件）→ `ROOM` 14→30、地板 PlaneGeometry 加寬到 360。
  - 直式手機畫面被裁（B1 只看到 5 人中的 3 人、B5 五根檢查點剩 3 根）→ `wideComp = max(1, 5.8 / (0.4663·aspect) / camZ)`，保證可見半寬 ≥ 5.8；桌機不受影響。
- 建置後首次載入 `ReferenceError: Cannot access 'ROOM' before initialization`（`boot()` 呼叫寫在 module 常數宣告之前）→ 呼叫移到常數之後。

## Recap 檢查
- Recap beat 列出全部標題: PASS（B10 說明逐字 = 「主管一直在選 Loop／要主動卻只給回合／一步一請示／給結果不只給責任／節奏是為了早看見／知道哪裡不必等／同一人不同 Loop／設計切換條件／先看 Loop 再看人」，桌機 3 行、手機 3 行、靜態版 1 段）

## 效能
- 首屏傳輸量: 0.47 MB（上限 4）— 文件 38 KB + three.module.js（CDN）+ 字型；`performance.getEntriesByType('resource')` 實測
- 桌機 fps: 未實測（QA 分頁在背景，`requestAnimationFrame` 停止、1.5 s 內 0 幀；依規則 4 不標 PASS）／手機 fps: 未實測
- 降級方案（已內建）: `max-width: 640px` 時 shadow map 2048→1024；DPR 上限 2；無粒子、無後製；`prefers-reduced-motion` 或無 WebGL 直接走靜態版不 boot
- 待辦: 部署後在真機前景開一次頁面量 fps（桌機 M 系列目標 60、手機目標 ≥ 30）
