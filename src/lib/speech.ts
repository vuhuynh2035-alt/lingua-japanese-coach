import { LANG } from "@/lib/language";

const DATABASE_NAME = "lingua-jp-speech-cache";
const DATABASE_VERSION = 1;
const SPEECH_STORE = "audio";
const MAX_CACHED_SPEECHES = 100;

type CachedSpeech = { id: string; blob: Blob; savedAt: number };

function openSpeechDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SPEECH_STORE)) {
        request.result.createObjectStore(SPEECH_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Không thể mở bộ nhớ âm thanh trên thiết bị."));
    request.onblocked = () => reject(new Error("Hãy đóng các thẻ Teacher AI khác để mở bộ nhớ âm thanh."));
  });
}

function speechCacheId(cacheKey: string, text: string): string {
  return `${cacheKey}:${text}`;
}

export async function getCachedSpeech(cacheKey: string, text: string): Promise<Blob | null> {
  const database = await openSpeechDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SPEECH_STORE, "readonly");
    const request = transaction.objectStore(SPEECH_STORE).get(speechCacheId(cacheKey, text));
    request.onsuccess = () => resolve(
      request.result && request.result.blob instanceof Blob ? request.result.blob : null,
    );
    request.onerror = () => reject(request.error ?? new Error("Không thể đọc âm thanh đã lưu."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Không thể đọc âm thanh đã lưu."));
    };
  });
}

export async function saveCachedSpeech(
  cacheKey: string,
  text: string,
  blob: Blob,
): Promise<void> {
  const database = await openSpeechDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SPEECH_STORE, "readwrite");
    const store = transaction.objectStore(SPEECH_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const cached = request.result as CachedSpeech[];
      cached.sort((first, second) => first.savedAt - second.savedAt);
      for (const item of cached.slice(0, Math.max(0, cached.length - MAX_CACHED_SPEECHES + 1))) {
        store.delete(item.id);
      }
      store.put({ id: speechCacheId(cacheKey, text), blob, savedAt: Date.now() } satisfies CachedSpeech);
    };
    request.onerror = () => transaction.abort();
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Không thể lưu âm thanh trên thiết bị."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Không thể lưu âm thanh trên thiết bị."));
    };
  });
}

export async function clearSpeechCache(): Promise<void> {
  const database = await openSpeechDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SPEECH_STORE, "readwrite");
    transaction.objectStore(SPEECH_STORE).clear();
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Không thể xóa âm thanh đã lưu."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Không thể xóa âm thanh đã lưu."));
    };
  });
}

export type SpeechSegment = {
  text: string;
  /** "en" is kept as the id of the language being learned (here: Japanese/Chinese); "vi" is Vietnamese. */
  lang: "vi" | "en";
};

const VIETNAMESE_DIACRITICS_REGEX = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

/**
 * Readings (romaji / pinyin) are written in [square brackets] for the eyes only: they are
 * removed before anything is read aloud or used as a practice sentence.
 */
export function stripReadings(text: string): string {
  return text.replace(/\[[^\]]*\]/g, " ");
}

/**
 * Remove ALL markdown symbols (*, **, ***, _, backticks, bullet dashes, decorative emojis)
 * and normalize whitespace so text-to-speech NEVER reads out asterisks or stutters.
 */
export function cleanSpeechText(text: string): string {
  return text
    .replace(/\*+/g, "") // remove ALL asterisks (*, **, ***) everywhere!
    .replace(/_+/g, "")  // remove all underscores
    .replace(/^#+\s+/gm, "") // remove markdown headers #, ##
    .replace(/^[\s\-*•·✦💡🎯🎙️🔊✨]+\s*/gmu, "") // remove bullets and decorative icons (u: emoji are surrogate pairs)
    .replace(/[`~]/g, "") // remove backticks and strikethrough
    .replace(/[-–—]\s*$/g, "") // remove trailing dashes
    .replace(/^\s*[-–—]/g, "") // remove leading dashes
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sentences of the language being learned that the teacher put in quotes (or bold), for the
 * "practise this sentence" buttons. Vietnamese explanations and readings are skipped.
 */
export function extractPracticePhrases(text: string): string[] {
  const phrases: string[] = [];
  const add = (raw: string) => {
    const candidate = cleanSpeechText(stripReadings(raw))
      .replace(/^["“「'`]+|["”」'`]+$/g, "")
      .replace(/[:;–-]+$/, "")
      .trim();
    if (candidate.length >= 2 && LANG.targetScript.test(candidate) &&
        !VIETNAMESE_DIACRITICS_REGEX.test(candidate) && !phrases.includes(candidate)) {
      phrases.push(candidate);
    }
  };

  for (const match of text.matchAll(/["“「`]([^"”」`\n]+)["”」`]/g)) add(match[1]);
  for (const match of text.matchAll(/\*\*([^*]+)\*\*/g)) {
    if (!/[:：]$/.test(match[1].trim())) add(match[1]);
  }
  // Nothing quoted: fall back to any run of the target language in the text.
  if (!phrases.length) {
    for (const match of stripReadings(text).matchAll(new RegExp(LANG.targetRun.source, "g"))) add(match[0]);
  }
  return phrases;
}

/**
 * Split text into segments for text-to-speech: runs of the language being learned go to
 * the practice voice, everything else (Vietnamese explanations) to the Vietnamese voice.
 * Scripts do not overlap (kana/kanji/hanzi vs Latin), so this works inside a sentence too:
 * “Hôm nay học 「こんにちは」 nhé” becomes three segments.
 */
export function splitBilingualText(text: string): SpeechSegment[] {
  const cleaned = stripReadings(text).trim();
  if (!cleaned) return [];

  const raw: SpeechSegment[] = [];
  const push = (part: string, lang: "vi" | "en") => {
    const value = cleanSpeechText(part);
    // Skip pieces that carry no letters or digits at all (stray quotes, dashes).
    if (value && /[\p{L}\p{N}]/u.test(value)) raw.push({ text: value, lang });
  };

  let last = 0;
  for (const match of cleaned.matchAll(new RegExp(LANG.targetRun.source, "g"))) {
    const start = match.index ?? 0;
    if (start > last) push(cleaned.slice(last, start), "vi");
    push(match[0], "en");
    last = start + match[0].length;
  }
  if (last < cleaned.length) push(cleaned.slice(last), "vi");

  // Merge neighbours of the same language so the voice does not stutter.
  const merged: SpeechSegment[] = [];
  for (const segment of raw) {
    const previous = merged[merged.length - 1];
    if (previous && previous.lang === segment.lang) previous.text = cleanSpeechText(`${previous.text} ${segment.text}`);
    else merged.push({ ...segment });
  }
  return merged;
}
