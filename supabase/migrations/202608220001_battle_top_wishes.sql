create table if not exists public.battle_top_wishes (
  feature text primary key check (feature in ('customize', 'daily', 'physical', 'live-room')),
  vote_count bigint not null default 0 check (vote_count >= 0),
  updated_at timestamptz not null default now()
);

insert into public.battle_top_wishes (feature, vote_count)
values ('customize', 0), ('daily', 0), ('physical', 0), ('live-room', 0)
on conflict (feature) do nothing;

alter table public.battle_top_wishes enable row level security;

revoke all on public.battle_top_wishes from anon, authenticated;

create or replace function public.increment_battle_top_wish(feature_id text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count bigint;
begin
  if feature_id not in ('customize', 'daily', 'physical', 'live-room') then
    raise exception 'invalid feature';
  end if;

  update public.battle_top_wishes
  set vote_count = vote_count + 1, updated_at = now()
  where feature = feature_id
  returning vote_count into next_count;

  return next_count;
end;
$$;

revoke all on function public.increment_battle_top_wish(text) from public, anon, authenticated;
grant execute on function public.increment_battle_top_wish(text) to service_role;

create table if not exists public.battle_top_scores (
  id uuid primary key default gen_random_uuid(),
  client_event_id text not null unique check (client_event_id ~ '^[A-Z0-9]{5,16}$'),
  nickname text not null check (char_length(nickname) between 1 and 10),
  avatar text not null check (avatar in ('⚡', '🔥', '🐉', '🦈', '🦁', '🌙')),
  top_name text not null check (char_length(top_name) between 1 and 30),
  score integer not null check (score between 100 and 3000),
  won boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists battle_top_scores_rank_idx
  on public.battle_top_scores (score desc, created_at asc);

alter table public.battle_top_scores enable row level security;
revoke all on public.battle_top_scores from anon, authenticated;
