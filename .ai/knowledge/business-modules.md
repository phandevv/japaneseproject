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

## 3. Module Học Tập Giãn Cách (SRS & Review Module với FSRS)
* **Mục tiêu**: Lập lịch ôn tập thông minh bằng thuật toán **FSRS (Free Spaced Repetition Scheduler)** thông qua thư viện chuẩn `io.github.open-spaced-repetition:fsrs:1.0.0`. Tự động tính toán độ ổn định (stability), độ khó (difficulty) và thời điểm ôn tập kế tiếp (`nextReview`/`dueAt`).
* **Lớp tham gia**:
  * Controllers: `ReviewController` (`/api/reviews/today`, `/api/reviews/{cardId}`, `/api/vocabularies/{vocabularyId}/master`), `SrsController` (`/api/srs/due`, `/api/srs/review`)
  * Services: `ReviewService`, `FsrsSchedulerService`, `FsrsAlgorithm`, `SrsService`
  * Repository & Provider: `WordReviewRepository`, `SrsDataProvider` (JPA/Mongo)
  * Entity & DTO: `WordReview`, `ReviewLog`, `ReviewCardResponse`, `ReviewResultResponse`, `ReviewRequest`
  * Frontend: Tái sử dụng component `FlashcardCard.jsx` với 4 mức đánh giá FSRS (Again, Hard, Good, Easy) cùng các chỉ số dự phóng thời gian lặp lại (projected intervals).
* **Nghiệp vụ đặc thù**:
  * Lọc thẻ cần ôn hôm nay: So khớp `nextReview <= NOW()`, giới hạn cấu hình `review.daily-limit` (mặc định 20 từ).
  * Chống lặp từ: Tận dụng trực tiếp bảng `word_reviews` của user đã được lọc trùng (Deduplication Gateway).
  * **Quy tắc bảo toàn**: Giữ nguyên toàn bộ lịch sử và trạng thái `is_learned` của từ vựng đã học. Đảm bảo Entity/DTO không dùng Lombok theo đúng quy định kiến trúc.

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

---

## 8. Module Khóa Học JLPT N3 & Đọc Hiểu Trường Văn (JLPT N3 Course & Reading Module)
* **Mục tiêu**: Cung cấp lộ trình học JLPT N3 theo từng chương/bài (từ vựng, kanji, ngữ pháp, quiz), tự động sinh bài đọc hiểu Trường văn (1500–2500 ký tự) và bộ 10 câu hỏi đọc hiểu chuẩn JLPT N3 bằng DeepSeek AI.
* **Lớp tham gia**:
  * Controller: `JlptN3CourseController`
  * Services: `JlptN3CourseService`, `DeepSeekEnrichmentService`
  * Provider & Repository: `JlptN3DataProvider` (JPA/Mongo), `JlptN3ReadingRepository`, `JlptN3ReadingMongoRepository`
  * Model/Document: `JlptN3Reading`, `JlptN3ReadingDoc`, `JlptN3Progress`
  * Frontend: `JlptN3Page.jsx`, `JlptN3ReadingView.jsx`, `FuriganaText.jsx`
* **Quy tắc bảo đảm độ phủ kiến thức & Chất lượng AI (Coverage & AI Invariants)**:
  * **100% Sinh từ AI (Zero Fallback)**: Loại bỏ hoàn toàn fallback tĩnh. Toàn bộ nội dung bài đọc và 10 câu hỏi đọc hiểu 100% được sinh trực tiếp từ AI (`deepseek-chat`). Nếu gọi AI thất bại hoặc cấu hình thiếu key, hệ thống ném ngoại lệ rõ ràng (`IllegalStateException`/`RuntimeException`), không lưu dữ liệu giả vào Database.
  * **Vocabulary-First Storytelling**: Bài đọc không dùng chủ đề định sẵn hay mở bài sáo rỗng (`現代の社会において...`), mà tự động phân tích ngữ cảnh từ vựng bài học để chọn bối cảnh cốt truyện phù hợp.
  * **100% Ngữ pháp**: Toàn bộ các mẫu ngữ pháp của bài học bắt buộc phải xuất hiện trong văn cảnh bài đọc.
  * **> 50% Từ vựng**: Với mỗi bài học (~70–80 từ vựng), bài đọc bắt buộc phải lồng ghép tối thiểu hơn 50% tổng số từ vựng (ví dụ: $\ge 41/80$ từ).
  * **Độ dài**: 3000 – 4500 ký tự (chuẩn đại trường văn N3).
  * **Backend Verification & UI Metrics**: `JlptN3CourseService.calculateReadingCoverage` tính toán tỷ lệ bao phủ thực tế và trả về kèm payload để frontend hiển thị **Coverage Bar** và danh sách đối soát chi tiết.

---

## 9. Module Tổng Ôn Ngữ Pháp (Grammar Review Module)
* **Mục tiêu**: Gom toàn bộ ~244 mẫu ngữ pháp JLPT N3 vào ~10-35 nhóm chủ đề (mỗi nhóm ~5-15 mẫu) bằng DeepSeek AI clustering. Mỗi nhóm có view giới thiệu (mô tả, hướng dẫn cách dùng, trường hợp sử dụng, danh sách cấu trúc + ví dụ) kèm bộ 30 câu hỏi trắc nghiệm 3 dạng (MCQ / FILL_BLANK / CHOOSE_PATTERN). Hiển thị dưới Chương 9 Bài 3 trong trang JLPT N3.
* **Lớp tham gia**:
  * Controller: `JlptN3GrammarReviewController`
  * Service: `JlptN3GrammarReviewService`, `DeepSeekEnrichmentService` (`collectAllN3GrammarPatterns`, `clusterGrammarPatternsToGroups`, `generateGrammarGroupContent`)
  * Provider & Repository: `JlptN3DataProvider` (JPA/Mongo), `JlptN3GrammarGroupRepository`, `JlptN3GrammarGroupMongoRepository`, `JlptN3GrammarQuizRepository`, `JlptN3GrammarQuizMongoRepository`
  * Model/Document: `JlptN3GrammarGroup`, `JlptN3GrammarGroupDoc`, `JlptN3GrammarQuiz`, `JlptN3GrammarQuizDoc`, `GrammarQuestionType`
  * Migration: `V32__create_jlpt_n3_grammar_groups_table.sql`, `V33__add_grammar_group_and_review_fields.sql`
  * Frontend: `GrammarReviewSection.jsx`, `JlptN3Page.jsx`, `api.js` (`jlptN3GrammarReviewApi`)
* **Cơ chế & Quy tắc**:
  * **2-Phase AI Generation (token-safe)**: Phase 1 AI clustering theo `pattern_indices` (output nhỏ, ~2-4k tokens) → tạo groups; Phase 2 từng nhóm một gọi AI sinh `description`/`usage_guide`/`usage_cases` + 30 câu hỏi (~5-7k tokens/nhóm) để không vượt giới hạn token DeepSeek. Chạy nền async (`CompletableFuture.runAsync`), mất 10-20 phút.
  * **Không mất dữ liệu**: Pattern bị AI sót được phân bổ round-robin vào các nhóm; khi sinh lại xóa toàn bộ group + group quiz cũ (`deleteAllGroupQuizzes`) để tránh câu hỏi trùng.
  * **Pass rule**: Quiz nhóm đạt khi score ≥ 80% (24/30), lưu tại `jlpt_n3_progress` với `chapterId=0, lessonId=0` (`grammar_review_passed/score/best_score`).
  * **3 dạng câu hỏi**: `MCQ` (chọn đáp án), `FILL_BLANK` (điền vào chỗ trống), `CHOOSE_PATTERN` (chọn cấu trúc phù hợp) — cùng kiểu dữ liệu `QuestionDto {type, question, options, answer, explanation}`.

