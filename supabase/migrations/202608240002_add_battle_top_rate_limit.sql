create table if not exists public.battle_top_rate_limits (
  rate_key text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);

alter table public.battle_top_rate_limits enable row level security;
revoke all on public.battle_top_rate_limits from anon, authenticated;

create or replace function public.consume_battle_top_rate_limit(
  input_key text,
  max_hits integer default 12,
  window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  insert into public.battle_top_rate_limits as limits (rate_key, window_start, hits)
  values (input_key, now(), 1)
  on conflict (rate_key) do update
    set window_start = case
          when limits.window_start < now() - make_interval(secs => window_seconds) then now()
          else limits.window_start
        end,
        hits = case
          when limits.window_start < now() - make_interval(secs => window_seconds) then 1
          else limits.hits + 1
        end
  returning hits <= max_hits into allowed;

  return allowed;
end;
$$;

revoke all on function public.consume_battle_top_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_battle_top_rate_limit(text, integer, integer) to service_role;
