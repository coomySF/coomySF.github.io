# 對應 spec: specs/001-voyage-blog/spec.md#user-story-3---start-引導與聲音-priority-p3
# 詞彙對照（供翻譯層，不進 step）：開始按鈕=.scroll-hint、繼續捲動提示=.keep-scrolling、聲音開啟=SOUND · ON、聲音關閉=SOUND · OFF、靜音偏好=localStorage coomy-sound=off、放映進度條=.film-timeline、章節刻度=.ft-tick
# Last updated: 2026-08-09

@feature-001-voyage-blog
Feature: 啟動旅程
  訪客點擊開始按鈕後，鏡頭滑入旅程、聲音依偏好啟動，並獲得繼續捲動的引導；
  旅程全程有放映進度條，停滯時系統會再次提示捲動。

  Rule: 後置（回應） - 系統應在訪客點擊開始按鈕後將畫面滑動至飛船登場幕

    @happy
    Scenario: 首次來訪的訪客點擊開始按鈕
      Given 訪客 "Visitor001" 停留在首頁開場畫面且捲動進度為 0%
      When "Visitor001" 點擊開始按鈕
      Then 畫面應在 2.4 秒內滑動至旅程進度 9% 的位置

  Rule: 後置（回應） - 系統應在滑行啟動 1.1 秒後顯示繼續捲動提示

    @happy
    Scenario: 滑行途中出現繼續捲動提示
      Given 訪客 "Visitor001" 於首頁點擊開始按鈕後經過 1.1 秒
      When 畫面滑行接近飛船登場幕
      Then 畫面下方應顯示繼續捲動提示

    @boundary
    Scenario: 訪客繼續往下捲動後提示淡出
      Given 繼續捲動提示已顯示且旅程進度為 11.5%
      When 訪客 "Visitor001" 繼續捲動至旅程進度 15%
      Then 繼續捲動提示應淡出至不可見

  Rule: 後置（回應） - 系統應於旅程進行中在畫面底部顯示含章節刻度的放映進度條

    @happy
    Scenario: 旅程中看到放映進度
      Given 訪客 "Visitor001" 已捲動至旅程進度 30%
      When 旅程畫面更新
      Then 畫面底部應顯示放映進度條且填滿比例為 30%
      And 放映進度條上應顯示 6 個章節刻度

  Rule: 後置（回應） - 系統應在訪客旅程中途停止捲動 1 秒後重新顯示繼續捲動提示

    @happy
    Scenario: 中途停下的訪客收到繼續捲動提示
      Given 訪客 "Visitor001" 停留在旅程進度 30% 且超過 1 秒未捲動
      When 系統偵測到捲動停滯
      Then 畫面下方應重新顯示繼續捲動提示

    @boundary
    Scenario: 恢復捲動後提示淡出
      Given 繼續捲動提示因停滯而顯示
      When 訪客 "Visitor001" 恢復捲動
      Then 繼續捲動提示應淡出至不可見

  Rule: 後置（狀態） - 系統應在未靜音的訪客點擊開始按鈕後開啟聲音

    @happy
    Scenario: 未曾靜音的訪客由開始按鈕啟動聲音
      Given 訪客 "Visitor001" 未曾關閉聲音且聲音開關顯示為 "聲音關閉"
      When "Visitor001" 點擊開始按鈕
      Then 環境聲應開始播放
      And 聲音開關應顯示為 "聲音開啟"

  Rule: 前置（狀態） - 訪客必須未曾手動靜音才會於點擊開始按鈕時開聲

    @failure
    Scenario: 曾手動靜音的訪客點擊開始按鈕
      Given 訪客 "Visitor002" 曾手動關閉聲音且靜音偏好已被記住
      When "Visitor002" 點擊開始按鈕
      Then 聲音因訪客曾手動關閉而沒有開啟
      And 聲音開關維持顯示為 "聲音關閉"
      And 畫面仍應滑動至旅程進度 9% 的位置

  # TODO - 待 SBE
  Rule: 前置（參數） - 開始按鈕必須於標題畫面可見時才接受點擊
