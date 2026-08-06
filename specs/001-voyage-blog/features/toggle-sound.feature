# 對應 spec: specs/001-voyage-blog/spec.md#user-story-3---start-引導與聲音-priority-p3
# 詞彙對照（供翻譯層，不進 step）：聲音開啟=SOUND · ON、聲音關閉=SOUND · OFF、偏好記為開啟=localStorage coomy-sound=on、偏好記為關閉=localStorage coomy-sound=off
# Last updated: 2026-08-06

@feature-001-voyage-blog
Feature: 切換聲音
  聲音開關永遠反映實際發聲狀態；訪客的靜音選擇跨造訪被記住。

  Rule: 後置（回應） - 系統應在頁面載入且尚無互動時顯示聲音為關閉

    @happy
    Scenario: 全新訪客載入首頁
      Given 訪客 "Visitor001" 首次造訪且沒有任何聲音偏好紀錄
      When "Visitor001" 載入首頁
      Then 聲音開關應顯示為 "聲音關閉"
      And 頁面不應發出任何聲音

  Rule: 後置（狀態） - 系統應在無聲狀態點擊聲音開關後開始發聲並記住偏好

    @happy
    Scenario: 訪客手動開啟聲音
      Given 訪客 "Visitor001" 的聲音開關顯示為 "聲音關閉"
      When "Visitor001" 點擊聲音開關
      Then 環境聲應開始播放
      And 聲音開關應顯示為 "聲音開啟"
      And 聲音偏好應被記為開啟

  Rule: 後置（狀態） - 系統應在發聲中點擊聲音開關後靜音並記住偏好

    @happy
    Scenario: 訪客手動關閉聲音
      Given 訪客 "Visitor001" 的聲音開關顯示為 "聲音開啟"且環境聲播放中
      When "Visitor001" 點擊聲音開關
      Then 環境聲應在 0.5 秒內淡出至無聲
      And 聲音開關應顯示為 "聲音關閉"
      And 聲音偏好應被記為關閉

  Rule: 前置（狀態） - 瀏覽器必須已發生過使用者手勢才實際發聲

    @failure
    Scenario: 尚無任何互動時系統不發聲
      Given 訪客 "Visitor003" 載入首頁後尚未點擊或按鍵
      When 頁面完成載入
      Then 聲音因瀏覽器尚未收到使用者手勢而沒有播放
      And 聲音開關維持顯示為 "聲音關閉"

  # TODO - 待 SBE
  Rule: 前置（參數） - 聲音偏好值必須為開啟或關閉之一
