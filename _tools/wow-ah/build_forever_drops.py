#!/usr/bin/env python3
"""《魔獸世界：永恆》新增副本的掉落（60 版伺服器資料沒有這些副本）→ 併進 wow-ah/drops.json。

資料來源：
  阿莫比 wowamobi.com 的副本頁：首領、掉落、掉落率（玩家用小幫手在遊戲裡記到的擊殺，次數少時只供參考）
  wago.tools 的 wowf client DB2：新物品的需求等級、分類、部位、綁定

用法：python3 build_forever_drops.py --out ../../wow-ah/drops.json [--build 1.60.1.71139]
  先跑 build_drops.py，再跑這支（build_drops.py 重跑會蓋掉 drops.json）。
  抓到的資料另存 forever-drops.json，網站掛了也能用舊的重併。

drops.json 多出：
  places m{地圖}       [中文名, 人數, 等級下限, 上限]
  mobs   {9 + 地圖 + 序號}  [中文名, 3（首領）, 等級下限, 上限, 地點, 1]   首領沒有怪物 id，用假的
  crn    {怪物: 中文名}   網頁把它當成 meta/creatures.json 的一部分（這些首領暴雪 API 查不到）
  src    {地點: "玩家回報（阿莫比，資料整理到 …）"}   掉落率的來源說明
"""
import argparse
import csv
import html
import io
import json
import os
import re
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SAVE = os.path.join(HERE, "forever-drops.json")
SITE = "https://wowamobi.com"
UA = {"User-Agent": "Mozilla/5.0 (coomysf wow-ah drops builder)"}
WAGO = "https://wago.tools/db2/{t}/csv?build={b}{loc}"
BOP = "1"
MIN_KILLS = 20


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read().decode("utf-8")


def text_of(page):
    t = re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S)
    t = re.sub(r'<a [^>]*href="/items/(\d+)"[^>]*>', r"\n[#\1]\n", t)
    t = html.unescape(re.sub(r"<[^>]+>", "\n", t))
    return [x.strip() for x in t.split("\n") if x.strip()]


def new_dungeons():
    """副本清單裡標「永恆新增」的副本 id"""
    ids = sorted({int(x) for x in re.findall(r'href="/dungeons/(\d+)"', get(f"{SITE}/dungeons"))})
    return [i for i in ids if i >= 2000]   # 60 版的副本地圖 id 都在 1000 以下


def parse_dungeon(mid):
    lines = text_of(get(f"{SITE}/dungeons/{mid}"))
    name = lines[lines.index("/") + 3] if "/" in lines else lines[0].split("｜")[0]
    name = lines[0].split("｜")[0]
    players = next((int(lines[i + 1]) for i, x in enumerate(lines) if x == "人數" and lines[i + 1].isdigit()), 5)
    lv = next((x for i, x in enumerate(lines) if lines[i - 1] == "等級" and re.match(r"\d+ - \d+", x)), None)
    lo, hi = (int(v) for v in lv.split(" - ")) if lv else (None, None)
    asof = next((m.group(1) for x in lines if (m := re.search(r"資料整理到 ([^。]+)。", x))), "")
    bosses = []
    try:
        i = lines.index("掉落")
    except ValueError:
        return None
    end = next((j for j in range(i, len(lines)) if lines[j].startswith("遊戲檔裡沒有掉落表") or lines[j] == "副本任務"), len(lines))
    j = i
    while j < end:
        # 首領：序號、名字、「擊殺 N 次・記到掉落 M 次」
        if lines[j].isdigit() and j + 2 < end and (m := re.match(r"擊殺 (\d+) 次・記到掉落 (\d+) 次", lines[j + 2])):
            boss = {"name": lines[j + 1], "kills": int(m.group(2)), "loot": []}
            bosses.append(boss)
            j += 3
            continue
        if (m := re.match(r"\[#(\d+)\]", lines[j])) and bosses and j + 2 < end:
            n = re.match(r"(\d+) 次", lines[j + 2])
            if n:
                boss["loot"].append([int(m.group(1)), int(n.group(1))])
            j += 3
            continue
        j += 1
    return {"id": mid, "name": name, "players": players, "lo": lo, "hi": hi, "asof": asof, "bosses": bosses}


def item_info(build, ids):
    """新物品的 [需求等級, 類別, 子類, 部位, 綁定]（只取需要的那幾件）"""
    want = {str(i) for i in ids}
    info = {}
    for row in csv.DictReader(io.StringIO(get(WAGO.format(t="Item", b=build, loc="")))):
        if row["ID"] in want:
            info[row["ID"]] = [None, int(row["ClassID"]), int(row["SubclassID"]), int(row["InventoryType"]), None]
    for row in csv.DictReader(io.StringIO(get(WAGO.format(t="ItemSparse", b=build, loc="&locale=zhTW")))):
        if row["ID"] in info:
            info[row["ID"]][0] = int(row["RequiredLevel"] or 0)
            info[row["ID"]][4] = row["Bonding"]
    return info


def merge(drops, data, info):
    drops.setdefault("crn", {})
    drops.setdefault("src", {})
    for d in data:
        pl = f"m{d['id']}"
        drops["places"][pl] = [d["name"], d["players"], d["lo"] or 0, d["hi"] or 0]
        drops["src"][pl] = f"玩家回報（阿莫比，資料整理到 {d['asof']}）" if d["asof"] else "玩家回報（阿莫比）"
        for n, b in enumerate(d["bosses"], 1):
            if b["kills"] < MIN_KILLS:   # 記到的擊殺太少，掉落率沒意義
                continue
            mob = str(9_000_000 + d["id"] * 100 + n)
            drops["mobs"][mob] = [b["name"], 3, d["lo"] or 0, d["hi"] or 0, pl, 1]
            drops["crn"][mob] = b["name"]
            for iid, cnt in b["loot"]:
                pm = round(cnt * 1000 / b["kills"]) if b["kills"] else 0
                src = drops["items"].setdefault(str(iid), {})
                src["m"] = sorted([x for x in src.get("m", []) if x[0] != int(mob)] + [[int(mob), pm]], key=lambda x: -x[1])
                it = info.get(str(iid))
                if it and it[1] in (2, 4) and it[4] != BOP:
                    drops["gear"][str(iid)] = [it[0] or 0] + it[1:4]   # 新物品 ItemSparse 還沒有 → 需求等級不明記 0（網頁不顯示）
    return drops


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--build", default="1.60.1.71139")
    ap.add_argument("--offline", action="store_true", help="不抓網站，用上次存的 forever-drops.json")
    a = ap.parse_args()
    if a.offline:
        saved = json.load(open(SAVE, encoding="utf-8"))
        data, info = saved["dungeons"], saved["items"]
    else:
        data = [d for d in (parse_dungeon(m) for m in new_dungeons()) if d and d["bosses"]]
        info = item_info(a.build, {iid for d in data for b in d["bosses"] for iid, _ in b["loot"]})
        with open(SAVE, "w", encoding="utf-8") as f:
            json.dump({"dungeons": data, "items": info}, f, ensure_ascii=False, indent=1)
    drops = json.load(open(a.out, encoding="utf-8"))
    merge(drops, data, info)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(drops, f, ensure_ascii=False, separators=(",", ":"))
    for d in data:
        print(f"{d['name']}（m{d['id']}）：{len(d['bosses'])} 個首領、{sum(len(b['loot']) for b in d['bosses'])} 件掉落")


if __name__ == "__main__":
    main()
