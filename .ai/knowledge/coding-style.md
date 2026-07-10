# 🎨 Coding Conventions & Styles (.ai/knowledge/coding-style.md)

Tài liệu này tổng hợp các quy ước viết mã nguồn (Coding Conventions) đang được áp dụng trong dự án **NihongoCards**. Mọi thay đổi code trong tương lai bắt buộc phải tuân thủ các quy tắc này.

---

## 1. Quy ước viết mã Java (Backend)

### A. Đặt tên (Naming Conventions)
* **Tên Lớp (Classes)**: Sử dụng danh từ viết theo kiểu **PascalCase** (ví dụ: `VocabularyService`, `WordReviewRepository`).
* **Tên Phương thức & Biến (Methods & Variables)**: Viết theo kiểu **camelCase** (ví dụ: `getDueWords()`, `wordsPerDay`).
* **Hằng số (Constants)**: Viết hoa toàn bộ cách nhau bởi dấu gạch dưới **UPPER_SNAKE_CASE** (ví dụ: `JWT_SECRET`).
* **Lớp kiểm thử (Test Classes)**: Tên lớp kiểm thử bắt buộc kết thúc bằng hậu tố `Test` (ví dụ: `SrsServiceTest`).

### B. Sử dụng Java Features & JPA
* **Không dùng Lombok**: Dự án hiện tại **không sử dụng** thư viện Lombok. Tất cả các Entity và DTO phải định nghĩa tường minh Getter, Setter, Constructor không tham số và có tham số bằng mã Java thuần.
* **JPA Annotations**: Đầy đủ các chú thích bắt buộc như `@Entity`, `@Table(name = "...")`, `@Column(name = "...")` cho các trường dữ liệu để khớp lược đồ database một cách an toàn.

### C. Import Ordering
Sắp xếp nhóm import theo thứ tự:
1. `java.*` và `javax.*`
2. `jakarta.*` (chuẩn JPA/Servlet mới của Spring Boot 3.x)
3. Các thư viện bên thứ ba (Spring Framework, Hibernate, Bucket4j...)
4. Các lớp cục bộ trong dự án (`com.flashcard.*`)

---

## 2. Quy ước viết mã React & CSS (Frontend)

### A. Đặt tên (Naming Conventions)
* **Tên Component & Tệp UI**: Sử dụng danh từ viết theo kiểu **PascalCase** (ví dụ: `FlashcardCard.jsx`, `DailyStudyPage.jsx`).
* **Tên Hàm & Trạng thái (Functions & Hooks)**: Viết theo kiểu **camelCase** (ví dụ: `const [flipped, setFlipped] = useState(false);`).
* **Chuỗi JS**: Sử dụng dấu nháy đơn `'` cho chuỗi Javascript và nháy kép `"` cho các thuộc tính JSX.

### B. Cấu trúc Component
Các component nên tuân theo cấu trúc:
1. Nhập thư viện (React, hooks, third-party libraries).
2. Nhập contexts, services, components cục bộ.
3. Nhập style CSS tương ứng.
4. Định nghĩa hàm Component:
   * Khai báo State & Refs.
   * Khai báo Side Effects (`useEffect`).
   * Định nghĩa các hàm xử lý sự kiện (event handlers).
   * Render JSX.

### C. Thiết kế Giao diện (CSS)
* Sử dụng **CSS Variables (Design Tokens)** trong [index.css](file:///c:/Users/bbqdd/Documents/_my/japaneseproject/frontend/src/styles/index.css) làm biến màu sắc chủ đạo để đảm bảo tính nhất quán (ví dụ: `var(--accent-color)`, `var(--surface-color)`, `var(--text-primary)`).
* Không tự viết mã cứng các màu sắc dạng hex (`#ffffff`) trực tiếp vào inline style khi đã có sẵn token màu tương ứng.
