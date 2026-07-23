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
    2. **Trắc nghiệm (Quiz)**: Khi hoàn thành các câu trắc nghiệm từ vựng.
    3. **Thử thách AI**: Khi thực hiện bài tập dịch AI, hội thoại AI Tutor hoặc nhập kiến thức AI.

