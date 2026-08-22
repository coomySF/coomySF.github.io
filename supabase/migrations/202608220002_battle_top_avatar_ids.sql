alter table public.battle_top_scores
  drop constraint if exists battle_top_scores_avatar_check;

alter table public.battle_top_scores
  add constraint battle_top_scores_avatar_check
  check (avatar in ('nova', 'kai', 'rin', 'leo', 'mika', 'zane', 'astra', 'jett', 'luna', 'onyx', 'skye', 'blaze', '⚡', '🔥', '🐉', '🦈', '🦁', '🌙'));
