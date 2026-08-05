---
layout: post
title: 一個人帶 Agent 兩天做完 POC，四個人一起開發卻開始互相撞車
description: 從 Automation Team 的多人 AI 開發失控現場，重新思考 Agent 時代的需求、分工與 BDD 驗收。
date: 2026-08-05 22:00:00 +0800
tags: [AI, Agent, 團隊, 軟體開發]
seo:
  type: BlogPosting
---

我以前帶 Automation Team 做 AI 履歷產品時，團隊透過人與 AI 協作，不到一兩天就把測試環境、基本網站和履歷生成功能跑起來了。

AI 在 POC 前期確實很好用。問題出現在四個人各自帶著 Agent，一起修改同一個專案之後。

## 每個人都完成了，產品卻開始失控

我們有指定每個人負責的區域，但 Agent 實際修改的範圍有隨機性。團隊很快遇到幾種情況：

- 功能相近的 Component 被重複生成，再放到不同位置。
- 只要求修改一個 Component，Agent 卻同時修改 global style 或其他功能。
- 有人完成後才發現相同功能已被另一組實作，不知道該保留、覆蓋還是重做。
- 前端改 A 壞 B，往下檢查又碰到回傳不穩定的 API。
- Review 的時間開始花在理解 Agent 的修改範圍，而不只是檢查實作品質。

最扯的一次，Agent 把共用 DB 清掉，大家瞬間全部登不進去。乾，真的會遇到這種事。

我後來把這幾個問題放在一起看，它們其實是這樣一路發生的：

1. 團隊把需求切成 task，卻沒有先定義共用 Component、API 與狀態的修改邊界。
2. 每個 Agent 依自己的上下文尋找解法，修改範圍可能超出原本分配的 task。
3. 多位開發者各自帶著 Agent 同時產出後，重複實作與跨區修改會進入同一批 diff。
4. 團隊必須在 review 階段重新理解依賴、處理衝突，再確認其他流程有沒有被改壞。

一個人盯一個 Agent 時，至少還掌握局部的設計脈絡，也知道哪些結果已經正確。我們不敢把「再生成一次」當成穩定的修正方式，因為第二次輸出無法預期，原本正確的部分也可能被改壞。

四個人各自帶著 Agent 一起開發後，這些判斷分散在四個人的腦中。每個 task 都完成，不代表整體功能可以直接整合。

## AI 加速了實作，也放大了協作成本

當時產品端持續測試不同的付費路徑：先讓使用者看到履歷分數，還是先看到一部分生成內容？按鈕文案和顏色怎麼改，使用者比較願意點？一天可能有三個變更進來。

每個變更都不大，但四個人帶著各自的 Agent，仍然主要靠 task 分工。每個人各自理解需求、修改自己的部分，再一起處理重複 Component、修改衝突、前端回歸與不穩定的 API。

因此，AI 縮短了局部實作時間，需求理解、影響分析與整合驗證卻沒有一起縮短。變更進得越快，review 與整合要處理的未知修改就越多。

現在回頭來看這件事，我們當時少做了一步：先把下面幾件事寫清楚，讓所有人和 Agent 都依照同一份內容工作。

- 這輪要驗證哪個需求或商業假設。
- 哪些 flow、feature、API、資料與外部依賴可能受影響。
- 每位開發者與 Agent 負責哪一段規格。
- 哪些可觀察結果通過，才算完成。

## 如果當時有 Specformula

我在 Automation Team 時已經開始理解 SDD，但還沒有真正導入團隊就離開了。後來開發 Specformula、實際使用 SDD 與 BDD，我才把當時的問題整理成一套可操作的流程。

我自己很喜歡的一點是，這些規格不只留在文字裡。Specformula 會把 Activity Flow、Feature、API 與資料表之間的關係視覺化，讓使用者先從圖上看懂功能怎麼走、規格怎麼串，再回到對應規格看實作設計。多人與 Agent 一起開發時，大家可以先看同一張圖，不必各自讀完文件後再在腦中拼出整套系統。

例如這輪要測 CTA 文案，Agent 收到的不只有一句「幫我改按鈕」。Specformula 會先保留完整需求，對齊可能受影響的 flow、feature、API、資料模型與外部依賴，再把工作分到對應的規格階段。

接著，團隊把預期行為寫成具體的 Rule 與 Example：

- 使用者處於哪種登入狀態。
- 使用者會看到哪一版文案。
- 點擊後要送出什麼事件。
- 原有登入與付費流程要維持什麼結果。

Agent 完成實作後，不同開發者與 Agent 使用同一組 BDD 情境驗收。這讓「需求怎麼理解」與「什麼叫做完成」都有共同依據，不需要等到整合時再互相猜測。

這套流程逐點對應前面的問題：

- 需求被各自解讀：讓所有人依照同一份需求，並先確認這次變更會影響哪些部分。
- 不知道哪些規格會受影響：先分析 flow、feature、API、資料與外部依賴。
- 每組完成定義不同：用 Rule、Example 與 BDD 統一驗收條件。
- 新變更進來後舊規格失效：標出哪些規格需要重新確認，避免不同團隊繼續依照過期內容開發。

我接下來也想把系統分析延伸到前端：找出 CTA 依賴的 theme token、登入狀態、計費事件與共用 Component，再把可修改與唯讀依賴寫成 Agent 能遵守的開發邊界。

企業採用 AI 的速度，也讓我更在意這個問題會不會很快變成更多團隊的日常。OpenAI 的 2025 企業資料顯示，Enterprise 訊息量一年約增至 8 倍，Custom GPTs 與 Projects 的每週使用者年內約增至 19 倍；Microsoft 2026 Work Trend Index 也發現，AI 使用較成熟的人更常回報團隊已把 Agent workflow、人與 Agent 的交接，以及品質標準寫成可重複流程。[OpenAI enterprise report](https://openai.com/business/guides-and-resources/the-state-of-enterprise-ai-2025-report/)／[Microsoft Work Trend Index](https://www.microsoft.com/en-us/worklab/work-trend-index/agents-human-agency-and-the-opportunity-for-every-organization)

Agent workflow 用得越多，團隊接著就要回答一個問題：誰來負責需求理解、跨職能整合與落地？從公開職缺來看，企業已經開始把這些責任放進正式角色。OpenAI 的 [FDE](https://openai.com/careers/forward-deployed-engineer-%28fde%29-seattle-seattle/) 從需求探索、技術範圍一路負責到 production adoption 和 eval feedback；AWS Taiwan 的 [Professional Services](https://amazon.jobs/en/jobs/10471889/engagement-manager-professional-services-taiwan) 則同時負責商業結果、跨職能交付、風險與客戶採用。

把採用數據和職缺放在一起看，我目前只敢確認一件事：企業正在把 Agent 協作從個人工具使用，推進成需要團隊流程與正式分工的工作。這不能替 Specformula 證明產品成效，但能確認我們想解決的協作問題，已經出現在企業的工作流程與職位設計裡。

目前 Specformula 仍是我正在開發、需要放進真實多人專案驗證的解法。

但如果回到那個四個人各自帶著 Agent 一起撞車的現場，我一定會用它。

因為當多人 Vibe 變得更普遍，我們不只需要更強的 Agent，也需要工具幫團隊更快建立新的分工、整合與驗證方式。

AI 時代真正難的，已經不只是把每一件事做得更快，而是讓一群人和一群 Agent 在快速前進時，仍然知道自己正在一起完成什麼。
