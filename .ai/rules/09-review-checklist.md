# ☑️ Pre-Review Checklist (.ai/rules/09-review-checklist.md)

Tài liệu này cung cấp danh sách kiểm tra (checklist) bắt buộc lập trình viên hoặc AI agent phải tự rà soát trước khi tạo Merge Request / Pull Request hoặc bàn giao tác vụ.

---

## 📌 Checklist kiểm tra chất lượng

### 1. Xây dựng & Biên dịch (Build & Compile)
* [ ] Mã nguồn Backend biên dịch thành công không lỗi cú pháp (`./mvnw.cmd clean package -DskipTests`).
* [ ] Mã nguồn Frontend build thành công không có lỗi bundle (`npm run build` trong `frontend/`).
* [ ] Kiểm thử tự động chạy thành công 100% (`./mvnw.cmd test` trong `backend/`).

### 2. Thiết kế Cơ sở dữ liệu & API
* [ ] Thay đổi cấu trúc cơ sở dữ liệu đã được tạo tệp migration Flyway mới (`V7__...`) và chạy di trú dữ liệu thành công.
* [ ] Tên endpoint API tuân thủ chuẩn kebab-case, có kiểm tra validate dữ liệu đầu vào.
* [ ] Phản hồi API sử dụng DTO, không trả trực tiếp JPA Entity.

### 3. Bảo mật & Hiệu năng
* [ ] Mật khẩu được mã hóa an toàn qua BCrypt.
* [ ] Không để lộ hoặc viết cứng (hardcode) bất kỳ thông tin nhạy cảm nào (token, mật khẩu database, AWS keys) vào mã nguồn.
* [ ] Các endpoint nhạy cảm đã cấu hình Rate Limiting qua Bucket4j.

### 4. Đồng bộ hóa Tài liệu
* [ ] Tài liệu [SYSTEM_KNOWLEDGE.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/SYSTEM_KNOWLEDGE.md) đã cập nhật nếu có thay đổi kiến trúc/nghiệp vụ.
* [ ] Các file liên quan trong thư mục `.ai/knowledge/` đã được đồng bộ khớp với code thực tế.
* [ ] Tạo mới tệp ADR trong `.ai/decisions/` nếu có thay đổi kiến trúc lớn.
