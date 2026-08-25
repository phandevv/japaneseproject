# 🗄️ Database Schema & Lucene (.ai/knowledge/database.md)

Tài liệu này đặc tả chi tiết thiết kế cơ sở dữ liệu quan hệ (MySQL/H2) và kiến trúc lập chỉ mục tìm kiếm văn bản Hibernate Search / Apache Lucene của dự án.

---

## 1. Sơ đồ thực thể quan hệ (ERD - Entity Relationship Diagram)

Lược đồ cơ sở dữ liệu được tổ chức như sau:

```mermaid
erDiagram
    USERS ||--o| USER_SETTINGS : "has setting"
    USERS ||--o{ WORD_REVIEWS : "performs review"
    USERS ||--o{ STUDY_SESSIONS : "logs activity"
    USERS ||--o{ GRAMMAR_REVIEWS : "performs review"
    USERS ||--o{ CONVERSATIONS : "starts"
    USERS ||--o| SPEAKING_STATISTICS : "has"
    CONVERSATIONS ||--o{ CONVERSATION_MESSAGES : "contains"
    CONVERSATIONS ||--o{ CONVERSATION_CORRECTIONS : "identifies"
    CONVERSATIONS ||--o| REVIEW_RECOMMENDATIONS : "generates"
    VOCABULARY ||--o{ WORD_REVIEWS : "reviewed"
    GRAMMAR_CARDS ||--o{ GRAMMAR_REVIEWS : "reviewed"

    USERS {
        bigint id PK
        varchar username UK
        varchar password
        varchar role
        varchar avatar
        datetime created_at
    }

    CONVERSATIONS {
        bigint id PK
        bigint user_id FK
        varchar scenario
        varchar jlpt_level
        datetime start_time
        datetime end_time
        varchar status
    }

    CONVERSATION_MESSAGES {
        bigint id PK
        bigint conversation_id FK
        varchar sender
        text text_content
        text analysis_content
        datetime timestamp
    }

    CONVERSATION_CORRECTIONS {
        bigint id PK
        bigint conversation_id FK
        bigint message_id FK
        text original_text
        text corrected_text
        text explanation
        varchar type
        datetime created_at
    }

    SPEAKING_STATISTICS {
        bigint id PK
        bigint user_id FK
        int total_sessions
        int total_messages
        double avg_duration
        double avg_grammar_score
        double avg_vocab_score
        double avg_naturalness_score
        datetime last_active
    }

    REVIEW_RECOMMENDATIONS {
        bigint id PK
        bigint conversation_id FK
        text recommended_vocab
        text recommended_grammar
        text exercise_quiz
        datetime created_at
    }

    VOCABULARY {
        bigint id PK
        varchar kanji
        varchar hiragana
        varchar romaji
        varchar meaning
        varchar han_viet
        varchar word_type
        varchar level
        text kanji_words
        text sample_sentence
        text sample_translation
        text sample_reading
        varchar pitch_accent
        text synonyms
        text antonyms
        text common_mistakes
        text collocations
        text mnemonic
        text conversation_examples
    }

    GRAMMAR_CARDS {
        bigint id PK
        varchar grammar
        varchar meaning
        text formation
        text usage_desc
        text difference
        text similar_grammar
        text common_mistakes
        text examples
        text quizzes
        text reading_passage
        varchar jlpt
        varchar week_name
        varchar day_name
        varchar lesson_title
        datetime created_at
        datetime updated_at
    }

    GRAMMAR_REVIEWS {
        bigint id PK
        bigint user_id FK
        bigint grammar_card_id FK
        datetime next_review
        double ease_factor
        int interval_days
        int repetitions
        boolean is_learned
    }

    KNOWLEDGE_VERSIONS {
        bigint id PK
        varchar entity_type
        bigint entity_id
        int version
        text old_data
        varchar updated_by
        datetime created_at
    }

    USER_SETTINGS {
        bigint id PK
        bigint user_id FK
        varchar level
        int words_per_day
        text completed_days
    }

    WORD_REVIEWS {
        bigint id PK
        bigint user_id FK
        bigint vocab_id FK
        datetime next_review
        double ease_factor
        int interval_days
        int repetition
        boolean is_learned
    }

    STUDY_SESSIONS {
        bigint id PK
        bigint user_id FK
        date study_date
        int words_studied
        int correct_answers
        int total_questions
    }
```

---

## 2. Danh sách các tệp Migration (Flyway SQL Script)

Cơ sở dữ liệu được khởi tạo và nâng cấp thông qua Flyway tại thư mục `backend/src/main/resources/db/migration/`:

* **`V1__init_schema.sql`**: Khởi tạo cấu trúc các bảng gốc `users`, `vocabulary`, `user_settings`, `word_reviews`, `study_sessions` và thiết lập khóa ngoại.
* **`V2__add_user_avatar.sql`**: Thêm cột `avatar` vào bảng `users` phục vụ đổi ảnh đại diện.
* **`V3__add_profile_fields.sql`**: Nâng cấp các trường thông tin trong bảng `users` (nếu có bổ sung).
* **`V4__add_completed_days.sql`**: Thêm cột `completed_days` (kiểu TEXT) trong `user_settings` để lưu danh sách các ngày đã hoàn thành của từng cấp độ học.
* **`V5__add_romaji.sql`**: Thêm cột `romaji` trong bảng `vocabulary` để lưu phiên âm Latin, hỗ trợ gõ tìm kiếm Romaji.
* **`V6__add_word_review_tracking.sql`**: Thêm cột `is_learned` (Boolean) vào bảng `word_reviews` để theo dõi chính xác trạng thái từ đã học của học viên, phục vụ quy tắc bảo toàn từ đã học khi ôn tập fail.
* **`V12__ai_knowledge_base.sql`**: Bổ sung các cột dữ liệu làm giàu vào bảng `vocabulary` và tạo các bảng mới `grammar_cards`, `grammar_reviews`, `knowledge_versions` hỗ trợ tính năng **AI Personal Japanese Knowledge Base** lưu trữ tri thức lâu dài, lập lịch ôn tập và kiểm soát lịch sử phiên bản.
* **`V14__ai_conversation_tutor.sql`**: Khởi tạo cấu trúc bảng lưu trữ các cuộc hội thoại (`conversations`), tin nhắn hội thoại (`conversation_messages`), phân tích lỗi sai (`conversation_corrections`), thống kê nói (`speaking_statistics`), và đề xuất ôn tập/mini-quiz (`review_recommendations`) hỗ trợ module **Gia sư Đóng vai Hội thoại AI**.

---

## 3. Cấu hình Hibernate Search & Apache Lucene Index

Để hỗ trợ tìm kiếm mờ thời gian thực hiệu năng cao, dự án sử dụng **Hibernate Search** kết hợp **Apache Lucene**:

* Lớp `Vocabulary.java` được đánh dấu annotation `@Indexed`.
* Các trường được lập chỉ mục tìm kiếm (`@FullTextField` hoặc `@KeywordField`):
  * `kanji`: Phục vụ tìm kiếm Hán tự.
  * `hiragana`: Phục vụ tìm kiếm chữ viết Kana.
  * `romaji`: Phục vụ tìm kiếm bằng phiên âm Latin.
  * `meaning`: Phục vụ tìm kiếm bằng nghĩa tiếng Việt.
* Lớp `SearchIndexer.java` thực hiện quét toàn bộ bảng từ vựng trong DB và khởi tạo chỉ mục Lucene lưu trên ổ đĩa cứng khi ứng dụng Spring Boot vừa khởi chạy:
  ```java
  SearchSession searchSession = Search.session(entityManager);
  MassIndexer indexer = searchSession.massIndexer(Vocabulary.class);
  indexer.startAndWait();
  ```
* Đường dẫn lưu file index ở môi trường sản xuất (EC2/Docker): `/data/lucene-index`.
* Môi trường local: `./data/lucene-index`.

---

## 4. Cấu trúc MongoDB Collections (JLPT N3 Course & Quizzes)

Hệ thống lưu trữ dữ liệu khóa học JLPT N3 và bộ 520 câu trắc nghiệm trực tiếp trong MongoDB:
* **`jlpt_n3_lesson_quizzes`**: Chứa 20 câu hỏi trắc nghiệm kèm dịch câu, giải thích đáp án cho 26 bài học N3 (tổng 520 câu).
  * `_id`: `chapterId * 10 + lessonId`
  * `chapterId`, `lessonId`, `totalQuestions`: 20
  * `questions`: Danh sách 20 đối tượng câu hỏi (`id`, `question`, `translation`, `answer`, `options`)
  * `questionsJson`: Chuỗi JSON nạp siêu tốc
  * Index: `{ chapterId: 1, lessonId: 1 }`
* **`jlpt_n3_progress`**: Tiến độ học từng bài của học viên (`vocabPassed`, `kanjiPassed`, `grammarPassed`, `quizPassed`, `completed`, `bestScore`).
* **`jlpt_n3_grammar_quizzes`**: Bộ 30 câu hỏi trắc nghiệm ngữ pháp AI tạo.

