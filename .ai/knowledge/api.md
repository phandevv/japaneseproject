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
