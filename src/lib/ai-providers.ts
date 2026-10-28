import { isChatModel } from "@/lib/ai-client";
import { GeminiPart, generateWithGemini } from "@/lib/gemini";

export type AiProvider = "google" | "openai";
export type AiModel = { id: string; label: string };

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  // An alias Google keeps pointing at its current Flash model, so it never retires.
  google: "gemini-flash-latest",
  openai: "gpt-4o-mini",
};

export function isAiProvider(value: string): value is AiProvider {
  return value === "google" || value === "openai";
}

export async function fetchAiModels(provider: AiProvider, apiKey: string): Promise<AiModel[]> {
  const endpoint = provider === "google"
    ? "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000"
    : "https://api.openai.com/v1/models";
  const response = await fetch(endpoint, {
    headers: provider === "google"
      ? { "x-goog-api-key": apiKey }
      : { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(30_000),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(getProviderError(provider, response.status, result));
  if (provider === "google") {
    if (!isRecord(result) || !Array.isArray(result.models)) {
      throw new Error("Google không trả về danh sách mô hình đúng định dạng.");
    }
    const models = result.models.flatMap((item): AiModel[] => {
      if (!isRecord(item) || typeof item.name !== "string" ||
          !Array.isArray(item.supportedGenerationMethods) ||
          !item.supportedGenerationMethods.includes("generateContent")) return [];
      const id = item.name.replace(/^models\//, "");
      if (!isChatModel(id)) return [];
      return [{ id, label: typeof item.displayName === "string" ? item.displayName : id }];
    });
    if (!models.length) throw new Error("API key Google không có mô hình hỗ trợ tạo nội dung.");
    return models.sort((first, second) => first.id.localeCompare(second.id));
  }

  if (!isRecord(result) || !Array.isArray(result.data)) {
    throw new Error("OpenAI không trả về danh sách mô hình đúng định dạng.");
  }
  const models = result.data.flatMap((item): AiModel[] => {
    if (!isRecord(item) || typeof item.id !== "string") return [];
    const id = item.id;
    if (!/^(gpt-|o[134](?:-|$))/.test(id) ||
        /(audio|transcri|tts|embedding|moderation|realtime|search|image|video)/i.test(id)) return [];
    return [{ id, label: id }];
  });
  if (!models.length) throw new Error("Không tìm thấy mô hình chat OpenAI tương thích trong tài khoản này.");
  return models.sort((first, second) => second.id.localeCompare(first.id));
}

/** Every Google model this key may call with generateContent, including speech models. */
export async function fetchGoogleModelIds(apiKey: string): Promise<string[]> {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
    headers: { "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(20_000),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(getProviderError("google", response.status, result));
  if (!isRecord(result) || !Array.isArray(result.models)) return [];
  return result.models.flatMap((item): string[] =>
    isRecord(item) && typeof item.name === "string" && Array.isArray(item.supportedGenerationMethods) &&
      item.supportedGenerationMethods.includes("generateContent")
      ? [item.name.replace(/^models\//, "")]
      : []);
}

export async function transcribeWithOpenAi(apiKey: string, audio: Blob): Promise<string> {
  const mimeType = audio.type || "audio/webm";
  const extension = mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a"
    : mimeType.includes("wav") ? "wav"
    : mimeType.includes("ogg") ? "ogg"
    : "webm";
  const audioFile = new File([audio], `learner-audio.${extension}`, { type: mimeType });
  const form = new FormData();
  form.set("file", audioFile);
  form.set("model", "gpt-4o-mini-transcribe");
  form.set("response_format", "json");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(90_000),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(getProviderError("openai", response.status, result));
  if (!isRecord(result) || typeof result.text !== "string" || !result.text.trim()) {
    throw new Error("OpenAI không trả về bản chép lời đúng định dạng.");
  }
  return result.text.trim();
}

export function generateGeminiMultimodalResponse(
  apiKey: string,
  parts: GeminiPart[],
  model = DEFAULT_MODELS.google,
): Promise<string> {
  return generateWithGemini(apiKey, parts, model);
}

export function getProviderError(provider: AiProvider, status: number, result: unknown): string {
  const message = isRecord(result) && isRecord(result.error) && typeof result.error.message === "string"
    ? result.error.message
    : "";
  if (status === 401 || status === 403) {
    return `${provider === "google" ? "Google Gemini" : "OpenAI"} từ chối API key (HTTP ${status})${message ? `: ${message}` : ". Kiểm tra key hoặc chọn key khác trong Cài đặt."}`;
  }
  if (status === 429) {
    return `API key ${provider === "google" ? "Google Gemini" : "OpenAI"} đã hết hạn mức hoặc bị giới hạn. Hãy chọn key khác trong Cài đặt.`;
  }
  if (status === 404) {
    return `Không tìm thấy mô hình hoặc API (HTTP 404). Hãy tải lại danh sách và chọn mô hình còn hoạt động.`;
  }
  if (status === 503 || status === 504) return "Dịch vụ AI đang bận. Vui lòng thử lại sau.";
  return message
    ? `Yêu cầu ${provider === "google" ? "Google Gemini" : "OpenAI"} thất bại (HTTP ${status}): ${message}`
    : `Yêu cầu ${provider === "google" ? "Google Gemini" : "OpenAI"} thất bại (HTTP ${status}).`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
