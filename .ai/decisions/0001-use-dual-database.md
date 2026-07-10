# ADR 0001: Use Dual-Database Setup (.ai/decisions/0001-use-dual-database.md)

## Status
Accepted

## Context
Nhà phát triển cần chạy dự án local nhanh chóng mà không gặp rào cản phức tạp từ việc cài đặt, quản lý cơ sở dữ liệu MySQL trên máy cá nhân. Tuy nhiên, ở môi trường production (AWS), hệ thống cần đảm bảo tính bền vững, an toàn dữ liệu 100% bằng cách kết nối với hệ quản trị cơ sở dữ liệu MySQL RDS chuyên dụng.

## Decision
Chúng tôi quyết định thiết lập mô hình **Dual-Database** (Cơ sở dữ liệu kép):
1. **Môi trường Phát triển (Local)**:
   * Sử dụng **H2 database** chạy ở chế độ lưu file cục bộ tại thư mục `./data/flashcard`.
   * Lớp config `ExcelDataLoader` tự động đọc dữ liệu từ tệp Excel mẫu để điền từ vựng vào DB khi khởi chạy lần đầu giúp có dữ liệu test ngay lập tức.
2. **Môi trường Production (AWS)**:
   * Chạy hệ quản trị cơ sở dữ liệu **MySQL 8.0** liên kết với AWS RDS.
   * Spring Boot tự động nhận diện cấu hình MySQL khi có profile `prod` được kích hoạt.
3. **Local Docker Compose**:
   * Để hỗ trợ kiểm thử trọn gói trong container, một tệp `docker-compose.local.yml` được phát triển để tự động spin up container MySQL 8.0 nhằm kiểm tra sự tương đồng 100% với môi trường AWS RDS mà không gây ảnh hưởng đến môi trường dev direct.

## Consequences
* **Ưu điểm**:
   * Nhà phát triển mới tải dự án chỉ cần gõ 1 lệnh Maven là chạy được ngay backend (Zero-Setup).
   * Dữ liệu trên production được phân tách độc lập và bảo mật cao thông qua VPC Security Group của AWS RDS.
* **Nhược điểm**:
   * Có sự khác biệt nhỏ về cú pháp SQL giữa H2 và MySQL. Tuy nhiên, việc sử dụng Spring Data JPA / Hibernate ORM đã giảm thiểu tối đa sự bất tương thích này nhờ tự động điều chỉnh SQL Dialect.
