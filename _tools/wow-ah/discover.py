#!/usr/bin/env python3
"""一次性：在 classic1x 的伺服器清單裡找編號含 92／94 的伺服器，和它們的拍賣場 id。"""
import json
import collect as c

t = c.get_token()
for ns in ["dynamic-classic1x-tw", "dynamic-classic-tw"]:
    st, d, _ = c.api(t, "/data/wow/connected-realm/index", ns)
    cids = [x["href"].split("/connected-realm/")[1].split("?")[0] for x in (d or {}).get("connected_realms", [])]
    print(f"## {ns}: {len(cids)} connected realms")
    for cid in cids:
        try:
            st, cr, _ = c.api(t, f"/data/wow/connected-realm/{cid}", ns)
            rs = [(r.get("id"), r.get("name"), (r.get("type") or {}).get("type"), r.get("category")) for r in (cr or {}).get("realms", [])]
            st2, ai, _ = c.api(t, f"/data/wow/connected-realm/{cid}/auctions/index", ns)
            houses = [(a.get("id"), a.get("name")) for a in (ai or {}).get("auctions", [])]
        except Exception as e:
            rs, houses = str(e), []
        print(f"   cr {cid}: {rs} houses={houses}")
