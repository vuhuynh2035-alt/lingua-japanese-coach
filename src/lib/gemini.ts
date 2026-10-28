import { geminiOutputBudget, geminiThinkingConfig } from "@/lib/ai-client";

const MODEL = "gemini-2.5-flash";

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export async function validateGeminiKey(apiKey: string, model = MODEL): Promise<void> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}`,
    { headers: { "x-goog-api-key": apiKey }, signal: AbortSignal.timeout(15_000) },
  );
  if (!response.ok) throw new Error(await getGeminiError(response));
}

export async function generateWithGemini(
  apiKey: string,
  parts: GeminiPart[],
  model = MODEL,
): Promise<string> {
  const thinkingConfig = geminiThinkingConfig(model);
  const request = (withThinking: boolean) => requestGemini(apiKey, model, {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.7,
      // Thinking tokens share this budget; too little and the JSON is cut short.
      maxOutputTokens: geminiOutputBudget(model, 1500),
      // Every caller asks for JSON; JSON mode makes the model escape line breaks properly.
      responseMimeType: "application/json",
      ...(withThinking && thinkingConfig ? { thinkingConfig } : {}),
    },
  });
  try {
    return await request(true);
  } catch (error) {
    // Some models reject the thinking setting; ask again without it.
    if (thinkingConfig && error instanceof Error && /thinking/i.test(error.message)) return request(false);
    throw error;
  }
}

async function requestGemini(
  apiKey: string,
  model: string,
  request: {
    systemInstruction?: { parts: { text: string }[] };
    contents: { role: "user" | "model"; parts: GeminiPart[] }[];
    generationConfig: {
      temperature: number;
      maxOutputTokens: number;
      thinkingConfig?: Record<string, unknown>;
      responseMimeType?: string;
    };
  },
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(60_000),
    },
  );

  if (!response.ok) throw new Error(await getGeminiError(response));
  const result: unknown = await response.json();

  if (typeof result !== "object" || result === null || !("candidates" in result) ||
      !Array.isArray(result.candidates)) {
    throw new Error("AI trả về kết quả không đúng định dạng.");
  }
  const candidate = result.candidates[0];
  if (typeof candidate !== "object" || candidate === null || !("content" in candidate) ||
      typeof candidate.content !== "object" || candidate.content === null ||
      !("parts" in candidate.content) || !Array.isArray(candidate.content.parts)) {
    throw new Error("Gia sư AI chưa có câu trả lời. Vui lòng thử lại.");
  }
  const responseParts: unknown[] = candidate.content.parts;
  const text = responseParts
    .filter((part): part is { text: string } =>
      typeof part === "object" && part !== null && "text" in part && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
  if (!text) throw new Error("Gia sư AI chưa có câu trả lời. Vui lòng thử lại.");
  return text;
}

export async function getAudioData(audio: Blob): Promise<{ mimeType: string; data: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không thể đọc bản ghi âm trên thiết bị này."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Không thể đọc bản ghi âm trên thiết bị này."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(audio);
  });
  const separator = dataUrl.indexOf(",");
  if (separator < 0) throw new Error("Bản ghi âm không đúng định dạng.");
  return { mimeType: audio.type || "audio/mp4", data: dataUrl.slice(separator + 1) };
}

async function getGeminiError(response: Response): Promise<string> {
  let detail = "";
  try {
    const result: unknown = await response.json();
    if (typeof result === "object" && result !== null && "error" in result &&
        typeof result.error === "object" && result.error !== null && "message" in result.error) {
      detail = String(result.error.message);
    }
  } catch {
    detail = "";
  }

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    return detail
      ? `Google AI từ chối API key hoặc yêu cầu (HTTP ${response.status}): ${detail}`
      : `Google AI từ chối API key hoặc yêu cầu (HTTP ${response.status}). Hãy kiểm tra key và mô hình trong Cài đặt.`;
  }
  if (response.status === 429) {
    return detail
      ? `API key Google AI đã hết hạn mức hoặc đang bị giới hạn (HTTP 429): ${detail}`
      : "API key đã hết hạn mức hoặc đang bị giới hạn (HTTP 429). Hãy chọn key khác trong Cài đặt hoặc kiểm tra gói Gemini.";
  }
  if (response.status === 503 || response.status === 504) {
    return "Dịch vụ AI hiện đang bận. Vui lòng thử lại sau.";
  }
  return detail
    ? `Không gửi được yêu cầu tới Gemini (mã ${response.status}): ${detail}`
    : `Không gửi được yêu cầu tới Gemini (mã ${response.status}).`;
}
