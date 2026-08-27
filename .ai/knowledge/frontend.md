# ⚛️ Frontend Architecture (.ai/knowledge/frontend.md)

Tài liệu này đặc tả chi tiết kiến trúc giao diện, cấu trúc thư mục, cơ chế quản lý trạng thái, định tuyến và kết nối API của phần Frontend React/Vite trong dự án **NihongoCards**.

---

## 1. Directory Structure

Mã nguồn frontend nằm dưới thư mục `frontend/src/` được tổ chức như sau:

```
frontend/src/
├── main.jsx                 # Điểm khởi chạy React
├── App.jsx                  # Điều phối trang chính & Switching routes
├── context/                 # Context quản lý state toàn cục
│   ├── AuthContext.jsx      # Quản lý phiên đăng nhập JWT
│   └── LanguageContext.jsx  # Quản lý đa ngôn ngữ (VI / EN)
├── pages/                   # Các trang hiển thị chính
│   ├── HomePage.jsx
│   ├── DailyStudyPage.jsx
│   ├── FlashcardPage.jsx
│   ├── SearchPage.jsx
│   ├── VocabAdminPage.jsx
│   └── AuthPage.jsx
├── components/              # Các UI Components tái sử dụng
│   ├── FlashcardCard.jsx
│   ├── KanjiDetailModal.jsx
│   ├── AIChatWidget.jsx
│   ├── QuickSelectionTranslator.jsx
│   ├── StudyTimer/          # Đồng hồ học tập Pomodoro (Timestamp-based)
│   │   ├── StudyTimerWidget.jsx
│   │   ├── StudyTimerSettings.jsx
│   │   ├── useStudyTimer.js
│   │   ├── studyTimerStorage.js
│   │   ├── studyTimerAudio.js
│   │   └── studyTimerNotification.js
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   ├── ProfileModal.jsx
│   └── ErrorBoundary.jsx
├── services/                # Giao tiếp API qua Axios
│   ├── api.js
│   └── translatorService.js
└── styles/                  # File CSS thiết kế giao diện
    ├── index.css            # Design tokens toàn hệ thống
    ├── AIChatWidget.css
    ├── StudyTimerWidget.css
    ├── Navbar.css
    ├── HomePage.css
    └── ...
```

---

## 2. Routing & Navigation Strategy

Ứng dụng sử dụng cơ chế **State-based Router** thay vì React Router truyền thống. Định tuyến trang được quyết định bởi giá trị của state `currentPage` trong [App.jsx](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/frontend/src/App.jsx):

* `home`: Màn hình chính Dashboard.
* `auth`: Trang đăng nhập/đăng ký.
* `daily`: Trang học từ vựng hàng ngày theo lộ trình.
* `flashcard`: Trang học qua thẻ ghi nhớ (chọn ngày học).
* `srs-review`: Trang ôn tập các từ đến hạn theo thuật toán SM-2.
* `srs-learned`: Trang ôn tập tự do các từ đã học trong cơ sở dữ liệu.
* `search`: Trang tìm kiếm từ vựng & tra cứu Kanji.
* `admin-vocab`: Trang quản lý từ vựng dành riêng cho vai trò admin.

---

## 3. Axios API Interceptors & Dynamic URL

Mọi giao tiếp mạng gửi đến backend được định nghĩa tập trung tại [api.js](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/frontend/src/services/api.js):

* **Dynamic Base URL**:
  Tự động nhận diện hostname của trình duyệt để tạo URL API đích, giúp dự án hoạt động trên cả local (localhost) và bất kỳ IP EC2 AWS nào mà không cần cấu hình lại:
  ```javascript
  const getApiBaseUrl = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
    return `http://${host}:8080/api`;
  };
  ```
* **Request Interceptor**:
  Trước khi gửi request, interceptor tự động kiểm tra `localStorage` và đính kèm JWT Token vào Header:
  ```javascript
  config.headers.Authorization = `Bearer ${token}`;
  ```
* **Response Interceptor (Token Expiry Handling)**:
  Nếu API trả về mã lỗi `401 Unauthorized` hoặc `403 Forbidden` (Token hết hạn hoặc không hợp lệ), interceptor tự động kích hoạt hàm logout để xóa token và đưa người dùng về trang đăng nhập.

---

## 4. Contexts & State Management

Hệ thống quản lý trạng thái qua các React Contexts:

* **`AuthContext`**:
  * Lưu trữ `user` (thông tin tài khoản hiện tại), `token` và trạng thái đăng nhập `isAuthenticated`.
  * Cung cấp các hàm `login(token, user)` và `logout()`.
* **`LanguageContext`**:
  * Quản lý cờ ngôn ngữ `lang` ('vi' hoặc 'en').
  * Cung cấp đối tượng dịch thuật `t` tương ứng để hiển thị văn bản đa ngôn ngữ động.

---

## 5. UI & Design System

* **Dark Mode & Glassmorphism**:
  * Dự án sử dụng bảng màu tối làm chủ đạo kết hợp hiệu ứng kính mờ (backdrop-filter: blur) tạo chiều sâu cao cấp.
  * Các màu sắc cấp độ N5-N1 được đồng bộ trên toàn hệ thống bằng CSS variables trong `index.css`.
* **Phát âm từ vựng (TTS)**:
  * Trang bị nút phát âm thủ công sử dụng **Web Speech API** (`window.speechSynthesis`) với giọng đọc tiếng Nhật chuẩn (`ja-JP`).

---

## 6. Floating Tools & Pomodoro Study Timer (学習タイマー)

* **Vị trí bố trí Floating Buttons (Bottom-Right)**:
  * **`🤖 AI Assistant`**: `bottom: 92px; right: 22px; width: 60px; height: 60px; z-index: 9999;`
  * **`⏱ Study Timer`**: `bottom: 24px; right: 24px; width: 56px; height: 56px; z-index: 9999;`
* **Cơ chế Timer Timestamp-based**:
  * Nguồn chân lý thời gian dựa trên `endAt = Date.now() + durationMs` và `remainingMs = Math.max(0, endAt - Date.now())`.
  * Không dùng `seconds--` trong `setInterval` để loại trừ hoàn toàn hiện tượng trễ thời gian khi chuyển tab (tab throttling) hoặc sleep máy.
  * Tích hợp **Page Visibility API** (`visibilitychange`) tự động tính lại thời gian còn lại khi tab chuyển từ nền sang tiền cảnh.
  * Phục hồi thông minh từ `localStorage`: tự động nhận diện nếu timer đã hết hạn trong lúc tắt trình duyệt để hiển thị trạng thái hoàn thành duyên dáng.
  * Âm thanh chuông báo hoàn thành tổng hợp bằng **Web Audio API** (không cần tải asset âm thanh ngoài).
  * Hỗ trợ **Web Notification API** gửi thông báo ra màn hình khi chuyển phase.

