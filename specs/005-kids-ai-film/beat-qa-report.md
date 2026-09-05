# Beat QA Report — AI 先生，你好！

- 貼文: `_posts/2026-09-05-kids-ai-mister-film.html`
- Beat sheet: `specs/005-kids-ai-film/beat-sheet.md`
- Motion brief: `specs/005-kids-ai-film/motion-brief.md`
- 日期: 2026-09-05
- Commit: 見本檔所在 commit（與貼文同一筆）
- 視覺語域: `playful`（奶油底、粗黑描邊、平塗；主角 AI 先生依使用者自繪娃娃：玻璃罩頭寫 AI、兩顆紅眼（原稿獨眼，小朋友看不懂而改）、白襯衫黑領帶、黃褲棕鞋、叉腰）
- 判定方式: 本機無 Jekyll，改以去 layout 的獨立預覽檔（scratchpad `kids.html`，僅關閉自動播放以便 seek）經 `python -m http.server` 在 Chrome 驗；1280×800 視窗直接看全 10 beat 停留點；390×844 用固定尺寸 iframe 抽 B1/B4/B8/B10；reduced-motion 用 `reduced = true` 強制版看靜態清單；風險窗另截 B1 q.12（跳出螢幕）、B6 q.33（走路）、B8 q.30（鎖落下 / 摀眼）、B9 q.28（跑步）四張

| Beat | 標題可讀 1280×800 | 標題可讀 390×844 | 畫面對應論點 | 文字不壓關鍵區 | reduced-motion 可讀 | 判定 |
|---|---|---|---|---|---|---|
| B1 | PASS | PASS | PASS（首輪：揮手的右臂被頭遮住 → 手臂在頭層之下，改揮手角度 -150° → -95° 讓手伸出頭的輪廓外） | PASS | PASS | PASS |
| B2 | PASS | — | PASS（首輪：罩內的書被玻璃與 AI 字壓到看不清 → 書加寬 62→68、玻璃不透明度 .72→.55） | PASS | PASS | PASS |
| B3 | PASS | — | PASS | PASS | PASS | PASS |
| B4 | PASS | PASS | PASS | PASS（首輪：headline 在 26em 容器內折成「叫／我」→ 容器 max-width 改 960px、`.ka-hi` nowrap） | PASS | PASS |
| B5 | PASS | — | PASS | PASS（首輪：上排 AI 先生的頭與問號頂到 caption → 上排整體下移 28、SVG 起點 38vh→40vh、pan y ±25→±15） | PASS | PASS |
| B6 | PASS | — | PASS（首輪：走路時 AI 先生被積木堆蓋住 → `m.p.front()`；站位 960→930 避開城堡） | PASS | PASS | PASS |
| B7 | PASS | — | PASS | PASS | PASS | PASS |
| B8 | PASS | PASS | PASS（首輪：鎖頭蓋住卡片內容、紅眼從兩隻手中間露出 → 鎖移到卡片右上角 s .95、手改成橢圓＋兩圓完全蓋住眼與光暈） | PASS | PASS | PASS |
| B9 | PASS | — | PASS（首輪：螢幕變暗後 AI 先生完全消失 → 保留 45% 不透明度的剪影） | PASS | PASS | PASS |
| B10 | PASS | PASS | PASS | PASS | PASS | PASS |

## 不通過項目
- B1 / B2 / B4 / B5 / B6 / B8 / B9 首輪各一項 → 全部已修，見上表；第二輪 10/10 PASS。
- 第三輪（使用者回饋：小朋友看不懂獨眼 → 改成兩顆眼睛）：重驗 B1 q.12 張眼 / B1 q.6 笑眼 / B5 扁眼 / B7 恢復＋汗滴 / B8 摀眼，五個表情層皆成對且手完全蓋住兩眼 → PASS。
- 第四輪（使用者回饋：B8 摀眼「畫的怪怪的」→ 手是憑空貼在臉上的兩坨、手臂藏在頭後）：改成兩條手臂從肩膀沿頭側舉起、手掌帶指縫蓋住眼睛，原叉腰手臂淡出；重驗 B8 q.62 停留點與 q.15 轉場 → PASS。

## Recap 檢查
- Recap beat 列出全部標題: PASS（逐字 = beat-sheet 九條 headline；1280×800 兩行、390×844 四行皆完整）

## 風險窗（frame QA）
- B1 q.12：AI 先生從螢幕內放大跳出，畫在螢幕之上、無遮擋 → PASS
- B6 q.33：走路起伏 ≤ 8、經過積木堆時在堆之前 → PASS
- B8 q.30：兩把鎖已落定、第三把在半空；手已蓋住眼睛 → PASS
- B9 q.28：小豆跑步手臂擺動、螢幕內 AI 先生揮手 → PASS
- 最終構圖：每 beat 停留點與 motion-brief §Final-state contract 一致 → PASS

## 效能
- 首屏傳輸量: 0.19 MB（HTML 45 KB + svg.js 100 KB + Google Fonts CSS 49 KB；字型檔另計，上限 4）
- fps 未實測（背景分頁；十個 beat 皆為純 SVG 幾何、無濾鏡）

## Console
- 無錯誤、無例外（Chrome console 於載入與 10 次 seek 期間）
