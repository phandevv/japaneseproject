# 🎯 Mô tả Chức năng Hệ thống (FEATURES.md)

Hệ thống **NihongoCards** cung cấp một giải pháp toàn diện để học tập, ôn luyện và quản lý từ vựng tiếng Nhật từ N5 đến N1. Dưới đây là mô tả chi tiết các chức năng đã được triển khai:

---

## 1. Học từ vựng qua Flashcard (Chế độ SRS)
Hệ thống sử dụng cơ chế **Học tập ngắt quãng (Spaced Repetition)** giúp tối ưu hóa khả năng ghi nhớ dài hạn:
* **Lật thẻ 2 mặt:** Mặt trước hiển thị chữ Kanji/Hiragana và cách phát âm. Mặt sau hiển thị nghĩa tiếng Việt, câu ví dụ và nút phát âm âm thanh (Text-to-Speech).
* **Đánh giá mức độ thuộc (4 nút):** 
  * **Again (Học lại):** Reset thời gian ôn tập về ngày mai.
  * **Hard (Khó):** Ôn lại sau thời gian ngắn.
  * **Good (Tốt):** Ôn lại sau khoảng thời gian tiêu chuẩn.
  * **Easy (Dễ):** Giãn cách thời gian ôn tập rất dài.
* **Cần ôn hôm nay:** Lọc động danh sách từ vựng đã đến hạn cần ôn để học viên luyện tập mỗi ngày, tránh tình trạng quá tải.

---

## 2. Làm bài kiểm tra (Quiz Mode) thông minh
Chế độ làm Quiz được tối ưu hóa để tăng tính thực tế và thân thiện khi tương tác:
* **Đảo chiều câu hỏi:**
  * **Nghĩa Việt ⟷ Tiếng Nhật:** Học viên gõ cách viết Hiragana/Kanji tương ứng.
  * **Tiếng Nhật ⟷ Nghĩa Việt:** Học viên gõ nghĩa tiếng Việt.
* **So khớp tiếng Việt thông minh (Intelligent Matching):**
  * **Đa từ đồng nghĩa (Thesaurus):** Hệ thống nhận diện các từ đồng nghĩa phổ biến (ví dụ: gõ "nghỉ việc", "bỏ việc", "thôi việc" đều được tính là đúng).
  * **Bỏ qua lỗi gõ phím nhỏ (Typo Tolerance):** Đối với các từ dài hơn 3 chữ cái, hệ thống cho phép gõ sai lệch 1 ký tự (thiếu dấu, gõ nhầm chữ cạnh nhau) vẫn báo đúng để tránh gây ức chế.
  * **Tách cụm từ:** Tự động loại bỏ các dấu ngăn cách như `,`, `;`, `/` để chấm điểm đúng nếu học viên gõ bất kỳ từ đồng nghĩa nào trong danh sách dịch.
* **Tự động đồng bộ SRS:** Khi trả lời đúng ngay từ lần đầu tiên, từ vựng tự động được đánh dấu là "Đã học" và đưa vào chu trình SRS.

---

## 3. Quản trị và nạp dữ liệu (Admin Panel)
Cung cấp các công cụ quản lý mạnh mẽ dành cho quản trị viên:
* **Nhập dữ liệu Excel trực tiếp từ Header:** Admin có thể click nút "Nhập Excel" ngay trên Navbar để nạp file từ vựng `Từ-vựng-N5-N1.xlsx`. Hệ thống tự động phân tích và ghi vào Database.
* **Trang quản trị CRUD từ vựng (`VocabAdminPage`):**
  * Tìm kiếm từ vựng theo từ khóa tiếng Nhật hoặc tiếng Việt.
  * Phân trang tối ưu (Pagination) để hiển thị danh sách hàng ngàn từ mượt mà.
  * Form thêm mới, chỉnh sửa thông tin chi tiết và xóa từ vựng trực tiếp trên giao diện Web.

---

## 4. Thống kê & Phân tích tiến độ (Analytics Dashboard)
Giúp học viên theo dõi sát sao hành trình học tập hàng ngày:
* **Ba chỉ số đo lường cốt lõi:**
  * **Cần ôn hôm nay:** Số lượng từ đã đến hạn ôn tập SRS.
  * **Đã học hôm nay:** Số từ học viên đã trả lời đúng hoặc ôn tập trong ngày.
  * **Tổng số từ đã học:** Tổng tích lũy các từ học viên đã đưa vào bộ nhớ dài hạn (SRS).
* **Chuỗi học tập liên tục (Streak):** Tính toán số ngày học liên tiếp dựa trên nhật ký học tập thực tế. Hiển thị biểu tượng ngọn lửa 🔥 truyền cảm hứng.
* **Biểu đồ hoạt động 30 ngày (Activity Graph):** Biểu đồ cột SVG hiển thị tần suất học tập trong 30 ngày gần nhất để người dùng thấy rõ sự kiên trì của mình.
