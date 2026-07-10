# 📝 Documentation & Alignment Rules (.ai/rules/08-documentation-rule.md)

Tài liệu này quy định các tiêu chuẩn đồng bộ hóa thông tin và viết tài liệu kỹ thuật trong dự án.

---

## 🚫 Nguyên tắc đồng bộ hóa tài liệu

1. **Đồng bộ hóa tức thời**:
   * Khi bạn thực hiện bất kỳ thay đổi nào làm ảnh hưởng đến cấu trúc thư mục, lược đồ cơ sở dữ liệu, tham số API, hoặc logic nghiệp vụ, bạn **bắt buộc phải cập nhật ngay lập tức** các tài liệu kỹ thuật liên quan trong `.ai/knowledge/` và `SYSTEM_KNOWLEDGE.md`.
2. **Quy định về ngôn ngữ**:
   * Tên thư mục và tên tệp tài liệu phải đặt bằng **Tiếng Anh**.
   * Các thuật ngữ kỹ thuật, tên biến, tên cột DB phải giữ nguyên như trong code.
   * Phần giải thích chi tiết bắt buộc phải viết bằng **Tiếng Việt**.
3. **Tính hợp lệ của liên kết Markdown**:
   * Tất cả các liên kết tham chiếu đến file code nguồn trong tài liệu bắt buộc phải dùng cú pháp link tuyệt đối của file protocol (ví dụ: `[Vocabulary.java](file:///absolute/path/to/Vocabulary.java)`). Không viết link tương đối hoặc link bị lỗi.
4. **Viết Quyết định kiến trúc (ADR)**:
   * Nếu có sự thay đổi lớn về mặt công nghệ hoặc phương án triển khai hệ thống, bắt buộc phải viết một tài liệu ADR mới lưu dưới dạng đánh số tăng dần trong thư mục `.ai/decisions/`.
