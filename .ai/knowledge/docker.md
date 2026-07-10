# 🐳 Container Configurations (.ai/knowledge/docker.md)

Tài liệu này đặc tả chi tiết thiết kế các tệp cấu hình container hóa (Dockerfiles và Docker Compose) sử dụng trong môi trường phát triển (Local) và vận hành thực tế (Production).

---

## 1. Backend Dockerfile (`backend/Dockerfile`)

Backend sử dụng quy trình xây dựng đa tầng (**Multi-stage Build**) kết hợp tối ưu cache thư viện:

```dockerfile
# Stage 1: Build JAR file
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
# Tải trước dependencies (Cache layer) để tăng tốc độ build
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime Environment
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

* **Ưu điểm**: 
  * Dung lượng runtime image cực nhẹ (~150MB) nhờ sử dụng base image Alpine JRE siêu gọn.
  * Tách biệt hoàn toàn mã nguồn gốc và cache Maven ra khỏi sản phẩm chạy cuối cùng.

---

## 2. Frontend Dockerfile (`frontend/Dockerfile`)

Frontend cũng sử dụng cơ chế đa tầng để build static files bằng Node và phân phối qua máy chủ Nginx:

```dockerfile
# Stage 1: Build React static assets
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --quiet
COPY . .
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

* **Ưu điểm**:
  * Chạy `npm ci` giúp tăng tốc độ nạp thư viện sạch.
  * Runtime image cực kỳ nhỏ gọn (~23MB) vì chỉ bao gồm máy chủ Nginx Alpine tĩnh và các file HTML/JS/CSS đã được minify.

---

## 3. Production Docker Compose (`docker-compose.yml`)

Dùng trên máy chủ AWS EC2, chỉ bao gồm backend và frontend (kết nối trực tiếp database AWS RDS bên ngoài):

* **Backend**:
  * Nhận các biến cấu hình thông qua file `.env` trên EC2 (`SPRING_PROFILES_ACTIVE=prod`, `DB_URL`, `DB_USER`, `DB_PASSWORD`).
  * Mount thư mục `./data` làm nơi lưu trữ chỉ mục Lucene để tránh mất chỉ mục khi restart container.
* **Frontend**:
  * Chạy Nginx ở cổng 80, phụ thuộc trực tiếp vào trạng thái hoạt động (healthy) của backend container.

---

## 4. Local Docker Compose (`docker-compose.local.yml`)

Dành riêng cho máy cá nhân của lập trình viên, tích hợp sẵn database MySQL 8.0 local để chạy ngay mà không cần cài đặt thêm gì:

* **MySQL Container (`db`)**:
  * Tên container: `flashcard-db`.
  * Biến môi trường: `MYSQL_ROOT_PASSWORD=root`, `MYSQL_DATABASE=flashcard`.
  * Cấu hình **Healthcheck** sửa lỗi khoảng cách mật khẩu: `test: ["CMD-SHELL", "mysqladmin ping -uroot -proot"]`.
* **Backend Container (`backend`)**:
  * Tự động đợi database MySQL local chuyển sang trạng thái khỏe mạnh mới khởi động.
  * Cấu hình biến môi trường kết nối trực tiếp đến container `db` trong mạng ảo Docker: `DB_URL=jdbc:mysql://db:3306/flashcard...`
* **Frontend Container (`frontend`)**:
  * Ánh xạ cổng `80:80` để người dùng truy cập trực tiếp qua địa chỉ `http://localhost`.
