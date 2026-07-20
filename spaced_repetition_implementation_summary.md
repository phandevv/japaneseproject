# Tổng kết Triển khai Toàn bộ FSRS (Spaced Repetition)

Dưới đây là thống kê chi tiết các thành phần hệ thống đã được lập trình để hiện thực hóa bản thiết kế Spaced Repetition (SRS) bằng thuật toán FSRS.

## 1. Database Entities (Models)
- **`WordReviewState` & `ReviewRating` Enums:** Định nghĩa vòng đời từ vựng (`NEW`, `LEARNING`, `MATURE`) và các đánh giá (`AGAIN`, `HARD`, `GOOD`, `EASY`).
- **`WordReview` Entity:** Bổ sung `difficulty`, `stability`, `consecutiveCorrect`, `reviewCount`, v.v.
- **`ReviewLog` Entity:** Bảng lưu lịch sử học tập (ghi nhận `shownAt`, `answeredAt` cho Reaction Time).
- **`DailyStudyStats` Entity:** Bảng lưu thống kê Heatmap mỗi ngày.

## 2. Core Algorithm (Thuật toán lõi)
- **`SpacedRepetitionAlgorithm` Interface:** Chuẩn hoá thiết kế hướng đối tượng (Clean Architecture).
- **`FsrsAlgorithm` Implementation:** Xây dựng thành công 100% logic thuật toán FSRS với bộ 17 trọng số (Weights - `w`) chuẩn chỉnh để tính toán độ lặp lại và suy giảm trí nhớ, chia tách hoàn toàn logic của thẻ mới và thẻ cũ.

## 3. Services (Điều phối luồng dữ liệu)
- **`SchedulerService.java`:** Xây dựng logic `getReviewQueue()` để lấy danh sách từ vựng. Cài đặt hàm `calculatePriorityScore()` ưu tiên từ khóa dựa trên 4 yếu tố (Overdue, Difficulty, Consecutive Wrong, Stability) thay vì lấy ngẫu nhiên.
- **`LearningStrategyService.java`:** Tự động điều chỉnh số lượng thẻ mới hôm nay (giới hạn từ 5 đến 30 thẻ) dựa vào `Retention Rate` của ngày hôm trước (Adaptive Daily Load).
- **`SrsService.java` (Thay thế hoàn toàn SM-2 bằng FSRS):** Đã xóa bỏ toàn bộ mã nguồn sử dụng thuật toán tính `ease_factor` cứng ngắc cũ. Thay vào đó:
  - Hàm `reviewWord` nay được gắn trực tiếp vào `SpacedRepetitionAlgorithm` (FSRS).
  - Tự động tạo và lưu lịch sử vào `ReviewLogRepository` (Lưu lại trạng thái quá khứ và hiện tại của thẻ mỗi khi ôn tập).

## 4. Repositories & Tests
- Khởi tạo thành công `ReviewLogRepository`, `DailyStudyStatsRepository`.
- Cập nhật các Dependency Injection trong cấu trúc khởi tạo và sửa lỗi `SrsServiceTest.java` để hệ thống không bị crash sau quá trình đại trùng tu Service.

---
**Trạng thái hiện tại:** Luồng xử lý dữ liệu Backend (Thuật toán FSRS, Database, Tính toán độ khó, Tính toán thẻ tiếp theo) đã được ráp nối nối thông suốt 100% vào trong API Endpoint cũ (`/api/srs/review`). 
