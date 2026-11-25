// Ko-fi 贊助 webhook：用留言裡的 6 碼支持者代碼、或贊助者信箱找到玩家，標成永久支持者（推播上限 3 → 30）
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
  // 捐過一次（任何金額）就永久解鎖：期限設到很遠的未來，之後再捐也維持永久
  const until = "2999-12-31T00:00:00Z";
  const first = !sub.supporter_until;
  await fetch(`${url}/rest/v1/wowah_subs?uid=eq.${sub.uid}`, { method: "PATCH", headers: h, body: JSON.stringify({ supporter_until: until }) });
  // 第一次解鎖：在玩家自己的 Discord 送一則感謝（順便確認推播是通的）
  if (first) {
    const [row] = await (await fetch(`${url}/rest/v1/wowah_subs?uid=eq.${sub.uid}&select=webhook`, { headers: h })).json();
    if (row?.webhook) {
      await fetch(row.webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        username: "台灣拍賣場到價提醒", allowed_mentions: { parse: [] },
        content: "☕ 收到你的支持了，真的謝謝你！30 個推播已經幫你開好。下次在拍賣場搶到好價，記得回來跟我說一聲。—— Coomy",
      }) }).catch(() => {});
    }
  }
  return new Response("ok");
});
