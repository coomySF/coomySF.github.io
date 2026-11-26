-- 網頁用 upsert（INSERT … ON CONFLICT DO UPDATE SET 送出的所有欄位），所以送出的欄位都要有 update 權限。
-- 只能動自己的列（RLS：uid = auth.uid()），house/item_id 被改也只影響自己。
grant update (house, item_id, max_bid) on public.wowah_bidwatch to authenticated;
grant update (house, min_off, cls) on public.wowah_snipe to authenticated;
