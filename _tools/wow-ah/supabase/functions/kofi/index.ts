// Ko-fi 贊助 webhook：留言裡有 6 碼支持者代碼，就延長那個人的贊助期限（每 1 美元 30 天，至少 30 天）
// 部署：supabase functions deploy kofi --no-verify-jwt
// 密鑰：supabase secrets set KOFI_TOKEN=<Ko-fi 後台 API 頁的 Verification Token>
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const form = await req.formData();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(String(form.get("data") ?? "{}")); } catch { return new Response("bad data", { status: 400 }); }
  if (!data.verification_token || data.verification_token !== Deno.env.get("KOFI_TOKEN")) {
    return new Response("bad token", { status: 401 });
  }
  const code = String(data.message ?? "").toUpperCase().match(/\b[0-9A-F]{6}\b/)?.[0];
  if (!code) return new Response("no code");               // 沒附代碼的純贊助，照收
  const usd = Math.max(0, parseFloat(String(data.amount ?? "0")) || 0);
  const days = Math.max(30, Math.round(usd * 30));
  const url = Deno.env.get("SUPABASE_URL")!, key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const r = await fetch(`${url}/rest/v1/subs?code=eq.${code}&select=uid,supporter_until`, { headers: h });
  const [sub] = await r.json();
  if (!sub) return new Response("unknown code");
  const base = Math.max(Date.now(), sub.supporter_until ? Date.parse(sub.supporter_until) : 0);
  const until = new Date(base + days * 86400000).toISOString();
  await fetch(`${url}/rest/v1/subs?uid=eq.${sub.uid}`, { method: "PATCH", headers: h, body: JSON.stringify({ supporter_until: until }) });
  return new Response("ok");
});
