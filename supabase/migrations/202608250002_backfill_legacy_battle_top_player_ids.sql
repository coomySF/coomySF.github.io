with unambiguous_players as (
  select
    lower(btrim(nickname)) as normalized_nickname,
    avatar,
    min(player_id) as player_id
  from public.battle_top_scores
  where player_id is not null
  group by lower(btrim(nickname)), avatar
  having count(distinct player_id) = 1
)
update public.battle_top_scores as legacy
set player_id = known.player_id
from unambiguous_players as known
where legacy.player_id is null
  and lower(btrim(legacy.nickname)) = known.normalized_nickname
  and legacy.avatar = known.avatar;

