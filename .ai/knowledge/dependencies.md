# 📦 Project Dependencies (.ai/knowledge/dependencies.md)

Tài liệu này tổng hợp toàn bộ các thư viện bên thứ ba và dependencies đang được sử dụng trong dự án **NihongoCards**.

---

## 1. Backend Maven Dependencies (`pom.xml`)

### Spring Boot Starters
* **`spring-boot-starter-data-jpa`**: Hỗ trợ kết nối cơ sở dữ liệu quan hệ, ORM Hibernate và Spring Data Repositories.
* **`spring-boot-starter-web`**: Cung cấp cấu trúc xây dựng RESTful APIs, Spring MVC, máy chủ Apache Tomcat nhúng và phân tích dữ liệu JSON.
* **`spring-boot-starter-security`**: Bộ máy bảo mật, cấu hình phân quyền và bộ lọc xác thực HTTP.
* **`spring-boot-starter-actuator`**: Endpoint theo dõi thông tin hoạt động (`/actuator/health`).
* **`spring-boot-starter-test`**: Cung cấp các công cụ kiểm thử JUnit 5, Mockito và Spring Test Context.

### Thư viện bổ sung (Third-party Libraries)
* **`bucket4j-core` (v8.10.1)**: Thư viện Rate Limiting theo thuật toán Token Bucket để giới hạn số lượng request theo địa chỉ IP.
* **`java-jwt` (v4.4.0) từ Auth0**: Tạo, ký và giải mã/xác thực mã chữ ký số JWT.
* **`poi-ooxml` (v5.3.0) từ Apache**: Hỗ trợ xử lý tệp tin Excel (.xlsx) để import kho từ điển.
* **`flyway-core` & `flyway-mysql`**: Tự động quản lý lịch sử migration phiên bản database.
* **`hibernate-search-mapper-orm` & `hibernate-search-backend-lucene` (v7.2.0.Final)**: Hỗ trợ tạo chỉ mục Lucene và truy vấn tìm kiếm mờ trực tiếp từ cơ sở dữ liệu.
* **`mysql-connector-j`**: JDBC Driver kết nối database MySQL 8.x.
* **`h2`**: Database H2 phục vụ chạy local không cần cài đặt.

---

## 2. Frontend NPM Dependencies (`package.json`)

### Dependencies cốt lõi (Core)
* **`react` & `react-dom` (v19.2.7)**: Framework giao diện chính của SPA.
* **`axios` (v1.18.1)**: HTTP Client thực hiện các request phi tuần tự gửi lên API.
* **`lucide-react` (v1.21.0)**: Bộ icons giao diện phong cách SVG tối giản hiện đại.
* **`xlsx` (v0.18.5) (SheetJS)**: Đọc/Xuất dữ liệu Excel trực tiếp từ trình duyệt (nếu có).

### DevDependencies (Phát triển)
* **`vite` (v8.1.0)**: Máy chủ phát triển siêu tốc kiêm bundler đóng gói sản phẩm.
* **`@vitejs/plugin-react` (v6.0.2)**: Plugin Vite hỗ trợ React Fast Refresh và JSX compiling.
* **`oxlint` (v1.69.0)**: Công cụ linter siêu tốc chạy trên Rust để quét lỗi cú pháp Javascript nhanh hơn ESLint.
