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
  * Chứa danh sách các từ vựng cần ôn tập theo thuật toán SRS (quá hạn hoặc đến hạn trong ngày).
  * **Đặc biệt**: Tự động gom thêm các từ vựng **mới học/ôn ngày hôm qua** vào danh sách buổi sáng để chủ động gợi nhớ lại trong khoảng thời gian quên nhanh nhất sau 24h.
* **Ôn lại hôm nay (Today's Review - `GET /api/study/today-reviewed`)**:
  * Tự động tổng hợp **100% các từ vựng đã được tương tác/đánh dấu trạng thái TRONG NGÀY HÔM NAY** (từ 00:00:00 đến 23:59:59 theo múi giờ địa phương `Asia/Ho_Chi_Minh`).
  * Bao quát toàn bộ dữ liệu từ **cả 3 phân hệ**:
    1. **Flashcards**: Khi người dùng lật thẻ hoặc đánh giá trạng thái thẻ.
    2. **Trắc nghiệm & Gõ chữ (Quiz)**: Tích hợp đầy đủ 2 định dạng bài tập:
       - **Trắc nghiệm (Multiple Choice)**: Chọn 1 trong 4 phương án.
       - **Gõ chữ (Typing Quiz)**: Tự luận gõ đáp án bằng bàn phím (hỗ trợ kiểm tra từ đồng nghĩa & sửa lỗi chính tả tiếng Việt).
       - Hỗ trợ đảo chiều linh hoạt: **Nhật ➔ Việt** và **Việt ➔ Nhật**.
    3. **Thử thách AI**: Khi thực hiện bài tập dịch AI, hội thoại AI Tutor hoặc nhập kiến thức AI.

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
  * Hỗ trợ phím tắt số **1, 2, 3, 4** trên bàn phím tương ứng với 4 mức độ (1: Forgot, 2: Hard, 3: Good, 4: Easy).

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

