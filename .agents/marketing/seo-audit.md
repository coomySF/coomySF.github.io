# coomysf.github.io 新版 SEO + AI SEO 稽核報告

**稽核日期：** 2026-08-06
**稽核對象：** `/Users/coomychang/Specformulation/coomySF.github.io/`（repo 內即將部署的新版；未參考線上舊版）
**方法論：** `seo-audit` skill v2.0 + `ai-seo` skill v2.2，並套用 `.agents/product-marketing.md` 的產品脈絡
**備註：** 本次稽核直接讀原始碼（Jekyll 模板 + jekyll-seo-tag 為 server-side 輸出），不受 web_fetch 無法偵測 JS 注入 schema 的限制影響。

---

## Executive Summary

整體體質**良好**。技術地基幾乎都對：`jekyll-seo-tag` / `jekyll-sitemap` / `jekyll-feed` 三件套齊全、canonical 與 og:locale 自動輸出、`lang="zh-TW"` 正確、robots.txt 全開並指向 sitemap、GSC 驗證檔已就位、permalink 乾淨（英文 slug）。三篇文章都有 title / description / date / tags / `seo.type: BlogPosting`，內文全部 server-side render，AI crawler（GPTBot、ClaudeBot、PerplexityBot 皆**不執行 JS**）也能完整讀到。

最需要在部署前補的三件事：

1. **全站沒有預設 og:image / logo**（P0）——轉換路徑是「讀者分享到 Threads → 追蹤」，連結貼出去沒有預覽圖會直接傷到唯一的轉換管道。
2. **缺 llms.txt 與文章可抽取結構**（P1）——目標讀者正是最常問 AI 的族群，「四種 Agent Loop」這種框架是天然的高引用素材，但目前是純敘事長文，缺 TL;DR、定義塊、比較表。
3. **量測缺口**（P1）——product-marketing.md 明載「尚未設 analytics（待 seo-audit 建議）」，本報告給出建議。

首頁 3D canvas 的風險評估結論：**風險低**（詳見 On-Page 第 4.1 節）——但注意：**任務描述所稱的「noscript 降級文字清單」實際上並不是 `<noscript>`**，而是一個預設 `display:none`、要靠 JS 加上 `film-static` class 才會顯示的 `<ul>`；真正無 JS 的情境下它永遠隱藏。所幸主要內容在下方 `.latest` 區塊有完整的靜態重複，所以只列 P2 清理項。

**統計：P0 × 1、P1 × 9、P2 × 10。**

---

## 一、Technical SEO

### 1.1 [P0] 全站無預設 og:image / publisher logo

- **問題：** `_config.yml` 沒有 `logo`、沒有站級預設 `image`；三篇文章只有 `leadership-agent-loops` 的 front matter 有 `image`。其餘兩篇與首頁、/writing/、/about/ 分享到 Threads / 社群時**沒有預覽圖**，jekyll-seo-tag 產生的 BlogPosting JSON-LD 也缺 `image` 與 `publisher.logo`。
- **影響：** 高。網站唯一的轉換動作是「Threads 追蹤」，社群分享卡片是主戰場；JSON-LD 缺 image 也降低 rich result 與 AI 引用時的可信度呈現。
- **證據：** `_config.yml`（無 logo/image/defaults）；`_posts/2026-08-05-ai-agents-team-integration.md`、`_posts/2026-08-05-distrust-creates-passive-teams.md` front matter 無 `image`。
- **修法：** 製作一張 1200×630 的預設 OG 圖（如 `/assets/images/og-default.png`），並在 `_config.yml` 加：

```yaml
logo: /assets/images/coomy-avatar.webp
twitter:
  card: summary_large_image
defaults:
  - scope:
      path: ""
      type: "posts"
    values:
      author: Coomy
      image: /assets/images/og-default.png
```

（有自訂 `image` 的文章會覆蓋 default；`author` default 一併補上，供 JSON-LD 使用。）

### 1.2 [P1] 舊版 → 新版 URL 變動未確認，GitHub Pages 無法做 301

- **問題：** 線上舊版即將被新版覆蓋。若舊版有已被 Google 索引的 URL 與新版 permalink（`/writing/:title/`）不同，會產生 404、流失既有索引。
- **影響：** 中～高（取決於舊版是否已有索引與外連）。
- **修法：** 部署前用 GSC 的「涵蓋範圍」或 `site:coomysf.github.io` 清點舊 URL；有變動者用 GitHub Pages 白名單內的 `jekyll-redirect-from` 補 client-side redirect + canonical：

```yaml
# _config.yml
plugins:
  - jekyll-feed
  - jekyll-seo-tag
  - jekyll-sitemap
  - jekyll-redirect-from
```

```yaml
# 於對應文章/頁面的 front matter
redirect_from:
  - /old/path/
```

### 1.3 [P1] /about/ 幾乎是 orphan page

- **問題：** `about.md` 存在於 `/about/`（且 `seo.type: Person`，是全站 E-E-A-T 的實體錨點），但 `_layouts/default.html` 導覽的「關於」連到 `/#about`（首頁錨點），全站沒有任何可見連結指向 `/about/`。它只靠 sitemap 與 `site.author.url` 被發現。
- **影響：** 中。orphan page 的內部權重近乎零，Person 實體訊號被浪費。
- **修法：** 在 `_layouts/default.html` 把導覽改指向 about 頁，或至少在首頁 about 區塊與 footer 補連結：

```html
<!-- _layouts/default.html nav -->
<a href="{{ '/about/' | relative_url }}">關於</a>
```

```html
<!-- index.html home-about 區塊內補一行 -->
<a class="home-about-more" href="{{ '/about/' | relative_url }}">更完整的介紹 →</a>
```

### 1.4 [P1] 未設 analytics；GSC 需完成 sitemap 提交

- **問題：** `googlea140d4084a3bd256.html` 驗證檔已在 repo（好），但全站無任何 analytics；product-marketing.md 明載待本稽核建議。
- **影響：** 中。無法量測「哪篇文章被搜尋/AI 帶進來」與 Threads 轉換路徑。
- **修法：**
  1. 部署後到 Google Search Console 提交 `https://coomysf.github.io/sitemap.xml`。
  2. 個人部落格建議用輕量、無 cookie 的 Plausible 或 GoatCounter（免 cookie banner）；若要跟 Google 生態整合則用 GA4。GoatCounter 免費方案範例（加在 `_layouts/default.html` `</body>` 前）：

```html
<script data-goatcounter="https://coomysf.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
```

  3. 依 ai-seo skill 的 DIY 監測法：每月挑 10–20 個目標 query（如「AI 團隊 領導」「Agent Loop 是什麼」「多人 AI 開發 失控」）在 ChatGPT / Perplexity / Google 手動查一輪，記錄是否被引用。

### 1.5 [P2] `theme-color` 未支援深色模式

- **問題：** `_layouts/default.html` 只有 `#f2eee5` 一個 theme-color，但站上有明暗切換。
- **修法：**

```html
<meta name="theme-color" content="#f2eee5" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#141414" media="(prefers-color-scheme: dark)">
```

### 1.6 [P2] three.js 走 jsdelivr CDN，載入失敗時降級 class 不會被加上

- **問題：** `assets/js/cinema.js` 的 `film-static` 降級判斷（reduced-motion / 無 WebGL）寫在 module 頂層，但該 module 靜態 import `three`；若 CDN 被擋或失敗，整個 module 不執行，`film-static` 永遠不會加上（canvas 空白、fallback 清單也不顯示）。
- **影響：** 低（`.latest` 區塊仍有完整內容），但屬韌性缺口。
- **修法：** `index.html` module script 後補一段守門：

```html
<script type="module">
  import('three').catch(() => {
    document.documentElement.classList.add('film-static');
  });
</script>
```

### 1.7 [P2] 缺 404 頁

- **問題：** repo 無 `404.html`，GitHub Pages 會用預設 404，流失回站動線。
- **修法：** 新增 `404.html`：

```html
---
layout: default
title: 找不到頁面
permalink: /404.html
sitemap: false
---
<section class="latest">
  <h1>這一頁不存在</h1>
  <p>可能是舊連結。這裡是全部文章：</p>
  <a class="latest-all" href="{{ '/writing/' | relative_url }}">走進書庫 →</a>
</section>
```

### 1.8 [P2] in-post 圖片（GIF 697KB）未 lazy load、格式偏重

- **問題：** `agent-loop-types-jiang-zhongqiao.gif` 697KB，文內 `<figure>` 的 `<img>` 沒有 `loading="lazy"` / `decoding="async"`；GIF 也是最耗頻寬的動圖格式（LCP/頻寬皆吃虧）。
- **修法：** 短期先補屬性；中期轉 `<video autoplay loop muted playsinline>` 的 mp4/webm（通常可小 5–10 倍）：

```html
<img src="{{ '/assets/images/agent-loop-types-jiang-zhongqiao.gif' | relative_url }}"
     alt="四種 Agent Loop：回合制、目標制、時間制與主動式的流程圖"
     loading="lazy" decoding="async" width="800" height="450">
```

### 1.9 通過項（無需動作）

- robots.txt：`User-agent: * / Allow: /` + 絕對路徑 Sitemap 指令，正確。
- canonical / og:locale / meta description：由 `{% seo %}` 正確輸出（全頁面皆有 description front matter，無重複）。
- `lang="zh-TW"`、`locale: zh_TW`、單語站無 hreflang 需求。
- sitemap.xml / feed.xml：由官方 plugin 產生，nav 有 RSS 連結。
- HTTPS：GitHub Pages 原生。
- 行動友善：viewport 正確、responsive CSS。
- URL 結構：`/writing/:title/` 英文 slug，乾淨。

---

## 二、On-Page SEO

### 2.1 [P1] 首頁 title 沒有任何主題關鍵字

- **問題：** `index.html` front matter `title:` 為空 → jekyll-seo-tag 輸出「Coomy | 把做過的事，留成下一次的起點」。品牌詩意有了，但「AI 團隊」「Agent 協作」「領導」等目標關鍵字全部缺席，而 Coomy 目前是零知名度品牌——沒人會搜「Coomy」。
- **影響：** 高（首頁是全站最強的頁面，title 是最強的 on-page 訊號）。
- **修法：** 只改 front matter，不影響版面（layout 不會渲染 page.title）：

```yaml
---
layout: default
title: AI 時代的團隊領導與 Agent 協作筆記
description: Coomy 的長文網站——記錄人與 AI 一起工作之後，團隊怎麼變得更好。關於 Agent 協作、團隊決策與可複製的軟體生產的第一手觀察。
seo:
  type: WebSite
---
```

（輸出會變成「AI 時代的團隊領導與 Agent 協作筆記 | Coomy」；description 同步換成含關鍵字、貼近 product-marketing one-liner 的版本。）

### 2.2 [P1] 三篇文章之間沒有內文互連（topical cluster 斷裂）

- **問題：** 文章只有 layout 提供的 next/prev 卡片，內文零互連。三篇其實是同一個主題群（AI 協作失控 → 領導者的信任 → Agent Loop 框架），Google AI 的 query fan-out 與傳統 topical authority 都吃這個。
- **影響：** 中～高。
- **修法：** 在每篇內文自然處補描述性錨文字連結，例如在 `ai-agents-team-integration.md` 談分工失控處加：

```markdown
（這種「每個 task 都完成了、產品卻失控」的現象，和主管怎麼選擇介入節奏有關，
我在〈[主管嘴上要 ownership，卻只允許團隊用 Turn-Based Loop 工作]({% post_url 2026-08-05-leadership-agent-loops %})〉
用四種 Agent Loop 拆過一次。）
```

### 2.3 [P1] 文章無可見作者列（E-E-A-T）

- **問題：** `_layouts/post.html` 的 post-meta 只有日期與閱讀時間，頁面上看不到作者是誰、憑什麼寫這個主題。E-E-A-T 與 AI 引用（+25–30% 引用率，Princeton GEO）都需要具名作者與資歷。
- **修法：** 在 `_layouts/post.html` 的 `.post-meta` 補 byline，並在文末補作者小卡：

```html
<div class="post-meta">
  <span class="post-author">文 / {{ site.author.name }}</span>
  <time datetime="{{ page.date | date_to_xmlschema }}">{{ page.date | date: '%Y.%m.%d' }}</time>
  <span>約 {{ content | strip_html | strip_newlines | size | divided_by: 500 | at_least: 1 }} 分鐘閱讀</span>
</div>
```

```html
<!-- post-end 後 -->
<aside class="post-author-card">
  <p><strong>Coomy</strong> — 前外商 Frontend Tech Lead、Automation Team（人 + AI 混合團隊）Lead，
  現於 SpecFormula 開發。寫 AI 時代的團隊領導與 Agent 協作的第一手現場。
  <a href="{{ '/about/' | relative_url }}">關於我</a> ·
  <a href="https://www.threads.com/@coomysky" rel="me noopener" target="_blank">Threads @coomysky</a></p>
</aside>
```

### 2.4 首頁大量內容在 JS canvas —— 風險評估：**低**（附 [P2] 清理項）

**評估過程（證據）：**

| 內容 | 呈現方式 | 不執行 JS 的 crawler 看得到？ |
|---|---|---|
| H1「目前 N 篇思考…」+ 副標（含核心價值主張） | `.obs-ui` 靜態 HTML | 看得到 |
| 3D 結晶（文章標籤）| canvas + JS 注入 `.obs-labels` | 看不到 |
| 文章清單（title/description/date/連結）| `.latest` 靜態 Liquid 迴圈 | **完整看得到** |
| About 區塊 + Threads 連結 | 靜態 HTML | 看得到 |
| `#posts-data` JSON | `<script type="application/json">` | 資料在 HTML 內但非內容訊號 |

**結論：** canvas 只是「裝飾層」，所有可索引內容都有靜態重複，Googlebot（會執行 JS）與 AI crawler（不執行 JS）都能拿到全部文章連結與描述。**不需要為 SEO 改架構。**

**[P2] 但有兩個名實不符要清理：**

1. `.obs-fallback` **不是 noscript 降級**：它預設 `display: none`（`assets/css/cinema.css:104`），只有 JS 執行且判定 reduced-motion / 無 WebGL 時加上 `html.film-static` 才顯示。真正關掉 JS 的使用者永遠看不到它（也看不到任何結晶），只剩一句無意義的「移動滑鼠環顧 · 點擊結晶閱讀」。修法——利用 `default.html` 既有的 `documentElement.classList.add('js')`，在 `cinema.css` 加一條：

```css
/* JS 未執行時，直接顯示文字清單、隱藏互動提示 */
html:not(.js) .obs-fallback {
  display: block;
  position: relative;
  z-index: 2;
  padding: 0 24px 40px;
  list-style: none;
}
html:not(.js) .obs-hint,
html:not(.js) #film-canvas { display: none; }
```

2. 對 crawler 而言 `.obs-fallback` 是一份 hidden duplicate link list——無害（Google 對 display:none 內容只是降權不懲罰），上面修法順便讓它在該出現時出現，一石二鳥。

### 2.5 [P2] 首頁 H1 無關鍵字

- **問題：** H1「目前 3 篇思考，懸在這裡。」純氛圍。單一 H1、層級正確（H1 → H2「最近寫的」→ H3 文章標題），結構沒問題，只是 H1 這個高權重位置沒承載主題。
- **修法（保留調性的折衷）：** H1 保留，把緊接的 `.obs-sub` 改寫為含關鍵字的一句（已接近，微調即可）；或把 H1 改成「AI 時代帶團隊的 <em>{{ site.posts | size }}</em> 篇現場筆記」這類仍有態度但含關鍵字的寫法。二選一即可，別硬塞。

### 2.6 [P2] 文章 title 過長（SERP 截斷）

- **問題：**「一個人帶 Agent 兩天做完 POC，四個人一起 Vibe，收四倍的爛攤子」約 33 全形字，Google 中文 SERP 約顯示 28–32 字，尾部會被截。另兩篇也在 25–30 字邊緣。
- **評估：** 這是編輯判斷——這種標題在 Threads 的點擊力可能值得截斷代價。若要兼顧，可接受現狀（P2），未來新文章盡量把核心資訊放前 25 字。

### 2.7 [P2] 閱讀時間計算：中文失準且兩處演算法不一致

- **問題：** `_layouts/post.html:11` 用 `number_of_words | divided_by: 350`——Liquid 的 `number_of_words` 以空白切詞，整段中文算 1 個「字」，會嚴重低估；`writing.html:21` 卻用字元數 `size | divided_by: 500`。同一篇文章在列表頁與內頁顯示的分鐘數會不同，傷信任（product-marketing 的 objection handling 還特別拿「標明閱讀分鐘數」當賣點）。
- **修法：** post.html 統一改成字元數版（見 2.3 的 snippet）。

---

## 三、Structured Data

現況：`{% seo %}` 已輸出 canonical、og:*、twitter:*、JSON-LD（首頁 WebSite、文章 BlogPosting、about Person）——**基本盤是好的**，以下補缺口。

### 3.1 [P1] BlogPosting 缺 dateModified 來源與 author/image defaults

- **問題：** 文章 front matter 無 `last_modified_at`（jekyll-seo-tag 有讀這個 key 來輸出 `dateModified`），無 per-post `author`；2/3 篇無 `image`。AI 引擎顯著加權新鮮度訊號。
- **修法：** `_config.yml` defaults 見 1.1；文章改版時在 front matter 手動維護：

```yaml
# 每次實質更新文章時同步改
last_modified_at: 2026-08-06 12:00:00 +0800
```

  並在 `_layouts/post.html` 的 post-meta 顯示（讓人與 AI 都看到 freshness，見 4.4）。

### 3.2 [P2] Person / WebSite 實體可再補強

- **問題：** `about.md` 的 Person 有 `links`（Threads、GitHub）——正確的 sameAs 做法；但 Person 沒有 jobTitle / description 等欄位（jekyll-seo-tag 不支援，屬 plugin 限制）。
- **修法（選配）：** 若要更完整的 Person 實體，在 `about.md` 內文自行加一段 JSON-LD（與 seo-tag 共存無妨）：

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://coomysf.github.io/about/#person",
  "name": "Coomy",
  "url": "https://coomysf.github.io/about/",
  "image": "https://coomysf.github.io/assets/images/coomy-avatar.webp",
  "jobTitle": "Software Engineer / Team Lead",
  "description": "前外商 Frontend Tech Lead、Automation Team（人 + AI 混合團隊）Lead，現於 SpecFormula 開發。寫 AI 時代的團隊領導與 Agent 協作。",
  "knowsAbout": ["AI Agent 協作", "團隊領導", "軟體開發流程", "Frontend"],
  "sameAs": [
    "https://www.threads.com/@coomysky",
    "https://github.com/coomySF"
  ]
}
</script>
```

- **不建議做的：** 文章塞 FAQPage schema。內容是敘事長文而非 FAQ，硬加屬於 ai-seo skill 明列的「為 AI 切碎內容」反模式；Google 的 FAQ rich result 也已縮限到近乎不顯示。

---

## 四、AI SEO

背景：目標讀者（Tech Lead / EM / 導入 AI 的主管）是重度 AI 使用者，「Agent Loop 是什麼」「多人用 AI 開發為什麼失控」這類問題大量發生在 ChatGPT / Perplexity / Claude 對話裡。這個站的 AI SEO 權重應該**高於**傳統 SEO。好消息：全站 server-side render、robots.txt 對所有 bot 全開（GPTBot / ClaudeBot / PerplexityBot / Google-Extended 皆未被擋）、feed.xml 有全文——地基已經對了。

### 4.1 [P1] 缺 llms.txt

- **問題：** 站上沒有 `/llms.txt`。ChatGPT / Claude / Perplexity 類引擎會利用它快速理解站點結構與內容定位。
- **修法：** 新增 `llms.txt`（repo 根目錄，用 Liquid 自動維護，永不過期）：

```
---
layout: null
permalink: /llms.txt
---
# Coomy — AI 時代的團隊領導與 Agent 協作筆記

> Coomy 的個人長文網站，記錄人與 AI 一起工作之後，團隊怎麼變得更好。
> 主題：Agent 協作、團隊領導、決策、可複製的軟體生產。
> 作者背景：前外商 Frontend Tech Lead、Automation Team（人 + AI 混合團隊）Lead，現於 SpecFormula 開發。
> 語言：繁體中文（zh-TW）。

## 文章
{% for post in site.posts %}- [{{ post.title }}]({{ post.url | absolute_url }})：{{ post.description }}
{% endfor %}
## 其他
- [關於 Coomy]({{ '/about/' | absolute_url }})：作者介紹與關注領域
- [全部文章]({{ '/writing/' | absolute_url }})
- [RSS 全文 feed]({{ '/feed.xml' | absolute_url }})
- Threads：https://www.threads.com/@coomysky
```

（`/pricing.md` 不適用——非商業產品，跳過。）

### 4.2 [P1] 文章缺可抽取結構：TL;DR、定義塊、比較表

- **問題：** 三篇都是優質敘事長文（這是差異化，別改寫），但 AI 引擎抽的是「passage」不是「page」。目前沒有任何 40–60 字的自足答案塊；「Agent Loop」這個站上最有引用潛力的術語，全文沒有一段獨立的定義；四種 Loop 的比較散在敘事裡，沒有表格（比較內容以表格呈現的被引用率遠高於散文）。
- **影響：** 高。這是「被 LLM 引用」與「只是被讀過」的分水嶺。
- **修法（以 leadership-agent-loops 為例，加在開頭敘事之後，不破壞文氣）：**

```markdown
> **TL;DR** — Agent Loop 是指「工作怎麼開始、做到哪裡該停」的互動節奏，分為
> 回合制（Turn-Based）、目標制（Goal-Based）、時間制（Time-Based）、主動式（Proactive）四種。
> 領導者管理團隊時，其實一直在替每個人選擇 Loop——嘴上要 ownership、
> 手上只給 Turn-Based，團隊就只會等指令。

## 四種 Agent Loop 一覽

| Loop 類型 | 工作怎麼開始 | 做到哪裡該停 | 對應的帶人情境 |
|---|---|---|---|
| Turn-Based 回合制 | 主管下一個指令 | 每回合做完等確認 | 新人、高風險任務、需要密集校準 |
| Goal-Based 目標制 | 給定目標與驗收條件 | 達成目標或明確卡關 | 有判斷力的資深成員 |
| Time-Based 時間制 | 固定節奏（會議 / sprint）喚醒 | 到下一個同步點 | 跨組協作、維運型工作 |
| Proactive 主動式 | 自己看見問題就啟動 | 自主判斷 | 你最想留住的那種人 |
```

  另外兩篇同樣各加一個 TL;DR blockquote；`ai-agents-team-integration` 的失控症狀清單已經是好的抽取格式（保留），可再補一段「多人 + Agent 開發為什麼會失控」的 40–60 字直接回答。**注意分寸：** 依 Google 官方指引，不要為 AI 把文章切碎——每篇加 1 個 TL;DR + 必要的表格就停，其餘維持敘事。

### 4.3 [P2] 缺「最後更新」顯示（freshness 訊號）

- **問題：** AI 引擎顯著偏好有日期、近期更新的內容；目前只有發布日。
- **修法：** 搭配 3.1 的 `last_modified_at`，在 `_layouts/post.html` post-meta 加：

```html
{% if page.last_modified_at %}
<span>更新於 <time datetime="{{ page.last_modified_at | date_to_xmlschema }}">{{ page.last_modified_at | date: '%Y.%m.%d' }}</time></span>
{% endif %}
```

### 4.4 [P2] 統計數字與來源引用偏少

- **問題：** Princeton GEO 研究：引用來源 +40%、加統計 +37%、專家引言 +30% AI 可見度。目前只有 agent-loops 一篇有外部來源（LinkedIn 圖表出處，做得很好）。文中「四倍的爛攤子」「不到一兩天」這類第一手數字其實是原創資料——是最高價值的引用素材，但埋在敘事裡。
- **修法：** 不必補外部研究（會稀釋第一手感），改把**自己的數字寫成可獨立引用的句子**，例如：「在我們的經驗裡，1 個人帶 Agent 約 2 天能完成的 POC，換成 4 個人同時帶 Agent 修改同一專案，收尾成本大約放大 4 倍——主要花在理解 Agent 的修改範圍與重複實作。」未來文章維持「一篇至少一個具體數字 + 一個具名出處」的紀律。

### 4.5 [P2] 第三方 presence（AI 引用 6.5 倍更常來自第三方）

- **現況：** 品牌 2026-08-05 起步，第三方訊號趨近於零，這正常。
- **建議（依 skill 的 Presence 支柱，量力而為）：**
  1. GitHub `coomySF` profile README 補上站點連結與一句定位（AI 常讀 GitHub）。
  2. Threads 長貼文固定回鏈原文（已在做，維持）。
  3. 中文技術社群（iThome、Hacker News 中文圈、相關 FB 社團）自然分享；被任何 newsletter / podcast 引用一次的價值高於再寫一篇。
  4. 每月做一次 DIY AI 可見度檢查（見 1.4 第 3 點），從第一天就留基線。

### 4.6 通過項（無需動作）

- **AI bot 存取：** robots.txt 全開，未 Disallow 任何 GPTBot / ClaudeBot / PerplexityBot / Google-Extended / Bingbot。**保持現狀，不要為了「防訓練」加擋**——擋了就不會被引用，與本站目標直接矛盾。
- **內容可讀性：** 文章主體是純 markdown → 靜態 HTML，AI crawler 零障礙；feed.xml 含全文。
- **內容類型：** 「框架 + 真實事故」正是 AI 愛引用的 opinion/analysis + original data 組合，方向正確。

---

## 五、優先行動清單

| # | 優先級 | 項目 | 檔案 |
|---|:---:|---|---|
| 1 | **P0** | 補站級 og:image / logo / twitter card + posts defaults | `_config.yml` + 新增 og-default.png |
| 2 | P1 | 新增 llms.txt | 新增 `llms.txt` |
| 3 | P1 | 三篇文章各加 TL;DR；agent-loops 加四種 Loop 比較表 | `_posts/*.md` |
| 4 | P1 | 首頁 title / description 補關鍵字 | `index.html` front matter |
| 5 | P1 | 文章 byline + 作者小卡（E-E-A-T） | `_layouts/post.html` |
| 6 | P1 | `last_modified_at` 機制（dateModified） | `_config.yml` + posts front matter |
| 7 | P1 | 文章內文互連（topical cluster） | `_posts/*.md` |
| 8 | P1 | /about/ 脫離 orphan（導覽/footer 連結） | `_layouts/default.html` |
| 9 | P1 | 清點舊版 URL、必要時 jekyll-redirect-from | GSC + `_config.yml` |
| 10 | P1 | 部署後提交 sitemap 到 GSC + 裝 analytics | GSC / `_layouts/default.html` |
| 11 | P2 | `html:not(.js)` 顯示 obs-fallback（真降級） | `assets/css/cinema.css` |
| 12 | P2 | 閱讀時間改字元數計算（與 writing.html 一致） | `_layouts/post.html` |
| 13 | P2 | 顯示「更新於」日期 | `_layouts/post.html` |
| 14 | P2 | theme-color 深色版 | `_layouts/default.html` |
| 15 | P2 | three.js CDN 失敗守門 | `index.html` |
| 16 | P2 | 404 頁 | 新增 `404.html` |
| 17 | P2 | GIF lazy load / 轉影片格式 | `_posts/...agent-loops.md` |
| 18 | P2 | 首頁 H1 或 obs-sub 承載關鍵字 | `index.html` |
| 19 | P2 | 自家數字寫成可引用句 + 引用紀律 | `_posts/*.md`（編輯習慣） |
| 20 | P2 | 第三方 presence 起步（GitHub README 等） | 站外 |

> 建議部署節奏：#1–#6 在這次部署一起上（都是純加法、零風險）；#7–#10 部署後一週內；P2 陸續清。
