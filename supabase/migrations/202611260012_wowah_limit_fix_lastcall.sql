-- 修正：plpgsql 會解析整個 OR 運算式，wowah_snipe 沒有 item_id 會出錯 → 依資料表分開判斷
create or replace function public.wowah_push_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int := wowah_push_cap(new.uid);
begin
  if tg_table_name = 'wowah_snipe' then
    if exists (select 1 from wowah_snipe where uid = new.uid and house = new.house) then return new; end if;
  elsif tg_table_name = 'wowah_bidwatch' then
    if exists (select 1 from wowah_bidwatch b where b.uid = new.uid and b.house = new.house and b.item_id = (to_jsonb(new) ->> 'item_id')::int) then return new; end if;
  elsif tg_table_name = 'wowah_push_alerts' then
    if exists (select 1 from wowah_push_alerts a where a.uid = new.uid and a.house = new.house and a.item_id = (to_jsonb(new) ->> 'item_id')::int) then return new; end if;
  end if;
  if wowah_push_used(new.uid) >= cap then
    raise exception 'push_limit:%', cap using errcode = 'P0001';
  end if;
  return new;
end $$;

-- 單品搶標提醒：last_call = true 只在快結束（預估剩不到半小時左右）而且出價還低於上限時才通知
alter table public.wowah_bidwatch add column if not exists last_call boolean not null default false;
grant insert (last_call), update (last_call) on public.wowah_bidwatch to authenticated;
