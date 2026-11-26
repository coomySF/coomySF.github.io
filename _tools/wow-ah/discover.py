#!/usr/bin/env python3
"""一次性：永恆台服的伺服器（PvP／PvE）各對應哪幾個拍賣場 id。只印名稱和 id。"""
import json
import collect as c

t = c.get_token()
st, d, _ = c.api(t, "/data/wow/realm/index", c.DYN_NS)
print("## realms", st, [(r.get("id"), r.get("name"), r.get("slug")) for r in (d or {}).get("realms", [])])
st, d, _ = c.api(t, "/data/wow/connected-realm/index", c.DYN_NS)
cids = [x["href"].split("/connected-realm/")[1].split("?")[0] for x in (d or {}).get("connected_realms", [])]
print("## connected", st, cids)
for cid in cids:
    st, cr, _ = c.api(t, f"/data/wow/connected-realm/{cid}", c.DYN_NS)
    rs = [(r.get("name"), (r.get("type") or {}).get("type"), (r.get("type") or {}).get("name"), (r.get("category"))) for r in (cr or {}).get("realms", [])]
    print(f"## cr {cid} pop={((cr or {}).get('population') or {}).get('name')} realms={rs}")
    st, ai, _ = c.api(t, f"/data/wow/connected-realm/{cid}/auctions/index", c.DYN_NS)
    print("   auctions", st, [(a.get("id"), a.get("name")) for a in (ai or {}).get("auctions", [])])
