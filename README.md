# Teacher AI — Học tiếng Anh cùng AI

Web app học tiếng Anh dành cho người Việt. Chọn lộ trình theo lĩnh vực, luyện hội thoại và phát âm với AI, làm bài kiểm tra trình độ. Giao diện dùng được trên máy tính, Android và iPhone.

## Cách sử dụng

1. Mở đường dẫn GitHub Pages trên trình duyệt.
2. Mở **Cài đặt**, chọn Google Gemini hoặc OpenAI / ChatGPT.
3. Tạo API key riêng tại [Google AI Studio](https://aistudio.google.com/app/apikey) hoặc [OpenAI](https://platform.openai.com/api-keys), dán vào ứng dụng và chọn **Kiểm tra và lưu key**.
4. Có thể lưu nhiều key, đổi key đang dùng, tải danh sách mô hình để chọn, và chọn giọng đọc.
5. Chọn lĩnh vực, rồi trò chuyện bằng cách nhập câu hoặc dùng micro.

Có thể cài Teacher AI lên màn hình chính: Chrome/Android dùng nút **Cài ứng dụng** khi trình duyệt cung cấp hoặc mở menu và chọn cài ứng dụng; iPhone/iPad mở trang bằng Safari, nhấn **Chia sẻ → Thêm vào MH chính**. Ứng dụng kiểm tra phiên bản mới khi mở và hiển thị nút cập nhật trong trang nếu có bản mới.

Nút **?** ở thanh trên mở hướng dẫn theo từng trang, gồm cách luyện hội thoại, chọn lĩnh vực, học giáo trình và dùng các phần cài đặt.

Mỗi người học dùng API key và hạn mức của riêng mình. Yêu cầu được gửi trực tiếp từ trình duyệt tới nhà cung cấp đã chọn; API key không được gửi tới máy chủ của ứng dụng hoặc lưu trong mã nguồn GitHub. Nếu một key bị từ chối hoặc hết hạn mức, app thử lần lượt các key còn lại đã lưu cho nhà cung cấp đó.

API key, lựa chọn nhà cung cấp/mô hình/giọng đọc, hồ sơ, tiến độ và lịch sử trò chuyện được lưu trong bộ nhớ trình duyệt trên thiết bị hiện tại. Dữ liệu không được đồng bộ giữa các thiết bị. Nếu xóa dữ liệu trang web/trình duyệt, key và tiến độ trên thiết bị đó cũng bị xóa. Không lưu key trên thiết bị công cộng hoặc thiết bị dùng chung.

Trong **Cài đặt**, bạn có thể điều chỉnh cỡ chữ từ 100% đến 150%. Lựa chọn này được lưu trên từng thiết bị và áp dụng cho toàn bộ giao diện.

Trong **Cài đặt**, bạn có thể chọn nền trắng với màu khung và điểm nhấn **xanh mint**, **xanh dương** hoặc **đỏ bordeaux**. Giao diện xanh mint ban đầu vẫn được giữ lại; lựa chọn được lưu trên thiết bị hiện tại.

Ứng dụng đi theo từng trang: **Trang chào mừng → Chọn bài học → Chọn cách học → Bài học (Offline) hoặc Học với AI (Online)**. Trang chọn bài học có danh sách xổ xuống, mặc định là danh mục đang học lần trước; mục **Tiếng Anh ngữ pháp** nằm trong cùng danh sách. Nút **Quay lại**, **?** (hướng dẫn) và **Cài đặt** luôn ở thanh trên cùng.

Khi vào **Học với AI**, ứng dụng kiểm tra kết nối thật (thử lần lượt các key đã lưu và các mô hình dự phòng `gemini-2.5-flash` → `gemini-2.5-flash-lite` → `gemini-flash-latest`, rồi ghi nhớ cấu hình chạy được). Kết nối xong, nhân vật 3D (cô giáo, thầy giáo hoặc linh vật Cú Alex — chọn trong **Cài đặt → Gia sư AI đồng hành**) xuất hiện, tự chào, nêu mục tiêu buổi học và đưa ra tình huống phù hợp trình độ; nhân vật chớp mắt, đổi biểu cảm theo nội dung và nhép miệng khi đọc. Nếu không kết nối được, trang hiển thị nguyên nhân cụ thể (key bị từ chối, hết hạn mức, mạng, mô hình ngừng hỗ trợ) cùng nút **Thử lại**. Trong Cài đặt có nút **Kiểm tra kết nối AI**.

## Giáo trình (từ v0.4.0)

Giáo trình gồm 7 khóa, 88 bài, 880 câu hỏi, chia theo khung CEFR A1–B2: Giao tiếp hằng ngày (16 bài, khóa cốt lõi), Công sở, Du lịch, Công nghệ, Y khoa, Tài chính và Kỹ thuật lạnh (mỗi khóa 12 bài). Nội dung do Teacher AI tự biên soạn; danh mục chủ đề/ngữ pháp theo từng level tham chiếu khung CEFR của Hội đồng châu Âu và British Council/EAQUALS Core Inventory (chỉ tham khảo phân cấp, không sao chép nội dung có bản quyền).

Mỗi bài có: hội thoại/bài đọc, từ vựng kèm câu ví dụ, điểm ngữ pháp, mẹo phát âm cho người Việt, nhiệm vụ luyện nói và bài kiểm tra 10 câu. Đạt **8/10** thì bài được tick hoàn thành và mở bài kế tiếp; hoàn thành mọi bài của level hiện tại sẽ nâng trình độ lên level sau. Lần đầu mở, giáo trình tự tải về thiết bị (IndexedDB) để học offline.

Nội dung nằm trong `scripts/curriculum/<khóa>.py`. Sau khi sửa, chạy `python scripts/curriculum/build.py` để tạo lại `public/courses/*.json` (câu hỏi từ vựng được sinh tự động để đủ 10 câu; thứ tự đáp án được xáo trộn). Khi đổi nội dung, tăng `CURRICULUM_VERSION` trong `src/lib/course-library.ts` và `version` trong `build.py` để thiết bị tải lại bản mới.

## Thầy/cô AI

Thầy/cô AI dạy đúng bài tiếp theo trong giáo trình (có thể đổi bài ngay trong lớp), theo 5 bước: khởi động → dạy từ/ngữ pháp → luyện có hướng dẫn → nhiều tình huống tăng dần độ khó → kiểm tra và tổng kết. Cách dạy khác nhau theo level (A1 giải thích chủ yếu bằng tiếng Việt, B2 thảo luận hoàn toàn bằng tiếng Anh). Mỗi lỗi ngữ pháp/từ vựng/cấu trúc câu được ghi thành dòng ✏️ "câu sai" → "câu đúng" — lý do; khi trả lời bằng micro với Google Gemini, AI nghe trực tiếp giọng của bạn và ghi chú lỗi phát âm ở dòng 🔈. Sau vài lượt, AI ước lượng trình độ thực tế (nhãn "AI đánh giá").

## Giọng luyện nghe

Trong **Cài đặt → Giọng đọc & phát âm** chọn: nguồn giọng (Google AI ~22 giọng, OpenAI 11 giọng, hoặc giọng trên máy), 16 vùng miền (Mỹ chuẩn/miền Nam/New York, Canada, Anh RP/London/Manchester, Scotland, Ireland, Úc, New Zealand, Ấn Độ, Singapore, Philippines, Nam Phi, Nigeria), nam/nữ, giọng cụ thể, phong cách và tốc độ. Giọng AI đọc được mọi vùng miền vì vùng miền được truyền như chỉ dẫn cho mô hình; giọng trên máy chỉ có những vùng mà hệ điều hành đã cài. Âm thanh AI được lưu trên máy để nghe lại offline; nếu giọng AI lỗi, app tự chuyển sang giọng trên máy.

Phiên bản ứng dụng được quản lý trong `package.json`; khi phát hành bản điều chỉnh, hãy tăng phiên bản theo SemVer. Các lệnh `npm run dev` và `npm run build` tự tạo `public/version.json` từ giá trị đó. Ứng dụng hiển thị phiên bản đang chạy ở thanh đầu trang và chân trang, đồng thời kiểm tra phiên bản đã triển khai để báo khi có bản mới.

Các tình huống và câu mẫu được phân phối cùng ứng dụng; tiến độ và nội dung trò chuyện cá nhân được lưu cục bộ. Khi dùng trò chuyện bằng giọng nói, bản ghi được gửi thẳng tới Google Gemini hoặc dịch vụ phiên âm OpenAI tùy nhà cung cấp đang chọn. Góp ý/chấm phát âm trực tiếp từ âm thanh hiện hỗ trợ Google Gemini; nếu chọn OpenAI, ứng dụng hiện rõ yêu cầu đổi nhà cung cấp. Cần có kết nối Internet và quyền truy cập micro qua HTTPS.

Trong **Cài đặt**, người học có thể tải tối đa một giọng nam và một giọng nữ cho mỗi vùng từ Google (Mỹ, Úc, Anh, Ấn Độ, Trung Quốc và Đức); các vùng không có giọng phù hợp sẽ không bị gán nhãn thay thế. Danh mục chỉ chứa metadata nhỏ, không tải trước giọng hay audio. Có thể chọn sắc thái đọc rõ/dứt khoát, tự nhiên/cân bằng hoặc êm/nhẹ nhàng; sắc thái là hướng dẫn tạo audio và kết quả còn tùy voice/nhà cung cấp. OpenAI cung cấp danh sách voice riêng và có thể nhận chỉ dẫn accent vùng, nhưng không công bố metadata giới tính/vùng cho từng voice. Audio chỉ được tạo khi người học nghe thử hoặc phát câu, rồi được lưu trên thiết bị để nghe ngoại tuyến (tối đa 100 đoạn gần đây, phân biệt theo nhà cung cấp/mô hình/giọng/sắc thái). Ứng dụng không tải mô hình giọng nói về máy. Việc tạo AI/audio có thể sử dụng hạn mức hoặc phát sinh phí theo tài khoản của nhà cung cấp.

## Thư viện tài liệu cá nhân

Trong **Cài đặt → Giáo trình học offline → Tài liệu cá nhân**, bạn có thể thêm tệp PDF, audio thông dụng hoặc văn bản TXT/MD (tối đa 50 MB mỗi tệp). Tệp được lưu trong IndexedDB của trình duyệt trên thiết bị hiện tại; không được tải lên GitHub hoặc gửi tới máy chủ ứng dụng. Xóa dữ liệu website/trình duyệt có thể xóa cả bản lưu này, vì vậy hãy giữ tệp gốc riêng.

Chỉ thêm tài liệu mà bạn có quyền lưu và sử dụng theo giấy phép áp dụng. Sách điện tử có DRM hoặc nội dung chỉ được cấp quyền đọc trong nền tảng của nhà xuất bản (ví dụ Oxford Learner’s Bookshelf) không thể nhập bằng cách vượt DRM; app này không trích xuất hay phân phối lại nội dung Oxford. Tính năng này là thư viện đọc cá nhân, không chuyển sách thành gói giáo trình có thể phát hành công khai.

## Chạy trên máy để phát triển

1. Cài Node.js phiên bản 20 trở lên.
2. Tại thư mục `english-coach`, chạy `npm install`.
3. Chạy `npm run dev` rồi mở http://localhost:3000.

Key do từng người nhập trong ứng dụng; không đặt key trong biến môi trường, commit hoặc gửi key cho người khác.

## Phát hành miễn phí trên GitHub Pages

1. Đưa mã nguồn lên một GitHub repository công khai.
2. Trong **Settings → Pages**, chọn **Deploy from a branch**, nhánh `main` và thư mục `/docs`.
3. Tại máy có mã nguồn, chạy `npm install` một lần rồi `npm run publish:pages`. Lệnh này build ứng dụng với đường dẫn GitHub Pages và chép bản web vào `docs`.
4. Commit và đẩy bản build lên GitHub:

   ```powershell
   git add .
   git status
   git commit -m "Update published website"
   git push
   ```
5. Gửi đường dẫn `https://<tên-tài-khoản>.github.io/<tên-repository>/` cho người học. Mỗi người tự thêm API key nhà cung cấp mà họ chọn trên thiết bị của mình.

Mỗi lần cập nhật mã nguồn, chạy lại `npm run publish:pages` rồi commit và đẩy thay đổi. GitHub Pages sẽ tự cập nhật trang từ thư mục `docs`.
