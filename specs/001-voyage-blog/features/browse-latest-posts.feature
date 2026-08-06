# 對應 spec: specs/001-voyage-blog/spec.md#user-story-1---閱讀文章-priority-p1
# 詞彙對照（供翻譯層，不進 step）：隱藏標記=front matter hidden: true、文章卡片=.post-card、編號浮水印=.post-card-index
# Last updated: 2026-08-06

@feature-001-voyage-blog
Feature: 瀏覽首頁最新文章
  首頁以純排版卡片列出最新的可見文章，作為進入閱讀的主要入口。

  Rule: 後置（回應） - 系統應在首頁依日期新至舊顯示至多 4 張可見文章卡片

    @happy
    Scenario: 站內文章少於 4 篇時全數顯示
      Given 站內有下列文章
        | 文章標題                                             | 發布日期       | 是否隱藏 |
        | 一個人帶 Agent 兩天做完 POC，四個人一起 Vibe，收四倍的爛攤子 | 2026-08-05 22:00 | 否       |
        | 主管嘴上要 ownership，卻只允許團隊用 Turn-Based Loop 工作  | 2026-08-05 21:00 | 否       |
        | 不信任團隊的領導者，會親手製造一個更不值得信任的團隊         | 2026-08-05 09:00 | 是       |
      When 訪客 "Visitor001" 瀏覽首頁
      Then 首頁應顯示 2 張文章卡片
      And 卡片依序為 "一個人帶 Agent 兩天做完 POC，四個人一起 Vibe，收四倍的爛攤子" 與 "主管嘴上要 ownership，卻只允許團隊用 Turn-Based Loop 工作"

    @boundary
    Scenario: 可見文章超過 4 篇時只顯示最新 4 篇
      Given 站內有 5 篇未隱藏的文章且發布日期各不相同
      When 訪客 "Visitor001" 瀏覽首頁
      Then 首頁應顯示 4 張文章卡片
      And 發布日期最舊的 1 篇沒有出現在首頁卡片

  Rule: 後置（回應） - 系統應在每張卡片顯示編號浮水印、日期、分類、標題與摘要

    @happy
    Scenario: 檢視單張卡片的內容
      Given 文章 "主管嘴上要 ownership，卻只允許團隊用 Turn-Based Loop 工作" 的發布日期為 2026-08-05 且分類為 "領導"
      When 訪客 "Visitor001" 檢視該篇的首頁卡片
      Then 卡片應顯示編號浮水印 "01"
      And 卡片應顯示日期 "2026.08.05" 與分類 "領導"
      And 卡片應顯示標題與最多 3 行的摘要

  Rule: 後置（回應） - 系統應在訪客點擊卡片後顯示該篇文章內頁

    @happy
    Scenario: 由卡片進入文章
      Given 首頁顯示 "主管嘴上要 ownership，卻只允許團隊用 Turn-Based Loop 工作" 的卡片
      When 訪客 "Visitor001" 點擊該張卡片
      Then 應顯示該篇文章內頁且標題為 "主管嘴上要 ownership，卻只允許團隊用 Turn-Based Loop 工作"

  Rule: 前置（狀態） - 文章必須未被標記隱藏才會出現在首頁卡片

    @failure
    Scenario: 被隱藏的文章不出現在首頁
      Given 文章 "不信任團隊的領導者，會親手製造一個更不值得信任的團隊" 被標記隱藏
      When 訪客 "Visitor001" 瀏覽首頁
      Then 該篇因被標記隱藏而沒有出現在首頁卡片
      And 其餘未隱藏文章維持正常顯示

  # TODO - 待 SBE
  Rule: 前置（參數） - 卡片數量上限必須為 4
