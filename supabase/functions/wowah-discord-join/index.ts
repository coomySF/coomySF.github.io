// 台服拍賣場：Discord 登入回來後呼叫。把玩家加進「台灣拍賣場」伺服器、記下 Discord ID、讓機器人私訊一則歡迎
// 之後到價推播就由機器人私訊，不用玩家自己建 webhook。
// 需要的密鑰：DISCORD_BOT_TOKEN（機器人要在伺服器裡）；SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY（內建）
const GUILD = "1575350300468973638";
const API = "https://discord.com/api/v10";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!, key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, bot = Deno.env.get("DISCORD_BOT_TOKEN")!;
  // 1. 是誰：用玩家自己的登入 token 問 Supabase
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  const ures = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${jwt}` } });
  if (!ures.ok) return json({ error: "not logged in" }, 401);
  const user = await ures.json();
  const ident = (user.identities || []).find((i: { provider: string }) => i.provider === "discord");
  if (!ident) return json({ error: "not a discord login" }, 400);
  const discordId = String(ident.id || ident.identity_data?.provider_id || ident.identity_data?.sub);
  // 2. Discord 給的 access token（含 guilds.join），確認跟登入的是同一個人，再把人加進伺服器
  let body: { provider_token?: string } = {};
  try { body = await req.json(); } catch { /* 沒帶就只記 ID */ }
  let joined: number | null = null;
  if (body.provider_token) {
    const me = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${body.provider_token}` } });
    if (me.ok && String((await me.json()).id) === discordId) {
      const j = await fetch(`${API}/guilds/${GUILD}/members/${discordId}`, {
        method: "PUT", headers: { Authorization: `Bot ${bot}`, "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: body.provider_token }),
      });
      joined = j.status;   // 201 剛加入、204 本來就在
    }
  }
  // 3. 機器人私訊歡迎（順便確認私訊得到）
  let dm = false;
  const ch = await fetch(`${API}/users/@me/channels`, { method: "POST", headers: { Authorization: `Bot ${bot}`, "Content-Type": "application/json" }, body: JSON.stringify({ recipient_id: discordId }) });
  if (ch.ok) {
    const { id } = await ch.json();
    const m = await fetch(`${API}/channels/${id}/messages`, {
      method: "POST", headers: { Authorization: `Bot ${bot}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "🔔 推播連上了！之後你在「台灣拍賣場行情」勾選推播的商品，到價時我會在這裡私訊你。\nhttps://coomysf.github.io/wow-ah/#/alerts", allowed_mentions: { parse: [] } }),
    });
    dm = m.ok;
  }
  // 4. 記下來（玩家不能自己改這兩欄）
  const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" };
  await fetch(`${url}/rest/v1/wowah_subs`, { method: "POST", headers: { ...h, Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify({ uid: user.id }) });
  await fetch(`${url}/rest/v1/wowah_subs?uid=eq.${user.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ discord_id: discordId, dm_ok: dm }) });
  return json({ ok: true, joined, dm });
});
