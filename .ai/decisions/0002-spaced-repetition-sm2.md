# ADR 0002: Use SuperMemo-2 (SM-2) for Spaced Repetition (.ai/decisions/0002-spaced-repetition-sm2.md)

## Status
Accepted

## Context
Dự án cần một thuật toán học tập giãn cách (Spaced Repetition System - SRS) để tối ưu hóa thời gian và khả năng ghi nhớ từ vựng tiếng Nhật của người dùng. Thuật toán này cần đủ đơn giản để tính toán trực tiếp trên server mà không cần cấu hình hạ tầng AI hoặc xử lý học máy phức tạp, đồng thời đã được khoa học chứng minh tính hiệu quả.

## Decision
Chúng tôi quyết định áp dụng thuật toán **SuperMemo-2 (SM-2)** để tự động lập lịch ôn tập từ vựng:
1. Thuật toán hoạt động dựa trên ba tham số chính lưu trữ cho mỗi từ vựng của người dùng (`WordReview`):
   * **Ease Factor (EF)**: Hệ số độ dễ của từ vựng (mặc định ban đầu = 2.5).
   * **Interval**: Số ngày chờ cho đến lần ôn tập tiếp theo.
   * **Repetitions**: Số lần ôn tập thành công liên tiếp.
2. Cho phép người dùng phản hồi chất lượng từ 1 đến 4 (Forgot, Hard, Good, Easy) và tự động tính toán lại EF và Interval theo công thức chuẩn của SM-2.
3. Áp dụng quy tắc nghiệp vụ bảo toàn: các từ đã đạt trạng thái "Đã học" (từng đạt đánh giá $\ge 3$) sẽ giữ nguyên trạng thái này, không bị xóa khỏi tổng số từ đã học ngay cả khi người dùng ôn tập lại và đánh giá thấp (Forgot/Hard).

## Consequences
* **Ưu điểm**:
   * Thuật toán SM-2 cực kỳ gọn nhẹ, thực hiện tính toán số học đơn giản ở backend mà không làm chậm API.
   * Mang lại trải nghiệm học tập giãn cách chuyên nghiệp, giúp học viên ghi nhớ từ vựng lâu dài hơn.
* **Nhược điểm**:
   * SM-2 là thuật toán tĩnh, không tự động điều chỉnh theo hành vi học tập chi tiết của từng cá nhân (như các phiên bản SM-15 hoặc Anki FSRS mới hơn). Tuy nhiên, SM-2 hoàn toàn đáp ứng tốt nhu cầu học tập ở quy mô hiện tại của ứng dụng.
