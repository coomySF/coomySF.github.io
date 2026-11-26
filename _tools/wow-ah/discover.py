#!/usr/bin/env python3
"""一次性：找出哪組拍賣場是 PvP、哪組是 PvE。只印名稱、id、價格。"""
import json
import collect as c

t = c.get_token()
for ns in ["dynamic-forever-tw", "dynamic-classic1x-tw", "dynamic-classic-tw"]:
    for path in ["/data/wow/realm/index", "/data/wow/connected-realm/index", "/data/wow/realm/tw"]:
        try:
            st, d, _ = c.api(t, path, ns)
        except Exception as e:
            st, d = getattr(e, "code", e), None
        txt = json.dumps(d, ensure_ascii=False) if d else ""
        print(f"## {ns} {path} {st} {txt[:700]}")
items = {14047: "符文布", 10620: "瑟銀礦石", 12359: "瑟銀錠", 13468: "黑蓮花", 8831: "紫蓮花", 2772: "鐵礦石"}
for hid in (110, 111, 113, 114, 116, 117):
    st, cm, _ = c.api(t, f"/data/wow/ruleset/2/auctions/{hid}/commodities", c.DYN_NS)
    low = {}
    for a in (cm or {}).get("auctions", []):
        i = a["item"]["id"]
        if i in items:
            p = a.get("unit_price") or a.get("buyout")
            if p and (i not in low or p < low[i]):
                low[i] = p
    print(f"## house {hid}: " + "  ".join(f"{items[i]} {c.gold(low.get(i))}" for i in items))
