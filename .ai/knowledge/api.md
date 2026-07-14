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

