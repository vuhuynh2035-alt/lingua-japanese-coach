export type GrammarQuestion = {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type GrammarTopic = {
  id: string;
  level: "A1" | "A2" | "B1" | "B2";
  title: string;
  structure: string;
  overview: string;
  /** "Japanese [romaji] (Vietnamese meaning)". Text in [brackets] is never read aloud. */
  examples: string[];
  questions: GrammarQuestion[];
};

export const grammarTopics: GrammarTopic[] = [
  {
    id: "wa-desu",
    level: "A1",
    title: "Câu giới thiệu: AはBです",
    structure: "A は B です / A は B ではありません",
    overview: "は (đọc là “wa”) là trợ từ chủ đề: nêu chủ đề của câu. です là từ nối lịch sự, gần như “là”. Phủ định lịch sự dùng ではありません (hoặc じゃありません). Câu hỏi chỉ cần thêm か ở cuối, không đảo trật tự từ.",
    examples: [
      "私は学生です。[watashi wa gakusei desu] (Tôi là sinh viên.)",
      "田中さんは先生ではありません。[Tanaka-san wa sensei dewa arimasen] (Anh Tanaka không phải giáo viên.)",
      "あなたはベトナム人ですか。[anata wa Betonamu-jin desu ka] (Bạn là người Việt Nam phải không?)",
    ],
    questions: [
      { prompt: "Chọn câu đúng: “Tôi là kỹ sư.”", options: ["私はエンジニアです。", "私をエンジニアです。", "私にエンジニアです。"], answer: 0, explanation: "Chủ đề của câu đi với は: 私は〜です。" },
      { prompt: "Điền vào chỗ trống: 「これは水___ありません。」", options: ["では", "が", "を"], answer: 0, explanation: "Phủ định lịch sự của です là ではありません." },
      { prompt: "Cách đặt câu hỏi “Bạn là người Nhật phải không?” đúng là:", options: ["あなたは日本人ですか。", "あなたは日本人ですの。", "あなたか日本人です。"], answer: 0, explanation: "Thêm か vào cuối câu để hỏi; không đổi trật tự từ." },
    ],
  },
  {
    id: "basic-particles",
    level: "A1",
    title: "Trợ từ cơ bản: を・に・で・へ・と",
    structure: "N を V / N に V / N で V / N へ V / N と V",
    overview: "を đánh dấu tân ngữ (cái bị tác động). に chỉ thời điểm, nơi tồn tại hoặc đích đến. で chỉ nơi diễn ra hành động và phương tiện. へ chỉ hướng (đọc là “e”). と là “và / cùng với”. Chọn sai trợ từ là lỗi rất hay gặp của người Việt vì tiếng Việt không có trợ từ.",
    examples: [
      "パンを食べます。[pan o tabemasu] (Tôi ăn bánh mì.)",
      "七時に起きます。[shichi-ji ni okimasu] (Tôi dậy lúc 7 giờ.)",
      "図書館で勉強します。[toshokan de benkyō shimasu] (Tôi học ở thư viện.)",
      "友だちと買い物に行きます。[tomodachi to kaimono ni ikimasu] (Tôi đi mua sắm với bạn.)",
    ],
    questions: [
      { prompt: "Điền vào chỗ trống: 「コーヒー___飲みます。」", options: ["を", "に", "で"], answer: 0, explanation: "Tân ngữ trực tiếp (cái được uống) dùng を." },
      { prompt: "Điền vào chỗ trống: 「八時___学校へ行きます。」", options: ["を", "に", "と"], answer: 1, explanation: "Thời điểm cụ thể (8 giờ) đi với に." },
      { prompt: "Điền vào chỗ trống: 「レストラン___晩ごはんを食べます。」", options: ["で", "に", "が"], answer: 0, explanation: "で chỉ nơi diễn ra hành động (ăn ở nhà hàng)." },
    ],
  },
  {
    id: "masu-form",
    level: "A1",
    title: "Động từ thể ます: hiện tại, quá khứ, phủ định",
    structure: "V ます / V ません / V ました / V ませんでした",
    overview: "Thể ます là cách nói lịch sự cơ bản. ます dùng cho hiện tại và tương lai; ません là phủ định; ました là quá khứ; ませんでした là quá khứ phủ định. Động từ tiếng Nhật không chia theo ngôi hay số, chỉ chia theo thời và mức độ lịch sự.",
    examples: [
      "毎朝コーヒーを飲みます。[maiasa kōhī o nomimasu] (Mỗi sáng tôi uống cà phê.)",
      "昨日は学校に行きませんでした。[kinō wa gakkō ni ikimasen deshita] (Hôm qua tôi đã không đến trường.)",
      "週末に映画を見ました。[shūmatsu ni eiga o mimashita] (Cuối tuần tôi đã xem phim.)",
    ],
    questions: [
      { prompt: "“Tôi đã ăn sáng.” nói là:", options: ["朝ごはんを食べました。", "朝ごはんを食べます。", "朝ごはんを食べません。"], answer: 0, explanation: "〜ました là quá khứ khẳng định." },
      { prompt: "Dạng phủ định lịch sự của 「行きます」 là:", options: ["行きません", "行きました", "行かないます"], answer: 0, explanation: "〜ます đổi thành 〜ません ở dạng phủ định." },
      { prompt: "“Hôm qua tôi không học.” là:", options: ["昨日は勉強しませんでした。", "昨日は勉強しません。", "昨日は勉強しなかったます。"], answer: 0, explanation: "Quá khứ phủ định lịch sự: 〜ませんでした." },
    ],
  },
  {
    id: "adjectives",
    level: "A1",
    title: "Tính từ い và tính từ な",
    structure: "い-adj: 〜い / 〜くない / 〜かった   な-adj: 〜な N / 〜じゃない / 〜だった",
    overview: "Có hai nhóm tính từ. Tính từ い kết thúc bằng い và tự biến đổi (高い → 高くない → 高かった). Tính từ な giữ nguyên, khi đứng trước danh từ thì thêm な (きれいな花). Ngoại lệ hay nhầm: いい đổi thành よくない / よかった; きれい là tính từ な dù kết thúc bằng い.",
    examples: [
      "この本は高いです。[kono hon wa takai desu] (Quyển sách này đắt.)",
      "この部屋はきれいです。[kono heya wa kirei desu] (Căn phòng này sạch đẹp.)",
      "昨日の天気はよくなかったです。[kinō no tenki wa yokunakatta desu] (Thời tiết hôm qua không tốt.)",
    ],
    questions: [
      { prompt: "Dạng phủ định của 「高い」 là:", options: ["高くないです", "高いじゃないです", "高いくないです"], answer: 0, explanation: "Tính từ い đổi い thành くない." },
      { prompt: "Chọn câu đúng: “Đây là con phố yên tĩnh.”", options: ["静かな道です。", "静かい道です。", "静かの道です。"], answer: 0, explanation: "静か là tính từ な, thêm な khi đứng trước danh từ." },
      { prompt: "Quá khứ của 「いいです」 là:", options: ["よかったです", "いかったです", "いいでした"], answer: 0, explanation: "いい là bất quy tắc: よかった." },
    ],
  },
  {
    id: "te-form",
    level: "A2",
    title: "Thể て: nhờ vả, nối câu, đang làm",
    structure: "V て + ください / V て + V / V ている",
    overview: "Thể て là “chìa khóa” của ngữ pháp N4. Gắn ください để nhờ lịch sự, nối hai hành động liên tiếp, và dùng 〜ている để diễn tả hành động đang diễn ra hoặc trạng thái kéo dài. Cách chia て theo nhóm: 〜う・つ・る → って; 〜む・ぶ・ぬ → んで; 〜く → いて; 〜す → して; nhóm 2 bỏ る thêm て.",
    examples: [
      "ここに名前を書いてください。[koko ni namae o kaite kudasai] (Xin hãy viết tên vào đây.)",
      "朝起きて、シャワーを浴びます。[asa okite, shawā o abimasu] (Buổi sáng tôi dậy rồi đi tắm.)",
      "今、電話をしています。[ima, denwa o shite imasu] (Bây giờ tôi đang gọi điện.)",
    ],
    questions: [
      { prompt: "Thể て của 「飲む」 là:", options: ["飲んで", "飲みて", "飲って"], answer: 0, explanation: "Động từ kết thúc bằng む đổi thành んで." },
      { prompt: "“Xin hãy chờ một chút.” là:", options: ["ちょっと待ってください。", "ちょっと待つください。", "ちょっと待ちてください。"], answer: 0, explanation: "待つ → 待って (つ → って) + ください." },
      { prompt: "「彼は今、ご飯を食べています。」 nghĩa là:", options: ["Anh ấy đang ăn cơm.", "Anh ấy đã ăn cơm rồi.", "Anh ấy sẽ ăn cơm."], answer: 0, explanation: "〜ている diễn tả hành động đang diễn ra." },
    ],
  },
  {
    id: "tai-nai",
    level: "A2",
    title: "Muốn làm gì và phủ định: 〜たい・〜ない",
    structure: "V ます bỏ ます + たい / V ない",
    overview: "〜たい diễn tả mong muốn của chính người nói (tôi muốn ~), chia như tính từ い: 食べたい → 食べたくない → 食べたかった. Dạng ない là phủ định thể thông thường: 行かない, 食べない. Có hai bất quy tắc: する → しない, 来る → 来ない (こない).",
    examples: [
      "日本へ行きたいです。[Nihon e ikitai desu] (Tôi muốn đi Nhật.)",
      "今日は何も食べたくないです。[kyō wa nani mo tabetakunai desu] (Hôm nay tôi không muốn ăn gì.)",
      "明日は学校へ行かない。[ashita wa gakkō e ikanai] (Ngày mai tôi không đi học.)",
    ],
    questions: [
      { prompt: "“Tôi muốn uống nước.” là:", options: ["水が飲みたいです。", "水を飲むたいです。", "水が飲みいです。"], answer: 0, explanation: "Bỏ ます, thêm たい: 飲み + たい. Tân ngữ thường dùng が hoặc を." },
      { prompt: "Dạng ない của 「来る」 là:", options: ["来ない（こない）", "来らない", "来ります"], answer: 0, explanation: "来る là bất quy tắc: こない." },
      { prompt: "Dạng phủ định của 「食べたい」 là:", options: ["食べたくない", "食べたいない", "食べなたい"], answer: 0, explanation: "たい chia như tính từ い: たい → たくない." },
    ],
  },
  {
    id: "ta-koto-ga-aru",
    level: "A2",
    title: "Kinh nghiệm và liệt kê: 〜たことがある・〜たり〜たり",
    structure: "V た + ことがある / V たり V たりする",
    overview: "V た + ことがある nói về kinh nghiệm đã từng làm trong đời (không nêu thời điểm cụ thể). 〜たり〜たりする liệt kê vài hành động tiêu biểu trong nhiều hành động, nhấn mạnh sự xen kẽ. Nhớ là thể た chia giống thể て (て → た, で → だ).",
    examples: [
      "富士山に登ったことがあります。[Fujisan ni nobotta koto ga arimasu] (Tôi đã từng leo núi Phú Sĩ.)",
      "日曜日は洗濯したり、掃除したりします。[nichiyōbi wa sentaku shitari, sōji shitari shimasu] (Chủ nhật tôi lúc thì giặt đồ, lúc thì dọn dẹp.)",
    ],
    questions: [
      { prompt: "“Tôi đã từng ăn sushi.” là:", options: ["寿司を食べたことがあります。", "寿司を食べることがあります。", "寿司を食べますことがあります。"], answer: 0, explanation: "Kinh nghiệm: V thể た + ことがあります." },
      { prompt: "Thể た của 「読む」 là:", options: ["読んだ", "読みた", "読った"], answer: 0, explanation: "む → んだ (giống 飲んで → 飲んだ)." },
      { prompt: "Chọn câu liệt kê đúng:", options: ["休みの日は寝たり、映画を見たりします。", "休みの日は寝たり、映画を見ます。", "休みの日は寝て、映画を見たりです。"], answer: 0, explanation: "〜たり phải xuất hiện ở từng hành động được liệt kê, kết thúc bằng する/します." },
    ],
  },
  {
    id: "potential",
    level: "B1",
    title: "Thể khả năng: 〜ことができる・〜られる",
    structure: "V る + ことができる / Nhóm 1: 〜e る   Nhóm 2: 〜られる",
    overview: "Có hai cách nói “có thể làm”: V る + ことができる (trang trọng, dễ nhớ) và thể khả năng của động từ. Nhóm 1 đổi âm cuối sang hàng え + る (書く → 書ける), nhóm 2 thêm られる (食べる → 食べられる), する → できる, 来る → 来られる. Trợ từ đi kèm thường đổi を → が.",
    examples: [
      "私は漢字を書くことができます。[watashi wa kanji o kaku koto ga dekimasu] (Tôi có thể viết chữ Hán.)",
      "日本語が話せます。[Nihongo ga hanasemasu] (Tôi nói được tiếng Nhật.)",
      "辛い物は食べられません。[karai mono wa taberaremasen] (Tôi không ăn được đồ cay.)",
    ],
    questions: [
      { prompt: "Thể khả năng của 「読む」 là:", options: ["読める", "読まれる", "読めれる"], answer: 0, explanation: "Nhóm 1: む → め + る." },
      { prompt: "Điền vào chỗ trống: 「納豆___食べられます。」(Tôi ăn được natto.)", options: ["が", "に", "で"], answer: 0, explanation: "Với thể khả năng, tân ngữ thường dùng が thay cho を." },
      { prompt: "Thể khả năng của 「する」 là:", options: ["できる", "される", "しれる"], answer: 0, explanation: "する → できる (bất quy tắc)." },
    ],
  },
  {
    id: "conditionals",
    level: "B1",
    title: "Câu điều kiện: 〜たら・〜ば・〜と・〜なら",
    structure: "V たら / V ば / V と / N・V なら",
    overview: "たら (nếu / sau khi) dùng rộng nhất, hợp mọi tình huống. ば nhấn điều kiện cần thiết. と diễn tả kết quả tất yếu (như quy luật tự nhiên, chỉ đường). なら dùng khi nêu đề tài người kia vừa nói để đưa lời khuyên. Với người học, hãy ưu tiên たら trước.",
    examples: [
      "雨が降ったら、家にいます。[ame ga futtara, ie ni imasu] (Nếu trời mưa thì tôi ở nhà.)",
      "春になると、桜が咲きます。[haru ni naru to, sakura ga sakimasu] (Hễ đến mùa xuân là hoa anh đào nở.)",
      "京都へ行くなら、秋がいいですよ。[Kyōto e iku nara, aki ga ii desu yo] (Nếu đi Kyoto thì mùa thu là tốt đấy.)",
    ],
    questions: [
      { prompt: "Điền vào chỗ trống: 「時間が___、手伝います。」(Nếu có thời gian thì tôi giúp.)", options: ["あったら", "あるたら", "ありたら"], answer: 0, explanation: "たら gắn vào thể た: あった + ら." },
      { prompt: "「春になる___、暖かくなります。」 Chọn từ phù hợp để diễn tả quy luật tự nhiên:", options: ["と", "たら", "なら"], answer: 0, explanation: "と diễn tả kết quả tất yếu, quy luật." },
      { prompt: "Thể ば của 「行く」 là:", options: ["行けば", "行くば", "行きば"], answer: 0, explanation: "Nhóm 1: đổi âm cuối sang hàng え rồi thêm ば: 行く → 行けば." },
    ],
  },
  {
    id: "yoo-ni-tame-ni",
    level: "B1",
    title: "Mục đích: 〜ために・〜ように",
    structure: "V る + ために (ý chí)   V る/ない + ように (khả năng, trạng thái)",
    overview: "Cả hai đều nghĩa “để ~”. ために đi với hành động có chủ ý của chính chủ ngữ, hai vế cùng chủ ngữ: 日本へ行くためにお金を貯めます. ように đi với động từ khả năng / phủ định / không có ý chí, hoặc khi hai vế khác chủ ngữ: 忘れないようにメモします.",
    examples: [
      "日本で働くために、日本語を勉強しています。[Nihon de hataraku tame ni, Nihongo o benkyō shite imasu] (Tôi học tiếng Nhật để làm việc ở Nhật.)",
      "忘れないように、メモを取ります。[wasurenai yō ni, memo o torimasu] (Tôi ghi chú để khỏi quên.)",
    ],
    questions: [
      { prompt: "Điền vào chỗ trống: 「遅れない___、早く出ます。」", options: ["ように", "ために", "ことに"], answer: 0, explanation: "Vế đầu là phủ định / không có ý chí → ように." },
      { prompt: "Điền vào chỗ trống: 「合格する___、毎日勉強します。」", options: ["ために", "ように", "ばかりに"], answer: 0, explanation: "Hành động có chủ ý, cùng chủ ngữ → ために." },
      { prompt: "Câu nào đúng?", options: ["日本語が話せるように、練習します。", "日本語が話せるために、練習します。", "日本語を話すように、練習するために。"], answer: 0, explanation: "話せる là thể khả năng → đi với ように." },
    ],
  },
  {
    id: "keigo",
    level: "B2",
    title: "Kính ngữ và khiêm nhường ngữ (敬語)",
    structure: "尊敬語: お〜になる / いらっしゃる   謙譲語: お〜する / 申す / 伺う",
    overview: "尊敬語 nâng cao người đối diện (khách hàng, cấp trên): いる/行く/来る → いらっしゃる, 言う → おっしゃる, 食べる → 召し上がる. 謙譲語 hạ thấp bản thân: 行く/来る → 参る, 言う → 申す, 見る → 拝見する. Sai lầm hay gặp: dùng 尊敬語 cho chính mình hoặc người trong công ty khi nói với khách bên ngoài.",
    examples: [
      "社長は今、会議室にいらっしゃいます。[shachō wa ima, kaigishitsu ni irasshaimasu] (Giám đốc hiện đang ở phòng họp.)",
      "私が資料をお送りします。[watashi ga shiryō o ookuri shimasu] (Để tôi gửi tài liệu cho ạ.)",
      "田中と申します。[Tanaka to mōshimasu] (Tôi tên là Tanaka.)",
    ],
    questions: [
      { prompt: "Khi nói với khách hàng về giám đốc của họ, “đang ăn” là:", options: ["召し上がっています", "いただいています", "食べております"], answer: 0, explanation: "召し上がる là kính ngữ của 食べる, dùng cho người được tôn kính." },
      { prompt: "Khiêm nhường ngữ của 「言う」 (tôi nói) là:", options: ["申す", "おっしゃる", "言われる"], answer: 0, explanation: "申す là khiêm nhường ngữ; おっしゃる là kính ngữ." },
      { prompt: "Câu nào đúng khi tự giới thiệu với khách?", options: ["田中と申します。", "田中でいらっしゃいます。", "田中とおっしゃいます。"], answer: 0, explanation: "Với bản thân luôn dùng 謙譲語: 申します." },
    ],
  },
  {
    id: "wake-dewa-nai",
    level: "B2",
    title: "Diễn đạt tinh tế: 〜わけではない・〜わけにはいかない・〜ざるを得ない",
    structure: "普通形 + わけではない / V る + わけにはいかない / V ない(ず) + ざるを得ない",
    overview: "〜わけではない phủ định một phần (“không có nghĩa là ~”). 〜わけにはいかない nghĩa là “không thể ~ vì lý do xã hội, đạo lý”. 〜ざるを得ない nghĩa là “không còn cách nào khác ngoài ~”. Đây là các mẫu câu điển hình của N2, rất hay gặp trong email công việc và bài đọc.",
    examples: [
      "嫌いなわけではありませんが、あまり食べません。[kirai na wake dewa arimasen ga, amari tabemasen] (Không phải là ghét, chỉ là ít ăn thôi.)",
      "明日は大事な会議があるので、休むわけにはいきません。[ashita wa daiji na kaigi ga aru node, yasumu wake ni wa ikimasen] (Mai có cuộc họp quan trọng nên không thể nghỉ được.)",
      "上司の指示なので、従わざるを得ません。[jōshi no shiji na node, shitagawazaru o emasen] (Vì là chỉ thị của cấp trên nên đành phải làm theo.)",
    ],
    questions: [
      { prompt: "“Không thể nghỉ được (vì trách nhiệm).” là:", options: ["休むわけにはいかない。", "休むわけではない。", "休まざるを得る。"], answer: 0, explanation: "〜わけにはいかない: không thể làm vì lý do đạo lý, xã hội." },
      { prompt: "Dạng 〜ざるを得ない của 「する」 là:", options: ["せざるを得ない", "しざるを得ない", "さざるを得ない"], answer: 0, explanation: "する → せざるを得ない (bất quy tắc)." },
      { prompt: "「忙しいわけではありません。」 có nghĩa gần nhất là:", options: ["Không hẳn là bận.", "Rất bận.", "Chắc chắn bận."], answer: 0, explanation: "〜わけではない phủ định một phần: “không có nghĩa là ~”." },
    ],
  },
];
