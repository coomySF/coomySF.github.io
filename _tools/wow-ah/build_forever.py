#!/usr/bin/env python3
"""《魔獸世界：永恆》跟經典版（60 版）比，新增了什麼、改了什麼 → wow-ah/forever.json，給「永恆新增」頁和商品頁標記用。

資料來源：
  wago.tools 的 client DB2：永恆 wowf 1.60 vs 經典版 wow_classic_era 1.15 的 Item、ItemSparse（中文名稱）
  forever-drops.json（build_forever_drops.py 抓的阿莫比資料）：新副本、首領掉落、任務獎勵、新物品的中文名

用法：python3 build_forever.py --out ../../wow-ah/forever.json [--build 1.60.1.71139] [--era 1.15.9.70576]

比對的限制：
  永恆的屬性改成「物品等級預算的百分比」（像正式服），經典版是寫死的數字，所以算不出「+4 變 +6」這種精確數字；
  只比得出品質、物品等級、需求等級、綁定、堆疊上限、多了或少了哪種屬性。
  抗性在永恆也算成屬性（51–56），經典版是另一欄，不算改動。

輸出：
  dungeons [{id, name, players, lo, hi, where, side, bosses: [[名字, [[物品, 掉率‰], ...]], ...], quests: [[名字, 等級, [物品...]], ...], asof}]
  items    {物品: [中文名, 品質, 類別, 子類, 部位, 物品等級, 需求等級, 綁定, 來源]}   永恆新增的物品（來源："m3065" 副本、"q3065" 副本任務、"" 不明）
  changed  {物品: {欄位: [經典版, 永恆], ...}}   欄位：q 品質、il 物品等級、rl 需求等級、b 綁定、st 堆疊、+ 新屬性、- 拿掉的屬性
"""
import argparse
import csv
import io
import json
import os
import re
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
WAGO = "https://wago.tools/db2/{t}/csv?build={b}{loc}"
KEEP_CLASS = {"0", "1", "2", "4", "5", "7", "9", "15"}   # 消耗品、容器、武器、護甲、材料、商品、配方、雜項
JUNK = re.compile(r"DEPRECATED|Monster|^Test|測試|\[PH\]|^QA|UNUSED|^OLD|^Deprecated|^zz", re.I)
RESIST_STATS = {"51", "52", "53", "54", "55", "56"}
# 暴雪官方新聞的地點（client 沒有）；side：在哪個陣營的地盤
WHERE = {
    3065: ("丹莫洛，鐵爐堡下方", "聯盟"),
    2999: ("提里斯法林地，幽暗城上方的廢墟", "部落"),
    2959: ("奧特蘭克山脈（聯盟從南海鎮、部落從塔倫米爾接任務才進得去）", ""),
    2998: ("濕地，維爾丹挖掘場附近", ""),
}


def table(name, build, cache, locale=""):
    path = os.path.join(cache, f"{name}_{build}{'_' + locale if locale else ''}.csv")
    if not os.path.exists(path):
        url = WAGO.format(t=name, b=build, loc=f"&locale={locale}" if locale else "")
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "coomysf wow-ah"}), timeout=300) as r:
            open(path, "wb").write(r.read())
    with open(path, encoding="utf-8") as f:
        return {r["ID"]: r for r in csv.DictReader(f)}


def stats(row):
    return {row.get(f"StatModifier_bonusStat_{i}") for i in range(10)} - {None, "", "-1", "0"} - RESIST_STATS


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--build", default="1.60.1.71139")
    ap.add_argument("--era", default="1.15.9.70576")
    ap.add_argument("--cache", default=os.path.join(HERE, ".cache"))
    a = ap.parse_args()
    os.makedirs(a.cache, exist_ok=True)
    fi, ei = table("Item", a.build, a.cache), table("Item", a.era, a.cache)
    fs, es = table("ItemSparse", a.build, a.cache, "zhTW"), table("ItemSparse", a.era, a.cache, "zhTW")
    fd = json.load(open(os.path.join(HERE, "forever-drops.json"), encoding="utf-8"))

    # 新副本
    src, names, dungeons = {}, {}, []
    for d in fd["dungeons"]:
        names.update(d.get("names", {}))
        where, side = WHERE.get(d["id"], ("", ""))
        bosses = []
        for b in d["bosses"]:
            loot = [[iid, round(c * 1000 / b["kills"]) if b["kills"] else 0] for iid, c in b["loot"]]
            bosses.append([b["name"], loot, b["kills"]])
            for iid, _ in b["loot"]:
                src.setdefault(str(iid), f"m{d['id']}")
        quests = [[q["name"], q["lv"], q["rewards"]] for q in d.get("quests", [])]
        for q in d.get("quests", []):
            for iid in q["rewards"]:
                src.setdefault(str(iid), f"q{d['id']}")
        dungeons.append({"id": d["id"], "name": d["name"], "players": d["players"], "lo": d["lo"], "hi": d["hi"],
                         "where": where, "side": side, "bosses": bosses, "quests": quests, "asof": d["asof"]})

    # 新物品：永恆 client 有、經典版沒有
    items = {}
    for iid, it in fi.items():
        if iid in ei or it["ClassID"] not in KEEP_CLASS:
            continue
        sp = fs.get(iid)
        name = (sp or {}).get("Display_lang") or names.get(iid)
        if not name or JUNK.search(name) or not re.search(r"[一-鿿]", name):
            continue
        q = int(sp["OverallQualityID"]) if sp else None
        if q == 0 and iid not in src:   # 灰色垃圾
            continue
        items[iid] = [name, q, int(it["ClassID"]), int(it["SubclassID"]), int(it["InventoryType"]),
                      int(sp["ItemLevel"]) if sp else None, int(sp["RequiredLevel"]) if sp else None,
                      int(sp["Bonding"]) if sp else None, src.get(iid, "")]

    # 改過的物品：兩邊都有，比看得懂的欄位
    changed = {}
    for iid, f in fs.items():
        e = es.get(iid)
        if not e or fi.get(iid, {}).get("ClassID") not in KEEP_CLASS or JUNK.search(f.get("Display_lang") or ""):
            continue
        d = {}
        for k, col in (("q", "OverallQualityID"), ("il", "ItemLevel"), ("rl", "RequiredLevel"), ("b", "Bonding"), ("st", "Stackable")):
            if f[col] != e[col]:
                d[k] = [int(e[col]), int(f[col])]
        sf, se = stats(f), stats(e)
        if se and sf - se:            # 經典版本來就沒有屬性的（只有護甲）不比：編碼不同，會全部誤判成「新增屬性」
            d["+"] = sorted(int(x) for x in sf - se)
        if se and se - sf:
            d["-"] = sorted(int(x) for x in se - sf)
        if not se and sf and f["OverallQualityID"] != e["OverallQualityID"]:
            d["+"] = sorted(int(x) for x in sf)   # 品質升級又多了屬性（例如白裝變綠裝）
        if d:
            changed[iid] = d

    out = {"build": a.build, "era": a.era, "dungeons": dungeons, "items": items, "changed": changed}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"新副本 {len(dungeons)}、新物品 {len(items)}、改動 {len(changed)} → {a.out}（{os.path.getsize(a.out) // 1024} KB）")


if __name__ == "__main__":
    main()
