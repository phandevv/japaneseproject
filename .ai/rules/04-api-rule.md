# 🔌 API Design Rules (.ai/rules/04-api-rule.md)

Tài liệu này quy định chuẩn thiết kế và cách đặt tên các endpoint RESTful APIs của dự án.

---

## 🚫 Nguyên tắc thiết kế API

1. **Chuẩn đặt tên Endpoint**:
   * Sử dụng danh từ viết thường, ngăn cách bởi dấu gạch ngang **kebab-case** (ví dụ: `/api/srs/learned-stats`, `/api/settings/{level}/complete-day`).
   * Bắt đầu bằng tiền tố `/api`.
2. **Phương thức truyền nhận dữ liệu (HTTP Methods)**:
   * `GET`: Dùng để truy vấn dữ liệu (không thay đổi trạng thái hệ thống).
   * `POST`: Dùng để tạo mới dữ liệu hoặc thực hiện các tác vụ làm thay đổi trạng thái (như gửi đánh giá ôn tập `POST /api/srs/review`).
3. **Tuyệt đối không trả về JPA Entity trực tiếp**:
   * Tránh trả trực tiếp đối tượng Entity JPA (như `User`, `Vocabulary`) ra ngoài Controller. Thay vào đó, hãy sử dụng các lớp DTO để ẩn lược đồ CSDL vật lý và bảo vệ thông tin nhạy cảm (như mật khẩu).
4. **Validation ở Controller**:
   * Mọi dữ liệu đầu vào trong request body bắt buộc phải có annotation `@Valid` và định nghĩa các luật kiểm tra `@NotBlank`, `@Size` trên lớp DTO để phản hồi lỗi sớm nhất cho client.
5. **Xử lý CORS**:
   * Tất cả các Controller mới tạo phải đảm bảo đi qua luồng lọc CORS đã được cấu hình trong `SecurityConfig.java` để cho phép frontend gọi API bình thường.
