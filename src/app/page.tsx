"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import packageJson from "../../package.json";
import { getAudioData } from "@/lib/gemini";
import {
  clearSpeechCache,
  cleanSpeechText,
  extractPracticePhrases,
  stripReadings,
  getCachedSpeech,
  saveCachedSpeech,
  splitBilingualText,
} from "@/lib/speech";
import {
  AiModel,
  AiProvider,
  DEFAULT_MODELS,
  fetchAiModels,
  fetchGoogleModelIds,
  generateGeminiMultimodalResponse,
  isAiProvider,
  transcribeWithOpenAi,
} from "@/lib/ai-providers";
import { GrammarQuestion, GrammarTopic, grammarTopics } from "@/lib/grammar";
import { LANG, levelLabel } from "@/lib/language";

import { IllustrationIcon } from "@/components/illustration-icon";
import { AvatarEmotion, AvatarKind, TutorAvatar } from "@/components/tutor-avatar";
import { attachLipSync, pulseMouth, resumeLipSync } from "@/lib/lipsync";
import { WaitDots, WaitIndicator } from "@/components/net-indicator";
import {
  ACCENTS,
  DEFAULT_VOICE_PROFILE,
  GOOGLE_TTS_MODELS,
  GOOGLE_VOICES,
  OPENAI_TTS_MODELS,
  OPENAI_VOICES,
  VOICE_STYLES,
  VoiceProfile,
  cloudVoiceId,
  deviceVoicesForAccent,
  getAccent,
  guessDeviceVoiceGender,
  parseVoiceProfile,
  pickDeviceVoice,
  synthesizeCloudSpeech,
  voiceForGender,
  voiceForTutor,
} from "@/lib/voices";
import {
  AiError,
  ChatMessage,
  ConnectionReport,
  checkConnection,
  isChatModel,
  parseAiJson,
  modelCandidates,
  rankGoogleModels,
  runWithFailover,
  streamChat,
} from "@/lib/ai-client";
import {
  CourseLesson,
  CURRICULUM_VERSION,
  CoursePackage,
  LESSON_PASS_RATIO,
  StoredCourse,
  downloadCoursePackage,
  getDownloadedAudio,
  listDownloadedCourses,
  removeDownloadedCourse,
} from "@/lib/course-library";
import {
  PersonalMaterial,
  addPersonalMaterial,
  getPersonalMaterial,
  listPersonalMaterials,
  removePersonalMaterial,
} from "@/lib/personal-library";

type Section = "home" | "choose" | "mode" | "lessons" | "practice" | "progress" | "placement" | "grammar" | "library" | "settings";
type CourseLevel = "A1" | "A2" | "B1" | "B2";
const COURSE_LEVELS: CourseLevel[] = ["A1", "A2", "B1", "B2"];
type HelpContent = { title: string; description: string; steps: string[] };
type ApiKeyEntry = { id: string; label: string; value: string };
type ProviderRecord<T> = Record<AiProvider, T>;
type AppTheme = "mint" | "blue" | "burgundy";
type VersionCheckStatus = "checking" | "latest" | "update-available" | "error";
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
const PAGE_HELP: Record<Section, HelpContent> = {
  home: {
    title: "Trang chào mừng",
    description: "Học theo 3 bước đơn giản: chọn bài học, chọn cách học, rồi bắt đầu.",
    steps: [
      "Nhấn “Bắt đầu học” để vào bước chọn bài.",
      "Dùng “Kiểm tra trình độ” nếu muốn app gợi ý mức học ban đầu.",
      "Vào “Cài đặt” để thêm API key, đổi nhân vật gia sư, giọng đọc và giao diện.",
    ],
  },
  practice: {
    title: "Học với AI",
    description: "Thầy/cô AI tự chào, ra tình huống và dẫn dắt bạn nói tiếng Nhật theo trình độ.",
    steps: [
      "Đợi nhân vật kết nối; nếu lỗi, nhấn “Thử lại” hoặc kiểm tra API key trong Cài đặt.",
      "Trả lời bằng cách gõ chữ hoặc nhấn micro. Thầy/cô sẽ sửa lỗi và đưa câu tiếp theo.",
      "Nhấn “Nghe lại” để nghe lại lời thầy/cô; “Tình huống mới” để đổi chủ đề luyện.",
      "Mở “Luyện phát âm có chấm điểm” bên dưới để ghi âm và nhận điểm (cần Google AI).",
    ],
  },
  choose: {
    title: "Chọn bài học",
    description: "Chọn danh mục muốn học. Mặc định là danh mục bạn đang học dở lần trước.",
    steps: ["Mở danh sách xổ xuống để đổi danh mục.", "Nhấn “Tiếp tục” để chọn cách học: bài học offline hoặc học với AI."],
  },
  mode: {
    title: "Chọn cách học",
    description: "Mỗi cách học có một trang riêng, gọn gàng và dễ thao tác.",
    steps: ["“Bài học offline” học theo giáo trình, không cần mạng.", "“Học với AI online” trò chuyện với thầy/cô AI, cần API key trong Cài đặt."],
  },
  lessons: {
    title: "Bài học theo giáo trình",
    description: "Học theo lộ trình offline riêng, từng bài và từng cấp độ. Bài học cần được tải về trước trong Cài đặt.",
    steps: [
      "Học lần lượt từng bài: hội thoại, từ vựng, ngữ pháp, phát âm rồi làm bài kiểm tra.",
      "Bài học tự tải về máy ở lần đầu, sau đó học được cả khi không có mạng.",
      "Làm bài kiểm tra 10 câu và đạt từ 8/10 để tick hoàn thành; bài kế tiếp sẽ mở. Hoàn thành mọi bài của một level sẽ nâng trình độ của bạn.",
      "Chọn Gia sư AI khi muốn luyện hội thoại online theo lĩnh vực và trình độ.",
    ],
  },
  progress: {
    title: "Tiến độ học tập",
    description: "Xem thời lượng, số buổi, trình độ ước tính và chuỗi ngày học được lưu trên thiết bị này.",
    steps: [
      "Các thống kê được cập nhật khi bạn hoàn thành hoạt động học trong ứng dụng.",
      "Nhấn “Luyện tập hôm nay” hoặc “Bắt đầu trò chuyện” để tiếp tục học.",
      "Tiến độ được lưu cục bộ trong trình duyệt, không tự đồng bộ sang thiết bị khác.",
    ],
  },
  placement: {
    title: "Kiểm tra trình độ",
    description: `Bài sàng lọc ngắn giúp ước lượng mức bắt đầu từ ${levelLabel("A1")} đến ${levelLabel("B2")} để điều chỉnh việc học.`,
    steps: [
      "Chọn một đáp án cho từng câu hỏi.",
      "Khi đã trả lời đủ câu, nhấn “Xem trình độ của tôi”.",
      `Kết quả chỉ mang tính tham khảo, không thay thế bài thi ${LANG.levelSystem} chính thức; bạn có thể làm lại.`,
    ],
  },
  grammar: {
    title: "Ngữ pháp",
    description: `Chọn cấu trúc theo trình độ ${LANG.levelSystem} để học cách dùng, xem ví dụ và làm bài trắc nghiệm.`,
    steps: [`Chọn cấp độ ${levelLabel("A1")}, ${levelLabel("A2")}, ${levelLabel("B1")} hoặc ${levelLabel("B2")}.`, "Mở một cấu trúc để xem hướng dẫn, ví dụ và bài tập.", "Điểm cao nhất của từng chủ đề được lưu trên thiết bị."],
  },
  library: {
    title: "Tài liệu cá nhân",
    description: "Quản lý tài liệu học do bạn thêm vào bộ nhớ trình duyệt trên thiết bị này.",
    steps: [
      "Chọn thêm tài liệu và nhập tệp PDF, audio, TXT hoặc MD được hỗ trợ.",
      "Chọn một tài liệu trong danh sách để mở hoặc phát.",
      "Xóa dữ liệu website/trình duyệt có thể xóa các tệp đã lưu; hãy giữ bản gốc riêng.",
    ],
  },
  settings: {
    title: "Cài đặt chung",
    description: "Điều chỉnh ứng dụng, nhà cung cấp AI, giọng đọc và các lựa chọn lưu trên thiết bị.",
    steps: [
      "Chọn giao diện và cỡ chữ phù hợp.",
      "Nhấn vào từng nhóm cài đặt để mở danh sách chi tiết.",
      "Tải, mở hoặc xóa giáo trình offline trong nhóm “Giáo trình offline”.",
      "Thêm API key Google AI hoặc OpenAI để dùng hội thoại, giọng đọc và các tính năng AI; key được lưu trong trình duyệt này.",
      "Chọn mô hình và giọng đọc. Audio được tạo khi bạn nghe thử/phát câu, rồi lưu trên thiết bị để nghe lại.",
      "Xem phiên bản ứng dụng và kiểm tra bản cập nhật ở cuối trang.",
      "Có thể cài Teacher AI lên màn hình chính theo hướng dẫn ở đầu trang.",
    ],
  },
};
const APP_VERSION = packageJson.version;
const API_KEY_STORAGE = "lingua-jp-gemini-api-key";
const AI_SETTINGS_STORAGE = "lingua-jp-ai-settings";
const FONT_SCALE_STORAGE = "lingua-jp-font-scale";
const APP_THEME_STORAGE = "lingua-jp-app-theme";
const VOICE_PROFILE_STORAGE = "lingua-jp-voice-profile-v1";
const RECORDING_PREFS_STORAGE = "lingua-jp-recording-prefs";
type RecordingPrefs = { highQuality: boolean; noiseSuppression: boolean };
const DEFAULT_RECORDING_PREFS: RecordingPrefs = { highQuality: true, noiseSuppression: true };
const GOOGLE_MODELS_STORAGE = "lingua-jp-google-models";
/** 0.05 s of silence, played inside a tap so phones allow later AI audio. */
const SILENT_WAV = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA";

type Message = { role: "user" | "assistant"; content: string };
type PronunciationResult = {
  score: number;
  heard: string;
  feedback: string;
  soundsToPractice: string[];
};
type RecognitionResult = { transcript: string };
type RecognitionEvent = Event & { results: ArrayLike<ArrayLike<RecognitionResult>> };
type RecognitionErrorEvent = Event & { error: string };
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
type LearningProgress = {
  minutes: number;
  sessions: number;
  level: string;
  profile: string;
  streak: number;
  lastPracticeDate: string;
  dailyMinutes: Record<string, number>;
};

const profiles = LANG.profiles;
const phraseMeanings = LANG.phraseMeanings;
const placementQuestions = LANG.placement;

const initialMessage: Message = {
  role: "assistant",
  content: "Xin chào! Mình là gia sư tiếng Nhật AI của bạn. 😊 Chọn một lĩnh vực để bắt đầu nhé. Bạn có thể hỏi mình bằng tiếng Việt bất cứ lúc nào; mình sẽ giúp bạn luyện nói tiếng Nhật từng bước.",
};

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadProgress(): LearningProgress {
  try {
    const saved = localStorage.getItem("lingua-jp-progress");
    if (saved) {
      const value: unknown = JSON.parse(saved);
      if (typeof value === "object" && value !== null) {
        const stored = value as Record<string, unknown>;
        const dailyMinutes: Record<string, number> = {};
        if (typeof stored.dailyMinutes === "object" && stored.dailyMinutes !== null) {
          for (const [date, minutes] of Object.entries(stored.dailyMinutes)) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(date) && typeof minutes === "number" && minutes >= 0) {
              dailyMinutes[date] = minutes;
            }
          }
        }
        return {
          minutes: typeof stored.minutes === "number" ? stored.minutes : 0,
          sessions: typeof stored.sessions === "number" ? stored.sessions : 0,
          level: typeof stored.level === "string" ? stored.level : "A1",
          profile: typeof stored.profile === "string" ? stored.profile : "everyday",
          streak: typeof stored.streak === "number" ? stored.streak : 0,
          lastPracticeDate: typeof stored.lastPracticeDate === "string" ? stored.lastPracticeDate : "",
          dailyMinutes,
        };
      }
    }
  } catch {
    return emptyProgress();
  }
  return emptyProgress();
}

function emptyProgress(): LearningProgress {
  return { minutes: 0, sessions: 0, level: "A1", profile: "everyday", streak: 0, lastPracticeDate: "", dailyMinutes: {} };
}

function loadMessages(profileId: string): Message[] | null {
  try {
    const saved = localStorage.getItem(`lingua-jp-messages-${profileId}`);
    if (!saved) return null;
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length > 100 || parsed.some((message) =>
      typeof message !== "object" || message === null ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string" || message.content.length > 2000)) {
      return null;
    }
    return parsed as Message[];
  } catch {
    return null;
  }
}

function recordPractice(current: LearningProgress, minutes: number, newSession: boolean): LearningProgress {
  const today = todayKey();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const streak = current.lastPracticeDate === today
    ? current.streak
    : current.lastPracticeDate === todayKey(yesterdayDate) ? current.streak + 1 : 1;
  return {
    ...current,
    minutes: current.minutes + minutes,
    sessions: current.sessions + (newSession ? 1 : 0),
    streak,
    lastPracticeDate: today,
    dailyMinutes: { ...current.dailyMinutes, [today]: (current.dailyMinutes[today] ?? 0) + minutes },
  };
}

type TutorPersona = "maya" | "david" | "alex";

const TUTOR_PERSONAS: Record<TutorPersona, {
  id: TutorPersona;
  name: string;
  title: string;
  gender: "female" | "male" | "mascot";
  kind: AvatarKind;
  tagline: string;
  description: string;
  greeting: string;
  badge: string;
}> = {
  maya: { id: "maya", ...LANG.tutors.maya, gender: "female", kind: "woman", badge: "👩‍🏫 Nữ gia sư" },
  david: { id: "david", ...LANG.tutors.david, gender: "male", kind: "man", badge: "👨‍🏫 Nam gia sư" },
  // The id stays "alex" so a saved choice keeps working.
  alex: { id: "alex", ...LANG.tutors.alex, gender: "mascot", kind: "mascot", badge: "🦉 Linh vật" },
};


const PROFILE_SUGGESTIONS = LANG.suggestions;

function renderFormattedMessage(
  content: string,
  onPlaySentence?: (sentence: string) => void
) {
  const lines = content.split("\n");
  const isVietnamese = (s: string) => /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(s);

  return (
    <div className="formatted-message">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lIdx} className="message-empty-line" style={{ height: "6px" }} />;
        }

        // Teacher corrections: ✏️ wrong → right — reason; 🔈 pronunciation notes.
        if (/^(✏️|✏|🔈)/u.test(trimmed)) {
          return (
            <p key={lIdx} className={trimmed.startsWith("🔈") ? "message-fix message-fix-pron" : "message-fix"}>
              {trimmed.replace(/\*+/g, "")}
            </p>
          );
        }

        // 1. A quoted sample sentence of the language being learned, optionally followed by its
        // reading in [brackets] and a Vietnamese meaning in (parentheses).
        const dialogueMatch = trimmed.match(/^[*_]*["“`「]([^"”`」]+)["”`」][*_]*\s*(?:\[([^\]]+)\])?\s*(?:[(（]([^)）]*)[)）])?\s*$/);
        if (dialogueMatch) {
          const dialogueRaw = dialogueMatch[1].replace(/\*+/g, "").trim();
          if (!isVietnamese(dialogueRaw) && LANG.targetScript.test(dialogueRaw)) {
            const phonetic = dialogueMatch[2]?.trim();
            const meaning = dialogueMatch[3]?.trim();
            return (
              <div key={lIdx} className="message-english-dialogue-card">
                <div className="dialogue-card-header">
                  <span className="dialogue-card-badge">💬 Câu mẫu tiếng Nhật để luyện</span>
                  {onPlaySentence && (
                    <button
                      type="button"
                      className="dialogue-card-play-btn"
                      onClick={() => onPlaySentence(dialogueRaw)}
                      title="Nghe câu mẫu này bằng giọng bản xứ"
                    >
                      🔊 Nghe câu này
                    </button>
                  )}
                </div>
                <blockquote className="dialogue-card-quote">
                  “{dialogueRaw}”
                </blockquote>
                {phonetic && <div className="dialogue-card-phonetic">{phonetic}</div>}
                {meaning && <div className="dialogue-card-meaning">{meaning}</div>}
              </div>
            );
          }
        }

        // 2. Inline markdown parsing: bold (**...**), italics (*...*), code (`...`)
        const parts = trimmed.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\])/);

        return (
          <p key={lIdx} className="message-paragraph">
            {parts.map((part, pIdx) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                const inner = part.slice(2, -2).trim();
                const isColonLabel = /[:：]$/.test(inner);
                const isMetaLabel = /^(your turn|step \d+|note|tip|warning|gợi ý|tình huống|senior manager|junior developer|manager|doctor|nurse|engineer)/i.test(inner);
                const isEnglishSentence = !isVietnamese(inner) && LANG.targetScript.test(inner) && !isColonLabel && !isMetaLabel;

                if (isEnglishSentence) {
                  return (
                    <mark key={pIdx} className="message-english-highlight">
                      {inner.replace(/\*+/g, "")}
                    </mark>
                  );
                }

                return (
                  <strong key={pIdx} className={isColonLabel || isMetaLabel ? "message-section-label" : "message-bold-text"}>
                    {inner.replace(/\*+/g, "")}
                  </strong>
                );
              }

              if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
                const inner = part.slice(1, -1).trim();
                return (
                  <span key={pIdx} className="message-hint-text">
                    {inner.replace(/\*+/g, "")}
                  </span>
                );
              }

              if (part.startsWith("[") && part.endsWith("]")) {
                // A reading (romaji / pinyin) written by the teacher: shown small, never read aloud.
                return <span key={pIdx} className="message-phonetic">{part.slice(1, -1)}</span>;
              }

              if (part.startsWith("`") && part.endsWith("`")) {
                const code = part.slice(1, -1);
                return (
                  <code key={pIdx} className="message-code">
                    {code}
                  </code>
                );
              }

              const cleanPart = part.replace(/\*+/g, "");
              return <span key={pIdx}>{cleanPart}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

/** How the AI teacher adapts language, pace and correction to each level. */
const LEVEL_PEDAGOGY = LANG.pedagogy;

/** Voice replies start with "HEARD: <what the learner said>" on its own line. */
function splitHeard(text: string): { heard: string; reply: string } | null {
  const match = /^\s*\[?HEARD\]?\s*:?\s*([^\n]*?)\s*\n/i.exec(text);
  if (!match) return null;
  return { heard: match[1].replace(/^["“]|["”]$/g, "").trim() || "🎤 (không nghe rõ)", reply: text.slice(match[0].length) };
}

/**
 * An error message a learner can understand. App errors are already in Vietnamese; raw
 * browser/parser errors (in English) get a plain explanation, with the original kept short.
 */
function friendlyError(error: unknown, fallback: string): string {
  if (error instanceof AiError) return error.message;
  if (!(error instanceof Error)) return fallback;
  if (/[àáảãạăâđèéêìíòóôơùúưỳý]/i.test(error.message)) return error.message;
  if (error instanceof SyntaxError) return `Câu trả lời của AI bị lỗi định dạng. Bạn vui lòng thử lại nhé. (${error.message.slice(0, 80)})`;
  if (error instanceof TypeError) return "Không kết nối được tới máy chủ AI. Hãy kiểm tra Internet hoặc tắt VPN rồi thử lại.";
  if (error.name === "AbortError" || error.name === "TimeoutError") return "AI phản hồi quá lâu nên đã dừng. Bạn vui lòng thử lại nhé.";
  return `${fallback} (${error.message.slice(0, 80)})`;
}

/** "sentence (Vietnamese meaning)" → both parts; the sentence may carry a [reading]. */
function splitExample(example: string): { target: string; meaning: string } {
  const match = /^(.*?)\s*[(（]([^)）]*)[)）]\s*$/.exec(example);
  return match ? { target: match[1].trim(), meaning: match[2].trim() } : { target: example.trim(), meaning: "" };
}

/** "Key 1", "Key 2"… — the first number not used yet, so labels stay unique after deletions. */
function nextKeyLabel(entries: ApiKeyEntry[]): string {
  let n = 1;
  while (entries.some((entry) => entry.label === `Key ${n}`)) n += 1;
  return `Key ${n}`;
}

/** Lessons the learner may open: in order inside a level; a level opens once the one before is done or the learner already placed at it. */
function unlockedLessonIds(course: CoursePackage, completed: string[], learnerLevel: string): Set<string> {
  const open = new Set<string>();
  const learnerIndex = Math.max(0, COURSE_LEVELS.findIndex((level) => level === learnerLevel));
  let previousLevelDone = true;
  COURSE_LEVELS.forEach((level, levelIndex) => {
    const lessons = course.lessons.filter((item) => item.level === level);
    if (!lessons.length) return;
    let previousDone = previousLevelDone || levelIndex <= learnerIndex;
    for (const lesson of lessons) {
      if (previousDone || completed.includes(lesson.id)) open.add(lesson.id);
      previousDone = completed.includes(lesson.id);
    }
    previousLevelDone = lessons.every((item) => completed.includes(item.id));
  });
  return open;
}

export default function Home() {
  const [section, setSection] = useState<Section>("home");
  // Tutor Persona
  const [tutorPersona, setTutorPersona] = useState<TutorPersona>("maya");

  // System Voices & Offline Speech Tuning
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedViVoiceId, setSelectedViVoiceId] = useState<string>("");
  const [viSpeechRate, setViSpeechRate] = useState<number>(0.95);
  const [viSpeechPitch, setViSpeechPitch] = useState<number>(1.0);
  const [voiceTestNotice, setVoiceTestNotice] = useState<string>("");

  const [fontScale, setFontScale] = useState(125);
  const [fontScaleLoaded, setFontScaleLoaded] = useState(false);
  const [fontScaleError, setFontScaleError] = useState("");
  const [appTheme, setAppTheme] = useState<AppTheme>("mint");
  const [appThemeLoaded, setAppThemeLoaded] = useState(false);
  const [appThemeError, setAppThemeError] = useState("");
  const [versionCheckStatus, setVersionCheckStatus] = useState<VersionCheckStatus>("checking");
  const [latestVersion, setLatestVersion] = useState("");
  const [versionCheckError, setVersionCheckError] = useState("");
  const [versionCheckAttempt, setVersionCheckAttempt] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [appInstalled, setAppInstalled] = useState(false);
  const [installError, setInstallError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [progress, setProgress] = useState<LearningProgress>(emptyProgress);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [aiSettingsLoaded, setAiSettingsLoaded] = useState(false);
  const [aiProvider, setAiProvider] = useState<AiProvider>("google");
  const [apiKeys, setApiKeys] = useState<ProviderRecord<ApiKeyEntry[]>>({ google: [], openai: [] });
  const [activeKeyIds, setActiveKeyIds] = useState<ProviderRecord<string>>({ google: "", openai: "" });
  const [selectedModels, setSelectedModels] = useState<ProviderRecord<string>>({ ...DEFAULT_MODELS });
  const [modelCatalog, setModelCatalog] = useState<ProviderRecord<AiModel[]>>({ google: [], openai: [] });
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [apiKeyBusy, setApiKeyBusy] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [modelsBusy, setModelsBusy] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [speechBusy, setSpeechBusy] = useState(false);
  /** Waiting for AI audio to download. */
  const [speechLoading, setSpeechLoading] = useState(false);
  /** Sound is actually coming out (drives the avatar's mouth). */
  const [speechPlaying, setSpeechPlaying] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [speechNotice, setSpeechNotice] = useState("");
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>(DEFAULT_VOICE_PROFILE);
  const [recordingPrefs, setRecordingPrefs] = useState<RecordingPrefs>(DEFAULT_RECORDING_PREFS);
  /** Reading aid (romaji / pinyin) and Vietnamese translation under each dialogue line. */
  const [lessonView, setLessonView] = useState({ phonetic: true, translation: true });
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [draft, setDraft] = useState("");
  const [connection, setConnection] = useState<{ status: "idle" | "checking" | "ok" | "error"; message: string; ms?: number; details?: string[] }>({ status: "idle", message: "" });
  const [tutorEmotion, setTutorEmotion] = useState<AvatarEmotion | undefined>(undefined);
  const [tutorSubtitle, setTutorSubtitle] = useState("");
  const [chooseId, setChooseId] = useState("");
  const [tutorLessonId, setTutorLessonId] = useState("");
  const [aiLevelEstimate, setAiLevelEstimate] = useState<CourseLevel | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  /** What the current wait is for, so its notice says the truth (sending a recording is not downloading). */
  const [waitKind, setWaitKind] = useState<"text" | "voice">("text");
  const [chatError, setChatError] = useState("");
  const [voiceChatRecording, setVoiceChatRecording] = useState(false);
  const [recording, setRecording] = useState(false);
  const [pronunciationBusy, setPronunciationBusy] = useState(false);
  const [pronunciation, setPronunciation] = useState<PronunciationResult | null>(null);
  const [customMeanings, setCustomMeanings] = useState<Record<string, string>>({});
  const [targetPronunciationPhrase, setTargetPronunciationPhrase] = useState<string>("");
  const [customPhraseInput, setCustomPhraseInput] = useState<string>("");
  const [voiceError, setVoiceError] = useState("");
  const [placementAnswers, setPlacementAnswers] = useState<number[]>([]);
  const [placementResult, setPlacementResult] = useState("");
  const [grammarTopicId, setGrammarTopicId] = useState<string | null>(null);
  const [grammarAnswers, setGrammarAnswers] = useState<number[]>([]);
  const [grammarSubmitted, setGrammarSubmitted] = useState(false);
  const [grammarScores, setGrammarScores] = useState<Record<string, number>>({});
  const [grammarError, setGrammarError] = useState("");
  const [offlineReady, setOfflineReady] = useState(false);
  const [offlineError, setOfflineError] = useState("");
  const [coursePacks, setCoursePacks] = useState<StoredCourse[]>([]);
  const [courseBusyId, setCourseBusyId] = useState("");
  const [courseDownloadProgress, setCourseDownloadProgress] = useState({ completed: 0, total: 0 });
  const [courseError, setCourseError] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [courseAnswers, setCourseAnswers] = useState<number[]>([]);
  const [lessonTab, setLessonTab] = useState<"learn" | "quiz">("learn");
  const [courseSyncing, setCourseSyncing] = useState(false);
  const [courseQuizSubmitted, setCourseQuizSubmitted] = useState(false);
  const [courseProgress, setCourseProgress] = useState<Record<string, string[]>>({});
  const [courseLessonScores, setCourseLessonScores] = useState<Record<string, Record<string, number>>>({});
  const [offlineAudioUrl, setOfflineAudioUrl] = useState("");
  const [personalMaterials, setPersonalMaterials] = useState<PersonalMaterial[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<PersonalMaterial | null>(null);
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialText, setMaterialText] = useState("");
  const [materialBusy, setMaterialBusy] = useState(false);
  const [materialError, setMaterialError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const voiceChatRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChatStreamRef = useRef<MediaStream | null>(null);
  const voiceChatChunksRef = useRef<Blob[]>([]);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechObjectUrlRef = useRef<string | null>(null);
  const materialInputRef = useRef<HTMLInputElement | null>(null);
  const sectionHistoryRef = useRef<Section[]>([]);
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const lastAiErrorRef = useRef<AiError | null>(null);
  const tutorTurnRef = useRef(0);
  const tutorTurnBaseRef = useRef<Message[]>([]);
  const googleModelsRef = useRef<string[] | null>(null);
  const retryTurnRef = useRef<(() => void) | null>(null);
  const classroomBootRef = useRef(false);
  const speechRunRef = useRef(0);
  const speechQueueRef = useRef<{ text: string; lang: "vi" | "en"; clip: Promise<Blob | null> | null }[]>([]);
  const speechQueueRunningRef = useRef(false);
  const speechFallbackRef = useRef("");
  const cloudSpeechPausedUntilRef = useRef(0);
  const cloudSpeechPauseReasonRef = useRef("");
  const courseSyncRef = useRef<string | null>(null);
  const speechPlayerRef = useRef<HTMLAudioElement | null>(null);
  const speechPlayerUnlockedRef = useRef(false);
  const pendingLessonStartRef = useRef(false);

  const apiKey = apiKeys[aiProvider].find((entry) => entry.id === activeKeyIds[aiProvider])?.value ?? "";
  const activeModel = selectedModels[aiProvider] || DEFAULT_MODELS[aiProvider];
  const profile = profiles.find((item) => item.id === progress.profile) ?? profiles[0];
  const placementComplete =
    placementQuestions.every((_, index) =>
      Number.isInteger(placementAnswers[index]) && placementAnswers[index] >= 0);
  const practiceSessionCounted = useRef(false);

  function navigateToSection(nextSection: Section) {
    if (nextSection === section) return;
    sectionHistoryRef.current.push(section);
    setSection(nextSection);
  }

  function returnToGrammarTopics() {
    setGrammarTopicId(null);
    setGrammarAnswers([]);
    setGrammarSubmitted(false);
    setGrammarError("");
  }

  function goBack() {
    if (section === "grammar" && grammarTopicId) {
      returnToGrammarTopics();
      return;
    }
    const previousSection = sectionHistoryRef.current.pop();
    if (previousSection) {
      setSection(previousSection);
      return;
    }
    if (section !== "home") setSection("home");
  }

  useEffect(() => {
    try {
      const savedScale = Number(localStorage.getItem(FONT_SCALE_STORAGE));
      if (Number.isFinite(savedScale) && savedScale >= 100 && savedScale <= 200) {
        setFontScale(savedScale);
      }
    } catch {
      setFontScaleError("Không thể đọc cỡ chữ đã lưu trên thiết bị này.");
    }
    setFontScaleLoaded(true);
    try {
      const savedVoiceProfile = localStorage.getItem(VOICE_PROFILE_STORAGE);
      if (savedVoiceProfile) setVoiceProfile(parseVoiceProfile(JSON.parse(savedVoiceProfile)));
    } catch {}
    try {
      const view: unknown = JSON.parse(localStorage.getItem("lingua-jp-lesson-view") ?? "null");
      if (typeof view === "object" && view !== null) {
        const value = view as { phonetic?: unknown; translation?: unknown };
        setLessonView({ phonetic: value.phonetic !== false, translation: value.translation !== false });
      }
    } catch {}
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(RECORDING_PREFS_STORAGE) ?? "null");
      if (typeof saved === "object" && saved !== null) {
        const value = saved as Partial<RecordingPrefs>;
        setRecordingPrefs({
          highQuality: typeof value.highQuality === "boolean" ? value.highQuality : DEFAULT_RECORDING_PREFS.highQuality,
          noiseSuppression: typeof value.noiseSuppression === "boolean" ? value.noiseSuppression : DEFAULT_RECORDING_PREFS.noiseSuppression,
        });
      }
    } catch {}
    const savedProgress = loadProgress();
    setProgress(savedProgress);
    const selectedProfile = profiles.find((item) => item.id === savedProgress.profile);
    if (selectedProfile) {
      setMessages(loadMessages(selectedProfile.id) ?? [{ role: "assistant", content: selectedProfile.prompt }]);
    }
    try {
      const savedSettings = localStorage.getItem(AI_SETTINGS_STORAGE);
      const legacyApiKey = localStorage.getItem(API_KEY_STORAGE)?.trim() ?? "";
      if (savedSettings) {
        const parsed: unknown = JSON.parse(savedSettings);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("Cài đặt AI đã lưu không đúng định dạng.");
        }
        const stored = parsed as Record<string, unknown>;
        if (typeof stored.provider === "string" && isAiProvider(stored.provider)) setAiProvider(stored.provider);
        if (typeof stored.keys === "object" && stored.keys !== null && !Array.isArray(stored.keys)) {
          const storedKeys = stored.keys as Record<string, unknown>;
          const validKeys = (value: unknown): ApiKeyEntry[] => Array.isArray(value)
            ? value.flatMap((entry): ApiKeyEntry[] =>
                typeof entry === "object" && entry !== null &&
                "id" in entry && typeof entry.id === "string" &&
                "label" in entry && typeof entry.label === "string" &&
                "value" in entry && typeof entry.value === "string" && entry.value.trim()
                  ? [{ id: entry.id, label: entry.label, value: entry.value.trim() }]
                  : [])
            : [];
          const keys = { google: validKeys(storedKeys.google), openai: validKeys(storedKeys.openai) };
          setApiKeys(keys);
          const storedIds = typeof stored.activeKeyIds === "object" && stored.activeKeyIds !== null
            ? stored.activeKeyIds as Record<string, unknown>
            : {};
          setActiveKeyIds({
            google: typeof storedIds.google === "string" && keys.google.some((entry) => entry.id === storedIds.google)
              ? storedIds.google : keys.google[0]?.id ?? "",
            openai: typeof storedIds.openai === "string" && keys.openai.some((entry) => entry.id === storedIds.openai)
              ? storedIds.openai : keys.openai[0]?.id ?? "",
          });
        }
        if (typeof stored.selectedModels === "object" && stored.selectedModels !== null) {
          const models = stored.selectedModels as Record<string, unknown>;
          setSelectedModels({
            google: typeof models.google === "string" && !/^gemini-(1\.|2\.0)/.test(models.google) && isChatModel(models.google)
              ? models.google : DEFAULT_MODELS.google,
            openai: typeof models.openai === "string" ? models.openai : DEFAULT_MODELS.openai,
          });
        }
      } else if (legacyApiKey) {
        const legacyEntry = { id: "legacy-google-key", label: "Gemini (cũ)", value: legacyApiKey };
        setApiKeys({ google: [legacyEntry], openai: [] });
        setActiveKeyIds({ google: legacyEntry.id, openai: "" });
      }
    } catch (error) {
      setApiKeyError(error instanceof Error
        ? error.message
        : "Không thể đọc cài đặt AI đã lưu trên thiết bị.");
    }
    setAiSettingsLoaded(true);
    try {
      const savedScores: unknown = JSON.parse(localStorage.getItem("lingua-jp-grammar-scores") ?? "{}");
      if (typeof savedScores === "object" && savedScores !== null && !Array.isArray(savedScores)) {
        const validScores = Object.fromEntries(
          Object.entries(savedScores).filter((entry): entry is [string, number] =>
            typeof entry[1] === "number" && Number.isInteger(entry[1]) && entry[1] >= 0 && entry[1] <= 100),
        );
        setGrammarScores(validScores);
      }
    } catch {
      setGrammarError("Không thể đọc kết quả ngữ pháp đã lưu trên thiết bị này.");
    }
    try {
      const savedCourseProgress: unknown = JSON.parse(localStorage.getItem("lingua-jp-course-progress-v2") ?? "{}");
      if (typeof savedCourseProgress === "object" && savedCourseProgress !== null && !Array.isArray(savedCourseProgress)) {
        const validProgress = Object.fromEntries(
          Object.entries(savedCourseProgress).filter((entry): entry is [string, string[]] =>
            Array.isArray(entry[1]) && entry[1].every((lessonId) => typeof lessonId === "string")),
        );
        setCourseProgress(validProgress);
      }
    } catch {
      setCourseError("Không thể đọc tiến độ giáo trình đã lưu trên thiết bị này.");
    }
    try {
      const savedLessonScores: unknown = JSON.parse(localStorage.getItem("lingua-jp-course-lesson-scores-v2") ?? "{}");
      if (typeof savedLessonScores === "object" && savedLessonScores !== null && !Array.isArray(savedLessonScores)) {
        const validScores = Object.fromEntries(
          Object.entries(savedLessonScores).flatMap(([courseId, scores]) => {
            if (typeof scores !== "object" || scores === null || Array.isArray(scores)) return [];
            const lessonScores = Object.fromEntries(
              Object.entries(scores).filter((entry): entry is [string, number] =>
                typeof entry[1] === "number" && Number.isInteger(entry[1]) && entry[1] >= 0 && entry[1] <= 100),
            );
            return [[courseId, lessonScores]];
          }),
        );
        setCourseLessonScores(validScores);
      }
    } catch {
      setCourseError("Không thể đọc điểm bài học đã lưu trên thiết bị này.");
    }
    void listDownloadedCourses()
      .then(setCoursePacks)
      .catch((error: unknown) => {
        setCourseError(error instanceof Error ? error.message : "Không thể đọc các giáo trình offline trên thiết bị.");
      });
    void listPersonalMaterials()
      .then(setPersonalMaterials)
      .catch((error: unknown) => {
        setMaterialError(error instanceof Error ? error.message : "Không thể đọc thư viện cá nhân trên thiết bị.");
      });
    setProgressLoaded(true);
  }, []);

  useEffect(() => {
    if (!fontScaleLoaded) return;
    document.documentElement.style.setProperty("--font-scale", String(fontScale / 100));
    try {
      localStorage.setItem(FONT_SCALE_STORAGE, String(fontScale));
    } catch {
      setFontScaleError("Không thể lưu cỡ chữ trên thiết bị này.");
    }
  }, [fontScale, fontScaleLoaded]);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(APP_THEME_STORAGE);
      if (savedTheme === "mint" || savedTheme === "burgundy" || savedTheme === "blue") {
        setAppTheme(savedTheme);
      }
    } catch {
      setAppThemeError("Không thể đọc giao diện đã lưu trên thiết bị này.");
    }
    setAppThemeLoaded(true);
  }, []);

  useEffect(() => {
    if (!appThemeLoaded) return;
    document.documentElement.dataset.theme = appTheme;
    try {
      localStorage.setItem(APP_THEME_STORAGE, appTheme);
    } catch {
      setAppThemeError("Không thể lưu giao diện trên thiết bị này.");
    }
  }, [appTheme, appThemeLoaded]);

  useEffect(() => {
    let cancelled = false;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    async function checkLatestVersion() {
      setVersionCheckStatus("checking");
      setVersionCheckError("");
      try {
        const response = await fetch(`${basePath}/version.json?check=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Không thể kiểm tra phiên bản mới nhất (HTTP ${response.status}).`);
        }
        const versionInfo: unknown = await response.json();
        if (
          typeof versionInfo !== "object" ||
          versionInfo === null ||
          !("version" in versionInfo) ||
          typeof versionInfo.version !== "string" ||
          !/^\d+\.\d+\.\d+$/.test(versionInfo.version)
        ) {
          throw new Error("Thông tin phiên bản trên máy chủ không hợp lệ.");
        }
        if (cancelled) return;

        const remoteVersion = versionInfo.version;
        setLatestVersion(remoteVersion);
        const current = APP_VERSION.split(".").map(Number);
        const remote = remoteVersion.split(".").map(Number);
        const isNewer = remote.some((part, index) => part > current[index] && remote.slice(0, index).every((value, priorIndex) => value === current[priorIndex]));
        setVersionCheckStatus(isNewer ? "update-available" : "latest");
      } catch (error) {
        if (cancelled) return;
        setVersionCheckError(error instanceof Error ? error.message : "Không thể kiểm tra phiên bản mới nhất.");
        setVersionCheckStatus("error");
      }
    }

    void checkLatestVersion();
    return () => { cancelled = true; };
  }, [versionCheckAttempt]);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onAppInstalled = () => {
      setAppInstalled(true);
      setInstallPrompt(null);
      setInstallError("");
    };
    setAppInstalled(window.matchMedia("(display-mode: standalone)").matches);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!showHelp) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowHelp(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showHelp]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedPersona = localStorage.getItem("lingua-jp-tutor-persona");
      if (savedPersona === "maya" || savedPersona === "david" || savedPersona === "alex") {
        setTutorPersona(savedPersona);
        // Never tuned the voice yourself: it follows the tutor character.
        if (!localStorage.getItem(VOICE_PROFILE_STORAGE)) {
          setVoiceProfile((current) => ({ ...current, ...voiceForTutor(TUTOR_PERSONAS[savedPersona].kind) }));
        }
      }
      const savedViVoice = localStorage.getItem("lingua-jp-vi-voice-id");
      if (savedViVoice) setSelectedViVoiceId(savedViVoice);

      const savedViRate = Number(localStorage.getItem("lingua-jp-vi-rate"));
      if (savedViRate >= 0.6 && savedViRate <= 1.5) setViSpeechRate(savedViRate);
      const savedViPitch = Number(localStorage.getItem("lingua-jp-vi-pitch"));
      if (savedViPitch >= 0.7 && savedViPitch <= 1.3) setViSpeechPitch(savedViPitch);

    } catch {}

    if ("speechSynthesis" in window) {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setSystemVoices(v);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  function updateViVoice(voiceId: string) {
    setSelectedViVoiceId(voiceId);
    try { localStorage.setItem("lingua-jp-vi-voice-id", voiceId); } catch {}
  }
  function updateViRate(rate: number) {
    setViSpeechRate(rate);
    try { localStorage.setItem("lingua-jp-vi-rate", String(rate)); } catch {}
  }
  function updateViPitch(pitch: number) {
    setViSpeechPitch(pitch);
    try { localStorage.setItem("lingua-jp-vi-pitch", String(pitch)); } catch {}
  }

  useEffect(() => {
    if (!aiSettingsLoaded) return;
    try {
      localStorage.setItem(AI_SETTINGS_STORAGE, JSON.stringify({
        provider: aiProvider,
        keys: apiKeys,
        activeKeyIds,
        selectedModels,
      }));
      localStorage.removeItem(API_KEY_STORAGE);
    } catch {
      setApiKeyError("Không thể lưu cài đặt AI trên trình duyệt này.");
    }
  }, [aiProvider, apiKeys, activeKeyIds, selectedModels, aiSettingsLoaded]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) {
      setOfflineError("Trình duyệt này không hỗ trợ mở ứng dụng offline.");
      return;
    }
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    void navigator.serviceWorker
      .register(`${basePath}/sw.js`, { scope: `${basePath}/` })
      .then(() => navigator.serviceWorker.ready)
      .then(() => setOfflineReady(true))
      .catch((error: unknown) => {
        setOfflineError(error instanceof Error ? error.message : "Không thể chuẩn bị ứng dụng để dùng offline.");
      });
  }, []);

  useEffect(() => {
    if (!progressLoaded) return;
    try {
      localStorage.setItem("lingua-jp-progress", JSON.stringify(progress));
    } catch {
      setVoiceError("Không thể lưu tiến độ trên trình duyệt này.");
    }
  }, [progress, progressLoaded]);

  useEffect(() => {
    if (!progressLoaded) return;
    try {
      localStorage.setItem(`lingua-jp-messages-${progress.profile}`, JSON.stringify(messages.slice(-100)));
    } catch {
      setChatError("Không thể lưu lịch sử trò chuyện trên thiết bị này.");
    }
  }, [messages, progress.profile, progressLoaded]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    voiceChatStreamRef.current?.getTracks().forEach((track) => track.stop());
    speechAudioRef.current?.pause();
    if (speechObjectUrlRef.current) URL.revokeObjectURL(speechObjectUrlRef.current);
  }, []);

  useEffect(() => () => {
    if (offlineAudioUrl) URL.revokeObjectURL(offlineAudioUrl);
  }, [offlineAudioUrl]);

  useEffect(() => () => {
    if (materialUrl) URL.revokeObjectURL(materialUrl);
  }, [materialUrl]);

  useEffect(() => {
    if (section !== "practice") {
      classroomBootRef.current = false;
      speechAudioRef.current?.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
      return;
    }
    if (!aiSettingsLoaded || !progressLoaded || classroomBootRef.current) return;
    classroomBootRef.current = true;
    void connectClassroom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, aiSettingsLoaded, progressLoaded]);

  useEffect(() => {
    if (!pendingLessonStartRef.current || section !== "practice") return;
    pendingLessonStartRef.current = false;
    void startLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorLessonId]);

  useEffect(() => {
    if (section !== "practice") return;
    const list = chatListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, section]);

  useEffect(() => {
    if (section !== "lessons" && section !== "practice") return;
    const course = coursePacks.find((item) => item.id === progress.profile);
    if (course?.version !== CURRICULUM_VERSION) {
      void syncCourse(progress.profile);
      return;
    }
    if (section === "lessons" && !selectedCourseId) openDownloadedCourse(course.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, coursePacks, progress.profile]);

  function selectProfile(id: string) {
    const nextProfile = profiles.find((item) => item.id === id);
    if (!nextProfile) return;
    // Only the chosen course is downloaded, in the background while the learner picks a mode.
    void syncCourse(id, true);
    setProgress((current) => ({ ...current, profile: id }));
    setMessages(loadMessages(id) ?? [{ role: "assistant", content: nextProfile.prompt }]);
    setPronunciation(null);
    practiceSessionCounted.current = false;
    setSelectedCourseId("");
    setSelectedLessonId("");
    navigateToSection("mode");
  }

  /**
   * The Google models the saved keys can use. Fetched once (when a key is added, or on first
   * use) and kept; it is refreshed in the background only when Google has retired a model.
   */
  async function googleModelIds(): Promise<string[]> {
    if (googleModelsRef.current) return googleModelsRef.current;
    try {
      const cached = JSON.parse(localStorage.getItem(GOOGLE_MODELS_STORAGE) ?? "null") as { ids?: unknown } | null;
      if (cached && Array.isArray(cached.ids) && cached.ids.length && cached.ids.every((id) => typeof id === "string")) {
        googleModelsRef.current = cached.ids as string[];
        return googleModelsRef.current;
      }
    } catch {}
    for (const entry of apiKeys.google) {
      try {
        const ids = await fetchGoogleModelIds(entry.value);
        if (!ids.length) continue;
        rememberGoogleModels(ids);
        return ids;
      } catch {}
    }
    return [];
  }

  function rememberGoogleModels(ids: string[]) {
    googleModelsRef.current = ids;
    try { localStorage.setItem(GOOGLE_MODELS_STORAGE, JSON.stringify({ at: Date.now(), ids })); } catch {}
  }

  async function chatModelCandidates(fastFirst = false): Promise<string[]> {
    const available = aiProvider === "google" ? await googleModelIds() : [];
    return modelCandidates(aiProvider, activeModel, fastFirst, available);
  }

  async function withAvailableApiKey<T>(
    operation: (key: string, model: string) => Promise<T>,
    onStatus?: (message: string) => void,
  ): Promise<T> {
    const models = await chatModelCandidates();
    const result = await runWithFailover(
      {
        provider: aiProvider,
        keys: apiKeys[aiProvider],
        preferredKeyId: activeKeyIds[aiProvider],
        models,
        onStatus,
      },
      operation,
    );
    rememberWorkingConnection(result.keyId, result.model);
    // The first choice failed: Google may have retired it, so refresh the list quietly.
    if (aiProvider === "google" && result.model !== models[0]) {
      forgetGoogleModels();
      void googleModelIds();
    }
    return result.value;
  }

  function rememberWorkingConnection(keyId: string, model: string) {
    if (activeKeyIds[aiProvider] !== keyId) setActiveKeyIds((current) => ({ ...current, [aiProvider]: keyId }));
    if (activeModel !== model) setSelectedModels((current) => ({ ...current, [aiProvider]: model }));
  }

  async function testAiConnection(): Promise<boolean> {
    if (!apiKeys[aiProvider].length) {
      setConnection({ status: "error", message: `Chưa có API key ${aiProvider === "google" ? "Google AI" : "OpenAI"}. Hãy thêm key trong Cài đặt.` });
      return false;
    }
    setConnection({ status: "checking", message: "Đang kết nối với gia sư AI…" });
    const report: ConnectionReport = await checkConnection({
      provider: aiProvider,
      keys: apiKeys[aiProvider],
      preferredKeyId: activeKeyIds[aiProvider],
      models: await chatModelCandidates(true),
      onStatus: (message) => setConnection({ status: "checking", message }),
    });
    if (report.ok) {
      rememberWorkingConnection(report.keyId, report.model);
      setConnection({ status: "ok", message: `Đã kết nối · ${report.model} · ${(report.ms / 1000).toFixed(1)}s`, ms: report.ms });
      return true;
    }
    setConnection({ status: "error", message: report.error.message, details: report.error.details });
    return false;
  }

  /** The lesson the AI teacher is teaching: one chosen from the course, else the learner's next unfinished lesson. */
  function tutorLesson(): CourseLesson | undefined {
    const course = coursePacks.find((item) => item.id === progress.profile);
    if (!course) return undefined;
    return course.lessons.find((item) => item.id === tutorLessonId) ?? nextLessonFor(course);
  }

  function buildTutorSystemPrompt(): string {
    const persona = TUTOR_PERSONAS[tutorPersona];
    const name = persona.name;
    const self = persona.kind === "man" ? "thầy" : persona.kind === "woman" ? "cô" : name;
    const level = COURSE_LEVELS.includes(progress.level as CourseLevel) ? progress.level as CourseLevel : "A2";
    const levelName = `${LANG.levelSystem} ${levelLabel(level)}`;
    const lesson = tutorLesson();
    const lessonBlock = lesson
      ? `TODAY'S LESSON (from the learner's course, ${LANG.levelSystem} ${levelLabel(lesson.level)}): "${lesson.title}".
Goal: ${lesson.objective}
Key vocabulary: ${lesson.vocabulary.map((v) => `${v.term}${v.reading ? ` [${v.reading}]` : ""} (${v.definition})`).join("; ")}.
${lesson.grammar ? `Grammar focus: ${lesson.grammar.title} — ${lesson.grammar.explanation}` : ""}
${lesson.pronunciation ? `Pronunciation focus: ${lesson.pronunciation.focus} — words: ${lesson.pronunciation.words.join(", ")}.` : ""}
${lesson.speakingTasks?.length ? `Speaking tasks: ${lesson.speakingTasks.join(" | ")}` : ""}
Teach THIS lesson. Use its vocabulary and grammar in every situation you create.`
      : `TOPIC: "${profile.title}", scenario: "${profile.scene}".`;
    return `Your name is "${name}" — always use exactly this name when you introduce yourself. You are an expert, PROACTIVE ${LANG.nameEn} teacher (${persona.kind === "mascot" ? "a cute, cheerful little mascot" : persona.kind === "man" ? "male" : "female"}) for a Vietnamese learner. In Vietnamese you call yourself "${self}" and the learner "em" (mascot: "mình" and "bạn").
Learner: ${levelName}, field "${profile.title}".
${lessonBlock}

LANGUAGE RULES:
${LANG.promptNotes}

HOW TO TEACH AT ${levelName}:
${LEVEL_PEDAGOGY[level]}

LESSON FLOW — you lead, the learner follows. Move to the next stage when the learner is ready:
1. Warm-up: greet, one easy question linked to the topic.
2. Present: teach 2–3 key words or the grammar point with one clear example each.
3. Guided practice: ask the learner to repeat, fill a gap, or transform a sentence.
4. Situations: run at least 3 DIFFERENT realistic situations (you play the other person: customer, colleague, shop assistant…). Make each slightly harder.
5. Check: ask 2 quick questions that test the lesson goal, then summarise strengths and 1–2 things to improve, and suggest the next step (the quiz or a new situation).

CORRECTING — the most important part. After EVERY learner answer:
- Praise one specific thing.
- For each real mistake (grammar, word choice, word order, particles, missing words, word-for-word Vietnamese translation), write ONE line exactly in this format:
✏️ "<what they said>" → "<natural correct ${LANG.nameEn}>" — <short Vietnamese reason>
- If the learner's pronunciation was assessed (voice message) and a word was unclear or wrong, write a line:
🔈 <word>: <what was wrong> → <how to say it, in Vietnamese>. Pay special attention to: ${LANG.pronunciationFocus}.
- Then continue the lesson immediately with the next question or situation.
- If there is no mistake, say so briefly and raise the difficulty.

RULES:
- No markdown asterisks or headings.
- One clear question or task at the end of every turn. Never end on a statement.
- Keep each turn under ${level === "A1" || level === "A2" ? 90 : 120} words.
- First line of EVERY reply: a mood tag [mood:happy] [mood:cheer] [mood:thinking] [mood:surprised] or [mood:neutral] (cheer for praise, thinking for corrections, surprised for excellent answers).
- After the learner has answered at least 4 times, add on the second line your current estimate of their real level as [level:A1|A2|B1|B2] (A1 = ${levelLabel("A1")}, A2 = ${levelLabel("A2")}, B1 = ${levelLabel("B1")}, B2 = ${levelLabel("B2")}) and update it whenever it changes. Tags are hidden from the learner.`;
  }

  /** Strips the hidden [mood:…] and [level:…] tags the teacher puts at the top of a reply. */
  function parseMood(text: string): { text: string; mood?: AvatarEmotion; level?: CourseLevel } {
    let rest = text;
    let mood: AvatarEmotion | undefined;
    let level: CourseLevel | undefined;
    for (;;) {
      const tag = /^\s*\[(mood|level):\s*([a-z0-9]+)\s*\]\s*/i.exec(rest);
      if (!tag) break;
      const value = tag[2].toLowerCase();
      if (tag[1].toLowerCase() === "mood" && ["neutral", "happy", "cheer", "thinking", "surprised"].includes(value)) mood = value as AvatarEmotion;
      if (tag[1].toLowerCase() === "level" && COURSE_LEVELS.includes(value.toUpperCase() as CourseLevel)) level = value.toUpperCase() as CourseLevel;
      rest = rest.slice(tag[0].length);
    }
    // A tag still streaming in must not flash on screen.
    rest = rest.replace(/^\s*\[[^\]]{0,16}$/, "");
    return { text: rest, mood, level };
  }

  function normalizeForApi(history: ChatMessage[]): ChatMessage[] {
    const merged: ChatMessage[] = [];
    for (const message of history) {
      if (!message.content.trim()) continue;
      const last = merged[merged.length - 1];
      if (last && last.role === message.role) {
        last.content += `\n${message.content}`;
        if (message.audio) last.audio = message.audio;
      } else {
        merged.push({ ...message });
      }
    }
    if (merged[0]?.role === "assistant") merged.unshift({ role: "user", content: "(Em đã vào lớp học.)" });
    return merged;
  }

  /** One streamed teacher turn. `base` is what the learner sees; `apiHistory` is what the model receives. */
  async function tutorTurn(base: Message[], apiHistory: ChatMessage[], voice = false): Promise<boolean> {
    // A cancelled turn keeps running on the network but its answer is ignored.
    const turn = ++tutorTurnRef.current;
    const current = () => tutorTurnRef.current === turn;
    tutorTurnBaseRef.current = base;
    // In a voice turn the model first reports what it heard ("HEARD: ..."); that line becomes
    // the learner's message, and everything after it is the teacher's streamed reply.
    let shownBase = base;
    setMessages([...base, { role: "assistant", content: "" }]);
    setChatBusy(true);
    setWaitKind(voice ? "voice" : "text");
    setChatError("");
    setTutorSubtitle("");
    stopSpeech();
    speechFallbackRef.current = "";
    // Read each finished sentence aloud while the rest of the answer is still arriving.
    let spoken = "";
    const speakFinished = (text: string, final: boolean) => {
      if (!text.startsWith(spoken)) {
        // A retry on another model restarted the answer.
        stopSpeech();
        spoken = "";
      }
      const end = final ? text.length : speakableEnd(text, spoken.length);
      if (end > spoken.length) {
        enqueueSpeech(text.slice(spoken.length, end));
        spoken = text.slice(0, end);
      }
    };
    try {
      let shown = "";
      const raw = await withAvailableApiKey(
        (key, model) => streamChat(aiProvider, key, model, buildTutorSystemPrompt(), normalizeForApi(apiHistory), (full) => {
          if (!current()) return;
          let reply = full;
          if (voice) {
            const heard = splitHeard(full);
            if (!heard) return; // the first line (what the learner said) is not complete yet
            reply = heard.reply;
            if (shownBase === base) shownBase = [...base, { role: "user", content: heard.heard }];
          }
          const parsed = parseMood(reply);
          shown = parsed.text;
          if (parsed.mood) setTutorEmotion(parsed.mood);
          if (parsed.level) setAiLevelEstimate(parsed.level);
          setMessages([...shownBase, { role: "assistant", content: parsed.text }]);
          speakFinished(parsed.text, false);
        }),
        (status) => setTutorSubtitle(status),
      );
      if (!current()) return false;
      if (voice && shownBase === base) {
        // The model skipped the HEARD line: show its whole answer, keep a placeholder for the learner.
        shownBase = [...base, { role: "user", content: "🎤 (câu trả lời bằng giọng nói)" }];
      }
      const heard = voice ? splitHeard(raw + "\n") : null;
      const parsed = parseMood(heard ? heard.reply : raw);
      speakFinished(parsed.text || shown, true);
      const finalReply = (parsed.text || shown).trim();
      setMessages([...shownBase, { role: "assistant", content: finalReply }]);
      setProgress((current) => recordPractice(current, 2, !practiceSessionCounted.current));
      practiceSessionCounted.current = true;
      setConnection((current) => current.status === "ok" ? current : { status: "ok", message: "Đã kết nối" });
      return true;
    } catch (error) {
      if (!current()) return false;
      stopSpeech();
      setMessages(base);
      setChatError(friendlyError(error, voice
        ? "Gia sư chưa xử lý được bản ghi. Bạn vui lòng thử lại nhé."
        : "Gia sư chưa thể trả lời. Bạn vui lòng thử lại nhé."));
      lastAiErrorRef.current = error instanceof AiError ? error : null;
      retryTurnRef.current = () => { void tutorTurn(base, apiHistory, voice); };
      return false;
    } finally {
      if (current()) {
        setChatBusy(false);
        setTutorSubtitle("");
      }
    }
  }

  /** "Cancel" while waiting: drop the pending answer and give the screen back at once. */
  function cancelTutorTurn() {
    tutorTurnRef.current += 1;
    stopSpeech();
    setChatBusy(false);
    setTutorSubtitle("");
    setMessages(tutorTurnBaseRef.current);
    lastAiErrorRef.current = new AiError("other", "Đã hủy. Bấm “Thử lại” khi bạn sẵn sàng.");
  }

  async function sendMessage(event?: FormEvent, requestedPrompt?: string) {
    event?.preventDefault();
    const content = (requestedPrompt ?? draft).trim();
    if (!content || chatBusy) return;
    // Inside the tap: lets the answer's audio play on phones later.
    unlockSpeechPlayer();
    if (!apiKey) {
      setChatError(`Hãy thêm API key ${aiProvider === "google" ? "Google AI" : "OpenAI"} trong mục Cài đặt để bắt đầu trò chuyện.`);
      return;
    }
    const conversation = [...messages, { role: "user" as const, content }];
    setDraft("");
    await tutorTurn(conversation, conversation.slice(-12));
  }

  /**
   * Starts a fresh class: earlier chat is cleared (progress lives in the course, not in the
   * chat), then the teacher opens the lesson by itself.
   */
  async function startLesson(): Promise<boolean> {
    stopSpeech();
    setChatError("");
    retryTurnRef.current = null;
    setAiLevelEstimate(null);
    const lesson = tutorLesson();
    const opening = `[CLASS START] The learner has just entered the classroom. Greet them warmly and introduce yourself in one line. Then say the full title of today's lesson${lesson ? ` ("${lesson.title}")` : ""} and its goal in one sentence, begin stage 1 (warm-up) and give the first task. Start speaking now.`;
    return tutorTurn([], [{ role: "user", content: opening }]);
  }

  /** Opens the classroom on one question (from a lesson or quiz), without old chat. */
  function startClassWith(question: string) {
    stopSpeech();
    setChatError("");
    const conversation: Message[] = [{ role: "user", content: question }];
    void tutorTurn(conversation, conversation);
  }

  /** The teacher's opening turn doubles as the connection check, saving one request of quota. */
  async function connectClassroom() {
    if (chatBusy) return;
    if (!apiKeys[aiProvider].length) {
      setConnection({ status: "error", message: `Chưa có API key ${aiProvider === "google" ? "Google AI" : "OpenAI"}. Hãy thêm key trong Cài đặt.` });
      return;
    }
    setConnection({ status: "checking", message: "Đang gọi thầy/cô vào lớp…" });
    lastAiErrorRef.current = null;
    if (await startLesson()) {
      setConnection({ status: "ok", message: "Đã kết nối" });
      return;
    }
    const error = lastAiErrorRef.current as AiError | null;
    setConnection({ status: "error", message: error?.message ?? "Chưa kết nối được với gia sư AI.", details: error?.details });
  }

  function updateLessonView(patch: Partial<{ phonetic: boolean; translation: boolean }>) {
    setLessonView((current) => {
      const next = { ...current, ...patch };
      try { localStorage.setItem("lingua-jp-lesson-view", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function updateRecordingPrefs(patch: Partial<RecordingPrefs>) {
    setRecordingPrefs((current) => {
      const next = { ...current, ...patch };
      try { localStorage.setItem(RECORDING_PREFS_STORAGE, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  /** Microphone settings from the learner's choices. Echo cancelling stays on so the tutor's voice is not recorded. */
  function microphoneConstraints(): MediaStreamConstraints {
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: recordingPrefs.noiseSuppression,
        channelCount: 1,
        ...(recordingPrefs.highQuality ? { sampleRate: 48_000 } : {}),
      },
    };
  }

  /** High quality records at 128 kbps; otherwise the browser's own default is used. */
  function recorderOptions(mimeType?: string): MediaRecorderOptions {
    return {
      ...(mimeType ? { mimeType } : {}),
      ...(recordingPrefs.highQuality ? { audioBitsPerSecond: 128_000 } : {}),
    };
  }

  function startVoiceInput() {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    // Gemini listens to the recording itself and can correct pronunciation, so prefer it.
    if (!Recognition || aiProvider === "google") {
      void startVoiceChatRecording();
      return;
    }
    setVoiceError("");
    const recognition = new Recognition();
    recognition.lang = LANG.speechLang;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join(" ");
      setDraft((current) => current ? `${current} ${transcript}` : transcript);
    };
    recognition.onerror = (event) => setVoiceError(`Micro bị lỗi (${event.error}). Hãy kiểm tra quyền truy cập micro rồi thử lại nhé.`);
    recognition.start();
  }

  async function startVoiceChatRecording() {
    setVoiceError("");
    if (chatBusy) return;
    if (!apiKey) {
      setVoiceError(`Hãy thêm API key ${aiProvider === "google" ? "Google AI" : "OpenAI"} trong mục Cài đặt để bắt đầu trò chuyện.`);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError("Để gửi câu trả lời bằng giọng nói, hãy mở ứng dụng bằng đường dẫn HTTPS và cho phép dùng micro. Bạn cũng có thể nhập câu trả lời.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(microphoneConstraints());
      voiceChatStreamRef.current = stream;
      const supportedTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
      const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, recorderOptions(mimeType));
      voiceChatRecorderRef.current = recorder;
      voiceChatChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceChatChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        voiceChatStreamRef.current = null;
        const blob = new Blob(voiceChatChunksRef.current, { type: recorder.mimeType || "audio/mp4" });
        if (!blob.size) {
          setVoiceError("Chưa ghi được âm thanh. Bạn vui lòng thử lại nhé.");
          return;
        }
        if (aiProvider !== "google") {
          // OpenAI: transcribe, then the normal streamed teacher turn.
          setChatBusy(true);
          setChatError("");
          let learnerMessage = "";
          try {
            learnerMessage = await withAvailableApiKey((key) => transcribeWithOpenAi(key, blob));
          } catch (error) {
            setChatError(error instanceof Error ? error.message : "Không chép được lời nói. Bạn vui lòng thử lại nhé.");
            setChatBusy(false);
            return;
          }
          setChatBusy(false);
          const conversation = [...messages, { role: "user" as const, content: learnerMessage }];
          await tutorTurn(conversation, conversation.slice(-12));
          return;
        }
        // Gemini hears the audio itself (so it can judge pronunciation) and answers as a
        // stream, exactly like a typed message: words appear and are read aloud as they arrive.
        try {
          const audio = await getAudioData(blob);
          const instruction = `The learner has just answered by VOICE (audio attached).
Reply in exactly this layout:
Line 1: HEARD: <exactly what they said, keeping their mistakes; do not correct this line>
Then your teacher reply, following every rule above (mood tag first, corrections with the pencil marker).
Listen to their pronunciation (ending sounds, word stress, th sounds, z/sh sounds, vowel length) and add a speaker-marker line for each word that was unclear or wrong.`;
          const history = messages.slice(-8);
          await tutorTurn(history, [...history, { role: "user", content: instruction, audio }], true);
        } catch (error) {
          setChatError(friendlyError(error, "Gia sư chưa xử lý được bản ghi. Bạn vui lòng thử lại nhé."));
        }
      };
      recorder.start();
      setVoiceChatRecording(true);
    } catch (error) {
      setVoiceError(error instanceof Error
        ? `Không thể dùng micro: ${error.message}`
        : "Không thể dùng micro. Hãy kiểm tra quyền truy cập micro của trình duyệt.");
    }
  }

  function stopVoiceChatRecording() {
    if (voiceChatRecorderRef.current?.state === "recording") {
      voiceChatRecorderRef.current.stop();
      setVoiceChatRecording(false);
    }
  }

  async function startPronunciationRecording() {
    setPronunciation(null);
    setVoiceError("");
    if (aiProvider !== "google") {
      setVoiceError("Phản hồi phát âm trực tiếp từ âm thanh hiện cần chọn Google AI trong Cài đặt. OpenAI vẫn dùng được cho hội thoại và nhập giọng nói.");
      return;
    }
    if (!apiKey) {
      setVoiceError("Hãy thêm Google AI API key trong mục Cài đặt để nhận góp ý phát âm.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError("Trình duyệt này chưa hỗ trợ ghi âm. Hãy thử mở ứng dụng bằng Safari hoặc Chrome mới nhất qua đường dẫn HTTPS.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(microphoneConstraints());
      streamRef.current = stream;
      const supportedTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
      const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, recorderOptions(mimeType));
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/mp4" });
        if (!blob.size) {
          setVoiceError("Chưa ghi được âm thanh. Bạn vui lòng thử lại nhé.");
          return;
        }
        setPronunciationBusy(true);
        try {
          const audio = await getAudioData(blob);
          const targetPhrase = (targetPronunciationPhrase.trim() || profile.words[0]).trim();
          const response = await withAvailableApiKey((key, model) => generateGeminiMultimodalResponse(key, [
            {
              text: `Listen to the learner's audio and evaluate how understandable and accurate their pronunciation is for the ${LANG.nameEn} phrase: "${targetPhrase}".
Pay special attention to common pronunciation challenges for Vietnamese speakers of ${LANG.nameEn}: ${LANG.pronunciationFocus}.
Be supportive, warm, and specific. Treat this as an encouraging AI coaching aid.
Return ONLY valid JSON with these fields: {"score": integer 0-100, "heard": short transcript of what you heard, "feedback": one or two concise sentences in Vietnamese giving constructive feedback, "soundsToPractice": array of at most 3 short words or sounds of the target language}. If audio is unclear, say so in feedback and give a low-confidence score.`,
            },
            { inlineData: audio },
          ], model));
          const data = parseAiJson(response, "Chưa đọc được kết quả chấm phát âm. Bạn vui lòng ghi âm lại nhé.");
          if (typeof data !== "object" || data === null || !("score" in data) ||
              typeof data.score !== "number" || !("heard" in data) || typeof data.heard !== "string" ||
              !("feedback" in data) || typeof data.feedback !== "string" ||
              !("soundsToPractice" in data) || !Array.isArray(data.soundsToPractice) ||
              data.soundsToPractice.some((sound) => typeof sound !== "string")) {
            throw new Error("Phản hồi đánh giá phát âm không đúng định dạng. Vui lòng thử lại.");
          }
          setPronunciation({
            score: Math.max(0, Math.min(100, Math.round(data.score))),
            heard: data.heard,
            feedback: data.feedback,
            soundsToPractice: data.soundsToPractice.slice(0, 3),
          });
          setProgress((current) => recordPractice(current, 1, !practiceSessionCounted.current));
          practiceSessionCounted.current = true;
        } catch (error) {
          setVoiceError(friendlyError(error, "Chưa thể đánh giá bản ghi. Bạn vui lòng thử lại nhé."));
        } finally {
          setPronunciationBusy(false);
        }
      };
      recorder.start();
      setRecording(true);
    } catch (error) {
      setVoiceError(error instanceof Error ? `Không thể dùng micro: ${error.message}` : "Không thể dùng micro. Hãy kiểm tra quyền truy cập micro của trình duyệt.");
    }
  }

  function stopPronunciationRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      setRecording(false);
    }
  }

  /** A key was added or removed: the cached Google model list may no longer match. */
  function forgetGoogleModels() {
    googleModelsRef.current = null;
    try { localStorage.removeItem(GOOGLE_MODELS_STORAGE); } catch {}
  }

  async function saveApiKey(event: FormEvent) {
    forgetGoogleModels();
    event.preventDefault();
    const candidate = apiKeyDraft.trim();
    if (!candidate) {
      setApiKeyError(`Vui lòng nhập API key ${aiProvider === "google" ? "Google AI" : "OpenAI"}.`);
      return;
    }
    const duplicate = apiKeys[aiProvider].find((entry) => entry.value === candidate);
    if (duplicate) {
      setApiKeyError(`Key này đã được lưu với tên “${duplicate.label}”. Hãy dán một key khác.`);
      return;
    }
    setApiKeyBusy(true);
    setApiKeyError("");
    setApiKeySaved(false);
    try {
      let models: AiModel[];
      if (aiProvider === "google") {
        // One request both checks the key and fetches the model list kept for later.
        const ids = await fetchGoogleModelIds(candidate);
        models = ids.filter(isChatModel).sort().map((id) => ({ id, label: id }));
        if (!models.length) throw new Error("API key Google không có mô hình hỗ trợ trò chuyện.");
        rememberGoogleModels(ids);
      } else {
        models = await fetchAiModels(aiProvider, candidate);
      }
      const entry = {
        id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `key-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        label: nextKeyLabel(apiKeys[aiProvider]),
        value: candidate,
      };
      setApiKeys((current) => ({ ...current, [aiProvider]: [...current[aiProvider], entry] }));
      setActiveKeyIds((current) => ({ ...current, [aiProvider]: entry.id }));
      setModelCatalog((current) => ({ ...current, [aiProvider]: models }));
      if (!models.some((model) => model.id === selectedModels[aiProvider])) {
        setSelectedModels((current) => ({ ...current, [aiProvider]: models.find((model) => model.id === DEFAULT_MODELS[aiProvider])?.id ?? models[0]?.id ?? DEFAULT_MODELS[aiProvider] }));
      }
      setApiKeyDraft("");
      setApiKeySaved(true);
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "Không thể xác thực API key. Vui lòng thử lại.");
    } finally {
      setApiKeyBusy(false);
    }
  }

  async function loadModels() {
    if (!apiKey) {
      setModelsError(`Hãy lưu ít nhất một API key ${aiProvider === "google" ? "Google AI" : "OpenAI"} trước.`);
      return;
    }
    setModelsBusy(true);
    setModelsError("");
    try {
      const models = await withAvailableApiKey((key) => fetchAiModels(aiProvider, key));
      setModelCatalog((current) => ({ ...current, [aiProvider]: models }));
      if (!models.some((model) => model.id === selectedModels[aiProvider])) {
        setSelectedModels((current) => ({ ...current, [aiProvider]: models.find((model) => model.id === DEFAULT_MODELS[aiProvider])?.id ?? models[0]?.id ?? DEFAULT_MODELS[aiProvider] }));
      }
    } catch (error) {
      setModelsError(error instanceof Error ? error.message : "Không thể tải danh sách mô hình.");
    } finally {
      setModelsBusy(false);
    }
  }

  function playNativeUtterance(text: string, lang: "vi" | "en"): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        resolve();
        return;
      }
      const clean = cleanSpeechText(text);
      if (!clean) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(clean);
      const voices = systemVoices.length > 0 ? systemVoices : window.speechSynthesis.getVoices();

      if (lang === "vi") {
        utterance.lang = "vi-VN";
        utterance.rate = viSpeechRate;
        utterance.pitch = viSpeechPitch;
        const userVoice = voices.find((v) => v.voiceURI === selectedViVoiceId || v.name === selectedViVoiceId);
        const viVoice = userVoice ??
          voices.find((v) => (v.lang.startsWith("vi") || v.lang.includes("VN")) && /Natural|Google|HoaiMy|NamMinh/.test(v.name)) ??
          voices.find((v) => v.lang.startsWith("vi") || v.lang.includes("VN"));
        if (viVoice) utterance.voice = viVoice;
      } else {
        const { voice, pitch } = pickDeviceVoice(voices, voiceProfile);
        utterance.rate = voiceProfile.childlike ? Math.min(voiceProfile.speed * 1.08, 1.3) : voiceProfile.speed;
        // No real voice of that gender on this device (or a child's voice): imitate it with pitch.
        utterance.pitch = pitch;
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang ?? getAccent(voiceProfile.accent).locales[0];
      }

      // Each spoken word moves the avatar's mouth.
      utterance.onboundary = (event) => { if (event.name === "word") pulseMouth(); };
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  function updateVoiceProfile(patch: Partial<VoiceProfile>) {
    setVoiceProfile((current) => {
      const next = { ...current, ...patch };
      if (patch.gender) {
        next.googleVoice = voiceForGender(GOOGLE_VOICES, next.googleVoice, patch.gender);
        next.openaiVoice = voiceForGender(OPENAI_VOICES, next.openaiVoice, patch.gender);
        next.deviceVoice = "";
      }
      if (patch.accent) next.deviceVoice = "";
      try { localStorage.setItem(VOICE_PROFILE_STORAGE, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  /** Cloud audio for one English sentence, or null when the device voice should be used. */
  async function englishAudio(text: string, profile = voiceProfile): Promise<Blob | null> {
    const engine = profile.engine;
    if (engine === "device" || !apiKeys[engine].length) return null;
    // After a failure the device voice is used for a while, instead of waiting on every sentence.
    if (Date.now() < cloudSpeechPausedUntilRef.current) throw new Error(cloudSpeechPauseReasonRef.current || "giọng AI tạm nghỉ");
    // v4: earlier Google clips could contain the spoken direction, so they are not reused.
    const cacheKey = `v4:${engine}:${cloudVoiceId(profile)}:${profile.accent}:${profile.style}:${profile.speed}${profile.childlike ? ":child" : ""}`;
    try {
      const cached = await getCachedSpeech(cacheKey, text);
      if (cached) return cached;
    } catch {}
    let value: Blob;
    try {
      ({ value } = await runWithFailover(
        {
          provider: engine,
          keys: apiKeys[engine],
          preferredKeyId: activeKeyIds[engine],
          models: engine === "google"
            ? [...new Set([...rankGoogleModels(await googleModelIds(), "tts"), ...GOOGLE_TTS_MODELS])].slice(0, 3)
            : OPENAI_TTS_MODELS,
          deadlineMs: 20_000,
        },
        (key, model) => synthesizeCloudSpeech(engine, key, model, profile, text),
      ));
    } catch (error) {
      cloudSpeechPausedUntilRef.current = Date.now() + 3 * 60_000;
      cloudSpeechPauseReasonRef.current = error instanceof Error ? error.message : "lỗi giọng AI";
      throw error;
    }
    try { await saveCachedSpeech(cacheKey, text, value); } catch {}
    return value;
  }

  /**
   * One audio element for all AI speech. It is started (silently) inside the tap that asks
   * for speech, because phones refuse to play audio that starts after a network wait.
   */
  function speechPlayer(): HTMLAudioElement {
    if (!speechPlayerRef.current) speechPlayerRef.current = new Audio();
    return speechPlayerRef.current;
  }

  function unlockSpeechPlayer() {
    // Also inside the tap: lip sync measures the AI voice through Web Audio.
    attachLipSync(speechPlayer());
    if (speechPlayerUnlockedRef.current) return;
    const player = speechPlayer();
    player.src = SILENT_WAV;
    player.play().then(() => { speechPlayerUnlockedRef.current = true; }).catch(() => {});
  }

  function playBlob(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(blob);
      const player = speechPlayer();
      speechAudioRef.current = player;
      speechObjectUrlRef.current = objectUrl;
      const done = () => {
        player.onended = null;
        player.onpause = null;
        player.onerror = null;
        if (speechObjectUrlRef.current === objectUrl) speechObjectUrlRef.current = null;
        URL.revokeObjectURL(objectUrl);
        resolve();
      };
      player.onended = done;
      player.onpause = done;
      player.onerror = () => { done(); reject(new Error("trình duyệt không phát được tệp âm thanh")); };
      player.src = objectUrl;
      resumeLipSync();
      player.play().catch((error: unknown) => {
        player.onpause = null;
        done();
        reject(new Error(error instanceof DOMException && error.name === "NotAllowedError"
          ? "trình duyệt chặn tự phát âm thanh"
          : "trình duyệt không phát được âm thanh"));
      });
    });
  }

  function stopSpeech() {
    speechRunRef.current += 1;
    speechQueueRef.current = [];
    speechAudioRef.current?.pause();
    speechAudioRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeechLoading(false);
    setSpeechPlaying(false);
  }

  function engineLabel(profile: VoiceProfile): string {
    return profile.engine === "google" ? `Giọng AI Google · ${profile.googleVoice}` : `Giọng AI OpenAI · ${profile.openaiVoice}`;
  }

  /**
   * Adds text to the speech queue. Vietnamese parts use the device voice, English parts the
   * chosen practice voice; AI audio for every queued sentence is requested immediately, so
   * the next clip is usually ready when the current one ends.
   */
  function enqueueSpeech(text: string, englishOnly = false) {
    const profile = voiceProfile;
    const segments = englishOnly
      ? text.split(/\n+/).map((line) => ({ text: cleanSpeechText(stripReadings(line)), lang: "en" as const })).filter((item) => item.text)
      : splitBilingualText(text);
    for (const segment of segments) {
      if (!segment.text.trim()) continue;
      speechQueueRef.current.push({
        ...segment,
        clip: segment.lang === "en"
          ? englishAudio(segment.text, profile).catch((error: unknown) => {
            speechFallbackRef.current = error instanceof Error ? error.message : "lỗi không xác định";
            return null;
          })
          : null,
      });
    }
    if (!speechQueueRunningRef.current) void runSpeechQueue();
  }

  async function runSpeechQueue() {
    speechQueueRunningRef.current = true;
    const run = speechRunRef.current;
    const profile = voiceProfile;
    let usedCloud = false;
    let spokeEnglish = false;
    setSpeechBusy(true);
    setSpeechError("");
    try {
      while (speechQueueRef.current.length && speechRunRef.current === run) {
        const item = speechQueueRef.current.shift()!;
        if (item.lang === "en") spokeEnglish = true;
        if (item.clip) {
          setSpeechLoading(true);
          const clip = await item.clip;
          setSpeechLoading(false);
          if (speechRunRef.current !== run) break;
          if (clip) {
            try {
              setSpeechPlaying(true);
              await playBlob(clip);
              usedCloud = true;
              continue;
            } catch (error) {
              speechFallbackRef.current = error instanceof Error ? error.message : "không phát được";
            } finally {
              setSpeechPlaying(false);
            }
          }
        }
        setSpeechPlaying(true);
        await playNativeUtterance(item.text, item.lang);
        setSpeechPlaying(false);
      }
    } finally {
      speechQueueRunningRef.current = false;
      setSpeechLoading(false);
      setSpeechPlaying(false);
      if (speechRunRef.current === run) {
        setSpeechBusy(false);
        if (spokeEnglish) {
          const reason = speechFallbackRef.current;
          const deviceName = pickDeviceVoice(systemVoices.length ? systemVoices : window.speechSynthesis?.getVoices?.() ?? [], profile).voice?.name;
          setSpeechNotice(usedCloud && !reason
            ? `🔊 Vừa phát bằng ${engineLabel(profile)}.`
            : profile.engine === "device"
            ? `🔊 Vừa phát bằng giọng trên máy${deviceName ? `: ${deviceName}` : ""}.`
            : `⚠️ ${engineLabel(profile)} chưa dùng được (${reason || "không rõ lý do"}), nên vừa phát bằng giọng trên máy${deviceName ? ` (${deviceName})` : ""}.`);
        }
      } else if (speechQueueRef.current.length) {
        // A new run queued text while this one was stopping.
        void runSpeechQueue();
      }
    }
  }

  /** Replaces whatever is playing with `text`. */
  async function speak(text: string, englishOnly = false) {
    const clean = text.trim();
    if (!clean) return;
    stopSpeech();
    // Must happen inside the tap, before any await.
    unlockSpeechPlayer();
    speechFallbackRef.current = voiceProfile.engine !== "device" && !apiKeys[voiceProfile.engine].length
      ? `chưa có API key ${voiceProfile.engine === "google" ? "Google" : "OpenAI"}`
      : "";
    setSpeechNotice(voiceProfile.engine === "device" ? "" : `Đang tạo ${engineLabel(voiceProfile)}…`);
    enqueueSpeech(clean, englishOnly);
  }

  /** End of the last complete sentence after `from`, or `from` when none is long enough yet. */
  function speakableEnd(text: string, from: number): number {
    let end = from;
    for (const match of text.slice(from).matchAll(/[.!?…:](?:["”'’)\]」』]*)\s+|[。！？](?:[」』）)\]]*)\s*|\n+/g)) {
      end = from + (match.index ?? 0) + match[0].length;
    }
    return end - from >= 24 ? end : from;
  }

  function playPracticePhrase(text: string) {
    return speak(text, true);
  }

  function playSpeech(text: string) {
    if (text.length > 4000) {
      setSpeechError("Đoạn nghe quá dài. Hãy chọn một đoạn ngắn hơn (tối đa 4.000 ký tự).");
      return Promise.resolve();
    }
    return speak(text);
  }

  function handlePracticePhraseFromMessage(content: string, specificPhrase?: string) {
    const phrases = extractPracticePhrases(content);
    let target = (specificPhrase?.trim() || (phrases.length > 0 ? phrases[0] : "")).trim();
    target = cleanSpeechText(target).replace(/^[\"“'\`](.*)[\"”'\`]$/, "$1").trim();

    if (!target) {
      setSpeechNotice("Tin nhắn này không có câu mẫu tiếng Nhật để luyện phát âm.");
      return;
    }

    try {
      const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regexAfter = new RegExp(`(?:\\*\\*|[\"“'「])${escaped}(?:\\*\\*|[\"”'」])\\s*(?:\\[[^\\]]*\\])?\\s*[(（]([^)）]+)[)）]`, "i");
      const meaningMatch = content.match(regexAfter);
      if (meaningMatch && meaningMatch[1]?.trim()) {
        const extractedMeaning = meaningMatch[1].trim();
        setCustomMeanings((prev) => ({ ...prev, [target]: extractedMeaning }));
      }
    } catch {}

    setTargetPronunciationPhrase(target);
    void playPracticePhrase(target);
    if (typeof document !== "undefined") {
      const panel = document.querySelector<HTMLDetailsElement>(".cr-pronounce");
      if (panel) {
        panel.open = true;
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }

  function renderRecordingSettings() {
    const switches: { key: keyof RecordingPrefs; title: string; on: string; off: string }[] = [
      {
        key: "highQuality",
        title: "Ghi âm chất lượng cao",
        on: "Đang bật: ghi ở 128 kbps, 48 kHz — AI nghe rõ các âm nhẹ nên nhận xét phát âm chính xác hơn. Bản ghi hơi nặng hơn một chút.",
        off: "Đang tắt: dùng chất lượng mặc định của trình duyệt (gửi nhẹ hơn, phù hợp khi mạng yếu).",
      },
      {
        key: "noiseSuppression",
        title: "Khử tiếng ồn",
        on: "Đang bật: bớt tiếng ồn xung quanh, hợp khi ở nơi ồn. Đôi khi làm mờ các âm nhẹ như /s/, /θ/.",
        off: "Đang tắt: giữ nguyên mọi âm, tốt nhất để chấm phát âm khi bạn ở nơi yên tĩnh.",
      },
    ];
    return (
      <section className="panel settings-panel recording-settings">
        <div className="settings-section-heading">
          <span className="settings-icon" aria-hidden="true">🎙️</span>
          <div><h3>Ghi âm giọng của bạn</h3><p>Chất lượng bản ghi ảnh hưởng trực tiếp đến nhận xét phát âm của AI.</p></div>
        </div>
        {switches.map((item) => (
          <label className="switch-row" key={item.key}>
            <span className="switch-copy">
              <strong>{item.title}</strong>
              <small>{recordingPrefs[item.key] ? item.on : item.off}</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              className="switch-input"
              checked={recordingPrefs[item.key]}
              onChange={(event) => updateRecordingPrefs({ [item.key]: event.target.checked })}
            />
          </label>
        ))}
        <small className="settings-hint">Gợi ý: ở nơi yên tĩnh hãy bật “chất lượng cao” và tắt “khử tiếng ồn”. Ở nơi ồn, bật cả hai. Thay đổi áp dụng từ lần ghi âm kế tiếp.</small>
      </section>
    );
  }

  function renderVoiceStudio() {
    const accent = getAccent(voiceProfile.accent);
    const groups = [...new Set(ACCENTS.map((item) => item.group))];
    const cloudList = voiceProfile.engine === "openai" ? OPENAI_VOICES : GOOGLE_VOICES;
    const deviceList = deviceVoicesForAccent(systemVoices, voiceProfile.accent);
    const devicePick = pickDeviceVoice(systemVoices, voiceProfile);
    const engineReady = voiceProfile.engine === "device" || apiKeys[voiceProfile.engine].length > 0;
    return (
      <section className="panel settings-panel voice-studio">
        <div className="settings-section-heading">
          <span className="settings-icon" aria-hidden="true">🌍</span>
          <div><h3>Giọng tiếng Nhật để luyện nghe</h3><p>Chọn vùng miền, nam/nữ và giọng cụ thể. Áp dụng cho bài học, câu mẫu và lời thầy/cô AI.</p></div>
        </div>

        <span className="settings-label">1 · Nguồn giọng</span>
        <div className="voice-engines" role="radiogroup" aria-label="Nguồn giọng">
          {([
            ["google", "Giọng AI Google", "Tự nhiên nhất · 22 giọng · đọc đúng mọi vùng miền · cần mạng + key Google"],
            ["openai", "Giọng AI OpenAI", "Tự nhiên · 11 giọng · mọi vùng miền · cần mạng + key OpenAI (tính phí)"],
            ["device", "Giọng trên máy", "Miễn phí, chạy offline · nghe máy móc hơn · vùng miền, nam/nữ tùy máy"],
          ] as const).map(([id, label, hint]) => (
            <button key={id} type="button" role="radio" aria-checked={voiceProfile.engine === id}
              className={voiceProfile.engine === id ? "voice-engine active" : "voice-engine"}
              onClick={() => updateVoiceProfile({ engine: id })}>
              <strong>{label}</strong><small>{hint}</small>
              {id !== "device" && !apiKeys[id].length && <em>Cần API key {id === "google" ? "Google" : "OpenAI"}</em>}
            </button>
          ))}
        </div>
        <p className="settings-hint">Giọng AI dùng cho <strong>mọi</strong> phần có đọc tiếng Nhật (bài học offline, câu mẫu, lời thầy/cô) khi có mạng. Mỗi câu chỉ tạo một lần rồi lưu trên máy, nên lần sau nghe lại được cả khi offline. Câu mới mà không có mạng sẽ tự đọc bằng giọng trên máy.</p>
        {!engineReady && <p className="error-message">Chưa có API key cho nguồn này — app sẽ dùng giọng trên máy cho tới khi bạn thêm key ở mục Nhà cung cấp AI.</p>}

        <span className="settings-label">2 · Vùng miền</span>
        {groups.map((group) => (
          <div className="voice-accent-group" key={group}>
            <small>{group}</small>
            <div className="voice-chips">
              {ACCENTS.filter((item) => item.group === group).map((item) => {
                const deviceCount = deviceVoicesForAccent(systemVoices, item.id).length;
                return (
                  <button key={item.id} type="button"
                    className={voiceProfile.accent === item.id ? "voice-chip active" : "voice-chip"}
                    onClick={() => updateVoiceProfile({ accent: item.id })}
                    title={voiceProfile.engine === "device" && !deviceCount ? "Máy này chưa có giọng vùng này" : item.name}>
                    {item.flag} {item.name}
                    {voiceProfile.engine === "device" && !deviceCount && <i aria-hidden="true"> ·  không có trên máy</i>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <span className="settings-label">3 · Giọng nữ / nam / trẻ em</span>
        <div className="voice-chips">
          {([["female", "👩 Nữ"], ["male", "👨 Nam"]] as const).map(([id, label]) => (
            <button key={id} type="button" className={!voiceProfile.childlike && voiceProfile.gender === id ? "voice-chip active" : "voice-chip"} onClick={() => updateVoiceProfile({ gender: id, childlike: false })}>{label}</button>
          ))}
          <button type="button" className={voiceProfile.childlike ? "voice-chip active" : "voice-chip"} onClick={() => updateVoiceProfile(voiceForTutor("mascot"))}>🧒 Trẻ em</button>
        </div>
        <small className="settings-hint">Tự đổi theo nhân vật gia sư: {LANG.tutors.david.name} → nam, {LANG.tutors.maya.name} → nữ, {LANG.tutors.alex.name} → trẻ em. Bạn vẫn có thể chọn lại ở đây.</small>

        <span className="settings-label">4 · Chọn giọng</span>
        {voiceProfile.engine === "device" ? (
          deviceList.length ? (
            <select className="settings-select" value={voiceProfile.deviceVoice} onChange={(event) => updateVoiceProfile({ deviceVoice: event.target.value })}>
              <option value="">Tự chọn giọng {voiceProfile.gender === "female" ? "nữ" : "nam"} phù hợp nhất</option>
              {deviceList.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang}){{ female: " · nữ", male: " · nam", unknown: "" }[guessDeviceVoiceGender(voice)]}</option>
              ))}
            </select>
          ) : (
            <p className="settings-hint">Máy này chưa có giọng {accent.flag} {accent.name}. Hãy chọn Giọng AI, hoặc cài thêm giọng tiếng Nhật trong cài đặt ngôn ngữ của hệ điều hành (Windows: Settings → Time &amp; language → Speech; Android: Text-to-speech; iPhone: Accessibility → Spoken Content → Voices).</p>
          )
        ) : (
          <div className="voice-named-grid">
            {cloudList.filter((voice) => voice.gender === voiceProfile.gender).map((voice) => {
              const selected = cloudVoiceId(voiceProfile) === voice.id;
              return (
                <button key={voice.id} type="button" className={selected ? "voice-named active" : "voice-named"}
                  onClick={() => updateVoiceProfile(voiceProfile.engine === "openai" ? { openaiVoice: voice.id } : { googleVoice: voice.id })}>
                  <strong>{voice.id}</strong><small>{voice.character}</small>
                </button>
              );
            })}
          </div>
        )}

        {voiceProfile.engine === "device" && deviceList.length > 0 && !devicePick.genderMatches && (
          <p className="voice-warning">
            {devicePick.pitch === 1
              ? <>Máy này không cho biết giọng nào là nam hay nữ, nên đang dùng giọng mặc định của máy.</>
              : <>Máy này không có giọng {voiceProfile.gender === "female" ? "nữ" : "nam"} thật cho vùng {accent.name}, nên app đang <strong>mô phỏng</strong> bằng cách {voiceProfile.gender === "male" ? "hạ" : "nâng"} cao độ.</>}
            {" "}Để có giọng {voiceProfile.gender === "female" ? "nữ" : "nam"} thật, hãy chọn <button type="button" className="text-button" onClick={() => updateVoiceProfile({ engine: "google" })}>Giọng AI Google</button> hoặc cài thêm giọng tiếng Nhật trong cài đặt máy.
          </p>
        )}

        <span className="settings-label">5 · Phong cách và tốc độ</span>
        <div className="voice-chips">
          {VOICE_STYLES.map((style) => (
            <button key={style.id} type="button" className={voiceProfile.style === style.id ? "voice-chip active" : "voice-chip"} onClick={() => updateVoiceProfile({ style: style.id })}>{style.label}</button>
          ))}
        </div>
        <label className="voice-speed">
          <span>Tốc độ: {voiceProfile.speed.toFixed(2)}×</span>
          <input type="range" min="0.7" max="1.2" step="0.05" value={voiceProfile.speed} onChange={(event) => updateVoiceProfile({ speed: Number(event.target.value) })} />
        </label>

        <div className="voice-preview">
          <p>“{accent.sample}”</p>
          <div className="cr-connect-actions">
            <button type="button" className="button button-primary" disabled={speechBusy} onClick={() => { void playPracticePhrase(accent.sample); }}>
              {speechBusy ? "Đang phát…" : `▶ Nghe thử ${accent.flag} ${accent.name}`}
            </button>
            {speechBusy && <button type="button" className="button button-outline" onClick={() => { stopSpeech(); setSpeechBusy(false); }}>■ Dừng</button>}
            <button type="button" className="button button-outline" onClick={() => { void removeSavedSpeech(); }}>Xóa âm thanh đã lưu</button>
          </div>
          {speechNotice && <p className="settings-hint" role="status">{speechNotice}</p>}
          <small className="settings-hint">Giọng AI được tạo khi nghe lần đầu rồi lưu trên máy để nghe lại offline. Giọng AI có thể tính vào hạn mức API của bạn.</small>
        </div>
      </section>
    );
  }

  async function removeSavedSpeech() {
    setSpeechError("");
    setSpeechNotice("");
    try {
      await clearSpeechCache();
      setSpeechNotice("Đã xóa các đoạn nghe đã lưu trên thiết bị.");
    } catch (error) {
      setSpeechError(error instanceof Error ? error.message : "Không thể xóa các đoạn nghe đã lưu.");
    }
  }

  function removeApiKey(id: string) {
    forgetGoogleModels();
    try {
      const remaining = apiKeys[aiProvider].filter((entry) => entry.id !== id);
      setApiKeys((current) => ({ ...current, [aiProvider]: remaining }));
      if (activeKeyIds[aiProvider] === id) {
        setActiveKeyIds((current) => ({ ...current, [aiProvider]: remaining[0]?.id ?? "" }));
      }
      setApiKeySaved(false);
      setApiKeyError("");
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "Không thể xóa API key khỏi bộ nhớ trình duyệt.");
    }
  }

  function completePlacement() {
    const score = placementAnswers.reduce(
      (total, answer, index) => total + (answer === placementQuestions[index].answer ? 1 : 0),
      0,
    );
    const level = score >= 7 ? "B2" : score >= 5 ? "B1" : score >= 3 ? "A2" : "A1";
    setProgress((current) => ({ ...current, level }));
    const corrections = placementQuestions
      .filter((question, index) => placementAnswers[index] !== question.answer)
      .map((question) => question.explanation);
    setPlacementResult(
      `Bạn trả lời đúng ${score}/${placementQuestions.length} câu. Trình độ bắt đầu của bạn là ${levelLabel(level)}. Gia sư sẽ điều chỉnh bài luyện tập cho phù hợp.` +
      (corrections.length ? `\n\nCùng học thêm nhé:\n${corrections.map((item) => `• ${item}`).join("\n")}` : `\n\nTuyệt lắm, bạn đã trả lời đúng cả ${placementQuestions.length} câu!`),
    );
  }

  function selectGrammarTopic(topicId: string) {
    setGrammarTopicId(topicId);
    setGrammarAnswers([]);
    setGrammarSubmitted(false);
    setGrammarError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function completeGrammarQuiz() {
    const topic = grammarTopics.find((item) => item.id === grammarTopicId);
    if (!topic || grammarAnswers.length !== topic.questions.length) return;
    const score = topic.questions.reduce(
      (total, question, index) => total + (grammarAnswers[index] === question.answer ? 1 : 0),
      0,
    );
    const percentage = Math.round((score / topic.questions.length) * 100);
    const updatedScores = { ...grammarScores, [topic.id]: Math.max(grammarScores[topic.id] ?? 0, percentage) };
    setGrammarScores(updatedScores);
    setGrammarSubmitted(true);
    setGrammarError("");
    try {
      localStorage.setItem("lingua-jp-grammar-scores", JSON.stringify(updatedScores));
    } catch {
      setGrammarError("Không thể lưu kết quả trên thiết bị này. Hãy kiểm tra dung lượng bộ nhớ trình duyệt.");
    }
  }

  async function downloadCourse(courseId: string) {
    setCourseBusyId(courseId);
    setCourseDownloadProgress({ completed: 0, total: 0 });
    setCourseError("");
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const course = await downloadCoursePackage(courseId, basePath, (completed, total) => {
        setCourseDownloadProgress({ completed, total });
      });
      const downloaded = await listDownloadedCourses();
      setCoursePacks(downloaded);
      setSelectedCourseId(course.id);
      setSelectedLessonId(
        course.lessons.find((item) => item.level === progress.level)?.id ??
        course.lessons[0]?.id ??
        "",
      );
      const nextProfile = profiles.find((item) => item.id === courseId);
      if (nextProfile) {
        setProgress((current) => ({ ...current, profile: courseId }));
        setMessages(loadMessages(courseId) ?? [{ role: "assistant", content: nextProfile.prompt }]);
      }
      setCourseAnswers([]);
      setCourseQuizSubmitted(false);
      navigateToSection("lessons");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setCourseError(/HTTP 404/.test(message)
        ? "Gói giáo trình cho lĩnh vực này chưa được phát hành. Vui lòng thử lại sau khi có nội dung tải về."
        : message || "Không thể tải giáo trình. Vui lòng thử lại.");
    } finally {
      setCourseBusyId("");
    }
  }

  async function removeCourse(courseId: string) {
    setCourseError("");
    try {
      await removeDownloadedCourse(courseId);
      setCoursePacks(await listDownloadedCourses());
      if (selectedCourseId === courseId) {
        setSelectedCourseId("");
        setSelectedLessonId("");
        setOfflineAudioUrl("");
      }
    } catch (error) {
      setCourseError(error instanceof Error ? error.message : "Không thể xóa giáo trình khỏi thiết bị.");
    }
  }

  async function importPersonalMaterial(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setMaterialBusy(true);
    setMaterialError("");
    try {
      const added = await addPersonalMaterial(file);
      setPersonalMaterials((current) => [added, ...current]);
    } catch (error) {
      setMaterialError(error instanceof Error ? error.message : "Không thể lưu tệp vào thư viện cá nhân.");
    } finally {
      setMaterialBusy(false);
    }
  }

  async function openPersonalMaterial(material: PersonalMaterial) {
    setMaterialError("");
    try {
      const stored = await getPersonalMaterial(material.id);
      if (!stored) throw new Error("Không tìm thấy tệp trên thiết bị. Có thể dữ liệu trình duyệt đã bị xóa.");
      setSelectedMaterial(material);
      setMaterialText(material.type === "text" ? await stored.file.text() : "");
      setMaterialUrl(material.type === "text" ? "" : URL.createObjectURL(stored.file));
    } catch (error) {
      setMaterialError(error instanceof Error ? error.message : "Không thể mở tài liệu đã lưu.");
    }
  }

  async function deletePersonalMaterial(id: string) {
    setMaterialError("");
    try {
      await removePersonalMaterial(id);
      setPersonalMaterials((current) => current.filter((item) => item.id !== id));
      if (selectedMaterial?.id === id) {
        setSelectedMaterial(null);
        setMaterialText("");
        setMaterialUrl("");
      }
    } catch (error) {
      setMaterialError(error instanceof Error ? error.message : "Không thể xóa tài liệu khỏi thiết bị.");
    }
  }

  /** First lesson the learner can open but has not passed — "học tiếp bài đang học". */
  function nextLessonFor(course: CoursePackage): CourseLesson | undefined {
    const completed = courseProgress[course.id] ?? [];
    const open = unlockedLessonIds(course, completed, progress.level);
    const pending = course.lessons.filter((item) => open.has(item.id) && !completed.includes(item.id));
    // Start at the learner's own level; easier lessons stay open but are not pushed on them.
    const learnerIndex = Math.max(0, COURSE_LEVELS.findIndex((level) => level === progress.level));
    return pending.find((item) => COURSE_LEVELS.indexOf(item.level) >= learnerIndex) ?? pending[0];
  }

  /** Quietly stores the bundled pack for a profile (or refreshes an older version). */
  /** `quiet`: a background prefetch that shows nothing and reports no error. */
  async function syncCourse(courseId: string, quiet = false) {
    const stored = coursePacks.find((item) => item.id === courseId);
    if (stored?.version === CURRICULUM_VERSION) return;
    if (courseSyncRef.current === courseId) {
      // Already downloading in the background: just show the learner it is on its way.
      if (!quiet) setCourseSyncing(true);
      return;
    }
    courseSyncRef.current = courseId;
    if (!quiet) {
      setCourseSyncing(true);
      setCourseError("");
    }
    try {
      await downloadCoursePackage(courseId, process.env.NEXT_PUBLIC_BASE_PATH ?? "", () => {});
      setCoursePacks(await listDownloadedCourses());
    } catch (error) {
      if (!quiet) setCourseError(error instanceof Error ? error.message : "Không thể tải giáo trình. Hãy kiểm tra kết nối mạng.");
    } finally {
      courseSyncRef.current = null;
      setCourseSyncing(false);
    }
  }

  function openDownloadedCourse(courseId: string) {
    const course = coursePacks.find((item) => item.id === courseId);
    if (!course) {
      setCourseError("Không tìm thấy giáo trình trên thiết bị này. Hãy tải lại khi có mạng.");
      return;
    }
    setSelectedCourseId(course.id);
    setSelectedLessonId(nextLessonFor(course)?.id ?? course.lessons[0]?.id ?? "");
    setLessonTab("learn");
    const nextProfile = profiles.find((item) => item.id === courseId);
    if (nextProfile && progress.profile !== courseId) {
      setProgress((current) => ({ ...current, profile: courseId }));
      setMessages(loadMessages(courseId) ?? [{ role: "assistant", content: nextProfile.prompt }]);
    }
    setCourseAnswers([]);
    setCourseQuizSubmitted(false);
    setCourseError("");
    setOfflineAudioUrl("");
    navigateToSection("lessons");
  }

  function openCourseLesson(lessonId: string) {
    setSelectedLessonId(lessonId);
    setLessonTab("learn");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    setCourseAnswers([]);
    setCourseQuizSubmitted(false);
    setCourseError("");
    setOfflineAudioUrl("");
  }

  async function playOfflineAudio(courseId: string, audioId: string) {
    setCourseError("");
    try {
      const blob = await getDownloadedAudio(courseId, audioId);
      if (!blob) throw new Error("Không tìm thấy audio offline. Hãy xóa và tải lại gói giáo trình này.");
      setOfflineAudioUrl(URL.createObjectURL(blob));
    } catch (error) {
      setCourseError(error instanceof Error ? error.message : "Không thể mở audio đã tải về.");
    }
  }

  function completeCourseQuiz(
    course: CoursePackage,
    lessonId: string,
    questions: CoursePackage["lessons"][number]["questions"],
  ) {
    if (!questions.length || courseAnswers.length !== questions.length ||
        courseAnswers.some((answer) => !Number.isInteger(answer) || answer < 0)) return;
    const score = questions.reduce(
      (total, question, index) => total + (courseAnswers[index] === question.answer ? 1 : 0),
      0,
    );
    const passed = score >= Math.ceil(questions.length * LESSON_PASS_RATIO);
    const percentage = Math.round((score / questions.length) * 100);
    setCourseQuizSubmitted(true);
    const updatedScores = {
      ...courseLessonScores,
      [course.id]: {
        ...courseLessonScores[course.id],
        [lessonId]: Math.max(courseLessonScores[course.id]?.[lessonId] ?? 0, percentage),
      },
    };
    const updatedProgress = {
      ...courseProgress,
      [course.id]: courseProgress[course.id] ?? [],
    };
    if (passed && !updatedProgress[course.id].includes(lessonId)) {
      updatedProgress[course.id] = [...updatedProgress[course.id], lessonId];
    }
    setCourseLessonScores(updatedScores);
    if (passed) {
      setCourseProgress(updatedProgress);
      // Finishing every lesson of the learner's current level moves them up one level.
      const levelIndex = COURSE_LEVELS.findIndex((level) => level === progress.level);
      const currentLevel = COURSE_LEVELS[Math.max(levelIndex, 0)];
      const levelLessons = course.lessons.filter((item) => item.level === currentLevel);
      if (levelLessons.length && levelLessons.every((item) => updatedProgress[course.id].includes(item.id)) &&
          levelIndex < COURSE_LEVELS.length - 1) {
        setProgress((current) => ({ ...current, level: COURSE_LEVELS[Math.max(levelIndex, 0) + 1] }));
      }
    }
    try {
      localStorage.setItem("lingua-jp-course-lesson-scores-v2", JSON.stringify(updatedScores));
      if (passed) localStorage.setItem("lingua-jp-course-progress-v2", JSON.stringify(updatedProgress));
      setCourseError("");
    } catch {
      setCourseError("Không thể lưu điểm hoặc tiến độ bài học trên thiết bị này.");
    }
  }

  function renderSettings() {
    const keyEntries = apiKeys[aiProvider];
    return (
      <>
        <div className="page-intro">
          <span className="eyebrow">CÀI ĐẶT CHUNG</span>
          <h2>Cài đặt ứng dụng.</h2>
          <p>Chọn một nhóm để mở các tùy chọn chi tiết.</p>
        </div>
        <details name="settings-groups" className="settings-group">
          <summary className="settings-group-summary">
            <span className="settings-icon"><IllustrationIcon name="courses" /></span>
            <span><strong>Giáo trình offline</strong><small>Tải hoặc quản lý bài học trên thiết bị</small></span>
            <span className="settings-group-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="settings-group-content">
            {renderCourses(true)}
          </div>
        </details>
        <details name="settings-groups" className="settings-group">
          <summary className="settings-group-summary">
            <span className="settings-icon font-size-icon">Aa</span>
            <span><strong>Giao diện & hiển thị</strong><small>Cỡ chữ và màu sắc ứng dụng</small></span>
            <span className="settings-group-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="settings-group-content">
        <section className="panel settings-panel font-size-settings">
          <div className="settings-section-heading">
            <span className="settings-icon font-size-icon" aria-hidden="true">Aa</span>
            <div><h3>Cỡ chữ</h3><p>Tăng chữ để nội dung dễ đọc hơn trên thiết bị này.</p></div>
          </div>
          <div className="font-scale-control">
            <label className="settings-label" htmlFor="font-scale">Kích thước hiển thị</label>
            <output className="font-scale-value" htmlFor="font-scale">{fontScale}%</output>
            <input
              id="font-scale"
              className="font-scale-slider"
              type="range"
              min="100"
              max="180"
              step="5"
              value={fontScale}
              aria-valuetext={`${fontScale}%`}
              onChange={(event) => setFontScale(Number(event.target.value))}
            />
            <div className="font-scale-endpoints"><span>100% · Tiêu chuẩn</span><span>140% · Gợi ý</span><span>180% · Rất lớn</span></div>
          </div>
          <div className="font-scale-preview" aria-hidden="true">
            <p style={{ margin: "0 0 6px", fontWeight: "700" }}>Bản xem trước cỡ chữ thực tế ({fontScale}%):</p>
            <p style={{ margin: "0 0 6px" }}>“Teacher AI: {LANG.nameNative} — {LANG.welcome.greetingJa}”</p>
            <small style={{ display: "block", color: "var(--theme-text, #315b49)", opacity: 0.85 }}>Cỡ chữ này được áp dụng đồng bộ ngay cho toàn bộ bài học, hội thoại cùng gia sư và giao diện.</small>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
            <button type="button" className="button button-outline" onClick={() => setFontScale(100)} disabled={fontScale === 100}>
              Cỡ chuẩn (100%)
            </button>
            <button type="button" className="button button-outline" onClick={() => setFontScale(130)} disabled={fontScale === 130}>
              Cỡ to dễ đọc (130%)
            </button>
            <button type="button" className="button button-outline" onClick={() => setFontScale(160)} disabled={fontScale === 160}>
              Cỡ rất lớn (160%)
            </button>
          </div>
          {fontScaleError && <p className="error-message">{fontScaleError}</p>}
        </section>
        <section className="panel settings-panel app-theme-settings">
          <div className="settings-section-heading">
            <span className="settings-icon theme-icon" aria-hidden="true">◐</span>
            <div><h3>Giao diện màu sắc</h3><p>Nền trắng, chọn màu khung và điểm nhấn theo sở thích.</p></div>
          </div>
          <div className="theme-options" role="group" aria-label="Chọn giao diện màu sắc">
            <button
              type="button"
              className={`theme-option mint-theme${appTheme === "mint" ? " selected" : ""}`}
              aria-pressed={appTheme === "mint"}
              onClick={() => setAppTheme("mint")}
            >
              <span className="theme-swatch" aria-hidden="true"><span /></span>
              <span className="theme-option-copy"><strong>Nền trắng / Khung xanh mint</strong><small>Giao diện xanh mint ban đầu</small></span>
              <span className="theme-option-check" aria-hidden="true">{appTheme === "mint" ? "✓" : ""}</span>
            </button>
            <button
              type="button"
              className={`theme-option burgundy-theme${appTheme === "burgundy" ? " selected" : ""}`}
              aria-pressed={appTheme === "burgundy"}
              onClick={() => setAppTheme("burgundy")}
            >
              <span className="theme-swatch" aria-hidden="true"><span /></span>
              <span className="theme-option-copy"><strong>Nền trắng / Khung đỏ bordeaux</strong><small>Tông đỏ rượu vang thanh lịch</small></span>
              <span className="theme-option-check" aria-hidden="true">{appTheme === "burgundy" ? "✓" : ""}</span>
            </button>
            <button
              type="button"
              className={`theme-option blue-theme${appTheme === "blue" ? " selected" : ""}`}
              aria-pressed={appTheme === "blue"}
              onClick={() => setAppTheme("blue")}
            >
              <span className="theme-swatch" aria-hidden="true"><span /></span>
              <span className="theme-option-copy"><strong>Nền trắng / Khung xanh dương</strong><small>Tông xanh tươi sáng, dễ nhìn</small></span>
              <span className="theme-option-check" aria-hidden="true">{appTheme === "blue" ? "✓" : ""}</span>
            </button>
          </div>
          {appThemeError && <p className="error-message" role="alert">{appThemeError}</p>}
        </section>
          </div>
        </details>
        <details name="settings-groups" className="settings-group">
          <summary className="settings-group-summary">
            <span className="settings-icon">🎓</span>
            <span><strong>Gia sư AI đồng hành</strong><small>{TUTOR_PERSONAS[tutorPersona].name} · {TUTOR_PERSONAS[tutorPersona]?.title}</small></span>
            <span className="settings-group-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="settings-group-content">
            <section className="panel settings-panel tutor-persona-settings">
              <div className="settings-section-heading">
                <span className="settings-icon" aria-hidden="true">🎓</span>
                <div>
                  <h3>Chọn nhân vật gia sư 3D</h3>
                  <p>Lựa chọn hình tượng gia sư phù hợp với sở thích của bạn. Giọng đọc tự đổi theo nhân vật: thầy → giọng nam, cô → giọng nữ, {LANG.tutors.alex.name} → giọng trẻ em.</p>
                </div>
              </div>
              <div className="tutor-persona-grid">
                {(Object.keys(TUTOR_PERSONAS) as TutorPersona[]).map((pKey) => {
                  const persona = TUTOR_PERSONAS[pKey];
                  const isSelected = tutorPersona === pKey;
                  return (
                    <div
                      key={pKey}
                      className={`tutor-persona-card ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setTutorPersona(pKey);
                        updateVoiceProfile(voiceForTutor(TUTOR_PERSONAS[pKey].kind));
                        try {
                          localStorage.setItem("lingua-jp-tutor-persona", pKey);
                        } catch {}
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                    >
                      <div className="persona-card-avatar">
                        <TutorAvatar kind={persona.kind} status="idle" emotion="happy" size={84} interactive={false} />
                      </div>
                      <div className="persona-card-details">
                        <div className="persona-card-top">
                          <strong>{TUTOR_PERSONAS[pKey].name}</strong>
                          <span className="persona-card-badge">{persona.badge}</span>
                        </div>
                        <p className="persona-card-tagline">{persona.tagline}</p>
                        <small className="persona-card-desc">{persona.description}</small>
                      </div>
                      <div className="persona-card-select-indicator">
                        {isSelected ? "✓ Đang chọn" : "Chọn gia sư này"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </details>
        <details name="settings-groups" className="settings-group">
          <summary className="settings-group-summary">
            <span className="settings-icon"><IllustrationIcon name="key" /></span>
            <span><strong>Nhà cung cấp & mô hình AI</strong><small>{aiProvider === "google" ? "Google Gemini" : "OpenAI"} · {activeModel}</small></span>
            <span className="settings-group-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="settings-group-content">
        <section className="panel settings-panel">
          <div className="settings-section-heading">
            <span className="settings-icon"><IllustrationIcon name="key" /></span>
            <div><h3>Nhà cung cấp AI</h3><p>API key được gửi trực tiếp từ trình duyệt tới nhà cung cấp đã chọn.</p></div>
          </div>
          <label className="settings-label" htmlFor="ai-provider">Nhà cung cấp</label>
          <select id="ai-provider" className="settings-select" value={aiProvider} onChange={(event) => {
            if (isAiProvider(event.target.value)) {
              setAiProvider(event.target.value);
              setApiKeyDraft("");
              setApiKeyError("");
              setApiKeySaved(false);
              setModelsError("");
            }
          }}>
            <option value="google">Google Gemini</option>
            <option value="openai">OpenAI / ChatGPT</option>
          </select>
          <div className="settings-key-list">
            <span className="settings-label">Các API key đã lưu ({keyEntries.length})</span>
            {keyEntries.length === 0 && <p className="settings-hint">Chưa có key nào.</p>}
            <ul className="key-list">
              {keyEntries.map((entry) => (
                <li key={entry.id} className={entry.id === activeKeyIds[aiProvider] ? "active" : ""}>
                  <button type="button" className="key-pick" onClick={() => setActiveKeyIds((current) => ({ ...current, [aiProvider]: entry.id }))}>
                    <strong>{entry.label}</strong>
                    <small>••••{entry.value.slice(-4)}{entry.id === activeKeyIds[aiProvider] ? " · đang dùng trước" : ""}</small>
                  </button>
                  <button type="button" className="remove-key-button" onClick={() => removeApiKey(entry.id)}>Xóa</button>
                </li>
              ))}
            </ul>
            {keyEntries.length > 1 && <small className="settings-hint">Khi một key bị từ chối hoặc hết hạn mức, app tự chuyển sang key khác. Lưu ý: các key cùng một dự án Google dùng chung hạn mức — hãy tạo mỗi key ở một dự án riêng.</small>}
          </div>
          <form className="settings-key-form" onSubmit={(event) => { void saveApiKey(event); }}>
            <label className="settings-label" htmlFor="ai-api-key">Thêm API key {keyEntries.length ? "dự phòng" : ""}</label>
            <input id="ai-api-key" className="settings-input" type="password" autoComplete="off" value={apiKeyDraft} onChange={(event) => {
              setApiKeyDraft(event.target.value);
              setApiKeyError("");
              setApiKeySaved(false);
            }} placeholder={aiProvider === "google" ? "Dán Google AI API key" : "Dán OpenAI API key"} />
            <a href={aiProvider === "google" ? "https://aistudio.google.com/app/apikey" : "https://platform.openai.com/api-keys"} target="_blank" rel="noreferrer">
              Tạo API key {aiProvider === "google" ? "Google AI Studio" : "trên OpenAI"} ↗
            </a>
            <small className="settings-hint">Key chỉ lưu trên thiết bị này, không đặt trong mã nguồn. Không dùng trên thiết bị công cộng; nhà cung cấp có thể tính phí theo tài khoản của bạn.</small>
            {apiKeyError && <p className="error-message" role="alert">{apiKeyError}</p>}
            {apiKeySaved && <p className="api-key-success" role="status">Đã thêm key. Hiện có {keyEntries.length} key — khi một key lỗi hoặc hết hạn mức, app tự chuyển sang key tiếp theo.</p>}
            <button className="button button-primary" type="submit" disabled={apiKeyBusy || !apiKeyDraft.trim()}>
              {apiKeyBusy ? "Đang xác thực key…" : "＋ Kiểm tra và lưu key"}
            </button>
          </form>
          <div className="settings-connection">
            <button type="button" className="button button-outline" onClick={() => { void testAiConnection(); }} disabled={connection.status === "checking" || !keyEntries.length}>
              {connection.status === "checking" ? "Đang kiểm tra…" : "⚡ Kiểm tra kết nối AI"}
            </button>
            {connection.message && <p className={connection.status === "error" ? "error-message" : "api-key-success"} role="status">{connection.message}</p>}
            {connection.status === "error" && connection.details && connection.details.length > 0 && (
              <details className="cr-connect-details">
                <summary>Chi tiết từng lần thử ({connection.details.length})</summary>
                <ul>{connection.details.map((line, index) => <li key={index}>{line}</li>)}</ul>
              </details>
            )}
            <small className="settings-hint">App tự thử lần lượt các key và mô hình dự phòng, rồi ghi nhớ cấu hình chạy được.</small>
          </div>
        </section>

        <section className="panel settings-panel">
          <div className="settings-section-heading">
            <span className="settings-icon"><IllustrationIcon name="sparkles" /></span>
            <div><h3>Mô hình AI</h3><p>Chọn mô hình trong danh sách được API key của bạn hỗ trợ.</p></div>
          </div>
          <button type="button" className="button button-outline" onClick={() => { void loadModels(); }} disabled={modelsBusy || !apiKey}>
            {modelsBusy ? "Đang tải mô hình…" : "↻ Tải danh sách mô hình"}
          </button>
          {modelsError && <p className="error-message" role="alert">{modelsError}</p>}
          <label className="settings-label" htmlFor="ai-model">Mô hình hội thoại</label>
          <select id="ai-model" className="settings-select" value={activeModel} onChange={(event) =>
            setSelectedModels((current) => ({ ...current, [aiProvider]: event.target.value }))}>
            {!modelCatalog[aiProvider].some((model) => model.id === activeModel) && <option value={activeModel}>{activeModel} · mặc định</option>}
            {modelCatalog[aiProvider].map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
          </select>
        </section>
          </div>
        </details>
        <details name="settings-groups" className="settings-group">
          <summary className="settings-group-summary">
            <span className="settings-icon"><IllustrationIcon name="speaker" /></span>
            <span><strong>Giọng đọc & phát âm</strong><small>{getAccent(voiceProfile.accent).flag} {getAccent(voiceProfile.accent).name} · {voiceProfile.gender === "female" ? "nữ" : "nam"} · {voiceProfile.engine === "device" ? "giọng trên máy" : voiceProfile.engine === "google" ? `Google ${voiceProfile.googleVoice}` : `OpenAI ${voiceProfile.openaiVoice}`}</small></span>
            <span className="settings-group-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="settings-group-content">
            {/* 1. VIETNAMESE VOICE SETTINGS */}
            <section className="panel settings-panel">
              <div className="settings-section-heading">
                <span className="settings-icon" aria-hidden="true">🇻🇳</span>
                <div>
                  <h3>Giọng đọc Tiếng Việt (Giải thích bài học & chỉ dẫn)</h3>
                  <p>Chọn giọng đọc trên thiết bị và điều chỉnh tốc độ, cao độ để giọng nghe ấm áp, tự nhiên nhất.</p>
                </div>
              </div>

              {/* Voice select */}
              <label className="settings-label" htmlFor="vi-device-voice">Giọng tiếng Việt trên thiết bị</label>
              {(() => {
                const viVoices = systemVoices.filter((v) => v.lang.toLowerCase().startsWith("vi") || v.lang.toLowerCase().includes("vn"));
                return (
                  <select
                    id="vi-device-voice"
                    className="settings-select"
                    value={selectedViVoiceId}
                    onChange={(e) => updateViVoice(e.target.value)}
                  >
                    <option value="">Giọng Tiếng Việt mặc định hệ thống</option>
                    {viVoices.map((v) => (
                      <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                );
              })()}

              {/* Speed rate */}
              <div className="font-scale-control" style={{ marginTop: "12px" }}>
                <label className="settings-label" htmlFor="vi-speech-rate">Tốc độ đọc tiếng Việt</label>
                <output className="font-scale-value" htmlFor="vi-speech-rate">{viSpeechRate.toFixed(2)}x</output>
                <input
                  id="vi-speech-rate"
                  className="font-scale-slider"
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.05"
                  value={viSpeechRate}
                  onChange={(e) => updateViRate(Number(e.target.value))}
                />
                <div className="font-scale-endpoints">
                  <span>0.7x · Chậm rãi</span>
                  <span>0.95x · Khuyên dùng</span>
                  <span>1.3x · Nhanh</span>
                </div>
              </div>

              {/* Pitch */}
              <div className="font-scale-control" style={{ marginTop: "12px" }}>
                <label className="settings-label" htmlFor="vi-speech-pitch">Cao độ giọng (Trầm / Bổng)</label>
                <output className="font-scale-value" htmlFor="vi-speech-pitch">{viSpeechPitch.toFixed(2)}x</output>
                <input
                  id="vi-speech-pitch"
                  className="font-scale-slider"
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.05"
                  value={viSpeechPitch}
                  onChange={(e) => updateViPitch(Number(e.target.value))}
                />
                <div className="font-scale-endpoints">
                  <span>0.8x · Trầm ấm</span>
                  <span>1.0x · Tiêu chuẩn</span>
                  <span>1.2x · Trong trẻo</span>
                </div>
              </div>

              {/* Test button */}
              <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={async () => {
                    setVoiceTestNotice("Đang phát thử giọng tiếng Việt...");
                    await playNativeUtterance("Xin chào bạn! Tôi là gia sư tiếng Nhật của bạn, chúc bạn học tập thật vui và tiến bộ mỗi ngày.", "vi");
                    setVoiceTestNotice("Đã hoàn tất phát thử giọng tiếng Việt.");
                  }}
                >
                  ▶ Nghe thử giọng tiếng Việt
                </button>
                {voiceTestNotice && <span style={{ fontSize: "0.85rem", color: "var(--theme-text, #134e4a)" }}>{voiceTestNotice}</span>}
              </div>

              <div className="speech-device-tip-box" style={{ marginTop: "14px", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.84rem", color: "#475569", lineHeight: "1.5" }}>
                <strong>💡 Mẹo để có giọng đọc tiếng Việt hay nhất:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: "18px" }}>
                  <li><strong>Trên điện thoại Android:</strong> Vào Cài đặt máy ➔ Trợ năng ➔ Đầu ra chuyển văn bản thành giọng nói (Text-to-speech) ➔ Chọn <em>Speech Services by Google</em> ➔ Bấm biểu tượng Cài đặt ➔ Tải gói dữ liệu tiếng Việt chất lượng cao. Giọng đọc sẽ trở nên rất truyền cảm và tự nhiên.</li>
                  <li><strong>Trên máy tính:</strong> Trình duyệt Microsoft Edge hỗ trợ sẵn các giọng <em>Microsoft HoaiMy Online (Natural)</em> và <em>Microsoft NamMinh Online (Natural)</em> chất lượng tuyệt hảo.</li>
                </ul>
              </div>
            </section>

            {renderVoiceStudio()}
            {renderRecordingSettings()}
          </div>
        </details>
        <details name="settings-groups" className="settings-group">
          <summary className="settings-group-summary">
            <span className="settings-icon"><IllustrationIcon name="settings" /></span>
            <span><strong>Cài đặt ứng dụng</strong><small>Hướng dẫn cài ứng dụng lên màn hình chính</small></span>
            <span className="settings-group-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="settings-group-content">
        {renderInstallAppPanel()}
          </div>
        </details>
      </>
    );
  }

  function askTutorAboutQuestion(
    lessonTitle: string,
    prompt: string,
    options: string[],
    selectedOptionIndex: number,
    correctOptionIndex: number,
    explanation: string,
  ) {
    const userChoice = Number.isInteger(selectedOptionIndex) && options[selectedOptionIndex]
      ? options[selectedOptionIndex]
      : "Chưa chọn đáp án";
    const correctChoice = options[correctOptionIndex] ?? "";
    const questionText = `Chào thầy/cô! Em đang học bài "${lessonTitle}" và có câu hỏi trắc nghiệm này chưa hiểu rõ:
- Câu hỏi: "${prompt}"
- Em chọn: "${userChoice}"
- Đáp án đúng là: "${correctChoice}"
- Giải thích: "${explanation}"

Thầy/cô giải thích thêm giúp em tại sao lại chọn "${correctChoice}" và cách dùng trong thực tế với ạ?`;

    classroomBootRef.current = true;
    navigateToSection("practice");
    startClassWith(questionText);
  }

  function askTutorAboutLesson(lesson: CourseLesson) {
    // The classroom opens with this lesson; the teacher starts it by itself.
    setTutorLessonId(lesson.id);
    setConnection({ status: "idle", message: "" });
    navigateToSection("practice");
  }

  function askTutorAboutGrammar(topic: GrammarTopic, question?: GrammarQuestion, selectedIndex?: number) {
    let questionText = "";
    if (question && Number.isInteger(selectedIndex)) {
      const userChoice = question.options[selectedIndex!] ?? "Chưa chọn";
      const correctChoice = question.options[question.answer] ?? "";
      questionText = `Chào thầy/cô! Em đang làm bài tập chủ đề ngữ pháp "${topic.title}" (${levelLabel(topic.level)}) và thắc mắc câu này:
- Câu hỏi: "${question.prompt}"
- Em đã chọn: "${userChoice}"
- Đáp án đúng: "${correctChoice}"
- Giải thích: "${question.explanation}"

Cô giải thích thêm giúp em tại sao lại chọn đáp án này và lỗi người Việt hay mắc phải với ạ?`;
    } else {
      questionText = `Chào thầy/cô! Em đang xem cấu trúc ngữ pháp "${topic.title}" (${topic.structure}).
Cô giải thích ngắn gọn cách dùng cấu trúc này và cho em một tình huống thực tế để em thử đặt câu luyện tập với ạ!`;
    }

    classroomBootRef.current = true;
    navigateToSection("practice");
    startClassWith(questionText);
  }

  function renderPractice() {
    const persona = TUTOR_PERSONAS[tutorPersona];
    const course = coursePacks.find((item) => item.id === progress.profile);
    const currentLesson = tutorLesson();
    // The mouth moves only while sound really plays; waiting for the network shows as thinking.
    const avatarStatus: "idle" | "thinking" | "speaking" | "listening" =
      voiceChatRecording ? "listening" : speechPlaying ? "speaking" : chatBusy || speechLoading ? "thinking" : "idle";
    const lastTeacherMessage = [...messages].reverse().find((m) => m.role === "assistant" && m.content.trim());
    const waitingForWords = chatBusy && !messages[messages.length - 1]?.content.trim();
    const caption = waitingForWords
      ? tutorSubtitle || `${TUTOR_PERSONAS[tutorPersona].name} đang suy nghĩ…`
      : voiceChatRecording
      ? "Đang lắng nghe bạn… nói xong thì nhấn nút dừng nhé."
      : cleanSpeechText(lastTeacherMessage?.content ?? `Hi! I'm ${TUTOR_PERSONAS[tutorPersona].name}. ${persona.greeting}`);
    const waitNote = waitingForWords
      ? <span className="cr-wait">💭 Đang chờ AI trả lời <WaitDots /></span>
      : null;
    const connected = connection.status === "ok" || (connection.status === "idle" && messages.some((m) => m.role === "user"));

    if (!connected) {
      const checking = connection.status === "checking" || connection.status === "idle";
      return (
        <section className="cr-connect">
          <div className={`cr-connect-avatar${checking ? " waiting" : ""}`}>
            <TutorAvatar kind={persona.kind} status={checking ? "thinking" : "idle"} emotion={checking ? undefined : "neutral"} size={150} />
          </div>
          <h2>{checking ? `Đang gọi ${TUTOR_PERSONAS[tutorPersona].name} vào lớp…` : "Chưa kết nối được với gia sư AI"}</h2>
          <p className={checking ? "cr-connect-note" : "error-message"} role={checking ? "status" : "alert"}>
            {connection.message || "Đang kiểm tra API key và mô hình…"}
          </p>
          {!checking && connection.details && connection.details.length > 0 && (
            <details className="cr-connect-details">
              <summary>Chi tiết từng lần thử ({connection.details.length})</summary>
              <ul>{connection.details.map((line, index) => <li key={index}>{line}</li>)}</ul>
            </details>
          )}
          {!checking && (
            <div className="cr-connect-actions">
              <button type="button" className="button button-primary" onClick={() => { void connectClassroom(); }}>↻ Thử lại</button>
              <button type="button" className="button button-outline" onClick={() => navigateToSection("settings")}>Kiểm tra API key</button>
            </div>
          )}
          {checking && <div className="cr-spinner" aria-hidden="true" />}
        </section>
      );
    }

    const phraseInUse = targetPronunciationPhrase || profile.words[0];
    return (
      <div className="cr">
        <section className="cr-stage" aria-label="Lớp học với gia sư AI">
          <div className="cr-stage-top">
            <span className="cr-chip cr-chip-live"><i /> {TUTOR_PERSONAS[tutorPersona].name}</span>
            <span className="cr-chip cr-chip-level" title="Trình độ đang học">{levelLabel(progress.level)}</span>
            {aiLevelEstimate && <span className="cr-chip" title="Trình độ AI ước lượng qua cuộc hội thoại">AI đánh giá: {levelLabel(aiLevelEstimate)}</span>}
          </div>
          {course && (
            <label className="cr-lesson-pick">
              <span>Bài đang dạy</span>
              <select
                value={currentLesson?.id ?? ""}
                disabled={chatBusy}
                onChange={(event) => { pendingLessonStartRef.current = true; setTutorLessonId(event.target.value); }}
              >
                {course.lessons.map((item) => (
                  <option key={item.id} value={item.id}>
                    {(course && (courseProgress[course.id] ?? []).includes(item.id)) ? "✓ " : ""}{levelLabel(item.level)} · {item.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="cr-avatar">
            <TutorAvatar kind={persona.kind} status={avatarStatus} emotion={avatarStatus === "thinking" || avatarStatus === "listening" ? undefined : tutorEmotion} size={240} />
          </div>
          <div className={`cr-bubble cr-bubble-${avatarStatus}`}>
            <p>{caption || "…"}</p>
            {waitNote}
            {avatarStatus === "speaking" && <span className="cr-wave" aria-hidden="true"><i /><i /><i /><i /></span>}
          </div>
          <div className="cr-stage-actions">
            <button type="button" className="cr-round" disabled={speechBusy || !lastTeacherMessage} onClick={() => lastTeacherMessage && void playSpeech(lastTeacherMessage.content)} title="Nghe lại">🔊 Nghe lại</button>
            <button type="button" className="cr-round" disabled={chatBusy} onClick={() => { void sendMessage(undefined, "Thầy/cô ra tình huống mới cho em luyện nhé."); }} title="Tình huống mới">🎬 Tình huống mới</button>
            <button type="button" className="cr-round" disabled={chatBusy} onClick={() => { void startLesson(); }} title="Xóa hội thoại và học lại bài từ đầu">🗑 Xóa & học lại</button>
          </div>
        </section>

        <section className="cr-chat">
          <div className="message-list cr-messages" ref={chatListRef}>
            {messages.filter((m) => m.content.trim() || m.role === "assistant").map((message, index) => {
              const extractedPhrases = message.role === "assistant" ? extractPracticePhrases(message.content) : [];
              return (
                <div className={`message-row ${message.role}`} key={`${index}-${message.role}`}>
                  {message.role === "assistant" && <div className="mini-avatar" aria-hidden="true">{persona.badge.split(" ")[0]}</div>}
                  <div className="message-bubble">
                    <div className="message-text">
                      {message.content ? renderFormattedMessage(message.content, (phrase) => void playPracticePhrase(phrase)) : <span className="typing-indicator"><span /> <span /> <span /></span>}
                    </div>
                    {message.role === "assistant" && message.content && (
                      <div className="message-action-bar">
                        <button type="button" className="speak-button" onClick={() => void playSpeech(message.content)} disabled={speechBusy} aria-label="Nghe lại câu trả lời">
                          <IllustrationIcon name="speaker" /> Nghe
                        </button>
                        {extractedPhrases.length > 0 && (
                          <button type="button" className="practice-phrase-btn" onClick={() => handlePracticePhraseFromMessage(message.content)} disabled={speechBusy}>
                            🎙️ Luyện nói câu mẫu
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {chatError && (
            <div className="chat-error-row" role="alert">
              <p className="error-message chat-error">{chatError}</p>
              {retryTurnRef.current && <button type="button" className="button button-outline" onClick={() => { const retry = retryTurnRef.current; retryTurnRef.current = null; setChatError(""); retry?.(); }}>↻ Thử lại</button>}
            </div>
          )}
          <div className="suggested-chips cr-chips">
            {(PROFILE_SUGGESTIONS[profile.id] || PROFILE_SUGGESTIONS.everyday).slice(0, 3).map((replyText) => (
              <button type="button" key={replyText} className="suggested-chip" onClick={() => { void sendMessage(undefined, replyText); }} disabled={chatBusy}>{replyText}</button>
            ))}
          </div>
          <form className="composer" onSubmit={sendMessage}>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Nhập câu trả lời hoặc nhấn micro để nói…" aria-label="Câu trả lời của bạn" />
            <button type="button" className={voiceChatRecording ? "mic-button recording" : "mic-button"} aria-label={voiceChatRecording ? "Dừng ghi âm" : "Trả lời bằng giọng nói"} onClick={voiceChatRecording ? stopVoiceChatRecording : startVoiceInput} disabled={chatBusy}><IllustrationIcon name={voiceChatRecording ? "stop" : "microphone"} /></button>
            <button type="submit" className="send-button" disabled={chatBusy || !draft.trim()}>Gửi <span>↑</span></button>
          </form>
          {voiceError && !recording && <p className="error-message voice-inline">{voiceError}</p>}
        </section>

        <details className="cr-pronounce panel">
          <summary>🎙️ Luyện phát âm có chấm điểm</summary>
          <div className="phrase-box" id="pronunciation-section">
            <span className="eyebrow">CÂU ĐANG LUYỆN NÓI</span>
            <strong>“{phraseInUse}”</strong>
            <span className="phrase-translation">{customMeanings[phraseInUse] || phraseMeanings[phraseInUse] || "Tự do luyện phát âm cùng AI"}</span>
            <button className="speak-button" onClick={() => void playPracticePhrase(phraseInUse)} disabled={speechBusy}>
              <IllustrationIcon name="speaker" /> Nghe mẫu phát âm
            </button>
            <div className="pronunciation-custom-input">
              <input
                type="text"
                placeholder="Nhập câu tiếng Nhật khác để luyện…"
                value={customPhraseInput}
                onChange={(e) => setCustomPhraseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customPhraseInput.trim()) {
                    e.preventDefault();
                    setTargetPronunciationPhrase(customPhraseInput.trim());
                  }
                }}
              />
              <button type="button" className="button button-outline" onClick={() => { if (customPhraseInput.trim()) setTargetPronunciationPhrase(customPhraseInput.trim()); }}>Đặt câu này</button>
            </div>
          </div>
          <div className="word-list">
            {profile.words.map((word) => <button key={word} className={phraseInUse === word ? "phrase-chip-active" : ""} onClick={() => setTargetPronunciationPhrase(word)}><span className="phrase-word"><strong>{word}</strong><small>{phraseMeanings[word]}</small></span><span>↗</span></button>)}
          </div>
          <button className="button button-primary full-button" onClick={startPronunciationRecording} disabled={recording || pronunciationBusy}>
            {pronunciationBusy ? "Đang nghe và đánh giá…" : <><IllustrationIcon name="microphone" /> Bắt đầu ghi âm</>}
          </button>
          {recording && <button className="button button-recording full-button" onClick={stopPronunciationRecording}><IllustrationIcon name="stop" /> Dừng ghi âm</button>}
          {pronunciation && (
            <div className="pronunciation-result">
              <span className="score-badge">{pronunciation.score}<small>/100</small></span>
              <div><strong>{pronunciation.feedback}</strong><p>AI nghe được: “{pronunciation.heard}”</p>
                {pronunciation.soundsToPractice.length > 0 && <p>Hãy luyện thêm: {pronunciation.soundsToPractice.join(" · ")}</p>}
              </div>
            </div>
          )}
          {voiceError && recording && <p className="error-message">{voiceError}</p>}
        </details>
      </div>
    );
  }

  async function installApp() {
    if (!installPrompt) return;
    setInstallError("");
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setAppInstalled(true);
        setInstallPrompt(null);
      }
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : "Không thể mở hộp thoại cài đặt ứng dụng.");
    }
  }

  function renderInstallAppPanel() {
    if (appInstalled) return null;
    return (
      <section className="install-app-panel" aria-label="Cài Teacher AI lên màn hình chính">
        <div>
          <strong>Cài Teacher AI lên màn hình chính</strong>
          <p>Thêm biểu tượng ứng dụng để mở nhanh như app trên điện thoại.</p>
          {!installPrompt && <small>Android/Chrome: mở menu trình duyệt và chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”. iPhone/iPad: mở bằng Safari, nhấn Chia sẻ rồi chọn “Thêm vào MH chính”.</small>}
          {installError && <p className="error-message" role="alert">{installError}</p>}
        </div>
        {installPrompt && <button type="button" className="button button-primary" onClick={() => { void installApp(); }}>Cài ứng dụng</button>}
      </section>
    );
  }

  function renderPlacement() {
    return (
      <section className="panel placement-panel">
        <span className="eyebrow">BƯỚC ĐẦU TIÊN</span>
        <h2>Cùng tìm trình độ tiếng Nhật của bạn</h2>
        <p>Trả lời {placementQuestions.length} câu hỏi để ước lượng mức bắt đầu từ {levelLabel("A1")} đến {levelLabel("B2")}. Đây là bài sàng lọc ngắn, không thay thế bài thi {LANG.levelSystem} chính thức; bạn có thể làm lại bất cứ lúc nào.</p>
        {placementQuestions.map((item, questionIndex) => (
          <fieldset className="question-card" key={item.question}>
            <legend>{questionIndex + 1}. {item.question}</legend>
            <div className="answer-options">
              {item.options.map((option, optionIndex) => (
                <button type="button" key={option} className={placementAnswers[questionIndex] === optionIndex ? "answer-option selected" : "answer-option"}
                  onClick={() => setPlacementAnswers((answers) => {
                    const updated = [...answers];
                    updated[questionIndex] = optionIndex;
                    return updated;
                  })}>
                  <span>{String.fromCharCode(65 + optionIndex)}</span>{option}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        <button className="button button-primary" onClick={completePlacement} disabled={!placementComplete}>Xem trình độ của tôi <span>→</span></button>
        {placementResult && <div className="placement-result">🎉 {placementResult}</div>}
      </section>
    );
  }

  function renderGrammar() {
    const topic = grammarTopics.find((item) => item.id === grammarTopicId);
    if (!topic) {
      return (
        <>
          <div className="page-intro">
            <span className="eyebrow">LUYỆN NGỮ PHÁP THEO CẤU TRÚC</span>
            <h2>Chọn cấu trúc bạn muốn học.</h2>
            <p>Mở một bài để xem cách dùng, ví dụ và bài tập trắc nghiệm. Ví dụ có kèm cách đọc và nghĩa tiếng Việt.</p>
          </div>
          <div className="grammar-topic-catalog">
            {(["A1", "A2", "B1", "B2"] as const).map((level) => (
              <section className="panel grammar-level-panel" key={level}>
                <div className="grammar-level-heading"><span className="level-chip">{levelLabel(level)}</span><span className="eyebrow">{LANG.levelSystem}</span></div>
                {grammarTopics.filter((item) => item.level === level).map((item) => (
                  <button key={item.id} className="grammar-topic-card" onClick={() => selectGrammarTopic(item.id)}>
                    <span className="grammar-topic-art"><IllustrationIcon name="grammar" /></span>
                    <span className="grammar-topic-copy">
                      <strong>{item.title}</strong>
                      <span>{item.structure}</span>
                      {grammarScores[item.id] !== undefined && <small>Điểm cao nhất: {grammarScores[item.id]}%</small>}
                    </span>
                    <span className="grammar-topic-arrow" aria-hidden="true">→</span>
                  </button>
                ))}
              </section>
            ))}
          </div>
        </>
      );
    }

    const answeredAll = topic.questions.every((_, index) => Number.isInteger(grammarAnswers[index]));
    const score = topic.questions.reduce(
      (total, question, index) => total + (grammarAnswers[index] === question.answer ? 1 : 0),
      0,
    );
    return (
      <>
        <div className="grammar-detail-page">
          <button className="grammar-list-back" onClick={returnToGrammarTopics}>← Tất cả cấu trúc ngữ pháp</button>
          <div className="page-intro grammar-detail-intro">
            <span className="eyebrow">BÀI HỌC NGỮ PHÁP · {LANG.levelSystem} {levelLabel(topic.level)}</span>
            <h2>{topic.title}</h2>
            <p>Học cấu trúc, xem ví dụ, sau đó hoàn thành bài tập để kiểm tra mức độ nắm vững.</p>
          </div>
          <section className="panel grammar-lesson-guide">
            <span className="eyebrow">STRUCTURE GUIDE</span>
            <h3>{topic.title}</h3>
            <p className="grammar-structure"><strong>Structure:</strong> {topic.structure}</p>
            <p className="grammar-overview">{topic.overview}</p>
            <div className="grammar-example-list">
              <strong>Examples</strong>
              {topic.examples.map((example) => <p key={example}><span>“{example}”</span><button className="speak-button" aria-label={`Nghe câu: ${example}`} onClick={() => void playSpeech(example)} disabled={speechBusy}><IllustrationIcon name="speaker" /> Nghe</button></p>)}
            </div>
            <div style={{ marginTop: "14px" }}>
              <button
                type="button"
                className="button button-outline"
                onClick={() => askTutorAboutGrammar(topic)}
              >
                💬 Hỏi thầy/cô AI về cấu trúc này ↗
              </button>
            </div>
          </section>
          <section className="panel grammar-quiz grammar-detail-quiz">
            <div className="grammar-quiz-heading"><span className="level-chip">{levelLabel(topic.level)}</span><span className="eyebrow">GRAMMAR PRACTICE</span></div>
            <h3>Practice the structure</h3>
            <p className="grammar-structure">Choose the best answer for each question.</p>
            {topic.questions.map((question, questionIndex) => (
              <fieldset className="question-card" key={`${topic.id}-${questionIndex}`}>
                <legend>{questionIndex + 1}. {question.prompt}</legend>
                <div className="answer-options">
                  {question.options.map((option, optionIndex) => {
                    const selected = grammarAnswers[questionIndex] === optionIndex;
                    const correct = grammarSubmitted && question.answer === optionIndex;
                    const incorrect = grammarSubmitted && selected && !correct;
                    return (
                      <button type="button" key={option} className={`answer-option${selected ? " selected" : ""}${correct ? " correct" : ""}${incorrect ? " incorrect" : ""}`}
                        onClick={() => {
                          if (grammarSubmitted) return;
                          setGrammarAnswers((answers) => {
                            const updated = [...answers];
                            updated[questionIndex] = optionIndex;
                            return updated;
                          });
                        }}>
                        <span>{String.fromCharCode(65 + optionIndex)}</span>{option}
                      </button>
                    );
                  })}
                </div>
                {grammarSubmitted && <p className="grammar-explanation">{question.explanation}</p>}
                <div style={{ marginTop: "6px" }}>
                  <button
                    type="button"
                    className="ask-tutor-inline-btn"
                    onClick={() => askTutorAboutGrammar(topic, question, grammarAnswers[questionIndex])}
                  >
                    💡 Hỏi thầy/cô AI về câu này ↗
                  </button>
                </div>
              </fieldset>
            ))}
            {grammarSubmitted
              ? <button className="button button-outline" onClick={() => { setGrammarAnswers([]); setGrammarSubmitted(false); }}>Làm lại bài tập <span>↻</span></button>
              : <button className="button button-primary" onClick={completeGrammarQuiz} disabled={!answeredAll}>Chấm bài <span>→</span></button>}
            {grammarSubmitted && <div className="placement-result" role="status">Score: {score}/{topic.questions.length}. {score === topic.questions.length ? "Excellent work!" : "Review the explanations and try again to improve your score."}</div>}
            {grammarError && <p className="error-message" role="alert">{grammarError}</p>}
          </section>
        </div>
      </>
    );
  }

  function renderHome() {
    const persona = TUTOR_PERSONAS[tutorPersona];
    const returning = progress.sessions > 0;
    return (
      <section className="wz-welcome">
        <div className="wz-welcome-art">
          <TutorAvatar kind={persona.kind} status="idle" emotion="happy" size={190} />
        </div>
        <span className="eyebrow">TEACHER AI · GIA SƯ TIẾNG NHẬT CỦA BẠN</span>
        <h1>Xin chào! Cùng nói tiếng Nhật tự tin hơn nhé.</h1>
        <p className="wz-lead">
          Mỗi ngày một chút. Học bài bản theo giáo trình, hoặc trò chuyện với {TUTOR_PERSONAS[tutorPersona].name} — người sẽ chủ động dẫn dắt bạn qua từng tình huống phù hợp với trình độ của bạn.
        </p>
        <ol className="wz-steps" aria-label="3 bước học">
          <li><b>1</b> Chọn bài học</li>
          <li><b>2</b> Chọn cách học</li>
          <li><b>3</b> Bắt đầu</li>
        </ol>
        <button type="button" className="button button-primary wz-cta" onClick={() => { setChooseId(""); navigateToSection("choose"); }}>
          {returning ? "Tiếp tục học" : "Bắt đầu học"} <span>→</span>
        </button>
        {returning && <small className="wz-last">Lần trước: {profile.title} · Trình độ {levelLabel(progress.level)}</small>}
        {!apiKey && progressLoaded && (
          <p className="wz-hint">Để học với AI, bạn cần thêm API key (1 lần) trong <button type="button" className="text-button" onClick={() => navigateToSection("settings")}>Cài đặt</button>.</p>
        )}
        <nav className="wz-links" aria-label="Lối tắt">
          <button type="button" onClick={() => { setPlacementAnswers([]); setPlacementResult(""); navigateToSection("placement"); }}>Kiểm tra trình độ</button>
          <button type="button" onClick={() => navigateToSection("progress")}>Tiến độ của tôi</button>
          <button type="button" onClick={() => navigateToSection("settings")}>Cài đặt</button>
        </nav>
        {renderInstallAppPanel()}
      </section>
    );
  }

  function renderChoose() {
    const chosen = chooseId || progress.profile;
    const isGrammar = chosen === "grammar";
    const chosenProfile = profiles.find((item) => item.id === chosen);
    return (
      <section className="wz-card" aria-labelledby="choose-title">
        <span className="eyebrow">BƯỚC 1/2</span>
        <h2 id="choose-title">Bạn muốn học gì hôm nay?</h2>
        <label className="settings-label" htmlFor="choose-category">Danh mục bài học</label>
        <select id="choose-category" className="wz-select" value={chosen} onChange={(event) => setChooseId(event.target.value)}>
          {profiles.map((item) => (
            <option key={item.id} value={item.id}>{item.id === progress.profile ? "▶ " : ""}{item.title}</option>
          ))}
          <option value="grammar">Tiếng Nhật ngữ pháp</option>
        </select>
        <p className="wz-note">Mặc định là bài bạn đang học lần trước. Mở danh sách để chọn bài khác.</p>
        <div className={`wz-preview ${chosenProfile?.color ?? "green"}`}>
          <span className="wz-preview-icon"><IllustrationIcon name={chosenProfile?.icon ?? "grammar"} /></span>
          <div>
            <strong>{chosenProfile?.title ?? "Tiếng Nhật ngữ pháp"}</strong>
            <span>{chosenProfile?.subtitle ?? "Học cấu trúc câu và làm bài tập theo trình độ"}</span>
            {chosenProfile && <small>Tình huống: {chosenProfile.scene}</small>}
          </div>
        </div>
        <button
          type="button"
          className="button button-primary wz-cta"
          onClick={() => {
            if (isGrammar) navigateToSection("grammar");
            else selectProfile(chosen);
          }}
        >
          Tiếp tục <span>→</span>
        </button>
      </section>
    );
  }

  function renderMode() {
    const course = coursePacks.find((item) => item.id === progress.profile);
    return (
      <section className="wz-card wz-card-wide" aria-labelledby="mode-title">
        <span className="eyebrow">BƯỚC 2/2 · {profile.title.toUpperCase()}</span>
        <h2 id="mode-title">Bạn muốn học theo cách nào?</h2>
        <div className="wz-modes">
          <button type="button" className="wz-mode" onClick={() => navigateToSection("lessons")}>
            <span className="wz-mode-icon"><IllustrationIcon name="courses" /></span>
            <strong>Bài học (Offline)</strong>
            <span>Học lần lượt từng bài theo lộ trình: hội thoại, từ vựng, ngữ pháp, phát âm và bài kiểm tra 10 câu.</span>
            <em className="ok">{course
              ? `${(courseProgress[course.id] ?? []).length}/${course.lessons.length} bài đã đạt`
              : "Tự tải về khi bắt đầu"}</em>
          </button>
          <button type="button" className="wz-mode wz-mode-ai" onClick={() => { setConnection({ status: "idle", message: "" }); navigateToSection("practice"); }}>
            <span className="wz-mode-icon"><IllustrationIcon name="practice" /></span>
            <strong>Học với AI (Online)</strong>
            <span>Thầy/cô AI dạy đúng bài bạn đang học, ra tình huống, sửa lỗi ngữ pháp, từ vựng và phát âm.</span>
            <em className={apiKey ? "ok" : "warn"}>{apiKey ? "Sẵn sàng" : "Cần thêm API key"}</em>
          </button>
        </div>
      </section>
    );
  }

  function renderLessons() {
    const course = coursePacks.find((item) => item.id === progress.profile);
    const selectedCourse = coursePacks.find((item) => item.id === selectedCourseId);
    if (course && selectedCourse?.id === course.id) return renderCourses();
    return (
      <section className="wz-card" aria-labelledby="lessons-title">
        <span className="eyebrow">BÀI HỌC OFFLINE · {LANG.levelSystem} {levelLabel(progress.level)}</span>
        <h2 id="lessons-title">{profile.title}</h2>
        {course ? (
          <>
            <p>{course.overview}</p>
            <button type="button" className="button button-primary wz-cta" onClick={() => openDownloadedCourse(course.id)}>Vào bài học <span>→</span></button>
          </>
        ) : courseSyncing ? (
          <div className="cr-connect-actions"><div className="cr-spinner" aria-hidden="true" /><p role="status">Đang tải giáo trình về thiết bị (chỉ lần đầu)…</p></div>
        ) : (
          <>
            <p className="error-message" role="alert">{courseError || "Chưa tải được giáo trình."} Lần đầu cần kết nối mạng; sau đó có thể học offline.</p>
            <div className="cr-connect-actions">
              <button type="button" className="button button-primary" onClick={() => { void syncCourse(progress.profile); }}>↻ Tải lại</button>
              <button type="button" className="button button-outline" onClick={goBack}>← Chọn cách học khác</button>
            </div>
          </>
        )}
      </section>
    );
  }

  function renderCourses(catalogOnly = false) {
    const course = catalogOnly ? undefined : coursePacks.find((item) => item.id === selectedCourseId);
    if (selectedCourseId && !course && !catalogOnly) {
      return (
        <section className="panel course-empty-state">
          <h2>Không tìm thấy giáo trình offline</h2>
          <p>{courseError || "Giáo trình này chưa được tải về thiết bị."}</p>
          <button className="button button-outline" onClick={() => { setSelectedCourseId(""); setCourseError(""); }}>Quay lại danh sách giáo trình</button>
        </section>
      );
    }
    if (course) {
      const lesson = course.lessons.find((item) => item.id === selectedLessonId) ?? course.lessons[0];
      const completedLessons = courseProgress[course.id] ?? [];
      const lessonScores = courseLessonScores[course.id] ?? {};
      const unlocked = unlockedLessonIds(course, completedLessons, progress.level);
      const lessonIndex = course.lessons.findIndex((item) => item.id === lesson.id);
      const nextLesson = course.lessons[lessonIndex + 1];
      const answeredAll = lesson.questions.every((_, index) => Number.isInteger(courseAnswers[index]));
      const correctCount = lesson.questions.reduce(
        (total, question, index) => total + (courseAnswers[index] === question.answer ? 1 : 0),
        0,
      );
      const passMark = Math.ceil(lesson.questions.length * LESSON_PASS_RATIO);
      const passed = correctCount >= passMark;
      const linkedAudio = course.audio.filter((audio) => lesson.audioIds.includes(audio.id));
      const doneCount = course.lessons.filter((item) => completedLessons.includes(item.id)).length;
      return (
        <>
          <div className="page-intro lesson-course-head">
            <span className="eyebrow">{course.framework} · {doneCount}/{course.lessons.length} BÀI ĐÃ ĐẠT</span>
            <h2>{course.title}</h2>
            <div className="lesson-course-bar" aria-hidden="true"><i style={{ width: `${(doneCount / course.lessons.length) * 100}%` }} /></div>
          </div>
          <div className="course-curriculum-layout">
            <section className="panel course-lesson-list">
              {COURSE_LEVELS.map((level) => {
                const levelLessons = course.lessons.filter((item) => item.level === level);
                if (!levelLessons.length) return null;
                const levelDone = levelLessons.filter((item) => completedLessons.includes(item.id)).length;
                return (
                  <div className="course-level" key={level}>
                    <strong className="course-level-title">
                      <span className="level-chip">{levelLabel(level)}</span>
                      <span>{levelDone}/{levelLessons.length} bài</span>
                      {levelDone === levelLessons.length && <span className="course-level-done">✓ Hoàn thành</span>}
                    </strong>
                    {levelLessons.map((item) => {
                      const complete = completedLessons.includes(item.id);
                      const open = unlocked.has(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`course-lesson${item.id === lesson.id ? " selected" : ""}${complete ? " passed" : ""}`}
                          disabled={!open}
                          onClick={() => openCourseLesson(item.id)}
                          title={open ? item.objective : "Hoàn thành bài trước để mở bài này"}
                        >
                          <span className="course-lesson-mark" aria-hidden="true">{complete ? "✓" : open ? "○" : "🔒"}</span>
                          <span>
                            {item.title}
                            <small>
                              {item.category ?? item.unit}
                              {lessonScores[item.id] !== undefined && ` · cao nhất ${Math.round(lessonScores[item.id] / 10)}/10`}
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              <p className="course-progress-note">Đạt từ 8/10 câu để tick hoàn thành và mở bài kế tiếp. Hoàn thành mọi bài của một level sẽ nâng trình độ của bạn.</p>
              <div className="course-references">
                <strong>Khung tham chiếu</strong>
                {course.references.map((reference) => (
                  <a key={reference.url} href={reference.url} target="_blank" rel="noreferrer">{reference.title} ↗</a>
                ))}
                <small>{course.contentLicense}</small>
              </div>
            </section>
            <section className="panel course-lesson-panel">
              <div className="lesson-head">
                <span className="level-chip">{levelLabel(lesson.level)}</span>
                {lesson.category && <span className="lesson-category">{lesson.category}</span>}
                {completedLessons.includes(lesson.id) && <span className="course-level-done">✓ Đã đạt</span>}
              </div>
              <h3>{lesson.title}</h3>
              <p className="course-objective"><strong>Mục tiêu:</strong> {lesson.objective}</p>
              <div className="lesson-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={lessonTab === "learn"} className={lessonTab === "learn" ? "active" : ""} onClick={() => setLessonTab("learn")}>📖 Học bài</button>
                <button type="button" role="tab" aria-selected={lessonTab === "quiz"} className={lessonTab === "quiz" ? "active" : ""} onClick={() => setLessonTab("quiz")}>📝 Kiểm tra ({lesson.questions.length} câu)</button>
              </div>

              {lessonTab === "learn" ? (
                <div className="lesson-learn">
                  <section className="lesson-block">
                    <h4>1 · Hội thoại</h4>
                    {lesson.dialogue?.length ? (
                      <>
                        <div className="lesson-toggles">
                          {lesson.dialogue.some((line) => line.phonetic) && (
                            <label><input type="checkbox" checked={lessonView.phonetic} onChange={(event) => updateLessonView({ phonetic: event.target.checked })} /> Hiện {LANG.phoneticName}</label>
                          )}
                          {lesson.dialogue.some((line) => line.translation) && (
                            <label><input type="checkbox" checked={lessonView.translation} onChange={(event) => updateLessonView({ translation: event.target.checked })} /> Hiện bản dịch tiếng Việt</label>
                          )}
                        </div>
                        <div className="lesson-dialogue">
                          {lesson.dialogue.map((line, lineIndex) => (
                            <div className="dialogue-line" key={lineIndex}>
                              <div className="dialogue-main">
                                {line.speaker && <b className="dialogue-speaker">{line.speaker}</b>}
                                <span className="dialogue-text">{line.text}</span>
                                <button type="button" className="vocab-mini-btn" onClick={() => void playPracticePhrase(line.text)} disabled={speechBusy} aria-label={`Nghe: ${line.text}`}>🔊</button>
                              </div>
                              {lessonView.phonetic && line.phonetic && <small className="dialogue-phonetic">{line.phonetic}</small>}
                              {lessonView.translation && line.translation && <small className="dialogue-translation">{line.translation}</small>}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="course-reading">{lesson.reading}</div>
                    )}
                    <button type="button" className="button button-outline" onClick={() => void playPracticePhrase(lesson.dialogue?.length ? lesson.dialogue.map((line) => line.text).join("\n") : lesson.reading)} disabled={speechBusy}>
                      <IllustrationIcon name="speaker" /> Nghe cả bài
                    </button>
                  </section>

                  <section className="lesson-block">
                    <h4>2 · Từ vựng</h4>
                    <div className="lesson-vocab">
                      {lesson.vocabulary.map((item) => (
                        <div className="lesson-vocab-item" key={item.term}>
                          <div>
                            <strong>{item.term}</strong>
                            {item.reading && <span className="vocab-reading"> [{item.reading}]</span>} <span>— {item.definition}</span>
                            {item.example && (() => {
                              const example = splitExample(item.example);
                              return <em>“{example.target}”{example.meaning && <small> — {example.meaning}</small>}</em>;
                            })()}
                          </div>
                          <span className="vocab-action-btns">
                            <button type="button" className="vocab-mini-btn" onClick={() => void playPracticePhrase(item.term)} disabled={speechBusy} aria-label={`Nghe từ: ${item.term}`}>🔊</button>
                            {item.example && (
                              <button type="button" className="vocab-mini-btn" onClick={() => void playPracticePhrase(splitExample(item.example ?? "").target)} disabled={speechBusy} aria-label={`Nghe câu ví dụ: ${item.term}`}>🔊 câu</button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {lesson.grammar && (
                    <section className="lesson-block">
                      <h4>3 · Ngữ pháp: {lesson.grammar.title}</h4>
                      <p>{lesson.grammar.explanation}</p>
                      <ul className="lesson-examples">
                        {lesson.grammar.examples.map((example) => {
                          const parts = splitExample(example);
                          return (
                            <li key={example}>
                              <span>{parts.target}{parts.meaning && <small> — {parts.meaning}</small>}</span>
                              <button type="button" className="vocab-mini-btn" onClick={() => void playPracticePhrase(parts.target)} disabled={speechBusy} aria-label={`Nghe: ${parts.target}`}>🔊</button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  )}

                  {lesson.pronunciation && (
                    <section className="lesson-block">
                      <h4>4 · Phát âm: {lesson.pronunciation.focus}</h4>
                      <p>{lesson.pronunciation.tip}</p>
                      <div className="lesson-pron-words">
                        {lesson.pronunciation.words.map((word) => (
                          <button type="button" key={word} onClick={() => void playPracticePhrase(word)} disabled={speechBusy}>🔊 {word}</button>
                        ))}
                      </div>
                    </section>
                  )}

                  {linkedAudio.length > 0 && (
                    <section className="lesson-block course-audio">
                      <h4>Nghe thêm</h4>
                      {linkedAudio.map((audio) => (
                        <div className="course-audio-item" key={audio.id}>
                          <button className="button button-outline" onClick={() => { void playOfflineAudio(course.id, audio.id); }}>▶ Nghe audio</button>
                          <span>{audio.title}</span>
                          <small>{audio.attribution} · {audio.license}</small>
                        </div>
                      ))}
                      {offlineAudioUrl && <audio controls preload="metadata" src={offlineAudioUrl}>Trình duyệt không hỗ trợ phát audio.</audio>}
                    </section>
                  )}

                  <section className="lesson-block lesson-speaking">
                    <h4>5 · Luyện nói</h4>
                    {lesson.speakingTasks?.length ? (
                      <ul>{lesson.speakingTasks.map((task) => <li key={task}>{task}</li>)}</ul>
                    ) : <p>Luyện các câu trong bài với thầy/cô AI.</p>}
                    <div className="cr-connect-actions">
                      <button type="button" className="button button-outline" onClick={() => askTutorAboutLesson(lesson)}>🎓 Luyện bài này với thầy/cô AI</button>
                      <button type="button" className="button button-primary" onClick={() => setLessonTab("quiz")}>Làm bài kiểm tra →</button>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="course-quiz">
                  <p className="lesson-quiz-rule">Trả lời đủ {lesson.questions.length} câu. Đạt từ <strong>{passMark}/{lesson.questions.length}</strong> để hoàn thành bài.</p>
                  {lesson.questions.map((question, questionIndex) => (
                    <fieldset className="question-card" key={`${lesson.id}-${questionIndex}`}>
                      <legend>{questionIndex + 1}. {question.prompt}</legend>
                      <div className="answer-options">
                        {question.options.map((option, optionIndex) => {
                          const selected = courseAnswers[questionIndex] === optionIndex;
                          const correct = courseQuizSubmitted && question.answer === optionIndex;
                          const incorrect = courseQuizSubmitted && selected && !correct;
                          return (
                            <button type="button" key={option} className={`answer-option${selected ? " selected" : ""}${correct ? " correct" : ""}${incorrect ? " incorrect" : ""}`}
                              onClick={() => {
                                if (courseQuizSubmitted) return;
                                setCourseAnswers((answers) => {
                                  const updated = [...answers];
                                  updated[questionIndex] = optionIndex;
                                  return updated;
                                });
                              }}>
                              <span>{String.fromCharCode(65 + optionIndex)}</span>{option}
                            </button>
                          );
                        })}
                      </div>
                      {courseQuizSubmitted && courseAnswers[questionIndex] !== question.answer && (
                        <div className="lesson-wrong">
                          <p className="grammar-explanation">{question.explanation}</p>
                          <button type="button" className="ask-tutor-inline-btn" onClick={() => askTutorAboutQuestion(lesson.title, question.prompt, question.options, courseAnswers[questionIndex], question.answer, question.explanation)}>
                            💡 Nhờ thầy/cô AI giảng lại câu này
                          </button>
                        </div>
                      )}
                    </fieldset>
                  ))}
                  {courseQuizSubmitted ? (
                    <div className={`lesson-result ${passed ? "pass" : "fail"}`} role="status">
                      <strong>{correctCount}/{lesson.questions.length} câu đúng</strong>
                      <p>{passed
                        ? "✅ Đạt! Bài học đã được tick hoàn thành."
                        : `Cần ít nhất ${passMark}/${lesson.questions.length}. Xem lại giải thích các câu sai rồi làm lại nhé.`}</p>
                      <div className="cr-connect-actions">
                        {passed && nextLesson && <button type="button" className="button button-primary" onClick={() => openCourseLesson(nextLesson.id)}>Bài tiếp theo →</button>}
                        {!passed && <button type="button" className="button button-primary" onClick={() => { setCourseAnswers([]); setCourseQuizSubmitted(false); }}>Làm lại ↻</button>}
                        {!passed && <button type="button" className="button button-outline" onClick={() => setLessonTab("learn")}>Ôn lại bài</button>}
                      </div>
                    </div>
                  ) : (
                    <button className="button button-primary" disabled={!answeredAll} onClick={() => completeCourseQuiz(course, lesson.id, lesson.questions)}>Chấm bài <span>→</span></button>
                  )}
                </div>
              )}
            </section>
          </div>
          {courseError && <p className="error-message" role="alert">{courseError}</p>}
        </>
      );
    }

    return (
      <>
        <div className="page-intro">
          <span className="eyebrow">GIÁO TRÌNH TẢI THEO LĨNH VỰC</span>
          <h2>Chọn giáo trình muốn tải về thiết bị.</h2>
          <p>Mỗi giáo trình gồm bài học, câu hỏi và audio nghe. Tải xuống cần kết nối Internet; nội dung đã tải có thể học offline.</p>
        </div>
        <div className="offline-status" role={offlineError ? "alert" : "status"}>
          <span>{offlineReady ? "✓" : offlineError ? "!" : "◌"}</span>
          <p>{offlineReady ? "Ứng dụng đã lưu phần khung để có thể mở lại khi offline." : offlineError || "Đang chuẩn bị ứng dụng cho chế độ offline…"}</p>
        </div>
        {courseError && <p className="error-message" role="alert">{courseError}</p>}
        <div className="course-catalog">
          {profiles.map((item) => {
            const downloaded = coursePacks.find((pack) => pack.id === item.id);
            const busy = courseBusyId === item.id;
            return (
              <section className="panel course-catalog-card" key={item.id}>
                <span className={`profile-icon ${item.color}`}><IllustrationIcon name={item.icon} /></span>
                <div className="course-catalog-copy">
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                  {downloaded && <small>{downloaded.lessons.length} bài học · {downloaded.audio.length} audio · phiên bản {downloaded.version}</small>}
                </div>
                {downloaded
                  ? <div className="course-catalog-actions">
                      <button className="button button-primary" onClick={() => openDownloadedCourse(item.id)}>Học offline <span>→</span></button>
                      <button className="remove-key-button" onClick={() => { void removeCourse(item.id); }}>Xóa gói tải về</button>
                    </div>
                  : <button className="button button-primary" disabled={Boolean(courseBusyId)} onClick={() => { void downloadCourse(item.id); }}>
                      {busy ? `Đang tải audio ${courseDownloadProgress.completed}/${courseDownloadProgress.total || "…"}` : "Tải giáo trình"}
                    </button>}
              </section>
            );
          })}
          <button type="button" className="panel course-catalog-card personal-library-entry" onClick={() => navigateToSection("library")}>
            <span className="profile-icon"><IllustrationIcon name="library" /></span>
            <span className="course-catalog-copy">
              <strong>Tài liệu cá nhân</strong>
              <span>Mở hoặc thêm PDF, audio và ghi chú lưu trên thiết bị này.</span>
            </span>
            <span className="button button-outline">Mở tài liệu <span>→</span></span>
          </button>
        </div>
        <p className="course-storage-note">Giáo trình và audio được lưu trong IndexedDB trên thiết bị này. Việc tải/xóa giáo trình không ảnh hưởng tiến độ học hoặc API key.</p>
      </>
    );
  }

  function renderPersonalLibrary() {
    return (
      <>
        <div className="page-intro">
          <span className="eyebrow">THƯ VIỆN RIÊNG TRÊN THIẾT BỊ</span>
          <h2>Tài liệu cá nhân.</h2>
          <p>Thêm PDF, audio hoặc tệp văn bản mà bạn có quyền lưu trên thiết bị. Tệp chỉ lưu trong trình duyệt này, không đưa lên GitHub, không gửi tới máy chủ và không đồng bộ giữa các thiết bị.</p>
        </div>
        <section className="panel personal-library-panel">
          <input
            ref={materialInputRef}
            type="file"
            accept=".pdf,.mp3,.m4a,.wav,.ogg,.opus,.aac,.flac,.txt,.md,application/pdf,text/plain,audio/*"
            className="visually-hidden-input"
            aria-label="Chọn tài liệu cá nhân"
            onChange={(event) => { void importPersonalMaterial(event); }}
          />
          <button className="button button-primary" onClick={() => materialInputRef.current?.click()} disabled={materialBusy}>
            {materialBusy ? "Đang lưu vào thiết bị…" : "＋ Thêm tài liệu"}
          </button>
          <div className="personal-library-warning">
            <strong>Chỉ nhập tài liệu bạn được phép sử dụng.</strong>
            <span>Với sách Oxford, chỉ chọn tệp không bị DRM và việc lưu bản cá nhân đó được giấy phép cho phép. Không thể nhập hoặc phá bảo vệ sách trong Oxford Learner’s Bookshelf.</span>
          </div>
          {materialError && <p className="error-message" role="alert">{materialError}</p>}
          {personalMaterials.length === 0
            ? <div className="personal-library-empty"><span className="library-empty-icon"><IllustrationIcon name="books" /></span><strong>Thư viện chưa có tài liệu</strong><p>Thêm một PDF, bài nghe hoặc ghi chú để học trên thiết bị này.</p></div>
            : <div className="personal-material-list">
                {personalMaterials.map((material) => (
                  <article className={`personal-material-card${selectedMaterial?.id === material.id ? " selected" : ""}`} key={material.id}>
                    <span className="personal-material-icon"><IllustrationIcon name={material.type === "pdf" ? "pdf" : material.type === "audio" ? "audio" : "text"} /></span>
                    <div className="personal-material-info">
                      <strong title={material.name}>{material.name}</strong>
                      <span>{(material.size / (1024 * 1024)).toFixed(material.size < 1024 * 1024 ? 3 : 1)} MB · {new Date(material.addedAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <button className="button button-outline" onClick={() => { void openPersonalMaterial(material); }}>Mở</button>
                    <button className="personal-material-delete" aria-label={`Xóa ${material.name}`} onClick={() => { void deletePersonalMaterial(material.id); }}>Xóa</button>
                  </article>
                ))}
              </div>}
        </section>
        {selectedMaterial && (
          <section className="panel personal-material-viewer">
            <div className="personal-viewer-heading">
              <div><span className="eyebrow">ĐANG MỞ TÀI LIỆU CÁ NHÂN</span><h3>{selectedMaterial.name}</h3></div>
              <button className="button button-outline" onClick={() => { setSelectedMaterial(null); setMaterialText(""); setMaterialUrl(""); }}>Đóng</button>
            </div>
            {selectedMaterial.type === "pdf" && materialUrl && <iframe title={selectedMaterial.name} src={materialUrl} />}
            {selectedMaterial.type === "audio" && materialUrl && <audio className="personal-audio-player" controls src={materialUrl}>Trình duyệt này không hỗ trợ phát tệp audio.</audio>}
            {selectedMaterial.type === "text" && <pre className="personal-text-viewer">{materialText}</pre>}
          </section>
        )}
        <p className="course-storage-note">Thư viện cá nhân nằm trong bộ nhớ website của trình duyệt này. Xóa dữ liệu website hoặc đổi trình duyệt/thiết bị có thể làm mất bản lưu; hãy giữ bản gốc riêng.</p>
      </>
    );
  }

  function renderProgress() {
    return (
      <>
        <div className="page-intro"><span className="eyebrow">NHÌN LẠI HÀNH TRÌNH CỦA BẠN</span><h2>Tiến bộ, không cần hoàn hảo.</h2><p>Mỗi cuộc trò chuyện giúp bạn thêm tự tin một chút.</p></div>
        <div className="progress-overview">
          <section className="panel progress-panel"><span className="eyebrow">THỐNG KÊ HỌC TẬP</span><div className="stats-grid">
            <div><span className="stat-icon lavender"><IllustrationIcon name="timer" /></span><strong>{progress.minutes}<small> phút</small></strong><span>Thời gian luyện tập</span></div>
            <div><span className="stat-icon peach"><IllustrationIcon name="sessions" /></span><strong>{progress.sessions}</strong><span>Buổi học</span></div>
            <div><span className="stat-icon mint"><IllustrationIcon name="level" /></span><strong>{levelLabel(progress.level)}</strong><span>Trình độ hiện tại</span></div>
          </div></section>
          <section className="panel streak-panel"><span className="streak-emoji"><IllustrationIcon name="streak" /></span><strong>{progress.streak} ngày liên tục</strong><p>Bạn đang tạo một thói quen tuyệt vời. Mỗi ngày luyện một chút sẽ tạo nên khác biệt.</p><button className="text-button" onClick={() => navigateToSection("practice")}>Luyện tập hôm nay →</button></section>
        </div>
        <section className="panel milestone-panel"><span className="eyebrow">BƯỚC TIẾN TIẾP THEO</span><h3>Bạn đã sẵn sàng cho cuộc trò chuyện tiếp theo</h3><p>Hoàn thành một tình huống giao tiếp để duy trì thói quen và tăng sự tự tin.</p><button className="button button-primary" onClick={() => navigateToSection("practice")}>Bắt đầu trò chuyện →</button></section>
      </>
    );
  }

  const sectionLabels: Record<Section, string> = {
    home: "Chào mừng",
    choose: "Chọn bài học",
    mode: "Chọn cách học",
    lessons: "Bài học offline",
    practice: "Học với AI",
    progress: "Tiến độ",
    placement: "Kiểm tra trình độ",
    grammar: "Ngữ pháp",
    library: "Tài liệu cá nhân",
    settings: "Cài đặt",
  };
  const helpContent: HelpContent = section === "grammar" && grammarTopicId
    ? {
      title: "Bài học ngữ pháp",
      description: "Bài học này giải thích cấu trúc đã chọn, đưa ví dụ rồi giúp bạn kiểm tra mức độ hiểu.",
      steps: ["Đọc phần giải thích và ví dụ; bấm “Nghe” để luyện nghe câu mẫu.", "Chọn đáp án cho các câu hỏi rồi nhấn “Chấm bài”.", "Đọc phần giải thích sau khi chấm và chọn “Làm lại bài tập” để luyện thêm."],
    }
      : PAGE_HELP[section];
  const canGoBack = section !== "home";
  // Only what the learner is actually waiting for; background prefetching shows nothing.
  // Locked only until the first words arrive; after that the reply streams in and can be read.
  const waitingForFirstWords = chatBusy && !messages[messages.length - 1]?.content.trim();
  const learnerIsWaiting = waitingForFirstWords || courseSyncing || apiKeyBusy || modelsBusy ||
    pronunciationBusy || connection.status === "checking";
  // The notice says what is really happening: sending a recording is an upload, not a download.
  const waitLabel = waitingForFirstWords
    ? (waitKind === "voice" ? "Đang gửi giọng nói tới AI, xin hãy đợi" : "Đang chờ AI trả lời, xin hãy đợi")
    : pronunciationBusy ? "Đang gửi bản ghi tới AI để chấm điểm, xin hãy đợi"
    : courseSyncing ? "Đang tải bài học về máy, xin hãy đợi"
    : apiKeyBusy ? "Đang kiểm tra API key, xin hãy đợi"
    : modelsBusy ? "Đang lấy danh sách mô hình AI, xin hãy đợi"
    : "Đang kết nối với AI, xin hãy đợi";

  return (
    <main className="app-shell wizard-shell">
      <WaitIndicator active={learnerIsWaiting} label={waitLabel} onCancel={waitingForFirstWords ? cancelTutorTurn : undefined} />
      {canGoBack && (
        <button className="floating-back-button" type="button" onClick={goBack} aria-label="Quay lại trang trước" title="Quay lại trang trước">
          <IllustrationIcon name="back" />
          <span>Quay lại</span>
        </button>
      )}
      {showHelp && (
        <div className="help-dialog-backdrop" onClick={() => setShowHelp(false)}>
          <section
            className="help-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="page-help-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="help-dialog-close" aria-label="Đóng hướng dẫn" onClick={() => setShowHelp(false)}>×</button>
            <span className="eyebrow">HƯỚNG DẪN SỬ DỤNG</span>
            <h2 id="page-help-title">{helpContent.title}</h2>
            <p>{helpContent.description}</p>
            <ol>{helpContent.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <button type="button" className="button button-primary" onClick={() => setShowHelp(false)}>Đã hiểu</button>
          </section>
        </div>
      )}
      <section className="main-content">
        <header className="topbar wz-topbar">
          <div className="wz-topbar-left">
            {canGoBack && (
              <button type="button" className="wz-back" onClick={goBack} aria-label="Quay lại trang trước">
                <IllustrationIcon name="back" /> <span>Quay lại</span>
              </button>
            )}
            <a className="wz-brand" href="#" onClick={(event) => { event.preventDefault(); navigateToSection("home"); }}>
              {/* Plain img: with a static export and basePath, next/image would not add the prefix. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="wz-logo" src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icon.svg`} alt="" width={34} height={34} />
              <strong>Teacher AI</strong>
            </a>
          </div>
          <div className="wz-crumb" aria-live="polite">{sectionLabels[section]}</div>
          <div className="topbar-actions">
            <span className="topbar-version" aria-label={`Phiên bản ${APP_VERSION}`}>v{APP_VERSION}</span>
            <button type="button" className="help-button" aria-label={`Hướng dẫn: ${sectionLabels[section]}`} title="Hướng dẫn trang này" onClick={() => setShowHelp(true)}>?</button>
            {section !== "settings" && (
              <button className={apiKey ? "ai-settings-button connected" : "ai-settings-button"} aria-label="Mở cài đặt" onClick={() => navigateToSection("settings")}>
                <span className="ai-key-icon"><IllustrationIcon name="settings" /></span><span className="wz-settings-label">{apiKey ? "Cài đặt" : "Thiết lập AI"}</span>
              </button>
            )}
          </div>
        </header>
        <div className={`content-wrap wz-page wz-page-${section}`}>
          {versionCheckStatus === "update-available" && (
            <aside className="update-available-banner" role="alert">
              <span>Đã có phiên bản mới v{latestVersion}. Tải lại ứng dụng để cập nhật.</span>
              <button type="button" className="button button-primary" onClick={() => window.location.reload()}>Cập nhật ngay</button>
            </aside>
          )}
          {versionCheckStatus === "error" && (
            <aside className="update-available-banner" role="alert">
              <span>{versionCheckError}</span>
              <button type="button" className="button button-outline" onClick={() => setVersionCheckAttempt((attempt) => attempt + 1)}>Kiểm tra lại</button>
            </aside>
          )}
          {speechError && <p className="error-message speech-status" role="alert">{speechError}</p>}
          {section === "home" && renderHome()}
          {section === "choose" && renderChoose()}
          {section === "mode" && renderMode()}
          {section === "lessons" && renderLessons()}
          {section === "practice" && renderPractice()}
          {section === "placement" && renderPlacement()}
          {section === "progress" && renderProgress()}
          {section === "grammar" && renderGrammar()}
          {section === "library" && renderPersonalLibrary()}
          {section === "settings" && renderSettings()}
        </div>
        <footer className="site-footer">Dành cho khoảnh khắc bạn nghĩ: “Mình làm được!” <span>✦</span> <span className="site-version">v{APP_VERSION}</span></footer>
      </section>
    </main>
  );
}
