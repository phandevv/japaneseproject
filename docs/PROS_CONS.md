# ⚖️ Phân tích Ưu điểm & Nhược điểm (PROS_CONS.md)

Tài liệu này đánh giá khách quan về thiết kế kiến trúc hiện tại của dự án **NihongoCards**, làm rõ các điểm mạnh (Ưu điểm) giúp hệ thống vận hành tốt và các mặt hạn chế (Nhược điểm) cần khắc phục khi mở rộng.

---

## 1. Ưu điểm (Advantages / Pros)

### 💎 Trải nghiệm người dùng thông minh & mượt mà
* **So khớp tiếng Việt linh hoạt:** Việc hỗ trợ từ đồng nghĩa và chấp nhận sai số chính tả nhỏ (typo) giúp người dùng học tập tự nhiên, giảm cảm giác ức chế khi gõ đúng ý nhưng sai cấu trúc viết hoặc thiếu dấu.
* **Giao diện tối (Dark Mode) cao cấp:** Sử dụng thiết kế Glassmorphism hiện đại, tạo hiệu ứng mờ kính và các micro-animations tinh tế giúp học viên không bị mỏi mắt khi học ban đêm.

### 🔌 Kiến trúc Stateless & Dễ nâng cấp
* **Không lưu trạng thái (Stateless Backend):** Việc xác thực bằng JWT giúp backend không tốn tài nguyên lưu session trên RAM. EC2 có thể restart bất cứ lúc nào mà không làm gián đoạn phiên làm việc của người dùng.
* **Độc lập cơ sở dữ liệu:** Tách biệt ứng dụng chạy trên EC2 và lưu dữ liệu trên AWS RDS MySQL đảm bảo an toàn dữ liệu 100% khi container bị xóa hoặc cập nhật phiên bản mới.
* **CORS động an toàn:** Cơ chế CORS phản hồi nguồn động tự nhận diện IP/Domain đích giúp việc deploy trên bất kỳ IP EC2 thay đổi nào cũng hoạt động ngay mà không cần cấu hình lại mã nguồn.

### 🛠️ Thân thiện với lập trình viên (Developer Experience)
* **Zero-Setup Local Database:** Sử dụng H2 database lưu file cục bộ dưới local giúp nhà phát triển mới chỉ cần tải code về và gõ 1 lệnh là chạy được ngay, không cần cấu hình MySQL phức tạp dưới máy cá nhân.
* **CI/CD hoàn toàn tự động:** Kết nối trơn tru giữa GitLab CI/CD, AWS ECR và AWS SSM giúp đẩy code là hệ thống tự động deploy lên AWS EC2 trong chưa đầy 1 phút.

---

## 2. Nhược điểm (Disadvantages / Cons)

### ⚠️ Giới hạn về từ điển đồng nghĩa (Static Thesaurus)
* **Dữ liệu từ đồng nghĩa được khai báo cứng (Hardcoded):** Bản đồ từ đồng nghĩa hiện tại đang được quản lý trực tiếp bằng mảng tĩnh trong code JavaScript ở Frontend.
* **Giải pháp khắc phục:** Khi số lượng từ tăng lên, nên chuyển phần xử lý từ đồng nghĩa này về lưu trữ trong Database (Bảng `synonyms`) và cung cấp giao diện cho Admin quản lý, cập nhật trực tiếp.

### 🌐 Chưa có cơ chế Auto-HTTPS (SSL)
* **Chỉ chạy HTTP thường:** Do người dùng truy cập trực tiếp bằng địa chỉ IP của EC2 và chưa gắn tên miền (domain), hệ thống chưa thể cài đặt chứng chỉ SSL (Let's Encrypt). Trình duyệt sẽ hiển thị cảnh báo "Không an toàn" (Not Secure).
* **Giải pháp khắc phục:** Cần mua một tên miền (domain) và cấu hình **Certbot / Let's Encrypt** trên Nginx của EC2 để tự động gia hạn chứng chỉ HTTPS.

### 💸 Thiếu cổng thanh toán tự động và phân quyền gói dịch vụ (SaaS billing)
* **Chưa có tính năng thu phí:** Hiện tại hệ thống đang cho phép tất cả các tài khoản sử dụng mọi tính năng một cách miễn phí không giới hạn.
* **Giải pháp khắc phục:** Cần tích hợp cổng thanh toán trực tuyến (như PayOS / Momo / Stripe) và tạo bảng phân cấp người dùng (`UserRole`: FREE, PRO) để giới hạn số từ được học mỗi ngày đối với tài khoản miễn phí.
