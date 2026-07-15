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
