import type { IllustrationName } from "@/components/illustration-icon";

/**
 * Everything that makes this app a *Japanese* course for Vietnamese learners.
 * The rest of the code is language-neutral and reads from here.
 */
export type LevelId = "A1" | "A2" | "B1" | "B2";

export type Accent = {
  id: string;
  group: string;
  flag: string;
  name: string;
  /** Device voices are matched on these BCP-47 locales (lower-case). */
  locales: string[];
  /** How the accent is described to a cloud TTS model ("a standard Tokyo Japanese"). */
  prompt: string;
  sample: string;
};

export type Profile = {
  id: string;
  title: string;
  subtitle: string;
  icon: IllustrationName;
  color: string;
  scene: string;
  prompt: string;
  words: string[];
};

export type PlacementQuestion = { question: string; options: string[]; answer: number; explanation: string };
export type TutorText = { name: string; title: string; tagline: string; description: string; greeting: string };

export const LANG = {
  id: "ja",
  /** English name of the language, used when talking to the AI. */
  nameEn: "Japanese",
  nameNative: "日本語",
  appTitle: "Teacher AI JP — Học tiếng Nhật cùng AI",
  appDescription: "Luyện giao tiếp tiếng Nhật cùng gia sư AI, dành cho người Việt.",
  shortName: "Teacher AI JP",
  speechLang: "ja-JP",
  /** Device voices of this language start with this. */
  langPrefix: "ja",
  levelSystem: "JLPT",
  levelLabels: { A1: "N5", A2: "N4", B1: "N3", B2: "N2" } as Record<LevelId, string>,
  /** Plain-text name of the reading aid shown next to the script. */
  phoneticName: "romaji",
  /** Characters of the language being learned (kana, kanji, full-width punctuation). */
  targetScript: /[぀-ヿ㐀-鿿ｦ-ﾟ]/,
  /** A run of target-language text: script characters plus the punctuation that joins them. */
  targetRun: /[぀-ヿ㐀-鿿ｦ-ﾟ][぀-ヿ㐀-鿿ｦ-ﾟ　-〿＀-･ー・\s、。！？!?,.]*/g,
  /** Sentence end marks that need no space after them. */
  sentenceEnd: "。！？",
  recognitionHint: "Nói bằng tiếng Nhật",
  welcome: {
    headline: "Xin chào! Cùng nói tiếng Nhật tự tin hơn nhé.",
    greetingJa: "こんにちは!",
  },
  pronunciationFocus:
    "long vs short vowels (おばさん / おばあさん), small っ (double consonants), ん, pitch accent, the ら row, voiced vs unvoiced consonants (か / が, た / だ), ふ, つ, じ / ず",
  promptNotes: `Teaching language: Japanese (日本語). Level system: JLPT (N5 = A1, N4 = A2, N3 = B1, N2 = B2).
- Write every Japanese sentence the learner should say inside double quotes "…", and IMMEDIATELY after it give its romaji in square brackets, e.g. "こんにちは" [konnichiwa]. At N5–N4 always add romaji; at N3–N2 only for new or difficult words. Never write romaji anywhere else. Text in square brackets is never read aloud.
- Use only kana and the kanji appropriate for the level (N5–N4: mostly hiragana/katakana with basic kanji such as 私, 日本, 学生).
- Politeness: teach です/ます first; bring in plain form, 敬語 (尊敬語・謙譲語) only from N3, and point out when the learner's politeness level does not fit the situation.
- Typical mistakes of Vietnamese learners to watch for: particle choice (は / が / を / に / で / へ), long vowels, small っ, mixing up ら-row sounds, て-form and ます-form conjugation, counters, topic omission.`,
  pedagogy: {
    A1: `- Explain mostly in Vietnamese (about 80%). Japanese only in very short model sentences (2–6 words), each followed by its romaji in [brackets] and the Vietnamese meaning.
- One new item per turn. Tasks: repeat after me, choose A or B, complete one word. Accept one-word answers, then model the full sentence.
- Use です/ます only. Correct only the most important mistake each turn; be very encouraging.`,
    A2: `- Mix Vietnamese explanations (about 50%) with simple Japanese (N4 grammar: て-form, ない-form, たい, ている, あげる/もらう/くれる). Add romaji in [brackets] to every Japanese sentence.
- Give a hint like (Gợi ý: "〜たいです") for each task. Tasks: full-sentence answers, simple role-plays with 2–3 exchanges.
- Correct up to two mistakes per turn, mainly particles, conjugation and word choice.`,
    B1: `- Teach mostly in Japanese (about 70%) with natural kanji; give kana readings in [brackets] only for new or difficult kanji words. Use Vietnamese only for tricky grammar or meaning.
- Role-plays with longer exchanges; ask follow-up "why / how" questions. Introduce plain vs polite form, ようだ/そうだ/らしい, passive and causative basics, 〜ば/〜たら/〜と.
- Correct every error that affects meaning, plus unnatural particles; offer a more natural phrase.`,
    B2: `- Teach in Japanese; use Vietnamese only if the learner asks. Cover 敬語 (尊敬語・謙譲語), business and written style, idioms, 〜わけではない/〜ざるを得ない-type structures.
- Discussions, negotiations and problem-solving situations; challenge the learner's opinions. Give readings in [brackets] only for rare kanji.
- Correct accuracy, register and naturalness, including better word choices.`,
  } as Record<LevelId, string>,
  accents: [
    { id: "tokyo", group: "Nhật Bản", flag: "🇯🇵", name: "Tokyo – chuẩn", locales: ["ja-jp", "ja"], prompt: "a standard Tokyo Japanese", sample: "こんにちは。今日は一緒に日本語を練習しましょう。" },
    { id: "kansai", group: "Nhật Bản", flag: "🇯🇵", name: "Kansai – Osaka", locales: ["ja-jp", "ja"], prompt: "a friendly Kansai (Osaka) Japanese", sample: "おおきに。今日は楽しく日本語を勉強しよか。" },
  ] as Accent[],
  profiles: [
    {
      id: "everyday",
      title: "Tiếng Nhật giao tiếp hằng ngày",
      subtitle: "Chào hỏi, mua sắm, ăn uống, nhờ vả",
      icon: "everyday",
      color: "yellow",
      scene: "Làm quen với người mới",
      prompt: "Xin chào! Hôm nay chúng ta luyện giao tiếp tiếng Nhật hằng ngày. Cô sẽ dạy em từng bước nhé.",
      words: ["はじめまして。", "よろしくお願いします。", "ありがとうございます。"],
    },
    {
      id: "travel",
      title: "Tiếng Nhật du lịch",
      subtitle: "Khách sạn, nhà hàng, tàu điện, hỏi đường",
      icon: "travel",
      color: "orange",
      scene: "Làm thủ tục nhận phòng khách sạn",
      prompt: "Xin chào! Hôm nay chúng ta luyện tiếng Nhật khi đi du lịch Nhật Bản. Cô sẽ dạy em từng bước nhé.",
      words: ["予約しています。", "トイレはどこですか。", "いくらですか。"],
    },
    {
      id: "business",
      title: "Tiếng Nhật công sở",
      subtitle: "Họp hành, email, điện thoại, báo cáo",
      icon: "business",
      color: "blue",
      scene: "Trao đổi với đồng nghiệp trong công ty",
      prompt: "Xin chào! Hôm nay chúng ta luyện tiếng Nhật công sở. Cô sẽ dạy em từng bước nhé.",
      words: ["お先に失礼します。", "承知しました。", "確認いたします。"],
    },
    {
      id: "technology",
      title: "Tiếng Nhật ngành công nghệ",
      subtitle: "Kỹ sư IT, họp, báo lỗi, phỏng vấn",
      icon: "technology",
      color: "purple",
      scene: "Họp buổi sáng với nhóm phát triển",
      prompt: "Xin chào! Hôm nay chúng ta luyện tiếng Nhật ngành công nghệ. Thầy/cô sẽ dạy em từng bước nhé.",
      words: ["バグを修正しました。", "テストは完了しました。", "仕様を確認させてください。"],
    },
    {
      id: "healthcare",
      title: "Tiếng Nhật chuyên ngành y khoa",
      subtitle: "Điều dưỡng, hộ lý, giao tiếp với bệnh nhân",
      icon: "healthcare",
      color: "green",
      scene: "Hỏi thăm triệu chứng bệnh nhân",
      prompt: "Xin chào! Hôm nay chúng ta luyện tiếng Nhật chuyên ngành y khoa. Thầy/cô sẽ dạy em từng bước nhé.",
      words: ["どこが痛いですか。", "お薬を飲みましたか。", "少しお待ちください。"],
    },
    {
      id: "finance",
      title: "Tiếng Nhật ngành tài chính",
      subtitle: "Ngân hàng, kế toán, báo cáo, đầu tư",
      icon: "finance",
      color: "pink",
      scene: "Trình bày báo cáo tài chính tháng",
      prompt: "Xin chào! Hôm nay chúng ta luyện tiếng Nhật ngành tài chính. Thầy/cô sẽ dạy em từng bước nhé.",
      words: ["売上が増加しました。", "前年比で五パーセントです。", "ご確認をお願いします。"],
    },
    {
      id: "refrigeration",
      title: "Tiếng Nhật kỹ thuật điện lạnh công nghiệp",
      subtitle: "Kho lạnh, máy nén, NH3/CO2, an toàn, bảo trì",
      icon: "refrigeration",
      color: "blue",
      scene: "Nhận yêu cầu sửa kho lạnh",
      prompt: "Xin chào! Hôm nay chúng ta luyện tiếng Nhật kỹ thuật điện lạnh công nghiệp. Thầy/cô sẽ dạy em từng bước nhé.",
      words: ["冷凍庫が冷えません。", "電源を切ってください。", "圧力を確認します。"],
    },
  ] as Profile[],
  phraseMeanings: {
    "はじめまして。": "Rất vui được gặp bạn (lần đầu gặp mặt).",
    "よろしくお願いします。": "Rất mong được giúp đỡ / xin chiếu cố.",
    "ありがとうございます。": "Cảm ơn bạn.",
    "予約しています。": "Tôi đã đặt chỗ trước.",
    "トイレはどこですか。": "Nhà vệ sinh ở đâu ạ?",
    "いくらですか。": "Bao nhiêu tiền ạ?",
    "お先に失礼します。": "Tôi xin phép về trước ạ.",
    "承知しました。": "Tôi đã hiểu ạ (lịch sự).",
    "確認いたします。": "Tôi xin phép xác nhận lại ạ.",
    "バグを修正しました。": "Đã sửa lỗi xong.",
    "テストは完了しました。": "Đã kiểm thử xong.",
    "仕様を確認させてください。": "Cho phép tôi xác nhận lại đặc tả.",
    "どこが痛いですか。": "Bác đau ở đâu ạ?",
    "お薬を飲みましたか。": "Bác đã uống thuốc chưa ạ?",
    "少しお待ちください。": "Xin chờ một chút ạ.",
    "売上が増加しました。": "Doanh thu đã tăng.",
    "前年比で五パーセントです。": "So với năm trước là 5%.",
    "ご確認をお願いします。": "Xin quý vị kiểm tra giúp.",
    "冷凍庫が冷えません。": "Kho đông không lạnh.",
    "電源を切ってください。": "Xin hãy ngắt nguồn điện.",
    "圧力を確認します。": "Tôi sẽ kiểm tra áp suất.",
  } as Record<string, string>,
  suggestions: {
    everyday: ["はじめまして、ベトナムから来ました。", "もう一度ゆっくり言ってください。", "Cô giải thích lại bằng tiếng Việt giúp em với.", "これはいくらですか。"],
    travel: ["チェックインをお願いします。", "駅はどこですか。", "Cô hướng dẫn em cách phát âm câu vừa rồi nhé.", "英語のメニューはありますか。"],
    business: ["お先に失礼します。", "会議は何時からですか。", "Thầy chỉ ra lỗi ngữ pháp giúp em nhé.", "資料を送っていただけますか。"],
    technology: ["昨日はログイン画面を作りました。", "バグの再現手順を説明します。", "Cô giải thích lại bằng tiếng Việt giúp em với.", "レビューをお願いできますか。"],
    healthcare: ["いつから熱がありますか。", "大きく息を吸ってください。", "Cô hướng dẫn em cách phát âm câu vừa rồi nhé.", "心配しないでください。"],
    finance: ["口座を開きたいのですが。", "金利はどのくらいですか。", "Thầy chỉ ra lỗi ngữ pháp giúp em nhé.", "売上は前年比で増加しました。"],
    refrigeration: ["庫内温度は何度ですか。", "膨張弁の詰まりかもしれません。", "Thầy giải thích thuật ngữ này bằng tiếng Việt nhé.", "アンモニアが漏れたら避難します。"],
  } as Record<string, string[]>,
  placement: [
    {
      question: "Chọn câu đúng: “Tôi là sinh viên.”",
      options: ["私は学生です。", "私を学生です。", "私に学生です。"],
      answer: 0,
      explanation: "は là trợ từ chủ đề: 私は〜です (Tôi là ~).",
    },
    {
      question: "Điền vào chỗ trống: 「朝ごはんを___。」(Tôi đã ăn sáng rồi.)",
      options: ["食べます", "食べました", "食べません"],
      answer: 1,
      explanation: "〜ました là thể quá khứ lịch sự của 〜ます.",
    },
    {
      question: "Điền vào chỗ trống: 「私は毎日バス___学校へ行きます。」",
      options: ["を", "が", "で"],
      answer: 2,
      explanation: "で chỉ phương tiện: バスで (bằng xe buýt).",
    },
    {
      question: "Chọn câu có nghĩa: “Xin hãy cho tôi xem cái này.”",
      options: ["これを見せてください。", "これを見せています。", "これが見せません。"],
      answer: 0,
      explanation: "Thể て + ください dùng để nhờ vả lịch sự.",
    },
    {
      question: "Điền vào chỗ trống: 「友だちと映画を___に行きます。」",
      options: ["見る", "見", "見て"],
      answer: 1,
      explanation: "Bỏ ます của động từ rồi thêm に: 見に行きます (đi để xem).",
    },
    {
      question: "Điền vào chỗ trống: 「日本に行った___があります。」(Tôi đã từng đến Nhật.)",
      options: ["こと", "もの", "ため"],
      answer: 0,
      explanation: "Thể た + ことがあります diễn tả kinh nghiệm đã từng làm.",
    },
    {
      question: "Điền vào chỗ trống: 「雨が降る___、試合は中止です。」",
      options: ["場合は", "ばかり", "ところ"],
      answer: 0,
      explanation: "場合は nghĩa là “trong trường hợp ~”.",
    },
    {
      question: "Chọn cách nói kính ngữ đúng: “Giám đốc đang ở phòng họp.”",
      options: ["社長は会議室にいらっしゃいます。", "社長は会議室におります。", "社長は会議室にまいります。"],
      answer: 0,
      explanation: "いらっしゃる là kính ngữ (尊敬語) của いる, dùng cho người bề trên.",
    },
  ] as PlacementQuestion[],
  tutors: {
    maya: {
      name: "Sakura-sensei",
      title: "Cô giáo Nhật Bản",
      tagline: "Dịu dàng, phát âm chuẩn, kiên nhẫn hướng dẫn",
      description: "Cô giáo nhiệt tình, sửa tỉ mỉ từng lỗi phát âm và ngữ pháp theo trình độ của bạn.",
      greeting: "Hôm nay cô sẽ đồng hành cùng em luyện nói tiếng Nhật thật tự tin nhé.",
    },
    david: {
      name: "Kenji-sensei",
      title: "Thầy giáo Nhật Bản",
      tagline: "Điềm đạm, rõ ràng, giỏi tình huống công sở",
      description: "Thầy giáo phong cách chuyên nghiệp, phản xạ nhanh và chuyên sâu giao tiếp công việc.",
      greeting: "Hôm nay thầy sẽ cùng em luyện nói tiếng Nhật thật tự nhiên nhé.",
    },
    alex: {
      name: "Alex",
      title: "Linh vật học tập",
      tagline: "Đáng yêu, hồn nhiên, học tập không áp lực",
      description: "Chú cú thông thái đội mũ tốt nghiệp, vui tính, học tập không áp lực.",
      greeting: "Cùng nhau học tiếng Nhật thật vui nào!",
    },
  } as Record<"maya" | "david" | "alex", TutorText>,
};

export function levelLabel(level: string): string {
  return LANG.levelLabels[level as LevelId] ?? level;
}
