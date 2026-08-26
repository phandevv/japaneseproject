# 🔌 API Endpoint Documentation (.ai/knowledge/api.md)

Tài liệu này đặc tả toàn bộ danh sách REST API endpoints được xuất bản bởi Backend Spring Boot. Tất cả API đều sử dụng tiền tố mặc định `/api`.

---

## 1. Module Xác Thực (Authentication) - `AuthController`

### A. Đăng ký tài khoản
* **Endpoint**: `POST /api/auth/register`
* **Xác thực**: Không yêu cầu (Public)
* **Request Body**:
  ```json
  {
    "username": "user123",
    "password": "strongpassword"
  }
  ```
* **Phản hồi thành công (200 OK)**:
  ```json
  {
    "message": "User registered successfully"
  }
  ```
* **Lỗi có thể xảy ra**: `400 Bad Request` nếu username đã tồn tại hoặc password quá ngắn.

### B. Đăng nhập
* **Endpoint**: `POST /api/auth/login`
* **Xác thực**: Không yêu cầu (Public)
* **Request Body**:
  ```json
  {
    "username": "user123",
    "password": "strongpassword"
  }
  ```
* **Phản hồi thành công (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 1,
      "username": "user123",
      "role": "USER",
      "avatar": "avatar_default.png"
    }
  }
  ```
* **Lỗi có thể xảy ra**: `401 Unauthorized` nếu sai thông tin đăng nhập.

### C. Lấy thông tin tài khoản hiện tại
* **Endpoint**: `GET /api/auth/me`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**:
  ```json
  {
    "id": 1,
    "username": "user123",
    "role": "USER",
    "avatar": "avatar_default.png"
  }
  ```

---

## 2. Module Từ Vựng (Vocabulary) - `VocabularyController`

### A. Lấy từ vựng phân trang theo cấp độ
* **Endpoint**: `GET /api/vocab/level/{level}?page={page}&size={size}`
* **Tham số**:
  * `level`: Cấp độ học (`N5`, `N4`, `N3`, `N2`, `N1`, `TU_LAY`, `TRO_TU`)
  * `page` (Query): Số trang (0-indexed, mặc định 0)
  * `size` (Query): Số phần tử mỗi trang (mặc định 20)
* **Xác thực**: Không yêu cầu (Public)
* **Phản hồi thành công (200 OK)**:
  ```json
  {
    "content": [
      {
        "id": 12,
        "kanji": "食べる",
        "hiragana": "たべる",
        "romaji": "taberu",
        "meaning": "ăn",
        "hanViet": "Thực",
        "wordType": "Động từ",
        "level": "N5"
      }
    ],
    "last": false,
    "totalPages": 50,
    "totalElements": 1000
  }
  ```

### B. Tìm kiếm mờ (Fuzzy Search)
* **Endpoint**: `GET /api/vocab/search?query={text}`
* **Xác thực**: Không yêu cầu (Public)
* **Phản hồi thành công (200 OK)**:
  Danh sách mảng từ vựng trùng khớp (tối đa 50 từ).

### C. Làm giàu dữ liệu từ vựng qua DeepSeek
* **Endpoint**: `POST /api/vocab/{id}/enrich`
* **Xác thực**: Yêu cầu Token (vì gọi AI tốn chi phí và tránh bị spam)
* **Phản hồi thành công (200 OK)**:
  Trả về thực thể `Vocabulary` sau khi đã được làm giàu các trường dữ liệu ví dụ và từ Kanji liên quan.

---

## 3. Module Ôn Luyện Giãn Cách (SRS) - `SrsController`

### A. Lấy từ đến hạn ôn tập
* **Endpoint**: `GET /api/srs/due`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**:
  Danh sách từ vựng cần ôn tập hôm nay (ngày `nextReview` $\le$ hiện tại).

### B. Gửi kết quả đánh giá ôn tập
* **Endpoint**: `POST /api/srs/review?vocabId={id}&quality={quality}`
* **Tham số**:
  * `vocabId`: ID của từ vựng vừa ôn tập
  * `quality`: Điểm số đánh giá từ `1` đến `4`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**: Bản ghi `WordReview` đã cập nhật.

### C. Lấy thống kê số từ đã học
* **Endpoint**: `GET /api/srs/learned-stats`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**:
  ```json
  {
    "learnedCount": 120,
    "learnedToday": 15
  }
  ```

### D. Lấy ngẫu nhiên danh sách từ đã học
* **Endpoint**: `GET /api/srs/random-learned?limit={limit}`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**: Danh sách từ vựng đã học phục vụ ôn tập tự do.

---

## 4. Module Cài Đặt Người Dùng (Settings) - `UserSettingController`

### A. Lấy cài đặt theo cấp độ
* **Endpoint**: `GET /api/settings/{level}`
* **Xác thực**: Yêu cầu Token

### B. Lưu cài đặt số từ mỗi ngày
* **Endpoint**: `POST /api/settings/{level}?wordsPerDay={count}`
* **Xác thực**: Yêu cầu Token

### C. Đánh dấu ngày hoàn thành bài học
* **Endpoint**: `POST /api/settings/{level}/complete-day?day={day}`
* **Xác thực**: Yêu cầu Token

---

## 5. Module Personal Knowledge Base - `KnowledgeController`

### A. Chuẩn hóa và làm giàu đầu vào bất kỳ (Normalize & Enrich)
* **Endpoint**: `POST /api/knowledge/collect`
* **Xác thực**: Yêu cầu Token
* **Request Body**:
  ```json
  {
    "input": "hazukashii"
  }
  ```
* **Phản hồi thành công (200 OK)**:
  ```json
  {
    "type": "vocabulary",
    "normalizedInput": "恥ずかしい",
    "existsInDb": true,
    "enrichmentData": {
      "word": "恥ずかしい",
      "reading": "はずかしい",
      "meaning": "xấu hổ, e thẹn",
      "pitchAccent": "4",
      "mnemonic": "Bộ Tâm (忄) đứng bên chữ Nhĩ (耳) nghĩa là nghe thấy điều xấu hổ thì đỏ tai ấm lòng...",
      "synonyms": "[\"気恥ずかしい\"]",
      "antonyms": "[\"誇らしい\"]",
      "collocations": "[\"恥ずかしい思いをする\"]",
      "exampleSentences": "[{\"ja\":\"間違えて恥ずかしい。\",\"reading\":\"まちがえてはずかしい。\",\"vi\":\"Tôi làm sai nên thấy xấu hổ.\"}]"
    }
  }
  ```

### B. Lưu thẻ kiến thức (Save Knowledge Card)
* **Endpoint**: `POST /api/knowledge/save`
* **Xác thực**: Yêu cầu Token
* **Request Body**:
  ```json
  {
    "type": "vocabulary",
    "data": {
      "word": "恥ずかしい",
      "reading": "はずかしい",
      "meaning": "xấu hổ",
      "...": "..."
    }
  }
  ```
* **Phản hồi thành công (200 OK)**:
  ```json
  {
    "status": "success",
    "id": 15,
    "type": "vocabulary"
  }
  ```

### C. Lấy số lượng cấu trúc ngữ pháp đến hạn ôn tập
* **Endpoint**: `GET /api/knowledge/grammar/due-count`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**:
  ```json
  {
    "dueCount": 5
  }
  ```

### D. Lấy danh sách cấu trúc ngữ pháp cần ôn tập
* **Endpoint**: `GET /api/knowledge/grammar/due-list`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**: Mảng chứa các đối tượng `GrammarCard` đến hạn.

### E. Gửi đánh giá ôn tập Ngữ pháp
* **Endpoint**: `POST /api/knowledge/grammar/review`
* **Xác thực**: Yêu cầu Token
* **Request Body**:
  ```json
  {
    "grammarId": 12,
    "quality": 3
  }
  ```
* **Phản hồi thành công (200 OK)**: Trả về đối tượng `GrammarReview` sau khi đã áp dụng SM-2 tái lập lịch.

### F. Kiến tạo bài đọc hiểu cá nhân hóa (Personal Corpus Reading)
* **Endpoint**: `POST /api/knowledge/corpus/generate-reading`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**:
  ```json
  {
    "title": "...",
    "titleReading": "...",
    "passage": "...",
    "passageReading": "...",
    "translation": "...",
    "quiz": {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "explanation": "..."
    }
  }
  ```

### G. Kiến tạo hội thoại đàm thoại cá nhân hóa (Personal Corpus Conversation)
* **Endpoint**: `POST /api/knowledge/corpus/generate-conversation`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**:
  ```json
  {
    "scenario": "...",
    "dialogues": [
      { "speaker": "A", "ja": "...", "reading": "...", "vi": "..." }
    ]
  }
  ```

---

## 7. Module Gia sư Đóng vai Hội thoại AI (AI Japanese Conversation Tutor)

### A. Giao diện WebSocket thời gian thực (WebSocket Endpoint)
* **Endpoint**: `ws://localhost:8080/ws/conversation` hoặc `wss://[domain]/ws/conversation`
* **Xác thực**: Gửi token JWT thông qua payload handshake.
* **Bản tin Client gửi lên**:
  * Khởi động phiên học:
    ```json
    { "type": "CONNECT_SESSION", "token": "JWT_TOKEN", "scenario": "Cafe", "jlpt": "N3" }
    ```
  * Gửi thoại:
    ```json
    { "type": "SEND_TEXT", "text": "Konnichiwa" }
    ```
  * Kết thúc học:
    ```json
    { "type": "END_SESSION" }
    ```
* **Bản tin Server trả về**:
  * Kết nối thành công:
    ```json
    { "type": "SESSION_CONNECTED", "conversationId": 1, "scenario": "Cafe", "jlpt": "N3" }
    ```
  * AI đang suy nghĩ:
    ```json
    { "type": "AI_THINKING" }
    ```
  * Luồng phân đoạn text AI (Stream chunk):
    ```json
    { "type": "STREAM_TEXT_CHUNK", "text": "こんにちは", "isFinal": false }
    ```
  * AI nói xong:
    ```json
    { "type": "AI_SPEAKING" }
    ```
  * Kết thúc phiên thành công:
    ```json
    { "type": "SESSION_COMPLETED", "conversationId": 1 }
    ```

### B. REST APIs bổ trợ - `ConversationController`

#### 1. Lấy lịch sử phiên hội thoại
* **Endpoint**: `GET /api/conversations/history`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**: Danh sách các phiên hội thoại (`Conversation[]`).

#### 2. Lấy chi tiết phiên hội thoại
* **Endpoint**: `GET /api/conversations/{id}`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**: Đối tượng `Conversation`.

#### 3. Lấy tin nhắn của phiên hội thoại (chứa Layer 2 Analysis)
* **Endpoint**: `GET /api/conversations/{id}/messages`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**: Danh sách `ConversationMessage[]` kèm metadata ẩn.

#### 4. Lấy danh sách sửa lỗi hội thoại
* **Endpoint**: `GET /api/conversations/{id}/corrections`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**: Danh sách `ConversationCorrection[]`.

#### 5. Lấy báo cáo tổng kết (End-of-Session Report)
* **Endpoint**: `GET /api/conversations/{id}/report`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**: Báo cáo `ReviewRecommendation` chứa tóm tắt, điểm số KPI, từ vựng & ngữ pháp trích xuất, bài tập quiz trắc nghiệm.

#### 6. Lấy thống kê nói tổng quan của học viên
* **Endpoint**: `GET /api/conversations/stats`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**: Đối tượng `SpeakingStatistics`.

#### 7. Lưu từ vựng trích xuất vào CSDL cá nhân (Knowledge Extraction)
* **Endpoint**: `POST /api/conversations/knowledge/save-vocab`
* **Xác thực**: Yêu cầu Token
* **Request Body**:
  ```json
  {
    "kanji": "言葉",
    "hiragana": "ことば",
    "meaning": "Từ vựng, từ ngữ",
    "level": "N3"
  }
  ```
* **Phản hồi thành công (200 OK)**: `{"message": "Đã lưu từ vựng vào Thư viện cá nhân thành công!"}`

#### 8. Lưu ngữ pháp trích xuất vào CSDL cá nhân (Knowledge Extraction)
* **Endpoint**: `POST /api/conversations/knowledge/save-grammar`
* **Xác thực**: Yêu cầu Token
* **Request Body**:
  ```json
  {
    "grammar": "~はずだ",
    "meaning": "Chắc chắn là...",
    "usageDesc": "Ví dụ: 彼は今日来るはずだ。",
    "jlpt": "N3"
  }
  ```
* **Phản hồi thành công (200 OK)**: `{"message": "Đã lưu ngữ pháp vào Thư viện cá nhân thành công!"}`

---

## 10. Module Ngữ Pháp JLPT (Grammar) - `GrammarController`

### A. Lấy danh sách mẫu ngữ pháp (Phân trang, Lọc Tuần/Ngày/Search)
* **Endpoint**: `GET /api/grammar`
* **Tham số**:
  * `jlpt` (Query): Cấp độ JLPT (mặc định `N3`)
  * `week` (Query): Lọc theo Tuần (ví dụ: `Tuần 1`)
  * `day` (Query): Lọc theo Ngày (ví dụ: `Ngày 1`)
  * `query` (Query): Từ khóa tìm kiếm mẫu ngữ pháp / nghĩa tiếng Việt
  * `page` (Query): Trang (mặc định 0)
  * `size` (Query): Kích thước trang (mặc định 50)
* **Xác thực**: Không yêu cầu (Public)
* **Phản hồi thành công (200 OK)**:
  ```json
  {
    "content": [
      {
        "id": 1,
        "grammar": "～書かれている",
        "meaning": "Bị, được (Bị động)",
        "usageDesc": "Dùng tường thuật lại một sự việc...",
        "formation": "Vれる（受身）",
        "jlpt": "N3",
        "weekName": "Tuần 1",
        "dayName": "Ngày 1",
        "lessonTitle": "第1週 (1) – 僕にもやらせて",
        "examples": "1. この本には...\n 👉 Trong cuốn sách..."
      }
    ],
    "currentPage": 0,
    "totalItems": 132,
    "totalPages": 3
  }
  ```

### B. Lấy cấu trúc cây điều hướng Tuần & Ngày
* **Endpoint**: `GET /api/grammar/navigation?jlpt=N3`
* **Xác thực**: Không yêu cầu (Public)
* **Phản hồi thành công (200 OK)**:
  ```json
  [
    {
      "week": "Tuần 1",
      "days": ["Ngày 1", "Ngày 2", "Ngày 3", "Ngày 4", "Ngày 5", "Ngày 6"]
    }
  ]
  ```

### C. Lấy chi tiết một mẫu ngữ pháp
* **Endpoint**: `GET /api/grammar/{id}`
* **Xác thực**: Không yêu cầu (Public)
* **Phản hồi thành công (200 OK)**: Đối tượng `GrammarCard`.

---

## 10. Module Khóa học JLPT N3 & Trắc nghiệm Bài học (JLPT N3 Course & Lesson Quiz)

### A. Lấy tổng quan tiến độ khóa học N3
* **Endpoint**: `GET /api/jlpt-n3/overview`
* **Xác thực**: Tùy chọn (Yêu cầu Token để tính tiến độ cá nhân)

### B. Lấy nội dung chi tiết bài học (Từ vựng, Hán tự, Ngữ pháp)
* **Endpoint**: `GET /api/jlpt-n3/chapter/{chapter}/lesson/{lesson}`
* **Xác thực**: Tùy chọn

### C. Lấy 20 câu hỏi trắc nghiệm bài học (Lesson Quiz)
* **Endpoint**: `GET /api/jlpt-n3/chapter/{chapter}/lesson/{lesson}/quiz`
* **Xác thực**: Không yêu cầu (Lấy trực tiếp từ MongoDB collection `jlpt_n3_lesson_quizzes`)

### D. Nộp bài trắc nghiệm 20 câu và cập nhật tiến độ Pass (100%)
* **Endpoint**: `POST /api/jlpt-n3/chapter/{chapter}/lesson/{lesson}/quiz/submit`
* **Xác thực**: Yêu cầu Token
* **Request Body**:
  ```json
  {
    "score": 20,
    "total": 20
  }
  ```
* **Quy tắc Pass**: Đạt đúng `score == total` (100% / 20/20 câu) sẽ đánh dấu `quizPassed: true` và `completed: true` trong Database.

---

## 11. Module Analytics & Streak Repair - `AnalyticsController`

### A. Lấy thống kê Dashboard người dùng
* **Endpoint**: `GET /api/analytics/dashboard`
* **Xác thực**: Yêu cầu Token
* **Phản hồi thành công (200 OK)**:
  ```json
  {
    "dueCount": 12,
    "learnedCount": 150,
    "wordsStudiedToday": 20,
    "todayDurationMinutes": 65,
    "streak": 5,
    "streakFrozenToday": false,
    "repairsUsedToday": 0,
    "repairsUsedThisMonth": 1,
    "maxRepairsPerMonth": 5,
    "canRepairToday": true,
    "history": [...]
  }
  ```

### B. Ghi nhận thời gian & phiên học (Session Logging)
* **Endpoint**: `POST /api/analytics/session`
* **Xác thực**: Yêu cầu Token
* **Request Body**:
  ```json
  {
    "wordsStudied": 10,
    "correctAnswers": 10,
    "totalQuestions": 10,
    "durationMinutes": 15,
    "date": "2026-08-26"
  }
  ```
* **Phản hồi thành công (200 OK)**:
  ```json
  {
    "message": "Session recorded",
    "date": "2026-08-26",
    "wordsStudied": 10,
    "durationMinutes": 15
  }
  ```

### C. Thực hiện Điểm danh bù (Streak Repair)
* **Endpoint**: `POST /api/analytics/streak-repair`
* **Xác thực**: Yêu cầu Token
* **Request Body**:
  ```json
  {
    "targetDate": "2026-08-25"
  }
  ```
* **Phản hồi thành công (200 OK)**:
  ```json
  {
    "message": "Điểm danh bù thành công cho ngày 2026-08-25! 🌸",
    "targetDate": "2026-08-25",
    "newStreak": 6,
    "repairsUsedToday": 1,
    "repairsUsedThisMonth": 2,
    "remainingRepairsThisMonth": 3
  }
  ```
* **Lỗi thường gặp (400 Bad Request)**:
  * Học chưa đủ 60 phút hôm nay.
  * Đã dùng tối đa 1 lượt bù trong ngày.
  * Đã dùng hết 5 lượt bù trong tháng.
  * Ngày đã được hoàn thành/điểm danh từ trước.




