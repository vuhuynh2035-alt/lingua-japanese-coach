import type { AiProvider } from "@/lib/ai-providers";

/** `audio` (Gemini only) is a voice recording sent together with the text of that message. */
export type ChatMessage = { role: "user" | "assistant"; content: string; audio?: { mimeType: string; data: string } };
export type AiErrorKind = "auth" | "quota" | "model" | "busy" | "network" | "timeout" | "other";

export class AiError extends Error {
  kind: AiErrorKind;
  status?: number;
  /** One line per failed attempt ("model · key: reason"), shown to help diagnose. */
  details: string[] = [];
  /** The provider's own error text, if any. */
  detail = "";
  constructor(kind: AiErrorKind, message: string, status?: number) {
    super(message);
    this.name = "AiError";
    this.kind = kind;
    this.status = status;
  }
}

export type KeyRef = { id: string; label: string; value: string };
export type FailoverResult<T> = { value: T; keyId: string; model: string };
export type FailoverOptions = {
  provider: AiProvider;
  keys: KeyRef[];
  preferredKeyId?: string;
  models: string[];
  /** Overall budget for every attempt together. */
  deadlineMs?: number;
  onStatus?: (message: string) => void;
};

/**
 * Used when the key's model list is unknown. The "-latest" aliases follow Google's current
 * Flash models; fixed ids are kept only as a last resort because Google retires them.
 */
export const FALLBACK_MODELS: Record<AiProvider, string[]> = {
  google: ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
  openai: ["gpt-4o-mini", "gpt-4.1-mini"],
};

const FIRST_BYTE_TIMEOUT_MS = 20_000;
const TOTAL_STREAM_TIMEOUT_MS = 45_000;

/** Speech, image, embedding and similar models also answer generateContent but cannot chat. */
export function isChatModel(model: string): boolean {
  return !/(tts|image|embed|aqa|live|audio|veo|imagen|robotics|computer-use|learnlm|gemma)/i.test(model);
}

function modelVersion(id: string): number {
  return Number(/gemini-(\d+(?:\.\d+)?)/.exec(id)?.[1] ?? 0);
}

/**
 * Fast models from the key's real model list, newest first: stable before preview,
 * Flash before Flash-Lite (Lite has its own quota, so it is a good second choice).
 */
export function rankGoogleModels(available: string[], kind: "chat" | "tts"): string[] {
  const wanted = available.filter((id) => kind === "tts"
    ? /tts/i.test(id)
    : isChatModel(id) && /flash/i.test(id) && !/thinking|exp/i.test(id));
  return wanted
    // Previews have small quotas, so stable models come first whatever their version.
    .sort((a, b) => Number(/preview/i.test(a)) - Number(/preview/i.test(b))
      || modelVersion(b) - modelVersion(a)
      || Number(/lite/i.test(a)) - Number(/lite/i.test(b))
      || a.localeCompare(b))
    .slice(0, 4);
}

/**
 * Order to try models in. Chat keeps the learner's choice first; a connection check
 * tries the fast models first, so one slow "thinking" model cannot block it.
 * `available` is the key's model list when known, so retired ids are never tried.
 */
export function modelCandidates(provider: AiProvider, preferred: string, fastFirst = false, available: string[] = []): string[] {
  const known = (id: string) => !available.length || available.includes(id) || id.endsWith("-latest");
  const chosen = preferred && isChatModel(preferred) && known(preferred) ? [preferred] : [];
  const fast = provider === "google" && available.length
    ? [...rankGoogleModels(available, "chat"), ...FALLBACK_MODELS.google.filter((id) => id.endsWith("-latest"))]
    : FALLBACK_MODELS[provider];
  const list = fastFirst ? [...fast, ...chosen] : [...chosen, ...fast];
  return [...new Set(list)].slice(0, 6);
}

export function classifyError(error: unknown, provider: AiProvider = "google"): AiError {
  if (error instanceof AiError) return error;
  if (error instanceof Error) {
    // Errors thrown by the older one-shot helpers only carry the status in their text.
    const status = /HTTP (\d{3})|mã (\d{3})/.exec(error.message);
    if (status) return classifyHttp(provider, Number(status[1] ?? status[2]), error.message);
    if (/đang bận|quá tải/i.test(error.message)) return new AiError("busy", error.message, 503);
  }
  if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new AiError("timeout", "AI phản hồi quá chậm.");
  }
  if (error instanceof TypeError) {
    return new AiError("network", "Không kết nối được tới máy chủ AI. Hãy kiểm tra Internet hoặc tường lửa/VPN.");
  }
  return new AiError("other", error instanceof Error ? error.message : "Lỗi không xác định.");
}

function classifyHttp(provider: AiProvider, status: number, detail: string): AiError {
  const error = classifyStatus(provider, status, detail);
  error.detail = detail;
  return error;
}

function classifyStatus(provider: AiProvider, status: number, detail: string): AiError {
  const name = provider === "google" ? "Google Gemini" : "OpenAI";
  if (status === 401 || status === 403 || (status === 400 && /api[\s_-]?key|API_KEY_INVALID/i.test(detail))) {
    return new AiError("auth", `${name} từ chối API key (HTTP ${status}).`, status);
  }
  if (status === 429) return new AiError("quota", `API key ${name} đã hết hạn mức hoặc bị giới hạn tốc độ (HTTP 429).`, status);
  if (status === 404 || (status === 400 && /model/i.test(detail) && !/thinking/i.test(detail))) {
    return new AiError("model", `Mô hình không còn khả dụng với key này (HTTP ${status}).`, status);
  }
  if (status >= 500) return new AiError("busy", `${name} đang quá tải (HTTP ${status}).`, status);
  return new AiError("other", `${name} từ chối yêu cầu (HTTP ${status})${detail ? `: ${detail}` : ""}`, status);
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "error" in body) {
      const err = (body as { error: unknown }).error;
      if (typeof err === "object" && err !== null && "message" in err) return String((err as { message: unknown }).message);
    }
  } catch {}
  return "";
}

/** Reads an SSE body, calling `pick` on each JSON event. First byte must arrive quickly. */
async function readSse(
  response: Response,
  pick: (event: unknown) => string,
  onText: (full: string) => void,
  controller: AbortController,
): Promise<string> {
  if (!response.body) throw new AiError("network", "Không nhận được luồng phản hồi từ AI.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let full = "";
  const total = setTimeout(() => controller.abort(), TOTAL_STREAM_TIMEOUT_MS);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const json = trimmed.slice(5).trim();
        if (!json || json === "[DONE]") continue;
        try {
          const piece = pick(JSON.parse(json));
          if (piece) {
            full += piece;
            onText(full);
          }
        } catch {}
      }
    }
  } finally {
    clearTimeout(total);
  }
  return full.trim();
}

/**
 * Keep "thinking" short: 2.5 Flash can turn it off; Gemini 3+ (and the -latest aliases,
 * which point at it) take a level instead. A model that rejects the setting is retried
 * without it.
 */
export function geminiThinkingConfig(model: string): Record<string, unknown> | undefined {
  if (/gemini-2\.5-flash/i.test(model)) return { thinkingBudget: 0 };
  if (/gemini-([3-9]|\d\d)|-latest$/i.test(model)) return { thinkingLevel: "low" };
  return undefined;
}

/** Thinking tokens count against maxOutputTokens, so leave room for them or the answer is cut. */
export function geminiOutputBudget(model: string, answerTokens: number): number {
  return /gemini-2\.5-flash/i.test(model) ? answerTokens : answerTokens + 2048;
}

async function streamGemini(
  key: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  onText: (full: string) => void,
  maxTokens: number,
): Promise<string> {
  const build = (withThinking: boolean) => {
    const generationConfig: Record<string, unknown> = { temperature: 0.8, maxOutputTokens: geminiOutputBudget(model, maxTokens) };
    const thinking = withThinking ? geminiThinkingConfig(model) : undefined;
    if (thinking) generationConfig.thinkingConfig = thinking;
    return {
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: m.audio ? [{ text: m.content }, { inlineData: m.audio }] : [{ text: m.content }],
      })),
      generationConfig,
    };
  };

  const attempt = async (withThinking: boolean): Promise<string> => {
    const controller = new AbortController();
    const firstByte = setTimeout(() => controller.abort(), FIRST_BYTE_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(build(withThinking)),
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(firstByte);
    }
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      if (withThinking && response.status === 400 && /thinking/i.test(detail)) return attempt(false);
      throw classifyHttp("google", response.status, detail);
    }
    const text = await readSse(response, (event) => {
      const parts = (event as { candidates?: { content?: { parts?: { text?: unknown; thought?: unknown }[] } }[] })
        ?.candidates?.[0]?.content?.parts;
      if (!Array.isArray(parts)) return "";
      return parts.map((p) => (typeof p?.text === "string" && !p.thought ? p.text : "")).join("");
    }, onText, controller);
    if (!text) throw new AiError("busy", "Gia sư AI chưa trả lời nội dung nào.");
    return text;
  };
  return attempt(true);
}

async function streamOpenAi(
  key: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  onText: (full: string) => void,
  maxTokens: number,
): Promise<string> {
  const controller = new AbortController();
  const firstByte = setTimeout(() => controller.abort(), FIRST_BYTE_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...messages],
        temperature: 0.8,
        max_completion_tokens: maxTokens,
        stream: true,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(firstByte);
  }
  if (!response.ok) throw classifyHttp("openai", response.status, await readErrorDetail(response));
  const text = await readSse(response, (event) => {
    const chunk = (event as { choices?: { delta?: { content?: unknown } }[] })?.choices?.[0]?.delta?.content;
    return typeof chunk === "string" ? chunk : "";
  }, onText, controller);
  if (!text) throw new AiError("busy", "OpenAI chưa trả lời nội dung nào.");
  return text;
}

/**
 * Runs `operation` over (model × key) pairs until one succeeds.
 * - auth: the key is skipped for the rest of the run. quota: next key, same model.
 * - model: the model is dropped for every key.
 * - timeout: the model is too slow right now, so it is dropped (no retry).
 * - busy / network: one quick retry on the same pair, then move on.
 */
export async function runWithFailover<T>(
  options: FailoverOptions,
  operation: (key: string, model: string) => Promise<T>,
): Promise<FailoverResult<T>> {
  const { provider, keys, preferredKeyId, models, deadlineMs = 60_000, onStatus } = options;
  const providerName = provider === "google" ? "Google AI" : "OpenAI";
  if (!keys.length) throw new AiError("auth", `Chưa có API key ${providerName}. Hãy thêm key trong Cài đặt.`);

  const start = Date.now();
  const preferred = keys.findIndex((k) => k.id === preferredKeyId);
  const orderedKeys = preferred <= 0 ? keys : [...keys.slice(preferred), ...keys.slice(0, preferred)];
  const deadKeys = new Set<string>();
  const deadModels = new Set<string>();
  const problems: AiError[] = [];
  const attempts: string[] = [];

  for (const model of models) {
    if (deadModels.has(model)) continue;
    for (const [index, key] of orderedKeys.entries()) {
      if (deadKeys.has(key.id) || deadModels.has(model)) continue;
      if (Date.now() - start > deadlineMs) throw summarize(problems, attempts, providerName);
      for (let tries = 0; tries < 2; tries++) {
        try {
          if (index > 0 || tries > 0 || model !== models[0]) {
            onStatus?.(`Đang thử ${key.label || `key ${index + 1}`} · ${model}…`);
          }
          const value = await operation(key.value, model);
          return { value, keyId: key.id, model };
        } catch (raw) {
          const error = classifyError(raw, provider);
          problems.push(error);
          attempts.push(`${model} · ${key.label || `key ${index + 1}`}: ${error.message}${error.detail ? ` — ${error.detail.slice(0, 260)}` : ""}`);
          // Quota is per model on Gemini, so a 429 only skips this key for this model.
          if (error.kind === "auth") { deadKeys.add(key.id); break; }
          if (error.kind === "quota") break;
          if (error.kind === "model" || error.kind === "timeout") { deadModels.add(model); break; }
          if (error.kind === "other") throw error;
          if (tries === 0) await new Promise((r) => setTimeout(r, 600));
        }
      }
    }
  }
  throw summarize(problems, attempts, providerName);
}

function summarize(problems: AiError[], attempts: string[], providerName: string): AiError {
  const error = summaryError(problems, providerName);
  error.details = attempts;
  return error;
}

/** Turns Google's 429 text (limit, per-day/per-minute, retry delay) into advice. */
function quotaAdvice(quota: AiError[], providerName: string): string {
  const text = quota.map((p) => p.detail).join(" ");
  if (/limit:\s*0(?!\d)/i.test(text)) {
    return `Key ${providerName} không có hạn mức miễn phí cho các mô hình này (limit: 0). Hãy tạo key mới trong Google AI Studio, hoặc bật thanh toán cho dự án Google Cloud của key.`;
  }
  const perDay = /per ?day|PerDay|RPD/i.test(text);
  const retry = /retry in ([\d.]+)s/i.exec(text);
  const wait = retry ? ` Thử lại sau khoảng ${Math.ceil(Number(retry[1]))} giây.` : perDay ? " Hạn mức theo ngày sẽ đặt lại vào khoảng 14–15 giờ (giờ Việt Nam)." : " Chờ khoảng 1 phút rồi thử lại.";
  return `Tất cả API key ${providerName} đã hết hạn mức ${perDay ? "trong ngày" : "tạm thời (theo phút)"}.${wait} Lưu ý: các key tạo trong cùng một dự án Google dùng chung hạn mức — muốn có thêm hạn mức, hãy tạo key ở dự án khác.`;
}

function summaryError(problems: AiError[], providerName: string): AiError {
  if (!problems.length) return new AiError("other", "Không thể kết nối AI.");
  const kinds = new Set(problems.map((p) => p.kind));
  if (kinds.size === 1 && kinds.has("auth")) {
    return new AiError("auth", `${providerName} từ chối tất cả API key đã lưu. Hãy kiểm tra hoặc tạo key mới trong Cài đặt.`);
  }
  if (kinds.has("quota") && !kinds.has("network") && !kinds.has("timeout")) {
    return new AiError("quota", quotaAdvice(problems.filter((p) => p.kind === "quota"), providerName));
  }
  if (kinds.has("network")) {
    return new AiError("network", "Không kết nối được tới máy chủ AI. Hãy kiểm tra Internet, tắt VPN/chặn quảng cáo rồi thử lại.");
  }
  if (kinds.has("timeout")) {
    return new AiError("timeout", "AI không phản hồi kịp với mọi mô hình đã thử. Mạng có thể đang chậm, VPN đang chặn, hoặc dịch vụ quá tải — hãy thử lại.");
  }
  const last = problems[problems.length - 1];
  return new AiError(last.kind, last.message, last.status);
}

export function streamChat(
  provider: AiProvider,
  key: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  onText: (full: string) => void,
  maxTokens = 700,
): Promise<string> {
  return provider === "google"
    ? streamGemini(key, model, system, messages, onText, maxTokens)
    : streamOpenAi(key, model, system, messages, onText, maxTokens);
}

export type ConnectionReport = { ok: true; keyId: string; model: string; ms: number } | { ok: false; error: AiError };

/** Small real request so the learner knows immediately whether the tutor can speak. */
export async function checkConnection(options: FailoverOptions): Promise<ConnectionReport> {
  const t0 = Date.now();
  try {
    const { keyId, model } = await runWithFailover({ ...options, deadlineMs: 45_000 }, (key, model) =>
      streamChat(options.provider, key, model, "Reply with the single word: OK", [{ role: "user", content: "ping" }], () => {}, 64));
    return { ok: true, keyId, model, ms: Date.now() - t0 };
  } catch (error) {
    return { ok: false, error: classifyError(error) };
  }
}

/** Raw line breaks and other control characters inside JSON strings, escaped. */
function escapeControlCharsInStrings(json: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const char of json) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      } else if (char < " ") {
        out += char === "\n" ? "\\n" : char === "\r" ? "\\r" : char === "\t" ? "\\t" : "";
        continue;
      }
    } else if (char === '"') {
      inString = true;
    }
    out += char;
  }
  return out;
}

/**
 * Reads the JSON object an AI was asked to return. Models sometimes wrap it in ``` fences,
 * add text around it, or put raw line breaks inside strings; all of that is tolerated.
 * Throws a learner-friendly error when nothing usable is there.
 */
export function parseAiJson(text: string, friendlyError: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const body = text.slice(start, end + 1);
    for (const candidate of [body, escapeControlCharsInStrings(body)]) {
      try {
        return JSON.parse(candidate);
      } catch {}
    }
  }
  throw new AiError("other", friendlyError);
}
