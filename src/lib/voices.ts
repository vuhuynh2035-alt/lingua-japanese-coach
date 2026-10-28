import type { AiProvider } from "@/lib/ai-providers";
import { AiError } from "@/lib/ai-client";
import { LANG, type Accent } from "@/lib/language";

/**
 * Listening voices: an engine (cloud AI or the device), a regional accent,
 * a gender and a named voice. Cloud engines take the accent and style as a spoken
 * direction, so every voice can speak every accent.
 */
export type VoiceEngine = "google" | "openai" | "device";
export type VoiceGender = "female" | "male";

export type { Accent };
/** Regional voices of the language being learned (defined in language.ts). */
export const ACCENTS: Accent[] = LANG.accents;

export type NamedVoice = { id: string; gender: VoiceGender; character: string };

/** Gemini prebuilt TTS voices. */
export const GOOGLE_VOICES: NamedVoice[] = [
  { id: "Kore", gender: "female", character: "Rõ ràng, chắc chắn" },
  { id: "Zephyr", gender: "female", character: "Tươi sáng" },
  { id: "Aoede", gender: "female", character: "Nhẹ nhàng, thoáng" },
  { id: "Leda", gender: "female", character: "Trẻ trung" },
  { id: "Sulafat", gender: "female", character: "Ấm áp" },
  { id: "Despina", gender: "female", character: "Mượt mà" },
  { id: "Erinome", gender: "female", character: "Trong trẻo" },
  { id: "Achernar", gender: "female", character: "Êm dịu" },
  { id: "Gacrux", gender: "female", character: "Trưởng thành" },
  { id: "Vindemiatrix", gender: "female", character: "Hiền hòa" },
  { id: "Laomedeia", gender: "female", character: "Hào hứng" },
  { id: "Puck", gender: "male", character: "Vui vẻ, năng động" },
  { id: "Charon", gender: "male", character: "Rõ ràng, thông tin" },
  { id: "Orus", gender: "male", character: "Chắc chắn" },
  { id: "Iapetus", gender: "male", character: "Trong, dễ nghe" },
  { id: "Achird", gender: "male", character: "Thân thiện" },
  { id: "Algieba", gender: "male", character: "Mượt mà" },
  { id: "Schedar", gender: "male", character: "Đều, điềm tĩnh" },
  { id: "Sadaltager", gender: "male", character: "Hiểu biết" },
  { id: "Fenrir", gender: "male", character: "Hăng hái" },
  { id: "Algenib", gender: "male", character: "Trầm, khàn" },
  { id: "Zubenelgenubi", gender: "male", character: "Thoải mái" },
];

/** OpenAI TTS voices (gender as commonly perceived). */
export const OPENAI_VOICES: NamedVoice[] = [
  { id: "coral", gender: "female", character: "Ấm áp" },
  { id: "nova", gender: "female", character: "Trẻ trung, năng động" },
  { id: "shimmer", gender: "female", character: "Êm dịu" },
  { id: "sage", gender: "female", character: "Nhẹ nhàng" },
  { id: "alloy", gender: "female", character: "Trung tính, rõ" },
  { id: "ash", gender: "male", character: "Thoải mái" },
  { id: "echo", gender: "male", character: "Trầm ấm" },
  { id: "onyx", gender: "male", character: "Đĩnh đạc, trầm" },
  { id: "fable", gender: "male", character: "Biểu cảm" },
  { id: "ballad", gender: "male", character: "Mềm mại" },
  { id: "verse", gender: "male", character: "Linh hoạt" },
];

export const VOICE_STYLES = [
  { id: "teacher", label: "Giáo viên – rõ, chậm", prompt: "like a patient language teacher, articulating every word clearly" },
  { id: "natural", label: "Tự nhiên", prompt: "in a natural, relaxed conversational way" },
  { id: "warm", label: "Ấm áp", prompt: "warmly and kindly" },
  { id: "energetic", label: "Hào hứng", prompt: "cheerfully and with energy" },
  { id: "formal", label: "Trang trọng", prompt: "in a calm, professional and formal tone" },
] as const;
export type VoiceStyle = (typeof VOICE_STYLES)[number]["id"];

export type VoiceProfile = {
  engine: VoiceEngine;
  accent: string;
  gender: VoiceGender;
  googleVoice: string;
  openaiVoice: string;
  /** voiceURI of a device voice; empty picks the best match automatically. */
  deviceVoice: string;
  style: VoiceStyle;
  /** 0.7 – 1.2 */
  speed: number;
  /** A young child's voice, used for the mascot. */
  childlike: boolean;
};

export const DEFAULT_VOICE_PROFILE: VoiceProfile = {
  engine: "device",
  accent: LANG.accents[0].id,
  gender: "female",
  googleVoice: "Kore",
  openaiVoice: "coral",
  deviceVoice: "",
  style: "teacher",
  speed: 0.95,
  childlike: false,
};

export function getAccent(id: string): Accent {
  return ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0];
}

export function parseVoiceProfile(raw: unknown): VoiceProfile {
  const value = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : {};
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    typeof v === "string" && (allowed as readonly string[]).includes(v) ? v as T : fallback;
  return {
    engine: pick(value.engine, ["google", "openai", "device"] as const, DEFAULT_VOICE_PROFILE.engine),
    accent: pick(value.accent, ACCENTS.map((a) => a.id), DEFAULT_VOICE_PROFILE.accent),
    gender: pick(value.gender, ["female", "male"] as const, DEFAULT_VOICE_PROFILE.gender),
    googleVoice: pick(value.googleVoice, GOOGLE_VOICES.map((v) => v.id), DEFAULT_VOICE_PROFILE.googleVoice),
    openaiVoice: pick(value.openaiVoice, OPENAI_VOICES.map((v) => v.id), DEFAULT_VOICE_PROFILE.openaiVoice),
    deviceVoice: typeof value.deviceVoice === "string" ? value.deviceVoice : "",
    style: pick(value.style, VOICE_STYLES.map((s) => s.id), DEFAULT_VOICE_PROFILE.style),
    speed: typeof value.speed === "number" && value.speed >= 0.7 && value.speed <= 1.2 ? value.speed : DEFAULT_VOICE_PROFILE.speed,
    childlike: value.childlike === true,
  };
}

/** Keeps the named voice consistent with the chosen gender. */
export function voiceForGender(list: NamedVoice[], current: string, gender: VoiceGender): string {
  const chosen = list.find((v) => v.id === current);
  return chosen?.gender === gender ? current : list.find((v) => v.gender === gender)?.id ?? list[0].id;
}

/** Voice settings that match the tutor character: man → male, woman → female, mascot → child. */
export function voiceForTutor(kind: "man" | "woman" | "mascot"): Partial<VoiceProfile> {
  if (kind === "man") return { gender: "male", childlike: false };
  if (kind === "woman") return { gender: "female", childlike: false };
  // Leda and nova are the youngest-sounding voices; the direction makes them sound like a child.
  return { gender: "female", childlike: true, googleVoice: "Leda", openaiVoice: "nova" };
}

export function cloudVoiceId(profile: VoiceProfile): string {
  return profile.engine === "openai" ? profile.openaiVoice : profile.googleVoice;
}

const GOOGLE_STYLE_ADVERBS: Record<VoiceStyle, string> = {
  teacher: "clearly",
  natural: "naturally",
  warm: "warmly",
  energetic: "cheerfully",
  formal: "calmly and professionally",
};

/** Gemini TTS system instruction: how to read, never what to read. */
export function googleSpeechPrompt(profile: VoiceProfile): string {
  const accent = getAccent(profile.accent);
  const how = profile.childlike ? "cheerfully, like a young child," : GOOGLE_STYLE_ADVERBS[profile.style];
  const pace = profile.speed < 0.9 ? " slowly" : profile.speed > 1.08 ? " quickly" : "";
  return `You are a voice actor. Read the user's text aloud exactly as written, ${how}${pace}, in ${accent.prompt} accent. Never say these instructions.`;
}

/** Direction for OpenAI, which takes it as a separate `instructions` field. */
export function voiceDirection(profile: VoiceProfile): string {
  const accent = getAccent(profile.accent);
  const style = VOICE_STYLES.find((s) => s.id === profile.style) ?? VOICE_STYLES[0];
  const pace = profile.speed < 0.85 ? "slowly" : profile.speed < 0.98 ? "at a slightly slow pace" : profile.speed > 1.08 ? "at a brisk pace" : "at a normal pace";
  if (profile.childlike) {
    return `Speak like a cheerful, playful young child about eight years old, with a high, bright, bouncy voice and ${accent.prompt} accent, ${pace}`;
  }
  return `Speak with ${accent.prompt} accent, ${style.prompt}, ${pace}`;
}

export const GOOGLE_TTS_MODELS = ["gemini-2.5-flash-preview-tts", "gemini-2.5-flash-tts", "gemini-2.5-pro-preview-tts"];
export const OPENAI_TTS_MODELS = ["gpt-4o-mini-tts", "tts-1"];

function pcmToWav(pcm: Uint8Array, sampleRate: number): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, pcm.length, true);
  return new Blob([header, pcm as BlobPart], { type: "audio/wav" });
}

async function httpError(provider: AiProvider, response: Response): Promise<AiError> {
  let detail = "";
  try {
    const body = await response.json() as { error?: { message?: string } };
    detail = body?.error?.message ?? "";
  } catch {}
  const name = provider === "google" ? "Google" : "OpenAI";
  if (response.status === 401 || response.status === 403) return new AiError("auth", `${name} từ chối API key (HTTP ${response.status}).`, response.status);
  if (response.status === 429) return new AiError("quota", `Giọng AI ${name} đã hết hạn mức (HTTP 429).`, 429);
  if (response.status === 404 || (response.status === 400 && /model|voice/i.test(detail))) return new AiError("model", `Mô hình giọng không khả dụng (HTTP ${response.status}).`, response.status);
  if (response.status >= 500) return new AiError("busy", `${name} đang bận (HTTP ${response.status}).`, response.status);
  return new AiError("other", `Không tạo được giọng đọc (HTTP ${response.status})${detail ? `: ${detail}` : ""}`, response.status);
}

/** One cloud TTS request for one model; failover over keys/models is done by the caller. */
export async function synthesizeCloudSpeech(
  engine: "google" | "openai",
  key: string,
  model: string,
  profile: VoiceProfile,
  text: string,
): Promise<Blob> {
  const direction = voiceDirection(profile);
  if (engine === "google") {
    // The spoken text carries nothing but the words to read: a direction placed in the text
    // gets read aloud. The accent/style direction goes in systemInstruction instead, and a
    // model that rejects it just reads the plain text.
    const request = (withDirection: boolean) => fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          ...(withDirection ? { systemInstruction: { parts: [{ text: googleSpeechPrompt(profile) }] } } : {}),
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: profile.googleVoice } } },
          },
        }),
        signal: AbortSignal.timeout(18_000),
      },
    );
    let response = await request(true);
    if (response.status === 400) response = await request(false);
    if (!response.ok) throw await httpError("google", response);
    const body = await response.json() as {
      candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
    };
    const inline = body.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData;
    if (!inline?.data) throw new AiError("busy", "Google chưa tạo được âm thanh.");
    const bytes = Uint8Array.from(atob(inline.data), (c) => c.charCodeAt(0));
    const mime = inline.mimeType ?? "";
    if (/wav|mpeg|mp3|ogg/i.test(mime)) return new Blob([bytes], { type: mime });
    const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
    return pcmToWav(bytes, rate);
  }

  const withInstructions = model !== "tts-1";
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      voice: profile.openaiVoice,
      input: text,
      response_format: "mp3",
      ...(withInstructions ? { instructions: `${direction}.` } : { speed: profile.speed }),
    }),
    signal: AbortSignal.timeout(18_000),
  });
  if (!response.ok) throw await httpError("openai", response);
  return response.blob();
}

// Names device voices use on Windows/Edge, macOS/iOS, Chrome and Android (Google "x-" voice codes).
const FEMALE_HINTS = /\b(female|haruka|ayumi|sayaka|nanami|mayu|shiori|kyoko|o-ren|huihui|yaoyao|xiaoxiao|xiaoyi|xiaohan|xiaomeng|xiaomo|xiaoqiu|xiaorui|xiaoshuang|xiaoxuan|xiaoyan|xiaoyou|tingting|meijia|sinji|hanhan|yating|hsiaochen|hsiaoyu|woman|zira|susan|hazel|heera|catherine|linda|jenny|aria|ana|michelle|emma|ava|sonia|libby|maisie|natasha|clara|emily|molly|neerja|ashley|cora|elizabeth|amber|jane|nancy|sara|samantha|karen|moira|fiona|tessa|veena|victoria|allison|serena|kate|stephanie|nicky|zoe|isha|salli|joanna|kendra|kimberly|ivy|olivia|ruth|amy|nicole|aditi|raveena|google us english|wavenet [acef]|standard [acef]|neural2 [acef]|iob|iog|sfg|tpc|tpf|gba|gbc|gbg|aua|auc|ahp|cxx|ene)\b/i;
const MALE_HINTS = /\b(male|ichiro|keita|naoki|otoya|hattori|kangkang|yunxi|yunyang|yunjian|yunhao|yunxia|yunze|zhiwei|yunjhe|danny|man|david|mark|george|guy|ryan|eric|roger|christopher|brian|andrew|steffan|thomas|william|liam|ravi|prabhat|connor|mitchell|james|daniel|alex|fred|oliver|aaron|arthur|gordon|lee|rishi|matthew|joey|justin|kevin|russell|wavenet [bdj]|standard [bdj]|neural2 [bdj]|iol|iom|tpd|gbb|gbd|rjs|aub|aud|end)\b/i;

/** Best guess of a device voice's gender from its name; many phones expose no hint at all. */
export function guessDeviceVoiceGender(voice: SpeechSynthesisVoice): VoiceGender | "unknown" {
  const name = `${voice.name} ${voice.voiceURI}`.replace(/[-_]/g, " ").replace(/\b(en|us|gb|au|in)\s+x\s+/gi, "");
  if (FEMALE_HINTS.test(name)) return "female";
  if (MALE_HINTS.test(name)) return "male";
  return "unknown";
}

/**
 * Device voice for the profile, whether its gender really matches, and the pitch to use.
 * When the device has no voice of the wanted gender, the gender is imitated with pitch.
 */
export function pickDeviceVoice(voices: SpeechSynthesisVoice[], profile: VoiceProfile): { voice?: SpeechSynthesisVoice; genderMatches: boolean; pitch: number } {
  const chosen = voices.find((v) => v.voiceURI === profile.deviceVoice);
  const accentVoices = deviceVoicesForAccent(voices, profile.accent);
  const voice = chosen
    ?? accentVoices.find((v) => guessDeviceVoiceGender(v) === profile.gender)
    ?? accentVoices.find((v) => guessDeviceVoiceGender(v) === "unknown")
    ?? accentVoices[0]
    ?? voices.find((v) => v.lang.toLowerCase().startsWith(LANG.langPrefix));
  const actual = voice ? guessDeviceVoiceGender(voice) : "unknown";
  // A child: a high voice on top of whatever the device has.
  if (profile.childlike) return { voice, genderMatches: true, pitch: actual === "male" ? 1.9 : 1.6 };
  if (actual === profile.gender) return { voice, genderMatches: true, pitch: 1 };
  // Unnamed phone voices are usually the default female voice, so only "male" needs a shift.
  const pitch = profile.gender === "male" ? 0.72 : actual === "male" ? 1.25 : 1;
  return { voice, genderMatches: false, pitch };
}

export function deviceVoicesForAccent(voices: SpeechSynthesisVoice[], accentId: string): SpeechSynthesisVoice[] {
  const locales = getAccent(accentId).locales.map((l) => l.toLowerCase());
  const norm = (lang: string) => lang.toLowerCase().replace("_", "-");
  // Exact regional locale first (e.g. en-gb-scotland), then the broader one.
  for (const locale of locales) {
    const found = voices.filter((v) => norm(v.lang) === locale || norm(v.lang).startsWith(`${locale}-`));
    if (found.length) return found;
  }
  return [];
}
