# Beat QA Report — 四個人一起 Vibe・SpecFormula 版本

- 貼文: `_posts/2026-08-27-ai-agents-team-integration-specformula.html`
- Beat sheet: `specs/004-agents-team-film/beat-sheet.md`
- 日期: 2026-08-27
- 視覺語域: `specformula`（同 `specs/003-agent-loops-film` 的 SpecFormula 版：希卡石板規則、掃描帶、Sf. 浮水印；機制與品牌實作 1:1 沿用，prefix `at-`）
- 判定方式: iframe 固定尺寸 1280×800 全 10 beat；390×844 抽 B1/B4/B8/B10；reduced-motion 靜態版手機

| Beat | 標題可讀 1280×800 | 標題可讀 390×844 | 畫面對應論點 | 文字不壓關鍵區 | reduced-motion 可讀 | 判定 |
|---|---|---|---|---|---|---|
| B1 | PASS | PASS | PASS | PASS | PASS | PASS |
| B2 | PASS | — | PASS | PASS | PASS | PASS |
| B3 | PASS | — | PASS（首輪：停留點只落了 3/4 批 diff → 序列提前到 q 0.55 完成） | PASS | PASS | PASS |
| B4 | PASS | PASS | PASS | PASS | PASS | PASS |
| B5 | PASS | — | PASS | PASS | PASS | PASS |
| B6 | PASS | — | PASS | PASS | PASS | PASS |
| B7 | PASS | — | PASS | PASS | PASS | PASS |
| B8 | PASS | PASS | PASS | PASS | PASS | PASS |
| B9 | PASS | — | PASS（首輪：停留點 03/04 還在過閘 → 序列提前到 q 0.55 完成） | PASS | PASS | PASS |
| B10 | PASS | PASS | PASS | PASS | PASS | PASS |

## 不通過項目
- B3 / B9 停留點序列未完成 → 已修，見上表。

## Recap 檢查
- Recap beat 列出全部標題: PASS（逐字 = beat-sheet 九條 headline）

## 效能
- 首屏傳輸量: 0.37 MB（上限 4）；fps 未實測（背景分頁）
