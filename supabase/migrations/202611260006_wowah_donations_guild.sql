-- 台服拍賣場贊助：記錄每筆 Ko-fi 贊助（算「本月補給」進度用，只公開筆數與總額）、公會方案
create table if not exists public.wowah_donations (
  id bigserial primary key,
  kofi_tx text unique,
  amount numeric not null,
  currency text not null default 'USD',
  uid uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
alter table public.wowah_donations enable row level security;
revoke all on public.wowah_donations from anon, authenticated;

-- 支持者等級：supporter（任何金額）／guild（公會方案，推播 100 個並可同時推到公會頻道）
alter table public.wowah_subs add column if not exists tier text check (tier in ('supporter', 'guild'));

-- 本月（台北時間）補給：只回筆數與換算成新台幣的總額，不回任何個人資料
create or replace function public.wowah_month_stats() returns table (n bigint, twd numeric)
language sql security definer set search_path = public stable as $$
  select count(*), coalesce(round(sum(case when currency = 'TWD' then amount else amount * 31 end)), 0)
  from wowah_donations
  where created_at >= date_trunc('month', now() at time zone 'Asia/Taipei') at time zone 'Asia/Taipei'
$$;
revoke all on function public.wowah_month_stats() from public;
grant execute on function public.wowah_month_stats() to anon, authenticated;

-- 推播上限：免費 1、支持者 30、公會 100（全部拍賣場合計）
create or replace function public.wowah_push_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int; n int;
begin
  select case when supporter_until > now() then (case when tier = 'guild' then 100 else 30 end) else 1 end into cap from wowah_subs where uid = new.uid;
  select count(*) into n from wowah_push_alerts where uid = new.uid;
  if n >= coalesce(cap, 1) then
    raise exception 'push_limit:%', coalesce(cap, 1) using errcode = 'P0001';
  end if;
  return new;
end $$;
