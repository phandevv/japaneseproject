# 🧪 Testing Strategy (.ai/knowledge/testing.md)

Tài liệu này mô tả chi tiết phương pháp kiểm thử, các lớp kiểm thử tự động hiện tại và quy tắc viết test của dự án **NihongoCards**.

---

## 1. Testing Framework & Tools

* **JUnit 5**: Thư viện chạy test chính cho Java.
* **Mockito**: Dùng để cô lập mã nguồn kiểm thử bằng cách mock các Repository, tránh việc ghi nhận trực tiếp vào cơ sở dữ liệu thật trong quá trình chạy test.
* **Spring Boot Starter Test**: Cung cấp công cụ chạy tích hợp kiểm thử ngữ cảnh ứng dụng (Spring Context).

---

## 2. Các lớp kiểm thử hiện có (Existing Test Cases)

### A. Kiểm thử nạp Context hệ thống (`BackendApplicationTests`)
* **Tệp tin**: `backend/src/test/java/com/flashcard/BackendApplicationTests.java`
* **Mục đích**: Đảm bảo toàn bộ cấu hình Spring Boot (Security, Database, Datasource, Search Indexer) được khởi tạo đúng và không xảy ra xung đột khi server khởi động.

### B. Kiểm thử Logic thuật toán SRS (`SrsServiceTest`)
* **Tệp tin**: `backend/src/test/java/com/flashcard/SrsServiceTest.java`
* **Mục đích**: Kiểm chứng hoạt động của bộ máy tính toán SM-2 trong `SrsService` hoạt động chính xác.
* **Các kịch bản kiểm thử (Test Cases)**:
  1. `testReviewWordAgainRating`:
     * **Kịch bản**: Người dùng đánh giá từ vựng ở mức `1` (Quên).
     * **Mong đợi**: Số lần lặp (`repetitions`) reset về `0`, khoảng cách ôn tập (`intervalDays`) reset về `0`, Ease Factor giảm xuống dưới mức mặc định 2.5 và gán ngày ôn tập tiếp theo là thời điểm hiện tại.
  2. `testReviewWordGoodRatingProgression`:
     * **Kịch bản**: Học viên đánh giá mức `3` (Good) liên tục.
     * **Mong đợi**:
       * Lần đầu tiên: Repetitions = 1, Interval = 1 ngày.
       * Lần thứ hai: Repetitions = 2, Interval = 6 ngày (mốc mặc định của SM-2).

---

## 3. Quy trình chạy kiểm thử (How to run tests)

Tại thư mục `backend/` chạy lệnh Maven:
```bash
# Chạy toàn bộ kiểm thử
./mvnw.cmd test
```
* Quá trình chạy test được tích hợp tự động vào bước kiểm tra trước khi deploy. Mọi thay đổi code làm lỗi kết quả test của thuật toán SM-2 sẽ chặn pipeline deploy lên AWS ngay lập tức.
