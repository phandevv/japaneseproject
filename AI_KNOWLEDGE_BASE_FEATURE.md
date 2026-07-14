# 🔮 Tính Năng: AI Personal Japanese Knowledge Base (Siro Nihongo)

Hệ thống nâng cấp triệt để trải nghiệm học tập của người dùng bằng cách chuyển đổi mô hình từ Chatbot tiếng Nhật thông thường thành một kho lưu trữ tri thức cá nhân hóa lâu dài (phương pháp kết hợp Anki + Notion + Obsidian + ChatGPT).

---

## 🚀 1. Luồng Người Dùng & Normalize AI
- **Đầu vào tự do**: Học viên có thể nhập liệu bất kỳ lúc nào, ở bất kỳ đâu (Mina, Anime, Youtube...) bằng Romaji (`hazukashii`), Katakana/Hiragana lỗi (`ショクジ`), Hán tự phồn thể (`将來`), cấu trúc ngữ pháp (`～ように`) hoặc thậm chí là nghĩa tiếng Việt (`xấu hổ`).
- **AI Phân loại & Chuẩn hóa**: Hệ thống tự động gọi API DeepSeek để nhận diện loại kiến thức (từ vựng hoặc ngữ pháp) và chuẩn hóa về dạng gốc chính xác nhất (ví dụ: `hazukashii` -> `恥ずかしい`, `xấu hổ` -> `恥ずかしい`, `ように` -> `ように`).
- **Làm giàu tri thức (Enrichment)**: AI tự động sinh thẻ tri thức đầy đủ thông tin:
  - **Từ vựng**: Cách đọc Hiragana, Hán Việt, từ loại, JLPT, mẹo ghi nhớ (Mnemonic), các từ ghép liên quan, từ đồng nghĩa/trái nghĩa, collocations, câu ví dụ mẫu, hội thoại ứng dụng thực tế và lỗi thường gặp.
  - **Ngữ pháp**: Cách kết hợp cấu trúc (Formation), ý nghĩa tiếng Việt, câu ví dụ, đoạn văn ứng dụng, phân biệt ngữ pháp tương tự và bài kiểm tra nhanh (Quick Quiz).

---

## 📅 2. Hệ Thống Ôn Tập SRS cho Ngữ Pháp
- Áp dụng thuật toán lặp giãn cách **SuperMemo-2 (SM-2)** tương tự từ vựng.
- Lưu trữ lịch sử ôn luyện của từng cấu trúc ngữ pháp thông qua bảng `grammar_reviews`.
- Học viên đánh giá mức độ ghi nhớ từ `1` (Again - Quên) đến `4` (Easy - Rất dễ) để hệ thống tự động lập lịch ôn tập tiếp theo (`nextReview` tăng dần).

---

## 📖 3. Kiến Tạo Ngữ Liệu Cá Nhân Hóa (Personal Corpus)
- **Cá nhân hóa tối đa**: AI quét qua cơ sở dữ liệu để tìm toàn bộ từ vựng và ngữ pháp học viên đã học thành công (`is_learned = true`).
- **Luyện đọc hiểu**: Sinh một đoạn văn tiếng Nhật độc quyền, ưu tiên sử dụng các từ đã học. Có các chế độ hiển thị Furigana, ẩn/hiện dịch nghĩa và một bài kiểm tra đọc hiểu Quiz trắc nghiệm chọn đáp án A, B, C, D (kèm giải thích đáp án).
- **Hội thoại đàm thoại**: Sinh kịch bản giao tiếp tự nhiên giữa 2 nhân vật A và B bằng các từ/cấu trúc người dùng đã thuộc để học viên luyện nói Shadowing.

---

## 🛡️ 4. Cơ Chế Bảo Vệ Hệ Thống (Bulkhead Pattern)
Để bảo vệ tài nguyên máy chủ AWS khi triển khai và chịu tải lớn từ người dùng:
- Hệ thống áp dụng **Bulkhead Pattern** giới hạn số lượng request gọi DeepSeek đồng thời bằng `Semaphore`.
- Giới hạn bulkhead đồng thời được thiết lập tối đa **50** concurrent requests tại các AI services cốt lõi:
  - `KnowledgeService` (Làm giàu & chuẩn hóa tri thức).
  - `PersonalCorpusService` (Tạo bài đọc & hội thoại cá nhân hóa).
  - `ChatService` (Trò chuyện đàm thoại trực tuyến).
  - `DeepSeekEnrichmentService` (Tiến trình ngầm làm giàu dữ liệu từ điển).

---

## 🤖 5. Ngữ Cảnh Học Tập Cho Trợ Lý AI (AI Tutor Context)
- Chatbot AI ở màn hình chính được nâng cấp để đọc kho tri thức cá nhân của học viên.
- Khi người dùng gửi tin nhắn chat, hệ thống tự động inject tối đa 20 từ vựng và 8 ngữ pháp người dùng đã thuộc vào System Prompt của DeepSeek.
- Trợ lý AI sẽ ưu tiên tối đa việc sử dụng các từ vựng này trong câu trả lời hoặc ví dụ để tăng hiệu quả ôn tập tự nhiên.
