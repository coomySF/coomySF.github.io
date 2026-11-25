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
  places {代號: [中文名, 類型]}   "m地圖" = 副本（類型 = 人數），"z地區" = 野外地區、"a區域" = 釣魚區域（類型 0）
  mobs {怪物: [英文名, 階級, 最低等級, 最高等級, 地點代號 or "", 出生數]}   階級 0 普通 1 精英 2 稀有精英 3 首領 4 稀有
  items {物品: {來源: 資料}}，有哪種來源才有哪個 key：
    m  打怪 [[怪物, 掉率‰], ...]   裝備照掉率排；材料照「掉率 × 隻數」排（好刷的在前）
    w  世界掉落 [怪物數, 等級下限, 等級上限, [[地點, 佔比‰], ...], 平均幾隻掉一件]
    km / kw  剝皮，格式同 m / w
    g  採集點 [[名稱, 每點機率‰, 點數, [[地點, 佔比‰], ...]], ...]
    f  釣魚 [[區域, 機率‰], ...]
    v  商店 [賣的商人數, 單價（銅）, [[商人, 限量 1/0], ...]]   不同地點各挑一個，不限量的優先
    d  分解 [[品質, 物品等級下限, 上限, 機率‰], ...]
  gear {物品: [需求等級, 類別 2 武器／4 護甲, 子類, 部位]}   沒綁定的武器、護甲，商品頁顯示「誰能用」
  副本的 places 多兩欄：[中文名, 人數, 怪物等級下限, 上限]；採集點 g 多一欄：需要的採集技能（查不到是 null）
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
MAT_CLASS = {"5", "7"}         # 施法材料、商品
BOP = "1"


# 副本人數：client 的 MaxPlayers 是 60 版上限（5 人副本多寫 10），改照實際編制
PLAYERS = {229: 10, 249: 40, 309: 20, 409: 40, 469: 40, 509: 20, 531: 40, 533: 40}
CITIES = {"z1453", "z1454", "z1455", "z1456", "z1457", "z1458"}   # 暴風城、奧格瑪、鐵爐堡、雷霆崖、達納蘇斯、幽暗城
NODE_PREFIX = {"Ooze Covered ": "軟泥覆蓋的", "Rich ": "富", "Small ": "小", "Lesser ": "次級"}


def node_label(en, main_zh):
    """礦脈、草藥點的中文名：client 沒有，用主要產物的中文名拼（Rich Thorium Vein → 富瑟銀礦脈）"""
    if not main_zh:
        return en
    pre = next((zh for k, zh in NODE_PREFIX.items() if en.startswith(k)), "")
    if en.endswith(" Vein"):
        return pre + main_zh.replace("礦石", "") + "礦脈"
    if en.endswith(" Deposit"):
        return pre + main_zh.replace("礦石", "") + "礦床"
    if " " not in en or en.split()[-1] not in ("Chest", "Box", "Crate", "Cache", "Barrel", "Locker", "Trunk", "Coffer", "Footlocker", "Strongbox"):
        return pre + main_zh                         # 草藥點跟草藥同名
    return en


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

    ref_rows = table("reference_loot_template")
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
        # [英文名, 階級, 最低等級, 最高等級, 掉落表, 剝皮表, 商店模板, 陣營模板]
        mobs[int(r[0])] = [r[1], int(r[33]), int(r[3]), int(r[4]), int(r[56] or 0), int(r[58] or 0), int(r[76] or 0), int(r[9] or 0)]

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
        if m and m["InstanceType"] == "3":
            return []                          # 戰場（奧特蘭克山谷的苦工會掉符文布，但不是刷的地方）
        if m and m["InstanceType"] in ("1", "2"):
            key = "m" + map_id
            places.setdefault(key, [m["MapName_lang"], PLAYERS.get(int(map_id), 5)])
            return [key]
        return ["z" + u for mid, x0, y0, x1, y1, u in zones if mid == map_id and x0 <= x <= x1 and y0 <= y <= y1]

    def pick_central(map_id, x, y, cands):
        """採集點沒有等級可比，選點最靠近框中心的地區"""
        best, pick = 9.0, cands[0]
        for mid, x0, y0, x1, y1, u in zones:
            if mid == map_id and "z" + u in cands:
                d = max(abs(x - (x0 + x1) / 2) / ((x1 - x0) / 2), abs(y - (y0 + y1) / 2) / ((y1 - y0) / 2))
                if d < best:
                    best, pick = d, "z" + u
        return pick

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
        spawn[mob][pl] += 1
    for u in uimap:
        places.setdefault("z" + u, [uimap[u], 0])   # 用不到的最後會濾掉
    # 副本的建議等級：裡面怪的等級（取 10%–90% 分位，排掉少數高等首領／低等小動物）
    inst_lv = collections.defaultdict(list)
    for mob, c in raw:
        if len(c) == 1 and c[0].startswith("m") and mob in mobs and mobs[mob][1] >= 1:   # 只看精英以上（排掉老鼠）
            inst_lv[c[0]].append(mobs[mob][3])
    for k, v in inst_lv.items():
        v.sort()
        places[k] += [v[len(v) // 10], v[len(v) * 9 // 10]]

    # ---- 哪些物品要列 ----
    # 裝備、配方：沒綁定的綠色以上。材料：商品、施法材料，加上「練專業」頁用到的所有物品
    # client 的 ItemSparse 只收了一半的舊物品，分類、綁定、商店價改看 60 版的 item_template
    here = os.path.dirname(os.path.abspath(__file__))
    rec_items = set(json.load(open(os.path.join(here, "recipe-items.json"))))
    gear, mats, en_item, buy, de_of, gear_info = set(), set(), {}, {}, collections.defaultdict(list), {}
    for r in sql_rows(dump, "item_template"):
        i, cls, q = int(r[0]), r[1], int(r[5])
        en_item[i] = r[3]
        buy[i] = int(r[8]) // max(1, int(r[7] or 1))
        if cls in ("2", "4") and r[105] != BOP:
            gear_info[i] = [int(r[14]), int(cls), int(r[2]), int(r[10])]   # 需求等級、類別、子類、部位
        if cls in GEAR_CLASS and r[105] != BOP and q >= 2:
            gear.add(i)
        elif cls in MAT_CLASS or i in rec_items:
            mats.add(i)
        if int(r[122] or 0):
            de_of[int(r[122])].append((q, int(r[13])))
    want = gear | mats
    zh_item = {int(r["ID"]): r["Display_lang"] for r in db2(a.cache, B, "ItemSparse", "zhTW") if r["Display_lang"]}
    iname = lambda i: zh_item.get(i) or en_item.get(i, f"#{i}")

    def summarize(src, is_gear):
        """[(怪, 機率)] → (點名的怪, 世界掉落摘要)"""
        world = len(src) > WORLD_MIN
        if is_gear:
            src.sort(key=lambda s: -s[1])
            named = [[m, max(1, round(p * 1000))] for m, p in src if p >= (NAMED_MIN if world else 0.0005)][:TOP_MOBS]
            rest = [(m, p) for m, p in src if p < NAMED_MIN]
        else:   # 材料：照「好不好刷」排，掉率 × 隻數（最多算 50 隻）；單隻的特殊怪、主城守衛不點名
            n = lambda m: sum(spawn[m].values())
            src.sort(key=lambda s: -s[1] * min(50, n(s[0])))
            named = [[m, max(1, round(p * 1000))] for m, p in src
                     if p >= 0.01 and n(m) >= 3 and spawn[m].most_common(1)[0][0] not in CITIES | {""}][:TOP_MOBS]
            rest = src
        w = None
        if world and rest:
            lv = sorted(mobs[m][3] for m, _ in rest)
            z = collections.Counter()
            for m, p in rest:
                for pl, n in spawn[m].items():
                    if pl:
                        z[pl] += n * p
            tot = sum(z.values()) or 1
            ps = sorted(p for _, p in rest)
            w = [len(rest), lv[len(lv) // 10], lv[len(lv) * 9 // 10],
                 [[pl, round(v / tot * 1000)] for pl, v in z.most_common(4) if v / tot >= 0.05],
                 max(1, round(1 / ps[len(ps) // 2]))]
        return named, w

    items = collections.defaultdict(dict)
    used = set()

    def add_mobs(col, tid, key_named, key_world):
        rows = table(col)
        by = collections.defaultdict(list)
        for mob, rec in mobs.items():
            loot = rec[tid]
            if loot and loot in rows:
                for it, p in expand(rows[loot]).items():
                    if it in want and p > 0:
                        by[it].append((mob, p))
        for it, src in by.items():
            named, w = summarize(src, it in gear)
            if named:
                items[it][key_named] = named
                used.update(m for m, _ in named)
            if w:
                items[it][key_world] = w

    add_mobs("creature_loot_template", 4, "m", "w")
    add_mobs("skinning_loot_template", 5, "km", "kw")

    # ---- 採集點、寶箱（gameobject）----
    # 鎖：類型 2（技能鎖）的 Index 是哪種技能（2 草藥學、3 採礦），Skill 是需要幾點
    lock_skill = {}
    for r in db2(a.cache, B, "Lock"):
        for i in range(8):
            if r[f"Type_{i}"] == "2" and r[f"_Index_{i}"] in ("2", "3"):
                lock_skill[int(r["ID"])] = int(r[f"Skill_{i}"])
    go = {}
    for r in sql_rows(dump, "gameobject_template"):
        if r[1] == "3" and int(r[9] or 0):          # 類型 3 = 可以開的（礦脈、草藥、箱子），data0 = 鎖、data1 = 掉落表
            go[int(r[0])] = (r[3], int(r[9]), lock_skill.get(int(r[8] or 0)))
    go_rows = table("gameobject_loot_template")
    go_spawn = collections.defaultdict(collections.Counter)
    for r in sql_rows(dump, "gameobject"):
        gid = int(r[1])
        if gid in go:
            c = candidates(r[2], float(r[4]), float(r[5]))
            go_spawn[gid][c[0] if len(c) == 1 else (pick_central(r[2], float(r[4]), float(r[5]), c) if c else "")] += 1
    for gid, (name, loot, need) in go.items():
        if not go_spawn[gid] or loot not in go_rows:
            continue
        drops = expand(go_rows[loot])
        main_item = max(drops, key=lambda i: drops[i] if i in mats else -1, default=None)
        label = node_label(name, iname(main_item) if main_item else "")
        if label == name:
            continue                                  # 只留礦脈、草藥點；寶箱太零散
        n = sum(go_spawn[gid].values())
        for it, p in drops.items():
            if it in want and p >= 0.01:
                pl = [[k, round(v / n * 1000)] for k, v in go_spawn[gid].most_common(4) if k and v / n >= 0.05]
                items[it].setdefault("g", []).append([label, max(1, round(p * 1000)), n, pl, need])
    for v in items.values():
        if "g" in v:   # 同名的點合併（各地的錫礦脈是不同 id），出現最多的排前面
            merged = {}
            for label, pm, n, pl, need in v["g"]:
                if label in merged:
                    m = merged[label]
                    cnt = collections.Counter({k: s * m[2] for k, s in m[3]}) + collections.Counter({k: s * n for k, s in pl})
                    m[1] = max(m[1], pm)
                    m[2] += n
                    m[3] = [[k, round(c / m[2])] for k, c in cnt.most_common(4)]
                else:
                    merged[label] = [label, pm, n, pl, need]
            v["g"] = sorted(merged.values(), key=lambda x: -x[1] * x[2])[:4]

    # ---- 釣魚（掉落表的 key 是區域 id）----
    area = {r["ID"]: r["AreaName_lang"] for r in db2(a.cache, B, "AreaTable", "zhTW")}
    for aid, rows in table("fishing_loot_template").items():
        for it, p in expand(rows).items():
            if it in want and p >= 0.005 and area.get(str(aid)):
                key = "a" + str(aid)
                places.setdefault(key, [area[str(aid)], 0])
                items[it].setdefault("f", []).append([key, max(1, round(p * 1000))])
    for v in items.values():
        if "f" in v:
            v["f"] = sorted(v["f"], key=lambda x: -x[1])[:5]

    # ---- 商店 ----
    # 這是聯盟拍賣場：部落陣營的商人不列（FactionGroup 4 = 部落，EnemyGroup 2 = 跟聯盟敵對）
    horde_ft = {int(r["ID"]) for r in db2(a.cache, B, "FactionTemplate")
                if int(r["FactionGroup"]) & 4 or int(r["EnemyGroup"]) & 2}
    sellers = collections.defaultdict(list)            # 物品 → [(商人, 限量?)]
    vt = collections.defaultdict(list)
    for r in sql_rows(dump, "npc_vendor_template"):
        vt[int(r[0])].append((int(r[1]), r[2] != "0"))
    for r in sql_rows(dump, "npc_vendor"):
        if int(r[1]) in want:
            sellers[int(r[1])].append((int(r[0]), r[2] != "0"))
    for mob, rec in mobs.items():
        for it, lim in vt.get(rec[6], []):
            if it in want:
                sellers[it].append((mob, lim))
    for it, ss in sellers.items():
        ss = [(m, lim) for m, lim in ss if spawn[m] and mobs[m][7] not in horde_ft]
        if not ss:
            continue
        ss.sort(key=lambda x: x[1])                     # 不限量的優先
        seen, pick = set(), []
        for m, lim in ss:
            pl = spawn[m].most_common(1)[0][0]
            if pl not in seen:
                seen.add(pl)
                pick.append([m, int(lim)])
            if len(pick) == 4:
                break
        items[it]["v"] = [len({m for m, _ in ss}), buy.get(it, 0), pick]
        used.update(m for m, _ in pick)

    # ---- 分解（附魔材料）：哪種品質、物品等級的裝備分解得到 ----
    for de, rows in table("disenchant_loot_template").items():
        src = de_of.get(de)
        if not src:
            continue
        q = collections.Counter(x[0] for x in src).most_common(1)[0][0]
        lv = sorted(x[1] for x in src)
        for it, p in expand(rows).items():
            if it in want and p > 0:
                items[it].setdefault("d", []).append([q, lv[0], lv[-1], max(1, round(min(1, p) * 1000))])
    for v in items.values():
        if "d" in v:   # 同一段裝備（武器、護甲分開兩張表）取機率高的
            best = {}
            for q, lo, hi, pm in v["d"]:
                best[(q, lo, hi)] = max(pm, best.get((q, lo, hi), 0))
            v["d"] = sorted(([*k, pm] for k, pm in best.items()), key=lambda x: (-x[3], x[1]))[:4]

    out_mobs = {}
    for m in used:
        name, rank, lo, hi = mobs[m][:4]
        sp = spawn[m]
        out_mobs[m] = [name, rank, lo, hi, sp.most_common(1)[0][0] if sp else "", sum(sp.values())]
    used_places = {v[4] for v in out_mobs.values()}
    for v in items.values():
        for k in ("w", "kw"):
            if k in v:
                used_places |= {pl for pl, _ in v[k][3]}
        used_places |= {pl for g in v.get("g", []) for pl, _ in g[3]} | {pl for pl, _ in v.get("f", [])}
    out = {"build": B, "places": {k: v for k, v in places.items() if k in used_places},
           "mobs": out_mobs, "items": {k: v for k, v in sorted(items.items()) if v}, "gear": gear_info}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    # 給收集器補怪物中文名
    with open(os.path.join(here, "drop-creatures.json"), "w") as f:
        json.dump(sorted(out_mobs), f, separators=(",", ":"))
    c = collections.Counter(k for v in out["items"].values() for k in v)
    print("物品", len(out["items"]), dict(c), "怪物", len(out_mobs), "地點", len(out["places"]))


if __name__ == "__main__":
    main()
