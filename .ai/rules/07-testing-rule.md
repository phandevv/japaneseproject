# 🧪 Testing Rules (.ai/rules/07-testing-rule.md)

Tài liệu này quy định các nguyên tắc viết và thực thi kiểm thử tự động (Unit Test / Integration Test).

---

## 🚫 Quy tắc viết Test bắt buộc

1. **Đặt tên lớp kiểm thử**:
   * Tất cả các file kiểm thử tự động phải được đặt tên kết thúc bằng hậu tố `Test` (ví dụ: `VocabularyServiceTest.java`, `SrsServiceTest.java`) và đặt ở thư mục tương ứng trong `src/test/java/`.
2. **Sử dụng JUnit 5 & Mockito**:
   * Áp dụng JUnit 5 để định nghĩa test.
   * Sử dụng Mockito để mock các lớp `Repository` hoặc dịch vụ liên quan để kiểm thử cô lập logic của Service. Tránh kết nối database thật trong unit test để tăng tốc độ chạy và tránh làm bẩn dữ liệu.
3. **Độ bao phủ kiểm thử (Test Coverage)**:
   * Khi cập nhật logic của thuật toán SM-2 hoặc các luồng phân chia ngày học, bắt buộc phải viết unit test kiểm thử các trường hợp biên (edge cases).
4. **Không bỏ qua kiểm thử (No Skip Tests)**:
   * Không commit các đoạn mã có chứa chú thích tắt test như `@Disabled` (JUnit 5) trừ khi được chỉ định rõ ràng từ người dùng. Tất cả các test hiện có phải luôn luôn trong trạng thái chạy thành công (Green).
