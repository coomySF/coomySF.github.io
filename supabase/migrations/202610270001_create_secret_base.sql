-- 秘密基地：孩子對娃娃說的話 ↔ 爸爸的回覆。只透過 secret-base edge function 存取。
create table if not exists public.secret_base_messages (
  id uuid primary key default gen_random_uuid(),
  sender text not null check (sender in ('kid', 'parent')),
  audio_path text,
  audio_kind text check (audio_kind in ('recording', 'tts')),
  body text check (char_length(body) <= 2000),
  reply_to uuid references public.secret_base_messages (id) on delete set null,
  heard_at timestamptz,
  created_at timestamptz not null default now(),
  check (audio_path is not null or body is not null)
);

create index if not exists secret_base_messages_created_idx
  on public.secret_base_messages (created_at desc);

create index if not exists secret_base_messages_unheard_idx
  on public.secret_base_messages (created_at asc)
  where sender = 'parent' and heard_at is null;

alter table public.secret_base_messages enable row level security;
revoke all on public.secret_base_messages from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('secret-base', 'secret-base', false, 10485760)
on conflict (id) do nothing;
