# 🐳 Containerization & Docker Rules (.ai/rules/06-docker-rule.md)

Tài liệu này quy định các tiêu chuẩn đóng gói container và viết cấu hình Docker Compose cho dự án.

---

## 🚫 Nguyên tắc đóng gói và vận hành Container

1. **Bắt buộc sử dụng Multi-stage Builds**:
   * Tất cả Dockerfile viết mới hoặc cập nhật phải sử dụng cơ chế xây dựng đa tầng (Multi-stage Build) để tách rời mã nguồn/công cụ xây dựng ra khỏi runtime image, đảm bảo dung lượng file sản phẩm cuối cùng luôn nhẹ nhất.
2. **Tối ưu hóa Docker Build Cache**:
   * Luôn thực hiện copy các tệp cấu hình thư viện trước (`package.json`, `pom.xml`), cài đặt dependencies (`npm ci`, `mvn dependency:go-offline`), sau đó mới copy mã nguồn gốc để Docker có thể cache layer thư viện hiệu quả, tránh tải lại từ đầu khi chỉ thay đổi code logic.
3. **Cấu hình Healthcheck cho dịch vụ phụ thuộc**:
   * Bất kỳ service nào phụ thuộc vào dịch vụ khác trong `docker-compose` (như Backend phụ thuộc Database) phải định nghĩa thẻ `healthcheck` rõ ràng trong service gốc và cấu hình điều kiện `condition: service_healthy` ở service phụ thuộc.
4. **Không viết tag `version`**:
   * Tuân thủ đặc tả Docker Compose spec mới nhất, tuyệt đối không khai báo dòng `version: '3.8'` hay tương tự ở đầu các tệp `docker-compose.yml` để tránh gây cảnh báo lỗi thời.
