# 對應 spec: specs/001-voyage-blog/spec.md#user-story-3---start-引導與聲音-priority-p3
# 詞彙對照（供翻譯層，不進 step）：開始按鈕=.scroll-hint、繼續捲動提示=.keep-scrolling、聲音開啟=SOUND · ON、聲音關閉=SOUND · OFF、靜音偏好=localStorage coomy-sound=off
# Last updated: 2026-08-06

@feature-001-voyage-blog
Feature: 啟動旅程
  訪客點擊開始按鈕後，鏡頭滑入旅程、聲音依偏好啟動，並獲得繼續捲動的引導。

  Rule: 後置（回應） - 系統應在訪客點擊開始按鈕後將畫面滑動至飛船登場幕

    @happy
    Scenario: 首次來訪的訪客點擊開始按鈕
      Given 訪客 "Visitor001" 停留在首頁開場畫面且捲動進度為 0%
      When "Visitor001" 點擊開始按鈕
      Then 畫面應在 2.4 秒內滑動至旅程進度 11.5% 的位置

  Rule: 後置（回應） - 系統應在滑行啟動 1.1 秒後顯示繼續捲動提示

    @happy
    Scenario: 滑行途中出現繼續捲動提示
      Given 訪客 "Visitor001" 於首頁點擊開始按鈕後經過 1.1 秒
      When 畫面滑行接近飛船登場幕
      Then 畫面下方應顯示繼續捲動提示

    @boundary
    Scenario: 訪客繼續往下捲動後提示淡出
      Given 繼續捲動提示已顯示且旅程進度為 11.5%
      When 訪客 "Visitor001" 繼續捲動至旅程進度 18%
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
      And 畫面仍應滑動至旅程進度 11.5% 的位置

  # TODO - 待 SBE
  Rule: 前置（參數） - 開始按鈕必須於標題畫面可見時才接受點擊
