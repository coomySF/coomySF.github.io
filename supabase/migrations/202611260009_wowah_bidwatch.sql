-- 台服拍賣場「單品搶標提醒」：指定商品＋出價上限，出現出價不超過上限的競標就私訊（一件算 1 個推播額度）
create table if not exists public.wowah_bidwatch (
  uid uuid not null default auth.uid() references public.wowah_subs (uid) on delete cascade,
  house text not null check (house in ('tw-110', 'tw-113', 'tw-116', 'tw-111', 'tw-114', 'tw-117')),
  item_id int not null,
  max_bid bigint not null check (max_bid > 0),
  updated_at timestamptz not null default now(),
  primary key (uid, house, item_id)
);
alter table public.wowah_bidwatch enable row level security;
drop policy if exists wowah_bidwatch_own on public.wowah_bidwatch;
create policy wowah_bidwatch_own on public.wowah_bidwatch for all to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
revoke all on public.wowah_bidwatch from anon, authenticated;
grant select, delete on public.wowah_bidwatch to authenticated;
grant insert (uid, house, item_id, max_bid), update (max_bid) on public.wowah_bidwatch to authenticated;

create or replace function public.wowah_push_used(u uuid) returns int
language sql security definer set search_path = public stable as $$
  select (select count(*) from wowah_push_alerts where uid = u)::int + (select count(*) from wowah_snipe where uid = u)::int
       + (select count(*) from wowah_bidwatch where uid = u)::int
$$;
drop trigger if exists wowah_bidwatch_limit on public.wowah_bidwatch;
create trigger wowah_bidwatch_limit before insert on public.wowah_bidwatch for each row execute function public.wowah_push_limit();
