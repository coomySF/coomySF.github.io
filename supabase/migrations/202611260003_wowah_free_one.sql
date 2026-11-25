-- 台服拍賣場推播：免費改成 1 個，支持者（捐過一次就永久）30 個
create or replace function public.wowah_push_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int; n int;
begin
  select case when supporter_until > now() then 30 else 1 end into cap from wowah_subs where uid = new.uid;
  select count(*) into n from wowah_push_alerts where uid = new.uid;
  if n >= coalesce(cap, 1) then
    raise exception 'push_limit:%', coalesce(cap, 1) using errcode = 'P0001';
  end if;
  return new;
end $$;
