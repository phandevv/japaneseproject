# Project-Scoped AI Rules (NihongoCards)

Chào mừng bạn đến với dự án **NihongoCards**. Trước khi thực hiện bất kỳ công việc nào, bạn phải tuân thủ nghiêm ngặt các quy định sau:

---

## 🔍 Hướng dẫn Đọc Tài liệu ban đầu

Trước khi viết hoặc thay đổi code:
1. **Đọc tệp tin** [SYSTEM_KNOWLEDGE.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/SYSTEM_KNOWLEDGE.md) để hiểu tổng quan kiến trúc.
2. **Đọc toàn bộ file trong thư mục** [.ai/knowledge/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/) để nắm chi tiết các module nghiệp vụ, API, database schema.
3. **Đọc toàn bộ file trong thư mục** [.ai/rules/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/rules/) để nắm quy định viết code và checklist trước khi review.
4. **Tham khảo các tệp tin ADR** trong [.ai/decisions/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/decisions/) để hiểu lịch sử đưa ra quyết định kiến trúc.

---

## 🚫 Quy định Kỹ thuật bắt buộc

* **Không sử dụng Lombok**: Tất cả Entity/DTO bắt buộc dùng Getter/Setter thuần.
* **Bảo toàn từ đã học**: Không được sửa thuật toán SM-2 làm mất trạng thái `is_learned` của từ vựng đã ôn luyện trước đó.
* **Đồng bộ hóa tài liệu**: Cập nhật lại các file tương ứng trong `.ai/` ngay sau khi thay đổi mã nguồn.
