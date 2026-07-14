# 📚 Tài liệu Dự án NihongoCards

Chào mừng bạn đến với tài liệu hướng dẫn và mô tả dự án **NihongoCards** — Hệ thống SaaS học từ vựng tiếng Nhật thông minh sử dụng thẻ ghi nhớ (Flashcard) và thuật toán học tập giãn cách (Spaced Repetition System).

Để hiểu rõ hơn về hệ thống, vui lòng tham khảo các tài liệu chi tiết dưới đây:

---

## 📂 Mục lục tài liệu (.md)

1. ### [Mô tả Chức năng Hệ thống (FEATURES.md)](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/docs/FEATURES.md)

   *Chi tiết về các tính năng dành cho học viên, chế độ làm Quiz thông minh, giao diện quản lý từ vựng của Admin, và bảng thống kê tiến độ học tập (Analytics).*

2. ### [Kiến trúc & Cách thức Hoạt động (ARCHITECTURE.md)](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/docs/ARCHITECTURE.md)

   *Phân tích luồng dữ liệu, thuật toán SuperMemo-2 (SM-2), cơ chế bảo mật JWT/CORS động, mô hình chạy Docker container và sơ đồ deploy CI/CD lên AWS.*

3. ### [Đánh giá Ưu điểm & Nhược điểm (PROS_CONS.md)](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/docs/PROS_CONS.md)

   *Phân tích các thế mạnh nổi trội trong thiết kế hiện tại và các điểm hạn chế cần cải thiện để đưa dự án lên mô hình SaaS thương mại thực tế.*

---

## ⚡ Hướng dẫn chạy nhanh ở Local (Quick Start)

Dự án hỗ trợ cơ chế chạy local nhanh chóng không cần cài đặt cơ sở dữ liệu cồng kềnh (Sử dụng database H2 dạng file tự động tạo):

### 1. Khởi động Backend

```bash
cd backend
./mvnw.cmd spring-boot:run
```

*API sẽ chạy tại địa chỉ: `http://localhost:8080`*

### 2. Khởi động Frontend

```bash
cd frontend
npm install
npm run dev
```

*Giao diện học tập sẽ chạy tại địa chỉ: `http://localhost:5173`*

### 🐳 3. Khởi động bằng Docker Compose (Đầy đủ BE, FE, MySQL)

Để khởi động toàn bộ môi trường học tập local trong Docker (bao gồm MySQL database, Java Spring Boot backend, và Vite frontend):

```bash
# Khởi động các container (build lại nếu có thay đổi code)
docker compose -f docker-compose.local.yml up --build -d

# Dừng các container
docker compose -f docker-compose.local.yml down
```

* Giao diện học tập: `http://localhost`
* API Backend: `http://localhost:8080`
* MySQL Database: `localhost:3306` (User: `root`, Password: `root`, DB: `flashcard`)
ok
