-- 台服拍賣場「搶標快訊」：快結束、目前出價低於行情的競標，符合條件就由機器人私訊（支持者功能）
create table if not exists public.wowah_snipe (
  uid uuid not null default auth.uid() references public.wowah_subs (uid) on delete cascade,
  house text not null check (house in ('tw-110', 'tw-113', 'tw-116', 'tw-111', 'tw-114', 'tw-117')),
  min_off numeric not null default 0.4 check (min_off between 0.25 and 0.9),   -- 至少便宜幾成
  cls text check (cls in ('武器', '護甲', '配方')),                            -- null＝全部
  updated_at timestamptz not null default now(),
  primary key (uid, house)
);
alter table public.wowah_snipe enable row level security;
drop policy if exists wowah_snipe_own on public.wowah_snipe;
create policy wowah_snipe_own on public.wowah_snipe for all to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
revoke all on public.wowah_snipe from anon, authenticated;
grant select, delete on public.wowah_snipe to authenticated;
grant insert (uid, house, min_off, cls), update (min_off, cls) on public.wowah_snipe to authenticated;
