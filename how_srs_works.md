# Cách thức hoạt động của Hệ thống Spaced Repetition (FSRS)

Tài liệu này giải thích bằng lời văn đơn giản về luồng hoạt động của hệ thống học từ vựng ngắt quãng (Spaced Repetition System) mà chúng ta vừa xây dựng, áp dụng thuật toán FSRS thế hệ mới.

---

## 1. Khi người dùng bắt đầu ngày học mới (Lấy thẻ)

Khi người dùng mở ứng dụng và yêu cầu lấy danh sách từ vựng để học hôm nay, hệ thống **không bốc ngẫu nhiên** (random) thẻ và cũng **không nhồi nhét** toàn bộ các thẻ chưa học. Thay vào đó, hệ thống thực hiện hai bước tính toán thông minh:

### Bước 1.1: Giới hạn lượng từ mới (Adaptive Daily Load)
Hệ thống sẽ nhìn vào **Tỉ lệ nhớ từ (Retention Rate/Accuracy)** của người dùng vào *ngày hôm trước*.
- Nếu hôm qua người dùng học rất tập trung, tỉ lệ nhớ từ cao (>90%), hệ thống sẽ "thưởng" bằng cách mở giới hạn cho phép học thêm nhiều từ mới (ví dụ: 25-30 từ).
- Nếu hôm qua người dùng học kém, trả lời sai liên tục (<70%), hệ thống hiểu rằng não bộ đang bị quá tải. Nó sẽ tự động siết chặt, chỉ cho phép học rất ít từ mới (hoặc không cho từ mới nào), buộc người dùng phải tập trung ôn tập lại các từ cũ.

### Bước 1.2: Sắp xếp thẻ cũ (Priority Scheduler)
Thay vì chỉ lôi các thẻ "đã đến hạn" ra một cách máy móc, hệ thống sẽ **chấm điểm độ ưu tiên (Priority Score)** cho từng thẻ đến hạn. Điểm này cộng dồn từ 4 yếu tố:
1. **Độ trễ (Overdue):** Từ nào người dùng đã bỏ lỡ không học nhiều ngày qua sẽ được ưu tiên cao.
2. **Độ khó (Difficulty):** Từ nào người dùng cảm thấy khó nhằn sẽ được đẩy lên trước.
3. **Chuỗi sai (Consecutive Wrong):** Nếu một từ mà người dùng cứ trả lời sai liên tục, hệ thống sẽ "xoáy" vào từ đó, bắt học lại ngay lập tức.
4. **Độ dễ quên (Stability):** Trí nhớ đối với từ này mỏng manh hay vững chắc.

Thẻ nào có điểm tổng hợp cao nhất sẽ xuất hiện đầu tiên, giúp tối ưu hóa thời gian học của người dùng.

---

## 2. Khi người dùng lật thẻ và đánh giá kết quả (Review)

Sau khi nhìn mặt trước của thẻ và lật xem đáp án, người dùng sẽ bấm một trong bốn nút: **Lại (AGAIN), Khó (HARD), Tốt (GOOD), Dễ (EASY)**.

Ngay khi nút được bấm, luồng xử lý bên dưới (Backend) sẽ diễn ra vô cùng tinh vi qua 3 giai đoạn:

### Giai đoạn 2.1: Thuật toán FSRS tính toán
Thay vì sử dụng các mốc thời gian cố định (kiểu như: Đúng thì 3 ngày, Sai thì học lại 1 ngày), hệ thống ném kết quả vào thuật toán FSRS. Thuật toán này sử dụng một bộ công thức toán học gồm **17 trọng số** để phân tích trí nhớ của người dùng đối với riêng từ vựng đó:
- **Độ khó (Difficulty):** Tăng lên nếu bấm AGAIN/HARD, giảm xuống nếu bấm EASY.
- **Sức bền của trí nhớ (Stability):** Tính toán xem với bộ não của riêng người dùng này, sau bao lâu nữa thì từ này sẽ bị quên.

Dựa vào hai biến số này, hệ thống sẽ vẽ ra một "đường cong lãng quên" ảo cho từ vựng đó và chốt luôn **ngày ôn tập tiếp theo (Next Review)** trúng ngay vào thời điểm người dùng chuẩn bị quên.

### Giai đoạn 2.2: Ghi sổ lịch sử (Review Log)
Hệ thống không chỉ lưu kết quả hiện tại mà còn "chụp ảnh" lại khoảnh khắc học. Nó ghi nhận lại: 
- Độ khó trước khi bấm nút là bao nhiêu, sau khi bấm nút thành bao nhiêu.
- (Trong tương lai) Thời gian hiển thị mặt trước và mặt sau để tính toán **tốc độ phản xạ (Reaction Time)** của người dùng.

Cuốn sổ lịch sử siêu chi tiết này là mỏ vàng dữ liệu để hệ thống tự động tối ưu thuật toán hoặc cắm Machine Learning vào huấn luyện sau này.

### Giai đoạn 2.3: Thống kê ngày (Daily Stats)
Kết quả đúng/sai của thẻ lập tức được cộng dồn vào bảng thống kê của ngày hôm đó, phục vụ cho việc theo dõi Chuỗi học tập (Streak), Tỉ lệ chính xác (Accuracy), và làm đầu vào cho chức năng giới hạn từ mới của ngày hôm sau (đã nói ở phần 1).

---

## 3. Tổng kết

Nhờ chu trình khép kín này, người dùng sẽ trải nghiệm cảm giác: *"Từ nào mình hay quên thì nó cứ lặp đi lặp lại mãi cho đến khi nhớ, từ nào mình thuộc rồi thì mấy tháng sau mới thấy xuất hiện một lần"*. 

Toàn bộ quá trình cá nhân hoá đó hoạt động một cách tự động, êm ái đằng sau giao diện màn hình.
