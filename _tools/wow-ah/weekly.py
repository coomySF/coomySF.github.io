#!/usr/bin/env python3
"""台服拍賣場週報：每天產生／更新「本週」的靜態頁 wow-ah/weekly/{年}-w{週}.html（Google 收錄得到，也是發文素材）。

用法：python3 weekly.py --data <ah-data 目錄> --out <repo>/wow-ah/weekly [--force]
- 同一天（台北時間）已經更新過就不再改，避免每小時都 commit。
- 數字全部來自收集器的 index.json（類別指數日收盤）和 overview.json（現價、7 日均、成交）。
"""
import argparse
import html
import json
import os
import re
import time
from datetime import datetime, timedelta, timezone

TPE = timezone(timedelta(hours=8))
SITE = "https://coomysf.github.io/wow-ah/"
HOUSES = [("tw-110", "PvE 聯盟"), ("tw-113", "PvE 部落"), ("tw-116", "PvE 黑水灣"),
          ("tw-111", "PvP 聯盟"), ("tw-114", "PvP 部落"), ("tw-117", "PvP 黑水灣")]
OF_ASK, OF_AVG7, OF_VOL7 = 0, 7, 15


def read(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def gold(c):
    if c is None:
        return "—"
    g, s = divmod(int(round(c)), 10000)
    s, cp = divmod(s, 100)
    return f"{g}g {s:02d}s" if g else f"{s}s {cp:02d}c"


def pct(x):
    return "—" if x is None else f"{'+' if x > 0 else '−' if x < 0 else '±'}{abs(x) * 100:.1f}%"


def house_section(data, key, label, week_start_ms, meta):
    ix = read(os.path.join(data, key, "index.json"))
    ov = read(os.path.join(data, key, "overview.json"))
    if not ix or not ov:
        return None, None
    rows = []
    for c in ix["cats"] + [["all", "整體"]]:
        d = ix.get("d", {}).get(c[0]) or []
        if not d:
            continue
        before = [v for t, v in d if t < week_start_ms]
        start = before[-1] if before else 100.0
        rows.append((c[1], d[-1][1], d[-1][1] / start - 1 if start else None))
    f = {n: i for i, n in enumerate(ov["f"])}
    items = []
    for it in ov["items"]:
        o = it["o"]
        ask, avg7, vol7 = o[f["ask"]], o[f["avg7"]], o[f["vol7"]]
        name = (meta.get(str(it["id"])) or [None])[0]
        if name and ask and avg7 and vol7:
            items.append((it["id"], name, ask, avg7, vol7))
    hot = sorted(items, key=lambda x: -x[3] * x[4])[:8]
    # 成交夠多、而且不是亂掛的價格（比 7 日均低六成以上或高一倍半以上多半是誤掛、惡意掛單）
    liquid = [x for x in items if x[4] >= 10 and 0.4 <= x[2] / x[3] <= 2.5]
    cheap = sorted(liquid, key=lambda x: x[2] / x[3])[:5]
    dear = sorted(liquid, key=lambda x: -x[2] / x[3])[:5]
    link = lambda i, n: f'<a href="{SITE}?h={key}#/item/{i}">{html.escape(n)}</a>'
    li = lambda xs: "".join(f"<li>{link(i, n)}<span>現價 {gold(a)}・7 日均 {gold(v)}・{pct(a / v - 1)}</span></li>" for i, n, a, v, _ in xs)
    cats = "".join(f"<tr><td>{html.escape(n)}</td><td>{v:.1f}</td><td class=\"{'up' if (c or 0) > 0 else 'down' if (c or 0) < 0 else ''}\">{pct(c)}</td></tr>" for n, v, c in rows)
    big = max((r for r in rows if r[0] != "整體" and r[2] is not None), key=lambda r: abs(r[2]), default=None)
    headline = f"{label}本週變化最大的是「{big[0]}」{pct(big[2])}" if big else ""
    sec = f"""<section id="{key}"><h2>{label}</h2>
<p class="lead">{html.escape(headline)}。</p>
<table><thead><tr><th>類別指數</th><th>現值</th><th>本週</th></tr></thead><tbody>{cats}</tbody></table>
<h3>本週最熱賣（7 天成交金額）</h3><ol class="items">{"".join(f"<li>{link(i, n)}<span>7 天賣出 {v7:,} 件・均價 {gold(v)}</span></li>" for i, n, a, v, v7 in hot)}</ol>
<h3>現在比平常便宜（可撿）</h3><ol class="items">{li(cheap)}</ol>
<h3>現在比平常貴（可出）</h3><ol class="items">{li(dear)}</ol>
<p class="go"><a href="{SITE}?h={key}#/alerts">幫 {label} 的商品設到價提醒 →</a></p></section>"""
    return sec, headline


def page(year, week, mon, sun, sections, heads, asof, tpl_note):
    title = f"魔獸世界：永恆 台服拍賣場週報｜{year} 第 {week} 週（{mon:%m/%d}–{sun:%m/%d}）"
    desc = "；".join(h for h in heads if h)[:150] or "魔獸世界：永恆台服 PvE／PvP 聯盟、部落、黑水灣拍賣場一週物價變化、熱賣商品、可撿可出清單。"
    nav = " ".join(f'<a href="#{k}">{l}</a>' for k, l in HOUSES)
    return f"""---
layout: null
sitemap: true
---
<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta property="og:title" content="{html.escape(title)}"><meta property="og:description" content="{html.escape(desc)}">
<meta property="og:image" content="{SITE}og.jpg?v=3"><meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{SITE}weekly/{year}-w{week:02d}.html">
<style>
:root{{color-scheme:dark}}body{{margin:0;background:#0b0d11;color:#ece6d6;font:16px/1.7 "Noto Sans TC",system-ui,sans-serif}}
main{{max-width:860px;margin:0 auto;padding:28px 16px 60px}}a{{color:#e2bd62}}h1{{font:900 28px/1.3 "Noto Serif TC",serif;margin:8px 0}}
h2{{font:800 22px/1.3 "Noto Serif TC",serif;margin:36px 0 6px;padding-top:12px;border-top:1px solid #2a2e36}}h3{{font-size:15px;margin:18px 0 6px;color:#e2bd62}}
.k{{font-size:12px;letter-spacing:.12em;color:#e2bd62}}.meta{{color:#8f8a7c;font-size:13px}}.nav{{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}}
.nav a{{padding:4px 10px;border:1px solid #3a3424;border-radius:999px;text-decoration:none;font-size:13px}}
table{{width:100%;border-collapse:collapse;font-size:14px}}td,th{{padding:6px 8px;border-bottom:1px solid #1f232b;text-align:right}}td:first-child,th:first-child{{text-align:left}}
th{{color:#8f8a7c;font-weight:500}}.up{{color:#f2625b}}.down{{color:#3fcf6b}}.lead{{margin:4px 0 10px}}
.items{{padding-left:20px;margin:0}}.items li{{margin:4px 0}}.items span{{display:block;font-size:12px;color:#8f8a7c}}
.go a{{display:inline-block;margin-top:12px;padding:8px 14px;border:1px solid #e2bd62;border-radius:8px;text-decoration:none}}
.cta{{margin:40px 0 0;padding:16px;border:1px solid #3a3424;border-radius:12px;background:#11151c}}
</style></head><body><main>
<div class="k">◆ 台灣拍賣場行情・週報</div>
<h1>{html.escape(title)}</h1>
<p class="meta">資料截至 {asof:%m/%d %H:%M}（台北時間）・來源：暴雪官方台灣 API，每小時快照・紅＝漲、綠＝跌・{tpl_note}</p>
<div class="nav">{nav}</div>
{"".join(sections)}
<div class="cta"><b>想在價格到的時候被叫一聲？</b><br>到 <a href="{SITE}">台灣拍賣場行情</a> 設「到價提醒」，跌到你要的價格 Discord 直接私訊你。免費、無廣告。<br><a href="{SITE}weekly/">看所有週報 →</a></div>
</main></body></html>
"""


def index_page(out):
    files = sorted((f for f in os.listdir(out) if re.match(r"\d{4}-w\d{2}\.html$", f)), reverse=True)
    lis = "".join(f'<li><a href="{f}">{f[:4]} 第 {int(f[6:8])} 週</a></li>' for f in files)
    return f"""---
layout: null
sitemap: true
---
<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>魔獸世界：永恆 台服拍賣場週報｜所有週次</title>
<meta name="description" content="魔獸世界：永恆台服拍賣場每週物價週報：PvE／PvP 聯盟、部落、黑水灣的類別指數、熱賣商品、可撿可出清單。">
<style>:root{{color-scheme:dark}}body{{margin:0;background:#0b0d11;color:#ece6d6;font:16px/1.8 "Noto Sans TC",system-ui,sans-serif}}main{{max-width:760px;margin:0 auto;padding:28px 16px}}a{{color:#e2bd62}}h1{{font:900 26px/1.3 "Noto Serif TC",serif}}</style>
</head><body><main><h1>台服拍賣場週報</h1><p>每週一更新上一週，平常每天更新「本週至今」。<a href="{SITE}">回到台灣拍賣場行情 →</a></p><ul>{lis}</ul></main></body></html>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    now = datetime.now(TPE)
    year, week, _ = now.isocalendar()
    mon = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    sun = mon + timedelta(days=6)
    os.makedirs(a.out, exist_ok=True)
    path = os.path.join(a.out, f"{year}-w{week:02d}.html")
    stamp = f"<!-- generated {now:%Y-%m-%d} -->"
    if not a.force and os.path.exists(path) and stamp in open(path, encoding="utf-8").read():
        print("weekly: already updated today")
        return
    meta = read(os.path.join(a.data, "meta", "items.json"), {})
    secs, heads = [], []
    for key, label in HOUSES:
        sec, head = house_section(a.data, key, label, int(mon.timestamp() * 1000), meta)
        if sec:
            secs.append(sec)
            heads.append(head)
    if not secs:
        print("weekly: no data")
        return
    note = "本週還沒結束，數字是到目前為止" if now < sun.replace(hour=23, minute=59) else "整週"
    with open(path, "w", encoding="utf-8") as f:
        f.write(page(year, week, mon, sun, secs, heads, now, note) + stamp + "\n")
    with open(os.path.join(a.out, "index.html"), "w", encoding="utf-8") as f:
        f.write(index_page(a.out))
    print(f"weekly: wrote {path}")


if __name__ == "__main__":
    main()
