# 對應 spec: specs/001-voyage-blog/spec.md#user-story-2---首頁救援旅程-priority-p2
# 詞彙對照（供翻譯層，不進 step）：旅程進度=ScrollTrigger progress、站名標籤=.planet-label、產品字樣=.sf-word、靜態版面=html.film-static、野生 AI=makeWildAI、寵物=makePet、黑邊=.letterbox、FIN 字卡=.fin-mark
# Last updated: 2026-08-08

@feature-001-voyage-blog
Feature: 捲動觀看救援旅程
  捲動是唯一的播放器：三站追逐與逃生、AI 群跳船、超進化與馴化、牽寵下船，
  以及尾聲三拍——鏡頭環繞、火箭凱旋飛越與煙火、黑邊聚光收場。

  Rule: 後置（回應） - 系統應在各站區間將站名顯示於星球中央

    @happy
    Scenario Outline: 捲動至各站看到站名
      Given 訪客 "Visitor001" 的瀏覽器支援 3D 繪圖
      When "Visitor001" 捲動至旅程進度 <旅程進度>
      Then 畫面應顯示站名 "<站名>" 於該站星球中央

      Examples:
        | 旅程進度 | 站名 |
        | 16%      | RD   |
        | 29%      | PM   |
        | 42%      | QA   |
        | 54%      | AI   |

  Rule: 後置（回應） - 系統應在乘客站呈現野生 AI 追逐且火箭抵達時乘客躍船逃生

    @happy
    Scenario Outline: 各站的追逐與逃生
      Given 訪客 "Visitor001" 捲動至 "<站名>" 站的停靠區間
      When 星球表面的追逐進行中
      Then 乘客 "<乘客造型>" 應在前方奔逃且一隻尖刺狀野生 AI 緊追在後
      And 火箭靠近時該乘客應躍入火箭
      And 野生 AI 應留在星球上原地顫抖

      Examples:
        | 站名 | 乘客造型       |
        | RD   | 戴眼鏡的小人   |
        | PM   | 打領帶的小人   |
        | QA   | 持放大鏡的小人 |

  Rule: 後置（回應） - 系統應在 AI 星球區間讓 4 隻野生 AI 依序躍上船身攀附

    @happy
    Scenario: 野生 AI 群跳船
      Given 訪客 "Visitor001" 捲動至旅程進度 54%
      When 野生 AI 群發現火箭
      Then 4 隻尖刺狀野生 AI 應依序躍向船身
      And 抵達後應攀附於船身四個位置並持續抖動

  Rule: 後置（回應） - 系統應在 SpecFormula 彗星射入後讓火箭超進化並馴化野生 AI

    @happy
    Scenario: 超進化與馴化
      Given 4 隻野生 AI 已攀附於船身
      When 訪客 "Visitor001" 捲動至旅程進度 69%
      Then 一道彗星應自畫面外射入火箭
      And 火箭應展開大翼與光環並轉為彩虹色
      And 續捲至旅程進度 72% 時船身上的野生 AI 應逐隻變成圓眼可愛寵物

  Rule: 後置（回應） - 系統應在終幕呈現產品字樣與牽寵下船

    @happy
    Scenario: 牽著寵物下船
      Given 馴化已完成
      When 訪客 "Visitor001" 捲動至旅程進度 76%
      Then 畫面應顯示產品字樣 "SpecFormula"
      And 3 位乘客應各以一條有垂墜弧度的牽繩牽著 1 隻寵物站於畫面下方
      And 第 4 隻寵物應在旁自由蹦跳

  Rule: 後置（回應） - 系統應在牽寵下船後依序播放環繞、凱旋與電影感收尾

    @happy
    Scenario: 尾聲三拍
      Given 訪客 "Visitor001" 已看到牽寵下船完成
      When "Visitor001" 續捲至旅程進度 82%
      Then 鏡頭應環繞全員半圈再回正且全員同步蹦跳
      And 續捲至旅程進度 89% 時火箭應飛越畫面拖曳光尾且 3 發彩色煙火依序綻放
      And 續捲至旅程進度 96% 時畫面上下應夾入黑邊且一道聚光應打在全員身上
      And 產品字樣應被一道光澤掃過
      And 續捲至旅程進度 99% 時畫面下方應顯示 "FIN" 字卡

  Rule: 前置（狀態） - 瀏覽器必須支援 3D 繪圖才播放旅程動畫

    @failure
    Scenario: 不支援 3D 繪圖的瀏覽器看到靜態版面
      Given 訪客 "Visitor003" 的瀏覽器不支援 3D 繪圖
      When "Visitor003" 瀏覽首頁
      Then 旅程動畫因瀏覽器不支援 3D 繪圖而沒有播放
      And 首頁維持以靜態版面顯示標題、副標與文章卡片

  # TODO - 待 SBE
  Rule: 前置（參數） - 旅程進度必須介於 0% 與 100% 之間
