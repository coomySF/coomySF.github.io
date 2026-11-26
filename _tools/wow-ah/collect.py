#!/usr/bin/env python3
"""魔獸永恆台灣拍賣場收集器。

每次執行：抓暴雪最新快照 → 跟上一份比對推算成交 → 寫出 dashboard 讀的 JSON。
成交推算照 auctionhouse.tk.gg 公開的 method 2：可能過期的單一律不算成交，寧可少算。

輸出（--data 指向 ah-data 分支的工作目錄）：
  status.json                  每個拍賣場最後一次快照的摘要
  meta/items.json              商品名稱、品質、分類、圖示
  meta/creatures.json          怪物中文名（「去哪裡打」用，名單來自 build_drops.py 的 drop-creatures.json）
  {house}/overview.json        總覽：每個商品的現價、7 日均價、24 小時量
  {house}/h/{shard}.json       每小時明細（最近 7 天）＋星期×小時熱圖累積
  {house}/d/{shard}.json       日 K（台北時間切日，永久保留）
  {house}/index.json           類別物價指數（草藥、礦石、布料…，開始收集那一小時 = 100）
  state/{house}/prev.json      上一份快照的掛單，用來比對
  state/{house}/misc.json      今日 K 線、參考成交價、最後成交、通知狀態
"""
import argparse
import base64
import collections
import email.utils
import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

REGION = "tw"
RULESET = 2
# 永恆台服有資料的拍賣場（兩組伺服器 × 聯盟／部落／黑水灣；id 是全域的，跟網址裡的 ruleset 無關）
# A 組：110 聯盟、113 部落、116 黑水灣；B 組：111 聯盟、114 部落、117 黑水灣（哪組是 PvP／PvE 待確認）
HOUSES = {"tw-110": 110, "tw-113": 113, "tw-116": 116, "tw-111": 111, "tw-114": 114, "tw-117": 117}
API = f"https://{REGION}.api.blizzard.com"
DYN_NS = f"dynamic-forever-{REGION}"
STATIC_NS = [f"static-forever-{REGION}", f"static-classic1x-{REGION}", f"static-classic-{REGION}"]
LOCALE = "zh_TW"
TPE = timezone(timedelta(hours=8))
HOUR = 3_600_000
DAY = 24 * HOUR
HIST_MS = 7 * DAY
MAX_GAP_H = 2.5
SHARDS = 128
META_PER_RUN = 1200
META_RETRY_MS = 7 * DAY

# 每小時明細欄位
HF = ["ask", "listed", "depth5", "sold", "value", "sure", "added", "cancelled", "expired"]
# 總覽欄位
OF = ["ask", "ask2", "listed", "listings", "depth5", "median", "open24", "avg7", "avg30",
      "vol24", "value24", "added24", "cancelled24", "expired24", "sure24", "vol7", "flowHours",
      "lastSoldT", "lastSoldP"]
# 日 K 欄位
DF = ["d", "open", "high", "low", "close", "vol", "value", "listed", "hours", "sure"]
# 物價指數的類別：[代號, 名稱, 篩選用類別, 子類們]
INDEX_CATS = [
    ["herb", "草藥", "商品", ["草藥"]],
    ["metal", "礦石和金屬錠", "商品", ["金屬與石頭"]],
    ["cloth", "布料", "商品", ["布料"]],
    ["leather", "皮革", "商品", ["皮革"]],
    ["ench", "附魔材料", "商品", ["附魔"]],
    ["elem", "元素材料", "商品", ["元素材料"]],
    ["potion", "藥水", "消耗品", ["藥水", "藥劑"]],
    # 指定商品的籃子（第 5 欄＝物品 id）：可以跟上面的類別重疊，「整體」不重複算
    ["pvp", "PvP 戰場消耗品", "", [], [
        5634, 3387, 13446, 3928, 13444, 14530, 14529, 8545, 2459, 20004, 13452,   # 自由行動、有限無敵、治療／法力、繃帶、迅捷、巨魔之血、貓鼬
        15993, 4390, 18641, 10562,                                              # 手榴彈、炸藥
    ]],
]
INDEX_KEEP_MS = 30 * DAY
INDEX_MIN_SOLD = 5        # 7 天內至少推算成交這麼多件才放進籃子，避免冷門貨亂跳
INDEX_CLIP = (0.5, 2.0)   # 單一商品一小時的漲跌幅上限，擋掉惡意掛價
INDEX_MAX_SHARE = 0.2     # 單一商品最多佔類別權重 20%，指數才代表整個類別

# 剩餘時間區間的下限（小時）：間隔超過下限就「可能已過期」
TL_MIN_LEFT = {"SHORT": 0, "MEDIUM": 0.5, "LONG": 2, "VERY_LONG": 12}


# ---------- HTTP ----------

def http(url, headers=None, data=None, retries=3, timeout=60, method=None):
    for attempt in range(retries):
        req = urllib.request.Request(url, headers=headers or {}, data=data, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read(), r.headers
        except urllib.error.HTTPError as e:
            if e.code in (304, 404):
                return e.code, b"", e.headers
            if e.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            raise


def get_token():
    cid, sec = os.environ["BLIZZARD_CLIENT_ID"], os.environ["BLIZZARD_CLIENT_SECRET"]
    auth = base64.b64encode(f"{cid}:{sec}".encode()).decode()
    _, body, _ = http("https://oauth.battle.net/token",
                      {"Authorization": f"Basic {auth}", "Content-Type": "application/x-www-form-urlencoded"},
                      b"grant_type=client_credentials")
    return json.loads(body)["access_token"]


def api(token, path, ns, since_ms=None, quick=False):
    q = urllib.parse.urlencode({"namespace": ns, "locale": LOCALE})
    h = {"Authorization": f"Bearer {token}"}
    if since_ms:
        h["If-Modified-Since"] = email.utils.formatdate(since_ms / 1000, usegmt=True)
    status, body, headers = http(f"{API}{path}?{q}", h, timeout=30 if quick else 60)
    lm = headers.get("Last-Modified") if headers else None
    lm_ms = int(email.utils.parsedate_to_datetime(lm).timestamp() * 1000) if lm else None
    return status, (json.loads(body) if status == 200 else None), lm_ms


# ---------- 檔案 ----------

def read_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)


def shard_of(item_id):
    return int(item_id) % SHARDS


# ---------- 快照 → 掛單簿 ----------

def parse_snapshot(house_json, commod_json):
    """回傳 {auction_id: [item, qty, unit_price|None, time_left, nc]}"""
    out = {}
    for a in (commod_json or {}).get("auctions", []):
        out[str(a["id"])] = [a["item"]["id"], a["quantity"], a.get("unit_price"), a.get("time_left"), 0]
    for a in (house_json or {}).get("auctions", []):
        qty = a.get("quantity") or 1
        buyout = a.get("buyout")
        unit = buyout // qty if buyout else None
        out[str(a["id"])] = [a["item"]["id"], qty, unit, a.get("time_left"), 1]
    return out


def book_stats(snap):
    """每個商品的現價、第二檔、掛單量、5% 深度、加權中位價。"""
    by_item = {}
    for item, qty, unit, _tl, nc in snap.values():
        e = by_item.setdefault(item, {"levels": {}, "listed": 0, "listings": 0, "nc": nc})
        e["listed"] += qty
        e["listings"] += 1
        if unit:
            e["levels"][unit] = e["levels"].get(unit, 0) + qty
    stats = {}
    for item, e in by_item.items():
        prices = sorted(e["levels"])
        ask = prices[0] if prices else None
        ask2 = prices[1] if len(prices) > 1 else None
        depth5 = sum(q for p, q in e["levels"].items() if ask and p <= ask * 1.05)
        median = None
        total = sum(e["levels"].values())
        if total:
            half, run = total / 2, 0
            for p in prices:
                run += e["levels"][p]
                if run >= half:
                    median = p
                    break
        stats[item] = {"ask": ask, "ask2": ask2, "listed": e["listed"], "listings": e["listings"],
                       "depth5": depth5, "median": median, "nc": e["nc"]}
    return stats


# ---------- 成交推算 ----------

def infer_flows(prev, cur, gap_h, ref_price):
    """比對兩份快照，回傳 {item: {sold, value, sure, added, cancelled, expired, hi, lo}}。"""
    flows = {}

    def f(item):
        return flows.setdefault(item, {"sold": 0, "value": 0, "sure": 0, "added": 0,
                                       "cancelled": 0, "expired": 0, "hi": None, "lo": None})

    def trade(e, unit, qty, sure):
        e["sold"] += qty
        e["value"] += unit * qty
        if sure:
            e["sure"] += qty
        e["hi"] = unit if e["hi"] is None else max(e["hi"], unit)
        e["lo"] = unit if e["lo"] is None else min(e["lo"], unit)

    prev_by_item = {}
    for aid, a in prev.items():
        prev_by_item.setdefault(a[0], []).append((aid, a))

    for item, aucs in prev_by_item.items():
        e = f(item)
        partial_max = None
        survivor_min = None
        vanished = []
        for aid, (_, qty, unit, tl, nc) in aucs:
            c = cur.get(aid)
            if c is None:
                vanished.append((qty, unit, tl, nc))
                continue
            if unit is not None:
                survivor_min = unit if survivor_min is None else min(survivor_min, unit)
            if not nc and c[1] < qty and unit is not None:
                trade(e, unit, qty - c[1], True)
                partial_max = unit if partial_max is None else max(partial_max, unit)
        ref = ref_price.get(str(item))
        for qty, unit, tl, nc in vanished:
            if unit is None:  # 只有競標價，無從判斷
                if TL_MIN_LEFT.get(tl, 0) < gap_h:
                    e["expired"] += qty
                else:
                    e["cancelled"] += qty
                continue
            if not nc and partial_max is not None and unit <= partial_max:
                trade(e, unit, qty, True)  # 便宜的先被吃掉：確認成交
            elif TL_MIN_LEFT.get(tl, 0) < gap_h:
                e["expired"] += qty  # 可能是時間到，一律不算成交
            elif (survivor_min is None or unit <= survivor_min) and (ref is None or unit <= ref * 3):
                trade(e, unit, qty, False)  # 時間還沒到、又是最便宜的那檔：估計成交
            else:
                e["cancelled"] += qty

    for aid, (item, qty, *_rest) in cur.items():
        if aid not in prev:
            f(item)["added"] += qty
    return flows


# ---------- 歷史 ----------

def load_hist(house_dir):
    """把 128 個每小時分片讀回成一份：{t: [...], items: {id: cols}, hm: {id: [...]}}"""
    t, items, hm = [], {}, {}
    for s in range(SHARDS):
        sh = read_json(os.path.join(house_dir, "h", f"{s}.json"))
        if not sh:
            continue
        if len(sh["t"]) > len(t):
            t = sh["t"]
        for iid, rec in sh["items"].items():
            items[iid] = rec["h"]
            hm[iid] = rec["hm"]
    # 各分片的時間軸可能不一樣長（新增的分片），補齊到同一條時間軸
    for iid, cols in items.items():
        pad = len(t) - len(cols[0])
        if pad > 0:
            items[iid] = [[None] * pad + c for c in cols]
    return {"t": t, "items": items, "hm": hm}


def mean(xs):
    xs = [x for x in xs if x is not None]
    return round(sum(xs) / len(xs)) if xs else None


def tpe_day(ms):
    d = datetime.fromtimestamp(ms / 1000, TPE).replace(hour=0, minute=0, second=0, microsecond=0)
    return int(d.timestamp() * 1000)


def heat_idx(ms):
    d = datetime.fromtimestamp(ms / 1000, TPE)
    return d.weekday() * 24 + d.hour


# ---------- 類別物價指數 ----------

def update_index(hdir, hist, meta, cur_t):
    """鏈式指數：每一小時跟上一小時比，用成交金額加權的幾何平均，接在前一個值後面。

    權重＝商品 7 天平均價 × (7 天推算成交量 + 1)，每小時重算；籃子只放 7 天內有一定成交的商品。
    第一次執行時用手上的 7 天明細往回補。
    """
    path = os.path.join(hdir, "index.json")
    idx = read_json(path) or {"base": None, "t": [], "v": {}, "d": {}}
    idx["cats"] = [[c[0], c[1], c[2], c[3]] + ([c[4]] if len(c) > 4 else []) for c in INDEX_CATS]   # 新增類別時舊檔也跟著更新；指定籃子附物品 id
    keys = [c[0] for c in INDEX_CATS] + ["all"]
    for k in keys:   # 新類別：前面補 100，長度跟時間軸對齊
        idx["v"].setdefault(k, [100.0] * len(idx["t"]))
    cat_of, picked = {}, collections.defaultdict(list)
    for c in INDEX_CATS:
        for sub in c[3]:
            cat_of[(c[2], sub)] = c[0]
        for i in (c[4] if len(c) > 4 else []):
            picked[str(i)].append(c[0])
    # 籃子：(類別, 商品) 一筆；同一個商品可以在分類籃子和指定籃子各出現一次，「整體」只算分類那筆
    basket = []
    for iid, cols in hist["items"].items():
        m = meta.get(iid)
        cats = ([cat_of[(m[2], m[3])]] if m and (m[2], m[3]) in cat_of else []) + picked.get(iid, [])
        if not cats:
            continue
        asks = [a for a in cols[0] if a]
        sold = sum(x for x in cols[3] if x)
        if asks and sold >= INDEX_MIN_SOLD:
            w = (sum(asks) / len(asks)) * (sold + 1)
            for k, cat in enumerate(cats):
                basket.append((cat, cols[0], w, k == 0 and cat not in picked.get(iid, [])))
    tot = collections.Counter()
    for cat, _, w, _ in basket:
        tot[cat] += w
    basket = [(cat, a, min(w, tot[cat] * INDEX_MAX_SHARE), in_all) for cat, a, w, in_all in basket]
    T = hist["t"]
    last_t = idx["t"][-1] if idx["t"] else None
    if last_t is None and T:
        idx["base"] = T[0]
        idx["t"] = [T[0]]
        for k in keys:
            idx["v"][k] = [100.0]
        last_t = T[0]
    for j in range(1, len(T)):
        if T[j] <= last_t:
            continue
        acc = {k: [0.0, 0.0] for k in keys}
        for cat, asks, w, in_all in basket:
            a0, a1 = asks[j - 1], asks[j]
            if not a0 or not a1:
                continue
            r = math.log(min(INDEX_CLIP[1], max(INDEX_CLIP[0], a1 / a0)))
            for k in ((cat, "all") if in_all else (cat,)):
                acc[k][0] += w * r
                acc[k][1] += w
        idx["t"].append(T[j])
        for k in keys:
            prev = idx["v"].setdefault(k, [100.0] * (len(idx["t"]) - 1))[-1]
            step = math.exp(acc[k][0] / acc[k][1]) if acc[k][1] else 1.0
            idx["v"][k].append(round(prev * step, 2))
        last_t = T[j]
    # 只留 30 天小時值；日收盤（台北時間）永久留
    cut = next((i for i, t in enumerate(idx["t"]) if t >= cur_t - INDEX_KEEP_MS), 0)
    if cut:
        idx["t"] = idx["t"][cut:]
        for k in keys:
            idx["v"][k] = idx["v"][k][cut:]
    day = tpe_day(cur_t)
    for k in keys:
        d = idx["d"].setdefault(k, [])
        if d and d[-1][0] == day:
            d[-1][1] = idx["v"][k][-1]
        else:
            d.append([day, idx["v"][k][-1]])
    idx["n"] = {k: sum(1 for b in basket if b[0] == k or (k == "all" and b[3])) for k in keys}
    write_json(path, idx)


# ---------- 商品資料 ----------

def fetch_meta(token, ids, meta, misses, now_ms):
    todo = [i for i in ids if str(i) not in meta and misses.get(str(i), 0) < now_ms][:META_PER_RUN]
    if not todo:
        return 0

    def one(item_id):
        for ns in STATIC_NS:
            status, it, _ = api(token, f"/data/wow/item/{item_id}", ns)
            if status != 200:
                continue
            icon = None
            st, media, _ = api(token, f"/data/wow/media/item/{item_id}", ns)
            if st == 200:
                for a in media.get("assets", []):
                    if a.get("key") == "icon":
                        icon = a["value"]
            return item_id, [it.get("name"), (it.get("quality") or {}).get("type"),
                             (it.get("item_class") or {}).get("name"), (it.get("item_subclass") or {}).get("name"),
                             it.get("level"), it.get("sell_price"), it.get("purchase_price"), icon]
        return item_id, None

    got = 0
    with ThreadPoolExecutor(max_workers=16) as ex:
        for item_id, rec in ex.map(one, todo):
            if rec:
                meta[str(item_id)] = rec
                got += 1
            else:
                misses[str(item_id)] = now_ms + META_RETRY_MS
    return got


CRE_PER_RUN = 400
CRE_BUDGET_S = 240


def fetch_creatures(token, ids, names, misses, now_ms):
    """怪物中文名：client 沒有，只能問暴雪 API。查不到的一週後再試。
    這個 API 很慢（一次幾秒、常常逾時），每次最多 400 隻、4 分鐘，剩下的留到下一輪。"""
    todo = [i for i in ids if str(i) not in names and misses.get(f"k{i}", 0) < now_ms][:CRE_PER_RUN]   # k：2026-11-25 改版前的 c 記錄作廢重查
    deadline = time.time() + CRE_BUDGET_S

    errs = collections.Counter()

    def one(cid):
        if time.time() > deadline:
            return cid, False                 # 沒時間了，下一輪再查
        for ns in STATIC_NS:
            try:
                status, c, _ = api(token, f"/data/wow/creature/{cid}", ns, quick=True)
            except urllib.error.HTTPError as e:
                errs[f"http{e.code}"] += 1
                return cid, False
            except Exception as e:
                errs[type(e).__name__] += 1
                return cid, False
            errs[f"s{status}"] += 1
            if status == 200 and c.get("name"):
                return cid, c["name"]
        return cid, None

    got = 0
    with ThreadPoolExecutor(max_workers=6) as ex:   # 開太多會被 429 擋
        for cid, name in ex.map(one, todo):
            if name:
                names[str(cid)] = name
                got += 1
            elif name is None:
                misses[f"k{cid}"] = now_ms + META_RETRY_MS
    print(f"creatures: tried {len(todo)}, results {dict(errs)}")
    return got


# ---------- Discord 通知 ----------

def gold(c):
    if c is None:
        return "—"
    g, s = divmod(int(c), 10000)
    s, cp = divmod(s, 100)
    return f"{g}g{s:02d}s" if g else f"{s}s{cp:02d}c"


def check_alerts(watch, overview_rows, meta, misc, house):
    hook = os.environ.get("DISCORD_WEBHOOK_URL")
    rules = [r for r in (watch or {}).get("items", []) if r.get("house", house) == house]
    if not rules:
        return
    state = misc.setdefault("alerts", {})
    msgs = []
    for r in rules:
        iid = str(r["id"])
        row = overview_rows.get(iid)
        ask = row[0] if row else None
        avg7 = row[OF.index("avg7")] if row else None
        name = (meta.get(iid) or [None])[0] or f"#{iid}"
        for kind, thr, cmp in (("below", r.get("below"), lambda a, t: a <= t),
                               ("above", r.get("above"), lambda a, t: a >= t)):
            if thr is None:
                continue
            key = f"{iid}:{kind}"
            hit = ask is not None and cmp(ask, round(thr * 10000))
            if hit and not state.get(key):
                arrow = "📉 跌破" if kind == "below" else "📈 突破"
                note = f"（{r['note']}）" if r.get("note") else ""
                msgs.append(f"{arrow} **{name}** 現價 {gold(ask)}，門檻 {gold(round(thr * 10000))}，"
                            f"7 日均 {gold(avg7)}{note}")
            state[key] = bool(hit)
    if msgs and hook:
        body = json.dumps({"username": "台灣拍賣場", "content": "\n".join(msgs)[:1900]}).encode()
        try:
            http(hook, {"Content-Type": "application/json", "User-Agent": "coomysf-wow-ah"}, body, retries=2)
        except Exception as e:  # 通知失敗不影響資料
            print("discord failed:", e, file=sys.stderr)
    for m in msgs:
        print("alert:", m)


SITE = "https://coomysf.github.io/wow-ah/"
HOUSE_LABEL = {"tw-110": "PvE 聯盟", "tw-113": "PvE 部落", "tw-116": "PvE 黑水灣", "tw-111": "PvP 聯盟", "tw-114": "PvP 部落", "tw-117": "PvP 黑水灣"}


def push_user_alerts(overview_rows, meta, house):
    """玩家自己設的 Discord 推播（存在 Supabase，網頁 #/alerts 設定）。沒設 SUPABASE_* 就略過。
    同一個方向只通知一次，價格離開門檻後才會再通知。"""
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        return
    h = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    try:
        _, body, _ = http(f"{url}/rest/v1/wowah_push_alerts?house=eq.{house}&select=uid,item_id,hi,lo,last_kind,wowah_subs(webhook,discord_id,tier,supporter_until)", h)
        rules = json.loads(body)
    except Exception as e:
        print(f"::warning::push alerts: {e}")
        return
    out = collections.defaultdict(list)      # ("dm", Discord ID) 或 ("hook", webhook) → 訊息
    bot = os.environ.get("DISCORD_BOT_TOKEN")
    changes = []
    for r in rules:
        row = overview_rows.get(str(r["item_id"]))
        ask = row[0] if row else None
        kind = None
        if ask is not None and r["hi"] is not None and ask >= r["hi"]:
            kind = "sell"
        elif ask is not None and r["lo"] is not None and ask <= r["lo"]:
            kind = "buy"
        if kind == r["last_kind"]:
            continue
        changes.append((r["uid"], r["item_id"], kind))
        sub = r.get("wowah_subs") or {}
        # 有 Discord 登入就由機器人私訊，否則用玩家自己貼的 webhook；公會方案兩邊都送（webhook＝公會頻道）
        dests = []
        if bot and sub.get("discord_id"):
            dests.append(("dm", sub["discord_id"]))
        if sub.get("webhook") and (not dests or sub.get("tier") == "guild"):
            dests.append(("hook", sub["webhook"]))
        if kind and dests:
            name = (meta.get(str(r["item_id"])) or [None])[0] or f"#{r['item_id']}"
            msg = (f"{'📈' if kind == 'sell' else '📉'} 【{HOUSE_LABEL.get(house, house)}】**{name}** 現價 {gold(ask)}，"
                             f"{'漲到你設的 ' + gold(r['hi']) + ' 以上：可以掛賣了' if kind == 'sell' else '跌到你設的 ' + gold(r['lo']) + ' 以下：可以進貨了'}"
                             f"\n{SITE}?h={house}#/item/{r['item_id']}")
            for d in dests:
                out[d].append(msg)
    sent = 0
    for (how, target), msgs in out.items():
        content = "\n".join(msgs)[:1900]
        try:
            if how == "dm":
                bh = {"Authorization": f"Bot {bot}", "Content-Type": "application/json", "User-Agent": "coomysf-wow-ah (https://coomysf.github.io, 1)"}
                _, body, _ = http("https://discord.com/api/v10/users/@me/channels", bh, json.dumps({"recipient_id": target}).encode(), retries=2, timeout=15)
                ch = json.loads(body)["id"]
                http(f"https://discord.com/api/v10/channels/{ch}/messages", bh,
                     json.dumps({"content": content, "allowed_mentions": {"parse": []}}).encode(), retries=2, timeout=15)
            else:
                http(target, {"Content-Type": "application/json", "User-Agent": "coomysf-wow-ah"},
                     json.dumps({"username": "台灣拍賣場到價提醒", "content": content, "allowed_mentions": {"parse": []}}).encode(), retries=2, timeout=15)
            sent += 1
        except Exception as e:   # 單一玩家私訊關掉或 webhook 壞掉不影響別人（Discord 50007＝對方不收私訊）
            print(f"push failed ({how}): {type(e).__name__} {getattr(e, 'code', '')}")
    for uid, item_id, kind in changes:
        try:
            http(f"{url}/rest/v1/wowah_push_alerts?uid=eq.{uid}&house=eq.{house}&item_id=eq.{item_id}",
                 {**h, "Prefer": "return=minimal"}, json.dumps({"last_kind": kind}).encode(), method="PATCH")
        except Exception as e:
            print(f"::warning::push state: {type(e).__name__}")
    print(f"push: {len(rules)} rules, {len(changes)} changed, {sent} sent")


# ---------- 主流程 ----------

def run_house(token, key, house_id, data, meta, misses, watch, now_ms, force):
    hdir = os.path.join(data, key)
    sdir = os.path.join(data, "state", key)
    prev_doc = read_json(os.path.join(sdir, "prev.json"), {"t": None, "auctions": {}})
    misc = read_json(os.path.join(sdir, "misc.json"), {"today": {}, "ref": {}, "last": {}, "alerts": {}})
    prev_t = prev_doc["t"]

    base = f"/data/wow/ruleset/{RULESET}/auctions/{house_id}"
    st_c, commod, lm_c = api(token, base + "/commodities", DYN_NS, None if force else prev_t)
    if st_c == 304:
        print(f"{key}: no new snapshot since {prev_t}")
        return None
    st_h, house, lm_h = api(token, base, DYN_NS)
    if st_c != 200 or st_h != 200:
        raise RuntimeError(f"{key}: HTTP commodities={st_c} house={st_h}")
    cur_t = max([x for x in (lm_c, lm_h) if x] or [now_ms])
    if prev_t and cur_t <= prev_t and not force:
        print(f"{key}: snapshot {cur_t} not newer than {prev_t}")
        return None

    cur = parse_snapshot(house, commod)
    stats = book_stats(cur)
    gap_h = (cur_t - prev_t) / HOUR if prev_t else None
    flows_ok = gap_h is not None and 0 < gap_h <= MAX_GAP_H
    if flows_ok:
        # 沒有近期成交價的商品，用上一份快照的中位掛價當「3 倍」規則的參考
        ref = {str(i): st["median"] for i, st in book_stats(prev_doc["auctions"]).items() if st["median"]}
        ref.update(misc["ref"])
        flows = infer_flows(prev_doc["auctions"], cur, gap_h, ref)
    else:
        flows = {}

    # --- 每小時明細 ---
    hist = load_hist(hdir)
    hist["t"].append(cur_t)
    n = len(hist["t"])
    ids = set(hist["items"]) | {str(i) for i in stats} | {str(i) for i in flows}
    for iid in ids:
        cols = hist["items"].setdefault(iid, [[None] * (n - 1) for _ in HF])
        s = stats.get(int(iid))
        fl = flows.get(int(iid))
        row = {
            "ask": s["ask"] if s else None,
            "listed": s["listed"] if s else 0,
            "depth5": s["depth5"] if s else 0,
        }
        for k in ("sold", "value", "sure", "added", "cancelled", "expired"):
            row[k] = (fl[k] if fl else 0) if flows_ok else None
        for i, k in enumerate(HF):
            cols[i].append(row[k])
    # 丟掉 7 天以前的小時
    cut = next((i for i, t in enumerate(hist["t"]) if t >= cur_t - HIST_MS), 0)
    if cut:
        hist["t"] = hist["t"][cut:]
        for iid in list(hist["items"]):
            hist["items"][iid] = [c[cut:] for c in hist["items"][iid]]
    # 7 天內完全沒掛單也沒成交的商品拿掉
    for iid in list(hist["items"]):
        cols = hist["items"][iid]
        if all(a is None for a in cols[0]) and not any(cols[3][i] for i in range(len(cols[3]))):
            del hist["items"][iid]
            hist["hm"].pop(iid, None)

    # --- 參考成交價、最後成交 ---
    for item, fl in flows.items():
        if fl["sold"]:
            p = round(fl["value"] / fl["sold"])
            misc["ref"][str(item)] = p
            misc["last"][str(item)] = [cur_t, p]

    # --- 熱圖累積（星期×小時，台北時間）---
    hi = heat_idx(cur_t)
    T = hist["t"]
    for iid, cols in hist["items"].items():
        asks = cols[0]
        ask = asks[-1]
        h = hist["hm"].setdefault(iid, [[0] * 168, [0] * 168, [0] * 168, [0] * 168])
        avg7 = mean(asks)
        if ask is not None and avg7:
            h[0][hi] += 1
            h[1][hi] += round((ask / avg7 - 1) * 10000)
        sold = cols[3][-1]
        if sold is not None:
            h[2][hi] += 1
            h[3][hi] += sold

    # --- 日 K（台北時間切日）---
    day = tpe_day(cur_t)
    today = misc["today"]
    closed = None
    if today.get("d") and today["d"] != day:
        closed = today
        today = {"d": day, "c": {}}
    elif not today.get("d"):
        today = {"d": day, "c": {}}
    for iid, cols in hist["items"].items():
        ask, listed, sold, value, sure = cols[0][-1], cols[1][-1], cols[3][-1], cols[4][-1], cols[5][-1]
        fl = flows.get(int(iid))
        c = today["c"].get(iid) or [day, None, None, None, None, None, None, 0, 0, None]
        prices = [p for p in (ask, fl and fl["hi"], fl and fl["lo"]) if p]
        if ask is not None:
            if c[1] is None:
                c[1] = ask
            c[4] = ask
        if prices:
            c[2] = max([c[2]] + prices) if c[2] is not None else max(prices)
            c[3] = min([c[3]] + prices) if c[3] is not None else min(prices)
        if sold is not None:
            c[5] = (c[5] or 0) + sold
            c[6] = (c[6] or 0) + value
            c[9] = (c[9] or 0) + sure
        if ask is not None:
            c[7] += listed
            c[8] += 1
        today["c"][iid] = c
    misc["today"] = today

    if closed or not os.path.isdir(os.path.join(hdir, "d")):
        write_daily(hdir, closed)

    # --- 寫出每小時分片 ---
    shards = {}
    for iid, cols in hist["items"].items():
        shards.setdefault(shard_of(iid), {})[iid] = {"h": cols, "hm": hist["hm"][iid]}
    for s in range(SHARDS):
        write_json(os.path.join(hdir, "h", f"{s}.json"), {"t": T, "f": HF, "items": shards.get(s, {})})

    update_index(hdir, hist, meta, cur_t)

    # --- 總覽 ---
    daily_closes = read_daily_closes(hdir)
    w24 = [i for i, t in enumerate(T) if t > cur_t - DAY + 5 * 60_000]
    rows, out_items = {}, []
    for iid, cols in hist["items"].items():
        s = stats.get(int(iid))
        ask = cols[0][-1]
        sold7 = [x for x in cols[3] if x is not None]
        if ask is None and not any(sold7):
            continue
        g = lambda col: [cols[col][i] for i in w24]
        flows24 = [x for x in g(3) if x is not None]
        sm = lambda col: sum(x for x in g(col) if x is not None) if flows24 else None
        open24 = next((x for x in g(0) if x is not None), None)
        closes = (daily_closes.get(iid, []) + ([today["c"][iid][4]] if iid in today["c"] else []))[-30:]
        last = misc["last"].get(iid)
        o = [ask, s and s["ask2"], cols[1][-1], s["listings"] if s else 0, cols[2][-1], s and s["median"],
             open24, mean(cols[0]), mean(closes),
             sm(3), sm(4), sm(6), sm(7), sm(8), sm(5), sum(sold7) if sold7 else None, len(flows24),
             last[0] if last else None, last[1] if last else None]
        rows[iid] = o
        rec = {"id": int(iid), "o": o, "s": g(0), "v": g(3)}
        if s and s["nc"]:
            rec["nc"] = 1
        out_items.append(rec)
    write_json(os.path.join(hdir, "overview.json"),
               {"house": key, "t": cur_t, "hours": len(w24), "f": OF, "items": out_items})

    check_alerts(watch, rows, meta, misc, key)
    push_user_alerts(rows, meta, key)

    write_json(os.path.join(sdir, "prev.json"), {"t": cur_t, "auctions": cur})
    write_json(os.path.join(sdir, "misc.json"), misc)

    summary = {"t": cur_t, "processed": now_ms, "gap_h": round(gap_h, 2) if gap_h else None,
               "flows": flows_ok, "listings": len(cur), "items": len(stats),
               "sold": sum(f["sold"] for f in flows.values()) if flows_ok else None}
    print(f"{key}: {summary}")
    return summary, {int(i) for i in stats}


def read_daily_closes(hdir):
    out = {}
    for s in range(SHARDS):
        sh = read_json(os.path.join(hdir, "d", f"{s}.json"))
        if not sh:
            continue
        for iid, rows in sh["items"].items():
            out[iid] = [r[4] for r in rows if r[4] is not None]
    return out


def write_daily(hdir, closed):
    """把收盤的那一天併進日 K 分片。"""
    by_shard = {}
    if closed:
        for iid, c in closed["c"].items():
            if c[8]:
                c = list(c)
                c[7] = round(c[7] / c[8])
            by_shard.setdefault(shard_of(iid), {})[iid] = c
    for s in range(SHARDS):
        path = os.path.join(hdir, "d", f"{s}.json")
        sh = read_json(path, {"f": DF, "items": {}})
        for iid, c in by_shard.get(s, {}).items():
            rows = sh["items"].setdefault(iid, [])
            if not rows or rows[-1][0] != c[0]:
                rows.append(c)
        write_json(path, sh)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--watch", default=os.path.join(os.path.dirname(__file__), "watchlist.json"))
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    now_ms = int(time.time() * 1000)
    token = get_token()
    meta_path = os.path.join(args.data, "meta", "items.json")
    meta = read_json(meta_path, {})
    misses = read_json(os.path.join(args.data, "state", "meta-misses.json"), {})
    watch = read_json(args.watch, {})
    status = read_json(os.path.join(args.data, "status.json"), {"houses": {}})

    changed = False
    seen = set()
    for key, hid in HOUSES.items():
        res = run_house(token, key, hid, args.data, meta, misses, watch, now_ms, args.force)
        if res:
            summary, ids = res
            status["houses"][key] = summary
            seen |= ids
            changed = True

    if not seen:  # 沒有新快照時，繼續補還沒抓到名稱的商品
        for key in HOUSES:
            ov = read_json(os.path.join(args.data, key, "overview.json"), {"items": []})
            seen |= {it["id"] for it in ov["items"]}
    # 拍賣場上的商品優先，再補「練專業」頁用到的材料、產物（build_recipes.py 產生）
    extra = read_json(os.path.join(os.path.dirname(__file__), "recipe-items.json"), [])
    got = fetch_meta(token, sorted(seen) + [i for i in extra if i not in seen], meta, misses, now_ms)
    if got:
        print(f"meta: +{got} items ({len(meta)} total, {len(misses)} missing)")
    cre_path = os.path.join(args.data, "meta", "creatures.json")
    cre = read_json(cre_path, {})
    cids = read_json(os.path.join(os.path.dirname(__file__), "drop-creatures.json"), [])
    try:
        got_c = fetch_creatures(token, cids, cre, misses, now_ms)
    except Exception as e:  # 怪物名稱是附加功能，失敗不擋行情
        print(f"::warning::creatures: {e}")
        got_c = 0
    if got_c:
        print(f"creatures: +{got_c} ({len(cre)} total)")
        write_json(cre_path, cre)
    if changed or got or got_c:
        write_json(meta_path, meta)
        write_json(os.path.join(args.data, "state", "meta-misses.json"), misses)
        status["meta"] = len(meta)
        status["updated"] = now_ms
        write_json(os.path.join(args.data, "status.json"), status)
    # 給 workflow 判斷要不要 commit
    print(f"::notice::changed={changed} meta+={got} creatures+={got_c}")


if __name__ == "__main__":
    main()
