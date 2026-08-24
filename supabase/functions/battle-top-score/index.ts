import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://coomysf.github.io',
  'http://localhost:4000',
  'http://127.0.0.1:4173'
]);
const avatars = new Set(['nova', 'kai', 'rin', 'leo', 'mika', 'zane', 'astra', 'jett', 'luna', 'onyx', 'skye', 'blaze']);
const maxScore = 1_000_000;
const soloScoreCeiling = 1_500;

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

  if (request.method === 'GET') {
    const url = new URL(request.url);
    return url.searchParams.has('history') ? battleHistory(url, supabase, cors) : leaderboard(request, supabase, cors);
  }
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, cors);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400, cors); }

  const entry = {
    client_event_id: String(body.id || '').toUpperCase(),
    nickname: String(body.name || '').trim(),
    avatar: String(body.avatar || ''),
    top_name: String(body.top || '').trim(),
    score: Number(body.score),
    won: body.won === true,
    player_id: normalizePlayerId(body.playerId)
  };

  if (!/^[A-Z0-9]{5,16}$/.test(entry.client_event_id)) return json({ error: 'invalid event id' }, 400, cors);
  if (!entry.nickname || [...entry.nickname].length > 10) return json({ error: 'invalid nickname' }, 400, cors);
  if (!avatars.has(entry.avatar)) return json({ error: 'invalid avatar' }, 400, cors);
  if (!entry.top_name || [...entry.top_name].length > 30) return json({ error: 'invalid top name' }, 400, cors);
  if (!Number.isInteger(entry.score) || entry.score < 100 || entry.score > maxScore) return json({ error: 'invalid score' }, 400, cors);
  if (!entry.player_id) return json({ error: 'invalid player id' }, 400, cors);

  const sourceIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateKey = await sha256(`${sourceIp}:${entry.player_id}`);
  const { data: rateAllowed, error: rateError } = await supabase.rpc('consume_battle_top_rate_limit', { input_key: rateKey, max_hits: 12, window_seconds: 60 });
  if (rateError) return json({ error: 'rate limit unavailable' }, 500, cors);
  if (!rateAllowed) return json({ error: 'too many requests' }, 429, cors);

  const challenge = body.match && typeof body.match === 'object' ? body.match as Record<string, unknown> : null;
  let match: Record<string, unknown> | null = null;

  if (!challenge && entry.score > soloScoreCeiling) return json({ error: 'score exceeds solo ceiling' }, 400, cors);
  if (challenge) {
    const matchId = String(challenge.id || '').toUpperCase();
    const defenderEventId = String(challenge.defenderEventId || '').toUpperCase();
    const claimedPlayerId = normalizePlayerId(challenge.defenderPlayerId);
    if (!/^[A-Z0-9]{5,16}$/.test(matchId) || !/^[A-Z0-9]{5,16}$/.test(defenderEventId)) return json({ error: 'invalid match' }, 400, cors);
    if (claimedPlayerId === entry.player_id) return json({ error: 'cannot challenge self' }, 400, cors);
    const { data: defender, error: defenderError } = await supabase
      .from('battle_top_player_bests')
      .select('client_event_id,player_id,nickname,avatar,top_name,score')
      .eq('client_event_id', defenderEventId)
      .maybeSingle();
    if (defenderError || !defender) return json({ error: 'defender unavailable' }, 400, cors);
    if (claimedPlayerId && claimedPlayerId !== defender.player_id) return json({ error: 'defender mismatch' }, 400, cors);
    if (!entry.won && entry.score > soloScoreCeiling) return json({ error: 'losing score exceeds ceiling' }, 400, cors);
    if (entry.won && entry.score > Number(defender.score) + 25) return json({ error: 'challenge score exceeds ceiling' }, 400, cors);
    if (defender.player_id) match = {
      client_match_id: matchId,
      challenger_player_id: entry.player_id,
      challenger_nickname: entry.nickname,
      challenger_avatar: entry.avatar,
      challenger_top_name: entry.top_name,
      defender_player_id: defender.player_id,
      defender_nickname: defender.nickname,
      defender_avatar: defender.avatar,
      defender_top_name: defender.top_name,
      challenger_won: entry.won,
      score: entry.score
    };
  }

  const { error } = await supabase.from('battle_top_scores').insert(entry);
  if (error && error.code !== '23505') return json({ error: 'score unavailable' }, 500, cors);
  if (match) {
    const { error: matchError } = await supabase.from('battle_top_matches').insert(match);
    if (matchError && matchError.code !== '23505') return json({ error: 'match unavailable' }, 500, cors);
  }
  return leaderboard(request, supabase, cors);
});

async function leaderboard(request: Request, supabase: ReturnType<typeof createClient>, cors: Record<string, string>) {
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '50', 10) || 50));
  const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0);
  const requestedId = String(url.searchParams.get('id') || '').toUpperCase();
  const search = String(url.searchParams.get('q') || '').trim().slice(0, 30).replace(/[,%_]/g, '');
  let scoresQuery = supabase
    .from('battle_top_player_bests')
    .select('client_event_id,nickname,avatar,top_name,score,won,created_at,player_id', { count: 'exact' })
    .order('score', { ascending: false })
    .order('created_at', { ascending: true });

  if (/^[A-Z0-9]{5,16}$/.test(requestedId)) scoresQuery = scoresQuery.eq('client_event_id', requestedId);
  else if (search) scoresQuery = scoresQuery.or(`nickname.ilike.%${search}%,top_name.ilike.%${search}%`);

  const [scoresResult, totalResult] = await Promise.all([
    scoresQuery.range(offset, offset + limit - 1),
    supabase.from('battle_top_player_bests').select('client_event_id', { count: 'exact', head: true })
  ]);
  if (scoresResult.error || totalResult.error) return json({ error: 'leaderboard unavailable' }, 500, cors);

  const scores = scoresResult.data.map(row => ({ id: row.client_event_id, playerId: row.player_id, name: row.nickname, avatar: row.avatar, top: row.top_name, score: row.score, won: row.won, createdAt: row.created_at }));
  const filteredPlayers = scoresResult.count || 0;
  return json({
    scores,
    totalPlayers: totalResult.count || 0,
    filteredPlayers,
    offset,
    limit,
    hasMore: offset + scores.length < filteredPlayers
  }, 200, cors);
}

async function battleHistory(url: URL, supabase: ReturnType<typeof createClient>, cors: Record<string, string>) {
  const playerId = normalizePlayerId(url.searchParams.get('history'));
  if (!playerId) return json({ error: 'invalid player id' }, 400, cors);
  const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '30', 10) || 30));
  const { data, error } = await supabase
    .from('battle_top_matches')
    .select('client_match_id,challenger_player_id,challenger_nickname,challenger_avatar,challenger_top_name,challenger_won,score,created_at')
    .eq('defender_player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return json({ error: 'history unavailable' }, 500, cors);
  const history = data.map(row => ({
    id: row.client_match_id,
    playerId: row.challenger_player_id,
    name: row.challenger_nickname,
    avatar: row.challenger_avatar,
    top: row.challenger_top_name,
    score: row.score,
    defended: !row.challenger_won,
    createdAt: row.created_at
  }));
  return json({ history }, 200, cors);
}

function normalizePlayerId(value: unknown) {
  const id = String(value || '').toUpperCase();
  return /^[A-Z0-9]{16,40}$/.test(id) ? id : null;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
