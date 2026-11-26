-- 台服拍賣場推播：提醒分拍賣場（PvE／PvP × 聯盟／部落／黑水灣），同一個商品可以在不同拍賣場各設一個
alter table public.wowah_push_alerts add column if not exists house text not null default 'tw-110'
  check (house in ('tw-110', 'tw-113', 'tw-116', 'tw-111', 'tw-114', 'tw-117'));
alter table public.wowah_push_alerts drop constraint if exists wowah_push_alerts_pkey;
alter table public.wowah_push_alerts add primary key (uid, house, item_id);
grant insert (house) on public.wowah_push_alerts to authenticated;
