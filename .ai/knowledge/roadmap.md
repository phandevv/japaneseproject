# 🗺️ Roadmap & Future Improvements (.ai/knowledge/roadmap.md)

Tài liệu này vạch ra lộ trình phát triển kỹ thuật và các bước nâng cấp hệ thống **NihongoCards** từ dự án học tập lên nền tảng thương mại thực tế (Production SaaS).

---

## 1. Chuyển đổi Từ đồng nghĩa tĩnh sang Database (Dynamic Thesaurus)

* **Hiện tại**: Bản đồ từ đồng nghĩa tiếng Việt phục vụ so khớp đáp án tự luận đang viết cứng (hardcoded) ở frontend.
* **Mục tiêu**:
  * Tạo bảng CSDL `vocabulary_synonyms` (`id`, `vocab_id`, `synonym_text`).
  * Xây dựng API quản lý từ đồng nghĩa cho Admin.
  * Backend tự động gộp đáp án đồng nghĩa từ bảng này khi kiểm tra câu trả lời tự luận của học viên.
* **Cách thực hiện**:
  * Viết migration Flyway tạo bảng mới.
  * Cấu hình liên kết `@OneToMany` hoặc `@ElementCollection` trong thực thể `Vocabulary.java`.

---

## 2. Tích hợp SSL/HTTPS tự động (Auto-SSL Deployment)

* **Hiện tại**: Người dùng truy cập dự án thông qua IP trực tiếp của AWS EC2 bằng giao thức HTTP thường không bảo mật.
* **Mục tiêu**:
  * Đăng ký một tên miền chính thức (ví dụ: `nihongocards.com`).
  * Trỏ DNS tên miền về IP của EC2.
  * Cấu hình công cụ **Certbot** kết hợp **Let's Encrypt** trên máy chủ Nginx EC2 để tự động cấp phát và tự động gia hạn chứng chỉ bảo mật HTTPS (cổng 443).

---

## 3. Hệ thống phân tầng người dùng & Cổng thanh toán (SaaS Monetization)

* **Hiện tại**: Mọi tài khoản đều có toàn quyền sử dụng tất cả tính năng miễn phí.
* **Mục tiêu**:
  * Tạo bảng phân quyền role người dùng (`UserRole`: `FREE`, `PRO`, `ADMIN`).
  * Giới hạn tài khoản `FREE` chỉ được học tối đa 10 từ/ngày, không thể mở khóa ôn tập không giới hạn.
  * Tích hợp cổng thanh toán trực tuyến của Việt Nam như **PayOS** (hoặc MoMo/Stripe) bằng cách viết API tiếp nhận kết quả thanh toán trực tiếp (**Payment Webhook Listener**) để tự động nâng cấp tài khoản lên gói `PRO`.
