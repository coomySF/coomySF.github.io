-- 台服拍賣場推播：Ko-fi 贊助用信箱對應玩家（同一個信箱登入的帳號），只有後端（service_role）能查
create or replace function public.wowah_uid_by_email(e text) returns uuid
language sql security definer set search_path = public, auth stable as $$
  select id from auth.users where lower(email) = lower(e) and not coalesce(is_anonymous, false) limit 1
$$;
revoke all on function public.wowah_uid_by_email(text) from public, anon, authenticated;
grant execute on function public.wowah_uid_by_email(text) to service_role;
