# 🎯 System Rule (.ai/rules/00-system-rule.md)

Tệp tin này đặc tả nguyên tắc cốt lõi bắt buộc mọi tác nhân trí tuệ nhân tạo (AI agent) và lập trình viên phải đọc và tuân thủ trước khi viết bất kỳ dòng mã nào hoặc thay đổi thiết kế hệ thống.

---

## 🚫 Nguyên tắc cốt lõi trước khi thực hiện tác vụ

Trước khi viết code, bạn bắt buộc phải thực hiện 10 bước sau:

1. **Đọc kỹ tệp tin** [SYSTEM_KNOWLEDGE.md](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/SYSTEM_KNOWLEDGE.md) nằm ở thư mục gốc của dự án.
2. **Đọc kỹ toàn bộ** tệp tin tài liệu kiến trúc và giải thích nghiệp vụ nằm dưới thư mục [.ai/knowledge/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/knowledge/).
3. **Đọc kỹ toàn bộ** tệp tin quy tắc lập trình dưới thư mục [.ai/rules/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/rules/).
4. **Bảo tồn nguyên vẹn kiến trúc hiện tại**: Không tự ý thay đổi các quyết định kiến trúc đã chọn (như mô hình Dual-Database, mô hình định tuyến bằng State-based Router, cơ chế deploy qua AWS SSM Agent).
5. **Tuân thủ quy ước viết code**: Tuân thủ triệt để các quy tắc đặt tên, phong cách viết hàm và quy định sử dụng getters/setters thuần (không cài đặt Lombok).
6. **Tái sử dụng module tối đa**: Luôn tìm kiếm các module và dịch vụ hiện có để tái sử dụng.
7. **Tuyệt đối không nhân bản logic nghiệp vụ**: Tránh viết lại các logic tính toán thời gian ôn tập SM-2 hoặc chia nhỏ từ vựng theo ngày ở nhiều nơi khác nhau.
8. **Đồng bộ hóa tài liệu và mã nguồn**: Khi viết code mới hoặc thay đổi logic cũ, bạn bắt buộc phải cập nhật lại tài liệu kỹ thuật tương ứng.
9. **Cập nhật SYSTEM_KNOWLEDGE.md**: Nếu có bất kỳ sự thay đổi nào về kiến trúc hoặc logic nghiệp vụ, hãy phản ánh ngay vào tệp này.
10. **Tạo mới quyết định kiến trúc (ADR)**: Nếu bạn đề xuất hoặc buộc phải thay đổi kiến trúc hệ thống, hãy tạo một tệp tin ADR mới lưu tại thư mục [.ai/decisions/](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.ai/decisions/).
