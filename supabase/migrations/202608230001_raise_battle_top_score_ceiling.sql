alter table public.battle_top_scores
  drop constraint if exists battle_top_scores_score_check;

alter table public.battle_top_scores
  add constraint battle_top_scores_score_check
  check (score between 100 and 1000000);
