# 🛡️ Security Model (.ai/knowledge/security.md)

Tài liệu này đặc tả thiết kế bảo mật của dự án **NihongoCards**, bao gồm các lớp phòng thủ JWT, mã hóa thông tin, chống tấn công Brute-force và cấu hình chia sẻ tài nguyên nguồn gốc chéo (CORS).

---

## 1. Authentication: JWT Stateless Model

Hệ thống loại bỏ hoàn toàn cơ chế lưu Session trên RAM của server (Stateless Architecture):

* **JWT Token Structure**:
  * Token chứa thông tin `sub` (tên tài khoản), `role` (USER/ADMIN) và `exp` (thời điểm hết hạn).
  * Khóa bí mật dùng để ký và xác thực token được định cấu hình qua biến môi trường `JWT_SECRET`. Trong môi trường local, nếu không thiết lập, hệ thống sẽ sử dụng khóa mặc định `CHANGE_ME_IN_PRODUCTION`.
* **Cơ chế hoạt động**:
  * Khi user truy cập thành công endpoint đăng nhập, server tạo và gửi token về Client.
  * Client lưu trữ token này trong `localStorage` và tự động gắn vào Header `Authorization: Bearer <token>` trong mọi request qua Axios.
  * [SecurityConfig.java](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/backend/src/main/java/com/flashcard/config/SecurityConfig.java) thiết lập tắt cơ chế Session:
    ```java
    .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
    ```

---

## 2. Password Encryption: BCrypt

* Mật khẩu người dùng trước khi lưu vào cơ sở dữ liệu `users` bắt buộc phải được băm (hash) bằng giải pháp **BCrypt** thông qua Bean `BCryptPasswordEncoder` cấu hình trong Spring Security.
* Tuyệt đối không lưu trữ mật khẩu dưới dạng bản rõ (plaintext) trong bất kỳ môi trường nào (kể cả H2 database ở local).

---

## 3. Dynamic CORS (Cross-Origin Resource Sharing)

Hệ thống cho phép cấu hình linh hoạt CORS nhằm hỗ trợ việc deploy trên nhiều IP/domain khác nhau mà không cần sửa code:

* Biến môi trường `CORS_ORIGINS` nhận diện danh sách các domain được phép truy cập (các domain cách nhau bởi dấu phẩy, ví dụ: `http://localhost,http://localhost:80,https://yourdomain.com`).
* Khi nhận yêu cầu từ client, Spring Security sẽ trích xuất Header `Origin`. Nếu origin này nằm trong danh sách cấu hình của `CORS_ORIGINS`, nó sẽ được chấp nhận truy cập tài nguyên.

---

## 4. Rate Limiting: Bucket4j Token Bucket

Để chống lại các cuộc tấn công Brute-force đoán mật khẩu, hệ thống tích hợp bộ giới hạn tần suất yêu cầu (**Rate Limiting**) sử dụng thư viện **Bucket4j**:

* **Nguyên lý hoạt động**:
  * Mỗi địa chỉ IP (`Remote Address`) truy cập vào các API nhạy cảm được cấp một "xô chứa thẻ" (Token Bucket) có giới hạn.
  * Mỗi request hợp lệ sẽ tiêu tốn 1 thẻ (token) trong xô. Thẻ được tự động bơm đầy lại theo thời gian.
* **Cấu hình cụ thể**:
  * Giới hạn **10 yêu cầu trên mỗi phút** đối với các endpoint xác thực: `/api/auth/login`, `/api/auth/register`.
  * Nếu vượt quá giới hạn, hệ thống trả về mã lỗi HTTP `429 Too Many Requests` kèm thông điệp cảnh báo người dùng.
