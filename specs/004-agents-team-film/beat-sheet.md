# Beat Sheet — 四個人一起 Vibe・SpecFormula 版本

- Preset: `knowledge`
- 觀眾: 帶團隊用 AI Agent 開發的工程主管 / 技術負責人；看完要能複述「多人各帶 Agent 為什麼會撞車、少做了哪一步、SpecFormula 用同一張圖 + 同一組 BDD 怎麼接住」。
- 視覺語域: `specformula`（依 specformula-vibe/DESIGN.md「希卡石板」：冷石近黑 hsl(237 2% 5%)、青綠 hsl(174 58% 57%) 是刻進去的光、橘色只給事故 / 風險、DM Serif Display 大標一個青綠關鍵詞 + DM Sans / Noto Sans TC 正文 + DM Mono 刻文、One Voice Rule、Stone Face Rule）
- 素材根目錄: `in-svg`
- 判定依據: 原文無截圖；證據畫面全部為自繪 SVG（依 preset 規則 5），`證據畫面` 欄填 SVG 場景 id。
- 來源: `_posts/2026-08-05-ai-agents-team-integration.md`（約 2,200 字 → 9 個論點 beat + 1 recap）
- Shell: 沿用 `_posts/2026-08-27-leadership-agent-loops-specformula.html` 的機制與品牌實作（prefix 改 `at-`）。

## B1 — 兩天做完 POC
- 論點: 一個人帶著 Agent，不到一兩天就把測試環境、網站、履歷生成跑起來。
- 證據畫面: `svg:solo-agent-two-days`
- 畫面說明: 一個開發者頭像 + 一個 Agent 節點（青綠點）並肩；右側三張石面卡「測試環境 / 網站 / 履歷生成」依序點亮打勾，底下 mono 計時 `DAY 01 → DAY 02`。
- 鏡頭: zoom-in（「看這裡」：從人與 Agent 收到三張卡，澄清「一個人就跑得起來」）
- 停留: 1.3

## B2 — 四個 Agent 撞車
- 論點: 四個人各自帶 Agent 改同一個專案後，原本沒處理好的問題全被放大。
- 證據畫面: `svg:four-agents-one-repo`
- 畫面說明: 四組「人 + Agent」從四個方向連線到中央同一個 REPO 石面卡；連線抵達時卡片邊緣出現四道互相重疊的 diff 色塊，重疊處轉橘。
- 鏡頭: static（狀態對比，畫面靜止）
- 停留: 1.4

## B3 — 每人都完成，產品失控
- 論點: 元件重複生成、越界改全域樣式、改 A 壞 B，review 只能猜範圍。
- 證據畫面: `svg:overlap-diffs`
- 畫面說明: 一張專案格狀圖（Component 方格）；四種 diff 依序落下，兩個相同的 Component 出現在不同位置、一塊 diff 溢出到 GLOBAL STYLE 欄、一條 A→B 的連線變橘斷掉；右側 REVIEW 標籤旁的問號計數上升。
- 鏡頭: pan（順序：四批 diff 依序落下，澄清「每個都完成，整體卻失控」）
- 停留: 1.6

## B4 — 共用 DB 被清掉
- 論點: 最扯的一次，Agent 把共用 DB 清掉，大家瞬間全部登不進去。
- 證據畫面: `svg:shared-db-wiped`
- 畫面說明: 中央一個 DB 圓柱，四條 session 線接上；一個 Agent 節點送出一道橘色指令，圓柱內容一格格清空變空框，四條線末端同時亮起橘色鎖頭與 `401`。
- 鏡頭: static（事故瞬間，畫面靜止）
- 停留: 1.3

## B5 — 邊界沒定義
- 論點: 沒先定義共用元件與 API 的修改邊界，Agent 各自找解、跨區改動。
- 證據畫面: `svg:four-step-chain`
- 畫面說明: 四張石面步驟卡橫向串起（01 沒定邊界 → 02 各自找解 → 03 跨區進同一批 diff → 04 review 重新理解），連線依序延伸、節點圓點依序亮起。
- 鏡頭: pan（順序：沿四張卡向右，澄清「問題是一步步發生的」）
- 停留: 1.6

## B6 — 實作變快，整合沒變快
- 論點: AI 縮短局部實作，需求理解、影響分析、整合驗證沒一起縮短，未知修改越積越多。
- 證據畫面: `svg:asymmetric-bars`
- 畫面說明: 四條水平長條「實作 / 需求理解 / 影響分析 / 整合驗證」；第一條收短成青綠短棒，其餘三條不動；右側一個 REVIEW QUEUE 計數框數字往上跳。
- 鏡頭: pan（順序：第一條先縮、再看其餘三條，澄清「只有一段變快」）
- 停留: 1.4

## B7 — 少做的一步：先寫清楚
- 論點: 要先寫清楚：這輪驗證什麼、影響哪些、誰負責哪段規格、什麼結果算完成。
- 證據畫面: `svg:four-questions-card`
- 畫面說明: 一張大石面規格卡，四行依序刻上（驗證假設 / 受影響範圍 / 分工 / 完成條件），每行前的青綠方框依序打勾；四個人與四個 Agent 節點的連線全部指向這一張卡。
- 鏡頭: zoom-in（「看這裡」：收到那張卡，澄清「所有人和 Agent 依照同一份內容」）
- 停留: 1.5

## B8 — 先看同一張圖
- 論點: SpecFormula 將 Flow、Feature、API、資料表連成一張圖。
- 證據畫面: `svg:one-diagram-shared`
- 畫面說明: 一張節點圖 Flow → Feature → API → Table 依序描線連起（青綠節點圓點），一道掃描帶掃過；四個開發者頭像在圖下方一字排開，視線連線都指向同一張圖。
- 鏡頭: zoom-in（「看這裡」：從四個人收到那張圖，澄清「同一張圖」）
- 停留: 1.6

## B9 — 同一組 BDD 驗收
- 論點: 行為寫成 Rule 與 Example，人與 Agent 用同組 BDD 驗收。
- 證據畫面: `svg:bdd-scenarios-gate`
- 畫面說明: 三張 Given / When / Then 石面卡疊成一組情境；四個實作方塊依序穿過同一道青綠驗收閘門，通過的打勾、一個被擋下轉橘退回。
- 鏡頭: pan（順序：四個方塊依序過閘，澄清「同一組驗收」）
- 停留: 1.6

## B10 — 回顧
- 論點: 兩天做完 POC／四個 Agent 撞車／每人都完成，產品失控／共用 DB 被清掉／邊界沒定義／實作變快，整合沒變快／少做的一步：先寫清楚／先看同一張圖／同一組 BDD 驗收
- 證據畫面: `svg:recap-spec-to-gate`
- 畫面說明: 左：同一張規格卡；中：同一張圖；右：同一道閘門，三者以青綠節點連成一線靜止；九個 headline 依序在下方排開。
- 鏡頭: static（回顧，畫面靜止）
- 停留: 2.0
