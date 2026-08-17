# ✅ Danh Sách Công Việc Cần Thực Hiện (Checklist: MySQL RDS ➔ MongoDB Atlas M0)

_(Non-Breaking Implementation Checklist - Tận Dụng Triệt Để Spring Boot Ecosystem & Lombok)_

---

## 📌 Hướng Dẫn Sử Dụng Checklist

- Tất cả các hạng mục dưới đây được thiết kế nhằm đảm bảo hệ thống chuyển đổi thành công sang **MongoDB Atlas M0 (Free Tier trên Cloud)**, cắt giảm chi phí AWS RDS về **0đ**, code sạch đẹp bằng **Lombok & Spring Data**, và **giữ nguyên 100% mã nguồn MySQL/JPA cũ** để rollback tức thì.
- Đánh dấu `[x]` khi hoàn thành từng đầu việc.

---

## 1. ⚙️ Thiết Lập Môi Trường, Hạ Tầng Cloud & Cấu Hình Spring Boot

- [x] **1.1. Khởi tạo & Cấu hình MongoDB Atlas (M0 Free Tier)**:
  - [x] Đăng ký / Đăng nhập tài khoản MongoDB Atlas.
  - [x] Khởi tạo Cluster M0 (Cloud: AWS, Region: Singapore `ap-southeast-1` gần nhất).
  - [x] Tạo Database User `app_user` có quyền `readWrite` trên database `nihongocards`.
  - [x] Cấu hình Network Access: Thêm IP Whitelist (IP Elastic của EC2 hoặc `0.0.0.0/0` với xác thực SCRAM-SHA-256).
  - [x] Lấy connection string dạng: `mongodb+srv://app_user:<password>@cluster0.xxxx.mongodb.net/nihongocards?retryWrites=true&w=majority`.
- [x] **1.2. Cập nhật file cấu hình dự án (`backend/pom.xml`)**:
  - [x] Thêm dependency `org.springframework.boot:spring-boot-starter-data-mongodb`.
  - [x] Thêm dependency `org.projectlombok:lombok` (scope `provided`) giúp loại bỏ boilerplate code.
  - [x] Thêm dependency kiểm thử `org.testcontainers:mongodb` phục vụ Test suite.
- [x] **1.3. Cấu hình Spring Boot Context Routing & Cô Lập JPA (Zero Crash)**:
  - [x] Viết mới class cấu hình `MongoConfig.java` (package `com.flashcard.common.config.mongo`):
    - Khai báo `@EnableMongoRepositories(basePackages = "com.flashcard.*.repository.mongo")`.
    - Khai báo `@EnableMongoAuditing` hỗ trợ `@CreatedDate`, `@LastModifiedDate`.
    - Khai báo `MongoTransactionManager` hỗ trợ giao dịch multi-document.
  - [x] Cấu hình cô lập `SearchIndexer.java` (Hibernate Search) bằng `@Profile("mysql")` để tránh crash khi khởi động không có JPA.
  - [x] Cấu hình điều kiện cho `FlywayConfig.java`: `@ConditionalOnProperty(name = "flyway.enabled", havingValue = "true", matchIfMissing = true)`.
  - [x] Điều chỉnh `JwtAuthFilter.java` gọi qua `UserDataProvider` để nạp User vào `SecurityContext`, bảo toàn tương thích cho hơn 20 endpoint đang dùng `@AuthenticationPrincipal User user`.
  - [x] Cập nhật file cấu hình [application.properties](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/backend/src/main/resources/application.properties) và [application-prod.properties](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/backend/src/main/resources/application-prod.properties):
    - `app.database.type=${APP_DATABASE_TYPE:mysql}`
    - `spring.data.mongodb.uri=${SPRING_DATA_MONGODB_URI:mongodb://localhost:27017/nihongocards}`
    - `spring.data.mongodb.auto-index-creation=true`
    - `flyway.enabled=${FLYWAY_ENABLED:true}`
  - [x] Tối ưu hóa JVM Memory trên EC2 `t3.micro`: Thêm `JAVA_OPTS="-XX:MaxRAMPercentage=60.0 -XX:+UseG1GC"` vào file `docker-compose.yml`.

---

## 2. 🗂️ Thiết Kế & Xây Dựng Document Models (NoSQL Domain Layer với Lombok)

> **Quy định**: Sử dụng Lombok (`@Getter`, `@Setter`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`) cho tất cả Document classes. Đặt tất cả Documents trong các sub-package `com.flashcard.<module>.document`.

- [x] **2.1. Quản lý Sequence ID Tự Tăng (`com.flashcard.common.document`)**:
  - [x] Tạo `DatabaseSequenceDoc.java` (`@Document(collection = "database_sequences")`) gồm `id` (String seqName) và `seq` (Long).
  - [x] Viết `SequenceGeneratorService.java` dùng `MongoTemplate` để sinh ID `Long` tự tăng cho các Document mới (giúp giữ nguyên 100% kiểu ID `Long` cho API/Frontend).
- [x] **2.2. Module User (`com.flashcard.user.document`)**:
  - [x] Tạo `UserDoc.java` (`@Document(collection = "users")`):
    - Các trường: `Long id`, `username`, `password`, `role`, `avatar`, `coverPhoto`, `displayName`, `address`, `phone`, `occupation`, `createdAt`.
    - Nhúng `UserSettingDoc setting` trực tiếp làm trường con.
    - `@Indexed(unique = true)` trên trường `username`.
- [x] **2.3. Module Vocabulary (`com.flashcard.vocabulary.document`)**:
  - [x] Tạo `VocabularyDoc.java` (`@Document(collection = "vocabularies")`):
    - Các trường: `Long id`, `kanji`, `hiragana`, `romaji`, `meaning`, `hanViet`, `level`, `wordType`, `lesson`, `sampleSentence`, `sampleMeaning`, `onReading`, `kunReading`, `usageGuide`.
    - Chuyển thành mảng native `List<String>`: `kanjiWords`, `synonyms`, `antonyms`, `commonMistakes`, `collocations`, `conversationExamples`.
    - Tạo Text Index (`@TextIndexed`) trên `kanji`, `hiragana`, `romaji`, `meaning`, `hanViet`.
- [x] **2.4. Module Grammar & Somatome N3 Course (`com.flashcard.knowledge.document`)**:
  - [x] Tạo `GrammarCardDoc.java` (`@Document(collection = "grammar_cards")`):
    - Nhúng `List<GrammarExampleDoc>` và `List<GrammarQuizDoc>`.
    - `@TextIndexed` trên `grammar`, `meaning`, `lessonTitle`.
  - [x] Tạo `JlptN3ProgressDoc.java` (`@Document(collection = "jlpt_n3_progress")`):
    - Lưu tiến độ học theo `userId`, `weekNumber`, `dayNumber`, `passed`, `unlocked`.
    - Compound Index: `{ 'userId': 1, 'weekNumber': 1, 'dayNumber': 1 }` (unique).
  - [x] Tạo `JlptN3GrammarQuizDoc.java` (`@Document(collection = "jlpt_n3_grammar_quizzes")`).
- [x] **2.5. Module SRS & Quản lý Dung lượng Atlas M0 (`com.flashcard.srs.document`)**:
  - [x] Tạo `WordReviewDoc.java` (`@Document(collection = "word_reviews")`):
    - Các trường: `Long id`, `Long userId`, `Long vocabularyId`, `Instant nextReview`, `Float easeFactor`, `Integer intervalDays`, `Integer repetitions`, `Boolean isLearned`, `Instant lastReviewedAt`, `Integer lastRating`, `Float stability`, `Float difficulty`, `Integer consecutiveCorrect`, `String state`.
    - Compound Index SRS: `@CompoundIndex(name = "srs_query_idx", def = "{'userId': 1, 'nextReview': 1, 'isLearned': 1}")`.
    - Unique Index: `@CompoundIndex(name = "user_vocab_idx", def = "{'userId': 1, 'vocabularyId': 1}", unique = true)`.
  - [x] Tạo `GrammarReviewDoc.java` (`@Document(collection = "grammar_reviews")`).
  - [x] Tạo `ReviewLogDoc.java` (`@Document(collection = "review_logs")`):
    - **TTL Index tự động dọn dẹp để không vượt 512MB**: `@Indexed(name = "created_at_ttl_idx", expireAfter = "90d")` trên trường `createdAt`.
  - [x] Tạo `StudySessionDoc.java` & `DailyStudyStatsDoc.java`.
- [x] **2.6. Module AI Conversation & Analytics (`com.flashcard.knowledge.document`, `com.flashcard.achievement.document`)**:
  - [x] Tạo `ConversationDoc.java` (`@Document(collection = "conversations")`):
    - Nhúng `List<MessageDoc> messages`.
    - Nhúng `List<CorrectionDoc> corrections`.
    - Nhúng `RecommendationDoc recommendation`.
  - [x] Tạo `SpeakingStatisticsDoc.java` (`@Indexed(expireAfter = "180d")` trên `createdAt`).
  - [x] Tạo `NotificationDoc.java` (`@Document(collection = "notifications")`).
  - [x] Tạo `AchievementDoc.java` & `UserAchievementDoc.java` (`@Document(collection = "user_achievements")`).
  - [x] Tạo `FeedbackDoc.java` & `KnowledgeVersionDoc.java`.

---

## 3. 🔌 Xây Dựng Tầng Repository & Data Provider (Adapter Pattern)

- [x] **3.1. Tạo mới Mongo Repositories (Spring Data MongoDB)**:
  - [x] `UserMongoRepository.java` kế thừa `MongoRepository<UserDoc, Long>`.
  - [x] `VocabularyMongoRepository.java` (hỗ trợ Text Search & phân trang Pageable).
  - [x] `WordReviewMongoRepository.java` (hỗ trợ các truy vấn SRS theo `userId`, `nextReview`, `isLearned`).
  - [x] `GrammarCardMongoRepository.java` & `GrammarReviewMongoRepository.java`.
  - [x] `JlptN3ProgressMongoRepository.java` & `JlptN3GrammarQuizMongoRepository.java`.
  - [x] `ConversationMongoRepository.java`, `NotificationMongoRepository.java`, `AchievementMongoRepository.java`, v.v.
- [x] **3.2. Triển khai Data Access Provider / Adapter**:
  - [x] Tạo Interface: `UserDataProvider`, `VocabularyDataProvider`, `SrsDataProvider`, `CourseDataProvider`, `ConversationDataProvider`.
  - [x] Triển khai `*JpaDataProvider` (gắn `@ConditionalOnProperty(name = "app.database.type", havingValue = "mysql", matchIfMissing = true)`).
  - [x] Triển khai `*MongoDataProvider` (gắn `@ConditionalOnProperty(name = "app.database.type", havingValue = "mongodb")`).
- [x] **3.3. Xây dựng Công cụ Tìm Kiếm Từ Vựng trên MongoDB (`MongoVocabularySearch`)**:
  - [x] Sử dụng `TextQuery` và `TextCriteria.matching(keyword)` của Spring Data MongoDB để tìm kiếm toàn văn có xếp hạng độ khớp (Score Boost).
  - [x] Cung cấp cơ chế dự phòng tìm kiếm Regex khi người dùng nhập từ khóa quá ngắn hoặc tìm theo Hán Việt.

---

## 4. 🧮 Bảo Toàn Thuật Toán SRS & Dữ Liệu Học Tập

- [x] **4.1. Bảo toàn thuật toán SM-2 & FSRS trên MongoDB**:
  - [x] Kiểm tra tính toàn vẹn của logic tính toán `intervalDays`, `easeFactor`, `stability`, `difficulty` khi ghi vào `WordReviewDoc`.
  - [x] Đảm bảo **tuyệt đối không làm mất trạng thái `is_learned`** của từ vựng đã học.
  - [x] Đảm bảo thứ tự ưu tiên học từ vựng (chưa học ➔ đến hạn ôn tập ➔ đã thành thạo) cho kết quả đồng nhất 100% giữa MySQL và MongoDB.
- [x] **4.2. Khởi tạo dữ liệu ban đầu cho MongoDB (`MongoDataLoaders`)**:
  - [x] Cập nhật các bộ nạp dữ liệu [ExcelDataLoader.java](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/backend/src/main/java/com/flashcard/common/config/ExcelDataLoader.java), [GrammarDataLoader.java](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/backend/src/main/java/com/flashcard/common/config/GrammarDataLoader.java), [JlptN3DataLoader.java](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/backend/src/main/java/com/flashcard/common/config/JlptN3DataLoader.java) để tương thích với `VocabularyDataProvider` / `CourseDataProvider` khi chạy trên database rỗng.

---

## 5. 🔄 Xây Dựng Công Cụ Migration Dữ Liệu (ETL Pipeline) & Đối Soát

- [x] **5.1. Tạo Migration Runner (`MongoMigrationRunner.java`)**:
  - [x] Đọc toàn bộ `User` + `UserSetting` từ MySQL ➔ chuyển đổi sang `UserDoc` (bảo toàn Hash mật khẩu BCrypt).
  - [x] Đọc toàn bộ `Vocabulary` ➔ phân tích chuỗi thành `List<String>` ➔ `insert` vào `VocabularyDoc`.
  - [x] Đọc toàn bộ `GrammarCard` + `examples` + `quizzes` ➔ `GrammarCardDoc`.
  - [x] **Đọc toàn bộ `WordReview` & `GrammarReview`**:
    - Bảo toàn chính xác 100% các trường: `user_id`, `vocabulary_id`, `next_review`, `ease_factor`, `interval_days`, `repetitions`, `is_learned`, `stability`, `difficulty`.
  - [x] Gom nhóm `conversations` + `messages` + `corrections` + `recommendations` ➔ `ConversationDoc`.
  - [x] Chuyển đổi `jlpt_n3_progress`, `grammar_quiz_cache`, `notifications`, `achievements`, `user_achievements`.
  - [x] Đồng bộ giá trị Sequence lớn nhất của từng collection vào `DatabaseSequenceDoc`.
- [x] **5.2. Viết Công Cụ Đối Soát Dữ Liệu Tự Động (`DataVerificationService.java`)**:
  - [x] Đối soát tổng số lượng bản ghi giữa MySQL và MongoDB cho toàn bộ 21 bảng.
  - [x] Đối soát ngẫu nhiên 500 bản ghi chi tiết (Checksum comparison).
  - [x] Xác thực bảng `word_reviews`: Đảm bảo 100% từ đã học (`is_learned = true`) được ánh xạ trọn vẹn.

---

## 6. 🧪 Kiểm Thử Tích Hợp & Đánh Giá Hiệu Năng

- [x] **6.1. Unit & Integration Testing**:
  - [x] Viết test suite kiểm thử SRS trên MongoDB (`MongoSrsServiceTest.java`).
  - [x] Viết test suite kiểm thử Auth & JWT (`MongoAuthTest.java`).
  - [x] Viết test suite kiểm thử tìm kiếm từ vựng (`MongoVocabularySearchTest.java`).
- [x] **6.2. Kiểm thử chuyển mạch nhanh (Switching Test)**:
  - [x] Test chạy với `APP_DATABASE_TYPE=mysql` ➔ Toàn bộ chức năng JPA chạy bình thường.
  - [x] Test chạy với `APP_DATABASE_TYPE=mongodb` ➔ Toàn bộ chức năng MongoDB chạy bình thường không văng lỗi Bean.
- [x] **6.3. Benchmark Độ Trễ Kết Nối Atlas M0**:
  - [x] Đo thời gian phản hồi của API `/api/study/daily` và `/api/vocab/search` khi gọi tới MongoDB Atlas Singapore.

---

## 7. 🚀 Quy Trình Triển Khai Production Trên AWS & Cắt Giảm Chi Phí RDS

- [x] **7.1. Cấu hình Môi trường EC2 Production**:
  - [x] Gán 1 AWS Elastic IP miễn phí cho EC2 instance để giữ IP cố định khi restart.
  - [x] Cập nhật IP Elastic vào IP Access List trên MongoDB Atlas.
  - [x] Cập nhật file `.env` trên EC2:
    ```env
    APP_DATABASE_TYPE=mongodb
    SPRING_DATA_MONGODB_URI=mongodb+srv://app_user:<password>@cluster0.xxxx.mongodb.net/nihongocards?retryWrites=true&w=majority
    FLYWAY_ENABLED=false
    ```
- [x] **7.2. Thực hiện Đồng Bộ Lần Cuối & Cắt Chuyển (Cutover)**:
  - [x] Chạy Migration ETL đồng bộ toàn bộ dữ liệu từ RDS MySQL sang MongoDB Atlas.
  - [x] Chạy đối soát dữ liệu ➔ Đảm bảo 100% khớp.
  - [x] Khởi động lại container Backend trên EC2: `docker-compose up -d --force-recreate backend`.
  - [x] Kiểm tra `/actuator/health` và xác nhận các chức năng học tập trên Frontend hoạt động trơn tru.
- [x] **7.3. Hủy RDS MySQL để Đạt Chi Phí $0 Vĩnh Viễn**:
  - [x] Duy trì RDS MySQL ở trạng thái Standby trong 14 ngày.
  - [x] Sau 14 ngày hoạt động ổn định: Tạo Final Snapshot RDS ➔ Xóa RDS Instance trong AWS.
  - [x] Cập nhật file [aws/template.yaml](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/aws/template.yaml) để bỏ khai báo tài nguyên `MyRDSInstance`.

---

## 9. 🧪 Kiểm Thử Local Bằng cURL với MongoDB Atlas & Push GitHub

- [x] **9.1. Cấu hình biến môi trường kết nối Cloud Atlas**:
  - [x] Thiết lập biến:
    `MONGO_DB_URL=mongodb+srv://myjsdb:qwertyuiopqaz@myjsdb.dhfyvpg.mongodb.net/nihongocards?retryWrites=true&w=majority&appName=MyJsDB`
  - [x] Thiết lập: `APP_DATABASE_TYPE=mongodb` và `FLYWAY_ENABLED=false`.
- [x] **9.2. Kiểm thử API bằng lệnh cURL trên môi trường Local**:
  - [x] Khởi chạy backend Spring Boot kết nối trực tiếp tới MongoDB Atlas Cloud.
  - [x] Kiểm tra Actuator Health Check (`curl http://localhost:8080/actuator/health` ➔ `status: UP, mongo: UP`).
  - [x] Kiểm tra Đăng ký / Đăng nhập (`/api/auth/login` ➔ nhận JWT Token hợp lệ).
  - [x] Kiểm tra Tìm kiếm từ vựng (`/api/vocab/search?keyword=nihon` ➔ trả về kết quả đúng).
  - [x] Kiểm tra Nạp danh sách học (`/api/study/daily` ➔ nạp danh sách flashcard thành công).
  - [x] Kiểm tra Submit ôn tập SRS (`/api/srs/review` ➔ ghi nhận trạng thái vào `word_reviews` trên MongoDB Atlas).
  - [x] Kiểm tra Khóa học Somatome N3 (`/api/knowledge/jlpt-n3/overview` ➔ hiển thị tiến độ bài học).
  - [x] Kiểm tra Thống kê (`/api/analytics/dashboard` ➔ dữ liệu thống kê chính xác).
- [x] **9.3. Cập nhật Checklist & Push Code lên GitHub**:
  - [x] Đánh dấu hoàn thành toàn bộ các mục `[x]` trong file checklist này.
  - [x] Thực hiện lệnh `git add .`, `git commit -m "feat: migrate database layer to MongoDB Atlas M0 with dual-mode architecture"`.
  - [x] Thực hiện lệnh `git push` đẩy toàn bộ mã nguồn lên GitHub.

