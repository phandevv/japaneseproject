# 🤖 AI Knowledge Base & Coding Rules (.ai/README.md)

Chào mừng bạn đến với cơ sở kiến thức dành riêng cho các tác nhân AI (AI coding agents) và lập trình viên phát triển dự án **NihongoCards**.

Mục tiêu chính của thư mục `.ai/` là lưu trữ lâu dài cấu trúc dự án, thiết kế kiến trúc, các quyết định quan trọng (ADR) và quy tắc viết mã nguồn để đảm bảo hệ thống luôn nhất quán, sạch sẽ và tuân thủ các chuẩn mực đã thiết kế.

---

## 📂 Cấu trúc thư mục `.ai/`

Thư mục được tổ chức thành 3 phần chính:

### 1. [Cơ sở Kiến thức (.ai/knowledge/)](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/)
Chứa toàn bộ thông tin chi tiết về từng thành phần của hệ thống:
* **[architecture.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/architecture.md)**: Sơ đồ khối, mô hình triển khai đám mây và tương tác hệ thống.
* **[backend.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/backend.md)**: Cấu trúc thư mục, Spring Security filters, Exception Handlers, Actuator.
* **[frontend.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/frontend.md)**: Tổ chức React components, routing, context, interceptors.
* **[database.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/database.md)**: Schema quan hệ MySQL, các tệp migration của Flyway và Lucene indexing.
* **[api.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/api.md)**: Đặc tả chi tiết các endpoint RESTful APIs.
* **[security.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/security.md)**: Cơ chế bảo mật JWT Stateless, Rate Limiter (Bucket4j), Dynamic CORS.
* **[deployment.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/deployment.md)**: AWS Infrastructure, GitLab CI/CD Pipeline.
* **[docker.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/docker.md)**: Cấu hình container local và production.
* **[coding-style.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/coding-style.md)**: Quy ước viết code Java và Javascript/React.
* **[business-modules.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/business-modules.md)**: Luồng nghiệp vụ chính của từng module chức năng.
* **[business-rules.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/business-rules.md)**: Quy tắc nghiệp vụ tính điểm, học theo ngày, ôn tập SM-2.
* **[dependencies.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/dependencies.md)**: Các thư viện bổ sung và dependencies cốt lõi.
* **[testing.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/testing.md)**: Chiến lược kiểm thử tự động.
* **[roadmap.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/roadmap.md)**: Lộ trình và các bước cải tiến hệ thống trong tương lai.
* **[glossary.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/glossary.md)**: Bảng thuật ngữ chuyên ngành tiếng Nhật - tiếng Anh - tiếng Việt dùng trong code.

### 2. [Quy tắc Viết mã (.ai/rules/)](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/rules/)
Các quy tắc lập trình bắt buộc mà AI agent cần tuân thủ nghiêm ngặt trước khi can thiệp vào mã nguồn:
* **[00-system-rule.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/rules/00-system-rule.md)**: Nguyên tắc hệ thống cốt lõi và thứ tự đọc tài liệu.
* Các tệp tin từ `01` đến `09` định nghĩa chi tiết luật phát triển cho backend, frontend, database, API, Docker, kiểm thử và tài liệu hóa.

### 3. [Quyết định Kiến trúc (.ai/decisions/)](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/decisions/)
Tập hợp các tài liệu **Architecture Decision Records (ADR)** lưu vết lý do chọn lựa giải pháp công nghệ:
* `0001-use-dual-database.md`: Lý do thiết lập cơ chế Dual-Database (H2 / MySQL).
* `0002-spaced-repetition-sm2.md`: Việc lựa chọn thuật toán SuperMemo-2 cho SRS.
* `0003-ssm-agent-deployment.md`: Lý do deploy qua AWS SSM Agent thay vì mở cổng SSH.
* `0004-activity-commit-style-grid.md`: Lựa chọn hiển thị lưới lịch sử học tập dạng commit GitHub.

---

## 📖 Hướng dẫn cho AI Agents

Trước khi thực hiện bất kỳ thay đổi nào đối với mã nguồn (sửa lỗi, thêm tính năng, viết lại tài liệu):
1. **ĐỌC KỸ** tệp `SYSTEM_KNOWLEDGE.md` ở thư mục gốc để nắm bức tranh toàn cảnh.
2. **ĐỌC KỸ** tệp tin quy tắc hệ thống [00-system-rule.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/rules/00-system-rule.md).
3. Đọc các file liên quan trực tiếp đến tác vụ (ví dụ: sửa API thì đọc `api.md` và `04-api-rule.md`).
4. **Luôn luôn giữ đồng bộ** giữa tài liệu và mã nguồn thực tế sau khi hoàn thành.
