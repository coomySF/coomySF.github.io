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
const maxPhotoBytes = 6 * 1024 * 1024;
const photoTypes: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
// 貼紙的代號固定在這裡，孩子頁與回信頁各有一份同樣的表；信裡只存代號
const stickers: Record<string, string> = {
  star: '星星', medal: '獎牌', rainbow: '彩虹', unicorn: '獨角獸', strawberry: '草莓',
  rocket: '火箭', heart: '愛心', chick: '小雞', icecream: '冰淇淋', dino: '恐龍'
};
type Attachment = { kind: 'photo'; path: string } | { kind: 'sticker'; sticker: string };
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
// Mac 上的 agent 用這把鑰匙取待回的話、送回判斷結果；娃娃回信用另一個聲音，刻意不用家長的聲音
const agentKey = env('SECRET_BASE_AGENT_KEY');
const dollVoiceId = env('SECRET_BASE_DOLL_VOICE_ID') || 'pFZP5JQG7iQjIQuC4Bku';

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
  const key = request.headers.get('x-base-key') || '';
  if (agentKey && safeEqual(key, agentKey)) {
    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
    try {
      if (request.method === 'GET' && route === '/agent/pending') return await agentPending(supabase, cors);
      if (request.method === 'POST' && route === '/agent/result') return await agentResult(request, supabase, cors);
      return json({ error: 'not found' }, 404, cors);
    } catch (error) {
      console.error(route, error);
      return json({ error: 'server error' }, 500, cors);
    }
  }
  const who = roleFor(key);
  if (!who) return json({ error: 'unauthorized' }, 401, cors);
  const role = who === 'parent' ? 'parent' : 'kid';
  const kid = who === 'parent' ? null : who;

  const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

  try {
    if (kid && request.method === 'POST' && route === '/kid/message') return await kidMessage(request, kid, supabase, cors);
    if (kid && request.method === 'GET' && route === '/kid/inbox') return await kidInbox(kid, supabase, cors);
    if (kid && request.method === 'GET' && route === '/kid/letters') return await kidLetters(kid, supabase, cors);
    if (kid && request.method === 'GET' && route === '/kid/stickers') return await kidStickers(kid, supabase, cors);
    if (kid && request.method === 'POST' && route === '/kid/heard') return await kidHeard(request, kid, supabase, cors);
    if (role === 'parent' && request.method === 'GET' && route === '/parent/thread') return await parentThread(supabase, cors);
    if (role === 'parent' && request.method === 'POST' && route === '/parent/reply') return await parentReply(request, supabase, cors);
    if (role === 'parent' && request.method === 'GET' && route === '/parent/presence') return json({ presence: await getPresence(supabase) }, 200, cors);
    if (role === 'parent' && request.method === 'POST' && route === '/parent/presence') return await setPresence(request, supabase, cors);
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
    id, sender: 'kid', kid: kid.id, audio_path: path, audio_kind: 'recording', body: transcript, friend
  });
  if (error) throw error;

  await notifyDiscord(id, kid, transcript, friend, bytes, mime, ext).catch(error => console.error('discord', error));
  return json({ id }, 200, cors);
}

async function kidInbox(kid: Kid, supabase: Db, cors: Cors) {
  const { data, error } = await supabase
    .from('secret_base_messages')
    .select('id, audio_path, attachment, created_at')
    .in('sender', ['parent', 'doll'])
    .eq('kid', kid.id)
    .is('heard_at', null)
    .not('audio_path', 'is', null)
    .order('created_at', { ascending: true })
    .limit(10);
  if (error) throw error;
  return json({ letters: await withAudioUrls(supabase, data) }, 200, cors);
}

// 孩子聽過的信（最近的在前），讓孩子可以在信箱再聽一次
async function kidLetters(kid: Kid, supabase: Db, cors: Cors) {
  const { data, error } = await supabase
    .from('secret_base_messages')
    .select('id, audio_path, attachment, created_at, heard_at')
    .in('sender', ['parent', 'doll'])
    .eq('kid', kid.id)
    .not('heard_at', 'is', null)
    .not('audio_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return json({ letters: await withAudioUrls(supabase, data) }, 200, cors);
}

// 貼紙簿：孩子聽過的信裡附的貼紙，舊的在前
async function kidStickers(kid: Kid, supabase: Db, cors: Cors) {
  const { data, error } = await supabase
    .from('secret_base_messages')
    .select('id, attachment, created_at')
    .eq('sender', 'parent')
    .eq('kid', kid.id)
    .not('heard_at', 'is', null)
    .eq('attachment->>kind', 'sticker')
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  const list = (data as { id: string; attachment: Attachment; created_at: string }[])
    .filter(row => row.attachment.kind === 'sticker')
    .map(row => ({ id: row.id, sticker: (row.attachment as { sticker: string }).sticker, created_at: row.created_at }));
  return json({ stickers: list }, 200, cors);
}

async function kidHeard(request: Request, kid: Kid, supabase: Db, cors: Cors) {
  const { id } = await request.json().catch(() => ({}));
  if (typeof id !== 'string') return json({ error: 'id required' }, 400, cors);
  const { error } = await supabase
    .from('secret_base_messages')
    .update({ heard_at: new Date().toISOString() })
    .eq('id', id)
    .eq('kid', kid.id)
    .in('sender', ['parent', 'doll'])
    .is('heard_at', null);
  if (error) throw error;
  return json({ ok: true }, 200, cors);
}

async function parentThread(supabase: Db, cors: Cors) {
  const { data, error } = await supabase
    .from('secret_base_messages')
    .select('id, sender, kid, friend, audio_path, audio_kind, body, attachment, reply_to, heard_at, analysis, created_at')
    .order('created_at', { ascending: false })
    .limit(120);
  if (error) throw error;
  return json({
    kids: kids.map(({ id, name }) => ({ id, name })),
    presence: await getPresence(supabase),
    messages: (await withAudioUrls(supabase, data)).reverse()
  }, 200, cors);
}

// 爸爸回覆：錄音直接存；只有文字就用 ElevenLabs 念成爸爸的聲音。孩子不識字，所以一定要有聲音。
// 可以附一張照片或一張貼紙；什麼話都沒留時由娃娃用自己的聲音報一句（刻意不用家長的聲音說家長沒說過的話）。
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
  let kind: 'recording' | 'tts' | 'doll';

  const photo = form.get('photo');
  const stickerId = String(form.get('sticker') || '');
  let attachment: Attachment | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > maxPhotoBytes) return json({ error: 'photo too large' }, 413, cors);
    const ext = photoTypes[photo.type];
    if (!ext) return json({ error: 'unsupported photo' }, 415, cors);
    const photoPath = `photo/${id}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(photoPath, new Uint8Array(await photo.arrayBuffer()), { contentType: photo.type });
    if (error) throw error;
    attachment = { kind: 'photo', path: photoPath };
  } else if (stickerId) {
    if (!stickers[stickerId]) return json({ error: 'unknown sticker' }, 400, cors);
    attachment = { kind: 'sticker', sticker: stickerId };
  }
  let body = text;

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
  } else if (attachment) {
    body = attachment.kind === 'photo' ? '爸爸媽媽寄了一張照片給你，你看！' : `爸爸媽媽送你一張${stickers[attachment.sticker]}貼紙！`;
    const speech = await speak(body, dollVoiceId);
    path = `parent/${id}.mp3`;
    kind = 'doll';
    const { error } = await supabase.storage.from(bucket).upload(path, speech, { contentType: 'audio/mpeg' });
    if (error) throw error;
  } else {
    return json({ error: 'text, audio, photo or sticker required' }, 400, cors);
  }

  const rows = targets.map((kid, i) => ({
    id: i === 0 ? id : crypto.randomUUID(), sender: 'parent', kid: kid.id, audio_path: path, audio_kind: kind, body,
    attachment, reply_to: replyTo
  }));
  const { error } = await supabase.from('secret_base_messages').insert(rows);
  if (error) throw error;
  return json({ ids: rows.map(row => row.id), audio_kind: kind }, 200, cors);
}

// 聲音和照片都放在私有 bucket，回給前端的是一小時有效的簽名網址
async function withAudioUrls<T extends { audio_path: string | null; attachment?: Attachment | null }>(supabase: Db, rows: T[]) {
  const paths = new Set<string>();
  for (const row of rows) {
    if (row.audio_path) paths.add(row.audio_path);
    if (row.attachment?.kind === 'photo') paths.add(row.attachment.path);
  }
  const urls = new Map<string, string>();
  if (paths.size) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls([...paths], 60 * 60);
    if (error) throw error;
    data.forEach(item => item.path && item.signedUrl && urls.set(item.path, item.signedUrl));
  }
  return rows.map(row => ({
    ...row,
    audio_url: row.audio_path ? urls.get(row.audio_path) || null : null,
    attachment: row.attachment?.kind === 'photo' ? { ...row.attachment, url: urls.get(row.attachment.path) || null } : row.attachment ?? null
  }));
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

async function speak(text: string, voiceId = env('ELEVENLABS_VOICE_ID')) {
  const apiKey = env('ELEVENLABS_API_KEY');
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

// ---------- 家長的「我在／我忙」：我在 → 娃娃只處理緊急；我忙 → 娃娃先回 ----------
type Presence = 'here' | 'away';
async function getPresence(supabase: Db): Promise<Presence> {
  const { data } = await supabase.from('secret_base_settings').select('value').eq('key', 'presence').maybeSingle();
  return data?.value === 'here' ? 'here' : 'away';
}
async function setPresence(request: Request, supabase: Db, cors: Cors) {
  const { presence } = await request.json().catch(() => ({}));
  if (presence !== 'here' && presence !== 'away') return json({ error: 'presence must be here or away' }, 400, cors);
  const { error } = await supabase.from('secret_base_settings').upsert({ key: 'presence', value: presence, updated_at: new Date().toISOString() });
  if (error) throw error;
  return json({ presence }, 200, cors);
}

// ---------- Mac 上的 agent ----------
// 待回：最近兩小時內、有逐字稿、還沒判斷過的孩子的話，附同一個孩子最近的對話當脈絡。
// 只看兩小時是為了 Mac 睡了一覺醒來時，不要對半天前的話突然回信。
async function agentPending(supabase: Db, cors: Cors) {
  const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from('secret_base_messages')
    .select('id, kid, friend, body, created_at')
    .eq('sender', 'kid')
    .is('analyzed_at', null)
    .not('body', 'is', null)
    .gt('created_at', since)
    .order('created_at', { ascending: true })
    .limit(5);
  if (error) throw error;
  const items = [];
  for (const row of data) {
    const { data: recent } = await supabase
      .from('secret_base_messages')
      .select('sender, body, created_at')
      .eq('kid', row.kid)
      .lt('created_at', row.created_at)
      .not('body', 'is', null)
      .order('created_at', { ascending: false })
      .limit(8);
    const kid = kids.find(k => k.id === row.kid);
    items.push({
      id: row.id, kid: row.kid, kid_name: kid?.name || '孩子', friend: friendNames[row.friend || ''] || row.friend || '娃娃',
      body: row.body, created_at: row.created_at, recent: (recent || []).reverse()
    });
  }
  return json({ presence: await getPresence(supabase), kids: kids.map(({ id, name }) => ({ id, name })), items }, 200, cors);
}

// 判斷結果：存小抄；doll／pass／urgent 有回話就用娃娃的聲音念成信；小抄發到 Discord。
// 「我在」時 doll 這一格不寄信（留給家長親口回），urgent 與 pass 照寄。
type AgentMode = 'doll' | 'pass' | 'urgent' | 'skip';
async function agentResult(request: Request, supabase: Db, cors: Cors) {
  const payload = await request.json().catch(() => null);
  const id = String(payload?.id || '');
  const mode = (['doll', 'pass', 'urgent', 'skip'] as AgentMode[]).includes(payload?.mode) ? payload.mode as AgentMode : 'skip';
  const reply = String(payload?.reply || '').trim().slice(0, 400);
  const analysis = payload?.analysis && typeof payload.analysis === 'object' ? payload.analysis : {};
  if (!id) return json({ error: 'id required' }, 400, cors);

  const { data: message, error: readError } = await supabase
    .from('secret_base_messages').select('id, kid, friend, body, analyzed_at').eq('id', id).eq('sender', 'kid').maybeSingle();
  if (readError) throw readError;
  if (!message) return json({ error: 'not found' }, 404, cors);
  if (message.analyzed_at) return json({ ok: true, duplicate: true }, 200, cors);

  const presence = await getPresence(supabase);
  const kid = kids.find(k => k.id === message.kid);
  const sendLetter = Boolean(reply) && (mode === 'urgent' || mode === 'pass' || (mode === 'doll' && presence === 'away'));
  let letterId: string | null = null;
  if (sendLetter && kid) {
    try {
      const speech = await speak(reply, dollVoiceId);
      letterId = crypto.randomUUID();
      const path = `doll/${letterId}.mp3`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, speech, { contentType: 'audio/mpeg' });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from('secret_base_messages').insert({
        id: letterId, sender: 'doll', kid: kid.id, friend: message.friend, audio_path: path, audio_kind: 'tts', body: reply, reply_to: id
      });
      if (error) throw error;
    } catch (error) {
      console.error('doll letter', error);
      letterId = null;
    }
  }

  const stored = { ...analysis, mode, reply: reply || null, letter_id: letterId, presence };
  const { error: updateError } = await supabase
    .from('secret_base_messages').update({ analysis: stored, analyzed_at: new Date().toISOString() }).eq('id', id);
  if (updateError) throw updateError;

  if (kid) await notifyCoach(id, kid, message.body, mode, reply, letterId, analysis).catch(error => console.error('discord coach', error));
  return json({ ok: true, letter_id: letterId }, 200, cors);
}

// Discord 小抄：孩子狀態、建議、陪伴提議、三句草稿；緊急的 @here
async function notifyCoach(id: string, kid: Kid, said: string | null, mode: AgentMode, reply: string, letterId: string | null, analysis: Record<string, unknown>) {
  const webhook = env('DISCORD_WEBHOOK_URL');
  if (!webhook) return;
  const line = (label: string, value: unknown) => (typeof value === 'string' && value.trim() ? `**${label}**：${value.trim()}\n` : '');
  const drafts = Array.isArray(analysis.drafts) ? analysis.drafts.filter(d => typeof d === 'string' && d.trim()).slice(0, 3) : [];
  const head =
    mode === 'urgent' ? `🚨 @here **${kid.name}說了需要大人馬上看的事**` :
    mode === 'pass' ? `🙋 **${kid.name}在找你**（娃娃沒回內容，只說會把話帶到）` :
    mode === 'doll' ? (letterId ? `🧸 娃娃先回了${kid.name}` : `🧸 娃娃沒回（你在），等你親口回${kid.name}`) :
    `📝 ${kid.name}的小抄`;
  const content =
    `${head}\n` +
    (said ? `> ${said}\n` : '') +
    (reply && letterId ? `🗣 娃娃說：「${reply}」\n` : '') +
    `\n` +
    line('狀態', analysis.state) +
    line('建議', analysis.advice) +
    line('陪伴提議', analysis.suggestion) +
    (drafts.length ? `**一鍵回**（回信頁點一句就用你的聲音送）\n${drafts.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n` : '') +
    `👉 ${replyPage}#m=${id}`;
  const response = await fetch(`${webhook}?wait=true`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: '秘密基地小抄', content: content.slice(0, 1900), allowed_mentions: { parse: mode === 'urgent' ? ['everyone'] : [] } })
  });
  if (!response.ok) throw new Error(`discord ${response.status}: ${await response.text()}`);
}

function json(body: unknown, status: number, cors: Cors) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
