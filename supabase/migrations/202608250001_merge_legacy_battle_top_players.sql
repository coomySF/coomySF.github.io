create or replace view public.battle_top_player_bests
with (security_invoker = true)
as
with identified as (
  select
    client_event_id,
    nickname,
    avatar,
    top_name,
    score,
    won,
    created_at,
    player_id,
    max(player_id) filter (where player_id is not null) over (
      partition by lower(btrim(nickname)), avatar
    ) as matching_player_id
  from public.battle_top_scores
), ranked as (
  select
    client_event_id,
    nickname,
    avatar,
    top_name,
    score,
    won,
    created_at,
    player_id,
    row_number() over (
      partition by coalesce(
        player_id,
        matching_player_id,
        'legacy:' || lower(btrim(nickname)) || '::' || avatar
      )
      order by score desc, created_at asc, client_event_id asc
    ) as player_rank
  from identified
)
select client_event_id, nickname, avatar, top_name, score, won, created_at, player_id
from ranked
where player_rank = 1;

