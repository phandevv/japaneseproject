# ☕ Backend Development Rules (.ai/rules/01-backend-rule.md)

Tài liệu này quy định các quy tắc phát triển mã nguồn Java Spring Boot cho phần Backend.

---

## 🚫 Các nguyên tắc cấm và bắt buộc

1. **Tuyệt đối không sử dụng Lombok**:
   * Không cài đặt annotation như `@Getter`, `@Setter`, `@AllArgsConstructor` vào các Entity hay DTO.
   * Tất cả các trường dữ liệu bắt buộc phải viết thủ công hoặc tự động generate Getter/Setter và Constructor chuẩn của Java.
2. **Quản lý Transaction**:
   * Tất cả các dịch vụ ghi/sửa dữ liệu bắt buộc phải được bọc trong các service có gắn chú thích `@Transactional`.
3. **Phân tách Layer**:
   * **Controller**: Chỉ làm nhiệm vụ ánh xạ router, validate dữ liệu đầu vào (`@Valid`), gọi Service và trả về response DTO. Không viết code xử lý logic nghiệp vụ hay truy vấn SQL trực tiếp ở đây.
   * **Service**: Chứa toàn bộ luồng xử lý logic nghiệp vụ, tính toán, và quản lý giao dịch.
   * **Repository**: Chỉ thực hiện các thao tác truy vấn cơ sở dữ liệu qua Spring Data JPA.
4. **Không viết SQL cứng ở Service**:
   * Tận dụng tối đa thế mạnh của JPQL hoặc các hàm Query Methods có sẵn của Spring Data JPA.
5. **Mã hóa mật khẩu**:
   * Mọi tài khoản mới đăng ký hoặc cập nhật mật khẩu bắt buộc phải đi qua mã hóa bằng `BCryptPasswordEncoder`. Tuyệt đối không lưu raw password vào database.
