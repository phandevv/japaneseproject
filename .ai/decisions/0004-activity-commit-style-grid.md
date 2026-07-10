# ADR 0004: GitHub Commit-Style Activity Grid (.ai/decisions/0004-activity-commit-style-grid.md)

## Status
Accepted

## Context
Người dùng cần một giao diện trực quan sinh động để theo dõi tần suất và mức độ chăm chỉ học tập từ vựng tiếng Nhật hàng ngày. Giao diện này cần đủ gọn gàng để đặt trong màn hình trang chủ mà không làm loãng thông tin, đồng thời tạo động lực cho học viên duy trì chuỗi học tập (streak).

## Decision
Chúng tôi quyết định áp dụng mô hình **Biểu đồ đóng đóng góp (Commit Grid)** tương tự như GitHub:
1. Giao diện hiển thị dưới dạng lưới các ô vuông tương ứng với 30 ngày gần nhất.
2. Mỗi ngày học viên ôn tập hoặc học từ mới có chất lượng đánh giá $\ge 3$ sẽ ghi nhận số từ vào bảng `study_sessions`.
3. Frontend React đọc dữ liệu này và tô màu các ô vuông trên lưới theo các mức độ đậm nhạt:
   * 0 từ: Màu nền mặc định (xám tối).
   * 1 - 5 từ: Xanh lá cây nhạt.
   * 6 - 15 từ: Xanh lá cây vừa.
   * 16+ từ: Xanh lá cây đậm.
4. Để tối ưu hóa không gian hiển thị, Lưới lịch sử học tập 30 ngày được xếp cùng hàng ngang song song với **Bảng xếp hạng điểm số** trên màn hình máy tính (desktop) thông qua layout CSS Grid và tự động chuyển sang xếp dọc trên mobile.

## Consequences
* **Ưu điểm**:
   * Trải nghiệm gamification (trò chơi hóa) quen thuộc, tạo động lực cao để học viên "tô xanh" các ngày trong tháng.
   * Sử dụng SVG gọn nhẹ, không làm nặng trang hay tốn tài nguyên tải dữ liệu.
* **Nhược điểm**:
   * Lịch sử chỉ hiển thị 30 ngày gần nhất để giữ giao diện cân đối trên màn hình lớn cùng Bảng xếp hạng. Trong tương lai, có thể mở rộng tùy chọn xem biểu đồ cả năm (365 ngày) ở một trang hồ sơ cá nhân riêng biệt.
