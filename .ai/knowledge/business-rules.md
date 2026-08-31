# 📋 Business Rules (.ai/knowledge/business-rules.md)

Tài liệu này tổng hợp các quy tắc nghiệp vụ cốt lõi (Business Rules) điều phối logic hoạt động của hệ thống **NihongoCards**.

---

## 1. Quy tắc lập lịch SuperMemo-2 (SM-2)

### Thang điểm đánh giá (q - Quality):
* `1`: **Forgot** (Quên hẳn từ này)
* `2`: **Hard** (Nhớ mang máng, mất nhiều thời gian nghĩ)
* `3`: **Good** (Nhớ từ vựng chính xác)
* `4`: **Easy** (Nhớ rất rõ, không cần suy nghĩ)

### Cập nhật Ease Factor (EF):
$$EF' = EF + (0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02))$$
* EF mặc định ban đầu là `2.5`.
* Giá trị EF tối thiểu là `1.3`. Nếu công thức tính ra EF < 1.3, EF sẽ được gán bằng `1.3`.

### Khoảng cách ngày ôn tập tiếp theo (Interval):
* Nếu $Repetition = 1$: $Interval = 1$ ngày.
* Nếu $Repetition = 2$: $Interval = 6$ ngày.
* Nếu $Repetition > 2$: $Interval' = Interval \times EF$.
* Nếu $q < 3$ (Forgot hoặc Hard): Số lần lặp (`repetition`) reset về `1` và khoảng cách ôn tập tiếp theo reset về `1` ngày.

---

## 2. Quy tắc bảo toàn trạng thái từ đã học

* **Điều kiện lọt danh sách Đã học**: Một từ được coi là "Đã học" và cộng vào tổng số từ đã học của user (`learnedCount`) khi và chỉ khi có lượt đánh giá đạt điểm số $q \ge 3$ (Good hoặc Easy). Khi đó cột `is_learned` trong bảng `word_reviews` được gán là `true`.
* **Trường hợp ôn tập thất bại**: Nếu trong các lần ôn tập sau, người dùng đánh giá từ này ở mức $q < 3$ (Quên hoặc Khó):
  * **Hành vi hệ thống**: Cập nhật trạng thái SM-2 của từ đó (reset repetition = 1, interval = 1 ngày) để nhắc nhở học lại ngay ngày hôm sau.
  * **Hành vi thống kê**: **Không xóa** từ này ra khỏi tổng số từ đã học (`is_learned` vẫn là `true`). Từ vựng vẫn được tính trong tổng số từ học viên đã chinh phục.

---

## 3. Quy tắc phân trang học tập theo ngày (Daily & Flashcards Partition)

* Dựa vào số từ học mỗi ngày của người dùng (`wordsPerDay` - mặc định 20 từ).
* Tổng số ngày học của một cấp độ: `totalDays = Math.max(1, Math.floor(totalWords / wordsPerDay))`.
* Ngày cuối cùng sẽ tự động gom toàn bộ từ vựng dư thừa còn lại (nếu có chia dư) để đảm bảo không bỏ sót từ vựng.
* **Cách lấy từ vựng**:
  * Các ngày thường: Lấy từ vựng ở Trang = `day - 1` với kích thước `wordsPerDay`.
  * Ngày cuối cùng: Lấy từ trang `day - 1` đến trang cuối cùng để gom hết từ dư.
* **Cơ chế đồng bộ**: Số từ mỗi ngày cấu hình bên Daily Study sẽ tự động đồng bộ sang màn hình chọn ngày của Flashcards.

---

## 4. Quy tắc làm giàu dữ liệu tự động (Lazy-Loading AI Enrichment)

* **Thời điểm kích hoạt**: Khi người dùng xem thẻ Flashcard, xem chi tiết từ ở màn hình học hàng ngày, hoặc xem giải thích đáp án sau khi làm Quiz, frontend sẽ kiểm tra xem từ đó đã có câu ví dụ (`sampleSentence`) chưa.
* **Cơ chế Lazy-Loading**:
  * Nếu **Đã có**: Hiển thị ngay lập tức từ local cache/database.
  * Nếu **Chưa có**: Gửi request `POST /api/vocab/{id}/enrich` lên backend. Backend sẽ gọi DeepSeek API để lấy dữ liệu phong phú gồm 3 phần (Cốt lõi & Ghi nhớ, Ngữ cảnh & Ví dụ, Luyện tập & Lưu ý - bao gồm pitchAccent, mnemonic, synonyms, antonyms, exampleSentences, collocations, conversationExamples, commonMistakes, kanjiWords), lưu vào database rồi trả về cho frontend hiển thị.
* **Mục đích**: Tiết kiệm chi phí token DeepSeek API, giảm thiểu blocking tải danh sách từ vựng ban đầu, tự động tích lũy kho dữ liệu ví dụ phong phú theo thời gian học thực tế, đồng thời đồng bộ hóa hoàn toàn cấu trúc dữ liệu với Kho tri thức AI.

---

## 5. Quy tắc nhập kiến thức mới học (Knowledge Save & Deduplication)

* **Nếu từ vựng/ngữ pháp ĐÃ CÓ trong DB**:
  * Cập nhật thông tin chi tiết (nghĩa, ví dụ, mnemonic...) trực tiếp trên bản ghi hiện tại mà **không đổi ID hoặc vị trí**.
  * Nếu người dùng đã học từ này trước đó (`WordReview`/`GrammarReview` đã tồn tại), **bảo toàn nguyên vẹn** trạng thái `is_learned` và lịch trình ôn tập SRS, không reset điểm quality.
* **Mặc định mức độ khó nhớ nhất (Highest Priority / Hardest)**:
  * Khi nhập kiến thức mới học vào hệ thống, các từ/mẫu ngữ pháp này mặc định được đánh dấu ở mức độ **Khó nhớ nhất (Quality = 1: AGAIN)** và gán ngày ôn tập `nextReview = NOW()` để ưu tiên nhắc nhở ngay trong Ôn tập buổi sáng.
* **Nếu từ vựng/ngữ pháp CHƯA CÓ trong DB**:
  * Thêm từ vựng/ngữ pháp mới vào **CUỐI danh sách** (vị trí ID mới nhất hoặc Tuần/Ngày cuối cùng).
  * Việc này đảm bảo thứ tự các ngày học trước đó không bị xê dịch hay xáo trộn, bảo toàn hoàn toàn trạng thái các ngày đã hoàn thành trong Học hàng ngày.
* **Quét tự động dọn dẹp hệ thống (System Startup Reset)**:
  * Khi hệ thống khởi động (`SrsResetRunner`), tự động quét và cập nhật lại toàn bộ các bản ghi `WordReview` & `GrammarReview` cũ của dữ liệu trước đây về trạng thái **Đến hạn ôn tập (`nextReview = NOW()`)**, giúp loại bỏ toàn bộ dữ liệu lỗi/tệ và bắt buộc người dùng được kiểm tra lại đầy đủ.

---

## 6. Quy tắc Phân luồng Ôn tập Kép (Dual-Loop Review System)

* **Ôn tập buổi sáng (Morning SRS Review - `GET /api/study/queue`)**:
  * Truy vấn qua `srsDataProvider` (kết nối trực tiếp MongoDB / MySQL) đảm bảo tương thích 100% môi trường production.
  * **Thứ tự lấy từ**: Lấy chính xác các từ phải ôn tập theo **thứ tự SRS**: sắp xếp theo ngày đến hạn `nextReview` tăng dần (`nextReview ASC`) — các từ quá hạn lâu nhất hoặc đến hạn sớm nhất sẽ xuất hiện ở đầu hàng đợi để ôn trước.
  * **Bao quát thêm**: Tự động gom thêm các từ vựng mới học/ôn ngày hôm qua vào danh sách buổi sáng để củng cố trong khoảng thời gian quên nhanh nhất sau 24h.
  * Nếu số từ đến hạn ít hơn giới hạn bài học, tự động bổ sung thêm các từ sắp đến hạn tiếp theo (`nextReview ASC`) từ kho từ đã học để ôn cuốn chiếu.
  * Trường `queueSize` trong payload trả về tổng số lượng thẻ thực tế đến hạn hôm nay của người dùng (`srsDataProvider.countDueWordReviews`).
* **Ôn lại hôm nay (Today's Review - `GET /api/study/today-reviewed`)**:
  * Truy vấn trực tiếp từ `srsDataProvider.findByUserAndLastReviewedAtBetween` dựa trên mốc thời gian từ 00:00:00 đến 23:59:59 ngày hôm nay theo múi giờ `Asia/Ho_Chi_Minh`.
  * **Thứ tự hiển thị**: Sắp xếp theo thứ tự mới học gần nhất (`lastReviewedAt DESC`).
  * Chỉ tập trung củng cố đúng các từ vựng người dùng đã học / đã tương tác đánh giá trong ngày hôm nay (từ Flashcard, Quiz, AI Translation, v.v.).

---

## 7. Quy tắc Tổng ôn tập (Master Review System - `/master-review`)

* **Mục đích**: Rà soát các từ vựng chưa thuộc trong phạm vi chỉ định, tập hợp danh sách từ quên, bắt buộc vượt qua bài Quiz với điểm Pass **> 90%**.
* **Phạm vi ôn tập (Scope Selection)**:
  * **Tất cả từ đã học**: Lấy toàn bộ các từ vựng đã được học trong hệ thống.
  * **Khoảng thời gian (Từ ngày A ➔ Đến ngày B)**: Lọc các từ vựng được học/ôn trong khoảng thời gian chỉ định (`GET /api/master-review/words?startDate=...&endDate=...`).
* **Flashcard Rà soát Nhanh (Minimalist Screening)**:
  * **Mặt trước**: Chỉ hiển thị duy nhất chữ Kanji (hoặc Hiragana nếu từ không có Kanji). **Tuyệt đối không hiển thị cách đọc/phiên âm ở mặt trước** để bắt buộc người dùng tự kiểm tra trí nhớ Kanji.
  * **Mặt sau**: Hiển thị Nghĩa tiếng Việt và cách đọc Hiragana khi lật thẻ.
  * Nút bấm: **Nhớ** (cập nhật SRS rating 3) & **Quên** (tự động gom vào danh sách `forgottenWords` và cập nhật SRS rating 1).
* **Danh sách từ Quên & Modal Chi tiết (Forgotten Words List & Detail Modal)**:
  * Giao diện bảng hiển thị danh sách từ đã quên đồng bộ 100% phong cách thiết kế của `DailyStudyPage.jsx`: Nhấp vào bất kỳ hàng nào trên bảng để mở Modal chi tiết từ vựng (`KanjiDetailModal`).
  * Hỗ trợ chuyển tiếp từ trước/sau (Next/Prev) trực tiếp trong Modal và hiển thị thứ tự nét viết Kanji, phát âm âm thanh, Hán Việt và phân tích từ vựng AI.
* **Giao diện Mở rộng Toàn màn hình (Full Screen Width Layout)**:
  * Tất cả các màn hình trong Tổng ôn tập (Chọn phạm vi, Rà soát Flashcard, Bảng danh sách từ quên, Cấu hình Quiz và Làm bài Quiz) đều sử dụng độ rộng container chuẩn `1000px` rộng rãi giống như `DailyStudyPage.jsx` nhằm tăng tối đa mức độ tập trung cho người học.
* **Bài Quiz Bắt buộc & Bảo toàn trạng thái (Mandatory Quiz & Session Persistence)**:
  * Sau khi rà soát, hệ thống tạo bảng tổng hợp các từ đã quên và yêu cầu người dùng làm Quiz (Trắc nghiệm hoặc Gõ chữ).
  * **Hiển thị Chi tiết Từ vựng AI sau mỗi câu trả lời**: Đồng bộ 100% với `DailyStudyPage.jsx`: Ngay khi trả lời (chọn phương án hoặc gõ từ), hệ thống tự động hiển thị thẻ phản hồi 2 cột gồm: Kanji/Hiragana, Nghĩa, Hán Việt, phát âm âm thanh và khối **Dữ liệu AI Bổ sung (`AiEnrichedTabbedView`)** (Ví dụ câu, Dịch nghĩa, Phân tích Kanji).
  * **Chỉ tiêu Pass**: Phải đạt kết quả **> 90%** câu đúng.

---

## 9. Quy tắc An toàn Giao diện Flashcard (Flashcard Resilience & Fallback Rules)

* **Tự động Khôi phục Thống kê Cấp độ (Auto-Fetch Level Stats Fallback)**:
  * Khi truy cập trang Flashcard (`FlashcardPage.jsx`) trực tiếp mà chưa qua Trang chủ, nếu prop `stats` bị null/undefined, `FlashcardPage` tự động gọi `vocabApi.getStats()` bất đồng bộ và sử dụng mảng định danh mặc định (`DEFAULT_LEVEL_COUNTS`) làm fallback. Đảm bảo giao diện chọn Cấp độ (N5 - N1, Từ láy, Trợ từ) luôn luôn hiển thị thẻ đầy đủ.
* **Đồng bộ hóa API Cấu hình Người dùng (`userSettingsApi`)**:
  * Đảm bảo `userSettingsApi` được xuất đầy đủ trong `api.js` kèm theo alias `completeDay` và `markDayCompleted` tương thích với `UserSettingController`.
* **Xử lý An toàn API SRS Queue & Tải theo Ngày (Safe SRS Queue & Page Data Parsing)**:
  * Khi người dùng học Flashcard SRS (`isSrs = true`), mảng hàng đợi từ vựng được bọc xử lý an toàn `Array.isArray(response) ? response : (response?.queue || response?.content || [])`. Nếu API `studyApi.getQueue` bị gián đoạn hoặc yêu cầu xác thực guest, hệ thống tự động fallback về `srsApi.getDueWords()`.
  * Nếu kết quả danh sách từ vựng theo trang trả về mảng rỗng, hệ thống tự động gọi `vocabApi.getRandomByLevel` để đảm bảo luôn luôn có thẻ cho người dùng luyện tập.
* **Tính năng Luyện tập Nhanh Ngẫu nhiên (Quick Start Random Practice)**:
  * Bổ sung nút **"⚡ Học ngẫu nhiên 20 từ"** tại màn hình chọn Ngày học, cho phép người dùng vào học Flashcard ngay lập tức mà không cần chọn từng ngày.
* **Đánh giá Độ khó Trực tiếp ở Mặt Trước Thẻ (Front-Side Difficulty Rating & Keyboard 1-4)**:
  * Thẻ Flashcard (`FlashcardCard.jsx`) hiển thị 4 nút đánh giá độ khó (**Forgot / Hard / Good / Easy**) ngay ở **mặt trước** (mặt tiếng Nhật/Kanji). Giúp người học có thể đánh giá và chuyển sang từ tiếp theo ngay lập tức nếu đã thuộc từ mà không bắt buộc phải click lật sang mặt sau.
* **Quy tắc Hoàn thành Quiz Tổng ôn tập (Master Review Quiz Completion Rule - Full vs Subset)**:
  * **Chế độ Tất cả từ (FULL Test)**: Chỉ khi người dùng chọn kiểm tra Tất cả các từ chưa thuộc (`quizOptType === 'all'`) VÀ đạt kết quả **> 90%**, hệ thống mới hoàn tất lượt Tổng ôn (`clearSession()`) và trở về trang chủ ban đầu (Phase 0).
  * **Chế độ Tập hợp con (Partial/Subset Test)**: Khi người dùng chọn kiểm tra một số lượng từ ngẫu nhiên hoặc khoảng chỉ định (ví dụ 10/100 từ), khi làm xong:
    - Các từ trả lời đúng sẽ được tự động loại bỏ khỏi danh sách chưa thuộc (ví dụ 100 ➔ 91 từ).
    - Hệ thống lưu lại danh sách từ chưa thuộc mới vào `localStorage` (`persistSession(updatedForgotten)`).
* **Quy tắc Nhập Nhanh & Background Worker (Fast Collect & Background AI Enrichment Rule)**:
  * **Chế độ Nhập nhanh (Fast Mode ⚡)**: Trong AI Personal Knowledge Base (`KnowledgeBasePage.jsx`), khi bật chế độ Nhập nhanh, yêu cầu DeepSeek chỉ trả về gói JSON tối thiểu (`kanji`, `hiragana`, `meaning`, `hanViet`, `pitchAccent`, `level`, `wordType` với từ vựng; hoặc `grammar`, `meaning`, `formation`, `usageDesc`, `level` với ngữ pháp). Thời gian AI phản hồi rút ngắn từ 10-15 giây xuống chỉ còn **~1 - 1.5 giây**.
  * **Xử lý Chạy nền (Background Worker Thread)**: Khi người dùng bấm lưu thẻ nhập nhanh, hệ thống lưu ngay lập tức thông tin cơ bản vào Database và phản hồi thành công tức thì cho người dùng. Đồng thời, một luồng chạy nền bất đồng bộ (`CompletableFuture.runAsync`) tự động gọi DeepSeek để bổ sung các dữ liệu chuyên sâu (mẹo nhớ, câu ví dụ, cụm từ collocation, hội thoại, quizzes...) và cập nhật bản ghi trong DB mà không làm gián đoạn trải nghiệm ghi chú của người dùng.

---

## 8. Quy tắc Tối ưu hóa Hiệu năng (Performance Optimization Rules)

* **Tải song song HTTP Requests (Parallel API Fetching)**:
  * Tại `HomePage.jsx` và các màn hình chính, sử dụng `Promise.all([vocabApi.getStats(), analyticsApi.getDashboard()])` để gửi các request API đồng thời thay vì await nối tiếp. Giảm thời gian tải trang Dashboard từ ~2.1s xuống **~150-200ms**.
* **Xử lý chuỗi học không chặn giao diện (Non-blocking Async Session Logging)**:
  * Lệnh log truy cập chuỗi ngày (`analyticsApi.logSession(0)`) được thực thi bất đồng bộ ở background sau khi Dashboard đã render hiển thị dữ liệu cho người dùng.
* **Tối ưu hóa Truy vấn Bảng xếp hạng Streak (Scoped Streak Leaderboard Query)**:
  * Tại `AnalyticsService.java`, giới hạn danh sách kiểm tra chuỗi `streakLeaderboard` cho các tài khoản active trong 14 ngày gần nhất (`sessionRepository.findRecentActiveUsers`), loại bỏ hoàn toàn tình trạng loop N database queries trên tất cả user trong lịch sử database.
* **Tối ưu hóa Truy vấn Không phân trang (No Uncapped `findAll` Queries)**:
  * Tại `SrsService.getRandomLearnedVocabulary`, thay thế việc load toàn bộ `findAllLearnedByUser` bằng truy vấn giới hạn `findLearnedVocabulariesByUser(user, PageRequest.of(0, 100))`.
  * Tại `MasterReviewController.getWordsForMasterReview`, áp dụng `PageRequest.of(0, 500)` để tránh tình trạng nạp quá nhiều đối tượng Entity vào Hibernate Session khi quét từ vựng tổng ôn.

---

## 9. Quy tắc Điểm danh bù (Streak Repair Rules)

* **Điều kiện học 60 phút hôm nay (60-Minute Daily Study Threshold)**:
  * Người dùng bắt buộc phải tích lũy tổng thời gian học trong ngày hôm nay $\ge 60$ phút mới mở khóa quyền thực hiện điểm danh bù (`todayDurationMinutes >= 60`).
* **Giới hạn số lượt sử dụng (Repair Usage Limits)**:
  * **Tối đa 1 lượt / ngày**: Người dùng chỉ được phép điểm danh bù cho 1 ngày đã bị bỏ lỡ trong cùng 1 ngày (`repairsUsedToday < 1`).
  * **Tối đa 5 lượt / tháng**: Tổng số lượt điểm danh bù trong tháng lịch hiện tại không vượt quá 5 lượt (`repairsUsedThisMonth < 5`).
* **Cơ chế khôi phục Streak**:
  * Người dùng chọn 1 ngày trong quá khứ bị bỏ lỡ (`targetDate < today`).
  * Hệ thống khởi tạo/cập nhật bản ghi `StudySession` cho ngày `targetDate` với `isRepaired = true`, `wordsStudied = 1` và lưu vết vào `StreakRepairLogDoc`.
  * Thuật toán `calculateStreak` tự động liên kết các ngày học và khôi phục chuỗi Day Streak liên tục.

---

## 10. Quy tắc Bảng Xếp Hạng & Bảng Vinh Danh (Leaderboard & Podium Rules)

* **3 Phân hệ xếp hạng cạnh tranh:**
  * **⚡ Hôm nay (`words`)**: Xếp hạng theo số từ học được trong ngày (từ 00:00 đến 23:59 múi giờ Việt Nam). Khuyến khích sự bứt phá hàng ngày.
  * **📚 Tổng học (`learned`)**: Xếp hạng theo tổng số từ vựng thực tế đã tích lũy thuộc lòng trong từ điển (`countByIdIn`).
  * **🔥 Chuỗi ngày (`streak`)**: Xếp hạng theo độ kiên trì liên tục (Day Streak) không bỏ lỡ ngày nào.
* **Bục vinh quang Top 3 (3D Podium Showcase):**
  * Tự động hiển thị bục Top 3 với Rank 1 (Vàng - Vương miện Crown 👑 bay bổng), Rank 2 (Bạc 🥈), Rank 3 (Đồng 🥉).
  * Hiển thị Avatar, tên người dùng và huy hiệu điểm số nổi bật.
* **Tương tác Hồ sơ người dùng (Interactive Profile Modal):**
  * Click vào bất kỳ người dùng nào trên bục hoặc danh sách top 4-10 đều mở trực tiếp `UserProfileModal` để xem chi tiết thông tin, cấp độ, thành tựu của họ.
* **Thẻ vị trí của bạn (Your Rank Banner):**
  * Tự động định vị và thông báo thứ hạng hiện tại của người dùng đang đăng nhập trong phân hệ đang xem.

---

## 11. Quy tắc Độc lập Giáo trình & Chuẩn hóa Từ vựng (Curriculum Isolation & Vocabulary Standards)

* **Tách biệt độc lập các giáo trình (Không gộp từ vựng giữa các nguồn khác nhau)**:
  * **N3 Chuẩn (Học hàng ngày - `level = 'N3'`)**: Chuẩn hóa chính xác **822 từ vựng** (khoảng ~800 từ, học 20 từ/ngày tương ứng 41 ngày) theo danh mục JLPT N3 từ file giáo trình gốc `Từ-vựng-N5-N1.xlsx` (Sheet N3).
  * **N3 Course (Ôn luyện N3 - `level = 'N3_COURSE'`)**: Gồm **2,452 từ & chữ Hán** phân bổ chính xác theo 9 Chương × 3 Bài = 27 bài học theo lộ trình Tổng ôn N3 (`Tổng ôn N3 - Chương X Bài Y`).
  * **Mimikara N3 (`level = 'MIMIKARA_N3'`)**: Gồm đúng **880 từ vựng** theo giáo trình chuyên biệt *Mimikara Oboeru N3*.
* **Bảo toàn tiến độ học tập (SRS Review Preservation)**:
  * Tuyệt đối không xóa hay làm mất trạng thái `is_learned`, `intervalDays`, `easeFactor`, `repetitions` của người dùng.
  * Khi chuẩn hóa ID từ vựng, hệ thống tự động ánh xạ (map) toàn bộ bản ghi `word_reviews` từ các ID cũ sang ID chuẩn mới tương ứng.

---

## 12. Quy tắc Khử Trùng Lặp Kho Từ Đã Học & Hàng Đợi Cần Ôn (Learned Words Ingestion Deduplication & Due Queue Integrity)

* **Giữ nguyên nội dung và trải nghiệm trong khóa học**:
  * Các khóa học (N3 Chuẩn, N3 Course, Mimikara N3) giữ nguyên toàn bộ bài học, thẻ Flashcard, bài tập theo giáo trình. Không tự ý ẩn hay bỏ qua từ của người dùng.
* **Khử trùng lặp tại Cửa ngõ Ghi nhận (`word_reviews`)**:
  * Mỗi từ vựng tiếng Nhật trong kho "Từ đã học" của người dùng được định danh độc nhất bằng `wordKey` (chữ Kanji hoặc Hiragana).
  * Đánh chỉ mục duy nhất: `UNIQUE (userId, wordKey)`.
  * Khi người dùng học hoặc ôn tập một từ ở bất kỳ khóa học nào, hệ thống kiểm tra qua `findByUserAndWordKey`. Nếu từ đó đã tồn tại trong kho "Từ đã học" của người dùng, hệ thống chỉ cập nhật tiến độ SRS trên bản ghi hiện có, **tuyệt đối không sinh thêm bản ghi thứ 2**.
* **Đảm bảo tính toàn vẹn của Hàng Đợi Cần Ôn (Due Words Queue)**:
  * Toàn bộ các thẻ đến hạn ôn tập (`nextReview <= now`) phải là từ vựng thực tế tồn tại trong `vocabularies`, có đầy đủ Kanji, Hiragana và Nghĩa tiếng Việt.
  * Bảng `word_reviews` chỉ chứa từ vựng; toàn bộ các thẻ Ngữ pháp được chuyển sang và quản lý độc lập tại `grammar_reviews`.
  * Đảm bảo độ sạch dữ liệu 100% DISTINCT cho cả Bảng Từ đã học, Bảng Ngữ pháp đã học và Hàng đợi Từ cần ôn.

