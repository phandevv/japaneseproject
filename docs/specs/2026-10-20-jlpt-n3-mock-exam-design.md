# Thiết Kế Chi Tiết: Module Thi Thử JLPT N3 (Mock Exam)

- **Ngày tạo**: 2026-10-20
- **Trạng thái**: Draft / Đang thảo luận kiến trúc
- **Tác giả**: Pair Programming (NihongoCards Architecture Team)
- **Mục tiêu**: Xây dựng hệ thống thi thử JLPT N3 hoàn chỉnh, hỗ trợ 30 đợt thi (2010 - 2025) từ bộ tài liệu thực tế, timer độc lập từng section, đồng bộ Choukai audio, bảo mật đáp án, giao diện Glassmorphism Vanilla CSS và lưu trữ lịch sử thi.

---

## 1. Kết Quả Khảo Sát & Thống Kê Dữ Liệu Thực Tế

Nguồn dữ liệu: `C:\Users\bbqdd\Documents\_jsn3\doc\De_thi Jlpt n3`

| Hạng mục | Số lượng thực tế | Ghi chú |
|---|---|---|
| **Số năm** | 16 năm | Từ năm 2010 đến 2025 |
| **Số đợt thi** | 30 đợt thi | Từ đợt 7/2010 đến 12/2025 (năm 2020 chỉ có tháng 12 do tháng 7 hủy vì dịch) |
| **Tổng số tệp** | 121 tệp | 61 tệp PDF, 30 tệp MP3, 30 tệp RAR |
| **Tệp Đề thi PDF** | 30 tệp | Chữ số hóa sắc nét (selectable text), nhúng hình ảnh minh họa tranh vẽ và biểu đồ |
| **Tệp Script nghe PDF** | 30 tệp | Bản chép lời hội thoại kèm đáp án `(正解: X)` cho từng câu |
| **Tệp Đáp án Master** | 1 tệp | `ĐÁP ÁN JLPT N3 (update 15.10.2026).pdf` (32 trang, trang 2-31 khớp 1-1 với 30 đợt thi) |
| **Tệp Âm thanh Listening** | 30 tệp MP3 | Trọn vẹn audio Choukai ~35-40 phút mỗi đề |

---

## 2. Cấu Trúc Đề Thi JLPT N3 Chuẩn Hóa

Mỗi đề thi được phân rã thành **3 Section độc lập** có thời gian và quy tắc riêng:

```text
JLPT N3 (101 - 102 câu / 140 phút)
├── 1. 言語知識（文字・語彙） (30 phút, 35 câu)
│    ├── 問題 1: Đọc Kanji (8 câu: 1 - 8)
│    ├── 問題 2: Viết Kanji (6 câu: 9 - 14)
│    ├── 問題 3: Từ vựng theo ngữ cảnh (11 câu: 15 - 25)
│    ├── 問題 4: Từ gần nghĩa / Phân tích nghĩa (5 câu: 26 - 30)
│    └── 問題 5: Cách dùng từ trong câu (5 câu: 31 - 35)
│
├── 2. 言語知識（文法）・読解 (70 phút, 38 câu)
│    ├── [Ngữ pháp - 22 câu]
│    │    ├── 問題 1: Dạng ngữ pháp đúng (13 câu: 1 - 13)
│    │    ├── 問題 2: Sắp xếp từ tìm vị trí ngôi sao ★ (5 câu: 14 - 18)
│    │    └── 問題 3: Ngữ pháp trong đoạn văn (4 câu: 19 - 22)
│    └── [Đọc hiểu - 16 câu]
│         ├── 問題 4: Đoạn văn ngắn (4 câu: 23 - 26)
│         ├── 問題 5: Đoạn văn vừa (6 câu: 27 - 32)
│         ├── 問題 6: Đoạn văn dài (4 câu: 33 - 36)
│         └── 問題 7: Tìm kiếm thông tin / Biểu bảng (2 câu: 37 - 38)
│
└── 3. 聴解 (40 phút, 28 - 29 câu)
     ├── 問題 1: 課題理解 (Hiểu nhiệm vụ - 6 câu)
     ├── 問題 2: ポイント理解 (Hiểu điểm mấu chốt - 6 câu)
     ├── 問題 3: 概要理解 (Hiểu ý chính - 3 câu, không in chữ trong đề)
     ├── 問題 4: 発問表現 (Diễn đạt theo tranh - 4 câu, có hình vẽ kèm mũi tên ➞)
     └── 問題 5: 即時応答 (Phản xạ tức thì - 9 câu, nghe và chọn phản hồi 1, 2, 3)
```

---

## 3. Kiến Trúc Lưu Trữ Dữ Liệu (Hybrid Architecture)

### 3.1. Phân Tách Dữ Liệu Tĩnh vs Dữ Liệu Động
1. **Nội dung Đề thi (Static JSON Dataset)**:
   - Lưu tại `backend/src/main/resources/data/exams/n3/{examId}.json`.
   - Lưu hình ảnh cắt từ đề tại `backend/src/main/resources/static/exams/images/{examId}/...`.
   - Lưu audio tại `backend/src/main/resources/static/exams/audio/{examId}.mp3` (hoặc thư mục ngoài `data/exams/media/`).
   - **Ưu điểm**:
     - Thêm năm thi mới (2026, 2027) hoặc cấp độ mới (N2, N4) chỉ cần thả file JSON và media vào, không sửa code, không cần Flyway SQL migrations nặng nề.
     - Dễ dàng versioning trên Git, dễ viết script validation JSON tự động trước khi release.
     - Backend giấu `correctAnswer` và `explanation` khi client đang làm bài; chỉ trả về khi submit hoặc review kết quả.
2. **Lịch sử Làm bài & Kết quả (Relational Database qua Flyway V34)**:
   - Bảng `mock_exam_attempts`: Lưu phiên thi của người dùng (`user_id`, `exam_id`, `status`, `started_at`, `completed_at`, `current_section_index`, `raw_score`, `percentage`, `section_results_json`).
   - Bảng `mock_exam_answers`: Lưu từng câu trả lời của user để khôi phục bài thi khi reload trang hoặc xem lại kết quả chi tiết.

### 3.2. Cấu Trúc Bảng Database (Dual H2 & MySQL Compatible)

```sql
-- Flyway V34__create_mock_exam_tables.sql
CREATE TABLE mock_exam_attempts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    exam_id VARCHAR(50) NOT NULL,
    level VARCHAR(10) NOT NULL,
    exam_year INT NOT NULL,
    exam_month INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    current_section_index INT NOT NULL DEFAULT 0,
    section_time_left_sec INT NOT NULL DEFAULT 0,
    total_correct INT NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    percentage DOUBLE NOT NULL DEFAULT 0.0,
    section_results_json TEXT,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    CONSTRAINT fk_mock_exam_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE mock_exam_answers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    section_id VARCHAR(50) NOT NULL,
    question_id VARCHAR(50) NOT NULL,
    selected_choice INT,
    is_correct BOOLEAN,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_mock_exam_attempt FOREIGN KEY (attempt_id) REFERENCES mock_exam_attempts(id) ON DELETE CASCADE
);

CREATE INDEX idx_mock_attempt_user ON mock_exam_attempts(user_id, status);
CREATE INDEX idx_mock_answer_attempt ON mock_exam_answers(attempt_id, section_id);
```

---

## 4. Đặc Tả Cơ Chế Listening & Đồng Bộ Timestamp

- **Audio Track**: Mỗi đề thi có 1 file MP3 liên tục toàn bộ phần nghe.
- **Timestamp Mapping**: Trong file JSON của đề, mỗi câu hỏi nghe có thuộc tính `audioStartSec` và `audioEndSec`.
- **Trình phát (Player)**:
  - Khi bắt đầu Section 3 (聴解), trình phát tự động kích hoạt.
  - Vị trí phát được theo dõi qua state `currentTime`.
  - Hệ thống tự động highlight câu hỏi đang phát, cuộn màn hình đến câu tương ứng và hiển thị hình minh họa nếu là Mondai 4 hoặc câu có tranh.
  - Ở chế độ Thi Thật: Audio chạy một chiều liên tục theo đúng đề thi; hết thời gian tự động nộp bài.
  - Ở chế độ Luyện Tập: Người dùng có thể nhấn nghe lại từng câu hoặc nhảy tới mốc thời gian của câu hỏi.

---

## 5. Danh Sách Endpoint REST API

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| `GET` | `/api/mock-exams` | Public / Auth | Danh sách các đề thi có sẵn (năm, tháng, số câu, thời gian) |
| `GET` | `/api/mock-exams/{examId}` | Public / Auth | Lấy cấu trúc đề thi (đã giấu đáp án đúng) |
| `POST` | `/api/mock-exams/{examId}/start` | Authenticated | Bắt đầu một lượt thi mới (hoặc trả về lượt thi đang dở dang) |
| `POST` | `/api/mock-exams/attempts/{attemptId}/save-progress` | Authenticated | Lưu tiến độ tạm thời (lựa chọn, thời gian còn lại) |
| `POST` | `/api/mock-exams/attempts/{attemptId}/submit-section` | Authenticated | Nộp bài một section và chuyển tiếp section |
| `POST` | `/api/mock-exams/attempts/{attemptId}/submit-all` | Authenticated | Hoàn thành bài thi, chấm điểm toàn bộ, trả về kết quả |
| `GET` | `/api/mock-exams/attempts/{attemptId}/result` | Authenticated | Xem lại kết quả chi tiết bài thi đã hoàn thành |
| `GET` | `/api/mock-exams/history` | Authenticated | Lịch sử các lần thi của người dùng hiện tại |
| `GET` | `/api/mock-exams/media/audio/{filename}` | Public | Stream file audio listening |
| `GET` | `/api/mock-exams/media/images/{filename}` | Public | Phục vụ file ảnh bài thi |

---

## 6. Trải Nghiệm Giao Diện Người Dùng (UX/UI Spec)

1. **Trang Danh Sách Đề (`/mock-exams`)**:
   - Bộ lọc theo năm (2025, 2024, ..., 2010), tháng (Tháng 7, Tháng 12).
   - Thẻ hiển thị từng đề thi với thông số: 3 Phần thi, 140 phút, ~102 câu.
   - Trạng thái của user: "Chưa thi", "Đang làm dở (Tiếp tục)", "Đã hoàn thành: 78/102 (76%)".
2. **Màn Hình Làm Bài (Exam Runner - Focus Mode)**:
   - Tối giản, không có sidebar, header tinh gọn cố định ở trên.
   - **Thanh trạng thái đầu trang**:
     - Tên đề: `JLPT N3 - Tháng 7/2025`
     - Tab Section hiện tại: `[1. 文字・語彙 30p]` → `[2. 文法・読解 70p]` → `[3. 聴解 40p]`
     - Đồng hồ đếm ngược (Countdown Timer) lớn, dễ nhìn, đổi sang màu đỏ cảnh báo khi còn < 5 phút.
     - Nút "Nộp phần thi này".
   - **Khu vực làm bài (Chia 2 cột)**:
     - **Cột trái (72%)**:
       - Hiển thị bài đọc (Passage) có thanh cuộn riêng nếu là phần 読解.
       - Danh sách câu hỏi rõ ràng, font tiếng Nhật chuẩn (`Noto Sans JP` / `system-ui`).
       - Nút chọn đáp án to, hiệu ứng active nổi bật.
       - Đối với 聴解: Thanh audio player có waveform/progess, câu hỏi và tranh vẽ phóng to dễ nhìn.
     - **Cột phải (28%)**:
       - Bảng lưới câu hỏi (Question Navigation Matrix) hiển thị toàn bộ câu trong Section.
       - Trạng thái từng câu: Xanh (Đã trả lời), Xám (Chưa làm), Vàng nhấp nháy (Đang xem).
       - Nhấn vào số câu lập tức cuộn mượt đến vị trí câu đó.
3. **Cơ Chế Bảo Vệ Tiến Trình (Anti-loss & Auto-submit)**:
   - Tự động lưu lựa chọn sau mỗi 5 giây vào LocalStorage và định kỳ đồng bộ lên Server.
   - Cảnh báo người dùng khi có thao tác tải lại trang (`beforeunload`).
   - Khi Timer chạm `00:00:00`, tự động khóa form và gửi bài submit section lên server ngay lập tức.
4. **Màn Hình Kết Quả & Review**:
   - Thống kê tổng quan: Điểm số, phần trăm, số câu đúng / tổng số câu.
   - Thống kê phân khoa:
     - 言語知識: XX / 35
     - 読解: XX / 38
     - 聴解: XX / 28
   - Chế độ xem lại bài làm (Review Mode): Hiển thị câu hỏi, đáp án đã chọn (Đúng: xanh lá, Sai: đỏ) và đáp án chính xác kèm giải thích / script nghe.

---

## 7. Quy Trình Trích Xuất & Xây Dựng Parser Đề Thi (Extractor Pipeline)

Để chuyển đổi 30 đề thi PDF thành các tệp JSON chuẩn hóa mà không làm mất cấu trúc gốc:
1. **Script phân tích & bóc tách đề (Python `pdf_extractor.py`)**:
   - Đọc từng trang PDF đề thi.
   - Tách theo header `問題 1`, `問題 2`,... và số câu `1 `, `2 `, ` 9 `, ` 10 `,...
   - Trích xuất ảnh tranh vẽ (ví dụ `Image82.jpg`, `Image94.jpg`...) và lưu vào thư mục `static/exams/images/`.
2. **Script bóc tách đáp án (Python `answer_extractor.py`)**:
   - Đọc 30 trang tương ứng trong `ĐÁP ÁN JLPT N3 (update 15.10.2026).pdf`.
   - Bóc tách theo bảng đáp án từng 問題, đối soát chéo với `(正解: X)` trong script nghe.
3. **Script tổng hợp & thẩm định (Python `validator.py`)**:
   - Tự động kiểm tra:
     - Số câu trong từng 問題 có đủ và liên tục hay không (không thiếu câu, không trùng số câu).
     - Đáp án có nằm trong khoảng 1 - 4 (hoặc 1 - 3 đối với Mondai 4, 5 nghe) hay không.
     - Tệp audio và image tham chiếu có tồn tại trên đĩa hay không.
     - Sinh ra tệp JSON hoàn chỉnh cho mỗi đợt thi.
