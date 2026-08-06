# 對應 spec: specs/001-voyage-blog/spec.md#user-story-2---首頁航行旅程-priority-p2
# 詞彙對照（供翻譯層，不進 step）：旅程進度=ScrollTrigger progress、站名標籤=.planet-label、產品字樣=.sf-word、靜態版面=html.film-static
# Last updated: 2026-08-06

@feature-001-voyage-blog
Feature: 捲動觀看旅程
  捲動是唯一的播放器：旅程隨捲動進度依序呈現四站接人與終幕。

  Rule: 後置（回應） - 系統應在各站區間將站名顯示於星球中央

    @happy
    Scenario Outline: 捲動至各站看到站名
      Given 訪客 "Visitor001" 的瀏覽器支援 3D 繪圖
      When "Visitor001" 捲動至旅程進度 <旅程進度>
      Then 畫面應顯示站名 "<站名>" 於該站星球中央

      Examples:
        | 旅程進度 | 站名 |
        | 21%      | RD   |
        | 39%      | PM   |
        | 57%      | QA   |
        | 76%      | AI   |

  Rule: 後置（回應） - 系統應在每站讓該站乘客自星球飛入飛船

    @happy
    Scenario Outline: 各站乘客的辨識造型
      Given 訪客 "Visitor001" 捲動至 "<站名>" 站的接人區間
      When 乘客自星球表面升起
      Then 乘客造型應為 "<乘客造型>" 且身體顏色為 "<身體顏色>"
      And 乘客抵達飛船時飛船應閃光一次

      Examples:
        | 站名 | 乘客造型       | 身體顏色 |
        | RD   | 戴眼鏡的小人   | 藍色     |
        | PM   | 打領帶的小人   | 綠色     |
        | QA   | 持放大鏡的小人 | 金色     |
        | AI   | 雙觸角小怪物   | 橘紅色   |

  Rule: 後置（回應） - 系統應在終幕顯示產品字樣與群舞

    @happy
    Scenario: 捲動至終幕
      Given 訪客 "Visitor001" 已看完 4 站接人
      When "Visitor001" 捲動至旅程進度 94%
      Then 畫面中央應顯示產品字樣 "SpecFormula"
      And 飛船應以彩色閃爍
      And 4 位乘客應在飛船前方跳舞

  Rule: 前置（狀態） - 瀏覽器必須支援 3D 繪圖才播放旅程動畫

    @failure
    Scenario: 不支援 3D 繪圖的瀏覽器看到靜態版面
      Given 訪客 "Visitor003" 的瀏覽器不支援 3D 繪圖
      When "Visitor003" 瀏覽首頁
      Then 旅程動畫因瀏覽器不支援 3D 繪圖而沒有播放
      And 首頁維持以靜態版面顯示標題、副標與文章卡片

  # TODO - 待 SBE
  Rule: 前置（參數） - 旅程進度必須介於 0% 與 100% 之間
