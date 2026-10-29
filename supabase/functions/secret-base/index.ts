import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ElevenLabs 轉出來的中文是簡體，Discord 通知轉成台灣繁體（用到才載入；載入失敗就保留原文，不影響主流程）
let converter: ((text: string) => string) | null = null;
async function toTraditional(text: string) {
  try {
    if (!converter) {
      const OpenCC = await import('npm:opencc-js@1.0.5');
      converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
    }
    return converter!(text);
  } catch (error) {
    console.error('opencc', error);
    return text;
  }
}
const friendNames: Record<string, string> = { bear: '嚕嚕', sheep: '綿綿', bird: '啾啾' };

const allowedOrigins = new Set([
  'https://coomysf.github.io',
  'http://localhost:4000',
  'http://127.0.0.1:4173'
]);
const bucket = 'secret-base';
const maxAudioBytes = 10 * 1024 * 1024;
const audioTypes: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav'
};

const env = (name: string) => Deno.env.get(name) || '';
const parentKey = env('SECRET_BASE_PARENT_KEY');
// 每個孩子一把鑰匙（各自的平板網址）：[{ id, name, key }]；沒設定時退回舊的單一孩子設定
type Kid = { id: string; name: string; key: string };
const kids: Kid[] = (() => {
  try {
    const list = JSON.parse(env('SECRET_BASE_KIDS') || '[]');
    if (Array.isArray(list) && list.length) return list.filter(k => k && k.id && k.name && k.key);
  } catch (error) {
    console.error('SECRET_BASE_KIDS', error);
  }
  const key = env('SECRET_BASE_KID_KEY');
  return key ? [{ id: 'kid', name: env('SECRET_BASE_KID_NAME') || '小寶', key }] : [];
})();
const replyPage = env('SECRET_BASE_REPLY_URL') || 'https://coomysf.github.io/secret-base/reply/';

Deno.serve(async request => {
  const origin = request.headers.get('origin') || '';
  const cors = {
    'access-control-allow-origin': allowedOrigins.has(origin) ? origin : 'https://coomysf.github.io',
    'access-control-allow-headers': 'content-type, x-base-key',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'vary': 'Origin'
  };

  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (origin && !allowedOrigins.has(origin)) return json({ error: 'origin not allowed' }, 403, cors);

  const route = new URL(request.url).pathname.split('/secret-base')[1] || '/';
  const who = roleFor(request.headers.get('x-base-key') || '');
  if (!who) return json({ error: 'unauthorized' }, 401, cors);
  const role = who === 'parent' ? 'parent' : 'kid';
  const kid = who === 'parent' ? null : who;

  const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

  try {
    if (kid && request.method === 'POST' && route === '/kid/message') return await kidMessage(request, kid, supabase, cors);
    if (kid && request.method === 'GET' && route === '/kid/inbox') return await kidInbox(kid, supabase, cors);
    if (kid && request.method === 'POST' && route === '/kid/heard') return await kidHeard(request, kid, supabase, cors);
    if (role === 'parent' && request.method === 'GET' && route === '/parent/thread') return await parentThread(supabase, cors);
    if (role === 'parent' && request.method === 'POST' && route === '/parent/reply') return await parentReply(request, supabase, cors);
  } catch (error) {
    console.error(route, error);
    return json({ error: 'something went wrong' }, 500, cors);
  }

  return json({ error: 'not found' }, 404, cors);
});

type Db = ReturnType<typeof createClient>;
type Cors = Record<string, string>;

function roleFor(key: string): Kid | 'parent' | null {
  if (parentKey && safeEqual(key, parentKey)) return 'parent';
  return kids.find(kid => safeEqual(key, kid.key)) || null;
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// 孩子按住娃娃說完話：存錄音 → ElevenLabs 轉文字 → 發 Discord 給爸爸
async function kidMessage(request: Request, kid: Kid, supabase: Db, cors: Cors) {
  const form = await request.formData();
  const audio = form.get('audio');
  if (!(audio instanceof File) || audio.size === 0) return json({ error: 'audio required' }, 400, cors);
  if (audio.size > maxAudioBytes) return json({ error: 'audio too large' }, 413, cors);
  const mime = audio.type.split(';')[0];
  const ext = audioTypes[mime];
  if (!ext) return json({ error: 'unsupported audio' }, 415, cors);

  const id = crypto.randomUUID();
  const path = `kid/${id}.${ext}`;
  const bytes = new Uint8Array(await audio.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: mime });
  if (uploadError) throw uploadError;

  const friend = friendNames[String(form.get('friend') || '')] || '嚕嚕';
  const transcript = await transcribe(bytes, mime, ext).catch(error => {
    console.error('transcribe', error);
    return null;
  });

  const { error } = await supabase.from('secret_base_messages').insert({
    id, sender: 'kid', kid: kid.id, audio_path: path, audio_kind: 'recording', body: transcript
  });
  if (error) throw error;

  await notifyDiscord(id, kid, transcript, friend, bytes, mime, ext).catch(error => console.error('discord', error));
  return json({ id }, 200, cors);
}

async function kidInbox(kid: Kid, supabase: Db, cors: Cors) {
  const { data, error } = await supabase
    .from('secret_base_messages')
    .select('id, audio_path, created_at')
    .eq('sender', 'parent')
    .eq('kid', kid.id)
    .is('heard_at', null)
    .not('audio_path', 'is', null)
    .order('created_at', { ascending: true })
    .limit(10);
  if (error) throw error;
  return json({ letters: await withAudioUrls(supabase, data) }, 200, cors);
}

async function kidHeard(request: Request, kid: Kid, supabase: Db, cors: Cors) {
  const { id } = await request.json().catch(() => ({}));
  if (typeof id !== 'string') return json({ error: 'id required' }, 400, cors);
  const { error } = await supabase
    .from('secret_base_messages')
    .update({ heard_at: new Date().toISOString() })
    .eq('id', id)
    .eq('kid', kid.id)
    .eq('sender', 'parent')
    .is('heard_at', null);
  if (error) throw error;
  return json({ ok: true }, 200, cors);
}

async function parentThread(supabase: Db, cors: Cors) {
  const { data, error } = await supabase
    .from('secret_base_messages')
    .select('id, sender, kid, audio_path, audio_kind, body, reply_to, heard_at, created_at')
    .order('created_at', { ascending: false })
    .limit(120);
  if (error) throw error;
  return json({
    kids: kids.map(({ id, name }) => ({ id, name })),
    messages: (await withAudioUrls(supabase, data)).reverse()
  }, 200, cors);
}

// 爸爸回覆：錄音直接存；只有文字就用 ElevenLabs 念成爸爸的聲音。孩子不識字，所以一定要有聲音。
async function parentReply(request: Request, supabase: Db, cors: Cors) {
  const form = await request.formData();
  const text = String(form.get('text') || '').trim().slice(0, 2000) || null;
  const replyTo = String(form.get('reply_to') || '') || null;
  // 回給誰：某個孩子的代號，或 both（兩個都聽，各存一筆、共用同一段聲音）
  const to = String(form.get('to') || '');
  const targets = to === 'both' ? kids : kids.filter(kid => kid.id === to);
  if (!targets.length) return json({ error: 'to required' }, 400, cors);
  const audio = form.get('audio');
  const id = crypto.randomUUID();
  let path: string;
  let kind: 'recording' | 'tts';

  if (audio instanceof File && audio.size > 0) {
    if (audio.size > maxAudioBytes) return json({ error: 'audio too large' }, 413, cors);
    const mime = audio.type.split(';')[0];
    const ext = audioTypes[mime];
    if (!ext) return json({ error: 'unsupported audio' }, 415, cors);
    path = `parent/${id}.${ext}`;
    kind = 'recording';
    const { error } = await supabase.storage.from(bucket).upload(path, new Uint8Array(await audio.arrayBuffer()), { contentType: mime });
    if (error) throw error;
  } else if (text) {
    const speech = await speak(text);
    path = `parent/${id}.mp3`;
    kind = 'tts';
    const { error } = await supabase.storage.from(bucket).upload(path, speech, { contentType: 'audio/mpeg' });
    if (error) throw error;
  } else {
    return json({ error: 'text or audio required' }, 400, cors);
  }

  const rows = targets.map((kid, i) => ({
    id: i === 0 ? id : crypto.randomUUID(), sender: 'parent', kid: kid.id, audio_path: path, audio_kind: kind, body: text,
    reply_to: replyTo
  }));
  const { error } = await supabase.from('secret_base_messages').insert(rows);
  if (error) throw error;
  return json({ ids: rows.map(row => row.id), audio_kind: kind }, 200, cors);
}

async function withAudioUrls<T extends { audio_path: string | null }>(supabase: Db, rows: T[]) {
  const paths = rows.map(row => row.audio_path).filter((path): path is string => Boolean(path));
  if (!paths.length) return rows.map(row => ({ ...row, audio_url: null }));
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  const urls = new Map(data.map(item => [item.path, item.signedUrl]));
  return rows.map(row => ({ ...row, audio_url: row.audio_path ? urls.get(row.audio_path) || null : null }));
}

async function transcribe(bytes: Uint8Array, mime: string, ext: string) {
  const apiKey = env('ELEVENLABS_API_KEY');
  if (!apiKey) return null;
  const form = new FormData();
  form.append('model_id', 'scribe_v1');
  form.append('language_code', 'zho');
  form.append('file', new Blob([bytes], { type: mime }), `kid.${ext}`);
  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST', headers: { 'xi-api-key': apiKey }, body: form
  });
  if (!response.ok) throw new Error(`stt ${response.status}: ${await response.text()}`);
  const result = await response.json();
  return typeof result.text === 'string' ? (await toTraditional(result.text)).trim().slice(0, 2000) || null : null;
}

async function speak(text: string) {
  const apiKey = env('ELEVENLABS_API_KEY');
  const voiceId = env('ELEVENLABS_VOICE_ID');
  if (!apiKey || !voiceId) throw new Error('elevenlabs not configured');
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.55, similarity_boost: 0.85, style: 0.2 }
    })
  });
  if (!response.ok) throw new Error(`tts ${response.status}: ${await response.text()}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function notifyDiscord(id: string, kid: Kid, transcript: string | null, friend: string, bytes: Uint8Array, mime: string, ext: string) {
  const webhook = env('DISCORD_WEBHOOK_URL');
  if (!webhook) return;
  const said = transcript ? `「${transcript}」` : '（聽不太清楚，點錄音聽聽看）';
  const payload = {
    username: '秘密基地',
    content: `🐰 ${kid.name}在秘密基地跟${friend}說：\n> ${said}\n\n👉 回覆：${replyPage}#m=${id}`,
    allowed_mentions: { parse: [] }
  };
  const form = new FormData();
  form.append('payload_json', JSON.stringify(payload));
  form.append('files[0]', new Blob([bytes], { type: mime }), `${kid.name}.${ext}`);
  const response = await fetch(`${webhook}?wait=true`, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`discord ${response.status}: ${await response.text()}`);
}

function json(body: unknown, status: number, cors: Cors) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
