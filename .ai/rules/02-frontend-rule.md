# ⚛️ Frontend Development Rules (.ai/rules/02-frontend-rule.md)

Tài liệu này quy định các quy tắc lập trình React/Vite cho phần giao diện người dùng.

---

## 🚫 Các nguyên tắc bắt buộc

1. **Giữ nguyên cơ chế định tuyến (Router)**:
   * Dự án sử dụng cơ chế định tuyến dựa trên trạng thái `currentPage` trong [App.jsx](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/frontend/src/App.jsx).
   * **Tuyệt đối không tự ý cài đặt** `react-router` hay bất kỳ thư viện định tuyến bên ngoài nào khác trừ khi có yêu cầu rõ ràng từ người dùng.
2. **Quy tắc Styling (CSS)**:
   * Sử dụng CSS thuần (**Vanilla CSS**) để định hình kiểu dáng cho giao diện.
   * **Bắt buộc sử dụng các CSS variables** định nghĩa trong `index.css` để thiết lập màu sắc, khoảng cách, font chữ thay vì viết các mã màu tĩnh như `#3b82f6` hay `#000`.
3. **Đồng bộ hóa trạng thái qua Context**:
   * Toàn bộ luồng đăng nhập và kiểm tra quyền truy cập bắt buộc phải đi qua `AuthContext` (`useAuth()`). Không tự ý lưu trữ và đọc JWT token phân tán ở nhiều component khác nhau.
4. **Phát âm từ vựng (TTS)**:
   * Mọi cơ chế kích hoạt phát âm phải sử dụng giọng đọc tiếng Nhật chuẩn (`ja-JP`).
   * Phải thực hiện giải phóng và xóa hàng đợi phát âm cũ (`window.speechSynthesis.cancel()`) khi card lật hoặc chuyển từ mới để tránh lỗi lặp tiếng.
