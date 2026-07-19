# 📋 Báo Cáo Đánh Giá Production Readiness Review (PRR) & Checklist Cải Thiện — NihongoCards

Tài liệu này cung cấp toàn bộ báo cáo đánh giá **Production Readiness Review (PRR)** cùng danh sách các hạng mục kiểm tra (Checklist) chi tiết để tiến hành khắc phục các lỗi bảo mật, độ tin cậy và tối ưu hóa hệ thống trước khi phát hành cho người dùng thật.

---

## 🎯 KẾT LUẬN HIỆN TẠI
❌ **KHÔNG ĐƯỢC RELEASE CHO NGƯỜI DÙNG THẬT**

Hệ thống **chưa đủ điều kiện an toàn và tin cậy** để phát hành do còn tồn tại 4 lỗi nghiêm trọng cấp độ **Critical** (nguy cấp) liên quan đến bảo mật CORS, mất mát dữ liệu do tắt backup, nghẽn luồng xử lý do tích hợp AI đồng bộ và bỏ qua kiểm thử tự động trong CI/CD.

---

## 🛠️ CHECKLIST TIẾN TRÌNH CẢI THIỆN (ROADMAP & TASKS)

Hãy đánh dấu `[x]` vào các ô tương ứng sau khi hoàn thành từng hạng mục.

### 🚨 1. Việc Cần Làm Ngay (CRITICAL - Phải hoàn thành trước khi Release)
- [x] **Khắc phục lỗ hổng CORS Origin Reflection**: Sửa file [SecurityConfig.java](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/backend/src/main/java/com/flashcard/config/SecurityConfig.java) để chỉ định chính xác domain được phép truy cập (ví dụ: `https://phandeptrai.id.vn`), loại bỏ việc echo ngược Origin từ client vô điều kiện.
- [x] **Sửa cấu hình RDS Backup**: Sửa file CloudFormation [template.yaml](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/aws/template.yaml) đặt `BackupRetentionPeriod` tối thiểu là `7` ngày (thay vì `0`).
- [x] **Sửa lỗi script backup**: Sửa file [backup-db.sh](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/aws/backup-db.sh) để chạy lệnh `mysqldump` sao lưu cơ sở dữ liệu MySQL trên AWS RDS, thay vì copy file database H2 cục bộ (`flashcard.mv.db`).
- [x] **Sửa lỗi nghẽn luồng xử lý AI (REST Blocking)**: Sửa API `GET /api/vocab/{id}` trong [VocabularyController.java](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/backend/src/main/java/com/flashcard/controller/VocabularyController.java). Trả về dữ liệu thô ngay lập tức nếu từ vựng chưa được làm giàu (enriched), không dùng `.get()` làm nghẽn servlet thread của Tomcat khi gọi DeepSeek API.
- [x] **Kích hoạt chạy kiểm thử trong CI/CD**: Sửa tệp GitHub Actions [deploy.yml](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/.github/workflows/deploy.yml) để chạy lệnh test (`mvn test`) trước khi đóng gói image.
- [x] **Bật kiểm thử trong Dockerfile**: Sửa tệp [Dockerfile](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/backend/Dockerfile) của backend, loại bỏ cờ `-DskipTests` ở bước build.
- [ ] **Bảo mật mật khẩu database**: Gỡ bỏ mật khẩu mặc định hardcode của RDS (`Default: JapaneseProject123!`) trong tệp [template.yaml](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/aws/template.yaml) và chuyển sang truyền tham số an toàn khi deploy CloudFormation stack.

### 📅 2. Việc Cần Làm Tuần Này (HIGH - Ưu tiên cao sau khi Release thử nghiệm)
- [x] **Tạo chỉ mục (Database Indexes)**: Tạo file Flyway migration mới bổ sung chỉ mục tối ưu cho MySQL:
  - Chỉ mục tìm kiếm/lập lịch SRS: `CREATE INDEX idx_word_reviews_user_next ON word_reviews(user_id, next_review);`
  - Chỉ mục thống kê hoạt động học: `CREATE INDEX idx_study_sessions_user_date ON study_sessions(user_id, study_date);`
- [ ] **Khắc phục lỗi định tuyến Frontend (Router)**: Chuyển đổi cơ chế định tuyến từ dùng state trong [App.jsx](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/frontend/src/App.jsx) sang sử dụng thư viện **React Router** để phục hồi hoạt động chuẩn của nút Back/Forward và hỗ trợ chia sẻ link trực tiếp (Deep Linking).
- [ ] **Thêm Swap RAM cho EC2**: Cấu hình tệp Swap RAM dung lượng 2GB trên máy chủ EC2 `t3.micro` để hạn chế lỗi tràn bộ nhớ (Out of Memory) do Spring Boot và Lucene tiêu tốn RAM.
- [ ] **Xác thực file upload**: Sửa API import Excel trong [ImportController.java](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/backend/src/main/java/com/flashcard/controller/ImportController.java) để kiểm tra phần mở rộng tệp tin (chỉ cho phép `.xlsx`) và định dạng MIME type để phòng chống tấn công DoS/Zip Bomb.

### 🗓️ 3. Việc Cần Làm Tháng Này (MEDIUM - Tăng độ ổn định và SEO)
- [ ] **Tích hợp theo dõi lỗi tự động**: Cài đặt **Sentry** cho cả frontend React và backend Spring Boot để tự động bắt lỗi ngoại lệ trên môi trường production.
- [ ] **Tách chỉ mục Lucene nhúng để Scale-out**: Cấu hình Spring Boot và Hibernate Search kết nối sang cụm **AWS OpenSearch/Elasticsearch** độc lập để có thể scale ngang backend chạy nhiều container đồng thời.
- [ ] **Bổ sung các file SEO cơ bản**: Tạo và bổ sung các file `robots.txt` và `sitemap.xml` vào thư mục `public` của frontend.
- [ ] **Tích hợp Open Graph (OG) tags**: Dùng React Helmet để thay đổi động các thẻ meta title, description và Open Graph khi chia sẻ link từ vựng.
- [ ] **Blacklist cho Refresh Token**: Xây dựng cơ chế lưu vết hoặc lưu danh sách đen (Blacklist) của JWT Refresh Token trong cơ sở dữ liệu để cho phép quản trị viên thu hồi/vô hiệu hóa token bị lộ.

### 🚀 4. Việc Nên Làm Sau Khi Release (LOW - Tính năng bổ sung)
- [ ] **Tích hợp cổng thanh toán**: Nghiên cứu tích hợp PayOS, Momo hoặc Stripe để thương mại hóa (SaaS).
- [ ] **Cấu hình CDN**: Thiết lập AWS CloudFront hoặc Cloudflare đứng trước Nginx trên host EC2 để cache các asset tĩnh (JS/CSS/Image), giảm tải CPU và chi phí băng thông cho máy chủ EC2.
- [ ] **Graceful Shutdown**: Cấu hình `server.shutdown=graceful` trong file properties của backend để đảm bảo an toàn giao dịch DB khi restart container.
- [ ] **Thêm kiểm thử tự động**: Viết bổ sung các bài Integration Test (Spring Boot) và E2E Test (Playwright hoặc Cypress).

---

## 📊 ĐÁNH GIÁ TỔNG QUAN HỆ THỐNG (BẢNG ĐIỂM)

| Thành phần đánh giá | Điểm số | Trạng thái đánh giá | Ghi chú chính |
| :--- | :---: | :---: | :--- |
| **Kiến trúc (Architecture)** | 65 / 100 | ★★★☆☆ Đạt | Bị giới hạn scale-out do Lucene cục bộ. |
| **Backend** | 75 / 100 | ★★★☆☆ Đạt | Thiết kế REST tốt nhưng thiếu Caching. |
| **Frontend** | 70 / 100 | ★★★☆☆ Đạt | Giao diện tối đẹp, nhưng hỏng nút Back/Forward. |
| **Cơ sở dữ liệu (Database)** | 60 / 100 | ★★★☆☆ Đạt | Thiếu hoàn toàn các Indexes tối ưu hóa. |
| **Hiệu năng (Performance)** | 40 / 100 | ★★☆☆☆ Cần cải thiện | Rủi ro nghẽn luồng Tomcat do gọi AI đồng bộ. |
| **Bảo mật (Security)** | 45 / 100 | ★★☆☆☆ Cần cải thiện | Lỗ hổng CORS Origin Reflection nghiêm trọng. |
| **DevOps** | 55 / 100 | ★★☆☆☆ Cần cải thiện | Pipeline CI/CD tự động nhưng bỏ qua test. |
| **Kiểm thử (Testing)** | 30 / 100 | ★★☆☆☆ Cần cải thiện | Tỷ lệ phủ thấp, không chạy test trước khi deploy. |
| **Khả năng bảo trì (Maintainability)** | 80 / 100 | ★★★★☆ Tốt | Code sạch, cấu trúc rõ ràng, không dùng Lombok. |
| **Độ sẵn sàng (Prod Readiness)** | 30 / 100 | ★★☆☆☆ Cần cải thiện | Backup RDS bị tắt, script backup sai database. |
| **Trải nghiệm người dùng (UX)** | 70 / 100 | ★★★☆☆ Đạt | Đẹp, mượt nhưng bị hỏng Router điều hướng. |
| **SEO** | 20 / 100 | ★☆☆☆☆ Không đạt | Thiếu robots.txt, sitemap.xml và Meta tags. |
| **Mặt kinh doanh (Business)** | 50 / 100 | ★★☆☆☆ Cần cải thiện | Thiếu phân tích hành vi và cổng thanh toán. |
| **ĐIỂM ĐÁNH GIÁ TỔNG THỂ** | **53 / 100** | | **Chưa đủ điều kiện phát hành (Release)** |

---

## 🔍 CHI TIẾT ĐÁNH GIÁ TỪNG PHẦN

### PHẦN 1: KIẾN TRÚC TỔNG THỂ
* **Điểm**: ★★★☆☆ (Đạt)
* **Giải thích**: Cấu trúc Layered Architecture (MVC) Spring Boot rõ ràng. Độ kết dính (Cohesion) tốt. Tuy nhiên độ phụ thuộc trạng thái còn cao.
* **Rủi ro**: Không thể scale ngang backend do Hibernate Search Lucene ghi file trực tiếp lên ổ đĩa của từng EC2 instance.
* **Cách cải thiện**: Thay thế Lucene nhúng cục bộ bằng AWS OpenSearch hoặc Elasticsearch độc lập.
* **Mức độ ưu tiên**: **High (Cao)**

### PHẦN 2: BACKEND
* **Điểm**: ★★★☆☆ (Đạt)
* **Giải thích**: Thiết kế RESTful và Exception Handling tập trung tốt. Tích hợp Rate limit Bucket4j ngăn brute-force hiệu quả.
* **Rủi ro**: Thiếu tầng Caching (Redis) dẫn đến áp lực đọc trực tiếp DB liên tục; Refresh Token không có blacklist để thu hồi khi bị lộ.
* **Cách cải thiện**: Cài đặt Redis làm cache layer và whitelist/blacklist Refresh Token.
* **Mức độ ưu tiên**: **Medium (Trung bình)**

### PHẦN 3: FRONTEND
* **Điểm**: ★★★☆☆ (Đạt)
* **Giải thích**: Giao diện Glassmorphism tối đẹp mắt. Context state management tốt.
* **Rủi ro**: Router tự chế bằng React State làm hỏng nút Back/Forward của trình duyệt và không có Deep Linking. Lưu token ở `localStorage` dễ bị tấn công XSS đánh cắp.
* **Cách cải thiện**: Chuyển sang React Router hoặc TanStack Router. Lưu token trong HttpOnly Cookies.
* **Mức độ ưu tiên**: **High (Cao)**

### PHẦN 4: DATABASE
* **Điểm**: ★★★☆☆ (Đạt)
* **Giải thích**: Database Schema chuẩn hóa tốt, có Flyway quản lý migration dữ liệu.
* **Rủi ro**: Thiếu indexes trên các trường hay filter/sort (`next_review`, `study_date`). Rủi ro lỗi xung đột ghi (deadlock/duplicate key) tại StudySession khi 2 request ghi song song.
* **Cách cải thiện**: Tạo migration bổ sung chỉ mục tối ưu. Thay thế logic ghi StudySession bằng cơ chế Upsert an toàn.
* **Mức độ ưu tiên**: **High (Cao)**

### PHẦN 5: SECURITY
* **Điểm**: ★★☆☆☆ (Cần cải thiện)
* **Giải thích**: Sử dụng mã hóa mật khẩu BCrypt.
* **Rủi ro**: Lỗ hổng CORS Origin Reflection nghiêm trọng tại backend; rò rỉ mật khẩu mặc định của RDS trong file template CloudFormation; API upload Excel không xác thực định dạng file mở rộng.
* **Cách cải thiện**: Sửa CORS whitelist chính xác domain; gỡ bỏ mật khẩu hardcode RDS; thêm validator file upload.
* **Mức độ ưu tiên**: **Critical (Nguy cấp)**

### PHẦN 6: PERFORMANCE
* **Điểm**: ★★☆☆☆ (Cần cải thiện)
* **Giải thích**: Load test: **UNKNOWN** (chưa thực hiện).
* **Rủi ro**: Gọi DeepSeek API đồng bộ bằng `.get()` làm block luồng REST controller, rủi ro sập luồng Tomcat (DoS) cực kỳ cao. EC2 t3.micro chỉ có 1GB RAM dễ bị Out of Memory.
* **Cách cải thiện**: Thiết kế luồng xử lý AI bất đồng bộ; thêm Swap RAM hoặc nâng cấp RAM EC2.
* **Mức độ ưu tiên**: **Critical (Nguy cấp)**

### PHẦN 7: DEVOPS
* **Điểm**: ★★☆☆☆ (Cần cải thiện)
* **Giải thích**: CI/CD tự động qua GitHub Actions và SSM Agent hoạt động tốt.
* **Rủi ro**: Không có monitoring & alerting để cảnh báo sự cố; deploy downtime khi tắt bật container.
* **Cách cải thiện**: Cài đặt Prometheus + Grafana giám sát Actuator; tích hợp Telegram bot cảnh báo.
* **Mức độ ưu tiên**: **High (Cao)**

### PHẦN 8: TESTING
* **Điểm**: ★★☆☆☆ (Cần cải thiện)
* **Giải thích**: Tỷ lệ test coverage thấp.
* **Rủi ro**: Pipeline deploy bỏ qua test hoàn toàn (`-DskipTests`), cho phép code lỗi deploy trực tiếp lên server.
* **Cách cải thiện**: Bỏ cờ `-DskipTests` và tích hợp `mvn test` vào GitHub Actions workflow.
* **Mức độ ưu tiên**: **Critical (Nguy cấp)**

### PHẦN 9: OBSERVABILITY
* **Điểm**: ★☆☆☆☆ (Không đạt)
* **Giải thích**: Không có hệ thống tracking log/metrics tập trung.
* **Rủi ro**: Mù thông tin vận hành khi có lỗi xảy ra trên production.
* **Cách cải thiện**: Tích hợp Sentry để ghi nhận lỗi runtime tự động.
* **Mức độ ưu tiên**: **Medium (Trung bình)**

### PHẦN 10: RELIABILITY
* **Điểm**: ★★★☆☆ (Đạt)
* **Giải thích**: Tích hợp Semaphore Bulkhead bảo vệ AI API và timeout đầy đủ.
* **Rủi ro**: Thiếu Circuit Breaker bảo vệ khi API bên thứ ba lỗi liên tục; tắt backend đột ngột không Graceful Shutdown.
* **Cách cải thiện**: Tích hợp Resilience4j Circuit Breaker; bật cấu hình graceful shutdown.
* **Mức độ ưu tiên**: **Medium (Trung bình)**

### PHẦN 11: PRODUCTION READINESS
* **Điểm**: ★★☆☆☆ (Cần cải thiện)
* **Giải thích**: SSL Let's Encrypt cấu hình tự động gia hạn tốt.
* **Rủi ro**: RDS tắt tính năng backup tự động; script backup database sao lưu nhầm database H2 local thay vì MySQL. Rủi ro mất mát dữ liệu vĩnh viễn là 100% nếu có sự cố.
* **Cách cải thiện**: Bật backup tự động RDS (retention > 0); viết lại script backup sử dụng `mysqldump`.
* **Mức độ ưu tiên**: **Critical (Nguy cấp)**

### PHẦN 12: USER EXPERIENCE
* **Điểm**: ★★★☆☆ (Đạt)
* **Giải thích**: Giao diện đẹp, mượt.
* **Rủi ro**: Phím Back/Forward trình duyệt bị hỏng làm gián đoạn trải nghiệm điều hướng.
* **Cách cải thiện**: Sửa đổi cơ chế định tuyến frontend.
* **Mức độ ưu tiên**: **High (Cao)**

### PHẦN 13: SEO
* **Điểm**: ★☆☆☆☆ (Không đạt)
* **Giải thích**: React SPA không có SSR/SSG.
* **Rủi ro**: Thiếu robots.txt, sitemap.xml và OG tags cho chia sẻ mạng xã hội. Không thể index trên công cụ tìm kiếm.
* **Cách cải thiện**: Bổ sung các file cấu hình SEO cơ bản và sử dụng React Helmet.
* **Mức độ ưu tiên**: **Medium (Trung bình)**

### PHẦN 14: BUSINESS
* **Điểm**: ★★☆☆☆ (Cần cải thiện)
* **Giải thích**: Có giao diện admin và thống kê cơ bản.
* **Rủi ro**: Thiếu cổng thanh toán và công cụ phân tích hành vi người dùng (GA4/Mixpanel). Thiếu audit logs ghi vết hành động admin.
* **Cách cải thiện**: Tích hợp GA4; thêm bảng lưu log vết sửa/xóa dữ liệu của Admin.
* **Mức độ ưu tiên**: **Low (Thấp)**

### PHẦN 15: CODE QUALITY
* **Điểm**: ★★★★☆ (Tốt)
* **Giải thích**: Code sạch sẽ, đặt tên biến rõ ràng. Tuân thủ nghiêm ngặt quy định không dùng Lombok theo yêu cầu của dự án.
* **Rủi ro**: Hằng số SM-2 bị hardcode trong code.
* **Cách cải thiện**: Đưa các cấu hình hệ số của thuật toán SM-2 ra file properties.
* **Mức độ ưu tiên**: **Low (Thấp)**
