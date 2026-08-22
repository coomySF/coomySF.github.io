import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://coomysf.github.io',
  'http://localhost:4000',
  'http://127.0.0.1:4173'
]);
const avatars = new Set(['nova', 'kai', 'rin', 'leo', 'mika', 'zane', 'astra', 'jett', 'luna', 'onyx', 'skye', 'blaze']);
const maxScore = 1_000_000;

Deno.serve(async request => {
  const origin = request.headers.get('origin') || '';
  const cors = {
    'access-control-allow-origin': allowedOrigins.has(origin) ? origin : 'https://coomysf.github.io',
    'access-control-allow-headers': 'content-type, authorization, apikey',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'vary': 'Origin'
  };

  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (origin && !allowedOrigins.has(origin)) return json({ error: 'origin not allowed' }, 403, cors);

  const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
  const secretKey = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secretKey) return json({ error: 'server configuration unavailable' }, 500, cors);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, secretKey, { auth: { persistSession: false } });

  if (request.method === 'GET') return leaderboard(supabase, cors);
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, cors);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400, cors); }

  const entry = {
    client_event_id: String(body.id || '').toUpperCase(),
    nickname: String(body.name || '').trim(),
    avatar: String(body.avatar || ''),
    top_name: String(body.top || '').trim(),
    score: Number(body.score),
    won: body.won === true
  };

  if (!/^[A-Z0-9]{5,16}$/.test(entry.client_event_id)) return json({ error: 'invalid event id' }, 400, cors);
  if (!entry.nickname || [...entry.nickname].length > 10) return json({ error: 'invalid nickname' }, 400, cors);
  if (!avatars.has(entry.avatar)) return json({ error: 'invalid avatar' }, 400, cors);
  if (!entry.top_name || [...entry.top_name].length > 30) return json({ error: 'invalid top name' }, 400, cors);
  if (!Number.isInteger(entry.score) || entry.score < 100 || entry.score > maxScore) return json({ error: 'invalid score' }, 400, cors);

  const { error } = await supabase.from('battle_top_scores').insert(entry);
  if (error && error.code !== '23505') return json({ error: 'score unavailable' }, 500, cors);
  return leaderboard(supabase, cors);
});

async function leaderboard(supabase: ReturnType<typeof createClient>, cors: Record<string, string>) {
  const { data, error } = await supabase
    .from('battle_top_scores')
    .select('client_event_id,nickname,avatar,top_name,score,won,created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) return json({ error: 'leaderboard unavailable' }, 500, cors);
  const bestByPlayer = new Map<string, typeof data[number]>();
  data.forEach(row => {
    const key = `${row.nickname.trim().toLocaleLowerCase()}::${row.avatar}`;
    if (!bestByPlayer.has(key)) bestByPlayer.set(key, row);
  });
  const scores = [...bestByPlayer.values()].map(row => ({ id: row.client_event_id, name: row.nickname, avatar: row.avatar, top: row.top_name, score: row.score, won: row.won, createdAt: row.created_at }));
  return json({ scores }, 200, cors);
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
