# Teacher AI JP — Học tiếng Nhật cùng AI

Web app học tiếng Nhật dành cho người Việt, cùng một bộ tính năng với Teacher AI (tiếng Anh) nhưng là **chương trình độc lập**: thư mục, git, bộ nhớ trình duyệt (`lingua-jp-…`) và service worker đều riêng, không dùng chung gì với C:\English Coach và C:\Chinese Coach.

## Cách sử dụng

1. Mở ứng dụng, vào **Cài đặt**, chọn Google Gemini hoặc OpenAI / ChatGPT.
2. Tạo API key riêng tại [Google AI Studio](https://aistudio.google.com/app/apikey) hoặc [OpenAI](https://platform.openai.com/api-keys), dán vào ứng dụng và chọn **Kiểm tra và lưu key**.
3. Chọn lĩnh vực (giao tiếp hằng ngày, du lịch, công sở) rồi học theo giáo trình offline hoặc học cùng gia sư AI.

Mỗi người dùng API key và hạn mức của riêng mình; yêu cầu gửi thẳng từ trình duyệt tới nhà cung cấp, key chỉ lưu trên thiết bị.

## Tính năng

- Giáo trình JLPT N5–N2: 28 bài (everyday 12, travel 8, business 8), 280 câu hỏi. Mỗi bài có hội thoại có romaji và bản dịch, từ vựng, ngữ pháp, mẹo phát âm cho người Việt, nhiệm vụ luyện nói và bài kiểm tra 10 câu (đạt 8/10 để sang bài kế tiếp).
- Thầy/cô AI trò chuyện bằng giọng nói hoặc văn bản, sửa lỗi ngữ pháp, từ vựng và phát âm theo trình độ.
- Gia sư hoạt hình (cô giáo, thầy giáo, linh vật) nhép miệng khi đọc; giọng thiết bị hoặc giọng AI (Gemini / OpenAI), chọn vùng miền, nam/nữ.
- Bài kiểm tra xếp trình độ, bài ngữ pháp có chấm điểm, ghi âm chất lượng cao / khử ồn tùy chọn, dùng offline (PWA).
- Phần đọc phiên âm trong dấu [ ] chỉ để nhìn, không bao giờ được đọc thành tiếng.

## Phát triển

```
npm install
npm run dev        # chạy thử
npm run build      # xuất bản tĩnh vào out/
python scripts/curriculum/build.py   # tạo lại public/courses/*.json từ scripts/curriculum/*.py
```

Khi đổi nội dung giáo trình, tăng `CURRICULUM_VERSION` trong `src/lib/course-library.ts` và `VERSION` trong `scripts/curriculum/build.py`. Mọi thứ riêng của ngôn ngữ nằm trong `src/lib/language.ts`.

Phát hành lên GitHub Pages: `scripts/publish-pages.ps1` (đường dẫn gốc `/lingua-japanese-coach`).
