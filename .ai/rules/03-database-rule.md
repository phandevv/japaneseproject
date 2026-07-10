# 🗄️ Database & Migrations Rules (.ai/rules/03-database-rule.md)

Tài liệu này quy định các nguyên tắc tương tác cơ sở dữ liệu và quản lý lịch sử nâng cấp schema.

---

## 🚫 Nguyên tắc bắt buộc

1. **Tuyệt đối không sửa các tệp Migration cũ**:
   * Tất cả các tệp SQL migration đã tồn tại trong thư mục `backend/src/main/resources/db/migration/` (từ `V1` đến `V6`) là lịch sử schema cố định. **Tuyệt đối không được thay đổi nội dung** của các tệp này vì sẽ làm sai lệch mã hash của Flyway trên production và gây lỗi crash hệ thống khi khởi chạy.
2. **Tạo mới tệp Migration**:
   * Khi cần thay đổi schema (thêm bảng, thêm cột, đổi kiểu dữ liệu), bạn bắt buộc phải tạo một tệp migration mới có số phiên bản tăng dần tiếp theo (ví dụ: `V7__ten_migration.sql`).
3. **Đồng bộ hóa Entity JPA**:
   * Mọi cột mới được thêm vào database phải được khai báo tương ứng trong Entity lớp Java bằng annotation `@Column(name = "ten_cot_db")` để tránh lỗi mapping.
4. **Lucene Search Index Sync**:
   * Khi thêm trường dữ liệu mới vào bảng `vocabulary` mà trường này cần hỗ trợ tính năng tìm kiếm, bạn phải gắn annotation `@FullTextField` cho trường đó trong JPA Entity `Vocabulary.java` và bổ sung logic tái tạo chỉ mục (Reindexing) nếu cần.
