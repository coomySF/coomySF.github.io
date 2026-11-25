-- 台服拍賣場 Discord 推播（/wow-ah/#/alerts）
-- 每個瀏覽器用 Supabase「匿名登入」拿到一個 uid，推播設定和提醒存在這裡；
-- GitHub Actions 的收集器每小時用 service role 讀出來、到價就打玩家自己的 Discord webhook。
-- 免費 3 個推播提醒，贊助者 30 個（Ko-fi webhook → functions/wowah-kofi 把 supporter_until 設成永久）。
-- 部落格共用的 Supabase 專案（戰鬥陀螺）；表都加 wowah_ 前綴。

create table if not exists public.wowah_subs (
  uid uuid primary key default auth.uid() references auth.users on delete cascade,
  webhook text check (webhook is null or webhook ~ '^https://(ptb\.|canary\.)?(discord|discordapp)\.com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+$'),
  code text unique not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),   -- 贊助時貼在留言的代碼
  supporter_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.wowah_push_alerts (
  uid uuid not null default auth.uid() references public.wowah_subs (uid) on delete cascade,
  item_id int not null,
  hi bigint check (hi > 0),            -- 漲到（銅）以上提醒賣
  lo bigint check (lo > 0),            -- 跌到（銅）以下提醒買
  last_kind text,                      -- 收集器用：上次已經通知的方向，價格離開門檻後清掉，避免每小時重複轟炸
  updated_at timestamptz not null default now(),
  primary key (uid, item_id),
  check (hi is not null or lo is not null)
);

alter table public.wowah_subs enable row level security;
alter table public.wowah_push_alerts enable row level security;

drop policy if exists subs_own on public.wowah_subs;
create policy wowah_subs_own on public.wowah_subs for all to authenticated
  using (uid = auth.uid()) with check (uid = auth.uid());
drop policy if exists alerts_own on public.wowah_push_alerts;
create policy wowah_alerts_own on public.wowah_push_alerts for all to authenticated
  using (uid = auth.uid()) with check (uid = auth.uid());

-- 玩家只能動自己的 webhook 和提醒門檻；贊助期限、代碼、通知狀態只有後端能改
revoke all on public.wowah_subs, public.wowah_push_alerts from anon, authenticated;
grant select, delete on public.wowah_subs to authenticated;
grant insert (uid, webhook), update (webhook) on public.wowah_subs to authenticated;
grant select, delete on public.wowah_push_alerts to authenticated;
grant insert (uid, item_id, hi, lo), update (hi, lo) on public.wowah_push_alerts to authenticated;

-- 數量上限：免費 3、贊助期間 30
create or replace function public.wowah_push_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int; n int;
begin
  select case when supporter_until > now() then 30 else 3 end into cap from wowah_subs where uid = new.uid;
  select count(*) into n from wowah_push_alerts where uid = new.uid;
  if n >= coalesce(cap, 3) then
    raise exception 'push_limit:%', coalesce(cap, 3) using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists push_limit on public.wowah_push_alerts;
create trigger wowah_push_limit before insert on public.wowah_push_alerts for each row execute function public.wowah_push_limit();
