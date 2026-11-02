-- 秘密基地：娃娃代回與輔導小抄。
-- sender 多一種 doll（娃娃用自己的聲音先回的信）；孩子的話多存 friend（當時跟哪隻娃娃說）與 analysis（Mac 端 agent 的判斷與小抄）。
-- settings 放家長的「我在／我忙」開關。
alter table public.secret_base_messages drop constraint if exists secret_base_messages_sender_check;
alter table public.secret_base_messages add constraint secret_base_messages_sender_check check (sender in ('kid', 'parent', 'doll'));
alter table public.secret_base_messages add column if not exists friend text;
alter table public.secret_base_messages add column if not exists analysis jsonb;
alter table public.secret_base_messages add column if not exists analyzed_at timestamptz;
create index if not exists secret_base_messages_pending_idx
  on public.secret_base_messages (created_at asc)
  where sender = 'kid' and analyzed_at is null;

create table if not exists public.secret_base_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.secret_base_settings enable row level security;
revoke all on public.secret_base_settings from anon, authenticated;
