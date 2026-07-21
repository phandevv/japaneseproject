# 📖 Hướng Dẫn Kiến Thức Hệ Thống Toàn Diện (SYSTEM_KNOWLEDGE.md)

Tài liệu này tổng hợp toàn bộ kiến thức hiện tại của dự án **NihongoCards**, bao gồm kiến trúc công nghệ, các tính năng cốt lõi, quy trình phát triển và kiểm thử ở local, luồng triển khai (CI/CD) lên production trên AWS, cùng các thuật toán vận hành hệ thống.

---

## 🗂️ Mục lục
1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Chi Tiết Công Nghệ (Tech Stack)](#2-chi-tiết-công-nghệ-tech-stack)
3. [Cấu Trúc Thư Mục & Phân Lớp (Directory Structure)](#3-cấu-trúc-thư-mục--phân-lớp-directory-structure)
4. [Lược Đồ Cơ Sở Dữ Liệu (Database Schema)](#4-lược-đồ-cơ-sở-dữ-liệu-database-schema)
5. [Thuật Toán Cốt Lõi & Nghiệp Vụ](#5-thuật-toán-cốt-lõi--nghiệp-vụ)
6. [Môi Trường Phát Triển & Kiểm Thử Cục Bộ (Local)](#6-môi-trường-phát-triển--kiểm-thử-cục-bộ-local)
7. [Quy Trình Triển Khai Lên Production (AWS CI/CD)](#7-quy-trình-triển-khai-lên-production-aws-cicd)
8. [Danh Sách Các Endpoint API REST](#8-danh-sách-các-endpoint-api-rest)
9. [Đánh Giá Ưu Điểm & Nhược Điểm](#9-đánh-giá-ưu-điểm--nhược-điểm)

---

## 1. Tổng Quan Hệ Thống

**NihongoCards** là một ứng dụng SaaS thông minh hỗ trợ học từ vựng tiếng Nhật từ cấp độ N5 đến N1. Hệ thống hoạt động dựa trên phương pháp học tập giãn cách (**Spaced Repetition System - SRS**) giúp tối ưu hóa khả năng ghi nhớ từ vựng của học viên theo thời gian.

Hệ thống được thiết kế theo mô hình **Client-Server** phân tách hoàn toàn:
* **Frontend**: SPA (Single Page Application) xây dựng bằng React & Vite, giao diện tối (Dark Mode) bóng bẩy theo phong cách Glassmorphism.
* **Backend**: RESTful API sử dụng Java Spring Boot 3.5.x, bảo mật bằng JWT Stateless Token.

---

## 2. Chi Tiết Công Nghệ (Tech Stack)

### Backend (Spring Boot)
* **Ngôn ngữ & Runtime**: Java 21, Spring Boot 3.5.x.
* **Security & Auth**: Spring Security cấu hình Stateless, xác thực qua **JWT Bearer Token**.
* **Database Access**: Spring Data JPA kết hợp Hibernate.
* **Database Migrations**: **Flyway** quản lý phiên bản cơ sở dữ liệu (`backend/src/main/resources/db/migration/`).
* **Full-text Search**: **Hibernate Search** tích hợp **Apache Lucene** để lập chỉ mục phục vụ tìm kiếm nhanh chóng, đa dạng.
* **Rate Limiting**: Sử dụng thư viện **Bucket4j** (thuật toán Token Bucket) giới hạn tần suất yêu cầu ở các API nhạy cảm (như Auth) để chống tấn công Brute-force.
* **Monitoring**: **Spring Boot Actuator** cung cấp `/actuator/health` phục vụ kiểm tra trạng thái hoạt động của container.

### Frontend (React)
* **Build tool**: Vite (tốc độ đóng gói siêu tốc).
* **Styling**: Vanilla CSS (CSS thuần) tối ưu hóa kích thước bundle và thiết kế giao diện tùy biến tối đa.
* **Icons**: Thư viện `lucide-react`.
* **API Client**: Axios được trang bị Interceptors để tự động đính kèm Token và tự động logout khi nhận mã phản hồi lỗi `401/403` (Token hết hạn).

### Cơ Sở Dữ Liệu (Dual-Database)
* **Local (H2 File)**: Sử dụng H2 database dạng file lưu trữ tại `./data/flashcard` giúp lập trình viên phát triển nhanh không cần cài MySQL cá nhân.
* **Production / Docker Local**: Chạy cơ sở dữ liệu **MySQL 8.0** để đảm bảo tính an toàn dữ liệu, tính bền vững và hỗ trợ mở rộng.

---

## 3. Cấu Trúc Thư Mục & Phân Lớp (Directory Structure)

### Backend Modules (`com.flashcard.*`)
Cấu trúc tái cấu trúc theo mô hình **Module-based / Package-by-feature**:
* **`common`**: Các cấu hình hệ thống & AI core shared.
  * `common.config`: `SecurityConfig`, `JwtAuthFilter`, `WebSocketConfig`, `SearchIndexer`, `ExcelDataLoader`.
  * `common.ai`: `AIProvider`, `DeepSeekProvider`, `PromptBuilder`.
* **`user`**: Module quản lý người dùng và xác thực.
  * `user.controller`: `AuthController`, `UserController`, `UserSettingController`.
  * `user.service`: `AuthService`, `UserSettingService`, `OnlineUserService`.
  * `user.repository`: `UserRepository`, `UserSettingRepository`.
  * `user.model`: `User`, `UserSetting`.
* **`vocabulary`**: Module từ điển và nhập dữ liệu từ vựng.
  * `vocabulary.controller`: `VocabularyController`, `ImportController`.
  * `vocabulary.service`: `VocabularyService`, `ExcelImportService`.
  * `vocabulary.repository`: `VocabularyRepository`.
  * `vocabulary.model`: `Vocabulary`.
* **`srs`**: Module học tập giãn cách (Spaced Repetition System - SM-2 & FSRS).
  * `srs.controller`: `SrsController`, `StudyController`.
  * `srs.service`: `SrsService`, `GrammarSrsService`, `FsrsAlgorithm`, `SpacedRepetitionAlgorithm`, `LearningStrategyService`, `StudySessionHelper`.
  * `srs.repository`: `WordReviewRepository`, `GrammarReviewRepository`, `ReviewLogRepository`, `ReviewRecommendationRepository`, `StudySessionRepository`, `DailyStudyStatsRepository`.
  * `srs.model`: `WordReview`, `GrammarReview`, `ReviewLog`, `ReviewRecommendation`, `ReviewRating`, `WordReviewState`, `StudySession`, `DailyStudyStats`.
  * `srs.dto`: `WordReviewDto`.
* **`knowledge`**: Module AI Enrichment, Kho tri thức cá nhân, Chat & Hội thoại.
  * `knowledge.controller`: `KnowledgeController`, `AiExerciseController`, `ChatController`, `ConversationController`, `ConversationWebSocketHandler`, `FeedbackController`.
  * `knowledge.service`: `KnowledgeService`, `DeepSeekEnrichmentService`, `PersonalCorpusService`, `ChatService`, `ConversationManager`, `FeedbackService`, `SchedulerService`.
  * `knowledge.repository`: `GrammarCardRepository`, `KnowledgeVersionRepository`, `ConversationRepository`, `ConversationMessageRepository`, `ConversationCorrectionRepository`, `SpeakingStatisticsRepository`, `FeedbackRepository`.
  * `knowledge.model`: `GrammarCard`, `KnowledgeVersion`, `Conversation`, `ConversationMessage`, `ConversationCorrection`, `SpeakingStatistics`, `Feedback`.
* **`analytics`**: Module thống kê tiến trình học tập và bảng xếp hạng.
  * `analytics.controller`: `AnalyticsController`.
  * `analytics.service`: `AnalyticsService`.


### Frontend Structure (`frontend/src/*`)
* **`components`**: Các thành phần tái sử dụng.
  * `FlashcardCard.jsx`: Thẻ ghi nhớ 2 mặt (lật mặt khi nhấn, phát âm thủ công qua SpeechSynthesis).
  * `KanjiDetailModal.jsx`: Modal tra cứu chi tiết hán tự gồm bộ thủ, âm On/Kun, nghĩa và từ ghép đi kèm.
  * `Navbar.jsx` / `Footer.jsx` / `ProfileModal.jsx`.
* **`context`**: Quản lý State toàn cục.
  * `AuthContext.jsx`: Cung cấp trạng thái đăng nhập, phương thức login/logout và lưu trữ Token.
  * `LanguageContext.jsx`: Cấu hình đa ngôn ngữ (Tiếng Việt và Tiếng Anh).
* **`pages`**: Các trang chức năng của ứng dụng.
  * `HomePage.jsx`: Dashboard chính, bảng xếp hạng điểm số và lưới lịch sử học tập 30 ngày.
  * `DailyStudyPage.jsx`: Chế độ học hàng ngày theo bài học và bài kiểm tra trắc nghiệm/tự luận.
  * `FlashcardPage.jsx`: Chế độ ôn tập qua Flashcards hỗ trợ lọc theo ngày và SRS.
  * `SearchPage.jsx`: Tìm kiếm từ vựng thời gian thực qua Kanji, Kana, Romaji hoặc nghĩa tiếng Việt.
  * `VocabAdminPage.jsx`: Trang quản lý từ điển dành riêng cho tài khoản admin.
  * `AuthPage.jsx`: Trang đăng nhập và đăng ký.
* **`services/api.js`**: Cấu hình Axios Client kết nối backend, tích hợp tự động Token và Base URL động.

---

## 4. Lược Đồ Cơ Cơ Sở Dữ Liệu (Database Schema)

Cấu trúc cơ sở dữ liệu bao gồm các bảng chính được thiết kế chuẩn hóa và theo dõi qua các tệp migration của Flyway:

1. **`users`**: Lưu trữ thông tin tài khoản người dùng.
   * `id` (Primary Key), `username` (Unique), `password` (BCrypt), `role`, `avatar`, `created_at`.
2. **`vocabulary`**: Danh mục từ điển gốc.
   * `id` (Primary Key), `kanji`, `hiragana`, `romaji`, `meaning`, `han_viet`, `word_type`, `level`.
3. **`user_settings`**: Cấu hình tiến trình học tập của từng người dùng.
   * `id` (Primary Key), `user_id` (Foreign Key -> `users.id`), `level`, `words_per_day`, `completed_days`.
4. **`word_reviews`**: Theo dõi trạng thái học tập giãn cách (SRS) cho từng từ của người dùng.
   * `id` (Primary Key), `user_id` (Foreign Key -> `users.id`), `vocab_id` (Foreign Key -> `vocabulary.id`), `next_review` (DateTime), `ease_factor` (Double), `interval_days` (Int), `repetition` (Int), `is_learned` (Boolean).
5. **`study_sessions`**: Ghi nhận lịch sử làm bài để vẽ biểu đồ commit.
   * `id` (Primary Key), `user_id` (Foreign Key -> `users.id`), `study_date` (Date), `words_studied` (Int), `correct_answers` (Int), `total_questions` (Int).

---

## 5. Thuật Toán Cốt Lõi & Nghiệp Vụ

### 1. Thuật Toán Học Tập Giãn Cách (SM-2)
Hệ thống sử dụng thuật toán **SuperMemo-2 (SM-2)** để lập lịch ôn tập từ vựng cho từng người dùng:
* Khi học viên ôn tập một từ, họ sẽ đánh giá mức độ ghi nhớ theo thang điểm:
  * `1` - **Forgot** (Quên)
  * `2` - **Hard** (Khó)
  * `3` - **Good** (Tốt)
  * `4` - **Easy** (Dễ)
* **Cập nhật Ease Factor (EF)**:
  $$EF' = EF + (0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02))$$
  *(với $q$ là điểm đánh giá từ 1 đến 4, EF mặc định ban đầu là 2.5).*
* **Tính toán Khoảng cách ôn tập tiếp theo (Interval)**:
  * Lần học đầu tiên ($Repetition = 1$): $Interval = 1$ ngày.
  * Lần học thứ hai ($Repetition = 2$): $Interval = 6$ ngày.
  * Lần học thứ ba trở đi ($Repetition > 2$): $Interval' = Interval \times EF$.

> [!IMPORTANT]
> **Quy tắc bảo toàn từ đã học**: Khi từ vựng đã lọt vào danh sách **Tổng số từ đã học** (từng đạt đánh giá $\ge 3$), nếu sau này người dùng ôn tập lại mà đánh giá thấp (`Forgot` hoặc `Hard`), hệ thống sẽ reset chu kỳ lặp lại về `1` ngày chứ **không xóa từ vựng đó ra khỏi danh sách Tổng số từ đã học**.

### 2. Thuật Toán Tìm Kiếm Đa Năng (Fuzzy Search)
Được hỗ trợ bởi Hibernate Search / Lucene index, hệ thống tìm kiếm từ vựng theo cả 4 trường dữ liệu:
* **Kanji** (Hán tự)
* **Hiragana** (Kana)
* **Romaji** (Phiên âm chữ cái Latin)
* **Nghĩa tiếng Việt**
Sử dụng tìm kiếm mờ (Fuzzy matching) để xử lý sai sót gõ phím nhẹ hoặc thiếu dấu phụ trong tiếng Việt.

### 3. Biểu Đồ Lịch Sử Học Tập Commit-Style
* Được thiết kế tương tự biểu đồ đóng góp (commit grid) của GitHub.
* Số lượng từ học được đánh giá $\ge 3$ càng nhiều trong ngày thì màu sắc ô vuông tương ứng trên lưới hoạt động 30 ngày sẽ càng đậm.
* Đặt song song cùng hàng ngang với **Bảng xếp hạng điểm số** trên màn hình lớn và tự động xuống dòng trên thiết bị di động.

---

## 6. Môi Trường Phát Triển & Kiểm Thử Cục Bộ (Local)

Dự án cung cấp 2 phương pháp khởi chạy ở máy local:

### Cách 1: Chạy Direct (Không cần Docker)
Phương pháp này sử dụng H2 Database làm file lưu trữ cục bộ:
1. **Khởi động Backend**:
   ```bash
   cd backend
   ./mvnw.cmd spring-boot:run
   ```
2. **Khởi động Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Giao diện chạy tại: `http://localhost:5173`, API tại `http://localhost:8080`*

### Cách 2: Chạy Bằng Docker Compose (Khuyên Dùng)
Khởi động một môi trường hoàn chỉnh bao gồm cả cơ sở dữ liệu MySQL thật:
```bash
# Khởi động các container (Database, BE, FE)
docker compose -f docker-compose.local.yml up --build -d

# Dừng môi trường local
docker compose -f docker-compose.local.yml down
```
* **Giao diện Web**: `http://localhost` (Cổng 80)
* **API Backend**: `http://localhost:8080`
* **MySQL Database**: `localhost:3306` (User: `root`, Password: `root`, DB: `flashcard`)
* Dữ liệu MySQL được lưu trữ bền vững thông qua volume `db_data`, chỉ mục Lucene của backend lưu tại thư mục `./data` của host.

---

## 7. Quy Trình Triển Khai Lên Production (AWS CI/CD)

Luồng triển khai lên AWS được thực hiện hoàn toàn tự động thông qua **GitLab CI/CD**:

```mermaid
graph TD
    Developer[Developer Push Code] -->|Git Push| GitLab[GitLab CI/CD Pipeline]
    GitLab -->|Build & Push Image| ECR[AWS ECR - Container Registry]
    GitLab -->|Deploy Signal via SSM| EC2[AWS EC2 Instance]
    
    subgraph AWS Cloud
        EC2 -->|Docker Compose Pull| ECR
        EC2 -->|Connects via VPC Security Groups| RDS[AWS RDS MySQL Database]
    subgraph AWS Cloud
        EC2 -->|Docker Compose Pull| ECR
        EC2 -->|Connects via VPC Security Groups| RDS[AWS RDS MySQL Database]
        Nginx[Nginx Reverse Proxy on Host] -->|HTTPS 443 proxy to local ports| EC2
    end
```

### Các bước trong GitLab CI/CD Pipeline (`.gitlab-ci.yml`):
1. **Build Stage (`build_images`)**:
   * GitLab Runner sử dụng Docker-in-Docker (`dind`) để đóng gói các Dockerfile của backend và frontend thành Container Images.
   * Sử dụng AWS CLI đăng nhập vào AWS ECR và đẩy các Image mới lên registry với thẻ `:latest`.
2. **Deploy Stage (`deploy_aws`)**:
   * GitLab Runner dùng AWS CLI tìm kiếm ID của EC2 đang chạy thuộc Stack CloudFormation `JapaneseProjectStack`.
   * Gửi lệnh triển khai từ xa thông qua **AWS Systems Manager (SSM) Agent** chạy trên EC2:
     * Truy cập thư mục `/home/ec2-user/app`.
     * Đăng nhập ECR, thực hiện kéo (`docker-compose pull`) các Image mới nhất.
     * Cập nhật động biến môi trường `DEEPSEEK_API_KEY` và `CORS_ORIGINS=https://phandeptrai.id.vn` vào file `.env`.
     * Khởi động lại container bằng tệp sản xuất: `docker-compose --env-file .env up -d --remove-orphans`.
   * Nhờ sử dụng SSM Agent, cổng SSH (port 22) trên EC2 hoàn toàn có thể đóng lại, giúp hệ thống an toàn trước các cuộc tấn công quét cổng SSH.

### Cấu hình HTTPS và Nginx Reverse Proxy
Hệ thống sử dụng **Nginx được cài đặt trực tiếp trên Host EC2** để quản lý lưu lượng và chứng chỉ SSL:
* **HTTPS**: Sử dụng chứng chỉ SSL Let's Encrypt cấp miễn phí cho tên miền `phandeptrai.id.vn`, tự động gia hạn 12h/lần qua systemd timer.
* **HTTP Redirect**: Tự động chuyển tiếp toàn bộ yêu cầu HTTP (cổng 80) và truy cập bằng địa chỉ IP trực tiếp (`http://100.53.226.133`) về tên miền chính thức `https://phandeptrai.id.vn`.
* **Cổng Chuyển Tiếp**:
  * Frontend React: được map sang cổng `3000:80` để Nginx proxy pass nội bộ từ cổng 443.
  * Backend API: proxy pass nội bộ sang cổng `8080`.
* **Tránh Trình Duyệt Cache Stale JS**: Cấu hình Header `Cache-Control` đặc biệt của Nginx không cho phép trình duyệt cache tệp `index.html`, từ đó luôn cập nhật các asset JS/CSS mới nhất sau mỗi đợt deploy.

---

## 8. Danh Sách Các Endpoint API REST

Dưới đây là một số API RESTful chính được công bố trên backend (cần gửi kèm header `Authorization: Bearer <token>` ngoại trừ Auth):

* **Xác thực (`/api/auth/*`)**:
  * `POST /api/auth/register`: Đăng ký tài khoản mới.
  * `POST /api/auth/login`: Đăng nhập, nhận về Token và thông tin User.
  * `GET /api/auth/me`: Lấy thông tin cá nhân hiện tại.
* **Cấu hình học tập (`/api/settings/*`)**:
  * `GET /api/settings/{level}`: Lấy cấu hình `wordsPerDay` và danh sách ngày hoàn thành của cấp độ tương ứng.
  * `POST /api/settings/{level}?wordsPerDay={count}`: Cập nhật số từ học mỗi ngày của cấp độ.
  * `POST /api/settings/{level}/complete-day?day={day}`: Đánh dấu ngày học đó đã hoàn thành.
* **Học tập và ôn tập SRS (`/api/srs/*`)**:
  * `GET /api/srs/due`: Lấy danh sách các từ vựng đến hạn ôn tập hôm nay.
  * `POST /api/srs/review?vocabId={id}&quality={quality}`: Gửi kết quả đánh giá (1-4) của từ vựng để thuật toán SM-2 lập lịch ôn tập.
  * `GET /api/srs/learned-stats`: Lấy thống kê số từ đã học toàn thời gian (`learnedCount`) và số từ đã học hôm nay (`learnedToday`).
  * `GET /api/srs/random-learned?limit={limit}`: Lấy ngẫu nhiên danh sách các từ đã học để phục vụ ôn tập Flashcard.
* **Từ vựng (`/api/vocab/*`)**:
  * `GET /api/vocab/level/{level}?page={page}&size={size}`: Lấy danh sách từ vựng phân trang theo cấp độ.
  * `GET /api/vocab/search?query={text}`: Tìm kiếm từ vựng theo Kanji, Kana, Romaji hoặc nghĩa tiếng Việt.
  * `POST /api/vocab/import`: Admin upload file Excel để import thêm từ vựng mới.
  * `POST /api/vocab/{id}/enrich`: Gọi DeepSeek AI để làm giàu ví dụ và từ liên quan Kanji cho từ vựng. Câu ví dụ được tạo tự động tương ứng với cấp độ ngữ pháp JLPT (N5 -> N1) của từ đó.

---

## 9. Đánh Giá Ưu Điểm & Nhược Điểm

### Ưu Điểm (Pros)
* **Bảo mật và Hiệu Năng**: Hệ thống Stateless sử dụng JWT không lưu session trên RAM. Giới hạn yêu cầu bằng Bucket4j chặn Brute-force hiệu quả. HTTPS/SSL được chứng thực hoàn thiện, CORS cấu hình chặt chẽ.
* **Tốc độ Triển Khai**: Quá trình CI/CD hoàn toàn tự động hóa. Đẩy code lên nhánh `main` sẽ cập nhật trực tiếp lên AWS chỉ sau chưa đầy 1 phút.
* **Tách biệt Dữ liệu**: Ứng dụng chạy trên container EC2 tách rời khỏi AWS RDS MySQL, đảm bảo nâng cấp hoặc xóa container ứng dụng không bao giờ làm mất dữ liệu người dùng.

### Nhược Điểm & Hướng Khắc Phục (Cons & Roadmap)
* **Từ đồng nghĩa tĩnh (Static Thesaurus)**: Hiện tại, danh sách từ đồng nghĩa tiếng Việt đang lưu ở mảng tĩnh frontend. Cần chuyển về lưu trong database (bảng `synonyms`) để admin quản lý trực tiếp qua giao diện admin.
* **Tính năng Thu Phí (SaaS Billing)**: Hệ thống chưa phân quyền gói dịch vụ. Hướng đi tiếp theo là tích hợp các cổng thanh toán trực tuyến (PayOS, Momo, Stripe) để giới hạn số từ học mỗi ngày đối với gói Free.

