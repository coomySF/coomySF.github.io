# 對應 spec: specs/001-voyage-blog/spec.md#user-story-4---文章上下架-priority-p4
# 詞彙對照（供翻譯層，不進 step）：隱藏標記=front matter hidden: true、書庫=/writing/、繼續閱讀導覽=.post-navigation
# Last updated: 2026-08-06

@feature-001-voyage-blog
Feature: 隱藏文章
  作者以隱藏標記將文章下架：列表與導覽不再顯示，但既有網址不斷鏈。

  Rule: 後置（狀態） - 系統應在文章加上隱藏標記後將其自首頁卡片移除

    @happy
    Scenario: 作者隱藏一篇文章
      Given 作者 "Coomy" 為文章 "不信任團隊的領導者，會親手製造一個更不值得信任的團隊" 加上隱藏標記
      When 站點重建完成
      Then 首頁卡片不應出現該篇文章
      And 其餘未隱藏文章維持正常顯示

  Rule: 後置（狀態） - 系統應在文章加上隱藏標記後將其自書庫列表移除

    @happy
    Scenario: 書庫不再列出被隱藏的文章
      Given 文章 "不信任團隊的領導者，會親手製造一個更不值得信任的團隊" 已被標記隱藏且站內另有 2 篇未隱藏文章
      When 訪客 "Visitor001" 開啟書庫
      Then 書庫列表應顯示 2 篇文章
      And 書庫顯示的總篇數應為 2

  Rule: 後置（狀態） - 系統應在繼續閱讀導覽中略過被隱藏的文章

    @happy
    Scenario: 相鄰文章被隱藏時導覽跳過它
      Given 訪客 "Visitor001" 正在閱讀 "主管嘴上要 ownership，卻只允許團隊用 Turn-Based Loop 工作"
      And 相鄰的 "不信任團隊的領導者，會親手製造一個更不值得信任的團隊" 已被標記隱藏
      When "Visitor001" 檢視文末的繼續閱讀導覽
      Then 導覽不應出現被隱藏的那一篇

  Rule: 後置（回應） - 系統應允許知道網址的訪客直接開啟被隱藏的文章

    @happy
    Scenario: 直連網址仍可閱讀
      Given 文章 "不信任團隊的領導者，會親手製造一個更不值得信任的團隊" 已被標記隱藏
      When 訪客 "Visitor004" 直接開啟該篇文章的網址
      Then 應顯示完整文章內頁且內文可讀

  Rule: 前置（參數） - 隱藏標記必須為布林值真才生效

    @boundary
    Scenario: 隱藏標記為布林值假時文章維持顯示
      Given 文章 "一個人帶 Agent 兩天做完 POC，四個人一起 Vibe，收四倍的爛攤子" 的隱藏標記為布林值假
      When 站點重建完成
      Then 該篇文章維持出現在首頁卡片與書庫列表
