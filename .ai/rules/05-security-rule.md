# 🛡️ Security Rules (.ai/rules/05-security-rule.md)

Tài liệu này quy định các tiêu chuẩn bảo mật bắt buộc phải áp dụng khi viết mã nguồn và triển khai hệ thống.

---

## 🚫 Nguyên tắc bảo mật bắt buộc

1. **JWT Stateless verification**:
   * Tất cả các API chức năng liên quan đến dữ liệu cá nhân (tiến độ học, lịch sử làm bài, cấu hình học tập) bắt buộc phải cấu hình yêu cầu xác thực JWT trong `SecurityConfig.java`.
   * Trích xuất thông tin người dùng an toàn từ đối tượng `Principal` hoặc `Authentication` của Spring Security thay vì nhận `userId` truyền trực tiếp từ client (đề phòng giả mạo danh tính).
2. **Mã hóa dữ liệu nhạy cảm**:
   * Mật khẩu của người dùng bắt buộc phải được băm qua `BCryptPasswordEncoder` trước khi lưu vào DB. Không chấp nhận băm MD5 hay SHA thường vì dễ bị giải mã.
3. **Cấu hình CORS động**:
   * Không cấu hình cứng `Access-Control-Allow-Origin: *` ở môi trường production. Phải dùng cơ chế lọc CORS động dựa trên danh sách cấu hình của biến môi trường `CORS_ORIGINS`.
4. **Phòng chống tấn công brute-force**:
   * Bất kỳ endpoint xác thực mới nào (như đổi mật khẩu, quên mật khẩu) bắt buộc phải tích hợp bộ giới hạn Rate Limiting của Bucket4j để chống spam và tấn công đoán mật khẩu.
