-- 搶標快訊跟到價推播用同一套額度：免費 1、支持者 30、公會 100（一個拍賣場的搶標快訊算 1 個）
create or replace function public.wowah_push_cap(u uuid) returns int
language sql security definer set search_path = public stable as $$
  select coalesce((select case when supporter_until > now() then (case when tier = 'guild' then 100 else 30 end) else 1 end
                   from wowah_subs where uid = u), 1)
$$;
create or replace function public.wowah_push_used(u uuid) returns int
language sql security definer set search_path = public stable as $$
  select (select count(*) from wowah_push_alerts where uid = u)::int + (select count(*) from wowah_snipe where uid = u)::int
$$;
revoke all on function public.wowah_push_cap(uuid), public.wowah_push_used(uuid) from public, anon, authenticated;

create or replace function public.wowah_push_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int := wowah_push_cap(new.uid);
begin
  if wowah_push_used(new.uid) >= cap then
    raise exception 'push_limit:%', cap using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists wowah_snipe_limit on public.wowah_snipe;
create trigger wowah_snipe_limit before insert on public.wowah_snipe for each row execute function public.wowah_push_limit();
