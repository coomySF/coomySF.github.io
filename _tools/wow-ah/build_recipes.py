#!/usr/bin/env python3
"""把專業配方整理成 wow-ah/recipes.json，給「練專業划算嗎」頁面用。遊戲改版時手動重跑。

資料來源：
  wago.tools 的 wowf（魔獸世界：永恆）client DB2：配方材料、產物、黃／灰門檻、中文名稱、商店價
  CMaNGOS classic-db（60 版伺服器資料）：訓練師學費、學習所需技能（橘色門檻）、商店有賣的材料
    client 裡沒有學習技能和學費，這兩樣只能借 60 版的伺服器資料，永恆新加的配方查不到就略過。

用法：python3 build_recipes.py --cache /tmp/wowf --out ../../wow-ah/recipes.json [--build 1.60.1.71091]

輸出：
  build                 wowf client 版本
  profs {skill: [名稱, "craft"|"gather", 學費[學徒, 熟手, 專家, 大師]]}
  recipes [[spell, skill, 名稱, 學習, 黃, 灰, 來源, 學費, 產物, 產量, [[材料, 數量], ...], 每次升幾點, 冷卻小時]]
    來源 "t" 訓練師、"a" 學專業就會、"n" 永恆新配方（學法未知，學習等級記 0）、數字 = 配方物品 id
  items {id: [名稱, 品質, 商店收購價, 商店販售單價 or 0, 學習技能]}   材料、產物、配方物品、採集品
  gather {skill: [物品 id, ...]}  採集專業直接賣的原料
"""
import argparse
import collections
import csv
import gzip
import json
import os
import re
import urllib.request

WAGO = "https://wago.tools/db2/{t}/csv?build={b}{loc}"
CMANGOS = "https://github.com/cmangos/classic-db/raw/master/Full_DB/ClassicDB_1_12_1_z2815.sql.gz"

CRAFT = {164: "鍛造", 165: "製皮", 171: "鍊金術", 197: "裁縫", 202: "工程學", 333: "附魔", 185: "烹飪", 129: "急救"}
GATHER = {182: "草藥學", 186: "採礦", 393: "剝皮"}
# 採集品：物品分類 7（商品）的子類 9 草藥、7 金屬與石頭、6 皮革
GATHER_SUB = {182: {"9"}, 186: {"7"}, 393: {"6"}}
RANK_SKILL = [50, 125, 200]           # 熟手、專家、大師分別要 50／125／200 才能學
DEFAULT_FEES = [10, 500, 5000, 50000]
SOD_MIN, FOREVER_MIN = 1_200_000, 1_240_000   # 新法術 id 區段：121–123 萬是 SoD，124 萬起是永恆
EN_PROF = {"Blacksmithing": 164, "Leatherworking": 165, "Alchemy": 171, "Tailoring": 197, "Engineering": 202,
           "Enchanting": 333, "Cooking": 185, "First Aid": 129, "Herbalism": 182, "Mining": 186, "Skinning": 393}


def fetch(url, path):
    if not os.path.exists(path):
        print("下載", url)
        req = urllib.request.Request(url, headers={"User-Agent": "coomysf-wow-ah"})
        with urllib.request.urlopen(req, timeout=300) as r, open(path, "wb") as f:
            f.write(r.read())
    return path


def db2(cache, build, table, locale=""):
    loc = f"&locale={locale}" if locale else ""
    p = fetch(WAGO.format(t=table, b=build, loc=loc), os.path.join(cache, f"{table}{'_' + locale if locale else ''}.csv"))
    return list(csv.DictReader(open(p, encoding="utf-8")))


def sql_rows(path, table):
    pre = f"INSERT INTO `{table}` VALUES "
    tup = re.compile(r"\((.*?)\)(?=,\(|;\s*$)", re.S)
    val = re.compile(r"'(?:[^'\\]|\\.)*'|[^,]+")
    with gzip.open(path, "rt", encoding="utf-8", errors="replace") as f:
        for line in f:
            if line.startswith(pre):
                for m in tup.finditer(line[len(pre):].rstrip()):
                    yield [v.strip("'") for v in val.findall(m.group(1))]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--build", default="1.60.1.71091")
    a = ap.parse_args()
    os.makedirs(a.cache, exist_ok=True)
    B = a.build

    # ---- 60 版伺服器資料：學習技能、學費、商店 ----
    dump = fetch(CMANGOS, os.path.join(a.cache, "classicdb.sql.gz"))
    teaches, en = {}, {}              # 教學法術 → 學到的法術；法術英文名
    for r in sql_rows(dump, "spell_template"):
        en[r[0]] = r[119]
        for i in range(3):
            if r[61 + i] == "36":
                teaches[r[0]] = r[109 + i]
    trainer = {}                      # 法術 → (學費, 學習技能)
    fees = {k: list(DEFAULT_FEES) for k in list(CRAFT) + list(GATHER)}
    rank_cost = collections.defaultdict(dict)
    for r in list(sql_rows(dump, "npc_trainer")) + list(sql_rows(dump, "npc_trainer_template")):
        sp = teaches.get(r[1], r[1])
        cost, need = int(r[2]), int(r[4] or 0)
        if sp not in trainer or need < trainer[sp][1]:
            trainer[sp] = (cost, need)
        skill = EN_PROF.get(en.get(sp))   # 學到的法術就叫「Tailoring」這種 = 段位
        if skill:
            tier = ([0] + RANK_SKILL).index(need) if need in [0] + RANK_SKILL else None
            if tier is not None:
                prev = rank_cost[skill].get(tier)
                rank_cost[skill][tier] = cost if prev is None else min(prev, cost)
    for skill, tiers in rank_cost.items():
        for tier, cost in tiers.items():
            fees[skill][tier] = cost
    vendor = set()
    for r in list(sql_rows(dump, "npc_vendor")) + list(sql_rows(dump, "npc_vendor_template")):
        if r[2] == "0":               # maxcount 0 = 無限量
            vendor.add(r[1])

    # ---- 永恆 client ----
    sla = db2(a.cache, B, "SkillLineAbility")
    names = {r["ID"]: r["Name_lang"] for r in db2(a.cache, B, "SpellName", "zhTW")}
    reag = {r["SpellID"]: r for r in db2(a.cache, B, "SpellReagents")}
    eff = collections.defaultdict(list)
    for r in db2(a.cache, B, "SpellEffect"):
        eff[r["SpellID"]].append(r)
    cooldown = collections.defaultdict(int)   # 法術 → 冷卻毫秒（轉化這類一天只能做一次）
    for r in db2(a.cache, B, "SpellCooldowns"):
        cooldown[r["SpellID"]] = max(cooldown[r["SpellID"]], int(r["CategoryRecoveryTime"] or 0), int(r["RecoveryTime"] or 0))
    sparse = {r["ID"]: r for r in db2(a.cache, B, "ItemSparse", "zhTW")}
    icls = {r["ID"]: (r["ClassID"], r["SubclassID"]) for r in db2(a.cache, B, "Item")}
    ie = {r["ID"]: r["SpellID"] for r in db2(a.cache, B, "ItemEffect")}
    taught_by = {}                    # 配方法術 → 配方物品
    item_spells = collections.defaultdict(list)
    for r in db2(a.cache, B, "ItemXItemEffect"):
        item_spells[r["ItemID"]].append(ie.get(r["ItemEffectID"]))
    for item, spells in item_spells.items():
        if icls.get(item, ("",))[0] != "9" or item not in sparse:
            continue
        for sp in spells:
            if sp and any(e["Effect"] == "36" for e in eff.get(sp, [])):
                continue              # 「學習」本身
            if sp:
                taught_by.setdefault(sp, item)

    recipes, used = [], set()
    for r in sla:
        skill = int(r["SkillLine"])
        if skill not in CRAFT and skill != 186:
            continue
        sp = r["Spell"]
        yellow, grey = int(r["TrivialSkillLineRankLow"]), int(r["TrivialSkillLineRankHigh"])
        if not grey or grey < yellow:
            continue                  # 熔煉這類黃＝灰的（例如瑟銀 250/250）要留著
        rg = reag.get(sp)
        mats = []
        if rg:
            for i in range(8):
                it, n = rg[f"Reagent_{i}"], int(rg[f"ReagentCount_{i}"])
                if it != "0" and n > 0:
                    mats.append([int(it), n])
        if not mats:
            continue
        out, outn = None, 1
        for e in eff.get(sp, []):
            if e["Effect"] == "24" and e["EffectItemType"] != "0":
                out, outn = int(e["EffectItemType"]), max(1, round(float(e["EffectBasePointsF"] or 1)))
        if r["AcquireMethod"] == "3":
            continue                  # 永恆拿掉的舊配方（例如鍊金術的治療藥水改成急救做）
        if FOREVER_MIN > int(sp) >= SOD_MIN:
            continue                  # 探索賽季（SoD）的配方，client 共用但永恆沒有
        if r["AcquireMethod"] == "1":
            src, fee, learn = "a", 0, max(1, int(r["MinSkillLineRank"]))
        elif sp in trainer:
            src, (fee, learn) = "t", trainer[sp]
        elif sp in taught_by:
            it = taught_by[sp]
            src, fee, learn = int(it), 0, int(sparse[it]["RequiredSkillRank"] or 1)
        elif int(sp) >= FOREVER_MIN:
            src, fee, learn = "n", 0, 0   # 永恆新配方：client 有、但學法和學習等級查不到
        else:
            continue                  # 來源不明（沒開放）
        learn = max(1, min(learn, yellow)) if src != "n" else 0
        recipes.append([int(sp), skill, names.get(sp, ""), learn, yellow, grey, src, fee, out, outn, mats,
                        max(1, int(r["NumSkillUps"] or 1)), round(cooldown[sp] / 3_600_000, 1)])
        used.update(m[0] for m in mats)
        if out:
            used.add(out)
        if isinstance(src, int):
            used.add(src)

    gather = {}
    for skill, subs in GATHER_SUB.items():
        crafted = {rc[8] for rc in recipes if rc[8] and rc[1] != 186}
        ids = [int(i) for i, c in icls.items() if c[0] == "7" and c[1] in subs and i in sparse
               and int(i) not in crafted and sparse[i]["Display_lang"]]
        if skill == 186:
            ids += [rc[8] for rc in recipes if rc[1] == 186 and rc[8]]   # 熔煉出來的錠也算採礦
        gather[skill] = sorted(set(ids))
        used.update(gather[skill])

    items = {}
    for i in sorted(used):
        s = sparse.get(str(i))
        if not s:
            continue
        buy = int(s["BuyPrice"] or 0) // max(1, int(s["VendorStackCount"] or 1)) if str(i) in vendor else 0
        items[i] = [s["Display_lang"], int(s["OverallQualityID"] or 0), int(s["SellPrice"] or 0), buy,
                    int(s["RequiredSkillRank"] or 0)]

    profs = {k: [v, "craft", fees[k]] for k, v in CRAFT.items()}
    profs.update({k: [v, "gather", fees[k]] for k, v in GATHER.items()})
    recipes.sort(key=lambda x: (x[1], x[3], x[4]))
    out = {"build": B, "profs": profs, "recipes": recipes, "items": items, "gather": gather}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    # 給收集器補圖示用：這些物品不一定上過拍賣場
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "recipe-items.json"), "w") as f:
        json.dump(sorted(items), f, separators=(",", ":"))
    c = collections.Counter(rc[1] for rc in recipes)
    print("配方", {CRAFT.get(k, GATHER.get(k)): v for k, v in c.items()}, "物品", len(items),
          "採集", {GATHER[k]: len(v) for k, v in gather.items()})


if __name__ == "__main__":
    main()
