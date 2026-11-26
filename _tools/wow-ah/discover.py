#!/usr/bin/env python3
"""一次性：列出永恆台服有哪些規則（PvP／PvE）與拍賣場（聯盟／部落），只印名稱和 id。"""
import json
import collect as c

t = c.get_token()
for path in ["/data/wow/ruleset/index", "/data/wow/search/ruleset"]:
    st, d, _ = c.api(t, path, c.DYN_NS)
    print("##", path, st, json.dumps(d, ensure_ascii=False)[:1500] if d else "")
for r in range(0, 9):
    st, d, _ = c.api(t, f"/data/wow/ruleset/{r}/auctions/index", c.DYN_NS)
    if st == 200 and d:
        print("## ruleset", r, json.dumps({k: v for k, v in d.items() if k != "_links"}, ensure_ascii=False)[:1500])
    else:
        print("## ruleset", r, st)
    st, d, _ = c.api(t, f"/data/wow/ruleset/{r}", c.DYN_NS)
    if st == 200 and d:
        print("   info", json.dumps({k: v for k, v in d.items() if k != "_links"}, ensure_ascii=False)[:600])
