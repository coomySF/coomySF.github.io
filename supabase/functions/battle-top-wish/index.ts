import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://coomysf.github.io',
  'http://localhost:4000',
  'http://127.0.0.1:4173'
]);
const features = new Set(['customize', 'daily', 'physical', 'live-room']);

Deno.serve(async request => {
  const origin = request.headers.get('origin') || '';
  const cors = {
    'access-control-allow-origin': allowedOrigins.has(origin) ? origin : 'https://coomysf.github.io',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'vary': 'Origin'
  };

  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (origin && !allowedOrigins.has(origin)) return json({ error: 'origin not allowed' }, 403, cors);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  if (request.method === 'GET') {
    const { data, error } = await supabase.from('battle_top_wishes').select('feature,vote_count');
    if (error) return json({ error: 'counts unavailable' }, 500, cors);
    return json({ counts: Object.fromEntries(data.map(row => [row.feature, Number(row.vote_count)])) }, 200, cors);
  }

  if (request.method === 'POST') {
    let body: { feature?: string };
    try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400, cors); }
    if (!body.feature || !features.has(body.feature)) return json({ error: 'invalid feature' }, 400, cors);
    const { data, error } = await supabase.rpc('increment_battle_top_wish', { feature_id: body.feature });
    if (error) return json({ error: 'vote unavailable' }, 500, cors);
    return json({ feature: body.feature, count: Number(data) }, 200, cors);
  }

  return json({ error: 'method not allowed' }, 405, cors);
});

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
