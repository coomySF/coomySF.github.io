-- upsert 會先跑 BEFORE INSERT 觸發器：已經存在的那一列（只是改數字）不算新增，不檢查額度
create or replace function public.wowah_push_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int := wowah_push_cap(new.uid);
begin
  if (tg_table_name = 'wowah_push_alerts' and exists (select 1 from wowah_push_alerts where uid = new.uid and house = new.house and item_id = new.item_id))
     or (tg_table_name = 'wowah_bidwatch' and exists (select 1 from wowah_bidwatch where uid = new.uid and house = new.house and item_id = new.item_id))
     or (tg_table_name = 'wowah_snipe' and exists (select 1 from wowah_snipe where uid = new.uid and house = new.house)) then
    return new;
  end if;
  if wowah_push_used(new.uid) >= cap then
    raise exception 'push_limit:%', cap using errcode = 'P0001';
  end if;
  return new;
end $$;
