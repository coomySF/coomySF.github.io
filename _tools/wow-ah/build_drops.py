#!/usr/bin/env python3
"""把「裝備、配方在哪打」整理成 wow-ah/drops.json，給台服拍賣場的商品頁和「打裝賺錢」分頁用。遊戲改版時手動重跑。

資料來源：
  CMaNGOS classic-db（60 版伺服器資料）：怪物掉落表、怪物等級／階級、出生位置
  CMaNGOS item_template：物品分類與綁定（client 的 ItemSparse 缺很多舊物品）
  wago.tools 的 wowf client DB2：副本中文名、地區範圍（UiMapAssignment）與中文名
    client 沒有怪物的中文名稱 → 列進 _tools/wow-ah/drop-creatures.json，讓收集器用暴雪 API 補到 meta/creatures.json。
  掉落率是 60 版的數字，永恆若有調整會不準；永恆新加的副本（地圖 id 2000 以上）查不到。

用法：python3 build_drops.py --cache DIR --out ../../wow-ah/drops.json [--build 1.60.1.71091]
  --cache 跟 build_recipes.py 共用（classicdb.sql.gz、Item.csv、ItemSparse_zhTW.csv 已下載過就不重抓）

輸出：
  places {代號: [中文名, 類型]}   代號 "m地圖" = 副本（類型 5 人 / 團隊人數），"z地區" = 野外地區（類型 0）
  mobs {怪物: [英文名, 階級, 最低等級, 最高等級, 地點代號 or "", 出生數]}   階級 0 普通 1 精英 2 稀有精英 3 首領 4 稀有
  items {物品: [指定怪, 世界掉落 or null]}
    指定怪 [[怪物, 掉率‰], ...]   最多 6 隻、掉率高的在前；世界掉落的物品只點名掉率 1% 以上的
    世界掉落 [怪物數, 等級下限, 等級上限, [[地點, 佔比‰], ...], 平均幾隻掉一件]   一大群怪都會掉，列最常出現的地區
"""
import argparse
import collections
import csv
import json
import os

from build_recipes import fetch, db2, sql_rows, CMANGOS

WORLD_MIN = 25          # 超過這麼多隻怪會掉 → 當世界掉落
NAMED_MIN = 0.01        # 世界掉落裡掉率 1% 以上的怪另外點名（例如希利蘇斯的巨像 50%）
TOP_MOBS = 6
GEAR_CLASS = {"2", "4", "9"}   # 武器、護甲、配方
BOP = "1"


def group_probs(rows):
    """同一張掉落表的列 → {物品或 -參照: 機率}。群組裡掉率 0 的平分剩下的機率。"""
    out = collections.defaultdict(float)
    groups = collections.defaultdict(list)
    for item, chance, group, ref, maxc in rows:
        if chance < 0:
            continue                # 任務物品
        if group == 0:
            key = ref if ref < 0 else item   # 參照表用負號跟物品區分
            out[key] += chance / 100 * (max(1, maxc) if ref < 0 else 1)
        else:
            groups[group].append((item, chance, ref, maxc))
    for g in groups.values():
        fixed = sum(c for _, c, _, _ in g if c > 0)
        zero = [x for x in g if x[1] == 0]
        share = max(0.0, 100 - fixed) / len(zero) if zero else 0
        for item, c, ref, maxc in g:
            p = (c if c > 0 else share) / 100
            if ref < 0:
                out[ref] += p * max(1, maxc)
            else:
                out[item] += p
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--build", default="1.60.1.71091")
    a = ap.parse_args()
    os.makedirs(a.cache, exist_ok=True)
    B = a.build
    dump = fetch(CMANGOS, os.path.join(a.cache, "classicdb.sql.gz"))

    def table(name):
        t = collections.defaultdict(list)
        for r in sql_rows(dump, name):
            t[int(r[0])].append((int(r[1]), float(r[2]), int(r[3]), int(r[4]), int(r[5])))
        return t

    ref_rows, loot_rows = table("reference_loot_template"), table("creature_loot_template")
    memo = {}

    def expand(rows, depth=0):
        out = collections.defaultdict(float)
        for k, p in group_probs(rows).items():
            if k < 0:
                if depth < 4:
                    if -k not in memo:
                        memo[-k] = expand(ref_rows.get(-k, []), depth + 1)
                    for it, q in memo[-k].items():
                        out[it] += p * q
            else:
                out[k] += p
        return out

    mobs = {}
    for r in sql_rows(dump, "creature_template"):
        mobs[int(r[0])] = [r[1].replace("\\'", "'"), int(r[33]), int(r[3]), int(r[4]), int(r[56] or 0)]

    # ---- 出生位置 → 副本或野外地區 ----
    maps = {r["ID"]: r for r in db2(a.cache, B, "Map", "zhTW")}
    uimap = {r["ID"]: r["Name_lang"] for r in db2(a.cache, B, "UiMap", "zhTW")}
    # UiMapAssignment 是地圖畫面的長方形，鄰近地區會重疊（杜洛塔的框蓋到半個貧瘠之地、燃燒平原的框蓋到赤脊山北邊）
    # → 只落在一個框裡的怪先算出各地區的等級中位數；落在好幾個框的，選等級最接近的地區
    zones = []
    for r in db2(a.cache, B, "UiMapAssignment", "zhTW"):
        if r["AreaID"] == "0" or not uimap.get(r["UiMapID"]):
            continue                       # 大陸、世界地圖
        x0, y0, x1, y1 = (float(r[f"Region_{i}"]) for i in (0, 1, 3, 4))
        zones.append((r["MapID"], x0, y0, x1, y1, r["UiMapID"]))
    places = {}

    def candidates(map_id, x, y):
        m = maps.get(map_id)
        if m and m["InstanceType"] in ("1", "2"):
            key = "m" + map_id
            places.setdefault(key, [m["MapName_lang"], int(m["MaxPlayers"] or 5) or 5])
            return [key]
        return ["z" + u for mid, x0, y0, x1, y1, u in zones if mid == map_id and x0 <= x <= x1 and y0 <= y <= y1]

    raw = [(int(r[1]), candidates(r[2], float(r[4]), float(r[5]))) for r in sql_rows(dump, "creature")]
    lv = collections.defaultdict(list)
    for mob, c in raw:
        if len(c) == 1 and mob in mobs:
            lv[c[0]].append(mobs[mob][3])
    zone_lv = {z: sorted(v)[len(v) // 2] for z, v in lv.items()}
    spawn = collections.defaultdict(collections.Counter)
    for mob, c in raw:
        lvl = mobs[mob][3] if mob in mobs else 0
        pl = min(c, key=lambda z: abs(zone_lv.get(z, 99) - lvl)) if c else ""
        if pl.startswith("z"):
            places.setdefault(pl, [uimap[pl[1:]], 0])
        spawn[mob][pl] += 1

    # ---- 哪些物品要列 ----
    # client 的 ItemSparse 只收了一半的舊物品，分類和綁定改看 60 版的 item_template
    want = set()
    for r in sql_rows(dump, "item_template"):
        if r[1] in GEAR_CLASS and r[105] != BOP and int(r[5]) >= 2:
            want.add(int(r[0]))

    by_item = collections.defaultdict(list)
    for mob, (_, _, _, _, loot) in mobs.items():
        if not loot or loot not in loot_rows:
            continue
        for it, p in expand(loot_rows[loot]).items():
            if it in want and p > 0:
                by_item[it].append((mob, p))

    items, used = {}, set()
    for it, src in by_item.items():
        src.sort(key=lambda s: -s[1])
        world = len(src) > WORLD_MIN
        floor = NAMED_MIN if world else 0.0005
        named = [[m, max(1, round(p * 1000))] for m, p in src if p >= floor][:TOP_MOBS]
        used.update(m for m, _ in named)
        w = None
        if world:
            rest = [(m, p) for m, p in src if p < NAMED_MIN]
            lv = sorted(mobs[m][3] for m, _ in rest) or [0]
            z = collections.Counter()
            for m, p in rest:
                for pl, n in spawn[m].items():
                    if pl:
                        z[pl] += n * p
            tot = sum(z.values()) or 1
            ps = sorted(p for _, p in rest) or [1]
            w = [len(rest), lv[len(lv) // 10], lv[len(lv) * 9 // 10],
                 [[pl, round(v / tot * 1000)] for pl, v in z.most_common(4) if v / tot >= 0.05],
                 round(1 / ps[len(ps) // 2])]
        if named or w:
            items[it] = [named, w]

    out_mobs = {}
    for m in used:
        name, rank, lo, hi, _ = mobs[m]
        sp = spawn[m]
        pl = sp.most_common(1)[0][0] if sp else ""
        out_mobs[m] = [name, rank, lo, hi, pl, sum(sp.values())]
    used_places = {v[4] for v in out_mobs.values()} | {pl for _, w in items.values() if w for pl, _ in w[3]}
    out = {"build": B, "places": {k: v for k, v in places.items() if k in used_places},
           "mobs": out_mobs, "items": items}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    # 給收集器補怪物中文名
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "drop-creatures.json"), "w") as f:
        json.dump(sorted(out_mobs), f, separators=(",", ":"))
    w = sum(1 for _, v in items.values() if v)
    print("物品", len(items), "（世界掉落", w, "）怪物", len(out_mobs), "地點", len(out["places"]))


if __name__ == "__main__":
    main()
