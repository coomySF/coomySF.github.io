#!/usr/bin/env node
// 秘密基地的腦，跑在家裡的 Mac 上：每隔幾秒問後端有沒有孩子還沒被回的話，
// 用 Claude Code（`claude -p`，吃個人訂閱）判斷要不要由娃娃先回，並寫一份給家長的小抄，再送回後端。
// 設定在 ~/.config/secret-base/agent.env：SECRET_BASE_AGENT_KEY、SECRET_BASE_ENDPOINT（選填）、CLAUDE_BIN（選填）。
import { execFile } from "node:child_process";
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const env = loadEnv(join(homedir(), ".config", "secret-base", "agent.env"));
const ENDPOINT = env.SECRET_BASE_ENDPOINT || "https://mzobbjuhoddruekmxzoe.supabase.co/functions/v1/secret-base";
const KEY = env.SECRET_BASE_AGENT_KEY;
const CLAUDE = env.CLAUDE_BIN || "claude";
const MODEL = env.CLAUDE_MODEL || "sonnet";
const POLL_MS = Number(env.POLL_MS || 15000);
const LOG = join(here, "agent.log");
const LOG_MAX = 2 * 1024 * 1024;

if (!KEY) { log("沒有 SECRET_BASE_AGENT_KEY，離開"); process.exit(1); }

const failures = new Map(); // id → 連續失敗次數；兩次就放棄這則，避免額度用完時一直重試

function loadEnv(file) {
  try {
    return Object.fromEntries(readFileSync(file, "utf8").split("\n").filter(l => l.includes("=") && !l.startsWith("#")).map(l => {
      const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }));
  } catch { return {}; }
}
function log(...parts) {
  const line = `[${new Date().toISOString()}] ${parts.join(" ")}\n`;
  process.stdout.write(line);
  try {
    mkdirSync(here, { recursive: true });
    let size = 0; try { size = readFileSync(LOG).length; } catch {}
    if (size > LOG_MAX) appendFileSync(LOG, "", { flag: "w" });
    appendFileSync(LOG, line);
  } catch {}
}

const api = async (path, init = {}) => fetch(`${ENDPOINT}${path}`, { ...init, headers: { "x-base-key": KEY, "content-type": "application/json", ...(init.headers || {}) } });

function prompt(item, presence) {
  const recent = item.recent.length
    ? item.recent.map(m => `- ${m.sender === "kid" ? item.kid_name : m.sender === "doll" ? item.friend : "爸媽"}：${m.body}`).join("\n")
    : "（沒有）";
  return `你在一個叫「秘密基地」的小程式裡工作。孩子（${item.kid_name}，學齡前到小學低年級，不識字）會對一隻 3D 娃娃「${item.friend}」說悄悄話，爸媽之後會用自己的聲音回信。你有兩個工作：決定娃娃現在要不要先回、回什麼；以及寫一份給爸媽的小抄。

家長目前的狀態：${presence === "here" ? "我在（家長會親口回，娃娃只在緊急時開口）" : "我忙（娃娃可以先接住孩子）"}

${item.kid_name}最近的對話（舊到新）：
${recent}

${item.kid_name}剛剛對${item.friend}說：
「${item.body}」

請先判斷 mode，四選一：
- "doll"：日常分享、抒發情緒、問娃娃問題、想玩。娃娃以「${item.friend}」的身分回，20 秒內能念完（最多 60 個字），先接住情緒，頂多問一個問題，不說教、不給建議、不承諾爸媽會做什麼、絕對不假裝自己是爸媽。
- "pass"：孩子明確在找爸爸或媽媽（例如「爸爸你在嗎」「媽媽我想你」），或在問需要大人決定的事（可不可以、要買、明天要不要）。娃娃只回一句「我幫你把話送給爸爸媽媽了」這類的話，不回內容。
- "urgent"：提到受傷、生病、很怕某個人、有人叫他保密、不想活、被打、被欺負等需要大人馬上處理的事。娃娃只說「這件事很重要，我會請媽媽來」，一個字的建議都不給。
- "skip"：聽不懂、只是雜音或無法判斷。娃娃不回。

小抄給爸媽看，用繁體中文、口語、每項一到兩句：
- state：孩子現在的狀態與可能的原因（不要過度解讀，不確定就說不確定）
- advice：建議爸媽怎麼回的方向，是原則不是劇本
- suggestion：一個今天或這週就能做的陪伴提議，具體到時間與做法
- drafts：三句爸媽可以直接用自己的聲音念給孩子的回信，第一人稱、像爸媽平常講話、各 30 字內、三句方向不同

只輸出一個 JSON 物件，不要任何其他文字、不要 markdown 圍欄：
{"mode":"doll|pass|urgent|skip","reply":"娃娃要說的話，skip 時為空字串","analysis":{"state":"","advice":"","suggestion":"","drafts":["","",""]}}`;
}

function runClaude(text) {
  return new Promise((resolve, reject) => {
    const child = execFile(CLAUDE, ["-p", "--output-format", "json", "--model", MODEL], { maxBuffer: 4 * 1024 * 1024, timeout: 120000, env: { ...process.env, HOME: homedir() } },
      (error, stdout, stderr) => error ? reject(new Error(`${error.message}\n${stderr}`.trim())) : resolve(stdout));
    child.stdin.end(text);
  });
}

function parseResult(stdout) {
  let text = stdout;
  try { const wrapped = JSON.parse(stdout); if (typeof wrapped.result === "string") text = wrapped.result; } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("沒有 JSON：" + text.slice(0, 200));
  const out = JSON.parse(m[0]);
  if (!["doll", "pass", "urgent", "skip"].includes(out.mode)) throw new Error("mode 不合法：" + out.mode);
  return { mode: out.mode, reply: String(out.reply || ""), analysis: out.analysis && typeof out.analysis === "object" ? out.analysis : {} };
}

async function handle(item, presence) {
  log(`處理 ${item.kid_name} ${item.id.slice(0, 8)}：「${item.body.slice(0, 40)}」`);
  let result;
  try {
    result = parseResult(await runClaude(prompt(item, presence)));
  } catch (error) {
    const n = (failures.get(item.id) || 0) + 1;
    failures.set(item.id, n);
    log(`claude 失敗（第 ${n} 次）：${String(error).slice(0, 300)}`);
    if (n < 2) return;
    result = { mode: "skip", reply: "", analysis: { error: String(error).slice(0, 200) } };
    log(`放棄這則，標成 skip`);
  }
  const res = await api("/agent/result", { method: "POST", body: JSON.stringify({ id: item.id, ...result }) });
  const body = await res.json().catch(() => ({}));
  log(`→ ${result.mode} ${res.status} ${body.letter_id ? "已寄娃娃的信" : ""}`);
  failures.delete(item.id);
}

let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try {
    const res = await api("/agent/pending");
    if (!res.ok) { log(`pending ${res.status}`); return; }
    const { items, presence } = await res.json();
    for (const item of items) await handle(item, presence);
  } catch (error) {
    log(`tick 失敗：${String(error).slice(0, 200)}`);
  } finally {
    busy = false;
  }
}

log(`啟動，每 ${POLL_MS / 1000} 秒看一次；模型 ${MODEL}`);
tick();
setInterval(tick, POLL_MS);
