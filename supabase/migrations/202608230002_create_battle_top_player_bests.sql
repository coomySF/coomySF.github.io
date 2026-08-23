create index if not exists battle_top_scores_player_best_idx
  on public.battle_top_scores (lower(btrim(nickname)), avatar, score desc, created_at asc);

create or replace view public.battle_top_player_bests
with (security_invoker = true)
as
select client_event_id, nickname, avatar, top_name, score, won, created_at
from (
  select
    client_event_id,
    nickname,
    avatar,
    top_name,
    score,
    won,
    created_at,
    row_number() over (
      partition by lower(btrim(nickname)), avatar
      order by score desc, created_at asc, client_event_id asc
    ) as player_rank
  from public.battle_top_scores
) ranked
where player_rank = 1;

