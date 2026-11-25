// Ko-fi 贊助 webhook：用留言裡的 6 碼支持者代碼、或贊助者信箱找到玩家，延長贊助期限（每 1 美元 30 天，至少 30 天）
// 部署：supabase functions deploy wowah-kofi（config.toml 已設 verify_jwt = false）
// 密鑰：supabase secrets set KOFI_TOKEN=<Ko-fi 後台 API 頁的 Verification Token>
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const form = await req.formData();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(String(form.get("data") ?? "{}")); } catch { return new Response("bad data", { status: 400 }); }
  if (!data.verification_token || data.verification_token !== Deno.env.get("KOFI_TOKEN")) {
    return new Response("bad token", { status: 401 });
  }
  const url = Deno.env.get("SUPABASE_URL")!, key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  // 先看留言裡的 6 碼支持者代碼，沒有就用贊助者信箱對應「用同一個信箱登入」的帳號
  const code = String(data.message ?? "").toUpperCase().match(/\b[0-9A-F]{6}\b/)?.[0];
  let sub: { uid: string; supporter_until: string | null } | undefined;
  if (code) {
    sub = (await (await fetch(`${url}/rest/v1/wowah_subs?code=eq.${code}&select=uid,supporter_until`, { headers: h })).json())[0];
  }
  if (!sub && data.email) {
    const uid = await (await fetch(`${url}/rest/v1/rpc/wowah_uid_by_email`, { method: "POST", headers: h, body: JSON.stringify({ e: String(data.email) }) })).json();
    if (uid) {
      await fetch(`${url}/rest/v1/wowah_subs`, { method: "POST", headers: { ...h, Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify({ uid }) });
      sub = (await (await fetch(`${url}/rest/v1/wowah_subs?uid=eq.${uid}&select=uid,supporter_until`, { headers: h })).json())[0];
    }
  }
  if (!sub) return new Response("no match");               // 對不到人的純贊助，照收
  const usd = Math.max(0, parseFloat(String(data.amount ?? "0")) || 0);
  const days = Math.max(30, Math.round(usd * 30));
  const base = Math.max(Date.now(), sub.supporter_until ? Date.parse(sub.supporter_until) : 0);
  const until = new Date(base + days * 86400000).toISOString();
  await fetch(`${url}/rest/v1/wowah_subs?uid=eq.${sub.uid}`, { method: "PATCH", headers: h, body: JSON.stringify({ supporter_until: until }) });
  return new Response("ok");
});
