-- 爸媽的信可以附一張照片或一張貼紙：{ kind: 'photo', path } 或 { kind: 'sticker', sticker }
alter table public.secret_base_messages add column if not exists attachment jsonb;
-- 孩子的貼紙簿只看已聽過、帶貼紙的信
create index if not exists secret_base_messages_sticker_idx on public.secret_base_messages (kid, created_at)
  where sender = 'parent' and heard_at is not null and (attachment ->> 'kind') = 'sticker';
