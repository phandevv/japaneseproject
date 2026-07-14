# 🧩 Business Modules (.ai/knowledge/business-modules.md)

Tài liệu này chi tiết hóa các module nghiệp vụ lớn trong dự án **NihongoCards**, làm rõ trách nhiệm, các lớp tham gia và luồng xử lý chính.

---

## 1. Module Xác Thực (Authentication Module)
* **Mục tiêu**: Đăng ký, đăng nhập tài khoản học viên, quản lý thông tin profile.
* **Lớp tham gia**:
  * Controller: `AuthController`
  * Service: `AuthService`, `OnlineUserService`
  * Repository: `UserRepository`
  * Entity: `User`
* **Quyền hạn (Permissions)**:
  * Đăng ký/Đăng nhập: Tự do (Public).
  * Lấy thông tin cá nhân `me`: Yêu cầu JWT Token.
* **Hạn chế**: Token hiện tại lưu trữ ở client bằng `localStorage`, chưa áp dụng Refresh Token hay HttpOnly Cookie.

---

## 2. Module Từ Điển Gốc (Vocabulary Module)
* **Mục tiêu**: Lưu trữ, tra cứu từ vựng từ N5 đến N1. Cung cấp API tìm kiếm thời gian thực thời gian thực.
* **Lớp tham gia**:
  * Controller: `VocabularyController`
  * Service: `VocabularyService`
  * Repository: `VocabularyRepository`
  * Entity: `Vocabulary`
* **Công nghệ tích hợp**: Hibernate Search + Apache Lucene Index.
* **Điểm mở rộng**: Sắp tới sẽ bổ sung tính năng gợi ý từ đồng nghĩa lấy từ bảng CSDL thay vì mảng tĩnh ở frontend.

---

## 3. Module Học Tập Giãn Cách (SRS Module)
* **Mục tiêu**: Lập lịch ôn tập thông minh bằng thuật toán SM-2, lọc các từ đến hạn, theo dõi thống kê học tập.
* **Lớp tham gia**:
  * Controller: `SrsController`
  * Service: `SrsService`
  * Repository: `WordReviewRepository`
  * Entity: `WordReview`, `Vocabulary`
* **Nghiệp vụ đặc thù**:
  * Lọc từ ôn tập hôm nay: So khớp ngày `nextReview` $\le$ ngày hiện tại.
  * **Quy tắc bảo toàn**: Một từ đã học (từng có đánh giá $\ge 3$) khi ôn tập fail (Forgot/Hard) sẽ reset chu kỳ ôn tập về 1 ngày nhưng không bị xóa ra khỏi tổng số từ đã học.

---

## 4. Module Học Hàng Ngày (Daily Study Module)
* **Mục tiêu**: Chia nhỏ từ vựng của cấp độ thành các ngày học dựa theo cài đặt số từ mỗi ngày (`wordsPerDay`). Cho phép người dùng đánh dấu hoàn thành ngày học.
* **Lớp tham gia**:
  * Controller: `UserSettingController`
  * Service: `UserSettingService`
  * Repository: `UserSettingRepository`
  * Entity: `UserSetting`
* **Luồng xử lý**:
  1. Đọc số từ cấu hình của người dùng.
  2. Tính tổng số ngày học của cấp độ: `totalDays = totalWords / wordsPerDay`.
  3. Lấy từ vựng phân trang dựa trên số ngày đã chọn (Trang = Ngày - 1).
  4. Đánh dấu ngày hoàn thành và lưu danh sách ngăn cách bởi dấu phẩy (ví dụ: `1,2,5`) trong bảng `user_settings`.

---

## 5. Module Thống Kê Tiến Độ (Analytics Module)
* **Mục tiêu**: Ghi nhận hoạt động làm bài tập hàng ngày, vẽ lưới ô vuông commit 30 ngày (tần suất học tập) và cập nhật điểm số trên bảng xếp hạng (Leaderboard).
* **Lớp tham gia**:
  * Controller: `AnalyticsController`
  * Service: `AnalyticsService`
  * Repository: `StudySessionRepository`, `UserRepository`
  * Entity: `StudySession`, `User`
* **Luồng xử lý**:
  * Mỗi khi hoàn thành làm Quiz, client gửi thông báo số lượng từ học mới và số câu trả lời đúng.
  * Backend lưu vào bảng `study_sessions` theo ngày.
  * Bảng xếp hạng điểm số được lấy từ tổng số câu trả lời đúng của học viên tích lũy.

---

## 6. Module Admin & Nạp Dữ Liệu (Import & Seed Module)
* **Mục tiêu**: Admin tải lên tệp Excel chứa hàng ngàn từ vựng để điền vào từ điển. Hệ thống tự động nạp dữ liệu mẫu ban đầu từ Excel khi khởi chạy lần đầu.
* **Lớp tham gia**:
  * Controller: `ImportController`
  * Service: `ExcelImportService`
  * Config: `ExcelDataLoader`
* **Cơ chế**:
  * Đọc file excel sử dụng thư viện **Apache POI**.
  * Phân tích các cột: Kanji, Hiragana, Romaji, Hán Việt, Từ loại, Cấp độ, Nghĩa.
  * Tự động lọc trùng và ghi nhận vào bảng `vocabulary`.

---

## 7. Module Personal Knowledge Base (AI Personal Knowledge Base Module)
* **Mục tiêu**: Chuẩn hóa Romaji, Kana, chữ Kanji viết sai, hoặc nghĩa tiếng Việt về từ gốc. Làm giàu từ vựng & cấu trúc ngữ pháp thành các "Knowledge Cards" đầy đủ thông tin (pitch accent, mnemonic, collocations, ví dụ, hội thoại) kết hợp Obsidian + Notion + Anki. Lập lịch ôn tập SRS cho ngữ pháp và sinh bài đọc hiểu, hội thoại cá nhân hóa (Personal Corpus) chỉ dùng các từ vựng người dùng đã học.
* **Lớp tham gia**:
  * Controller: `KnowledgeController`, `ChatController`
  * Service: `KnowledgeService`, `GrammarSrsService`, `PersonalCorpusService`, `ChatService`
  * Repository: `GrammarCardRepository`, `GrammarReviewRepository`, `KnowledgeVersionRepository`, `WordReviewRepository`
  * Entity: `GrammarCard`, `GrammarReview`, `KnowledgeVersion`, `Vocabulary`
* **Cơ chế bảo vệ & Cấu hình**:
  * **Bulkhead Pattern**: Giới hạn tối đa 50 concurrent requests đồng thời tại các AI Services (`KnowledgeService`, `PersonalCorpusService`, `ChatService`, `DeepSeekEnrichmentService`) để bảo vệ tài nguyên máy chủ.
  * **AI Tutor Context**: Chatbot tự động đọc kho tri thức cá nhân của học viên để điều phối nội dung câu trả lời phù hợp với vốn từ của học viên.

