# Báo cáo các tính năng & sửa lỗi vừa thực hiện

Tài liệu này tổng hợp lại các chức năng mới được triển khai và cách giải quyết cho từng vấn đề đã gặp phải trên hệ thống. 

---

## 1. Tối ưu hóa và Tách trang "Thống kê chi tiết từ vựng đã ôn tập"

### Vấn đề ban đầu
- Giao diện thống kê từ vựng hiển thị trực tiếp trên trang chủ gây lãng phí không gian.
- Việc tải toàn bộ từ vựng đã học cùng một lúc gây chậm trễ (lag) và tạo gánh nặng lớn cho database khi số lượng từ vựng tăng lên.

### Cách giải quyết
- **Về mặt giao diện:** Gỡ bỏ danh sách từ vựng khỏi trang chủ (HomePage) và thay bằng một nút điều hướng duy nhất nằm gọn gàng phía trên banner quảng cáo. Nút này dẫn người dùng sang một trang hoàn toàn mới (`StudyStatsPage`). Tại trang mới, bổ sung thanh Tab điều hướng thời gian (Ngày, Tuần, Tháng, v.v.) và các bộ lọc theo độ khó của từ (Hoàn hảo, Tốt, Khó, Cần ôn lại).
- **Về mặt hiệu suất:** 
  - Đánh Index trên database (cụ thể ở bảng đánh giá từ vựng) tại các trường thời gian và ID người dùng để rút ngắn tối đa thời gian tìm kiếm của cơ sở dữ liệu.
  - Áp dụng kỹ thuật **Phân trang (Pagination)**. Thay vì lấy hàng nghìn từ vựng cùng lúc, hệ thống chỉ yêu cầu cơ sở dữ liệu trả về theo từng cụm (ví dụ 30 từ mỗi trang). Cung cấp nút chuyển trang (Next/Previous) ở giao diện người dùng.

---

## 2. Khắc phục vấn đề không gian hiển thị trên Thẻ Flashcard (Mặt sau)

### Vấn đề ban đầu
- Mặt sau của Flashcard hiển thị thông tin chi tiết và dữ liệu bổ sung từ AI. Tuy nhiên, chiều rộng tổng thể của thẻ khá hẹp, cộng thêm việc chia tỷ lệ hai cột (trái/phải) chưa hợp lý khiến phần cột phải (chứa thông tin AI) bị chèn ép, dẫn đến lãng phí diện tích và mất chữ (khuyết chữ).

### Cách giải quyết
- **Thay đổi kích thước tổng thể:** Gia tăng giới hạn chiều rộng tối đa (max-width) của toàn bộ thẻ Flashcard. Điều này giúp tận dụng không gian trống ở hai bên màn hình trên các thiết bị rộng.
- **Phân bổ lại tỷ lệ cột:** Chuyển từ tỷ lệ phân chia gần như cân bằng sang tỷ lệ nghiêng hẳn về cột bên phải (giảm tỷ trọng cột chứa thông tin cơ bản bên trái và mở rộng tối đa cột chứa nội dung AI bên phải). Sự thay đổi này giúp văn bản không bị cắt xén và dễ đọc hơn.

---

## 3. Sửa các lỗi phát sinh trong quá trình chuyển đổi giao diện (Bugs)

### Lỗi 1: Sự cố điều hướng khi nhấn nút "Xem chi tiết" (ReferenceError: navigate is not defined)
- **Nguyên nhân:** Khi tạo nút mới để chuyển sang trang thống kê, thành phần giao diện chưa được khai báo bộ công cụ chuyển trang của hệ thống Router.
- **Cách giải quyết:** Đăng ký và khai báo bộ công cụ chuyển trang (Hook điều hướng) vào trong thành phần giao diện, giúp nút bấm nhận diện được hành động cần thực thi.

### Lỗi 2: Trắng màn hình do gọi API sai cấu trúc (TypeError: ik.studyHistoryDetails is not a function)
- **Nguyên nhân:** Khi tách trang thống kê sang file độc lập, việc import kết nối API bị gọi nhầm vào một module chung thay vì module dành riêng cho các API của Người Dùng. Hậu quả là khi gặp trường hợp người dùng chưa học từ nào (dữ liệu rỗng), tiến trình gọi API sụp đổ và gây trắng toàn bộ màn hình.
- **Cách giải quyết:** Điều chỉnh lại đường dẫn liên kết API trỏ đúng về module xử lý người dùng. Cấu trúc lại luồng hiển thị để nếu không có dữ liệu trả về, hệ thống sẽ êm ái hiển thị một màn hình trống (Empty State) với thông báo thân thiện thay vì hiển thị lỗi hệ thống.
