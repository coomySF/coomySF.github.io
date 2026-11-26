-- 免費推播額度 1 → 2（至少一個到價推播＋一個搶標）
create or replace function public.wowah_push_cap(u uuid) returns int
language sql security definer set search_path = public stable as $$
  select coalesce((select case when supporter_until > now() then (case when tier = 'guild' then 100 else 30 end) else 2 end
                   from wowah_subs where uid = u), 2)
$$;
