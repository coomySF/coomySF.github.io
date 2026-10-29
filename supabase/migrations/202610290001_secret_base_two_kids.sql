-- 秘密基地：兩個孩子各自一條對話線（虎妞、屁孩）。kid 是孩子代號，爸爸「兩個都聽」的回信會各存一筆。
alter table public.secret_base_messages add column if not exists kid text;
create index if not exists secret_base_messages_kid_idx
  on public.secret_base_messages (kid, created_at desc);
