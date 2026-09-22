# Project-Scoped AI Rules & Superpowers Workflow (NihongoCards)

Chào mừng bạn đến với dự án **NihongoCards**. Trước khi thực hiện bất kỳ công việc nào, bạn phải tuân thủ nghiêm ngặt các quy định và quy trình làm việc chuẩn sau:

---

## 🔍 1. Hướng Dẫn Đọc Tài Liệu Ban Đầu (Bắt buộc)

Trước khi viết hoặc thay đổi code:
1. **Đọc tệp tin** [SYSTEM_KNOWLEDGE.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/SYSTEM_KNOWLEDGE.md) để hiểu tổng quan kiến trúc, công nghệ và luồng CI/CD.
2. **Đọc toàn bộ file trong thư mục** [.ai/knowledge/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/) để nắm chi tiết các module nghiệp vụ, API, database schema.
3. **Đọc toàn bộ file trong thư mục** [.ai/rules/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/rules/) để nắm quy định viết code và checklist trước khi review.
4. **Tham khảo các tệp tin ADR** trong [.ai/decisions/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/decisions/) để hiểu lịch sử đưa ra quyết định kiến trúc.

---

## 🚫 2. Quy Định Kỹ Thuật Bắt Buộc (Iron Invariants)

* 🚫 **Tuyệt đối không sử dụng Lombok**: Tất cả Entity/DTO bắt buộc dùng Getter/Setter và Constructor thuần của Java.
* 🧠 **Bảo toàn từ đã học trong SRS**: Không được sửa thuật toán SM-2 làm mất trạng thái `is_learned` của từ vựng đã ôn luyện trước đó khi điểm đánh giá < 3.
* 📝 **Đồng bộ hóa tài liệu**: Cập nhật lại các file tương ứng trong `.ai/` và `SYSTEM_KNOWLEDGE.md` ngay sau khi thay đổi mã nguồn hoặc kiến trúc.
* 🗄️ **Tương thích Dual-Database**: Đảm bảo các truy vấn JPQL và script migration Flyway (`V<n>__...sql`) chạy tương thích cả H2 (local) và MySQL 8.0 (AWS RDS).
* 🎨 **Giao diện chuẩn Vanilla CSS**: Frontend dùng Vanilla CSS với token Dark Mode & Glassmorphism, không đưa thư viện TailwindCSS vào.

---

## ⚡ 3. Quy Trình Làm Việc Chuẩn (Superpowers Workflow)

Dự án đã tích hợp trọn bộ kỹ năng **Superpowers** tại thư mục `.agents/skills/`. Bạn bắt buộc phải kích hoạt các kỹ năng tương ứng với ngữ cảnh tác vụ:

| Tình huống / Nhiệm vụ | Kỹ năng Superpowers bắt buộc | Mục tiêu chính |
|---|---|---|
| **Bắt đầu phiên / Nhận task mới** | `superpowers:using-superpowers` | Điều phối workflow và kiểm tra quy tắc dự án |
| **Xây dựng tính năng / Sửa đổi hành vi** | `superpowers:brainstorming` | Phân tích yêu cầu, chốt giải pháp với người dùng trước khi code |
| **Lập kế hoạch triển khai nhiều bước** | `superpowers:writing-plans` | Chia nhỏ task theo các layer (Flyway -> Entity -> Service -> Controller -> FE -> Docs) |
| **Thực thi kế hoạch** | `superpowers:executing-plans` hoặc `subagent-driven-development` | Triển khai từng task có kiểm chứng TDD |
| **Gặp lỗi, test fail, bug sản xuất** | `superpowers:systematic-debugging` | Tìm nguyên nhân gốc rễ trước khi sửa, áp dụng playbooks của NihongoCards |
| **Viết code mới hoặc sửa code cũ** | `superpowers:test-driven-development` | Viết test trước (RED), xem test fail, viết code tối thiểu (GREEN), REFACTOR |
| **Trước khi tuyên bố hoàn thành task** | `superpowers:verification-before-completion` | Chạy lệnh thực tế (`./mvnw.cmd test`, `npm run build`) và đối chiếu 10 điểm checklist |
| **Rà soát chất lượng code** | `superpowers:requesting-code-review` | Dispatch reviewer kiểm tra vi phạm Lombok, SM-2, Layering, Bảo mật |

---

## 💻 4. Lệnh Kiểm Thử Trên Windows PowerShell

* **Backend Build & Kiểm thử**:
  ```powershell
  ./mvnw.cmd test
  ./mvnw.cmd test -Dtest=SrsServiceTest
  ./mvnw.cmd clean package -DskipTests
  ```
* **Frontend Build & Kiểm thử**:
  ```powershell
  cd frontend
  npm run build
  npm test
  ```
