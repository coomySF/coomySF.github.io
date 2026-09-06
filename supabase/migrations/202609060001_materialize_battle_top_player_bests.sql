-- 排行榜讀取的 battle_top_player_bests 原本是 view：每個請求都要對整張 battle_top_scores
-- 做 window function 找出每位玩家最佳成績，撈前 3 名和撈 50 筆一樣慢（0.7–1.1 秒）。
-- 改成實體表：分數寫入時用 trigger 只重算受影響的玩家，讀取變成索引取前 N 筆。
-- 玩家身份規則與舊 view 完全相同：
--   player_id → 同暱稱+頭像群組裡最大的 player_id（舊資料合併）→ 'legacy:暱稱::頭像'

drop view if exists public.battle_top_player_bests;

create table public.battle_top_player_bests (
  player_key text primary key,
  client_event_id text not null,
  nickname text not null,
  avatar text not null,
  top_name text not null,
  score integer not null,
  won boolean not null,
  created_at timestamptz not null,
  player_id text,
  refreshed_at timestamptz not null default now()
);

create index battle_top_player_bests_rank_idx
  on public.battle_top_player_bests (score desc, created_at asc, client_event_id asc);
create index battle_top_player_bests_event_idx
  on public.battle_top_player_bests (client_event_id);
create index battle_top_player_bests_nickname_idx
  on public.battle_top_player_bests (lower(btrim(nickname)), avatar);

alter table public.battle_top_player_bests enable row level security;
revoke all on public.battle_top_player_bests from anon, authenticated;

-- 群組索引：trigger 要找「同暱稱+頭像」的列
create index if not exists battle_top_scores_identity_idx
  on public.battle_top_scores (lower(btrim(nickname)), avatar, player_id);

-- 重算指定玩家（keys 為 null 時全部重算）。邏輯與原 view 相同，只是把結果寫進實體表。
create or replace function public.battle_top_refresh_player_bests(keys text[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  touched integer := 0;
begin
  create temp table if not exists battle_top_bests_scratch (like public.battle_top_player_bests) on commit drop;
  truncate battle_top_bests_scratch;

  insert into battle_top_bests_scratch
    (player_key, client_event_id, nickname, avatar, top_name, score, won, created_at, player_id, refreshed_at)
  select distinct on (player_key)
    player_key, client_event_id, nickname, avatar, top_name, score, won, created_at, player_id, now()
  from (
    select
      s.*,
      coalesce(
        s.player_id,
        max(s.player_id) filter (where s.player_id is not null) over (partition by lower(btrim(s.nickname)), s.avatar),
        'legacy:' || lower(btrim(s.nickname)) || '::' || s.avatar
      ) as player_key
    from public.battle_top_scores s
  ) keyed
  where keys is null or player_key = any(keys)
  order by player_key, score desc, created_at asc, client_event_id asc;

  -- 已經沒有任何分數列對應的身份（例如舊資料被合併到 player_id）要移除
  delete from public.battle_top_player_bests b
  where (keys is null or b.player_key = any(keys))
    and not exists (select 1 from battle_top_bests_scratch t where t.player_key = b.player_key);

  insert into public.battle_top_player_bests as b
    (player_key, client_event_id, nickname, avatar, top_name, score, won, created_at, player_id, refreshed_at)
  select player_key, client_event_id, nickname, avatar, top_name, score, won, created_at, player_id, refreshed_at
  from battle_top_bests_scratch
  on conflict (player_key) do update set
    client_event_id = excluded.client_event_id,
    nickname = excluded.nickname,
    avatar = excluded.avatar,
    top_name = excluded.top_name,
    score = excluded.score,
    won = excluded.won,
    created_at = excluded.created_at,
    player_id = excluded.player_id,
    refreshed_at = excluded.refreshed_at
  where (b.client_event_id, b.score, b.created_at, b.top_name, b.nickname, b.avatar, b.won)
     is distinct from
        (excluded.client_event_id, excluded.score, excluded.created_at, excluded.top_name, excluded.nickname, excluded.avatar, excluded.won);
  get diagnostics touched = row_count;
  return touched;
end;
$$;

-- 找出一筆分數列會牽動到的所有身份：自己的 player_id、同暱稱+頭像群組裡出現過的 player_id、legacy 身份。
create or replace function public.battle_top_affected_player_keys(p_player_id text, p_nickname text, p_avatar text)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select array_agg(distinct key) from (
    select 'legacy:' || lower(btrim(p_nickname)) || '::' || p_avatar as key
    union all
    select p_player_id where p_player_id is not null
    union all
    select s.player_id
    from public.battle_top_scores s
    where s.player_id is not null
      and lower(btrim(s.nickname)) = lower(btrim(p_nickname))
      and s.avatar = p_avatar
    union all
    -- 同 player_id 曾用過的其他暱稱群組，其 legacy 列也掛在這個 player_id 底下
    select 'legacy:' || lower(btrim(o.nickname)) || '::' || o.avatar
    from public.battle_top_scores o
    where p_player_id is not null and o.player_id = p_player_id
  ) keys
$$;

create or replace function public.battle_top_scores_sync_bests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  keys text[] := '{}';
begin
  if tg_op in ('INSERT', 'UPDATE') then
    keys := keys || coalesce(public.battle_top_affected_player_keys(new.player_id, new.nickname, new.avatar), '{}');
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    keys := keys || coalesce(public.battle_top_affected_player_keys(old.player_id, old.nickname, old.avatar), '{}');
  end if;
  perform public.battle_top_refresh_player_bests(keys);
  return null;
end;
$$;

drop trigger if exists battle_top_scores_sync_bests on public.battle_top_scores;
create trigger battle_top_scores_sync_bests
  after insert or update or delete on public.battle_top_scores
  for each row execute function public.battle_top_scores_sync_bests();

revoke all on function public.battle_top_refresh_player_bests(text[]) from public, anon, authenticated;
revoke all on function public.battle_top_affected_player_keys(text, text, text) from public, anon, authenticated;
grant execute on function public.battle_top_refresh_player_bests(text[]) to service_role;

-- 一次性回填
select public.battle_top_refresh_player_bests(null);
