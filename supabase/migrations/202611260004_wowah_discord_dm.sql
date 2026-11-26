-- 台服拍賣場推播：Discord 登入後由機器人私訊（取代自己貼 webhook）
-- discord_id／dm_ok 只有後端（wowah-discord-join 函式、收集器）能寫，玩家只能讀
alter table public.wowah_subs add column if not exists discord_id text;
alter table public.wowah_subs add column if not exists dm_ok boolean;
