#!/usr/bin/env python3
"""一次性：列出永恆台服有哪些規則（PvP／PvE）與拍賣場（聯盟／部落），只印名稱、id 和掛單數。"""
import json
import collect as c

t = c.get_token()
for r in (1, 2, 5):
    st, d, _ = c.api(t, f"/data/wow/ruleset/{r}", c.DYN_NS)
    print(f"## ruleset {r}: {(d or {}).get('name')} status={((d or {}).get('status') or {}).get('name')}")
    st, d, _ = c.api(t, f"/data/wow/ruleset/{r}/auctions/index", c.DYN_NS)
    for a in (d or {}).get("auctions", []):
        hid = a["id"]
        s1, h, _ = c.api(t, f"/data/wow/ruleset/{r}/auctions/{hid}", c.DYN_NS)
        s2, cm, _ = c.api(t, f"/data/wow/ruleset/{r}/auctions/{hid}/commodities", c.DYN_NS)
        print(f"   house {hid} {a['name']}: items={len((h or {}).get('auctions', []))} commodities={len((cm or {}).get('auctions', []))} ({s1}/{s2})")
