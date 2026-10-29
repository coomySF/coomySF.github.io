# 角色模型產線

設計稿 → 無五官正面圖 → Hunyuan3D 生成形狀 → 減面 → 依設計稿上色 → `../models/`

1. 起本機伺服器後（port 4173）跑 headless Chrome（port 9333），`node faceless.mjs` 輸出 `gen/{mochi,cloud,bird}-{plain,hood}.png`
2. `python hunyuan3d_generate.py gen/<name>.png gen/<name> --no-texture`（公開 Space，免帳號，約 30–40 秒）
3. `python prep.py gen/<name>/hunyuan3d-shape.glb gen/<name>/body.glb 50000`（留最大塊、減面、平滑、正規化）
4. `python paint2.py gen/<name>/body.glb gen/<name>.png ../models/<id>.glb palettes/pal-<name>.json`
   （逐行對齊輪廓的正面投影：寫 UV＋平塗頂點色，放進設計稿座標系：700px＝1 單位、地面 y=0）
5. `python flatpaint.py gen/<name>.png palettes/pal-<name>.json ../models/<id>-paint.png`（正面清楚的色塊圖）

對應：mochi→bear、cloud→sheep、bird→bird；`-hood` 是小惡魔連帽裝。換了模型要把 `index.html` 的 `MODEL_VER` 加一。
需要：`gradio_client trimesh fast_simplification scipy networkx pillow numpy`。
